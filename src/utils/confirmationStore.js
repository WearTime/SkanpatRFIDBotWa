const { logger } = require("../handlers/logger");

const pendingConfirmations = new Map();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const expiredKeys = [];

  for (const [key, data] of pendingConfirmations.entries()) {
    if (now - data.created_at > 24 * 60 * 60 * 1000) {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach((key) => {
    pendingConfirmations.delete(key);
    logger.info("Expired pending confirmation removed", { phoneNumber: key });
  });

  if (expiredKeys.length > 0) {
    logger.info("Cleanup completed", { expiredCount: expiredKeys.length });
  }
}, 60 * 60 * 1000);

const cleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    logger.info("Confirmation store cleanup interval cleared");
  }
};

const addPendingConfirmation = (phoneNumber, data) => {
  pendingConfirmations.set(phoneNumber, {
    ...data,
    created_at: Date.now(),
  });
};

const getPendingConfirmation = (phoneNumber) => {
  return pendingConfirmations.get(phoneNumber);
};

const removePendingConfirmation = (phoneNumber) => {
  return pendingConfirmations.delete(phoneNumber);
};

const getPendingCount = () => {
  return pendingConfirmations.size;
};

const getAllPendingConfirmations = () => {
  return Array.from(pendingConfirmations.entries());
};

module.exports = {
  pendingConfirmations,
  addPendingConfirmation,
  getPendingConfirmation,
  removePendingConfirmation,
  getPendingCount,
  getAllPendingConfirmations,
  cleanup,
};
