import { logger } from "../handlers/logger";
import { PendingConfirmation } from "../types/permission.types";

export const pendingConfirmations = new Map<string, PendingConfirmation>();

let cleanupIntervalId: NodeJS.Timeout | null = null;

function startCleanupInterval(): void {
  cleanupIntervalId = setInterval(
    () => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, data] of pendingConfirmations.entries()) {
        // 24 hours = 24 * 60 * 60 * 1000 ms
        if (now - data.created_at > 24 * 60 * 60 * 1000) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach((key) => {
        pendingConfirmations.delete(key);
        logger.info("Expired pending confirmation removed", {
          phoneNumber: key,
        });
      });

      if (expiredKeys.length > 0) {
        logger.info("Cleanup completed", { expiredCount: expiredKeys.length });
      }
    },
    60 * 60 * 1000
  ); // Run every hour
}

export function cleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    logger.info("Confirmation store cleanup interval cleared");
  }
}

export function addPendingConfirmation(
  phoneNumber: string,
  data: PendingConfirmation
): void {
  pendingConfirmations.set(phoneNumber, {
    ...data,
    created_at: Date.now(),
  });
}

export function getPendingConfirmation(
  phoneNumber: string
): PendingConfirmation | undefined {
  return pendingConfirmations.get(phoneNumber);
}

export function removePendingConfirmation(phoneNumber: string): boolean {
  return pendingConfirmations.delete(phoneNumber);
}

export function getPendingCount(): number {
  return pendingConfirmations.size;
}

export function getAllPendingConfirmations(): Array<
  [string, PendingConfirmation]
> {
  return Array.from(pendingConfirmations.entries());
}

// Start cleanup interval when module loads
startCleanupInterval();
