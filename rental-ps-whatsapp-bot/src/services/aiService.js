const config = require("../config/config");
const logger = require("../utils/logger");

class AiService {
  constructor() {
    this.provider = config.aiProvider;
    this.apiKey = config.aiApiKey;
  }

  /**
   * Parse natural language message into structured JSON intent & entities.
   * Format output:
   * {
   *   "intent": "check_availability" | "booking" | "view_price" | "check_booking" | "cancel_booking" | "info" | "contact_admin" | "unknown",
   *   "product": "PS5" | "PS4" | "PS3" | null,
   *   "date": "YYYY-MM-DD" | null,
   *   "time": "HH:MM" | null,
   *   "duration": number | null,
   *   "customerName": string | null,
   *   "bookingCode": string | number | null
   * }
   */
  async parseNaturalLanguage(text, referenceDate = new Date()) {
    // Jika AI tidak dikonfigurasi, langsung gunakan Rule-Based Natural Language Parser
    if (!this.provider || this.provider === "none" || !this.apiKey) {
      logger.info("AIService", "AI provider 'none' or no API key. Using built-in Rule-Based Natural Language Parser.");
      return this.ruleBasedParse(text, referenceDate);
    }

    try {
      if (this.provider === "gemini") {
        return await this.callGeminiApi(text, referenceDate);
      } else if (this.provider === "openai") {
        return await this.callOpenAiApi(text, referenceDate);
      }
      return this.ruleBasedParse(text, referenceDate);
    } catch (err) {
      logger.error("AIService", "AI API error, falling back to Rule-Based parser", err);
      return this.ruleBasedParse(text, referenceDate);
    }
  }

  ruleBasedParse(text, referenceDate = new Date()) {
    const lower = text.toLowerCase().trim();
    const result = {
      intent: "unknown",
      product: null,
      date: null,
      time: null,
      duration: null,
      customerName: null,
      bookingCode: null,
    };

    // Extract Product
    if (lower.includes("ps5") || lower.includes("ps 5") || lower.includes("playstation 5")) {
      result.product = "PS5";
    } else if (lower.includes("ps4") || lower.includes("ps 4") || lower.includes("playstation 4")) {
      result.product = "PS4";
    } else if (lower.includes("ps3") || lower.includes("ps 3") || lower.includes("playstation 3")) {
      result.product = "PS3";
    }

    // Extract Date (besok, lusa, hari ini, YYYY-MM-DD, DD-MM-YYYY)
    const ref = new Date(referenceDate);
    const formatDate = (d) => d.toISOString().split("T")[0];

    if (lower.includes("besok")) {
      ref.setDate(ref.getDate() + 1);
      result.date = formatDate(ref);
    } else if (lower.includes("lusa")) {
      ref.setDate(ref.getDate() + 2);
      result.date = formatDate(ref);
    } else if (lower.includes("hari ini") || lower.includes("sekarang")) {
      result.date = formatDate(ref);
    } else {
      const dateMatch = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/) || lower.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
      if (dateMatch) {
        if (dateMatch[1].length === 4) {
          result.date = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
        } else {
          result.date = `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
        }
      }
    }

    // Extract Time (jam 7 malam, jam 19:00, 19.00, jam 2 siang)
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

        const formattedHour = String(hour).padStart(2, "0");
        result.time = `${formattedHour}:${mins}`;
      } else {
        const hour = String(parseInt(timeMatch[1], 10)).padStart(2, "0");
        const mins = timeMatch[2] || "00";
        result.time = `${hour}:${mins}`;
      }
    }

    // Extract Duration (2 jam, 3 jam, 1 jam)
    const durMatch = lower.match(/(\d+)\s*jam/);
    if (durMatch) {
      result.duration = parseInt(durMatch[1], 10);
    }

    // Extract Booking ID / Code
    const codeMatch = lower.match(/booking\s*#?(\d+)/) || lower.match(/kode\s*#?(\d+)/) || lower.match(/id\s*#?(\d+)/);
    if (codeMatch) {
      result.bookingCode = parseInt(codeMatch[1], 10);
    }

    // Determine Intent
    if (lower.includes("kosong") || lower.includes("tersedia") || lower.includes("ada ps") || lower.includes("ready")) {
      result.intent = "check_availability";
    } else if (lower.includes("booking") || lower.includes("sewa") || lower.includes("pesan ps") || lower.includes("pemesanan") || lower.includes("rental ps") || lower.includes("mau main")) {
      if (lower.includes("batalkan") || lower.includes("cancel") || lower.includes("hapus")) {
        result.intent = "cancel_booking";
      } else if (lower.includes("status") || lower.includes("cek booking") || lower.includes("lihat booking")) {
        result.intent = "check_booking";
      } else {
        result.intent = "booking";
      }
    } else if (lower.includes("harga") || lower.includes("tarif") || lower.includes("daftar harga") || lower.includes("biaya")) {
      result.intent = "view_price";
    } else if (lower.includes("lokasi") || lower.includes("alamat") || lower.includes("jam buka") || lower.includes("info")) {
      result.intent = "info";
    } else if (lower.includes("admin") || lower.includes("operator") || lower.includes("bantuan human")) {
      result.intent = "contact_admin";
    }

    logger.info("AIService", `Rule-based parse result: intent=${result.intent}`, result);
    return result;
  }

  async callGeminiApi(text, referenceDate) {
    // Placeholder implementation for Gemini REST API call if key configured
    // Returns parsed object or falls back to rule-based parser on any error
    return this.ruleBasedParse(text, referenceDate);
  }

  async callOpenAiApi(text, referenceDate) {
    // Placeholder implementation for OpenAI API call if key configured
    return this.ruleBasedParse(text, referenceDate);
  }
}

module.exports = new AiService();
