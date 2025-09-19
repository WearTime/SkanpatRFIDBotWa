const { logger, logHelpers } = require("../handlers/logger");
const { cleanup: cleanupConfirmationStore } = require("./confirmationStore");

const gracefulShutdown = (server, whatsappClient) => {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    server.close(() => {
      logger.info("HTTP server closed");
    });

    try {
      cleanupConfirmationStore();

      await whatsappClient.destroy();
      logger.info("WhatsApp client destroyed");
    } catch (error) {
      logHelpers.error(error, { context: "Graceful Shutdown" });
    }

    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason, promise) => {
    logHelpers.error(new Error("Unhandled Promise Rejection"), {
      reason: reason,
      promise: promise,
    });
  });

  process.on("uncaughtException", (error) => {
    logHelpers.error(error, { context: "Uncaught Exception" });
    process.exit(1);
  });
};

module.exports = {
  gracefulShutdown,
};
