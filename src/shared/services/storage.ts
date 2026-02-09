
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { IIIFItem, IngestCheckpoint } from '@/src/shared/types';
import { OPFSStorage } from './opfsStorage';
import { storageLog } from '@/src/shared/services/logger';

export const DB_NAME = 'biiif-archive-db';
export const FILES_STORE = 'files';
export const PROJECT_STORE = 'project';
export const DERIVATIVES_STORE = 'derivatives'; // New store for Level 0 images
export const CHECKPOINTS_STORE = 'checkpoints'; // For resumable imports
export const TILES_STORE = 'tiles'; // For tile pyramid images
export const TILE_MANIFESTS_STORE = 'tileManifests'; // For tile pyramid metadata
export const SEARCH_INDEX_STORE = 'searchIndex'; // For persisted search index

// ============================================================================
// Tile Storage Interfaces
// ============================================================================

/**
 * Metadata for a stored tile pyramid
 */
export interface TileManifest {
  assetId: string;
  levels: number;
  tileSize: number;
  overlap: number;
  format: string;
  width: number;
  height: number;
  totalTiles: number;
  createdAt: number;
}

/**
 * Storage interface for tile pyramid operations
 */
export interface TileStorage {
  /** Save a single tile blob */
  saveTile(assetId: string, level: number, x: number, y: number, blob: Blob): Promise<void>;
  /** Retrieve a single tile blob */
  getTile(assetId: string, level: number, x: number, y: number): Promise<Blob | null>;
  /** Save the manifest for a tile pyramid */
  saveTileManifest(manifest: TileManifest): Promise<void>;
  /** Retrieve the manifest for a tile pyramid */
  getTileManifest(assetId: string): Promise<TileManifest | null>;
  /** Check if a specific tile exists */
  hasTile(assetId: string, level: number, x: number, y: number): Promise<boolean>;
  /** Check if a complete pyramid exists for an asset */
  hasPyramid(assetId: string): Promise<boolean>;
  /** Delete all tiles and manifest for an asset */
  deletePyramid(assetId: string): Promise<void>;
  /** List all stored pyramid manifests */
  listPyramids(): Promise<TileManifest[]>;
  /** Get storage statistics for tiles */
  getTileStats(): Promise<{ totalTiles: number; totalSize: number; pyramidCount: number }>;
}

interface BiiifDB extends DBSchema {
  files: {
    key: string;
    value: Blob;
  };
  derivatives: {
    key: string; // Format: {identifier}_{sizeKey} e.g. "image123_thumb"
    value: Blob;
  };
  project: {
    key: string;
    value: IIIFItem | Blob; // Blob for gzip-compressed JSON, IIIFItem for legacy uncompressed
  };
  checkpoints: {
    key: string;
    value: IngestCheckpoint;
  };
  tiles: {
    key: string; // Format: {assetId}/{level}/{x}_{y}.{format}
    value: Blob;
  };
  tileManifests: {
    key: string; // Format: {assetId}_manifest
    value: TileManifest;
  };
  searchIndex: {
    key: string;
    value: unknown; // Serialized search index data
  };
}

export interface StorageEstimate {
  usage: number;
  quota: number;
  usageDetails?: Record<string, number>;
}

export interface DetailedStorageEstimate extends StorageEstimate {
  persistent: boolean;
  stores: Record<string, { keys: number; estimatedSize?: number }>;
}

export interface StorageWarning {
  type: 'quota_warning' | 'quota_critical' | 'save_failed';
  message: string;
  usagePercent: number;
}

// Threshold for storage warnings (90% = warning, 95% = critical)
const STORAGE_WARNING_THRESHOLD = 0.9;
const STORAGE_CRITICAL_THRESHOLD = 0.95;

// Files larger than this go to OPFS instead of IndexedDB
const OPFS_THRESHOLD = 10 * 1024 * 1024; // 10MB

class StorageService {
  private _dbPromise: Promise<IDBPDatabase<BiiifDB>> | null = null;
  private _warningCallback: ((warning: StorageWarning) => void) | null = null;
  private _lastWarningTime = 0;
  private _warningCooldown = 60000; // Only warn once per minute
  private _opfs: OPFSStorage | null = null;
  private _compressionWorker: Worker | null = null;
  private _compressionMsgId = 0;

  constructor() {
    this._initDB();
    this._initOPFS();
  }

  /**
   * Lazy-init compression worker
   */
  private _getCompressionWorker(): Worker | null {
    if (this._compressionWorker) return this._compressionWorker;
    try {
      this._compressionWorker = new Worker(
        new URL('@/src/shared/workers/compression.worker.ts', import.meta.url),
        { type: 'module' }
      );
      return this._compressionWorker;
    } catch {
      return null;
    }
  }

  private _initOPFS(): void {
    if (!OPFSStorage.isSupported()) return;
    const opfs = new OPFSStorage();
    opfs.initialize().then((ok) => {
      if (ok) this._opfs = opfs;
    }).catch(() => {});
  }

  /**
   * Request persistent storage to prevent browser from evicting data under storage pressure.
   * Fire-and-forget during initialization.
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (!navigator.storage?.persist) return false;
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) {
      storageLog.debug('[Storage] Persistent storage already granted');
      return true;
    }
    const granted = await navigator.storage.persist();
    storageLog.debug(`[Storage] Persistent storage ${granted ? 'granted' : 'denied'}`);
    return granted;
  }

  // Set a callback to receive storage warnings
  setWarningCallback(callback: (warning: StorageWarning) => void): void {
    this._warningCallback = callback;
  }

  // Check storage quota and emit warning if necessary
  async checkStorageQuota(): Promise<{ ok: boolean; usagePercent: number }> {
    const estimate = await this.getEstimate();
    if (!estimate || estimate.quota === 0) {
      return { ok: true, usagePercent: 0 };
    }

    const usagePercent = estimate.usage / estimate.quota;
    const now = Date.now();

    if (usagePercent >= STORAGE_CRITICAL_THRESHOLD) {
      if (now - this._lastWarningTime > this._warningCooldown && this._warningCallback) {
        this._lastWarningTime = now;
        this._warningCallback({
          type: 'quota_critical',
          message: `Storage is ${Math.round(usagePercent * 100)}% full. Export your data immediately to prevent data loss.`,
          usagePercent
        });
      }
      return { ok: false, usagePercent };
    }

    if (usagePercent >= STORAGE_WARNING_THRESHOLD) {
      if (now - this._lastWarningTime > this._warningCooldown && this._warningCallback) {
        this._lastWarningTime = now;
        this._warningCallback({
          type: 'quota_warning',
          message: `Storage is ${Math.round(usagePercent * 100)}% full. Consider exporting your data.`,
          usagePercent
        });
      }
    }

    return { ok: true, usagePercent };
  }

  private _initDB() {
      this._dbPromise = openDB<BiiifDB>(DB_NAME, 5, {
        upgrade(db, oldVersion) {
            if (oldVersion < 1) {
                db.createObjectStore(FILES_STORE);
                db.createObjectStore(PROJECT_STORE);
            }
            if (oldVersion < 2) {
                db.createObjectStore(DERIVATIVES_STORE);
            }
            if (oldVersion < 3) {
                db.createObjectStore(CHECKPOINTS_STORE);
            }
            if (oldVersion < 4) {
                // Add tile storage for image pyramid support
                db.createObjectStore(TILES_STORE);
                db.createObjectStore(TILE_MANIFESTS_STORE);
            }
            if (oldVersion < 5) {
                // Add search index persistence store
                db.createObjectStore(SEARCH_INDEX_STORE);
            }
        },
        blocked: () => {
            storageLog.warn('IDB blocked: Another connection is open with an older version.');
        },
        blocking: () => {
            storageLog.warn('IDB blocking: A new version is trying to open. Closing this connection.');
            this._dbPromise = null; 
        },
        terminated: () => {
            storageLog.error('IDB terminated: Browser closed the connection.');
            this._dbPromise = null;
        }
      });
  }

  private async getDB(): Promise<IDBPDatabase<BiiifDB>> {
      if (!this._dbPromise) {
          this._initDB();
      }
      return this._dbPromise!;
  }

  /**
   * Compress project JSON to a gzip Blob for efficient storage.
   * Uses worker when available, falls back to main-thread streams.
   */
  private async _compressProject(root: IIIFItem): Promise<Blob> {
    const json = JSON.stringify(root);
    const worker = this._getCompressionWorker();

    if (worker) {
      try {
        const id = ++this._compressionMsgId;
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const handler = (e: MessageEvent) => {
            if (e.data.id !== id) return;
            worker.removeEventListener('message', handler);
            if (e.data.type === 'error') reject(new Error(e.data.error));
            else resolve(e.data.data as ArrayBuffer);
          };
          worker.addEventListener('message', handler);
          worker.postMessage({ type: 'compress', data: json, id });
        });
        return new Blob([arrayBuffer], { type: 'application/gzip' });
      } catch {
        // Fall through to synchronous path
      }
    }

    // Fallback: main-thread compression
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(stream).blob();
  }

  /**
   * Decompress a gzip Blob back to a project object.
   * Uses worker when available, falls back to main-thread streams.
   */
  private async _decompressProject(blob: Blob): Promise<IIIFItem> {
    const worker = this._getCompressionWorker();

    if (worker) {
      try {
        const id = ++this._compressionMsgId;
        const arrayBuffer = await blob.arrayBuffer();
        const text = await new Promise<string>((resolve, reject) => {
          const handler = (e: MessageEvent) => {
            if (e.data.id !== id) return;
            worker.removeEventListener('message', handler);
            if (e.data.type === 'error') reject(new Error(e.data.error));
            else resolve(e.data.data as string);
          };
          worker.addEventListener('message', handler);
          worker.postMessage({ type: 'decompress', data: arrayBuffer, id }, [arrayBuffer]);
        });
        return JSON.parse(text);
      } catch {
        // Fall through to synchronous path — re-fetch blob since arrayBuffer consumed it
      }
    }

    // Fallback: main-thread decompression
    const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(stream).text();
    return JSON.parse(text);
  }

  /**
   * Wraps a save operation with storage quota checking and error handling
   */
  private async saveWithQuotaCheck<T>(
    operation: string,
    saveFn: () => Promise<T>
  ): Promise<T> {
    // Pre-check quota
    const { ok, usagePercent } = await this.checkStorageQuota();
    if (!ok && usagePercent >= STORAGE_CRITICAL_THRESHOLD) {
      const error = new DOMException(
        `Storage quota exceeded: Cannot ${operation}. Please export and clear data.`,
        'QuotaExceededError'
      );
      this._warningCallback?.({
        type: 'save_failed',
        message: `Failed to ${operation}: Storage quota exceeded. Export your data to free up space.`,
        usagePercent
      });
      throw error;
    }

    try {
      return await saveFn();
    } catch (error) {
      if (error instanceof DOMException && 
          (error.name === 'QuotaExceededError' || error.message?.includes('quota'))) {
        this._warningCallback?.({
          type: 'save_failed',
          message: `Failed to ${operation}: Storage quota exceeded. Export your data to free up space.`,
          usagePercent: 1
        });
      }
      throw error;
    }
  }

  /**
   * Force check if storage is critically full without cooldown
   */
  async isStorageCriticallyFull(): Promise<{ full: boolean; usagePercent: number }> {
    const estimate = await this.getEstimate();
    if (!estimate || estimate.quota === 0) {
      return { full: false, usagePercent: 0 };
    }
    const usagePercent = estimate.usage / estimate.quota;
    return { full: usagePercent >= STORAGE_CRITICAL_THRESHOLD, usagePercent };
  }

  async saveAsset(file: File | Blob, id: string): Promise<void> {
    return this.saveWithQuotaCheck('save asset', async () => {
      // Route large files to OPFS for better performance
      if (this._opfs?.isReady && file.size >= OPFS_THRESHOLD) {
        await this._opfs.storeFile(id, file);
        return;
      }
      const db = await this.getDB();
      await db.put(FILES_STORE, file, id);
    });
  }

  async saveDerivative(id: string, sizeKey: 'thumb' | 'small' | 'medium', blob: Blob): Promise<void> {
    const db = await this.getDB();
    await db.put(DERIVATIVES_STORE, blob, `${id}_${sizeKey}`);
  }

  async getAsset(id: string): Promise<Blob | undefined> {
    // Try OPFS first (large files)
    if (this._opfs?.isReady) {
      const file = await this._opfs.getFile(id);
      if (file) return file;
    }
    // Fall back to IndexedDB
    const db = await this.getDB();
    return await db.get(FILES_STORE, id);
  }

  async getDerivative(id: string, sizeKey: string): Promise<Blob | undefined> {
    const db = await this.getDB();
    return await db.get(DERIVATIVES_STORE, `${id}_${sizeKey}`);
  }

  async saveProject(root: IIIFItem): Promise<void> {
    return this.saveWithQuotaCheck('save project', async () => {
      const db = await this.getDB();
      try {
        // Compress project JSON with gzip for storage savings
        // JSON.stringify happens on main thread (fast), compression happens in worker
        const compressed = await this._compressProject(root);
        await db.put(PROJECT_STORE, compressed, 'root');
      } catch (error) {
        // Handle read-only mode error
        if (error instanceof DOMException && error.name === 'ReadOnlyError') {
          this._warningCallback?.({
            type: 'save_failed',
            message: 'Database is in read-only mode. Storage quota may be exceeded. Export your data immediately to prevent loss.',
            usagePercent: 1
          });
        }
        throw error;
      }
    });
  }

  /**
   * Save project from a pre-stringified JSON (skips redundant stringify).
   * Used by the optimistic save pipeline when the JSON string is already available.
   */
  async saveProjectFromJson(json: string): Promise<void> {
    return this.saveWithQuotaCheck('save project', async () => {
      const db = await this.getDB();
      const worker = this._getCompressionWorker();

      let compressed: Blob;
      if (worker) {
        try {
          const id = ++this._compressionMsgId;
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const handler = (e: MessageEvent) => {
              if (e.data.id !== id) return;
              worker.removeEventListener('message', handler);
              if (e.data.type === 'error') reject(new Error(e.data.error));
              else resolve(e.data.data as ArrayBuffer);
            };
            worker.addEventListener('message', handler);
            worker.postMessage({ type: 'compress', data: json, id });
          });
          compressed = new Blob([arrayBuffer], { type: 'application/gzip' });
        } catch {
          const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
          compressed = await new Response(stream).blob();
        }
      } else {
        const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
        compressed = await new Response(stream).blob();
      }

      await db.put(PROJECT_STORE, compressed, 'root');
    });
  }

  async loadProject(): Promise<IIIFItem | undefined> {
    const db = await this.getDB();
    try {
        const stored = await db.get(PROJECT_STORE, 'root');
        if (!stored) return undefined;

        // Handle compressed (Blob) vs legacy uncompressed (plain object)
        if (stored instanceof Blob) {
          return await this._decompressProject(stored);
        }
        // Legacy uncompressed - return as-is
        return stored as IIIFItem;
    } catch (e) {
        storageLog.error("Failed to load project from IDB", e instanceof Error ? e : undefined);
        return undefined;
    }
  }

  async clearDerivatives(): Promise<number> {
    const db = await this.getDB();
    const allKeys = await db.getAllKeys(DERIVATIVES_STORE);
    for (const key of allKeys) {
      await db.delete(DERIVATIVES_STORE, key);
    }
    return allKeys.length;
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    await db.clear(FILES_STORE);
    await db.clear(DERIVATIVES_STORE);
    await db.clear(PROJECT_STORE);
    // Clear OPFS files too
    if (this._opfs?.isReady) {
      const ids = await this._opfs.listFiles();
      for (const id of ids) {
        await this._opfs.deleteFile(id);
      }
    }
  }

  async getEstimate(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
            usage: estimate.usage || 0,
            quota: estimate.quota || 0
        };
      } catch (e) {
          return null;
      }
    }
    return null;
  }

  /**
   * Get the number of keys in a given object store.
   */
  async getStoreKeyCount(storeName: 'files' | 'derivatives' | 'project' | 'checkpoints' | 'tiles' | 'tileManifests'): Promise<number> {
    const db = await this.getDB();
    const keys = await db.getAllKeys(storeName as any);
    return keys.length;
  }

  /**
   * Get a detailed storage breakdown including per-store key counts,
   * persistent storage status, and browser-provided usage details.
   */
  async getDetailedEstimate(): Promise<DetailedStorageEstimate | null> {
    const base = await this.getEstimate();
    if (!base) return null;

    const persistent = navigator.storage?.persisted
      ? await navigator.storage.persisted()
      : false;

    // Fetch browser-provided usageDetails if available
    let usageDetails: Record<string, number> | undefined;
    try {
      const raw = await navigator.storage.estimate();
      if ((raw as any).usageDetails) {
        usageDetails = (raw as any).usageDetails;
      }
    } catch {
      // Not supported in all browsers
    }

    // Per-store key counts (lightweight - just counting keys, not reading blobs)
    const storeNames = [FILES_STORE, DERIVATIVES_STORE, PROJECT_STORE, CHECKPOINTS_STORE, TILES_STORE, TILE_MANIFESTS_STORE, SEARCH_INDEX_STORE] as const;
    const stores: Record<string, { keys: number }> = {};
    for (const name of storeNames) {
      try {
        stores[name] = { keys: await this.getStoreKeyCount(name as any) };
      } catch {
        stores[name] = { keys: 0 };
      }
    }

    return {
      ...base,
      usageDetails,
      persistent,
      stores,
    };
  }

  /**
   * Load a specific resource by ID from the project tree
   * Supports virtualized data loading
   */
  async loadResource(id: string): Promise<IIIFItem | null> {
    const root = await this.loadProject();
    if (!root) return null;

    const findById = (node: IIIFItem): IIIFItem | null => {
      if (node.id === id) return node;
      const children = (node as any).items || (node as any).annotations || [];
      for (const child of children) {
        if (child && typeof child === 'object') {
          const found = findById(child);
          if (found) return found;
        }
      }
      return null;
    };

    return findById(root);
  }

  /**
   * Save a specific resource back to the project tree
   * Supports incremental updates
   */
  async saveResource(id: string, updates: Partial<IIIFItem>): Promise<boolean> {
    const root = await this.loadProject();
    if (!root) return false;

    const updateById = (node: IIIFItem): boolean => {
      if (node.id === id) {
        Object.assign(node, updates);
        return true;
      }
      const children = (node as any).items || (node as any).annotations || [];
      for (const child of children) {
        if (child && typeof child === 'object') {
          if (updateById(child)) return true;
        }
      }
      return false;
    };

    if (updateById(root)) {
      await this.saveProject(root);
      return true;
    }
    return false;
  }

  /**
   * Get all asset IDs stored in the database
   */
  async getAllAssetIds(): Promise<string[]> {
    const db = await this.getDB();
    const idbKeys = await db.getAllKeys(FILES_STORE);
    // Merge in OPFS file IDs (deduped)
    if (this._opfs?.isReady) {
      const opfsIds = await this._opfs.listFiles();
      const all = new Set([...idbKeys, ...opfsIds]);
      return [...all];
    }
    return idbKeys;
  }

  /**
   * Delete a specific asset
   */
  async deleteAsset(id: string): Promise<void> {
    // Delete from OPFS (no-op if not there)
    if (this._opfs?.isReady) {
      await this._opfs.deleteFile(id);
    }
    // Delete from IndexedDB
    const db = await this.getDB();
    await db.delete(FILES_STORE, id);
    // Also delete derivatives
    const derivativeKeys = ['thumb', 'small', 'medium'];
    for (const key of derivativeKeys) {
      await db.delete(DERIVATIVES_STORE, `${id}_${key}`);
    }
  }

  // ============================================================================
  // Checkpoint Methods (for resumable imports)
  // ============================================================================

  /**
   * Save an import checkpoint
   */
  async saveCheckpoint(id: string, checkpoint: IngestCheckpoint): Promise<void> {
    const db = await this.getDB();
    await db.put(CHECKPOINTS_STORE, checkpoint, id);
  }

  /**
   * Load an import checkpoint
   */
  async loadCheckpoint(id: string): Promise<IngestCheckpoint | null> {
    const db = await this.getDB();
    return await db.get(CHECKPOINTS_STORE, id) || null;
  }

  /**
   * List all checkpoints
   */
  async listCheckpoints(): Promise<IngestCheckpoint[]> {
    const db = await this.getDB();
    return await db.getAll(CHECKPOINTS_STORE);
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(CHECKPOINTS_STORE, id);
  }

  /**
   * Clear all checkpoints
   */
  async clearAllCheckpoints(): Promise<void> {
    const db = await this.getDB();
    await db.clear(CHECKPOINTS_STORE);
  }

  // ============================================================================
  // Search Index Persistence
  // ============================================================================

  /**
   * Save serialized search index data to IDB
   */
  async saveSearchIndex(data: { itemCount: number; serialized: unknown }): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(SEARCH_INDEX_STORE, data, 'main');
    } catch {
      // Non-critical — search will rebuild from scratch
    }
  }

  /**
   * Load persisted search index data from IDB
   */
  async loadSearchIndex(): Promise<{ itemCount: number; serialized: unknown } | null> {
    try {
      const db = await this.getDB();
      const data = await db.get(SEARCH_INDEX_STORE, 'main');
      return (data as { itemCount: number; serialized: unknown }) || null;
    } catch {
      return null;
    }
  }

  /**
   * Clear persisted search index
   */
  async clearSearchIndex(): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(SEARCH_INDEX_STORE, 'main');
    } catch {
      // Non-critical
    }
  }

  // ============================================================================
  // Tile Storage Methods (for image pyramid support)
  // ============================================================================

  /**
   * Generate a tile key in the format: {assetId}/{level}/{x}_{y}.{format}
   * Note: format is determined from the manifest
   */
  private _getTileKey(assetId: string, level: number, x: number, y: number, format: string = 'jpg'): string {
    return `${assetId}/${level}/${x}_${y}.${format}`;
  }

  /**
   * Generate a manifest key in the format: {assetId}_manifest
   */
  private _getManifestKey(assetId: string): string {
    return `${assetId}_manifest`;
  }

  /**
   * Save a single tile blob to storage
   */
  async saveTile(
    assetId: string,
    level: number,
    x: number,
    y: number,
    blob: Blob
  ): Promise<void> {
    return this.saveWithQuotaCheck('save tile', async () => {
      const db = await this.getDB();
      // Extract format from blob type or default to jpg
      const format = blob.type?.includes('png') ? 'png' : 'jpg';
      const key = this._getTileKey(assetId, level, x, y, format);
      await db.put(TILES_STORE, blob, key);
    });
  }

  /**
   * Retrieve a single tile blob from storage
   */
  async getTile(
    assetId: string,
    level: number,
    x: number,
    y: number
  ): Promise<Blob | null> {
    const db = await this.getDB();
    // Try to get manifest first to determine format
    const manifest = await this.getTileManifest(assetId);
    const format = manifest?.format || 'jpg';
    const key = this._getTileKey(assetId, level, x, y, format);
    const blob = await db.get(TILES_STORE, key);
    return blob || null;
  }

  /**
   * Save the manifest for a tile pyramid
   */
  async saveTileManifest(manifest: TileManifest): Promise<void> {
    return this.saveWithQuotaCheck('save tile manifest', async () => {
      const db = await this.getDB();
      const key = this._getManifestKey(manifest.assetId);
      await db.put(TILE_MANIFESTS_STORE, manifest, key);
    });
  }

  /**
   * Retrieve the manifest for a tile pyramid
   */
  async getTileManifest(assetId: string): Promise<TileManifest | null> {
    const db = await this.getDB();
    const key = this._getManifestKey(assetId);
    const manifest = await db.get(TILE_MANIFESTS_STORE, key);
    return manifest || null;
  }

  /**
   * Check if a specific tile exists in storage
   */
  async hasTile(
    assetId: string,
    level: number,
    x: number,
    y: number
  ): Promise<boolean> {
    const db = await this.getDB();
    const manifest = await this.getTileManifest(assetId);
    const format = manifest?.format || 'jpg';
    const key = this._getTileKey(assetId, level, x, y, format);
    const blob = await db.get(TILES_STORE, key);
    return blob !== undefined;
  }

  /**
   * Check if a complete pyramid exists for an asset
   */
  async hasPyramid(assetId: string): Promise<boolean> {
    const manifest = await this.getTileManifest(assetId);
    return manifest !== null;
  }

  /**
   * Delete all tiles and manifest for an asset
   */
  async deletePyramid(assetId: string): Promise<void> {
    const db = await this.getDB();

    // Get all tile keys for this asset
    const allKeys = await db.getAllKeys(TILES_STORE);
    const assetTileKeys = allKeys.filter(key =>
      typeof key === 'string' && key.startsWith(`${assetId}/`)
    );

    // Delete all tiles for this asset
    for (const key of assetTileKeys) {
      await db.delete(TILES_STORE, key);
    }

    // Delete the manifest
    await db.delete(TILE_MANIFESTS_STORE, this._getManifestKey(assetId));
  }

  /**
   * List all stored pyramid manifests
   */
  async listPyramids(): Promise<TileManifest[]> {
    const db = await this.getDB();
    return await db.getAll(TILE_MANIFESTS_STORE);
  }

  /**
   * Get storage statistics for tiles
   */
  async getTileStats(): Promise<{ totalTiles: number; totalSize: number; pyramidCount: number }> {
    const db = await this.getDB();

    // Get all tiles
    const allTileKeys = await db.getAllKeys(TILES_STORE);
    const tiles = await Promise.all(
      allTileKeys.map(key => db.get(TILES_STORE, key))
    );

    // Calculate total size
    let totalSize = 0;
    for (const blob of tiles) {
      if (blob && blob.size) {
        totalSize += blob.size;
      }
    }

    // Get pyramid count from manifests
    const manifests = await db.getAllKeys(TILE_MANIFESTS_STORE);

    return {
      totalTiles: tiles.length,
      totalSize,
      pyramidCount: manifests.length
    };
  }

  // ============================================================================
  // Tile Storage Interface (for external access)
  // ============================================================================

  /**
   * Get the tile storage interface for external components
   */
  get tiles(): TileStorage {
    return {
      saveTile: this.saveTile.bind(this),
      getTile: this.getTile.bind(this),
      saveTileManifest: this.saveTileManifest.bind(this),
      getTileManifest: this.getTileManifest.bind(this),
      hasTile: this.hasTile.bind(this),
      hasPyramid: this.hasPyramid.bind(this),
      deletePyramid: this.deletePyramid.bind(this),
      listPyramids: this.listPyramids.bind(this),
      getTileStats: this.getTileStats.bind(this),
    };
  }
}

export const storage = new StorageService();

// ============================================================================
// Convenience Exports for Testing
// ============================================================================

/** Open the database and return the DB instance */
export async function openDatabase(): Promise<IDBPDatabase<BiiifDB>> {
  // Access the private method through the instance
  return (storage as any).getDB();
}

/** Save a file to storage */
export async function saveFile(
  fileId: string, 
  blob: Blob, 
  metadata?: { name?: string; size?: number; type?: string; lastModified?: number; calculateHash?: boolean }
): Promise<string> {
  await storage.saveAsset(blob, fileId);
  return fileId;
}

/** Get a file from storage */
export async function getFile(fileId: string): Promise<{ blob: Blob; metadata: { name: string; type: string; size: number } } | null> {
  const blob = await storage.getAsset(fileId);
  if (!blob) return null;
  return {
    blob,
    metadata: {
      name: fileId,
      type: blob.type || 'application/octet-stream',
      size: blob.size
    }
  };
}

/** Delete a file from storage */
export async function deleteFile(fileId: string, options?: { deleteDerivatives?: boolean }): Promise<void> {
  await storage.deleteAsset(fileId);
}

/** List all files in storage */
export async function listFiles(filter?: { type?: string; sortBy?: string; order?: 'asc' | 'desc' }): Promise<Array<{ id: string; lastModified: number; size: number; type: string }>> {
  const ids = await storage.getAllAssetIds();
  const files = await Promise.all(
    ids.map(async (id) => {
      const blob = await storage.getAsset(id);
      return {
        id,
        lastModified: Date.now(),
        size: blob?.size || 0,
        type: blob?.type || 'application/octet-stream'
      };
    })
  );
  return files;
}

/** Save project data */
export async function saveProject(project: IIIFItem): Promise<void> {
  await storage.saveProject(project);
}

/** Get project data */
export async function getProject(): Promise<IIIFItem | null> {
  return await storage.loadProject() || null;
}

/** Check storage quota */
export async function checkStorageQuota(): Promise<{ usage: number; quota: number; percentUsed: number; warning?: string }> {
  const estimate = await storage.getEstimate();
  const usage = estimate?.usage || 0;
  const quota = estimate?.quota || 0;
  const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
  
  return {
    usage,
    quota,
    percentUsed,
    warning: percentUsed >= 90 ? 'Storage is getting full' : undefined
  };
}

/** Clear all data */
export async function clearAllData(): Promise<void> {
  await storage.clear();
}
