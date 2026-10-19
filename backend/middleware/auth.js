require("../env");
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "rentalku_token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const SECRETS_LEMAH = [
  "ganti-dengan-string-acak-yang-aman",
  "rental-ps-dev-secret",
  "change-me",
  "secret",
  "password",
  "123456",
];

if (!JWT_SECRET || SECRETS_LEMAH.includes(JWT_SECRET)) {
  throw new Error(
    "JWT_SECRET belum diatur atau masih memakai nilai bawaan. " +
      "Isi JWT_SECRET dengan string acak yang aman di backend/.env, " +
      "lalu jalankan ulang server."
  );
}

const stmtSelectUserAuth = db.prepare(
  "SELECT id, username, name, role, token_version FROM users WHERE id = ?"
);

// Verifikasi token + pastikan versi token di DB masih sama.
// token_version dinaikkan saat ganti password sehingga sesi lama otomatis tidak berlaku.
function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  const user = payload && payload.id ? stmtSelectUserAuth.get(payload.id) : null;
  if (!user) throw new Error("Akun tidak ditemukan atau telah dihapus.");
  if ((payload.tv || 0) !== (user.token_version || 0)) {
    throw new Error("Sesi telah berakhir. Silakan login kembali.");
  }
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}

function parseCookies(cookieHeader = "") {
  const out = {};
  String(cookieHeader)
    .split(";")
    .forEach((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key) {
        try {
          out[key] = decodeURIComponent(value);
        } catch {
          out[key] = value;
        }
      }
    });
  return out;
}

// Token diambil dari header Authorization (bot/API client) atau cookie httpOnly (browser).
function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return { token: header.slice(7), viaCookie: false };
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[COOKIE_NAME]) {
    return { token: cookies[COOKIE_NAME], viaCookie: true };
  }
  return { token: null, viaCookie: false };
}

function allowedOrigins() {
  return (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

// Pertahanan CSRF lapis kedua: request yang memakai cookie hanya boleh berasal
// dari origin aplikasi sendiri (SameSite=Strict adalah lapis pertama).
function isTrustedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // curl / bot / request non-browser
  if (allowedOrigins().includes(origin)) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function requireAuth(req, res, next) {
  const { token, viaCookie } = extractToken(req);
  if (!token) return res.status(401).json({ error: "Token tidak ditemukan." });

  if (viaCookie && !SAFE_METHODS.has(req.method) && !isTrustedOrigin(req)) {
    return res.status(403).json({ error: "Permintaan ditolak (origin tidak dikenal)." });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token tidak valid atau kedaluwarsa." });
  }
}

// Batasi aksi sensitif (mis. hapus produk) hanya untuk role admin.
// Harus dipasang SETELAH requireAuth agar req.user tersedia.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Hanya Admin yang dapat melakukan aksi ini." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, verifyToken, parseCookies, JWT_SECRET, COOKIE_NAME };
