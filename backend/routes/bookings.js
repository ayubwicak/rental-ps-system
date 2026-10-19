const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { logAudit } = require("../utils/audit");

const router = express.Router();
router.use(requireAuth);

// Pre-compiled Prepared Statements
const stmtSelectBookingsWithUnits = db.prepare(
  `SELECT b.*, u.name AS unit_name, u.type AS unit_type
   FROM bookings b JOIN units u ON u.id = b.unit_id
   ORDER BY b.created_at DESC`
);
const stmtSelectBookingById = db.prepare("SELECT * FROM bookings WHERE id = ?");
const stmtSelectBookingsByDateUnit = db.prepare(
  `SELECT b.*, u.name AS unit_name FROM bookings b
   JOIN units u ON u.id = b.unit_id
   WHERE b.unit_id = ? AND b.booking_date = ? AND b.status IN ('menunggu', 'terjadwal')`
);
const stmtSelectAllUnits = db.prepare("SELECT * FROM units ORDER BY id");
const stmtSelectUnitById = db.prepare("SELECT * FROM units WHERE id = ?");
const stmtInsertBooking = db.prepare(
  `INSERT INTO bookings (customer_name, customer_phone, unit_id, booking_date, booking_time, duration_hours, status)
   VALUES (?, ?, ?, ?, ?, ?, 'menunggu')`
);
const stmtInsertSession = db.prepare(
  "INSERT INTO sessions (unit_id, customer_name, duration_mode, package_hours, status) VALUES (?, ?, 'package', ?, 'active')"
);
const stmtUpdateUnitStatus = db.prepare("UPDATE units SET status = 'active' WHERE id = ?");
const stmtUpdateBookingStatus = db.prepare("UPDATE bookings SET status = 'selesai' WHERE id = ?");
const stmtUpdateBookingUnit = db.prepare("UPDATE bookings SET unit_id = ? WHERE id = ?");
const stmtCancelBooking = db.prepare("UPDATE bookings SET status = 'batal' WHERE id = ?");
const stmtSelectBookingDetail = db.prepare(
  `SELECT b.*, u.name AS unit_name, u.type AS unit_type, u.rate AS unit_rate
   FROM bookings b JOIN units u ON u.id = b.unit_id
   WHERE b.id = ?`
);

// Pre-defined transaction for check-in
const txnCheckInBooking = db.transaction((finalUnitId, bookingId, customerName, durationHours, isDifferentUnit) => {
  if (isDifferentUnit) {
    stmtUpdateBookingUnit.run(finalUnitId, bookingId);
  }
  stmtInsertSession.run(finalUnitId, customerName, durationHours);
  stmtUpdateUnitStatus.run(finalUnitId);
  stmtUpdateBookingStatus.run(bookingId);
});

function timeToMinutes(timeStr) {
  const [h, m] = (timeStr || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Validasi format tanggal YYYY-MM-DD yang benar-benar ada di kalender.
function isValidDate(value) {
  const s = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime()) && s === d.toISOString().slice(0, 10);
}

// Validasi format jam HH:MM (00:00 - 23:59).
function isValidTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

// Durasi booking: bilangan bulat 1-24 jam.
function parseDurationHours(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 24) return null;
  return n;
}

// GET /api/bookings
router.get("/", (req, res) => {
  res.json(stmtSelectBookingsWithUnits.all());
});

// GET /api/bookings/availability -> Cek ketersediaan unit berdasarkan tanggal, waktu, durasi, dan tipe unit
router.get("/availability", (req, res) => {
  const { date, time, durationHours = 1, type } = req.query;
  if (!date || !time) {
    return res.status(400).json({ error: "Tanggal (date) dan waktu (time) wajib diisi." });
  }
  if (!isValidDate(date) || !isValidTime(time)) {
    return res.status(400).json({ error: "Format tanggal atau waktu tidak valid." });
  }

  const reqDur = parseDurationHours(durationHours);
  if (reqDur === null) {
    return res.status(400).json({ error: "Durasi harus bilangan bulat 1-24 jam." });
  }
  const newStartMins = timeToMinutes(time);
  const newEndMins = newStartMins + reqDur * 60;

  let units = stmtSelectAllUnits.all();
  if (type) {
    units = units.filter((u) => u.type.toLowerCase() === type.toLowerCase());
  }

  const availableUnits = [];
  const unavailableUnits = [];

  for (const unit of units) {
    const existingBookings = stmtSelectBookingsByDateUnit.all(unit.id, date);
    const conflicting = existingBookings.find((b) => {
      const bStart = timeToMinutes(b.booking_time);
      const bEnd = bStart + (b.duration_hours || 1) * 60;
      return newStartMins < bEnd && newEndMins > bStart;
    });

    if (!conflicting) {
      availableUnits.push(unit);
    } else {
      unavailableUnits.push({ ...unit, conflictingBooking: conflicting });
    }
  }

  res.json({
    date,
    time,
    durationHours: reqDur,
    typeFilter: type || "Semua",
    availableCount: availableUnits.length,
    availableUnits,
    unavailableUnits,
  });
});

// GET /api/bookings/:id -> Detail booking berdasarkan ID
router.get("/:id", (req, res) => {
  const bookingId = Number(req.params.id);
  if (isNaN(bookingId)) {
    return res.status(400).json({ error: "ID booking tidak valid." });
  }
  const booking = stmtSelectBookingDetail.get(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "Booking tidak ditemukan." });
  }
  res.json(booking);
});

// POST /api/bookings/:id/cancel -> Pembatalan booking
router.post("/:id/cancel", (req, res) => {
  const bookingId = Number(req.params.id);
  if (isNaN(bookingId)) {
    return res.status(400).json({ error: "ID booking tidak valid." });
  }
  const booking = stmtSelectBookingById.get(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "Booking tidak ditemukan." });
  }
  if (booking.status === "batal") {
    return res.status(400).json({ error: "Booking sudah dibatalkan sebelumnya." });
  }
  if (booking.status === "selesai") {
    return res.status(400).json({ error: "Booking sudah selesai dan tidak dapat dibatalkan." });
  }

  stmtCancelBooking.run(bookingId);
  logAudit(
    req,
    "BOOKING_BATAL",
    `Booking #${bookingId} (${booking.customer_name}, ${booking.booking_date} ${booking.booking_time}) dibatalkan`
  );
  res.json({ ok: true, message: "Booking berhasil dibatalkan.", bookingId });
});

// POST /api/bookings -> Buat booking baru dengan validasi bentrok jam & rekomendasi bilik kosong
router.post("/", (req, res) => {
  const { customerName, customerPhone, unitId, date, time, durationHours = 1 } = req.body;
  if (!customerName || !unitId || !date || !time) {
    return res.status(400).json({ error: "Data booking belum lengkap." });
  }

  const cleanName = String(customerName).trim();
  if (cleanName.length < 2 || cleanName.length > 64) {
    return res.status(400).json({ error: "Nama pelanggan harus 2-64 karakter." });
  }

  let cleanPhone = null;
  if (customerPhone) {
    cleanPhone = String(customerPhone).trim();
    if (!/^[0-9+\-\s()]{6,20}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Nomor telepon tidak valid (6-20 digit)." });
    }
  }

  const requestedUnitId = Number(unitId);
  if (!Number.isInteger(requestedUnitId) || requestedUnitId <= 0) {
    return res.status(400).json({ error: "Unit tidak valid." });
  }
  if (!stmtSelectUnitById.get(requestedUnitId)) {
    return res.status(404).json({ error: "Unit tidak ditemukan." });
  }

  if (!isValidDate(date) || !isValidTime(time)) {
    return res.status(400).json({ error: "Format tanggal atau waktu tidak valid." });
  }

  const requestedDur = parseDurationHours(durationHours);
  if (requestedDur === null) {
    return res.status(400).json({ error: "Durasi harus bilangan bulat 1-24 jam." });
  }
  const newStartMins = timeToMinutes(time);
  const newEndMins = newStartMins + requestedDur * 60;

  // Cek apakah ada booking lain di unit tersebut yang bentrok jamnya
  const existingBookings = stmtSelectBookingsByDateUnit.all(requestedUnitId, date);
  const conflicting = existingBookings.find((b) => {
    const bStart = timeToMinutes(b.booking_time);
    const bEnd = bStart + (b.duration_hours || 1) * 60;
    return newStartMins < bEnd && newEndMins > bStart;
  });

  if (conflicting) {
    const targetUnitInfo = stmtSelectUnitById.get(requestedUnitId);
    const unitName = targetUnitInfo ? targetUnitInfo.name : `Unit ${requestedUnitId}`;
    
    // Cari bilik alternatif yang kosong pada rentang waktu tersebut
    const allUnits = stmtSelectAllUnits.all();
    const availableUnits = allUnits.filter((u) => {
      if (u.id === requestedUnitId) return false;
      const uBookings = stmtSelectBookingsByDateUnit.all(u.id, date);
      const isOverlap = uBookings.some((b) => {
        const bStart = timeToMinutes(b.booking_time);
        const bEnd = bStart + (b.duration_hours || 1) * 60;
        return newStartMins < bEnd && newEndMins > bStart;
      });
      return !isOverlap;
    });

    const altText = availableUnits.length > 0
      ? ` Rekomendasi bilik alternatif: ${availableUnits.map((u) => u.name).join(", ")}.`
      : "";

    return res.status(409).json({
      error: `Waktu bentrok! ${unitName} sudah dibooking jam ${conflicting.booking_time} oleh ${conflicting.customer_name}.${altText}`,
      conflictingBooking: conflicting,
      availableUnits,
    });
  }

  const targetUnitInfo = stmtSelectUnitById.get(requestedUnitId);
  const unitName = targetUnitInfo ? targetUnitInfo.name : `Unit ${requestedUnitId}`;

  const info = stmtInsertBooking.run(
    cleanName,
    cleanPhone,
    requestedUnitId,
    date,
    time,
    requestedDur
  );

  logAudit(req, "BOOKING_TAMBAH", `Booking #${info.lastInsertRowid}: ${cleanName} di ${unitName} (${date} ${time}, ${requestedDur} jam)`);

  if (req.io) {
    req.io.emit("new_booking_notification", {
      bookingId: info.lastInsertRowid,
      customerName: cleanName,
      unitName,
      date,
      time,
      durationHours: requestedDur,
      isWhatsapp: !!cleanPhone,
    });
  }

  res.json({ id: info.lastInsertRowid, message: "Booking berhasil dibuat." });
});

// POST /api/bookings/:id/checkin -> check-in booking ke sesi aktif
router.post("/:id/checkin", (req, res) => {
  const bookingId = Number(req.params.id);
  const { targetUnitId } = req.body;

  const booking = stmtSelectBookingById.get(bookingId);
  if (!booking) return res.status(404).json({ error: "Booking tidak ditemukan." });

  const finalUnitId = targetUnitId ? Number(targetUnitId) : booking.unit_id;
  const unit = stmtSelectUnitById.get(finalUnitId);

  if (!unit) return res.status(404).json({ error: "Unit tidak ditemukan." });
  if (unit.status === "active") {
    const allUnits = stmtSelectAllUnits.all();
    const idleUnits = allUnits.filter((u) => u.status !== "active");
    return res.status(409).json({
      error: `${unit.name} sedang terpakai oleh pelanggan lain. Pilih unit alternatif atau pindahkan sesi aktif terlebih dahulu.`,
      idleUnits,
    });
  }

  const isDifferentUnit = finalUnitId !== booking.unit_id;
  txnCheckInBooking(finalUnitId, bookingId, booking.customer_name, booking.duration_hours || 1, isDifferentUnit);

  logAudit(req, "BOOKING_CHECKIN", `Booking #${bookingId} (${booking.customer_name}) check-in ke ${unit.name}`);

  res.json({ ok: true, unitName: unit.name });
});

module.exports = router;
