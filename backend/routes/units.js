const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { logAudit } = require("../utils/audit");

const router = express.Router();
router.use(requireAuth);

// Prepared Statements Pre-compiled at module scope
const stmtSelectAllUnits = db.prepare("SELECT * FROM units ORDER BY id");
const stmtSelectActiveSessionByUnit = db.prepare(
  "SELECT * FROM sessions WHERE unit_id = ? AND status IN ('active', 'paused')"
);
const stmtSelectSessionAddons = db.prepare(
  `SELECT sa.qty, a.id, a.name, a.price, a.stock
   FROM session_addons sa JOIN addons a ON a.id = sa.addon_id
   WHERE sa.session_id = ?`
);
const stmtSelectAllAddons = db.prepare("SELECT * FROM addons ORDER BY id");
const stmtUpdateAddon = db.prepare("UPDATE addons SET name = ?, price = ?, stock = ? WHERE id = ?");
const stmtInsertAddon = db.prepare("INSERT INTO addons (name, price, stock) VALUES (?, ?, ?)");
const stmtDeleteAddon = db.prepare("DELETE FROM addons WHERE id = ?");
const stmtSelectUnitById = db.prepare("SELECT * FROM units WHERE id = ?");
const stmtInsertSession = db.prepare(
  `INSERT INTO sessions (unit_id, customer_name, member_id, duration_mode, package_hours, status)
   VALUES (?, ?, ?, ?, ?, 'active')`
);
const stmtInsertSessionAddon = db.prepare(
  "INSERT INTO session_addons (session_id, addon_id, qty) VALUES (?, ?, ?)"
);
const stmtUpdateAddonStock = db.prepare("UPDATE addons SET stock = MAX(0, stock - ?) WHERE id = ?");
const stmtUpdateUnitStatus = db.prepare("UPDATE units SET status = ? WHERE id = ?");
const stmtSelectActiveSessionOnly = db.prepare(
  "SELECT * FROM sessions WHERE unit_id = ? AND status = 'active'"
);
const stmtPauseSession = db.prepare(
  "UPDATE sessions SET status = 'paused', paused_at = datetime('now') WHERE id = ?"
);
const stmtSelectPausedSessionOnly = db.prepare(
  "SELECT * FROM sessions WHERE unit_id = ? AND status = 'paused'"
);
const stmtResumeSession = db.prepare(
  "UPDATE sessions SET status = 'active', paused_at = NULL, total_paused_sec = ? WHERE id = ?"
);
const stmtUpdateSessionUnitId = db.prepare("UPDATE sessions SET unit_id = ? WHERE id = ?");
const stmtSelectAddonsWithPrice = db.prepare(
  `SELECT sa.qty, a.price FROM session_addons sa
   JOIN addons a ON a.id = sa.addon_id WHERE sa.session_id = ?`
);
const stmtCloseSession = db.prepare("UPDATE sessions SET status = 'closed' WHERE id = ?");
const stmtInsertTransaction = db.prepare(
  `INSERT INTO transactions
   (session_id, unit_id, unit_name, customer_name, member_id, duration_sec, rental_cost, addons_cost, discount_amount, discount_reason, total, payment_method)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const stmtDeductMemberPoints = db.prepare("UPDATE members SET points = MAX(0, points - ?) WHERE id = ?");
const stmtAddMemberPoints = db.prepare("UPDATE members SET points = points + ? WHERE id = ?");
const stmtSelectMemberById = db.prepare("SELECT * FROM members WHERE id = ?");

const stmtSelectAddonById = db.prepare("SELECT * FROM addons WHERE id = ?");
const stmtUpdateSessionAddonQty = db.prepare(
  "UPDATE session_addons SET qty = ? WHERE session_id = ? AND addon_id = ?"
);
const stmtDeleteSessionAddon = db.prepare(
  "DELETE FROM session_addons WHERE session_id = ? AND addon_id = ?"
);
const stmtAdjustAddonStock = db.prepare(
  "UPDATE addons SET stock = stock - ? WHERE id = ?"
);

// GET /api/units -> semua unit + sesi aktif / paused
router.get("/", (req, res) => {
  const units = stmtSelectAllUnits.all();
  const withSessions = units.map((u) => {
    if (u.status !== "active") return { ...u, session: null };
    const session = stmtSelectActiveSessionByUnit.get(u.id);
    if (!session) return { ...u, session: null };
    const addons = stmtSelectSessionAddons.all(session.id);
    return { ...u, session: { ...session, addons } };
  });
  res.json(withSessions);
});

// GET /api/units/addons -> daftar add-on yang tersedia
router.get("/addons", (req, res) => {
  res.json(stmtSelectAllAddons.all());
});

// POST /api/units/addons -> tambah / update add-on
router.post("/addons", (req, res) => {
  const { id, name, price, stock } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: "Nama dan harga add-on wajib diisi." });
  }

  const cleanName = String(name).trim();
  if (cleanName.length < 2 || cleanName.length > 64) {
    return res.status(400).json({ error: "Nama add-on harus 2-64 karakter." });
  }

  const cleanPrice = Number(price);
  if (!Number.isInteger(cleanPrice) || cleanPrice < 0 || cleanPrice > 100000000) {
    return res.status(400).json({ error: "Harga harus berupa angka bulat yang wajar." });
  }

  const cleanStock = Number(stock === undefined ? 0 : stock);
  if (!Number.isInteger(cleanStock) || cleanStock < 0 || cleanStock > 1000000) {
    return res.status(400).json({ error: "Stok harus berupa angka bulat yang wajar." });
  }

  if (id) {
    const existingAddon = stmtSelectAddonById.get(Number(id));
    if (!existingAddon) {
      return res.status(404).json({ error: "Add-on tidak ditemukan." });
    }
    stmtUpdateAddon.run(cleanName, cleanPrice, cleanStock, Number(id));
    logAudit(
      req,
      "ADDON_UBAH",
      `Mengubah add-on "${cleanName}" (Rp${cleanPrice}, stok ${cleanStock})`
    );
    res.json({ message: "Add-on berhasil diperbarui." });
  } else {
    const info = stmtInsertAddon.run(cleanName, cleanPrice, cleanStock || 100);
    logAudit(
      req,
      "ADDON_TAMBAH",
      `Menambah add-on "${cleanName}" (Rp${cleanPrice}, stok ${cleanStock || 100})`
    );
    res.json({ id: info.lastInsertRowid, name: cleanName, price: cleanPrice, stock: cleanStock || 100 });
  }
});

// DELETE /api/units/addons/:id -> hanya admin (kasir tetap bisa kelola stok/harga)
router.delete("/addons/:id", requireAdmin, (req, res) => {
  const addonId = Number(req.params.id);
  if (!Number.isInteger(addonId) || addonId <= 0) {
    return res.status(400).json({ error: "ID add-on tidak valid." });
  }
  const addon = stmtSelectAddonById.get(addonId);
  if (!addon) {
    return res.status(404).json({ error: "Add-on tidak ditemukan." });
  }
  stmtDeleteAddon.run(addonId);
  logAudit(req, "ADDON_HAPUS", `Menghapus add-on "${addon.name}" (Rp${addon.price})`);
  res.json({ message: "Add-on berhasil dihapus." });
});

// POST /api/units/:id/start
router.post("/:id/start", (req, res) => {
  const unitId = Number(req.params.id);
  const { customerName, memberId, durationMode = "open", packageHours = 0, addons = [] } = req.body;

  if (!Number.isInteger(unitId) || unitId <= 0) {
    return res.status(400).json({ error: "ID unit tidak valid." });
  }

  const cleanCustomer = customerName ? String(customerName).trim() : "Umum";
  if (cleanCustomer.length < 2 || cleanCustomer.length > 64) {
    return res.status(400).json({ error: "Nama pelanggan harus 2-64 karakter." });
  }

  if (!["open", "package"].includes(durationMode)) {
    return res.status(400).json({ error: "Mode durasi tidak valid." });
  }

  let cleanPackageHours = 0;
  if (durationMode === "package") {
    cleanPackageHours = Number(packageHours);
    if (!Number.isInteger(cleanPackageHours) || cleanPackageHours < 1 || cleanPackageHours > 24) {
      return res.status(400).json({ error: "Durasi paket harus bilangan bulat 1-24 jam." });
    }
  }

  let cleanMemberId = null;
  if (memberId) {
    cleanMemberId = Number(memberId);
    if (!Number.isInteger(cleanMemberId) || !stmtSelectMemberById.get(cleanMemberId)) {
      return res.status(400).json({ error: "Member tidak ditemukan." });
    }
  }

  if (!Array.isArray(addons)) {
    return res.status(400).json({ error: "Daftar add-on tidak valid." });
  }
  const cleanAddons = addons.map((a) => ({
    id: Number(a.id),
    qty: Math.floor(Number(a.qty) || 0),
  }));
  if (
    cleanAddons.some(
      (a) => !Number.isInteger(a.id) || a.id <= 0 || !Number.isInteger(a.qty) || a.qty < 0 || a.qty > 99
    )
  ) {
    return res.status(400).json({ error: "Item add-on tidak valid." });
  }

  const unit = stmtSelectUnitById.get(unitId);
  if (!unit) return res.status(404).json({ error: "Unit tidak ditemukan." });
  if (unit.status === "active") {
    return res.status(409).json({ error: "Unit sedang dipakai." });
  }

  const run = db.transaction(() => {
    const info = stmtInsertSession.run(
      unitId,
      cleanCustomer,
      cleanMemberId,
      durationMode,
      cleanPackageHours
    );
    const sessionId = info.lastInsertRowid;

    for (const a of cleanAddons) {
      if (a.qty > 0) {
        const addon = stmtSelectAddonById.get(a.id);
        if (!addon) throw new Error("Item kantin tidak ditemukan.");
        if (addon.stock < a.qty) {
          throw new Error(`Stok ${addon.name} kurang (sisa ${addon.stock}).`);
        }
        stmtInsertSessionAddon.run(sessionId, a.id, a.qty);
        stmtUpdateAddonStock.run(a.qty, a.id);
      }
    }

    stmtUpdateUnitStatus.run("active", unitId);
    return sessionId;
  });

  let sessionId;
  try {
    sessionId = run();
  } catch (err) {
    return res.status(400).json({ error: err.message || "Gagal memulai sesi." });
  }

  logAudit(
    req,
    "SESI_MULAI",
    `Sesi #${sessionId} dimulai di ${unit.name} untuk ${cleanCustomer} (${durationMode}${cleanPackageHours ? ` ${cleanPackageHours} jam` : ""})`
  );
  res.json({ sessionId });
});

// POST /api/units/:id/pause
router.post("/:id/pause", (req, res) => {
  const unitId = Number(req.params.id);
  const session = stmtSelectActiveSessionOnly.get(unitId);
  if (!session) return res.status(404).json({ error: "Tidak ada sesi aktif untuk di-pause." });

  stmtPauseSession.run(session.id);
  res.json({ message: "Sesi berhasil di-pause." });
});

// POST /api/units/:id/resume
router.post("/:id/resume", (req, res) => {
  const unitId = Number(req.params.id);
  const session = stmtSelectPausedSessionOnly.get(unitId);
  if (!session) return res.status(404).json({ error: "Tidak ada sesi paused untuk dilanjutkan." });

  const pausedMs = new Date(session.paused_at + "Z").getTime();
  const pausedDurationSec = Math.max(0, Math.floor((Date.now() - pausedMs) / 1000));
  const newTotalPausedSec = (session.total_paused_sec || 0) + pausedDurationSec;

  stmtResumeSession.run(newTotalPausedSec, session.id);
  res.json({ message: "Sesi dilanjutkan." });
});

// POST /api/units/:id/addons -> tambah / update makanan & minuman pada sesi berjalan
router.post("/:id/addons", (req, res) => {
  const unitId = Number(req.params.id);
  const { addons = [] } = req.body; // [{ id, qty }]

  const session = stmtSelectActiveSessionByUnit.get(unitId);
  if (!session) {
    return res.status(404).json({ error: "Tidak ada sesi aktif pada unit ini." });
  }

  const run = db.transaction(() => {
    const currentItems = stmtSelectSessionAddons.all(session.id);
    const currentMap = new Map(currentItems.map((a) => [a.id, a.qty]));

    for (const item of addons) {
      const addonId = Number(item.id);
      const targetQty = Math.max(0, Number(item.qty) || 0);
      const oldQty = currentMap.get(addonId) || 0;
      const diff = targetQty - oldQty;

      if (diff > 0) {
        const addonInfo = stmtSelectAddonById.get(addonId);
        if (!addonInfo) throw new Error("Item kantin tidak ditemukan.");
        if (addonInfo.stock < diff) {
          throw new Error(`Stok ${addonInfo.name} kurang (sisa ${addonInfo.stock}).`);
        }
      }

      if (targetQty > 0) {
        if (oldQty > 0) {
          stmtUpdateSessionAddonQty.run(targetQty, session.id, addonId);
        } else {
          stmtInsertSessionAddon.run(session.id, addonId, targetQty);
        }
      } else if (oldQty > 0) {
        stmtDeleteSessionAddon.run(session.id, addonId);
      }

      if (diff !== 0) {
        stmtAdjustAddonStock.run(diff, addonId);
      }
    }
  });

  try {
    run();
    res.json({ message: "Pesanan makanan & minuman berhasil diperbarui." });
  } catch (err) {
    res.status(400).json({ error: err.message || "Gagal memperbarui pesanan." });
  }
});

// POST /api/units/:id/switch -> pindah unit
router.post("/:id/switch", (req, res) => {
  const sourceUnitId = Number(req.params.id);
  const { targetUnitId } = req.body;

  if (!targetUnitId || sourceUnitId === Number(targetUnitId)) {
    return res.status(400).json({ error: "Unit tujuan tidak valid." });
  }

  const session = stmtSelectActiveSessionByUnit.get(sourceUnitId);
  if (!session) return res.status(404).json({ error: "Sesi asal tidak ditemukan." });

  const targetUnit = stmtSelectUnitById.get(targetUnitId);
  if (!targetUnit) return res.status(404).json({ error: "Unit tujuan tidak ditemukan." });
  if (targetUnit.status === "active") {
    return res.status(409).json({ error: "Unit tujuan sedang terpakai." });
  }

  db.transaction(() => {
    stmtUpdateSessionUnitId.run(targetUnitId, session.id);
    stmtUpdateUnitStatus.run("idle", sourceUnitId);
    stmtUpdateUnitStatus.run("active", targetUnitId);
  })();

  logAudit(req, "SESI_PINDAH", `Sesi #${session.id} pindah dari unit #${sourceUnitId} ke ${targetUnit.name}`);
  res.json({ message: `Sesi berhasil dipindahkan ke ${targetUnit.name}.` });
});

// POST /api/units/:id/stop -> hitung total & catat transaksi
router.post("/:id/stop", (req, res) => {
  const unitId = Number(req.params.id);
  const { paymentMethod, discountAmount = 0, discountReason = "", redeemPoints = 0 } = req.body;
  if (!["cash", "qris", "transfer"].includes(paymentMethod)) {
    return res.status(400).json({ error: "Metode pembayaran tidak valid." });
  }

  const unit = stmtSelectUnitById.get(unitId);
  const session = stmtSelectActiveSessionByUnit.get(unitId);
  if (!unit || !session) {
    return res.status(404).json({ error: "Tidak ada sesi aktif pada unit ini." });
  }

  const redeemPts = Math.max(0, Math.floor(Number(redeemPoints) || 0));
  const discountValue = Math.max(0, Math.floor(Number(discountAmount) || 0));

  // Validasi penukaran poin: wajib sesi member & saldo poin mencukupi
  let member = null;
  if (redeemPts > 0) {
    if (!session.member_id) {
      return res.status(400).json({ error: "Penukaran poin hanya bisa dilakukan pada sesi member." });
    }
    member = stmtSelectMemberById.get(session.member_id);
    if (!member) {
      return res.status(404).json({ error: "Member pada sesi ini tidak ditemukan." });
    }
    if ((member.points || 0) < redeemPts) {
      return res
        .status(400)
        .json({ error: `Poin member tidak mencukupi (tersedia: ${member.points || 0} poin).` });
    }
  }

  const addons = stmtSelectAddonsWithPrice.all(session.id);
  const addonsCost = addons.reduce((s, a) => s + a.price * a.qty, 0);

  const startMs = new Date(session.start_time + "Z").getTime();
  let pausedSec = session.total_paused_sec || 0;
  if (session.status === "paused" && session.paused_at) {
    pausedSec += Math.floor((Date.now() - new Date(session.paused_at + "Z").getTime()) / 1000);
  }

  const rawDurationSec = Math.max(1, Math.floor((Date.now() - startMs) / 1000));
  const activeDurationSec = Math.max(1, rawDurationSec - pausedSec);

  let rentalCost = 0;
  if (session.duration_mode === "package" && session.package_hours > 0) {
    rentalCost = Math.round(session.package_hours * unit.rate);
  } else {
    rentalCost = Math.round((activeDurationSec / 3600) * unit.rate);
  }

  const pointDiscount = redeemPts * 200; // 1 poin = Rp 200
  const totalDiscount = Math.min(rentalCost + addonsCost, discountValue + pointDiscount);
  const total = Math.max(0, rentalCost + addonsCost - totalDiscount);

  const run = db.transaction(() => {
    stmtCloseSession.run(session.id);
    stmtUpdateUnitStatus.run("idle", unitId);

    const txInfo = stmtInsertTransaction.run(
      session.id,
      unitId,
      unit.name,
      session.customer_name,
      session.member_id,
      activeDurationSec,
      rentalCost,
      addonsCost,
      totalDiscount,
      discountReason || (redeemPts > 0 ? `Tukar ${redeemPts} Poin` : ""),
      total,
      paymentMethod
    );

    if (session.member_id) {
      if (redeemPts > 0) {
        stmtDeductMemberPoints.run(redeemPts, session.member_id);
      }
      const earnedPoints = Math.floor(total / 10000);
      stmtAddMemberPoints.run(earnedPoints, session.member_id);
    }

    return txInfo.lastInsertRowid;
  });

  const transactionId = run();
  logAudit(
    req,
    "TRANSAKSI",
    `Transaksi #${transactionId}: ${unit.name} / ${session.customer_name} — total Rp${total} (${paymentMethod})`
  );
  res.json({
    transactionId,
    durationSec: activeDurationSec,
    rentalCost,
    addonsCost,
    discountAmount: totalDiscount,
    total,
    customerName: session.customer_name,
    unitName: unit.name,
    paymentMethod,
    createdAt: new Date().toISOString(),
  });
});

module.exports = router;
