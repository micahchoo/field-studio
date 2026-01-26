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

/**
 * TileWorkerPool - Manages a pool of web workers for parallel tile generation
 */
export class TileWorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{ request: TileWorkerRequest; resolve: Function; reject: Function }> = [];
  private activeJobs: Map<string, { resolve: Function; reject: Function }> = new Map();
  private poolSize: number;

  constructor(poolSize: number = navigator.hardwareConcurrency || 4) {
    this.poolSize = Math.min(poolSize, 8); // Cap at 8 workers
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
    this.processQueue();
  }

  private handleWorkerError(e: ErrorEvent) {
    console.error('Tile worker error:', e);
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    const availableWorker = this.workers.find((_, idx) =>
      !Array.from(this.activeJobs.keys()).some(id =>
        this.activeJobs.get(id) !== undefined
      )
    );

    if (availableWorker && this.activeJobs.size < this.poolSize) {
      const job = this.queue.shift();
      if (job) {
        this.activeJobs.set(job.request.assetId, { resolve: job.resolve, reject: job.reject });
        const workerIdx = this.workers.indexOf(availableWorker);
        this.workers[workerIdx % this.poolSize].postMessage(job.request, [job.request.imageData]);
      }
    }
  }

  /**
   * Generate derivatives for an image file
   */
  async generateDerivatives(
    assetId: string,
    file: Blob,
    sizes: number[] = DEFAULT_DERIVATIVE_SIZES
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

      if (this.activeJobs.size < this.poolSize) {
        this.activeJobs.set(assetId, { resolve, reject });
        this.workers[this.activeJobs.size % this.poolSize].postMessage(request, [imageData]);
      } else {
        this.queue.push({ request, resolve, reject });
      }
    });
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
