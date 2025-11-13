import { ClientInfo, IWhatsAppClient } from '../types/whatsapp.types';
import * as fs from 'fs';
import * as path from 'path';
import { logger, logHelpers } from '../handlers/logger';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  ConnectionState,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import config from '../config';

export class BaileysClient implements IWhatsAppClient {
  private sock: WASocket | null = null;
  private ready: boolean = false;
  private messageHandlers: Array<(from: string, message: string) => void> = [];
  private authDir: string;
  private clientInfo: ClientInfo | null = null;
  private reconnecting = false;

  constructor() {
    const schoolName = process.env.SCHOOL || 'default';
    this.authDir = path.join(
      process.cwd(),
      'baileys_auth',
      `${schoolName}-${new Date().getFullYear()}`
    );

    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Baileys client...');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.sock = makeWASocket({
        auth: state,
        // printQRInTerminal: config.whatsapp.baileys.printQRInTerminal,
        defaultQueryTimeoutMs: config.whatsapp.baileys.defaultQueryTimeoutMs,
        syncFullHistory: config.whatsapp.baileys.syncFullHistory,
        logger: require('pino')({ level: 'silent' }),
      });

      this.setupEventHandlers(saveCreds);
    } catch (error) {
      logger.error('Failed to initialize Baileys client', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private setupEventHandlers(saveCreds: () => Promise<void>): void {
    if (!this.sock) return;

    this.sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('='.repeat(50));
        console.log('📱 SCAN QR CODE WHATSAPP');
        console.log('='.repeat(50));
        qrcode.generate(qr, { small: true });
        console.log('='.repeat(50));

        logHelpers.whatsappEvent('QR Code Generated', {
          provider: 'baileys',
        });
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

        this.ready = false;

        logger.warn('Connection closed', {
          provider: 'baileys',
          shouldReconnect,
          statusCode: (lastDisconnect?.error as Boom)?.output?.statusCode,
        });

        if (shouldReconnect && !this.reconnecting) {
          this.reconnecting = true;
          logger.info('Reconnecting...');
          setTimeout(async () => {
            this.reconnecting = false;
            await this.initialize();
          }, 5000);
        }
      } else if (connection === 'open') {
        this.ready = true;
        await this.loadClientInfo();

        logger.info('✅ WhatsApp Bot berhasil terhubung!');
        if (this.clientInfo) {
          logger.info(`📱 Nomor: ${this.clientInfo.phone}`);
          logger.info(`👤 Nama: ${this.clientInfo.name}`);
        }

        logHelpers.whatsappEvent('Client Ready', {
          provider: 'baileys',
          phoneNumber: this.clientInfo?.phone,
          pushname: this.clientInfo?.name,
        });
      }
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const from = msg.key.remoteJid || '';
        const messageText = this.extractMessageText(msg);

        if (messageText) {
          for (const handler of this.messageHandlers) {
            try {
              handler(from, messageText);
            } catch (error) {
              logger.error('Message handler error', {
                error: error instanceof Error ? error.message : String(error),
                from,
              });
            }
          }
        }
      }
    });
  }

  private extractMessageText(message: proto.IWebMessageInfo): string | null {
    const msg = message.message;
    if (!msg) return null;

    if (msg.conversation) {
      return msg.conversation;
    } else if (msg.extendedTextMessage?.text) {
      return msg.extendedTextMessage.text;
    }

    return null;
  }

  private async loadClientInfo(): Promise<void> {
    if (!this.sock) return;

    try {
      const info = this.sock.user;
      if (info) {
        this.clientInfo = {
          phone: info.id.split(':')[0] || info.id,
          name: info.name || info.id,
        };
      }
    } catch (error) {
      logger.error('Failed to load client info', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  isReady(): boolean {
    return this.ready && this.sock !== null;
  }

  getClientInfo(): ClientInfo | null {
    return this.clientInfo;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.ready || !this.sock) {
      throw new Error('WhatsApp client belum siap');
    }

    try {
      const jid = phoneNumber.replace('@c.us', '@s.whatsapp.net');

      await this.sock.sendMessage(jid, { text: message });
    } catch (error) {
      logger.error('Failed to send message', {
        error: error instanceof Error ? error.message : String(error),
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
      });
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
    }
    this.ready = false;
  }

  onMessage(handler: (from: string, message: string) => void): void {
    this.messageHandlers.push(handler);
  }
}
