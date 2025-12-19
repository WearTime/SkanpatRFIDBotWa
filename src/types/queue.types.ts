export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueueItem {
  id: string;
  phoneNumber: string;
  message: string;
  studentName?: string;
  type: 'attendance' | 'permission';
  status: QueueStatus;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  priority: number;
}

export interface QueueConfig {
  enabled: boolean;
  delayBetweenMessages: number; // in milliseconds
  maxRetries: number;
  retryDelay: number; // in milliseconds
  maxQueueSize: number;
  processingTimeout: number; // in milliseconds
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTime: number;
}

export interface QueueMonitorResponse {
  success: boolean;
  stats: QueueStats;
  queue: QueueItem[];
  isProcessing: boolean;
  lastProcessedAt?: string;
}
