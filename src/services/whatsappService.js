const { Client, LocalAuth } = require("whatsapp-web.js");
const config = require("../config");
const { logHelpers, logger } = require("../handlers/logger");
const { handleIncomingMessage } = require("../handlers/messageHandlers");

const SCHOOL_NAME = process.env.SCHOOL;

let clientReady = false;

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: `${SCHOOL_NAME}-attendance-bot-${new Date().getFullYear()}`,
  }),
  puppeteer: config.whatsapp.puppeteerConfig,
});

client.on("code", (code) => {
  console.log("=".repeat(50));
  console.log("🔗 PAIRING CODE WHATSAPP");
  console.log("=".repeat(50));
  console.log(`Kode Pairing: ${code}`);
  console.log("=".repeat(50));
});

client.on("ready", () => {
  const clientInfo = client.info;
  logger.info(`✅ WhatsApp Bot berhasil terhubung!`);
  clientReady = true;
  logger.info(`📱 Nomor: ${clientInfo.wid.user}`);
  logger.info(`👤 Nama: ${clientInfo.pushname}\n`);

  logHelpers.whatsappEvent("Client Ready", {
    phoneNumber: clientInfo.wid.user,
    pushname: clientInfo.pushname,
    platform: clientInfo.platform,
  });
});

client.on("authenticated", () => {
  logHelpers.whatsappEvent("Authentication Success", {
    message: "WhatsApp client berhasil terauthentikasi",
  });
});

client.on("auth_failure", (msg) => {
  logHelpers.error(new Error("WhatsApp authentication failed"), {
    reason: msg,
  });
});

client.on("disconnected", (reason) => {
  clientReady = false;
  logHelpers.whatsappEvent("Client Disconnected", {
    reason,
    timestamp: new Date().toISOString(),
  });
  logger.warn("WhatsApp client terputus", { reason });
});

client.on("message", handleIncomingMessage);

const isReady = () => clientReady;

const getClientInfo = () => {
  if (!clientReady || !client.info) return null;

  return {
    phone: client.info.wid.user,
    name: client.info.pushname,
    platform: client.info.platform,
  };
};

const sendMessage = async (phoneNumber, message) => {
  if (!clientReady) {
    throw new Error("WhatsApp client belum siap");
  }

  return await client.sendMessage(phoneNumber, message);
};

module.exports = {
  client,
  isReady,
  getClientInfo,
  sendMessage,
  initialize: () => client.initialize(),
  destroy: () => client.destroy(),
};
