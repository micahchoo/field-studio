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

### 12 features

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

**37 action types** across 8 handler modules (plus `types.ts` for the union definition and `validation.ts` for parameter checks):

| Module | Actions |
|--------|---------|
| `metadata.ts` | UPDATE_LABEL, UPDATE_SUMMARY, UPDATE_METADATA, UPDATE_RIGHTS, UPDATE_NAV_DATE, UPDATE_BEHAVIOR, UPDATE_VIEWING_DIRECTION, BATCH_UPDATE_NAV_DATE, BATCH_UPDATE |
| `canvas.ts` | ADD_CANVAS, REMOVE_CANVAS, REORDER_CANVASES, UPDATE_CANVAS_DIMENSIONS |
| `annotation.ts` | ADD_ANNOTATION, REMOVE_ANNOTATION, UPDATE_ANNOTATION, CREATE_ANNOTATION_PAGE, UPDATE_ANNOTATION_PAGE_LABEL, MOVE_ANNOTATION_TO_PAGE, SET_ANNOTATION_PAGE_BEHAVIOR |
| `movement.ts` | MOVE_ITEM, REORDER_RANGE_ITEMS, RELOAD_TREE |
| `trash.ts` | MOVE_TO_TRASH, RESTORE_FROM_TRASH, EMPTY_TRASH, BATCH_RESTORE |
| `range.ts` | ADD_RANGE, REMOVE_RANGE, ADD_NESTED_RANGE, ADD_CANVAS_TO_RANGE, REMOVE_CANVAS_FROM_RANGE, UPDATE_RANGE_SUPPLEMENTARY |
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
npm run lint          # ESLint: 0 errors, 80 warnings
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

### Feature Completion Audit (2026-02-24)

Systematic audit of all claimed features against actual UI wiring. Every feature directory exists and renders, but functional completeness varies significantly.

#### Fully Functional

| Feature | Notes |
|---------|-------|
| `ingest` | File upload, manifest parsing, virtual manifest creation all work |
| `search` | Full-text local search works; minor UX gaps (error not rendered, indexing spinner invisible) |
| `staging` | CSV validation, source tree, conflict resolution work; 3-sec auto-close is annoying but functional |
| `metadata-edit` | Spreadsheet editing, column extraction, per-keystroke save work |
| `archive` | Grid/list/filmstrip render; selection, filtering, keyboard reorder work |

#### Partially Functional — render but missing core advertised capabilities

| Feature | What works | What's broken/missing |
|---------|-----------|----------------------|
| `viewer` | OSD deep zoom | Annotation drawing overlay **never rendered**; `MediaPlayer` (audio/video with transcripts) **never mounted** — native `<audio>`/`<video>` used instead |
| `map` | Equirectangular projection, clustering | `navPlaceService.geocode()` always returns `[]`; IIIF `navPlace` GeoJSON **ignored**; bare gradient instead of real basemap |
| `timeline` | Groups by zoom level, minimap | `new Date(navDate)` **rejects partial dates** ("2017-03", "circa 1200"); items silently dropped |
| `metadata-edit` (Inspector tabs) | Core spreadsheet works | Annotation + Structure tabs are **placeholder divs** with migration text |
| `NavigationSidebar` | 7 nav items, tree renders | Context menu only shows "Navigate"; rename/delete/duplicate **not passed from App** |

#### Broken / Stubbed — UI shell exists, core functionality non-operational

| Feature | Status |
|---------|--------|
| `board-design` | `connectingFrom` always passed as `null` → connections never created; text tool has no handler; save only `console.warn`s; all 3 exports stub |
| `export` | All 5 handlers stubbed (dry-run, final, canopy, activity-log, archival); services exist but **UI never calls them**; no file download ever occurs; dry-run empty `try{}` always shows "Valid" |
| `CommandPalette` | Full widget **never imported**; inline fallback has no search/grouping; Escape doesn't close it |

#### Not Wired — directories exist, no UI integration

| Feature | Status |
|---------|--------|
| `structure-view` | Components exist but imports **commented out** in Sidebar |
| `dependency-explorer` | Only `types.ts` + `index.ts`; model/store/ui dirs empty |

#### Cross-cutting dead ends

| Issue | Location |
|-------|----------|
| Archive "View on Map" / "Compose on Board" buttons → **empty no-op handlers** | `ArchiveView.svelte:284–286` |
| `AnnotationToolbar` → placeholder div with dev text in production DOM | `AnnotationToolbar.svelte:79–83` |
| `Cmd+E` (Export shortcut) shown in palette but **not in `handleKeyDown`** | `App.svelte:789 vs 745–778` |
| Storage load errors swallowed: `.catch(() => {})` | `App.svelte:488` |
| Map/Timeline/Search stores re-instantiated on mount → state **lost on view switch** | `MapView.svelte:47`, `TimelineView.svelte:45` |
| Search result click forces archive mode → **query and scroll lost, no back nav** | `ViewRouter.svelte:703–704` |
| Staging "Undo" re-shows workbench but vault already mutated → would **double-import** | `StagingCompletionSummary.svelte:56` |

#### Summary

| Category | Count |
|----------|-------|
| Fully functional | 5 |
| Partially functional | 5 |
| Broken / stubbed | 3 |
| Not wired | 2 |
| **Total claimed** | **15** |

### UI Shadow Exercise (2026-02-24)

Comprehensive first-time-user walkthrough of all 7 views, staging, export, and cross-feature widgets. Every claim traced to file:line.

#### DEAD END (no obvious action)

| Flow | Description | Location |
|------|-------------|----------|
| Board — Connect tool | `connectingFrom` set locally but passed as `null` to renderer; `onCompleteConnection` prop does not exist. No connection is ever created. | `BoardCanvasInteractive.svelte:191–194`, `BoardView.svelte:324` |
| Board — Text tool | Tool `T` activates but no handler in `handleCanvasPointerDown`. Clicking canvas does nothing. | `BoardCanvasInteractive.svelte:130–139` |
| Board — Save/Persist | `handleBoardSave` only `console.warn`s. All board state lost on refresh or view switch. | `ViewRouter.svelte:439–445` |
| Board — Export menu | All three exports (IIIF, PNG, SVG) are stubs with `console.warn`. No file downloaded. | `BoardView.svelte:204–214` |
| Viewer — Annotation drawing | `AnnotationDrawingOverlay` imported but never rendered. `use:annotorious` never applied. Annotation button activates with no effect. | `ViewerView.svelte:56, 1086–1094` |
| Viewer — AV annotation | `MediaPlayer.svelte` (custom player with time-range annotation, transcripts) never mounted. `ViewerView` uses native `<audio>`/`<video>` only. Time annotation always null. | `ViewerView.svelte:1111–1187`, `ViewRouter.svelte:385–407` |
| Archive — Reorder (drag) | `ArchiveGrid.svelte` (with drag-drop) never mounted. `ArchiveGridView.svelte` (actually used) has no drag handlers. Only undiscoverable Alt+Arrow keyboard reorder works. | `ArchiveGridView.svelte:42–104`, `ArchiveGrid.svelte:268–303` |
| Archive — "View on Map" | Button calls `handleOpenMap()` which is an empty no-op function. | `ArchiveView.svelte:284–285` |
| Archive — "Compose on Board" | Button calls `handleComposeOnBoard()` which is an empty no-op function. | `ArchiveView.svelte:285–286` |
| Export — All formats | All 4 export services are stubs. Dry-run always shows "Valid" (zero checks). Close button hidden at `step='exporting'`. | `ExportDialog.svelte:149–200, 243` |
| Export — No project | Export button does nothing when `root` is null. No disabled state or tooltip. | `App.svelte:1012` |
| CommandPalette widget | Full widget never imported. App.svelte uses inline fallback with no search, no keyboard nav, no section grouping. | `App.svelte:1081–1127` |
| Sidebar — Context menu | `onRenameItem`/`onDeleteItem`/`onDuplicateItem` not passed from App. Menu shows only "Navigate". | `App.svelte:864–882` |
| Map/Timeline — Empty states | No actionable buttons to add data. User stranded unless they know to navigate elsewhere. | `MapView.svelte:227–235`, `TimelineView.svelte:179–187` |
| AnnotationToolbar | Entire drawing UI is a placeholder div with dev text. `onCreateAnnotation` never called. | `AnnotationToolbar.svelte:71–85` |
| GeoEditor — Geocode | `navPlaceService.geocode()` always returns `[]`. Location search never works. | `navPlaceService.ts:55` |
| Staging — Analysis error | No dismiss button during error phase; modal title stays "Analyzing Content..." | `StagingWorkbench.svelte:221, 784` |
| Inspector — Annotation/Structure tabs | Both are placeholder divs with migration text. No create/edit/delete capability. | `Inspector.svelte:502–529` |

#### SILENT FAIL (error caught, not shown)

| Flow | Description | Location |
|------|-------------|----------|
| App — Storage load | `.catch(() => {})` swallows `loadProject()` errors. User sees empty state as if no project saved. | `App.svelte:488` |
| Viewer — OSD missing | `console.error` if OpenSeadragon absent. User sees blank canvas, no error message. | `ViewerView.svelte:431–434` |
| Viewer — OSD load fail | 2 retries with no error state rendered on final failure. | `ViewerView.svelte:522–529` |
| Viewer — Clipboard | Clipboard API failure silently falls back to download. Share link `.catch` logs warning only. | `ViewerView.svelte:645–658, 763–773` |
| Annotorious global | `globalThis.__annotorious__` check returns silently if absent. Annotation button rendered with no backing lib. | `annotorious.ts:366–371` |
| Board — Auto-save | Save callback `console.warn`s and returns. `isDirty` flag resets to false — UI shows "Saved". | `boardVault.svelte.ts:446–447` |
| Search — Remote errors | `search.error` populated on remote failure but never read or rendered in SearchView. | `search.svelte.ts:272` |
| Map — navPlace ignored | IIIF 3.0 `navPlace` GeoJSON field completely ignored. Only free-text metadata parsed. | `map.svelte.ts:116–169` |
| Map — Coordinate parse | Failed coordinate parsing silently skips canvas. No indication to user. | `map.svelte.ts:145–157` |
| Timeline — navDate parse | `new Date(navDate)` rejects partial dates ("2017-03", "circa 1200"). Items silently dropped. | `timeline.svelte.ts:108–118` |
| GeoEditor — Invalid GeoJSON | Emits `{ type: 'Feature', features }` — invalid GeoJSON. Will fail in any compliant viewer. | `GeoEditor.svelte:142` |
| Staging — Ingest error | Outer `catch` calls `uiLog.error()` only. Full-screen overlay disappears with no error shown. | `StagingWorkbench.svelte:745–747` |
| Auth — Double window | Both `openAccessService()` and `window.open()` called. May open two login windows. | `AuthDialog.svelte:187–189` |
| Export — Dry run | Empty `try {}` body. Always shows "Spec Compliance: Valid" from zero checks. | `ExportDialog.svelte:149–156` |

#### NO FEEDBACK (state changes invisibly)

| Flow | Description | Location |
|------|-------------|----------|
| Archive — Empty tree | `extractCanvases` returns `[]` if tree has only Collections/Manifests. Empty state says "Import photos" despite content existing. | `ArchiveView.svelte:138–150` |
| Archive — No virtualization | `ArchiveGridView` renders all items in single `{#each}`. No loading indicator for large sets. | `ArchiveGridView.svelte:42–104` |
| Archive — Group created | New manifest named "Selection Bundle" with no rename prompt, no toast. | `ArchiveView.svelte:277` |
| Board — Drag label | Dropped item gets `label: undefined`; card shows generic "Canvas" text. | `BoardItemRenderer.svelte:91` |
| Board — Connection label | Labels only visible in advanced mode. Normal users enter labels that never display. | `BoardConnectionRenderer.svelte:98–111` |
| Board — Presentation | `PresentationOverlay` expects `BoardItem` but receives `SlideItem` (only `id`+`label`). Images/notes/metadata never display. | `BoardView.svelte:411`, `PresentationOverlay.svelte:84–122` |
| Search — Indexing spinner | `isIndexing` set true→false synchronously. Spinner frame never painted. | `search.svelte.ts:123–127` |
| Map/Timeline/Search — Selection | Clicking items sets `selectedId` in App but no visual selection state in the view itself. | `MapView.svelte:293–319`, `TimelineView.svelte:229–269` |
| Map — Zoom limits | No disabled state on zoom buttons at min/max zoom. Button clicks silently do nothing. | `map.svelte.ts:176–187` |
| CommandPalette — Escape | Escape doesn't close inline palette. No click-outside handler on backdrop. | `App.svelte:745–778, 1082` |
| Export — All paths | No download ever occurs. No indication to user that services are stubs. | `ExportDialog.svelte:149–200` |
| Metadata — Non-editable cells | Click on ID/Type column does nothing. No cursor change or tooltip indicating read-only. | `MetadataView.svelte:274–277` |
| Staging — CSV errors | "No data rows" / "No filename column" messages never auto-clear. | `StagingWorkbench.svelte:603, 609` |

#### ASSUMPTION (jargon, unlabelled inputs)

| Flow | Description | Location |
|------|-------------|----------|
| Archive — "pipeline" | Subtitle "Select items to access pipeline" — jargon for first-time users. | `ArchiveHeader.svelte:134` |
| Map — No basemap | Flat gradient with grid. No geographic context, coastlines, or country names. User cannot verify positions. | `map.svelte.ts:228–250` |
| Map — Coordinate keywords | Free-text metadata labels matched by substring ("gps", "position", "coordinate"). User has no control. | `map.svelte.ts:129–142` |
| Map — Hint text | Says "Add GPS coordinates" but doesn't specify which field name, format, or that `navPlace` is ignored. | `MapView.svelte:233` |
| Metadata — IIIF tabs | "Items" means Canvases; "Collections"/"Manifests" are IIIF terms with no explanations. | `MetadataView.svelte:68–79` |
| Metadata — Save button | Data already committed per-keystroke via `onUpdate`. "Save Changes" only clears a flag. | `MetadataView.svelte:269–272` |
| Board — Group label | All groups get hardcoded label "Group" with no rename UI. | `BoardView.svelte:139` |
| Board — Connection types | Vault store and model module define different connection type enums. Never reconciled. | `boardVault.svelte.ts:36–43` vs `model/index.ts:29–35` |
| Staging — IIIF terminology | Analysis banner uses "manifests"/"collections" in simple mode with no explanation. | `StagingBanners.svelte:121–124` |
| Staging — `window.prompt()` | Collection rename uses OS-level prompt dialog, breaking app UI conventions. | `StagingWorkbench.svelte:480` |
| AnnotationToolbar placeholder | Dev text "Needs drawing state wiring from parent context" rendered in production DOM. | `AnnotationToolbar.svelte:79–83` |

#### RACE (stale data, flash states)

| Flow | Description | Location |
|------|-------------|----------|
| App — Root delay | 200ms debounce between vault load and `root = vault.export()`. Flash of empty state on refresh. | `App.svelte:213–222` |
| Archive — Multi-select | Ctrl/Shift-click updates local `selectedIds` without calling `onSelect`. Viewer shows stale item. | `ArchiveView.svelte:220–227` |
| Map — Clustering | Clusters computed at fixed 800x600. Actual container size may differ. Markers overlap or gap. | `map.svelte.ts:379`, `MapView.svelte:51–52` |
| Search — Index rebuild | Any vault update re-runs `rebuildIndex`, clearing results mid-query. | `search.svelte.ts:123–128`, `SearchView.svelte:92–99` |
| Timeline — Vault update | Vault change re-runs `loadFromCanvases`, resetting expanded/collapsed state. | `TimelineView.svelte:64–79` |
| Metadata — Column shift | Filtering can add/remove columns mid-session as matching items change. | `MetadataView.svelte:107–120` |
| GeoEditor — Leaflet unmount | Async Leaflet import may complete after component unmounts, creating zombie map. | `GeoEditor.svelte:67–95` |
| Staging — Auto-close | 3-second timer closes workbench regardless of user interaction. | `StagingWorkbench.svelte:736–739` |

#### NAV TRAP (loses state)

| Flow | Description | Location |
|------|-------------|----------|
| Map/Timeline/Search — View switch | Stores re-instantiated on each mount. Pan, zoom, query, collapsed groups all reset. | `MapView.svelte:47`, `TimelineView.svelte:45` |
| Search — Result click | `onSelect` forces `appMode.setMode('archive')`. Query and scroll lost with no back nav. | `ViewRouter.svelte:703–704` |
| Viewer — URL state | `showViewerPanel` not encoded in URL. Back button cannot restore panel open/closed state. | `App.svelte:471–479` |
| Metadata — View switch | `hasUnsavedChanges` lost on unmount. No in-app warning (only `beforeunload` for page close). | `MetadataView.svelte:138–146` |
| Staging — Undo import | "Undo" re-shows workbench but vault already mutated. Re-importing would double-import. | `StagingCompletionSummary.svelte:56` |

#### HIDDEN REQ (validation only on submit)

| Flow | Description | Location |
|------|-------------|----------|
| Search — Min length | Requires 2+ chars. Single char silently shows empty state, indistinguishable from no query. | `search.svelte.ts:178` |
| Archive — Group selection | Requires 2+ selected items. Single-item `G` press silently does nothing. | `BoardView.svelte:139` |
| Staging — Folder only | `webkitdirectory` attribute with no UI hint that only folders accepted. | `App.svelte:815` |
| Staging — CSV columns | Expected headers (`label`, `rights`, `navdate`) not documented anywhere in UI. | `StagingWorkbench.svelte:641–651` |
| Export — Cmd+E | Shortcut shown in command palette but not handled in `handleKeyDown`. Does nothing. | `App.svelte:789` vs `745–778` |
| Metadata — Tab at last column | Tab on last editable column exits edit mode instead of advancing to next row. | `MetadataView.svelte:241–245` |


---

If you want, I can also produce:

* a **visual (diagram) representation** in ASCII or Mermaid format,
* or tailor this flow to **specific user tasks** (e.g., annotation‑driven exploration, narrative storytelling, or preservation export).

[1]: https://iiif.io/api/content-state/1.0/?utm_source=chatgpt.com "IIIF Content State API 1.0 — IIIF | International Image Interoperability Framework"

---

## TYPE_DEBT Structural

_Fix the five structural `any` root causes that block downstream narrowing._
_Do not widen scope: `IIIFItem.items` is tracked in Phase 1.5._

### Exit criteria

- [x] `grep -r "service\?: any\[\]" src/shared/types` → 0 results ✅ `ServiceDescriptor` union
- [x] `grep -r "navPlace\?: any" src/shared/types` → 0 results ✅ `NavPlace` GeoJSON type
- [x] `grep -r "homepage\?: any" src/shared/types` → 0 results ✅ `ProviderHomepage` type
- [x] `grep -r "logo\?: any" src/shared/types` → 0 results ✅ `ProviderLogo` type
- [x] Single canonical `ValidationIssue` type; all three consumers import from one location ✅ `ValidatorIssue` + `InspectorIssue`
- [x] `tsc --noEmit` 0 errors, `vitest` still green ✅ 0 errors, 4770 passing
- [x] ESLint `no-explicit-any` warning count ≤ current baseline (do not regress) ✅ 80→53

### Tasks

#### 1.1 `ServiceDescriptor` discriminated union

**File:** `src/shared/types/index.ts`
**Current:** `IIIFItem.service?: any[]`
**Target:**
```typescript
export type ServiceDescriptor =
  | { type: 'ImageService3'; id: string; profile: string }
  | { type: 'ImageService2'; '@id': string; '@type': string; profile: string }
  | { type: 'AuthCookieService1'; id: string; label: LanguageMap }
  | { type: 'AuthAccessTokenService1'; id: string }
  | { type: string; id?: string; '@id'?: string; [key: string]: unknown }; // open fallback

// IIIFItem.service?: ServiceDescriptor[]
```
**Call sites requiring narrowing:** `imageSourceResolver.ts` (3 `as any`), `iiifBuilder.ts` (1 `as any`), `staticSiteExporter.ts` (1 `as any`)
**Test:** add unit tests asserting `isImageService3(s)` and `isImageService2(s)` type guards return correct type.

#### 1.2 GeoJSON type for `navPlace`

**File:** `src/shared/types/index.ts`
**Current:** `IIIFItem.navPlace?: any`
**Target:**
```typescript
export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown> | null;
  geometry: GeoJSONGeometry;
}
export type GeoJSONGeometry =
  | { type: 'Point'; coordinates: [number, number] | [number, number, number] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'LineString'; coordinates: [number, number][] };

// IIIFItem.navPlace?: GeoJSONFeature
```
**Call sites:** `navPlaceService.ts` (accepts/returns navPlace), `MapView.svelte` (reads coordinates).
**Test:** `navPlaceService` unit test asserting Point/Polygon narrowing.

#### 1.3 `ProviderHomepage` / `ProviderLogo` types

**File:** `src/shared/types/index.ts`
**Current:** `provider.homepage?: any[]`, `provider.logo?: any[]`
**Target:**
```typescript
export interface ProviderHomepage {
  id: string;
  type: 'Text';
  label: LanguageMap;
  format?: string;
  language?: string[];
}
export type ProviderLogo = IIIFExternalWebResource;

// IIIFProvider.homepage?: ProviderHomepage[]
// IIIFProvider.logo?: ProviderLogo[]
```
**Call sites:** `validationHealer.ts` `createMinimalProvider` (removes last `any` fallback there).

#### 1.4 `ValidationIssue` — single canonical type

**Problem:** Three incompatible shapes exist:
| Consumer | Shape |
|----------|-------|
| Vault store (`validationStore.svelte.ts`) | `{ severity: string; title: string; description: string }` |
| Validator (`validator.ts`) | `{ level: string; itemId: string; message: string; fixable: boolean }` |
| QCDashboard (local copy of validator shape) | same as validator |

**Target:** One canonical type exported from `src/entities/manifest/model/validation/validator.ts`:
```typescript
export interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  itemId: string;
  message: string;
  fixable: boolean;
  /** @deprecated use level + message */ severity?: never;
  /** @deprecated use message */ title?: never;
}
```
Migrate store and QCDashboard to this type. Remove local copies.
**Test:** `QCDashboard.test.ts` and `validationStore` tests import from single location.

### Phase 1.5 — `IIIFItem.items` narrowing (separate scope)

> Tracked here but executed independently; broader blast radius than the items above.

**Problem:** `IIIFItem.items?: any[]` appears on the base type, used by 15+ call sites without narrowing.
**Approach:** Remove `items` from `IIIFItem`. Add typed `items` to subtypes only:
- `IIIFManifest.items: IIIFCanvas[]`
- `IIIFCanvas.items: IIIFAnnotationPage[]`
- `IIIFAnnotationPage.items: IIIFAnnotation[]`

**Blocker:** Requires all 15 call sites to narrow via `isCanvas` / `isManifest` guards first. Do not attempt until Phase 1 structural fixes are merged and tests are green.

---

## Phase 2 — Workers

_Replace all four worker stubs with real implementations._
_Workers must not import IDB directly; pass structured messages only._

### Exit criteria

- [ ] `src/shared/workers/index.ts` exports real worker factories (no stub comments)
- [ ] `USE_WORKER_INGEST` flag can be set `true` without test failures
- [ ] Search indexing runs off-main-thread (SearchView no longer freezes on large vaults)
- [ ] Validation runs off-main-thread (QCDashboard updates non-blocking)
- [ ] `tsc --noEmit` 0 errors, `vitest` still green

### Tasks

#### 2.1 `ingest.worker.ts`

Re-enable `USE_WORKER_INGEST: true` path in `iiifBuilder.ts`.
Worker receives `{ type: 'ingest'; files: SerializedFile[] }`, returns typed `IngestWorkerResponse` (already defined in `workers/index.ts`).
IDB operations stay on main thread; worker posts back entity data, main thread writes to vault.

#### 2.2 `searchIndexer.ts` → `search.worker.ts`

FlexSearch index build currently blocks main thread in `searchService.ts`.
Worker receives vault snapshot (serialized), builds index, posts back serialized index blob.
`SearchView` receives index via postMessage, stores in `$state`.

#### 2.3 `validation.worker.ts`

`validator.validateTree()` currently called synchronously in `App.svelte` effect.
Worker receives normalized vault state, runs validation, posts back `ValidationIssue[]`.
`QCDashboard` and `FilterPanel` consume from store written by worker result handler.

#### 2.4 `compression.worker.ts`

Decompress/compress IIIF JSON payloads for OPFS storage.
Worker wraps `CompressionStream` / `DecompressionStream` (browser-native).
`opfsStorage.ts` calls `getCompressionWorker()` — must no longer return `null`.

---

## Phase 3 — Service Wiring

_Connect services that exist but are not wired to their consumers._
_Each item is tracked by its `// @migration` comment count in the target file._

### Exit criteria

- [ ] `grep -c @migration src/widgets/ContextualHelp` → 0
- [ ] `grep -c @migration src/widgets/CommandPalette` → 0
- [ ] `grep -c @migration src/widgets/AuthDialog` → 0
- [ ] `grep -c @migration src/app/ui/App.svelte` → 0
- [ ] `tsc --noEmit` 0 errors

### Tasks

#### 3.1 `guidanceService` → `ContextualHelp`

`src/shared/services/guidanceService.ts` exists; `ContextualHelp.svelte` stubs it.
Wire `guidanceService.getGuidance(contextKey)` to the `entries` prop.
Wire `WELCOME_MESSAGES` constant (locate in `guidanceService` or add to `src/shared/config/`).

#### 3.2 `commandHistory` store → `CommandPalette`

React version tracked recent commands + frequency map.
Create `src/shared/stores/commandHistory.svelte.ts` with `$state` array + `record(cmd)` / `recent()`.
Wire to `CommandPalette.svelte` recent-commands section.

#### 3.3 `authFlowService` → `AuthDialog`

`src/shared/services/authFlowService.ts` exists (IIIF Auth Flow 2.0).
`AuthDialog.svelte` has five `// @migration stub` comments marking the real flows.
Wire: `handleExternalLogin`, `handleTokenService`, `handleActiveLogin` → actual `authFlowService` calls.
Token storage: `storage.saveAuthToken(id, token)` → add to `StorageService` if missing.

#### 3.4 `validateTree()` → `App.svelte` validation loop

`// @migration: Wire validateTree(state) when validator is available` remains in `App.svelte`.
Wire `validator.validateTree(vault.state)` in the auto-validation `$effect`.
Post result to `validationStore`; `QCDashboard` + `FilterPanel` already read from store.
After Phase 2 (validation worker), swap synchronous call for worker dispatch.

#### 3.5 `changeDiscoveryService` + `activityStream`

Both exist in `src/shared/services/` but have no call sites.
Wire `changeDiscoveryService.startPolling(manifestId)` when a remote manifest is loaded.
Wire `activityStream.record(event)` on vault dispatch (for provenance).

#### 3.6 `searchService` vault traversal → `SearchView`

`SearchView.svelte:21` marks: `buildIndexEntries` depends on vault traversal.
Call `searchService.buildIndexEntries(vault.state)` on vault change (debounced).
After Phase 2, move index build to search worker.

#### 3.7 `tilePipeline` → service worker coordination

`src/shared/services/tilePipeline.ts` exists; relationship to `public/sw.js` is unclear.
Verify tile pipeline is correctly invoked by SW or called from `storage.saveAsset`.
Document the call path in a `// WHY:` comment; delete the file if it is dead code.

---

## Phase 4 — UI Component Wiring

_Replace all `// @migration` placeholder comments with real component imports._
_Prerequisite: Phase 1 (types), Phase 2 (workers), Phase 3 (service wiring) complete._

### Exit criteria

- [ ] `grep -rc "@migration" src/` → 0
- [ ] `tsc --noEmit` 0 errors
- [ ] `svelte-check` 0 errors
- [ ] `vitest` all passing
- [ ] Viewer: image deep-zoom, audio, video, annotation drawing, workbench, filmstrip — all functional

### Domain breakdown

#### 4.1 Viewer (`ViewerView.svelte` — 13 stubs)

| Stub | Real component | File |
|------|---------------|------|
| ViewerToolbar | `viewer/ui/molecules/ViewerToolbar.svelte` | exists |
| ViewerContent | `viewer/ui/molecules/ViewerContent.svelte` | exists |
| FilmstripNavigator | `viewer/ui/molecules/FilmstripNavigator.svelte` | exists |
| ImageFilterPanel | `viewer/ui/molecules/ImageFilterPanel.svelte` | exists |
| MeasurementOverlay | `viewer/ui/molecules/MeasurementOverlay.svelte` | exists |
| ComparisonViewer | `viewer/ui/molecules/ComparisonViewer.svelte` | exists |
| AnnotationDrawingOverlay | `viewer/ui/molecules/AnnotationDrawingOverlay.svelte` | exists |
| AnnotationLayerPanel | `viewer/ui/molecules/AnnotationLayerPanel.svelte` | exists |
| ViewerWorkbench | `viewer/ui/molecules/ViewerWorkbench.svelte` | exists |
| ViewerPanels | `viewer/ui/molecules/ViewerPanels.svelte` | exists |
| KeyboardShortcutsModal | `viewer/ui/molecules/KeyboardShortcutsModal.svelte` | exists |
| AudioWaveform | `viewer/ui/molecules/AudioWaveform.svelte` | exists |
| storage.saveProject | `shared/services/storage.ts` | exists |

Also wire `contentStateService.updateUrl` in `ViewerView` (marked `// @migration: contentStateService not yet wired`).

#### 4.2 Sidebar — StructureTree (`Sidebar.svelte` — 4 stubs)

| Stub | Target |
|------|--------|
| `StructureTreeView` (non-virtual DOM tree) | `features/structure-view/ui/organisms/StructureTreeView.svelte` |
| `TreeSearchBar` placeholder | `features/structure-view/ui/atoms/TreeSearchBar.svelte` |
| `VirtualTreeList` | `features/structure-view/ui/molecules/VirtualTreeList.svelte` |
| `resizablePanel` | Svelte 5 runes store (no hook equivalent) |

#### 4.3 Board design (`BoardView.svelte` — 8 stubs)

| Stub | Action |
|------|--------|
| `resolveHierarchicalThumb` | Implement in `board-design/model/index.ts`; call through service worker |
| Board thumbnail from IIIF SW | Wire through `tilePipeline` (Phase 3.7) |
| z-index management | Implement `reorderItems(id, direction)` in board model |
| `ConnectionLine` integration | Already exists as atom; import in `ConnectionLayer.svelte` |
| `ConnectionEditPanel` integration | Already exists; wire via board store |
| `PresentationOverlay` integration | Already exists; conditional render |
| `AlignmentGuideLine` integration | Already exists; conditional render during drag |
| Board export | `html2canvas` → PNG; SVG serialiser; IIIF Content State → clipboard |

#### 4.4 Validation / QC

| Stub | Action |
|------|--------|
| `validateTree()` in App.svelte | Done in Phase 3.4; Phase 4 connects QCDashboard read |
| `validationHealer` in QCDashboard | Wire `validationHealer.safeHealAll(item)` on heal-button click |

#### 4.5 Annotation widget

| Stub | Action |
|------|--------|
| `AnnotationToolPanel` | Wire `features/viewer/ui/organisms/AnnotationToolPanel.svelte` into `AnnotationToolbar.svelte` |
| `MetadataEditorPanel` | Wire `features/metadata-edit/ui/organisms/MetadataEditorPanel.svelte` into `AnnotationToolbar.svelte` |

#### 4.6 Archive

| Stub | Action |
|------|--------|
| `GroupedArchiveGrid` placeholder | Import `archive/ui/molecules/GroupedArchiveGrid.svelte` |
| `StackedThumbnail` placeholder | Import `shared/ui/molecules/StackedThumbnail.svelte` |
| Create-manifest-from-canvases | Wire `vault.dispatch(actions.addManifest(...))` on multi-select confirm |

#### 4.7 Search / Map / Timeline

| File | Stub | Action |
|------|------|--------|
| `SearchView.svelte` | `usePipeline().searchToArchive(id)` | Call `appMode.setMode('archive')` + `vault.setSelected(id)` |
| `MapView.svelte` | canvas thumbnail URL | Resolve via `imageSourceResolver.resolveThumb(canvas)` |
| `TimelineView.svelte` | canvas thumbnail URL | Same as Map |

#### 4.8 App-level

| Stub | Action |
|------|--------|
| Rename-pattern support (`getIIIFValue`) | Wire `getIIIFValue` from `src/shared/lib/iiif-value.ts`; used in `App.svelte:549` |

---

## Phase 5 — Deployment Targets

_Build storage adapters and sync layer for Docker and Tauri._
_Prerequisite: Phase 4 complete (web app at full React parity)._

### Exit criteria

- [ ] `npm run build:docker` succeeds
- [ ] `npm run build:tauri` succeeds (Tauri CLI available)
- [ ] E2E import → view → export works on all three targets
- [ ] `tsc --noEmit` 0 errors on all build variants

### Sub-phases

#### 5.1 Storage abstraction

Extract `StorageAdapter` interface from `storage.ts`.
Implement `WebStorageAdapter` (current IDB logic), `DockerStorageAdapter` (HTTP REST), `TauriStorageAdapter` (native FS via `invoke`).
Factory: `createStorageAdapter()` reads `VITE_DEPLOYMENT_TARGET`.
Tests: each adapter tested in isolation with mocked transport.

Reference: `docs/deployment/feature-parity-maintenance.md § UnifiedStorage Adapter`

#### 5.2 IIIF tile serving — Docker

Express route: `GET /tiles/:assetId/:z/:x/:y.jpg` using `sharp` for on-demand generation.
Cache tiles on disk; serve from cache on repeat requests.
Update `public/sw.js` to detect Docker target and skip SW interception for tile routes.

#### 5.3 File import — Tauri

`TauriImportManager` wraps `@tauri-apps/plugin-dialog` `open()`.
Converts native paths to `FileInfo` via Rust `get_file_info` command.
Shares `ImportOptions` interface with `WebImportManager`.

#### 5.4 P2P sync — Web + Tauri

`WebRTCSync` wraps `y-webrtc` `WebrtcProvider`.
`SyncProvider` interface: `connect() / disconnect() / getDocument() / getUsers()`.
Vault mutations write to `Y.Doc`; remote changes merge into vault via `Y.Doc` observer.

#### 5.5 Server sync — Docker

`WebSocketSync` wraps `y-websocket` `WebsocketProvider` pointed at self-hosted server.
Shares `SyncProvider` interface with `WebRTCSync`.

#### 5.6 Build + CI

Add `build:docker`, `build:tauri`, `dev:docker` scripts.
GitHub Actions matrix: web (GH Pages), Docker image push, Tauri Windows MSI + Linux Flatpak.
Reference: `docs/deployment/feature-parity-maintenance.md § CI/CD Pipeline`

---

## Tracking

| Item | Reason |
|------|--------|
| `annotorious.ts` 14× `any` | No `@types/annotorious` |
| `waveform.ts` 9× `any` | No `@types/wavesurfer.js` |
| `svelte-shims.d.ts` 2× `any` | Framework shim |

### `TODO(loop)` survivors (3+ rounds)



#### Summary by category

| Category | Count |
|----------|-------|
| DEAD END | 18 |
| SILENT FAIL | 14 |
| NO FEEDBACK | 13 |
| ASSUMPTION | 11 |
| RACE | 8 |
| NAV TRAP | 5 |
| HIDDEN REQ | 6 |
| **Total** | **75** |

---

## Deployment

Currently web-only (static build, GitHub Pages). Future targets (see [ROADMAP.md](./ROADMAP.md)):
- Docker (server-side tile serving, WebSocket sync)
- Tauri (native desktop, filesystem access)

All three targets will share a `StorageAdapter` interface. Web uses IDB/OPFS, Docker uses HTTP REST, Tauri uses native filesystem via Rust invoke.
