const test = require("node:test");
const assert = require("node:assert");
const { intentDetector, INTENTS } = require("../src/intents/intentDetector");
const aiService = require("../src/services/aiService");

test("IntentDetector - Direct Menu Shortcuts (1-7)", async () => {
  assert.strictEqual((await intentDetector.detect("1")).intent, INTENTS.CHECK_AVAILABILITY);
  assert.strictEqual((await intentDetector.detect("2")).intent, INTENTS.VIEW_PRICES);
  assert.strictEqual((await intentDetector.detect("3")).intent, INTENTS.BOOKING);
  assert.strictEqual((await intentDetector.detect("4")).intent, INTENTS.CHECK_BOOKING);
  assert.strictEqual((await intentDetector.detect("5")).intent, INTENTS.CANCEL_BOOKING);
  assert.strictEqual((await intentDetector.detect("6")).intent, INTENTS.INFO_RENTAL);
  assert.strictEqual((await intentDetector.detect("7")).intent, INTENTS.CONTACT_ADMIN);
  assert.strictEqual((await intentDetector.detect("menu")).intent, INTENTS.MENU_MAIN);
});

test("IntentDetector & AIService - Natural Language Query: Availability", async () => {
  const input = "PS5 kosong besok jam 7 malam?";
  const res = await intentDetector.detect(input);
  assert.strictEqual(res.intent, INTENTS.CHECK_AVAILABILITY);
  assert.strictEqual(res.entities.product, "PS5");
  assert.strictEqual(res.entities.time, "19:00");
  assert.notStrictEqual(res.entities.date, null);
});

test("IntentDetector & AIService - Natural Language Query: Booking with duration", async () => {
  const input = "Saya mau rental PS5 besok jam 7 malam selama 2 jam";
  const res = await intentDetector.detect(input);
  assert.strictEqual(res.intent, INTENTS.BOOKING);
  assert.strictEqual(res.entities.product, "PS5");
  assert.strictEqual(res.entities.time, "19:00");
  assert.strictEqual(res.entities.duration, 2);
});

test("IntentDetector & AIService - Natural Language Query: Cancel Booking with Code", async () => {
  const input = "Batalkan booking ID #12";
  const res = await intentDetector.detect(input);
  assert.strictEqual(res.intent, INTENTS.CANCEL_BOOKING);
  assert.strictEqual(res.entities.bookingCode, 12);
});

test("AIService - Error / Fallback handling", async () => {
  const parsed = aiService.ruleBasedParse("Pesan yang tidak dipahami");
  assert.strictEqual(parsed.intent, "unknown");
});
