const { sessionManager, STATES } = require("../sessions/sessionManager");
const { intentDetector, INTENTS } = require("../intents/intentDetector");
const bookingHandler = require("./bookingHandler");
const rentalApiService = require("../services/rentalApiService");
const { templates, formatRupiah, formatDateIndo, formatBookingCode, parseBookingCode } = require("../utils/formatter");
const config = require("../config/config");
const logger = require("../utils/logger");

const RATE_LIMIT_MAX = 20; // maksimal pesan per pengirim
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // per 1 menit

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

class MessageHandler {
  constructor() {
    this.senderRateMap = new Map();
  }

  isRateLimited(chatId) {
    const now = Date.now();
    // Bersihkan entri kedaluwarsa agar tidak menumpuk (anti memory leak)
    for (const [key, record] of this.senderRateMap.entries()) {
      if (now - record.startTime > RATE_LIMIT_WINDOW_MS) this.senderRateMap.delete(key);
    }

    const record = this.senderRateMap.get(chatId);
    if (!record) {
      this.senderRateMap.set(chatId, { count: 1, startTime: now });
      return false;
    }
    record.count += 1;
    return record.count > RATE_LIMIT_MAX;
  }

  // Booking hanya boleh dilihat/dibatalkan oleh nomor WhatsApp pemesannya.
  isBookingOwner(booking, chatId) {
    const stored = normalizePhone(booking?.customer_phone);
    const requester = normalizePhone(chatId);
    return Boolean(stored && requester && stored === requester);
  }

  bookingNotFoundMessage(bookingId) {
    return `❌ Booking dengan ID *#${bookingId}* tidak ditemukan atau bukan milik nomor Anda.`;
  }

  async handleIncomingMessage(chatId, messageBody) {
    const raw = (messageBody || "").trim();
    logger.info("MessageHandler", `Incoming from ${chatId}: "${raw}"`);

    if (this.isRateLimited(chatId)) {
      logger.warn("MessageHandler", `Rate limit terlampaui untuk ${chatId}.`);
      return "⚠️ Terlalu banyak pesan dalam waktu singkat. Mohon tunggu sebentar sebelum mengirim pesan lagi.";
    }

    // 1. Check Human Handoff Mode
    if (sessionManager.isHandoff(chatId)) {
      if (raw === "#bot" || raw === "0" || raw.toLowerCase() === "bot") {
        sessionManager.resetSession(chatId);
        return `🤖 *MODE BOT DIAKTIFKAN KEMBALI*\n\n` + templates.mainMenu();
      }
      logger.info("MessageHandler", `Chat ${chatId} is in Human Handoff. Auto-reply disabled.`);
      return null; // Silent while human admin is handling the user
    }

    const session = sessionManager.getSession(chatId);

    // Cancel/reset keyword from any state
    if (raw.toLowerCase() === "batal" && session.state !== STATES.IDLE && session.state !== STATES.AWAITING_CONFIRMATION) {
      sessionManager.resetSession(chatId);
      return "❌ *PROSES DIBATALKAN*\n\n" + templates.mainMenu();
    }

    // 2. State-Based Flow Handler
    switch (session.state) {
      case STATES.AWAITING_PRODUCT:
        return await bookingHandler.handleProductInput(chatId, raw);
      case STATES.AWAITING_DATE:
        return await bookingHandler.handleDateInput(chatId, raw);
      case STATES.AWAITING_TIME:
        return await bookingHandler.handleTimeInput(chatId, raw);
      case STATES.AWAITING_DURATION:
        return await bookingHandler.handleDurationInput(chatId, raw);
      case STATES.AWAITING_CUSTOMER_NAME:
        return await bookingHandler.handleCustomerNameInput(chatId, raw);
      case STATES.AWAITING_CONFIRMATION:
        return await bookingHandler.handleConfirmationInput(chatId, raw);
      case STATES.AWAITING_BOOKING_CODE_CHECK:
        return await this.handleBookingCodeCheck(chatId, raw);
      case STATES.AWAITING_BOOKING_CODE_CANCEL:
        return await this.handleBookingCodeCancel(chatId, raw);
      default:
        break;
    }

    // 3. IDLE State -> Intent Detection
    const { intent, entities } = await intentDetector.detect(raw);

    try {
      switch (intent) {
        case INTENTS.MENU_MAIN:
          return templates.mainMenu();

        case INTENTS.VIEW_PRICES:
          const units = await rentalApiService.getUnits();
          return templates.catalog(units);

        case INTENTS.INFO_RENTAL:
          const info = await rentalApiService.getInfo();
          return templates.info(info);

        case INTENTS.CONTACT_ADMIN:
          sessionManager.setHandoff(chatId, true);
          return templates.humanHandoff(config.adminPhone);

        case INTENTS.CHECK_AVAILABILITY:
          return await this.handleAvailabilityCheck(chatId, entities, raw);

        case INTENTS.BOOKING:
          return await bookingHandler.startBookingFlow(chatId, entities);

        case INTENTS.CHECK_BOOKING:
          if (entities.bookingCode) {
            return await this.handleBookingCodeCheck(chatId, String(entities.bookingCode));
          }
          sessionManager.setSession(chatId, STATES.AWAITING_BOOKING_CODE_CHECK);
          return "🔍 *CEK STATUS BOOKING*\n\nMasukkan ID Booking Anda (contoh: *RNT-00001* atau *1*):";

        case INTENTS.CANCEL_BOOKING:
          if (entities.bookingCode) {
            return await this.handleBookingCodeCancel(chatId, String(entities.bookingCode));
          }
          sessionManager.setSession(chatId, STATES.AWAITING_BOOKING_CODE_CANCEL);
          return "❌ *BATALKAN BOOKING*\n\nMasukkan ID Booking yang ingin dibatalkan (contoh: *RNT-00001* atau *1*):";

        default:
          return `🤖 Maaf, kami belum memahami pesan Anda.

Silakan pilih opsi dari menu di bawah atau perjelas pertanyaan Anda:

` + templates.mainMenu();
      }
    } catch (err) {
      logger.error("MessageHandler", "Error executing intent handler", err);
      return "Maaf, sistem rental sedang mengalami gangguan. Silakan coba beberapa saat lagi.";
    }
  }

  async handleAvailabilityCheck(chatId, entities, rawText) {
    const date = entities.date || new Date().toISOString().split("T")[0];
    const time = entities.time || "19:00";
    const durationHours = entities.duration || 1;
    const type = entities.product || "";

    try {
      const avail = await rentalApiService.checkAvailability(date, time, durationHours, type);

      if (avail.availableUnits && avail.availableUnits.length > 0) {
        const listStr = avail.availableUnits.map((u) => `• *${u.name}* (${u.type}) - ${formatRupiah(u.rate)}/jam`).join("\n");
        return `✅ *INFORMASI KETERSEDIAAN PS*

Tanggal : *${formatDateIndo(date)}*
Jam     : *${time}* (${durationHours} Jam)
Tipe    : *${type || "Semua"}*

Bilik PS yang *Tersedia*:
${listStr}

Ketik *3* atau *Booking* untuk memesan sekarang!`;
      } else {
        return `❌ *JADWAL TIDAK TERSEDIA*

Maaf, unit *${type || "PS"}* tidak tersedia pada tanggal *${formatDateIndo(date)}* jam *${time}*.

Silakan coba jam atau hari lain dengan mengetik:
"PS5 kosong besok jam 8 malam?"`;
      }
    } catch (err) {
      logger.error("MessageHandler", "Error checking availability", err);
      return "Maaf, sistem rental sedang mengalami gangguan. Silakan coba beberapa saat lagi.";
    }
  }

  async handleBookingCodeCheck(chatId, input) {
    const bookingId = parseBookingCode(input);

    if (!bookingId) {
      return "⚠️ ID Booking tidak valid. Masukkan angka ID Booking Anda (contoh: *RNT-00001* atau *1*).";
    }

    try {
      const booking = await rentalApiService.getBookingById(bookingId);
      sessionManager.resetSession(chatId);

      if (!this.isBookingOwner(booking, chatId)) {
        logger.warn("MessageHandler", `Akses booking #${bookingId} ditolak untuk ${chatId} (bukan pemilik).`);
        return this.bookingNotFoundMessage(bookingId);
      }

      const statusMap = {
        menunggu: "🟡 Menunggu Check-in",
        terjadwal: "🟢 Terjadwal",
        selesai: "🔵 Selesai",
        batal: "🔴 Dibatalkan",
      };

      const codeStr = formatBookingCode(booking.id);

      return `📋 *DETAIL BOOKING ${codeStr}*

Status      : *${statusMap[booking.status] || booking.status}*
Nama        : *${booking.customer_name}*
PlayStation : *${booking.unit_name}* (${booking.unit_type})
Tanggal     : *${formatDateIndo(booking.booking_date)}*
Jam         : *${booking.booking_time}* (${booking.duration_hours || 1} Jam)
Tarif       : *${formatRupiah(booking.unit_rate)}/jam*`;
    } catch (err) {
      sessionManager.resetSession(chatId);
      if (err.response && err.response.status === 404) {
        return this.bookingNotFoundMessage(bookingId);
      }
      return "Maaf, sistem rental sedang mengalami gangguan. Silakan coba beberapa saat lagi.";
    }
  }

  async handleBookingCodeCancel(chatId, input) {
    const bookingId = parseBookingCode(input);

    if (!bookingId) {
      return "⚠️ ID Booking tidak valid. Masukkan angka ID Booking Anda (contoh: *RNT-00001* atau *1*).";
    }

    try {
      const booking = await rentalApiService.getBookingById(bookingId);
      sessionManager.resetSession(chatId);

      if (!this.isBookingOwner(booking, chatId)) {
        logger.warn("MessageHandler", `Pembatalan booking #${bookingId} ditolak untuk ${chatId} (bukan pemilik).`);
        return this.bookingNotFoundMessage(bookingId);
      }

      await rentalApiService.cancelBooking(bookingId);
      const codeStr = formatBookingCode(bookingId);
      return `✅ *PEMBATALAN BERHASIL*\n\nBooking Code *${codeStr}* telah berhasil dibatalkan.`;
    } catch (err) {
      sessionManager.resetSession(chatId);
      if (err.response && err.response.status === 404) {
        return this.bookingNotFoundMessage(bookingId);
      }
      if (err.response && err.response.data && err.response.data.error) {
        return `❌ *GAGAL MEMBATALKAN BOOKING*\n\n${err.response.data.error}`;
      }
      return "Maaf, sistem rental sedang mengalami gangguan. Silakan coba beberapa saat lagi.";
    }
  }
}

module.exports = new MessageHandler();
