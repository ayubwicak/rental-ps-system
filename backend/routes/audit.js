const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireAdmin);

const stmtSelectAudit = db.prepare(
  "SELECT id, user_id, username, role, action, detail, ip, created_at FROM audit_logs ORDER BY id DESC LIMIT ?"
);

// GET /api/audit?limit=100 -> log aktivitas terbaru (khusus admin)
router.get("/", (req, res) => {
  const requested = Number(req.query.limit);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 300) : 100;
  res.json(stmtSelectAudit.all(limit));
});

module.exports = router;
