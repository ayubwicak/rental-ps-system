const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { logAudit } = require("../utils/audit");
const { JWT_SECRET, requireAuth, verifyToken, COOKIE_NAME, parseCookies } = require("../middleware/auth");
const {
  getLoginLockRemaining,
  registerLoginFailure,
  clearLoginFailures,
} = require("../middleware/rateLimiter");

const router = express.Router();

const MIN_PASSWORD_LENGTH = 8;
const VALID_ROLES = ["admin", "kasir"];
const TOKEN_TTL = "12h";
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

// Hash dummy agar waktu respons login sama antara username tidak dikenal
// dan username valid dengan password salah (mencegah user enumeration via timing).
const DUMMY_HASH = bcrypt.hashSync("rentalku-timing-equalizer", 10);

const stmtSelectUserByUsername = db.prepare("SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))");
const stmtSelectAllUsers = db.prepare("SELECT id, username, name, role, created_at FROM users ORDER BY id");
const stmtInsertUser = db.prepare("INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)");
const stmtSelectUserById = db.prepare("SELECT * FROM users WHERE id = ?");
const stmtUpdatePassword = db.prepare(
  "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?"
);
const stmtDeleteUser = db.prepare("DELETE FROM users WHERE id = ?");
const stmtCountAdmins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");

function validateNewPassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (password.length > 128) {
    return "Password maksimal 128 karakter.";
  }
  return null;
}

// Cookie httpOnly: token tidak lagi disimpan di localStorage browser.
// secure mengikuti koneksi (aktif otomatis saat server memakai HTTPS).
function authCookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: Boolean(req.secure),
    maxAge: TOKEN_TTL_MS,
    path: "/",
  };
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi." });
  }

  const trimmedUsername = String(username).trim().slice(0, 64);
  const rawPassword = String(password).slice(0, 200);

  const lockRemaining = getLoginLockRemaining(trimmedUsername);
  if (lockRemaining > 0) {
    const minutes = Math.ceil(lockRemaining / 60000);
    return res.status(429).json({
      error: `Terlalu banyak percobaan gagal untuk akun ini. Coba lagi dalam ${minutes} menit.`,
    });
  }

  const user = stmtSelectUserByUsername.get(trimmedUsername);
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;
  const passwordMatch = await bcrypt.compare(rawPassword, hashToCompare);

  if (!user || !passwordMatch) {
    registerLoginFailure(trimmedUsername);
    logAudit(req, "LOGIN_GAGAL", `Percobaan login username: ${trimmedUsername}`);
    return res.status(401).json({ error: "Username atau password salah." });
  }

  clearLoginFailures(trimmedUsername);

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role, tv: user.token_version || 0 },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );

  res.cookie(COOKIE_NAME, token, authCookieOptions(req));
  req.user = { id: user.id, username: user.username, name: user.name, role: user.role };
  logAudit(req, "LOGIN", `Login berhasil sebagai ${user.role}`);

  res.json({
    token, // tetap dikembalikan untuk bot/klien API non-browser
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
});

// POST /api/auth/logout -> hapus cookie sesi
router.post("/logout", (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[COOKIE_NAME]) {
    try {
      req.user = verifyToken(cookies[COOKIE_NAME]);
    } catch {
      // Token sudah tidak valid — tetap lanjut hapus cookie
    }
  }
  res.clearCookie(COOKIE_NAME, { path: "/" });
  logAudit(req, "LOGOUT", "Sesi browser diakhiri");
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users (khusus admin)
router.get("/users", requireAuth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Hanya Admin yang dapat melihat daftar pengguna." });
  }
  res.json(stmtSelectAllUsers.all());
});

// POST /api/auth/users
router.post("/users", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Hanya Admin yang dapat membuat pengguna baru." });
  }
  const { username, password, name, role = "kasir" } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: "Username, password, dan nama wajib diisi." });
  }

  const cleanUsername = String(username).trim();
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(cleanUsername)) {
    return res.status(400).json({
      error: "Username hanya boleh berisi huruf, angka, titik, garis bawah, atau strip (3-32 karakter).",
    });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: "Hak akses tidak valid." });
  }

  const passwordError = validateNewPassword(String(password));
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const cleanName = String(name).trim();
  if (cleanName.length < 2 || cleanName.length > 64) {
    return res.status(400).json({ error: "Nama harus 2-64 karakter." });
  }

  const existing = stmtSelectUserByUsername.get(cleanUsername);
  if (existing) {
    return res.status(409).json({ error: "Username sudah digunakan." });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const info = stmtInsertUser.run(cleanUsername, passwordHash, cleanName, role);

  logAudit(req, "USER_TAMBAH", `Membuat akun "${cleanUsername}" (${cleanName}, role ${role})`);
  res.json({ id: info.lastInsertRowid, username: cleanUsername, name: cleanName, role });
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Password lama dan password baru wajib diisi." });
  }

  const user = stmtSelectUserById.get(req.user.id);
  const oldMatch = user ? await bcrypt.compare(String(oldPassword), user.password_hash) : false;
  if (!user || !oldMatch) {
    logAudit(req, "PASSWORD_GAGAL", "Percobaan ganti password dengan password lama yang salah");
    return res.status(400).json({ error: "Password lama salah." });
  }

  const passwordError = validateNewPassword(String(newPassword));
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  if (String(newPassword) === String(oldPassword)) {
    return res.status(400).json({ error: "Password baru harus berbeda dari password lama." });
  }

  const newHash = await bcrypt.hash(String(newPassword), 10);
  stmtUpdatePassword.run(newHash, req.user.id);
  logAudit(req, "PASSWORD_UBAH", "Password diperbarui, semua sesi lama diakhiri");
  res.json({ message: "Password berhasil diperbarui. Silakan login kembali." });
});

// DELETE /api/auth/users/:id
router.delete("/users/:id", requireAuth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Akses ditolak." });
  }
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ error: "ID pengguna tidak valid." });
  }
  if (targetId === req.user.id) {
    return res.status(400).json({ error: "Tidak dapat menghapus akun Anda sendiri." });
  }

  const target = stmtSelectUserById.get(targetId);
  if (!target) {
    return res.status(404).json({ error: "Pengguna tidak ditemukan." });
  }
  if (target.role === "admin" && stmtCountAdmins.get().c <= 1) {
    return res.status(400).json({ error: "Tidak dapat menghapus admin terakhir." });
  }

  stmtDeleteUser.run(targetId);
  logAudit(req, "USER_HAPUS", `Menghapus akun "${target.username}" (${target.name})`);
  res.json({ message: "Pengguna berhasil dihapus." });
});

module.exports = router;
