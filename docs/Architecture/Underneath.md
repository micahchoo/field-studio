# Field Studio: Technical Architecture (Underneath)

Field Studio is a Single Page Application (SPA) built with **React**, **Vite**, and **TypeScript**. It is engineered to run completely client-side while simulating the capabilities of a server-side IIIF ecosystem.

---

## Core Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 18 | UI rendering |
| Build Tool | Vite | Development server, bundling |
| Language | TypeScript | Type safety |
| Storage | IndexedDB | Client-side persistence |
| State | Custom Vault | Normalized IIIF state management |
| Offline | Service Worker | IIIF Image API emulation |

---

## Data Layer: The Vault

**File:** `services/vault.ts` (1134 lines)

The Vault is a custom state manager inspired by Digirati's IIIF Commons Vault, optimized for normalized IIIF data.

### State Structure

```typescript
interface NormalizedState {
  // Flat entity tables by type
  entities: {
    Collection: Record<string, IIIFCollection>;
    Manifest: Record<string, IIIFManifest>;
    Canvas: Record<string, IIIFCanvas>;
    Range: Record<string, IIIFRange>;
    AnnotationPage: Record<string, IIIFAnnotationPage>;
    Annotation: Record<string, IIIFAnnotation>;
  };

  // Hierarchical relationships (Manifest owns Canvas)
  references: Record<string, string[]>;     // parentId → [childId, ...]
  reverseRefs: Record<string, string>;      // childId → parentId

  // Non-hierarchical relationships (IIIF 3.0 Collections)
  collectionMembers: Record<string, string[]>;    // collectionId → [memberId, ...]
  memberOfCollections: Record<string, string[]>;  // resourceId → [collectionId, ...]

  // Metadata
  rootId: string | null;
  typeIndex: Record<string, EntityType>;

  // Vendor extension preservation
  extensions: Record<string, Record<string, unknown>>;
}
```

### Core Operations

| Function | Purpose |
|----------|---------|
| `normalize(root)` | Convert nested IIIF tree to flat state |
| `denormalize(state)` | Reconstruct nested tree for export |
| `getEntity(state, id)` | O(1) entity lookup |
| `addEntity(state, entity, parentId)` | Add entity with parent reference |
| `updateEntity(state, id, updates)` | Update entity properties |
| `removeEntity(state, id)` | Remove entity and cleanup refs |
| `moveEntity(state, id, newParentId, index)` | Reparent/reorder entity |
| `addToCollection(state, collectionId, resourceId)` | Non-hierarchical membership |
| `removeFromCollection(state, collectionId, resourceId)` | Remove from collection |
| `getCollectionsContaining(state, resourceId)` | Reverse membership lookup |

### Action Dispatch (`services/actions.ts`)

State mutations go through the action dispatcher for history tracking:

```typescript
interface Action {
  type: string;
  payload: any;
  inverse?: Action;  // For undo
}

class ActionDispatcher {
  dispatch(action: Action): boolean;
  undo(): boolean;
  redo(): boolean;
  subscribe(callback: (state) => void): () => void;
}
```

### React Integration (`hooks/useIIIFEntity.tsx`)

```typescript
// Provider wraps application
<VaultProvider initialRoot={root} historySize={100}>
  <App />
</VaultProvider>

// Access in components
const { state, dispatch, getEntity, undo, redo, canUndo, canRedo } = useVault();
const canvas = useCanvas(canvasId);  // Auto re-renders on changes
const children = useChildren(parentId);
```

---

## The Service Worker Engine

**File:** `public/sw.js` (6465 bytes)

The Service Worker implements a complete IIIF Image API 3.0 server in the browser.

### Request Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Service Worker Pipeline                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  fetch('/iiif/image/{id}/{region}/{size}/{rotation}/{quality}.{fmt}')  │
│                                    │                                    │
│                                    ▼                                    │
│                        ┌─────────────────────┐                          │
│                        │   1. Check Cache    │                          │
│                        │   (iiif-tile-cache) │                          │
│                        └──────────┬──────────┘                          │
│                                   │ miss                                │
│                                   ▼                                    │
│                        ┌─────────────────────┐                          │
│                        │  2. Parse IIIF URL  │                          │
│                        │  Extract parameters │                          │
│                        └──────────┬──────────┘                          │
│                                   │                                    │
│                   ┌───────────────┼───────────────┐                    │
│                   │               │               │                    │
│                   ▼               ▼               ▼                    │
│            ┌───────────┐   ┌───────────┐   ┌───────────┐               │
│            │ info.json │   │ Derivative│   │ On-demand │               │
│            │  request  │   │   lookup  │   │ processing│               │
│            └─────┬─────┘   └─────┬─────┘   └─────┬─────┘               │
│                  │               │               │                    │
│                  ▼               ▼               ▼                    │
│            Generate        Check IDB      createImageBitmap            │
│            ImageInfo       derivatives    OffscreenCanvas              │
│            response        store          crop/resize/rotate           │
│                                                                         │
│                        ┌─────────────────────┐                          │
│                        │  3. Cache Response  │                          │
│                        └──────────┬──────────┘                          │
│                                   │                                    │
│                                   ▼                                    │
│                        ┌─────────────────────┐                          │
│                        │  4. Return Blob     │                          │
│                        │  with CORS headers  │                          │
│                        └─────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### URL Pattern

```
/iiif/image/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
```

### Supported Parameters

| Parameter | Values | Example |
|-----------|--------|---------|
| **Region** | `full`, `x,y,w,h`, `pct:x,y,w,h` | `100,200,500,400` |
| **Size** | `max`, `w,h`, `w,`, `,h`, `pct:n` | `800,` or `pct:50` |
| **Rotation** | `0`, `90`, `180`, `270`, `!n` (mirror) | `!90` |
| **Quality** | `default`, `color`, `gray`, `bitonal` | `gray` |
| **Format** | `jpg`, `png`, `webp`, `gif` | `webp` |

### Derivative Caching

Pre-generated derivatives are stored for common sizes:

```javascript
// Derivative key format
const key = `${identifier}_${sizeKey}`;

// Standard presets matched
pct:7.5   → thumbnail (150px)
pct:30    → small (600px)
pct:60    → medium (1200px)
```

### Image Processing

```javascript
async function processImage(blob, region, size, rotation, quality) {
  const bitmap = await createImageBitmap(blob);

  // Apply region crop
  const cropped = cropBitmap(bitmap, region);

  // Apply size scaling
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(cropped, 0, 0, targetWidth, targetHeight);

  // Apply rotation
  if (rotation !== 0) {
    applyRotation(ctx, rotation);
  }

  // Apply quality (grayscale, etc.)
  if (quality === 'gray') {
    applyGrayscale(ctx);
  }

  return canvas.convertToBlob({ type: mimeType, quality: 0.85 });
}
```

---

## Singleton Services

**Directory:** `services/`

### Core Services

| Service | File | Purpose |
|---------|------|---------|
| `exportService` | `exportService.ts` (58KB) | Archive export with image optimization |
| `staticSiteExporter` | `staticSiteExporter.ts` (31KB) | Jekyll/WAX site generation |
| `iiifBuilder` | `iiifBuilder.ts` (21KB) | Transform files to IIIF structures |
| `csvImporterService` | `csvImporter.ts` (19KB) | CSV metadata round-trip |
| `provenanceService` | `provenanceService.ts` (22KB) | Edit history and audit trails |
| `searchService` | `searchService.ts` (18KB) | Full-text search indexing |
| `avService` | `avService.ts` (14KB) | Audio/video canvas handling |
| `validationHealer` | `validationHealer.ts` (6KB) | Auto-fix validation issues |

### Specialized Services

| Service | File | Purpose |
|---------|------|---------|
| `stagingService` | `stagingService.ts` (13KB) | Two-pane ingest workbench |
| `metadataTemplateService` | `metadataTemplateService.ts` (7KB) | CSV template generation |
| `contentStateService` | `contentState.ts` (13KB) | IIIF Content State encoding |
| `archivalPackageService` | `archivalPackageService.ts` (18KB) | BagIt package creation |
| `viewerCompatibility` | `viewerCompatibility.ts` (17KB) | Viewer compatibility checks |
| `fileIntegrity` | `fileIntegrity.ts` (12KB) | Duplicate detection, hashing |

---

## Static Site Generation

**File:** `services/staticSiteExporter.ts`

### Export Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                    Static Site Export Pipeline                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  1. TRAVERSE                                                           │
│     └── Walk Vault, collect all IIIFItems                              │
│                                                                        │
│  2. DENORMALIZE                                                        │
│     └── Reconstruct nested JSON structures                             │
│                                                                        │
│  3. GENERATE ASSETS                                                    │
│     ├── Item pages (HTML) ─────────────► _items/*.html                 │
│     ├── Manifests (JSON) ──────────────► iiif/*/manifest.json          │
│     ├── Collection manifest ───────────► iiif/collection.json          │
│     ├── Metadata (YAML) ───────────────► _data/items.yml               │
│     ├── Metadata (JSON) ───────────────► _data/items.json              │
│     ├── Level 0 tiles ─────────────────► iiif/tiles/{id}/{z}/{x}_{y}.jpg
│     └── Search index ──────────────────► search/index.json             │
│                                                                        │
│  4. PACKAGE                                                            │
│     └── Create ZIP using JSZip                                         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Output Formats

**Standard:**
```
output/
├── iiif/
│   ├── collection.json
│   └── {manifest-id}/
│       ├── manifest.json
│       └── tiles/
│           └── {canvas-id}/
│               └── {z}/{x}_{y}.jpg
└── assets/
```

**Canopy (Jekyll):**
```
output/
├── _config.yml
├── _data/
│   ├── items.json
│   └── items.yml
├── _items/
│   └── {item-id}.md
├── iiif/
│   └── ...
└── search/
    └── index.json
```

**WAX:**
```
output/
├── _data/items.csv
├── _items/
├── iiif/
├── search/index.json
└── js/lunr-config.js
```

### Key Methods

```typescript
class StaticSiteExporter {
  async exportSite(root: IIIFItem, config?: Partial<StaticSiteConfig>);

  // Internal methods
  collectItems(root: IIIFItem): IIIFItem[];
  generateItemPage(item: IIIFItem, config: StaticSiteConfig): VirtualFile;
  generateTiles(canvas: IIIFCanvas, config: StaticSiteConfig): VirtualFile[];
  generateStaticManifest(manifest: IIIFManifest, config: StaticSiteConfig): VirtualFile;
  generateCollectionManifest(collection: IIIFCollection, manifests: IIIFManifest[]): VirtualFile;
  generateSearchIndex(root: IIIFItem, config: StaticSiteConfig): VirtualFile;
  generateMetadataJson(): VirtualFile;
  generateMetadataYaml(): VirtualFile;
}
```

---

## Storage Architecture

**File:** `services/storage.ts`

### IndexedDB Stores

| Store | Key | Value | Purpose |
|-------|-----|-------|---------|
| `files` | identifier | Blob | Original uploaded media |
| `derivatives` | `{id}_{size}` | Blob | Pre-generated thumbnails/tiles |
| `vault` | 'state' | JSON | Normalized state snapshot |

### Storage API

```typescript
// File operations
await storage.saveFile(identifier, blob);
const blob = await storage.getFile(identifier);
await storage.deleteFile(identifier);
const exists = await storage.hasFile(identifier);

// Derivative operations
await storage.saveDerivative(key, blob);
const derivative = await storage.getDerivative(key);

// Vault state
await storage.saveVault(state);
const state = await storage.loadVault();
```

### Memory Management

- Files stored by reference (Blob URLs)
- React state holds IDs only, not binary data
- OffscreenCanvas used for image processing
- Web Workers for tile generation (`services/tileWorker.ts`)

---

## Component Architecture

**Directory:** `components/`

### Main Views

| Component | File | Purpose |
|-----------|------|---------|
| `ArchiveView` | `views/ArchiveView.tsx` (40KB) | Hierarchical tree navigation |
| `BoardView` | `views/BoardView.tsx` (62KB) | Spatial canvas arrangement |
| `CollectionsView` | `views/CollectionsView.tsx` (27KB) | Collection management |
| `MetadataSpreadsheet` | `views/MetadataSpreadsheet.tsx` (30KB) | Table metadata editing |
| `Viewer` | `views/Viewer.tsx` (29KB) | Deep-zoom image viewer |
| `SearchView` | `views/SearchView.tsx` (12KB) | Full-text search |

### View Routing

**File:** `components/ViewRouter.tsx`

```typescript
type AppMode = 'archive' | 'collections' | 'boards' | 'search' | 'viewer' | 'metadata';

// Routes based on current mode
<ViewRouter mode={appMode}>
  {/* Renders appropriate view component */}
</ViewRouter>
```

### Key Editors

| Component | File | Purpose |
|-----------|------|---------|
| `Inspector` | `Inspector.tsx` (41KB) | Property editor panel |
| `MetadataEditor` | `MetadataEditor.tsx` (22KB) | Language-aware metadata |
| `CanvasComposer` | `CanvasComposer.tsx` (29KB) | Image layer composition |
| `QCDashboard` | `QCDashboard.tsx` (25KB) | Validation and healing |

### Staging Workbench

**Directory:** `components/staging/`

Two-pane ingest interface:

| Component | Purpose |
|-----------|---------|
| `StagingWorkbench` | Main container |
| `SourcePane` | Uploaded manifests |
| `ArchivePane` | Organization workspace |
| `CollectionCard` | Collection display |
| `SendToCollectionModal` | Move/copy dialog |

---

## Documentation Gaps

### 9 Undocumented Services

The following services are implemented but not documented in Utility.md:

| Service | File | Purpose | Documentation |
|---------|------|---------|---------------|
| `authService` | `services/authService.ts` | OAuth/OIDC authentication | [Services.md](./Services.md) |
| `fieldRegistry` | `services/fieldRegistry.ts` | Custom metadata field registration | [Services.md](./Services.md) |
| `guidanceService` | `services/guidanceService.ts` | User help system | [Services.md](./Services.md) |
| `imageSourceResolver` | `services/imageSourceResolver.ts` | Server-side image resolution | [Services.md](./Services.md) |
| `metadataHarvester` | `services/metadataHarvester.ts` | EXIF/IPTC extraction | [Services.md](./Services.md) |
| `navPlaceService` | `services/navPlaceService.ts` | Geographic coordinate handling | [Services.md](./Services.md) |
| `remoteLoader` | `services/remoteLoader.ts` | External manifest fetching | [Services.md](./Services.md) |
| `selectors` | `services/selectors.ts` | Vault state selectors | [Services.md](./Services.md) |
| `tileWorker` | `services/tileWorker.ts` | Web Worker tile generation | [Services.md](./Services.md) |

See [Services.md](./Services.md) for complete documentation of these services.

### 5 Additional Hooks

The following hooks are implemented but not documented:

| Hook | File | Purpose | Documentation |
|------|------|---------|---------------|
| `useURLState` | `hooks/useURLState.ts` | URL state management | [Hooks.md](./Hooks.md) |
| `useResponsive` | `hooks/useResponsive.ts` | Mobile/tablet/desktop detection | [Hooks.md](./Hooks.md) |
| `useViewportKeyboard` | `hooks/useViewportKeyboard.ts` | Viewport keyboard shortcuts | [Hooks.md](./Hooks.md) |
| `useStructureKeyboard` | `hooks/useStructureKeyboard.ts` | Structure view navigation | [Hooks.md](./Hooks.md) |
| `useStagingState` | `components/staging/hooks/useStagingState.ts` | Staging workbench state | [Hooks.md](./Hooks.md) |

See [Hooks.md](./Hooks.md) for complete documentation of these hooks.

### 2 Undocumented Views

The following view components are implemented but not documented:

| View | File | Purpose | Documentation |
|------|------|---------|---------------|
| `MapView` | `components/views/MapView.tsx` | Geographic visualization | [Components.md](./Components.md) |
| `TimelineView` | `components/views/TimelineView.tsx` | Temporal visualization | [Components.md](./Components.md) |

See [Components.md](./Components.md) for complete documentation of these views.
