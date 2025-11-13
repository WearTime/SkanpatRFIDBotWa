import crypto from "crypto";
import { EncryptionService } from "../utils/encryption";
import { logger } from "../handlers/logger";

logger.info("Generating security keys...\n");

const encryptionKey = EncryptionService.generateEncryptionKey();
const sharedSecret = EncryptionService.generateSharedSecret();
const adminSecret = EncryptionService.generateAdminSecret();

logger.info("📋 Add these to your .env file:");
logger.info("=====================================");
logger.info(`SECRET=${sharedSecret}`);
logger.info(`ADMIN_SECRET=${adminSecret}`);
logger.info(`ENCRYPTION_KEY=${encryptionKey}`);
logger.info("=====================================\n");

logger.info("⚠️  IMPORTANT NOTES:");
logger.info("1. Keep these keys SECRET and SECURE");
logger.info("2. Use the same ENCRYPTION_KEY in both Node.js and Laravel");
logger.info("3. Use the same SECRET for API key generation");
logger.info("4. Store these keys in environment variables, not in code");
logger.info("5. Generate new keys for production environment\n");

const testResult = EncryptionService.testEncryption();

if (!testResult) {
  logger.warn("\n🔧 Encryption test failed!");
  logger.warn("Please check your Node.js version and OpenSSL support.");
}

logger.info("\n🔑 API Key generation example:");
const timestamp = Math.floor(Date.now() / (1000 * 60 * 10));
const data = `${sharedSecret}:${timestamp}`;
const apiKey = crypto
  .createHash("sha256")
  .update(data)
  .digest("hex")
  .substring(0, 32);

logger.info(`Timestamp: ${timestamp}`);
logger.info(`API Key: ${apiKey}`);
logger.info("API key generation working\n");

logger.info("🔍 System Information:");
logger.info(`Node.js Version: ${process.version}`);
logger.info(`Platform: ${process.platform}`);
logger.info(`Architecture: ${process.arch}`);
logger.info(`OpenSSL Version: ${process.versions.openssl || "Unknown"}\n`);

logger.info("Available Encryption Algorithms:");
const availableCiphers = crypto.getCiphers();
const aesAlgorithms = availableCiphers.filter((cipher) =>
  cipher.includes("aes")
);
console.log(
  "AES algorithms:",
  aesAlgorithms.slice(0, 10).join(", ") +
    (aesAlgorithms.length > 10 ? ` (+${aesAlgorithms.length - 10} more)` : "")
);

const gcmAlgorithms = availableCiphers.filter((cipher) =>
  cipher.includes("gcm")
);
console.log(
  "GCM algorithms:",
  gcmAlgorithms.length > 0 ? gcmAlgorithms.join(", ") : "None available"
);
console.log("");

if (gcmAlgorithms.length === 0) {
  logger.warn("\nWARNING: GCM mode not available!");
  logger.warn("The system will use CBC mode with integrity checking.");
  logger.warn("Consider upgrading Node.js for better security features.");
}

logger.info("\nKey generation completed!");
logger.info(
  "Copy the keys above to your .env file and restart the application."
);
