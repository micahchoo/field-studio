
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { IIIFItem } from '../types';

export const DB_NAME = 'biiif-archive-db';
export const FILES_STORE = 'files';
export const PROJECT_STORE = 'project';
export const DERIVATIVES_STORE = 'derivatives'; // New store for Level 0 images

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
      this._dbPromise = openDB<BiiifDB>(DB_NAME, 2, { 
        upgrade(db, oldVersion) {
            if (oldVersion < 1) {
                db.createObjectStore(FILES_STORE);
                db.createObjectStore(PROJECT_STORE);
            }
            if (oldVersion < 2) {
                db.createObjectStore(DERIVATIVES_STORE);
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

  async saveAsset(file: File | Blob, id: string): Promise<void> {
    // Check storage quota before saving large assets
    const { ok, usagePercent } = await this.checkStorageQuota();
    if (!ok && usagePercent >= STORAGE_CRITICAL_THRESHOLD) {
      console.warn('Storage critically full, attempting to save asset anyway');
    }

    try {
      const db = await this.getDB();
      await db.put(FILES_STORE, file, id);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        if (this._warningCallback) {
          this._warningCallback({
            type: 'save_failed',
            message: `Failed to save asset: Storage quota exceeded. Free up space by exporting and clearing data.`,
            usagePercent: 1
          });
        }
      }
      throw error;
    }
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
    // Check storage quota before saving
    const { ok, usagePercent } = await this.checkStorageQuota();
    if (!ok && usagePercent >= STORAGE_CRITICAL_THRESHOLD) {
      // Still attempt save but warn user
      console.warn('Storage critically full, attempting save anyway');
    }

    try {
      const db = await this.getDB();
      await db.put(PROJECT_STORE, root, 'root');
    } catch (error) {
      // Check if it's a quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        if (this._warningCallback) {
          this._warningCallback({
            type: 'save_failed',
            message: 'Storage quota exceeded. Please export your data and clear storage.',
            usagePercent: 1
          });
        }
      }
      throw error;
    }
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
}

export const storage = new StorageService();
