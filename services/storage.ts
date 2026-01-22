
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { IIIFItem } from '../types';

export const DB_NAME = 'biiif-archive-db';
export const FILES_STORE = 'files';
export const PROJECT_STORE = 'project';

interface BiiifDB extends DBSchema {
  files: {
    key: string;
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
    this.dbPromise = openDB<BiiifDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(FILES_STORE);
        db.createObjectStore(PROJECT_STORE);
      },
    });
  }

  async saveAsset(file: File | Blob, id?: string): Promise<string> {
    const db = await this.dbPromise;
    const assetId = id || crypto.randomUUID();
    await db.put(FILES_STORE, file, assetId);
    return assetId;
  }

  async getAsset(id: string): Promise<Blob | undefined> {
    const db = await this.dbPromise;
    return await db.get(FILES_STORE, id);
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
    await db.clear(PROJECT_STORE);
  }

  async getEstimate(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return null;
  }
}

export const storage = new StorageService();
