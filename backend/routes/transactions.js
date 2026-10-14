const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const stmtSelectAllTx = db.prepare("SELECT * FROM transactions ORDER BY created_at DESC");
const stmtSumTotalTx = db.prepare("SELECT COALESCE(SUM(total), 0) AS v FROM transactions");
const stmtCountTotalTx = db.prepare("SELECT COUNT(*) AS v FROM transactions");
const stmtTodayRevenue = db.prepare("SELECT COALESCE(SUM(total), 0) AS v FROM transactions WHERE date(datetime(created_at, '+7 hours')) = ?");
const stmtTodayCount = db.prepare("SELECT COUNT(*) AS v FROM transactions WHERE date(datetime(created_at, '+7 hours')) = ?");
const stmtByUnit = db.prepare("SELECT unit_name AS name, COALESCE(SUM(total), 0) AS omset FROM transactions GROUP BY unit_name");
const stmtHourlyData = db.prepare("SELECT strftime('%H', datetime(created_at, '+7 hours')) AS hour, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total FROM transactions GROUP BY hour ORDER BY hour");

// GET /api/transactions
router.get("/", (req, res) => {
  res.json(stmtSelectAllTx.all());
});

// GET /api/transactions/report/summary
router.get("/report/summary", (req, res) => {
  const totalRevenue = stmtSumTotalTx.get().v;
  const totalSessions = stmtCountTotalTx.get().v;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const todayRevenue = stmtTodayRevenue.get(today).v;
  const todayCount = stmtTodayCount.get(today).v;
  const byUnit = stmtByUnit.all();
  const hourlyData = stmtHourlyData.all();

  res.json({ totalRevenue, totalSessions, todayRevenue, todayCount, byUnit, hourlyData });
});

module.exports = router;
