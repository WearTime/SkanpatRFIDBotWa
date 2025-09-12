require("dotenv").config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || "localhost",
  },

  whatsapp: {
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
  },

  security: {
    sharedSecret: process.env.SECRET,
    adminSecret: process.env.ADMIN_SECRET,
    apiKeyLength: 32,
    apiKeyIntervalMinutes: 10,
    encryptionKey: process.env.ENCRYPTION_KEY,
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

module.exports = config;
