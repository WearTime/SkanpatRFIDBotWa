const express = require("express");
const config = require("./config");
const { logger } = require("./handlers/logger");
const whatsappClient = require("./services/whatsappService");
const routes = require("./routes");
const { gracefulShutdown } = require("./utils/gracefulShutdown");
const { setupMiddleware } = require("./middleware");
const { setupErrorHandlers } = require("./middleware/error");

require("dotenv").config();

const app = express();

setupMiddleware(app);

app.use("/", routes);

setupErrorHandlers(app);

const server = app.listen(config.server.port, config.server.host, () => {
  console.log(
    `\n🚀 WhatsApp Bot server berjalan di http://${config.server.host}:${config.server.port}`
  );
  console.log(`📋 Endpoints:`);
  console.log(`   • POST /send-attendance - Kirim notifikasi absensi`);
  console.log(`   • POST /send-permission  - Kirim notifikasi izin`);
  console.log(`   • GET  /status          - Cek status bot`);
  console.log(`   • GET  /health          - Health check`);

  logger.info("Server Started", {
    port: config.server.port,
    host: config.server.host,
    nodeEnv: process.env.NODE_ENV,
    logLevel: config.logging.level,
  });
});

logger.info("Initializing WhatsApp client...");
whatsappClient.initialize();

gracefulShutdown(server, whatsappClient);

module.exports = { app, server };
