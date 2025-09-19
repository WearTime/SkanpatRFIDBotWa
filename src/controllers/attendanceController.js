const { logHelpers, logger } = require("../handlers/logger");
const { smartDecrypt } = require("../utils/encryption");
const {
  formatAttendanceMessage,
  formataPhoneNumber,
} = require("../handlers/formatMessage");
const whatsappService = require("../services/whatsappService");
const { encryptResponseData } = require("../utils/encryption");
const config = require("../config");

const sendAttendanceController = async (req, res) => {
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
      student_name,
      student_class,
      parent_phone,
      attendance_time,
      attendance_type,
    } = decryptedData;

    if (!student_name || !parent_phone || !attendance_time || !student_class) {
      logger.error("Missing required fields", {
        hasStudentName: !!student_name,
        hasParentPhone: !!parent_phone,
        hasAttendanceTime: !!attendance_time,
        hasStudentClass: !!student_class,
      });

      return res.status(400).json({
        success: false,
        message: "Data tidak lengkap semua wajib diisi",
      });
    }

    if (!["masuk", "keluar"].includes(attendance_type)) {
      return res.status(400).json({
        success: false,
        message: 'attendance_type harus "masuk" atau "keluar"',
      });
    }

    const message = formatAttendanceMessage(decryptedData);

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
          attendanceType: attendance_type,
          phone: whatsappNumber.replace(/\d(?=\d{4})/g, "*"),
        });

        await whatsappService.sendMessage(whatsappNumber, message);

        logHelpers.messageSent(
          whatsappNumber,
          student_name,
          attendance_type,
          true
        );
        successCount++;
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
          attendance_type,
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
      context: "Send Attendance",
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

module.exports = {
  sendAttendanceController,
};
