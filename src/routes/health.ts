import express, { Request, Response, Router } from "express";
import { WhatsAppFactory } from "../services/WhatsAppFactory";

const router: Router = express.Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

router.get("/status", (_req: Request, res: Response) => {
  const whatsappClient = WhatsAppFactory.getInstance();
  const clientInfo = whatsappClient.getClientInfo();

  const status = {
    success: true,
    status: whatsappClient.isReady() ? "connected" : "disconnected",
    client_info: clientInfo,
    timestamp: Math.floor(Date.now() / 1000),
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
  };

  res.json(status);
});

export default router;
