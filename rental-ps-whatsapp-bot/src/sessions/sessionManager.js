const logger = require("../utils/logger");

const STATES = {
  IDLE: "IDLE",
  AWAITING_PRODUCT: "AWAITING_PRODUCT",
  AWAITING_DATE: "AWAITING_DATE",
  AWAITING_TIME: "AWAITING_TIME",
  AWAITING_DURATION: "AWAITING_DURATION",
  AWAITING_CUSTOMER_NAME: "AWAITING_CUSTOMER_NAME",
  AWAITING_CONFIRMATION: "AWAITING_CONFIRMATION",
  AWAITING_BOOKING_CODE_CHECK: "AWAITING_BOOKING_CODE_CHECK",
  AWAITING_BOOKING_CODE_CANCEL: "AWAITING_BOOKING_CODE_CANCEL",
  HUMAN_HANDOFF: "HUMAN_HANDOFF",
};

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 menit timeout

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  getSession(chatId) {
    if (!this.sessions.has(chatId)) {
      this.sessions.set(chatId, {
        state: STATES.IDLE,
        draftBooking: {},
        lastUpdated: Date.now(),
      });
    }
    const session = this.sessions.get(chatId);
    // Timeout check jika session menggantung di tengah alur (selain HUMAN_HANDOFF & IDLE)
    if (
      session.state !== STATES.IDLE &&
      session.state !== STATES.HUMAN_HANDOFF &&
      Date.now() - session.lastUpdated > SESSION_TIMEOUT_MS
    ) {
      logger.info("SessionManager", `Session timed out (>15 min inactivity) for ${chatId}. Resetting to IDLE.`);
      this.resetSession(chatId);
      return this.sessions.get(chatId);
    }
    return session;
  }

  setSession(chatId, state, draftBookingData = {}) {
    const current = this.getSession(chatId);
    const updated = {
      ...current,
      state,
      draftBooking: { ...current.draftBooking, ...draftBookingData },
      lastUpdated: Date.now(),
    };
    this.sessions.set(chatId, updated);
    logger.info("SessionManager", `Updated session for ${chatId} -> State: ${state}`, updated.draftBooking);
    return updated;
  }

  updateDraft(chatId, data) {
    const current = this.getSession(chatId);
    current.draftBooking = { ...current.draftBooking, ...data };
    current.lastUpdated = Date.now();
    return current;
  }

  resetSession(chatId) {
    logger.info("SessionManager", `Resetting session for ${chatId}`);
    this.sessions.set(chatId, {
      state: STATES.IDLE,
      draftBooking: {},
      lastUpdated: Date.now(),
    });
  }

  setHandoff(chatId, enabled = true) {
    if (enabled) {
      this.setSession(chatId, STATES.HUMAN_HANDOFF);
    } else {
      this.resetSession(chatId);
    }
  }

  isHandoff(chatId) {
    const session = this.getSession(chatId);
    return session.state === STATES.HUMAN_HANDOFF;
  }
}

module.exports = {
  STATES,
  sessionManager: new SessionManager(),
};
