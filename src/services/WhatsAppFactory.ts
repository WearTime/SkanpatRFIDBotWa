import { IWhatsAppClient, WhatsAppProvider } from "../types/whatsapp.types";
import config from "../config";
import { logger } from "../handlers/logger";
import { WhatsAppWebClient } from "./WhatsAppWebClient";
import { BaileysClient } from "./BaileysClient";
export class WhatsAppFactory {
  private static instance: IWhatsAppClient | null = null;

  static createClient(provider?: WhatsAppProvider): IWhatsAppClient {
    const selectedProvider = provider || config.whatsapp.provider;

    logger.info("Create Whatsapp client", { provider: selectedProvider });

    switch (selectedProvider) {
      case "baileys":
        return new BaileysClient();
      case "whatsapp-web.js":
        return new WhatsAppWebClient();
      default:
        logger.warn(
          `Unknown provider: ${selectedProvider}, falling back to whatsapp-web.js`
        );
        return new WhatsAppWebClient();
    }
  }

  static getInstance(): IWhatsAppClient {
    if (!this.instance) {
      this.instance = this.createClient();
    }
    return this.instance;
  }

  static async resetInstance(): Promise<void> {
    if (this.instance) {
      await this.instance.destroy();
      this.instance = null;
    }
  }
}
