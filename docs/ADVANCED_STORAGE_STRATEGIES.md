# Advanced Storage Strategies for Field Studio

## Executive Summary

This document provides advanced strategies for overcoming IndexedDB storage limits in Field Studio, including SQLite Wasm, Safari-specific workarounds, streaming approaches, and CRDT-based synchronization.

---

## Table of Contents

1. [SQLite Wasm as IndexedDB Alternative](#1-sqlite-wasm-as-indexeddb-alternative)
2. [Safari-Specific Strategies](#2-safari-specific-strategies)
3. [Streaming & Virtual Database Pattern](#3-streaming--virtual-database-pattern)
4. [CRDTs for Offline-First Sync](#4-crdts-for-offline-first-sync)
5. [Recommended Architecture for Field Studio](#5-recommended-architecture-for-field-studio)

---

## 1. SQLite Wasm as IndexedDB Alternative

### Overview

SQLite Wasm brings a full-featured SQL database to the browser via WebAssembly, offering:
- Complex queries with JOINs and aggregations
- ACID transactions
- Full-text search (FTS5)
- Better performance for structured data operations

### Comparison

| Feature | IndexedDB | SQLite Wasm |
|---------|-----------|-------------|
| Query capability | Basic key-range | Full SQL |
| JOIN support | Manual | Native |
| Aggregation | Manual | Native (SUM, AVG, etc.) |
| Full-text search | No | FTS5 extension |
| Transaction scope | Single object store | Multiple tables |
| Initialization | ~46ms | ~504ms |
| Bulk operations | 13ms | 19ms |

### Implementation

```typescript
// services/sqliteStorage.ts

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

export class SQLiteStorage {
  private db: any = null;
  private initialized = false;
  
  async initialize(): Promise<void> {
    try {
      const sqlite3 = await sqlite3InitModule();
      
      // Use OPFS for persistence if available
      if ('opfs' in sqlite3) {
        this.db = new sqlite3.oo1.OpfsDb('fieldstudio.sqlite3');
        console.log('[SQLiteStorage] Using OPFS persistence');
      } else {
        this.db = new sqlite3.oo1.DB(':memory:');
        console.log('[SQLiteStorage] Using in-memory mode');
      }
      
      await this.createSchema();
      this.initialized = true;
    } catch (error) {
      console.error('[SQLiteStorage] Initialization failed:', error);
      throw error;
    }
  }
  
  private createSchema(): void {
    // Files metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER,
        width INTEGER,
        height INTEGER,
        storage_type TEXT CHECK(storage_type IN ('opfs', 'indexeddb', 'cloud')),
        storage_path TEXT,
        cloud_provider TEXT,
        cloud_asset_id TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        accessed_at INTEGER DEFAULT (unixepoch()),
        iiif_enabled BOOLEAN DEFAULT 0,
        iiif_max_zoom INTEGER,
        iiif_tile_size INTEGER DEFAULT 512
      )
    `);
    
    // IIIF tiles index
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS iiif_tiles (
        file_id TEXT,
        z INTEGER,
        x INTEGER,
        y INTEGER,
        storage_path TEXT,
        size INTEGER,
        created_at INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (file_id, z, x, y),
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_files_accessed ON files(accessed_at)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_files_cloud ON files(cloud_provider)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tiles_file ON iiif_tiles(file_id)`);
    
    // Full-text search for metadata
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
        filename,
        content='files',
        content_rowid='rowid'
      )
    `);
  }
  
  // Insert or update file
  async saveFileMetadata(metadata: FileMetadata): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO files (
        id, filename, mime_type, size, width, height,
        storage_type, storage_path, cloud_provider, cloud_asset_id,
        iiif_enabled, iiif_max_zoom, iiif_tile_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        accessed_at = unixepoch(),
        storage_type = excluded.storage_type,
        storage_path = excluded.storage_path
    `);
    
    stmt.bind(
      metadata.id,
      metadata.filename,
      metadata.mimeType,
      metadata.size,
      metadata.width,
      metadata.height,
      metadata.storage.type,
      metadata.storage.path || null,
      metadata.storage.cloudProvider || null,
      metadata.storage.cloudAssetId || null,
      metadata.iiif.hasTiles ? 1 : 0,
      metadata.iiif.maxZoom,
      metadata.iiif.tileSize
    );
    
    stmt.step();
    stmt.finalize();
  }
  
  // Get files for LRU eviction
  async getLRUFiles(limit: number): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];
    
    this.db.exec({
      sql: `
        SELECT * FROM files 
        WHERE storage_type IN ('opfs', 'indexeddb')
        ORDER BY accessed_at ASC 
        LIMIT ?
      `,
      bind: [limit],
      callback: (row: any) => {
        results.push(this.rowToMetadata(row));
      }
    });
    
    return results;
  }
  
  // Search files with full-text search
  async searchFiles(query: string): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];
    
    this.db.exec({
      sql: `
        SELECT f.* FROM files f
        JOIN files_fts fts ON f.rowid = fts.rowid
        WHERE files_fts MATCH ?
        ORDER BY rank
      `,
      bind: [query],
      callback: (row: any) => {
        results.push(this.rowToMetadata(row));
      }
    });
    
    return results;
  }
  
  // Get total local storage size
  async getLocalStorageSize(): Promise<number> {
    const result = this.db.selectValue(`
      SELECT COALESCE(SUM(size), 0) FROM files 
      WHERE storage_type IN ('opfs', 'indexeddb')
    `);
    return result as number;
  }
  
  private rowToMetadata(row: any): FileMetadata {
    return {
      id: row.id,
      filename: row.filename,
      mimeType: row.mime_type,
      size: row.size,
      width: row.width,
      height: row.height,
      createdAt: row.created_at * 1000,
      accessedAt: row.accessed_at * 1000,
      storage: {
        type: row.storage_type,
        path: row.storage_path,
        cloudProvider: row.cloud_provider,
        cloudAssetId: row.cloud_asset_id
      },
      iiif: {
        hasTiles: row.iiif_enabled === 1,
        maxZoom: row.iiif_max_zoom,
        tileSize: row.iiif_tile_size,
        format: 'jpg'
      }
    };
  }
  
  // Export database for backup
  exportDatabase(): Uint8Array {
    return this.db.export();
  }
  
  // Import database from backup
  importDatabase(data: Uint8Array): void {
    this.db.close();
    // Re-open with imported data
    // Implementation depends on SQLite.js vs official sqlite-wasm
  }
}

export const sqliteStorage = new SQLiteStorage();
```

### When to Use SQLite Wasm

| Use Case | Recommendation |
|----------|---------------|
| >10,000 files metadata | ✅ Use SQLite |
| Complex metadata queries | ✅ Use SQLite |
| Full-text search needed | ✅ Use SQLite |
| Simple file storage | ❌ Use IndexedDB |
| Fast startup required | ❌ Use IndexedDB |
| Small datasets (<1000) | ❌ Use IndexedDB |

---

## 2. Safari-Specific Strategies

### Safari 7-Day Cap Challenge

Safari clears script-writable storage after 7 days of inactivity for websites not added to Home Screen.

### Detection & Mitigation

```typescript
// services/safariStorageManager.ts

export class SafariStorageManager {
  private isSafari = false;
  private isStandalone = false;
  private isIOS = false;
  
  constructor() {
    const ua = navigator.userAgent;
    this.isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    this.isIOS = /iPhone|iPad|iPod/.test(ua);
    this.isStandalone = window.navigator.standalone === true || 
                        window.matchMedia('(display-mode: standalone)').matches;
  }
  
  /**
   * Check if app is at risk of 7-day eviction
   */
  isAtRisk(): boolean {
    if (!this.isSafari && !this.isIOS) return false;
    if (this.isStandalone) return false; // PWAs on Home Screen are protected
    return true;
  }
  
  /**
   * Show prompt to add to Home Screen
   */
  shouldShowInstallPrompt(): boolean {
    return this.isAtRisk() && !this.isStandalone;
  }
  
  /**
   * Request persistent storage (Safari 17+)
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (!navigator.storage?.persist) return false;
    
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) return true;
    
    const granted = await navigator.storage.persist();
    return granted;
  }
  
  /**
   * iOS version detection for feature support
   */
  getIOSVersion(): number | null {
    if (!this.isIOS) return null;
    
    const match = navigator.userAgent.match(/OS (\d+)_/);
    return match ? parseInt(match[1]) : null;
  }
  
  /**
   * Check if OPFS is available
   */
  supportsOPFS(): boolean {
    const version = this.getIOSVersion();
    // OPFS supported in iOS 15.2+
    return version !== null && version >= 15;
  }
  
  /**
   * Safari-specific storage strategy
   */
  async getRecommendedStrategy(): Promise<StorageStrategy> {
    const version = this.getIOSVersion();
    
    if (this.isStandalone) {
      // PWA mode - full storage available
      return {
        type: 'hybrid',
        useOPFS: version && version >= 15,
        usePersistentStorage: true,
        maxLocalSize: 5 * 1024 * 1024 * 1024 // 5GB
      };
    }
    
    if (version && version >= 17) {
      // iOS 17+ supports persistent storage API
      return {
        type: 'persistent',
        useOPFS: true,
        usePersistentStorage: true,
        maxLocalSize: 2 * 1024 * 1024 * 1024 // 2GB
      };
    }
    
    // Older iOS or browser mode - limited storage, cloud-first
    return {
      type: 'cloud-priority',
      useOPFS: false,
      usePersistentStorage: false,
      maxLocalSize: 500 * 1024 * 1024, // 500MB
      cacheDuration: 24 * 60 * 60 * 1000 // 1 day
    };
  }
}

interface StorageStrategy {
  type: 'hybrid' | 'persistent' | 'cloud-priority';
  useOPFS: boolean;
  usePersistentStorage: boolean;
  maxLocalSize: number;
  cacheDuration?: number;
}

export const safariStorageManager = new SafariStorageManager();
```

### Cache Storage Fallback for Safari

```typescript
// Use Cache API as additional storage layer on Safari
export class SafariCacheFallback {
  private cacheName = 'fieldstudio-data-v1';
  
  async store(key: string, data: any): Promise<void> {
    const cache = await caches.open(this.cacheName);
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const response = new Response(blob, {
      headers: {
        'Content-Type': 'application/json',
        'X-Stored-At': Date.now().toString()
      }
    });
    await cache.put(key, response);
  }
  
  async retrieve(key: string): Promise<any | null> {
    const cache = await caches.open(this.cacheName);
    const response = await cache.match(key);
    if (!response) return null;
    return await response.json();
  }
  
  // Cache API is shared between Safari and standalone mode on iOS 12+
  async syncWithIndexedDB(db: IDBDatabase): Promise<void> {
    // Copy critical data to Cache API for persistence across modes
    const criticalData = await this.getCriticalData(db);
    await this.store('critical-backup', criticalData);
  }
}
```

---

## 3. Streaming & Virtual Database Pattern

### For Archives Larger Than Local Storage

When the archive exceeds local storage capacity, use a "virtual database" pattern:

```typescript
// services/virtualArchive.ts

export class VirtualArchive {
  private localCache: LRUCache<string, any>;
  private remoteBaseUrl: string;
  private indexCache: Map<string, any> = new Map();
  
  constructor(config: {
    remoteBaseUrl: string;
    localCacheSize: number;
  }) {
    this.remoteBaseUrl = config.remoteBaseUrl;
    this.localCache = new LRUCache({ maxSize: config.localCacheSize });
  }
  
  /**
   * Load index metadata (always local)
   */
  async loadIndex(): Promise<void> {
    // Try local first
    const localIndex = await this.getLocalIndex();
    if (localIndex) {
      this.indexCache = new Map(localIndex);
      return;
    }
    
    // Fetch from remote
    const response = await fetch(`${this.remoteBaseUrl}/index.json`);
    const index = await response.json();
    
    // Store locally
    this.indexCache = new Map(index.map((item: any) => [item.id, item]));
    await this.saveLocalIndex(index);
  }
  
  /**
   * Get asset - from local cache, or fetch from remote
   */
  async getAsset(id: string): Promise<Blob | null> {
    // Check memory cache
    const cached = this.localCache.get(id);
    if (cached) return cached;
    
    // Check IndexedDB/OPFS
    const local = await this.getLocalAsset(id);
    if (local) {
      this.localCache.set(id, local);
      return local;
    }
    
    // Fetch from remote using Range request for large files
    const indexEntry = this.indexCache.get(id);
    if (!indexEntry) return null;
    
    if (indexEntry.size > 10 * 1024 * 1024) {
      // Large file - stream and cache locally
      return this.streamAndCache(id, indexEntry);
    } else {
      // Small file - fetch directly
      const response = await fetch(`${this.remoteBaseUrl}/assets/${id}`);
      const blob = await response.blob();
      await this.saveLocalAsset(id, blob);
      return blob;
    }
  }
  
  /**
   * Stream large file with progress tracking
   */
  private async streamAndCache(
    id: string, 
    indexEntry: any
  ): Promise<Blob> {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunks: Blob[] = [];
    
    for (let offset = 0; offset < indexEntry.size; offset += chunkSize) {
      const end = Math.min(offset + chunkSize - 1, indexEntry.size - 1);
      
      const response = await fetch(`${this.remoteBaseUrl}/assets/${id}`, {
        headers: { 'Range': `bytes=${offset}-${end}` }
      });
      
      const chunk = await response.blob();
      chunks.push(chunk);
      
      // Emit progress
      this.emitProgress(id, offset + chunk.size, indexEntry.size);
    }
    
    const fullBlob = new Blob(chunks);
    await this.saveLocalAsset(id, fullBlob);
    return fullBlob;
  }
  
  /**
   * Query with server-side pagination
   */
  async query(
    filters: any, 
    options: { page: number; pageSize: number }
  ): Promise<any[]> {
    const cacheKey = `query:${JSON.stringify(filters)}:${options.page}`;
    
    // Check cache
    const cached = this.localCache.get(cacheKey);
    if (cached) return cached;
    
    // Fetch from server
    const response = await fetch(
      `${this.remoteBaseUrl}/query?` + 
      new URLSearchParams({
        ...filters,
        _page: options.page.toString(),
        _limit: options.pageSize.toString()
      })
    );
    
    const results = await response.json();
    
    // Cache for short period
    this.localCache.set(cacheKey, results, { ttl: 60000 });
    
    return results;
  }
  
  /**
   * Prefetch likely-to-be-needed assets
   */
  async prefetch(ids: string[]): Promise<void> {
    const missing = ids.filter(id => !this.localCache.has(id));
    
    // Batch fetch
    const response = await fetch(`${this.remoteBaseUrl}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: missing })
    });
    
    const results = await response.json();
    
    // Store locally
    for (const item of results) {
      await this.saveLocalAsset(item.id, item.data);
      this.localCache.set(item.id, item.data);
    }
  }
  
  private emitProgress(id: string, loaded: number, total: number): void {
    window.dispatchEvent(new CustomEvent('asset-load-progress', {
      detail: { id, loaded, total, percent: (loaded / total) * 100 }
    }));
  }
}
```

---

## 4. CRDTs for Offline-First Sync

### For Multi-Device Collaboration

When users work across multiple devices or collaborate:

```typescript
// services/crdtSync.ts

import * as Y from 'yjs';

export class CRDTArchive {
  private doc: Y.Doc;
  private filesMap: Y.Map<Y.Map<any>>;
  private provider: any; // WebsocketProvider or IndexeddbPersistence
  
  constructor(roomId: string) {
    this.doc = new Y.Doc();
    this.filesMap = this.doc.getMap('files');
    
    // Setup persistence
    this.setupPersistence(roomId);
  }
  
  private setupPersistence(roomId: string): void {
    // For local-only: use IndexedDB persistence
    // For collaboration: use WebsocketProvider
    
    if ('BroadcastChannel' in window) {
      // Sync across tabs
      const channel = new BroadcastChannel(`fieldstudio-${roomId}`);
      
      this.doc.on('update', (update: Uint8Array) => {
        channel.postMessage({ type: 'update', update });
      });
      
      channel.onmessage = (event) => {
        if (event.data.type === 'update') {
          Y.applyUpdate(this.doc, event.data.update);
        }
      };
    }
  }
  
  /**
   * Add file metadata (merges automatically)
   */
  addFile(metadata: FileMetadata): void {
    const fileMap = new Y.Map();
    
    fileMap.set('id', metadata.id);
    fileMap.set('filename', metadata.filename);
    fileMap.set('size', metadata.size);
    fileMap.set('modifiedAt', Date.now());
    fileMap.set('storage', metadata.storage);
    
    this.filesMap.set(metadata.id, fileMap);
  }
  
  /**
   * Update file (automatic conflict resolution)
   */
  updateFile(id: string, changes: Partial<FileMetadata>): void {
    const fileMap = this.filesMap.get(id);
    if (!fileMap) return;
    
    // Each change is a separate Yjs operation
    // Conflicts are resolved automatically using LWW
    for (const [key, value] of Object.entries(changes)) {
      fileMap.set(key, value);
    }
    
    fileMap.set('modifiedAt', Date.now());
  }
  
  /**
   * Get all files (observable)
   */
  getAllFiles(): FileMetadata[] {
    const files: FileMetadata[] = [];
    
    this.filesMap.forEach((fileMap) => {
      files.push({
        id: fileMap.get('id'),
        filename: fileMap.get('filename'),
        size: fileMap.get('size'),
        storage: fileMap.get('storage'),
        modifiedAt: fileMap.get('modifiedAt')
      });
    });
    
    return files;
  }
  
  /**
   * Subscribe to changes
   */
  onChange(callback: (files: FileMetadata[]) => void): () => void {
    const observer = () => {
      callback(this.getAllFiles());
    };
    
    this.filesMap.observe(observer);
    return () => this.filesMap.unobserve(observer);
  }
  
  /**
   * Export for backup
   */
  export(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }
  
  /**
   * Import from backup
   */
  import(data: Uint8Array): void {
    Y.applyUpdate(this.doc, data);
  }
  
  /**
   * Get sync state for debugging
   */
  getSyncState(): {
    fileCount: number;
    docSize: number;
  } {
    return {
      fileCount: this.filesMap.size,
      docSize: this.export().length
    };
  }
}
```

### Simple LWW-Map for Metadata

```typescript
// Simpler CRDT for single-user multi-device
export class LWWMetadataStore {
  private data = new Map<string, LWWRegister<any>>();
  private actorId = crypto.randomUUID();
  
  set(key: string, value: any): void {
    this.data.set(key, {
      value,
      timestamp: Date.now(),
      actor: this.actorId
    });
  }
  
  get(key: string): any {
    return this.data.get(key)?.value;
  }
  
  /**
   * Merge with remote state
   */
  merge(remote: Map<string, LWWRegister<any>>): void {
    for (const [key, remoteReg] of remote) {
      const localReg = this.data.get(key);
      
      if (!localReg) {
        this.data.set(key, remoteReg);
        continue;
      }
      
      // Last write wins, tie-break by actor ID
      const remoteWins = remoteReg.timestamp > localReg.timestamp ||
        (remoteReg.timestamp === localReg.timestamp && 
         remoteReg.actor > localReg.actor);
      
      if (remoteWins) {
        this.data.set(key, remoteReg);
      }
    }
  }
  
  export(): Record<string, LWWRegister<any>> {
    return Object.fromEntries(this.data);
  }
  
  import(data: Record<string, LWWRegister<any>>): void {
    this.merge(new Map(Object.entries(data)));
  }
}

interface LWWRegister<T> {
  value: T;
  timestamp: number;
  actor: string;
}
```

---

## 5. Recommended Architecture for Field Studio

### Tiered Storage Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIELD STUDIO ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│  PRESENTATION LAYER                                             │
│  ├── Viewer (OpenSeadragon)                                     │
│  ├── Board (Canvas)                                             │
│  └── Metadata Editor                                            │
├─────────────────────────────────────────────────────────────────┤
│  STATE MANAGEMENT                                               │
│  ├── Vault (IIIF entities)                                      │
│  └── CRDT Sync (Yjs/Automerge)                                  │
├─────────────────────────────────────────────────────────────────┤
│  STORAGE ABSTRACTION                                            │
│  ├── UnifiedStorage                                             │
│  │   ├── OPFS (files > 10MB)                                    │
│  │   ├── IndexedDB (metadata, small files)                      │
│  │   └── SQLite Wasm (complex queries, FTS)                     │
│  └── SmartCacheManager                                          │
│      ├── LRU eviction                                           │
│      ├── Cloud offloading                                       │
│      └── Prefetching                                            │
├─────────────────────────────────────────────────────────────────┤
│  CLOUD INTEGRATION                                              │
│  ├── Immich Provider                                            │
│  ├── Nextcloud Provider                                         │
│  ├── Google Photos Provider                                     │
│  └── VirtualArchive (streaming)                                 │
├─────────────────────────────────────────────────────────────────┤
│  SERVICE WORKER                                                 │
│  ├── IIIF Image API (local tiles)                               │
│  ├── Cloud Proxy (cached remote)                                │
│  └── Background Sync                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration Matrix

| Scenario | Local Storage | Cloud | Strategy |
|----------|--------------|-------|----------|
| Small archive (<1GB) | IndexedDB + OPFS | Optional | Full local |
| Medium archive (1-10GB) | OPFS + SQLite | Backup | Local-first, cloud backup |
| Large archive (>10GB) | Smart cache (1GB) | Required | Cloud-first, LRU cache |
| Safari iOS | Limited | Required | Cloud-first, 7-day handling |
| Multi-device | SQLite | Sync | CRDT sync |
| Collaboration | Yjs CRDT | Sync | Real-time CRDT |

### Implementation Priority

1. **Phase 1**: Add OPFS support alongside IndexedDB
2. **Phase 2**: Implement smart cache with LRU eviction
3. **Phase 3**: Add cloud provider integration
4. **Phase 4**: Add SQLite Wasm for large metadata sets
5. **Phase 5**: Add CRDT for multi-device sync

---

*Document Version: 1.0*  
*Last Updated: 2026-01-28*
