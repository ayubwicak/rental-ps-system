const { spawnSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const rootDir = __dirname;
const frontendDist = path.join(rootDir, "frontend", "dist");

// Cek apakah frontend sudah di-build, jika belum -> build otomatis
if (!fs.existsSync(frontendDist)) {
  console.log("\x1b[33m[System] Build frontend belum ditemukan. Membangun frontend...\x1b[0m");
  const build = spawnSync("npm", ["run", "build"], {
    cwd: path.join(rootDir, "frontend"),
    shell: false,
    stdio: "inherit",
  });
  if (build.status !== 0) {
    console.error("\x1b[31m[Error] Gagal melakukan build frontend.\x1b[0m");
    process.exit(1);
  }
  console.log("\x1b[32m[System] Build frontend berhasil.\x1b[0m\n");
}

console.log("\x1b[1m\x1b[35m=== Memulai Rental PS System (Single Server) ===\x1b[0m\n");

const server = spawn("node", ["server.js"], {
  cwd: path.join(rootDir, "backend"),
  shell: false,
  stdio: "inherit",
});

server.on("close", (code) => {
  console.log(`Server berhenti dengan kode ${code}`);
});

function handleExit() {
  console.log("\n\x1b[31m[System] Menghentikan server...\x1b[0m");
  server.kill("SIGTERM");
  process.exit();
}

process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);
