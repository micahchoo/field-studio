# Field Studio — IIIF Archive Workbench

A local-first, browser-based workbench for organizing, annotating, and connecting field research media using IIIF standards.

## Disclaimer: Vibe Coded

This project is **vibe coded** — the architecture reflects an experimental proof of concept. Use accordingly.

## Overview

Field Studio bridges the gap between messy field data (raw photos, recordings, notes) and structured archival objects.

- **Local-First:** All data lives in your browser's IndexedDB. Nothing is uploaded to a server.
- **Personal IIIF Ecosystem:** Includes an internal IIIF Image API 3.0 server (via Service Worker), a Presentation API 3.0 manifest editor, and a W3C Web Annotation environment.
- **Spatial Thinking:** Use the Boards view to map relationships between items on an infinite canvas.
- **Standards-Driven:** Built to comply with IIIF Presentation API 3.0 and W3C Web Annotation specifications.

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm

## Getting Started

```bash
git clone https://github.com/micahchoo/field-studio.git
cd field-studio
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

> The app uses a Service Worker (`public/sw.js`) to serve IIIF image tiles. It requires a **secure context** (localhost or HTTPS). If images fail to load, check the Service Workers panel in your browser's DevTools.

## Available Commands

```bash
npm run dev           # Start dev server (http://localhost:5173)
npm run build         # Production build
npm run preview       # Preview production build
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run typecheck     # svelte-check (type check Svelte files)
npm run typecheck:ts  # tsc --noEmit
npm run lint          # Check for linting errors
npm run lint:fix      # Auto-fix linting errors
```

## Architecture

**Framework:** Svelte 5 + TypeScript, Vite, Tailwind CSS

**Pattern:** [Feature Slice Design (FSD)](https://feature-sliced.design/)

```
src/
├── shared/     — UI atoms/molecules, services, hooks, stores, types
├── entities/   — manifest, canvas, collection, annotation domain logic
├── features/   — archive, board-design, export, ingest, map, metadata-edit, search, staging, timeline, viewer
├── widgets/    — cross-feature panels (NavigationSidebar, Inspector, CommandPalette, StatusBar, QCDashboard)
└── app/        — App.svelte, ViewRouter.svelte, stores
```

**7 views:**

| # | View | Description |
|---|------|-------------|
| 1 | Archive | Grid/list browser with filtering and drag-to-reorder |
| 2 | Viewer | Deep zoom image viewer (OpenSeadragon) + audio/video player |
| 3 | Boards | Infinite canvas for spatial connections |
| 4 | Metadata | Spreadsheet-style metadata editor |
| 5 | Search | Full-text search across all items |
| 6 | Map | Geographic browsing via Leaflet |
| 7 | Timeline | Chronological ordering |

**State management:** Vault (normalized entity store) + Svelte 5 reactive stores

**Storage:** IndexedDB (local-first, no server required)

**Service Worker:** IIIF Image API 3.0 Level 2 (rotation, mirroring, grayscale, region crops, PNG/WebP)

## Deployment

This project is set up for [GitHub Pages](https://pages.github.com/) deployment. The production build generates a static site that can be served from any static host. Push to the `gh-pages` branch or configure GitHub Pages to deploy from `main` after running `npm run build`.
