# Overcoming IndexedDB Storage Limits in Field Studio

## Executive Summary

Field Studio's local-first architecture relies on IndexedDB for storage. With cloud integration and IIIF deep zoom support, storage can quickly become a constraint. This document outlines strategies to handle large archives (100GB+) in the browser.

---

## Current Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Field Studio Storage                          │
├─────────────────────────────────────────────────────────────────┤
│  IndexedDB 'biiif-archive-db'                                   │
│  ├── files (store)        - Original image/video blobs          │
│  ├── derivatives (store)  - Thumbnails, small, medium sizes     │
│  ├── project (store)      - IIIF manifest/collection JSON       │
│  └── checkpoints (store)  - Import progress                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Service Worker Cache (iiif-tile-cache-v3)                      │
│  ├── Generated IIIF tiles for deep zoom                         │
│  └── LRU eviction (500MB limit)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Current Limitations
- All files stored in IndexedDB as complete blobs
- No streaming/chunking for large files
- No compression
- Limited eviction strategy

---

## Browser Storage Quotas (2024-2025)

| Browser | Best-Effort | Persistent | Key Constraint |
|---------|-------------|------------|----------------|
| **Chrome/Edge** | ~60% disk | ~60% disk | Same for both |
| **Firefox** | 10% or 10GB | 50% (max 8TB) | Group limit |
| **Safari** | ~60% disk | ~60% disk | 7-day eviction if not PWA |

### Checking Available Storage

```typescript
// Add to services/storage.ts
export interface DetailedStorageEstimate {
  usage: number;
  quota: number;
  usageDetails?: {
    indexedDB?: number;
    caches?: number;
    fileSystem?: number; // OPFS
  };
  percentUsed: number;
  percentRemaining: number;
}

export async function getDetailedStorageEstimate(): Promise<DetailedStorageEstimate> {
  const estimate = await navigator.storage.estimate();
  
  return {
    usage: estimate.usage || 0,
    quota: estimate.quota || 0,
    usageDetails: estimate.usageDetails as any,
    percentUsed: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
    percentRemaining: 100 - ((estimate.usage || 0) / (estimate.quota || 1)) * 100
  };
}
```

---

## Solution 1: Origin Private File System (OPFS) for Large Files

### Why OPFS?
- **Better performance** for large binary files
- **Streaming support** - no need to load entire file into memory
- **In-place modifications** - efficient for IIIF tile generation
- **Same quota** as IndexedDB but more efficient

### Proposed Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│               Enhanced Field Studio Storage                      │
├─────────────────────────────────────────────────────────────────┤
│  OPFS (Origin Private File System)                              │
│  ├── /originals/{id}.jpg       - Large image files              │
│  ├── /tiles/{id}/{z}/{x}-{y}.jpg - Generated IIIF tiles         │
│  └── /temp/                    - Processing temp files          │
├─────────────────────────────────────────────────────────────────┤
│  IndexedDB                                                      │
│  ├── fileMeta (store)          - Metadata, file paths           │
│  ├── project (store)           - IIIF manifests                 │
│  └── cloudSync (store)         - Cloud asset references         │
├─────────────────────────────────────────────────────────────────┤
│  Service Worker Cache                                           │
│  ├── Hot tile cache            - Frequently accessed tiles      │
│  └── Cloud asset cache         - Cached cloud thumbnails        │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation: OPFS Storage Layer

```typescript
// services/opfsStorage.ts

export class OPFSStorage {
  private root: FileSystemDirectoryHandle | null = null;
  private originalsDir: FileSystemDirectoryHandle | null = null;
  private tilesDir: FileSystemDirectoryHandle | null = null;
  
  async initialize(): Promise<void> {
    if (!('storage' in navigator && 'getDirectory' in navigator.storage)) {
      throw new Error('OPFS not supported');
    }
    
    this.root = await navigator.storage.getDirectory();
    this.originalsDir = await this.root.getDirectoryHandle('originals', { create: true });
    this.tilesDir = await this.root.getDirectoryHandle('tiles', { create: true });
  }
  
  // Store large file with streaming
  async storeFile(id: string, blob: Blob, onProgress?: (loaded: number, total: number) => void): Promise<void> {
    if (!this.originalsDir) throw new Error('OPFS not initialized');
    
    const fileHandle = await this.originalsDir.getFileHandle(`${id}.bin`, { create: true });
    const writable = await fileHandle.createWritable();
    
    // Stream the blob in chunks to avoid memory issues
    const reader = blob.stream().getReader();
    let loaded = 0;
    const total = blob.size;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      await writable.write(value);
      loaded += value.byteLength;
      onProgress?.(loaded, total);
    }
    
    await writable.close();
  }
  
  // Retrieve file
  async getFile(id: string): Promise<File | null> {
    if (!this.originalsDir) return null;
    
    try {
      const fileHandle = await this.originalsDir.getFileHandle(`${id}.bin`);
      return await fileHandle.getFile();
    } catch (e) {
      return null;
    }
  }
  
  // Stream read file in chunks
  async *readFileChunks(id: string, chunkSize: number = 1024 * 1024): AsyncGenerator<Uint8Array> {
    const file = await this.getFile(id);
    if (!file) throw new Error('File not found');
    
    const stream = file.stream();
    const reader = stream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  }
  
  // Store IIIF tile
  async storeTile(assetId: string, z: number, x: number, y: number, blob: Blob): Promise<void> {
    if (!this.tilesDir) throw new Error('OPFS not initialized');
    
    const assetDir = await this.tilesDir.getDirectoryHandle(assetId, { create: true });
    const zDir = await assetDir.getDirectoryHandle(`${z}`, { create: true });
    
    const fileHandle = await zDir.getFileHandle(`${x}-${y}.jpg`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
  
  // Retrieve tile
  async getTile(assetId: string, z: number, x: number, y: number): Promise<Blob | null> {
    if (!this.tilesDir) return null;
    
    try {
      const assetDir = await this.tilesDir.getDirectoryHandle(assetId);
      const zDir = await assetDir.getDirectoryHandle(`${z}`);
      const fileHandle = await zDir.getFileHandle(`${x}-${y}.jpg`);
      const file = await fileHandle.getFile();
      return file;
    } catch (e) {
      return null;
    }
  }
  
  // Delete asset and all its tiles
  async deleteAsset(id: string): Promise<void> {
    if (!this.originalsDir || !this.tilesDir) return;
    
    // Delete original
    try {
      await this.originalsDir.removeEntry(`${id}.bin`);
    } catch (e) {
      // May not exist
    }
    
    // Delete tiles recursively
    try {
      await this.tilesDir.removeEntry(id, { recursive: true });
    } catch (e) {
      // May not exist
    }
  }
  
  // Get file size
  async getFileSize(id: string): Promise<number> {
    const file = await this.getFile(id);
    return file?.size || 0;
  }
  
  // Check if file exists
  async hasFile(id: string): Promise<boolean> {
    const file = await this.getFile(id);
    return file !== null;
  }
}

export const opfsStorage = new OPFSStorage();
```

### IndexedDB Metadata Store

```typescript
// services/fileMetadataStore.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface FileMetadataDB extends DBSchema {
  fileMeta: {
    key: string;
    value: FileMetadata;
    indexes: {
      'by-size': number;
      'by-date': number;
      'by-cloud': string;
    };
  };
}

export interface FileMetadata {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  createdAt: number;
  accessedAt: number;
  
  // Storage location
  storage: {
    type: 'opfs' | 'indexeddb' | 'cloud';
    path?: string;           // For OPFS
    cloudProvider?: string;  // For cloud storage
    cloudAssetId?: string;   // For cloud storage
  };
  
  // IIIF info
  iiif: {
    hasTiles: boolean;
    maxZoom: number;
    tileSize: number;
    format: string;
  };
  
  // Cloud sync status
  sync?: {
    status: 'local' | 'syncing' | 'synced' | 'error';
    lastSync?: number;
    error?: string;
  };
}

export class FileMetadataStore {
  private db: IDBPDatabase<FileMetadataDB> | null = null;
  
  async initialize(): Promise<void> {
    this.db = await openDB<FileMetadataDB>('file-metadata', 1, {
      upgrade(db) {
        const store = db.createObjectStore('fileMeta', { keyPath: 'id' });
        store.createIndex('by-size', 'size');
        store.createIndex('by-date', 'createdAt');
        store.createIndex('by-cloud', 'storage.cloudProvider');
      }
    });
  }
  
  async save(metadata: FileMetadata): Promise<void> {
    if (!this.db) throw new Error('Store not initialized');
    await this.db.put('fileMeta', metadata);
  }
  
  async get(id: string): Promise<FileMetadata | undefined> {
    if (!this.db) return undefined;
    return await this.db.get('fileMeta', id);
  }
  
  async delete(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.delete('fileMeta', id);
  }
  
  async getAll(): Promise<FileMetadata[]> {
    if (!this.db) return [];
    return await this.db.getAll('fileMeta');
  }
  
  // Get files sorted by last access (for LRU eviction)
  async getLRUOrder(limit?: number): Promise<FileMetadata[]> {
    if (!this.db) return [];
    
    const all = await this.db.getAll('fileMeta');
    all.sort((a, b) => a.accessedAt - b.accessedAt);
    
    return limit ? all.slice(0, limit) : all;
  }
  
  // Get total size of all local files
  async getTotalLocalSize(): Promise<number> {
    if (!this.db) return 0;
    
    const all = await this.db.getAll('fileMeta');
    return all
      .filter(m => m.storage.type === 'opfs' || m.storage.type === 'indexeddb')
      .reduce((sum, m) => sum + m.size, 0);
  }
  
  // Update access time
  async touch(id: string): Promise<void> {
    if (!this.db) return;
    
    const meta = await this.get(id);
    if (meta) {
      meta.accessedAt = Date.now();
      await this.save(meta);
    }
  }
}

export const fileMetadataStore = new FileMetadataStore();
```

---

## Solution 2: Intelligent Chunking for Very Large Files

For files exceeding available memory during processing:

```typescript
// services/chunkedFileProcessor.ts

export class ChunkedFileProcessor {
  private readonly CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
  
  // Store large file as chunks
  async storeLargeFile(
    id: string, 
    file: File, 
    onProgress?: (percent: number) => void
  ): Promise<void> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    
    // Store metadata
    await fileMetadataStore.save({
      id,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      width: 0, // Will be determined later
      height: 0,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      storage: { type: 'opfs' },
      iiif: { hasTiles: false, maxZoom: 0, tileSize: 512, format: 'jpg' }
    });
    
    // Stream file to OPFS
    await opfsStorage.storeFile(id, file, (loaded, total) => {
      onProgress?.((loaded / total) * 100);
    });
  }
  
  // Process image in tiles without loading entire image
  async generateTilesStreamed(
    id: string, 
    options: {
      tileSize?: number;
      maxZoom?: number;
      onProgress?: (percent: number) => void;
    } = {}
  ): Promise<void> {
    const { tileSize = 512, maxZoom = 5 } = options;
    
    // Get dimensions without loading full image
    const dimensions = await this.getImageDimensions(id);
    
    // Process tiles level by level
    for (let z = 0; z <= maxZoom; z++) {
      const scale = Math.pow(2, maxZoom - z);
      const levelWidth = Math.ceil(dimensions.width / scale);
      const levelHeight = Math.ceil(dimensions.height / scale);
      
      const cols = Math.ceil(levelWidth / tileSize);
      const rows = Math.ceil(levelHeight / tileSize);
      
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Generate tile using partial decode if possible
          // This requires a tile-aware image decoder
          const tileBlob = await this.generateTile(id, z, x, y, tileSize);
          await opfsStorage.storeTile(id, z, x, y, tileBlob);
        }
      }
      
      const progress = ((z + 1) / (maxZoom + 1)) * 100;
      options.onProgress?.(progress);
    }
    
    // Update metadata
    const meta = await fileMetadataStore.get(id);
    if (meta) {
      meta.iiif.hasTiles = true;
      meta.iiif.maxZoom = maxZoom;
      meta.iiif.tileSize = tileSize;
      meta.width = dimensions.width;
      meta.height = dimensions.height;
      await fileMetadataStore.save(meta);
    }
  }
  
  private async getImageDimensions(id: string): Promise<{ width: number; height: number }> {
    // Use a partial read to get image dimensions
    // For JPEG: read SOF markers
    // For other formats: use appropriate method
    
    const file = await opfsStorage.getFile(id);
    if (!file) throw new Error('File not found');
    
    // Read first 64KB which typically contains headers
    const header = await file.slice(0, 65536).arrayBuffer();
    
    // Parse dimensions based on format
    // This is a simplified version
    const blob = new Blob([header]);
    const url = URL.createObjectURL(blob);
    
    try {
      const bitmap = await createImageBitmap(await fetch(url).then(r => r.blob()));
      const { width, height } = bitmap;
      bitmap.close();
      return { width, height };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  
  private async generateTile(
    id: string, 
    z: number, 
    x: number, 
    y: number, 
    tileSize: number
  ): Promise<Blob> {
    // Implementation depends on available libraries
    // For now, use canvas-based approach with full image
    // In production, use a tile-aware decoder
    
    const file = await opfsStorage.getFile(id);
    if (!file) throw new Error('File not found');
    
    const bitmap = await createImageBitmap(file);
    
    // Calculate tile position
    const scale = Math.pow(2, 5 - z); // Assuming maxZoom = 5
    const sourceX = x * tileSize * scale;
    const sourceY = y * tileSize * scale;
    const sourceSize = tileSize * scale;
    
    const canvas = new OffscreenCanvas(tileSize, tileSize);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');
    
    ctx.drawImage(
      bitmap,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, tileSize, tileSize
    );
    
    bitmap.close();
    
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  }
}

export const chunkedFileProcessor = new ChunkedFileProcessor();
```

---

## Solution 3: LRU Cache with Smart Eviction

```typescript
// services/smartCacheManager.ts

export interface CachePolicy {
  maxLocalStorage: number;      // Max bytes to keep locally
  minFreeSpace: number;         // Min bytes to keep free
  preloadCloudThumbnails: boolean;
  keepRecentlyViewed: number;   // Number of recent items to always keep
}

export class SmartCacheManager {
  private policy: CachePolicy;
  
  constructor(policy: Partial<CachePolicy> = {}) {
    this.policy = {
      maxLocalStorage: 10 * 1024 * 1024 * 1024, // 10GB default
      minFreeSpace: 2 * 1024 * 1024 * 1024,     // 2GB buffer
      preloadCloudThumbnails: true,
      keepRecentlyViewed: 100,
      ...policy
    };
  }
  
  async initialize(): Promise<void> {
    // Set up periodic cache maintenance
    setInterval(() => this.maintainCache(), 60000); // Every minute
    
    // Initial maintenance
    await this.maintainCache();
  }
  
  async maintainCache(): Promise<void> {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    
    // Check if we're over policy limits
    if (used > this.policy.maxLocalStorage) {
      const toFree = used - this.policy.maxLocalStorage;
      await this.evictLRU(toFree);
    }
    
    // Check if we're approaching browser quota
    if (used + this.policy.minFreeSpace > quota) {
      const toFree = (used + this.policy.minFreeSpace) - quota;
      await this.evictLRU(toFree);
    }
  }
  
  private async evictLRU(targetBytes: number): Promise<void> {
    const allFiles = await fileMetadataStore.getLRUOrder();
    
    // Keep recently viewed items
    const protectedIds = new Set(
      allFiles.slice(-this.policy.keepRecentlyViewed).map(f => f.id)
    );
    
    let freed = 0;
    
    for (const file of allFiles) {
      if (freed >= targetBytes) break;
      if (protectedIds.has(file.id)) continue;
      
      // Check if this file is available in cloud
      if (file.storage.cloudProvider) {
        // Safe to evict - can re-download from cloud
        await this.evictFile(file);
        freed += file.size;
      } else if (file.storage.type === 'opfs') {
        // Local-only file - check if we can offload to cloud first
        // For now, keep it
        // TODO: Implement cloud backup before eviction
      }
    }
    
    console.log(`[SmartCache] Freed ${(freed / 1024 / 1024).toFixed(2)}MB`);
  }
  
  private async evictFile(metadata: FileMetadata): Promise<void> {
    // Delete from OPFS
    await opfsStorage.deleteAsset(metadata.id);
    
    // Update metadata to reflect cloud-only status
    metadata.storage.type = 'cloud';
    metadata.storage.path = undefined;
    await fileMetadataStore.save(metadata);
  }
  
  // Called when user accesses a file
  async touch(fileId: string): Promise<void> {
    await fileMetadataStore.touch(fileId);
  }
  
  // Ensure file is available locally (download from cloud if needed)
  async ensureLocal(fileId: string): Promise<boolean> {
    const meta = await fileMetadataStore.get(fileId);
    if (!meta) return false;
    
    // Already local
    if (meta.storage.type === 'opfs' || meta.storage.type === 'indexeddb') {
      await this.touch(fileId);
      return true;
    }
    
    // Need to download from cloud
    if (meta.storage.cloudProvider && meta.storage.cloudAssetId) {
      // TODO: Implement cloud download
      // For now, return false
      return false;
    }
    
    return false;
  }
  
  // Get cache statistics
  async getStats(): Promise<{
    totalLocalSize: number;
    totalCloudSize: number;
    fileCount: number;
    cloudFileCount: number;
  }> {
    const allFiles = await fileMetadataStore.getAll();
    
    let totalLocalSize = 0;
    let totalCloudSize = 0;
    let cloudFileCount = 0;
    
    for (const file of allFiles) {
      if (file.storage.type === 'opfs' || file.storage.type === 'indexeddb') {
        totalLocalSize += file.size;
      } else if (file.storage.type === 'cloud') {
        totalCloudSize += file.size;
        cloudFileCount++;
      }
    }
    
    return {
      totalLocalSize,
      totalCloudSize,
      fileCount: allFiles.length,
      cloudFileCount
    };
  }
}

export const smartCacheManager = new SmartCacheManager();
```

---

## Solution 4: Compression for Metadata and Project Data

```typescript
// services/compressionService.ts

export class CompressionService {
  // Compress JSON data using CompressionStream API
  async compressJSON(data: unknown): Promise<Blob> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonString);
    
    return this.compress(uint8Array);
  }
  
  async decompressJSON<T>(blob: Blob): Promise<T> {
    const decompressed = await this.decompress(blob);
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decompressed);
    return JSON.parse(jsonString);
  }
  
  async compress(data: Uint8Array | ArrayBuffer): Promise<Blob> {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(data);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new Blob([result]);
  }
  
  async decompress(blob: Blob): Promise<ArrayBuffer> {
    const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    const reader = stream.getReader();
    
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result.buffer;
  }
}

export const compressionService = new CompressionService();
```

---

## Solution 5: Enhanced Service Worker with OPFS Integration

```javascript
// public/sw.js (enhanced for OPFS)

// Add OPFS handling for IIIF tiles
async function handleTileRequest(request) {
  const url = new URL(request.url);
  const match = url.pathname.match(/\/iiif\/image\/(.+?)\/(\d+)\/(\d+)\/(\d+)\.jpg/);
  
  if (!match) return null;
  
  const [, assetId, z, x, y] = match;
  
  // Check OPFS first
  try {
    const root = await navigator.storage.getDirectory();
    const tilesDir = await root.getDirectoryHandle('tiles', { create: false });
    const assetDir = await tilesDir.getDirectoryHandle(assetId, { create: false });
    const zDir = await assetDir.getDirectoryHandle(z, { create: false });
    const fileHandle = await zDir.getFileHandle(`${x}-${y}.jpg`);
    const file = await fileHandle.getFile();
    
    return new Response(file, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    // Tile not in OPFS, check Cache API
    const cache = await caches.open(TILE_CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    
    // Generate on-demand or return 404
    return new Response('Tile not found', { status: 404 });
  }
}

// Modify fetch handler to check OPFS tiles
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Check for tile request
  if (url.pathname.match(/\/iiif\/image\/(.+?)\/(\d+)\/(\d+)\/(\d+)\.jpg/)) {
    event.respondWith(handleTileRequest(event.request));
    return;
  }
  
  // Existing handlers...
});
```

---

## Migration Strategy

### Phase 1: Add OPFS Support (Backward Compatible)
```typescript
// services/unifiedStorage.ts

export class UnifiedStorage {
  private useOPFS = false;
  
  async initialize(): Promise<void> {
    // Check OPFS support
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      try {
        await opfsStorage.initialize();
        this.useOPFS = true;
        console.log('[UnifiedStorage] Using OPFS for large files');
      } catch (e) {
        console.warn('[UnifiedStorage] OPFS initialization failed, falling back to IndexedDB');
      }
    }
    
    await fileMetadataStore.initialize();
    await smartCacheManager.initialize();
  }
  
  async saveAsset(id: string, file: File | Blob): Promise<void> {
    const size = file instanceof File ? file.size : (file as Blob).size;
    
    // Use OPFS for files > 10MB
    if (this.useOPFS && size > 10 * 1024 * 1024) {
      await opfsStorage.storeFile(id, file);
      
      await fileMetadataStore.save({
        id,
        filename: file instanceof File ? file.name : `${id}.bin`,
        mimeType: file.type || 'application/octet-stream',
        size,
        width: 0,
        height: 0,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        storage: { type: 'opfs' },
        iiif: { hasTiles: false, maxZoom: 0, tileSize: 512, format: 'jpg' }
      });
    } else {
      // Use existing IndexedDB for small files
      await storage.saveAsset(id, file);
      
      await fileMetadataStore.save({
        id,
        filename: file instanceof File ? file.name : `${id}.bin`,
        mimeType: file.type || 'application/octet-stream',
        size,
        width: 0,
        height: 0,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        storage: { type: 'indexeddb' },
        iiif: { hasTiles: false, maxZoom: 0, tileSize: 512, format: 'jpg' }
      });
    }
  }
  
  async getAsset(id: string): Promise<Blob | undefined> {
    const meta = await fileMetadataStore.get(id);
    
    if (!meta) {
      // Fallback to legacy storage
      return await storage.getAsset(id);
    }
    
    await smartCacheManager.touch(id);
    
    if (meta.storage.type === 'opfs') {
      return await opfsStorage.getFile(id) || undefined;
    } else if (meta.storage.type === 'indexeddb') {
      return await storage.getAsset(id);
    } else if (meta.storage.type === 'cloud') {
      // Ensure local copy
      const available = await smartCacheManager.ensureLocal(id);
      if (available) {
        return this.getAsset(id); // Recursive - now should be local
      }
      return undefined;
    }
    
    return undefined;
  }
}

export const unifiedStorage = new UnifiedStorage();
```

---

## Summary Table

| Solution | Use Case | Performance | Complexity |
|----------|----------|-------------|------------|
| **OPFS** | Large files (>10MB) | Excellent | Low |
| **Chunking** | Very large files (>100MB) | Good | Medium |
| **Smart Cache** | Manage storage limits | Good | Medium |
| **Compression** | Metadata, JSON data | Good | Low |
| **Cloud Offload** | Unlimited scaling | Network dependent | Medium |

---

## Recommended Configuration

```typescript
// constants.ts additions

export const STORAGE_CONFIG = {
  // Size thresholds
  OPFS_THRESHOLD: 10 * 1024 * 1024,        // 10MB - use OPFS above this
  CHUNKING_THRESHOLD: 100 * 1024 * 1024,   // 100MB - use chunking above this
  
  // Cache policy
  MAX_LOCAL_STORAGE: 10 * 1024 * 1024 * 1024,  // 10GB default
  MIN_FREE_SPACE: 2 * 1024 * 1024 * 1024,      // 2GB buffer
  KEEP_RECENTLY_VIEWED: 100,
  
  // Tile generation
  TILE_SIZE: 512,
  MAX_ZOOM_LEVELS: 5,
  
  // Compression
  COMPRESS_METADATA: true,
  COMPRESSION_LEVEL: 'gzip'
};
```

---

*Document Version: 1.0*  
*Last Updated: 2026-01-28*
