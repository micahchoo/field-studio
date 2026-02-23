/**
 * QC Dashboard Helpers — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type { IIIFItem } from '@/src/shared/types';
import {
  calculateHealthScore,
  getHealthColor,
  getHealthBgColor,
  getSeverityClasses,
  findItemById,
  findItemAndPath,
} from '../lib/qcHelpers';

// ---------------------------------------------------------------------------
// Test fixture helper
// ---------------------------------------------------------------------------

/** Create a minimal IIIFItem for testing. */
function makeItem(id: string, type: string, items?: IIIFItem[]): IIIFItem {
  return {
    id,
    type: type as IIIFItem['type'],
    label: { en: [id] },
    ...(items ? { items } : {}),
  };
}

// ===========================================================================
// calculateHealthScore
// ===========================================================================

describe('calculateHealthScore', () => {
  it('returns 100 when totalItems is 0', () => {
    expect(calculateHealthScore(0, 0)).toBe(100);
    expect(calculateHealthScore(5, 0)).toBe(100);
  });

  it('returns 0 when all items are errors', () => {
    expect(calculateHealthScore(10, 10)).toBe(0);
  });

  it('returns 100 when there are no errors', () => {
    expect(calculateHealthScore(0, 50)).toBe(100);
  });

  it('returns 50 when half the items have errors', () => {
    expect(calculateHealthScore(5, 10)).toBe(50);
  });

  it('rounds to the nearest integer', () => {
    // (10 - 3) / 10 = 0.7 -> 70
    expect(calculateHealthScore(3, 10)).toBe(70);
    // (3 - 1) / 3 = 0.6667 -> 67
    expect(calculateHealthScore(1, 3)).toBe(67);
  });

  it('clamps to 0 when errorCount exceeds totalItems', () => {
    expect(calculateHealthScore(20, 10)).toBe(0);
  });
});

// ===========================================================================
// getHealthColor
// ===========================================================================

describe('getHealthColor', () => {
  it('returns green for scores >= 80', () => {
    expect(getHealthColor(80)).toBe('text-green-600');
    expect(getHealthColor(100)).toBe('text-green-600');
  });

  it('returns orange for scores >= 50 and < 80', () => {
    expect(getHealthColor(50)).toBe('text-orange-500');
    expect(getHealthColor(79)).toBe('text-orange-500');
  });

  it('returns red for scores < 50', () => {
    expect(getHealthColor(0)).toBe('text-red-600');
    expect(getHealthColor(49)).toBe('text-red-600');
  });
});

// ===========================================================================
// getHealthBgColor
// ===========================================================================

describe('getHealthBgColor', () => {
  it('returns green bg for scores >= 80', () => {
    expect(getHealthBgColor(80)).toBe('bg-green-50');
    expect(getHealthBgColor(100)).toBe('bg-green-50');
  });

  it('returns orange bg for scores >= 50 and < 80', () => {
    expect(getHealthBgColor(50)).toBe('bg-orange-50');
    expect(getHealthBgColor(79)).toBe('bg-orange-50');
  });

  it('returns red bg for scores < 50', () => {
    expect(getHealthBgColor(0)).toBe('bg-red-50');
    expect(getHealthBgColor(49)).toBe('bg-red-50');
  });
});

// ===========================================================================
// getSeverityClasses
// ===========================================================================

describe('getSeverityClasses', () => {
  it('returns red classes for error level', () => {
    const classes = getSeverityClasses('error');
    expect(classes.bg).toBe('bg-red-50');
    expect(classes.text).toBe('text-red-700');
    expect(classes.border).toBe('border-red-200');
  });

  it('returns orange classes for warning level', () => {
    const classes = getSeverityClasses('warning');
    expect(classes.bg).toBe('bg-orange-50');
    expect(classes.text).toBe('text-orange-700');
    expect(classes.border).toBe('border-orange-200');
  });

  it('returns blue classes for info level', () => {
    const classes = getSeverityClasses('info');
    expect(classes.bg).toBe('bg-blue-50');
    expect(classes.text).toBe('text-blue-700');
    expect(classes.border).toBe('border-blue-200');
  });

  it('returns gray classes for unknown level', () => {
    const classes = getSeverityClasses('critical');
    expect(classes.bg).toBe('bg-gray-50');
    expect(classes.text).toBe('text-gray-700');
    expect(classes.border).toBe('border-gray-200');
  });
});

// ===========================================================================
// findItemById
// ===========================================================================

describe('findItemById', () => {
  it('returns null for null root', () => {
    expect(findItemById(null, 'x')).toBeNull();
  });

  it('finds the root item itself', () => {
    const root = makeItem('root', 'Collection');
    expect(findItemById(root, 'root')).toBe(root);
  });

  it('finds a nested item at depth 2', () => {
    const child = makeItem('child', 'Canvas');
    const manifest = makeItem('manifest', 'Manifest', [child]);
    const root = makeItem('root', 'Collection', [manifest]);
    expect(findItemById(root, 'child')).toBe(child);
  });

  it('finds a nested item at depth 3', () => {
    const leaf = makeItem('leaf', 'Canvas');
    const range = makeItem('range', 'Range', [leaf]);
    const manifest = makeItem('manifest', 'Manifest', [range]);
    const root = makeItem('root', 'Collection', [manifest]);
    expect(findItemById(root, 'leaf')).toBe(leaf);
  });

  it('returns null when item is not found', () => {
    const root = makeItem('root', 'Collection', [
      makeItem('a', 'Manifest'),
    ]);
    expect(findItemById(root, 'nonexistent')).toBeNull();
  });

  it('handles cycles without infinite loop', () => {
    const a = makeItem('a', 'Collection');
    const b = makeItem('b', 'Manifest');
    // Create a cycle: a -> b -> a
    a.items = [b];
    b.items = [a];

    // Should not hang; returns null because 'z' doesn't exist
    expect(findItemById(a, 'z')).toBeNull();
    // Should still find 'b' despite the cycle
    expect(findItemById(a, 'b')).toBe(b);
  });
});

// ===========================================================================
// findItemAndPath
// ===========================================================================

describe('findItemAndPath', () => {
  it('returns empty result for null root', () => {
    const result = findItemAndPath(null, 'x');
    expect(result.item).toBeNull();
    expect(result.path).toEqual([]);
  });

  it('finds the root item with a single-element path', () => {
    const root = makeItem('root', 'Collection');
    const result = findItemAndPath(root, 'root');
    expect(result.item).toBe(root);
    expect(result.path).toHaveLength(1);
    expect(result.path[0]).toEqual({ id: 'root', label: 'root', type: 'Collection' });
  });

  it('finds a nested item and builds the correct path', () => {
    const leaf = makeItem('leaf', 'Canvas');
    const manifest = makeItem('manifest', 'Manifest', [leaf]);
    const root = makeItem('root', 'Collection', [manifest]);

    const result = findItemAndPath(root, 'leaf');
    expect(result.item).toBe(leaf);
    expect(result.path).toEqual([
      { id: 'root', label: 'root', type: 'Collection' },
      { id: 'manifest', label: 'manifest', type: 'Manifest' },
      { id: 'leaf', label: 'leaf', type: 'Canvas' },
    ]);
  });

  it('returns empty result when target is not found', () => {
    const root = makeItem('root', 'Collection', [
      makeItem('a', 'Manifest'),
    ]);
    const result = findItemAndPath(root, 'nonexistent');
    expect(result.item).toBeNull();
    expect(result.path).toEqual([]);
  });

  it('handles cycles without infinite loop', () => {
    const a = makeItem('a', 'Collection');
    const b = makeItem('b', 'Manifest');
    a.items = [b];
    b.items = [a];

    const result = findItemAndPath(a, 'z');
    expect(result.item).toBeNull();
    expect(result.path).toEqual([]);
  });

  it('builds path through deep nesting (depth 3)', () => {
    const d3 = makeItem('d3', 'Canvas');
    const d2 = makeItem('d2', 'Range', [d3]);
    const d1 = makeItem('d1', 'Manifest', [d2]);
    const d0 = makeItem('d0', 'Collection', [d1]);

    const result = findItemAndPath(d0, 'd3');
    expect(result.item).toBe(d3);
    expect(result.path).toHaveLength(4);
    expect(result.path.map((p) => p.id)).toEqual(['d0', 'd1', 'd2', 'd3']);
  });
});
