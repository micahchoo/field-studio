---
shaping: true
---

# Geometry Ports — Remaining Inline Math

Callsites not yet refactored to use `src/shared/lib/geometry/`.

## Blocked: BoardItem `w`/`h` vs `width`/`height` type mismatch

The board-design feature has **two BoardItem types** with different field names:

| Type | Location | Size fields |
|------|----------|-------------|
| `BoardItem` | `model/index.ts:51-65` | `w`, `h` |
| `BoardItem` | `stores/boardVault.svelte.ts:23-34` | `width`, `height` |

The geometry library's `Rect` interface uses `width`/`height`, making it
compatible with boardVault's BoardItem but **not** model/index.ts's BoardItem.

Unifying these types is a prerequisite for porting the following callsites.

### Files blocked by this mismatch

**`src/features/board-design/model/exporters.ts`**
- `getBounds()` (line 226-234): `Math.min/max(...items.map(i => i.x + i.w))` — candidate for `Rect.union`
- PNG export connection centers (lines 53-54): `fromItem.x + fromItem.w / 2` repeated 8x — candidate for `Rect.center`
- SVG export connection centers (lines 140-143): same `from.x + from.w / 2` pattern
- SVG bezier math (lines 146-153): `Math.sqrt(dx*dx + dy*dy)` and perpendicular offset — duplicate of ConnectionLine logic, candidate for `Point.distance` + `Point.perpendicular`
- Connection label midpoints (lines 58-59, 163-164): `(x1 + x2) / 2` — candidate for `Point.lerp`

**`src/features/board-design/model/index.ts`**
- `selectBoardBounds` (lines 145-148): `Math.min/max(...)` — candidate for `Rect.union`
- `autoArrangeItems` (lines 338-413): `centerX - totalW / 2` centering patterns — can use `Rect.center` after type unification

**`src/features/board-design/ui/atoms/MiniMap.svelte`**
- `effectiveBounds` (lines 60-65): `Math.min/max(...items.map(i => i.x + i.w))` — candidate for `Rect.union`

### Resolution path

1. Rename `model/index.ts` BoardItem's `w`/`h` to `width`/`height`
2. Update all consumers of model/index.ts BoardItem (exporters.ts, MiniMap.svelte, boardLayout.ts, etc.)
3. Then apply geometry primitives to the callsites listed above

This is a separate refactor scope — the type rename touches 10+ files and should be its own slice.

## Not worth porting (DOM-specific math)

**`src/shared/actions/panZoomGestures.ts`** (line 218-219)
- `touchDistance()`: `Math.sqrt(dx*dx + dy*dy)` on `Touch.clientX/Y`
- Operates on DOM Touch objects, not geometry Points. Coupling DOM event code to the geometry library adds no value.

**`src/shared/actions/dragDrop.ts`** (line 77)
- `rect.top + rect.height / 2`: midpoint of a DOMRect for drop position calculation
- DOM-specific, not geometry domain

## Already ported (waves 1 & 2)

| File | What | Primitive |
|------|------|-----------|
| `ConnectionLine.svelte` | bezier control points | `Point.*` |
| `annotation.ts` | `getBoundingBox` | `Rect.fromPoints` |
| `annotation.ts` | `simplifyPath` distance | `Point.distance` |
| `measurement.svelte.ts` | `currentDistancePx` | `Point.distance` |
| `alignmentGuides.ts` | rect edges | `Rect.center/right/bottom` |
| `annotation.svelte.ts` | canClose + handleClick | `Point.distance` |
| `PolygonAnnotationTool.svelte` | isNearFirstPoint | `Point.distance` |
| `map.svelte.ts` | cluster distance | `Point.distance` |
| `BoardConnectionRenderer.svelte` | connection paths + labels | `Rect.center` |
| `boardVault.svelte.ts` | createGroup bounds | `Rect.union + expand` |
| `boardLayout.ts` | alignment edges | `Rect.right/bottom/center` |
| `model/index.ts` | snapToGrid | `Point.roundStep` |
