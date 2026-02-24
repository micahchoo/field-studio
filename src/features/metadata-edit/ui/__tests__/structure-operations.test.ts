/**
 * Structure Operations Tests
 *
 * Tests the pure CRUD logic extracted from StructureTabPanel for
 * IIIF Range/Structure operations. These are framework-agnostic tree
 * operations that can be tested without any DOM or component rendering.
 *
 * Covers: createRange, getNestedRanges, getCanvasRefs,
 *         updateRangeInList, deleteRangeFromList, reorderStructures
 */

import { describe, it, expect } from 'vitest';
import type { IIIFRange, IIIFRangeReference } from '@/src/shared/types';

// ------------------------------------------------------------------
// Local type alias
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Functions under test (extracted from StructureTabPanel logic)
// ------------------------------------------------------------------

/** Create a new IIIF Range with a label and canvas references. */
function createRange(
  id: string,
  label: string,
  language: string,
  canvasIds: string[],
): IIIFRange {
  return {
    id,
    type: 'Range',
    label: { [language]: [label] },
    items: canvasIds.map(cid => ({ id: cid, type: 'Canvas' as const })),
  };
}

/** Extract nested Range children from a parent range's items. */
function getNestedRanges(range: IIIFRange): IIIFRange[] {
  return (range.items || []).filter(
    (item): item is IIIFRange =>
      typeof item !== 'string' && 'type' in item && item.type === 'Range',
  );
}

/** Extract Canvas references from a range's items. */
function getCanvasRefs(range: IIIFRange): IIIFRangeReference[] {
  return (range.items || []).filter(
    (item): item is IIIFRangeReference =>
      typeof item !== 'string' && 'type' in item && item.type === 'Canvas',
  );
}

/** Recursively update a range's label and canvas assignments. */
function updateRangeInList(
  ranges: IIIFRange[],
  rangeId: string,
  label: string,
  language: string,
  canvasIds: string[],
): IIIFRange[] {
  return ranges.map(range => {
    if (range.id === rangeId) {
      const nestedRanges = getNestedRanges(range);
      const canvasRefs: IIIFRangeReference[] = canvasIds.map(id => ({
        id,
        type: 'Canvas' as const,
      }));
      return {
        ...range,
        label: { [language]: [label] },
        items: [...canvasRefs, ...nestedRanges],
      };
    }
    const nested = getNestedRanges(range);
    if (nested.length > 0) {
      const updatedNested = updateRangeInList(
        nested,
        rangeId,
        label,
        language,
        canvasIds,
      );
      const canvasRefs = getCanvasRefs(range);
      return { ...range, items: [...canvasRefs, ...updatedNested] };
    }
    return range;
  });
}

/** Recursively delete a range by id from a range tree. */
function deleteRangeFromList(
  ranges: IIIFRange[],
  rangeId: string,
): IIIFRange[] {
  return ranges
    .filter(range => range.id !== rangeId)
    .map(range => {
      const nested = getNestedRanges(range);
      if (nested.length > 0) {
        const updatedNested = deleteRangeFromList(nested, rangeId);
        const canvasRefs = getCanvasRefs(range);
        return { ...range, items: [...canvasRefs, ...updatedNested] };
      }
      return range;
    });
}

/** Reorder top-level structures via drag-drop (move source to target position). */
function reorderStructures(
  structures: IIIFRange[],
  sourceId: string,
  targetId: string,
): IIIFRange[] {
  const sourceIndex = structures.findIndex(r => r.id === sourceId);
  const targetIndex = structures.findIndex(r => r.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return structures;
  const result = [...structures];
  const [removed] = result.splice(sourceIndex, 1);
  result.splice(targetIndex, 0, removed);
  return result;
}

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

/** Build a 3-level range structure for testing. */
function makeStructures(): IIIFRange[] {
  return [
    {
      id: 'range/1',
      type: 'Range',
      label: { en: ['Chapter 1'] },
      items: [
        { id: 'canvas/1', type: 'Canvas' },
        { id: 'canvas/2', type: 'Canvas' },
        {
          id: 'range/1.1',
          type: 'Range',
          label: { en: ['Section 1.1'] },
          items: [{ id: 'canvas/3', type: 'Canvas' }],
        },
      ],
    },
    {
      id: 'range/2',
      type: 'Range',
      label: { en: ['Chapter 2'] },
      items: [{ id: 'canvas/4', type: 'Canvas' }],
    },
    {
      id: 'range/3',
      type: 'Range',
      label: { en: ['Chapter 3'] },
      items: [],
    },
  ];
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('createRange', () => {
  it('creates a range with correct id, type, and label', () => {
    const range = createRange('range/new', 'Intro', 'en', []);
    expect(range.id).toBe('range/new');
    expect(range.type).toBe('Range');
    expect(range.label).toEqual({ en: ['Intro'] });
  });

  it('maps canvas IDs to IIIFRangeReference objects', () => {
    const range = createRange('range/new', 'Ch1', 'en', [
      'canvas/a',
      'canvas/b',
    ]);
    expect(range.items).toEqual([
      { id: 'canvas/a', type: 'Canvas' },
      { id: 'canvas/b', type: 'Canvas' },
    ]);
  });

  it('produces empty items array for empty canvas list', () => {
    const range = createRange('range/empty', 'Empty', 'fr', []);
    expect(range.items).toEqual([]);
  });

  it('uses the provided language key in the label map', () => {
    const range = createRange('range/de', 'Kapitel', 'de', []);
    expect(range.label).toEqual({ de: ['Kapitel'] });
  });
});

describe('getNestedRanges', () => {
  it('returns nested Range items only', () => {
    const structures = makeStructures();
    const nested = getNestedRanges(structures[0]);
    expect(nested).toHaveLength(1);
    expect(nested[0].id).toBe('range/1.1');
    expect(nested[0].type).toBe('Range');
  });

  it('filters out Canvas references', () => {
    const structures = makeStructures();
    const nested = getNestedRanges(structures[0]);
    const canvasIds = nested.map(n => n.id);
    expect(canvasIds).not.toContain('canvas/1');
    expect(canvasIds).not.toContain('canvas/2');
  });

  it('returns empty array for range with no items', () => {
    const structures = makeStructures();
    const nested = getNestedRanges(structures[2]); // Chapter 3, items: []
    expect(nested).toEqual([]);
  });

  it('returns empty array for range with only Canvas refs', () => {
    const structures = makeStructures();
    const nested = getNestedRanges(structures[1]); // Chapter 2, only canvas/4
    expect(nested).toEqual([]);
  });
});

describe('getCanvasRefs', () => {
  it('returns Canvas references only', () => {
    const structures = makeStructures();
    const refs = getCanvasRefs(structures[0]);
    expect(refs).toHaveLength(2);
    expect(refs[0]).toEqual({ id: 'canvas/1', type: 'Canvas' });
    expect(refs[1]).toEqual({ id: 'canvas/2', type: 'Canvas' });
  });

  it('filters out nested Ranges', () => {
    const structures = makeStructures();
    const refs = getCanvasRefs(structures[0]);
    const types = refs.map(r => r.type);
    expect(types.every(t => t === 'Canvas')).toBe(true);
  });

  it('returns empty array when range has no items', () => {
    const structures = makeStructures();
    const refs = getCanvasRefs(structures[2]); // Chapter 3, items: []
    expect(refs).toEqual([]);
  });
});

describe('updateRangeInList', () => {
  it('updates top-level range label and canvases', () => {
    const structures = makeStructures();
    const updated = updateRangeInList(
      structures,
      'range/2',
      'Chapter Two Revised',
      'en',
      ['canvas/10', 'canvas/11'],
    );

    const range2 = updated.find(r => r.id === 'range/2')!;
    expect(range2.label).toEqual({ en: ['Chapter Two Revised'] });

    const canvasRefs = getCanvasRefs(range2);
    expect(canvasRefs).toEqual([
      { id: 'canvas/10', type: 'Canvas' },
      { id: 'canvas/11', type: 'Canvas' },
    ]);
  });

  it('preserves nested ranges when updating parent', () => {
    const structures = makeStructures();
    const updated = updateRangeInList(
      structures,
      'range/1',
      'Chapter 1 Updated',
      'en',
      ['canvas/99'],
    );

    const range1 = updated.find(r => r.id === 'range/1')!;
    const nested = getNestedRanges(range1);
    expect(nested).toHaveLength(1);
    expect(nested[0].id).toBe('range/1.1');
  });

  it('recursively finds and updates nested range', () => {
    const structures = makeStructures();
    const updated = updateRangeInList(
      structures,
      'range/1.1',
      'Section 1.1 Renamed',
      'en',
      ['canvas/30', 'canvas/31'],
    );

    const range1 = updated.find(r => r.id === 'range/1')!;
    const nested = getNestedRanges(range1);
    expect(nested).toHaveLength(1);
    expect(nested[0].label).toEqual({ en: ['Section 1.1 Renamed'] });

    const nestedCanvases = getCanvasRefs(nested[0]);
    expect(nestedCanvases).toEqual([
      { id: 'canvas/30', type: 'Canvas' },
      { id: 'canvas/31', type: 'Canvas' },
    ]);
  });

  it('returns unchanged array if rangeId not found', () => {
    const structures = makeStructures();
    const updated = updateRangeInList(
      structures,
      'range/nonexistent',
      'Ghost',
      'en',
      [],
    );

    // Structure should be equivalent (canvas refs and nested ranges preserved)
    expect(updated).toHaveLength(3);
    expect(updated[0].id).toBe('range/1');
    expect(updated[1].id).toBe('range/2');
    expect(updated[2].id).toBe('range/3');
  });

  it('replaces the language key entirely when updating', () => {
    const structures = makeStructures();
    const updated = updateRangeInList(
      structures,
      'range/2',
      'Chapitre Deux',
      'fr',
      ['canvas/4'],
    );

    const range2 = updated.find(r => r.id === 'range/2')!;
    expect(range2.label).toEqual({ fr: ['Chapitre Deux'] });
    expect(range2.label).not.toHaveProperty('en');
  });
});

describe('deleteRangeFromList', () => {
  it('deletes top-level range', () => {
    const structures = makeStructures();
    const updated = deleteRangeFromList(structures, 'range/2');

    expect(updated).toHaveLength(2);
    expect(updated.map(r => r.id)).toEqual(['range/1', 'range/3']);
  });

  it('deletes nested range', () => {
    const structures = makeStructures();
    const updated = deleteRangeFromList(structures, 'range/1.1');

    expect(updated).toHaveLength(3);
    const range1 = updated.find(r => r.id === 'range/1')!;
    const nested = getNestedRanges(range1);
    expect(nested).toHaveLength(0);
  });

  it('returns unchanged array if rangeId not found', () => {
    const structures = makeStructures();
    const updated = deleteRangeFromList(structures, 'range/nonexistent');

    expect(updated).toHaveLength(3);
    expect(updated[0].id).toBe('range/1');
    expect(updated[1].id).toBe('range/2');
    expect(updated[2].id).toBe('range/3');
  });

  it('preserves sibling ranges when deleting', () => {
    const structures = makeStructures();
    const updated = deleteRangeFromList(structures, 'range/1');

    expect(updated).toHaveLength(2);
    expect(updated[0].id).toBe('range/2');
    expect(updated[1].id).toBe('range/3');

    // Siblings untouched
    expect(updated[0].label).toEqual({ en: ['Chapter 2'] });
    expect(updated[1].label).toEqual({ en: ['Chapter 3'] });
  });

  it('preserves canvas refs in parent when deleting nested range', () => {
    const structures = makeStructures();
    const updated = deleteRangeFromList(structures, 'range/1.1');

    const range1 = updated.find(r => r.id === 'range/1')!;
    const canvasRefs = getCanvasRefs(range1);
    expect(canvasRefs).toEqual([
      { id: 'canvas/1', type: 'Canvas' },
      { id: 'canvas/2', type: 'Canvas' },
    ]);
  });
});

describe('reorderStructures', () => {
  it('moves range from position 0 to position 2', () => {
    const structures = makeStructures();
    const reordered = reorderStructures(structures, 'range/1', 'range/3');

    expect(reordered.map(r => r.id)).toEqual([
      'range/2',
      'range/3',
      'range/1',
    ]);
  });

  it('moves range from position 2 to position 0', () => {
    const structures = makeStructures();
    const reordered = reorderStructures(structures, 'range/3', 'range/1');

    expect(reordered.map(r => r.id)).toEqual([
      'range/3',
      'range/1',
      'range/2',
    ]);
  });

  it('no-op for same source and target', () => {
    const structures = makeStructures();
    const reordered = reorderStructures(structures, 'range/2', 'range/2');

    expect(reordered.map(r => r.id)).toEqual([
      'range/1',
      'range/2',
      'range/3',
    ]);
  });

  it('returns unchanged array if source ID not found', () => {
    const structures = makeStructures();
    const reordered = reorderStructures(
      structures,
      'range/nonexistent',
      'range/2',
    );

    expect(reordered).toBe(structures); // same reference
  });

  it('returns unchanged array if target ID not found', () => {
    const structures = makeStructures();
    const reordered = reorderStructures(
      structures,
      'range/1',
      'range/nonexistent',
    );

    expect(reordered).toBe(structures); // same reference
  });

  it('swaps adjacent ranges correctly', () => {
    const structures = makeStructures();
    const reordered = reorderStructures(structures, 'range/1', 'range/2');

    expect(reordered.map(r => r.id)).toEqual([
      'range/2',
      'range/1',
      'range/3',
    ]);
  });

  it('does not mutate the original array', () => {
    const structures = makeStructures();
    const originalIds = structures.map(r => r.id);

    reorderStructures(structures, 'range/1', 'range/3');

    expect(structures.map(r => r.id)).toEqual(originalIds);
  });
});
