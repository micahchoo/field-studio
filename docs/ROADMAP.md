# Field Studio — Roadmap

_Evaluated against [Vision.md](./Vision.md). Focus: interpolative fidelity, cross-view integration, and structural refactors to close the gap between current state and the unified research workbench._

_Updated: 2026-02-24_

---

## Current State Summary

The Svelte 5 migration is complete. All 7 views render, vault actions dispatch, undo/redo works, Content State syncs to URL, annotations persist, export covers JSON/BagIt/static HTML. Tests pass (4978), lint is clean.

**What's missing is the connective tissue.** Views are functional silos. The vision describes a system where selections, annotations, and states are preserved and shared, and views are reproducible. That requires three layers of work:

1. **Interpolative** — Each view must be a proper lens on the vault, not a standalone UI
2. **Integrative** — Views must share selection, filters, and context through a global fabric
3. **Structural** — Some subsystems need refactoring before integration work can land

---

## Inventory

_What exists, what needs work, what's missing. Each module is classified:_

| Tag | Meaning |
|-----|---------|
| **Reuse** | Works as-is for the roadmap target |
| **Refactor** | Exists but needs structural changes to meet the roadmap |
| **New** | Does not exist; must be built from scratch |
| **Mulch** | Decompose existing code — salvage parts, discard structure |

### Structure Scaffold (Stores, Services, Types)

| Module | Path | Status | Tag | Notes |
|--------|------|--------|-----|-------|
| Vault store | `shared/stores/vault.svelte.ts` | Complete — `$state.raw`, dispatch, undo/redo | **Reuse** | Production-quality; 37 action types |
| App mode | `shared/stores/appMode.svelte.ts` (96 lines) | 11-mode union, `setMode()`, `previousMode` | **Refactor** | Becomes thin wrapper over ViewRegistry |
| Selection store | `shared/stores/selection.svelte.ts` (91 lines) | Flat `Set<string>`, no view scoping, no type discrimination | **Mulch** | Salvage API shape; replace with two-layer model (§0.2) |
| Search store (shared) | `shared/stores/search.svelte.ts` (354 lines) | Substring-only local search + IIIF Search API 2.0 remote client; index rebuilt only on SearchView mount | **Refactor** | Wire to vault mutations for reactivity (§0.4); add incremental index |
| Search store (feature) | `features/search/stores/search.svelte.ts` (456 lines) | Better token-based scoring but **orphaned** — NOT used by SearchView | **Mulch** | Extract scoring algorithm; delete store |
| Pipeline store | `shared/stores/pipeline.svelte.ts` (118 lines) | Cross-view navigation intent (origin, intent, selectedIds, breadcrumbs); sessionStorage-persisted | **Mulch** | Intent concept absorbed into ViewRegistry snapshots; salvage breadcrumb pattern |
| Content State service | `shared/services/contentState.ts` (374 lines) | Complete IIIF Content State 1.0: encode/decode/create/parse/generateLink/updateUrl/parseFromUrl/handleDrop | **Reuse** | URL sync is one-way (selection→URL); `parseFromUrl` never called on load — wire it |
| NavPlace service | `shared/services/navPlaceService.ts` (268 lines) | Full GeoJSON support, Haversine distance, Nominatim geocoding | **Reuse** | MapView does NOT use it — must be wired (§1.2) |
| Storage service | `shared/services/storage.ts` | IDB persistence via idb-keyval; JSON parse guard | **Refactor** | Extend to three-tier (memory/IDB/OPFS) per §A6 |
| Vault types | `shared/types/` | IIIFItem, NormalizedState, ManifestNormalized, CanvasNormalized, AnnotationNormalized, etc. | **Reuse** | 25 permanent `any` suppressed (TYPE_DEBT); stable |
| Vault normalization | `entities/manifest/model/vault/` | Decomposed: types, normalization, queries, updates, trash, movement | **Reuse** | |
| Vault actions | `entities/manifest/model/actions/` | 37 action types covering CRUD + reorder + Range + AnnotationPage | **Reuse** | Missing: `CREATE_SEQUENCE_RANGE` convenience action (§B3) |
| Validation | `entities/manifest/model/validation/validator` | Multi-rule validator | **Reuse** | `ValidationIssue` has 3 incompatible shapes (TYPE_DEBT) |
| ViewStateProvider | — | Does not exist | **New** | §0.1 — interface + ViewRegistry singleton |
| SelectionResolver | — | Does not exist | **New** | §0.2 — resolves spatial/temporal/query → entity IDs |
| Vocabulary service | — | Zero implementation; only spec at `docs/feature planning/vocabulary.md` | **New** | §1.6 — `shared/services/vocabulary/` |
| EDTF parser | — | Does not exist | **New** | §1.1 — Level 1 parser shared by Timeline + Metadata |
| Query parser | — | Does not exist | **New** | §1.4 — field-scoped syntax for Search |

### Logic Modules (Feature Internals)

| Module | Path | Status | Tag | Notes |
|--------|------|--------|-----|-------|
| Board IIIF bridge | `features/board-design/model/iiif-bridge.ts` (474 lines) | Complete bidirectional: `boardStateToManifest()` / `manifestToBoardState()` with ConnectionMetadata/GroupMetadata/BoardViewport service blocks | **Refactor** | Round-trip works but vault persistence path is a `console.warn` stub in ViewRouter `handleBoardSave` (line 439) |
| Board exporters | `features/board-design/model/exporters.ts` (239 lines) | All 4 formats implemented (PNG Canvas2D, SVG, JSON-LD, Content State URL) | **Reuse** | |
| Board vault store | `features/board-design/stores/boardVault.svelte.ts` (548 lines) | Complete standalone state with own undo/redo (50-entry) | **Refactor** | Different type model from `model/index.ts` — two incompatible BoardItem types; reconcile into one |
| Board model types | `features/board-design/model/index.ts` | BoardItem, Connection, Group types | **Mulch** | Conflicts with boardVault types; unify — keep boardVault's as canonical |
| Timeline store | `features/timeline/stores/timeline.svelte.ts` (324 lines) | ISO 8601 only via native Date; no EDTF, no brush selection, no period bands | **Refactor** | Add EDTF parser, brush writes to Selection Bus, period band config |
| Map store | `features/map/stores/map.svelte.ts` (459 lines) | Custom coordinate parsing from metadata strings; simple equirectangular projection; does NOT use navPlace or Leaflet | **Mulch** | Replace internals with Leaflet; salvage clustering logic and store shape |
| GeoEditor | `features/metadata-edit/ui/molecules/GeoEditor.svelte` (227 lines) | Real Leaflet integration for navPlace editing | **Reuse** | Only in metadata Inspector — not exposed in MapView; extract Leaflet init pattern for MapView |
| Annotorious integration | `features/viewer/ui/molecules/AnnotationCanvas.svelte` (149 lines) | Real dynamic import of `@annotorious/openseadragon`; working | **Refactor** | Wire drawing events → vault ADD_ANNOTATION; add mode switching (§B2) |
| Annotorious action (stub) | `features/viewer/actions/annotorious.ts` | Stub — NOT the active integration path | **Mulch** | Delete or replace with real action wiring from AnnotationCanvas |
| Waveform action | `features/viewer/actions/waveform.ts` | WaveSurfer integration with fallback warning | **Reuse** | |
| Viewer helpers | `features/viewer/ui/organisms/viewerViewHelpers.ts` | OSD + image filter + comparison mode utilities | **Reuse** | |
| Metadata batch edit | `features/metadata-edit/` | Spreadsheet editor, inline editing, CSV export, basic CSV import | **Refactor** | CSV import needs quoted field handling + column mapping UI |
| Ingest pipeline | `features/ingest/` | Manifest loading, file drop, URL import | **Reuse** | |
| Export pipeline | `features/export/` | JSON/BagIt/static HTML export | **Reuse** | |
| Search indexing | `shared/stores/search.svelte.ts` → `buildIndexEntries` | Supports annotation bodies in API but `collectIndexEntries` never passes them | **Refactor** | Wire annotation bodies into index; add incremental update methods |

### UI Surfaces

| Surface | Path | Status | Tag | Notes |
|---------|------|--------|-----|-------|
| ViewRouter | `app/ui/ViewRouter.svelte` (802 lines) | Mode-based view switch; threads `selectedId` + callbacks as props | **Refactor** | Replace prop threading with ViewRegistry reads; `handleBoardSave` is stub |
| ArchiveView | `features/archive/` | Full grid + filmstrip + reorder; local filter/sort/multi-select | **Refactor** | Hoist selection into Selection Bus; extract filters into shared types |
| ViewerView | `features/viewer/` | OSD, annotations, image filters, comparison mode | **Refactor** | Finalize Annotorious wiring; add mode switching + layer opacity |
| BoardView | `features/board-design/` | Custom 2D canvas, drag, snap, connections, export | **Refactor** | Wire vault persistence; reconcile type models; add drop targets |
| SearchView | `features/search/` | Full-text + basic facets | **Refactor** | Add query parser; wire facets to vault metadata; result actions |
| MapView | `features/map/` | Custom CSS positioning, basic clustering, lasso stub | **Mulch** | Replace with Leaflet; salvage UI shell and store shape |
| TimelineView | `features/timeline/` | Basic date grouping by navDate | **Refactor** | Add EDTF rendering, brush selection, period bands |
| MetadataView | `features/metadata-edit/` | Spreadsheet + Inspector sections | **Refactor** | Add vocabulary-driven forms, EDTF input, CSV import hardening |
| NavigationSidebar | `widgets/NavigationSidebar/` | NAV_ITEMS for 7 views, keyboard shortcuts | **Reuse** | |
| Inspector | `widgets/Inspector/` | Annotation detail, metadata sections | **Reuse** | |
| CommandPalette | `widgets/CommandPalette/` | Cmd+K global search | **Reuse** | |
| StatusBar | `widgets/StatusBar/` | Bottom bar with status info | **Reuse** | |
| QCDashboard | `widgets/QCDashboard/` | Quality control overview | **Reuse** | `ValidationIssue` shape mismatch (TYPE_DEBT) |
| Settings dialog | `widgets/Settings/` | User preferences | **Reuse** | |

### UX Patterns & Cross-Cutting

| Pattern | Current State | Tag | Notes |
|---------|--------------|-----|-------|
| Cross-view selection | Does not exist — each view manages its own selection locally | **New** | §0.2 |
| Cross-view filter propagation | Filter infrastructure entirely local to ArchiveView; no shared filter types | **New** | §2.1 |
| Content State URL sync | One-way only (selection→URL hash, debounced 500ms); `parseFromUrl` exists but never called on page load | **Refactor** | Wire bidirectional on load |
| Annotation → Search indexing | `buildIndexEntries` supports it; `collectIndexEntries` never passes annotation bodies | **Refactor** | §0.4 — close the gap |
| Workspace snapshots | Does not exist | **New** | §2.2 — IDB-backed save/restore |
| Named Selections | Does not exist (IIIF Ranges exist in vault but no "save selection" UX) | **New** | §B1 |
| Drag-drop cross-view | `shared/lib/actions/dragDrop.ts` exists for intra-view | **Refactor** | Extend for Board drop targets accepting Content State references |
| Keyboard shortcuts | Global handler in App.svelte (Cmd+K, Cmd+Z, Cmd+E, Cmd+,, 1-7 view switch) | **Reuse** | Add Alt+←/→ navigation stack (§A5) |
| Layout primitives | `shared/ui/layout/` — 10 primitives (Stack, Row, Scroll, Fill, Shelf, Center, Split, PaneLayout, etc.) + 6 composites | **Reuse** | |
| Atoms | `shared/ui/atoms/` — 14 components (Button, Icon, Badge, Tooltip, etc.) | **Reuse** | |
| Molecules | `shared/ui/molecules/` — 25+ components | **Reuse** | |
| Theme system | `shared/config/themes/` + `shared/lib/theme-bus.ts` — multi-theme via CSS custom properties | **Reuse** | |
| Hooks | `shared/lib/hooks/` — 14+ hooks (useTheme, useKeyboard, useResize, etc.) | **Reuse** | |
| Services | `shared/services/` — 19 services (storage, contentState, navPlace, imageSource, etc.) | **Reuse** | Most stable layer |

### Inventory Summary

| Tag | Count | Implication |
|-----|-------|-------------|
| **Reuse** | 27 | Stable foundation — services, types, layout, widgets, exporters |
| **Refactor** | 17 | Existing code needs targeted structural changes — stores, views, wiring |
| **New** | 7 | Missing subsystems — ViewRegistry, SelectionResolver, vocabulary, EDTF, query parser, workspace snapshots, named selections |
| **Mulch** | 6 | Decompose — selection store, orphaned search store, pipeline store, map internals, board model types, annotorious stub |

**Key finding:** The _vertical_ slice of each view is largely built. The _horizontal_ connective tissue (cross-view state, selection propagation, filter composition, annotation pipeline) is almost entirely absent. Phase 0 creates the horizontal infrastructure; Phase 1 rewires views to use it; Phase 2 activates the cross-view flows.

---

## Phase 0: Structural Prerequisites

_Refactors that unblock integration. No new features — just moving load-bearing walls._

### 0.1 ViewBus — Global Reactive View State Registry

**Gap:** ViewRouter threads a single `selectedId` prop. Each view manages its own local state (filters, zoom, sort). Switching views loses context. Vision requires: "You can jump between views without losing context."

**Decision (per [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) §A1):** Per-view stores implementing a shared `ViewStateProvider` protocol, managed by a central `ViewRegistry` singleton. Not a monolithic store — each view owns its state shape. The protocol surface is small: `selection`, `filters`, `getSnapshot()`, `restoreSnapshot()`.

```
ViewRegistry (singleton, app scope)
  ├── archiveState: ArchiveViewState implements ViewStateProvider
  ├── mapState:     MapViewState     implements ViewStateProvider
  ├── timelineState: TimelineViewState implements ViewStateProvider
  ├── searchState:  SearchViewState  implements ViewStateProvider
  ├── viewerState:  ViewerViewState  implements ViewStateProvider
  └── boardState:   BoardViewState   implements ViewStateProvider
```

**Refactor scope:**
- New: `src/shared/stores/viewRegistry.svelte.ts` (typed registry, holds provider instances)
- New: `src/shared/types/viewProtocol.ts` (`ViewStateProvider` interface)
- Per-view: Extract local state into a `*ViewState` class implementing the protocol
- ViewRouter: Stop prop-threading `selectedId` as the sole selection model. Registry owns state.
- Each view: On mount, read from registry. On state change, write to registry. No local reinit.

**Depends on:** Nothing. First move.

### 0.2 Selection Bus — Multi-Select Across Views

**Gap:** Archive has local multi-select (shift+click, lasso). No other view receives or emits selections. Vision requires: "Archive selected in Timeline → Map highlights those items."

**Decision (per [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) §A2):** Two-layer selection model.

**Layer 1 — Raw Selection (typed, preserves provenance):**
Each view writes its selection in its native form — Archive writes entity IDs, Map writes a GeoJSON polygon, Timeline writes a date range. One active raw selection per source (crossfilter model).

**Layer 2 — Resolved Selection (`Set<string>`):**
A central resolver (runs as `$effect`) takes all raw selections, resolves each against the vault, and computes the AND intersection. Downstream consumers read `resolvedIds` without knowing provenance.

**Refactor scope:**
- New: `src/shared/stores/selection.svelte.ts` (SelectionStore with raw + resolved layers)
- New: `src/shared/services/selectionResolver.ts` (resolves spatial/temporal/query → entity IDs)
- Hoist Archive's `selectedIds` into SelectionStore as raw `{ type: 'entities', ids }`
- Map lasso: write `{ type: 'spatial', geometry }` → resolver intersects with geolocated items
- Timeline brush: write `{ type: 'temporal', range }` → resolver intersects with dated items
- ViewRouter: `selectedId` becomes `$derived` from `selectionStore.resolvedIds` (first element or null)

**Depends on:** 0.1

### 0.3 Board Vault Persistence

**Gap:** Board state lives in `BoardVaultStore` (in-memory). Refresh loses boards. Vision requires: boards are first-class vault structures where "links become AnnotationCollections" and "narrative paths become IIIF Ranges."

**Decision (per [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) §A3):** Two-tier storage.

**Tier 1 — IIIF (portable, exports to other viewers):**
- Narrative paths → Range with `behavior: ["sequence"]`
- Connections → Annotation with `motivation: "linking"`, two targets
- Connection labels → Annotation `body` with `TextualBody`

**Tier 2 — Workspace State (Field Studio-specific, persisted to IDB):**
- Board item positions (x, y), connection geometry, link styles, viewport

On export: Tier 1 produces valid IIIF. Tier 2 produces a workspace file. On import: both tiers restore the full board.

**Refactor scope:**
- `iiif-bridge.ts`: Implement bidirectional Tier 1 mapping (currently partial)
- New: `boardWorkspaceStore` in IDB for Tier 2 (positions, styles)
- `BoardView.svelte`: On state change, dispatch vault actions for Tier 1, write IDB for Tier 2
- ViewRouter `handleBoardSave`: Replace stub with diff-and-dispatch reconciliation
- Canvas reordering: Use Range with `behavior: ["sequence"]` instead of mutating `items` (per §B3)

**Depends on:** Nothing (parallel with 0.1)

### 0.4 Search Index Reactivity

**Gap:** Search index builds once at startup. New canvases/annotations don't appear without manual re-index. Vision requires: "Every search hit can feed Archive selection or Board drop."

**Decision:** Wire vault dispatch → incremental search index update.

**Refactor scope:**
- `searchService.ts`: Add `addEntry()` / `removeEntry()` / `updateEntry()` methods
- App.svelte or a new `searchIndexBridge`: Subscribe to vault mutations, call incremental updates
- Annotation additions → immediately searchable

**Depends on:** Nothing (parallel with 0.1)

---

## Phase 1: Interpolative Fidelity

_Each view becomes a proper projection of the vault, not just a renderer._

### 1.1 Timeline — Temporal Projection

**Current:** Basic date grouping by navDate. ISO 8601 only. No brush selection wired. No period bands.

**Vision target:** "EDTF-aware rendering with uncertain shapes. Multi-date focus. Period bands. Temporal clusters."

**Decisions:**
- **EDTF parsing**: Adopt or implement EDTF Level 1 (intervals, uncertain `~`, approximate `%`, unspecified `X`). Render uncertain dates as widened bands, not points.
- **Brush selection**: Timeline brush writes temporal filter to ViewBus. Other views read it to narrow results.
- **Period bands**: Static config (JSON) of named periods. Overlay as horizontal bands behind item markers.
- **Rendering**: Evaluate whether current custom rendering scales or needs a library (d3-scale for time axis). Decision point: if >500 items cause jank, bring in d3-scale.

**Scope:** `timeline.svelte.ts` store rewrite + `TimelineView.svelte` rendering + EDTF parser utility.

### 1.2 Map — Spatial Projection

**Current:** Custom CSS positioning on a blank grid. No basemap tiles. Basic grid clustering. Lasso select exists but isn't wired. **Critical gap: `MapStore.loadFromManifest()` ignores the `navPlace` GeoJSON field entirely — it only parses coordinate strings from metadata labels.** `navPlaceService.ts` exists with full GeoJSON support but is unused by the Map view. No `UPDATE_NAV_PLACE` vault action.

**Vision target:** "Multiple layers (OSM, satellite, historical). Fuzzy navPlace halos. Lasso selection → collections. Trajectory animation."

**Decisions:**
- **Map library**: Integrate Leaflet (lightweight, tile-agnostic, well-suited for overlays). Pure CSS positioning is a dead end for real geographic work.
- **Tile sources**: OSM as default. Layer switcher for satellite/historical (configurable tile URLs).
- **navPlace pipeline** (Decision D20): `MapStore.loadFromManifest()` must check `canvas.navPlace` first, fall back to metadata string parsing if absent. Add `UPDATE_NAV_PLACE` action to vault. Wire `navPlaceService.ts` (which already handles GeoJSON Feature/FeatureCollection, centroid computation, bounds extraction, Haversine distance, and coordinate formatting) into the map data path.
- **Fuzzy halos**: NavPlace with low precision metadata renders as a translucent circle scaled to uncertainty radius, not a pin.
- **Lasso → Selection Bus**: Lasso polygon selects items within bounds, writes to `ViewBus.selection`.
- **Trajectory**: Deferred to Phase 2 (needs temporal + spatial data linked).

**Refactor scope:**
- `MapStore.loadFromManifest()`: Rewrite to consume `navPlace` GeoJSON via `navPlaceService.getCenter()` / `navPlaceService.getBounds()`. Fall back to metadata string parsing for manifests without navPlace.
- New action: `UPDATE_NAV_PLACE` in vault action types (parallel to existing `UPDATE_NAV_DATE`).
- `metadata-edit/lib/navPlaceService.ts`: Replace stub with import from shared `navPlaceService.ts`.
- Replace MapView internals with Leaflet. Keep `map.svelte.ts` store for state. Wire lasso to ViewBus.

### 1.3 Board — Argumentative Projection

**Current:** Custom 2D canvas with drag, snap, connections. PNG/SVG export stubbed. Not persisted.

**Vision target:** "Infinite canvas with semantic connections. Labels + styles on links. Narrative paths as structural sequences. Spatial density communicates weight."

**Decisions (beyond 0.3 persistence):**
- **Connection metadata**: Connections carry a `label`, `motivation` (from controlled vocabulary), and optional `style` (color, weight). Store as annotation body properties.
- **Narrative path UI**: Ordered sequence of board items. User creates a "path" that becomes a `Range`. Playback mode steps through the path.
- **Drop from other views**: Implement drag targets that accept items from Archive selection, Viewer annotation fragments (Content State snippets), Search results.
- **Export**: PNG via html2canvas, SVG via DOM serialization. Content State export for narrative state.

**Scope:** Connection metadata model + narrative path UI + drop integration + export implementations.

### 1.4 Search — Indexed Projection

**Current:** FlexSearch full-text. Basic entity type facets. Limited field scoping.

**Vision target:** "Syntax queries: `date:1987`, `person:'Smith'`. Facets drive real filter contexts. Local semantic embeddings."

**Decisions:**
- **Query parser**: Implement field-scoped syntax (`field:value`, `field:"phrase"`, boolean AND/OR). Parser outputs a structured query object, not just a string passed to FlexSearch.
- **Facets**: Extract facet dimensions from metadata fields (creator, date range, type, rights). Facet counts update as filters narrow.
- **Semantic search**: Deferred. Requires embedding model decision (local ONNX vs API). Mark as Phase 3.
- **Result actions**: Each search result has "Add to selection", "Open in Viewer", "Drop on Board" actions.

**Scope:** Query parser + facet extraction from vault + result action handlers wired to ViewBus.

### 1.5 Viewer — Forensic Projection

**Current:** OSD works. Annotorious action is stubbed. WaveSurfer warns if unavailable. Image filters work. Comparison mode works.

**Vision target:** "Annotation with minimal friction. Annotation layers with opacity. Deep zoom with tiling pipeline."

**Decisions (per [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) §B2):**
- **Annotorious**: Finalize integration. Initialize Annotorious on OSD mount, wire drawing events → vault `ADD_ANNOTATION`. Use headless mode (Field Studio provides its own annotation form UI). If library proves problematic, evaluate custom SVG overlay as fallback.
- **Annotation interaction**: Explicit mode switch (not "no add mode" — gesture conflict with pan is irresolvable). One-shot default: after creating one annotation, auto-return to pan/zoom. Shift+drag accelerator for quick rectangle annotation without entering annotation mode. "Keep tool" toggle for batch work.
- **Annotation layer opacity**: Already implemented — per-layer opacity slider (0–100%) with visibility toggles in `AnnotationLayerStore` / `AnnotationLayerPanel.svelte`. Verify integration with Annotorious overlay rendering.
- **Tiling pipeline**: Service worker already handles tile URLs. Verify end-to-end with real image sets.

**Scope:** Annotorious init + gesture grammar implementation + layer opacity.

### 1.6 Metadata — Semantic Projection

**Current:** Spreadsheet editor with inline editing. Inspector with section groups. CSV export works. CSV import basic.

**Vision target:** "Vocabulary-driven dynamic forms. Fuzzy dates. Relationship graphs. Batch edit."

**Decisions (per [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) §C1):**
- **Vocabulary system**: Two complementary mechanisms:
  1. **Field constraints** (`VocabularyField` with `controlledValues`) for structured metadata fields — per existing `docs/feature planning/vocabulary.md` design. Implement as decoupled service (`src/shared/services/vocabulary/`).
  2. **Progressive tag formalization** for free-form annotations: free tags (auto-complete from existing) → merge/rename consolidation → optional mapping to controlled vocabulary terms with SKOS match types. Tags stored as W3C annotations with `motivation: "tagging"`.
- **Fuzzy dates**: EDTF input widget. Shares parser with Timeline (Phase 1.1).
- **Relationship graph**: Deferred to Phase 3.3 (D19). Requires entity-to-entity linking via Annotations with `motivation: "linking"`.
- **Batch edit**: Already functional. Extend with vocabulary-driven field selection.
- **CSV import**: Implement quoted field handling, column mapping UI, validation preview.

**Scope:** Vocabulary service + tag service + EDTF date input + CSV import hardening.

---

## Phase 2: Cross-View Integration

_With ViewBus in place and views properly projecting, wire the cross-cutting flows._

### 2.1 Filter Propagation

**Mechanism:** ViewBus carries typed filter slices. Views both produce and consume filters.

| Producer | Filter | Consumers |
|----------|--------|-----------|
| Timeline brush | `{ dateFrom, dateTo }` | Archive, Map, Search, Board |
| Map lasso | `{ geoBounds }` | Archive, Timeline, Search |
| Search facets | `{ query, facets }` | Archive, Map, Timeline |
| Archive sort/filter | `{ textFilter, sortField }` | (local only — does not propagate) |

**Decision:** Filters are additive (AND). Each view decides how to apply received filters — Timeline may gray out items outside temporal range, Map may hide markers outside geo bounds. No view is forced to consume a filter it doesn't understand.

### 2.2 Content State + Workspace State

**Current:** Content State syncs to URL hash for viewer canvas/region. Not used for full view restoration or inter-view communication.

**Vision target:** "Every view can serialize its essential state."

**Decision (per [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) §A4):** Two formats, not one.

**Format 1 — IIIF Content State (interop, spec-compliant):**
Each view implements `toContentState()` producing a standard IIIF Content State (manifest + canvas + selectors). Used for: deep links, sharing with Mirador/UV, embed codes.

**Format 2 — Workspace State (full restoration):**
Each view implements `toWorkspaceSnapshot()` / `restoreWorkspaceSnapshot()` capturing: active view, filters, zoom, panel config, board layout, annotation layers. Used for: save/restore sessions, Named Selections, workspace switching (Cmd+Shift+1/2/3).

**Use cases:**
- Deep link into canvas region → Content State (IIIF-portable)
- "Send to Board" → Content State reference as board item source
- Save current investigation state → Workspace Snapshot (IDB)
- Share context with external IIIF tools → Content State only

**Scope:** Content State adapters per view (lightweight). Workspace Snapshot store (IDB persistence). Named Selections as IIIF Ranges.

### 2.3 Annotation as Knowledge Pipeline

**Current:** Annotations exist in vault. Indexed at build time. Flow to Inspector.

**Vision target:** "Annotations are indexed, searchable, semantic evidence. They feed Board structures, Search hits, Narrative tracks, Viewer layers."

**Decision:** Complete the annotation lifecycle:
1. **Create** (Viewer) → vault `ADD_ANNOTATION`
2. **Index** (immediate) → search index `addEntry()` (from 0.4)
3. **Surface** (Search) → annotation appears as search hit with "Open in Viewer" action
4. **Compose** (Board) → annotation fragment droppable as board item (carries Content State reference back to source canvas + region)
5. **Narrate** (Board) → annotation included in narrative Range sequence

**Scope:** Wiring across existing subsystems. Most code exists — needs connection points.

### 2.4 Vocabulary Integration

**Decision:** Vocabulary system (from 1.6) feeds into:
- Metadata forms (field definitions, controlled terms)
- Search facets (vocabulary terms become facet dimensions)
- Board connection labels (motivation vocabulary)
- Timeline period bands (vocabulary of named periods)

Vocabulary definitions are loaded at app init and available globally via `vocabularyService`.

---

## Cross-Cutting: Performance Testing Infrastructure

_Required to validate success criteria. No existing benchmarks, large fixtures, or measurement utilities._

**Current state:** Zero performance tests. Max test fixture is ~12 items. No `performance.mark()` / `performance.measure()` instrumentation. The stale `.roo/tools/performance-analyzer.sh` targets React and is not applicable.

**What's needed:**

1. **Large dataset generators**: Extend `vault/__tests__/fixtures.ts` with `createLargeDataset(count: number)` factory producing N canvases with metadata, annotations, and navPlace. Target: 10K and 20K item fixtures.

2. **Benchmark suite**: Use vitest bench mode with `src/**/*.bench.ts` files. Minimum benchmarks:
   - Archive: render time @ 1K / 5K / 10K canvases (target: <2s @ 10K)
   - Search: query latency @ 5K / 10K / 20K items (target: <100ms @ 20K)
   - Vault: `dispatch()` throughput for batch operations
   - Map: marker rendering @ 5K geolocated items

3. **Instrumentation**: Add `performance.mark()` / `performance.measure()` around:
   - `SearchStore.executeSearch()` (currently un-instrumented, 300ms debounce hardcoded)
   - `MapStore.loadFromManifest()` (no timing)
   - `vault.load()` / `vault.dispatch()` (timestamp exists for coalescing, not for measurement)

4. **npm script**: `test:perf` running benchmarks and reporting against targets.

**Timing:** Begin after Phase 0 (so benchmarks test the real architecture, not stubs). Run continuously through Phase 1+2 to catch regressions.

---

## Phase 3: Advanced Capabilities

_Features that require Phase 1+2 foundations._

### 3.1 Trajectory Animation (Map + Timeline)
Animate item movement through space over time. Requires temporal filter + spatial rendering coordinated via ViewBus.

### 3.2 Semantic Search (Local Embeddings)
Per [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) §C4: Transformers.js v4 + `all-MiniLM-L6-v2` INT8 (23 MB model, opt-in). WebGPU for ~78% of users (30s indexing for 10K items), WASM fallback for rest (~5 min via Web Worker). Dynamic import — zero bundle cost until activated. Requires indexing pipeline from 0.4 + Phase 2 search infrastructure.

### 3.3 Relationship Graphing (Metadata)

**Current state:** The vault has hierarchical relationships (`references`/`reverseRefs` for parent-child) and collection membership (`collectionMembers`/`memberOfCollections` for many-to-many). Board connections exist with 6 semantic types (`associated`, `partOf`, `similarTo`, `references`, `requires`, `sequence`) but are **not vault-backed** — they live in-memory in `BoardVaultStore` and are lost on refresh. IIIF linking properties (`seeAlso`, `homepage`, `rendering`) link to external URLs, not inter-entity relationships. No entity-to-entity semantic relationships exist in the vault.

**Decision (D19):** Leverage the existing W3C Annotation model rather than introducing a new entity type. Entity-to-entity relationships are stored as Annotations with `motivation: "linking"` and two `target` entries (source + destination entity IDs). Relationship type is carried in the annotation `body` as a `TextualBody` with a controlled vocabulary term. This reuses the existing annotation CRUD actions, search indexing pipeline, and IIIF export — no new vault entity type required. Board connections should be migrated to use this same model (unifying Board persistence from 0.3 with relationship storage).

**Scope:**
- New: `src/shared/services/relationships.ts` — query layer over linking annotations (get outgoing/incoming relationships for an entity, traverse paths)
- Metadata view: Relationship editor panel (searchable entity picker, type selector from vocabulary, add/edit/delete)
- Metadata view: Force-directed graph visualization (D3 or similar) as new tab — nodes = entities, edges = linking annotations
- Board integration: Surface vault relationships as suggested connections when items are placed on board
- Search: Linking annotations indexed and searchable by relationship type

**Depends on:** Phase 0.3 (board persistence), Phase 0.4 (search reactivity), Phase 1.6 (vocabulary for relationship type terms).

### 3.4 Multi-Manifest Comparison
Side-by-side or overlay comparison of canvases across manifests. Viewer comparison mode exists — extend to cross-manifest.

### 3.5 Collaborative Editing (P2P Sync)
See `docs/feature planning/P2P_SYNC_SCOPE.md`. Requires vault action log as CRDT-compatible operation stream.

---

## Decision Register

All decisions researched and resolved. Full rationale in [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md).

| # | Decision | Resolution | Basis | Phase |
|---|----------|------------|-------|-------|
| D1 | ViewBus architecture | Per-view stores with shared `ViewStateProvider` protocol + central registry | Vega-Lite signals, QGIS layer model | 0.1 |
| D2 | Selection model | Two-layer: typed raw selections + resolved `Set<string>` via central resolver | Vega-Lite, crossfilter, QGIS | 0.2 |
| D3 | Board → vault mapping | Two-tier: IIIF (Ranges, linking Annotations) for portable content + Workspace State (IDB) for layout/styles | Mirador workspace model, IIIF spec §6 | 0.3 |
| D4 | Map library | Leaflet — lightest, best overlay support, tile-agnostic | — | 1.2 |
| D5 | EDTF parser | Write minimal Level 1 parser — avoid dependency, simple grammar | — | 1.1 |
| D6 | Query parser for Search | Hand-written recursive descent — grammar is simple, no build step | — | 1.4 |
| D7 | Annotation interaction | Explicit mode switch + one-shot default + Shift+drag accelerator | Mirador, Annotorious, Acrobat | 1.5 |
| D8 | Vocabulary model | Three-layer progressive: free tags → consolidated → controlled mapping (SKOS) | OpenRefine, Zotero, W3C Web Annotation | 1.6 |
| D9 | Content State scope | Spec-compliant IIIF only; separate Workspace State format for full view restoration | IIIF Content State 1.0, Mirador/UV precedent | 2.2 |
| D10 | Filter composition | Central resolver with AND composition (crossfilter model); views produce typed predicates | Crossfilter, Vega-Lite intersect | 2.1 |
| D11 | Undo scope | Vault mutations only; view state/selection excluded; separate navigation stack (Alt+←/→) | Figma, Photoshop, VS Code, Google Docs | 0.1 |
| D12 | Original order | `items` = accession order; user reorder → Range with `behavior: ["sequence"]` | IIIF cookbook recipe 0027, archival theory | 0.3 |
| D13 | Storage lifecycle | Three-tier (memory / IDB / OPFS) with working set loading (Figma page model) | Figma, Notion, browser quota research | 0.1 |
| D14 | Local embeddings | Phase 2; Transformers.js + MiniLM INT8 (23 MB), opt-in, Web Worker | SemanticFinder, RxDB vector, Transformers.js v4 | 3.2 |
| D15 | Concurrent investigations | Named Selections (IIIF Ranges) + Workspace Snapshots (IDB) | Zotero, NVivo, Obsidian | 2.2 |
| D16 | Board density | User-authored convention, not computed | — | — |
| D17 | "Reproducible" | Views are reproducible via vault state + workspace snapshots (Phase 2.2). True temporal replay (action log scrubbing) deferred to P2P sync infrastructure (Phase 3.5) | Figma version history, CRDT literature | 2.2 / 3.5 |
| D18 | Two-tier data model | IIIF Content Layer (vault) + Workspace Layer (IDB), both durable, only IIIF is portable | IIIF spec, Mirador precedent | 0.3 |
| D19 | Relationship model | Linking Annotations (`motivation: "linking"`, two targets) — reuses existing annotation CRUD, indexing, and export | W3C Web Annotation, IIIF linking motivation | 3.3 |
| D20 | navPlace pipeline | MapStore consumes `navPlace` GeoJSON first, falls back to metadata string parsing; new `UPDATE_NAV_PLACE` action | IIIF navPlace spec, existing `navPlaceService.ts` | 1.2 |

---

## Sequencing

```
Phase 0 (structural)          Phase 1 (interpolative)       Phase 2 (integrative)
═══════════════════           ════════════════════════       ═════════════════════
0.1 ViewBus ──────────────┬── 1.1 Timeline EDTF ──────┬── 2.1 Filter propagation
0.2 Selection Bus ────────┤   1.2 Map + navPlace ─────┤   2.2 Content State views
0.3 Board persistence ────┤   1.3 Board semantics ────┤   2.3 Annotation pipeline
0.4 Search reactivity ────┘   1.4 Search parser ──────┤   2.4 Vocabulary integration
                              1.5 Viewer annotations ─┤
                              1.6 Metadata vocabulary ─┘
                                                       ├── Perf benchmarks (continuous)
                                                            Phase 3 (advanced) ...
```

Phase 0 items are parallel. Phase 1 items are parallel (each view is independent). Phase 2 requires both Phase 0 and Phase 1 foundations. Performance benchmarks begin after Phase 0 and run continuously.

---

## Success Criteria (from Vision)

| Measure | Target | How Measured | Blocking Phase |
|---------|--------|--------------|----------------|
| Selection preserved across view switches | 100% | Integration test: select in Archive → switch to Map → assert selection present | 0.1, 0.2 |
| Archive render <2s @ 10K items | Perf benchmark | `archive.bench.ts` with `createLargeDataset(10_000)` + `performance.measure()` | 1.1 virtualization |
| Search hit latency <100ms @ 20K items | Perf benchmark | `search.bench.ts` with `createLargeDataset(20_000)` + timing around `executeSearch()` | 0.4, 1.4 |
| Annotation search coverage 100% indexed | All annotation bodies | Unit test: create N annotations → assert N search index entries | 0.4, 2.3 |
| Timeline fuzzy date support (EDTF Level 1) | All forms | EDTF parser test suite: intervals, uncertain `~`, approximate `%`, unspecified `X` | 1.1 |
| View state reproducibility | Stable workspace snapshot encode/decode round-trip | Integration test: `getSnapshot()` → `restoreSnapshot()` → assert identical state | 2.2 |
| Export fidelity = internal state | IIIF Content State + Workspace State round-trip | Integration test: export → reimport → diff vault state | 2.2 |
| Board narratives persist as IIIF Ranges | Vault integration | Unit test: create narrative path → assert Range with `behavior: ["sequence"]` in vault | 0.3, 1.3 |
| Map renders navPlace items | All canvases with navPlace appear on map | Integration test: load manifest with navPlace → assert MapItem count matches | 1.2 |

---

## Blinker Principles — LLM-Driven Development

_Mandatory guardrails for any LLM agent implementing roadmap items. Derived from [CLAUDE.md](./CLAUDE.md). Every principle addresses a specific failure mode observed in LLM-driven development._

### 1. ORIENT Before You Touch Code

**Failure mode:** LLM reads one file, starts building, discovers mid-implementation that the subsystem was already refactored or that a dependency doesn't exist yet.

**Rule:** Before implementing any phase item, read — in order:
1. `STATE.md` (current metrics, known debt, completed phases)
2. This roadmap section for the item (decisions, scope, depends-on)
3. Every file listed in the "Refactor scope" of that item

If the item's `Depends on` field lists incomplete prerequisites, stop. Do not stub around missing foundations.

### 2. One Phase Item Per Session

**Failure mode:** LLM attempts multiple phase items in one pass, creates tangled commits, breaks bisectability.

**Rule:** Each session implements exactly one numbered item (e.g., "0.2 Selection Bus" or "1.4 Search parser"). The session ends when that item's scope is complete and STATE.md is updated. Cross-item wiring happens in integration items (Phase 2).

### 3. Type-First, Schema-First

**Failure mode:** LLM implements behavior then retrofits types, producing `any` leaks and structural mismatches.

**Rule:** For any new store, service, or protocol:
1. Write the TypeScript interface/type first
2. Write the test against that type
3. Implement

No `any` without `// TYPE_DEBT: <reason>`. If a phase item introduces a new type that touches the vault (e.g., `UPDATE_NAV_PLACE` action, `ViewStateProvider` protocol), define it in `src/shared/types/` before writing the implementation. Schema changes to `NormalizedState` require a typed, reversible, tested migration.

### 4. Stub Check — Tests Must Reject Trivial Implementations

**Failure mode:** LLM writes a test, writes a stub that returns a constant, test passes, LLM declares victory.

**Rule:** Every test must fail against a trivial stub. Verify by asking: "Would a function that returns `[]` / `null` / `true` / `new Set()` pass this test?" If yes, the test is too weak. Specific to this roadmap:
- ViewBus tests must verify state survives mount → unmount → remount (not just "store exists")
- Selection resolver tests must verify AND intersection (not just "returns a Set")
- Content State round-trip tests must verify all fields survive encode → decode (not just "produces a string")
- Search index tests must verify incremental updates (not just "index builds")

### 5. Adversarial Cases Are Mandatory

**Failure mode:** LLM tests the happy path, ships, users hit edge cases immediately.

**Rule:** Every test file includes at least one adversarial case. Phase-specific examples:

| Phase Item | Adversarial Case |
|------------|-----------------|
| 0.1 ViewBus | View mounts with stale snapshot from a different manifest |
| 0.2 Selection Bus | Temporal selection on items with no dates (resolver must not crash) |
| 0.3 Board persistence | Board with 0 connections, board with circular narrative path |
| 0.4 Search reactivity | Annotation deleted while search query is in-flight |
| 1.1 Timeline EDTF | `1987~/1993%`, empty string, `XXXX`, single-digit year |
| 1.2 Map + navPlace | Canvas with invalid GeoJSON (`coordinates: null`), navPlace with GeometryCollection |
| 1.4 Search parser | `date:`, `field:"unterminated`, `AND AND`, empty query |
| 1.5 Viewer annotations | Shift+drag while Annotorious is still loading (async import) |
| 2.2 Workspace State | Restore snapshot from a previous app version with missing fields |

### 6. Vault Is Sacred — Dispatch, Never Mutate

**Failure mode:** LLM directly mutates vault state for expediency, bypassing the action system, breaking undo and reactivity.

**Rule:** All vault state changes go through `vault.dispatch(action)`. No direct writes to `NormalizedState` fields. No `Object.assign` on vault entities. If a new mutation is needed (e.g., `UPDATE_NAV_PLACE`), add it to `src/entities/manifest/model/actions/types.ts` and implement the reducer. The HistoryStore and ActionHistory depend on this contract.

### 7. Lint as Prevention, Not Cleanup

**Failure mode:** LLM fixes a bug in one file, same category of bug exists in 30 other files.

**Rule:** When fixing a bug during any phase item, ask: "Can a project-wide ESLint rule prevent this category everywhere?" If yes, write the rule in `eslint-rules/` and add it to the config in the same session. Existing rules in `eslint-rules/` (18 custom rules) are the model. If a `TODO(loop)` persists for 3+ iterations, escalate — it's a structural problem, not a task.

### 8. SYNC Is Not Optional

**Failure mode:** LLM implements a phase item, doesn't update STATE.md or record learnings, next session has stale context and re-implements or contradicts.

**Rule:** Every session that modifies code must end with:
1. Overwrite STATE.md metrics (run `tsc --noEmit`, `svelte-check`, `npm test`, `npm run lint` — record exact numbers)
2. Update STATE.md "Last Session" section (what changed, what phase item was completed)
3. Run `mulch learn` — review changed files and decide what to record
4. `mulch record <domain> --type <type>` for any new convention, pattern, failure, or decision discovered during the session
5. Update ROADMAP.md only if a decision was revised or a new dependency discovered

STATE.md is the ephemeral metrics dashboard. Mulch is the durable knowledge store. Both must be updated.

### 9. Wire End-to-End Before Polishing

**Failure mode:** LLM builds a beautiful component that isn't connected to the data source, or wires a store that no component reads.

**Rule:** For any UI-touching phase item (1.x and 2.x), trace the full path before writing code:
```
data source → store → derived state → component prop → rendered output → user action → handler → store mutation → re-render
```
Write the integration test for this path first. Then implement. This prevents orphan stores and dead UI.

### 10. Shadow Before Shipping

**Failure mode:** LLM implements feature, declares done, user hits DEAD END / SILENT FAIL / NAV TRAP on first interaction.

**Rule:** After implementing any Phase 1 or Phase 2 item, walk the user-facing flow as a first-time user:
- What renders on mount? What can the user do? What if they do nothing? What if they do it wrong?
- Flag with categories: `DEAD END` · `SILENT FAIL` · `NO FEEDBACK` · `ASSUMPTION` · `RACE` · `NAV TRAP` · `HIDDEN REQ`
- Every flag → can a test or lint rule catch it permanently? If yes, add it in the same session.
- Record findings in STATE.md "Last Session" section. Record reusable patterns/failures in mulch.

### 11. Two-Tier Awareness

**Failure mode:** LLM stores application-specific state (board positions, filter config) in the IIIF vault, or forgets to persist workspace state to IDB.

**Rule:** Every piece of state belongs to exactly one tier (per D18):
- **Tier 1 — IIIF Content Layer (vault):** Manifests, Canvases, Annotations, Ranges. Portable. Exported.
- **Tier 2 — Workspace Layer (IDB):** Board positions, view preferences, filters, workspace snapshots. Application-specific. Not exported as IIIF.

When implementing any item that creates new state, explicitly document which tier it belongs to. If unsure, it's Tier 2. Tier 1 state must survive export → reimport in another IIIF viewer.

### 12. Decisions Are Settled — Implement, Don't Relitigate

**Failure mode:** LLM reads a phase item, decides the architectural decision is suboptimal, proposes a different approach, wastes a full session on analysis instead of implementation.

**Rule:** The Decision Register (D1–D20) records resolved decisions with research basis. Implement as specified. If implementation reveals a genuine blocker (not a preference), document the specific failure in STATE.md and stop — don't improvise an alternative architecture. The next session can evaluate with evidence.
