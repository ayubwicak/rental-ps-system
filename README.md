# RentalKu — Sistem Penyewaan PS

Proyek terdiri dari dua folder terpisah:

```
rental-ps-system/
├── backend/     Node.js + Express + SQLite (API & database)
└── frontend/    React (Vite) + Tailwind — bisa diimpor ke project React kamu
```

## 1. Menjalankan Server (Single Server Mode)

Sistem telah disatukan secara penuh. Anda hanya perlu menjalankan **1 perintah** dari root folder untuk mengaktifkan seluruh aplikasi (Backend API & Frontend UI) di **satu alamat URL**:

```bash
npm start
```

Aplikasi langsung dapat diakses di browser melalui:
**`http://localhost:4000`**

*(Jika folder `frontend/dist` belum dibangun, sistem akan otomatis melakukan build frontend terlebih dahulu secara otomatis)*

---

## 2. Menjalankan Secara Terpisah (Opsional)

### Backend (database)
```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev                 # jalan di http://localhost:4000
```

Database SQLite disimpan otomatis di `backend/db/rental-ps.sqlite` — tidak perlu instalasi database server terpisah (MySQL/Postgres dsb).

**Akun bawaan:** `admin` / `admin123` — segera ganti setelah login pertama (lewat query manual atau buat fitur ganti password).

### Struktur tabel utama
- `users` — akun login (admin/kasir)
- `units` — bilik/unit PS beserta tarif & status
- `sessions` — sesi yang sedang berjalan
- `session_addons` — snack/minuman dalam sesi berjalan
- `transactions` — riwayat transaksi yang sudah dibayar
- `bookings` — reservasi
- `members` — pelanggan tetap & poin loyalti
- `addons` — daftar snack/minuman

Skema lengkap ada di `backend/db/schema.sql`.

## 2. Menjalankan Frontend

```bash
cd frontend
npm install
cp .env.example .env       # sesuaikan VITE_API_URL jika backend tidak di localhost:4000
npm run dev                 # jalan di http://localhost:5173
```

## 3. Mengimpor ke project React kamu sendiri

Kalau kamu sudah punya project React sendiri (bukan mulai dari nol dengan folder `frontend` ini), cukup:

1. Salin isi `frontend/src/components/`, `frontend/src/styles/`, `frontend/src/utils/`, `frontend/src/api.js`, dan `frontend/src/App.jsx` ke dalam `src/` project kamu.
2. Install dependency yang dipakai: `npm install lucide-react recharts`.
3. Pastikan Tailwind CSS sudah aktif di project kamu (atau ganti class Tailwind dengan CSS biasa jika belum pakai Tailwind).
4. Tambahkan font di `index.html`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet" />
   ```
5. Set `VITE_API_URL` (atau ganti `api.js` sesuai cara environment variable di project kamu) supaya menunjuk ke backend yang berjalan.
6. Render `<App />` di entry point project kamu.

## 4. Alur Login

- Login memanggil `POST /api/auth/login`, menyimpan JWT di `localStorage`.
- Setiap request API berikutnya mengirim header `Authorization: Bearer <token>`.
- Logout menghapus token dari `localStorage` dan mengembalikan ke layar login.
- Token berlaku 12 jam (`JWT_SECRET` & masa berlaku bisa diubah di `backend/middleware/auth.js`).

## 5. Menambah kasir/admin baru

Belum ada halaman UI untuk itu (sengaja minimal). Cara cepat lewat SQLite langsung:

```bash
cd backend
node -e "
const bcrypt = require('bcryptjs');
const db = require('./db');
const hash = bcrypt.hashSync('password-baru', 10);
db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)')
  .run('kasir1', hash, 'Nama Kasir', 'kasir');
console.log('User dibuat');
"
```

## 6. Deploy

- **Backend**: bisa di-deploy ke VPS/host Node biasa (Railway, Render, Fly.io, VPS sendiri). File SQLite ikut dalam volume disk yang persisten — pastikan platform hosting menyediakan persistent storage, atau ganti ke Postgres/MySQL kalau butuh skala lebih besar (skema SQL-nya bisa diadaptasi).
- **Frontend**: `npm run build` di folder `frontend` menghasilkan folder `dist/` statis yang bisa di-hosting di Vercel/Netlify/static hosting apa pun. Set `VITE_API_URL` ke alamat backend production saat build.
