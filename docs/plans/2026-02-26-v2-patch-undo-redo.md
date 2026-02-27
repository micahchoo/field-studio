# V2: Patch-Based Undo/Redo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deepen jsonPatch diffing from shallow top-level to 3-level entity diffing so undo/redo produces ~200B patches instead of replacing entire entity maps.

**Architecture:** V1 already wired ActionHistory into VaultStore.dispatch/undo/redo. V2 replaces `JSON.stringify` equality in `computePatches()` with reference equality (`!==`) at 3 levels: NormalizedState keys → entity type buckets → individual entities. `applyPatches()` is updated to handle 3-segment paths (`/entities/Canvas/canvas-123`). Dead deprecated methods are deleted.

**Tech Stack:** TypeScript, Vitest, Svelte 5 (`$state.raw` guarantees reference equality for unchanged objects)

**Key insight:** `$state.raw` maintains reference equality — unchanged entities keep the same object reference across mutations. `!==` works at every nesting level without serialization.

---

## Task 1: Deepen computePatches to 3-level entity diffing (TDD)

**Files:**
- Modify: `src/shared/lib/__tests__/jsonPatch.test.ts`
- Modify: `src/shared/lib/jsonPatch.ts`

**Context:** Current `computePatches()` diffs only top-level keys using `JSON.stringify`. A single entity change replaces the entire `entities` object as one patch. We need 3 levels:
- Level 1: top-level NormalizedState keys (`entities`, `references`, `rootId`, etc.) — `!==`
- Level 2: entity type buckets (`entities.Canvas`, `entities.Manifest`, etc.) — `!==`
- Level 3: individual entities within changed buckets — `!==`

Non-object top-level keys (strings, arrays, etc.) still use `!==` only — no JSON.stringify.

**Step 1: Write failing tests for 3-level diffing**

Add these tests to `src/shared/lib/__tests__/jsonPatch.test.ts`:

```typescript
describe('3-level entity diffing', () => {
  // Simulate NormalizedState-like structure
  const canvas1 = { id: 'c1', type: 'Canvas', label: { en: ['Canvas 1'] } };
  const canvas2 = { id: 'c2', type: 'Canvas', label: { en: ['Canvas 2'] } };
  const manifest1 = { id: 'm1', type: 'Manifest', label: { en: ['Manifest'] } };

  it('produces entity-level patches when one entity changes', () => {
    const before = {
      entities: {
        Canvas: { c1: canvas1, c2: canvas2 },
        Manifest: { m1: manifest1 },
      },
      rootId: 'm1',
    };
    const updatedCanvas1 = { ...canvas1, label: { en: ['Updated'] } };
    const after = {
      entities: {
        Canvas: { c1: updatedCanvas1, c2: canvas2 },
        Manifest: { m1: manifest1 },
      },
      rootId: 'm1',
    };

    const { forward, reverse } = diffStates(before, after);

    // Should produce a patch for the specific entity, not the entire entities object
    expect(forward).toHaveLength(1);
    expect(forward[0].path).toBe('/entities/Canvas/c1');
    expect(forward[0].op).toBe('replace');
    expect(forward[0].value).toBe(updatedCanvas1);

    expect(reverse).toHaveLength(1);
    expect(reverse[0].path).toBe('/entities/Canvas/c1');
    expect(reverse[0].value).toBe(canvas1);
  });

  it('skips unchanged entity type buckets (reference equality)', () => {
    const canvasMap = { c1: canvas1, c2: canvas2 };
    const before = {
      entities: { Canvas: canvasMap, Manifest: { m1: manifest1 } },
      rootId: 'm1',
    };
    // Same Canvas map reference, different Manifest
    const updatedManifest = { ...manifest1, label: { en: ['New'] } };
    const after = {
      entities: { Canvas: canvasMap, Manifest: { m1: updatedManifest } },
      rootId: 'm1',
    };

    const { forward } = diffStates(before, after);
    // Only manifest changed, canvas bucket skipped entirely
    expect(forward).toHaveLength(1);
    expect(forward[0].path).toBe('/entities/Manifest/m1');
  });

  it('handles added entity in a bucket', () => {
    const before = {
      entities: { Canvas: { c1: canvas1 } },
    };
    const after = {
      entities: { Canvas: { c1: canvas1, c2: canvas2 } },
    };

    const { forward, reverse } = diffStates(before, after);
    expect(forward).toHaveLength(1);
    expect(forward[0]).toEqual({ op: 'add', path: '/entities/Canvas/c2', value: canvas2 });
    expect(reverse).toHaveLength(1);
    expect(reverse[0]).toEqual({ op: 'remove', path: '/entities/Canvas/c2' });
  });

  it('handles removed entity from a bucket', () => {
    const before = {
      entities: { Canvas: { c1: canvas1, c2: canvas2 } },
    };
    const after = {
      entities: { Canvas: { c1: canvas1 } },
    };

    const { forward, reverse } = diffStates(before, after);
    expect(forward).toHaveLength(1);
    expect(forward[0]).toEqual({ op: 'remove', path: '/entities/Canvas/c2' });
    expect(reverse).toHaveLength(1);
    expect(reverse[0]).toEqual({ op: 'add', path: '/entities/Canvas/c2', value: canvas2 });
  });

  it('handles non-entities top-level key change (rootId)', () => {
    const before = { entities: { Canvas: { c1: canvas1 } }, rootId: 'm1' };
    const after = { entities: { Canvas: { c1: canvas1 } }, rootId: 'm2' };

    const { forward } = diffStates(before, after);
    expect(forward).toHaveLength(1);
    expect(forward[0]).toEqual({ op: 'replace', path: '/rootId', value: 'm2' });
  });

  it('uses reference equality (no JSON.stringify)', () => {
    // Same content but different references — should detect as changed
    const before = { entities: { Canvas: { c1: { ...canvas1 } } } };
    const after = { entities: { Canvas: { c1: { ...canvas1 } } } };

    const { forward } = diffStates(before, after);
    // Different references → detected as change (this is correct — $state.raw
    // ensures same reference for unchanged entities)
    expect(forward).toHaveLength(1);
    expect(forward[0].path).toBe('/entities/Canvas/c1');
  });

  it('produces no patches when references are identical', () => {
    const entities = { Canvas: { c1: canvas1 }, Manifest: { m1: manifest1 } };
    const state = { entities, rootId: 'm1' };

    const { forward, reverse } = diffStates(state, state);
    expect(forward).toEqual([]);
    expect(reverse).toEqual([]);
  });

  it('handles added entity type bucket', () => {
    const before = { entities: { Canvas: { c1: canvas1 } } };
    const after = { entities: { Canvas: { c1: canvas1 }, Manifest: { m1: manifest1 } } };

    const { forward } = diffStates(before, after);
    // New bucket with one entity = one add patch
    expect(forward).toHaveLength(1);
    expect(forward[0]).toEqual({ op: 'add', path: '/entities/Manifest/m1', value: manifest1 });
  });

  it('handles removed entity type bucket', () => {
    const before = { entities: { Canvas: { c1: canvas1 }, Manifest: { m1: manifest1 } } };
    const after = { entities: { Canvas: { c1: canvas1 } } };

    const { forward } = diffStates(before, after);
    expect(forward).toHaveLength(1);
    expect(forward[0]).toEqual({ op: 'remove', path: '/entities/Manifest/m1' });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/shared/lib/__tests__/jsonPatch.test.ts`
Expected: FAIL — current `computePatches` produces `/entities` path, not `/entities/Canvas/c1`

**Step 3: Rewrite computePatches and diffStates**

Replace the contents of `src/shared/lib/jsonPatch.ts` with:

```typescript
/**
 * JSON Patch — 3-Level Entity Diffing for ActionHistory
 *
 * Produces entity-granular patches by diffing NormalizedState at 3 levels:
 *   Level 1: top-level keys (entities, references, rootId, ...)
 *   Level 2: entity type buckets (entities.Canvas, entities.Manifest, ...)
 *   Level 3: individual entities within changed buckets
 *
 * Uses reference equality (!==) at every level — $state.raw guarantees
 * unchanged objects keep the same reference.
 */

export interface Patch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string | string[];
  value?: unknown;
  from?: string;
}

/**
 * Diff two objects at entity granularity.
 *
 * For the `entities` key: recurse into type buckets → individual entities.
 * For all other keys: shallow !== comparison only.
 */
function computePatches(from: Record<string, unknown>, to: Record<string, unknown>): Patch[] {
  const patches: Patch[] = [];
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const key of allKeys) {
    const fromVal = from[key];
    const toVal = to[key];

    if (fromVal === toVal) continue; // Reference equality — skip unchanged

    if (!(key in from)) {
      // Key added at top level
      if (key === 'entities' && isRecord(toVal)) {
        // Expand into entity-level adds
        for (const [type, bucket] of Object.entries(toVal as Record<string, Record<string, unknown>>)) {
          for (const [id, entity] of Object.entries(bucket)) {
            patches.push({ op: 'add', path: `/entities/${type}/${id}`, value: entity });
          }
        }
      } else {
        patches.push({ op: 'add', path: `/${key}`, value: toVal });
      }
    } else if (!(key in to)) {
      // Key removed at top level
      if (key === 'entities' && isRecord(fromVal)) {
        for (const [type, bucket] of Object.entries(fromVal as Record<string, Record<string, unknown>>)) {
          for (const [id] of Object.entries(bucket)) {
            patches.push({ op: 'remove', path: `/entities/${type}/${id}` });
          }
        }
      } else {
        patches.push({ op: 'remove', path: `/${key}` });
      }
    } else if (key === 'entities' && isRecord(fromVal) && isRecord(toVal)) {
      // Level 2+3: dive into entity type buckets
      diffEntityBuckets(
        fromVal as Record<string, Record<string, unknown>>,
        toVal as Record<string, Record<string, unknown>>,
        patches,
      );
    } else {
      // Non-entities top-level key changed
      patches.push({ op: 'replace', path: `/${key}`, value: toVal });
    }
  }

  return patches;
}

/** Level 2+3: diff entity type buckets, then individual entities */
function diffEntityBuckets(
  from: Record<string, Record<string, unknown>>,
  to: Record<string, Record<string, unknown>>,
  patches: Patch[],
): void {
  const allTypes = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const type of allTypes) {
    const fromBucket = from[type];
    const toBucket = to[type];

    if (fromBucket === toBucket) continue; // Same reference — skip

    if (!fromBucket) {
      // New entity type bucket
      for (const [id, entity] of Object.entries(toBucket)) {
        patches.push({ op: 'add', path: `/entities/${type}/${id}`, value: entity });
      }
    } else if (!toBucket) {
      // Removed entity type bucket
      for (const id of Object.keys(fromBucket)) {
        patches.push({ op: 'remove', path: `/entities/${type}/${id}` });
      }
    } else {
      // Level 3: diff individual entities
      const allIds = new Set([...Object.keys(fromBucket), ...Object.keys(toBucket)]);
      for (const id of allIds) {
        const fromEntity = fromBucket[id];
        const toEntity = toBucket[id];

        if (fromEntity === toEntity) continue;

        if (fromEntity === undefined) {
          patches.push({ op: 'add', path: `/entities/${type}/${id}`, value: toEntity });
        } else if (toEntity === undefined) {
          patches.push({ op: 'remove', path: `/entities/${type}/${id}` });
        } else {
          patches.push({ op: 'replace', path: `/entities/${type}/${id}`, value: toEntity });
        }
      }
    }
  }
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Calculate the diff between two state objects as JSON patches.
 * Returns forward patches (before→after) and reverse patches (after→before).
 */
export function diffStates(before: unknown, after: unknown): { forward: Patch[]; reverse: Patch[] } {
  if (before === after) return { forward: [], reverse: [] };
  return {
    forward: computePatches(before as Record<string, unknown>, after as Record<string, unknown>),
    reverse: computePatches(after as Record<string, unknown>, before as Record<string, unknown>),
  };
}

/**
 * Apply patches to a state object (returns new object with structural sharing).
 * Handles 1-segment (/rootId), 2-segment (/entities/Canvas), and
 * 3-segment (/entities/Canvas/c1) paths.
 */
export function applyPatches<T>(obj: T, patches: Patch[]): T {
  if (!patches || patches.length === 0) return obj;

  // Start with shallow clone of top level
  const result = { ...(obj as Record<string, unknown>) };

  // Track which nested objects we've already cloned to avoid double-cloning
  const clonedL1: Record<string, Record<string, unknown>> = {};
  const clonedL2: Record<string, Record<string, Record<string, unknown>>> = {};

  for (const patch of patches) {
    const pathStr = Array.isArray(patch.path) ? patch.path[0] : patch.path;
    const segments = pathStr.replace(/^\//, '').split('/');

    if (segments.length === 1) {
      // 1-segment: /rootId, /references, etc.
      const key = segments[0];
      switch (patch.op) {
        case 'add':
        case 'replace':
          result[key] = patch.value;
          break;
        case 'remove':
          delete result[key];
          break;
      }
    } else if (segments.length === 2) {
      // 2-segment: /entities/Canvas (rare — bucket-level ops)
      const [l1Key, l2Key] = segments;
      if (!clonedL1[l1Key]) {
        clonedL1[l1Key] = { ...(result[l1Key] as Record<string, unknown>) };
        result[l1Key] = clonedL1[l1Key];
      }
      switch (patch.op) {
        case 'add':
        case 'replace':
          clonedL1[l1Key][l2Key] = patch.value;
          break;
        case 'remove':
          delete clonedL1[l1Key][l2Key];
          break;
      }
    } else if (segments.length >= 3) {
      // 3-segment: /entities/Canvas/c1
      const [l1Key, l2Key, l3Key] = segments;

      // Clone level 1 (entities) if not yet cloned
      if (!clonedL1[l1Key]) {
        clonedL1[l1Key] = { ...(result[l1Key] as Record<string, unknown>) };
        result[l1Key] = clonedL1[l1Key];
      }

      // Clone level 2 (Canvas bucket) if not yet cloned
      const cacheKey = `${l1Key}/${l2Key}`;
      if (!clonedL2[cacheKey]) {
        clonedL2[cacheKey] = { ...(clonedL1[l1Key][l2Key] as Record<string, unknown>) };
        clonedL1[l1Key][l2Key] = clonedL2[cacheKey];
      }

      switch (patch.op) {
        case 'add':
        case 'replace':
          clonedL2[cacheKey][l3Key] = patch.value;
          break;
        case 'remove':
          delete clonedL2[cacheKey][l3Key];
          break;
      }
    }
  }

  return result as T;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/shared/lib/__tests__/jsonPatch.test.ts`
Expected: ALL PASS (both old round-trip tests and new 3-level tests)

**Step 5: Commit**

```bash
git add src/shared/lib/jsonPatch.ts src/shared/lib/__tests__/jsonPatch.test.ts
git commit -m "feat(V2): deepen jsonPatch to 3-level entity diffing with reference equality"
```

---

## Task 2: Update applyPatches tests for 3-segment paths

**Files:**
- Modify: `src/shared/lib/__tests__/jsonPatch.test.ts`

**Context:** Task 1 updated `applyPatches()` to handle 3-segment paths. Now add explicit round-trip tests with NormalizedState-like structure.

**Step 1: Add round-trip tests for 3-level patches**

Add to the `round-trip` describe block:

```typescript
it('round-trips a single entity change through 3-level patches', () => {
  const canvas1 = { id: 'c1', label: { en: ['Original'] } };
  const canvas2 = { id: 'c2', label: { en: ['Untouched'] } };
  const before = {
    entities: { Canvas: { c1: canvas1, c2: canvas2 }, Manifest: {} },
    rootId: 'm1',
    references: { m1: ['c1', 'c2'] },
  };

  const updatedCanvas = { ...canvas1, label: { en: ['Changed'] } };
  const after = {
    entities: { Canvas: { c1: updatedCanvas, c2: canvas2 }, Manifest: {} },
    rootId: 'm1',
    references: { m1: ['c1', 'c2'] },
  };

  const { forward, reverse } = diffStates(before, after);
  // Forward transforms before → after
  const applied = applyPatches(before, forward);
  expect(applied.entities.Canvas.c1).toEqual(updatedCanvas);
  expect(applied.entities.Canvas.c2).toBe(canvas2); // Same reference — structural sharing
  expect(applied.rootId).toBe('m1');

  // Reverse transforms after → before
  const reverted = applyPatches(after, reverse);
  expect(reverted.entities.Canvas.c1).toEqual(canvas1);
});

it('applyPatches preserves structural sharing for unchanged buckets', () => {
  const manifestBucket = { m1: { id: 'm1', type: 'Manifest' } };
  const before = {
    entities: { Canvas: { c1: { id: 'c1' } }, Manifest: manifestBucket },
    rootId: 'm1',
  };
  const patches: Patch[] = [
    { op: 'replace', path: '/entities/Canvas/c1', value: { id: 'c1', label: 'new' } },
  ];

  const result = applyPatches(before, patches);
  // Manifest bucket should be the same reference (structural sharing)
  expect(result.entities.Manifest).toBe(manifestBucket);
  // Canvas bucket should be a new reference (it was cloned)
  expect(result.entities.Canvas).not.toBe(before.entities.Canvas);
});
```

**Step 2: Run tests**

Run: `npx vitest run src/shared/lib/__tests__/jsonPatch.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/shared/lib/__tests__/jsonPatch.test.ts
git commit -m "test(V2): add round-trip tests for 3-level entity patch application"
```

---

## Task 3: Verify integration with ActionHistory (existing tests)

**Files:**
- Test: `src/shared/stores/__tests__/vault-dispatch-history.test.ts`

**Context:** V1 wrote 11 integration tests for VaultStore dispatch + ActionHistory. These tests exercise `diffStates()` and `applyPatches()` indirectly through the full dispatch → push → undo → redo cycle. After Task 1's jsonPatch rewrite, ALL existing tests must still pass — this confirms backward compatibility.

**Step 1: Run the integration tests**

Run: `npx vitest run src/shared/stores/__tests__/vault-dispatch-history.test.ts`
Expected: ALL 11 PASS — the integration test suite validates that:
- `pushPatched()` calls `diffStates()` which now produces entity-level patches
- `undoPatched()` calls `applyPatches()` which now handles 3-segment paths
- `redoPatched()` calls `applyPatches()` which now handles 3-segment paths
- Coalescing, RELOAD_TREE snapshot, redo truncation all still work

If any test fails, fix the issue before proceeding.

**Step 2: Add a patch granularity assertion test**

Add to `vault-dispatch-history.test.ts`:

```typescript
it('produces entity-level patches (not full-state replacements)', () => {
  const annotation = makeAnnotation(canvasId);
  const beforeState = vault.getState();

  dispatchWithHistory(vault, history, {
    type: 'ADD_ANNOTATION',
    canvasId,
    annotation,
  });

  // Inspect the history entry's patches
  const recent = history.getRecent(1);
  expect(recent).toHaveLength(1);

  const entry = recent[0];
  // Patches should target specific entities, not entire top-level keys
  for (const patch of entry.forwardPatches) {
    const pathStr = Array.isArray(patch.path) ? patch.path[0] : patch.path;
    const segments = pathStr.replace(/^\//, '').split('/');
    // Entity patches should be 3-segment (/entities/Type/id)
    // or structural patches for references/typeIndex (1-segment)
    expect(segments.length === 3 || segments.length === 1).toBe(true);
    // Should NOT be a 1-segment /entities (that's the old shallow diff)
    if (segments.length === 1) {
      expect(segments[0]).not.toBe('entities');
    }
  }
});
```

**Step 3: Run tests**

Run: `npx vitest run src/shared/stores/__tests__/vault-dispatch-history.test.ts`
Expected: ALL 12 PASS

**Step 4: Commit**

```bash
git add src/shared/stores/__tests__/vault-dispatch-history.test.ts
git commit -m "test(V2): verify entity-level patch granularity in integration tests"
```

---

## Task 4: Delete deprecated ActionHistory methods

**Files:**
- Modify: `src/entities/manifest/model/actions/index.ts`
- Modify: `src/entities/manifest/model/actions/types.ts`

**Context:** V1 left `undo()`, `redo()`, and `push()` with `@deprecated` markers. No callers remain. Also delete `LegacyHistoryEntry` from types.

**Step 1: Delete deprecated methods from ActionHistory**

In `src/entities/manifest/model/actions/index.ts`, delete:
- The `push()` method (lines 160-163, `@deprecated`)
- The `undo()` method (lines 217-221, `@deprecated`)
- The `redo()` method (lines 223-227, `@deprecated`)

In `src/entities/manifest/model/actions/types.ts`, delete:
- The `LegacyHistoryEntry` interface (lines 82-88, `@deprecated`)

**Step 2: Verify no callers**

Run: `npx vitest run`
Expected: ALL tests pass (no callers of deprecated methods)

Also verify with grep:
```bash
# Should find zero results (only the definitions we just deleted)
```
Grep for `\.push\(` in test files to make sure no test calls the deprecated push method directly (the integration tests use `pushPatched()` which is the correct API).

**Step 3: Commit**

```bash
git add src/entities/manifest/model/actions/index.ts src/entities/manifest/model/actions/types.ts
git commit -m "refactor(V2): delete deprecated undo/redo/push methods and LegacyHistoryEntry type"
```

---

## Task 5: Full verification

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL tests pass (4972+)

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Lint**

Run: `npx eslint src/ --quiet`
Expected: 0 errors

**Step 4: Commit any fixes if needed**

If any issues found, fix and commit before proceeding.

---

## Task 6: Record learnings in mulch

**Step 1: Record conventions**

```bash
mulch learn
mulch record vault --type convention --description "jsonPatch uses 3-level reference equality diffing: NormalizedState keys → entity type buckets → individual entities. No JSON.stringify. Patches are 3-segment: /entities/Type/id."
mulch sync
```
