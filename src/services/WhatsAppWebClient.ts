import config from '../config';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { logHelpers, logger } from '../handlers/logger';
import { IWhatsAppClient, ClientInfo } from '../types/whatsapp.types';

export class WhatsAppWebClient implements IWhatsAppClient {
  private client: Client;
  private ready: boolean = false;
  private messageHandlers: Array<(from: string, message: string) => void> = [];

  constructor() {
    const schoolName = process.env.SCHOOL || 'default';

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: `${schoolName}-attendance-bot-${new Date().getFullYear()}`,
      }),
      puppeteer: config.whatsapp.puppeteerConfig,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('qr', (qr: string) => {
      console.log('='.repeat(50));
      console.log('📱 SCAN QR CODE WHATSAPP');
      console.log('='.repeat(50));
      const qrcode = require('qrcode-terminal');
      qrcode.generate(qr, { small: true });
      console.log('='.repeat(50));

      logHelpers.whatsappEvent('QR Code Generated', {
        provider: 'whatsapp-web.js',
      });
    });

    this.client.on('ready', () => {
      this.ready = true;
      const clientInfo = this.client.info;

      logger.info('✅ WhatsApp Bot berhasil terhubung!');
      logger.info(`📱 Nomor: ${clientInfo.wid.user}`);
      logger.info(`👤 Nama: ${clientInfo.pushname}`);

      logHelpers.whatsappEvent('Client Ready', {
        provider: 'whatsapp-web.js',
        phoneNumber: clientInfo.wid.user,
        pushname: clientInfo.pushname,
        platform: clientInfo.platform,
      });
    });

    this.client.on('authenticated', () => {
      logHelpers.whatsappEvent('Authentication Success', {
        provider: 'whatsapp-web.js',
        message: 'WhatsApp client berhasil terauthentikasi',
      });
    });

    this.client.on('auth_failure', (msg: string) => {
      logHelpers.error(new Error('WhatsApp authentication failed'), {
        provider: 'whatsapp-web.js',
        reason: msg,
      });
    });

    this.client.on('disconnected', (reason: string) => {
      this.ready = false;
      logHelpers.whatsappEvent('Client Disconnected', {
        provider: 'whatsapp-web.js',
        reason,
        timestamp: new Date().toISOString(),
      });
      logger.warn('WhatsApp client terputus', { reason });
    });

    this.client.on('message', async (message: Message) => {
      const from = message.from;
      const body = message.body;

      for (const handler of this.messageHandlers) {
        try {
          handler(from, body);
        } catch (error) {
          logger.error('Message handler error', {
            error: error instanceof Error ? error.message : String(error),
            from,
          });
        }
      }
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing WhatsApp Web client...');
    await this.client.initialize();
  }

  isReady(): boolean {
    return this.ready;
  }

  getClientInfo(): ClientInfo | null {
    if (!this.ready || !this.client.info) {
      return null;
    }

    return {
      phone: this.client.info.wid.user,
      name: this.client.info.pushname,
      platform: this.client.info.platform,
    };
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.ready) {
      throw new Error('WhatsApp client belum siap');
    }

    await this.client.sendMessage(phoneNumber, message);
  }

  async destroy(): Promise<void> {
    await this.client.destroy();
    this.ready = false;
  }

  onMessage(handler: (from: string, message: string) => void): void {
    this.messageHandlers.push(handler);
  }
}
