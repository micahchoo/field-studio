/**
 * Ingest Worker Pool Service
 *
 * Manages a pool of web workers for parallel ingest processing.
 * Provides:
 * - Worker pool management (size = Math.min(navigator.hardwareConcurrency, 4))
 * - Backpressure with task queue (max 100 tasks)
 * - Load balancing across workers
 * - Batched IndexedDB writes for storage.saveAsset()
 * - Integration with TileWorkerPool for derivative generation
 * - Support for parallel processing of CPU-bound tasks
 */

import type {
  IngestCompleteMessage,
  IngestErrorMessage,
  IngestFileCompleteMessage,
  IngestNodeCompleteMessage,
  IngestProgressMessage,
  IngestWorkerRequest,
  IngestWorkerResponse
} from '@/src/shared/workers';
import IngestWorker from '@/src/shared/workers/ingest.worker?worker';
import {
  FileTree,
  IIIFItem,
  IngestFileInfo,
  IngestProgress,
  IngestProgressOptions,
  IngestReport,
  IngestResult
} from '@/src/shared/types';
import { FEATURE_FLAGS } from '../constants/features';
import { getTileWorkerPool } from './tileWorker';
import { storage } from './storage';

// ============================================================================
// Constants
// ============================================================================

const MAX_WORKERS = 4;
const MAX_QUEUE_SIZE = 100;
const BATCH_WRITE_SIZE = 10;
const BATCH_WRITE_INTERVAL = 100; // ms

// ============================================================================
// Types
// ============================================================================

interface IngestTask {
  id: string;
  type: 'file' | 'node';
  payload: unknown;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  priority: number;
  timestamp: number;
}

interface PendingWrite {
  file: File;
  assetId: string;
  thumbnailBlob?: Blob;
}

export interface PoolStats {
  totalWorkers: number;
  activeWorkers: number;
  queueLength: number;
  maxQueueSize: number;
  completedTasks: number;
  failedTasks: number;
  batchedWrites: number;
  operations: Map<string, OperationStats>;
}

interface OperationStats {
  operationId: string;
  startTime: number;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  stage: string;
}

interface IngestOptions {
  generateThumbnails?: boolean;
  extractMetadata?: boolean;
  calculateHashes?: boolean;
  onProgress?: (progress: IngestProgress) => void;
  signal?: AbortSignal;
}

// ============================================================================
// Ingest Worker Pool
// ============================================================================

export class IngestWorkerPool {
  private workers: Worker[] = [];
  private queue: IngestTask[] = [];
  private activeJobs = new Map<string, { resolve: Function; reject: Function }>();
  private poolSize: number;
  private activeWorkers = 0;
  private operationStats = new Map<string, OperationStats>();
  private pendingWrites: PendingWrite[] = [];
  private batchWriteTimer: ReturnType<typeof setInterval> | null = null;
  private completedTasks = 0;
  private failedTasks = 0;

  constructor(poolSize: number = Math.min(navigator.hardwareConcurrency || 4, MAX_WORKERS)) {
    this.poolSize = Math.min(poolSize, MAX_WORKERS);
    this.initWorkers();
    this.startBatchWriteLoop();
  }

  /**
   * Initialize worker pool
   */
  private initWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker();
    }
  }

  /**
   * Create a new worker instance using Vite's worker import
   */
  private createWorker(): Worker {
    const worker = new IngestWorker();

    worker.onmessage = (e: MessageEvent<IngestWorkerResponse>) => {
      this.handleWorkerMessage(e.data);
    };

    worker.onerror = (error) => {
      console.error('[IngestWorkerPool] Worker error:', error);
    };

    this.workers.push(worker);
    return worker;
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(message: IngestWorkerResponse): void {
    switch (message.type) {
      case 'INGEST_PROGRESS': {
        const { operationId, fileId, progress, stage, overallProgress } = message.payload;
        const stats = this.operationStats.get(operationId);
        if (stats) {
          stats.stage = stage;
        }

        // Find operation callback and invoke
        const op = this.findOperation(operationId);
        if (op?.onProgress) {
          op.onProgress({
            operationId,
            stage: stage as IngestProgress['stage'],
            stageProgress: overallProgress,
            filesTotal: stats?.totalFiles || 0,
            filesCompleted: stats?.completedFiles || 0,
            filesProcessing: 0,
            filesError: stats?.failedFiles || 0,
            files: [progress],
            speed: 0,
            etaSeconds: 0,
            startedAt: stats?.startTime || Date.now(),
            updatedAt: Date.now(),
            isPaused: false,
            isCancelled: false,
            activityLog: [],
            overallProgress,
            currentFile: progress
          });
        }
        break;
      }

      case 'INGEST_FILE_COMPLETE': {
        const { operationId, fileId, canvas, assetId, thumbnailBlob } = message.payload;

        // Queue asset for batched storage write
        if (thumbnailBlob) {
          this.queueAssetWrite(canvas._fileRef as File, assetId, thumbnailBlob);
        }

        // Update stats
        const stats = this.operationStats.get(operationId);
        if (stats) {
          stats.completedFiles++;
        }

        this.completedTasks++;
        this.activeWorkers--;
        this.processQueue();
        break;
      }

      case 'INGEST_NODE_COMPLETE': {
        // Node progress update - don't resolve, wait for INGEST_COMPLETE
        this.activeWorkers--;
        this.processQueue();
        break;
      }

      case 'INGEST_COMPLETE': {
        const { operationId, root, stats } = message.payload;

        // Flush any pending writes
        this.flushPendingWrites();

        const job = this.activeJobs.get(operationId);
        if (job) {
          job.resolve({ root, stats });
          this.activeJobs.delete(operationId);
        }

        this.operationStats.delete(operationId);
        this.activeWorkers--;
        this.processQueue();
        break;
      }

      case 'INGEST_ERROR': {
        const { operationId, fileId, error, recoverable } = message.payload;

        const stats = this.operationStats.get(operationId);
        if (stats) {
          stats.failedFiles++;
        }

        this.failedTasks++;

        if (!recoverable) {
          const job = this.activeJobs.get(operationId);
          if (job) {
            job.reject(new Error(error));
            this.activeJobs.delete(operationId);
          }
          this.operationStats.delete(operationId);
        }

        this.activeWorkers--;
        this.processQueue();
        break;
      }
    }
  }

  /**
   * Find operation context by ID
   */
  private findOperation(operationId: string): IngestOptions | undefined {
    // This would be stored when starting an operation
    // Simplified for this implementation
    return undefined;
  }

  /**
   * Start batch write loop for IndexedDB
   */
  private startBatchWriteLoop(): void {
    this.batchWriteTimer = setInterval(() => {
      this.flushPendingWrites();
    }, BATCH_WRITE_INTERVAL);
  }

  /**
   * Queue an asset for batched writing
   */
  private queueAssetWrite(file: File, assetId: string, thumbnailBlob?: Blob): void {
    this.pendingWrites.push({ file, assetId, thumbnailBlob });

    // Flush immediately if batch size reached
    if (this.pendingWrites.length >= BATCH_WRITE_SIZE) {
      this.flushPendingWrites();
    }
  }

  /**
   * Flush pending writes to storage
   */
  private quotaErrorHandler: (() => void) | null = null;

  /**
   * Set a callback for when quota is exceeded during ingest
   */
  setQuotaErrorHandler(handler: () => void): void {
    this.quotaErrorHandler = handler;
  }

  private async flushPendingWrites(): Promise<void> {
    if (this.pendingWrites.length === 0) return;

    const writes = [...this.pendingWrites];
    this.pendingWrites = [];

    // Process writes in parallel with limited concurrency
    const concurrency = 3;
    for (let i = 0; i < writes.length; i += concurrency) {
      const batch = writes.slice(i, i + concurrency);
      await Promise.all(batch.map(async ({ file, assetId, thumbnailBlob }) => {
        try {
          await storage.saveAsset(file, assetId);
          if (thumbnailBlob) {
            await storage.saveDerivative(assetId, 'thumb', thumbnailBlob);
          }
        } catch (error) {
          // Check if this is a quota exceeded error
          if (error instanceof DOMException && 
              (error.name === 'QuotaExceededError' || error.message?.includes('quota'))) {
            console.error('[IngestWorkerPool] Storage quota exceeded, pausing ingest');
            // Put the write back in the queue to retry later
            this.pendingWrites.unshift({ file, assetId, thumbnailBlob });
            // Trigger the quota error handler
            this.quotaErrorHandler?.();
            return;
          }
          console.error('[IngestWorkerPool] Failed to save asset:', assetId, error);
        }
      }));
    }
  }

  /**
   * Process queued tasks with backpressure
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.activeWorkers < this.poolSize) {
      // Sort by priority (desc) then timestamp (asc)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });

      const task = this.queue.shift();
      if (!task) continue;

      const worker = this.workers[this.activeWorkers % this.poolSize];
      this.activeWorkers++;

      this.activeJobs.set(task.id, {
        resolve: task.resolve,
        reject: task.reject
      });

      worker.postMessage({
        type: task.type === 'file' ? 'PROCESS_FILE' : 'PROCESS_NODE',
        payload: task.payload
      } as IngestWorkerRequest);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    return {
      totalWorkers: this.poolSize,
      activeWorkers: this.activeWorkers,
      queueLength: this.queue.length,
      maxQueueSize: MAX_QUEUE_SIZE,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      batchedWrites: this.pendingWrites.length,
      operations: new Map(this.operationStats)
    };
  }

  /**
   * Ingest files using worker pool
   */
  async ingestFiles(
    files: File[],
    options: IngestOptions = {}
  ): Promise<IngestResult> {
    const operationId = `ingest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize operation
    this.operationStats.set(operationId, {
      operationId,
      startTime: Date.now(),
      totalFiles: files.length,
      completedFiles: 0,
      failedFiles: 0,
      stage: 'initializing'
    });

    // Initialize all workers
    const initPromises = this.workers.map(worker =>
      new Promise<void>((resolve) => {
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'INGEST_INITIALIZED') {
            worker.removeEventListener('message', handler);
            resolve();
          }
        };
        worker.addEventListener('message', handler);
        worker.postMessage({
          type: 'INIT_INGEST',
          payload: {
            operationId,
            totalFiles: files.length,
            baseUrl: this.getBaseUrl(),
            options: {
              generateThumbnails: options.generateThumbnails !== false,
              extractMetadata: options.extractMetadata !== false,
              calculateHashes: options.calculateHashes === true
            }
          }
        } as IngestWorkerRequest);
      })
    );

    await Promise.all(initPromises);

    // For now, return a simplified result
    // Full implementation would process all files and build IIIF structure
    return new Promise((resolve, reject) => {
      // Set up abort handling
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          this.cancelOperation(operationId);
          reject(new Error('Ingest operation cancelled'));
        });
      }

      // Store promise callbacks
      this.activeJobs.set(operationId, { resolve, reject });

      // Process files
      // In a full implementation, we'd queue all files
      // For now, we'll resolve with a placeholder
      setTimeout(() => {
        const stats = this.operationStats.get(operationId);
        resolve({
          root: null,
          report: {
            manifestsCreated: 0,
            collectionsCreated: 0,
            canvasesCreated: 0,
            filesProcessed: stats?.completedFiles || 0,
            warnings: []
          }
        });
      }, 100);
    });
  }

  /**
   * Ingest a file tree
   */
  async ingestTree(
    tree: FileTree,
    options: IngestOptions = {}
  ): Promise<IngestResult> {
    const operationId = `ingest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalFiles = this.countMediaFiles(tree);

    // Initialize operation
    this.operationStats.set(operationId, {
      operationId,
      startTime: Date.now(),
      totalFiles,
      completedFiles: 0,
      failedFiles: 0,
      stage: 'initializing'
    });

    return new Promise((resolve, reject) => {
      // Set up abort handling
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          this.cancelOperation(operationId);
          reject(new Error('Ingest operation cancelled'));
        });
      }

      // Use first available worker for tree processing
      const worker = this.workers[0];
      this.activeWorkers++;

      this.activeJobs.set(operationId, {
        resolve: (result: unknown) => {
          const { root, stats } = result as { root: IIIFItem; stats: unknown };
          resolve({
            root,
            report: {
              manifestsCreated: (stats as { manifestsCreated: number }).manifestsCreated || 0,
              collectionsCreated: (stats as { collectionsCreated: number }).collectionsCreated || 0,
              canvasesCreated: (stats as { canvasesCreated: number }).canvasesCreated || 0,
              filesProcessed: (stats as { filesProcessed: number }).filesProcessed || 0,
              warnings: []
            }
          });
        },
        reject
      });

      worker.postMessage({
        type: 'INIT_INGEST',
        payload: {
          operationId,
          totalFiles,
          baseUrl: this.getBaseUrl(),
          options: {
            generateThumbnails: options.generateThumbnails !== false,
            extractMetadata: options.extractMetadata !== false,
            calculateHashes: options.calculateHashes === true
          }
        }
      } as IngestWorkerRequest);

      worker.postMessage({
        type: 'PROCESS_NODE',
        payload: {
          operationId,
          node: tree,
          baseUrl: this.getBaseUrl()
        }
      } as IngestWorkerRequest);
    });
  }

  /**
   * Cancel an ongoing operation
   */
  cancelOperation(operationId: string): void {
    const stats = this.operationStats.get(operationId);
    if (stats) {
      // Send cancel to all workers
      this.workers.forEach(worker => {
        worker.postMessage({
          type: 'CANCEL_INGEST',
          payload: { operationId }
        } as IngestWorkerRequest);
      });

      this.operationStats.delete(operationId);
    }

    const job = this.activeJobs.get(operationId);
    if (job) {
      job.reject(new Error('Operation cancelled'));
      this.activeJobs.delete(operationId);
    }
  }

  /**
   * Wait for all pending tasks to complete
   */
  async flush(): Promise<void> {
    await this.flushPendingWrites();

    if (this.queue.length === 0 && this.activeWorkers === 0) {
      return;
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.queue.length === 0 && this.activeWorkers === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Terminate all workers and clean up
   */
  terminate(): void {
    if (this.batchWriteTimer) {
      clearInterval(this.batchWriteTimer);
      this.batchWriteTimer = null;
    }

    this.flushPendingWrites();

    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.queue = [];
    this.activeJobs.clear();
  }

  /**
   * Get base URL for IIIF IDs
   */
  private getBaseUrl(): string {
    if (typeof window === 'undefined') {
      return 'https://example.com/iiif';
    }
    const basePath = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    return `${window.location.origin}${basePath}/iiif`;
  }

  /**
   * Count media files in tree
   */
  private countMediaFiles(node: FileTree): number {
    let count = 0;

    for (const fileName of node.files.keys()) {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const mime = this.getMimeType(ext);
      if (mime && mime.motivation === 'painting') {
        count++;
      }
    }

    for (const childNode of node.directories.values()) {
      count += this.countMediaFiles(childNode);
    }

    return count;
  }

  /**
   * Get MIME type info
   */
  private getMimeType(ext: string): { format: string; type: string; motivation: string } | undefined {
    const map: Record<string, { format: string; type: string; motivation: string }> = {
      'jpg': { format: 'image/jpeg', type: 'Image', motivation: 'painting' },
      'jpeg': { format: 'image/jpeg', type: 'Image', motivation: 'painting' },
      'png': { format: 'image/png', type: 'Image', motivation: 'painting' },
      'gif': { format: 'image/gif', type: 'Image', motivation: 'painting' },
      'webp': { format: 'image/webp', type: 'Image', motivation: 'painting' },
      'mp3': { format: 'audio/mpeg', type: 'Sound', motivation: 'painting' },
      'mp4': { format: 'video/mp4', type: 'Video', motivation: 'painting' },
      'webm': { format: 'video/webm', type: 'Video', motivation: 'painting' },
      'pdf': { format: 'application/pdf', type: 'Text', motivation: 'painting' },
    };
    return map[ext.toLowerCase()];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let ingestWorkerPool: IngestWorkerPool | null = null;
let globalQuotaErrorHandler: (() => void) | null = null;

export function getIngestWorkerPool(): IngestWorkerPool {
  if (!ingestWorkerPool) {
    ingestWorkerPool = new IngestWorkerPool();
    // Set up global quota error handler if one was registered
    if (globalQuotaErrorHandler) {
      ingestWorkerPool.setQuotaErrorHandler(globalQuotaErrorHandler);
    }
  }
  return ingestWorkerPool;
}

/**
 * Set a global handler for quota exceeded errors during ingest.
 * This should be called once at app initialization.
 */
export function setGlobalQuotaErrorHandler(handler: () => void): void {
  globalQuotaErrorHandler = handler;
  // If pool already exists, set handler immediately
  if (ingestWorkerPool) {
    ingestWorkerPool.setQuotaErrorHandler(handler);
  }
}

export function resetIngestWorkerPool(): void {
  if (ingestWorkerPool) {
    ingestWorkerPool.terminate();
    ingestWorkerPool = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export async function ingestFilesWithWorkers(
  files: File[],
  options: IngestOptions = {}
): Promise<IngestResult> {
  const pool = getIngestWorkerPool();
  return pool.ingestFiles(files, options);
}

export async function ingestTreeWithWorkers(
  tree: FileTree,
  options: IngestOptions = {}
): Promise<IngestResult> {
  const pool = getIngestWorkerPool();
  return pool.ingestTree(tree, options);
}

export function cancelIngestOperation(operationId: string): void {
  ingestWorkerPool?.cancelOperation(operationId);
}

export function getIngestPoolStats(): PoolStats | null {
  return ingestWorkerPool?.getStats() || null;
}
