-- ===================================================
-- Skema Database: Sistem Penyewaan PS (SQLite)
-- ===================================================

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'kasir')) DEFAULT 'kasir',
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS units (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,             -- PS3 / PS4 / PS5
  rate       INTEGER NOT NULL,          -- tarif per jam (Rupiah)
  status     TEXT NOT NULL CHECK (status IN ('idle', 'active')) DEFAULT 'idle',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  phone      TEXT,
  points     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS addons (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL,
  stock      INTEGER NOT NULL DEFAULT 100
);

-- Sesi yang sedang berjalan (satu unit hanya boleh punya satu sesi aktif)
CREATE TABLE IF NOT EXISTS sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id          INTEGER NOT NULL REFERENCES units(id),
  customer_name    TEXT NOT NULL,
  member_id        INTEGER REFERENCES members(id),
  start_time       TEXT NOT NULL DEFAULT (datetime('now')),
  duration_mode    TEXT NOT NULL CHECK (duration_mode IN ('open', 'package')) DEFAULT 'open',
  package_hours    REAL DEFAULT 0,
  paused_at        TEXT,
  total_paused_sec INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL CHECK (status IN ('active', 'paused', 'closed')) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS session_addons (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  addon_id   INTEGER NOT NULL REFERENCES addons(id),
  qty        INTEGER NOT NULL DEFAULT 1
);

-- Riwayat transaksi (sesi yang sudah dibayar & ditutup)
CREATE TABLE IF NOT EXISTS transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      INTEGER REFERENCES sessions(id),
  unit_id         INTEGER NOT NULL REFERENCES units(id),
  unit_name       TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  member_id       INTEGER REFERENCES members(id),
  duration_sec    INTEGER NOT NULL,
  rental_cost     INTEGER NOT NULL,
  addons_cost     INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  discount_reason TEXT,
  total           INTEGER NOT NULL,
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash', 'qris', 'transfer')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT,
  unit_id        INTEGER NOT NULL REFERENCES units(id),
  booking_date   TEXT NOT NULL,   -- YYYY-MM-DD
  booking_time   TEXT NOT NULL,   -- HH:MM
  duration_hours INTEGER NOT NULL DEFAULT 1,
  status         TEXT NOT NULL CHECK (status IN ('menunggu', 'terjadwal', 'selesai', 'batal')) DEFAULT 'menunggu',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Jejak audit: siapa melakukan aksi penting (login, transaksi, ubah user, dll)
CREATE TABLE IF NOT EXISTS audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  username   TEXT NOT NULL DEFAULT '-',
  role       TEXT,
  action     TEXT NOT NULL,
  detail     TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_unit ON sessions(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
