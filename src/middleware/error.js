const { logHelpers, logger } = require("../handlers/logger");

const errorHandler = (error, req, res, next) => {
  logHelpers.error(error, {
    context: "Express Error Handler",
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

const notFoundHandler = (req, res) => {
  logger.warn("404 Not Found", {
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
};

const setupErrorHandlers = (app) => {
  app.use(notFoundHandler);

  app.use(errorHandler);
};

module.exports = {
  setupErrorHandlers,
  errorHandler,
  notFoundHandler,
};
