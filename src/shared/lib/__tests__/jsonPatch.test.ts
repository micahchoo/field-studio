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
  });
});
