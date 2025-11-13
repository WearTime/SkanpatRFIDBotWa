import { Request, Response, NextFunction, Express } from "express";
import { logHelpers, logger } from "../handlers/logger";

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logHelpers.error(error, {
    context: "Express Error Handler",
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  logger.warn("404 Not Found", {
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
}

export function setupErrorHandlers(app: Express): void {
  app.use(notFoundHandler);
  app.use(errorHandler);
}
