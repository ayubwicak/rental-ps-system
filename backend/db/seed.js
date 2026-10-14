const bcrypt = require("bcryptjs");
const db = require("./index");

function seed() {
  const unitCount = db.prepare("SELECT COUNT(*) AS c FROM units").get().c;
  if (unitCount === 0) {
    const insertUnit = db.prepare(
      "INSERT INTO units (name, type, rate) VALUES (?, ?, ?)"
    );
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
    const insertAddon = db.prepare(
      "INSERT INTO addons (name, price) VALUES (?, ?)"
    );
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

  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const defaultPasswordHash = bcrypt.hashSync("admin123", 10);
    const admin1234PasswordHash = bcrypt.hashSync("1234567", 10);
    const insertUser = db.prepare(
      "INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)"
    );
    insertUser.run("admin", defaultPasswordHash, "Administrator", "admin");
    insertUser.run("admin1234", admin1234PasswordHash, "Admin 1234", "admin");
    console.log("Seeded default users:");
    console.log(" - username: admin / password: admin123");
    console.log(" - username: admin1234 / password: 1234567");
  } else {
    // Pastikan admin1234 ada di DB
    const admin1234 = db.prepare("SELECT * FROM users WHERE username = ?").get("admin1234");
    if (!admin1234) {
      const admin1234PasswordHash = bcrypt.hashSync("1234567", 10);
      db.prepare(
        "INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)"
      ).run("admin1234", admin1234PasswordHash, "Admin 1234", "admin");
      console.log("Added user -> username: admin1234 / password: 1234567");
    }
  }
}

seed();
console.log("Seeding selesai.");
