const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET, requireAuth } = require("../middleware/auth");

const router = express.Router();

const stmtSelectUserByUsername = db.prepare("SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))");
const stmtSelectAllUsers = db.prepare("SELECT id, username, name, role, created_at FROM users ORDER BY id");
const stmtInsertUser = db.prepare("INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)");
const stmtSelectUserById = db.prepare("SELECT * FROM users WHERE id = ?");
const stmtUpdatePassword = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
const stmtDeleteUser = db.prepare("DELETE FROM users WHERE id = ?");

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi." });
  }

  const trimmedUsername = String(username).trim();
  const trimmedPassword = String(password).trim();

  const user = stmtSelectUserByUsername.get(trimmedUsername);
  if (!user) {
    return res.status(401).json({ error: "Username atau password salah." });
  }

  const isBcryptMatch = bcrypt.compareSync(trimmedPassword, user.password_hash);
  if (!isBcryptMatch) {
    return res.status(401).json({ error: "Username atau password salah." });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users
router.get("/users", requireAuth, (req, res) => {
  res.json(stmtSelectAllUsers.all());
});

// POST /api/auth/users
router.post("/users", requireAuth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Hanya Admin yang dapat membuat pengguna baru." });
  }
  const { username, password, name, role = "kasir" } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: "Username, password, dan nama wajib diisi." });
  }

  const existing = stmtSelectUserByUsername.get(username);
  if (existing) {
    return res.status(409).json({ error: "Username sudah digunakan." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = stmtInsertUser.run(username.trim(), passwordHash, name.trim(), role);

  res.json({ id: info.lastInsertRowid, username, name, role });
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Password lama dan password baru wajib diisi." });
  }

  const user = stmtSelectUserById.get(req.user.id);
  if (!user || !bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: "Password lama salah." });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  stmtUpdatePassword.run(newHash, req.user.id);
  res.json({ message: "Password berhasil diperbarui." });
});

// DELETE /api/auth/users/:id
router.delete("/users/:id", requireAuth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Akses ditolak." });
  }
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: "Tidak dapat menghapus akun Anda sendiri." });
  }
  stmtDeleteUser.run(req.params.id);
  res.json({ message: "Pengguna berhasil dihapus." });
});

module.exports = router;
