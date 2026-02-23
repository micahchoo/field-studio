// Pure TypeScript — no Svelte-specific conversion

/**
 * OPFS (Origin Private File System) storage for large files.
 *
 * Files > 10MB are stored in OPFS instead of IndexedDB to avoid
 * performance issues and quota pressure with large blobs.
 *
 * Directory structure: /originals/{id}
 */

import { storageLog } from './logger';

const ORIGINALS_DIR = 'originals';

export class OPFSStorage {
  private _root: FileSystemDirectoryHandle | null = null;
  private _originalsDir: FileSystemDirectoryHandle | null = null;
  private _ready = false;

  static isSupported(): boolean {
    return typeof navigator?.storage?.getDirectory === 'function';
  }

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

  async storeFile(id: string, blob: Blob): Promise<void> {
    if (!this._originalsDir) throw new Error('OPFS not initialized');
    const fileHandle = await this._originalsDir.getFileHandle(id, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  async getFile(id: string): Promise<File | null> {
    if (!this._originalsDir) return null;
    try {
      const fileHandle = await this._originalsDir.getFileHandle(id);
      return await fileHandle.getFile();
    } catch {
      return null;
    }
  }

  async deleteFile(id: string): Promise<void> {
    if (!this._originalsDir) return;
    try {
      await this._originalsDir.removeEntry(id);
    } catch {
      // NotFoundError is fine
    }
  }

  async hasFile(id: string): Promise<boolean> {
    if (!this._originalsDir) return false;
    try {
      await this._originalsDir.getFileHandle(id);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(): Promise<string[]> {
    if (!this._originalsDir) return [];
    const ids: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const [name] of (this._originalsDir as any).entries()) {
      ids.push(name);
    }
    return ids;
  }

  async getTotalSize(): Promise<number> {
    if (!this._originalsDir) return 0;
    let total = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const [, handle] of (this._originalsDir as any).entries()) {
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        total += file.size;
      }
    }
    return total;
  }
}
