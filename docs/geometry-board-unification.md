---
shaping: true
---

# Geometry Board Unification — Shaping

## Source

From `docs/geometry-remaining-ports.md`: wave 2 geometry ports completed 7 consumer refactors but left 3 files blocked by a type mismatch — `model/index.ts` BoardItem uses `w`/`h` while the geometry library's `Rect` interface uses `width`/`height`. Unifying the field names is the prerequisite for the remaining high-value geometry ports.

## Problem

The board-design feature has **two separate BoardItem types** with incompatible size field names:

| Type | Location | Size fields | Consumers |
|------|----------|-------------|-----------|
| `BoardItem` | `model/index.ts:52-66` | `w`, `h` | 10 files (model, exporters, iiif-bridge, UI) |
| `BoardItem` | `stores/boardVault.svelte.ts:23-34` | `width`, `height` | 3 files (vault, boardLayout, BoardConnectionRenderer) |

The geometry library's `Rect` interface uses `width`/`height`, making it compatible with the vault's BoardItem but **not** the model's. This blocks geometry primitive adoption in 10 files containing ~25 inline math callsites.

## Outcome

All board-design inline rect/point math uses geometry primitives. The model BoardItem's size fields are compatible with `Rect`, eliminating the last barrier to geometry library adoption across the feature.

## Appetite

1 session. The rename is mechanical (fd + sd), and the geometry wiring is pattern-identical to wave 2.

---

## Three-Bucket Classification (scoped to board-design)

| Module | Bucket | Evidence | Implication |
|--------|:------:|----------|-------------|
| `model/index.ts` | (a) LOAD-BEARING | Defines BoardItem, selectors, auto-arrange — used by all board UI | Rename fields, don't restructure |
| `model/exporters.ts` | (a) LOAD-BEARING | PNG/SVG/JSON-LD export — user-facing output | Rename + geometry primitives |
| `model/iiif-bridge.ts` | (a) LOAD-BEARING | IIIF round-trip serialization — data integrity | Rename, preserve xywh format |
| `stores/boardVault.svelte.ts` | (a) LOAD-BEARING | Already uses `width`/`height` — no change needed | Don't touch |
| `model/boardLayout.ts` | (a) LOAD-BEARING | Already ported to geometry in wave 2 | Don't touch |
| `ui/atoms/MiniMap.svelte` | (a) LOAD-BEARING | Uses model BoardItem `w`/`h` | Rename + geometry |
| `ui/molecules/ConnectionLayer.svelte` | (a) LOAD-BEARING | Anchor point geometry using `w`/`h` | Rename + geometry |
| `ui/molecules/BoardDesignPanel.svelte` | (a) LOAD-BEARING | Displays dimensions | Rename only |
| `ui/molecules/BoardNodeLayer.svelte` | (a) LOAD-BEARING | Passes size to BoardNode | Rename only |
| `ui/organisms/BoardCanvas.svelte` | (a) LOAD-BEARING | Resize, alignment, selection | Rename + geometry where applicable |
| `__tests__/model.test.ts` | (a) LOAD-BEARING | 10 assertions on `.w`/`.h` | Rename |
| `__tests__/iiif-bridge.test.ts` | (a) LOAD-BEARING | 8 assertions on `.w`/`.h` | Rename |

All modules are load-bearing. No half-built or aspirational code in scope.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Board-design inline rect math replaced with geometry primitives | Core goal |
| R1 | Model BoardItem size fields are compatible with geometry `Rect` interface | Must-have |
| R2 | IIIF serialization round-trip preserved (xywh fragments, manifest export) | Must-have |
| R3 | All existing tests pass after refactor | Must-have |
| R4 | No second BoardItem type proliferation — vault and model types remain separate but both Rect-compatible | Must-have |

---

## Interrelationship Map

| Subsystem A | Subsystem B | Relationship | Implication |
|-------------|-------------|:------------:|-------------|
| Type rename (`w`→`width`) | Geometry wiring | SEQUENTIAL | Rename first, then apply primitives |
| model/index.ts rename | iiif-bridge.ts rename | COUPLED | Same BoardItem type — rename together |
| model/index.ts rename | exporters.ts rename | COUPLED | Same BoardItem type — rename together |
| model/index.ts rename | UI component renames | COUPLED | Same BoardItem type — all at once |
| Geometry wiring (exporters) | Geometry wiring (UI) | ORTHOGONAL | Can wire independently after rename |

**Conclusion:** The rename is one atomic operation (all `w`/`h` → `width`/`height` at once). Geometry wiring can follow as a second pass.

---

## Shapes

### CURRENT: Inline math with `w`/`h` fields

| Part | Mechanism |
|------|-----------|
| C1 | model BoardItem uses `w`/`h`, vault BoardItem uses `width`/`height` |
| C2 | 25+ inline `item.x + item.w / 2` patterns across 6 files |
| C3 | Duplicate bounds computation (`Math.min/max(...)`) in 3 places |
| C4 | parseXYWH returns `{ x, y, w, h }` — bridges IIIF format to internal |

### A: Rename `w`/`h` → `width`/`height` + geometry primitives

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | Rename `w`/`h` to `width`/`height` in model/index.ts BoardItem type | |
| **A2** | `fd -e ts -e svelte -p board-design -x sd '\.w\b' '.width'` etc. — batch rename all consumers | |
| **A3** | Update `parseXYWH` return type to `{ x, y, width, height }` (Rect-compatible) | |
| **A4** | Update `createBoardItem` signature: `size: { width, height }` | |
| **A5** | Wire `selectBoardBounds` + `getBounds` → `Rect.union` | |
| **A6** | Wire PNG/SVG connection centers → `Rect.center` | |
| **A7** | Wire SVG bezier math → `Point.distance` + perpendicular offset | |
| **A8** | Wire label midpoints → `Point.lerp` | |
| **A9** | Wire `ConnectionLayer.getAnchorPoint` → `Rect.center`/`right`/`bottom` | |
| **A10** | Wire `MiniMap.effectiveBounds` → `Rect.union` | |
| **A11** | Wire `BoardCanvas` alignment rects → geometry (where beneficial) | |

### B: Adapter function (no rename)

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **B1** | Keep `w`/`h` in BoardItem, add `toRect(item)` adapter | |
| **B2** | Every geometry callsite wraps: `Rect.center(toRect(item))` | |
| **B3** | Existing code untouched except where geometry is applied | |

---

## Fit Check

| Req | Requirement | Status | CURRENT | A | B |
|-----|-------------|--------|:-------:|:-:|:-:|
| R0 | Board-design inline rect math replaced with geometry primitives | Core goal | ❌ | ✅ | ✅ |
| R1 | Model BoardItem size fields are compatible with geometry Rect | Must-have | ❌ | ✅ | ❌ |
| R2 | IIIF serialization round-trip preserved | Must-have | ✅ | ✅ | ✅ |
| R3 | All existing tests pass after refactor | Must-have | ✅ | ✅ | ✅ |
| R4 | No type proliferation — both types Rect-compatible | Must-have | ❌ | ✅ | ❌ |

**Notes:**
- B fails R1: BoardItem still has `w`/`h`, not directly Rect-compatible
- B fails R4: adapter creates coupling without solving the root type split
- CURRENT fails R0: 25+ inline math patterns remain
- CURRENT fails R1: `w`/`h` incompatible with `Rect`
- CURRENT fails R4: only vault BoardItem is Rect-compatible

**S × R Profile:**
- CURRENT (2/5): Covers R2, R3. Gap: R0, R1, R4. Baseline.
- A (5/5): Extends CURRENT — adds R0, R1, R4. Additive.
- B (3/5): Extends CURRENT — adds R0. Fails R1, R4. Lateral move (adapter overhead for no structural gain).

---

## Decision

**Shape A selected.** Direct rename is simpler than an adapter, satisfies all R's, and is a mechanical refactor with zero ambiguity. Composition: A1-A11.

---

## Callsite Inventory (concrete wiring targets)

### Rename-only sites (A1-A4)

| File | Lines | Pattern | Action |
|------|-------|---------|--------|
| `model/index.ts` | 57-58 | `w: number; h: number` | Rename to `width`/`height` |
| `model/index.ts` | 231 | `size: { w, h } = { w: 200, h: 150 }` | `size: { width, height }` |
| `model/index.ts` | 237-238 | `w: size.w, h: size.h` | `width: size.width, height: size.height` |
| `model/index.ts` | 349, 362, 380, 395, 407 | `w: itemW, h: itemH` | `width: itemW, height: itemH` |
| `model/index.ts` | 453-454 | `item.w \|\| 1000, item.h \|\| 800` | `item.width \|\| 1000, item.height \|\| 800` |
| `model/iiif-bridge.ts` | 247, 278 | `item.w, item.h` in xywh | `item.width, item.height` |
| `model/iiif-bridge.ts` | 313-314, 337-338 | `w: xywh.w, h: xywh.h` | `width: xywh.width, height: xywh.height` |
| `model/iiif-bridge.ts` | 442-450 | parseXYWH returns `w`/`h` | Return `width`/`height` |
| `ui/molecules/BoardDesignPanel.svelte` | 109 | `boardItem.w × boardItem.h` | `boardItem.width × boardItem.height` |
| `ui/molecules/BoardNodeLayer.svelte` | 83 | `width: item.w, height: item.h` | `width: item.width, height: item.height` |
| `ui/organisms/BoardCanvas.svelte` | 191, 199-200 | `startSize: { w, h }` | `startSize: { width, height }` |
| `ui/organisms/BoardCanvas.svelte` | 242 | `{ w: newW, h: newH }` | `{ width: newW, height: newH }` |
| `ui/organisms/BoardCanvas.svelte` | 342 | `width: i.w, height: i.h` | `width: i.width, height: i.height` |
| `ui/organisms/BoardCanvas.svelte` | 345 | `width: dragItem.w, height: dragItem.h` | `width: dragItem.width, height: dragItem.height` |
| `__tests__/model.test.ts` | 10 assertions | `.w`/`.h` | `.width`/`.height` |
| `__tests__/iiif-bridge.test.ts` | 8 assertions | `.w`/`.h` | `.width`/`.height` |

### Geometry wiring sites (A5-A11)

| File | Lines | Current pattern | Geometry replacement |
|------|-------|----------------|---------------------|
| `model/index.ts` | 146-149 | `Math.min/max(...items.map(i => i.x + i.width))` | `Rect.union(items)` → destructure |
| `model/exporters.ts` | 226-233 | `getBounds()` with same pattern | `Rect.union(items)` → destructure |
| `model/exporters.ts` | 53-54 | `fromItem.x + fromItem.width / 2` (8x) | `Rect.center(fromItem)` |
| `model/exporters.ts` | 58-59 | `(from.center + to.center) / 2` midpoints | `Point.lerp(from, to, 0.5)` |
| `model/exporters.ts` | 140-143 | Same center pattern in SVG | `Rect.center(from/to)` |
| `model/exporters.ts` | 146-153 | `Math.sqrt(dx*dx + dy*dy)` + perpendicular | `Point.distance` + manual perpendicular |
| `model/exporters.ts` | 163-164 | Label midpoints | `Point.lerp` |
| `ui/atoms/MiniMap.svelte` | 60-65 | effectiveBounds with `Math.min/max(...)` | `Rect.union(items)` → destructure |
| `ui/molecules/ConnectionLayer.svelte` | 55-65 | `getAnchorPoint` center/edge | `Rect.center`/`right`/`bottom` |
| `ui/organisms/BoardCanvas.svelte` | 387-388 | `item.x + item.width, item.y + item.height` | `Rect.right(item), Rect.bottom(item)` |

---

## iiif-bridge parseXYWH: Rect or domain-specific?

`parseXYWH` currently returns `{ x, y, w, h }`. The IIIF spec uses `xywh=x,y,w,h` in fragment selectors. Two options:

1. **Return Rect-compatible `{ x, y, width, height }`** — BoardItem construction becomes simple spread. The "w,h" in the xywh string is a serialization detail, not a domain constraint.
2. **Keep `{ x, y, w, h }` as a parsing type** — add explicit mapping `width: xywh.w` at construction sites.

Option 1 is cleaner — the function's callers all feed into BoardItem, which will use `width`/`height`. No reason to preserve the short names at the parse boundary.
