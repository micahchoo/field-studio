# Feature Parity Maintenance Across Deployment Targets

> **Applies to**: Web (GitHub Pages), Docker (Server), Tauri (Desktop)

---

## Overview

This document outlines strategies for maintaining feature parity across three deployment targets while respecting each platform's constraints and capabilities.

```
                    ┌─────────────────────────────────────┐
                    │      Shared React Frontend          │
                    │  (components/, hooks/, services/)   │
                    └──────────────┬──────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Web (Browser)  │    │ Docker (Server) │    │ Tauri (Desktop) │
│  GitHub Pages   │    │ Multi-user API  │    │ Native Desktop  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ IndexedDB       │    │ PostgreSQL      │    │ IndexedDB       │
│ Service Worker  │    │ Express API     │    │ Service Worker  │
│ WebRTC Sync     │    │ WebSocket Sync  │    │ WebRTC Sync     │
│ File System API │    │ Volume Mounts   │    │ Native FS API   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Deployment Matrix

| Feature | Web (GH Pages) | Docker | Tauri | Notes |
|---------|---------------|--------|-------|-------|
| **Storage** | IndexedDB | PostgreSQL | IndexedDB | Docker uses server DB |
| **IIIF Tiles** | Service Worker | Express Server | Service Worker | Docker needs backend |
| **File Import** | File System Access API | Volume Mounts | Native Dialog | Different UX |
| **File Export** | Browser Download | Volume Mounts | Native Dialog | Different UX |
| **Sync** | WebRTC (P2P) | WebSocket + y-websocket | WebRTC (P2P) | Docker needs server |
| **Offline** | Limited | No | Full | Tauri wins here |
| **Multi-user** | No | Yes | No | Docker wins here |
| **Updates** | Auto (on reload) | Manual pull | Auto-updater | Different mechanisms |

---

## Core Principles for Feature Parity

### 1. Abstraction Layer Pattern

Create platform-agnostic interfaces with platform-specific implementations:

```typescript
// services/storage/StorageAdapter.ts
export interface StorageAdapter {
  saveFile(hash: string, data: Blob): Promise<void>;
  getFile(hash: string): Promise<Blob>;
  deleteFile(hash: string): Promise<void>;
  listFiles(): Promise<string[]>;
}

// IndexedDB implementation (Web + Tauri)
// services/storage/IndexedDBStorage.ts
export class IndexedDBStorage implements StorageAdapter {
  async saveFile(hash: string, data: Blob): Promise<void> {
    const db = await openDB('field-studio', 1);
    await db.put('files', data, hash);
  }
  // ...
}

// HTTP API implementation (Docker)
// services/storage/HttpStorage.ts
export class HttpStorage implements StorageAdapter {
  async saveFile(hash: string, data: Blob): Promise<void> {
    const formData = new FormData();
    formData.append('file', data);
    await fetch(`/api/files/${hash}`, { method: 'POST', body: formData });
  }
  // ...
}

// Native FS implementation (Tauri enhanced)
// services/storage/NativeFsStorage.ts
export class NativeFsStorage implements StorageAdapter {
  async saveFile(hash: string, data: Blob): Promise<void> {
    await invoke('save_file', { hash, data: await data.arrayBuffer() });
  }
  // ...
}
```

### 2. Feature Detection & Runtime Selection

```typescript
// utils/platform.ts
export type Platform = 'web' | 'docker' | 'tauri';

export function detectPlatform(): Platform {
  if ((window as any).__TAURI__) {
    return 'tauri';
  }
  if (import.meta.env.VITE_DEPLOYMENT_TARGET === 'docker') {
    return 'docker';
  }
  return 'web';
}

// services/storage/index.ts
import { detectPlatform } from '@/utils/platform';
import { IndexedDBStorage } from './IndexedDBStorage';
import { HttpStorage } from './HttpStorage';
import { NativeFsStorage } from './NativeFsStorage';

export function createStorageAdapter() {
  const platform = detectPlatform();
  
  switch (platform) {
    case 'tauri':
      // Tauri can use native FS for some operations, IndexedDB for others
      return new HybridTauriStorage();
    case 'docker':
      return new HttpStorage();
    case 'web':
    default:
      return new IndexedDBStorage();
  }
}
```

### 3. Conditional Feature Loading

```typescript
// services/sync/index.ts
export async function initializeSync() {
  const platform = detectPlatform();
  
  if (platform === 'docker') {
    // Server-side: Use WebSocket with y-websocket
    const { WebSocketSync } = await import('./WebSocketSync');
    return new WebSocketSync();
  } else {
    // Client-side: Use WebRTC (Web + Tauri)
    const { WebRTCSync } = await import('./WebRTCSync');
    return new WebRTCSync();
  }
}
```

---

## Storage Strategy Across Deployments

> **See also**: [storage-strategy-across-deployments.md](./storage-strategy-across-deployments.md) for detailed storage architecture

The storage layer has the most significant differences between deployment targets. Here's how to maintain parity:

### Storage Capabilities Matrix

| Capability | Web (Browser) | Docker | Tauri | Unified Approach |
|------------|---------------|--------|-------|------------------|
| **Max Storage** | ~60% disk | Server disk | Full disk | Adapter limits |
| **Large Files (>10MB)** | OPFS | File system | Native FS | UnifiedStorage |
| **Very Large (>100MB)** | Chunking | Streaming | Streaming | ChunkedFileProcessor |
| **IIIF Tiles** | OPFS/Cache API | File system | Native FS | TileResolver |
| **Metadata Query** | IndexedDB/SQLite | PostgreSQL | IndexedDB/SQLite | Query abstraction |
| **LRU Eviction** | Manual | OS-level | Manual | SmartCacheManager |
| **Safari 7-day** | Cache API backup | N/A | N/A | SafariStorageHandler |

### UnifiedStorage Adapter

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
}

// Factory creates appropriate adapter
export function createStorageAdapter(): StorageAdapter {
  const platform = detectPlatform();
  
  switch (platform) {
    case 'docker':
      return new DockerStorageAdapter();
    case 'tauri':
      return new TauriStorageAdapter();
    case 'web':
    default:
      return new WebStorageAdapter();
  }
}
```

### Storage Migration Between Platforms

```typescript
// services/migration/UniversalExport.ts
export interface UniversalArchive {
  version: '2.0';
  exportedFrom: 'web' | 'docker' | 'tauri';
  exportedAt: string;
  manifest: IIIFManifest;
  fileIndex: FileIndexEntry[];
}

export async function exportUniversal(options: ExportOptions): Promise<Blob> {
  const storage = await getStorage();
  const stats = await storage.getStorageStats();
  
  // Export IIIF manifest (same across all platforms)
  const manifest = await exportIIIFManifest();
  
  // Export file index (metadata only, not actual files for Docker)
  const fileIndex = await exportFileIndex();
  
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('index.json', JSON.stringify(fileIndex, null, 2));
  
  // Include files based on platform
  if (options.includeFiles && detectPlatform() !== 'docker') {
    const filesFolder = zip.folder('files');
    for (const fileInfo of fileIndex) {
      const blob = await storage.getFile(fileInfo.id);
      if (blob) {
        filesFolder?.file(fileInfo.id, blob);
      }
    }
  }
  
  return zip.generateAsync({ type: 'blob' });
}
```

---

## File System Operations Strategy

### Unified Import Interface

```typescript
// services/import/ImportManager.ts
export interface ImportOptions {
  multiple: boolean;
  directory: boolean;
  filters?: FileFilter[];
}

export interface ImportResult {
  files: FileInfo[];
  cancelled: boolean;
}

// Base implementation
abstract class BaseImportManager {
  abstract selectFiles(options: ImportOptions): Promise<ImportResult>;
  abstract processFiles(files: FileInfo[]): Promise<ProcessedFile[]>;
}

// Web implementation
class WebImportManager extends BaseImportManager {
  async selectFiles(options: ImportOptions): Promise<ImportResult> {
    // Use File System Access API
    const handle = await window.showOpenFilePicker({
      multiple: options.multiple,
      types: options.filters
    });
    // ...
  }
}

// Tauri implementation
class TauriImportManager extends BaseImportManager {
  async selectFiles(options: ImportOptions): Promise<ImportResult> {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      multiple: options.multiple,
      directory: options.directory,
      filters: options.filters
    });
    // Convert paths to FileInfo objects via Rust commands
    const files = await invoke('get_file_info', { paths: selected });
    return { files, cancelled: !selected };
  }
}

// Docker implementation
class DockerImportManager extends BaseImportManager {
  async selectFiles(options: ImportOptions): Promise<ImportResult> {
    // Use traditional file input + upload
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.multiple;
      input.webkitdirectory = options.directory;
      input.onchange = async () => {
        const files = Array.from(input.files || []);
        // Upload to server
        const uploaded = await this.uploadFiles(files);
        resolve({ files: uploaded, cancelled: false });
      };
      input.click();
    });
  }
}
```

---

## IIIF Tile Serving Strategy

### Service Worker (Web + Tauri)

```javascript
// public/sw.js - Works in both Web and Tauri
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/tiles/')) {
    event.respondWith(handleTileRequest(url));
  }
});

async function handleTileRequest(url) {
  // Check storage based on platform
  if (await isTauri()) {
    // Request from Tauri native FS
    return await fetch(`tauri://localhost${url.pathname}`);
  }
  
  // Check OPFS first (Web)
  const root = await navigator.storage.getDirectory();
  const tilesDir = await root.getDirectoryHandle('tiles');
  // ... get tile from OPFS
  
  // Fall back to Cache API
  const cache = await caches.open('iiif-tiles');
  const cached = await cache.match(url.pathname);
  if (cached) return cached;
  
  // Generate on-demand
  const tile = await generateTile(url);
  return new Response(tile, { headers: { 'Content-Type': 'image/jpeg' } });
}
```

### Express Server (Docker)

```javascript
// server/routes/tiles.js
const express = require('express');
const sharp = require('sharp');
const router = express.Router();

router.get('/tiles/:assetId/:z/:x/:y.jpg', async (req, res) => {
  const { assetId, z, x, y } = req.params;
  const tilePath = `/data/tiles/${assetId}/${z}/${x}-${y}.jpg`;
  
  try {
    // Check if tile exists on disk
    await fs.access(tilePath);
    return res.sendFile(tilePath);
  } catch (e) {
    // Generate tile using sharp
    const assetPath = `/data/assets/${assetId}`;
    const tile = await generateTileWithSharp(assetPath, z, x, y);
    
    // Save for future
    await fs.mkdir(path.dirname(tilePath), { recursive: true });
    await fs.writeFile(tilePath, tile);
    
    res.set('Content-Type', 'image/jpeg');
    res.send(tile);
  }
});
```

### Abstraction Layer

```typescript
// services/iiif/TileResolver.ts
export interface TileResolver {
  getTileUrl(assetId: string, level: number, x: number, y: number): string;
  getInfoJson(assetId: string): Promise<IIIFInfo>;
}

// Web/Tauri: Use relative URLs (Service Worker intercepts)
class ServiceWorkerTileResolver implements TileResolver {
  getTileUrl(assetId: string, level: number, x: number, y: number): string {
    return `/tiles/${assetId}/${level}/${x}_${y}.jpg`;
  }
}

// Docker: Use API endpoints
class ApiTileResolver implements TileResolver {
  getTileUrl(assetId: string, level: number, x: number, y: number): string {
    return `${API_BASE}/tiles/${assetId}/${level}/${x}_${y}.jpg`;
  }
}
```

---

## Data Synchronization Strategy

### Web + Tauri (P2P via WebRTC)

```typescript
// services/sync/WebRTCSync.ts
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

export class WebRTCSync {
  private doc: Y.Doc;
  private provider: WebrtcProvider;
  
  constructor(roomName: string) {
    this.doc = new Y.Doc();
    this.provider = new WebrtcProvider(roomName, this.doc, {
      signaling: ['wss://signaling.yjs.dev']
    });
  }
  
  getAwareness() {
    return this.provider.awareness;
  }
}
```

### Docker (Server-Mediated via WebSocket)

```typescript
// services/sync/WebSocketSync.ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export class WebSocketSync {
  private doc: Y.Doc;
  private provider: WebsocketProvider;
  
  constructor(roomName: string) {
    this.doc = new Y.Doc();
    // Connect to self-hosted y-websocket server
    this.provider = new WebsocketProvider(
      'wss://your-docker-server.com/ws',
      roomName,
      this.doc
    );
  }
}
```

### Unified Interface

```typescript
// services/sync/index.ts
export interface SyncProvider {
  connect(): Promise<void>;
  disconnect(): void;
  getDocument(): Y.Doc;
  getUsers(): User[];
}

export async function createSyncProvider(roomName: string): Promise<SyncProvider> {
  const platform = detectPlatform();
  
  if (platform === 'docker') {
    const { WebSocketSync } = await import('./WebSocketSync');
    return new WebSocketSync(roomName);
  } else {
    const { WebRTCSync } = await import('./WebRTCSync');
    return new WebRTCSync(roomName);
  }
}
```

---

## Build & Deployment Configuration

### Environment Variables

```typescript
// .env (shared)
VITE_APP_NAME=IIIF Field Archive Studio
VITE_APP_VERSION=1.0.0

// .env.web (GitHub Pages)
VITE_DEPLOYMENT_TARGET=web
VITE_API_BASE_URL=

// .env.docker (Docker deployment)
VITE_DEPLOYMENT_TARGET=docker
VITE_API_BASE_URL=/api

// .env.tauri (Desktop)
VITE_DEPLOYMENT_TARGET=tauri
VITE_API_BASE_URL=
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_DEPLOYMENT_TARGET || 'web';
  
  return {
    base: target === 'web' ? '/field-studio/' : '/',
    define: {
      __DEPLOYMENT_TARGET__: JSON.stringify(target),
    },
    plugins: [
      react(),
      target === 'docker' && nodePolyfills(), // For server-side deps
    ].filter(Boolean),
  };
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "dev:docker": "VITE_DEPLOYMENT_TARGET=docker vite",
    "dev:tauri": "tauri dev",
    
    "build": "VITE_DEPLOYMENT_TARGET=web vite build",
    "build:docker": "VITE_DEPLOYMENT_TARGET=docker vite build",
    "build:tauri": "tauri build",
    
    "deploy:gh": "npm run build && gh-pages -d dist",
    "deploy:docker": "docker build -t field-studio . && docker push",
    
    "tauri": "tauri"
  }
}
```

---

## Testing Strategy for Feature Parity

### E2E Test Matrix

```typescript
// e2e/features.spec.ts
describe('Feature Parity', () => {
  const platforms = ['web', 'docker', 'tauri'];
  
  platforms.forEach(platform => {
    describe(`${platform} platform`, () => {
      beforeEach(() => {
        cy.visit(`/${platform}`);
      });
      
      it('imports images', () => {
        cy.get('[data-testid=import-btn]').click();
        // Platform-specific file selection
        cy.fixture('test.jpg').then(fileContent => {
          if (platform === 'docker') {
            cy.get('input[type=file]').attachFile({
              fileContent,
              fileName: 'test.jpg',
              mimeType: 'image/jpeg'
            });
          }
        });
        cy.get('[data-testid=import-complete]').should('exist');
      });
      
      it('generates IIIF manifests', () => {
        cy.get('[data-testid=create-manifest]').click();
        cy.get('[data-testid=manifest-editor]').should('exist');
      });
      
      it('exports bundles', () => {
        cy.get('[data-testid=export-btn]').click();
        cy.get('[data-testid=export-complete]').should('exist');
      });
    });
  });
});
```

### Feature Capability Detection Tests

```typescript
// tests/platform-capabilities.spec.ts
describe('Platform Capabilities', () => {
  it('detects platform correctly', () => {
    const platform = detectPlatform();
    expect(['web', 'docker', 'tauri']).toContain(platform);
  });
  
  it('has appropriate storage adapter', () => {
    const storage = createStorageAdapter();
    
    if (detectPlatform() === 'docker') {
      expect(storage).toBeInstanceOf(HttpStorage);
    } else {
      expect(storage).toBeInstanceOf(IndexedDBStorage);
    }
  });
  
  it('has appropriate sync provider', () => {
    const sync = createSyncProvider('test-room');
    
    if (detectPlatform() === 'docker') {
      expect(sync).toBeInstanceOf(WebSocketSync);
    } else {
      expect(sync).toBeInstanceOf(WebRTCSync);
    }
  });
});
```

---

## CI/CD Pipeline for Multi-Platform Builds

```yaml
# .github/workflows/deploy-all.yml
name: Deploy All Platforms

on:
  push:
    tags:
      - 'v*'

jobs:
  # 1. Build and deploy web (GitHub Pages)
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist

  # 2. Build and push Docker image
  deploy-docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - run: docker build -t field-studio:${{ github.ref_name }} .
      - run: docker push field-studio:${{ github.ref_name }}

  # 3. Build Tauri apps (Windows + Flatpak only)
  deploy-tauri:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: ubuntu-latest
            target: flatpak
          - platform: windows-latest
            target: msi
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: dtolnay/rust-toolchain@stable
      
      - name: Install Linux dependencies (Flatpak)
        if: matrix.target == 'flatpak'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev flatpak-builder
          sudo flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
          sudo flatpak install -y org.freedesktop.Platform//23.08 org.freedesktop.Sdk//23.08
      
      - name: Install Windows dependencies
        if: matrix.target == 'msi'
        run: |
          # Windows build tools already available in runner
          echo "Windows build environment ready"
      
      - run: npm ci
      
      - name: Build Tauri (${{ matrix.target }})
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Field Studio ${{ github.ref_name }} (${{ matrix.target }})'
          args: ${{ matrix.target == 'flatpak' && '--target x86_64-unknown-linux-gnu' || '' }}
```

---

## Handling Platform-Specific Limitations

### Graceful Degradation

```typescript
// components/ImportButton.tsx
export function ImportButton() {
  const platform = detectPlatform();
  const capabilities = getPlatformCapabilities(platform);
  
  if (!capabilities.fileSystem) {
    return (
      <Tooltip content="File import not available in this deployment">
        <Button disabled>Import</Button>
      </Tooltip>
    );
  }
  
  return <Button onClick={handleImport}>Import</Button>;
}
```

### Feature Flags

```typescript
// config/features.ts
export const FEATURES = {
  NATIVE_FS: detectPlatform() === 'tauri',
  SERVER_SYNC: detectPlatform() === 'docker',
  OFFLINE_MODE: detectPlatform() !== 'docker',
  MULTI_USER: detectPlatform() === 'docker',
  P2P_SYNC: detectPlatform() !== 'docker',
  AUTO_UPDATE: detectPlatform() === 'tauri',
} as const;

// Usage
import { FEATURES } from '@/config/features';

function SyncSettings() {
  if (!FEATURES.P2P_SYNC && !FEATURES.SERVER_SYNC) {
    return <p>Sync not available in this deployment</p>;
  }
  
  return (
    <div>
      {FEATURES.P2P_SYNC && <WebRTCSyncSettings />}
      {FEATURES.SERVER_SYNC && <ServerSyncSettings />}
    </div>
  );
}
```

---

## Path Forward: Phased Implementation

### Phase 1: Foundation (Weeks 1-2)
- [ ] Implement `UnifiedStorage` interface
- [ ] Create `WebStorageAdapter` with IndexedDB + OPFS
- [ ] Update Service Worker for OPFS tile serving
- [ ] Add storage statistics dashboard

### Phase 2: Docker Support (Weeks 3-4)
- [ ] Create `DockerStorageAdapter`
- [ ] Build Express tile server
- [ ] Implement PostgreSQL schema
- [ ] Create docker-compose.yml

### Phase 3: Tauri Support (Weeks 5-6)
- [ ] Create `TauriStorageAdapter`
- [ ] Add Tauri FS commands
- [ ] Test Service Worker in Tauri webview
- [ ] Build Windows MSI installer
- [ ] Build Flatpak bundle for Linux

### Phase 4: Advanced Features (Weeks 7-8)
- [ ] Add SQLite Wasm for large metadata (Web)
- [ ] Implement LRU cache manager
- [ ] Add cloud provider integration
- [ ] Create universal export/import

### Phase 5: Safari Optimization (Weeks 9-10)
- [ ] Implement 7-day eviction handling
- [ ] Add PWA install prompt
- [ ] Cache API backup layer
- [ ] Test on iOS devices

---

## Related Documents

- [docker-vs-tauri-comparison.md](./docker-vs-tauri-comparison.md) - Detailed deployment comparison
- [storage-strategy-across-deployments.md](./storage-strategy-across-deployments.md) - Storage architecture details
- [ADVANCED_STORAGE_STRATEGIES.md](../ADVANCED_STORAGE_STRATEGIES.md) - Advanced browser storage
- [STORAGE_LIMITS_SOLUTIONS.md](../STORAGE_LIMITS_SOLUTIONS.md) - Storage limit mitigation

---

*Document Version: 1.1*  
*Last Updated: 2026-01-29*
