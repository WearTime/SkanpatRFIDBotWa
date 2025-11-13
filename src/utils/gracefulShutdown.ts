import { Server } from "http";
import { logger, logHelpers } from "../handlers/logger";
import { cleanup as cleanupConfirmationStore } from "./confirmationStore";
import { IWhatsAppClient } from "../types/whatsapp.types";

export function gracefulShutdown(
  server: Server,
  whatsappClient: IWhatsAppClient
): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    server.close(() => {
      logger.info("HTTP server closed");
    });

    try {
      cleanupConfirmationStore();

      await whatsappClient.destroy();
      logger.info("WhatsApp client destroyed");
    } catch (error) {
      logHelpers.error(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "Graceful Shutdown",
        }
      );
    }

    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    logHelpers.error(new Error("Unhandled Promise Rejection"), {
      reason: reason,
      promise: promise,
    });
  });

  process.on("uncaughtException", (error: Error) => {
    logHelpers.error(error, { context: "Uncaught Exception" });
    process.exit(1);
  });
}
