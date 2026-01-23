
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
    return await db.get(PROJECT_STORE, 'root');
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
}

export const storage = new StorageService();
