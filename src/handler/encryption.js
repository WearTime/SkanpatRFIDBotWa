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

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    try {
      decipher.setAAD(Buffer.from("request-data"));
    } catch (aadError) {
      logHelpers.error(new Error("AAD not supported"), {
        context: "Decryption AAD",
      });
    }

    let decrypted = decipher.update(encryptedBuffer, null, "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  } catch (error) {
    try {
      return decryptDataCBC(encryptedData, timestamp);
    } catch (cbcError) {
      logHelpers.error(error, {
        context: "Request Data Decryption",
        timestamp: timestamp,
        encryptedDataLength: encryptedData?.length,
      });
      throw new Error("Failed to decrypt request data: " + error.message);
    }
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

    try {
      cipher.setAAD(Buffer.from("response-data"));
    } catch (aadError) {
      logHelpers.error(new Error("AAD not supported"), {
        context: "Response Encryption AAD",
      });
    }

    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, "utf8");
    const final = cipher.final();

    const encryptedBuffer = Buffer.concat([encrypted, final]);

    let authTag = null;
    try {
      authTag = cipher.getAuthTag();
    } catch (tagError) {
      logHelpers.error(new Error("Auth tag not available"), {
        context: "Response Encryption Tag",
      });
    }

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

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedBuffer, null, "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  } catch (error) {
    logHelpers.error(error, { context: "CBC Decryption" });
    throw new Error("Failed to decrypt CBC data: " + error.message);
  }
};

const smartDecrypt = (encryptedData, timestamp) => {
  try {
    return decryptRequestData(encryptedData, timestamp);
  } catch (gcmError) {
    logHelpers.error(gcmError, {
      context: "GCM Decrypt Failed, trying CBC",
    });
    try {
      return decryptDataCBC(encryptedData, timestamp);
    } catch (cbcError) {
      logHelpers.error(cbcError, { context: "CBC Decrypt Failed" });
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
