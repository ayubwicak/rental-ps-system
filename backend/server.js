require("./env"); // muat variabel lingkungan dari backend/.env sebelum modul lain
const express = require("express");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
require("./db"); // memastikan skema dibuat saat startup

const { authRateLimiter, apiRateLimiter } = require("./middleware/rateLimiter");
const { verifyToken, parseCookies, COOKIE_NAME } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const auditRoutes = require("./routes/audit");
const unitRoutes = require("./routes/units");
const bookingRoutes = require("./routes/bookings");
const memberRoutes = require("./routes/members");
const transactionRoutes = require("./routes/transactions");
const publicRoutes = require("./routes/public");

const app = express();

// Mode HTTPS opsional: isi HTTPS_KEY & HTTPS_CERT di .env (path file PEM).
// Sangat disarankan di jaringan WiFi/LAN agar password & token tidak disadap.
const HTTPS_KEY_PATH = process.env.HTTPS_KEY;
const HTTPS_CERT_PATH = process.env.HTTPS_CERT;
const useHttps = Boolean(
  HTTPS_KEY_PATH &&
    HTTPS_CERT_PATH &&
    fs.existsSync(HTTPS_KEY_PATH) &&
    fs.existsSync(HTTPS_CERT_PATH)
);

const server = useHttps
  ? https.createServer(
      { key: fs.readFileSync(HTTPS_KEY_PATH), cert: fs.readFileSync(HTTPS_CERT_PATH) },
      app
    )
  : http.createServer(app);

app.disable("x-powered-by");

// Aktifkan hanya bila berjalan di belakang reverse proxy tepercaya (nginx, dsb).
// Tanpa ini, rate limit per-IP bisa salah membaca IP klien.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// Header keamanan (CSP, X-Frame-Options, nosniff, HSTS, dll).
// CSP disesuaikan: font Google Fonts + inline style (React inline style attribute).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        // upgrade-insecure-requests hanya relevan saat HTTPS aktif.
        // Dimatikan untuk akses LAN/tablet via HTTP polos.
        upgradeInsecureRequests: useHttps ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Daftar origin frontend yang diizinkan CORS (dipisah koma di env CORS_ORIGIN).
// Request tanpa header Origin (curl, bot WhatsApp, same-origin) tetap diizinkan.
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
};

// Inisialisasi Socket.io untuk sinkronisasi real-time antar layar kasir
const io = new Server(server, {
  cors: corsOptions,
});

// Wajib login (JWT valid) sebelum dapat menerima broadcast realtime.
// Token diambil dari handshake auth (bot/API client) atau cookie httpOnly (browser).
io.use((socket, next) => {
  try {
    const cookieToken = parseCookies(socket.handshake.headers.cookie)[COOKIE_NAME];
    const token = socket.handshake.auth?.token || socket.handshake.query?.token || cookieToken;
    if (!token) return next(new Error("unauthorized"));
    socket.user = verifyToken(token);
    next();
  } catch (err) {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log(`[WebSocket] Kasir terhubung: ${socket.id} (${socket.user.username})`);
  socket.on("sync_trigger", (data) => {
    socket.broadcast.emit("sync_data", data);
  });
  socket.on("disconnect", () => {
    console.log(`[WebSocket] Kasir terputus: ${socket.id}`);
  });
});

// Middleware kompresi HTTP Gzip untuk efisiensi transfer data & file
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

// Sediakan akses Socket.io ke semua handler route API
app.use((req, res, next) => {
  req.io = io;
  // Otomatis broadcast sync saat metode selain GET berhasil dieksekusi
  if (req.method !== "GET") {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        io.emit("sync_data", { method: req.method, path: req.originalUrl });
      }
    });
  }
  next();
});

// Proteksi Rate Limiter API
app.use("/api/auth/login", authRateLimiter);
app.use("/api/", apiRateLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/public", publicRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/info", (req, res) => {
  res.json({
    name: "Rental PS System",
    address: "Jl. Pemuda No. 123, Kota Rental",
    operatingHours: "09:00 - 24:00 WIB",
    adminContact: "+6281234567890",
    description: "Rental PlayStation PS3, PS4, dan PS5 dengan kenyamanan maksimal dan harga terjangkau.",
  });
});

// Melayani file static Frontend (Single Server Mode + HTTP Caching)
const frontendDist = path.join(__dirname, "../frontend/dist");

if (fs.existsSync(frontendDist)) {
  app.use(
    express.static(frontendDist, {
      maxAge: "1d",
      etag: true,
    })
  );
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API route tidak ditemukan" });
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Penanganan error terpusat: selalu balas JSON, tanpa membocorkan stack trace.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Format JSON tidak valid." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Ukuran permintaan terlalu besar." });
  }
  console.error("[Error]", err.message);
  res.status(500).json({ error: "Terjadi kesalahan pada server." });
});

const PORT = process.env.PORT || 4000;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\x1b[31m[Error] Port ${PORT} sudah dipakai proses lain. ` +
        `Tutup proses tersebut atau jalankan dengan PORT berbeda, mis. PORT=4001 npm start\x1b[0m`
    );
    process.exit(1);
  }
  throw err;
});
server.listen(PORT, () => {
  const scheme = useHttps ? "https" : "http";
  console.log(
    `Rental PS System (Backend + Frontend + WebSocket) berjalan di ${scheme}://localhost:${PORT}`
  );
  if (useHttps) {
    console.log("[Keamanan] HTTPS aktif — koneksi browser ke server terenkripsi.");
  } else {
    console.log(
      "[Keamanan] HTTPS belum aktif. Isi HTTPS_KEY & HTTPS_CERT di .env agar password & token tidak lewat jaringan tanpa enkripsi."
    );
  }
});
