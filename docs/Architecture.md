# Field Studio — Architecture

_Updated: 2026-02-24. Canonical architecture reference for the Svelte 5 codebase._
_For day-to-day patterns and commands, see [CLAUDE.md](./CLAUDE.md). For agent context, see [AGENTS.md](./AGENTS.md)._

---

## Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Svelte 5 (runes) | UI rendering |
| Build | Vite | Dev server, bundling |
| Language | TypeScript (strict) | Type safety |
| Storage | IndexedDB + OPFS | Client-side persistence |
| State | Vault (normalized) | IIIF entity management |
| Offline | Service Worker | IIIF Image API 3.0 emulation |
| Styling | Tailwind CSS | Utility-first CSS |
| Tests | Vitest + happy-dom | Unit and integration |

---

## Feature Slice Design (FSD)

```
src/
├── shared/        Low-level: types, services, stores, hooks, UI primitives
├── entities/      Domain logic: manifest vault, actions, builders, validation
├── features/      User-facing slices: archive, viewer, boards, search, ...
├── widgets/       Cross-feature panels: Sidebar, Inspector, CommandPalette, ...
└── app/           Root shell: App.svelte, ViewRouter.svelte, global stores
```

**Import rule:** `shared` < `entities` < `features` < `widgets` < `app`. No upward imports.

**Path alias:** `@` resolves to project root (not `src/`).
```typescript
import { vault } from '@/src/shared/stores/vault.svelte';
```

### Feature anatomy

Every feature follows this layout:

```
src/features/<name>/
├── model/      Business logic, service adapters, utility functions
├── stores/     Svelte 5 $state stores (feature-local reactive state)
├── actions/    Event handlers, user interaction coordinators
├── lib/        Pure helpers, validators, transformers
├── ui/
│   ├── atoms/       Single-concern presentational components
│   ├── molecules/   Composed components (max 300 lines)
│   └── organisms/   Full-section components (max 500 lines)
└── __tests__/   Unit + integration tests
```

### 13 features

| Feature | Purpose |
|---------|---------|
| `archive` | Grid/list browser, selection, orphan management |
| `board-design` | Infinite canvas, spatial connections, notes |
| `dependency-explorer` | Entity relationship graph visualization |
| `export` | Static site, IIIF bundle, CSV export |
| `ingest` | File upload, manifest parsing, virtual manifest creation |
| `map` | NavPlace geospatial visualization (Leaflet) |
| `metadata-edit` | Entity metadata form editor, batch editing |
| `search` | Full-text search (FlexSearch + remote API) |
| `staging` | Conflict resolution, change federation |
| `structure-view` | Range hierarchy tree editor |
| `timeline` | Temporal annotation playback (W3C Media Fragments) |
| `viewer` | OpenSeadragon deep zoom, audio/video, annotation composer |

### 15 widgets

| Widget | Purpose |
|--------|---------|
| `AnnotationToolbar` | Annotation creation/editing |
| `AuthDialog` | IIIF Auth 2.0 login flow |
| `CommandPalette` | Cmd+K command search |
| `ContextualHelp` | Just-in-time guidance |
| `ExperienceSelector` | Abstraction level switcher |
| `FilterPanel` | Asset/entity filtering |
| `KeyboardShortcuts` | Shortcut reference overlay |
| `NavigationHeader` | Top bar: logo, title, user menu |
| `NavigationSidebar` | Left nav: 7 views, structure tree |
| `OnboardingModal` | First-time walkthrough |
| `PersonaSettings` | Persona configuration |
| `QCDashboard` | Validation report + auto-heal |
| `RequiredStatementBar` | IIIF rights/attribution bar |
| `StatusBar` | Bottom bar: mode, counts, quota |
| `StorageFullDialog` | Quota warning |

---

## Data Layer: The Vault

**Location:** `src/entities/manifest/model/vault/`

The vault holds all IIIF entities in a flat, normalized structure with O(1) lookups. It is the single source of truth for archive state.

### NormalizedState

```typescript
interface NormalizedState {
  entities: {
    Collection:     Record<string, IIIFCollection>;
    Manifest:       Record<string, IIIFManifest>;
    Canvas:         Record<string, IIIFCanvas>;
    Range:          Record<string, IIIFRange>;
    AnnotationPage: Record<string, IIIFAnnotationPage>;
    Annotation:     Record<string, IIIFAnnotation>;
  };
  references:         Record<string, string[]>;   // parentId → childIds (ownership)
  reverseRefs:        Record<string, string>;      // childId → parentId
  collectionMembers:  Record<string, string[]>;    // collectionId → memberIds (membership)
  memberOfCollections: Record<string, string[]>;   // entityId → collectionIds
  rootId:             string | null;
  typeIndex:          Record<string, EntityType>;   // entityId → type
  extensions:         Record<string, Record<string, unknown>>;
  trashedEntities:    Record<string, TrashedEntity>;
}
```

Two relationship models reflect IIIF 3.0:
- **Ownership** (`references`/`reverseRefs`): Manifest owns Canvases. One parent, exclusive.
- **Membership** (`collectionMembers`/`memberOfCollections`): Collection references Manifests. Many-to-many.

### Vault module files

| File | Purpose |
|------|---------|
| `vault.ts` | `Vault` class: load, get, update, add, remove, export |
| `normalization.ts` | Nested IIIF tree → flat NormalizedState |
| `denormalization.ts` | NormalizedState → nested IIIF tree for export |
| `queries.ts` | O(1) lookups: getEntity, getParentId, getChildIds |
| `collections.ts` | Membership ops: addToCollection, isOrphanManifest |
| `updates.ts` | Entity mutations: addEntity, updateEntity, removeEntity |
| `trash.ts` | Soft delete: moveToTrash, restore, emptyTrash |
| `movement.ts` | Reparent/reorder: moveEntity with parent + index |
| `cloning.ts` | Deep entity duplication |
| `extensions.ts` | Arbitrary metadata storage per entity |
| `types.ts` | Re-exports canonical types |

### Reactive store

**Location:** `src/shared/stores/vault.svelte.ts`

The reactive store wraps the Vault class with Svelte 5 runes:

```typescript
// $state.raw — no deep proxy (performance on large trees)
let _state = $state.raw<NormalizedState>(createEmptyState());

// Reactive reads (tracked by Svelte)
vault.state        // full state
vault.rootId       // root entity id
vault.getEntity(id) // single entity lookup

// Non-reactive peeks (no dependency tracking)
vault.peekEntity(id)
vault.peekState()
vault.peekChildren(id)
vault.peekParent(id)

// Mutations (trigger reactivity)
vault.load(tree)
vault.update(id, changes)
vault.moveToTrash(id)
vault.dispatch(action)
```

### Action system

**Location:** `src/entities/manifest/model/actions/`

All vault mutations go through dispatched actions for history tracking and provenance.

**26 action types** across 8 modules:

| Module | Actions |
|--------|---------|
| `metadata.ts` | UPDATE_LABEL, UPDATE_SUMMARY, UPDATE_METADATA, UPDATE_RIGHTS, UPDATE_NAV_DATE, UPDATE_BEHAVIOR, UPDATE_VIEWING_DIRECTION |
| `canvas.ts` | ADD_CANVAS, REMOVE_CANVAS, REORDER_CANVASES, UPDATE_CANVAS_DIMENSIONS |
| `annotation.ts` | ADD_ANNOTATION, REMOVE_ANNOTATION, UPDATE_ANNOTATION, CREATE_ANNOTATION_PAGE, UPDATE_ANNOTATION_PAGE_LABEL, MOVE_ANNOTATION_TO_PAGE |
| `movement.ts` | MOVE_ITEM, REORDER_RANGE_ITEMS |
| `trash.ts` | MOVE_TO_TRASH, RESTORE_FROM_TRASH, EMPTY_TRASH, BATCH_RESTORE |
| `range.ts` | ADD_RANGE, REMOVE_RANGE, ADD_NESTED_RANGE, ADD/REMOVE_CANVAS_TO_RANGE, UPDATE_RANGE_SUPPLEMENTARY |
| `linking.ts` | UPDATE_LINKING_PROPERTY, UPDATE_REQUIRED_STATEMENT, UPDATE_START |
| `board.ts` | CREATE_BOARD, UPDATE_BOARD_ITEM_POSITION, REMOVE_BOARD_ITEM |

**Undo/redo:** Patch-based (diffStates → applyPatches). 100-entry history with 500ms coalesce window for rapid edits. Wired to Cmd+Z / Cmd+Shift+Z in App.svelte.

**Selective reactivity:** Each action records `lastChangedIds: Set<string>` so only affected components re-render.

---

## Service Worker: IIIF Image API

**Location:** `public/sw.js`

The service worker implements IIIF Image API 3.0 Level 2 entirely in the browser:

```
GET /iiif/image/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
```

### Request pipeline

```
Fetch → Cache check → Parse IIIF URL → Route:
  ├─ info.json → Generate ImageInfo response
  ├─ Derivative → Check IDB derivatives store
  └─ On-demand → createImageBitmap + OffscreenCanvas
       → Crop region → Scale size → Rotate → Apply quality
       → Cache response → Return blob with CORS headers
```

### Supported parameters

| Parameter | Values |
|-----------|--------|
| Region | `full`, `square`, `x,y,w,h`, `pct:x,y,w,h` |
| Size | `max`, `w,h`, `w,`, `,h`, `pct:n`, `^w,h` |
| Rotation | `0`, `90`, `180`, `270`, `!n` (mirror) |
| Quality | `default`, `color`, `gray`, `bitonal` |
| Format | `jpg`, `png`, `webp`, `gif` |

### Requirements

- Secure context (localhost or HTTPS)
- Registered in `main.ts`: `navigator.serviceWorker.register('/sw.js')`
- Original blobs stored in IDB `files` store; derivatives in `derivatives` store

---

## Storage

**Location:** `src/shared/services/storage.ts`

### IndexedDB stores

| Store | Key | Value | Purpose |
|-------|-----|-------|---------|
| `files` | identifier (string) | Blob | Original uploaded media |
| `derivatives` | `{id}_{size}` | Blob | Pre-generated thumbnails/tiles |
| `vault` | `'state'` | gzip JSON | Normalized vault state snapshot |

### OPFS (Origin Private File System)

**Location:** `src/shared/services/opfsStorage.ts`

Files larger than 10 MB are stored in OPFS to avoid IDB quota pressure. OPFS provides filesystem-like access without serialization overhead.

### Memory model

- Files stored by reference (blob URLs), not in reactive state
- Svelte state holds IDs only — never binary data
- OffscreenCanvas used for image processing (no main-thread bitmap allocation)
- Workers handle tile generation and compression

---

## Services

**Location:** `src/shared/services/`

### Core services (wired)

| Service | File | What it does |
|---------|------|-------------|
| `storage` | `storage.ts` | IDB persistence: saveProject, loadProject, saveAsset, getAsset |
| `contentState` | `contentState.ts` | IIIF Content State API 1.0: encode/decode viewport for URL sharing |
| `tilePipeline` | `tilePipeline.ts` | IIIF tile pyramid generation with worker pool and LRU eviction |
| `searchService` | `searchService.ts` | FlexSearch local index + IIIF Content Search API 2.0 remote |
| `specBridge` | `specBridge.ts` | IIIF v2 ↔ v3 conversion (@context, @id→id, sequences→items) |
| `logger` | `logger.ts` | Domain-specific loggers (vaultLog, networkLog, storageLog) |
| `virtualManifestFactory` | `virtualManifestFactory.ts` | Create Manifests from raw resources (image/audio/video/PDF) |

### Specialized services (partially wired)

| Service | File | Status |
|---------|------|--------|
| `authFlowService` | `authFlowService.ts` | IIIF Auth 2.0 flow. `// @migration` stubs in AuthDialog |
| `authService` | `authService.ts` | Probe-first auth (401 handling, token acquisition) |
| `activityStream` | `activityStream.ts` | User action recording. No call sites yet |
| `changeDiscovery` | `changeDiscoveryService.ts` | W3C Activity Stream federation. No call sites yet |
| `guidanceService` | `guidanceService.ts` | Help tip tracking. Stub in ContextualHelp |
| `navPlaceService` | `navPlaceService.ts` | GeoJSON/navPlace for MapView |
| `provenanceService` | `provenanceService.ts` | Audit trail. Stub |
| `remoteLoader` | `remoteLoader.ts` | External manifest fetch. Stub |
| `metadataHarvester` | `metadataHarvester.ts` | EXIF/IPTC extraction. Stub |
| `metadataTemplate` | `metadataTemplateService.ts` | CSV template generation for batch editing |
| `fieldRegistry` | `fieldRegistry.ts` | Custom metadata field registration. Stub |
| `opfsStorage` | `opfsStorage.ts` | Large file OPFS storage |

---

## View System

**Router:** `src/app/ui/ViewRouter.svelte`

7 views, switchable by keyboard (keys 1-7) or sidebar nav:

| Key | Mode | Component | What the user sees |
|-----|------|-----------|-------------------|
| 1 | archive | ArchiveView | Grid/list browser with filmstrip, drag-reorder |
| 2 | viewer | ViewerView | Deep zoom (OSD) + audio/video + annotations |
| 3 | boards | BoardView | Infinite canvas with spatial connections |
| 4 | metadata | MetadataView | Entity metadata form editor |
| 5 | search | SearchView | Full-text search across all items |
| 6 | map | MapView | Geographic browsing (Leaflet + navPlace) |
| 7 | timeline | TimelineView | Chronological ordering with time ranges |

**Routing is reactive, not file-based:** `appMode.mode` store determines the active view. All views share the vault and annotation context.

**Archive panel states:**

| Viewer | Inspector | Result |
|--------|-----------|--------|
| Open | Closed | Filmstrip + Viewer |
| Open | Open | Filmstrip + Viewer + Inspector |
| Closed | Open | Full Grid + Inspector |
| Closed | Closed | Full Grid (reorder enabled) |

---

## Validation

**Location:** `src/entities/manifest/model/validation/`

| File | Purpose |
|------|---------|
| `validator.ts` | `validateTree(root)` — checks all entities against IIIF 3.0 spec |
| `validationHealer.ts` | `healAllIssues(item)` — auto-fixes fixable issues |

**Auto-fixable issues:** missing label (derive from filename), missing dimensions (defaults), invalid URIs, duplicate IDs, empty items, conflicting behaviors.

**Consumer chain:** `validator.validateTree()` → ValidationIssue[] → `QCDashboard` display + `FilterPanel` counts.

---

## Build & Testing

```bash
npm run dev           # Vite dev server at http://localhost:5173
npm run build         # Production build
npm test              # 4,756 tests, 117 files
npm run typecheck     # svelte-check: 0 errors, 29 warnings
npm run typecheck:ts  # tsc --noEmit: 0 errors
npm run lint          # ESLint: 0 errors, 240 warnings
```

### Test infrastructure

- **Framework:** Vitest + happy-dom
- **IDB mocking:** `vi.hoisted()` + in-memory Map (not `vi.mock()` which hoists before variable declarations)
- **Coverage:** v8 provider, thresholds: statements 80%, branches 70%, functions 80%, lines 80%

### Custom ESLint rules (18)

**Location:** `eslint-rules/`

Key rules: `max-lines-feature` (molecule 300 / organism 500), `no-native-html-in-molecules`, `no-svelte4-patterns`, `lifecycle-restrictions`, `require-aria-for-icon-buttons`, `typed-context-keys`, `prefer-semantic-elements`.

---

## Known Debt

### TYPE_DEBT (structural, cannot fix without major work)

| Item | Location | Reason |
|------|----------|--------|
| `IIIFItem.service?: any[]` | `shared/types/index.ts` | Needs `ServiceDescriptor` discriminated union |
| `IIIFItem.items?: any[]` | `shared/types/index.ts` | 15+ call sites iterate without narrowing |
| `IIIFItem.navPlace?: any` | `shared/types/index.ts` | Needs GeoJSON type |
| `ValidationIssue` | 3 locations | 3 incompatible shapes (store vs validator vs QCDashboard) |

### Permanent TYPE_DEBT (external libs)

| Site | Count | Reason |
|------|-------|--------|
| `annotorious.ts` | 14 | No `@types/annotorious` |
| `waveform.ts` | 9 | No `@types/wavesurfer.js` |
| `svelte-shims.d.ts` | 2 | Framework shim |

### `@migration` stubs remaining: 85

Largest: ViewerView (25), BoardView (10), Sidebar (6), AuthDialog (6).

---

## Deployment

Currently web-only (static build, GitHub Pages). Future targets (see [ROADMAP.md](./ROADMAP.md)):
- Docker (server-side tile serving, WebSocket sync)
- Tauri (native desktop, filesystem access)

All three targets will share a `StorageAdapter` interface. Web uses IDB/OPFS, Docker uses HTTP REST, Tauri uses native filesystem via Rust invoke.
