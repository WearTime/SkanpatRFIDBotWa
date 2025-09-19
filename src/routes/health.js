const express = require("express");
const whatsappService = require("../services/whatsappService");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

router.get("/status", (req, res) => {
  const clientInfo = whatsappService.getClientInfo();

  const status = {
    success: true,
    status: whatsappService.isReady() ? "connected" : "disconnected",
    client_info: clientInfo,
    timestamp: Math.floor(Date.now() / 1000),
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
  };

  res.json(status);
});

module.exports = router;
