const formataPhoneNumber = (phoneNumber) => {
  try {
    let cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.startsWith(config.phoneNumber.localPrefix)) {
      cleaned = config.phoneNumber.countryCode + cleaned.substring(1);
    } else if (cleaned.startsWith("8")) {
      cleaned = config.phoneNumber.countryCode + cleaned;
    } else if (!cleaned.startsWith(config.phoneNumber.countryCode)) {
      cleaned = config.phoneNumber.countryCode + cleaned;
    }

    return cleaned + config.phoneNumber.whatsappSuffix;
  } catch (error) {
    logHelpers.error(error, {
      context: "Phone Number Formatting",
      phoneNumber,
    });
    throw new Error("Invalid phone number format");
  }
};

const formatAttendanceMessage = (data) => {
  const { student_name, student_class, attendance_time, attendance_type } =
    data;

  const template =
    config.messages.templates.attendance[attendance_type] ||
    config.messages.templates.attendance.masuk;

  return `
    🏫 *NOTIFIKASI ABSENSI*

    👤 *Nama:* ${student_name}
    🏛️ *Kelas:* ${student_class || config.messages.defaultClass}
    ⏰ *Waktu ${template.type}:* ${attendance_time}
    📅 *Tanggal:* ${new Date().toLocaleDateString("id-ID")}

    ${template.icon} Siswa telah melakukan absen ${template.type.toLowerCase()}

    ${config.messages.footer}
    `;
};

module.exports = { formataPhoneNumber, formatAttendanceMessage };
