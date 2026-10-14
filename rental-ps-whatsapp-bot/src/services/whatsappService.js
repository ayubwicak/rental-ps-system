const messageHandler = require("../handlers/messageHandler");
const config = require("../config/config");
const logger = require("../utils/logger");
const readline = require("readline");

class WhatsappService {
  constructor() {
    this.client = null;
  }

  async start() {
    if (config.enableSimulation) {
      logger.info("WhatsappService", "Running in CLI Simulation Mode (ENABLE_SIMULATION_MODE=true).");
      this.startCliSimulation();
      return;
    }

    try {
      const wa = require("@open-wa/wa-automate");
      logger.info("WhatsappService", "Initializing OpenWA client...");

      this.client = await wa.create({
        sessionId: "RENTAL_PS_BOT",
        multiDevice: true,
        authTimeout: 60,
        blockCrashPlayers: true,
        disableSpins: true,
        headless: true,
        qrTimeout: 0,
      });

      logger.info("WhatsappService", "OpenWA client successfully initialized & authenticated!");

      this.client.onMessage(async (message) => {
        if (message.isGroupMsg) return; // Abaikan pesan grup
        const chatId = message.from;
        const body = message.body;

        try {
          const reply = await messageHandler.handleIncomingMessage(chatId, body);
          if (reply) {
            await this.client.sendText(chatId, reply);
            logger.info("WhatsappService", `Reply sent to ${chatId}`);
          }
        } catch (err) {
          logger.error("WhatsappService", `Error processing message from ${chatId}`, err);
          await this.client.sendText(
            chatId,
            "Maaf, sistem rental sedang mengalami gangguan. Silakan coba beberapa saat lagi."
          );
        }
      });
    } catch (err) {
      logger.error("WhatsappService", "Failed to start OpenWA. Falling back to CLI Simulation Mode.", err);
      this.startCliSimulation();
    }
  }

  startCliSimulation() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n=======================================================");
    console.log("🎮 SIMULATOR CHATBOT WHATSAPP (CLI Interactive)");
    console.log("Ketik pesan seperti di WhatsApp (ketik 'exit' untuk keluar)");
    console.log("=======================================================\n");

    const simChatId = "simulated_user_628123456789";

    const promptUser = () => {
      rl.question("\x1b[36mUser > \x1b[0m", async (input) => {
        if (input.trim().toLowerCase() === "exit") {
          console.log("Simulation terminated.");
          rl.close();
          return;
        }

        const reply = await messageHandler.handleIncomingMessage(simChatId, input);
        if (reply) {
          console.log(`\n\x1b[32mBot >\x1b[0m\n${reply}\n`);
        } else {
          console.log("\n\x1b[33m[System] Bot silent (Human Handoff active). Ketik #bot untuk reset.\x1b[0m\n");
        }
        promptUser();
      });
    };

    promptUser();
  }
}

module.exports = new WhatsappService();
