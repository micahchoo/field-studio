# Field Studio - Detailed Implementation Plan
## Multi-Platform Deployment Strategy

> **Project**: IIIF Field Archive Studio v3.0.0  
> **Scope**: Web (GitHub Pages), Docker (Server), Tauri (Desktop)  
> **Timeline**: 10 Weeks (Phased Approach)  
> **Based on**: `docker-vs-tauri-comparison.md`, `feature-parity-maintenance.md`, `storage-strategy-across-deployments.md`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Phase 1: Foundation & Unified Storage (Weeks 1-2)](#phase-1-foundation--unified-storage-weeks-1-2)
4. [Phase 2: Tauri Desktop Support (Weeks 3-4)](#phase-2-tauri-desktop-support-weeks-3-4)
5. [Phase 3: Docker Server Support (Weeks 5-7)](#phase-3-docker-server-support-weeks-5-7)
6. [Phase 4: Advanced Features & Optimization (Weeks 8-9)](#phase-4-advanced-features--optimization-weeks-8-9)
7. [Phase 5: Safari & Mobile Optimization (Week 10)](#phase-5-safari--mobile-optimization-week-10)
8. [CI/CD Pipeline Configuration](#cicd-pipeline-configuration)
9. [Testing Strategy](#testing-strategy)
10. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

### Recommended Implementation Path

Following the documentation guides, we adopt a **Tauri-first approach** with phased Docker addition:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPLEMENTATION TIMELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Week 1-2    Week 3-4      Week 5-7       Week 8-9       Week 10            │
│     │            │            │              │              │               │
│     ▼            ▼            ▼              ▼              ▼               │
│  ┌──────┐    ┌──────┐    ┌──────┐       ┌──────┐       ┌──────┐            │
│  │FOUND-│    │TAURI │    │DOCKER │       │ADVANCED│      │SAFARI│            │
│  │ATION │    │DESKTOP│   │SERVER │       │FEATURES│      │MOBILE│            │
│  └──────┘    └──────┘    └──────┘       └──────┘       └──────┘            │
│     │            │            │              │              │               │
│  Unified     Native FS    Express API    SQLite Wasm   PWA/Cache           │
│  Storage     Integration   PostgreSQL     Cloud Sync    API Backup          │
│  Adapter     Auto-updater  Multi-user     LRU Manager   iOS Testing         │
│                                                                              │
│  RISK: LOW   RISK: LOW    RISK: MEDIUM   RISK: LOW      RISK: LOW          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Decision Rationale

| Factor | Docker First | Tauri First | Chosen |
|--------|-------------|-------------|--------|
| Architecture Change | Major refactor | Minimal | ✅ Tauri |
| Time to Deploy | 2-4 weeks | 3-5 days | ✅ Tauri |
| Code Preservation | Significant changes | 95% preserved | ✅ Tauri |
| Local-first Alignment | Compromised | Preserved | ✅ Tauri |
| Offline Capability | None | Full | ✅ Tauri |
| Institutional Need | Unknown | Emerging | Docker later |

---

## Current Architecture Analysis

### Existing Storage Layer (`services/storage.ts`)

```typescript
// Current: Direct IndexedDB implementation
class StorageService {
  private _dbPromise: Promise<IDBPDatabase<BiiifDB>> | null = null;
  
  async saveAsset(file: File | Blob, id: string): Promise<void>
  async saveProject(root: IIIFItem): Promise<void>
  async saveTile(assetId, level, x, y, blob): Promise<void>
  // ... 579 lines
}
export const storage = new StorageService();
```

### Existing Service Worker (`public/sw.js`)

```javascript
// Current: Browser-only tile serving
const TILE_CACHE_NAME = 'iiif-tile-cache-v3';
const CACHE_LIMIT = 500 * 1024 * 1024; // 500MB

// Handles: /tiles/{assetId}/{level}/{x}_{y}.jpg
// Strategy: Cache API -> IndexedDB (via MessageChannel) -> 404
```

### Current Platform Detection

```typescript
// Currently missing - needs to be added
function detectPlatform(): 'web' | 'docker' | 'tauri' {
  if ((window as any).__TAURI__) return 'tauri';
  if (import.meta.env.VITE_DEPLOYMENT_TARGET === 'docker') return 'docker';
  return 'web';
}
```

---

## Phase 1: Foundation & Unified Storage (Weeks 1-2)

### Scope Note: Tauri Platforms

This implementation plan covers **Tauri desktop builds for:**
- **Windows** (MSI installer)
- **Linux** (Flatpak bundle)

macOS/DMG builds are not included in this plan.

---

### Week 1: Core Interface & Abstraction Layer

#### Day 1-2: Create Unified Storage Interface

**File**: `services/storage/StorageAdapter.ts`

```typescript
export interface StorageAdapter {
  // Lifecycle
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  
  // File operations
  saveFile(id: string, blob: Blob, metadata: FileMetadata): Promise<void>;
  getFile(id: string): Promise<Blob | null>;
  deleteFile(id: string): Promise<void>;
  fileExists(id: string): Promise<boolean>;
  
  // IIIF Tile operations (critical for all platforms)
  saveTile(assetId: string, z: number, x: number, y: number, blob: Blob): Promise<void>;
  getTile(assetId: string, z: number, x: number, y: number): Promise<Blob | null>;
  saveTileManifest(manifest: TileManifest): Promise<void>;
  getTileManifest(assetId: string): Promise<TileManifest | null>;
  
  // Project operations
  saveProject(root: IIIFItem): Promise<void>;
  loadProject(): Promise<IIIFItem | null>;
  
  // Storage management
  getStorageStats(): Promise<StorageStats>;
  evictLRU(targetBytes: number): Promise<void>;
  
  // Export/Import for migration
  exportAll(): Promise<Blob>;
  importAll(blob: Blob): Promise<void>;
}

export interface FileMetadata {
  id: string;
  filename: string;
  size: number;
  hash: string;
  mimeType: string;
  createdAt: number;
  accessedAt: number;
  storage: {
    type: 'indexeddb' | 'opfs' | 'native' | 'cloud';
    path?: string; // For native FS
  };
}
```

#### Day 3-4: Implement WebStorageAdapter

**File**: `services/storage/WebStorageAdapter.ts`

```typescript
export class WebStorageAdapter implements StorageAdapter {
  private db: IDBPDatabase<BiiifDB> | null = null;
  private opfsRoot: FileSystemDirectoryHandle | null = null;
  private useOPFS: boolean = false;
  
  async initialize(): Promise<void> {
    // Initialize IndexedDB
    this.db = await openDB<BiiifDB>(DB_NAME, 4, { /* upgrade */ });
    
    // Check OPFS support
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      try {
        this.opfsRoot = await navigator.storage.getDirectory();
        this.useOPFS = true;
      } catch (e) {
        console.warn('[WebStorage] OPFS not available:', e);
      }
    }
  }
  
  async saveFile(id: string, blob: Blob, metadata: FileMetadata): Promise<void> {
    const size = blob.size;
    
    // Strategy: Large files (>10MB) -> OPFS, Small files -> IndexedDB
    if (this.useOPFS && size > 10 * 1024 * 1024) {
      await this.saveToOPFS(id, blob);
      metadata.storage = { type: 'opfs' };
    } else {
      await this.db!.put('files', blob, id);
      metadata.storage = { type: 'indexeddb' };
    }
    
    // Save metadata
    await this.db!.put('fileMetadata', metadata, id);
  }
  
  private async saveToOPFS(id: string, blob: Blob): Promise<void> {
    const fileHandle = await this.opfsRoot!.getFileHandle(id, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
  
  // ... other methods
}
```

#### Day 5: Update Service Worker for OPFS

**File**: `public/sw.js` (Modifications)

```javascript
// Add OPFS support to Service Worker
async function fetchTileFromStorage(assetId, level, x, y, format) {
  // Try OPFS first (if in browser context)
  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      const root = await navigator.storage.getDirectory();
      const tilesDir = await root.getDirectoryHandle('tiles');
      const assetDir = await tilesDir.getDirectoryHandle(assetId);
      const levelDir = await assetDir.getDirectoryHandle(String(level));
      const fileHandle = await levelDir.getFileHandle(`${x}-${y}.jpg`);
      return await fileHandle.getFile();
    } catch (e) {
      // Not in OPFS, fall through
    }
  }
  
  // Fall back to IndexedDB via main thread
  return await fetchTileFromIndexedDB(assetId, level, x, y, format);
}
```

### Week 2: Platform Detection & Migration

#### Day 1-2: Platform Detection Utility

**File**: `utils/platform.ts`

```typescript
export type Platform = 'web' | 'docker' | 'tauri';
export type PlatformCapabilities = {
  platform: Platform;
  nativeFS: boolean;
  offlineMode: boolean;
  multiUser: boolean;
  autoUpdate: boolean;
  p2pSync: boolean;
  serverSync: boolean;
  maxStorage: number; // bytes, 0 = unlimited
};

export function detectPlatform(): Platform {
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    return 'tauri';
  }
  if (import.meta.env.VITE_DEPLOYMENT_TARGET === 'docker') {
    return 'docker';
  }
  return 'web';
}

export function getPlatformCapabilities(): PlatformCapabilities {
  const platform = detectPlatform();
  
  switch (platform) {
    case 'tauri':
      return {
        platform,
        nativeFS: true,
        offlineMode: true,
        multiUser: false,
        autoUpdate: true,
        p2pSync: true,
        serverSync: false,
        maxStorage: 0 // Unlimited (disk limited)
      };
    case 'docker':
      return {
        platform,
        nativeFS: false,
        offlineMode: false,
        multiUser: true,
        autoUpdate: false,
        p2pSync: false,
        serverSync: true,
        maxStorage: 0 // Server disk
      };
    case 'web':
    default:
      return {
        platform,
        nativeFS: false,
        offlineMode: 'serviceWorker' in navigator,
        multiUser: false,
        autoUpdate: false,
        p2pSync: true,
        serverSync: false,
        maxStorage: 10 * 1024 * 1024 * 1024 // 10GB (browser limit)
      };
  }
}
```

#### Day 3-4: Storage Factory & Migration

**File**: `services/storage/index.ts`

```typescript
import { WebStorageAdapter } from './WebStorageAdapter';
import { TauriStorageAdapter } from './TauriStorageAdapter';
import { DockerStorageAdapter } from './DockerStorageAdapter';
import { detectPlatform } from '@/utils/platform';

export function createStorageAdapter(): StorageAdapter {
  const platform = detectPlatform();
  
  switch (platform) {
    case 'tauri':
      return new TauriStorageAdapter();
    case 'docker':
      return new DockerStorageAdapter(
        import.meta.env.VITE_API_BASE_URL || '/api'
      );
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

// Legacy compatibility - redirect old storage calls
export const storage = {
  saveProject: async (root: IIIFItem) => {
    const s = await getStorage();
    return s.saveProject(root);
  },
  loadProject: async () => {
    const s = await getStorage();
    return s.loadProject();
  },
  // ... other legacy methods
};
```

#### Day 5: Feature Flags Integration

**File**: `config/features.ts`

```typescript
import { detectPlatform, getPlatformCapabilities } from '@/utils/platform';

export const FEATURES = {
  NATIVE_FS: detectPlatform() === 'tauri',
  SERVER_SYNC: detectPlatform() === 'docker',
  OFFLINE_MODE: detectPlatform() !== 'docker',
  MULTI_USER: detectPlatform() === 'docker',
  P2P_SYNC: detectPlatform() !== 'docker',
  AUTO_UPDATE: detectPlatform() === 'tauri',
  OPFS: detectPlatform() === 'web',
  IIIF_SERVICE_WORKER: detectPlatform() !== 'docker',
  VOLUME_MOUNTS: detectPlatform() === 'docker',
} as const;

export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}
```

### Phase 1 Deliverables

- [ ] `StorageAdapter` interface defined
- [ ] `WebStorageAdapter` implemented with OPFS support
- [ ] `detectPlatform()` utility working
- [ ] Storage factory pattern implemented
- [ ] Backward compatibility layer for existing code
- [ ] Service Worker updated for OPFS

---

## Phase 2: Tauri Desktop Support (Weeks 3-4)

### Week 3: Tauri Integration

#### Day 1: Environment Setup

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
npm install --save-dev @tauri-apps/cli

# Initialize Tauri (creates src-tauri/)
npx tauri init
```

#### Day 2-3: Tauri Configuration

**File**: `src-tauri/tauri.conf.json`

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "IIIF Field Archive Studio",
  "version": "3.0.0",
  "identifier": "studio.field.iiif.archive",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "IIIF Field Archive Studio",
        "width": 1400,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 768,
        "resizable": true,
        "center": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' blob: data:; connect-src 'self' blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["deb", "dmg", "msi", "appimage"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

**File**: `src-tauri/capabilities/default.json`

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main-capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:allow-read-file",
    "fs:allow-read-dir",
    "fs:allow-write-file",
    "fs:allow-create-dir",
    "fs:allow-remove",
    {
      "identifier": "fs:scope",
      "allow": [
        { "path": "$APPDATA" },
        { "path": "$APPDATA/**" },
        { "path": "$HOME/Documents/FieldStudio" },
        { "path": "$HOME/Documents/FieldStudio/**" },
        { "path": "$DOWNLOAD/**" }
      ]
    },
    "dialog:allow-open",
    "dialog:allow-save",
    "dialog:allow-ask",
    "shell:allow-open"
  ]
}
```

**Flatpak-Specific Permissions** (`studio.field.iiif.archive.yml`):

```yaml
app-id: studio.field.iiif.archive
runtime: org.freedesktop.Platform
runtime-version: '23.08'
sdk: org.freedesktop.Sdk
command: field-studio
finish-args:
  # X11/Wayland access
  - --socket=x11
  - --socket=wayland
  - --device=dri
  # File system access
  - --filesystem=home:rw
  - --filesystem=xdg-documents/FieldStudio:create
  # Network for sync
  - --share=network
  # Notifications
  - --talk-name=org.freedesktop.Notifications
modules:
  - name: field-studio
    buildsystem: simple
    sources:
      - type: dir
        path: ./src-tauri/target/release/bundle/flatpak
    build-commands:
      - install -Dm755 field-studio /app/bin/field-studio
```

#### Day 4-5: Rust Backend Commands

**File**: `src-tauri/src/main.rs`

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, State};
use std::path::PathBuf;
use std::fs;
use std::sync::Mutex;

// App state for storage paths
struct AppState {
    app_data_dir: Mutex<PathBuf>,
}

#[tauri::command]
async fn get_app_data_dir(state: State<'_, AppState>) -> Result<String, String> {
    let dir = state.app_data_dir.lock().map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn write_file(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
async fn read_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn file_exists(path: String) -> Result<bool, String> {
    Ok(fs::metadata(&path).is_ok())
}

#[tauri::command]
async fn create_dir_all(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_dir_all(path: String) -> Result<(), String> {
    fs::remove_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn read_dir(path: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut paths = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            paths.push(entry.path().to_string_lossy().to_string());
        }
    }
    Ok(paths)
}

#[tauri::command]
async fn get_storage_stats(path: String) -> Result<serde_json::Value, String> {
    use std::collections::VecDeque;
    
    let mut total_size: u64 = 0;
    let mut file_count: u64 = 0;
    let mut dir_queue: VecDeque<PathBuf> = VecDeque::new();
    dir_queue.push_back(PathBuf::from(&path));
    
    while let Some(dir) = dir_queue.pop_front() {
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let metadata = entry.metadata();
                if let Ok(metadata) = metadata {
                    if metadata.is_file() {
                        total_size += metadata.len();
                        file_count += 1;
                    } else if metadata.is_dir() {
                        dir_queue.push_back(entry.path());
                    }
                }
            }
        }
    }
    
    Ok(serde_json::json!({
        "totalSize": total_size,
        "fileCount": file_count
    }))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_data_dir)?;
            
            // Create subdirectories
            fs::create_dir_all(app_data_dir.join("assets"))?;
            fs::create_dir_all(app_data_dir.join("tiles"))?;
            fs::create_dir_all(app_data_dir.join("projects"))?;
            
            app.manage(AppState {
                app_data_dir: Mutex::new(app_data_dir),
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            write_file,
            read_file,
            file_exists,
            create_dir_all,
            remove_file,
            remove_dir_all,
            read_dir,
            get_storage_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Week 4: Tauri Frontend Integration

#### Day 1-2: TauriStorageAdapter

**File**: `services/storage/TauriStorageAdapter.ts`

```typescript
import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { StorageAdapter, FileMetadata, TileManifest, StorageStats } from './StorageAdapter';
import { IIIFItem } from '@/types';
import { openDB, IDBPDatabase } from 'idb';

interface TauriDBSchema {
  metadata: {
    key: string;
    value: FileMetadata;
  };
  projects: {
    key: string;
    value: IIIFItem;
  };
}

export class TauriStorageAdapter implements StorageAdapter {
  private appDataDir: string = '';
  private db: IDBPDatabase<TauriDBSchema> | null = null;
  
  async initialize(): Promise<void> {
    // Get Tauri app data directory
    this.appDataDir = await appDataDir();
    
    // Initialize IndexedDB for metadata (files stored natively)
    this.db = await openDB<TauriDBSchema>('field-studio-tauri', 1, {
      upgrade(db) {
        db.createObjectStore('metadata');
        db.createObjectStore('projects');
      }
    });
    
    console.log('[TauriStorage] Initialized with app data dir:', this.appDataDir);
  }
  
  async dispose(): Promise<void> {
    this.db?.close();
  }
  
  async saveFile(id: string, blob: Blob, metadata: FileMetadata): Promise<void> {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Store file natively
    const filePath = await join(this.appDataDir, 'assets', id);
    await invoke('write_file', { path: filePath, data: Array.from(uint8Array) });
    
    // Store metadata in IndexedDB
    metadata.storage = { type: 'native', path: filePath };
    await this.db!.put('metadata', metadata, id);
  }
  
  async getFile(id: string): Promise<Blob | null> {
    const metadata = await this.db!.get('metadata', id);
    if (!metadata?.storage.path) return null;
    
    const data = await invoke<number[]>('read_file', { path: metadata.storage.path });
    return new Blob([new Uint8Array(data)]);
  }
  
  async deleteFile(id: string): Promise<void> {
    const metadata = await this.db!.get('metadata', id);
    if (metadata?.storage.path) {
      await invoke('remove_file', { path: metadata.storage.path });
    }
    await this.db!.delete('metadata', id);
  }
  
  async saveTile(assetId: string, z: number, x: number, y: number, blob: Blob): Promise<void> {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const tileDir = await join(this.appDataDir, 'tiles', assetId, String(z));
    await invoke('create_dir_all', { path: tileDir });
    
    const tilePath = await join(tileDir, `${x}-${y}.jpg`);
    await invoke('write_file', { path: tilePath, data: Array.from(uint8Array) });
  }
  
  async getTile(assetId: string, z: number, x: number, y: number): Promise<Blob | null> {
    try {
      const tilePath = await join(this.appDataDir, 'tiles', assetId, String(z), `${x}-${y}.jpg`);
      const data = await invoke<number[]>('read_file', { path: tilePath });
      return new Blob([new Uint8Array(data)], { type: 'image/jpeg' });
    } catch (e) {
      return null;
    }
  }
  
  async saveProject(root: IIIFItem): Promise<void> {
    const projectPath = await join(this.appDataDir, 'projects', 'current.json');
    const data = new TextEncoder().encode(JSON.stringify(root));
    await invoke('write_file', { 
      path: projectPath, 
      data: Array.from(data) 
    });
    
    // Also save to IndexedDB for quick access
    await this.db!.put('projects', root, 'current');
  }
  
  async loadProject(): Promise<IIIFItem | null> {
    // Try IndexedDB first (faster)
    const cached = await this.db!.get('projects', 'current');
    if (cached) return cached;
    
    // Fall back to file
    try {
      const projectPath = await join(this.appDataDir, 'projects', 'current.json');
      const data = await invoke<number[]>('read_file', { path: projectPath });
      const json = new TextDecoder().decode(new Uint8Array(data));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }
  
  async getStorageStats(): Promise<StorageStats> {
    const stats = await invoke<{ totalSize: number; fileCount: number }>('get_storage_stats', {
      path: this.appDataDir
    });
    
    return {
      totalUsed: stats.totalSize,
      totalQuota: 0, // Unlimited in desktop
      fileCount: stats.fileCount,
      localSize: stats.totalSize,
      cloudSize: 0
    };
  }
  
  // ... other methods
}
```

#### Day 3-4: Native File System Dialogs

**File**: `services/nativeFs.ts`

```typescript
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';

export interface ImportFileInfo {
  path: string;
  name: string;
  size: number;
  data: Uint8Array;
}

export async function nativeImportFiles(): Promise<ImportFileInfo[] | null> {
  const selected = await open({
    multiple: true,
    directory: false,
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp'] },
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg'] },
      { name: 'Video', extensions: ['mp4', 'webm', 'mov'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!selected) return null;
  
  const paths = Array.isArray(selected) ? selected : [selected];
  const files: ImportFileInfo[] = [];
  
  for (const path of paths) {
    const data = await readFile(path);
    const stats = await invoke<{ size: number }>('get_file_stats', { path });
    const name = path.split(/[/\\]/).pop() || '';
    
    files.push({ path, name, size: stats.size, data });
  }
  
  return files;
}

export async function nativeImportDirectory(): Promise<ImportFileInfo[] | null> {
  const selected = await open({
    multiple: false,
    directory: true
  });
  
  if (!selected || Array.isArray(selected)) return null;
  
  // Recursively read directory
  const files: ImportFileInfo[] = [];
  const entries = await invoke<string[]>('read_dir_recursive', { path: selected });
  
  for (const entry of entries) {
    if (/\.(jpg|jpeg|png|tiff|tif|webp|mp3|mp4)$/i.test(entry)) {
      const data = await readFile(entry);
      const stats = await invoke<{ size: number }>('get_file_stats', { path: entry });
      const name = entry.split(/[/\\]/).pop() || '';
      
      files.push({ path: entry, name, size: stats.size, data });
    }
  }
  
  return files;
}

export async function nativeExportBundle(data: Blob, defaultName: string): Promise<boolean> {
  const destination = await save({
    filters: [
      { name: 'IIIF Bundle', extensions: ['zip'] },
      { name: 'JSON', extensions: ['json'] }
    ],
    defaultPath: defaultName
  });
  
  if (!destination) return false;
  
  const arrayBuffer = await data.arrayBuffer();
  await invoke('write_file', {
    path: destination,
    data: Array.from(new Uint8Array(arrayBuffer))
  });
  
  return true;
}
```

#### Day 5: Package Scripts & Testing

**File**: `package.json` (Additions)

```json
{
  "scripts": {
    "dev": "vite",
    "dev:tauri": "tauri dev",
    "build": "vite build",
    "build:tauri": "tauri build",
    "tauri": "tauri",
    "preview": "vite preview"
  }
}
```

### Phase 2 Deliverables

- [ ] Tauri initialized and configured
- [ ] Rust backend with file system commands
- [ ] `TauriStorageAdapter` implemented
- [ ] Native file dialogs integrated
- [ ] **Windows**: MSI installer build working
- [ ] **Linux**: Flatpak bundle build working
- [ ] Auto-update configuration (Windows only)

---

## Phase 3: Docker Server Support (Weeks 5-7)

### Week 5: Backend API Design

#### Day 1-2: Express Server Setup

**File**: `server/index.js`

```javascript
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const { Pool } = require('pg');
const Redis = require('ioredis');

const app = express();
const port = process.env.PORT || 3000;

// Database connections
const pg = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/fieldstudio'
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use(cors());
app.use(express.json());

// File upload configuration
const upload = multer({ dest: '/tmp/uploads/' });

// Health check
app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', version: '3.0.0' });
});

app.listen(port, () => {
  console.log(`Field Studio Server running on port ${port}`);
});
```

#### Day 3-5: Database Schema

**File**: `server/schema.sql`

```sql
-- Files table (content-addressable)
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY, -- SHA-256 hash
  filename TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in file system
  created_at TIMESTAMP DEFAULT NOW()
);

-- IIIF Tree (normalized structure)
CREATE TABLE IF NOT EXISTS iiif_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('Collection', 'Manifest', 'Canvas', 'Range')),
  parent_id UUID REFERENCES iiif_entities(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Multi-parent collection membership
CREATE TABLE IF NOT EXISTS collection_members (
  collection_id UUID REFERENCES iiif_entities(id) ON DELETE CASCADE,
  member_id UUID REFERENCES iiif_entities(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, member_id)
);

-- Tile storage
CREATE TABLE IF NOT EXISTS tiles (
  asset_id TEXT REFERENCES files(id) ON DELETE CASCADE,
  z INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (asset_id, z, x, y)
);

-- Tile manifests
CREATE TABLE IF NOT EXISTS tile_manifests (
  asset_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
  levels INTEGER NOT NULL,
  tile_size INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  total_tiles INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_entities_type ON iiif_entities(type);
CREATE INDEX idx_entities_parent ON iiif_entities(parent_id);
CREATE INDEX idx_collection_members ON collection_members(collection_id);
```

### Week 6: API Implementation

#### Day 1-2: File & Project Endpoints

**File**: `server/routes/files.js`

```javascript
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const router = express.Router();

const ASSETS_DIR = process.env.ASSETS_DIR || '/data/assets';

// Upload file
router.post('/files/:id', async (req, res) => {
  const { id } = req.params;
  const { filename, mimeType } = req.body;
  
  // File data sent as binary
  const filePath = path.join(ASSETS_DIR, id);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  
  // Write stream from request
  const writeStream = fs.createWriteStream(filePath);
  req.pipe(writeStream);
  
  writeStream.on('finish', async () => {
    const stats = await fs.stat(filePath);
    
    await pg.query(
      'INSERT INTO files (id, filename, mime_type, size, storage_path) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET filename = $2',
      [id, filename, mimeType, stats.size, filePath]
    );
    
    res.json({ id, size: stats.size });
  });
});

// Get file
router.get('/files/:id', async (req, res) => {
  const { id } = req.params;
  
  const result = await pg.query('SELECT * FROM files WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const file = result.rows[0];
  res.sendFile(file.storage_path);
});

// Project endpoints
router.get('/project', async (req, res) => {
  const result = await pg.query(
    "SELECT data FROM iiif_entities WHERE id = 'root'"
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'No project found' });
  }
  
  res.json(result.rows[0].data);
});

router.post('/project', async (req, res) => {
  const { root } = req.body;
  
  await pg.query(
    `INSERT INTO iiif_entities (id, type, data) 
     VALUES ('root', 'Collection', $1) 
     ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
    [JSON.stringify(root)]
  );
  
  res.json({ success: true });
});

module.exports = router;
```

#### Day 3-5: IIIF Tile Server

**File**: `server/routes/tiles.js`

```javascript
const express = require('express');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const TILES_DIR = process.env.TILES_DIR || '/data/tiles';
const ASSETS_DIR = process.env.ASSETS_DIR || '/data/assets';

// IIIF Image API 3.0 info.json
router.get('/tiles/:assetId/info.json', async (req, res) => {
  const { assetId } = req.params;
  
  const result = await pg.query(
    'SELECT * FROM tile_manifests WHERE asset_id = $1',
    [assetId]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Manifest not found' });
  }
  
  const manifest = result.rows[0];
  
  const scaleFactors = [];
  for (let i = 0; i < manifest.levels; i++) {
    scaleFactors.push(Math.pow(2, i));
  }
  
  const info = {
    '@context': 'http://iiif.io/api/image/3/context.json',
    id: `${req.protocol}://${req.get('host')}/api/tiles/${assetId}`,
    type: 'ImageService3',
    protocol: 'http://iiif.io/api/image',
    profile: 'level1',
    width: manifest.width,
    height: manifest.height,
    tiles: [{
      width: manifest.tile_size,
      height: manifest.tile_size,
      scaleFactors
    }],
    preferredFormats: ['jpg']
  };
  
  res.json(info);
});

// Serve tile
router.get('/tiles/:assetId/:z/:x/:y.jpg', async (req, res) => {
  const { assetId, z, x, y } = req.params;
  const tilePath = path.join(TILES_DIR, assetId, z, `${x}-${y}.jpg`);
  
  try {
    // Check if tile exists
    await fs.access(tilePath);
    return res.sendFile(tilePath);
  } catch (e) {
    // Generate tile on-demand
    const assetPath = path.join(ASSETS_DIR, assetId);
    
    try {
      const tile = await generateTile(assetPath, parseInt(z), parseInt(x), parseInt(y));
      
      // Save for future
      await fs.mkdir(path.dirname(tilePath), { recursive: true });
      await fs.writeFile(tilePath, tile);
      
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=31536000');
      res.send(tile);
    } catch (genError) {
      res.status(500).json({ error: 'Failed to generate tile' });
    }
  }
});

async function generateTile(assetPath, z, x, y) {
  const TILE_SIZE = 512;
  const MAX_ZOOM = 5;
  
  const metadata = await sharp(assetPath).metadata();
  
  const scale = Math.pow(2, MAX_ZOOM - z);
  const tileWorldSize = TILE_SIZE * scale;
  
  const left = x * tileWorldSize;
  const top = y * tileWorldSize;
  const width = Math.min(tileWorldSize, metadata.width - left);
  const height = Math.min(tileWorldSize, metadata.height - top);
  
  if (left >= metadata.width || top >= metadata.height) {
    throw new Error('Tile out of bounds');
  }
  
  return await sharp(assetPath)
    .extract({ left, top, width, height })
    .resize(TILE_SIZE, TILE_SIZE)
    .jpeg({ quality: 85 })
    .toBuffer();
}

module.exports = router;
```

### Week 7: Docker Configuration & Frontend Adapter

#### Day 1-2: Docker Compose

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/fieldstudio
      - REDIS_URL=redis://redis:6379
      - ASSETS_DIR=/data/assets
      - TILES_DIR=/data/tiles
    volumes:
      - app-data:/data
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=fieldstudio
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

  # Optional: Yjs WebSocket for server-side sync
  y-websocket:
    image: yjs/y-websocket
    ports:
      - "1234:1234"
    environment:
      - PORT=1234

volumes:
  app-data:
  postgres-data:
  redis-data:
```

**File**: `Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:docker

# Server stage
FROM node:20-alpine AS server
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production
COPY server/ ./

# Final stage
FROM node:20-alpine
WORKDIR /app

# Install sharp dependencies
RUN apk add --no-cache vips-dev fftw-dev build-base

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server
COPY --from=server /app ./server

# Create data directories
RUN mkdir -p /data/assets /data/tiles

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server/index.js"]
```

#### Day 3-5: DockerStorageAdapter

**File**: `services/storage/DockerStorageAdapter.ts`

```typescript
import { StorageAdapter, FileMetadata, TileManifest, StorageStats } from './StorageAdapter';
import { IIIFItem } from '@/types';

export class DockerStorageAdapter implements StorageAdapter {
  private apiBaseUrl: string;
  
  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }
  
  async initialize(): Promise<void> {
    // Check API health
    const response = await fetch(`${this.apiBaseUrl}/health`);
    if (!response.ok) {
      throw new Error('Docker API not available');
    }
  }
  
  async saveFile(id: string, blob: Blob, metadata: FileMetadata): Promise<void> {
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await fetch(`${this.apiBaseUrl}/files/${id}`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save file: ${response.statusText}`);
    }
  }
  
  async getFile(id: string): Promise<Blob | null> {
    const response = await fetch(`${this.apiBaseUrl}/files/${id}`);
    if (!response.ok) return null;
    return await response.blob();
  }
  
  async saveTile(assetId: string, z: number, x: number, y: number, blob: Blob): Promise<void> {
    const response = await fetch(
      `${this.apiBaseUrl}/tiles/${assetId}/${z}/${x}/${y}`,
      {
        method: 'POST',
        body: blob
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to save tile: ${response.statusText}`);
    }
  }
  
  async getTile(assetId: string, z: number, x: number, y: number): Promise<Blob | null> {
    const response = await fetch(
      `${this.apiBaseUrl}/tiles/${assetId}/${z}/${x}/${y}.jpg`
    );
    if (!response.ok) return null;
    return await response.blob();
  }
  
  async saveProject(root: IIIFItem): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save project: ${response.statusText}`);
    }
  }
  
  async loadProject(): Promise<IIIFItem | null> {
    const response = await fetch(`${this.apiBaseUrl}/project`);
    if (!response.ok) return null;
    return await response.json();
  }
  
  async getStorageStats(): Promise<StorageStats> {
    const response = await fetch(`${this.apiBaseUrl}/stats`);
    const data = await response.json();
    
    return {
      totalUsed: data.used,
      totalQuota: data.quota,
      fileCount: data.fileCount,
      localSize: data.used,
      cloudSize: 0
    };
  }
  
  // ... other methods
}
```

### Phase 3 Deliverables

- [ ] Express server with PostgreSQL schema
- [ ] File upload/download endpoints
- [ ] IIIF tile server with sharp
- [ ] Docker Compose configuration
- [ ] `DockerStorageAdapter` implemented
- [ ] Volume mount support

---

## Phase 4: Advanced Features & Optimization (Weeks 8-9)

### Week 8: SQLite Wasm & LRU Cache Manager

#### SQLite Wasm for Large Metadata (Web)

**File**: `services/storage/SQLiteStorage.ts`

```typescript
import { StorageAdapter, FileMetadata, StorageStats } from './StorageAdapter';

export class SQLiteStorage implements StorageAdapter {
  private db: any = null;
  private sqlite3: any = null;
  
  async initialize(): Promise<void> {
    // Load SQLite Wasm
    const sqlite3Module = await import('@sqlite.org/sqlite-wasm');
    this.sqlite3 = sqlite3Module.default;
    
    // Open in-memory or OPFS-backed database
    this.db = new this.sqlite3.oo1.DB(':memory:');
    
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        size INTEGER,
        metadata TEXT
      );
      
      CREATE TABLE IF NOT EXISTS access_log (
        file_id TEXT,
        accessed_at INTEGER,
        FOREIGN KEY (file_id) REFERENCES files(id)
      );
      
      CREATE INDEX idx_access_time ON access_log(accessed_at);
    `);
  }
  
  async queryMetadata(filters: { type?: string; minSize?: number }): Promise<FileMetadata[]> {
    let sql = 'SELECT * FROM files WHERE 1=1';
    const params: any[] = [];
    
    if (filters.type) {
      sql += ' AND metadata LIKE ?';
      params.push(`%"type":"${filters.type}"%`);
    }
    
    if (filters.minSize) {
      sql += ' AND size >= ?';
      params.push(filters.minSize);
    }
    
    const results = this.db.selectObjects(sql, params);
    return results.map((r: any) => JSON.parse(r.metadata));
  }
  
  // ... other methods
}
```

#### LRU Cache Manager

**File**: `services/storage/SmartCacheManager.ts`

```typescript
interface CacheEntry {
  id: string;
  size: number;
  lastAccessed: number;
  accessCount: number;
}

export class SmartCacheManager {
  private maxSize: number;
  private currentSize: number = 0;
  private entries: Map<string, CacheEntry> = new Map();
  
  constructor(maxSizeBytes: number) {
    this.maxSize = maxSizeBytes;
  }
  
  async touch(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (entry) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
    }
  }
  
  async addEntry(id: string, size: number): Promise<void> {
    // Check if eviction needed
    if (this.currentSize + size > this.maxSize) {
      await this.evict(size);
    }
    
    this.entries.set(id, {
      id,
      size,
      lastAccessed: Date.now(),
      accessCount: 1
    });
    
    this.currentSize += size;
  }
  
  async evict(requiredSpace: number): Promise<string[]> {
    const evicted: string[] = [];
    let freed = 0;
    
    // Sort by last access time (LRU)
    const sorted = Array.from(this.entries.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    for (const entry of sorted) {
      if (freed >= requiredSpace) break;
      
      evicted.push(entry.id);
      freed += entry.size;
      this.currentSize -= entry.size;
      this.entries.delete(entry.id);
    }
    
    return evicted;
  }
  
  getStats() {
    return {
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      entryCount: this.entries.size,
      usagePercent: (this.currentSize / this.maxSize * 100).toFixed(2)
    };
  }
}
```

### Week 9: Universal Export/Import

#### Day 1-5: Migration System

**File**: `services/migration/UniversalExport.ts`

```typescript
import { getStorage } from '../storage';
import { detectPlatform } from '@/utils/platform';
import JSZip from 'jszip';

export interface UniversalArchive {
  version: '2.0';
  exportedFrom: 'web' | 'docker' | 'tauri';
  exportedAt: string;
  manifest: IIIFItem;
  fileIndex: Array<{
    id: string;
    filename: string;
    size: number;
    hash: string;
    metadata: FileMetadata;
  }>;
}

export async function exportUniversal(options: {
  includeFiles: boolean;
  compression: 'none' | 'gzip';
}): Promise<Blob> {
  const storage = await getStorage();
  const platform = detectPlatform();
  
  // Export project
  const manifest = await storage.loadProject();
  if (!manifest) throw new Error('No project to export');
  
  // Build file index
  const fileIndex: UniversalArchive['fileIndex'] = [];
  
  // Walk tree and collect file references
  const collectFiles = (node: IIIFItem) => {
    // Extract file references from IIIF structure
    // This depends on your IIIF structure
    const children = (node as any).items || [];
    for (const child of children) {
      collectFiles(child);
    }
  };
  
  collectFiles(manifest);
  
  const archive: UniversalArchive = {
    version: '2.0',
    exportedFrom: platform,
    exportedAt: new Date().toISOString(),
    manifest,
    fileIndex
  };
  
  const zip = new JSZip();
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
    
    for (const fileInfo of fileIndex) {
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
  const storage = await getStorage();
  
  // Parse metadata
  const metadata = JSON.parse(
    await zip.file('metadata.json')?.async('text') || '{}'
  );
  
  console.log(`[Import] From ${metadata.exportedFrom} at ${metadata.exportedAt}`);
  
  // Import manifest
  const manifest = JSON.parse(
    await zip.file('manifest.json')?.async('text') || '{}'
  );
  
  await storage.saveProject(manifest);
  
  // Import files
  const filesFolder = zip.folder('files');
  if (filesFolder) {
    const index: UniversalArchive['fileIndex'] = JSON.parse(
      await zip.file('index.json')?.async('text') || '[]'
    );
    
    for (const [path, file] of Object.entries(filesFolder.files)) {
      if (file.dir) continue;
      
      const id = path.replace('files/', '');
      const blob = await file.async('blob');
      const fileMeta = index.find(f => f.id === id);
      
      if (fileMeta) {
        await storage.saveFile(id, blob, fileMeta.metadata);
      }
    }
  }
}
```

### Phase 4 Deliverables

- [ ] SQLite Wasm integration for complex queries
- [ ] LRU cache manager implementation
- [ ] Universal export/import format
- [ ] Migration tools between platforms
- [ ] Storage statistics dashboard

---

## Phase 5: Safari & Mobile Optimization (Week 10)

### Safari 7-Day Eviction Handling

**File**: `services/storage/SafariStorageHandler.ts`

```typescript
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
    
    // Request persistent storage (Safari 17+)
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      console.log('[Safari] Persistent storage:', isPersisted ? 'granted' : 'denied');
    }
    
    // Use Cache API as backup
    await this.setupCacheAPIBackup();
  }
  
  private async setupCacheAPIBackup(): Promise<void> {
    // Store critical tiles in Cache API
    // (Service Worker handles this automatically)
  }
  
  shouldShowInstallPrompt(): boolean {
    return this.isAtRisk() && !localStorage.getItem('safari-install-prompt-shown');
  }
  
  showInstallPrompt(): void {
    // Show PWA installation instructions
    localStorage.setItem('safari-install-prompt-shown', 'true');
  }
}
```

### PWA Configuration

**File**: `public/manifest.json`

```json
{
  "name": "IIIF Field Archive Studio",
  "short_name": "Field Studio",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192" },
    { "src": "/icon-512.png", "sizes": "512x512" }
  ]
}
```

### Phase 5 Deliverables

- [ ] Safari 7-day eviction detection
- [ ] Persistent storage request
- [ ] PWA manifest and installation
- [ ] iOS device testing
- [ ] Cache API backup layer

---

## CI/CD Pipeline Configuration

### GitHub Actions Workflow

**File**: `.github/workflows/deploy-all.yml`

```yaml
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

## Testing Strategy

### E2E Test Matrix

**File**: `e2e/platform.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

const platforms = ['web', 'docker', 'tauri'];

platforms.forEach(platform => {
  test.describe(`${platform} platform`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${platform}`);
    });
    
    test('imports images', async ({ page }) => {
      await page.click('[data-testid=import-btn]');
      // Platform-specific file selection
      if (platform === 'docker') {
        await page.setInputFiles('input[type=file]', 'test-assets/test.jpg');
      }
      await expect(page.locator('[data-testid=import-complete]')).toBeVisible();
    });
    
    test('generates IIIF manifests', async ({ page }) => {
      await page.click('[data-testid=create-manifest]');
      await expect(page.locator('[data-testid=manifest-editor]')).toBeVisible();
    });
    
    test('serves IIIF tiles', async ({ page, request }) => {
      // Upload test image
      // Request tile
      const tileResponse = await request.get('/tiles/test-id/0/0_0.jpg');
      expect(tileResponse.ok()).toBe(true);
    });
    
    test('exports bundles', async ({ page }) => {
      await page.click('[data-testid=export-btn]');
      await expect(page.locator('[data-testid=export-complete]')).toBeVisible();
    });
  });
});
```

---

## Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| IndexedDB data loss during migration | High | Low | Create backup before migration; provide rollback |
| Service Worker compatibility in Tauri | Medium | Medium | Test extensively; have fallback ready |
| Docker performance with large files | Medium | Medium | Implement streaming; add progress indicators |
| Safari 7-day eviction | High | High | PWA installation prompt; Cache API backup |
| Platform detection edge cases | Low | Medium | Default to web; graceful degradation |
| Code signing complexity (Tauri) | Medium | Low | Document process; use GitHub Actions |

---

## Appendix: File Structure

```
services/storage/
├── StorageAdapter.ts          # Core interface
├── WebStorageAdapter.ts       # IndexedDB + OPFS
├── TauriStorageAdapter.ts     # Native FS + IndexedDB
├── DockerStorageAdapter.ts    # HTTP API client
├── SmartCacheManager.ts       # LRU eviction
├── SQLiteStorage.ts           # Wasm SQLite (optional)
├── SafariStorageHandler.ts    # Safari-specific
└── index.ts                   # Factory & exports

utils/
└── platform.ts                # Platform detection

config/
└── features.ts                # Feature flags

server/                        # Docker backend
├── index.js                   # Express server
├── routes/
│   ├── files.js               # File upload/download
│   └── tiles.js               # IIIF tile server
├── schema.sql                 # PostgreSQL schema
└── Dockerfile

src-tauri/                     # Tauri desktop
├── src/
│   └── main.rs                # Rust backend
├── capabilities/
│   └── default.json           # Permissions
└── tauri.conf.json            # Configuration
```

---

*Document Version: 1.0*  
*Created: 2026-01-29*  
*Based on Field Studio Deployment Documentation*
