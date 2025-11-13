import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  body: { data: string; timestamp: number };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
