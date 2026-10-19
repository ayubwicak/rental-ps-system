const db = require("../db");

const stmtInsertAudit = db.prepare(
  "INSERT INTO audit_logs (user_id, username, role, action, detail, ip) VALUES (?, ?, ?, ?, ?, ?)"
);

// Menulis jejak audit. Tidak pernah melempar error agar tidak mengganggu request utama.
function logAudit(req, action, detail = "") {
  try {
    const user = req.user || {};
    stmtInsertAudit.run(
      user.id || null,
      String(user.username || "-").slice(0, 64),
      user.role ? String(user.role).slice(0, 16) : null,
      String(action).slice(0, 64),
      detail ? String(detail).slice(0, 500) : null,
      String(req.ip || "").slice(0, 64) || null
    );
  } catch (err) {
    console.error("[Audit] Gagal menulis log:", err.message);
  }
}

module.exports = { logAudit };
