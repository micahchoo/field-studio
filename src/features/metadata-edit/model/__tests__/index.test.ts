/**
 * Tests for metadata-edit model pure functions
 *
 * Covers: flattenIIIFItem, flattenTree, extractColumns, filterByTerm,
 * filterByIds, itemsToCSV, parseCSV, itemsEqual, detectChanges
 */
import { describe, it, expect } from 'vitest';
import type { IIIFItem } from '@/src/shared/types';
import {
  flattenIIIFItem,
  flattenTree,
  extractColumns,
  filterByTerm,
  filterByIds,
  itemsToCSV,
  parseCSV,
  itemsEqual,
  detectChanges,
  IIIF_PROPERTY_SUGGESTIONS,
  type FlatItem,
} from '../index';

// ============================================================================
// Test Fixture Helpers
// ============================================================================

function makeItem(overrides: Partial<IIIFItem> & { id: string; type: string }): IIIFItem {
  return {
    id: overrides.id,
    type: overrides.type,
    label: overrides.label || { none: ['Test Item'] },
    summary: overrides.summary || { none: ['Test Summary'] },
    metadata: overrides.metadata || [],
    rights: overrides.rights || '',
    navDate: overrides.navDate || '',
    items: overrides.items || [],
  } as IIIFItem;
}

function makeFlatItem(overrides: Partial<FlatItem> & { id: string }): FlatItem {
  return {
    id: overrides.id,
    type: overrides.type || 'Canvas',
    label: overrides.label || 'Test Item',
    summary: overrides.summary || 'Test Summary',
    metadata: overrides.metadata || {},
    rights: overrides.rights || '',
    navDate: overrides.navDate || '',
    viewingDirection: overrides.viewingDirection || '',
  };
}

// ============================================================================
// IIIF_PROPERTY_SUGGESTIONS
// ============================================================================

describe('IIIF_PROPERTY_SUGGESTIONS', () => {
  it('contains Dublin Core properties', () => {
    expect(IIIF_PROPERTY_SUGGESTIONS).toContain('Title');
    expect(IIIF_PROPERTY_SUGGESTIONS).toContain('Creator');
    expect(IIIF_PROPERTY_SUGGESTIONS).toContain('Date');
    expect(IIIF_PROPERTY_SUGGESTIONS).toContain('Description');
    expect(IIIF_PROPERTY_SUGGESTIONS).toContain('Subject');
    expect(IIIF_PROPERTY_SUGGESTIONS).toContain('Rights');
  });

  it('has 15 suggestions', () => {
    expect(IIIF_PROPERTY_SUGGESTIONS).toHaveLength(15);
  });
});

// ============================================================================
// flattenIIIFItem
// ============================================================================

describe('flattenIIIFItem', () => {
  it('flattens a single Collection', () => {
    const item = makeItem({ id: 'c1', type: 'Collection' });
    const result = flattenIIIFItem(item);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
    expect(result[0].type).toBe('Collection');
  });

  it('flattens a single Manifest', () => {
    const item = makeItem({ id: 'm1', type: 'Manifest' });
    const result = flattenIIIFItem(item);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
    expect(result[0].type).toBe('Manifest');
  });

  it('flattens a single Canvas', () => {
    const item = makeItem({ id: 'cv1', type: 'Canvas' });
    const result = flattenIIIFItem(item);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cv1');
    expect(result[0].type).toBe('Canvas');
  });

  it('extracts label from language map with "en" key', () => {
    const item = makeItem({
      id: 'c1',
      type: 'Canvas',
      label: { en: ['English Label'] },
    });
    const result = flattenIIIFItem(item);
    expect(result[0].label).toBe('English Label');
  });

  it('extracts label from language map with "none" key', () => {
    const item = makeItem({
      id: 'c1',
      type: 'Canvas',
      label: { none: ['No Language Label'] },
    });
    const result = flattenIIIFItem(item);
    expect(result[0].label).toBe('No Language Label');
  });

  it('extracts summary from language map', () => {
    const item = makeItem({
      id: 'c1',
      type: 'Canvas',
      summary: { en: ['A canvas summary'] },
    });
    const result = flattenIIIFItem(item);
    expect(result[0].summary).toBe('A canvas summary');
  });

  it('extracts rights field', () => {
    const item = makeItem({
      id: 'c1',
      type: 'Canvas',
      rights: 'http://creativecommons.org/licenses/by/4.0/',
    });
    const result = flattenIIIFItem(item);
    expect(result[0].rights).toBe('http://creativecommons.org/licenses/by/4.0/');
  });

  it('extracts navDate field', () => {
    const item = makeItem({
      id: 'c1',
      type: 'Canvas',
      navDate: '1856-01-01T00:00:00Z',
    });
    const result = flattenIIIFItem(item);
    expect(result[0].navDate).toBe('1856-01-01T00:00:00Z');
  });

  it('defaults rights and navDate to empty string when missing', () => {
    const item = makeItem({ id: 'c1', type: 'Canvas' });
    delete (item as unknown as Record<string, unknown>).rights;
    delete (item as unknown as Record<string, unknown>).navDate;
    const result = flattenIIIFItem(item);
    expect(result[0].rights).toBe('');
    expect(result[0].navDate).toBe('');
  });

  it('extracts metadata pairs correctly', () => {
    const item = makeItem({
      id: 'c1',
      type: 'Canvas',
      metadata: [
        { label: { en: ['Creator'] }, value: { en: ['John Doe'] } },
        { label: { en: ['Date'] }, value: { en: ['2024'] } },
      ],
    });
    const result = flattenIIIFItem(item);
    expect(result[0].metadata).toEqual({ Creator: 'John Doe', Date: '2024' });
  });

  it('skips metadata pairs with empty key or value', () => {
    const item = makeItem({
      id: 'c1',
      type: 'Canvas',
      metadata: [
        { label: { en: [''] }, value: { en: ['Valid Value'] } },
        { label: { en: ['Valid Key'] }, value: { en: [''] } },
        { label: { en: ['Good'] }, value: { en: ['Data'] } },
      ],
    });
    const result = flattenIIIFItem(item);
    expect(result[0].metadata).toEqual({ Good: 'Data' });
  });

  it('handles item with no metadata', () => {
    const item = makeItem({ id: 'c1', type: 'Canvas', metadata: undefined });
    const result = flattenIIIFItem(item);
    expect(result[0].metadata).toEqual({});
  });

  it('flattens nested tree: Collection > Manifest > Canvas', () => {
    const canvas = makeItem({ id: 'cv1', type: 'Canvas' });
    const manifest = makeItem({ id: 'm1', type: 'Manifest', items: [canvas] });
    const collection = makeItem({
      id: 'c1',
      type: 'Collection',
      items: [manifest],
    });

    const result = flattenIIIFItem(collection);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(['c1', 'm1', 'cv1']);
    expect(result.map((r) => r.type)).toEqual([
      'Collection',
      'Manifest',
      'Canvas',
    ]);
  });

  it('flattens deeply nested trees', () => {
    const cv1 = makeItem({ id: 'cv1', type: 'Canvas' });
    const cv2 = makeItem({ id: 'cv2', type: 'Canvas' });
    const m1 = makeItem({ id: 'm1', type: 'Manifest', items: [cv1, cv2] });
    const m2 = makeItem({
      id: 'm2',
      type: 'Manifest',
      items: [makeItem({ id: 'cv3', type: 'Canvas' })],
    });
    const root = makeItem({
      id: 'c1',
      type: 'Collection',
      items: [m1, m2],
    });

    const result = flattenIIIFItem(root);
    expect(result).toHaveLength(6);
    expect(result.map((r) => r.id)).toEqual(['c1', 'm1', 'cv1', 'cv2', 'm2', 'cv3']);
  });

  // Type filter tests

  it('"All" filter excludes AnnotationPage', () => {
    const ap = makeItem({ id: 'ap1', type: 'AnnotationPage' });
    const canvas = makeItem({ id: 'cv1', type: 'Canvas', items: [ap] });
    const result = flattenIIIFItem(canvas, 'All');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cv1');
  });

  it('"All" filter excludes Annotation', () => {
    const ann = makeItem({ id: 'a1', type: 'Annotation' });
    const canvas = makeItem({ id: 'cv1', type: 'Canvas', items: [ann] });
    const result = flattenIIIFItem(canvas, 'All');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cv1');
  });

  it('"All" filter excludes ContentResource', () => {
    const cr = makeItem({ id: 'cr1', type: 'ContentResource' as IIIFItem['type'] });
    const canvas = makeItem({ id: 'cv1', type: 'Canvas', items: [cr] });
    const result = flattenIIIFItem(canvas, 'All');
    expect(result).toHaveLength(1);
  });

  it('"All Entities" includes AnnotationPage and Annotation', () => {
    const ann = makeItem({ id: 'a1', type: 'Annotation' });
    const ap = makeItem({ id: 'ap1', type: 'AnnotationPage', items: [ann] });
    const canvas = makeItem({ id: 'cv1', type: 'Canvas', items: [ap] });
    const result = flattenIIIFItem(canvas, 'All Entities');
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.type)).toEqual([
      'Canvas',
      'AnnotationPage',
      'Annotation',
    ]);
  });

  it('"Canvas" filter includes only canvases', () => {
    const cv1 = makeItem({ id: 'cv1', type: 'Canvas' });
    const cv2 = makeItem({ id: 'cv2', type: 'Canvas' });
    const manifest = makeItem({ id: 'm1', type: 'Manifest', items: [cv1, cv2] });
    const collection = makeItem({
      id: 'c1',
      type: 'Collection',
      items: [manifest],
    });

    const result = flattenIIIFItem(collection, 'Canvas');
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.type === 'Canvas')).toBe(true);
  });

  it('"Manifest" filter includes only manifests', () => {
    const cv = makeItem({ id: 'cv1', type: 'Canvas' });
    const m1 = makeItem({ id: 'm1', type: 'Manifest', items: [cv] });
    const m2 = makeItem({ id: 'm2', type: 'Manifest' });
    const root = makeItem({ id: 'c1', type: 'Collection', items: [m1, m2] });

    const result = flattenIIIFItem(root, 'Manifest');
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.type === 'Manifest')).toBe(true);
  });

  it('"Collection" filter includes only collections', () => {
    const cv = makeItem({ id: 'cv1', type: 'Canvas' });
    const m = makeItem({ id: 'm1', type: 'Manifest', items: [cv] });
    const root = makeItem({ id: 'c1', type: 'Collection', items: [m] });

    const result = flattenIIIFItem(root, 'Collection');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Collection');
  });

  it('handles empty label/summary gracefully', () => {
    // Construct item directly without makeItem defaults to truly omit label/summary
    const item = {
      id: 'c1',
      type: 'Canvas',
      metadata: [],
      items: [],
    } as unknown as IIIFItem;
    const result = flattenIIIFItem(item);
    expect(result[0].label).toBe('');
    expect(result[0].summary).toBe('');
  });

  it('extracts viewingDirection from Manifest', () => {
    const item = makeItem({ id: 'm1', type: 'Manifest' });
    (item as unknown as Record<string, unknown>).viewingDirection = 'right-to-left';
    const result = flattenIIIFItem(item);
    expect(result[0].viewingDirection).toBe('right-to-left');
  });

  it('viewingDirection defaults to empty string when absent', () => {
    const item = makeItem({ id: 'cv1', type: 'Canvas' });
    const result = flattenIIIFItem(item);
    expect(result[0].viewingDirection).toBe('');
  });
});

// ============================================================================
// flattenTree
// ============================================================================

describe('flattenTree', () => {
  it('returns empty array for null root', () => {
    const result = flattenTree(null);
    expect(result).toEqual([]);
  });

  it('flattens a single root item', () => {
    const root = makeItem({ id: 'c1', type: 'Collection' });
    const result = flattenTree(root);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('flattens a nested tree', () => {
    const cv = makeItem({ id: 'cv1', type: 'Canvas' });
    const m = makeItem({ id: 'm1', type: 'Manifest', items: [cv] });
    const root = makeItem({ id: 'c1', type: 'Collection', items: [m] });

    const result = flattenTree(root);
    expect(result).toHaveLength(3);
  });

  it('passes typeFilter to flattenIIIFItem', () => {
    const cv = makeItem({ id: 'cv1', type: 'Canvas' });
    const m = makeItem({ id: 'm1', type: 'Manifest', items: [cv] });
    const root = makeItem({ id: 'c1', type: 'Collection', items: [m] });

    const result = flattenTree(root, 'Canvas');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Canvas');
  });

  it('defaults to "All" filter', () => {
    const ann = makeItem({ id: 'a1', type: 'Annotation' });
    const cv = makeItem({ id: 'cv1', type: 'Canvas', items: [ann] });
    const root = makeItem({ id: 'c1', type: 'Collection', items: [cv] });

    const result = flattenTree(root);
    // Annotation is filtered out by 'All'
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(['c1', 'cv1']);
  });
});

// ============================================================================
// extractColumns
// ============================================================================

describe('extractColumns', () => {
  const standardCols = ['id', 'type', 'label', 'summary', 'rights', 'navDate'];

  it('returns standard columns for empty items', () => {
    const result = extractColumns([]);
    expect(result).toEqual(standardCols);
  });

  it('returns standard columns when items have no metadata', () => {
    const items = [makeFlatItem({ id: '1' }), makeFlatItem({ id: '2' })];
    const result = extractColumns(items);
    expect(result).toEqual(standardCols);
  });

  it('adds dynamic metadata columns', () => {
    const items = [
      makeFlatItem({ id: '1', metadata: { Creator: 'Alice', Date: '2024' } }),
    ];
    const result = extractColumns(items);
    expect(result).toContain('Creator');
    expect(result).toContain('Date');
    // Standard cols come first
    expect(result.indexOf('id')).toBeLessThan(result.indexOf('Creator'));
  });

  it('sorts dynamic columns by frequency (most common first)', () => {
    const items = [
      makeFlatItem({ id: '1', metadata: { Rare: 'x', Common: 'y' } }),
      makeFlatItem({ id: '2', metadata: { Common: 'z' } }),
      makeFlatItem({ id: '3', metadata: { Common: 'w', Medium: 'm' } }),
    ];
    const result = extractColumns(items);
    const dynamicPart = result.slice(standardCols.length);
    expect(dynamicPart[0]).toBe('Common');
    // Medium and Rare each appear once, order among them may vary
    expect(dynamicPart).toContain('Medium');
    expect(dynamicPart).toContain('Rare');
  });

  it('respects maxDynamicCols limit', () => {
    const meta: Record<string, string> = {};
    for (let i = 0; i < 30; i++) {
      meta[`field_${i}`] = `value_${i}`;
    }
    const items = [makeFlatItem({ id: '1', metadata: meta })];
    const result = extractColumns(items, 5);
    // 6 standard + 5 max dynamic = 11
    expect(result).toHaveLength(11);
  });

  it('uses default maxDynamicCols of 20', () => {
    const meta: Record<string, string> = {};
    for (let i = 0; i < 30; i++) {
      meta[`field_${i}`] = `value_${i}`;
    }
    const items = [makeFlatItem({ id: '1', metadata: meta })];
    const result = extractColumns(items);
    // 6 standard + 20 dynamic = 26
    expect(result).toHaveLength(26);
  });

  it('deduplicates metadata column names across items', () => {
    const items = [
      makeFlatItem({ id: '1', metadata: { Creator: 'Alice' } }),
      makeFlatItem({ id: '2', metadata: { Creator: 'Bob' } }),
    ];
    const result = extractColumns(items);
    const creatorOccurrences = result.filter((c) => c === 'Creator');
    expect(creatorOccurrences).toHaveLength(1);
  });
});

// ============================================================================
// filterByTerm
// ============================================================================

describe('filterByTerm', () => {
  const items = [
    makeFlatItem({
      id: 'canvas-1',
      label: 'Sunset Painting',
      summary: 'A beautiful sunset',
      metadata: { Creator: 'Monet', Medium: 'Oil on canvas' },
    }),
    makeFlatItem({
      id: 'canvas-2',
      label: 'Mountain Landscape',
      summary: 'Rocky mountains view',
      metadata: { Creator: 'Bierstadt', Date: '1870' },
    }),
    makeFlatItem({
      id: 'canvas-3',
      label: 'Abstract Composition',
      summary: 'Modern art piece',
      metadata: { Creator: 'Kandinsky', Style: 'Abstract' },
    }),
  ];

  it('empty term returns all items', () => {
    expect(filterByTerm(items, '')).toHaveLength(3);
  });

  it('whitespace-only term returns all items', () => {
    expect(filterByTerm(items, '   ')).toHaveLength(3);
  });

  it('matches in label (case-insensitive)', () => {
    const result = filterByTerm(items, 'sunset');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('canvas-1');
  });

  it('matches label with different case', () => {
    const result = filterByTerm(items, 'MOUNTAIN');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('canvas-2');
  });

  it('matches in summary', () => {
    const result = filterByTerm(items, 'modern art');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('canvas-3');
  });

  it('matches in id', () => {
    const result = filterByTerm(items, 'canvas-2');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('canvas-2');
  });

  it('matches in metadata values', () => {
    const result = filterByTerm(items, 'Monet');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('canvas-1');
  });

  it('matches in metadata keys', () => {
    const result = filterByTerm(items, 'medium');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('canvas-1');
  });

  it('matches across multiple items', () => {
    // 'abstract' appears in label of canvas-3 and in Style metadata of canvas-3
    const result = filterByTerm(items, 'abstract');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('canvas-3');
  });

  it('returns empty when no matches', () => {
    const result = filterByTerm(items, 'nonexistent-term-xyz');
    expect(result).toHaveLength(0);
  });

  it('matches partial strings', () => {
    const result = filterByTerm(items, 'paint');
    // Matches 'Sunset Painting' label
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('canvas-1');
  });

  it('handles items with empty metadata', () => {
    const emptyItems = [makeFlatItem({ id: '1', label: 'Hello', metadata: {} })];
    const result = filterByTerm(emptyItems, 'hello');
    expect(result).toHaveLength(1);
  });

  it('metadata value match is case-insensitive', () => {
    const result = filterByTerm(items, 'oil on canvas');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('canvas-1');
  });
});

// ============================================================================
// filterByIds
// ============================================================================

describe('filterByIds', () => {
  const items = [
    makeFlatItem({ id: 'a' }),
    makeFlatItem({ id: 'b' }),
    makeFlatItem({ id: 'c' }),
    makeFlatItem({ id: 'd' }),
  ];

  it('empty ids array returns all items', () => {
    expect(filterByIds(items, [])).toHaveLength(4);
  });

  it('null-like ids returns all items', () => {
    // The function checks !ids || ids.length === 0
    expect(filterByIds(items, null as unknown as string[])).toHaveLength(4);
  });

  it('filters to specific IDs', () => {
    const result = filterByIds(items, ['a', 'c']);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('returns single item for single ID', () => {
    const result = filterByIds(items, ['b']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('returns empty when no IDs match', () => {
    const result = filterByIds(items, ['x', 'y', 'z']);
    expect(result).toHaveLength(0);
  });

  it('preserves order from original items', () => {
    const result = filterByIds(items, ['d', 'a']);
    expect(result.map((r) => r.id)).toEqual(['a', 'd']);
  });

  it('handles duplicate IDs in filter', () => {
    const result = filterByIds(items, ['a', 'a']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });
});

// ============================================================================
// itemsToCSV
// ============================================================================

describe('itemsToCSV', () => {
  it('generates header row from columns', () => {
    const csv = itemsToCSV([], ['id', 'type', 'label']);
    expect(csv).toBe('id,type,label');
  });

  it('generates rows for each item', () => {
    const items = [
      makeFlatItem({ id: 'c1', type: 'Canvas', label: 'First' }),
      makeFlatItem({ id: 'c2', type: 'Canvas', label: 'Second' }),
    ];
    const csv = itemsToCSV(items, ['id', 'label']);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('id,label');
    expect(lines[1]).toBe('c1,First');
    expect(lines[2]).toBe('c2,Second');
  });

  it('escapes commas in values', () => {
    const items = [
      makeFlatItem({ id: 'c1', label: 'Hello, World' }),
    ];
    const csv = itemsToCSV(items, ['id', 'label']);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('c1,"Hello, World"');
  });

  it('escapes double quotes in values', () => {
    const items = [
      makeFlatItem({ id: 'c1', label: 'A "quoted" value' }),
    ];
    const csv = itemsToCSV(items, ['id', 'label']);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('c1,"A ""quoted"" value"');
  });

  it('escapes newlines in values', () => {
    const items = [
      makeFlatItem({ id: 'c1', label: 'Line1\nLine2' }),
    ];
    const csv = itemsToCSV(items, ['id', 'label']);
    // The value with newline should be quoted
    expect(csv).toContain('"Line1\nLine2"');
  });

  it('uses metadata columns for dynamic fields', () => {
    const items = [
      makeFlatItem({
        id: 'c1',
        metadata: { Creator: 'Alice', Date: '2024' },
      }),
    ];
    const csv = itemsToCSV(items, ['id', 'Creator', 'Date']);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,Creator,Date');
    expect(lines[1]).toBe('c1,Alice,2024');
  });

  it('returns empty string for missing metadata column', () => {
    const items = [
      makeFlatItem({ id: 'c1', metadata: { Creator: 'Alice' } }),
    ];
    const csv = itemsToCSV(items, ['id', 'Creator', 'Date']);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('c1,Alice,');
  });

  it('includes all standard fields', () => {
    const items = [
      makeFlatItem({
        id: 'c1',
        type: 'Canvas',
        label: 'My Canvas',
        summary: 'A summary',
        rights: 'CC-BY',
        navDate: '2024-01-01',
      }),
    ];
    const columns = ['id', 'type', 'label', 'summary', 'rights', 'navDate'];
    const csv = itemsToCSV(items, columns);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('c1,Canvas,My Canvas,A summary,CC-BY,2024-01-01');
  });

  it('handles empty items array', () => {
    const csv = itemsToCSV([], ['id', 'label']);
    expect(csv).toBe('id,label');
  });
});

// ============================================================================
// parseCSV
// ============================================================================

describe('parseCSV', () => {
  it('parses simple CSV with headers', () => {
    const csv = 'id,label\nc1,Canvas One\nc2,Canvas Two';
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[0].label).toBe('Canvas One');
    expect(result[1].id).toBe('c2');
    expect(result[1].label).toBe('Canvas Two');
  });

  it('returns empty for header-only CSV', () => {
    const csv = 'id,label';
    const result = parseCSV(csv);
    expect(result).toEqual([]);
  });

  it('returns empty for empty string', () => {
    const result = parseCSV('');
    expect(result).toEqual([]);
  });

  it('maps standard fields correctly', () => {
    const csv =
      'id,type,label,summary,rights,navDate\nc1,Canvas,My Canvas,A summary,CC-BY,2024-01-01';
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
    expect(result[0].type).toBe('Canvas');
    expect(result[0].label).toBe('My Canvas');
    expect(result[0].summary).toBe('A summary');
    expect(result[0].rights).toBe('CC-BY');
    expect(result[0].navDate).toBe('2024-01-01');
  });

  it('maps remaining columns to metadata', () => {
    const csv = 'id,label,Creator,Date\nc1,Canvas One,Alice,2024';
    const result = parseCSV(csv);
    expect(result[0].metadata).toEqual({ Creator: 'Alice', Date: '2024' });
  });

  it('initializes metadata object for every parsed item', () => {
    const csv = 'id,label\nc1,Canvas One';
    const result = parseCSV(csv);
    expect(result[0].metadata).toBeDefined();
    expect(result[0].metadata).toEqual({});
  });

  it('handles missing values (fewer columns than headers)', () => {
    const csv = 'id,label,Creator\nc1,Canvas One';
    const result = parseCSV(csv);
    expect(result[0].id).toBe('c1');
    expect(result[0].label).toBe('Canvas One');
    // Creator should be empty string
    expect(result[0].metadata?.Creator).toBe('');
  });

  it('trims whitespace from header names', () => {
    const csv = ' id , label \nc1,Canvas One';
    const result = parseCSV(csv);
    expect(result[0].id).toBe('c1');
    expect(result[0].label).toBe('Canvas One');
  });

  it('trims whitespace from values', () => {
    const csv = 'id,label\n c1 , Canvas One ';
    const result = parseCSV(csv);
    expect(result[0].id).toBe('c1');
    expect(result[0].label).toBe('Canvas One');
  });

  it('parses multiple rows', () => {
    const csv = 'id,label\nc1,A\nc2,B\nc3,C';
    const result = parseCSV(csv);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(['c1', 'c2', 'c3']);
  });
});

// ============================================================================
// itemsEqual
// ============================================================================

describe('itemsEqual', () => {
  it('equal items return true', () => {
    const a = makeFlatItem({ id: 'c1', label: 'Same', summary: 'Same' });
    const b = makeFlatItem({ id: 'c1', label: 'Same', summary: 'Same' });
    expect(itemsEqual(a, b)).toBe(true);
  });

  it('different label returns false', () => {
    const a = makeFlatItem({ id: 'c1', label: 'Label A' });
    const b = makeFlatItem({ id: 'c1', label: 'Label B' });
    expect(itemsEqual(a, b)).toBe(false);
  });

  it('different summary returns false', () => {
    const a = makeFlatItem({ id: 'c1', summary: 'Summary A' });
    const b = makeFlatItem({ id: 'c1', summary: 'Summary B' });
    expect(itemsEqual(a, b)).toBe(false);
  });

  it('different rights returns false', () => {
    const a = makeFlatItem({ id: 'c1', rights: 'CC-BY' });
    const b = makeFlatItem({ id: 'c1', rights: 'CC-0' });
    expect(itemsEqual(a, b)).toBe(false);
  });

  it('different navDate returns false', () => {
    const a = makeFlatItem({ id: 'c1', navDate: '2024-01-01' });
    const b = makeFlatItem({ id: 'c1', navDate: '2025-01-01' });
    expect(itemsEqual(a, b)).toBe(false);
  });

  it('different metadata key returns false', () => {
    const a = makeFlatItem({ id: 'c1', metadata: { Creator: 'Alice' } });
    const b = makeFlatItem({ id: 'c1', metadata: { Author: 'Alice' } });
    expect(itemsEqual(a, b)).toBe(false);
  });

  it('different metadata value returns false', () => {
    const a = makeFlatItem({ id: 'c1', metadata: { Creator: 'Alice' } });
    const b = makeFlatItem({ id: 'c1', metadata: { Creator: 'Bob' } });
    expect(itemsEqual(a, b)).toBe(false);
  });

  it('extra metadata key in one item returns false', () => {
    const a = makeFlatItem({
      id: 'c1',
      metadata: { Creator: 'Alice', Date: '2024' },
    });
    const b = makeFlatItem({ id: 'c1', metadata: { Creator: 'Alice' } });
    expect(itemsEqual(a, b)).toBe(false);
  });

  it('same metadata but different key order returns true', () => {
    const a = makeFlatItem({
      id: 'c1',
      metadata: { Creator: 'Alice', Date: '2024' },
    });
    const b = makeFlatItem({
      id: 'c1',
      metadata: { Date: '2024', Creator: 'Alice' },
    });
    expect(itemsEqual(a, b)).toBe(true);
  });

  it('both empty metadata returns true', () => {
    const a = makeFlatItem({ id: 'c1', metadata: {} });
    const b = makeFlatItem({ id: 'c1', metadata: {} });
    expect(itemsEqual(a, b)).toBe(true);
  });

  it('ignores id and type differences', () => {
    const a = makeFlatItem({ id: 'c1', type: 'Canvas' });
    const b = makeFlatItem({ id: 'c2', type: 'Manifest' });
    // itemsEqual only checks label, summary, rights, navDate, metadata
    expect(itemsEqual(a, b)).toBe(true);
  });

  it('ignores viewingDirection differences', () => {
    const a = makeFlatItem({ id: 'c1', viewingDirection: 'left-to-right' });
    const b = makeFlatItem({ id: 'c1', viewingDirection: 'right-to-left' });
    expect(itemsEqual(a, b)).toBe(true);
  });

  it('complex metadata comparison', () => {
    const meta = {
      Creator: 'Alice',
      Date: '2024',
      Subject: 'Art',
      Rights: 'Public Domain',
      Language: 'en',
    };
    const a = makeFlatItem({ id: 'c1', metadata: { ...meta } });
    const b = makeFlatItem({ id: 'c1', metadata: { ...meta } });
    expect(itemsEqual(a, b)).toBe(true);
  });
});

// ============================================================================
// detectChanges
// ============================================================================

describe('detectChanges', () => {
  it('no changes returns empty array', () => {
    const items = [
      makeFlatItem({ id: 'c1', label: 'Same' }),
      makeFlatItem({ id: 'c2', label: 'Also Same' }),
    ];
    const result = detectChanges(items, items);
    expect(result).toEqual([]);
  });

  it('identical copies return no changes', () => {
    const original = [
      makeFlatItem({ id: 'c1', label: 'Hello', metadata: { A: '1' } }),
    ];
    const current = [
      makeFlatItem({ id: 'c1', label: 'Hello', metadata: { A: '1' } }),
    ];
    expect(detectChanges(current, original)).toEqual([]);
  });

  it('changed label is detected', () => {
    const original = [makeFlatItem({ id: 'c1', label: 'Old Label' })];
    const current = [makeFlatItem({ id: 'c1', label: 'New Label' })];
    const result = detectChanges(current, original);
    expect(result).toEqual(['c1']);
  });

  it('changed summary is detected', () => {
    const original = [makeFlatItem({ id: 'c1', summary: 'Old' })];
    const current = [makeFlatItem({ id: 'c1', summary: 'New' })];
    expect(detectChanges(current, original)).toEqual(['c1']);
  });

  it('changed metadata is detected', () => {
    const original = [
      makeFlatItem({ id: 'c1', metadata: { Creator: 'Alice' } }),
    ];
    const current = [
      makeFlatItem({ id: 'c1', metadata: { Creator: 'Bob' } }),
    ];
    expect(detectChanges(current, original)).toEqual(['c1']);
  });

  it('new item (not in original) is detected as changed', () => {
    const original = [makeFlatItem({ id: 'c1' })];
    const current = [makeFlatItem({ id: 'c1' }), makeFlatItem({ id: 'c2' })];
    const result = detectChanges(current, original);
    expect(result).toEqual(['c2']);
  });

  it('multiple changes detected', () => {
    const original = [
      makeFlatItem({ id: 'c1', label: 'Old 1' }),
      makeFlatItem({ id: 'c2', label: 'Old 2' }),
      makeFlatItem({ id: 'c3', label: 'Unchanged' }),
    ];
    const current = [
      makeFlatItem({ id: 'c1', label: 'New 1' }),
      makeFlatItem({ id: 'c2', label: 'New 2' }),
      makeFlatItem({ id: 'c3', label: 'Unchanged' }),
    ];
    const result = detectChanges(current, original);
    expect(result).toEqual(['c1', 'c2']);
  });

  it('empty current returns empty', () => {
    const original = [makeFlatItem({ id: 'c1' })];
    expect(detectChanges([], original)).toEqual([]);
  });

  it('empty original marks all current as changed', () => {
    const current = [
      makeFlatItem({ id: 'c1' }),
      makeFlatItem({ id: 'c2' }),
    ];
    const result = detectChanges(current, []);
    expect(result).toEqual(['c1', 'c2']);
  });

  it('removed items from current are not detected', () => {
    const original = [
      makeFlatItem({ id: 'c1' }),
      makeFlatItem({ id: 'c2' }),
    ];
    const current = [makeFlatItem({ id: 'c1' })];
    // detectChanges iterates current, not original
    const result = detectChanges(current, original);
    expect(result).toEqual([]);
  });

  it('changed rights detected', () => {
    const original = [makeFlatItem({ id: 'c1', rights: 'CC-BY' })];
    const current = [makeFlatItem({ id: 'c1', rights: 'CC-0' })];
    expect(detectChanges(current, original)).toEqual(['c1']);
  });

  it('changed navDate detected', () => {
    const original = [makeFlatItem({ id: 'c1', navDate: '2024-01-01' })];
    const current = [makeFlatItem({ id: 'c1', navDate: '2025-01-01' })];
    expect(detectChanges(current, original)).toEqual(['c1']);
  });

  it('added metadata key detected', () => {
    const original = [makeFlatItem({ id: 'c1', metadata: {} })];
    const current = [
      makeFlatItem({ id: 'c1', metadata: { NewField: 'value' } }),
    ];
    expect(detectChanges(current, original)).toEqual(['c1']);
  });

  it('removed metadata key detected', () => {
    const original = [
      makeFlatItem({ id: 'c1', metadata: { OldField: 'value' } }),
    ];
    const current = [makeFlatItem({ id: 'c1', metadata: {} })];
    expect(detectChanges(current, original)).toEqual(['c1']);
  });
});

// ============================================================================
// Integration / Roundtrip Tests
// ============================================================================

describe('roundtrip: flatten -> extractColumns -> itemsToCSV -> parseCSV', () => {
  it('round-trips a simple tree through CSV export and import', () => {
    const cv1 = makeItem({
      id: 'cv1',
      type: 'Canvas',
      label: { en: ['First Canvas'] },
      summary: { en: ['Summary 1'] },
      metadata: [
        { label: { en: ['Creator'] }, value: { en: ['Alice'] } },
      ],
    });
    const cv2 = makeItem({
      id: 'cv2',
      type: 'Canvas',
      label: { en: ['Second Canvas'] },
      summary: { en: ['Summary 2'] },
      metadata: [
        { label: { en: ['Creator'] }, value: { en: ['Bob'] } },
        { label: { en: ['Date'] }, value: { en: ['2024'] } },
      ],
    });
    const manifest = makeItem({
      id: 'm1',
      type: 'Manifest',
      items: [cv1, cv2],
    });

    // Flatten
    const flat = flattenTree(manifest, 'Canvas');
    expect(flat).toHaveLength(2);

    // Extract columns
    const columns = extractColumns(flat);
    expect(columns).toContain('Creator');
    expect(columns).toContain('Date');

    // To CSV
    const csv = itemsToCSV(flat, columns);
    expect(csv.split('\n')).toHaveLength(3); // header + 2 rows

    // Parse CSV back
    const parsed = parseCSV(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('cv1');
    expect(parsed[0].label).toBe('First Canvas');
    expect(parsed[0].metadata?.Creator).toBe('Alice');
    expect(parsed[1].metadata?.Creator).toBe('Bob');
    expect(parsed[1].metadata?.Date).toBe('2024');
  });
});

describe('integration: flatten -> filter -> detectChanges', () => {
  it('detects changes after editing filtered items', () => {
    const cv1 = makeItem({
      id: 'cv1',
      type: 'Canvas',
      label: { en: ['Canvas 1'] },
    });
    const cv2 = makeItem({
      id: 'cv2',
      type: 'Canvas',
      label: { en: ['Canvas 2'] },
    });
    const root = makeItem({
      id: 'm1',
      type: 'Manifest',
      items: [cv1, cv2],
    });

    const original = flattenTree(root, 'Canvas');
    expect(original).toHaveLength(2);

    // Simulate editing: change label of first canvas
    const edited = original.map((item) =>
      item.id === 'cv1' ? { ...item, label: 'Edited Canvas 1' } : item
    );

    // Filter to only canvas-1
    const filtered = filterByTerm(edited, 'edited');
    expect(filtered).toHaveLength(1);

    // Detect changes on full list
    const changes = detectChanges(edited, original);
    expect(changes).toEqual(['cv1']);
  });
});
