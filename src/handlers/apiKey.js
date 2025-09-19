const config = require("../config");
const crypto = require("crypto");
const { logHelpers, logger } = require("./logger");

const generateApiKey = () => {
  try {
    const timestamp = Math.floor(
      Date.now() / (1000 * 60 * config.security.apiKeyIntervalMinutes)
    );
    const data = `${config.security.sharedSecret}:${timestamp}`;
    currentApiKey = crypto
      .createHash("sha256")
      .update(data)
      .digest("hex")
      .substring(0, config.security.apiKeyLength);
    const keyPreview = currentApiKey.substring(0, 8) + "...";
    logHelpers.apiKeyGenerated(keyPreview);

    logger.info(`🔑 API Key baru: ${keyPreview}`);
    logger.info(`⏰ Timestamp: ${timestamp}`);

    setTimeout(
      generateApiKey,
      config.security.apiKeyIntervalMinutes * 60 * 1000
    );

    return currentApiKey;
  } catch (error) {
    logHelpers.error(error, { context: "API Key Generation" });
  }
};

const validateApiKey = (receivedKey, receivedTimestamp) => {
  try {
    const currentTimestamp = Math.floor(
      Date.now() / (1000 * 60 * config.security.apiKeyIntervalMinutes)
    );
    const previousTimestamp = currentTimestamp - 1;

    const currentExpectedKey = crypto
      .createHash("sha256")
      .update(`${config.security.sharedSecret}:${currentTimestamp}`)
      .digest("hex")
      .substring(0, config.security.apiKeyLength);

    const previousExpectedKey = crypto
      .createHash("sha256")
      .update(`${config.security.sharedSecret}:${previousTimestamp}`)
      .digest("hex")
      .substring(0, config.security.apiKeyLength);

    const isValid =
      receivedKey === currentExpectedKey || receivedKey === previousExpectedKey;

    if (!isValid) {
      logHelpers.securityEvent("Invalid API Key Attempt", {
        receivedKey: receivedKey.substring(0, 8) + "...",
        currentTimestamp,
        previousTimestamp,
      });
    }

    return isValid;
  } catch (error) {
    logHelpers.error(error, { context: "API Key Validation" });
    return false;
  }
};

module.exports = { generateApiKey, validateApiKey };
