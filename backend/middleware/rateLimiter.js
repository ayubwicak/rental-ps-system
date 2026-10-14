const rateLimitMap = new Map();

// Automatic cleanup every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now - data.startTime > data.windowMs) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // default 1 minute
  const maxRequests = options.max || 30; // default 30 requests per minute
  const message = options.message || "Terlalu banyak permintaan. Silakan coba beberapa saat lagi.";

  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const key = `${req.path}:${ip}`;
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
};
