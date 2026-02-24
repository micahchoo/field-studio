# Round 2 — Unsafe Type Cast Elimination

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all 20 `no-unsafe-type-cast-in-props` ESLint warnings and update STATE.md + ROADMAP.md with Round 1 + 2 results.

**Architecture:** Three fix categories — (A) widen event handler signatures from `MouseEvent` to `MouseEvent | KeyboardEvent`, (B) remove unnecessary `as unknown as Record<string, unknown>` casts on already-typed properties, (C) add type guards for polymorphic property access (Canvas-only `width`/`height`/`duration`, Manifest-only `structures`).

**Tech Stack:** TypeScript, Svelte 5, ESLint custom rules

**Starting state:** tsc 0 errors | svelte-check 0 errors, 0 warnings | ESLint 0 errors, 73 warnings | 4770 tests passing
**Target state:** tsc 0 errors | svelte-check 0 errors, 0 warnings | ESLint 0 errors, ≤54 warnings | 4770+ tests passing

---

## Task 1: Widen event handler signatures (5 warnings)

**Files:**
- Modify: `src/features/archive/ui/organisms/ArchiveView.svelte:299`
- Modify: `src/features/archive/ui/organisms/ArchiveView.svelte:662,791`
- Modify: `src/features/archive/ui/organisms/ArchiveGrid.svelte:53,428`
- Modify: `src/features/archive/ui/organisms/ArchiveList.svelte:59`
- Modify: `src/features/archive/ui/molecules/GroupedArchiveGrid.svelte:28`
- Modify: `src/features/structure-view/ui/molecules/TreeNodeItem.svelte:61,137`
- Modify: `src/features/board-design/ui/organisms/BoardCanvas.svelte:258,429`

### Step 1: Fix ArchiveView.handleItemClick + callers

**Why:** `handleItemClick(e: MouseEvent, item: IIIFItem)` only uses `e.shiftKey`, `e.ctrlKey`, `e.metaKey` — all available on `KeyboardEvent`. The `MouseEvent` type is unnecessarily narrow.

**ArchiveView.svelte:299** — widen handler:
```typescript
function handleItemClick(e: MouseEvent | KeyboardEvent, item: IIIFItem) {
```

**ArchiveView.svelte:662,791** — remove casts:
```typescript
// Before:
onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleItemClick(e as unknown as MouseEvent, canvas); }}
// After:
onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleItemClick(e, canvas); }}
```

### Step 2: Fix ArchiveGrid.onItemClick prop type + consumers

**ArchiveGrid.svelte:53** — widen prop:
```typescript
onItemClick: (e: MouseEvent | KeyboardEvent, asset: IIIFCanvas) => void;
```

**ArchiveGrid.svelte:428** — remove cast:
```typescript
onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onItemClick(e, asset); }}
```

**ArchiveList.svelte:59** — widen prop:
```typescript
onItemClick: (e: MouseEvent | KeyboardEvent, asset: IIIFCanvas) => void;
```

**GroupedArchiveGrid.svelte:28** — widen prop:
```typescript
onItemClick: (e: MouseEvent | KeyboardEvent, canvas: IIIFCanvas) => void;
```

### Step 3: Fix TreeNodeItem.handleClick

**TreeNodeItem.svelte:61** — widen handler (uses `e.stopPropagation()`, `e.metaKey`, `e.ctrlKey`):
```typescript
function handleClick(e: MouseEvent | KeyboardEvent) {
```

**TreeNodeItem.svelte:137** — remove cast:
```typescript
onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); }}
```

### Step 4: Fix BoardCanvas keyboard handler

**BoardCanvas.svelte:258-269** — `handleCanvasClick` uses `e.target`, `e.clientX`, `e.clientY` which are MouseEvent-specific. Don't widen; instead, inline the keyboard logic.

**BoardCanvas.svelte:429** — replace:
```svelte
<!-- Before: -->
onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCanvasClick(e as unknown as MouseEvent); }}
<!-- After: -->
onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onSelectItem(null); selectedConnectionId = null; } }}
```

### Step 5: Run tsc + tests

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errors, all tests pass.

---

## Task 2: Remove unnecessary Record casts on typed properties (8 warnings)

**Files:**
- Modify: `src/features/metadata-edit/ui/atoms/RangeTreeItem.svelte:70-71`
- Modify: `src/features/metadata-edit/ui/molecules/MetadataFieldsPanel.svelte:138`
- Modify: `src/widgets/NavigationSidebar/ui/organisms/Sidebar.svelte:203,246`
- Modify: `src/widgets/QCDashboard/ui/QCDashboard.svelte:208,622,625`

### Step 1: Fix RangeTreeItem — supplementary is on IIIFItem

`IIIFRange extends IIIFItem`. `IIIFItem.supplementary` is typed: `{ id: string; type: "AnnotationCollection" }`. No cast needed.

**RangeTreeItem.svelte:70-73** — simplify:
```typescript
// Before:
let supplementaryId = $derived((range as unknown as Record<string, unknown>).supplementary
  ? ((range as unknown as Record<string, unknown>).supplementary as { id: string })?.id || ''
  : ''
);
// After:
let supplementaryId = $derived(range.supplementary?.id || '');
```

### Step 2: Fix MetadataFieldsPanel — navPlace is on IIIFItem

`IIIFItem.navPlace` is typed as `NavPlace`. No cast needed.

**MetadataFieldsPanel.svelte:138** — simplify:
```typescript
// Before:
let hasNavPlace = $derived(!!(resource as unknown as Record<string, unknown>).navPlace);
// After:
let hasNavPlace = $derived(!!resource.navPlace);
```

### Step 3: Fix Sidebar — items is on IIIFItem

`IIIFItem.items` is typed (as `any[]`). The `as unknown as Record<string, unknown>` is entirely redundant.

**Sidebar.svelte:203** — simplify:
```typescript
// Before:
const children = (item as unknown as Record<string, unknown>).items as IIIFItem[] | undefined;
// After:
const children = item.items as IIIFItem[] | undefined;
```

**Sidebar.svelte:246** — same fix:
```typescript
const children = item.items as IIIFItem[] | undefined;
```

### Step 4: Fix QCDashboard — items and annotations are on IIIFItem

**QCDashboard.svelte:208** — simplify:
```typescript
// Before:
const children = (node as unknown as Record<string, unknown>).items as IIIFItem[] | undefined;
// After:
const children = node.items as IIIFItem[] | undefined;
```

**QCDashboard.svelte:622** — simplify:
```typescript
// Before:
Children: {((previewItem as unknown as Record<string, unknown>).items as unknown[] | undefined)?.length ?? 0}
// After:
Children: {previewItem.items?.length ?? 0}
```

**QCDashboard.svelte:625** — simplify:
```typescript
// Before:
Annotations: {((previewItem as unknown as Record<string, unknown>).annotations as unknown[] | undefined)?.length ?? 0}
// After:
Annotations: {previewItem.annotations?.length ?? 0}
```

### Step 5: Run tsc + tests

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errors, all tests pass.

---

## Task 3: Fix polymorphic property access with type guards (4 warnings)

**Files:**
- Modify: `src/features/metadata-edit/ui/molecules/MetadataFieldsPanel.svelte:156,158,159`
- Modify: `src/widgets/QCDashboard/ui/QCDashboard.svelte:207`

### Step 1: Fix MetadataFieldsPanel — Canvas-only properties

`duration`, `width`, `height` are only on `IIIFCanvas`, not base `IIIFItem`. Use `isCanvas()` guard.

**MetadataFieldsPanel.svelte:153-160** — replace:
```typescript
// Before:
function handleSuggestBehaviors() {
  if (!resource) return;
  const characteristics = {
    hasDuration: !!(resource as unknown as Record<string, unknown>).duration,
    hasPageSequence: isManifest(resource) && (resource as IIIFManifest).items?.length > 1,
    hasWidth: !!(resource as unknown as Record<string, unknown>).width,
    hasHeight: !!(resource as unknown as Record<string, unknown>).height,
  };

// After:
function handleSuggestBehaviors() {
  if (!resource) return;
  const asCanvas = isCanvas(resource) ? resource : null;
  const characteristics = {
    hasDuration: !!(asCanvas?.duration),
    hasPageSequence: isManifest(resource) && resource.items?.length > 1,
    hasWidth: !!(asCanvas?.width),
    hasHeight: !!(asCanvas?.height),
  };
```

This also fixes the `(resource as IIIFManifest)` cast on line 157 — after `isManifest(resource)`, `resource` is narrowed.

**Imports needed:** Ensure `isCanvas`, `isManifest` are imported from `@/src/shared/types`.

### Step 2: Fix QCDashboard — structures is Manifest-only

**QCDashboard.svelte:206-209** — replace:
```typescript
// Before:
const nodeWithStructures = node as IIIFItem & { structures?: IIIFItem[] };
const children = (node as unknown as Record<string, unknown>).items as IIIFItem[] | undefined;
const annotations = (node as unknown as Record<string, unknown>).annotations as IIIFItem[] | undefined;
const structures = nodeWithStructures.structures;

// After:
const children = node.items as IIIFItem[] | undefined;
const annotations = node.annotations;
const structures = isManifest(node) ? node.structures : undefined;
```

**Imports needed:** Ensure `isManifest` is imported from `@/src/shared/types`.

### Step 3: Run tsc + tests

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errors, all tests pass.

---

## Task 4: Fix DependencyGraphView tree building (1 warning)

**Files:**
- Modify: `src/features/dependency-explorer/ui/molecules/DependencyGraphView.svelte:72-81`

### Step 1: Define DirNode type and use it

**DependencyGraphView.svelte** — add type and refactor:
```typescript
// Add at top of <script>:
interface DirNode {
  __files: FileAnalysis[];
  [key: string]: DirNode | FileAnalysis[];
}

// Then replace the tree building:
let treeData = $derived.by(() => {
  const root: Record<string, DirNode> = {};
  for (const file of files) {
    const parts = file.directory.split('/');
    let current: Record<string, DirNode> = root;
    for (const part of parts) {
      if (!current[part]) current[part] = { __files: [] } as DirNode;
      current = current[part] as unknown as Record<string, DirNode>;
    }
    current.__files = current.__files || [];
    (current as DirNode).__files.push(file);
  }
  return buildTree(root, '');
});
```

Note: This is tricky because the tree is both `DirNode` (has `__files`) AND a recursive `Record<string, DirNode>`. The `DirNode` interface with an index signature handles this. We may still need one cast for the recursive `current` reassignment but it will be a cleaner, documented cast.

### Step 2: Run tsc + tests

Run: `npx tsc --noEmit && npx vitest run`

---

## Task 5: Fix StructureTabPanel mutation (1 warning)

**Files:**
- Modify: `src/features/metadata-edit/ui/molecules/StructureTabPanel.svelte:240-246`

### Step 1: Type the mutation properly

`IIIFRange extends IIIFItem`, and `IIIFItem` has `supplementary?: { id: string; type: "AnnotationCollection" }`. We can spread and return as `IIIFRange` directly.

**StructureTabPanel.svelte:238-246** — replace:
```typescript
// Before:
return ranges.map(range => {
  if (range.id === rangeId) {
    const updated = { ...range } as Record<string, unknown>;
    if (supplementary) {
      updated.supplementary = supplementary;
    } else {
      delete updated.supplementary;
    }
    return updated as unknown as IIIFRange;
  }

// After:
return ranges.map(range => {
  if (range.id === rangeId) {
    if (supplementary) {
      return { ...range, supplementary };
    }
    const { supplementary: _, ...rest } = range;
    return rest as IIIFRange;
  }
```

Note: For the delete case, destructure to omit `supplementary` and assert the rest. The `as IIIFRange` is valid because `rest` has all required fields — just the optional `supplementary` is omitted.

### Step 2: Run tsc + tests

Run: `npx tsc --noEmit && npx vitest run`

---

## Task 6: Annotate permanent Annotorious cast (1 warning)

**Files:**
- Modify: `src/features/viewer/ui/molecules/AnnotationDrawingOverlay.svelte:147`

### Step 1: Add eslint-disable

```svelte
<!-- eslint-disable-next-line @field-studio/no-unsafe-type-cast-in-props -- Annotorious DrawingStyleExpression requires cast: library's conditional typing doesn't match constructed style object -->
```

### Step 2: Run eslint to verify

Run: `npx eslint src/features/viewer/ui/molecules/AnnotationDrawingOverlay.svelte`

---

## Task 7: Update STATE.md + ROADMAP.md

**Files:**
- Modify: `STATE.md`
- Modify: `docs/ROADMAP.md`

### Step 1: Add Round 1 results to STATE.md

Add a new "Current Phase: Round 1 — Type Foundation + Compiler Cleanup ✅ COMPLETE" section at the top with:
- Metrics: tsc 0 | svelte-check 0 errors, 0 warnings | 4770 tests | 73 ESLint warnings (was 80; -7)
- Changes: ServiceDescriptor union, NavPlace GeoJSON types, IIIFProvider types, ValidatorIssue/InspectorIssue unification, 20 state_referenced_locally fixes, 9 a11y fixes

### Step 2: Add Round 2 results to STATE.md

Add current round results:
- Metrics delta: ESLint 73 → target ≤54 (-19)
- Changes: MouseEvent widening (5), unnecessary Record casts removed (8), polymorphic type guards (4), DirNode typing (1), mutation typing (1), annotorious annotation (1)

### Step 3: Update ROADMAP.md tracking table

- Phase 1 status: `pending` → `✅ complete`
- Baseline ESLint count: 80 → new count
- TYPE_DEBT structural items: 5 → 1 (only `items?: any[]` remains)
- TODO(loop) survivors: 4 → 1

### Step 4: Run full verification

```bash
npx tsc --noEmit
npx svelte-check
npx eslint src/
npx vitest run
```

All must pass. Target: ESLint ≤54 warnings.

---

## Verification Checklist

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx svelte-check` → 0 errors, 0 warnings
- [ ] `npx eslint src/` → 0 errors, ≤54 warnings
- [ ] `npx vitest run` → 4770+ passing
- [ ] `npx eslint src/ --format json | python3 -c "..." | grep unsafe-type-cast` → ≤1 (annotorious only)
- [ ] STATE.md updated with Round 1 + Round 2 metrics
- [ ] ROADMAP.md Phase 1 marked complete
