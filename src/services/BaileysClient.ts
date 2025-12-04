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
  fetchLatestBaileysVersion,
  CacheStore,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import config from '../config';
import P from 'pino';
import NodeCache from 'node-cache';

export class BaileysClient implements IWhatsAppClient {
  private sock: WASocket | null = null;
  private ready: boolean = false;
  private messageHandlers: Array<(from: string, message: string) => void> = [];
  private authDir: string;
  private clientInfo: ClientInfo | null = null;
  private reconnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private retryCache = new NodeCache();
  private msgRetryCounterCache: CacheStore = (() => {
    const cache = this.retryCache;
    return {
      get<T>(key: string): T | undefined {
        const value = cache.get(key);
        return value as T | undefined;
      },
      set<T>(key: string, value: T): boolean {
        cache.set(key, value);
        return true;
      },
      del(key: string) {
        cache.del(key);
      },
      flushAll() {
        cache.flushAll();
      },
    };
  })();

  constructor() {
    const schoolName = process.env.SCHOOL || 'default';
    this.authDir = path.join(
      process.cwd(),
      'baileys_auth',
      `${schoolName}-${new Date().getFullYear()}`
    );

    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
      logger.info('Auth directory created', { path: this.authDir });
    }
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Baileys client...', {
      authDir: this.authDir,
      authExists: fs.existsSync(this.authDir),
    });

    if (fs.existsSync(this.authDir) && !this.hasValidAuth()) {
      logger.warn('⚠️  Detected corrupted auth folder');
      await this.clearAuthFolder();
    }
    try {
      const { version, isLatest } = await fetchLatestBaileysVersion();
      logger.info('Baileys version info', { version, isLatest });

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      const pinoLogger = P({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pinoLogger),
        },
        printQRInTerminal: false,
        defaultQueryTimeoutMs: config.whatsapp.baileys.defaultQueryTimeoutMs,
        syncFullHistory: config.whatsapp.baileys.syncFullHistory,
        logger: pinoLogger,

        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        markOnlineOnConnect: true,

        browser: ['School Bot', 'Chrome', '121.0.0'],

        msgRetryCounterCache: this.msgRetryCounterCache,
        generateHighQualityLinkPreview: false,

        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,

        getMessage: async () => {
          return { conversation: 'Message Not Found' };
        },
      });

      this.setupEventHandlers(saveCreds);
    } catch (error) {
      logger.error('Failed to initialize Baileys client', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private setupEventHandlers(saveCreds: () => Promise<void>): void {
    if (!this.sock) return;

    this.sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n' + '='.repeat(55));
        console.log('📱 SCAN QR CODE WHATSAPP');
        console.log('='.repeat(55));
        qrcode.generate(qr, { small: true });
        console.log('='.repeat(55));
        console.log('⏰ QR Code expires in 60 seconds');
        console.log('='.repeat(55) + '\n');

        logHelpers.whatsappEvent('QR Code Generated', {
          provider: 'baileys',
        });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || '';
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.ready = false;

        logger.warn('Connection closed', {
          provider: 'baileys',
          statusCode,
          shouldReconnect,
          reconnectAttempts: this.reconnectAttempts,
          errorMessage: errorMessage,
        });

        const isInvalidAuth =
          statusCode === 401 ||
          statusCode === 403 ||
          statusCode === 405 ||
          statusCode === DisconnectReason.loggedOut ||
          errorMessage.includes('Connection Failure') ||
          errorMessage.includes('Intentional Logout');

        if (isInvalidAuth) {
          logger.error('❌ INVALID AUTH DETECTED!');
          logger.warn(`Error: ${errorMessage} (Status: ${statusCode})`);

          if (fs.existsSync(this.authDir) && this.reconnectAttempts === 0) {
            logger.warn('🗑️  Auto-clearing invalid auth folder...');

            try {
              const backupDir = `${this.authDir}_backup_${Date.now()}`;
              fs.renameSync(this.authDir, backupDir);
              logger.info(`✅ Old auth backed up to: ${backupDir}`);

              fs.mkdirSync(this.authDir, { recursive: true });
              logger.info('✅ New auth folder created');

              logger.info('🔄 Reinitializing to generate new QR code...');

              this.reconnectAttempts = 0; // Reset counter
              this.reconnecting = true;

              setTimeout(async () => {
                this.reconnecting = false;
                await this.initialize();
              }, 2000);

              return;
            } catch (clearError) {
              logger.error('Failed to clear auth folder', {
                error: clearError instanceof Error ? clearError.message : String(clearError),
              });

              logger.error('⚠️  MANUAL ACTION REQUIRED:');
              logger.error('   1. Stop the bot (Ctrl+C or pm2 stop)');
              logger.error('   2. Delete folder: rm -rf baileys_auth/');
              logger.error('   3. Restart: npm start or pm2 restart bot-wa-skanpat');
              return;
            }
          }

          logger.error('❌ Auth cleared but still getting error.');
          logger.error('⚠️  Possible causes:');
          logger.error('   1. WhatsApp server issues');
          logger.error('   2. Phone not connected to internet');
          logger.error('   3. Phone number blocked/banned');
          logger.error('   4. Network firewall blocking WhatsApp');

          return;
        }

        if (
          shouldReconnect &&
          !this.reconnecting &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.reconnecting = true;
          this.reconnectAttempts++;

          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 60000);
          logger.info(
            `🔄 Reconnecting in ${Math.round(delay / 1000)}s... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
          );

          setTimeout(async () => {
            this.reconnecting = false;
            await this.initialize();
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('❌ Max reconnection attempts reached.');
          logger.error('⚠️  Please check:');
          logger.error('   1. Internet connection');
          logger.error('   2. WhatsApp server status');
          logger.error('   3. Firewall settings');

          logHelpers.whatsappEvent('Max Reconnect Attempts Reached', {
            provider: 'baileys',
            attempts: this.reconnectAttempts,
            lastError: errorMessage,
          });
        }
      } else if (connection === 'connecting') {
        logger.info('🔌 Connecting to WhatsApp...', {
          provider: 'baileys',
          attempt: this.reconnectAttempts + 1,
          authExists: fs.existsSync(this.authDir),
        });
      } else if (connection === 'open') {
        this.ready = true;
        this.reconnectAttempts = 0;
        await this.loadClientInfo();

        console.log('\n' + '='.repeat(50));
        console.log('✅ WhatsApp Bot berhasil terhubung!');
        if (this.clientInfo) {
          console.log(`📱 Nomor: ${this.clientInfo.phone}`);
          console.log(`👤 Nama: ${this.clientInfo.name}`);
        }
        console.log('='.repeat(50) + '\n');

        logHelpers.whatsappEvent('Client Ready', {
          provider: 'baileys',
          phoneNumber: this.clientInfo?.phone,
          pushname: this.clientInfo?.name,
        });
      }
    });

    this.sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
        logger.debug('Credentials saved', { authDir: this.authDir });
      } catch (error) {
        logger.error('Failed to save credentials!', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

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

    this.sock.ev.on('groups.update', (updates) => {
      logger.debug('Groups updated', { count: updates.length });
    });

    this.sock.ev.on('presence.update', (presenceUpdate) => {
      logger.debug('Presence updated', { jid: presenceUpdate.id });
    });
  }

  private extractMessageText(message: proto.IWebMessageInfo): string | null {
    const msg = message.message;
    if (!msg) return null;

    if (msg.conversation) {
      return msg.conversation;
    } else if (msg.extendedTextMessage?.text) {
      return msg.extendedTextMessage.text;
    } else if (msg.imageMessage?.caption) {
      return msg.imageMessage.caption;
    } else if (msg.videoMessage?.caption) {
      return msg.videoMessage.caption;
    }

    return null;
  }

  private async loadClientInfo(): Promise<void> {
    if (!this.sock) return;

    try {
      const info = this.sock.user;
      if (info) {
        this.clientInfo = {
          phone: info.id.split(':')[0] || info.id.replace('@s.whatsapp.net', ''),
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
      let jid = phoneNumber;
      if (phoneNumber.includes('@c.us')) {
        jid = phoneNumber.replace('@c.us', '@s.whatsapp.net');
      } else if (!phoneNumber.includes('@')) {
        jid = phoneNumber + '@s.whatsapp.net';
      }

      await this.sock.sendMessage(jid, { text: message });

      logger.info('Message sent successfully via Baileys', {
        to: jid.replace(/\d(?=\d{4})/g, '*'),
      });
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
      try {
        await this.sock.logout();
        logger.info('Baileys client logged out successfully');
      } catch (error) {
        logger.warn('Error during logout', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.sock = null;
    }
    this.ready = false;
    this.reconnectAttempts = 0;
  }

  onMessage(handler: (from: string, message: string) => void): void {
    this.messageHandlers.push(handler);
  }
  private async clearAuthFolder(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.authDir)) {
        logger.info('Auth folder does not exist, nothing to clear');
        return true;
      }

      const backupDir = `${this.authDir}_invalid_${Date.now()}`;
      fs.renameSync(this.authDir, backupDir);

      logger.info('✅ Invalid auth moved to backup', {
        backup: backupDir,
      });

      fs.mkdirSync(this.authDir, { recursive: true });
      logger.info('✅ Fresh auth folder created');

      return true;
    } catch (error) {
      logger.error('Failed to clear auth folder', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private hasValidAuth(): boolean {
    try {
      if (!fs.existsSync(this.authDir)) {
        return false;
      }

      const credsFile = path.join(this.authDir, 'creds.json');
      if (!fs.existsSync(credsFile)) {
        return false;
      }

      const stats = fs.statSync(credsFile);
      return stats.size > 0;
    } catch (error) {
      logger.warn('Error checking auth validity', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
