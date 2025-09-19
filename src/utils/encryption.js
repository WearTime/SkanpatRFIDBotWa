const { logHelpers, logger } = require("../handlers/logger");
const crypto = require("crypto");
const config = require("../config");

const generateIVFromTimestamp = (timestamp) => {
  const data = `${config.security.sharedSecret}:${timestamp}`;
  const hash = crypto.createHash("sha256").update(data).digest();
  return hash.slice(0, 16);
};

const decryptRequestData = (encryptedData, timestamp) => {
  try {
    const algorithm = "aes-256-gcm";
    const key = Buffer.from(config.security.encryptionKey, "hex");
    const iv = generateIVFromTimestamp(timestamp);
    const encryptedBuffer = Buffer.from(encryptedData, "hex");

    logger.info("GCM Decrypt attempt", {
      algorithm: algorithm,
      key_length: key.length,
      iv_length: iv.length,
      iv_hex: iv.toString("hex"),
      encrypted_length: encryptedBuffer.length,
      encrypted_preview: encryptedData.substring(0, 32) + "...",
    });

    const tagLength = 16;

    if (encryptedBuffer.length < tagLength) {
      throw new Error(
        `Encrypted data too short. Got ${encryptedBuffer.length}, need at least ${tagLength}`
      );
    }

    const encrypted = encryptedBuffer.slice(0, -tagLength);
    const authTag = encryptedBuffer.slice(-tagLength);

    logger.info("Split encrypted and tag", {
      encrypted_length: encrypted.length,
      tag_length: authTag.length,
      tag_hex: authTag.toString("hex"),
    });

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    decipher.setAuthTag(authTag);

    decipher.setAAD(Buffer.from("request-data"));

    let decrypted = decipher.update(encrypted, null, "utf8");
    decrypted += decipher.final("utf8");

    const result = JSON.parse(decrypted);
    logger.info("GCM Decrypt SUCCESS", {
      result_keys: Object.keys(result),
      student_name: result.student_name,
    });

    return result;
  } catch (error) {
    logHelpers.error(error, {
      context: "Request Data Decryption GCM",
      timestamp: timestamp,
      encryptedDataLength: encryptedData?.length,
    });
    throw new Error("Failed to decrypt GCM data: " + error.message);
  }
};

// FIX: Gunakan createCipheriv untuk GCM, bukan createCipherGCM
const encryptResponseData = (data, timestamp = null) => {
  try {
    const algorithm = "aes-256-gcm";
    const key = Buffer.from(config.security.encryptionKey, "hex");
    const iv = generateIVFromTimestamp(timestamp);
    const aad = Buffer.from("request-data"); // Must match PHP exactly

    // FIX: Gunakan createCipheriv, bukan createCipherGCM
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    cipher.setAAD(aad);

    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get auth tag after final()
    const authTag = cipher.getAuthTag();
    const encryptedWithTag = Buffer.concat([encrypted, authTag]);

    logger.info("GCM encryption successful", {
      dataLength: jsonData.length,
      encryptedLength: encryptedWithTag.length,
      timestamp: timestamp,
    });

    return {
      data: encryptedWithTag.toString("hex"),
      timestamp: timestamp,
    };
  } catch (error) {
    logger.error("GCM encryption failed", {
      error: error.message,
      timestamp: timestamp,
    });
    throw new Error(`GCM Encryption Failed: ${error.message}`);
  }
};

// FIX: Perbaiki implementasi CBC encryption
const encryptDataCBC = (data, timestamp) => {
  try {
    const algorithm = "aes-256-cbc";
    const key = Buffer.from(config.security.encryptionKey, "hex");
    const iv = generateIVFromTimestamp(timestamp);

    // FIX: Gunakan createCipheriv, bukan createCipher
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    logger.info("CBC encryption successful", {
      dataLength: jsonData.length,
      encryptedLength: encrypted.length,
      timestamp: timestamp,
    });

    return {
      data: encrypted.toString("hex"),
      timestamp: timestamp,
    };
  } catch (error) {
    logger.error("CBC encryption failed", {
      error: error.message,
      timestamp: timestamp,
    });
    throw new Error(`CBC Encryption Failed: ${error.message}`);
  }
};

const decryptDataCBC = (encryptedData, timestamp) => {
  try {
    const algorithm = "aes-256-cbc";
    const key = Buffer.from(config.security.encryptionKey, "hex");
    const iv = generateIVFromTimestamp(timestamp);
    const encryptedBuffer = Buffer.from(encryptedData, "hex");

    logger.info("CBC Decrypt attempt", {
      algorithm: algorithm,
      key_length: key.length,
      iv_length: iv.length,
      iv_hex: iv.toString("hex"),
      encrypted_length: encryptedBuffer.length,
    });

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encryptedBuffer, null, "utf8");
    decrypted += decipher.final("utf8");

    const result = JSON.parse(decrypted);
    logger.info("CBC Decrypt SUCCESS", {
      result_keys: Object.keys(result),
      student_name: result.student_name,
    });

    return result;
  } catch (error) {
    logHelpers.error(error, { context: "CBC Decryption" });
    throw new Error("Failed to decrypt CBC data: " + error.message);
  }
};

const smartDecrypt = (encryptedData, timestamp) => {
  try {
    logger.info("Trying GCM decryption first...");
    return decryptRequestData(encryptedData, timestamp);
  } catch (gcmError) {
    logger.warn("GCM decrypt failed, trying CBC fallback", {
      error: gcmError.message,
    });

    try {
      logger.info("Trying CBC decryption...");
      return decryptDataCBC(encryptedData, timestamp);
    } catch (cbcError) {
      logHelpers.error(cbcError, { context: "All Decryption Failed" });
      throw new Error("All decryption methods failed: " + gcmError.message);
    }
  }
};

// FIX: Tambahkan smart encrypt yang cocok dengan PHP
const smartEncrypt = (data, timestamp) => {
  try {
    logger.info("Trying GCM encryption first...");
    return encryptResponseData(data, timestamp);
  } catch (gcmError) {
    logger.warn("GCM encrypt failed, trying CBC fallback", {
      error: gcmError.message,
    });

    try {
      logger.info("Trying CBC encryption...");
      return encryptDataCBC(data, timestamp);
    } catch (cbcError) {
      logHelpers.error(cbcError, { context: "All Encryption Failed" });
      throw new Error("All encryption methods failed: " + gcmError.message);
    }
  }
};

const generateEncryptionKey = () => {
  const key = crypto.randomBytes(32).toString("hex");
  return key;
};

const generateSharedSecret = (length = 64) => {
  const secret = crypto.randomBytes(length / 2).toString("hex");
  return secret;
};

const generateAdminSecret = (length = 32) => {
  const secret = crypto.randomBytes(length / 2).toString("hex");
  return secret;
};

const testEncryption = (encryptionKey) => {
  const testData = {
    student_name: "Bangkit Anjay",
    student_class: "11",
    parent_phone: "089518040619",
    attendance_time: "07:30:00",
    attendance_type: "masuk",
  };

  const timestamp = Math.floor(Date.now() / 1000);

  logger.info("🧪 Testing encryption with timestamp-based IV...");

  try {
    // Test GCM
    logger.info("Testing GCM encryption...");
    const encryptedGCM = encryptResponseData(testData, timestamp);
    const decryptedGCM = decryptRequestData(encryptedGCM.data, timestamp);

    if (JSON.stringify(testData) === JSON.stringify(decryptedGCM)) {
      logger.info("✅ GCM encryption/decryption test passed");
    } else {
      logger.error("❌ GCM test failed - data mismatch");
    }

    // Test CBC
    logger.info("Testing CBC encryption...");
    const encryptedCBC = encryptDataCBC(testData, timestamp);
    const decryptedCBC = decryptDataCBC(encryptedCBC.data, timestamp);

    if (JSON.stringify(testData) === JSON.stringify(decryptedCBC)) {
      logger.info("✅ CBC encryption/decryption test passed");
      logger.info("✅ All encryption tests completed successfully!\n");
      return true;
    } else {
      logger.error("❌ CBC test failed - data mismatch");
      return false;
    }
  } catch (error) {
    logger.error("❌ Encryption test failed:", error.message);
    return false;
  }
};

module.exports = {
  decryptRequestData,
  encryptResponseData,
  encryptDataCBC,
  decryptDataCBC,
  smartDecrypt,
  smartEncrypt, // FIX: Export smart encrypt
  generateEncryptionKey,
  generateSharedSecret,
  generateAdminSecret,
  testEncryption,
  generateIVFromTimestamp,
};
