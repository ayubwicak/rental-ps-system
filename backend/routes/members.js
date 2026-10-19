const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { logAudit } = require("../utils/audit");

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

  const cleanName = String(name).trim();
  if (cleanName.length < 2 || cleanName.length > 64) {
    return res.status(400).json({ error: "Nama member harus 2-64 karakter." });
  }

  let cleanPhone = null;
  if (phone) {
    cleanPhone = String(phone).trim();
    if (!/^[0-9+\-\s()]{6,20}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Nomor telepon tidak valid (6-20 digit)." });
    }
  }

  const info = stmtInsertMember.run(cleanName, cleanPhone);
  logAudit(req, "MEMBER_TAMBAH", `Menambah member "${cleanName}"${cleanPhone ? ` (${cleanPhone})` : ""}`);
  res.json({ id: info.lastInsertRowid });
});

module.exports = router;
