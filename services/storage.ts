
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

class StorageService {
  private dbPromise: Promise<IDBPDatabase<BiiifDB>>;

  constructor() {
    this.dbPromise = openDB<BiiifDB>(DB_NAME, 2, { // Bumped version
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore(FILES_STORE);
          db.createObjectStore(PROJECT_STORE);
        }
        if (oldVersion < 2) {
          db.createObjectStore(DERIVATIVES_STORE);
        }
      },
    });
  }

  async saveAsset(file: File | Blob, id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.put(FILES_STORE, file, id);
  }

  async saveDerivative(id: string, sizeKey: 'thumb' | 'small' | 'medium', blob: Blob): Promise<void> {
    const db = await this.dbPromise;
    await db.put(DERIVATIVES_STORE, blob, `${id}_${sizeKey}`);
  }

  async getAsset(id: string): Promise<Blob | undefined> {
    const db = await this.dbPromise;
    return await db.get(FILES_STORE, id);
  }

  async getDerivative(id: string, sizeKey: string): Promise<Blob | undefined> {
    const db = await this.dbPromise;
    return await db.get(DERIVATIVES_STORE, `${id}_${sizeKey}`);
  }

  async saveProject(root: IIIFItem): Promise<void> {
    const db = await this.dbPromise;
    await db.put(PROJECT_STORE, root, 'root');
  }

  async loadProject(): Promise<IIIFItem | undefined> {
    const db = await this.dbPromise;
    try {
        return await db.get(PROJECT_STORE, 'root');
    } catch (e) {
        console.error("Failed to load project from IDB", e);
        return undefined;
    }
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
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
    const db = await this.dbPromise;
    return await db.getAllKeys(FILES_STORE);
  }

  /**
   * Delete a specific asset
   */
  async deleteAsset(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(FILES_STORE, id);
    // Also delete derivatives
    const derivativeKeys = ['thumb', 'small', 'medium'];
    for (const key of derivativeKeys) {
      await db.delete(DERIVATIVES_STORE, `${id}_${key}`);
    }
  }
}

export const storage = new StorageService();
