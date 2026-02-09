/**
 * OPFS (Origin Private File System) storage for large files.
 *
 * Files > 10MB are stored in OPFS instead of IndexedDB to avoid
 * performance issues and quota pressure with large blobs.
 *
 * Directory structure: /originals/{id}
 */

import { storageLog } from '@/src/shared/services/logger';

const ORIGINALS_DIR = 'originals';

export class OPFSStorage {
  private _root: FileSystemDirectoryHandle | null = null;
  private _originalsDir: FileSystemDirectoryHandle | null = null;
  private _ready = false;

  /**
   * Check if OPFS is available in this browser.
   */
  static isSupported(): boolean {
    return typeof navigator?.storage?.getDirectory === 'function';
  }

  /**
   * Initialize OPFS root and create /originals/ directory.
   * Returns false if OPFS is not supported.
   */
  async initialize(): Promise<boolean> {
    if (!OPFSStorage.isSupported()) return false;

    try {
      this._root = await navigator.storage.getDirectory();
      this._originalsDir = await this._root.getDirectoryHandle(ORIGINALS_DIR, { create: true });
      this._ready = true;
      storageLog.debug('[OPFS] Initialized successfully');
      return true;
    } catch (e) {
      storageLog.warn('[OPFS] Initialization failed', e);
      this._ready = false;
      return false;
    }
  }

  get isReady(): boolean {
    return this._ready;
  }

  /**
   * Store a file in OPFS.
   * Uses createWritable() to stream the blob efficiently.
   */
  async storeFile(id: string, blob: Blob): Promise<void> {
    if (!this._originalsDir) throw new Error('OPFS not initialized');

    const fileHandle = await this._originalsDir.getFileHandle(id, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  /**
   * Get a file from OPFS. Returns null if not found.
   */
  async getFile(id: string): Promise<File | null> {
    if (!this._originalsDir) return null;

    try {
      const fileHandle = await this._originalsDir.getFileHandle(id);
      return await fileHandle.getFile();
    } catch {
      // NotFoundError is expected when file doesn't exist
      return null;
    }
  }

  /**
   * Delete a file from OPFS. No-op if not found.
   */
  async deleteFile(id: string): Promise<void> {
    if (!this._originalsDir) return;

    try {
      await this._originalsDir.removeEntry(id);
    } catch {
      // NotFoundError is fine - file already gone
    }
  }

  /**
   * Check if a file exists in OPFS.
   * Uses getFileHandle which fails fast on missing entries.
   */
  async hasFile(id: string): Promise<boolean> {
    if (!this._originalsDir) return false;

    try {
      await this._originalsDir.getFileHandle(id);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all file IDs stored in OPFS.
   */
  async listFiles(): Promise<string[]> {
    if (!this._originalsDir) return [];

    const ids: string[] = [];
    for await (const [name] of (this._originalsDir as any).entries()) {
      ids.push(name);
    }
    return ids;
  }

  /**
   * Get total size of all files in OPFS.
   */
  async getTotalSize(): Promise<number> {
    if (!this._originalsDir) return 0;

    let total = 0;
    for await (const [, handle] of (this._originalsDir as any).entries()) {
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        total += file.size;
      }
    }
    return total;
  }
}
