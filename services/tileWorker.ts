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
 *
 * Pyramid Generation Protocol:
 * - Main -> Worker: { type: 'GENERATE_PYRAMID', assetId, imageBlob, config }
 * - Worker -> Main: { type: 'PYRAMID_PROGRESS', assetId, progress }
 * - Worker -> Main: { type: 'PYRAMID_COMPLETE', assetId, descriptor, totalTiles }
 * - Worker -> Main: { type: 'PYRAMID_ERROR', assetId, error }
 */

import { DEFAULT_DERIVATIVE_SIZES } from '../constants';
import { FEATURE_FLAGS } from '../constants/features';
import {
  createCanvasTilePipeline,
  CanvasTilePipeline,
  TileGenerationProgress,
} from './imagePipeline/canvasPipeline';
import {
  TilePyramidConfig,
  TilePyramidResult,
  TilePyramidDescriptor,
} from './imagePipeline/tileCalculator';

// ============================================================================
// Memory Leak Prevention - Worker Blob URL Management
// ============================================================================

/**
 * Check if worker URL cleanup is enabled
 */
const isWorkerCleanupEnabled = (): boolean => {
  return (FEATURE_FLAGS as Record<string, boolean>).USE_WORKER_URL_CLEANUP !== false;
};

/**
 * Cleanup function for the worker blob URL
 * Should be called on app shutdown to prevent memory leaks
 */
let workerUrlCleanupFn: (() => void) | null = null;

/**
 * Register the cleanup function for the worker blob URL
 * @internal
 */
function registerWorkerUrlCleanup(cleanupFn: () => void): void {
  workerUrlCleanupFn = cleanupFn;
}

/**
 * Clean up the worker blob URL
 * Call this function when the application is shutting down
 * to prevent memory leaks from unreleased blob URLs
 */
export function cleanupWorkerBlobUrl(): void {
  if (!isWorkerCleanupEnabled()) {
    console.log('[tileWorker] Worker URL cleanup disabled by feature flag');
    return;
  }

  if (workerUrlCleanupFn) {
    workerUrlCleanupFn();
    workerUrlCleanupFn = null;
    console.log('[tileWorker] Worker blob URL cleaned up');
  }
}

// ============================================================================
// Legacy Message Types (for derivative generation)
// ============================================================================

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

// ============================================================================
// Pyramid Generation Message Types
// ============================================================================

/**
 * Message to initiate tile pyramid generation
 */
export interface GeneratePyramidMessage {
  type: 'GENERATE_PYRAMID';
  assetId: string;
  imageBlob: Blob;
  config?: Partial<TilePyramidConfig>;
}

/**
 * Progress update during pyramid generation
 */
export interface PyramidProgressMessage {
  type: 'PYRAMID_PROGRESS';
  assetId: string;
  progress: TileGenerationProgress;
}

/**
 * Completion message when pyramid generation finishes
 */
export interface PyramidCompleteMessage {
  type: 'PYRAMID_COMPLETE';
  assetId: string;
  descriptor: TilePyramidDescriptor;
  totalTiles: number;
}

/**
 * Error message if pyramid generation fails
 */
export interface PyramidErrorMessage {
  type: 'PYRAMID_ERROR';
  assetId: string;
  error: string;
}

/** Union type for all pyramid-related messages */
export type PyramidWorkerMessage =
  | GeneratePyramidMessage
  | PyramidProgressMessage
  | PyramidCompleteMessage
  | PyramidErrorMessage;

/** Union type for all worker messages */
export type TileWorkerMessage =
  | TileWorkerProgress
  | TileWorkerResult
  | TileWorkerError
  | PyramidProgressMessage
  | PyramidCompleteMessage
  | PyramidErrorMessage;

// ============================================================================
// Tile Storage Types (forward declarations for 3.4)
// ============================================================================

/**
 * Storage interface for tile persistence
 * (Will be fully implemented in Phase 3.4)
 */
interface TileStorage {
  saveTile(assetId: string, tileKey: string, blob: Blob): Promise<void>;
  saveDescriptor(assetId: string, descriptor: TilePyramidDescriptor): Promise<void>;
  hasPyramid(assetId: string): Promise<boolean>;
  getTile(assetId: string, tileKey: string): Promise<Blob | undefined>;
  getDescriptor(assetId: string): Promise<TilePyramidDescriptor | undefined>;
  deletePyramid(assetId: string): Promise<void>;
}

// ============================================================================
// Worker Script (Legacy Derivative Generation)
// ============================================================================

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

// Register cleanup function for the blob URL (Phase 1 Memory Leak Fix)
registerWorkerUrlCleanup(() => {
  try {
    URL.revokeObjectURL(workerUrl);
  } catch (e) {
    console.warn('[tileWorker] Failed to revoke worker blob URL:', e);
  }
});

// Optional: Auto-cleanup on page unload
if (typeof window !== 'undefined' && isWorkerCleanupEnabled()) {
  window.addEventListener('beforeunload', cleanupWorkerBlobUrl, { once: true });
}

// Worker task with priority support
interface WorkerTask {
  request: TileWorkerRequest;
  resolve: Function;
  reject: Function;
  priority: number; // Higher = more important
  timestamp: number;
}

/**
 * TileWorker - Manages tile pyramid generation using CanvasTilePipeline
 *
 * This class provides a high-level API for generating IIIF tile pyramids
 * with support for:
 * - Progress tracking via callbacks
 * - Cancellation via AbortController
 * - Integration with tile storage
 * - Error handling and recovery
 */
export class TileWorker {
  private pipeline: CanvasTilePipeline;
  private abortControllers: Map<string, AbortController>;
  private storage: TileStorage | null;

  /**
   * Creates a new TileWorker instance
   *
   * @param storage - Optional tile storage implementation
   */
  constructor(storage: TileStorage | null = null) {
    this.pipeline = createCanvasTilePipeline();
    this.abortControllers = new Map();
    this.storage = storage;
  }

  /**
   * Handle GENERATE_PYRAMID message
   *
   * Generates a complete tile pyramid for the given image blob.
   * Reports progress via callbacks and stores tiles in the configured storage.
   *
   * @param assetId - Unique identifier for the asset
   * @param imageBlob - Image data as Blob
   * @param config - Optional partial pyramid configuration
   * @returns Promise that resolves when generation is complete
   * @throws Error if generation fails or is cancelled
   *
   * @example
   * ```typescript
   * const worker = new TileWorker(storage);
   * await worker.handleGeneratePyramid('asset-123', imageBlob, { tileSize: 512 });
   * ```
   */
  async handleGeneratePyramid(
    assetId: string,
    imageBlob: Blob,
    config?: Partial<TilePyramidConfig>
  ): Promise<void> {
    // Cancel any existing generation for this asset
    this.cancelPyramidGeneration(assetId);

    // Create new abort controller for this generation
    const abortController = new AbortController();
    this.abortControllers.set(assetId, abortController);

    try {
      // Create pipeline with progress callback and abort signal
      const pipeline = createCanvasTilePipeline(config, {
        quality: 0.85,
        signal: abortController.signal,
        onProgress: (progress) => {
          // Report progress via callback or event
          this.onPyramidProgress(assetId, progress);
        },
        onTileGenerated: async (level, x, y, blob) => {
          // Store the tile if storage is available
          if (this.storage) {
            const tileKey = `${level}/${x}_${y}.jpg`;
            await this.storage.saveTile(assetId, tileKey, blob);
          }
        },
      });

      // Generate the pyramid
      const result = await pipeline.generateTilePyramid(imageBlob, assetId);

      // Check if generation was cancelled
      if (abortController.signal.aborted) {
        throw new Error('Tile generation cancelled');
      }

      if (!result) {
        // Generation was skipped (image too small)
        this.onPyramidComplete(assetId, {
          width: 0,
          height: 0,
          tileSize: config?.tileSize || 512,
          overlap: config?.overlap || 0,
          levels: 0,
          format: config?.format || 'jpg',
        }, 0);
        return;
      }

      // Store the descriptor if storage is available
      if (this.storage) {
        await this.storage.saveDescriptor(assetId, result.descriptor);
      }

      // Report completion
      this.onPyramidComplete(assetId, result.descriptor, result.totalTiles);
    } catch (error) {
      // Check if this was a cancellation
      if (abortController.signal.aborted) {
        this.onPyramidError(assetId, 'Tile generation cancelled');
      } else {
        this.onPyramidError(
          assetId,
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    } finally {
      // Clean up abort controller
      this.abortControllers.delete(assetId);
    }
  }

  /**
   * Cancel pyramid generation for an asset
   *
   * @param assetId - Unique identifier for the asset
   */
  cancelPyramidGeneration(assetId: string): void {
    const controller = this.abortControllers.get(assetId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(assetId);
    }
  }

  /**
   * Cancel all ongoing pyramid generations
   */
  cancelAllPyramidGenerations(): void {
    for (const [assetId, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  /**
   * Check if pyramid exists in storage
   *
   * @param assetId - Unique identifier for the asset
   * @returns Promise resolving to true if pyramid exists
   */
  async hasPyramid(assetId: string): Promise<boolean> {
    if (!this.storage) {
      return false;
    }
    return this.storage.hasPyramid(assetId);
  }

  /**
   * Get the current generation status for an asset
   *
   * @param assetId - Unique identifier for the asset
   * @returns True if generation is in progress
   */
  isGenerating(assetId: string): boolean {
    return this.abortControllers.has(assetId);
  }

  /**
   * Get all assets currently being generated
   *
   * @returns Array of asset IDs
   */
  getGeneratingAssets(): string[] {
    return Array.from(this.abortControllers.keys());
  }

  /**
   * Progress callback - override or set to receive progress updates
   */
  onPyramidProgress(assetId: string, progress: TileGenerationProgress): void {
    // Default implementation - can be overridden by subclasses
    // or used to dispatch custom events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pyramid-progress', {
          detail: { assetId, progress },
        })
      );
    }
  }

  /**
   * Completion callback - override or set to receive completion notifications
   */
  onPyramidComplete(
    assetId: string,
    descriptor: TilePyramidDescriptor,
    totalTiles: number
  ): void {
    // Default implementation - can be overridden by subclasses
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pyramid-complete', {
          detail: { assetId, descriptor, totalTiles },
        })
      );
    }
  }

  /**
   * Error callback - override or set to receive error notifications
   */
  onPyramidError(assetId: string, error: string): void {
    // Default implementation - can be overridden by subclasses
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pyramid-error', {
          detail: { assetId, error },
        })
      );
    }
  }

  /**
   * Dispose of the worker and clean up resources
   */
  dispose(): void {
    this.cancelAllPyramidGenerations();
    this.storage = null;
  }
}

// ============================================================================
// Legacy TileWorkerPool (for derivative generation)
// ============================================================================

/**
 * TileWorkerPool - Manages a pool of web workers for parallel derivative generation
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

// Singleton TileWorker instance
let tileWorker: TileWorker | null = null;

/**
 * Get the singleton TileWorker instance
 *
 * @param storage - Optional tile storage implementation
 * @returns TileWorker instance
 */
export function getTileWorker(storage?: TileStorage): TileWorker {
  if (!tileWorker) {
    tileWorker = new TileWorker(storage || null);
  }
  return tileWorker;
}

/**
 * Reset the singleton TileWorker instance
 * Useful for testing or when storage implementation changes
 */
export function resetTileWorker(): void {
  tileWorker?.dispose();
  tileWorker = null;
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
 * Generate a tile pyramid for an image (convenience function)
 *
 * @param assetId - Unique identifier for the asset
 * @param imageBlob - Image data as Blob
 * @param config - Optional pyramid configuration
 * @param storage - Optional tile storage implementation
 * @returns Promise that resolves when generation is complete
 */
export async function generateTilePyramidAsync(
  assetId: string,
  imageBlob: Blob,
  config?: Partial<TilePyramidConfig>,
  storage?: TileStorage
): Promise<void> {
  const worker = getTileWorker(storage);
  return worker.handleGeneratePyramid(assetId, imageBlob, config);
}

/**
 * Cancel ongoing pyramid generation for an asset
 *
 * @param assetId - Unique identifier for the asset
 */
export function cancelTilePyramidGeneration(assetId: string): void {
  tileWorker?.cancelPyramidGeneration(assetId);
}

/**
 * Check if a pyramid exists for an asset
 *
 * @param assetId - Unique identifier for the asset
 * @param storage - Tile storage implementation
 * @returns Promise resolving to true if pyramid exists
 */
export async function hasTilePyramid(
  assetId: string,
  storage: TileStorage
): Promise<boolean> {
  return storage.hasPyramid(assetId);
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
