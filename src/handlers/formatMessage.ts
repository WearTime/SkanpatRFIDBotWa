import { AttendanceData } from "../types/attendance.types";
import { PermissionData } from "../types/permission.types";
import { logger } from "./logger";

export function formatPhoneNumber(phoneInput: string | string[]): string {
  try {
    let phoneNumber: string;

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
      // Already correct format
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
      error: error instanceof Error ? error.message : String(error),
      phoneInput: phoneInput,
      inputType: typeof phoneInput,
      isArray: Array.isArray(phoneInput),
    });
    throw new Error(
      `Failed to format phone number: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function formatAttendanceMessage(
  attendanceData: AttendanceData
): string {
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
      error: error instanceof Error ? error.message : String(error),
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
}

export function formatPermissionMessage(
  permissionData: PermissionData
): string {
  try {
    const {
      student_name,
      student_class,
      permission_date,
      permission_type,
      permission_note,
    } = permissionData;

    logger.info("Formatting permission message", {
      student: student_name,
      type: permission_type,
      date: permission_date,
      class: student_class,
      note: permission_note,
    });

    const schoolName = process.env.SCHOOL || "Sekolah";
    const currentDate = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const permissionTypeDisplay: Record<string, string> = {
      sakit: "🤒 SAKIT",
      izin: "📝 IZIN",
      dispensasi: "⏰ DISPENSASI",
    };

    const typeDisplay =
      permissionTypeDisplay[permission_type] || permission_type.toUpperCase();

    const formattedPermissionDate = new Date(
      permission_date
    ).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let message = `🏫 *${schoolName}*\n`;
    message += `📅 Dikirim: ${currentDate}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📋 *PERMINTAAN IZIN SISWA*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `👨‍🎓 *Nama Siswa:* ${student_name}\n`;
    message += `🏛️ *Kelas:* ${student_class}\n`;
    message += `📊 *Jenis Izin:* ${typeDisplay}\n`;
    message += `📅 *Tanggal Izin:* ${formattedPermissionDate}\n\n`;

    message += `📝 *Keterangan:*\n`;
    message += `${permission_note}\n\n`;

    message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `⚠️ *MOHON KONFIRMASI*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `Silakan konfirmasi izin siswa dengan membalas pesan ini:\n\n`;
    message += `✅ Ketik *"Ya"* atau *"Yes"* untuk *MENYETUJUI*\n`;
    message += `❌ Ketik *"Tidak"* atau *"No"* untuk *MENOLAK*\n\n`;

    message += `⏰ *Batas waktu konfirmasi: 24 jam*\n\n`;
    message += `📱 Pesan otomatis dari sistem ${schoolName}`;

    logger.info("Permission message formatted successfully", {
      messageLength: message.length,
      studentName: student_name,
      permissionType: permission_type,
    });

    return message;
  } catch (error) {
    logger.error("Permission message formatting error", {
      error: error instanceof Error ? error.message : String(error),
      permissionData: permissionData,
    });

    return (
      `🏫 Notifikasi Izin\n\n` +
      `Siswa: ${permissionData.student_name || "Unknown"}\n` +
      `Tanggal: ${permissionData.permission_date || "Unknown"}\n` +
      `Tipe: ${permissionData.permission_type || "Unknown"}\n` +
      `Keterangan: ${permissionData.permission_note || "Unknown"}\n\n` +
      `Silakan konfirmasi dengan membalas "Ya" atau "Tidak"\n\n` +
      `Pesan otomatis dari sistem absensi.`
    );
  }
}

export function formatMultiplePhoneNumbers(
  phoneNumbers: string | string[]
): string[] {
  try {
    const numbersArray = Array.isArray(phoneNumbers)
      ? phoneNumbers
      : [phoneNumbers];

    const formattedNumbers = numbersArray
      .map((phone, index) => {
        try {
          return formatPhoneNumber(phone);
        } catch (error) {
          logger.warn(`Failed to format phone number at index ${index}`, {
            phone: phone,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      })
      .filter((number): number is string => number !== null);

    logger.info("Multiple phone numbers formatted", {
      originalCount: numbersArray.length,
      successCount: formattedNumbers.length,
      failedCount: numbersArray.length - formattedNumbers.length,
    });

    return formattedNumbers;
  } catch (error) {
    logger.error("Multiple phone formatting error", {
      error: error instanceof Error ? error.message : String(error),
      phoneNumbers: phoneNumbers,
    });
    return [];
  }
}
