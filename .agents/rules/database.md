# Database & Schema Rules — Rental PS System

Aturan ini berlaku untuk pengelolaan skema database SQLite di `backend/db/`.

## 1. Skema Utama
1. `users`: Manajemen akun Admin dan Kasir.
2. `units`: Daftar unit PS (PS3/PS4/PS5) dan tarif per jam.
3. `members`: Data pelanggan tetap dan poin loyalty.
4. `addons`: Makanan, minuman, dan barang tambahan.
5. `sessions`: Sesi rental aktif/paused/closed.
6. `session_addons`: Item tambahan yang dipesan selama sesi.
7. `transactions`: Riwayat transaksi yang sudah dibayar dan selesai.
8. `bookings`: Pemesanan jadwal main PS.

## 2. Integritas Data & Indeks
- Selalu pertahankan `journal_mode = WAL` dan `foreign_keys = ON`.
- Tabel `session_addons` memiliki relasi `ON DELETE CASCADE` ke `sessions(id)`.
- Pastikan indeks SQLite (`idx_sessions_unit`, `idx_transactions_created`, `idx_bookings_date`) tetap dipertahankan untuk mengoptimalkan performa kueri.
- Setiap perubahan skema wajib diperbarui di `backend/db/schema.sql` dan `backend/db/seed.js`.
