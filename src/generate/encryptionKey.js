const crypto = require("crypto");
const {
  generateEncryptionKey,
  generateSharedSecret,
  generateAdminSecret,
  testEncryption,
} = require("../handler/encryption");
const { logHelpers, logger } = require("../handler/logger");

logger.info("Generating security keys...\n");

const encryptionKey = generateEncryptionKey();
const sharedSecret = generateSharedSecret();
const adminSecret = generateAdminSecret();

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

const testResult = testEncryption(encryptionKey);

if (!testResult) {
  logger.warn(
    "\n🔧 Alternative testing with crypto.createCipher (deprecated but might work):"
  );
  try {
    const testData = {
      student_name: "Test Student",
      student_class: "10A",
      parent_phone: "08123456789",
      attendance_time: "07:30:00",
      attendance_type: "masuk",
    };

    const cipher = crypto.createCipher("aes256", encryptionKey);
    let encrypted = cipher.update(JSON.stringify(testData), "utf8", "hex");
    encrypted += cipher.final("hex");

    const decipher = crypto.createDecipher("aes256", encryptionKey);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    const decryptedData = JSON.parse(decrypted);

    if (JSON.stringify(testData) === JSON.stringify(decryptedData)) {
      logger.info(
        "✅ Alternative encryption test passed (using deprecated method)"
      );
      logger.warn("Recommend upgrading Node.js for better security");
    } else {
      logger.error("Alternative encryption test failed");
    }
  } catch (altError) {
    logger.error("❌ Alternative encryption also failed:", altError.message);
    logger.error("\n🚨 CRITICAL: Encryption is not working on this system");
    logger.error("Possible solutions:");
    logger.error("1. Update Node.js to latest LTS version");
    logger.error("2. Reinstall Node.js with OpenSSL support");
    logger.error("3. Check system compatibility");
    logger.error("4. Try running: npm rebuild");
  }
}

logger.info("🔑 API Key generation example:");
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
  gcmAlgorithms.length > 0 ? gcmAlgorithms.join(", ") : "None available" + "\n"
);

if (gcmAlgorithms.length === 0) {
  logger.warn("\nWARNING: GCM mode not available!");
  logger.warn("The system will use CBC mode with integrity checking.");
  logger.warn("Consider upgrading Node.js for better security features.");
}

logger.info("Key generation completed!");
logger.info(
  "Copy the keys above to your .env file and restart the application."
);
