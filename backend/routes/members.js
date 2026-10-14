const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const stmtSelectMembers = db.prepare("SELECT * FROM members ORDER BY created_at DESC");
const stmtInsertMember = db.prepare("INSERT INTO members (name, phone) VALUES (?, ?)");

// GET /api/members
router.get("/", (req, res) => {
  res.json(stmtSelectMembers.all());
});

// POST /api/members
router.post("/", (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: "Nama wajib diisi." });
  const info = stmtInsertMember.run(name, phone || null);
  res.json({ id: info.lastInsertRowid });
});

module.exports = router;
