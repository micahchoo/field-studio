# Field Studio Deployment Documentation

This directory contains comprehensive documentation for deploying Field Studio across multiple targets: **Web (GitHub Pages)**, **Docker (Server)**, and **Tauri (Desktop)**.

---

## Quick Start

| If you want to... | Read this... |
|-------------------|--------------|
| Decide between Docker and Tauri | [docker-vs-tauri-comparison.md](./docker-vs-tauri-comparison.md) |
| Support all three deployments | [feature-parity-maintenance.md](./feature-parity-maintenance.md) |
| Handle storage across platforms | [storage-strategy-across-deployments.md](./storage-strategy-across-deployments.md) |

---

## Document Map

```
deployment/
├── README.md (this file)
├── docker-vs-tauri-comparison.md
│   ├── Executive Summary
│   ├── Docker Containerization (3 phases)
│   ├── Tauri Desktop Wrapper (3 phases)
│   ├── Implementation Comparison
│   ├── Code Signing Requirements
│   └── Decision Matrix
│
├── feature-parity-maintenance.md
│   ├── Deployment Matrix
│   ├── Core Principles (Abstraction, Feature Detection)
│   ├── Storage Strategy Integration
│   ├── File System Operations
│   ├── IIIF Tile Serving
│   ├── Data Synchronization
│   ├── Build Configuration
│   ├── Testing Strategy
│   ├── CI/CD Pipeline
│   └── Phased Implementation Plan
│
└── storage-strategy-across-deployments.md
    ├── Unified Storage Architecture
    ├── Storage Comparison by Deployment
    ├── UnifiedStorage Adapter Pattern
    ├── IIIF Tile Serving Strategy
    ├── Safari-Specific Handling
    ├── Migration Between Deployments
    └── Configuration Matrix
```

---

## Architecture Overview

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
│ OPFS (optional) │    │ File System     │    │ Native FS       │
│ Service Worker  │    │ Express API     │    │ Service Worker  │
│ WebRTC Sync     │    │ WebSocket Sync  │    │ WebRTC Sync     │
│ File System API │    │ Volume Mounts   │    │ Native FS API   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Deployment Comparison

| Aspect | Web (GitHub Pages) | Docker | Tauri |
|--------|-------------------|--------|-------|
| **Best For** | Public access, demos | Multi-user, institutional | Individual researchers |
| **Storage** | IndexedDB/OPFS (browser) | PostgreSQL + filesystem | Native FS + IndexedDB |
| **IIIF Server** | Service Worker | Express backend | Service Worker |
| **Sync** | WebRTC (P2P) | WebSocket (server) | WebRTC (P2P) |
| **Offline** | Limited | No | Full |
| **Setup Time** | Immediate | 2-4 weeks | 3-5 days |
| **Code Changes** | None | Major | Minimal |
| **Platforms** | Any browser | Server | Windows (MSI), Linux (Flatpak) |

---

## Key Concepts

### 1. UnifiedStorage Adapter

All storage operations go through a platform-specific adapter:

```typescript
// Same interface, different implementations
const storage = createStorageAdapter(); // Auto-detects platform

// Works everywhere
await storage.saveFile(id, blob, metadata);
const file = await storage.getFile(id);
```

**Implementations:**
- `WebStorageAdapter` - IndexedDB + OPFS
- `DockerStorageAdapter` - HTTP API to PostgreSQL
- `TauriStorageAdapter` - Native FS + IndexedDB fallback

### 2. Service Worker Tile Serving (Web + Tauri)

IIIF tiles are served via Service Worker in both Web and Tauri deployments:

```javascript
// Works in both environments
fetch(`/tiles/${assetId}/${z}/${x}_${y}.jpg`)
```

Docker uses an Express server instead.

### 3. Feature Flags

Handle platform differences gracefully:

```typescript
export const FEATURES = {
  NATIVE_FS: detectPlatform() === 'tauri',
  SERVER_SYNC: detectPlatform() === 'docker',
  OFFLINE_MODE: detectPlatform() !== 'docker',
  MULTI_USER: detectPlatform() === 'docker',
};
```

---

## Recommended Implementation Path

### Phase 1: Start with Tauri (Weeks 1-2)
- Minimal code changes
- Preserves local-first architecture
- Desktop UX for field researchers
- Offline capability
- **Platforms**: Windows (MSI), Linux (Flatpak)

### Phase 2: Enhance Web (Weeks 3-4)
- Add OPFS for large files
- Safari 7-day eviction handling
- PWA install prompt

### Phase 3: Add Docker (Weeks 5-8)
- If institutional hosting needed
- PostgreSQL schema
- Express IIIF server
- Multi-user support

---

## Storage Strategy Summary

| Strategy | Web | Docker | Tauri (Win/Flatpak) |
|----------|-----|--------|---------------------|
| **Small files (<10MB)** | IndexedDB | PostgreSQL | IndexedDB |
| **Large files (>10MB)** | OPFS | Filesystem | Native FS |
| **IIIF Tiles** | OPFS/Cache API | Filesystem | Native FS |
| **Metadata query** | IndexedDB/SQLite | PostgreSQL | IndexedDB/SQLite |
| **Safari iOS** | Cloud priority | N/A | N/A |
| **App Data Location** | Browser storage | Server disk | `%APPDATA%` (Win), `~/.var/app/` (Flatpak) |

---

## Common Tasks

### Add a New Feature

1. Define interface in `shared/types/`
2. Implement for each platform:
   - Web: IndexedDB/OPFS version
   - Docker: HTTP API version  
   - Tauri: Native FS version
3. Add to `createStorageAdapter()` factory
4. Write E2E tests for all platforms
5. Update feature flags if needed

### Migrate Data Between Deployments

```typescript
// Export from any platform
const blob = await exportUniversal({ includeFiles: true });

// Import to any platform
await importUniversal(blob);
```

### Test All Platforms

```bash
# Web
npm run dev

# Docker
npm run dev:docker
docker-compose up

# Tauri (Windows/Linux)
npm run tauri dev

# Build for distribution
npm run tauri build -- --target x86_64-pc-windows-msvc    # Windows MSI
npm run tauri build -- --target x86_64-unknown-linux-gnu  # Linux (for Flatpak)
```

---

## External References

- [ADVANCED_STORAGE_STRATEGIES.md](../ADVANCED_STORAGE_STRATEGIES.md) - OPFS, SQLite Wasm, CRDTs
- [STORAGE_LIMITS_SOLUTIONS.md](../STORAGE_LIMITS_SOLUTIONS.md) - Browser storage limits and solutions

---

## Glossary

| Term | Definition |
|------|------------|
| **IIIF** | International Image Interoperability Framework |
| **OPFS** | Origin Private File System - browser file API |
| **CRDT** | Conflict-free Replicated Data Type - for sync |
| **LRU** | Least Recently Used - cache eviction strategy |
| **PWA** | Progressive Web App |

---

*Last Updated: 2026-01-29*
