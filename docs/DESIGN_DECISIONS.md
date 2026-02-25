# Field Studio — Design Decisions

_Resolutions to open architectural, affordance, and intent questions identified in the [Vision.md](./Vision.md) evaluation. Each decision is backed by research into established tools, IIIF spec constraints, and Svelte 5 patterns._

_Updated: 2026-02-24_

---

## Architectural Decisions

### A1. ViewBus: State Registry, Not Event Bus

**Problem:** Vision uses "bus" language (broadcast, receive) but describes "registry" behavior (persistent state surviving mount/unmount). These are different architectures.

**Resolution: Per-view stores implementing a shared protocol, managed by a central registry.**

Each view owns its own `$state` store class. All implement a common `ViewStateProvider` interface. A `ViewRegistry` singleton holds references across mount/unmount. This follows the pattern used by QGIS (per-layer state with shared query protocol) and Vega-Lite (per-view selection signals with shared resolution).

```
ViewRegistry (singleton, lives in app scope)
  ├── archiveState: ArchiveViewState implements ViewStateProvider
  ├── mapState: MapViewState implements ViewStateProvider
  ├── timelineState: TimelineViewState implements ViewStateProvider
  └── ...
```

**Why not a single monolithic store:** The 7 views have radically different state shapes (GeoJSON bounds vs EDTF ranges vs annotation layer configs). A monolithic store couples everything. Per-view stores with a shared protocol interface (`selection`, `filters`, `getSnapshot`, `restoreSnapshot`) gives cross-view coordination without coupling internals.

**Why "registry" not "bus":** Views mount and unmount. An event bus loses messages when a consumer is unmounted. A registry persists state so that when Timeline mounts, it reads the current selection from the registry immediately — no "missed events." The word "ViewBus" in the Vision should be understood as "ViewRegistry" in the codebase.

---

### A2. Selection Model: Two-Layer with Central Resolver

**Problem:** The Vision conflates entity selection (Archive picks IDs), spatial selection (Map lasso produces geometry), and temporal selection (Timeline brush produces date range) as if they're the same type.

**Resolution: Two-layer model inspired by Vega-Lite's selection signals and crossfilter's dimension model.**

**Layer 1 — Raw Selection (typed, preserves provenance):**

```typescript
type RawSelection =
  | { type: 'entities'; source: ViewId; ids: ReadonlySet<string> }
  | { type: 'spatial';  source: ViewId; geometry: GeoJSON.Geometry }
  | { type: 'temporal'; source: ViewId; range: [number, number] }
  | { type: 'query';    source: ViewId; expression: string }
  | { type: 'none';     source: ViewId };
```

Each view writes its selection in its native form. One active raw selection per source view (like crossfilter's one-filter-per-dimension). The map writes geometry; the timeline writes a date range; the archive writes IDs.

**Layer 2 — Resolved Selection (materialized `Set<string>`):**

A central resolver (runs as `$effect` in App.svelte) takes all active raw selections, resolves each against the vault (spatial → intersect with geolocated items; temporal → intersect with dated items), and computes the AND intersection. Downstream consumers read `resolvedIds: Set<string>` without knowing the provenance.

**Why AND not OR:** Crossfilter, Vega-Lite (intersect mode), and QGIS all default to AND. It matches user intent: "show items from this time period AND this geographic area AND matching this search." OR would return the union, which is almost never what a researcher wants when combining filters.

**Selection vs Filter distinction:** Selection is transient (clicking elsewhere clears it) and single-primary. Filters are persistent across view switches and compose additively. Keep them as separate stores with the same two-layer architecture.

---

### A3. Board IIIF Mapping: Two-Tier Storage

**Problem:** Board layout positions, connection geometry, and link styles have no natural IIIF representation. IIIF Ranges are ordered canvas sequences without spatial coordinates. Claiming "everything is IIIF" breaks at the Board.

**Resolution: Explicit two-tier model. IIIF for portable content; Workspace State for application-specific layout.**

**Tier 1 — IIIF (portable, exports to other viewers):**
- Board items → the items themselves are Canvases/Manifests (already in vault)
- Narrative paths → Range with `behavior: ["sequence"]` (IIIF-native, exports cleanly)
- Connections → Annotation with `motivation: "linking"`, two `target` entries (source + destination)
- Connection labels → Annotation `body` with `TextualBody`

**Tier 2 — Workspace State (Field Studio-specific, persisted to IDB):**
- Board item positions (x, y on canvas)
- Connection geometry (control points, routing)
- Link styles (color, weight, dash pattern)
- Viewport state (pan, zoom)

On export, Tier 1 produces a valid IIIF Collection with Ranges and Annotations. Other viewers can display the narrative sequence and connection annotations. Tier 2 produces a Field Studio workspace file. On re-import, both tiers restore the full board.

**Precedent:** This is exactly how Mirador handles workspace state — Redux store for full workspace, Content State for IIIF interop. Every major IIIF viewer does this. The IIIF community explicitly separates content state from viewer state (spec §6).

---

### A4. Content State: Spec-Compliant, Not Overloaded

**Problem:** Vision extends IIIF Content State to encode temporal windows, filter states, board context. The spec explicitly says "viewer state is client-specific" and only supports manifest + canvas + region/annotation selectors.

**Resolution: Two formats. IIIF Content State for interop. Workspace State for full view restoration.**

**Format 1 — IIIF Content State (interop, sharing):**
- Encodes: manifest ID, canvas ID, spatial/temporal selectors, annotation references
- Used for: deep links, drag-drop between IIIF viewers, embed codes, bookmarks
- Encoding: base64url in `iiif-content` URL parameter
- Existing `contentState.ts` implementation is correct and complete

**Format 2 — Workspace State (application-specific):**
- Encodes: everything Content State has, PLUS active view, panel config, zoom, filters, board layout, annotation layers
- Used for: save/restore sessions, share workspace snapshots between Field Studio instances
- Stored in: IndexedDB, optionally shareable as `fs-workspace` URL parameter
- Contains an extractable Content State sub-field for interop

**The bridge:** `WorkspaceState.toContentState()` extracts the IIIF-compliant subset. Other viewers receive a standard Content State. Field Studio receives the full workspace.

---

### A5. Undo/Redo: Vault Mutations Only

**Problem:** Vision says undo should "undo vault mutations, restore view states, preserve selection." These contradict — if undo restores view state, it can't preserve current selection/filters.

**Resolution: Undo vault mutations only. View state and selection are ephemeral — never included in undo history.**

**Research basis:** Every mature multi-view editor converges on this:
- **Figma:** Undoes document mutations. Zoom/pan excluded. Selection inclusion is actively controversial (users complain it pads the undo stack).
- **Photoshop:** History panel tracks document operations only. Zoom, scroll, window arrangement excluded.
- **VS Code:** Per-file text undo only. Fold state, scroll position, split panes excluded.
- **Google Docs / Notion:** Content mutations only. View config, sorts, filters excluded.

**Concrete scenario resolved:** User adds annotation (vault mutation) → changes timeline filter (view state) → Cmd+Z. Result: annotation removed, timeline filter unchanged. This matches every application users already know.

**Implementation:** Use the JSON Patch-based `HistoryEntry` system (forward/reverse patches against `NormalizedState`). Do NOT snapshot the full vault tree on each edit. Add a separate **navigation stack** (Alt+Left/Right) for "go back to where I was" — last canvas, last zoom position — like VS Code's cursor undo (Ctrl+U). This is navigation, not undo.

---

### A6. Storage Lifecycle: Tiered with Working Sets

**Problem:** Vision has no model for storage limits, working sets, or what happens when a 10K-item collection outgrows comfortable memory.

**Resolution: Three-tier storage model.**

| Tier | Medium | Contents | Capacity (10K canvases) |
|------|--------|----------|------------------------|
| Hot (memory) | Svelte `$state` | Active manifest's normalized vault | ~5 MB |
| Warm (IndexedDB) | IDB object stores | All vault metadata, embeddings, workspace snapshots | ~50 MB |
| Cold (OPFS) | File system | Image tiles for offline access, LRU evicted | ~200 MB-4 GB |

**Realistic storage budget:** A 10K-canvas vault with rich annotations consumes ~45-50 MB in IndexedDB. Chrome allows ~60% of disk per origin. Firefox best-effort allows ~10 GiB. Both are comfortable.

**Safari risk:** 7-day eviction of all script-writable storage if no user interaction. Mitigate with `navigator.storage.persist()` and a re-indexing fallback. Document this constraint for users.

**Working set pattern (Figma model):** Load active manifest's canvases in full. Other manifests load as stubs ({id, label, type, thumbnail}). Expand on demand. This keeps hot-tier memory under 5 MB regardless of total vault size.

---

## Affordance Decisions

### B1. Concurrent Investigations: Named Selections + Workspace Snapshots

**Problem:** Vision describes a single linear research thread (Archive → Timeline → Map → Viewer → Board). Real research is non-linear with multiple concurrent inquiries.

**Resolution: Two lightweight layers, both IIIF-native where possible.**

**Layer 1 — Named Selections (implement first):**
A saved set of canvas IDs + optional filter predicate + label. Stored as a IIIF Range. Items can belong to multiple selections. Users create them via "Save selection as..." from any view.

**Layer 2 — Workspace Snapshots (implement second):**
Captures full view state: active view, loaded selection, filters, viewer position, panel config. Stored in IndexedDB. Switched via keyboard shortcuts (Cmd+Shift+1/2/3). This is the Obsidian Workspaces model.

**Research basis:** Zotero (Collections + Saved Searches), NVivo (Sets + Framework Matrices), Obsidian (Canvases + Workspaces) all converge on this pattern. Named groupings for data, snapshots for UI state. Do NOT build a monolithic "project" abstraction — it creates hard boundaries that prevent cross-investigation work.

---

### B2. Annotation Interaction: Explicit Mode Switching

**Problem:** "Click-to-annotate with no add mode" conflicts with pan/zoom gestures. In deep-zoom viewers, click-drag is already claimed by pan.

**Resolution: Explicit mode switching with one-shot default and Shift+drag accelerator.**

**Research basis:** Mirador, Annotorious, Adobe Acrobat, and every surveyed deep-zoom viewer uses explicit mode switching. Hypothes.is's "select-then-act" only works for text (selection is lossless). For images, the gesture conflict is irresolvable without disambiguation.

**Gesture grammar:**

| Gesture | Pan/Zoom mode (default) | Annotation mode |
|---------|------------------------|-----------------|
| Click + drag | Pan | Draw shape |
| Scroll | Zoom | Zoom (always available) |
| Click existing annotation | Select / open inspector | Select / edit |
| Shift + drag | **Quick-draw rectangle** | Same as drag |
| Escape | — | Cancel drawing, exit to pan/zoom |
| Double-click | Zoom in | Close polygon |

**Key behaviors:**
- **One-shot default:** After creating one annotation, auto-return to pan/zoom. Matches Annotorious `drawingEnabled` and Acrobat's default.
- **"Keep tool" toggle:** Power users enable persistent annotation mode for batch work.
- **Shift+drag accelerator:** Draw a rectangle without entering annotation mode. Matches Annotorious's default headless behavior. This is the closest to "no add mode" — experienced users annotate without touching the toolbar.
- **Scroll always zooms**, even in annotation mode. Critical for scholarly image work.

**Vision adjustment:** Replace "click-to-annotate (no add mode)" with "Shift+drag quick-annotate plus one-shot annotation mode." The spirit (minimal friction to annotate) is preserved; the impossible gesture conflict is resolved.

---

### B3. Original Order: Range-Based Virtual Reordering

**Problem:** "Original order remains unbroken" is undefined. The vault has a `REORDER_CANVASES` action that mutates the manifest's `items` array.

**Resolution: Manifest `items` is accession order. User reordering creates a Range with `behavior: ["sequence"]`.**

**Research basis:**
- Archival theory: "Original order" is contested even in physical archives. For digital materials, Jefferson Bailey's "Disrespect des Fonds" argues there is no single original order — order is query-dependent.
- IIIF spec: The [Alternative Page Sequences cookbook recipe](https://iiif.io/api/cookbook/recipe/0027-alternative-page-order/) provides exactly this mechanism — `items` holds default order, Ranges in `structures` with `behavior: "sequence"` hold alternative orders.
- Existing tools (Omeka, Tropy, ArchivesSpace): All use destructive reorder. IIIF's Range model is strictly better — it preserves provenance.

**Concrete behavior:**
1. When canvases are ingested, their position in `items` is accession order. This array is not mutated for analytical reordering.
2. User drags canvases into a new order → creates/updates a Range with `behavior: ["sequence"]` and a user-provided label (e.g., "Chronological", "By Subject").
3. Multiple named orderings can coexist. The active one is tracked in view state.
4. An explicit "Commit as canonical order" action exists for genuine corrections (wrong scan, duplicate removal). This runs `REORDER_CANVASES` and is undo-able.

**Implementation:** Existing `ADD_RANGE`, `ADD_CANVAS_TO_RANGE`, `REORDER_RANGE_ITEMS` actions cover most of this. Need a new `CREATE_SEQUENCE_RANGE` convenience action and a UI for selecting the active sequence.

---

### B4. Spatial Density on Board: User-Authored Convention

**Problem:** "Spatial density communicates argumentative weight" is operationally undefined.

**Resolution: Density is user-authored, not computed.** The system does not interpret spatial arrangement. Users place items deliberately — clustering implies importance by convention, not algorithm. The board is a sensemaking surface, not a data visualization.

If automatic density visualization is later desired (heat map overlay, cluster detection), it should be an optional analytics layer, not a core affordance.

---

## Intent Decisions

### C1. Vocabulary Spectrum: Free-Form → Consolidated → Controlled

**Problem:** Vision simultaneously wants "no enforced ontology" (board connections) and "controlled vocabulary drives search facets" (metadata). These contradict.

**Resolution: Three-layer progressive formalization model.**

| Layer | When | Mechanism | Enforcement |
|-------|------|-----------|-------------|
| Free tags | During active research | Auto-complete from existing tags (Zotero model) | None |
| Consolidated tags | Periodic cleanup | Merge/rename synonyms (Taguette model) | Informal |
| Controlled mapping | When precision needed | Map to vocabulary terms with SKOS match types (OpenRefine model) | Optional |

**IIIF representation:** Tags are annotations with `motivation: "tagging"`. Unmapped tags have a `TextualBody` only. Mapped tags add a `SpecificResource` body pointing to the controlled vocabulary term (e.g., Getty AAT URI). Both are valid W3C Web Annotation. Partially-mapped datasets are always valid.

**Integration with existing vocabulary plan:** The `VocabularyField` with `controlledValues` (from `docs/feature planning/vocabulary.md`) constrains input for structured metadata fields. The tag-to-vocabulary mapping described here handles the orthogonal case of free-form annotations progressively linked to authority terms. Both coexist.

**Board connections** start as free-form tagged links. They can optionally be mapped to vocabulary terms. The mapping is not required — connections without controlled terms are valid, searchable (by free text), but not faceted.

---

### C2. "Reproducible" (formerly "Replayable")

**Problem:** "Replayable" implies a temporal log but could mean action replay, state scrubbing, or session recording — each a different architecture.

**Resolution: Reframe as "reproducible."** Given the same vault state and workspace snapshot, any view can be reconstructed exactly. This is achievable in Phase 2.2 via `ViewStateProvider.getSnapshot()` / `restoreSnapshot()` and IDB-persisted workspace snapshots.

True temporal replay (action log scrubbing, session recording) is deferred to Phase 3.5 — it requires the P2P sync infrastructure (which needs a CRDT-compatible operation stream anyway). If/when implemented, the action log approach (append-only mutation journal) is the right choice — it supports undo, replay, and CRDT sync from the same data structure.

**Vision.md §1 updated** to reflect this distinction: "reproducible" is a Phase 2 commitment; "replayable" is a Phase 3+ aspiration.

---

### C3. Everything-Is-IIIF: Named Two-Tier Model

**Problem:** Board layout, ViewBus state, and vocabulary config don't fit IIIF. Pretending they do breaks spec compliance.

**Resolution: Explicitly name the two tiers.**

**Tier 1 — IIIF Content Layer (the vault):**
Manifests, Canvases, Annotations, Ranges, AnnotationCollections. Portable. Exports to other viewers. Governed by Presentation API 3.0.

**Tier 2 — Workspace Layer (application state):**
Board layout positions, view preferences, active filters, workspace snapshots, vocabulary definitions, embedding vectors. Field Studio-specific. Persisted in IndexedDB. Not exported as IIIF.

The principle "actions generate future data, not ephemeral events" applies to **both tiers**. Board layout positions are future data (they're persisted and restored), they just aren't IIIF data. The distinction is portability, not durability.

---

### C4. Local Semantic Embeddings: Feasible, Phase 2

**Problem:** Mentioned once as a bullet point, never scoped.

**Resolution: Feasible with concrete constraints. Plan for Phase 2, not Phase 1.**

**Technology stack:** Transformers.js v4 + `all-MiniLM-L6-v2` INT8 quantized (23 MB model download) + IndexedDB vector storage + brute-force cosine search.

**Concrete numbers:**
| Metric | WebGPU (~78% users) | WASM fallback (~22%) |
|--------|---------------------|----------------------|
| Model download | 23 MB (one-time, cached) | Same |
| Indexing 10K items | ~30 seconds | ~5 minutes (Web Worker) |
| Query latency | <10 ms | <100 ms |
| Memory overhead | ~100 MB total | Same |

**Implementation:** Dynamic import (zero bundle cost until activated). Background Web Worker for indexing. Progressive — embed items as they're loaded. Re-index on Safari eviction. User opts in to enable.

**Why not Phase 1:** Text search (FlexSearch, already working) covers 90% of discovery needs. Semantic search is valuable for fuzzy/conceptual queries but not blocking for the core workbench experience. The ViewBus, selection model, and board persistence are higher priority.

---

### C5. Relationship Model: Linking Annotations, Not a New Entity Type

**Problem:** Vision describes "relationship graphs" in the Metadata view and board connections as semantic links. Board connections currently exist with 6 types (`associated`, `partOf`, `similarTo`, `references`, `requires`, `sequence`) but are not vault-backed — they live in-memory and are lost on refresh. The vault has hierarchical refs and collection membership but no semantic entity-to-entity relationships.

**Resolution: Store entity relationships as W3C Annotations with `motivation: "linking"` and two `target` entries.**

```typescript
// Entity-to-entity relationship stored as a linking Annotation
{
  type: "Annotation",
  motivation: "linking",
  body: {
    type: "TextualBody",
    value: "references",           // relationship type from vocabulary
    purpose: "tagging"
  },
  target: [
    { type: "SpecificResource", source: "entity-id-A" },  // from
    { type: "SpecificResource", source: "entity-id-B" }   // to
  ]
}
```

**Why not a new entity type:** The vault already has full CRUD for annotations (`ADD_ANNOTATION`, `UPDATE_ANNOTATION`, `REMOVE_ANNOTATION`), annotations are already indexed into search (Phase 0.4), and they export as valid IIIF. A new `Relationship` entity type would require new actions, new normalization, new indexing — for functionally identical behavior.

**Why not the existing Board connection model:** Board connections link board item IDs (temporary UI entities), not IIIF entity IDs. They cannot be queried across views. The annotation-based model is vault-native, searchable, and exportable.

**Directionality:** Target order encodes direction — first target is source, second is destination. Bidirectional relationships store two annotations or are treated as undirected by consumers.

**Vocabulary:** Relationship types come from the vocabulary system (§C1). Default types mirror the existing board connection types. Users can extend with domain-specific terms mapped to SKOS predicates.

---

### C6. navPlace Pipeline: GeoJSON First, Metadata Fallback

**Problem:** The Map view (`MapStore.loadFromManifest()`) ignores the `navPlace` GeoJSON field entirely. It only parses coordinate strings from metadata labels via substring matching (`labelLower.includes('coordinate')`, etc.). This means well-formed IIIF manifests with proper `navPlace` data are not displayed on the map. Meanwhile, `src/shared/services/navPlaceService.ts` (269 lines) provides complete GeoJSON support including centroid, bounds, containment, and Haversine distance — but is unused by the Map view.

**Resolution: MapStore reads `canvas.navPlace` first via `navPlaceService`. Falls back to metadata string parsing for manifests without navPlace.**

**Data flow:**
```
canvas.navPlace? ──→ navPlaceService.getCenter() ──→ MapItem { lat, lng, ... }
       │ (absent)
       └──→ canvas.metadata string parsing (existing) ──→ MapItem { lat, lng, ... }
```

**New vault action:** `UPDATE_NAV_PLACE` — parallel to existing `UPDATE_NAV_DATE` and `BATCH_UPDATE_NAV_DATE`. Enables editing navPlace from both the Metadata view and a future GeoEditor component.

**Metadata-edit stub:** The duplicate `metadata-edit/lib/navPlaceService.ts` (59 lines, `any`-typed stub) should be replaced with a re-export from the shared service.

**Validation:** Add GeoJSON structure validation during manifest load. Invalid navPlace data should generate a `ValidationIssue` rather than silently failing.

---

## Decision Register (Consolidated)

| # | Decision | Resolution | Basis |
|---|----------|------------|-------|
| A1 | ViewBus architecture | Per-view stores with shared protocol + central registry | Vega-Lite signals, QGIS layer model |
| A2 | Selection model | Two-layer: typed raw + resolved `Set<string>` via central resolver | Vega-Lite, crossfilter, QGIS |
| A3 | Board IIIF mapping | Two-tier: IIIF (Ranges, Annotations) + Workspace (positions, styles) | Mirador workspace model, IIIF spec §6 |
| A4 | Content State scope | Spec-compliant only; separate Workspace State format | IIIF Content State 1.0 spec, Mirador/UV precedent |
| A5 | Undo scope | Vault mutations only; view state excluded | Figma, Photoshop, VS Code, Google Docs |
| A6 | Storage lifecycle | Three-tier (memory/IDB/OPFS) with working set loading | Figma page-level loading, Notion selective sync |
| B1 | Concurrent investigations | Named Selections (IIIF Ranges) + Workspace Snapshots (IDB) | Zotero, NVivo, Obsidian |
| B2 | Annotation interaction | Explicit mode switch, one-shot default, Shift+drag accelerator | Mirador, Annotorious, Acrobat |
| B3 | Original order | `items` = accession order; reorder via Range `behavior: ["sequence"]` | IIIF cookbook recipe 0027, archival theory |
| B4 | Board density | User-authored convention, not computed | — |
| C1 | Vocabulary model | Free tags → consolidated → controlled mapping (SKOS) | OpenRefine, Zotero, W3C Web Annotation |
| C2 | "Reproducible" | Views reproducible via vault + workspace snapshots (Phase 2.2); true replay deferred to Phase 3.5 | Figma version history, CRDT literature |
| C3 | Two-tier data model | IIIF Content Layer + Workspace Layer, both durable | IIIF spec, Mirador precedent |
| C4 | Local embeddings | Phase 2; Transformers.js + MiniLM INT8, 23 MB, opt-in | SemanticFinder, RxDB vector, Transformers.js v4 |
| C5 | Relationship model | Linking Annotations with `motivation: "linking"` + two targets; reuses annotation CRUD | W3C Web Annotation, IIIF linking motivation |
| C6 | navPlace pipeline | MapStore reads `navPlace` GeoJSON first, metadata string fallback; `UPDATE_NAV_PLACE` action | IIIF navPlace spec, existing `navPlaceService.ts` |
