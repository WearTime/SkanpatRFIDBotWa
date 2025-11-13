import { Request, Response, NextFunction } from "express";

export function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { data, timestamp } = req.body;

  if (!data || typeof data !== "string") {
    res.status(400).json({
      success: false,
      message: "Invalid data format",
    });
    return;
  }

  if (!timestamp || typeof timestamp !== "number") {
    res.status(400).json({
      success: false,
      message: "Invalid timestamp format",
    });
    return;
  }

  next();
}
