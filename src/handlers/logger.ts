import winston from "winston";
import path from "path";
import fs from "fs";
import config from "../config";
import { Request, Response } from "express";
import { LogMetadata } from "../types/logging.types";

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

const transports: winston.transport[] = [];

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
      maxsize: parseInt(config.logging.maxFileSize) * 1024 * 1024,
      maxFiles: parseInt(config.logging.maxFiles),
      tailable: true,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.logDir, "error.log"),
      level: "error",
      format: logFormat,
      maxsize: parseInt(config.logging.maxFileSize) * 1024 * 1024,
      maxFiles: parseInt(config.logging.maxFiles),
      tailable: true,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.logDir, "whatsapp.log"),
      level: "info",
      format: logFormat,
      maxsize: parseInt(config.logging.maxFileSize) * 1024 * 1024,
      maxFiles: parseInt(config.logging.maxFiles),
      tailable: true,
    })
  );
}

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
});

export const whatsappLogger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: transports.filter(
    (transport) =>
      ("filename" in transport &&
        typeof transport.filename === "string" &&
        transport.filename.includes("whatsapp.log")) ||
      !("filename" in transport)
  ),
  exitOnError: false,
});

export const logHelpers = {
  apiRequest: (req: Request, additionalInfo: LogMetadata = {}): void => {
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

  apiResponse: (
    req: Request,
    res: Response,
    responseData: LogMetadata = {}
  ): void => {
    logger.info("API Response", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: res.get("X-Response-Time"),
      success: responseData.success,
      ...responseData,
    });
  },

  whatsappEvent: (event: string, data: LogMetadata = {}): void => {
    whatsappLogger.info(`WhatsApp ${event}`, data);
  },

  securityEvent: (event: string, data: LogMetadata = {}): void => {
    logger.warn(`Security Event: ${event}`, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  },

  messageSent: (
    phoneNumber: string,
    studentName: string,
    type: string,
    success: boolean = true
  ): void => {
    whatsappLogger.info("Message Sent", {
      phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, "*"),
      studentName,
      type,
      success,
      timestamp: new Date().toISOString(),
    });
  },

  apiKeyGenerated: (keyPreview: string): void => {
    logger.info("New API Key Generated", {
      keyPreview,
      timestamp: new Date().toISOString(),
    });
  },

  error: (error: Error, context: LogMetadata = {}): void => {
    logger.error("Application Error", {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  },
};

export const requestLogger = (
  req: Request,
  res: Response,
  next: Function
): void => {
  const startTime = Date.now();

  logHelpers.apiRequest(req);

  const originalJson = res.json;
  res.json = function (data: any) {
    const responseTime = Date.now() - startTime;
    res.set("X-Response-Time", `${responseTime}ms`);

    logHelpers.apiResponse(req, res, data);

    return originalJson.call(this, data);
  };

  next();
};
