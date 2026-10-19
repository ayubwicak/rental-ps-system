const express = require("express");
const db = require("../db");

const router = express.Router();

const stmtUnitCount = db.prepare("SELECT COUNT(*) AS count FROM units");
const stmtTodayRevenue = db.prepare(
  "SELECT COALESCE(SUM(total), 0) AS total FROM transactions WHERE date(datetime(created_at, '+7 hours')) = ?"
);
const stmtTodayCount = db.prepare(
  "SELECT COUNT(*) AS count FROM transactions WHERE date(datetime(created_at, '+7 hours')) = ?"
);

router.get("/stats", (req, res) => {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  res.set("Cache-Control", "no-store");
  res.json({
    unitCount: stmtUnitCount.get().count,
    todayRevenue: stmtTodayRevenue.get(today).total,
    todayCount: stmtTodayCount.get(today).count,
  });
});

module.exports = router;
