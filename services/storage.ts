
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { IIIFItem } from '../types';
import { IngestCheckpoint } from './ingestState';

export const DB_NAME = 'biiif-archive-db';
export const FILES_STORE = 'files';
export const PROJECT_STORE = 'project';
export const DERIVATIVES_STORE = 'derivatives'; // New store for Level 0 images
export const CHECKPOINTS_STORE = 'checkpoints'; // For resumable imports
export const TILES_STORE = 'tiles'; // For tile pyramid images
export const TILE_MANIFESTS_STORE = 'tileManifests'; // For tile pyramid metadata

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
    value: IIIFItem;
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
}

export interface StorageEstimate {
  usage: number;
  quota: number;
  usageDetails?: any;
}

export interface StorageWarning {
  type: 'quota_warning' | 'quota_critical' | 'save_failed';
  message: string;
  usagePercent: number;
}

// Threshold for storage warnings (90% = warning, 95% = critical)
const STORAGE_WARNING_THRESHOLD = 0.9;
const STORAGE_CRITICAL_THRESHOLD = 0.95;

class StorageService {
  private _dbPromise: Promise<IDBPDatabase<BiiifDB>> | null = null;
  private _warningCallback: ((warning: StorageWarning) => void) | null = null;
  private _lastWarningTime = 0;
  private _warningCooldown = 60000; // Only warn once per minute

  constructor() {
    this._initDB();
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
      this._dbPromise = openDB<BiiifDB>(DB_NAME, 4, {
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
        },
        blocked: () => {
            console.warn('IDB blocked: Another connection is open with an older version.');
        },
        blocking: () => {
            console.warn('IDB blocking: A new version is trying to open. Closing this connection.');
            this._dbPromise = null; 
        },
        terminated: () => {
            console.error('IDB terminated: Browser closed the connection.');
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
      const db = await this.getDB();
      await db.put(FILES_STORE, file, id);
    });
  }

  async saveDerivative(id: string, sizeKey: 'thumb' | 'small' | 'medium', blob: Blob): Promise<void> {
    const db = await this.getDB();
    await db.put(DERIVATIVES_STORE, blob, `${id}_${sizeKey}`);
  }

  async getAsset(id: string): Promise<Blob | undefined> {
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
      await db.put(PROJECT_STORE, root, 'root');
    });
  }

  async loadProject(): Promise<IIIFItem | undefined> {
    const db = await this.getDB();
    try {
        return await db.get(PROJECT_STORE, 'root');
    } catch (e) {
        console.error("Failed to load project from IDB", e);
        return undefined;
    }
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    await db.clear(FILES_STORE);
    await db.clear(DERIVATIVES_STORE);
    await db.clear(PROJECT_STORE);
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
    return await db.getAllKeys(FILES_STORE);
  }

  /**
   * Delete a specific asset
   */
  async deleteAsset(id: string): Promise<void> {
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
