const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "rental-ps.sqlite");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

if (fs.existsSync(SCHEMA_PATH)) {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);
}

// Auto migration check for customer_phone column on bookings
try {
  const tableInfo = db.prepare("PRAGMA table_info(bookings)").all();
  const hasPhone = tableInfo.some((col) => col.name === "customer_phone");
  if (!hasPhone) {
    db.exec("ALTER TABLE bookings ADD COLUMN customer_phone TEXT;");
  }
} catch (e) {
  // Ignore migration error if table does not exist yet
}

// Auto migration check for token_version column on users (invalidasi sesi JWT)
try {
  const userTableInfo = db.prepare("PRAGMA table_info(users)").all();
  const hasTokenVersion = userTableInfo.some((col) => col.name === "token_version");
  if (!hasTokenVersion) {
    db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;");
  }
} catch (e) {
  // Ignore migration error if table does not exist yet
}

module.exports = db;
