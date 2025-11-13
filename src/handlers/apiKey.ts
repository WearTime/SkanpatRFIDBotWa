import config from '../config';
import crypto from 'crypto';
import { logHelpers, logger } from './logger';

let currentApiKey: string | null = null;

export function generateApiKey(): string {
  try {
    const timestamp = Math.floor(Date.now() / (1000 * 60 * config.security.apiKeyIntervalMinutes));
    const data = `${config.security.sharedSecret}:${timestamp}`;
    currentApiKey = crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, config.security.apiKeyLength);

    const keyPreview = currentApiKey.substring(0, 8) + '...';
    logHelpers.apiKeyGenerated(keyPreview);

    logger.info(`🔑 API Key baru: ${keyPreview}`);
    logger.info(`⏰ Timestamp: ${timestamp}`);

    setTimeout(generateApiKey, config.security.apiKeyIntervalMinutes * 60 * 1000);

    return currentApiKey;
  } catch (error) {
    logHelpers.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'API Key Generation',
    });
    throw error;
  }
}

export function validateApiKey(receivedKey: string): boolean {
  try {
    const currentTimestamp = Math.floor(
      Date.now() / (1000 * 60 * config.security.apiKeyIntervalMinutes)
    );
    const previousTimestamp = currentTimestamp - 1;

    const currentExpectedKey = crypto
      .createHash('sha256')
      .update(`${config.security.sharedSecret}:${currentTimestamp}`)
      .digest('hex')
      .substring(0, config.security.apiKeyLength);

    const previousExpectedKey = crypto
      .createHash('sha256')
      .update(`${config.security.sharedSecret}:${previousTimestamp}`)
      .digest('hex')
      .substring(0, config.security.apiKeyLength);

    const isValid = receivedKey === currentExpectedKey || receivedKey === previousExpectedKey;

    if (!isValid) {
      logHelpers.securityEvent('Invalid API Key Attempt', {
        receivedKey: receivedKey.substring(0, 8) + '...',
        currentTimestamp,
        previousTimestamp,
      });
    }

    return isValid;
  } catch (error) {
    logHelpers.error(error instanceof Error ? error : new Error(String(error)), {
      context: 'API Key Validation',
    });
    return false;
  }
}

// Auto-generate API key on module load
generateApiKey();
