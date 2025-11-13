import express, { Express } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import config from './config';
import { logger } from './handlers/logger';
import routes from './routes';
import { gracefulShutdown } from './utils/gracefulShutdown';
import { setupMiddleware } from './middleware';
import { setupErrorHandlers } from './middleware/error';
import { handleIncomingMessage } from './handlers/messageHandlers';
import { WhatsAppFactory } from './services/WhatsAppFactory';
import figlet from 'figlet';
import chalk from 'chalk';

dotenv.config();

const app: Express = express();

setupMiddleware(app);

app.use('/', routes);

setupErrorHandlers(app);

const server: http.Server = app.listen(config.server.port, config.server.host, () => {
  const banner = figlet.textSync('WhatsApp Bot', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });

  console.log(chalk.cyanBright('\n' + banner));
  console.log(chalk.gray('='.repeat(70)));

  console.log(
    chalk.greenBright('🚀 Server berjalan di: ') +
      chalk.whiteBright(`http://${config.server.host}:${config.server.port}`)
  );
  console.log(
    chalk.blueBright('📱 WhatsApp Provider: ') + chalk.whiteBright(config.whatsapp.provider)
  );

  console.log(chalk.yellowBright('\n📋 Endpoints Tersedia:'));
  console.log(
    chalk.whiteBright(`
   • ${chalk.redBright('[POST]')} ${chalk.green('/send-attendance')}     Kirim notifikasi absensi
   • ${chalk.redBright('[POST]')} ${chalk.green('/send-permission')}     Kirim notifikasi izin
   • ${chalk.blueBright('[GET]')}  ${chalk.green('/status')}              Cek status bot
   • ${chalk.blueBright('[GET]')}  ${chalk.green('/health')}              Health check
   • ${chalk.blueBright('[GET]')}  ${chalk.green('/pending-confirmation')}  Lihat pending confirmations
`)
  );

  console.log(chalk.gray('='.repeat(70)) + '\n');

  logger.info('Server Started', {
    port: config.server.port,
    host: config.server.host,
    nodeEnv: process.env.NODE_ENV,
    logLevel: config.logging.level,
    whatsappProvider: config.whatsapp.provider,
  });
});

logger.info('Initializing WhatsApp client...', {
  provider: config.whatsapp.provider,
});

const whatsappClient = WhatsAppFactory.getInstance();

whatsappClient.onMessage((from: string, message: string) => {
  handleIncomingMessage(from, message);
});

whatsappClient.initialize().catch((error: { message: string }) => {
  logger.error('Failed to initialize WhatsApp client', {
    error: error instanceof Error ? error.message : String(error),
    provider: config.whatsapp.provider,
  });
  process.exit(1);
});

gracefulShutdown(server, whatsappClient);

export { app, server };
