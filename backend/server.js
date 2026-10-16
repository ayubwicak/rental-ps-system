require("./env"); // muat variabel lingkungan dari backend/.env sebelum modul lain
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const compression = require("compression");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("./db"); // memastikan skema dibuat saat startup

const { authRateLimiter, apiRateLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/auth");
const unitRoutes = require("./routes/units");
const bookingRoutes = require("./routes/bookings");
const memberRoutes = require("./routes/members");
const transactionRoutes = require("./routes/transactions");

const app = express();
const server = http.createServer(app);

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
};

// Inisialisasi Socket.io untuk sinkronisasi real-time antar layar kasir
const io = new Server(server, {
  cors: corsOptions,
});

io.on("connection", (socket) => {
  console.log(`[WebSocket] Kasir terhubung: ${socket.id}`);
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
app.use(express.json());

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
app.use("/api/units", unitRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/transactions", transactionRoutes);

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
  console.log(`Rental PS System (Backend + Frontend + WebSocket) berjalan di http://localhost:${PORT}`);
});
