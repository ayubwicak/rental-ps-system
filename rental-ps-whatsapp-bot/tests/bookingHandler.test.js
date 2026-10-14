const test = require("node:test");
const assert = require("node:assert");
const { sessionManager, STATES } = require("../src/sessions/sessionManager");
const bookingHandler = require("../src/handlers/bookingHandler");
const messageHandler = require("../src/handlers/messageHandler");

test("SessionManager - State Transitions & Handoff", () => {
  const chatId = "test_user_001";
  sessionManager.resetSession(chatId);

  const initial = sessionManager.getSession(chatId);
  assert.strictEqual(initial.state, STATES.IDLE);

  sessionManager.setSession(chatId, STATES.AWAITING_PRODUCT, { product: "PS5" });
  const updated = sessionManager.getSession(chatId);
  assert.strictEqual(updated.state, STATES.AWAITING_PRODUCT);
  assert.strictEqual(updated.draftBooking.product, "PS5");

  sessionManager.setHandoff(chatId, true);
  assert.strictEqual(sessionManager.isHandoff(chatId), true);

  sessionManager.setHandoff(chatId, false);
  assert.strictEqual(sessionManager.isHandoff(chatId), false);
  assert.strictEqual(sessionManager.getSession(chatId).state, STATES.IDLE);
});

test("BookingHandler - Step by step input validation", async () => {
  const chatId = "test_user_002";
  sessionManager.resetSession(chatId);

  // Step 1: Start booking
  const step1 = await bookingHandler.startBookingFlow(chatId);
  assert.ok(step1.includes("MEMULAI BOOKING PS"));
  assert.strictEqual(sessionManager.getSession(chatId).state, STATES.AWAITING_PRODUCT);

  // Step 2: Invalid Product
  const step2Invalid = await bookingHandler.handleProductInput(chatId, "Xbox");
  assert.ok(step2Invalid.includes("tidak valid"));

  // Step 2: Valid Product PS5
  const step2Valid = await bookingHandler.handleProductInput(chatId, "1");
  assert.ok(step2Valid.includes("TANGGAL SEWA"));
  assert.strictEqual(sessionManager.getSession(chatId).state, STATES.AWAITING_DATE);

  // Step 3: Invalid Date
  const step3Invalid = await bookingHandler.handleDateInput(chatId, "kemarin dulu");
  assert.ok(step3Invalid.includes("tidak valid"));

  // Step 3: Valid Date (Besok)
  const step3Valid = await bookingHandler.handleDateInput(chatId, "besok");
  assert.ok(step3Valid.includes("JAM SEWA"));
  assert.strictEqual(sessionManager.getSession(chatId).state, STATES.AWAITING_TIME);

  // Step 4: Valid Time 19:00
  const step4Valid = await bookingHandler.handleTimeInput(chatId, "jam 7 malam");
  assert.ok(step4Valid.includes("DURASI SEWA"));
  assert.strictEqual(sessionManager.getSession(chatId).state, STATES.AWAITING_DURATION);
});

test("MessageHandler - Duplicate/Invalid Message Handling & Reset", async () => {
  const chatId = "test_user_003";
  sessionManager.resetSession(chatId);

  // Unknown input returns menu
  const res = await messageHandler.handleIncomingMessage(chatId, "xyz999abc");
  assert.ok(res.includes("belum memahami pesan Anda"));

  // Start state, then type 'batal'
  sessionManager.setSession(chatId, STATES.AWAITING_DATE);
  const cancelRes = await messageHandler.handleIncomingMessage(chatId, "batal");
  assert.ok(cancelRes.includes("PROSES DIBATALKAN"));
  assert.strictEqual(sessionManager.getSession(chatId).state, STATES.IDLE);
});
