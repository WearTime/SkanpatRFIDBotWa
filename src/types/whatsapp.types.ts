export type WhatsAppProvider = "whatsapp-web.js" | "baileys";

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  puppeteerConfig: {
    headless: boolean;
    args: string[];
  };
  baileys: {
    printQRInTerminal: boolean;
    defaultQueryTimeoutMs: number;
    syncFullHistory: boolean;
  };
}

export interface ClientInfo {
  phone: string;
  name: string;
  platform?: string;
}

export interface IWhatsAppClient {
  initialize(): Promise<void>;
  isReady(): boolean;
  getClientInfo(): ClientInfo | null;
  sendMessage(phoneNumber: string, message: string): Promise<void>;
  destroy(): Promise<void>;
  onMessage(handler: (from: string, message: string) => void): void;
}
