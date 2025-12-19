import { v4 as uuidv4 } from 'uuid';
import { logger, logHelpers } from '../handlers/logger';
import { QueueItem, QueueStatus, QueueStats, QueueConfig } from '../types/queue.types';
import { WhatsAppFactory } from './WhatsAppFactory';
import config from '../config';

export class QueueManager {
  private static instance: QueueManager | null = null;
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private lastProcessedAt: number | null = null;
  private processingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private config: QueueConfig;

  private constructor() {
    this.config = config.queue;

    if (this.config.enabled) {
      logger.info('Queue Manager initialized', {
        delayBetweenMessages: this.config.delayBetweenMessages,
        maxRetries: this.config.maxRetries,
        maxQueueSize: this.config.maxQueueSize,
      });
    }
  }

  static getInstance(): QueueManager {
    if (!this.instance) {
      this.instance = new QueueManager();
    }
    return this.instance;
  }

  async addToQueue(
    phoneNumber: string,
    message: string,
    type: 'attendance' | 'permission',
    studentName?: string,
    priority: number = 5
  ): Promise<string> {
    if (!this.config.enabled) {
      const whatsappClient = WhatsAppFactory.getInstance();
      await whatsappClient.sendMessage(phoneNumber, message);
      logger.info('Message sent immediately (queue disabled)', {
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
      });
      return 'sent-immediately';
    }

    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`Queue is full. Max size: ${this.config.maxQueueSize}`);
    }

    const queueItem: QueueItem = {
      id: uuidv4(),
      phoneNumber,
      message,
      studentName,
      type,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
      priority,
    };

    this.queue.push(queueItem);

    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });

    logger.info('Message added to queue', {
      queueId: queueItem.id,
      phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
      type,
      queueSize: this.queue.length,
      priority,
    });

    logHelpers.whatsappEvent('Message Queued', {
      queueId: queueItem.id,
      type,
      queueSize: this.queue.length,
    });

    if (!this.isProcessing) {
      this.startProcessing();
    }

    return queueItem.id;
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    logger.info('Queue processing started', {
      queueSize: this.queue.length,
    });

    while (this.queue.length > 0) {
      const pendingItems = this.queue.filter((item) => item.status === 'pending');

      if (pendingItems.length === 0) {
        break;
      }

      const item = pendingItems[0];
      await this.processQueueItem(item);

      if (this.queue.filter((i) => i.status === 'pending').length > 0) {
        logger.info(`Waiting ${this.config.delayBetweenMessages}ms before next message...`);
        await this.delay(this.config.delayBetweenMessages);
      }
    }

    this.isProcessing = false;
    this.lastProcessedAt = Date.now();

    logger.info('Queue processing completed', {
      remainingItems: this.queue.length,
    });

    this.cleanupOldItems();
  }

  private async processQueueItem(item: QueueItem): Promise<void> {
    item.status = 'processing';
    item.processedAt = Date.now();

    logger.info('Processing queue item', {
      queueId: item.id,
      phoneNumber: item.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
      type: item.type,
      retryCount: item.retryCount,
    });

    const timeoutId = setTimeout(() => {
      if (item.status === 'processing') {
        logger.warn('Queue item processing timeout', {
          queueId: item.id,
          timeout: this.config.processingTimeout,
        });
        item.status = 'failed';
        item.error = 'Processing timeout';
        item.completedAt = Date.now();
      }
    }, this.config.processingTimeout);

    this.processingTimeouts.set(item.id, timeoutId);

    try {
      const whatsappClient = WhatsAppFactory.getInstance();

      if (!whatsappClient.isReady()) {
        throw new Error('WhatsApp client is not ready');
      }

      await whatsappClient.sendMessage(item.phoneNumber, item.message);

      clearTimeout(timeoutId);
      this.processingTimeouts.delete(item.id);

      item.status = 'completed';
      item.completedAt = Date.now();

      logger.info('Queue item processed successfully', {
        queueId: item.id,
        phoneNumber: item.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        processingTime: item.completedAt - item.processedAt!,
      });

      logHelpers.messageSent(item.phoneNumber, item.studentName || 'Unknown', item.type, true);
    } catch (error) {
      clearTimeout(timeoutId);
      this.processingTimeouts.delete(item.id);

      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Failed to process queue item', {
        queueId: item.id,
        phoneNumber: item.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        error: errorMessage,
        retryCount: item.retryCount,
      });

      if (item.retryCount < this.config.maxRetries) {
        item.retryCount++;
        item.status = 'pending';
        item.processedAt = undefined;

        logger.info('Retrying queue item', {
          queueId: item.id,
          retryCount: item.retryCount,
          maxRetries: this.config.maxRetries,
        });

        await this.delay(this.config.retryDelay);
      } else {
        item.status = 'failed';
        item.error = errorMessage;
        item.completedAt = Date.now();

        logHelpers.messageSent(item.phoneNumber, item.studentName || 'Unknown', item.type, false);

        logger.error('Queue item failed after max retries', {
          queueId: item.id,
          phoneNumber: item.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
          maxRetries: this.config.maxRetries,
        });
      }
    }
  }

  getStats(): QueueStats {
    const completed = this.queue.filter((i) => i.status === 'completed');
    const processingTimes = completed
      .filter((i) => i.completedAt && i.processedAt)
      .map((i) => i.completedAt! - i.processedAt!);

    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;

    return {
      total: this.queue.length,
      pending: this.queue.filter((i) => i.status === 'pending').length,
      processing: this.queue.filter((i) => i.status === 'processing').length,
      completed: completed.length,
      failed: this.queue.filter((i) => i.status === 'failed').length,
      averageProcessingTime: Math.round(averageProcessingTime),
    };
  }

  getQueue(): QueueItem[] {
    return this.queue.map((item) => ({
      ...item,
      phoneNumber: item.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
    }));
  }

  getQueueItem(id: string): QueueItem | undefined {
    const item = this.queue.find((i) => i.id === id);
    if (item) {
      return {
        ...item,
        phoneNumber: item.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
      };
    }
    return undefined;
  }

  private cleanupOldItems(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const initialLength = this.queue.length;

    this.queue = this.queue.filter((item) => {
      if (item.status === 'pending' || item.status === 'processing') {
        return true;
      }

      if (item.completedAt && item.completedAt < oneHourAgo) {
        return false;
      }

      return true;
    });

    const completedFailed = this.queue.filter(
      (i) => i.status === 'completed' || i.status === 'failed'
    );

    if (completedFailed.length > 100) {
      const toRemove = completedFailed
        .sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0))
        .slice(0, completedFailed.length - 100);

      this.queue = this.queue.filter((item) => !toRemove.find((r) => r.id === item.id));
    }

    if (this.queue.length < initialLength) {
      logger.info('Queue cleanup completed', {
        removed: initialLength - this.queue.length,
        remaining: this.queue.length,
      });
    }
  }

  clearCompleted(): number {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(
      (item) => item.status === 'pending' || item.status === 'processing'
    );

    const removed = initialLength - this.queue.length;

    if (removed > 0) {
      logger.info('Completed items cleared', { removed });
    }

    return removed;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  getLastProcessedAt(): number | null {
    return this.lastProcessedAt;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  cancelPending(): number {
    const pendingItems = this.queue.filter((i) => i.status === 'pending');

    pendingItems.forEach((item) => {
      item.status = 'failed';
      item.error = 'Cancelled by admin';
      item.completedAt = Date.now();
    });

    logger.warn('Pending items cancelled', { count: pendingItems.length });

    return pendingItems.length;
  }

  retryFailed(): number {
    const failedItems = this.queue.filter((i) => i.status === 'failed');

    failedItems.forEach((item) => {
      item.status = 'pending';
      item.retryCount = 0;
      item.error = undefined;
      item.processedAt = undefined;
      item.completedAt = undefined;
    });

    if (failedItems.length > 0 && !this.isProcessing) {
      this.startProcessing();
    }

    logger.info('Failed items queued for retry', { count: failedItems.length });

    return failedItems.length;
  }
}
