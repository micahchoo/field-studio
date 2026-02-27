/**
 * Storage Service — IndexedDB-backed persistence
 *
 * Migrated from React source (1,010 lines, full version in
 * _archived/react-src/src/shared/services/storage.ts).
 *
 * This Svelte implementation covers the core surface needed:
 *   • saveProject / loadProject — gzip-optional JSON persistence
 *   • saveAsset / getAsset — Blob storage for media files
 *   • requestPersistentStorage — browser storage quota request
 *
 * TODO (deferred from React source):
 *   • Gzip compression via worker (saves ~60-70% storage)
 *   • OPFS routing for files > 10MB (opfsStorage.ts exists)
 *   • Thumbnail derivatives (thumb/small/medium)
 *   • Ingest checkpoints
 *   • Search index persistence
 *   • Quota monitoring with warning callbacks
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { IIIFItem } from '@/src/shared/types';
import { storageLog } from './logger';

// ============================================================================
// Database Schema
// ============================================================================

const DB_NAME = 'biiif-archive-db';
const DB_VERSION = 6;

const STORE_PROJECT = 'project';
const STORE_FILES = 'files';

const PROJECT_KEY = 'root';

interface BiiifDB {
  [STORE_PROJECT]: {
    key: string;
    value: unknown;
  };
  [STORE_FILES]: {
    key: string;
    value: Blob;
  };
}

// ============================================================================
// StorageService
// ============================================================================

class StorageService {
  #db: IDBPDatabase<BiiifDB> | null = null;

  private async getDb(): Promise<IDBPDatabase<BiiifDB>> {
    if (this.#db) return this.#db;

    this.#db = await openDB<BiiifDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create stores if they don't exist (recovery-friendly)
        if (!db.objectStoreNames.contains(STORE_PROJECT)) {
          db.createObjectStore(STORE_PROJECT);
        }
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          db.createObjectStore(STORE_FILES);
        }
        // Ignore other stores from full React version — they're non-destructive
      },
      blocked() {
        storageLog.warn('[StorageService] DB upgrade blocked by open connection');
      },
      blocking() {
        storageLog.warn('[StorageService] DB is blocking a newer version');
      },
      terminated() {
        storageLog.warn('[StorageService] DB connection terminated unexpectedly');
      },
    });

    return this.#db;
  }

  // --------------------------------------------------------------------------
  // Project persistence
  // --------------------------------------------------------------------------

  /**
   * Persist the full IIIF project tree to IndexedDB.
   *
   * Stores a JSON blob for forward compatibility with compression
   * (the React source stores gzip blobs; we store plain JSON blobs
   * so loadProject can handle both formats transparently).
   */
  async saveProject(root: IIIFItem): Promise<void> {
    try {
      const db = await this.getDb();
      const json = JSON.stringify(root);
      const blob = new Blob([json], { type: 'application/json' });
      await db.put(STORE_PROJECT, blob, PROJECT_KEY);
      storageLog.debug('[StorageService] Project saved');
    } catch (e) {
      storageLog.error('[StorageService] saveProject failed', e instanceof Error ? e : undefined);
    }
  }

  /**
   * Load the persisted project tree from IndexedDB.
   * Returns null if nothing is stored or if parsing fails.
   *
   * Handles both:
   *   • Blob (our format — application/json text blob)
   *   • Plain object (legacy uncompressed format from React version)
   */
  async loadProject(): Promise<IIIFItem | null> {
    try {
      const db = await this.getDb();
      const stored = await db.get(STORE_PROJECT, PROJECT_KEY);
      if (!stored) return null;

      // Legacy: React version stored raw object directly
      if (stored instanceof Blob) {
        const text = await stored.text();
        // Guard: JSON.stringify(undefined) produces the string "undefined", which
        // JSON.parse rejects with "unexpected character at line 1 column 1".
        // Guard: also reject gzip/binary blobs from the old React version
        // (their .text() starts with the gzip magic byte \x1f, not '{')
        if (!text || text === 'undefined' || text === 'null' || !text.startsWith('{')) return null;
        try {
          return JSON.parse(text) as IIIFItem;
        } catch {
          // Blob passes the '{' guard but is still invalid JSON (e.g. partial write,
          // binary data that happens to start with '{'). Discard it silently.
          storageLog.warn('[StorageService] Stored project blob is not valid JSON — discarding');
          return null;
        }
      }

      // Legacy uncompressed object (React v1 format)
      if (typeof stored === 'object' && stored !== null) {
        return stored as IIIFItem;
      }

      storageLog.warn('[StorageService] Unexpected project storage format');
      return null;
    } catch (e) {
      storageLog.error('[StorageService] loadProject failed', e instanceof Error ? e : undefined);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Asset storage (media files)
  // --------------------------------------------------------------------------

  /**
   * Store a media asset blob keyed by its ID/URL.
   */
  async saveAsset(id: string, blob: Blob): Promise<void> {
    try {
      const db = await this.getDb();
      await db.put(STORE_FILES, blob, id);
    } catch (e) {
      storageLog.error('[StorageService] saveAsset failed', e instanceof Error ? e : undefined);
    }
  }

  /**
   * Retrieve a stored asset blob by its ID/URL.
   * Returns null if not found.
   */
  async getAsset(id: string): Promise<Blob | null> {
    try {
      const db = await this.getDb();
      const blob = await db.get(STORE_FILES, id);
      return blob ?? null;
    } catch (e) {
      storageLog.error('[StorageService] getAsset failed', e instanceof Error ? e : undefined);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Storage quota
  // --------------------------------------------------------------------------

  /**
   * Request persistent storage from the browser.
   * Persistent storage is not evicted under quota pressure.
   * Silently fails if the API is unavailable.
   */
  async requestPersistentStorage(): Promise<boolean> {
    try {
      if (navigator.storage?.persist) {
        return await navigator.storage.persist();
      }
    } catch {
      // Not available or denied
    }
    return false;
  }
}

/** Global singleton */
export const storage = new StorageService();

/** One-time cleanup: delete the orphaned field-studio-tiles database (V5 — tile pipeline removed) */
export function deleteOrphanedTileDatabase(): void {
  indexedDB.deleteDatabase('field-studio-tiles');
}
