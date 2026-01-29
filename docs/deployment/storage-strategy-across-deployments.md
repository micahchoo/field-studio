# Storage Strategy Across All Deployment Targets

> **Integrates with**: Web (GitHub Pages), Docker (Server), Tauri (Desktop)  
> **Based on**: ADVANCED_STORAGE_STRATEGIES.md and STORAGE_LIMITS_SOLUTIONS.md

---

## Executive Summary

Field Studio's storage architecture must adapt to three fundamentally different environments. This document maps the storage strategies to each deployment target and provides a unified abstraction layer.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED STORAGE ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│   │      WEB        │    │     DOCKER      │    │     TAURI       │        │
│   │  (GitHub Pages) │    │   (Server)      │    │   (Desktop)     │        │
│   ├─────────────────┤    ├─────────────────┤    ├─────────────────┤        │
│   │                 │    │                 │    │                 │        │
│   │  IndexedDB      │◄──►│  PostgreSQL     │    │  IndexedDB      │        │
│   │  OPFS (opt)     │    │  + File Store   │◄──►│  + Native FS    │        │
│   │  Service Worker │    │  Express API    │    │  Service Worker │        │
│   │  WebRTC Sync    │    │  WebSocket Sync │◄──►│  WebRTC Sync    │        │
│   │                 │    │                 │    │                 │        │
│   │  Constraints:   │    │  Constraints:   │    │  Constraints:   │        │
│   │  • 60% disk     │    │  • Server disk  │    │  • Disk limited │        │
│   │  • Safari 7-day │    │  • Network I/O  │    │  • User perms   │        │
│   │  • Browser tabs │    │  • Multi-user   │    │  • Auto-update  │        │
│   │                 │    │                 │    │                 │        │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘        │
│            │                      │                      │                 │
│            └──────────────────────┼──────────────────────┘                 │
│                                   │                                        │
│                        ┌──────────▼──────────┐                             │
│                        │   UnifiedStorage    │                             │
│                        │   (Adapter Pattern) │                             │
│                        └─────────────────────┘                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Storage Comparison by Deployment

### 1. Web Deployment (GitHub Pages)

| Storage Strategy | Implementation | When to Use |
|------------------|----------------|-------------|
| **IndexedDB** | Default | Small files (<10MB), metadata |
| **OPFS** | Primary | Large files (>10MB), IIIF tiles |
| **Cache API** | Fallback | Safari 7-day eviction workaround |
| **SQLite Wasm** | Optional | >10,000 files, complex queries |
| **Cloud Offload** | Required | Safari iOS, large archives |

**Constraints:**
- Chrome/Edge: ~60% of disk
- Firefox: 10% or 10GB
- Safari: 7-day eviction if not PWA
- Shared with other browser tabs

### 2. Docker Deployment (Server)

| Storage Strategy | Implementation | When to Use |
|------------------|----------------|-------------|
| **PostgreSQL** | Primary | All metadata, IIIF tree |
| **File System** | `/data/assets` | Large files, IIIF tiles |
| **Redis** | Cache | Hot tiles, session data |
| **S3/Object Store** | Optional | Backup, CDN distribution |

**Constraints:**
- Server disk capacity
- Network bandwidth
- Multi-user concurrency
- Backup requirements

### 3. Tauri Deployment (Desktop)

**Supported Platforms**: Windows (MSI), Linux (Flatpak)

| Storage Strategy | Implementation | When to Use |
|------------------|----------------|-------------|
| **IndexedDB** | Default | Metadata, compatibility |
| **Native FS** | Primary | Large files, user documents |
| **OPFS** | Fallback | When native FS not available |
| **SQLite** | Optional | Complex queries |

**Platform-Specific Storage Paths:**

```typescript
// Windows: %APPDATA%\studio.field.iiif.archive\
// Flatpak: ~/.var/app/studio.field.iiif.archive/data/

const getAppDataDir = async () => {
  const { appDataDir } = await import('@tauri-apps/api/path');
  return await appDataDir(); // Platform-aware
};
```

**Constraints:**
- User file system permissions
- Flatpak sandbox permissions (Linux)
- Windows Defender/SmartScreen (unsigned builds)
- Auto-updater storage
- Disk space warnings

---

## Unified Storage Adapter

### Core Interface

```typescript
// services/storage/UnifiedStorage.ts
export interface StorageAdapter {
  // File operations
  saveFile(id: string, blob: Blob, metadata: FileMetadata): Promise<void>;
  getFile(id: string): Promise<Blob | null>;
  deleteFile(id: string): Promise<void>;
  fileExists(id: string): Promise<boolean>;
  
  // Metadata operations
  saveMetadata(metadata: FileMetadata): Promise<void>;
  getMetadata(id: string): Promise<FileMetadata | null>;
  queryMetadata(filters: QueryFilters): Promise<FileMetadata[]>;
  
  // IIIF tile operations
  saveTile(assetId: string, z: number, x: number, y: number, blob: Blob): Promise<void>;
  getTile(assetId: string, z: number, x: number, y: number): Promise<Blob | null>;
  
  // Storage management
  getStorageStats(): Promise<StorageStats>;
  evictLRU(targetBytes: number): Promise<void>;
  
  // Migration support
  exportAll(): Promise<Blob>;
  importAll(blob: Blob): Promise<void>;
}

export interface StorageStats {
  totalUsed: number;
  totalQuota: number;
  fileCount: number;
  localSize: number;
  cloudSize: number;
}
```

### Platform-Specific Implementations

```typescript
// Web: IndexedDB + OPFS hybrid
// services/storage/WebStorageAdapter.ts
export class WebStorageAdapter implements StorageAdapter {
  private useOPFS: boolean = false;
  private useSQLite: boolean = false;
  
  async initialize(): Promise<void> {
    // Check OPFS support
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      await opfsStorage.initialize();
      this.useOPFS = true;
    }
    
    // Check SQLite Wasm for large metadata sets
    if (await this.shouldUseSQLite()) {
      await sqliteStorage.initialize();
      this.useSQLite = true;
    }
    
    await fileMetadataStore.initialize();
  }
  
  async saveFile(id: string, blob: Blob, metadata: FileMetadata): Promise<void> {
    const size = blob.size;
    
    // Strategy based on file size
    if (this.useOPFS && size > STORAGE_CONFIG.OPFS_THRESHOLD) {
      await opfsStorage.storeFile(id, blob);
      metadata.storage = { type: 'opfs' };
    } else {
      await indexedDBStorage.storeFile(id, blob);
      metadata.storage = { type: 'indexeddb' };
    }
    
    await this.saveMetadata(metadata);
    await smartCacheManager.maintainCache();
  }
  
  async getFile(id: string): Promise<Blob | null> {
    const meta = await this.getMetadata(id);
    
    if (!meta) return null;
    
    // Update access time
    await smartCacheManager.touch(id);
    
    switch (meta.storage.type) {
      case 'opfs':
        return await opfsStorage.getFile(id);
      case 'indexeddb':
        return await indexedDBStorage.getFile(id);
      case 'cloud':
        return await this.downloadFromCloud(id);
      default:
        return null;
    }
  }
  
  private async shouldUseSQLite(): Promise<boolean> {
    const fileCount = await fileMetadataStore.getCount();
    return fileCount > 10000; // Threshold from ADVANCED_STORAGE_STRATEGIES.md
  }
}

// Docker: PostgreSQL + File System
// services/storage/DockerStorageAdapter.ts
export class DockerStorageAdapter implements StorageAdapter {
  private apiBaseUrl: string;
  
  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }
  
  async saveFile(id: string, blob: Blob, metadata: FileMetadata): Promise<void> {
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('metadata', JSON.stringify(metadata));
    
    await fetch(`${this.apiBaseUrl}/files/${id}`, {
      method: 'POST',
      body: formData
    });
  }
  
  async getFile(id: string): Promise<Blob | null> {
    const response = await fetch(`${this.apiBaseUrl}/files/${id}`);
    if (!response.ok) return null;
    return await response.blob();
  }
  
  async saveTile(assetId: string, z: number, x: number, y: number, blob: Blob): Promise<void> {
    await fetch(`${this.apiBaseUrl}/tiles/${assetId}/${z}/${x}/${y}`, {
      method: 'POST',
      body: blob
    });
  }
  
  async getTile(assetId: string, z: number, x: number, y: number): Promise<Blob | null> {
    const response = await fetch(`${this.apiBaseUrl}/tiles/${assetId}/${z}/${x}/${y}`);
    if (!response.ok) return null;
    return await response.blob();
  }
  
  async getStorageStats(): Promise<StorageStats> {
    const response = await fetch(`${this.apiBaseUrl}/stats`);
    return await response.json();
  }
}

// Tauri: Native FS + IndexedDB fallback
// services/storage/TauriStorageAdapter.ts
export class TauriStorageAdapter implements StorageAdapter {
  private useNativeFS: boolean = false;
  private appDataDir: string = '';
  
  async initialize(): Promise<void> {
    // Get app data directory from Tauri
    const { appDataDir } = await import('@tauri-apps/api/path');
    this.appDataDir = await appDataDir();
    this.useNativeFS = true;
    
    // Initialize IndexedDB for metadata
    await fileMetadataStore.initialize();
  }
  
  async saveFile(id: string, blob: Blob, metadata: FileMetadata): Promise<void> {
    if (this.useNativeFS) {
      // Use Tauri native file system
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const filePath = `${this.appDataDir}/assets/${id}`;
      await writeFile(filePath, uint8Array);
      
      metadata.storage = { 
        type: 'native',
        path: filePath
      };
    } else {
      // Fallback to IndexedDB
      await indexedDBStorage.storeFile(id, blob);
      metadata.storage = { type: 'indexeddb' };
    }
    
    await this.saveMetadata(metadata);
  }
  
  async getFile(id: string): Promise<Blob | null> {
    const meta = await this.getMetadata(id);
    
    if (meta?.storage.type === 'native' && meta.storage.path) {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const uint8Array = await readFile(meta.storage.path);
      return new Blob([uint8Array]);
    }
    
    return await indexedDBStorage.getFile(id);
  }
  
  async saveTile(assetId: string, z: number, x: number, y: number, blob: Blob): Promise<void> {
    const { writeFile, mkdir } = await import('@tauri-apps/plugin-fs');
    const tileDir = `${this.appDataDir}/tiles/${assetId}/${z}`;
    
    try {
      await mkdir(tileDir, { recursive: true });
    } catch (e) {
      // Directory may already exist
    }
    
    const arrayBuffer = await blob.arrayBuffer();
    await writeFile(`${tileDir}/${x}-${y}.jpg`, new Uint8Array(arrayBuffer));
  }
  
  async getTile(assetId: string, z: number, x: number, y: number): Promise<Blob | null> {
    try {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const tilePath = `${this.appDataDir}/tiles/${assetId}/${z}/${x}-${y}.jpg`;
      const uint8Array = await readFile(tilePath);
      return new Blob([uint8Array], { type: 'image/jpeg' });
    } catch (e) {
      return null;
    }
  }
  
  async getStorageStats(): Promise<StorageStats> {
    // Use Tauri command to get native FS stats
    const stats = await invoke('get_storage_stats');
    return stats as StorageStats;
  }
}
```

### Factory Pattern

```typescript
// services/storage/index.ts
export function createStorageAdapter(): StorageAdapter {
  const platform = detectPlatform();
  
  switch (platform) {
    case 'docker':
      return new DockerStorageAdapter(
        import.meta.env.VITE_API_BASE_URL || '/api'
      );
    case 'tauri':
      return new TauriStorageAdapter();
    case 'web':
    default:
      return new WebStorageAdapter();
  }
}

// Singleton instance
let storageInstance: StorageAdapter | null = null;

export async function getStorage(): Promise<StorageAdapter> {
  if (!storageInstance) {
    storageInstance = createStorageAdapter();
    await storageInstance.initialize();
  }
  return storageInstance;
}
```

---

## IIIF Tile Serving Strategy

### Service Worker (Web + Tauri)

```typescript
// public/sw.js
const TILE_CACHE_NAME = 'iiif-tiles-v1';

async function handleTileRequest(request) {
  const url = new URL(request.url);
  const match = url.pathname.match(/\/tiles\/(.+?)\/(\d+)\/(\d+)_(\d+)\.jpg/);
  
  if (!match) return fetch(request);
  
  const [, assetId, z, x, y] = match;
  
  // Try storage based on platform
  if (await isTauri()) {
    // In Tauri, request from native FS via custom protocol
    const response = await fetch(`tauri://localhost/tiles/${assetId}/${z}/${x}/${y}`);
    if (response.ok) return response;
  } else {
    // Web: Try OPFS first
    try {
      const root = await navigator.storage.getDirectory();
      const tilesDir = await root.getDirectoryHandle('tiles');
      const assetDir = await tilesDir.getDirectoryHandle(assetId);
      const zDir = await assetDir.getDirectoryHandle(z);
      const fileHandle = await zDir.getFileHandle(`${x}-${y}.jpg`);
      const file = await fileHandle.getFile();
      
      return new Response(file, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    } catch (e) {
      // Not in OPFS, check Cache API
    }
  }
  
  // Check Cache API
  const cache = await caches.open(TILE_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  // Generate on demand (Web + Tauri only)
  const tile = await generateTile(assetId, parseInt(z), parseInt(x), parseInt(y));
  const response = new Response(tile, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000'
    }
  });
  
  // Cache for future
  await cache.put(request, response.clone());
  
  return response;
}
```

### Express Server (Docker)

```javascript
// server/routes/tiles.js
const express = require('express');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const TILES_DIR = process.env.TILES_DIR || '/data/tiles';

router.get('/tiles/:assetId/:z/:x/:y.jpg', async (req, res) => {
  const { assetId, z, x, y } = req.params;
  const tilePath = path.join(TILES_DIR, assetId, z, `${x}-${y}.jpg`);
  
  try {
    // Check if tile exists
    await fs.access(tilePath);
    return res.sendFile(tilePath);
  } catch (e) {
    // Generate tile
    const assetPath = path.join(process.env.ASSETS_DIR, assetId);
    
    const tile = await generateTileWithSharp(assetPath, parseInt(z), parseInt(x), parseInt(y));
    
    // Save for future
    await fs.mkdir(path.dirname(tilePath), { recursive: true });
    await fs.writeFile(tilePath, tile);
    
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(tile);
  }
});

async function generateTileWithSharp(assetPath, z, x, y) {
  const TILE_SIZE = 512;
  const MAX_ZOOM = 5;
  
  // Get image dimensions
  const metadata = await sharp(assetPath).metadata();
  
  // Calculate scale for this zoom level
  const scale = Math.pow(2, MAX_ZOOM - z);
  const tileWorldSize = TILE_SIZE * scale;
  
  const left = x * tileWorldSize;
  const top = y * tileWorldSize;
  const width = Math.min(tileWorldSize, metadata.width - left);
  const height = Math.min(tileWorldSize, metadata.height - top);
  
  return await sharp(assetPath)
    .extract({ left, top, width, height })
    .resize(TILE_SIZE, TILE_SIZE)
    .jpeg({ quality: 85 })
    .toBuffer();
}

module.exports = router;
```

---

## Safari-Specific Handling

### 7-Day Eviction Mitigation

```typescript
// services/storage/SafariStorageHandler.ts
export class SafariStorageHandler {
  private isSafari: boolean;
  private isStandalone: boolean;
  
  constructor() {
    const ua = navigator.userAgent;
    this.isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    this.isStandalone = window.navigator.standalone === true || 
                        window.matchMedia('(display-mode: standalone)').matches;
  }
  
  isAtRisk(): boolean {
    return this.isSafari && !this.isStandalone;
  }
  
  async handleStorage(): Promise<void> {
    if (!this.isAtRisk()) return;
    
    // For Safari browser mode, use cloud-first strategy
    const strategy: StorageStrategy = {
      type: 'cloud-priority',
      maxLocalCache: 500 * 1024 * 1024, // 500MB
      cacheDuration: 24 * 60 * 60 * 1000, // 1 day
      backupToCacheAPI: true
    };
    
    // Show install prompt
    if (this.shouldShowInstallPrompt()) {
      this.showInstallPrompt();
    }
    
    // Request persistent storage (Safari 17+)
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      if (isPersisted) {
        console.log('[Safari] Persistent storage granted');
      }
    }
    
    // Set up Cache API backup
    await this.setupCacheAPIBackup();
  }
  
  private async setupCacheAPIBackup(): Promise<void> {
    // Use Cache API as additional layer
    // (Implementation from STORAGE_LIMITS_SOLUTIONS.md)
  }
}
```

---

## Migration Between Deployments

### Universal Export Format

```typescript
// services/migration/UniversalExport.ts
export interface UniversalArchive {
  version: '2.0';
  exportedFrom: 'web' | 'docker' | 'tauri';
  exportedAt: string;
  
  // IIIF data
  manifest: IIIFManifest;
  collections: IIIFCollection[];
  
  // Metadata index (not actual files)
  fileIndex: Array<{
    id: string;
    filename: string;
    size: number;
    hash: string;
    metadata: FileMetadata;
  }>;
  
  // Export settings
  settings: {
    includeFiles: boolean;
    compression: 'none' | 'gzip';
    format: 'zip' | 'tar';
  };
}

export async function exportUniversal(
  options: ExportOptions
): Promise<Blob> {
  const storage = await getStorage();
  const stats = await storage.getStorageStats();
  
  const archive: UniversalArchive = {
    version: '2.0',
    exportedFrom: detectPlatform(),
    exportedAt: new Date().toISOString(),
    manifest: await exportIIIFManifest(),
    collections: await exportCollections(),
    fileIndex: await exportFileIndex(),
    settings: {
      includeFiles: options.includeFiles,
      compression: options.compression,
      format: options.format
    }
  };
  
  const zip = new JSZip();
  
  // Add manifest
  zip.file('manifest.json', JSON.stringify(archive.manifest, null, 2));
  zip.file('index.json', JSON.stringify(archive.fileIndex, null, 2));
  zip.file('metadata.json', JSON.stringify({
    version: archive.version,
    exportedFrom: archive.exportedFrom,
    exportedAt: archive.exportedAt
  }));
  
  // Include files if requested
  if (options.includeFiles) {
    const filesFolder = zip.folder('files');
    
    for (const fileInfo of archive.fileIndex) {
      const blob = await storage.getFile(fileInfo.id);
      if (blob) {
        filesFolder?.file(fileInfo.id, blob);
      }
    }
  }
  
  return zip.generateAsync({ 
    type: 'blob',
    compression: options.compression === 'gzip' ? 'DEFLATE' : 'STORE'
  });
}

export async function importUniversal(blob: Blob): Promise<void> {
  const zip = await JSZip.loadAsync(blob);
  
  const metadata = JSON.parse(
    await zip.file('metadata.json')?.async('text') || '{}'
  );
  
  console.log(`[Import] From ${metadata.exportedFrom} at ${metadata.exportedAt}`);
  
  const storage = await getStorage();
  
  // Import IIIF data
  const manifest = JSON.parse(
    await zip.file('manifest.json')?.async('text') || '{}'
  );
  await importIIIFManifest(manifest);
  
  // Import files if present
  const filesFolder = zip.folder('files');
  if (filesFolder) {
    for (const [path, file] of Object.entries(filesFolder.files)) {
      if (file.dir) continue;
      
      const id = path.replace('files/', '');
      const blob = await file.async('blob');
      
      // Get metadata from index
      const index = JSON.parse(
        await zip.file('index.json')?.async('text') || '[]'
      );
      const fileMeta = index.find((f: any) => f.id === id);
      
      await storage.saveFile(id, blob, fileMeta.metadata);
    }
  }
}
```

---

## Configuration Matrix

```typescript
// constants.ts - Storage Configuration by Platform
export const STORAGE_CONFIG = {
  // Web (GitHub Pages)
  web: {
    useOPFS: true,
    useSQLite: false, // Enable for >10,000 files
    opfsThreshold: 10 * 1024 * 1024,      // 10MB
    chunkingThreshold: 100 * 1024 * 1024, // 100MB
    maxLocalCache: 10 * 1024 * 1024 * 1024, // 10GB
    minFreeSpace: 2 * 1024 * 1024 * 1024,   // 2GB
    safari: {
      maxLocalCache: 500 * 1024 * 1024,     // 500MB for non-PWA
      useCacheAPI: true
    }
  },
  
  // Docker (Server)
  docker: {
    database: 'postgresql',
    tileStorage: 'filesystem', // or 's3'
    assetsDir: '/data/assets',
    tilesDir: '/data/tiles',
    redisCache: true,
    maxTileCache: 50 * 1024 * 1024 * 1024, // 50GB
    enableUploads: true,
    maxUploadSize: 10 * 1024 * 1024 * 1024 // 10GB
  },
  
  // Tauri (Desktop)
  tauri: {
    useNativeFS: true,
    useIndexedDB: true, // For metadata
    appDataDir: '', // Set at runtime
    assetsSubdir: 'assets',
    tilesSubdir: 'tiles',
    maxLocalCache: 100 * 1024 * 1024 * 1024, // 100GB (desktop has more space)
    compressMetadata: true
  }
};
```

---

## Path Forward: Phased Implementation

### Phase 1: Foundation (Week 1-2)
- [ ] Implement `UnifiedStorage` interface
- [ ] Create `WebStorageAdapter` (IndexedDB + OPFS)
- [ ] Update Service Worker for OPFS tile serving
- [ ] Add storage statistics dashboard

### Phase 2: Docker Support (Week 3-4)
- [ ] Create `DockerStorageAdapter`
- [ ] Build Express tile server
- [ ] Implement PostgreSQL schema
- [ ] Create docker-compose.yml

### Phase 3: Tauri Support (Week 5-6)
- [ ] Create `TauriStorageAdapter`
- [ ] Add Tauri FS commands
- [ ] Test Service Worker in Tauri webview
- [ ] Build cross-platform installers

### Phase 4: Advanced Features (Week 7-8)
- [ ] Add SQLite Wasm for large metadata (Web)
- [ ] Implement LRU cache manager
- [ ] Add cloud provider integration
- [ ] Create universal export/import

### Phase 5: Safari Optimization (Week 9-10)
- [ ] Implement 7-day eviction handling
- [ ] Add PWA install prompt
- [ ] Cache API backup layer
- [ ] Test on iOS devices

---

*Document Version: 1.0*  
*Integrates with: ADVANCED_STORAGE_STRATEGIES.md, STORAGE_LIMITS_SOLUTIONS.md*
