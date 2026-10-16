require("../env");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const SECRETS_LEMAH = [
  "ganti-dengan-string-acak-yang-aman",
  "rental-ps-dev-secret",
  "change-me",
  "secret",
];

if (!JWT_SECRET || SECRETS_LEMAH.includes(JWT_SECRET)) {
  throw new Error(
    "JWT_SECRET belum diatur atau masih memakai nilai bawaan. " +
      "Isi JWT_SECRET dengan string acak yang aman di backend/.env, " +
      "lalu jalankan ulang server."
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token tidak ditemukan." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token tidak valid atau kedaluwarsa." });
  }
}

module.exports = { requireAuth, JWT_SECRET };
