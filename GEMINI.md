# Rental PS System — Pedoman Komprehensif & Aturan AI (GEMINI.md)

Dokumen ini berisi standar arsitektur, skema database, konvensi pengkodean backend & frontend, keamanan, serta aturan integrasi AI untuk repositori **Rental PS System**.

---

## 1. Arsitektur Proyek & Konsep Utama

Aplikasi ini menggunakan pola **Single Server Unified Application**:
- **Backend**: Node.js + Express.js (`backend/server.js`), berjalan secara default di port `4000`.
- **Database**: SQLite3 menggunakan driver synchronous `better-sqlite3` (`backend/db/rental-ps.sqlite`).
- **Realtime Sync**: Socket.io (`backend/server.js`) untuk sinkronisasi state antar layar kasir tanpa reload browser.
- **Frontend**: React + Vite (`frontend/`). Di-build ke `frontend/dist` dan disajikan secara statis oleh server Express.
- **Runner**: `start.js` otomatis mengecek dan membina frontend jika folder `frontend/dist` belum ada, lalu menjalankan server backend.

---

## 2. Struktur Skema Database (SQLite3)

Database menggunakan skema yang didefinisikan dalam `backend/db/schema.sql`. Setiap tabel memiliki aturan dan peran berikut:

1. **`users`**: Mengelola pengguna sistem (Admin & Kasir).
   - Columns: `id`, `username` (UNIQUE), `password_hash`, `name`, `role` (`'admin'` / `'kasir'`), `created_at`.
2. **`units`**: Unit Play Station (TV / Bilik).
   - Columns: `id`, `name`, `type` (`PS3` / `PS4` / `PS5`), `rate` (tarif/jam), `status` (`'idle'` / `'active'`), `created_at`.
3. **`members`**: Data pelanggan tetap / member.
   - Columns: `id`, `name`, `phone`, `points` (default 0), `created_at`.
4. **`addons`**: Barang tambahan (makanan/minuman).
   - Columns: `id`, `name`, `price`, `stock`.
5. **`sessions`**: Sesi rental yang sedang berjalan.
   - Columns: `id`, `unit_id` (FK `units.id`), `customer_name`, `member_id` (FK `members.id`), `start_time`, `duration_mode` (`'open'` / `'package'`), `package_hours`, `paused_at`, `total_paused_sec`, `status` (`'active'` / `'paused'` / `'closed'`).
6. **`session_addons`**: Item barang yang dipesan dalam satu sesi rental.
   - Columns: `id`, `session_id` (FK `sessions.id` ON DELETE CASCADE), `addon_id` (FK `addons.id`), `qty`.
7. **`transactions`**: Riwayat transaksi penyewaan yang telah selesai & dibayar.
   - Columns: `id`, `session_id`, `unit_id`, `unit_name`, `customer_name`, `member_id`, `duration_sec`, `rental_cost`, `addons_cost`, `discount_amount`, `discount_reason`, `total`, `payment_method` (`'cash'` / `'qris'` / `'transfer'`), `created_at`.
8. **`bookings`**: Pemesanan jadwal main PS.
   - Columns: `id`, `customer_name`, `unit_id` (FK `units.id`), `booking_date` (YYYY-MM-DD), `booking_time` (HH:MM), `duration_hours`, `status` (`'menunggu'` / `'terjadwal'` / `'selesai'` / `'batal'`), `created_at`.

---

## 3. Aturan Backend & Database (`backend/`)

### Database (`better-sqlite3`)
- **WAL Mode & Foreign Keys**: Selalu aktifkan `journal_mode = WAL` dan `foreign_keys = ON` pada koneksi SQLite (`backend/db/index.js`).
- **Transaksi Aman (`db.transaction`)**: Gunakan `db.transaction()` untuk operasi yang melibatkan beberapa query (contoh: menutup sesi + menambahkan transaksi + mengubah status unit ke `'idle'`).
- **Prepared Statements & Scope**: Gunakan prepared statements (`db.prepare(...)`) untuk keamanan terhadap SQL Injection.
- **Kompatibilitas Native Addon**: Pastikan versi `better-sqlite3` yang digunakan kompatibel dengan versi Node.js yang berjalan (gunakan `better-sqlite3` versi `^13.0.0` untuk Node.js 24+ agar tidak terjadi crash `(env) != nullptr` saat exit).

### Autentikasi & Keamanan
- **Hashing Password**: Menggunakan `bcryptjs` dengan salt round minimum `10`. *Jangan pernah mengembalikan `password_hash` ke respons API publik.* Login **hanya** boleh memverifikasi via `bcrypt.compare` (async) — jangan pernah menambahkan jalur alternatif (mis. password == username). Gunakan `DUMMY_HASH` saat username tidak ditemukan agar waktu respons sama (anti user-enumeration).
- **JWT & Authorization**: Gunakan Bearer Token (`jsonwebtoken`). Lindungi endpoint dengan middleware `requireAuth`. `JWT_SECRET` **wajib** dari `backend/.env` (dimuat `backend/env.js`); server gagal start jika kosong/nilai bawaan. Browser memakai cookie `httpOnly` + `SameSite=Strict` (`rentalku_token`); token dari cookie hanya diterima untuk request bermethod aman atau origin tepercaya (anti-CSRF lapis kedua). Endpoint non-browser tetap memakai header `Authorization: Bearer <token>`.
- **Anti Brute-Force**: Rate limit per-IP di `middleware/rateLimiter.js` + lockout per akun (5x gagal → terkunci 15 menit).
- **Audit Log**: Setiap mutasi penting wajib memanggil `logAudit(req, AKSI, detail)` (`utils/audit.js`) — mis. LOGIN, LOGIN_GAGAL, TRANSAKSI, SESI_MULAI, USER_*, ADDON_*, BOOKING_*.
- **HTTPS**: Opsional via `HTTPS_KEY`/`HTTPS_CERT` di `backend/.env`; cookie otomatis menjadi `Secure` saat HTTPS aktif.
- **CORS**: Daftar origin diizinkan dikontrol via env `CORS_ORIGIN` (dipisah koma) untuk Express & Socket.io. Default hanya origin dev (`localhost`/`127.0.0.1:5173`); kosongkan untuk same-origin saja (mode production single-server).
- **Validasi Bisnis di Server**: Setiap aturan bisnis (mis. batas penukaran poin member) harus divalidasi di backend — jangan percaya nilai dari frontend.
- **Role-Based Access Control (RBAC)**: Validasi `req.user.role === 'admin'` untuk endpoint manajemen user, penyesuaian tarif, atau penghapusan data sensitif.

### Realtime Synchronization (Socket.io)
- Middleware di Express (`server.js`) otomatis memicu `io.emit("sync_data", { method, path })` setelah mutasi data (POST, PUT, DELETE) berhasil dieksekusi.

---

## 4. Aturan Frontend (`frontend/`)

- **Teknologi**: React + Vite + Tailwind CSS.
- **Modul API Client (`src/api.js`)**: Mengatur panggilan HTTP ke `/api/*` dengan `credentials: "include"` (sesi cookie httpOnly). Jangan menyimpan token di `localStorage`. Handler 401 (`setUnauthorizedHandler`) mengembalikan UI ke halaman login.
- **Manajemen State Realtime**: Komponen utama wajib mendengarkan event Socket.io `sync_data` untuk memperbarui data unit/booking secara langsung tanpa reload halaman.
- **Format Mata Uang & Durasi**: Format angka biaya menggunakan standar Rupiah (`Rp X.XXX`) dan format durasi menggunakan hitungan jam/menit yang jelas.

---

## 5. Standar Format Respons Error API

Semua respons error dari Express API harus mengembalikan JSON dengan format yang konsisten:
```json
{
  "error": "Pesan deskripsi kesalahan dalam Bahasa Indonesia"
}
```

**Status Code Guidelines**:
- `400 Bad Request`: Input data tidak lengkap atau validasi gagal.
- `401 Unauthorized`: Token tidak valid, kadaluwarsa, atau kredensial salah.
- `403 Forbidden`: Pengguna tidak memiliki hak akses (role tidak mencukupi).
- `404 Not Found`: Resource yang diminta tidak ditemukan.
- `409 Conflict`: Konflik data (misal: username sudah terpakai).
- `500 Internal Server Error`: Kegagalan tak terduga pada server/database.

---

## 6. Perintah Utama & Workflow

| Perintah | Lokasi Run | Deskripsi |
| :--- | :--- | :--- |
| `npm run dev` | Root (`/`) | Menjalankan backend (`node --watch`) + frontend (Vite) berdua; `/api` & WebSocket di-proxy Vite ke backend |
| `npm run start` | Root (`/`) | Menjalankan aplikasi Single Server (`start.js`) — build frontend otomatis jika dist kosong/usang |
| `npm run build` | Root (`/`) | Melakukan build frontend ke `frontend/dist` |
| `npm run seed` | Root (`/`) | Mengisi database awal (akun `admin` + password acak/`ADMIN_PASSWORD`, unit PS, addons) dan akun bot WhatsApp (`bot`, role kasir); merotasi password default lama |
| `npm run install:all` | Root (`/`) | Menginstal dependensi backend & frontend |

### Aturan URL API Frontend
- `VITE_API_URL` **wajib relatif** (`/api`) — di-mode dev lewat proxy Vite, di produksi same-origin dengan backend.
- **Jangan** menyetel `VITE_API_URL` ke URL absolut `http://localhost:...` — nilai itu ter-bake ke bundle hasil build dan merusak akses dari device lain/produksi.
- Jika port backend berbeda saat dev, set target proxy: `VITE_BACKEND_URL=http://localhost:4001 npm run dev`.

---

## 7. Aturan Penulisan Kode (Coding Guidelines untuk AI)

1. **Modifikasi File**: Jaga struktur file yang ada dan ikuti pola yang sudah terbentuk di codebase.
2. **Bahasa Dokumentasi & Log**: Selalu tulis komentar kode, pesan error API, dan log konsol dalam **Bahasa Indonesia**.
3. **Verifikasi Setelah Edit**: Setiap kali mengubah kode backend atau frontend, jalankan verifikasi runtime (`npm run start` atau tes endpoint API) sebelum menyatakan pekerjaan selesai.

---

## 8. Aturan Git, Commit & Push GitHub (SPEC-GIT-NO-AI)

Repositori harus murni menampilkan identitas pemilik & tim (maks. 6 peserta) tanpa jejak bot/AI. Detail lengkap: `.agents/rules/git.md`.

1. **Larangan Atribusi AI**: Jangan pernah menulis `Co-authored-by:` (Claude/Cursor/Copilot/Gemini/ChatGPT), `Generated by/with AI`, atau sejenisnya di pesan commit.
2. **Agen AI Dilarang Commit/Push**: Terminal agen AI tidak boleh menjalankan `git commit`/`git push` secara otomatis — semua perintah git dijalankan manual oleh pengguna.
3. **Identitas Git**: `git config user.name`/`user.email` wajib akun GitHub pribadi (bukan bot). Verifikasi dengan `git config --list`.
4. **Git Hook Wajib Aktif**: `.git/hooks/commit-msg` (executable) otomatis menghapus baris atribusi AI dari pesan commit; jangan dihapus/dinonaktifkan.
5. **Format Commit**: Conventional Commits bergaya developer manusia, mis. `feat(sesi): tambah mode paket`, `fix(kasir): perbaiki diskon poin`, `docs(readme): perbarui panduan`.
6. **Prosedur Aman**: `git status` → `git add <file spesifik>` → `git commit -m "..."` → audit `git log -n 3 --pretty=format:"%h - %an <%ae> : %B"` → `git push`. File konfigurasi AI lokal (`.cursor/`, `.claude/`, `.aider*`, dll.) tidak boleh ter-commit (sudah ada di `.gitignore`).
7. **Pembersihan**: Jika atribusi AI terlanjur masuk: `git commit --amend --author="Nama <email>"` (belum di-push) atau `git filter-branch -f --msg-filter 'sed -E "/Co-authored-by:/Id"' HEAD` (seluruh riwayat).
