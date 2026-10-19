require("../env"); // muat ADMIN_PASSWORD & BOT_PASSWORD dari backend/.env
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("./index");

const MIN_PASSWORD_LENGTH = 8;
const DEFAULT_ADMIN_PASSWORD = "admin123";
const BACKDOOR_USERNAME = "admin1234";
const BACKDOOR_PASSWORD = "1234567";

function generatePassword(length = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function resolvePassword(envValue, label) {
  if (envValue && String(envValue).length >= MIN_PASSWORD_LENGTH) return String(envValue);
  if (envValue) {
    console.warn(`[Peringatan] ${label} diabaikan karena kurang dari ${MIN_PASSWORD_LENGTH} karakter.`);
  }
  return generatePassword();
}

function seedUnitsAndAddons() {
  const unitCount = db.prepare("SELECT COUNT(*) AS c FROM units").get().c;
  if (unitCount === 0) {
    const insertUnit = db.prepare("INSERT INTO units (name, type, rate) VALUES (?, ?, ?)");
    const units = [
      ["Bilik 1", "PS5", 10000],
      ["Bilik 2", "PS5", 10000],
      ["Bilik 3", "PS4", 7000],
      ["Bilik 4", "PS4", 7000],
      ["Bilik 5", "PS4", 7000],
      ["Bilik VIP", "PS5", 15000],
    ];
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insertUnit.run(...row);
    });
    insertMany(units);
    console.log(`Seeded ${units.length} units.`);
  }

  const addonCount = db.prepare("SELECT COUNT(*) AS c FROM addons").get().c;
  if (addonCount === 0) {
    const insertAddon = db.prepare("INSERT INTO addons (name, price) VALUES (?, ?)");
    const addons = [
      ["Mineral 600ml", 5000],
      ["Keripik", 8000],
      ["Mie Instan", 10000],
      ["Kopi Sachet", 6000],
    ];
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insertAddon.run(...row);
    });
    insertMany(addons);
    console.log(`Seeded ${addons.length} add-ons.`);
  }
}

function removeBackdoorUser() {
  const backdoor = db.prepare("SELECT * FROM users WHERE username = ?").get(BACKDOOR_USERNAME);
  if (!backdoor) return;
  if (bcrypt.compareSync(BACKDOOR_PASSWORD, backdoor.password_hash)) {
    db.prepare("DELETE FROM users WHERE id = ?").run(backdoor.id);
    console.log(`[Keamanan] Akun bawaan tidak aman "${BACKDOOR_USERNAME}" dihapus.`);
  } else {
    console.log(
      `[Info] Akun "${BACKDOOR_USERNAME}" ditemukan tetapi passwordnya sudah diganti manual, dibiarkan.`
    );
  }
}

function provisionAdmin() {
  const stmtInsertUser = db.prepare(
    "INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)"
  );
  const admin = db
    .prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")
    .get();

  const envPassword = process.env.ADMIN_PASSWORD;

  if (!admin) {
    const password = resolvePassword(envPassword, "ADMIN_PASSWORD");
    stmtInsertUser.run("admin", bcrypt.hashSync(password, 10), "Administrator", "admin");
    console.log("\n[Keamanan] Akun admin dibuat.");
    console.log("  Username : admin");
    console.log(`  Password : ${password}`);
    console.log("  Simpan password ini dan segera ganti lewat menu Pengaturan.\n");
    return;
  }

  const masihDefault = bcrypt.compareSync(DEFAULT_ADMIN_PASSWORD, admin.password_hash);

  if (masihDefault || (envPassword && String(envPassword).length >= MIN_PASSWORD_LENGTH)) {
    const password = resolvePassword(envPassword, "ADMIN_PASSWORD");
    if (!bcrypt.compareSync(password, admin.password_hash)) {
      db.prepare(
        "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?"
      ).run(bcrypt.hashSync(password, 10), admin.id);
      console.log("\n[Keamanan] Password admin default terdeteksi dan telah diganti.");
      console.log(`  Username : ${admin.username}`);
      console.log(`  Password baru : ${password}`);
      console.log("  Semua sesi login lama otomatis berakhir.");
      console.log("  Simpan password ini dan segera ganti lewat menu Pengaturan.\n");
    }
  }
}

function provisionBotUser() {
  const username = (process.env.BOT_USERNAME || "bot").trim();
  const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  const envPassword = process.env.BOT_PASSWORD;

  if (!existing) {
    const password = resolvePassword(envPassword, "BOT_PASSWORD");
    db.prepare("INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)").run(
      username,
      bcrypt.hashSync(password, 10),
      "Bot WhatsApp",
      "kasir"
    );
    console.log("\n[Keamanan] Akun khusus bot WhatsApp dibuat (role kasir, bukan admin).");
    console.log(`  Username : ${username}`);
    console.log(`  Password : ${password}`);
    console.log("  Salin ke rental-ps-whatsapp-bot/.env (RENTAL_API_USERNAME & RENTAL_API_PASSWORD).\n");
    return;
  }

  if (envPassword && String(envPassword).length >= MIN_PASSWORD_LENGTH) {
    if (!bcrypt.compareSync(String(envPassword), existing.password_hash)) {
      db.prepare(
        "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?"
      ).run(bcrypt.hashSync(String(envPassword), 10), existing.id);
      console.log(`[Keamanan] Password akun bot "${username}" diperbarui dari BOT_PASSWORD.`);
    }
  }
}

function seed() {
  seedUnitsAndAddons();
  removeBackdoorUser();
  provisionAdmin();
  provisionBotUser();
}

seed();
console.log("Seeding selesai.");
