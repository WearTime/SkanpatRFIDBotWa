import crypto from "crypto";
import config from "../config";
import { logger, logHelpers } from "../handlers/logger";
import { EncryptionResult } from "../types/security.types";

export class EncryptionService {
  private static generateIVFromTimestamp(timestamp: number): Buffer {
    const data = `${config.security.sharedSecret}:${timestamp}`;
    const hash = crypto.createHash("sha256").update(data).digest();
    return hash.slice(0, 16);
  }

  static decryptRequestDataGCM(encryptedData: string, timestamp: number): any {
    try {
      const algorithm = "aes-256-gcm";
      const key = Buffer.from(config.security.encryptionKey, "hex");
      const iv = this.generateIVFromTimestamp(timestamp);
      const encryptedBuffer = Buffer.from(encryptedData, "hex");

      logger.info("GCM Decrypt attempt", {
        algorithm,
        keyLength: key.length,
        ivLength: iv.length,
        encryptedLength: encryptedBuffer.length,
      });

      const tagLength = 16;

      if (encryptedBuffer.length < tagLength) {
        throw new Error(
          `Encrypted data too short. Got ${encryptedBuffer.length}, need at least ${tagLength}`
        );
      }

      const encrypted = encryptedBuffer.slice(0, -tagLength);
      const authTag = encryptedBuffer.slice(-tagLength);

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from("request-data"));

      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");

      const result = JSON.parse(decrypted);
      logger.info("GCM Decrypt SUCCESS", {
        resultKeys: Object.keys(result),
      });

      return result;
    } catch (error) {
      throw new Error(
        `Failed to decrypt GCM data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static encryptResponseDataGCM(
    data: any,
    timestamp: number
  ): EncryptionResult {
    try {
      const algorithm = "aes-256-gcm";
      const key = Buffer.from(config.security.encryptionKey, "hex");
      const iv = this.generateIVFromTimestamp(timestamp);
      const aad = Buffer.from("request-data");

      const cipher = crypto.createCipheriv(algorithm, key, iv);
      cipher.setAAD(aad);

      const jsonData = JSON.stringify(data);
      let encrypted = cipher.update(jsonData, "utf8");
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const authTag = cipher.getAuthTag();
      const encryptedWithTag = Buffer.concat([encrypted, authTag]);

      logger.info("GCM encryption successful", {
        dataLength: jsonData.length,
        encryptedLength: encryptedWithTag.length,
        timestamp,
      });

      return {
        data: encryptedWithTag.toString("hex"),
        timestamp,
      };
    } catch (error) {
      throw new Error(
        `GCM Encryption Failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static encryptDataCBC(data: any, timestamp: number): EncryptionResult {
    try {
      const algorithm = "aes-256-cbc";
      const key = Buffer.from(config.security.encryptionKey, "hex");
      const iv = this.generateIVFromTimestamp(timestamp);

      const cipher = crypto.createCipheriv(algorithm, key, iv);

      const jsonData = JSON.stringify(data);
      let encrypted = cipher.update(jsonData, "utf8");
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      logger.info("CBC encryption successful", {
        dataLength: jsonData.length,
        encryptedLength: encrypted.length,
        timestamp,
      });

      return {
        data: encrypted.toString("hex"),
        timestamp,
      };
    } catch (error) {
      throw new Error(
        `CBC Encryption Failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static decryptDataCBC(encryptedData: string, timestamp: number): any {
    try {
      const algorithm = "aes-256-cbc";
      const key = Buffer.from(config.security.encryptionKey, "hex");
      const iv = this.generateIVFromTimestamp(timestamp);
      const encryptedBuffer = Buffer.from(encryptedData, "hex");

      const decipher = crypto.createDecipheriv(algorithm, key, iv);

      let decrypted = decipher.update(encryptedBuffer, undefined, "utf8");
      decrypted += decipher.final("utf8");

      const result = JSON.parse(decrypted);
      logger.info("CBC Decrypt SUCCESS", {
        resultKeys: Object.keys(result),
      });

      return result;
    } catch (error) {
      throw new Error(
        `Failed to decrypt CBC data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static smartDecrypt(encryptedData: string, timestamp: number): any {
    try {
      logger.info("Trying GCM decryption first...");
      return this.decryptRequestDataGCM(encryptedData, timestamp);
    } catch (gcmError) {
      logger.warn("GCM decrypt failed, trying CBC fallback", {
        error: gcmError instanceof Error ? gcmError.message : String(gcmError),
      });

      try {
        logger.info("Trying CBC decryption...");
        return this.decryptDataCBC(encryptedData, timestamp);
      } catch (cbcError) {
        logHelpers.error(
          cbcError instanceof Error ? cbcError : new Error(String(cbcError)),
          { context: "All Decryption Failed" }
        );
        throw new Error(
          `All decryption methods failed: ${gcmError instanceof Error ? gcmError.message : String(gcmError)}`
        );
      }
    }
  }

  static smartEncrypt(data: any, timestamp: number): EncryptionResult {
    try {
      logger.info("Trying GCM encryption first...");
      return this.encryptResponseDataGCM(data, timestamp);
    } catch (gcmError) {
      logger.warn("GCM encrypt failed, trying CBC fallback", {
        error: gcmError instanceof Error ? gcmError.message : String(gcmError),
      });

      try {
        logger.info("Trying CBC encryption...");
        return this.encryptDataCBC(data, timestamp);
      } catch (cbcError) {
        logHelpers.error(
          cbcError instanceof Error ? cbcError : new Error(String(cbcError)),
          { context: "All Encryption Failed" }
        );
        throw new Error(
          `All encryption methods failed: ${gcmError instanceof Error ? gcmError.message : String(gcmError)}`
        );
      }
    }
  }

  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  static generateSharedSecret(length: number = 64): string {
    return crypto.randomBytes(length / 2).toString("hex");
  }

  static generateAdminSecret(length: number = 32): string {
    return crypto.randomBytes(length / 2).toString("hex");
  }

  static testEncryption(): boolean {
    const testData = {
      student_name: "Test Student",
      student_class: "10A",
      parent_phone: "08123456789",
      attendance_time: "07:30:00",
      attendance_type: "masuk",
    };

    const timestamp = Math.floor(Date.now() / 1000);

    logger.info("🧪 Testing encryption with timestamp-based IV...");

    try {
      // Test GCM
      logger.info("Testing GCM encryption...");
      const encryptedGCM = this.encryptResponseDataGCM(testData, timestamp);
      const decryptedGCM = this.decryptRequestDataGCM(
        encryptedGCM.data,
        timestamp
      );

      if (JSON.stringify(testData) === JSON.stringify(decryptedGCM)) {
        logger.info("✅ GCM encryption/decryption test passed");
      } else {
        logger.error("❌ GCM test failed - data mismatch");
      }

      // Test CBC
      logger.info("Testing CBC encryption...");
      const encryptedCBC = this.encryptDataCBC(testData, timestamp);
      const decryptedCBC = this.decryptDataCBC(encryptedCBC.data, timestamp);

      if (JSON.stringify(testData) === JSON.stringify(decryptedCBC)) {
        logger.info("✅ CBC encryption/decryption test passed");
        logger.info("✅ All encryption tests completed successfully!\n");
        return true;
      } else {
        logger.error("❌ CBC test failed - data mismatch");
        return false;
      }
    } catch (error) {
      logger.error("❌ Encryption test failed:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
