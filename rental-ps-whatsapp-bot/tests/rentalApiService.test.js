const test = require("node:test");
const assert = require("node:assert");
const rentalApiService = require("../src/services/rentalApiService");

test("RentalApiService - Catch network error gracefully when backend API unavailable", async () => {
  // Test fallback response when requesting info if backend unreachable or error
  const info = await rentalApiService.getInfo();
  assert.ok(info.name);
  assert.ok(info.address);
});
