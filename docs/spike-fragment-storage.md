---
shaping: true
---

## R0+R5 Spike: Fragment Storage Model

### Context
Field-studio currently serializes the entire vault as a single JSON blob via `storage.saveProject(vault.export())`. Every save re-serializes all canvases, annotations, and metadata regardless of what changed. Opening a manifest loads the entire tree into memory. The Penpot reference demonstrates a fragment-per-page model with lazy loading (PointerMap) and dirty tracking. We need to know whether NormalizedState can be partitioned into independently-loadable fragments without breaking cross-entity references.

### Goal
Determine whether the vault's NormalizedState can be split into per-canvas fragments with a shared index, and identify every boundary seam and fragile point in the current save/load/export pipeline that would need to change.

### Questions

| # | Question |
|---|----------|
| **S1-Q1** | What is the actual serialized payload size for a realistic manifest (measure with test data or estimate from type structure)? At what canvas count does save latency become perceptible (>500ms)? |
| **S1-Q2** | Which NormalizedState fields are per-canvas (can be fragmented) vs cross-cutting (must stay in a shared index)? Specifically: how do `references`, `reverseRefs`, `typeIndex`, `collectionMembers`, `memberOfCollections`, `extensions`, and `trashedEntities` reference canvas-scoped entities? |
| **S1-Q3** | How many call sites consume `vault.export()` (the full denormalized tree)? Which of those actually need the full tree vs could work with a partial/lazy tree? |
| **S1-Q4** | Can `vault.load(root)` be refactored to accept partial state (index + active canvas) and lazily resolve other canvases via a load function, without breaking the 39 action handlers? |
| **S1-Q5** | What does the autoSave dirty-detection mechanism look like? Does it compare state objects, use a version counter, or something else? Can it be made canvas-granular? |
| **S1-Q6** | Which features read canvas data from sibling canvases (not the active one)? These are the fragmentation-hostile call sites that would force eager loading. |
| **S1-Q7** | How does the ActionHistory (undo/redo) interact with fragmentation? JSON patches reference entity paths — do they cross canvas boundaries? |

### Known Unknowns
| ID | Unknown | Impact | How to Resolve |
|----|---------|--------|----------------|
| S1-KU1 | Whether Ranges reference canvases by value or by ID only | If by value, fragmenting canvases breaks Range resolution | Read Range normalization code |
| S1-KU2 | Whether denormalization (`vault.export()`) can produce a partial tree | If it requires all entities present, lazy loading breaks export | Read denormalization.ts |
| S1-KU3 | Whether IDB transactions support partial reads efficiently | If reading one key from a large store is slow, per-canvas IDB keys don't help | Benchmark IDB read latency by key count |

### Unknown Unknowns
- Undo/redo patches may reference entities across canvas boundaries (e.g., MOVE_ITEM from canvas A to canvas B)
- Collection membership queries may iterate all manifests, forcing full load
- Board design feature stores `_layout` on annotations — may require loading all canvases to render a board view
- Export features (Canopy, Wax, OCFL) almost certainly need the full tree — how does lazy loading interact with export?

### Acceptance
Spike is complete when we can describe: (1) which NormalizedState fields are fragmentable, (2) the exact list of call sites that prevent fragmentation, (3) whether a shared-index + per-canvas-fragment IDB model is feasible, and (4) the migration path from single-blob to fragmented storage.
