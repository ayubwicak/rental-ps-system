const aiService = require("../services/aiService");
const logger = require("../utils/logger");

const INTENTS = {
  MENU_MAIN: "MENU_MAIN",
  CHECK_AVAILABILITY: "CHECK_AVAILABILITY",
  VIEW_PRICES: "VIEW_PRICES",
  BOOKING: "BOOKING",
  CHECK_BOOKING: "CHECK_BOOKING",
  CANCEL_BOOKING: "CANCEL_BOOKING",
  INFO_RENTAL: "INFO_RENTAL",
  CONTACT_ADMIN: "CONTACT_ADMIN",
  UNKNOWN: "UNKNOWN",
};

class IntentDetector {
  async detect(text) {
    const raw = (text || "").trim();
    const lower = raw.toLowerCase();

    // Check menu shortcut numbers or explicit command keywords
    if (raw === "1") return { intent: INTENTS.CHECK_AVAILABILITY, entities: {} };
    if (raw === "2") return { intent: INTENTS.VIEW_PRICES, entities: {} };
    if (raw === "3") return { intent: INTENTS.BOOKING, entities: {} };
    if (raw === "4") return { intent: INTENTS.CHECK_BOOKING, entities: {} };
    if (raw === "5") return { intent: INTENTS.CANCEL_BOOKING, entities: {} };
    if (raw === "6") return { intent: INTENTS.INFO_RENTAL, entities: {} };
    if (raw === "7") return { intent: INTENTS.CONTACT_ADMIN, entities: {} };
    if (lower === "menu" || lower === "bantuan" || lower === "halo" || lower === "hi" || lower === "p") {
      return { intent: INTENTS.MENU_MAIN, entities: {} };
    }

    // Natural Language Processing via AI / Rule-Based Parser
    const parsed = await aiService.parseNaturalLanguage(raw);

    const intentMapping = {
      check_availability: INTENTS.CHECK_AVAILABILITY,
      booking: INTENTS.BOOKING,
      view_price: INTENTS.VIEW_PRICES,
      check_booking: INTENTS.CHECK_BOOKING,
      cancel_booking: INTENTS.CANCEL_BOOKING,
      info: INTENTS.INFO_RENTAL,
      contact_admin: INTENTS.CONTACT_ADMIN,
    };

    const finalIntent = intentMapping[parsed.intent] || INTENTS.UNKNOWN;

    logger.info("IntentDetector", `Detected intent: ${finalIntent} for input: "${raw}"`);

    return {
      intent: finalIntent,
      entities: {
        product: parsed.product,
        date: parsed.date,
        time: parsed.time,
        duration: parsed.duration,
        customerName: parsed.customerName,
        bookingCode: parsed.bookingCode,
      },
    };
  }
}

module.exports = {
  INTENTS,
  intentDetector: new IntentDetector(),
};
