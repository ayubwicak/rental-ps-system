const rateLimitMap = new Map();

// Pelacak kegagalan login per akun (anti brute-force terdistribusi per username)
const loginFailures = new Map();
const LOGIN_MAX_FAILS = 5;
const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

// Automatic cleanup every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now - data.startTime > data.windowMs) {
      rateLimitMap.delete(key);
    }
  }
  for (const [key, data] of loginFailures.entries()) {
    const expired = now - data.firstAt > LOGIN_FAIL_WINDOW_MS && now > data.lockedUntil;
    if (expired) loginFailures.delete(key);
  }
}, 5 * 60 * 1000);

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // default 1 minute
  const maxRequests = options.max || 30; // default 30 requests per minute
  const message = options.message || "Terlalu banyak permintaan. Silakan coba beberapa saat lagi.";

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const key = `${req.method}:${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, startTime: now, windowMs });
      return next();
    }

    const record = rateLimitMap.get(key);
    if (now - record.startTime < windowMs) {
      record.count += 1;
      if (record.count > maxRequests) {
        return res.status(429).json({ error: message });
      }
    } else {
      record.count = 1;
      record.startTime = now;
    }

    next();
  };
}

// Mengembalikan sisa waktu lock (ms) jika akun sedang terkunci, 0 jika tidak.
function getLoginLockRemaining(username) {
  const key = String(username || "").trim().toLowerCase();
  if (!key) return 0;
  const data = loginFailures.get(key);
  if (!data) return 0;
  const remaining = data.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

// Catat satu kegagalan login. Setelah LOGIN_MAX_FAILS dalam jendela waktu,
// akun dikunci sementara agar password tidak bisa ditebak paksa.
function registerLoginFailure(username) {
  const key = String(username || "").trim().toLowerCase();
  if (!key) return;
  const now = Date.now();
  let data = loginFailures.get(key);

  if (!data || now - data.firstAt > LOGIN_FAIL_WINDOW_MS) {
    data = { count: 0, firstAt: now, lockedUntil: 0 };
    loginFailures.set(key, data);
  }

  data.count += 1;
  if (data.count >= LOGIN_MAX_FAILS) {
    data.lockedUntil = now + LOGIN_LOCK_MS;
    data.count = 0;
    data.firstAt = now;
  }
}

function clearLoginFailures(username) {
  const key = String(username || "").trim().toLowerCase();
  if (key) loginFailures.delete(key);
}

const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Terlalu banyak percobaan login. Silakan tunggu 1 menit.",
});

const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Terlalu banyak permintaan ke server. Silakan pelan-pelan.",
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  getLoginLockRemaining,
  registerLoginFailure,
  clearLoginFailures,
};
