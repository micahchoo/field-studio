# Field Studio - AI Agent Documentation

> **⚠️ Disclaimer**: This project is **vibe coded** - the architecture reflects an experimental proof-of-concept state.

## Project Overview

**Field Studio** is a local-first, browser-based workbench for organizing, annotating, and connecting field research media using [IIIF (International Image Interoperability Framework)](https://iiif.io/) standards. It bridges the gap between messy field data (raw photos, recordings, notes) and structured archival objects.

### Key Characteristics

- **Local-First**: All data stored in browser's IndexedDB. No server uploads.
- **Personal IIIF Ecosystem**: Includes internal IIIF Image API 3.0 server via Service Workers
- **Standards-Driven**: Complies with IIIF Presentation API 3.0 and W3C Web Annotation specifications
- **Browser-Based**: Runs entirely in the browser with offline capabilities

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19.2.3 + TypeScript 5.8.2 |
| **Build Tool** | Vite 6.4.1 |
| **Styling** | Tailwind CSS (via CDN) |
| **State Management** | Custom normalized state ("Vault" pattern) + React Context |
| **Storage** | IndexedDB via `idb` library |
| **Search** | FlexSearch 0.7.31 |
| **Maps** | Leaflet 1.9.4 |
| **IIIF Viewer** | OpenSeadragon 4.1.0 |
| **Icons** | Material Icons (Google Fonts) |
| **i18n** | i18next + react-i18next (feature-flagged) |

---

## Project Structure

```
field-studio/
├── components/           # 80+ React components
│   ├── staging/         # Staging workbench components
│   └── views/           # Main view components (Archive, Board, etc.)
├── services/            # 39 business logic services
│   ├── vault.ts         # Normalized state management (1,309 lines)
│   ├── actions.ts       # Action-driven mutation system (783 lines)
│   ├── storage.ts       # IndexedDB abstraction
│   ├── iiifBuilder.ts   # IIIF manifest generation
│   ├── validator.ts     # IIIF validation
│   └── ...
├── hooks/               # 28 custom React hooks
│   ├── useIIIFEntity.tsx   # Vault state management
│   ├── useVaultSelectors.ts # Memoized selectors
│   └── ...
├── utils/               # 17 utility modules
│   ├── iiifSchema.ts    # IIIF property schemas
│   ├── iiifHierarchy.ts # Parent-child relationships
│   └── ...
├── workers/             # Web Workers
│   ├── ingest.worker.ts # File ingestion worker
│   └── validation.worker.ts
├── public/              # Static assets
│   └── sw.js            # Service Worker (IIIF Image API server)
├── types.ts             # TypeScript type definitions
├── constants.ts         # App constants & feature flags
├── designSystem.ts      # Visual design system
├── App.tsx              # Main application component
└── index.tsx            # Entry point + SW registration
```

---

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build locally
npm run preview

# Lint TypeScript/React files
npm run lint

# Lint and auto-fix issues
npm run lint:fix
```

---

## Architecture Patterns

### 1. Vault Pattern (Normalized State Management)

Located in `services/vault.ts`, implements the Digirati Manifest Editor pattern:

- **Entities stored flat** by type and ID (O(1) lookups)
- **References maintain hierarchy** (parent → child IDs)
- **Reverse references** for child → parent lookups
- **Collection membership** tracked separately (many-to-many)
- **Extension preservation** for vendor-specific properties

```typescript
// Key data structures
interface NormalizedState {
  entities: {
    Collection: Record<string, IIIFCollection>;
    Manifest: Record<string, IIIFManifest>;
    Canvas: Record<string, IIIFCanvas>;
    // ...
  };
  references: Record<string, string[]>;      // parent → children
  reverseRefs: Record<string, string>;        // child → parent
  collectionMembers: Record<string, string[]>; // Collection → members
  // ...
}
```

### 2. Action System (Action-Driven Mutations)

Located in `services/actions.ts`:

- 17 action types (UPDATE_LABEL, ADD_CANVAS, BATCH_UPDATE, etc.)
- Pre-mutation validation
- Undo/redo history (100-entry limit)
- Provenance tracking via `provenanceService`

### 3. Service Worker as IIIF Image Server

Located in `public/sw.js`:

- Implements IIIF Image API 3.0 Level 2
- Tile URL pattern: `/tiles/{assetId}/{level}/{x}_{y}.jpg`
- Caching strategy: Cache API → IndexedDB → Generate
- 500MB LRU cache limit

### 4. IndexedDB Storage Schema

```typescript
// Stores (from services/storage.ts)
const DB_NAME = 'biiif-archive-db';
const FILES_STORE = 'files';           // Original uploads (SHA-256 keyed)
const DERIVATIVES_STORE = 'derivatives'; // Thumbnails, tile pyramids
const PROJECT_STORE = 'project';       // IIIF tree JSON
const TILES_STORE = 'tiles';           // Image tile blobs
const CHECKPOINTS_STORE = 'checkpoints'; // Named save states
```

---

## Code Style Guidelines

### ESLint Configuration (eslint.config.js)

- **TypeScript**: Strict rules with `@typescript-eslint`
- **React**: Hooks rules enforced
- **Naming Convention**: Enforced patterns for handlers
  - Event handlers: `onChange`, `onAction`, `onUpdate`, `onExecute`
  - Standard DOM handlers allowed: `onClick`, `onSubmit`, `onKeyDown`, etc.
- **No console.log** in production (warn level, allows warn/error/info)

### File Naming Conventions

- Components: PascalCase (`ExportDialog.tsx`)
- Services: camelCase (`iiifBuilder.ts`)
- Hooks: camelCase with `use` prefix (`useVault.ts`)
- Utils: camelCase (`iiifSchema.ts`)

### Import Path Aliases

```typescript
// tsconfig.json paths configuration
"@/*": ["./*"]

// Usage
import { storage } from '@/services/storage';
```

---

## Feature Flags

Located in `constants.ts` - toggle experimental features:

```typescript
export const FEATURE_FLAGS = {
  USE_NEW_STAGING: true,           // Two-pane staging workbench
  USE_ACCESSIBLE_FOCUS: true,      // WCAG 2.1 AA focus indicators
  USE_IMMER_CLONING: false,        // Immer for state cloning
  USE_WORKER_SEARCH: false,        // Web Worker search indexing
  USE_PROGRESSIVE_DISCLOSURE: false, // 3-mode UI simplification
  USE_SIMPLIFIED_UI: false,        // Consolidated view modes
  USE_KEYBOARD_DND: false,         // Keyboard drag & drop
  USE_I18N: false,                 // Internationalization
};
```

---

## Key Services Reference

| Service | Purpose |
|---------|---------|
| `vault.ts` | Normalized state storage, entity CRUD |
| `actions.ts` | Validated mutations, undo/redo |
| `storage.ts` | IndexedDB operations |
| `iiifBuilder.ts` | IIIF manifest/collection construction |
| `validator.ts` | IIIF spec compliance validation |
| `exportService.ts` | Bundle export, static site generation |
| `searchService.ts` | FlexSearch indexing and querying |
| `tileWorker.ts` | Image tile pyramid generation |
| `authService.ts` | IIIF Auth 2.0 flow handling |

---

## Component Categories

### View Components (`components/views/`)
- `ArchiveView.tsx` - Grid/list browsing
- `BoardView.tsx` - Infinite canvas spatial view
- `Viewer.tsx` - OpenSeadragon deep zoom
- `MetadataSpreadsheet.tsx` - Tabular metadata editing
- `SearchView.tsx` - Search results

### Staging Components (`components/staging/`)
- `StagingWorkbench.tsx` - Two-pane ingest interface
- `SourcePane.tsx` - File sequence detection
- `ArchivePane.tsx` - Collection organization

### Shared UI Components
- `Sidebar.tsx` - Navigation tree
- `Inspector.tsx` - Metadata editor panel
- `CommandPalette.tsx` - Cmd+K quick actions
- `Toast.tsx` - Notification system

---

## Hook Patterns

### Vault Hooks (`hooks/useIIIFEntity.tsx`)

```typescript
// Primary hook for state access
const { state, dispatch, loadRoot, exportRoot } = useVault();

// Bulk operations with undo support
const { batchUpdate } = useBulkOperations();

// History management
const { undo, redo, canUndo, canRedo } = useHistory();
```

### Selector Hooks (`hooks/useVaultSelectors.ts`)

Memoized derived state selectors:
- `useEntityLabel(id)` - Get entity label
- `useEntityChildren(id)` - Get child entities
- `useEntityAncestors(id)` - Get breadcrumb path
- `useEntitiesByType(type)` - Filter by entity type

---

## Deployment

### GitHub Pages (Configured)

1. Push to `main` branch triggers deployment
2. GitHub Actions workflow (`.github/workflows/deploy.yml`):
   - Node 20 + npm ci
   - `npm run build`
   - Upload `dist/` artifact
   - Deploy to GitHub Pages

### Build Configuration (vite.config.ts)

```typescript
base: '/field-studio/',  // GitHub Pages subdirectory
server: { port: 3000 },
worker: { format: 'es' }, // ES modules for workers
```

---

## Security Considerations

### Content Security Policy (index.html)

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  img-src * blob: data:;
  connect-src *;
  script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com ...;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ...;
  worker-src 'self' blob:;
">
```

### XSS Protections

- `dompurify` for HTML sanitization
- `sanitizeAnnotationBody()` in utils/sanitization.ts
- Global error handlers sanitize messages before DOM insertion

### Data Privacy

- All data remains in browser (IndexedDB)
- No external API calls except for:
  - External IIIF manifest imports (user-initiated)
  - CDN resources (Tailwind, Leaflet, OpenSeadragon)

---

## Development Notes

### Required Context

The application requires these providers in `index.tsx`:

```typescript
<VaultProvider>      {/* State management */}
  <ToastProvider>    {/* Notifications */}
    <App />
  </ToastProvider>
</VaultProvider>
```

### Service Worker Requirements

- Must run in **Secure Context** (localhost or HTTPS)
- Handles IIIF tile requests at `/tiles/*`
- Communicates with main thread via `MessageChannel`

### Storage Quota Handling

- 90% usage = warning toast
- 95% usage = critical error
- Auto-save interval configurable (default: 30 seconds)

---

## Testing

**Current State**: No automated test suite is configured.

For manual testing:
1. Run `npm run dev`
2. Test file ingestion with various image formats
3. Verify IIIF manifest export/import roundtrip
4. Check Service Worker tile serving in Application tab

---

## Common Tasks

### Adding a New Component

1. Create file in appropriate `components/` subdirectory
2. Use PascalCase naming
3. Import types from `@/types`
4. Use `useToast()` for user feedback
5. Add to relevant index exports if shared

### Adding a New Service

1. Create file in `services/` with camelCase name
2. Export singleton instance or factory function
3. Document in service header JSDoc
4. Add to `services/index.ts` exports

### Adding a New Hook

1. Create file in `hooks/` with `use` prefix
2. Export type interfaces for return values
3. Add to `hooks/index.ts` with category comment
4. Document dependencies and usage patterns

---

## Troubleshooting

### Images Not Loading

- Check Service Worker registration in DevTools Application tab
- Verify secure context (HTTPS or localhost)
- Check IndexedDB for tile data

### Build Failures

- Ensure Node.js v20+
- Clear `node_modules` and `npm install`
- Check for TypeScript errors: `npm run lint`

### Storage Issues

- Check browser storage quota in DevTools
- Export data before clearing site data
- Use `storage.getEstimate()` to check usage

---

## External Resources

- [IIIF Presentation API 3.0](https://iiif.io/api/presentation/3.0/)
- [IIIF Image API 3.0](https://iiif.io/api/image/3.0/)
- [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)
- [OpenSeadragon Documentation](https://openseadragon.github.io/docs/)
