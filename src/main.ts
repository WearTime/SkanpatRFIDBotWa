import express, { Express } from "express";
import http from "http";
import dotenv from "dotenv";
import config from "./config";
import { logger } from "./handlers/logger";
import routes from "./routes";
import { gracefulShutdown } from "./utils/gracefulShutdown";
import { setupMiddleware } from "./middleware";
import { setupErrorHandlers } from "./middleware/error";
import { handleIncomingMessage } from "./handlers/messageHandlers";
import { WhatsAppFactory } from "./services/WhatsAppFactory";

dotenv.config();

const app: Express = express();

setupMiddleware(app);

app.use("/", routes);

setupErrorHandlers(app);

const server: http.Server = app.listen(
  config.server.port,
  config.server.host,
  () => {
    console.log(
      `\n🚀 WhatsApp Bot server berjalan di http://${config.server.host}:${config.server.port}`
    );
    console.log(`📱 WhatsApp Provider: ${config.whatsapp.provider}`);
    console.log(`📋 Endpoints:`);
    console.log(`   • POST /send-attendance - Kirim notifikasi absensi`);
    console.log(`   • POST /send-permission  - Kirim notifikasi izin`);
    console.log(`   • GET  /status          - Cek status bot`);
    console.log(`   • GET  /health          - Health check`);
    console.log(
      `   • GET  /pending-confirmation - Lihat pending confirmations\n`
    );

    logger.info("Server Started", {
      port: config.server.port,
      host: config.server.host,
      nodeEnv: process.env.NODE_ENV,
      logLevel: config.logging.level,
      whatsappProvider: config.whatsapp.provider,
    });
  }
);

logger.info("Initializing WhatsApp client...", {
  provider: config.whatsapp.provider,
});

const whatsappClient = WhatsAppFactory.getInstance();

whatsappClient.onMessage((from: string, message: string) => {
  handleIncomingMessage(from, message);
});

whatsappClient.initialize().catch((error: { message: string }) => {
  logger.error("Failed to initialize WhatsApp client", {
    error: error instanceof Error ? error.message : String(error),
    provider: config.whatsapp.provider,
  });
  process.exit(1);
});

gracefulShutdown(server, whatsappClient);

export { app, server };
