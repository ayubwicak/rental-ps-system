# Frontend Coding Rules — Rental PS System

Aturan ini berlaku khusus untuk modul frontend di folder `frontend/`.

## 1. Stack Frontend
- **Framework**: React 18+ dengan Vite
- **Styling**: Tailwind CSS
- **API Communication**: Fetch / Axios via `src/api.js`
- **Realtime**: `socket.io-client`

## 2. Struktur Komponen & State
- Komponen UI ditempatkan dalam `src/components/`.
- Halaman utama dan modul diletakkan di `src/App.jsx` atau folder tampilan terkait.
- Gunakan `src/api.js` sebagai perantara tunggal panggilan HTTP ke backend. Header `Authorization: Bearer <token>` disertakan secara otomatis dari token di `localStorage`.

## 3. Integrasi Realtime WebSocket
- Komponen penyedia data unit/booking mendengarkan event Socket.io `sync_data`.
- Ketika event `sync_data` diterima, refresh data lokal tanpa melakukan reload halaman penuh.

## 4. UI/UX & Formatting
- Biaya/uang wajib diformat ke standar Rupiah (contoh: `Rp 10.000`).
- Durasi sesi main diformat dalam jam dan menit yang ramah pengguna.
- Tampilkan indikator status unit (`idle` = hijau / netral, `active` = biru / merah / terpakai).
