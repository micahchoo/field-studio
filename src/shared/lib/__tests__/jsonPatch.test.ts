/**
 * JSON Patch Tests
 *
 * Tests the minimal JSON Patch implementation used for undo/redo
 * action history tracking. Validates diff computation, patch
 * application, and round-trip correctness.
 */

import { describe, it, expect } from 'vitest';
import { diffStates, applyPatches } from '../jsonPatch';
import type { Patch } from '../jsonPatch';

describe('jsonPatch', () => {
  // ====================================================================
  // diffStates
  // ====================================================================

  describe('diffStates', () => {
    it('returns forward and reverse patches for changed objects', () => {
      const before = { name: 'Alice', age: 30 };
      const after = { name: 'Bob', age: 30 };

      const { forward, reverse } = diffStates(before, after);
      expect(forward).toHaveLength(1);
      expect(forward[0]).toEqual({ op: 'replace', path: '/name', value: 'Bob' });
      expect(reverse).toHaveLength(1);
      expect(reverse[0]).toEqual({ op: 'replace', path: '/name', value: 'Alice' });
    });

    it('returns empty arrays when objects are identical (same reference)', () => {
      const obj = { a: 1, b: 2 };
      const { forward, reverse } = diffStates(obj, obj);
      expect(forward).toEqual([]);
      expect(reverse).toEqual([]);
    });

    it('returns empty arrays when objects are structurally equal', () => {
      const before = { x: 1 };
      const after = { x: 1 };
      const { forward, reverse } = diffStates(before, after);
      expect(forward).toEqual([]);
      expect(reverse).toEqual([]);
    });

    it('produces add patch for a new key', () => {
      const before = { a: 1 };
      const after = { a: 1, b: 2 };
      const { forward } = diffStates(before, after);
      const addPatch = forward.find(p => p.op === 'add');
      expect(addPatch).toBeDefined();
      expect(addPatch!.path).toBe('/b');
      expect(addPatch!.value).toBe(2);
    });

    it('produces remove patch for a missing key', () => {
      const before = { a: 1, b: 2 };
      const after = { a: 1 };
      const { forward } = diffStates(before, after);
      const removePatch = forward.find(p => p.op === 'remove');
      expect(removePatch).toBeDefined();
      expect(removePatch!.path).toBe('/b');
    });

    it('produces replace patch for a changed value', () => {
      const before = { color: 'red' };
      const after = { color: 'blue' };
      const { forward } = diffStates(before, after);
      expect(forward).toEqual([{ op: 'replace', path: '/color', value: 'blue' }]);
    });
  });

  // ====================================================================
  // 3-level entity diffing
  // ====================================================================

  describe('3-level entity diffing', () => {
    // Shared entity objects — reference identity matters
    const canvas1 = { id: 'c1', type: 'Canvas', label: { en: ['Page 1'] } };
    const canvas2 = { id: 'c2', type: 'Canvas', label: { en: ['Page 2'] } };
    const manifest1 = { id: 'm1', type: 'Manifest', label: { en: ['Book'] } };
    const annotation1 = { id: 'a1', type: 'Annotation', body: { value: 'hello' } };

    // Shared references for non-entity top-level keys.
    // Reference equality (`!==`) means each call to makeState must reuse
    // the same objects for keys that haven't changed.
    const sharedRefs = Object.freeze({
      references: {},
      reverseRefs: {},
      collectionMembers: {},
      memberOfCollections: {},
      typeIndex: { m1: 'Manifest', c1: 'Canvas', c2: 'Canvas', a1: 'Annotation' },
      extensions: {},
      trashedEntities: {},
    });

    function makeState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        entities: {
          Collection: {},
          Manifest: { m1: manifest1 },
          Canvas: { c1: canvas1, c2: canvas2 },
          Range: {},
          AnnotationPage: {},
          Annotation: { a1: annotation1 },
        },
        ...sharedRefs,
        rootId: 'm1',
        ...overrides,
      };
    }

    it('single entity change produces /entities/Canvas/c1 path', () => {
      const before = makeState();
      const canvas1Modified = { ...canvas1, label: { en: ['Page 1 (edited)'] } };
      const after = makeState({
        entities: {
          ...(before.entities as Record<string, unknown>),
          Canvas: { c1: canvas1Modified, c2: canvas2 },
        },
      });

      const { forward } = diffStates(before, after);
      expect(forward).toHaveLength(1);
      expect(forward[0]).toEqual({
        op: 'replace',
        path: '/entities/Canvas/c1',
        value: canvas1Modified,
      });
    });

    it('unchanged buckets are skipped via reference equality', () => {
      const sharedBuckets = {
        Collection: {},
        Manifest: { m1: manifest1 },
        Range: {},
        AnnotationPage: {},
        Annotation: { a1: annotation1 },
      };
      const canvas1Modified = { ...canvas1, label: { en: ['Renamed'] } };

      const before = makeState({
        entities: { ...sharedBuckets, Canvas: { c1: canvas1, c2: canvas2 } },
      });
      const after = makeState({
        entities: { ...sharedBuckets, Canvas: { c1: canvas1Modified, c2: canvas2 } },
      });

      const { forward } = diffStates(before, after);
      // Only the changed entity — no patches for Collection, Manifest, etc.
      expect(forward).toHaveLength(1);
      expect(forward[0].path).toBe('/entities/Canvas/c1');
    });

    it('detects added entity in a bucket', () => {
      const before = makeState();
      const canvas3 = { id: 'c3', type: 'Canvas', label: { en: ['Page 3'] } };
      const after = makeState({
        entities: {
          ...(before.entities as Record<string, unknown>),
          Canvas: { c1: canvas1, c2: canvas2, c3: canvas3 },
        },
      });

      const { forward, reverse } = diffStates(before, after);
      const addPatch = forward.find(p => p.op === 'add');
      expect(addPatch).toBeDefined();
      expect(addPatch!.path).toBe('/entities/Canvas/c3');
      expect(addPatch!.value).toBe(canvas3);

      const removePatch = reverse.find(p => p.op === 'remove');
      expect(removePatch).toBeDefined();
      expect(removePatch!.path).toBe('/entities/Canvas/c3');
    });

    it('detects removed entity from a bucket', () => {
      const before = makeState();
      const after = makeState({
        entities: {
          ...(before.entities as Record<string, unknown>),
          Canvas: { c1: canvas1 },
        },
      });

      const { forward, reverse } = diffStates(before, after);
      const removePatch = forward.find(p => p.op === 'remove');
      expect(removePatch).toBeDefined();
      expect(removePatch!.path).toBe('/entities/Canvas/c2');

      const addPatch = reverse.find(p => p.op === 'add');
      expect(addPatch).toBeDefined();
      expect(addPatch!.path).toBe('/entities/Canvas/c2');
      expect(addPatch!.value).toBe(canvas2);
    });

    it('non-entities top-level key change (rootId)', () => {
      const before = makeState({ rootId: 'm1' });
      const after = makeState({ rootId: 'm2' });

      const { forward } = diffStates(before, after);
      const rootPatch = forward.find(p => p.path === '/rootId');
      expect(rootPatch).toBeDefined();
      expect(rootPatch).toEqual({ op: 'replace', path: '/rootId', value: 'm2' });
    });

    it('reference inequality: different objects with same content detected as changed', () => {
      const canvas1Copy = { id: 'c1', type: 'Canvas', label: { en: ['Page 1'] } };
      // canvas1Copy !== canvas1 by reference even though content is equal

      const before = makeState();
      const after = makeState({
        entities: {
          ...(before.entities as Record<string, unknown>),
          Canvas: { c1: canvas1Copy, c2: canvas2 },
        },
      });

      const { forward } = diffStates(before, after);
      const canvasPatch = forward.find(p => p.path === '/entities/Canvas/c1');
      expect(canvasPatch).toBeDefined();
      expect(canvasPatch!.op).toBe('replace');
      expect(canvasPatch!.value).toBe(canvas1Copy);
    });

    it('no patches when all references are identical', () => {
      const entitiesObj = {
        Collection: {},
        Manifest: { m1: manifest1 },
        Canvas: { c1: canvas1, c2: canvas2 },
        Range: {},
        AnnotationPage: {},
        Annotation: { a1: annotation1 },
      };
      const before = makeState({ entities: entitiesObj });
      const after = makeState({ entities: entitiesObj });

      const { forward, reverse } = diffStates(before, after);
      expect(forward).toEqual([]);
      expect(reverse).toEqual([]);
    });

    it('detects added entity type bucket', () => {
      const entitiesBefore = {
        Collection: {},
        Manifest: { m1: manifest1 },
        Canvas: { c1: canvas1 },
        Range: {},
        AnnotationPage: {},
        Annotation: {},
      };
      const entitiesAfter = {
        ...entitiesBefore,
        Annotation: { a1: annotation1 },
      };
      // Annotation bucket changed from {} to {a1: ...}
      // Since the bucket ref changed, we diff inside
      const before = makeState({ entities: entitiesBefore });
      const after = makeState({ entities: entitiesAfter });

      const { forward } = diffStates(before, after);
      const addPatch = forward.find(p => p.path === '/entities/Annotation/a1');
      expect(addPatch).toBeDefined();
      expect(addPatch!.op).toBe('add');
      expect(addPatch!.value).toBe(annotation1);
    });

    it('detects removed entity type bucket', () => {
      const before = makeState();
      const entitiesWithout = {
        ...(before.entities as Record<string, Record<string, unknown>>),
      };
      delete entitiesWithout.Annotation;
      const after = makeState({ entities: entitiesWithout });

      const { forward, reverse } = diffStates(before, after);
      const removePatch = forward.find(p => p.path === '/entities/Annotation');
      expect(removePatch).toBeDefined();
      expect(removePatch!.op).toBe('remove');

      const addPatch = reverse.find(p => p.path === '/entities/Annotation');
      expect(addPatch).toBeDefined();
      expect(addPatch!.op).toBe('add');
    });

    it('added top-level entity type bucket', () => {
      const entitiesBefore = {
        Collection: {},
        Manifest: { m1: manifest1 },
        Canvas: { c1: canvas1 },
        Range: {},
        AnnotationPage: {},
        // No Annotation bucket
      };
      const entitiesAfter = {
        ...entitiesBefore,
        Annotation: { a1: annotation1 },
      };
      const before = makeState({ entities: entitiesBefore });
      const after = makeState({ entities: entitiesAfter });

      const { forward } = diffStates(before, after);
      const addPatch = forward.find(p => p.path === '/entities/Annotation');
      expect(addPatch).toBeDefined();
      expect(addPatch!.op).toBe('add');
      expect(addPatch!.value).toEqual({ a1: annotation1 });
    });
  });

  // ====================================================================
  // applyPatches
  // ====================================================================

  describe('applyPatches', () => {
    it('applies add patch correctly', () => {
      const obj = { a: 1 };
      const patches: Patch[] = [{ op: 'add', path: '/b', value: 2 }];
      const result = applyPatches(obj, patches);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('applies remove patch correctly', () => {
      const obj = { a: 1, b: 2 };
      const patches: Patch[] = [{ op: 'remove', path: '/b' }];
      const result = applyPatches(obj, patches);
      expect(result).toEqual({ a: 1 });
      expect(result).not.toHaveProperty('b');
    });

    it('applies replace patch correctly', () => {
      const obj = { a: 1 };
      const patches: Patch[] = [{ op: 'replace', path: '/a', value: 99 }];
      const result = applyPatches(obj, patches);
      expect(result).toEqual({ a: 99 });
    });

    it('returns original object when patches array is empty', () => {
      const obj = { x: 'hello' };
      expect(applyPatches(obj, [])).toBe(obj);
    });

    it('returns original object when patches is null/undefined', () => {
      const obj = { x: 'hello' };
      expect(applyPatches(obj, null as unknown as Patch[])).toBe(obj);
    });

    it('handles path as string[] (array format for __full__ sentinel)', () => {
      const obj = { a: 1 };
      const patches: Patch[] = [{ op: 'add', path: ['/b'], value: 42 }];
      const result = applyPatches(obj, patches);
      expect(result).toEqual({ a: 1, b: 42 });
    });

    it('applies 2-segment path (entity bucket level)', () => {
      const canvas1 = { id: 'c1', label: 'Page 1' };
      const obj = {
        entities: { Canvas: { c1: canvas1 }, Manifest: {} },
        rootId: 'm1',
      };
      const newCanvasBucket = { c1: canvas1, c2: { id: 'c2', label: 'Page 2' } };
      const patches: Patch[] = [
        { op: 'replace', path: '/entities/Canvas', value: newCanvasBucket },
      ];
      const result = applyPatches(obj, patches);
      expect(result.entities.Canvas).toBe(newCanvasBucket);
      // Structural sharing: Manifest bucket untouched
      expect(result.entities.Manifest).toBe(obj.entities.Manifest);
    });

    it('applies 3-segment path (individual entity level)', () => {
      const canvas1 = { id: 'c1', label: 'Page 1' };
      const canvas2 = { id: 'c2', label: 'Page 2' };
      const manifest1 = { id: 'm1', label: 'Book' };
      const obj = {
        entities: {
          Canvas: { c1: canvas1, c2: canvas2 },
          Manifest: { m1: manifest1 },
        },
        rootId: 'm1',
      };
      const canvas1Modified = { id: 'c1', label: 'Page 1 (edited)' };
      const patches: Patch[] = [
        { op: 'replace', path: '/entities/Canvas/c1', value: canvas1Modified },
      ];
      const result = applyPatches(obj, patches);
      expect(result.entities.Canvas.c1).toBe(canvas1Modified);
      // Structural sharing: sibling entity untouched
      expect(result.entities.Canvas.c2).toBe(canvas2);
      // Structural sharing: sibling bucket untouched
      expect(result.entities.Manifest).toBe(obj.entities.Manifest);
      // rootId untouched
      expect(result.rootId).toBe('m1');
    });

    it('applies add at 3-segment path', () => {
      const obj = {
        entities: { Canvas: { c1: { id: 'c1' } } as Record<string, unknown>, Manifest: {} },
        rootId: null,
      };
      const newCanvas = { id: 'c2', label: 'New' };
      const patches: Patch[] = [
        { op: 'add', path: '/entities/Canvas/c2', value: newCanvas },
      ];
      const result = applyPatches(obj, patches);
      expect(result.entities.Canvas.c2).toBe(newCanvas);
      expect(result.entities.Canvas.c1).toBe(obj.entities.Canvas.c1);
    });

    it('applies remove at 3-segment path', () => {
      const canvas1 = { id: 'c1' };
      const canvas2 = { id: 'c2' };
      const obj = {
        entities: { Canvas: { c1: canvas1, c2: canvas2 }, Manifest: {} },
        rootId: null,
      };
      const patches: Patch[] = [
        { op: 'remove', path: '/entities/Canvas/c2' },
      ];
      const result = applyPatches(obj, patches);
      expect(result.entities.Canvas.c1).toBe(canvas1);
      expect(result.entities.Canvas).not.toHaveProperty('c2');
      expect(result.entities.Manifest).toBe(obj.entities.Manifest);
    });

    it('applies add at 2-segment path (new bucket)', () => {
      const obj = {
        entities: { Canvas: {}, Manifest: {} } as Record<string, Record<string, unknown>>,
        rootId: null,
      };
      const annotationBucket = { a1: { id: 'a1', body: 'hello' } };
      const patches: Patch[] = [
        { op: 'add', path: '/entities/Annotation', value: annotationBucket },
      ];
      const result = applyPatches(obj, patches);
      expect(result.entities.Annotation).toBe(annotationBucket);
      expect(result.entities.Canvas).toBe(obj.entities.Canvas);
    });

    it('applies remove at 2-segment path (remove bucket)', () => {
      const canvasBucket = { c1: { id: 'c1' } };
      const obj = {
        entities: { Canvas: canvasBucket, Manifest: {} },
        rootId: null,
      };
      const patches: Patch[] = [
        { op: 'remove', path: '/entities/Canvas' },
      ];
      const result = applyPatches(obj, patches);
      expect(result.entities).not.toHaveProperty('Canvas');
      expect(result.entities.Manifest).toBe(obj.entities.Manifest);
    });

    it('does not double-clone when multiple patches target the same bucket', () => {
      const canvas1 = { id: 'c1', label: 'One' };
      const canvas2 = { id: 'c2', label: 'Two' };
      const manifest1 = { id: 'm1' };
      const obj = {
        entities: {
          Canvas: { c1: canvas1, c2: canvas2 },
          Manifest: { m1: manifest1 },
        },
      };
      const c1New = { id: 'c1', label: 'One (edited)' };
      const c2New = { id: 'c2', label: 'Two (edited)' };
      const patches: Patch[] = [
        { op: 'replace', path: '/entities/Canvas/c1', value: c1New },
        { op: 'replace', path: '/entities/Canvas/c2', value: c2New },
      ];
      const result = applyPatches(obj, patches);
      expect(result.entities.Canvas.c1).toBe(c1New);
      expect(result.entities.Canvas.c2).toBe(c2New);
      expect(result.entities.Manifest).toBe(obj.entities.Manifest);
    });
  });

  // ====================================================================
  // Round-trip
  // ====================================================================

  describe('round-trip', () => {
    it('forward patches transform before into after', () => {
      const before = { title: 'Old', count: 5 };
      const after = { title: 'New', count: 5, extra: true };
      const { forward } = diffStates(before, after);
      const result = applyPatches(before, forward);
      expect(result).toEqual(after);
    });

    it('reverse patches transform after back into before', () => {
      const before = { title: 'Old', count: 5 };
      const after = { title: 'New', count: 5, extra: true };
      const { reverse } = diffStates(before, after);
      const result = applyPatches(after, reverse);
      expect(result).toEqual(before);
    });

    it('round-trip with 3-level entity patches preserves structural sharing', () => {
      const canvas1 = { id: 'c1', type: 'Canvas', label: { en: ['Page 1'] } };
      const canvas2 = { id: 'c2', type: 'Canvas', label: { en: ['Page 2'] } };
      const manifest1 = { id: 'm1', type: 'Manifest', label: { en: ['Book'] } };

      const before = {
        entities: {
          Canvas: { c1: canvas1, c2: canvas2 },
          Manifest: { m1: manifest1 },
          Collection: {},
        },
        rootId: 'm1',
        references: { m1: ['c1', 'c2'] },
      };

      const canvas1Edited = { id: 'c1', type: 'Canvas', label: { en: ['Page 1 (edited)'] } };
      const after = {
        entities: {
          Canvas: { c1: canvas1Edited, c2: canvas2 },
          Manifest: { m1: manifest1 },
          Collection: {},
        },
        rootId: 'm1',
        references: { m1: ['c1', 'c2'] },
      };

      const { forward, reverse } = diffStates(before, after);

      // Forward: before -> after
      const applied = applyPatches(before, forward);
      expect(applied).toEqual(after);
      // Structural sharing: unchanged bucket preserved
      expect(applied.entities.Manifest).toBe(before.entities.Manifest);
      // Structural sharing: unchanged sibling entity preserved
      expect(applied.entities.Canvas.c2).toBe(canvas2);

      // Reverse: after -> before
      const reverted = applyPatches(after, reverse);
      expect(reverted).toEqual(before);
      expect(reverted.entities.Manifest).toBe(after.entities.Manifest);
      expect(reverted.entities.Canvas.c2).toBe(canvas2);
    });

    it('round-trip with entity add and remove', () => {
      const canvas1 = { id: 'c1', label: 'Page 1' };
      const canvas2 = { id: 'c2', label: 'Page 2' };
      const canvas3 = { id: 'c3', label: 'Page 3' };

      const before = {
        entities: {
          Canvas: { c1: canvas1, c2: canvas2 },
          Manifest: {},
        },
        rootId: 'm1',
      };

      const after = {
        entities: {
          Canvas: { c1: canvas1, c3: canvas3 },
          Manifest: {},
        },
        rootId: 'm1',
      };

      const { forward, reverse } = diffStates(before, after);

      // Forward should have remove c2 + add c3
      expect(forward.find(p => p.op === 'remove' && p.path === '/entities/Canvas/c2')).toBeDefined();
      expect(forward.find(p => p.op === 'add' && p.path === '/entities/Canvas/c3')).toBeDefined();

      const applied = applyPatches(before, forward);
      expect(applied).toEqual(after);

      const reverted = applyPatches(after, reverse);
      expect(reverted).toEqual(before);
    });

    it('round-trip with URI-based entity IDs containing slashes', () => {
      const manifest = { id: 'https://example.org/manifest/1', type: 'Manifest', label: { en: ['Test'] } };
      const canvas = { id: 'https://example.org/canvas/1', type: 'Canvas', label: { en: ['Page 1'] } };

      const before = {
        entities: {
          Canvas: { 'https://example.org/canvas/1': canvas },
          Manifest: { 'https://example.org/manifest/1': manifest },
          Annotation: {} as Record<string, unknown>,
        },
        rootId: 'https://example.org/manifest/1',
        typeIndex: { 'https://example.org/manifest/1': 'Manifest', 'https://example.org/canvas/1': 'Canvas' },
        references: { 'https://example.org/manifest/1': ['https://example.org/canvas/1'] },
      };

      const annotation = { id: 'https://example.org/canvas/1/anno/1', type: 'Annotation', body: 'Hi' };
      const after = {
        entities: {
          Canvas: { 'https://example.org/canvas/1': canvas },
          Manifest: { 'https://example.org/manifest/1': manifest },
          Annotation: { 'https://example.org/canvas/1/anno/1': annotation } as Record<string, unknown>,
        },
        rootId: 'https://example.org/manifest/1',
        typeIndex: {
          'https://example.org/manifest/1': 'Manifest',
          'https://example.org/canvas/1': 'Canvas',
          'https://example.org/canvas/1/anno/1': 'Annotation',
        },
        references: {
          'https://example.org/manifest/1': ['https://example.org/canvas/1'],
          'https://example.org/canvas/1': ['https://example.org/canvas/1/anno/1'],
        },
      };

      const { forward, reverse } = diffStates(before, after);

      // Forward: add annotation entity + update typeIndex + update references
      expect(forward.length).toBeGreaterThan(0);

      const applied = applyPatches(before, forward);
      expect(applied).toEqual(after);

      const reverted = applyPatches(after, reverse);
      expect(reverted).toEqual(before);
    });

    it('round-trip with mixed entity and top-level changes', () => {
      const canvas1 = { id: 'c1', label: 'Page 1' };
      const before = {
        entities: { Canvas: { c1: canvas1 }, Manifest: {} },
        rootId: 'm1',
        references: {},
      };

      const canvas1Edited = { id: 'c1', label: 'Page 1 (edited)' };
      const after = {
        entities: { Canvas: { c1: canvas1Edited }, Manifest: {} },
        rootId: 'm2',
        references: {},
      };

      const { forward, reverse } = diffStates(before, after);

      // Should have entity patch + rootId patch
      expect(forward.find(p => p.path === '/entities/Canvas/c1')).toBeDefined();
      expect(forward.find(p => p.path === '/rootId')).toBeDefined();

      const applied = applyPatches(before, forward);
      expect(applied).toEqual(after);

      const reverted = applyPatches(after, reverse);
      expect(reverted).toEqual(before);
    });
  });
});
