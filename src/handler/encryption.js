const { logHelpers, logger } = require("./logger");
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
const encryptResponseData = (data, timestamp = null) => {
  try {
    const algorithm = "aes-256-gcm";
    const key = Buffer.from(config.security.encryptionKey, "hex");
    const iv = timestamp
      ? generateIVFromTimestamp(timestamp)
      : crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    cipher.setAAD(Buffer.from("response-data"));

    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, "utf8");
    const final = cipher.final();
    const authTag = cipher.getAuthTag();

    const encryptedBuffer = Buffer.concat([encrypted, final, authTag]);

    return {
      encrypted_data: encryptedBuffer.toString("hex"),
      timestamp: timestamp || Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    logHelpers.error(error, { context: "Response Data Encryption" });
    throw new Error("Failed to encrypt response data: " + error.message);
  }
};

const encryptDataCBC = (data, timestamp) => {
  try {
    const algorithm = "aes-256-cbc";
    const key = Buffer.from(config.security.encryptionKey, "hex");
    const iv = generateIVFromTimestamp(timestamp);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const jsonData = JSON.stringify(data);

    let encrypted = cipher.update(jsonData, "utf8");
    const final = cipher.final();
    const encryptedBuffer = Buffer.concat([encrypted, final]);

    return {
      encrypted_data: encryptedBuffer.toString("hex"),
      timestamp: timestamp,
    };
  } catch (error) {
    logHelpers.error(error, { context: "CBC Encryption" });
    throw new Error("Failed to encrypt data with CBC: " + error.message);
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
    const encrypted = encryptDataCBC(testData, timestamp);
    logger.info("✅ Encryption test passed");

    const decrypted = decryptDataCBC(encrypted.encrypted_data, timestamp);

    if (JSON.stringify(testData) === JSON.stringify(decrypted)) {
      logger.info("✅ Decryption test passed");
      logger.info("✅ All encryption tests completed successfully!\n");
      return true;
    } else {
      logger.error("❌ Decryption test failed - data mismatch");
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
  generateEncryptionKey,
  generateSharedSecret,
  generateAdminSecret,
  testEncryption,
  generateIVFromTimestamp,
};
