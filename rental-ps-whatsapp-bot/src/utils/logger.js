function sanitize(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clone = { ...obj };
  const sensitiveKeys = ["password", "token", "password_hash", "authorization", "apiKey", "aiApiKey"];
  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      clone[key] = "***MASKED***";
    }
  }
  return clone;
}

const logger = {
  info: (tag, message, data = null) => {
    const timestamp = new Date().toISOString();
    const extra = data ? ` | Data: ${JSON.stringify(sanitize(data))}` : "";
    console.log(`[${timestamp}] [INFO] [${tag}] ${message}${extra}`);
  },
  warn: (tag, message, data = null) => {
    const timestamp = new Date().toISOString();
    const extra = data ? ` | Data: ${JSON.stringify(sanitize(data))}` : "";
    console.warn(`[${timestamp}] [WARN] [${tag}] ${message}${extra}`);
  },
  error: (tag, message, err = null) => {
    const timestamp = new Date().toISOString();
    const errDetail = err ? ` | Error: ${err.message || err}` : "";
    console.error(`[${timestamp}] [ERROR] [${tag}] ${message}${errDetail}`);
  },
};

module.exports = logger;
