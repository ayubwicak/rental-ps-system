const { spawnSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const rootDir = __dirname;
const frontendDir = path.join(rootDir, "frontend");
const frontendDist = path.join(frontendDir, "dist");
const distIndex = path.join(frontendDist, "index.html");

// Cari waktu modifikasi terbaru secara rekursif (di atas threshold ms tertentu agar hemat I/O)
function newestMtimeMs(dir, skipNames = new Set(["node_modules", "dist", ".git"])) {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipNames.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtimeMs(full, skipNames));
    } else {
      try {
        newest = Math.max(newest, fs.statSync(full).mtimeMs);
      } catch {
        // file mungkin hilang saat dibaca — abaikan
      }
    }
  }
  return newest;
}

// Build jika dist belum ada ATAU source frontend lebih baru dari hasil build (build usang)
function needsBuild() {
  if (!fs.existsSync(distIndex)) return true;
  const distMtime = fs.statSync(distIndex).mtimeMs;
  const sourceRoots = [
    path.join(frontendDir, "src"),
    path.join(frontendDir, "index.html"),
    path.join(frontendDir, "vite.config.js"),
    path.join(frontendDir, "tailwind.config.js"),
    path.join(frontendDir, "postcss.config.js"),
    path.join(frontendDir, "package.json"),
  ];
  for (const root of sourceRoots) {
    if (!fs.existsSync(root)) continue;
    const mtime = fs.statSync(root).isDirectory() ? newestMtimeMs(root) : fs.statSync(root).mtimeMs;
    if (mtime > distMtime) return true;
  }
  return false;
}

if (needsBuild()) {
  console.log("\x1b[33m[System] Build frontend belum ada atau sudah usang. Membangun frontend...\x1b[0m");
  const build = spawnSync("npm", ["run", "build"], {
    cwd: frontendDir,
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
  process.exit(code ?? 0);
});

function handleExit() {
  console.log("\n\x1b[31m[System] Menghentikan server...\x1b[0m");
  server.kill("SIGTERM");
  process.exit();
}

process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);
