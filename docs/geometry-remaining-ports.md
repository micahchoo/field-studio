---
shaping: true
---

# Geometry Ports — Remaining Inline Math

Callsites not yet refactored to use `src/shared/lib/geometry/`.

## Resolved: BoardItem `w`/`h` → `width`/`height` (wave 3)

Model BoardItem's `w`/`h` fields were renamed to `width`/`height` across 14 files,
making them Rect-compatible. Geometry primitives were then applied to all unblocked callsites.

See `docs/geometry-board-unification.md` for the shaping doc and `docs/geometry-board-slices.md` for slices.

### Ported in wave 3

| File | What | Primitive |
|------|------|-----------|
| `model/index.ts` | `selectBoardBounds` | `Rect.union` + `Rect.right/bottom` |
| `model/exporters.ts` | `getBounds` | `Rect.union` + `Rect.right/bottom` |
| `model/exporters.ts` | PNG connection centers | `Rect.center` |
| `model/exporters.ts` | PNG label midpoints | `Point.lerp` |
| `model/exporters.ts` | SVG connection centers | `Rect.center` |
| `model/exporters.ts` | SVG bezier distance | `Point.distance` |
| `model/exporters.ts` | SVG label midpoints | `Point.lerp` |
| `ui/atoms/MiniMap.svelte` | effectiveBounds | `Rect.union` + `Rect.right/bottom` |
| `ui/molecules/ConnectionLayer.svelte` | getAnchorPoint | `Rect.center/right/bottom` |
| `ui/organisms/BoardCanvas.svelte` | selection bounds | `Rect.right/bottom` |

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
