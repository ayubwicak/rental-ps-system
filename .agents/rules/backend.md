# Backend Coding Rules — Rental PS System

Aturan ini berlaku khusus untuk modul backend di folder `backend/`.

## 1. Stack Backend
- **Runtime**: Node.js v24+
- **Framework**: Express.js
- **Database Driver**: `better-sqlite3` (v13+)
- **Autentikasi**: JWT (`jsonwebtoken`) + Password Hashing (`bcryptjs`)
- **Realtime**: Socket.io (`socket.io`)

## 2. Struktur Controller & Route
- Semua route didefinisikan dalam folder `backend/routes/`.
- Setiap endpoint API diawali dengan prefix `/api/<resource>` (contoh: `/api/units`, `/api/auth`, `/api/transactions`).
- Gunakan middleware `requireAuth` dari `middleware/auth.js` untuk melindungi endpoint yang membutuhkan sesi pengguna.
- Periksa peranan `req.user.role === 'admin'` untuk operasi yang dibatasi hanya untuk Admin.

## 3. Penanganan Database
- Gunakan transaksi `db.transaction()` untuk operasi yang memutasi lebih dari satu tabel SQLite.
- Jangan melakukan query manual string concatenation; selalu gunakan prepared statement (`db.prepare(...)`).
- SQLite diinisialisasi dalam `backend/db/index.js` dengan mode WAL (`journal_mode = WAL`) dan `foreign_keys = ON`.

## 4. Standar Respons Error
- Selalu kembalikan respons error berformat JSON: `{ "error": "Deskripsi pesan error" }`.
- Gunakan HTTP Status Code yang tepat (`400`, `401`, `403`, `404`, `409`, `500`).
