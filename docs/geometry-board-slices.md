---
shaping: true
feature: "Board-design geometry unification: rename w/h → width/height + wire geometry primitives"
---

# Slices: Geometry Board Unification

From shaping doc: `docs/geometry-board-unification.md` — Shape A selected.

## Affordances

### Non-UI Affordances

| ID | Affordance | Type | Description |
|----|-----------|------|-------------|
| S1 | BoardItem type rename | Type change | `w`/`h` → `width`/`height` in model/index.ts |
| S2 | parseXYWH return type | Type change | Return `{ x, y, width, height }` (Rect-compatible) |
| S3 | createBoardItem signature | API change | `size: { width, height }` |
| S4 | selectBoardBounds → Rect.union | Geometry wire | Replace Math.min/max with Rect.union |
| S5 | getBounds → Rect.union | Geometry wire | exporters.ts helper |
| S6 | PNG/SVG centers → Rect.center | Geometry wire | Connection center computations |
| S7 | SVG bezier → Point.distance | Geometry wire | Curved connection control points |
| S8 | Label midpoints → Point.lerp | Geometry wire | Connection label positioning |
| S9 | ConnectionLayer anchors → Rect.* | Geometry wire | getAnchorPoint function |
| S10 | MiniMap bounds → Rect.union | Geometry wire | effectiveBounds computation |
| S11 | BoardCanvas edges → Rect.right/bottom | Geometry wire | Selection bounds |

### UI Affordances

No UI changes — this is a pure refactor. All rendering output identical.

## Wiring

- S1 → S2, S3, S4, S5, S6, S7, S8, S9, S10, S11 (rename enables everything)
- S4, S5, S10 share `Rect.union` pattern
- S6, S9 share `Rect.center` pattern
- S7, S8 share `Point.*` pattern

## Slices

### V1: Type rename — `w`/`h` → `width`/`height` (foundation)

- **DEMO**: `npm test` passes, `npm run typecheck` clean — all 16 files updated
- **Affordances**: S1, S2, S3
- **Wiring**: Type definition → all consumers
- **Risk**: Low — mechanical find-replace with type checker as safety net
- **Files**: model/index.ts, model/iiif-bridge.ts, model/exporters.ts, ui/atoms/MiniMap.svelte, ui/molecules/ConnectionLayer.svelte, ui/molecules/BoardDesignPanel.svelte, ui/molecules/BoardNodeLayer.svelte, ui/organisms/BoardCanvas.svelte, __tests__/model.test.ts, __tests__/iiif-bridge.test.ts

### V2: Geometry wiring — bounds + centers + anchors

- **DEMO**: All geometry imports present, inline math replaced, tests pass
- **Affordances**: S4, S5, S6, S8, S9, S10, S11
- **Wiring**: GeoRect/GeoPoint imports → callsite replacements
- **Risk**: Low — pattern-identical to wave 2 (already proven)
- **Files**: model/index.ts (selectBoardBounds), model/exporters.ts (getBounds, centers, midpoints), ui/atoms/MiniMap.svelte (effectiveBounds), ui/molecules/ConnectionLayer.svelte (getAnchorPoint), ui/organisms/BoardCanvas.svelte (selection bounds)

### V3: SVG bezier wiring (optional — lower value)

- **DEMO**: SVG curved connections use Point.distance for control point computation
- **Affordances**: S7
- **Wiring**: Point.distance + manual perpendicular offset
- **Risk**: Low but limited value — only applies to curved SVG export connections
- **Files**: model/exporters.ts (lines 146-153)

**Note**: V3 is deferrable. The bezier perpendicular offset (`-dy/len * offset, dx/len * offset`) doesn't map cleanly to an existing geometry primitive. Adding `Point.perpendicular` just for this callsite would be over-engineering.

## Dependency Graph

```
V1 (rename) ← V2 (bounds + centers + anchors) ← V3 (bezier, optional)
```

## Fit Check: R × V

| Req | Requirement | V1 | V2 | V3 |
|-----|-------------|:--:|:--:|:--:|
| R0 | Inline rect math → geometry primitives | ❌ | ✅ | ✅ |
| R1 | BoardItem Rect-compatible | ✅ | ✅ | ✅ |
| R2 | IIIF round-trip preserved | ✅ | ✅ | ✅ |
| R3 | All tests pass | ✅ | ✅ | ✅ |
| R4 | No type proliferation | ✅ | ✅ | ✅ |

**V × R Criticality:**

| Slice | R count | R's served | Risk |
|-------|---------|------------|------|
| V1 | 4 | R1, R2, R3, R4 | Foundation — must go first |
| V2 | 4 | R0, R2, R3, R4 | Core value delivery |
| V3 | 3 | R0, R2, R3 | Optional — marginal value |
