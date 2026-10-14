# 🎮 Rental PS WhatsApp Bot Integration

Layanan WhatsApp Bot independen untuk **Rental PS System** yang terintegrasi langsung dengan Express REST API Backend. Chatbot ini membantu pelanggan mengecek ketersediaan PlayStation (PS3, PS4, PS5), melihat daftar harga, melakukan booking multi-step, mengecek status booking, membatalkan booking, melihat informasi lokasi/operasional, serta fitur alihkan ke Admin (Human Handoff).

---

## 🛠️ Arsitektur Integrasi

```
WhatsApp User
    │
    ▼
OpenWA Service (@open-wa/wa-automate / CLI Simulator)
    │
    ▼
Message Handler (src/handlers/messageHandler.js)
    │
    ├── Session Manager (src/sessions/sessionManager.js) -> State Machine
    └── Intent Detector (src/intents/intentDetector.js) -> Natural Language Parser / AI
            │
            ▼
Booking / Feature Handler (src/handlers/bookingHandler.js)
            │
            ▼
Rental API Service (src/services/rentalApiService.js) -> JWT Auth
            │
            ▼
Express REST API Backend (rental-ps-system)
            │
            ▼
Database SQLite (backend/db/rental-ps.sqlite)
```

> ⚠️ **Catatan Penting**: Backend `rental-ps-system` adalah *Single Source of Truth*. WhatsApp Bot tidak mengakses database SQLite secara langsung.

---

## 🚀 Panduan Instalasi & Penggunaan

### 1. Jalankan Express Backend Server (`rental-ps-system`)

Buka terminal dan jalankan backend utama:
```bash
cd /home/ayubw/projects/rental-ps-system
npm run start
```
*Server REST API backend akan berjalan di `http://localhost:4000`.*

---

### 2. Instalasi Dependensi WhatsApp Bot Service

Buka terminal kedua untuk bot service:
```bash
cd /home/ayubw/projects/rental-ps-system/rental-ps-whatsapp-bot
npm install
```

---

### 3. Konfigurasi Environment Variables (`.env`)

Salin file `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Isi konfigurasi pada file `.env`:
```ini
# URL & Kredensial Backend REST API
RENTAL_API_URL=http://localhost:4000/api
RENTAL_API_USERNAME=admin
RENTAL_API_PASSWORD=admin123

# Pengaturan AI (opsional)
AI_PROVIDER=none
AI_API_KEY=

# Informasi Kontak Admin
ADMIN_PHONE=+6281234567890

# Mode Simulasi CLI (Uji Coba tanpa Scan QR WhatsApp)
ENABLE_SIMULATION_MODE=true
```

---

### 4. Menjalankan WhatsApp Bot Service

#### A. Mode Simulasi CLI (Untuk Pengujian & Demo tanpa HP WhatsApp)
Pastikan `ENABLE_SIMULATION_MODE=true` pada `.env`, lalu jalankan:
```bash
npm start
```
Anda dapat langsung mengetikkan pesan seperti:
- `menu`
- `PS5 kosong besok jam 7 malam?`
- `3` (Booking PS)
- `4` (Cek Booking)
- `7` (Hubungi Admin)

#### B. Mode WhatsApp Real / Live (Scan QR Code)
Ubah `ENABLE_SIMULATION_MODE=false` pada `.env`, lalu jalankan:
```bash
npm start
```
Scan kode QR yang muncul di terminal menggunakan aplikasi WhatsApp di HP Anda.

---

## 🧪 Menjalankan Pengujian (Testing)

Untuk menjalankan seluruh unit & integration test suite bot:
```bash
npm test
```

Daftar aspek yang diuji:
- Deteksi intent angka & bahasa natural
- Ekstraksi entitas tanggal, waktu, durasi, dan jenis PS
- State machine percakapan & session reset
- Validasi input & alur konfirmasi booking
- Pembatalan & pengecekan booking
- Error handling API & fallback silent mode pada Human Handoff

---

## 🔧 Troubleshooting

1. **Error `401 Unauthorized` pada Bot Log**:
   - Pastikan kredensial `RENTAL_API_USERNAME` dan `RENTAL_API_PASSWORD` di `.env` sudah benar dan terdaftar di database `users`.

2. **Gagal Terhubung ke Server Backend**:
   - Pastikan server backend `rental-ps-system` aktif di port 4000 (`http://localhost:4000/api/health`).

3. **Bot Mengeluarkan Pesan Gangguan**:
   - Jika backend REST API mati atau terjadi error, bot otomatis merespons:
     *"Maaf, sistem rental sedang mengalami gangguan. Silakan coba beberapa saat lagi."*

4. **Bot Tidak Membalas (Human Handoff)**:
   - Jika pengguna memilih "Hubungi Admin", bot beralih ke mode `HUMAN_HANDOFF`.
   - Ketik **#bot** atau **0** untuk mengaktifkan kembali respons otomatis bot.
