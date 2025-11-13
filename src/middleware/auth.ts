import { Request, Response, NextFunction } from "express";
import { validateApiKey } from "../handlers/apiKey";
import { logHelpers } from "../handlers/logger";
import config from "../config";
import { WhatsAppFactory } from "../services/WhatsAppFactory";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const whatsappClient = WhatsAppFactory.getInstance();

  if (!whatsappClient.isReady()) {
    res.status(503).json({
      success: false,
      message: "WhatsApp client belum siap",
    });
    return;
  }

  if (!config.security.encryptionKey) {
    logHelpers.securityEvent("Encryption Key Missing", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(500).json({
      success: false,
      message: "Server not configured",
    });
    return;
  }

  const { data, timestamp } = req.body;
  const api_key = req.headers["x-api-key"] as string;

  if (!data || !timestamp || !api_key) {
    logHelpers.securityEvent("Invalid Encrypted Request Format", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      hasEncryptedData: !!data,
      hasTimestamp: !!timestamp,
      hasApiKey: !!api_key,
    });

    res.status(400).json({
      success: false,
      message:
        "Invalid request format: data, timestamp (body) dan x-api-key (header) diperlukan",
    });
    return;
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

    res.status(400).json({
      success: false,
      message: "Request timestamp too old or invalid",
    });
    return;
  }

  if (!validateApiKey(api_key)) {
    logHelpers.securityEvent("Unauthorized Access Attempt", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      apiKeyPreview: api_key.substring(0, 8) + "...",
      timestamp: timestamp,
    });

    res.status(401).json({
      success: false,
      message: "Invalid API key atau timestamp",
    });
    return;
  }

  next();
}
