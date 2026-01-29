# Deployment Strategy: Docker vs Tauri

> **Project Context**: IIIF Field Archive Studio - A local-first, browser-based workbench for organizing, annotating, and connecting field research media using IIIF standards.

---

## Executive Summary

| Aspect | Docker (Server) | Tauri (Desktop) |
|--------|-----------------|-----------------|
| **Best For** | Multi-user institutional deployment | Individual researchers, offline work |
| **Architecture Change** | Major refactor required | Minimal changes, preserves local-first design |
| **Time to Deploy** | 2-4 weeks | 3-5 days (basic), 1-2 weeks (full native) |
| **Data Storage** | PostgreSQL/MongoDB (server-side) | IndexedDB (client-side, preserved) |
| **IIIF Server** | Express/Fastify backend | Service Worker (works as-is) |
| **File System** | Volume mounts | Native OS integration |

---

## Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT (Browser/GH Pages)               │
├─────────────────────────────────────────────────────────────┤
│  Frontend: React + Vite + TypeScript                        │
│  Storage: IndexedDB (SHA-256 content-addressable)           │
│  IIIF Server: Service Worker (sw.js)                        │
│  Sync: Yjs WebRTC (P2P)                                     │
│  Build: Static files → GitHub Pages                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Option 1: Docker Containerization

### Phase 1: Basic Static Serving (Simplest, Limited Functionality)

This approach serves the built Vite app via Nginx but **loses** the Service Worker IIIF server and IndexedDB persistence.

#### Step 1: Create Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

#### Step 2: Create nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # IIIF tiles (won't work with Service Worker - needs alternative)
    location /tiles/ {
        # Would need a backend server here
    }
}
```

#### Step 3: Build & Run

```bash
docker build -t field-studio .
docker run -p 3000:80 field-studio
```

**⚠️ Limitations**: No IIIF tile serving, no persistent storage between sessions.

---

### Phase 2: Full-Featured Docker (Server-Side IIIF)

This requires **significant refactoring** to move browser-based services to server-side.

#### Architecture Changes Required

| Browser Component | Server Replacement |
|-------------------|-------------------|
| Service Worker (`sw.js`) | Express/Fastify IIIF Image API server |
| IndexedDB | PostgreSQL + Redis or MongoDB |
| Web Workers | Node.js worker_threads |
| WebRTC Sync | y-websocket server |

#### Step 1: Create Express IIIF Server

```javascript
// server/iiif-server.js
const express = require('express');
const sharp = require('sharp');
const app = express();

// IIIF Image API 3.0 endpoints
app.get('/tiles/:assetId/info.json', async (req, res) => {
  // Return info.json from database
});

app.get('/tiles/:assetId/:level/:x_y.jpg', async (req, res) => {
  // Generate/serve tiles using sharp
  const tile = await sharp(sourceImage)
    .extract({ left, top, width, height })
    .resize(tileSize, tileSize)
    .jpeg()
    .toBuffer();
  res.send(tile);
});
```

#### Step 2: Database Schema Migration

```sql
-- PostgreSQL schema replacing IndexedDB stores
CREATE TABLE files (
  sha256_hash PRIMARY KEY,
  blob_data BYTEA,
  created_at TIMESTAMP
);

CREATE TABLE iiif_tree (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES iiif_tree(id),
  type VARCHAR(20), -- Collection, Manifest, Canvas
  data JSONB
);

CREATE TABLE tiles (
  asset_id UUID,
  level INTEGER,
  x INTEGER,
  y INTEGER,
  tile_data BYTEA,
  PRIMARY KEY (asset_id, level, x, y)
);
```

#### Step 3: Multi-Container Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/fieldstudio
      - REDIS_URL=redis://redis:6379
  
  db:
    image: postgres:15-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
  
  redis:
    image: redis:alpine
  
  # Optional: Yjs websocket for sync
  y-websocket:
    image: yjs/y-websocket
    ports:
      - "1234:1234"

volumes:
  pgdata:
```

#### Step 4: Authentication Layer

```javascript
// Add to server
const passport = require('passport');
app.use(passport.session());
// OAuth2, SAML, or local auth for multi-user access
```

---

### Phase 3: File System Integration (Docker Volumes)

```yaml
services:
  app:
    volumes:
      - ./ingest:/app/ingest:ro      # Read-only ingest folder
      - ./exports:/app/exports       # Writeable exports
      - tile-cache:/app/cache        # Persistent tile cache
```

---

## Option 2: Tauri Desktop Wrapper

### Supported Platforms

| Platform | Package Format | Notes |
|----------|---------------|-------|
| **Linux** | Flatpak | Universal Linux distribution; sandboxed |
| **Windows** | MSI | Standard Windows installer |

> **Note**: macOS/DMG builds are not currently supported.

### Phase 1: Basic Integration (Preserves All Functionality)

**Step 1: Prerequisites Installation**

```bash
# Install Rust (required for Tauri)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install system dependencies
# Linux (for Flatpak development):
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev flatpak-builder

# Windows:
# Install Visual Studio Build Tools with C++ workload
```

**Step 2: Initialize Tauri**

```bash
# Install Tauri CLI
npm install --save-dev @tauri-apps/cli

# Add to package.json scripts:
# "tauri": "tauri"

# Initialize Tauri (creates src-tauri/)
npx tauri init
```

**Step 3: Configure tauri.conf.json**

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "flatpak"],
    "identifier": "studio.field.iiif.archive",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.ico"
    ]
  },
  "app": {
    "windows": [{
      "title": "IIIF Field Archive Studio",
      "width": 1400,
      "height": 900,
      "minWidth": 1024,
      "minHeight": 768,
      "resizable": true
    }],
    "security": {
      "csp": "default-src 'self'; img-src 'self' blob: data:; connect-src 'self' blob:"
    }
  }
}
```

**Step 4: Test Development Build**

```bash
npm run tauri dev
# Service Workers and IndexedDB work as-is!
```

---

### Phase 2: Native File System Integration

**Step 1: Install FS Plugin**

```bash
npm install @tauri-apps/plugin-fs @tauri-apps/plugin-dialog
```

**Step 2: Configure Permissions**

```json
// src-tauri/capabilities/default.json
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
    {
      "identifier": "fs:scope",
      "allow": [
        { "path": "$HOME/Documents/FieldStudio" },
        { "path": "$HOME/Documents/FieldStudio/**" },
        { "path": "$DOWNLOAD/**" }
      ]
    },
    "dialog:allow-open",
    "dialog:allow-save"
  ]
}
```

**Step 3: Create Native File Commands**

```rust
// src-tauri/src/main.rs
use tauri::Manager;

#[tauri::command]
async fn import_files(paths: Vec<String>) -> Result<Vec<FileInfo>, String> {
    let mut results = Vec::new();
    for path in paths {
        let info = process_file(&path).await?;
        results.push(info);
    }
    Ok(results)
}

#[tauri::command]
async fn export_bundle(manifest: String, destination: String) -> Result<(), String> {
    std::fs::write(&destination, manifest)
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            import_files,
            export_bundle
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 4: Frontend Integration**

```typescript
// services/nativeFs.ts
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

export async function nativeImport() {
  const selected = await open({
    multiple: true,
    directory: false,
    filters: [{
      name: 'Images',
      extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif']
    }]
  });
  
  if (selected) {
    const files = await invoke('import_files', { paths: selected });
    return files;
  }
}

export async function nativeExport(manifest: object) {
  const destination = await save({
    filters: [{
      name: 'IIIF Bundle',
      extensions: ['zip']
    }],
    defaultPath: 'field-archive-export.zip'
  });
  
  if (destination) {
    await invoke('export_bundle', {
      manifest: JSON.stringify(manifest),
      destination
    });
  }
}
```

---

### Phase 3: Enhanced Native Features

**Step 1: Native Menu Bar**

```rust
// src-tauri/src/main.rs
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let menu = Menu::new(app)?;
            let file_menu = Menu::new(app)?;
            file_menu.append(&MenuItem::new(app, "import", "Import Files", true, None::<&str>)?)?;
            file_menu.append(&PredefinedMenuItem::separator(app)?)?;
            file_menu.append(&PredefinedMenuItem::quit(app, None)?)?;
            menu.append(&file_menu)?;
            app.set_menu(menu)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 2: Auto-Updater**

```json
// tauri.conf.json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://yourserver.com/updates/{{target}}/{{arch}}/{{current_version}}"],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

**Step 3: Build Distribution**

```bash
# Development
npm run tauri dev

# Production build (creates installers in src-tauri/target/release/bundle/)
npm run tauri build

# Platform-specific builds
npm run tauri build -- --target x86_64-pc-windows-msvc    # Windows MSI
npm run tauri build -- --target x86_64-unknown-linux-gnu  # Linux (for Flatpak)
```

**Flatpak Build**

```bash
# Build Flatpak bundle (after building Linux target)
cd src-tauri/target/release/bundle/flatpak
flatpak-builder --user --install build-dir studio.field.iiif.archive.flatpak.json
flatpak build-bundle repo field-studio.flatpak studio.field.iiif.archive
```

---

## Implementation Steps Comparison

| Phase | Docker (Server) | Tauri (Desktop) |
|-------|-----------------|-----------------|
| **1. Setup** | Install Docker, Docker Compose | Install Rust, system libs, Tauri CLI |
| **2. Config** | Write Dockerfile, docker-compose.yml, nginx.conf | Run `tauri init`, edit tauri.conf.json |
| **3. Refactor** | **MAJOR**: Replace SW with Express, IndexedDB with PostgreSQL, add auth | **MINIMAL**: Add native commands, keep all existing code |
| **4. FS Access** | Volume mounts (-v /host:/container) | Native FS API with permissions |
| **5. Testing** | `docker-compose up`, test at localhost | `npm run tauri dev` |
| **6. Distribution** | `docker push`, deploy to VPS/K8s | `npm run tauri build`, code sign, release |
| **7. CI/CD** | GitHub Actions → Docker Hub | GitHub Actions → GitHub Releases |
| **8. Updates** | Pull new image, restart container | Built-in auto-updater |

---

## Code Signing Requirements

### Docker
- **None** for the container itself
- HTTPS certificate for deployment (Let's Encrypt)

### Tauri
| Platform | Requirement | Cost |
|----------|-------------|------|
| **Windows** | Code signing certificate (OV) | $70-300/year (optional but recommended) |
| **Linux (Flatpak)** | GPG signing (optional) | Free |

> **Note**: Unsigned Windows builds will show SmartScreen warnings. For distribution, code signing is recommended.

---

## Decision Matrix

| Use Case | Recommendation | Rationale |
|----------|----------------|-----------|
| Individual researchers/archivists | **Tauri** | Preserves local-first ethos; desktop UX fits archival workflows |
| Institutional shared deployment | **Docker** | Multi-user access, centralized backup, IT-managed |
| Current state (vibe-coded POC) | **Tauri first** | Less architectural change; test product-market fit |
| Production digital library platform | **Docker** | Scales to multiple users; fits existing DL infrastructure |
| Hybrid approach | **Both** | Tauri for field work, Docker for institutional repository |

---

## Recommended Hybrid Path

Given the project's **"vibe coded" experimental nature** and **local-first principles**:

1. **Start with Tauri** - Get desktop distribution with minimal code changes
2. **Later add Docker** - If institutional hosting needs emerge, the IIIF manifests are standard and portable

The Tauri path respects the core architecture while solving real pain points (file system access, offline reliability, desktop integration) without a ground-up rewrite.

---

## Related Documents

- [feature-parity-maintenance.md](./feature-parity-maintenance.md) - Maintaining feature parity across all three deployments
- [storage-strategy-across-deployments.md](./storage-strategy-across-deployments.md) - Storage architecture for Web, Docker, and Tauri
- [ADVANCED_STORAGE_STRATEGIES.md](../ADVANCED_STORAGE_STRATEGIES.md) - Advanced browser storage strategies
- [STORAGE_LIMITS_SOLUTIONS.md](../STORAGE_LIMITS_SOLUTIONS.md) - Overcoming IndexedDB storage limits

---

*Document Version: 1.1*
*Last Updated: 2026-01-29*
