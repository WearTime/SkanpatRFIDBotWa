import { WhatsAppFactory } from "../services/WhatsAppFactory";
import { logHelpers, logger } from "./logger";
import { pendingConfirmations } from "../utils/confirmationStore";
import config from "../config";
import { sendPermissionConfirmation } from "./permission";
import { formatDateTimeForMySQL } from "../utils/formatDate";

export async function handlePingCommand(from: string): Promise<void> {
  try {
    const whatsappClient = WhatsAppFactory.getInstance();
    await whatsappClient.sendMessage(
      from,
      "🤖 Bot aktif dan berjalan dengan baik!"
    );
    logHelpers.whatsappEvent("Ping Command", { from });
  } catch (error) {
    logHelpers.error(
      error instanceof Error ? error : new Error(String(error)),
      {
        context: "Ping command response",
        from: from,
      }
    );
  }
}

export async function handlePermissionConfirmation(
  from: string,
  messageBody: string
): Promise<boolean> {
  const confirmationData = pendingConfirmations.get(from);
  const confirmationDateTime = formatDateTimeForMySQL();

  if (!confirmationData) {
    return false;
  }

  logger.info("Processing permission confirmation", {
    from: from,
    message: messageBody,
    studentName: confirmationData.student_name,
  });

  let confirmationStatus: boolean | null = null;
  let responseMessage = "";

  const lowerMessage = messageBody.toLowerCase();

  if (config.messages.approvalMessage.includes(lowerMessage)) {
    confirmationStatus = true;
    responseMessage = `✅ *Konfirmasi Diterima*\n\nIzin untuk *${confirmationData.student_name}* telah disetujui.\n\nTerima kasih atas konfirmasinya.`;
  } else if (config.messages.rejectedMessage.includes(lowerMessage)) {
    confirmationStatus = false;
    responseMessage = `❌ *Konfirmasi Ditolak*\n\nIzin untuk *${confirmationData.student_name}* telah ditolak.\n\nTerima kasih atas konfirmasinya.`;
  } else {
    responseMessage = `⚠️ *Konfirmasi Tidak Valid*\n\nMohon balas dengan:\n• *"Ya"* atau *"Yes"* untuk menyetujui\n• *"Tidak"* atau *"No"* untuk menolak\n\nIzin untuk: *${confirmationData.student_name}*`;

    try {
      const whatsappClient = WhatsAppFactory.getInstance();
      await whatsappClient.sendMessage(from, responseMessage);
    } catch (error) {
      logger.error("Failed to send invalid confirmation message", {
        error: error instanceof Error ? error.message : String(error),
        from: from,
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

    pendingConfirmations.delete(from);

    const whatsappClient = WhatsAppFactory.getInstance();
    await whatsappClient.sendMessage(from, responseMessage);

    logHelpers.whatsappEvent("Permission Confirmed", {
      from: from,
      studentName: confirmationData.student_name,
      status: confirmationStatus,
    });
  } catch (apiError) {
    logger.error("Failed to send confirmation to API", {
      error: apiError instanceof Error ? apiError.message : String(apiError),
      studentName: confirmationData.student_name,
      uuid: confirmationData.uuid,
      status: confirmationStatus,
    });

    const errorMessage =
      responseMessage +
      `\n\n⚠️ *Catatan*: Terjadi kesalahan sistem saat menyimpan konfirmasi. Mohon hubungi sekolah jika diperlukan.`;

    try {
      const whatsappClient = WhatsAppFactory.getInstance();
      await whatsappClient.sendMessage(from, errorMessage);
    } catch (replyError) {
      logger.error("Failed to send error confirmation message", {
        error:
          replyError instanceof Error ? replyError.message : String(replyError),
        from: from,
      });
    }
  }

  return true;
}

export async function handleIncomingMessage(
  from: string,
  body: string
): Promise<void> {
  const messageBody = body.trim();

  logHelpers.whatsappEvent("Message Received", {
    from: from,
    body: body.substring(0, 50) + (body.length > 50 ? "..." : ""),
    isGroupMsg: from.includes("@g.us"),
  });

  if (messageBody === "!ping") {
    await handlePingCommand(from);
    return;
  }

  const wasHandled = await handlePermissionConfirmation(from, messageBody);

  if (wasHandled) {
    return;
  }

  logger.debug("Unhandled message", {
    from: from,
    body: messageBody.substring(0, 100),
  });
}
