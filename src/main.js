const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { logHelpers, logger } = require("./handler/logger");
const config = require("./config");
const { validateApiKey } = require("./handler/apiKey");
const { smartDecrypt, encryptDataCBC } = require("./handler/encryption");
const {
  formatAttendanceMessage,
  formataPhoneNumber,
} = require("./handler/formatMessage");
const app = express();
app.use(express.json());
const crypto = require("crypto");
require("dotenv").config();

const PORT = process.env.PORT;
const SHARED_SECRET = process.env.SECRET;
const SCHOOL_NAME = process.env.SCHOOL;

let currentApiKey = "";
let clientReady = false;

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: `${SCHOOL_NAME}-attendance-bot-${new Date().getFullYear()}`,
  }),
  puppeteer: config.whatsapp.puppeteerConfig,
});

client.on("code", (code) => {
  console.log("=".repeat(50));
  console.log("🔗 PAIRING CODE WHATSAPP");
  console.log("=".repeat(50));
  console.log(`Kode Pairing: ${code}`);
  console.log("=".repeat(50));
});

client.on("ready", () => {
  const clientInfo = client.info;
  logger.info(`✅ WhatsApp Bot berhasil terhubung!`);
  clientReady = true;
  logger.info(`📱 Nomor: ${clientInfo.wid.user}`);
  logger.info(`👤 Nama: ${clientInfo.pushname}\n`);

  logHelpers.whatsappEvent("Client Ready", {
    phoneNumber: clientInfo.wid.user,
    pushname: clientInfo.pushname,
    platform: clientInfo.platform,
  });
});

client.on("authenticated", () => {
  logHelpers.whatsappEvent("Authentication Success", {
    message: "WhatsApp client berhasil terauthentikasi",
  });
});

client.on("auth_failure", (msg) => {
  logHelpers.error(new Error("WhatsApp authentication failed"), {
    reason: msg,
  });
});

client.on("disconnected", (reason) => {
  clientReady = false;
  logHelpers.whatsappEvent("Client Disconnected", {
    reason,
    timestamp: new Date().toISOString(),
  });
  logger.warn("WhatsApp client terputus", { reason });
});

client.on("message", async (message) => {
  logHelpers.whatsappEvent("Message Received", {
    from: message.from,
    body:
      message.body.substring(0, 50) + (message.body.length > 50 ? "..." : ""),
    isGroupMsg: message.from.includes("@g.us"),
  });

  if (message.body === "!ping") {
    try {
      await message.reply("🤖 Bot aktif dan berjalan dengan baik!");
      logHelpers.whatsappEvent("Ping Command", { from: message.from });
    } catch (error) {
      logHelpers.error(error, {
        context: "Ping command response",
        from: message.from,
      });
    }
  }
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/status", (req, res) => {
  const status = {
    success: true,
    status: clientReady ? "connected" : "disconnected",
    client_info:
      clientReady && client.info
        ? {
            phone: client.info.wid.user,
            name: client.info.pushname,
            platform: client.info.platform,
          }
        : null,
    current_api_key: currentApiKey.substring(0, 8) + "...",
    timestamp: Math.floor(Date.now() / 1000),
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
  };

  res.json(status);
});

app.post("/send-attendance", async (req, res) => {
  try {
    const { data, timestamp } = req.body;
    const api_key = req.headers["x-api-key"];

    if (!clientReady) {
      return res.status(503).json({
        success: false,
        message: "WhatsApp client belum siap",
      });
    }

    if (!config.security.encryptionKey) {
      logHelpers.securityEvent("Encryption Key Missing", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(500).json({
        success: false,
        message: "Server not configured",
      });
    }

    if (!data || !timestamp || !api_key) {
      logHelpers.securityEvent("Invalid Encrypted Request Format", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        hasEncryptedData: !!data,
        hasTimestamp: !!timestamp,
        hasApiKey: !!api_key,
      });

      return res.status(400).json({
        success: false,
        message:
          "Invalid request format: data, timestamp (body) dan x-api-key (header) diperlukan",
      });
    }
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timestampDiff = Math.abs(currentTimestamp - timestamp);

    if (timestampDiff > 300) {
      logHelpers.securityEvent("Timestamp Too Old", {
        ip: req.ip,
        receivedTimestamp: timestamp,
        currentTimestamp: currentTimestamp,
        difference: timestampDiff,
      });

      return res.status(400).json({
        success: false,
        message: "Request timestamp too old or invalid",
      });
    }

    if (!validateApiKey(api_key, timestamp)) {
      logHelpers.securityEvent("Unauthorized Access Attempt", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        apiKeyPreview: api_key.substring(0, 8) + "...",
        timestamp: timestamp,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid API key atau timestamp",
      });
    }

    let decryptedData;
    try {
      decryptedData = smartDecrypt(data, timestamp);
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
    const whatsappNumber = formataPhoneNumber(parent_phone);

    logger.info("Mengirim pesan WhatsApp", {
      student: student_name,
      attendanceType: attendance_type,
      phone: whatsappNumber.replace(/\d(?=\d{4})/g, "*"),
    });

    await client.sendMessage(whatsappNumber, message);

    logHelpers.messageSent(whatsappNumber, student_name, attendance_type, true);

    const responseData = {
      success: true,
      message: "Pesan berhasil dikirim",
    };

    if (config.security.encryptResponse) {
      try {
        const encryptedResponse = encryptResponseData(responseData, timestamp);
        res.status(200).json(encryptedResponse);
      } catch (encryptError) {
        logHelpers.error(encryptError, { context: "Response Encryption" });
        res.status(200).json(responseData);
      }
    } else {
      res.status(200).json(responseData);
    }
  } catch (error) {
    logHelpers.error(error, {
      context: "Send Attendance Encrypted",
      hasEncryptedData: !!req.body.encrypted_data,
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
});

app.use((error, req, res, next) => {
  logHelpers.error(error, {
    context: "Express Error Handler",
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

app.use((req, res) => {
  logger.warn("404 Not Found", {
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

const server = app.listen(config.server.port, config.server.host, () => {
  console.log(
    `\n🚀 WhatsApp Bot server berjalan di http://${config.server.host}:${config.server.port}`
  );
  console.log(`📋 Endpoints:`);
  console.log(`   • POST /send-attendance - Kirim notifikasi absensi`);
  console.log(`   • GET  /status         - Cek status bot`);
  console.log(`   • GET  /health         - Health check`);

  logger.info("Server Started", {
    port: config.server.port,
    host: config.server.host,
    nodeEnv: process.env.NODE_ENV,
    logLevel: config.logging.level,
  });
});

logger.info("Initializing WhatsApp client...");
client.initialize();

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  server.close(() => {
    logger.info("HTTP server closed");
  });

  try {
    await client.destroy();
    logger.info("WhatsApp client destroyed");
  } catch (error) {
    logHelpers.error(error, { context: "Graceful Shutdown" });
  }

  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason, promise) => {
  logHelpers.error(new Error("Unhandled Promise Rejection"), {
    reason: reason,
    promise: promise,
  });
});

process.on("uncaughtException", (error) => {
  logHelpers.error(error, { context: "Uncaught Exception" });
  process.exit(1);
});

module.exports = { app, client };
