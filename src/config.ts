import { Config } from "./types/config.types";
import { WhatsAppProvider } from "./types/whatsapp.types";

require("dotenv").config();

const getWhatsAppProvider = (): WhatsAppProvider => {
  const provider = process.env.WHATSAPP_PROVIDER?.toLowerCase();
  if (provider == "baileys" || provider == "whatsapp-web.js") {
    return provider;
  }
  return "whatsapp-web.js";
};

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "localhost",
  },

  webApi: {
    apiUrl: process.env.LARAVEL_API_URL || "http://localhost:8000",
    permsConfirmEndPoint: "permissions/confirm",
  },

  whatsapp: {
    provider: getWhatsAppProvider(),
    puppeteerConfig: {
      headless: process.env.NODE_ENV === "production",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    },
    baileys: {
      printQRInTerminal: true,
      defaultQueryTimeoutMs: 60000,
      syncFullHistory: false,
    },
  },

  security: {
    sharedSecret: process.env.SECRET || "",
    adminSecret: process.env.ADMIN_SECRET || "",
    apiKeyLength: 32,
    apiKeyIntervalMinutes: 10,
    encryptionKey: process.env.ENCRYPTION_KEY || "",
    encryptResponse: process.env.ENCRYPT_RESPONSE === "true",
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === "true",
    logDir: process.env.LOG_DIR || "./logs",
    maxFileSize: process.env.MAX_LOG_FILE_SIZE || "10m",
    maxFiles: process.env.MAX_LOG_FILES || "5",
    enableConsoleLogging: process.env.ENABLE_CONSOLE_LOGGING !== "false",
  },

  messages: {
    templates: {
      attendance: {
        masuk: {
          icon: "✅",
          type: "MASUK",
        },
        keluar: {
          icon: "🚪",
          type: "KELUAR",
        },
      },
    },
    defaultClass: "N/A",
    footer: "_Pesan otomatis dari sistem absensi sekolah_",
    approvalMessage: [
      "ya",
      "yes",
      "y",
      "setuju",
      "izinkan",
      "izin",
      "ok",
      "baiklah",
    ],
    rejectedMessage: [
      "tidak",
      "no",
      "n",
      "tolak",
      "batal",
      "jangan",
      "ga",
      "tidakboleh",
      "gaboleh",
    ],
  },

  phoneNumber: {
    countryCode: "62",
    localPrefix: "08",
    whatsappSuffix: "@c.us",
  },

  rateLimiting: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  },
};

export default config;
