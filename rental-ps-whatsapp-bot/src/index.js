const whatsappService = require("./services/whatsappService");
const rentalApiService = require("./services/rentalApiService");
const logger = require("./utils/logger");

async function bootstrap() {
  console.log("==================================================");
  console.log("🚀 Memulai Rental PS WhatsApp Bot Service...");
  console.log("==================================================");

  try {
    // 1. Verifikasi koneksi & login ke Express Backend API
    logger.info("Bootstrap", "Verifying REST API connection to Backend...");
    await rentalApiService.login();
    logger.info("Bootstrap", "Backend REST API connection successful!");

    // 2. Start WhatsApp Service
    await whatsappService.start();
  } catch (err) {
    logger.error("Bootstrap", "Error starting WhatsApp Bot service", err);
    console.log("\n⚠️ Pastikan backend Express (rental-ps-system) sudah berjalan di http://localhost:4000");
    console.log("Menjalankan WhatsApp Bot dalam mode standby / fallback simulation...");
    await whatsappService.start();
  }
}

bootstrap();
