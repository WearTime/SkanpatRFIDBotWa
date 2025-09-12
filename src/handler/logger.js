const winston = require("winston");
const path = require("path");
const fs = require("fs");
const config = require("../config");

if (config.logging.enableFileLogging && !fs.existsSync(config.logging.logDir)) {
  fs.mkdirSync(config.logging.logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaString = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: "HH:mm:ss",
  }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaString = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : "";
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

const transports = [];

if (config.logging.enableConsoleLogging) {
  transports.push(
    new winston.transports.Console({
      level: config.logging.level,
      format: consoleFormat,
    })
  );
}

if (config.logging.enableFileLogging) {
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.logDir, "combined.log"),
      level: config.logging.level,
      format: logFormat,
      maxsize: config.logging.maxFileSize,
      maxFiles: config.logging.maxFiles,
      tailable: true,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.logDir, "error.log"),
      level: "error",
      format: logFormat,
      maxsize: config.logging.maxFileSize,
      maxFiles: config.logging.maxFiles,
      tailable: true,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.logDir, "whatsapp.log"),
      level: "info",
      format: logFormat,
      maxsize: config.logging.maxFileSize,
      maxFiles: config.logging.maxFiles,
      tailable: true,
    })
  );
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
});

const whatsappLogger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: transports.filter(
    (transport) =>
      (transport.filename && transport.filename.includes("whatsapp.log")) ||
      !transport.filename
  ),
  exitOnError: false,
});

const logHelpers = {
  apiRequest: (req, additionalInfo = {}) => {
    logger.info("API Request", {
      method: req.method,
      url: req.url,
      userAgent: req.get("User-Agent"),
      ip: req.ip || req.connection.remoteAddress,
      body:
        req.method === "POST"
          ? { ...req.body, api_key: "[HIDDEN]" }
          : undefined,
      ...additionalInfo,
    });
  },

  apiResponse: (req, res, responseData = {}) => {
    logger.info("API Response", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: res.get("X-Response-Time"),
      success: responseData.success,
      ...responseData,
    });
  },

  whatsappEvent: (event, data = {}) => {
    whatsappLogger.info(`WhatsApp ${event}`, data);
  },

  securityEvent: (event, data = {}) => {
    logger.warn(`Security Event: ${event}`, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  },

  messageSent: (phoneNumber, studentName, attendanceType, success = true) => {
    whatsappLogger.info("Message Sent", {
      phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, "*"),
      studentName,
      attendanceType,
      success,
      timestamp: new Date().toISOString(),
    });
  },

  apiKeyGenerated: (keyPreview) => {
    logger.info("New API Key Generated", {
      keyPreview,
      timestamp: new Date().toISOString(),
    });
  },

  error: (error, context = {}) => {
    logger.error("Application Error", {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  },
};

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  logHelpers.apiRequest(req);

  const originalJson = res.json;
  res.json = function (data) {
    const responseTime = Date.now() - startTime;
    res.set("X-Response-Time", `${responseTime}ms`);

    logHelpers.apiResponse(req, res, data);

    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  logger,
  whatsappLogger,
  logHelpers,
  requestLogger,
};
