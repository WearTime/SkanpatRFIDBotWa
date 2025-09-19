const { logHelpers, logger } = require("../handlers/logger");
const { smartDecrypt } = require("../utils/encryption");
const {
  formatPermissionMessage,
  formataPhoneNumber,
} = require("../handlers/formatMessage");
const whatsappService = require("../services/whatsappService");
const { encryptResponseData } = require("../utils/encryption");
const { pendingConfirmations } = require("../utils/confirmationStore");
const config = require("../config");

const sendPermissionController = async (req, res) => {
  try {
    const { data, timestamp } = req.body;

    let decryptedData;
    try {
      decryptedData = smartDecrypt(data, timestamp);

      logger.info("Decryption successful", {
        dataKeys: Object.keys(decryptedData),
        studentName: decryptedData.student_name,
        parentPhoneType: typeof decryptedData.parent_phone,
        parentPhoneIsArray: Array.isArray(decryptedData.parent_phone),
      });
    } catch (error) {
      logHelpers.securityEvent("Decryption Failed", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        error: error.message,
        timestamp: timestamp,
      });

      return res.status(400).json({
        success: false,
        message: "Failed to read request data",
      });
    }

    const {
      uuid,
      student_name,
      student_class,
      parent_phone,
      permission_date,
      permission_type,
      permission_note,
    } = decryptedData;

    if (
      !uuid ||
      !student_class ||
      !parent_phone ||
      !permission_date ||
      !permission_note
    ) {
      logger.error("Missing required fields", {
        hasStudentUuid: !!uuid,
        hasStudentClass: !!student_class,
        hasParentPhone: !!parent_phone,
        hasPermissionDate: !!permission_date,
        hasPermissionNote: !!permission_note,
      });

      return res.status(400).json({
        success: false,
        message: "Data tidak lengkap semua wajib diisi",
      });
    }

    if (!["sakit", "izin", "dispensasi"].includes(permission_type)) {
      return res.status(400).json({
        success: false,
        message: 'permission_type harus "sakit", "izin" atau "dispensasi"',
      });
    }

    const message = formatPermissionMessage(decryptedData);

    let whatsappNumbers = [];
    try {
      if (Array.isArray(parent_phone)) {
        whatsappNumbers = parent_phone.map((phone) =>
          formataPhoneNumber(phone)
        );
      } else {
        whatsappNumbers = [formataPhoneNumber(parent_phone)];
      }

      logger.info("Phone numbers formatted", {
        originalPhones: parent_phone,
        formattedCount: whatsappNumbers.length,
        firstFormatted: whatsappNumbers[0]?.replace(/\d(?=\d{4})/g, "*"),
      });
    } catch (phoneError) {
      logger.error("Phone number formatting failed", {
        error: phoneError.message,
        parentPhone: parent_phone,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid phone number format: " + phoneError.message,
      });
    }

    let successCount = 0;
    let errors = [];

    for (let i = 0; i < whatsappNumbers.length; i++) {
      const whatsappNumber = whatsappNumbers[i];

      try {
        logger.info(`Sending message ${i + 1}/${whatsappNumbers.length}`, {
          student: student_name,
          permission_type: permission_type,
          phone: whatsappNumber.replace(/\d(?=\d{4})/g, "*"),
        });

        await whatsappService.sendMessage(whatsappNumber, message);

        pendingConfirmations.set(whatsappNumber, {
          uuid,
          student_name,
          student_class,
          parent_phone: whatsappNumber,
          permission_date,
          permission_type,
          permission_note,
          created_at: Date.now(),
          message_sent_at: new Date().toISOString(),
        });

        logHelpers.messageSent(whatsappNumber, uuid, permission_type, true);
        successCount++;

        logger.info("Permission confirmation tracking added", {
          phoneNumber: whatsappNumber,
          studentUuid: uuid,
          permissionType: permission_type,
        });
      } catch (sendError) {
        logger.error(`Failed to send message ${i + 1}`, {
          phone: whatsappNumber.replace(/\d(?=\d{4})/g, "*"),
          error: sendError.message,
        });

        errors.push({
          phone: whatsappNumber,
          error: sendError.message,
        });

        logHelpers.messageSent(
          whatsappNumber,
          student_name,
          permission_type,
          false
        );
      }
    }

    if (successCount > 0) {
      const responseData = {
        success: true,
        message: `Pesan berhasil dikirim ke ${successCount}/${whatsappNumbers.length} nomor`,
        details: {
          successCount: successCount,
          totalCount: whatsappNumbers.length,
          pendingConfirmations: successCount,
          errors: errors.length > 0 ? errors : undefined,
        },
      };

      if (config.security.encryptResponse) {
        try {
          const encryptedResponse = encryptResponseData(
            responseData,
            timestamp
          );
          res.status(200).json(encryptedResponse);
        } catch (encryptError) {
          logHelpers.error(encryptError, { context: "Response Encryption" });
          res.status(200).json(responseData);
        }
      } else {
        res.status(200).json(responseData);
      }
    } else {
      res.status(500).json({
        success: false,
        message: "Gagal mengirim pesan ke semua nomor",
        errors: errors,
      });
    }
  } catch (error) {
    logHelpers.error(error, {
      context: "Send Permission",
      hasEncryptedData: !!req.body.data,
    });

    const errorResponse = {
      success: false,
      message: "Gagal mengirim pesan",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    };

    res.status(500).json(errorResponse);
  }
};

const pendingConfirmationsController = async (req, res) => {
  const pending = Array.from(pendingConfirmations.entries()).map(
    ([phone, data]) => ({
      phone_number: phone,
      student_name: data.student_name,
      student_class: data.student_class,
      uuid: data.uuid,
      permission_type: data.permission_type,
      permission_date: data.permission_date,
      message_sent_at: data.message_sent_at,
      created_at: new Date(data.created_at).toISOString(),
    })
  );

  res.status(200).json({
    success: true,
    total: pending.length,
    pending_confirmations: pending,
  });
};
module.exports = {
  sendPermissionController,
  pendingConfirmationsController,
};
