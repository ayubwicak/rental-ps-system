const rentalApiService = require("../services/rentalApiService");
const { sessionManager, STATES } = require("../sessions/sessionManager");
const { templates, formatRupiah, formatDateIndo, formatBookingCode } = require("../utils/formatter");
const logger = require("../utils/logger");

class BookingHandler {
  async startBookingFlow(chatId, initialEntities = {}) {
    sessionManager.resetSession(chatId);
    sessionManager.setSession(chatId, STATES.AWAITING_PRODUCT, initialEntities);

    // If entities already provided in natural language (e.g., "Saya mau booking PS5 besok jam 7 malam 2 jam")
    if (initialEntities.product) {
      return await this.handleProductInput(chatId, initialEntities.product);
    }

    return `🎮 *MEMULAI BOOKING PS*

Pilih jenis PlayStation yang ingin Anda sewa:
1️⃣ *PS5* (Rp 10.000 - Rp 15.000 / jam)
2️⃣ *PS4* (Rp 7.000 / jam)
3️⃣ *PS3* (Rp 5.000 / jam)

_Ketik 1, 2, 3 atau tulis tipe PS (contoh: PS5)._`;
  }

  async handleProductInput(chatId, input) {
    const lower = input.toLowerCase().trim();
    let product = null;

    if (lower === "1" || lower.includes("ps5") || lower.includes("ps 5")) product = "PS5";
    else if (lower === "2" || lower.includes("ps4") || lower.includes("ps 4")) product = "PS4";
    else if (lower === "3" || lower.includes("ps3") || lower.includes("ps 3")) product = "PS3";

    if (!product) {
      return "⚠️ Jenis PS tidak valid. Silakan pilih *1 (PS5)*, *2 (PS4)*, atau *3 (PS3)*.";
    }

    sessionManager.setSession(chatId, STATES.AWAITING_DATE, { product });

    const session = sessionManager.getSession(chatId);
    if (session.draftBooking.date) {
      return await this.handleDateInput(chatId, session.draftBooking.date);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    return `📅 *TANGGAL SEWA (${product})*

Kapan Anda ingin bermain?
• Ketik *Hari Ini* (${formatDateIndo(todayStr)})
• Ketik *Besok*
• Atau masukkan format tanggal: *YYYY-MM-DD* (contoh: 2026-09-16)`;
  }

  async handleDateInput(chatId, input) {
    const lower = input.toLowerCase().trim();
    let date = null;
    const ref = new Date();
    const formatDate = (d) => d.toISOString().split("T")[0];

    if (lower === "hari ini" || lower === "sekarang" || lower === "today") {
      date = formatDate(ref);
    } else if (lower === "besok" || lower === "tomorrow") {
      ref.setDate(ref.getDate() + 1);
      date = formatDate(ref);
    } else if (lower === "lusa") {
      ref.setDate(ref.getDate() + 2);
      date = formatDate(ref);
    } else {
      const match = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/) || lower.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
      if (match) {
        date = match[1].length === 4 
          ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`
          : `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
      }
    }

    if (!date) {
      return "⚠️ Format tanggal tidak valid. Silakan ketik *Hari Ini*, *Besok*, atau contoh *2026-09-16*.";
    }

    sessionManager.setSession(chatId, STATES.AWAITING_TIME, { date });

    const session = sessionManager.getSession(chatId);
    if (session.draftBooking.time) {
      return await this.handleTimeInput(chatId, session.draftBooking.time);
    }

    return `⏰ *JAM SEWA*

Masukkan jam mulai main (format 24 jam).
Contoh: *19:00* atau *7 malam*.`;
  }

  async handleTimeInput(chatId, input) {
    const lower = input.toLowerCase().trim();
    let time = null;

    const timeMatch = lower.match(/jam\s*(\d{1,2})(?::(\d{2})|\.(\d{2}))?\s*(pagi|siang|sore|malam)?/) ||
                      lower.match(/\b(\d{1,2})[:\.](\d{2})\b/);

    if (timeMatch) {
      if (timeMatch[0].includes("jam")) {
        let hour = parseInt(timeMatch[1], 10);
        const mins = timeMatch[2] || timeMatch[3] || "00";
        const period = timeMatch[4];

        if (period === "malam" && hour < 12) hour += 12;
        if (period === "siang" && hour < 12 && hour >= 1 && hour <= 5) hour += 12;
        if (period === "sore" && hour < 12) hour += 12;

        time = `${String(hour).padStart(2, "0")}:${mins}`;
      } else {
        const hour = String(parseInt(timeMatch[1], 10)).padStart(2, "0");
        const mins = timeMatch[2] || "00";
        time = `${hour}:${mins}`;
      }
    }

    if (!time) {
      return "⚠️ Format jam tidak dipahami. Silakan masukkan jam dengan format *19:00* atau *jam 7 malam*.";
    }

    sessionManager.setSession(chatId, STATES.AWAITING_DURATION, { time });

    const session = sessionManager.getSession(chatId);
    if (session.draftBooking.duration) {
      return await this.handleDurationInput(chatId, String(session.draftBooking.duration));
    }

    return `⏳ *DURASI SEWA*

Berapa jam Anda ingin menyewa?
Contoh: Ketik *1*, *2*, atau *3* (jam).`;
  }

  async handleDurationInput(chatId, input) {
    const durMatch = input.match(/(\d+)/);
    const durationHours = durMatch ? parseInt(durMatch[1], 10) : null;

    if (!durationHours || durationHours <= 0 || durationHours > 12) {
      return "⚠️ Durasi rental tidak valid (minimal 1 jam, maksimal 12 jam). Masukkan angka durasi (contoh: *2*).";
    }

    sessionManager.setSession(chatId, STATES.AWAITING_CUSTOMER_NAME, { durationHours });

    const session = sessionManager.getSession(chatId);

    // Cek ketersediaan via Backend API sebelum meminta nama
    const draft = session.draftBooking;
    let avail;
    try {
      avail = await rentalApiService.checkAvailability(draft.date, draft.time, draft.durationHours, draft.product);
    } catch (err) {
      return "⚠️ Maaf, terjadi masalah saat memeriksa ketersediaan di server. Silakan coba lagi.";
    }

    if (!avail.availableUnits || avail.availableUnits.length === 0) {
      sessionManager.resetSession(chatId);
      return `❌ *JADWAL TIDAK TERSEDIA*

Maaf, unit *${draft.product}* penuh pada tanggal *${formatDateIndo(draft.date)}* jam *${draft.time}* (${draft.durationHours} Jam).

Silakan ketik *3* untuk memilih jadwal atau tipe PS lain.`;
    }

    // Auto-select unit pertama yang tersedia
    const targetUnit = avail.availableUnits[0];
    const totalPrice = targetUnit.rate * draft.durationHours;
    sessionManager.updateDraft(chatId, {
      unitId: targetUnit.id,
      unitName: targetUnit.name,
      unitType: targetUnit.type,
      totalPrice,
    });

    if (draft.customerName) {
      return await this.handleCustomerNameInput(chatId, draft.customerName);
    }

    return `👤 *NAMA PEMESAN*

Atas nama siapa booking ini dibuat?
Contoh: *Budi*`;
  }

  async handleCustomerNameInput(chatId, input) {
    const name = input.trim();
    if (!name || name.length < 2) {
      return "⚠️ Silakan masukkan nama pemesan yang jelas (minimal 2 karakter).";
    }

    sessionManager.setSession(chatId, STATES.AWAITING_CONFIRMATION, { customerName: name });
    const session = sessionManager.getSession(chatId);
    const draft = session.draftBooking;

    return templates.bookingConfirmation({
      unitType: draft.unitType || draft.product,
      unitName: draft.unitName,
      customerName: draft.customerName,
      date: draft.date,
      time: draft.time,
      durationHours: draft.durationHours,
      totalPrice: draft.totalPrice,
    });
  }

  async handleConfirmationInput(chatId, input) {
    const lower = input.toLowerCase().trim();

    if (lower === "1" || lower === "ya" || lower.includes("lanjut") || lower.includes("benar") || lower.includes("booking")) {
      const session = sessionManager.getSession(chatId);
      const draft = session.draftBooking;

      try {
        const result = await rentalApiService.createBooking({
          customerName: draft.customerName,
          customerPhone: chatId,
          unitId: draft.unitId,
          date: draft.date,
          time: draft.time,
          durationHours: draft.durationHours,
        });

        sessionManager.resetSession(chatId);
        const codeStr = formatBookingCode(result.id);

        return `✅ *BOOKING BERHASIL DIBUAT!*

🆔 *Kode Booking*: *${codeStr}*
PlayStation : *${draft.unitName}* (${draft.unitType})
Nama        : *${draft.customerName}*
Tanggal     : *${formatDateIndo(draft.date)}*
Jam         : *${draft.time}* (${draft.durationHours} Jam)
Total Biaya : *${formatRupiah(draft.totalPrice)}*

_Simpan Kode Booking Anda (*${codeStr}*) untuk pengecekan atau pembatalan._
Terima kasih telah melakukan pemesanan di Rental PS System! 🎮`;
      } catch (err) {
        logger.error("BookingHandler", "Gagal submit booking ke backend API", err);
        const errMsg = err.response && err.response.data && err.response.data.error
          ? err.response.data.error
          : "Maaf, sistem rental sedang mengalami gangguan. Silakan coba beberapa saat lagi.";
        return `❌ *GAGAL MEMBUAT BOOKING*\n\n${errMsg}`;
      }
    }

    if (lower === "2" || lower.includes("ubah")) {
      sessionManager.resetSession(chatId);
      return await this.startBookingFlow(chatId);
    }

    if (lower === "3" || lower.includes("batal")) {
      sessionManager.resetSession(chatId);
      return "❌ *BOOKING DIBATALKAN*\n\nProses pemesanan telah dibatalkan. Ketik *menu* untuk melihat opsi layanan lain.";
    }

    return `⚠️ Pilihan tidak valid.

Silakan balas dengan:
1️⃣ *Ya* (Lanjutkan Booking)
2️⃣ *Ubah* (Ulangi Pengisian)
3️⃣ *Batal* (Batalkan Booking)`;
  }
}

module.exports = new BookingHandler();
