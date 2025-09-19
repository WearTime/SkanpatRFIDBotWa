const { logHelpers, logger } = require("./logger");
const { sendPermissionConfirmation } = require("./permission");
const { pendingConfirmations } = require("../utils/confirmationStore");
const config = require("../config");
const { formatDateTimeForMySQL } = require("../utils/formatDate");

const handlePingCommand = async (message) => {
  try {
    await message.reply("🤖 Bot aktif dan berjalan dengan baik!");
    logHelpers.whatsappEvent("Ping Command", { from: message.from });
  } catch (error) {
    logHelpers.error(error, {
      context: "Ping command response",
      from: message.from,
    });
  }
};

const handlePermissionConfirmation = async (
  message,
  messageBody,
  messageSender
) => {
  const confirmationData = pendingConfirmations.get(messageSender);
  const confirmationDateTime = formatDateTimeForMySQL();
  if (!confirmationData) return false;

  logger.info("Processing permission confirmation", {
    from: messageSender,
    message: messageBody,
    studentName: confirmationData.student_name,
  });

  let confirmationStatus = null;
  let responseMessage = "";

  if (config.messages.approvalMessage.includes(messageBody.toLowerCase())) {
    confirmationStatus = true;
    responseMessage = `✅ *Konfirmasi Diterima*\n\nIzin untuk *${confirmationData.student_name}* telah disetujui.\n\nTerima kasih atas konfirmasinya.`;
  } else if (
    config.messages.rejectedMessage.includes(messageBody.toLowerCase())
  ) {
    confirmationStatus = false;
    responseMessage = `❌ *Konfirmasi Ditolak*\n\nIzin untuk *${confirmationData.student_name}* telah ditolak.\n\nTerima kasih atas konfirmasinya.`;
  } else {
    responseMessage = `⚠️ *Konfirmasi Tidak Valid*\n\nMohon balas dengan:\n• *"Ya"* atau *"Yes"* untuk menyetujui\n• *"Tidak"* atau *"No"* untuk menolak\n\nIzin untuk: *${confirmationData.student_name}*`;

    try {
      await message.reply(responseMessage);
    } catch (error) {
      logger.error("Failed to send invalid confirmation message", {
        error: error.message,
        from: messageSender,
      });
    }

    return true;
  }

  try {
    const apiResponse = await sendPermissionConfirmation({
      uuid: confirmationData.uuid,
      parent_confirm: confirmationStatus,
      parent_confirm_at: confirmationDateTime,
    });

    logger.info("Permission confirmation sent to API", {
      studentName: confirmationData.student_name,
      status: confirmationStatus,
      apiResponse: apiResponse.data,
    });

    pendingConfirmations.delete(messageSender);

    await message.reply(responseMessage);

    logHelpers.whatsappEvent("Permission Confirmed", {
      from: messageSender,
      studentName: confirmationData.student_name,
      status: confirmationStatus,
    });
  } catch (apiError) {
    logger.error("Failed to send confirmation to API", {
      error: apiError.message,
      studentName: confirmationData.student_name,
      uuid: confirmationData.uuid,
      status: confirmationStatus,
    });

    const errorMessage =
      responseMessage +
      `\n\n⚠️ *Catatan*: Terjadi kesalahan sistem saat menyimpan konfirmasi. Mohon hubungi sekolah jika diperlukan.`;

    try {
      await message.reply(errorMessage);
    } catch (replyError) {
      logger.error("Failed to send error confirmation message", {
        error: replyError.message,
        from: messageSender,
      });
    }
  }

  return true;
};

const handleIncomingMessage = async (message) => {
  const messageBody = message.body.trim();
  const messageSender = message.from;

  logHelpers.whatsappEvent("Message Received", {
    from: message.from,
    body:
      message.body.substring(0, 50) + (message.body.length > 50 ? "..." : ""),
    isGroupMsg: message.from.includes("@g.us"),
  });

  if (message.body === "!ping") {
    await handlePingCommand(message);
    return;
  }

  const wasHandled = await handlePermissionConfirmation(
    message,
    messageBody.toLowerCase(),
    messageSender
  );

  if (wasHandled) {
    return;
  }

  logger.debug("Unhandled message", {
    from: messageSender,
    body: messageBody.substring(0, 100),
  });
};

module.exports = {
  handleIncomingMessage,
  handlePingCommand,
  handlePermissionConfirmation,
};
