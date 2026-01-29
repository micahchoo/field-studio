/**
 * Tile Generation Web Worker
 *
 * Handles background pre-generation of image tiles and derivatives
 * to improve ingest performance by offloading CPU-intensive image
 * processing from the main thread.
 *
 * Communication Protocol:
 * - Main -> Worker: { type: 'generate', assetId, imageData, sizes }
 * - Worker -> Main: { type: 'progress', assetId, size, percent }
 * - Worker -> Main: { type: 'complete', assetId, derivatives }
 * - Worker -> Main: { type: 'error', assetId, message }
 */

import { DEFAULT_DERIVATIVE_SIZES } from '../constants';

// Message types for worker communication
export interface TileWorkerRequest {
  type: 'generate' | 'generateBatch';
  assetId: string;
  imageData: ArrayBuffer;
  mimeType: string;
  sizes: number[];
  quality?: number;
}

export interface TileWorkerProgress {
  type: 'progress';
  assetId: string;
  currentSize: number;
  percent: number;
}

export interface TileWorkerResult {
  type: 'complete';
  assetId: string;
  derivatives: Map<number, ArrayBuffer>;
  originalWidth: number;
  originalHeight: number;
}

export interface TileWorkerError {
  type: 'error';
  assetId: string;
  message: string;
}

export type TileWorkerMessage = TileWorkerProgress | TileWorkerResult | TileWorkerError;

// Worker script (runs in worker context)
const workerScript = `
  self.onmessage = async function(e) {
    const { type, assetId, imageData, mimeType, sizes, quality = 0.8 } = e.data;

    if (type !== 'generate' && type !== 'generateBatch') {
      self.postMessage({ type: 'error', assetId, message: 'Unknown message type' });
      return;
    }

    try {
      // Create ImageBitmap from the raw data
      const blob = new Blob([imageData], { type: mimeType });
      const bitmap = await createImageBitmap(blob);
      const { width: originalWidth, height: originalHeight } = bitmap;

      const derivatives = {};
      const totalSizes = sizes.length;

      for (let i = 0; i < sizes.length; i++) {
        const targetWidth = sizes[i];

        // Skip if target is larger than original
        if (targetWidth >= originalWidth) {
          continue;
        }

        // Calculate proportional height
        const ratio = originalHeight / originalWidth;
        const targetHeight = Math.floor(targetWidth * ratio);

        // Create canvas and draw resized image
        const canvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

        // Convert to JPEG blob
        const derivativeBlob = await canvas.convertToBlob({
          type: 'image/jpeg',
          quality: quality
        });

        // Convert blob to ArrayBuffer for transfer
        const arrayBuffer = await derivativeBlob.arrayBuffer();
        derivatives[targetWidth] = arrayBuffer;

        // Report progress
        self.postMessage({
          type: 'progress',
          assetId,
          currentSize: targetWidth,
          percent: Math.round(((i + 1) / totalSizes) * 100)
        });
      }

      // Clean up
      bitmap.close();

      // Send complete result with transferable ArrayBuffers
      const transferList = Object.values(derivatives);
      self.postMessage({
        type: 'complete',
        assetId,
        derivatives,
        originalWidth,
        originalHeight
      }, transferList);

    } catch (error) {
      self.postMessage({
        type: 'error',
        assetId,
        message: error.message || 'Unknown error during tile generation'
      });
    }
  };
`;

// Create worker blob URL
const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);

// Worker task with priority support
interface WorkerTask {
  request: TileWorkerRequest;
  resolve: Function;
  reject: Function;
  priority: number; // Higher = more important
  timestamp: number;
}

/**
 * TileWorkerPool - Manages a pool of web workers for parallel tile generation
 * Implements backpressure with max 4 concurrent workers to prevent memory issues
 */
export class TileWorkerPool {
  private workers: Worker[] = [];
  private queue: WorkerTask[] = [];
  private activeJobs: Map<string, { resolve: Function; reject: Function }> = new Map();
  private poolSize: number;
  private maxConcurrent: number = 4; // Max 4 concurrent workers for backpressure
  private activeWorkers: number = 0;

  constructor(poolSize: number = Math.min(navigator.hardwareConcurrency || 4, 4)) {
    this.poolSize = Math.min(poolSize, this.maxConcurrent); // Cap at maxConcurrent
    this.initWorkers();
  }

  private initWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(workerUrl);
      worker.onmessage = this.handleWorkerMessage.bind(this);
      worker.onerror = this.handleWorkerError.bind(this);
      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(e: MessageEvent<TileWorkerMessage>) {
    const { type, assetId } = e.data;

    if (type === 'progress') {
      // Progress updates can be used for UI feedback
      return;
    }

    const job = this.activeJobs.get(assetId);
    if (!job) return;

    if (type === 'complete') {
      const result = e.data as TileWorkerResult;
      // Convert the plain object back to a Map
      const derivativesMap = new Map<number, Blob>();
      for (const [size, buffer] of Object.entries(result.derivatives)) {
        derivativesMap.set(parseInt(size), new Blob([buffer as ArrayBuffer], { type: 'image/jpeg' }));
      }
      job.resolve({
        derivatives: derivativesMap,
        originalWidth: result.originalWidth,
        originalHeight: result.originalHeight
      });
    } else if (type === 'error') {
      job.reject(new Error((e.data as TileWorkerError).message));
    }

    this.activeJobs.delete(assetId);
    this.activeWorkers--;
    this.processQueue();
  }

  private handleWorkerError(e: ErrorEvent) {
    console.error('Tile worker error:', e);
  }

  private processQueue() {
    // Process queue with backpressure - only run up to maxConcurrent workers
    while (this.queue.length > 0 && this.activeWorkers < this.maxConcurrent) {
      // Sort queue by priority (desc) then timestamp (asc) for FIFO within same priority
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });

      const task = this.queue.shift();
      if (!task) continue;

      // Find an available worker
      const availableWorker = this.workers.find(worker => {
        // Check if worker is not currently processing
        return !Array.from(this.activeJobs.values()).some(job =>
          // Simple heuristic: workers are assigned round-robin
          false
        );
      }) || this.workers[this.activeWorkers % this.poolSize];

      if (availableWorker) {
        this.activeWorkers++;
        this.activeJobs.set(task.request.assetId, {
          resolve: task.resolve,
          reject: task.reject
        });
        
        try {
          availableWorker.postMessage(task.request, [task.request.imageData]);
        } catch (err) {
          // If transfer fails (already transferred), try without transfer
          availableWorker.postMessage(task.request);
        }
      } else {
        // Put back in queue if no worker available
        this.queue.unshift(task);
        break;
      }
    }
  }

  /**
   * Get current queue statistics for monitoring backpressure
   */
  getQueueStats(): { queueLength: number; activeWorkers: number; maxConcurrent: number } {
    return {
      queueLength: this.queue.length,
      activeWorkers: this.activeWorkers,
      maxConcurrent: this.maxConcurrent
    };
  }

  /**
   * Wait for all pending tasks to complete
   */
  async flush(): Promise<void> {
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
   * Generate derivatives for an image file
   * Implements backpressure - queues when at max capacity
   */
  async generateDerivatives(
    assetId: string,
    file: Blob,
    sizes: number[] = DEFAULT_DERIVATIVE_SIZES,
    priority: number = 1
  ): Promise<{
    derivatives: Map<number, Blob>;
    originalWidth: number;
    originalHeight: number;
  }> {
    const imageData = await file.arrayBuffer();

    return new Promise((resolve, reject) => {
      const request: TileWorkerRequest = {
        type: 'generate',
        assetId,
        imageData,
        mimeType: file.type || 'image/jpeg',
        sizes,
        quality: 0.8
      };

      const task: WorkerTask = {
        request,
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      };

      // Check if we can start immediately or need to queue
      if (this.activeWorkers < this.maxConcurrent) {
        this.activeWorkers++;
        this.activeJobs.set(assetId, { resolve, reject });
        const worker = this.workers[this.activeJobs.size % this.poolSize];
        
        try {
          worker.postMessage(request, [imageData]);
        } catch (err) {
          // Fallback if ArrayBuffer already detached
          worker.postMessage(request);
        }
      } else {
        // Queue the task - backpressure applied
        this.queue.push(task);
      }
    });
  }

  /**
   * Generate derivatives for multiple images with batch backpressure
   */
  async generateDerivativesBatch(
    items: Array<{ assetId: string; file: Blob; priority?: number }>,
    sizes: number[] = DEFAULT_DERIVATIVE_SIZES,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, { derivatives: Map<number, Blob>; originalWidth: number; originalHeight: number }>> {
    const results = new Map<string, { derivatives: Map<number, Blob>; originalWidth: number; originalHeight: number }>();
    const total = items.length;
    let completed = 0;

    // Process in chunks to maintain backpressure
    const batchSize = this.maxConcurrent * 2; // Keep queue reasonably filled
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({ assetId, file, priority = 1 }) => {
        try {
          const result = await this.generateDerivatives(assetId, file, sizes, priority);
          results.set(assetId, result);
          completed++;
          onProgress?.(completed, total);
          return { assetId, success: true };
        } catch (err) {
          completed++;
          onProgress?.(completed, total);
          return { assetId, success: false, error: err };
        }
      });

      // Wait for batch to complete before starting next batch
      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * Terminate all workers
   */
  terminate() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.queue = [];
    this.activeJobs.clear();
  }
}

// Singleton instance
let tileWorkerPool: TileWorkerPool | null = null;

export function getTileWorkerPool(): TileWorkerPool {
  if (!tileWorkerPool) {
    tileWorkerPool = new TileWorkerPool();
  }
  return tileWorkerPool;
}

/**
 * Generate a single derivative (convenience function)
 * Falls back to main thread if workers unavailable
 */
export async function generateDerivativeAsync(
  file: Blob,
  width: number
): Promise<Blob | null> {
  try {
    const pool = getTileWorkerPool();
    const assetId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await pool.generateDerivatives(assetId, file, [width]);
    return result.derivatives.get(width) || null;
  } catch (e) {
    console.warn('Worker tile generation failed, falling back to main thread:', e);
    // Fallback to main thread
    return generateDerivativeFallback(file, width);
  }
}

/**
 * Fallback derivative generation on main thread
 */
async function generateDerivativeFallback(file: Blob, width: number): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = bitmap.height / bitmap.width;
    const targetHeight = Math.floor(width * ratio);
    const canvas = new OffscreenCanvas(width, targetHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, targetHeight);
    bitmap.close();
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
  } catch (e) {
    return null;
  }
}
