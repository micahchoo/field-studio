# Phase 1.5: `IIIFItem.items` Narrowing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the last structural `any` on `IIIFItem` by changing `items?: any[]` to `items?: unknown[]`, forcing all 23 break sites across 7 files to narrow via type guards.

**Architecture:** Change base type from `any[]` to `unknown[]`. Subtypes (`IIIFCanvas`, `IIIFManifest`, `IIIFCollection`, `IIIFRange`) already override `items` with specific types — those call sites are safe. Only code accessing `.items` on the generic `IIIFItem` base type breaks, which is exactly what we want: it forces proper narrowing. Add a `getChildEntities()` tree-walking helper to eliminate the most repetitive narrowing pattern.

**Tech Stack:** TypeScript strict mode, Svelte 5, Vitest

---

## Pre-flight: Verify Green Baseline

**Step 1:** Run full verification

Run: `npx tsc --noEmit && npx svelte-check --threshold warning && npm test`
Expected: 0 errors, 0 warnings, 4770 tests passing

---

## Task 1: Type Change + Helpers (`src/shared/types/index.ts`)

**Files:**
- Modify: `src/shared/types/index.ts:174` (base type change)
- Modify: `src/shared/types/index.ts:398-412` (add `isAnnotationPage` guard)
- Modify: `src/shared/types/index.ts` (add `getChildEntities` helper)
- Test: `src/shared/types/__tests__/service-descriptors.test.ts` (add narrowing tests)

**Step 1: Write the failing test**

In `src/shared/types/__tests__/service-descriptors.test.ts`, add a new describe block:

```typescript
describe('getChildEntities', () => {
  it('returns canvases for a manifest', () => {
    const manifest: IIIFManifest = {
      id: 'm1', type: 'Manifest',
      items: [{ id: 'c1', type: 'Canvas', width: 100, height: 100, items: [] }],
    };
    const children = getChildEntities(manifest);
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe('c1');
  });

  it('returns members for a collection', () => {
    const collection: IIIFCollection = {
      id: 'col1', type: 'Collection',
      items: [{ id: 'm1', type: 'Manifest', items: [] } as IIIFItem],
    };
    const children = getChildEntities(collection);
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe('m1');
  });

  it('returns empty for a canvas', () => {
    const canvas: IIIFCanvas = {
      id: 'c1', type: 'Canvas', width: 100, height: 100, items: [],
    };
    expect(getChildEntities(canvas)).toHaveLength(0);
  });

  it('returns nested ranges for a range', () => {
    const range: IIIFRange = {
      id: 'r1', type: 'Range',
      items: [
        { id: 'c1', type: 'Canvas' },
        { id: 'r2', type: 'Range', items: [] },
      ],
    };
    const children = getChildEntities(range);
    expect(children).toHaveLength(1);
    expect(children[0].type).toBe('Range');
  });

  it('returns empty for base IIIFItem with no narrowing', () => {
    const item: IIIFItem = { id: 'x', type: 'Annotation' as any };
    expect(getChildEntities(item)).toHaveLength(0);
  });
});

describe('isAnnotationPage', () => {
  it('returns true for AnnotationPage type', () => {
    expect(isAnnotationPage({ id: 'ap1', type: 'AnnotationPage', items: [] })).toBe(true);
  });

  it('returns false for other types', () => {
    expect(isAnnotationPage({ id: 'm1', type: 'Manifest', items: [] } as any)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isAnnotationPage(null)).toBe(false);
    expect(isAnnotationPage(undefined)).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test service-descriptors.test.ts`
Expected: FAIL — `getChildEntities` and `isAnnotationPage` not exported

**Step 3: Change base type and add helpers**

In `src/shared/types/index.ts`:

**Line 174:** Change:
```typescript
items?: any[];
```
To:
```typescript
items?: unknown[];
```

**Update the TYPE_DEBT comment (lines 170-173):**
```typescript
// Phase 1.5: typed as unknown[] because subtypes override with narrower definitions.
// Use type guards (isManifest, isCanvas, isCollection, isRange) or getChildEntities()
// to narrow before accessing element properties.
```

**After the existing type guards (after line 412), add:**

```typescript
export function isAnnotationPage(item: { type?: string } | null | undefined): item is IIIFAnnotationPage {
  return item?.type === 'AnnotationPage';
}

/**
 * Get child IIIFItems for tree traversal.
 * Narrows items based on the resource's type:
 * - Manifest → IIIFCanvas[]
 * - Collection → IIIFItem[]
 * - Range → nested IIIFRange[] (filters out canvas/specific-resource references)
 * - Canvas/other → [] (annotation pages are not IIIFItems)
 */
export function getChildEntities(item: IIIFItem): IIIFItem[] {
  if (isManifest(item)) return item.items;
  if (isCollection(item)) return item.items;
  if (isRange(item)) return item.items.filter((r): r is IIIFRange => 'type' in r && (r as { type: string }).type === 'Range');
  return [];
}
```

**Step 4: Run test to verify it passes**

Run: `npm test service-descriptors.test.ts`
Expected: PASS

**Step 5: Check compilation errors (DO NOT fix yet — just count)**

Run: `npx tsc --noEmit 2>&1 | wc -l`
Expected: ~30-50 errors across ~7 files (these get fixed in subsequent tasks)

**Step 6: Commit**

```bash
git add src/shared/types/index.ts src/shared/types/__tests__/service-descriptors.test.ts
git commit -m "feat(types): change IIIFItem.items from any[] to unknown[]

Add getChildEntities() helper and isAnnotationPage() guard.
Subtypes already have typed items; this forces narrowing on
generic IIIFItem access. Compilation errors in consumers
will be fixed in subsequent commits."
```

---

## Task 2: Fix Entities Layer

**Files:**
- Modify: `src/entities/manifest/model/validation/validator.ts:54-56`
- Modify: `src/entities/manifest/model/builders/iiifBuilder.ts` (if break at ~493)

### 2A: `validator.ts` — tree traversal

**Step 1: Read the file around line 54**

The validator's tree-walk collects children generically:
```typescript
const children = [...(item.items ?? []), ...(item.annotations ?? []), ...structureItems];
```

**Step 2: Fix — use `getChildEntities` + annotations**

Replace with:
```typescript
const children: unknown[] = [
  ...getChildEntities(item),
  ...(item.annotations ?? []),
  ...structureItems,
];
```

Then in the iteration loop, narrow each child:
```typescript
for (const child of children) {
  if (child && typeof child === 'object' && 'id' in child && 'type' in child) {
    issues.push(...validateItem(child as IIIFItem, depth + 1));
  }
}
```

**Step 3: Run tests**

Run: `npm test validator` (or relevant test file)
Expected: PASS

### 2B: `iiifBuilder.ts` — check for break at line ~493

Read line ~493. If `root` is typed as `IIIFManifest` or `IIIFCollection`, it's safe. If typed as `IIIFItem`, narrow first.

**Step 4: Commit**

```bash
git add src/entities/manifest/model/validation/validator.ts src/entities/manifest/model/builders/iiifBuilder.ts
git commit -m "fix(entities): narrow items access in validator and builder"
```

---

## Task 3: Fix Features Layer (Part 1 — High Priority)

### 3A: `src/features/metadata-edit/lib/inspectorValidation.ts` (4 sites)

**Files:**
- Modify: `src/features/metadata-edit/lib/inspectorValidation.ts:293,309,452,467`

Lines 293, 309, 452, 467 all access `resource.items` on a generic `IIIFItem`.

**Pattern:** These sites count or iterate children for inspector validation. Replace each `resource.items ?? []` with `getChildEntities(resource)`:

```typescript
// Before:
const children = resource.items ?? [];

// After:
const children = getChildEntities(resource);
```

If any site needs annotation-page-level items (Canvas children), add explicit narrowing:
```typescript
if (isCanvas(resource)) {
  for (const page of resource.items) { /* page is IIIFAnnotationPage */ }
}
```

**Step 1: Apply fixes to all 4 sites**
**Step 2: Run tests**

Run: `npm test inspectorValidation`
Expected: PASS

### 3B: `src/features/board-design/model/index.ts` (4 sites)

**Files:**
- Modify: `src/features/board-design/model/index.ts:170,207,210,213`

Replace inline intersection casts with type guards:

```typescript
// Before (line ~207):
const manifestItems = (resource as IIIFItem & { items?: IIIFItem[] }).items;

// After:
const manifestItems = isManifest(resource) ? resource.items : undefined;
const collectionItems = isCollection(resource) ? resource.items : undefined;
const rangeItems = isRange(resource) ? resource.items : undefined;
```

For line ~170 (deep chain detection), use explicit guard:
```typescript
// Before:
const items = (resource as IIIFItem & { items?: Array<{ items?: ... }> }).items;

// After:
if (isManifest(resource) || isCollection(resource)) {
  // detect from typed items
}
```

**Step 3: Apply fixes**
**Step 4: Run tests**

Run: `npm test` (board-design tests if they exist, otherwise full suite)
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/metadata-edit/lib/inspectorValidation.ts src/features/board-design/model/index.ts
git commit -m "fix(features): narrow items access in inspectorValidation and board-design"
```

---

## Task 4: Fix Features Layer (Part 2 — Medium Priority)

### 4A: `src/features/archive/ui/organisms/ArchiveView.svelte` (6 sites)

**Files:**
- Modify: `src/features/archive/ui/organisms/ArchiveView.svelte:186-492`

The archive view does tree traversal and reordering. Most sites already have runtime guards (`Array.isArray`, `'type' in child`).

**Pattern for iteration sites:**
```typescript
// Before:
for (const child of item.items || []) {
  // ... child is any
}

// After:
for (const child of getChildEntities(item)) {
  // ... child is IIIFItem
}
```

**Pattern for reordering sites (lines ~344-347, ~403-410):**
These mutate `parent.items` — need to narrow parent first:
```typescript
if (isManifest(parent)) {
  // parent.items is IIIFCanvas[] — reorder logic
} else if (isCollection(parent)) {
  // parent.items is IIIFItem[] — reorder logic
}
```

**Step 1: Apply fixes to all 6 sites**
**Step 2: Run tests**

Run: `npm test archive`
Expected: PASS

### 4B: `src/features/viewer/model/viewerCompatibility.ts` (1 site)

**Files:**
- Modify: `src/features/viewer/model/viewerCompatibility.ts:371`

Replace cast-to-Record with type guard:
```typescript
// Before:
const children = (item as Record<string, unknown>).items as IIIFItem[] | undefined;

// After:
const children = getChildEntities(item);
```

**Step 3: Apply fix**

### 4C: `src/features/ingest/model/csvImporter.ts` (3 sites)

**Files:**
- Modify: `src/features/ingest/model/csvImporter.ts:200,373,393`

Same pattern — replace `item.items` iteration with `getChildEntities(item)`.

### 4D: `src/features/export/model/exportService.ts` (1 site)

**Files:**
- Modify: `src/features/export/model/exportService.ts:287-290`

Replace `item.items` iteration with `getChildEntities(item)`.

**Step 4: Run tests**

Run: `npm test`
Expected: All 4770 passing

**Step 5: Commit**

```bash
git add src/features/archive/ui/organisms/ArchiveView.svelte \
       src/features/viewer/model/viewerCompatibility.ts \
       src/features/ingest/model/csvImporter.ts \
       src/features/export/model/exportService.ts
git commit -m "fix(features): narrow items access in archive, viewer, ingest, export"
```

---

## Task 5: Fix Widgets Layer

### 5A: `src/widgets/QCDashboard/lib/qcHelpers.ts` (2 sites)

**Files:**
- Modify: `src/widgets/QCDashboard/lib/qcHelpers.ts:79,128`

Replace cast `node.items as IIIFItem[] | undefined` with `getChildEntities(node)`.

**Step 1: Apply fixes**
**Step 2: Run tests**

Run: `npm test qc`
Expected: PASS

**Step 3: Commit**

```bash
git add src/widgets/QCDashboard/lib/qcHelpers.ts
git commit -m "fix(widgets): narrow items access in qcHelpers"
```

---

## Task 6: Full Verification + Cleanup

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Svelte check**

Run: `npx svelte-check --threshold warning`
Expected: 0 errors, 0 warnings

**Step 3: Full test suite**

Run: `npm test`
Expected: 4770+ tests passing

**Step 4: ESLint**

Run: `npx eslint src/ 2>&1 | tail -5`
Expected: 0 errors, <=53 warnings (must not regress)

**Step 5: Verify no remaining `any[]` on items**

Run: `grep -n "items?: any\[\]" src/shared/types/index.ts`
Expected: 0 results

**Step 6: Remove the TYPE_DEBT TODO(loop) comment**

The `TODO(loop): remove from base` comment on the items field is now resolved. Update to a doc comment explaining the `unknown[]` design.

**Step 7: Update STATE.md and ROADMAP.md**

- STATE.md: Update TYPE_DEBT count to 0 structural
- ROADMAP.md: Mark Phase 1.5 as complete in tracking table
- ROADMAP.md: Update baseline TYPE_DEBT count

**Step 8: Final commit**

```bash
git add STATE.md docs/ROADMAP.md
git commit -m "docs: mark Phase 1.5 items narrowing complete"
```

---

## Exit Criteria

- [x] `grep -n "items?: any" src/shared/types/index.ts` → 0 results
- [x] `tsc --noEmit` → 0 errors
- [x] `svelte-check` → 0 errors, 0 warnings
- [x] `npm test` → all passing (4770+)
- [x] `eslint` → 0 errors, <=53 warnings
- [x] All 23 break sites use type guards or `getChildEntities()`
- [x] No new `as any` casts introduced

## Risk Notes

- **Vault internals (normalization, denormalization, queries, updates, actions):** Already use specific subtypes — verified SAFE, no changes needed.
- **imageSourceResolver.ts, viewer.svelte.ts:** Already use `IIIFCanvas` params — verified SAFE.
- **iiifBuilder.ts:** Uses mixed patterns; only ~1 site needs fixing (line ~493). Most builder code constructs typed objects directly.
- **ArchiveView.svelte mutation sites:** Lines ~344, ~403 mutate `parent.items` directly. These need the parent narrowed to a specific subtype before mutation. If the reorder logic is generic, it may need a type assertion after the guard.
