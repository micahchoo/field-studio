/**
 * Image Pipeline Store — Svelte 5 Runes Interface
 *
 * Reactive wrapper around tilePipeline for IIIF Image API 3.0 tile generation.
 * Manages the generation queue, progress tracking, and storage statistics.
 *
 * Usage:
 *   import { imagePipeline } from '@/src/shared/stores/imagePipeline.svelte';
 *
 *   imagePipeline.queue               // reactive queue of pending assets
 *   imagePipeline.activeJobs          // reactive list of in-progress generations
 *   imagePipeline.storageUsedBytes    // total tile storage used
 *   imagePipeline.enqueue(asset)      // add an asset to the generation queue
 *   imagePipeline.pause() / resume()  // pause/resume processing
 */

import type {
  TilePipelineConfig,
  TileGenerationProgress,
  TileManifest,
  PipelineQueueEntry,
} from '@/src/shared/types/image-pipeline';
import { DEFAULT_TILE_CONFIG } from '@/src/shared/types/image-pipeline';
import {
  generateTilesForAsset,
  shouldGenerateTiles,
  getTotalStorageUsed,
  evictTiles,
  deleteTilesForAsset,
  getAllTileManifests,
  estimateTotalTiles,
} from '@/src/shared/services/tilePipeline';

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

class ImagePipelineStore {
  // ── Queue ──
  #queue = $state<PipelineQueueEntry[]>([]);
  #activeJobs = $state<TileGenerationProgress[]>([]);

  // ── Config ──
  #config = $state<TilePipelineConfig>({ ...DEFAULT_TILE_CONFIG });

  // ── Storage stats ──
  #storageUsedBytes = $state(0);
  #totalTilesGenerated = $state(0);
  #manifests = $state<TileManifest[]>([]);

  // ── Processing state ──
  #paused = $state(false);
  #processing = $state(false);

  // ── Internal ──
  #abortController: AbortController | null = null;
  #initialized = false;

  // ──────────────────────────────────────────────
  // Getters — reactive reads
  // ──────────────────────────────────────────────

  /** Assets waiting to be processed */
  get queue(): readonly PipelineQueueEntry[] { return this.#queue; }

  /** Currently running generation jobs */
  get activeJobs(): readonly TileGenerationProgress[] { return this.#activeJobs; }

  /** Current pipeline config */
  get config(): Readonly<TilePipelineConfig> { return this.#config; }

  /** Total storage used by tiles (bytes) */
  get storageUsedBytes(): number { return this.#storageUsedBytes; }

  /** Human-readable storage string */
  get storageUsedLabel(): string {
    const bytes = this.#storageUsedBytes;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /** Total tiles across all assets */
  get totalTilesGenerated(): number { return this.#totalTilesGenerated; }

  /** All tile manifests (metadata per asset) */
  get manifests(): readonly TileManifest[] { return this.#manifests; }

  /** Whether the pipeline is paused */
  get paused(): boolean { return this.#paused; }

  /** Whether the pipeline is actively processing */
  get isProcessing(): boolean { return this.#processing; }

  /** Total assets queued + active */
  get pendingCount(): number { return this.#queue.length + this.#activeJobs.length; }

  // ──────────────────────────────────────────────
  // Initialization
  // ──────────────────────────────────────────────

  /** Load persisted state from IndexedDB */
  async initialize(): Promise<void> {
    if (this.#initialized) return;
    this.#initialized = true;

    try {
      const [storageUsed, manifests] = await Promise.all([
        getTotalStorageUsed(),
        getAllTileManifests(),
      ]);

      this.#storageUsedBytes = storageUsed;
      this.#manifests = manifests;
      this.#totalTilesGenerated = manifests.reduce(
        (sum, m) => sum + (m.status === 'complete' ? m.totalTiles : 0),
        0,
      );
    } catch {
      // IndexedDB unavailable
    }
  }

  // ──────────────────────────────────────────────
  // Queue Management
  // ──────────────────────────────────────────────

  /**
   * Add an asset to the generation queue.
   * Returns false if the asset shouldn't have tiles generated (too small, etc.)
   */
  enqueue(
    assetId: string,
    assetLabel: string,
    width: number,
    height: number,
    priority: PipelineQueueEntry['priority'] = 'normal',
  ): boolean {
    if (!shouldGenerateTiles(width, height, this.#config)) return false;

    // Skip if already queued or active
    if (this.#queue.some((e) => e.assetId === assetId)) return true;
    if (this.#activeJobs.some((j) => j.assetId === assetId)) return true;

    const estimatedTiles = estimateTotalTiles(
      width,
      height,
      this.#config.tileSize,
      this.#config.maxScaleFactors,
    );

    const entry: PipelineQueueEntry = {
      assetId,
      assetLabel,
      width,
      height,
      estimatedTiles,
      priority,
    };

    // Insert by priority
    const queue = [...this.#queue];
    if (priority === 'high') {
      queue.unshift(entry);
    } else if (priority === 'low') {
      queue.push(entry);
    } else {
      // Normal: insert before first 'low' entry
      const lowIdx = queue.findIndex((e) => e.priority === 'low');
      if (lowIdx >= 0) queue.splice(lowIdx, 0, entry);
      else queue.push(entry);
    }
    this.#queue = queue;

    // Auto-start processing if not paused
    if (!this.#paused && !this.#processing) {
      this.#processNext();
    }

    return true;
  }

  /** Remove an asset from the queue (before it starts processing) */
  dequeue(assetId: string): void {
    this.#queue = this.#queue.filter((e) => e.assetId !== assetId);
  }

  /** Clear the entire queue */
  clearQueue(): void {
    this.#queue = [];
  }

  // ──────────────────────────────────────────────
  // Processing Control
  // ──────────────────────────────────────────────

  /** Pause the pipeline (current jobs finish, no new ones start) */
  pause(): void {
    this.#paused = true;
  }

  /** Resume the pipeline */
  resume(): void {
    this.#paused = false;
    if (!this.#processing && this.#queue.length > 0) {
      this.#processNext();
    }
  }

  /** Cancel all active jobs and clear the queue */
  cancelAll(): void {
    this.#abortController?.abort();
    this.#abortController = null;
    this.#queue = [];
    this.#activeJobs = [];
    this.#processing = false;
  }

  // ──────────────────────────────────────────────
  // Config
  // ──────────────────────────────────────────────

  /** Update pipeline config */
  updateConfig(updates: Partial<TilePipelineConfig>): void {
    this.#config = { ...this.#config, ...updates };
  }

  /** Reset config to defaults */
  resetConfig(): void {
    this.#config = { ...DEFAULT_TILE_CONFIG };
  }

  // ──────────────────────────────────────────────
  // Storage Management
  // ──────────────────────────────────────────────

  /** Delete all tiles for an asset and free storage */
  async deleteTiles(assetId: string): Promise<void> {
    const freed = await deleteTilesForAsset(assetId);
    this.#storageUsedBytes = Math.max(0, this.#storageUsedBytes - freed);
    this.#manifests = this.#manifests.filter((m) => m.assetId !== assetId);
  }

  /** Run LRU eviction to free storage down to the budget */
  async runEviction(): Promise<number> {
    const budgetBytes = this.#config.maxMemoryMB * 1024 * 1024;
    const freed = await evictTiles(budgetBytes);
    this.#storageUsedBytes = await getTotalStorageUsed();
    return freed;
  }

  /** Refresh storage statistics from IndexedDB */
  async refreshStats(): Promise<void> {
    const [storageUsed, manifests] = await Promise.all([
      getTotalStorageUsed(),
      getAllTileManifests(),
    ]);
    this.#storageUsedBytes = storageUsed;
    this.#manifests = manifests;
    this.#totalTilesGenerated = manifests.reduce(
      (sum, m) => sum + (m.status === 'complete' ? m.totalTiles : 0),
      0,
    );
  }

  // ──────────────────────────────────────────────
  // Queries
  // ──────────────────────────────────────────────

  /** Check if an asset has tiles generated */
  getManifest(assetId: string): TileManifest | undefined {
    return this.#manifests.find((m) => m.assetId === assetId);
  }

  /** Check if an asset has complete tile coverage */
  hasCompleteTiles(assetId: string): boolean {
    const m = this.getManifest(assetId);
    return m?.status === 'complete';
  }

  // ──────────────────────────────────────────────
  // Internal — Processing Loop
  // ──────────────────────────────────────────────

  async #processNext(): Promise<void> {
    if (this.#paused || this.#queue.length === 0) {
      this.#processing = false;
      return;
    }

    this.#processing = true;

    // Dequeue the next entry
    const [entry, ...rest] = this.#queue;
    this.#queue = rest;

    this.#abortController = new AbortController();

    try {
      // Create ImageBitmap from the asset
      // The caller should provide the source image — for now, we fetch from the asset URL
      // In practice, this would be integrated with the ingest pipeline
      const source = await this.#loadImageBitmap(entry.assetId);
      if (!source) {
        // Skip this asset
        this.#processNext();
        return;
      }

      const manifest = await generateTilesForAsset(
        source,
        entry.assetId,
        entry.assetLabel,
        entry.width,
        entry.height,
        this.#config,
        (progress) => {
          this.#activeJobs = this.#activeJobs.map((j) =>
            j.assetId === entry.assetId ? progress : j,
          );
        },
        this.#abortController.signal,
      );

      source.close();

      // Update stats
      this.#storageUsedBytes += manifest.totalSize;
      this.#totalTilesGenerated += manifest.totalTiles;
      this.#manifests = [...this.#manifests, manifest];

      // Remove from active jobs
      this.#activeJobs = this.#activeJobs.filter((j) => j.assetId !== entry.assetId);

      // Check storage budget
      const budgetBytes = this.#config.maxMemoryMB * 1024 * 1024;
      if (this.#storageUsedBytes > budgetBytes) {
        await this.runEviction();
      }
    } catch {
      // Remove failed job from active
      this.#activeJobs = this.#activeJobs.filter((j) => j.assetId !== entry.assetId);
    }

    // Process next
    this.#processNext();
  }

  /** Load an ImageBitmap for an asset. Override-able for testing. */
  async #loadImageBitmap(assetId: string): Promise<ImageBitmap | null> {
    try {
      // Attempt to load from the IIIF Image service
      const resp = await fetch(`/iiif/image/${assetId}/full/max/0/default.jpg`);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return createImageBitmap(blob);
    } catch {
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // Reset
  // ──────────────────────────────────────────────

  /** Reset all state */
  reset(): void {
    this.cancelAll();
    this.#queue = [];
    this.#activeJobs = [];
    this.#storageUsedBytes = 0;
    this.#totalTilesGenerated = 0;
    this.#manifests = [];
    this.#paused = false;
    this.#initialized = false;
  }
}

/** Global singleton */
export const imagePipeline = new ImagePipelineStore();
