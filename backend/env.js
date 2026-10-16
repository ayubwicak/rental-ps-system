// Memuat variabel lingkungan dari backend/.env (tanpa dependensi eksternal).
// Catatan: variabel dari shell environment TIDAK ditimpa oleh file .env.
const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}
