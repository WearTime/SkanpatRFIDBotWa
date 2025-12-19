import express, { Request, Response, Router } from 'express';
import { QueueManager } from '../services/QueueManager';
import { QueueMonitorResponse } from '../types/queue.types';
import { logger } from '../handlers/logger';

const router: Router = express.Router();

router.get('/queue/monitor', (_req: Request, res: Response) => {
  try {
    const queueManager = QueueManager.getInstance();
    const stats = queueManager.getStats();
    const queue = queueManager.getQueue();
    const lastProcessedAt = queueManager.getLastProcessedAt();

    const response: QueueMonitorResponse = {
      success: true,
      stats,
      queue,
      isProcessing: queueManager.isCurrentlyProcessing(),
      lastProcessedAt: lastProcessedAt ? new Date(lastProcessedAt).toISOString() : undefined,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to get queue monitor data', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve queue information',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/queue/stats', (_req: Request, res: Response) => {
  try {
    const queueManager = QueueManager.getInstance();
    const stats = queueManager.getStats();

    res.status(200).json({
      success: true,
      stats,
      isProcessing: queueManager.isCurrentlyProcessing(),
    });
  } catch (error) {
    logger.error('Failed to get queue stats', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve queue statistics',
    });
  }
});

router.get('/queue/item/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const queueManager = QueueManager.getInstance();
    const item = queueManager.getQueueItem(id);

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Queue item not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      item,
    });
  } catch (error) {
    logger.error('Failed to get queue item', {
      error: error instanceof Error ? error.message : String(error),
      itemId: req.params.id,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve queue item',
    });
  }
});

router.post('/queue/clear-completed', (_req: Request, res: Response) => {
  try {
    const queueManager = QueueManager.getInstance();
    const removedCount = queueManager.clearCompleted();

    logger.info('Completed queue items cleared via API', { removedCount });

    res.status(200).json({
      success: true,
      message: `${removedCount} completed/failed items removed from queue`,
      removedCount,
    });
  } catch (error) {
    logger.error('Failed to clear completed items', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to clear completed items',
    });
  }
});

router.post('/queue/cancel-pending', (_req: Request, res: Response) => {
  try {
    const queueManager = QueueManager.getInstance();
    const cancelledCount = queueManager.cancelPending();

    logger.warn('Pending queue items cancelled via API', { cancelledCount });

    res.status(200).json({
      success: true,
      message: `${cancelledCount} pending items cancelled`,
      cancelledCount,
    });
  } catch (error) {
    logger.error('Failed to cancel pending items', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to cancel pending items',
    });
  }
});

router.post('/queue/retry-failed', (_req: Request, res: Response) => {
  try {
    const queueManager = QueueManager.getInstance();
    const retriedCount = queueManager.retryFailed();

    logger.info('Failed queue items queued for retry via API', { retriedCount });

    res.status(200).json({
      success: true,
      message: `${retriedCount} failed items queued for retry`,
      retriedCount,
    });
  } catch (error) {
    logger.error('Failed to retry failed items', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retry failed items',
    });
  }
});

router.get('/queue/config', (_req: Request, res: Response) => {
  try {
    const queueManager = QueueManager.getInstance();

    res.status(200).json({
      success: true,
      config: {
        enabled: queueManager.isEnabled(),
        // You can expose more config if needed
      },
    });
  } catch (error) {
    logger.error('Failed to get queue config', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve queue configuration',
    });
  }
});

export default router;
