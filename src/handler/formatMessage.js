const { logger } = require("./logger");

/**
 * Format nomor telepon untuk WhatsApp
 * @param {string|array} phoneInput - Nomor telepon (bisa string atau array)
 * @returns {string} - Formatted WhatsApp number
 */

const formataPhoneNumber = (phoneInput) => {
  try {
    let phoneNumber;

    if (Array.isArray(phoneInput)) {
      if (phoneInput.length === 0) {
        throw new Error("Phone number array is empty");
      }
      phoneNumber = phoneInput[0];
      logger.info("Phone input is array, taking first element", {
        originalArray: phoneInput,
        selectedPhone: phoneNumber,
      });
    } else if (typeof phoneInput === "string") {
      phoneNumber = phoneInput;
    } else {
      throw new Error(`Invalid phone input type: ${typeof phoneInput}`);
    }

    phoneNumber = String(phoneNumber).trim();

    if (!phoneNumber) {
      throw new Error("Phone number is empty after conversion");
    }

    logger.info("Processing phone number", {
      originalPhone: phoneNumber,
      type: typeof phoneNumber,
    });

    let cleanNumber = phoneNumber.replace(/\D/g, "");

    if (cleanNumber.startsWith("62")) {
      cleanNumber = cleanNumber;
    } else if (cleanNumber.startsWith("08")) {
      cleanNumber = "62" + cleanNumber.substring(1);
    } else if (cleanNumber.startsWith("8")) {
      cleanNumber = "62" + cleanNumber;
    } else {
      if (!cleanNumber.startsWith("62")) {
        cleanNumber = "62" + cleanNumber;
      }
    }

    if (cleanNumber.length < 12) {
      throw new Error(`Phone number too short: ${cleanNumber}`);
    }

    const whatsappNumber = cleanNumber + "@c.us";

    logger.info("Phone number formatted successfully", {
      original: phoneNumber,
      cleaned: cleanNumber,
      whatsapp: whatsappNumber,
    });

    return whatsappNumber;
  } catch (error) {
    logger.error("Phone number formatting error", {
      error: error.message,
      phoneInput: phoneInput,
      inputType: typeof phoneInput,
      isArray: Array.isArray(phoneInput),
    });
    throw new Error(`Failed to format phone number: ${error.message}`);
  }
};

/**
 * Format pesan absensi
 * @param {object} attendanceData - Data absensi
 * @returns {string} - Formatted message
 */
const formatAttendanceMessage = (attendanceData) => {
  try {
    const {
      student_name,
      student_class,
      attendance_time,
      attendance_type,
      is_late,
      late_duration,
    } = attendanceData;

    logger.info("Formatting attendance message", {
      student: student_name,
      type: attendance_type,
      time: attendance_time,
      class: student_class,
    });

    const schoolName = process.env.SCHOOL || "Sekolah";
    const currentDate = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let message = "";

    if (attendance_type === "masuk") {
      message = `🏫 *${schoolName}*\n`;
      message += `📅 ${currentDate}\n\n`;
      message += `👨‍🎓 *${student_name}*\n`;
      message += `🏛️ Kelas: ${student_class}\n`;
      message += `⏰ Waktu Masuk: ${attendance_time}\n`;

      if (is_late) {
        message += `⚠️ Status: TERLAMBAT (${late_duration})\n\n`;
        message += `Mohon untuk lebih memperhatikan waktu kedatangan anak.`;
      } else {
        message += `✅ Status: TEPAT WAKTU\n\n`;
        message += `Terima kasih atas kedisiplinan anak dalam mengikuti pembelajaran.`;
      }
    } else if (attendance_type === "keluar") {
      message = `🏫 *${schoolName}*\n`;
      message += `📅 ${currentDate}\n\n`;
      message += `👨‍🎓 *${student_name}*\n`;
      message += `🏛️ Kelas: ${student_class}\n`;
      message += `🚪 Waktu Keluar: ${attendance_time}\n`;
      message += `✅ Status: PULANG\n\n`;
      message += `Anak telah selesai mengikuti kegiatan pembelajaran hari ini.`;
    }

    message += `\n\n📱 Pesan otomatis dari sistem absensi ${schoolName}`;

    logger.info("Message formatted successfully", {
      messageLength: message.length,
      studentName: student_name,
      attendanceType: attendance_type,
    });

    return message;
  } catch (error) {
    logger.error("Message formatting error", {
      error: error.message,
      attendanceData: attendanceData,
    });

    return (
      `🏫 Notifikasi Absensi\n\n` +
      `Siswa: ${attendanceData.student_name || "Unknown"}\n` +
      `Waktu: ${attendanceData.attendance_time || "Unknown"}\n` +
      `Tipe: ${attendanceData.attendance_type || "Unknown"}\n\n` +
      `Pesan otomatis dari sistem absensi.`
    );
  }
};

/**
 * Broadcast pesan ke multiple nomor (jika diperlukan)
 * @param {array} phoneNumbers - Array nomor telepon
 * @param {string} message - Pesan yang akan dikirim
 * @returns {array} - Array formatted WhatsApp numbers
 */

const formatMultiplePhoneNumbers = (phoneNumbers) => {
  try {
    if (!Array.isArray(phoneNumbers)) {
      phoneNumbers = [phoneNumbers];
    }

    const formattedNumbers = phoneNumbers
      .map((phone, index) => {
        try {
          return formataPhoneNumber(phone);
        } catch (error) {
          logger.warn(`Failed to format phone number at index ${index}`, {
            phone: phone,
            error: error.message,
          });
          return null;
        }
      })
      .filter((number) => number !== null);

    logger.info("Multiple phone numbers formatted", {
      originalCount: phoneNumbers.length,
      successCount: formattedNumbers.length,
      failedCount: phoneNumbers.length - formattedNumbers.length,
    });

    return formattedNumbers;
  } catch (error) {
    logger.error("Multiple phone formatting error", {
      error: error.message,
      phoneNumbers: phoneNumbers,
    });
    return [];
  }
};

module.exports = {
  formatAttendanceMessage,
  formataPhoneNumber,
  formatMultiplePhoneNumbers,
};
