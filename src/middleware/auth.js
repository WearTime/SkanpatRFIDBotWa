const { validateApiKey } = require("../handlers/apiKey");
const { logHelpers } = require("../handlers/logger");
const whatsappService = require("../services/whatsappService");
const config = require("../config");

const authMiddleware = (req, res, next) => {
  if (!whatsappService.isReady()) {
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

  const { data, timestamp } = req.body;
  const api_key = req.headers["x-api-key"];

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

  next();
};

module.exports = {
  authMiddleware,
};
