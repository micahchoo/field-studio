# Field Studio — Deployment Planning

> **STATUS: PLANNING.** Web deployment only (GitHub Pages + IndexedDB + Service Worker).
> Docker and Tauri have not been implemented. See [ROADMAP.md](../ROADMAP.md) Phase 5.

---

## Platform Comparison

| Aspect | Web (GitHub Pages) | Docker (Server) | Tauri (Desktop) |
|--------|-------------------|-----------------|-----------------|
| **Best for** | Public access, demos | Multi-user, institutional | Individual researchers, offline |
| **Setup effort** | None (current) | Major refactor | Minimal changes |
| **Storage** | IndexedDB + OPFS | PostgreSQL + filesystem | IndexedDB + native FS |
| **IIIF tiles** | Service Worker | Express + sharp | Service Worker |
| **Sync** | WebRTC (P2P) | WebSocket (y-websocket) | WebRTC (P2P) |
| **Offline** | Limited | No | Full |
| **Multi-user** | No | Yes | No |
| **Platforms** | Any browser | Server/VPS | Windows (MSI), Linux (Flatpak) |

---

## Recommended Path

1. **Tauri first** — minimal code changes, preserves local-first architecture, desktop UX for field researchers
2. **Docker later** — only if institutional multi-user hosting is needed (requires Express IIIF server, PostgreSQL, auth layer)

---

## Storage Adapter Pattern

All storage operations go through a platform-specific adapter:

```typescript
interface StorageAdapter {
  saveFile(id: string, blob: Blob, metadata: FileMetadata): Promise<void>;
  getFile(id: string): Promise<Blob | null>;
  deleteFile(id: string): Promise<void>;
  saveTile(assetId: string, z: number, x: number, y: number, blob: Blob): Promise<void>;
  getTile(assetId: string, z: number, x: number, y: number): Promise<Blob | null>;
  getStorageStats(): Promise<StorageStats>;
  evictLRU(targetBytes: number): Promise<void>;
}

function createStorageAdapter(): StorageAdapter {
  switch (detectPlatform()) {
    case 'docker': return new DockerStorageAdapter();   // HTTP API → PostgreSQL
    case 'tauri':  return new TauriStorageAdapter();    // Native FS + IDB fallback
    default:       return new WebStorageAdapter();      // IndexedDB + OPFS
  }
}
```

### Per-Platform Storage

| Strategy | Web | Docker | Tauri |
|----------|-----|--------|-------|
| Small files (<10MB) | IndexedDB | PostgreSQL | IndexedDB |
| Large files (>10MB) | OPFS | Filesystem | Native FS |
| IIIF tiles | OPFS / Cache API | Filesystem (sharp) | Native FS |
| Metadata queries | IndexedDB | PostgreSQL | IndexedDB |
| Safari iOS | Cloud priority | N/A | N/A |

---

## IIIF Tile Serving

- **Web + Tauri:** Service Worker intercepts `/tiles/{assetId}/{z}/{x}_{y}.jpg`, generates on-demand via OffscreenCanvas, caches in OPFS/Cache API
- **Docker:** Express route with sharp for on-demand tile generation, filesystem cache

---

## Feature Flags

```typescript
const FEATURES = {
  NATIVE_FS:    detectPlatform() === 'tauri',
  SERVER_SYNC:  detectPlatform() === 'docker',
  OFFLINE_MODE: detectPlatform() !== 'docker',
  MULTI_USER:   detectPlatform() === 'docker',
  P2P_SYNC:     detectPlatform() !== 'docker',
  AUTO_UPDATE:  detectPlatform() === 'tauri',
} as const;
```

---

## Build Scripts (planned)

```bash
npm run dev              # Web (current)
npm run dev:docker       # Docker dev
npm run tauri dev        # Tauri dev
npm run build            # Web production
npm run build:docker     # Docker image
npm run tauri build      # Desktop installers (MSI, Flatpak)
```

---

## Docker Architecture (when implemented)

```
Browser → Nginx → Express API → PostgreSQL + filesystem
                → sharp (tile generation)
                → y-websocket (sync)
```

Requires: Dockerfile, docker-compose.yml, PostgreSQL schema, Express IIIF routes, auth layer.

---

## Tauri Architecture (when implemented)

```
Tauri webview → existing Svelte 5 app (unchanged)
             → Service Worker (works as-is)
             → Native FS via @tauri-apps/plugin-fs
             → Native dialogs via @tauri-apps/plugin-dialog
```

Requires: `src-tauri/` directory, Rust commands for file I/O, tauri.conf.json.

---

## Code Signing

| Platform | Requirement | Cost |
|----------|-------------|------|
| Windows (MSI) | OV code signing cert (optional but recommended) | $70-300/year |
| Linux (Flatpak) | GPG signing (optional) | Free |
| Docker | HTTPS cert (Let's Encrypt) | Free |

---

*Consolidated from docker-vs-tauri-comparison.md, feature-parity-maintenance.md, and storage-strategy-across-deployments.md (2026-02-24).*
