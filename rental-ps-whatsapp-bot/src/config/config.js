require("dotenv").config();

module.exports = {
  apiUrl: process.env.RENTAL_API_URL || "http://localhost:4000/api",
  apiUsername: process.env.RENTAL_API_USERNAME || "admin",
  apiPassword: process.env.RENTAL_API_PASSWORD || "admin123",
  aiProvider: process.env.AI_PROVIDER || "none",
  aiApiKey: process.env.AI_API_KEY || "",
  adminPhone: process.env.ADMIN_PHONE || "+6281234567890",
  enableSimulation: process.env.ENABLE_SIMULATION_MODE === "true",
};
