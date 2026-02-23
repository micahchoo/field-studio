/**
 * Pure Computation Tests (Category 1)
 *
 * Tests framework-agnostic pure functions extracted from React hooks
 * for the Svelte migration. No DOM or framework imports required.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════
// 1. Terminology
// ═══════════════════════════════════════════════════════════════════════

import {
  getTerm,
  getTerms,
  getResourceTypeLabel,
  getTermDescription,
  formatCount,
  TERMINOLOGY_MAP,
} from '../hooks/terminology';

describe('terminology', () => {
  describe('getTerm', () => {
    it('returns simple term for simple level', () => {
      expect(getTerm('Collection', 'simple')).toBe('Album');
      expect(getTerm('Manifest', 'simple')).toBe('Item');
      expect(getTerm('Canvas', 'simple')).toBe('Page');
      expect(getTerm('Range', 'simple')).toBe('Section');
      expect(getTerm('Annotation', 'simple')).toBe('Note');
    });

    it('returns standard term for standard level', () => {
      expect(getTerm('Collection', 'standard')).toBe('Collection');
      expect(getTerm('Manifest', 'standard')).toBe('Manifest');
      expect(getTerm('Canvas', 'standard')).toBe('Canvas');
      expect(getTerm('metadata', 'standard')).toBe('Metadata');
    });

    it('returns advanced term (same as standard)', () => {
      expect(getTerm('Collection', 'advanced')).toBe('Collection');
      expect(getTerm('Manifest', 'advanced')).toBe('Manifest');
      expect(getTerm('label', 'advanced')).toBe('Label');
    });

    it('maps property names at simple level', () => {
      expect(getTerm('label', 'simple')).toBe('Title');
      expect(getTerm('summary', 'simple')).toBe('Description');
      expect(getTerm('rights', 'simple')).toBe('License');
      expect(getTerm('requiredStatement', 'simple')).toBe('Credit');
      expect(getTerm('provider', 'simple')).toBe('Source');
      expect(getTerm('behavior', 'simple')).toBe('Display Options');
      expect(getTerm('viewingDirection', 'simple')).toBe('Reading Direction');
      expect(getTerm('thumbnail', 'simple')).toBe('Preview Image');
    });

    it('falls back to standard term if key missing from level', () => {
      // TERMINOLOGY_MAP advanced spreads standard, so any standard key works
      expect(getTerm('metadata', 'advanced')).toBe('Metadata');
    });

    it('falls back to the key itself for unknown terms', () => {
      expect(getTerm('unknownField', 'simple')).toBe('unknownField');
      expect(getTerm('unknownField', 'standard')).toBe('unknownField');
      expect(getTerm('unknownField', 'advanced')).toBe('unknownField');
    });
  });

  describe('getTerms', () => {
    it('returns batch of terms for given keys', () => {
      const result = getTerms(['Collection', 'Manifest', 'Canvas'], 'simple');
      expect(result).toEqual({
        Collection: 'Album',
        Manifest: 'Item',
        Canvas: 'Page',
      });
    });

    it('returns standard terms when level is standard', () => {
      const result = getTerms(['label', 'summary'], 'standard');
      expect(result).toEqual({
        label: 'Label',
        summary: 'Summary',
      });
    });

    it('returns empty object for empty keys array', () => {
      const result = getTerms([], 'simple');
      expect(result).toEqual({});
    });

    it('handles unknown keys in batch', () => {
      const result = getTerms(['Collection', 'xyzzy'], 'simple');
      expect(result).toEqual({
        Collection: 'Album',
        xyzzy: 'xyzzy',
      });
    });
  });

  describe('getResourceTypeLabel', () => {
    it('returns plain label without article', () => {
      expect(getResourceTypeLabel('Collection', 'simple')).toBe('Album');
      expect(getResourceTypeLabel('Manifest', 'standard')).toBe('Manifest');
    });

    it('prepends "a" for consonant-starting labels', () => {
      // 'Page' starts with P
      expect(getResourceTypeLabel('Canvas', 'simple', true)).toBe('a Page');
      // 'Manifest' starts with M
      expect(getResourceTypeLabel('Manifest', 'standard', true)).toBe('a Manifest');
    });

    it('prepends "an" for vowel-starting labels', () => {
      // 'Album' starts with A
      expect(getResourceTypeLabel('Collection', 'simple', true)).toBe('an Album');
      // 'Item' starts with I
      expect(getResourceTypeLabel('Manifest', 'simple', true)).toBe('an Item');
      // 'Annotation' starts with A
      expect(getResourceTypeLabel('Annotation', 'standard', true)).toBe('an Annotation');
    });

    it('defaults includeArticle to false', () => {
      expect(getResourceTypeLabel('Collection', 'simple')).toBe('Album');
    });
  });

  describe('getTermDescription', () => {
    it('returns description for known resource types', () => {
      expect(getTermDescription('Collection')).toBe(
        'An ordered list of Manifests or other Collections'
      );
      expect(getTermDescription('Manifest')).toBe(
        'A description of the structure and layout of a single object'
      );
      expect(getTermDescription('Canvas')).toBe(
        'A virtual container that represents a page or view'
      );
      expect(getTermDescription('Range')).toBe(
        'An additional grouping of Canvases (e.g. chapters, sections)'
      );
      expect(getTermDescription('Annotation')).toBe(
        'Content associated with a Canvas (images, text, comments)'
      );
      expect(getTermDescription('AnnotationPage')).toBe(
        'An ordered list of Annotations'
      );
    });

    it('returns null for unknown keys', () => {
      expect(getTermDescription('metadata')).toBeNull();
      expect(getTermDescription('unknownType')).toBeNull();
      expect(getTermDescription('')).toBeNull();
    });
  });

  describe('formatCount', () => {
    it('returns singular form for count of 1', () => {
      expect(formatCount(1, 'Canvas', 'simple')).toBe('1 Page');
      expect(formatCount(1, 'Manifest', 'standard')).toBe('1 Manifest');
    });

    it('returns pluralized form for counts > 1', () => {
      expect(formatCount(5, 'Canvas', 'simple')).toBe('5 Pages');
      expect(formatCount(3, 'Manifest', 'standard')).toBe('3 Manifests');
      expect(formatCount(10, 'Annotation', 'standard')).toBe('10 Annotations');
    });

    it('does not double-pluralize terms already ending in s', () => {
      // 'Display Options' ends in 's'
      expect(formatCount(2, 'behavior', 'simple')).toBe('2 Display Options');
      // 'Downloads' ends in 's'
      expect(formatCount(3, 'rendering', 'simple')).toBe('3 Downloads');
      // 'Services' ends in 's'
      expect(formatCount(4, 'service', 'simple')).toBe('4 Services');
    });

    it('handles count of 0 with plural form', () => {
      expect(formatCount(0, 'Canvas', 'simple')).toBe('0 Pages');
      expect(formatCount(0, 'Manifest', 'standard')).toBe('0 Manifests');
    });

    it('does not add s to terms already ending in s', () => {
      // "Canvas" ends in 's', so formatCount does not append another 's'
      expect(formatCount(1000, 'Canvas', 'standard')).toBe('1000 Canvas');
    });
  });

  describe('TERMINOLOGY_MAP', () => {
    it('has all three levels', () => {
      expect(TERMINOLOGY_MAP).toHaveProperty('simple');
      expect(TERMINOLOGY_MAP).toHaveProperty('standard');
      expect(TERMINOLOGY_MAP).toHaveProperty('advanced');
    });

    it('advanced includes all standard keys', () => {
      const standardKeys = Object.keys(TERMINOLOGY_MAP.standard);
      const advancedKeys = Object.keys(TERMINOLOGY_MAP.advanced);
      for (const key of standardKeys) {
        expect(advancedKeys).toContain(key);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. IIIF Traversal
// ═══════════════════════════════════════════════════════════════════════

import {
  getAllCanvases,
  getAllItems,
  getChildItems,
  getAncestors,
} from '../hooks/iiifTraversal';

import type { NormalizedState, EntityType } from '@/src/shared/types';

/** Helper: create a minimal NormalizedState for traversal tests */
function createTraversalState(): NormalizedState {
  return {
    entities: {
      Collection: {
        'col:1': { id: 'col:1', type: 'Collection', label: { en: ['Root Collection'] }, items: [] } as any,
      },
      Manifest: {
        'man:1': { id: 'man:1', type: 'Manifest', label: { en: ['Manifest A'] }, items: [] } as any,
        'man:2': { id: 'man:2', type: 'Manifest', label: { en: ['Manifest B'] }, items: [] } as any,
      },
      Canvas: {
        'can:1': { id: 'can:1', type: 'Canvas', label: { en: ['Canvas 1'] }, width: 100, height: 100, items: [] } as any,
        'can:2': { id: 'can:2', type: 'Canvas', label: { en: ['Canvas 2'] }, width: 100, height: 100, items: [] } as any,
        'can:3': { id: 'can:3', type: 'Canvas', label: { en: ['Canvas 3'] }, width: 100, height: 100, items: [] } as any,
      },
      Range: {},
      AnnotationPage: {},
      Annotation: {},
    },
    references: {
      'col:1': ['man:1', 'man:2'],
      'man:1': ['can:1', 'can:2'],
      'man:2': ['can:3'],
    },
    reverseRefs: {
      'man:1': 'col:1',
      'man:2': 'col:1',
      'can:1': 'man:1',
      'can:2': 'man:1',
      'can:3': 'man:2',
    },
    collectionMembers: {},
    memberOfCollections: {},
    rootId: 'col:1',
    typeIndex: {
      'col:1': 'Collection',
      'man:1': 'Manifest',
      'man:2': 'Manifest',
      'can:1': 'Canvas',
      'can:2': 'Canvas',
      'can:3': 'Canvas',
    } as Record<string, EntityType>,
    extensions: {},
    trashedEntities: {},
  };
}

describe('iiifTraversal', () => {
  let state: NormalizedState;

  beforeEach(() => {
    state = createTraversalState();
  });

  describe('getAllCanvases', () => {
    it('returns all canvases from the state', () => {
      const canvases = getAllCanvases(state);
      expect(canvases).toHaveLength(3);
      const ids = canvases.map(c => c.id).sort();
      expect(ids).toEqual(['can:1', 'can:2', 'can:3']);
    });

    it('returns labels for canvases', () => {
      const canvases = getAllCanvases(state);
      const c1 = canvases.find(c => c.id === 'can:1');
      expect(c1?.label).toBe('Canvas 1');
    });

    it('returns empty array when no canvases exist', () => {
      state.entities.Canvas = {};
      const canvases = getAllCanvases(state);
      expect(canvases).toEqual([]);
    });
  });

  describe('getAllItems', () => {
    it('returns all items via BFS from root', () => {
      const items = getAllItems(state);
      // Should include: col:1, man:1, man:2, can:1, can:2, can:3
      expect(items).toHaveLength(6);
      const ids = items.map(i => i.id);
      expect(ids).toContain('col:1');
      expect(ids).toContain('man:1');
      expect(ids).toContain('man:2');
      expect(ids).toContain('can:1');
      expect(ids).toContain('can:2');
      expect(ids).toContain('can:3');
    });

    it('respects BFS order: root before children', () => {
      const items = getAllItems(state);
      const ids = items.map(i => i.id);
      // col:1 should come before man:1, man:2
      expect(ids.indexOf('col:1')).toBeLessThan(ids.indexOf('man:1'));
      expect(ids.indexOf('col:1')).toBeLessThan(ids.indexOf('man:2'));
      // man:1 should come before its children can:1, can:2
      expect(ids.indexOf('man:1')).toBeLessThan(ids.indexOf('can:1'));
      expect(ids.indexOf('man:1')).toBeLessThan(ids.indexOf('can:2'));
    });

    it('returns subtree when parentId is given', () => {
      const items = getAllItems(state, 'man:1');
      const ids = items.map(i => i.id);
      expect(ids).toContain('man:1');
      expect(ids).toContain('can:1');
      expect(ids).toContain('can:2');
      expect(ids).not.toContain('col:1');
      expect(ids).not.toContain('man:2');
    });

    it('returns empty array when rootId is null and no parentId given', () => {
      state.rootId = null;
      expect(getAllItems(state)).toEqual([]);
    });

    it('includes type on each descriptor', () => {
      const items = getAllItems(state);
      const col = items.find(i => i.id === 'col:1');
      expect(col?.type).toBe('Collection');
      const man = items.find(i => i.id === 'man:1');
      expect(man?.type).toBe('Manifest');
    });
  });

  describe('getChildItems', () => {
    it('returns direct children of a node', () => {
      const children = getChildItems(state, 'col:1');
      expect(children).toHaveLength(2);
      const ids = children.map(c => c.id);
      expect(ids).toContain('man:1');
      expect(ids).toContain('man:2');
    });

    it('returns canvases as children of a manifest', () => {
      const children = getChildItems(state, 'man:1');
      expect(children).toHaveLength(2);
      expect(children.map(c => c.id)).toEqual(['can:1', 'can:2']);
    });

    it('returns empty array for leaf nodes', () => {
      const children = getChildItems(state, 'can:1');
      expect(children).toEqual([]);
    });

    it('returns empty array for non-existent parent', () => {
      const children = getChildItems(state, 'nonexistent');
      expect(children).toEqual([]);
    });
  });

  describe('getAncestors', () => {
    it('returns path from immediate parent to root', () => {
      const ancestors = getAncestors(state, 'can:1');
      // immediate parent first: man:1, then col:1
      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].id).toBe('man:1');
      expect(ancestors[1].id).toBe('col:1');
    });

    it('returns single ancestor for manifest', () => {
      const ancestors = getAncestors(state, 'man:1');
      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].id).toBe('col:1');
    });

    it('returns empty array for root', () => {
      const ancestors = getAncestors(state, 'col:1');
      expect(ancestors).toEqual([]);
    });

    it('includes type and label on ancestors', () => {
      const ancestors = getAncestors(state, 'can:1');
      const man = ancestors.find(a => a.id === 'man:1');
      expect(man?.type).toBe('Manifest');
      expect(man?.label).toBe('Manifest A');
    });

    it('handles non-existent item gracefully', () => {
      const ancestors = getAncestors(state, 'nonexistent');
      expect(ancestors).toEqual([]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Grid Virtualization
// ═══════════════════════════════════════════════════════════════════════

import { calculateGridVirtualization } from '../hooks/gridVirtualization';
import type { GridVirtualizationConfig } from '../hooks/gridVirtualization';

describe('gridVirtualization', () => {
  describe('calculateGridVirtualization', () => {
    it('calculates basic grid layout with defaults', () => {
      const result = calculateGridVirtualization({
        containerWidth: 800,
        containerHeight: 600,
        totalItems: 100,
      });

      // Default itemWidth=200, gap=8: (800+8) / (200+8) = 3.88 -> 3 columns
      expect(result.columns).toBe(3);
      expect(result.visibleRange.start).toBe(0);
      expect(result.visibleRange.end).toBeGreaterThan(0);
      expect(result.totalHeight).toBeGreaterThan(0);
    });

    it('computes correct column count', () => {
      // 1000px wide, 200px items, 8px gap: (1000+8)/(200+8) = 4.84 -> 4 columns
      const result = calculateGridVirtualization({
        containerWidth: 1000,
        containerHeight: 600,
        totalItems: 100,
        itemWidth: 200,
        gap: 8,
      });
      expect(result.columns).toBe(4);
    });

    it('enforces minimum of 1 column', () => {
      // Container narrower than one item
      const result = calculateGridVirtualization({
        containerWidth: 50,
        containerHeight: 600,
        totalItems: 10,
        itemWidth: 200,
      });
      expect(result.columns).toBe(1);
    });

    it('calculates total height correctly', () => {
      // 12 items, 3 columns = 4 rows, rowHeight = 200+8 = 208
      // totalHeight = 4 * 208 - 8 = 824
      const result = calculateGridVirtualization({
        containerWidth: 800,
        containerHeight: 600,
        totalItems: 12,
        itemWidth: 200,
        itemHeight: 200,
        gap: 8,
      });
      // 3 columns => 4 rows
      expect(result.columns).toBe(3);
      const rowHeight = 200 + 8;
      const totalRows = Math.ceil(12 / 3);
      expect(result.totalHeight).toBe(totalRows * rowHeight - 8);
    });

    it('computes visible range with scroll offset', () => {
      const result = calculateGridVirtualization({
        containerWidth: 600,
        containerHeight: 400,
        totalItems: 200,
        itemWidth: 200,
        itemHeight: 200,
        gap: 8,
        scrollTop: 416, // 2 rows of height 208 each
        overscan: 0,
      });
      // 2 columns: (600+8)/(200+8) = 2.92 -> 2
      // firstVisibleRow: floor(416/208) = 2
      // visibleRowCount: ceil(400/208) + 1 = 2 + 1 = 3
      // startRow: max(0, 2-0) = 2, endRow: min(100, 2+3+0) = 5
      expect(result.columns).toBe(2);
      expect(result.visibleRange.start).toBe(4); // row 2 * 2 cols
      expect(result.visibleRange.end).toBe(10); // row 5 * 2 cols
      expect(result.offsetY).toBe(2 * 208);
    });

    it('applies overscan rows', () => {
      const withoutOverscan = calculateGridVirtualization({
        containerWidth: 800,
        containerHeight: 400,
        totalItems: 200,
        scrollTop: 1000,
        overscan: 0,
      });
      const withOverscan = calculateGridVirtualization({
        containerWidth: 800,
        containerHeight: 400,
        totalItems: 200,
        scrollTop: 1000,
        overscan: 3,
      });
      // With overscan, the visible range should be wider
      expect(withOverscan.visibleRange.start).toBeLessThanOrEqual(withoutOverscan.visibleRange.start);
      expect(withOverscan.visibleRange.end).toBeGreaterThanOrEqual(withoutOverscan.visibleRange.end);
    });

    it('returns zero range for 0 items', () => {
      const result = calculateGridVirtualization({
        containerWidth: 800,
        containerHeight: 600,
        totalItems: 0,
      });
      expect(result.visibleRange).toEqual({ start: 0, end: 0 });
      expect(result.columns).toBe(1);
      expect(result.totalHeight).toBe(0);
      expect(result.offsetY).toBe(0);
    });

    it('returns zero range for 0 container width', () => {
      const result = calculateGridVirtualization({
        containerWidth: 0,
        containerHeight: 600,
        totalItems: 100,
      });
      expect(result.visibleRange).toEqual({ start: 0, end: 0 });
      expect(result.totalHeight).toBe(0);
    });

    it('returns zero range for 0 container height', () => {
      const result = calculateGridVirtualization({
        containerWidth: 800,
        containerHeight: 0,
        totalItems: 100,
      });
      expect(result.visibleRange).toEqual({ start: 0, end: 0 });
      expect(result.totalHeight).toBe(0);
    });

    it('does not exceed totalItems in end index', () => {
      const result = calculateGridVirtualization({
        containerWidth: 800,
        containerHeight: 10000, // very tall
        totalItems: 5,
        overscan: 10,
      });
      expect(result.visibleRange.end).toBeLessThanOrEqual(5);
    });

    it('handles very small container with large items', () => {
      const result = calculateGridVirtualization({
        containerWidth: 10,
        containerHeight: 10,
        totalItems: 100,
        itemWidth: 500,
        itemHeight: 500,
      });
      // Should still return at minimum 1 column
      expect(result.columns).toBe(1);
      expect(result.visibleRange.start).toBe(0);
    });

    it('uses default gap of 8 when not specified', () => {
      const withDefault = calculateGridVirtualization({
        containerWidth: 800,
        containerHeight: 600,
        totalItems: 50,
      });
      const withExplicit = calculateGridVirtualization({
        containerWidth: 800,
        containerHeight: 600,
        totalItems: 50,
        gap: 8,
      });
      expect(withDefault.columns).toBe(withExplicit.columns);
      expect(withDefault.totalHeight).toBe(withExplicit.totalHeight);
    });

    it('handles gap of 0', () => {
      const result = calculateGridVirtualization({
        containerWidth: 400,
        containerHeight: 400,
        totalItems: 4,
        itemWidth: 200,
        itemHeight: 200,
        gap: 0,
      });
      // (400+0)/(200+0) = 2 columns
      expect(result.columns).toBe(2);
      // 2 rows, rowHeight=200, totalHeight = 2*200 - 0 = 400
      expect(result.totalHeight).toBe(400);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Viewing Direction
// ═══════════════════════════════════════════════════════════════════════

import {
  getDirectionStyles,
  getDirectionClass,
} from '@/src/features/archive/lib/viewingDirection';

describe('viewingDirection', () => {
  describe('getDirectionStyles', () => {
    it('returns left-to-right (default) styles', () => {
      const styles = getDirectionStyles('left-to-right');
      expect(styles).toEqual({
        flexDirection: 'row',
        writingMode: 'horizontal-tb',
        textAlign: 'left',
        isRtl: false,
        isVertical: false,
      });
    });

    it('returns right-to-left styles', () => {
      const styles = getDirectionStyles('right-to-left');
      expect(styles).toEqual({
        flexDirection: 'row-reverse',
        writingMode: 'horizontal-tb',
        textAlign: 'right',
        isRtl: true,
        isVertical: false,
      });
    });

    it('returns top-to-bottom styles', () => {
      const styles = getDirectionStyles('top-to-bottom');
      expect(styles).toEqual({
        flexDirection: 'column',
        writingMode: 'vertical-rl',
        textAlign: 'left',
        isRtl: false,
        isVertical: true,
      });
    });

    it('returns bottom-to-top styles', () => {
      const styles = getDirectionStyles('bottom-to-top');
      expect(styles).toEqual({
        flexDirection: 'column-reverse',
        writingMode: 'vertical-lr',
        textAlign: 'left',
        isRtl: false,
        isVertical: true,
      });
    });

    it('defaults to left-to-right for null', () => {
      const styles = getDirectionStyles(null);
      expect(styles.flexDirection).toBe('row');
      expect(styles.isRtl).toBe(false);
      expect(styles.isVertical).toBe(false);
    });

    it('defaults to left-to-right for undefined', () => {
      const styles = getDirectionStyles(undefined);
      expect(styles.flexDirection).toBe('row');
    });

    it('defaults to left-to-right for unknown string', () => {
      const styles = getDirectionStyles('some-unknown-direction');
      expect(styles.flexDirection).toBe('row');
      expect(styles.isRtl).toBe(false);
    });
  });

  describe('getDirectionClass', () => {
    it('returns flex-row for left-to-right', () => {
      expect(getDirectionClass('left-to-right')).toBe('flex-row');
    });

    it('returns flex-row-reverse for right-to-left', () => {
      expect(getDirectionClass('right-to-left')).toBe('flex-row-reverse');
    });

    it('returns flex-col for top-to-bottom', () => {
      expect(getDirectionClass('top-to-bottom')).toBe('flex-col');
    });

    it('returns flex-col-reverse for bottom-to-top', () => {
      expect(getDirectionClass('bottom-to-top')).toBe('flex-col-reverse');
    });

    it('defaults to flex-row for null/undefined', () => {
      expect(getDirectionClass(null)).toBe('flex-row');
      expect(getDirectionClass(undefined)).toBe('flex-row');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. Alignment Guides
// ═══════════════════════════════════════════════════════════════════════

import {
  calculateAlignmentGuides,
  snapToGrid,
} from '@/src/features/board-design/lib/alignmentGuides';
import type { Rect } from '@/src/features/board-design/lib/alignmentGuides';

describe('alignmentGuides', () => {
  describe('calculateAlignmentGuides', () => {
    it('snaps left edges when within threshold', () => {
      // Use items with very different widths so only left-edge aligns, not center
      const dragItem: Rect = { x: 103, y: 200, width: 50, height: 80 };
      const others: Rect[] = [{ x: 100, y: 50, width: 300, height: 80 }];

      const result = calculateAlignmentGuides(dragItem, others, 8);
      // Left edge: |103 - 100| = 3 < 8 => snaps
      // Right edge: |(103+50) - (100+300)| = |153-400| = 247 => no snap
      // Center: |103+25 - 100+150| = |128-250| = 122 => no snap
      expect(result.guides.some(g => g.type === 'vertical' && g.position === 100)).toBe(true);
      expect(result.snappedX).toBe(100);
    });

    it('snaps right edges when within threshold', () => {
      const dragItem: Rect = { x: 0, y: 0, width: 100, height: 80 };
      const other: Rect = { x: 50, y: 50, width: 55, height: 80 };
      // drag right edge = 0+100=100, other right edge = 50+55=105, diff=5 < 8
      const result = calculateAlignmentGuides(dragItem, [other], 8);
      expect(result.guides.some(g => g.type === 'vertical' && g.position === 105)).toBe(true);
      expect(result.snappedX).toBe(105 - 100); // snaps so right edges align
    });

    it('snaps center-to-center vertically', () => {
      const dragItem: Rect = { x: 100, y: 100, width: 100, height: 80 };
      const other: Rect = { x: 300, y: 100, width: 100, height: 80 };
      // drag centerX = 150, other centerX = 350 => no snap
      // drag centerY = 140, other centerY = 140 => exact match => horizontal guide
      const result = calculateAlignmentGuides(dragItem, [other], 8);
      expect(result.guides.some(g => g.type === 'horizontal' && g.position === 140)).toBe(true);
      expect(result.snappedY).toBe(140 - 80 / 2); // 100
    });

    it('snaps top edges when within threshold', () => {
      const dragItem: Rect = { x: 300, y: 52, width: 100, height: 80 };
      const other: Rect = { x: 100, y: 50, width: 100, height: 80 };
      // |52 - 50| = 2 < 8
      const result = calculateAlignmentGuides(dragItem, [other], 8);
      expect(result.guides.some(g => g.type === 'horizontal' && g.position === 50)).toBe(true);
      expect(result.snappedY).toBe(50);
    });

    it('snaps bottom edges when within threshold', () => {
      const dragItem: Rect = { x: 0, y: 0, width: 100, height: 80 };
      const other: Rect = { x: 200, y: 5, width: 100, height: 80 };
      // drag bottom = 0+80=80, other bottom = 5+80=85 => diff=5 < 8
      const result = calculateAlignmentGuides(dragItem, [other], 8);
      expect(result.guides.some(g => g.type === 'horizontal' && g.position === 85)).toBe(true);
      expect(result.snappedY).toBe(85 - 80); // 5
    });

    it('returns no guides when nothing is within threshold', () => {
      const dragItem: Rect = { x: 0, y: 0, width: 100, height: 100 };
      const other: Rect = { x: 500, y: 500, width: 100, height: 100 };
      const result = calculateAlignmentGuides(dragItem, [other], 8);
      expect(result.guides).toHaveLength(0);
      expect(result.snappedX).toBeNull();
      expect(result.snappedY).toBeNull();
    });

    it('returns no guides with empty otherItems', () => {
      const dragItem: Rect = { x: 0, y: 0, width: 100, height: 100 };
      const result = calculateAlignmentGuides(dragItem, [], 8);
      expect(result.guides).toEqual([]);
      expect(result.snappedX).toBeNull();
      expect(result.snappedY).toBeNull();
    });

    it('generates multiple guides from multiple items', () => {
      const dragItem: Rect = { x: 100, y: 100, width: 100, height: 100 };
      const others: Rect[] = [
        { x: 100, y: 300, width: 80, height: 60 }, // left edge aligns
        { x: 100, y: 500, width: 120, height: 40 }, // left edge aligns
      ];
      const result = calculateAlignmentGuides(dragItem, others, 8);
      const verticalGuides = result.guides.filter(g => g.type === 'vertical');
      expect(verticalGuides.length).toBeGreaterThanOrEqual(2);
    });

    it('uses default snap threshold of 8', () => {
      const dragItem: Rect = { x: 107, y: 0, width: 100, height: 100 };
      const other: Rect = { x: 100, y: 200, width: 100, height: 100 };
      // |107 - 100| = 7 < 8 (default threshold)
      const result = calculateAlignmentGuides(dragItem, [other]);
      expect(result.snappedX).toBe(100);
    });

    it('respects custom snap threshold', () => {
      const dragItem: Rect = { x: 107, y: 0, width: 100, height: 100 };
      const other: Rect = { x: 100, y: 200, width: 100, height: 100 };
      // |107 - 100| = 7 > 5 (custom threshold)
      const noSnap = calculateAlignmentGuides(dragItem, [other], 5);
      expect(noSnap.snappedX).toBeNull();

      // |107 - 100| = 7 < 10 (custom threshold)
      const snaps = calculateAlignmentGuides(dragItem, [other], 10);
      expect(snaps.snappedX).toBe(100);
    });
  });

  describe('snapToGrid', () => {
    it('snaps to nearest grid point', () => {
      expect(snapToGrid(17, 10)).toBe(20);
      expect(snapToGrid(14, 10)).toBe(10);
      expect(snapToGrid(15, 10)).toBe(20); // Math.round rounds 1.5 up
    });

    it('returns exact value when already on grid', () => {
      expect(snapToGrid(20, 10)).toBe(20);
      expect(snapToGrid(0, 10)).toBe(0);
    });

    it('works with grid size of 1', () => {
      expect(snapToGrid(17.3, 1)).toBe(17);
      expect(snapToGrid(17.7, 1)).toBe(18);
    });

    it('works with large grid sizes', () => {
      expect(snapToGrid(130, 100)).toBe(100);
      expect(snapToGrid(160, 100)).toBe(200);
    });

    it('works with negative values', () => {
      expect(snapToGrid(-17, 10)).toBe(-20);
      expect(snapToGrid(-14, 10)).toBe(-10);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Viewing Behavior
// ═══════════════════════════════════════════════════════════════════════

import {
  resolveViewingBehavior,
  getCanvasLayout,
  buildPageSpreads,
  isFacingPage,
  isNonPaged,
  categorizeUnknownBehaviors,
} from '@/src/features/viewer/lib/viewingBehavior';
import type { BehaviorCanvas, ViewingBehavior } from '@/src/features/viewer/lib/viewingBehavior';

describe('viewingBehavior', () => {
  describe('resolveViewingBehavior', () => {
    it('defaults to individuals layout when no behaviors specified', () => {
      const result = resolveViewingBehavior();
      expect(result.layout).toBe('individuals');
      expect(result.autoAdvance).toBe(false);
      expect(result.repeat).toBe(false);
      expect(result.unordered).toBe(false);
      expect(result.facingPages.size).toBe(0);
      expect(result.nonPaged.size).toBe(0);
    });

    it('resolves manifest-level layout', () => {
      const result = resolveViewingBehavior(['paged']);
      expect(result.layout).toBe('paged');
    });

    it('canvas-level layout overrides manifest-level', () => {
      const result = resolveViewingBehavior(['paged'], ['continuous']);
      expect(result.layout).toBe('continuous');
    });

    it('falls back to manifest layout when canvas has no layout behavior', () => {
      const result = resolveViewingBehavior(['continuous'], ['auto-advance']);
      expect(result.layout).toBe('continuous');
    });

    it('resolves auto-advance from manifest behaviors', () => {
      const result = resolveViewingBehavior(['auto-advance']);
      expect(result.autoAdvance).toBe(true);
    });

    it('no-auto-advance overrides auto-advance', () => {
      const result = resolveViewingBehavior(['auto-advance', 'no-auto-advance']);
      expect(result.autoAdvance).toBe(false);
    });

    it('resolves repeat from manifest behaviors', () => {
      const result = resolveViewingBehavior(['repeat']);
      expect(result.repeat).toBe(true);
    });

    it('no-repeat overrides repeat', () => {
      const result = resolveViewingBehavior(['repeat', 'no-repeat']);
      expect(result.repeat).toBe(false);
    });

    it('resolves unordered from manifest behaviors', () => {
      const result = resolveViewingBehavior(['unordered']);
      expect(result.unordered).toBe(true);
    });

    it('builds facingPages set from allCanvases', () => {
      const canvases: BehaviorCanvas[] = [
        { id: 'c1', behavior: ['facing-pages'] },
        { id: 'c2' },
        { id: 'c3', behavior: ['facing-pages'] },
      ];
      const result = resolveViewingBehavior(['paged'], [], canvases);
      expect(result.facingPages.has('c1')).toBe(true);
      expect(result.facingPages.has('c2')).toBe(false);
      expect(result.facingPages.has('c3')).toBe(true);
    });

    it('builds nonPaged set from allCanvases', () => {
      const canvases: BehaviorCanvas[] = [
        { id: 'c1', behavior: ['non-paged'] },
        { id: 'c2' },
      ];
      const result = resolveViewingBehavior(['paged'], [], canvases);
      expect(result.nonPaged.has('c1')).toBe(true);
      expect(result.nonPaged.has('c2')).toBe(false);
    });

    it('handles multiple manifest-level behaviors', () => {
      const result = resolveViewingBehavior(['paged', 'auto-advance', 'repeat']);
      expect(result.layout).toBe('paged');
      expect(result.autoAdvance).toBe(true);
      expect(result.repeat).toBe(true);
    });
  });

  describe('getCanvasLayout', () => {
    it('returns manifest layout when canvas has no layout behavior', () => {
      const behavior = resolveViewingBehavior(['paged']);
      expect(getCanvasLayout('c1', behavior)).toBe('paged');
    });

    it('returns canvas-level layout override', () => {
      const behavior = resolveViewingBehavior(['paged']);
      expect(getCanvasLayout('c1', behavior, ['continuous'])).toBe('continuous');
    });

    it('returns individuals for non-paged canvas in paged manifest', () => {
      const canvases: BehaviorCanvas[] = [
        { id: 'c1', behavior: ['non-paged'] },
      ];
      const behavior = resolveViewingBehavior(['paged'], [], canvases);
      expect(getCanvasLayout('c1', behavior)).toBe('individuals');
    });

    it('returns manifest layout for non-paged canvas if manifest is not paged', () => {
      const canvases: BehaviorCanvas[] = [
        { id: 'c1', behavior: ['non-paged'] },
      ];
      const behavior = resolveViewingBehavior(['continuous'], [], canvases);
      // non-paged override only applies to paged manifests
      expect(getCanvasLayout('c1', behavior)).toBe('continuous');
    });
  });

  describe('isFacingPage / isNonPaged', () => {
    it('isFacingPage returns true for canvas in facingPages set', () => {
      const canvases: BehaviorCanvas[] = [{ id: 'c1', behavior: ['facing-pages'] }];
      const behavior = resolveViewingBehavior(['paged'], [], canvases);
      expect(isFacingPage('c1', behavior)).toBe(true);
      expect(isFacingPage('c2', behavior)).toBe(false);
    });

    it('isNonPaged returns true for canvas in nonPaged set', () => {
      const canvases: BehaviorCanvas[] = [{ id: 'c1', behavior: ['non-paged'] }];
      const behavior = resolveViewingBehavior(['paged'], [], canvases);
      expect(isNonPaged('c1', behavior)).toBe(true);
      expect(isNonPaged('c2', behavior)).toBe(false);
    });
  });

  describe('buildPageSpreads', () => {
    it('returns each canvas solo when layout is not paged', () => {
      const behavior = resolveViewingBehavior(['individuals']);
      const canvases: BehaviorCanvas[] = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
      const spreads = buildPageSpreads(canvases, behavior);
      expect(spreads).toEqual([[{ id: 'c1' }], [{ id: 'c2' }], [{ id: 'c3' }]]);
    });

    it('pairs canvases in paged layout with first as cover', () => {
      const behavior = resolveViewingBehavior(['paged']);
      const canvases: BehaviorCanvas[] = [
        { id: 'c1' }, // cover (solo)
        { id: 'c2' }, // pair with c3
        { id: 'c3' },
        { id: 'c4' }, // pair with c5
        { id: 'c5' },
      ];
      const spreads = buildPageSpreads(canvases, behavior);
      expect(spreads).toEqual([
        [{ id: 'c1' }],           // cover
        [{ id: 'c2' }, { id: 'c3' }], // pair
        [{ id: 'c4' }, { id: 'c5' }], // pair
      ]);
    });

    it('handles non-paged canvas breaking a pair', () => {
      const canvases: BehaviorCanvas[] = [
        { id: 'c1' },
        { id: 'c2' },
        { id: 'c3', behavior: ['non-paged'] },
        { id: 'c4' },
        { id: 'c5' },
      ];
      const behavior = resolveViewingBehavior(['paged'], [], canvases);
      const spreads = buildPageSpreads(canvases, behavior);
      // c1 = cover (solo), c2 tries to pair with c3 but c3 is non-paged
      // so c2 is solo, c3 is solo (non-paged), c4+c5 pair
      expect(spreads).toEqual([
        [{ id: 'c1' }],
        [{ id: 'c2' }],
        [{ id: 'c3', behavior: ['non-paged'] }],
        [{ id: 'c4' }, { id: 'c5' }],
      ]);
    });

    it('handles odd number of canvases in paged layout', () => {
      const behavior = resolveViewingBehavior(['paged']);
      const canvases: BehaviorCanvas[] = [
        { id: 'c1' }, // cover
        { id: 'c2' }, // pair with c3
        { id: 'c3' },
        { id: 'c4' }, // solo (odd one out)
      ];
      const spreads = buildPageSpreads(canvases, behavior);
      expect(spreads).toEqual([
        [{ id: 'c1' }],
        [{ id: 'c2' }, { id: 'c3' }],
        [{ id: 'c4' }],
      ]);
    });

    it('handles empty canvas list', () => {
      const behavior = resolveViewingBehavior(['paged']);
      const spreads = buildPageSpreads([], behavior);
      expect(spreads).toEqual([]);
    });

    it('handles single canvas in paged layout', () => {
      const behavior = resolveViewingBehavior(['paged']);
      const canvases: BehaviorCanvas[] = [{ id: 'c1' }];
      const spreads = buildPageSpreads(canvases, behavior);
      expect(spreads).toEqual([[{ id: 'c1' }]]);
    });
  });

  describe('categorizeUnknownBehaviors', () => {
    it('classifies known IIIF behaviors', () => {
      const result = categorizeUnknownBehaviors(['paged', 'auto-advance', 'hidden', 'facing-pages']);
      expect(result.known).toEqual(['paged', 'auto-advance', 'hidden', 'facing-pages']);
      expect(result.unknown).toEqual([]);
    });

    it('classifies unknown behaviors', () => {
      const result = categorizeUnknownBehaviors(['custom-thing', 'paged', 'xyz']);
      expect(result.known).toEqual(['paged']);
      expect(result.unknown).toEqual(['custom-thing', 'xyz']);
    });

    it('handles empty array', () => {
      const result = categorizeUnknownBehaviors([]);
      expect(result.known).toEqual([]);
      expect(result.unknown).toEqual([]);
    });

    it('recognizes all layout behaviors', () => {
      const { known } = categorizeUnknownBehaviors(['individuals', 'continuous', 'paged']);
      expect(known).toHaveLength(3);
    });

    it('recognizes temporal and repeat behaviors', () => {
      const { known } = categorizeUnknownBehaviors([
        'auto-advance', 'no-auto-advance', 'repeat', 'no-repeat',
      ]);
      expect(known).toHaveLength(4);
    });

    it('recognizes ordering and canvas-only behaviors', () => {
      const { known } = categorizeUnknownBehaviors([
        'unordered', 'sequence', 'facing-pages', 'non-paged',
      ]);
      expect(known).toHaveLength(4);
    });

    it('recognizes additional known IIIF behaviors', () => {
      const { known } = categorizeUnknownBehaviors([
        'hidden', 'thumbnail-nav', 'no-nav', 'together', 'multi-part',
      ]);
      expect(known).toHaveLength(5);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Vault Selectors
// ═══════════════════════════════════════════════════════════════════════

import {
  getEntity,
  getEntityLabel,
  getEntityChildren,
  getEntityParent,
  getEntityType,
  entityExists,
  getEntityAncestors,
  getEntityDescendants,
  getEntityPath,
  buildEntityTree,
  getEntitiesByType,
  getSelectedEntities,
  getValidationSummary,
  getEntityLabelText,
} from '@/src/entities/manifest/model/vaultSelectors';

/** Reuse the traversal state fixture for vault selectors tests */
function createSelectorState(): NormalizedState {
  return createTraversalState();
}

describe('vaultSelectors', () => {
  let state: NormalizedState;

  beforeEach(() => {
    state = createSelectorState();
  });

  describe('getEntity', () => {
    it('returns entity by ID', () => {
      const entity = getEntity(state, 'man:1');
      expect(entity).not.toBeNull();
      expect(entity!.id).toBe('man:1');
      expect(entity!.type).toBe('Manifest');
    });

    it('returns null for non-existent ID', () => {
      expect(getEntity(state, 'nonexistent')).toBeNull();
    });

    it('returns null for empty ID', () => {
      expect(getEntity(state, '')).toBeNull();
    });

    it('returns null when state is null', () => {
      expect(getEntity(null as any, 'man:1')).toBeNull();
    });
  });

  describe('getEntityLabel', () => {
    it('returns label text for entity with label', () => {
      expect(getEntityLabel(state, 'man:1')).toBe('Manifest A');
      expect(getEntityLabel(state, 'col:1')).toBe('Root Collection');
    });

    it('falls back to ID for non-existent entity', () => {
      expect(getEntityLabel(state, 'nonexistent')).toBe('nonexistent');
    });
  });

  describe('getEntityChildren', () => {
    it('returns child IDs for a parent', () => {
      const children = getEntityChildren(state, 'col:1');
      expect(children).toEqual(['man:1', 'man:2']);
    });

    it('returns empty array for leaf nodes', () => {
      expect(getEntityChildren(state, 'can:1')).toEqual([]);
    });

    it('returns empty array for non-existent parent', () => {
      expect(getEntityChildren(state, 'nonexistent')).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(getEntityChildren(state, '')).toEqual([]);
    });
  });

  describe('getEntityParent', () => {
    it('returns parent ID', () => {
      expect(getEntityParent(state, 'man:1')).toBe('col:1');
      expect(getEntityParent(state, 'can:1')).toBe('man:1');
    });

    it('returns null for root entity', () => {
      expect(getEntityParent(state, 'col:1')).toBeNull();
    });

    it('returns null for non-existent entity', () => {
      expect(getEntityParent(state, 'nonexistent')).toBeNull();
    });
  });

  describe('getEntityType', () => {
    it('returns correct entity type', () => {
      expect(getEntityType(state, 'col:1')).toBe('Collection');
      expect(getEntityType(state, 'man:1')).toBe('Manifest');
      expect(getEntityType(state, 'can:1')).toBe('Canvas');
    });

    it('returns null for non-existent entity', () => {
      expect(getEntityType(state, 'nonexistent')).toBeNull();
    });
  });

  describe('entityExists', () => {
    it('returns true for existing entities', () => {
      expect(entityExists(state, 'col:1')).toBe(true);
      expect(entityExists(state, 'man:1')).toBe(true);
      expect(entityExists(state, 'can:1')).toBe(true);
    });

    it('returns false for non-existent entities', () => {
      expect(entityExists(state, 'nonexistent')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(entityExists(state, '')).toBe(false);
    });
  });

  describe('getEntityAncestors', () => {
    it('returns ancestors from root to immediate parent', () => {
      const ancestors = getEntityAncestors(state, 'can:1');
      // Root first, immediate parent last
      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].id).toBe('col:1');
      expect(ancestors[1].id).toBe('man:1');
    });

    it('returns single ancestor for direct child of root', () => {
      const ancestors = getEntityAncestors(state, 'man:1');
      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].id).toBe('col:1');
    });

    it('returns empty for root entity', () => {
      expect(getEntityAncestors(state, 'col:1')).toEqual([]);
    });

    it('includes labels on breadcrumb segments', () => {
      const ancestors = getEntityAncestors(state, 'can:1');
      expect(ancestors[0].label).toBe('Root Collection');
      expect(ancestors[1].label).toBe('Manifest A');
    });
  });

  describe('getEntityDescendants', () => {
    it('returns all descendants of root', () => {
      const desc = getEntityDescendants(state, 'col:1');
      expect(desc).toHaveLength(5); // 2 manifests + 3 canvases
      expect(desc).toContain('man:1');
      expect(desc).toContain('man:2');
      expect(desc).toContain('can:1');
      expect(desc).toContain('can:2');
      expect(desc).toContain('can:3');
    });

    it('returns descendants of a manifest', () => {
      const desc = getEntityDescendants(state, 'man:1');
      expect(desc).toHaveLength(2);
      expect(desc).toContain('can:1');
      expect(desc).toContain('can:2');
    });

    it('returns empty for leaf node', () => {
      expect(getEntityDescendants(state, 'can:1')).toEqual([]);
    });

    it('does not include the starting entity itself', () => {
      const desc = getEntityDescendants(state, 'col:1');
      expect(desc).not.toContain('col:1');
    });
  });

  describe('getEntityPath', () => {
    it('returns full path from root to entity', () => {
      const path = getEntityPath(state, 'can:1');
      expect(path).toHaveLength(3);
      expect(path[0].id).toBe('col:1');
      expect(path[1].id).toBe('man:1');
      expect(path[2].id).toBe('can:1');
    });

    it('returns single element for root', () => {
      const path = getEntityPath(state, 'col:1');
      expect(path).toHaveLength(1);
      expect(path[0].id).toBe('col:1');
    });
  });

  describe('buildEntityTree', () => {
    it('builds recursive tree from root', () => {
      const tree = buildEntityTree(state, 'col:1');
      expect(tree.id).toBe('col:1');
      expect(tree.depth).toBe(0);
      expect(tree.children).toHaveLength(2);

      const man1 = tree.children.find(c => c.id === 'man:1');
      expect(man1).toBeDefined();
      expect(man1!.depth).toBe(1);
      expect(man1!.children).toHaveLength(2);

      const can1 = man1!.children.find(c => c.id === 'can:1');
      expect(can1).toBeDefined();
      expect(can1!.depth).toBe(2);
      expect(can1!.children).toEqual([]);
    });

    it('respects maxDepth', () => {
      const tree = buildEntityTree(state, 'col:1', 1);
      expect(tree.children).toHaveLength(2);
      // At depth 1 (the manifests), children should not be expanded further
      for (const child of tree.children) {
        expect(child.children).toEqual([]);
      }
    });

    it('includes labels', () => {
      const tree = buildEntityTree(state, 'col:1');
      expect(tree.label).toBe('Root Collection');
      expect(tree.children[0].label).toBeTruthy();
    });

    it('handles non-existent root gracefully', () => {
      const tree = buildEntityTree(state, 'nonexistent');
      expect(tree.id).toBe('nonexistent');
      expect(tree.children).toEqual([]);
      expect(tree.type).toBe('unknown');
    });
  });

  describe('getEntitiesByType', () => {
    it('returns all entities of a given type sorted by label', () => {
      const manifests = getEntitiesByType(state, 'Manifest');
      expect(manifests).toHaveLength(2);
      // Sorted alphabetically: 'Manifest A' before 'Manifest B'
      expect(manifests[0].label).toBe('Manifest A');
      expect(manifests[1].label).toBe('Manifest B');
    });

    it('returns canvases', () => {
      const canvases = getEntitiesByType(state, 'Canvas');
      expect(canvases).toHaveLength(3);
    });

    it('returns empty array for type with no entities', () => {
      const ranges = getEntitiesByType(state, 'Range');
      expect(ranges).toEqual([]);
    });

    it('returns empty for unknown type', () => {
      const result = getEntitiesByType(state, 'UnknownType');
      expect(result).toEqual([]);
    });
  });

  describe('getSelectedEntities', () => {
    it('returns entities for given IDs', () => {
      const entities = getSelectedEntities(state, ['man:1', 'can:1']);
      expect(entities).toHaveLength(2);
      expect(entities.map(e => e.id)).toContain('man:1');
      expect(entities.map(e => e.id)).toContain('can:1');
    });

    it('filters out non-existent IDs', () => {
      const entities = getSelectedEntities(state, ['man:1', 'nonexistent']);
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe('man:1');
    });

    it('returns empty for empty IDs array', () => {
      expect(getSelectedEntities(state, [])).toEqual([]);
    });
  });

  describe('getValidationSummary', () => {
    it('counts by severity', () => {
      const issues = {
        'man:1': [
          { id: 'i1', severity: 'error', title: 'Missing label', description: '' },
          { id: 'i2', severity: 'warning', title: 'Invalid rights', description: '' },
          { id: 'i3', severity: 'info', title: 'Optional summary', description: '' },
        ],
      };
      const summary = getValidationSummary(issues);
      expect(summary.errors).toBe(1);
      expect(summary.warnings).toBe(1);
      expect(summary.info).toBe(1);
    });

    it('counts by category using first word of title', () => {
      const issues = {
        'man:1': [
          { id: 'i1', severity: 'error', title: 'Missing label', description: '' },
          { id: 'i2', severity: 'error', title: 'Missing summary', description: '' },
          { id: 'i3', severity: 'warning', title: 'Invalid URI', description: '' },
        ],
      };
      const summary = getValidationSummary(issues);
      expect(summary.byCategory['missing']).toBe(2);
      expect(summary.byCategory['invalid']).toBe(1);
    });

    it('handles empty issues', () => {
      const summary = getValidationSummary({});
      expect(summary.errors).toBe(0);
      expect(summary.warnings).toBe(0);
      expect(summary.info).toBe(0);
      expect(summary.byCategory).toEqual({});
    });

    it('handles null issues', () => {
      const summary = getValidationSummary(null as any);
      expect(summary.errors).toBe(0);
    });

    it('treats unknown severity as info', () => {
      const issues = {
        'man:1': [
          { id: 'i1', severity: 'unknown-severity', title: 'Something', description: '' },
        ],
      };
      const summary = getValidationSummary(issues);
      expect(summary.info).toBe(1);
    });

    it('counts issues across multiple entities', () => {
      const issues = {
        'man:1': [
          { id: 'i1', severity: 'error', title: 'Missing label', description: '' },
        ],
        'can:1': [
          { id: 'i2', severity: 'error', title: 'Missing thumbnail', description: '' },
          { id: 'i3', severity: 'warning', title: 'Invalid format', description: '' },
        ],
      };
      const summary = getValidationSummary(issues);
      expect(summary.errors).toBe(2);
      expect(summary.warnings).toBe(1);
    });
  });

  describe('getEntityLabelText', () => {
    it('extracts label from IIIF language map', () => {
      const entity = { id: 'test', type: 'Manifest' as const, label: { en: ['My Manifest'] } } as any;
      expect(getEntityLabelText(entity)).toBe('My Manifest');
    });

    it('falls back to last path segment of ID', () => {
      const entity = { id: 'https://example.org/manifest/abc', type: 'Manifest' as const } as any;
      expect(getEntityLabelText(entity)).toBe('abc');
    });

    it('returns empty string for null entity', () => {
      expect(getEntityLabelText(null as any)).toBe('');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. Conflict Detection
// ═══════════════════════════════════════════════════════════════════════

import {
  detectConflicts,
  detectDuplicatesInBatch,
} from '../hooks/conflictDetection';

/**
 * Create a minimal File-like object for testing.
 * In happy-dom, File is available from test-setup.
 */
function createFile(name: string): File {
  return new File(['content'], name, { type: 'application/octet-stream' });
}

describe('conflictDetection', () => {
  describe('detectConflicts', () => {
    it('detects conflict when filename matches existing label', () => {
      const files = [createFile('photo.jpg')];
      const existing = new Map([['canvas:1', 'photo']]);

      const conflicts = detectConflicts(files, existing);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].filename).toBe('photo.jpg');
      expect(conflicts[0].existingId).toBe('canvas:1');
    });

    it('detects conflict with full filename match', () => {
      const files = [createFile('photo.jpg')];
      const existing = new Map([['canvas:1', 'photo.jpg']]);

      const conflicts = detectConflicts(files, existing);
      expect(conflicts).toHaveLength(1);
    });

    it('is case-insensitive', () => {
      const files = [createFile('Photo.JPG')];
      const existing = new Map([['canvas:1', 'photo']]);

      const conflicts = detectConflicts(files, existing);
      expect(conflicts).toHaveLength(1);
    });

    it('returns empty when no conflicts', () => {
      const files = [createFile('new-image.png')];
      const existing = new Map([['canvas:1', 'old-image']]);

      const conflicts = detectConflicts(files, existing);
      expect(conflicts).toEqual([]);
    });

    it('handles multiple files with some conflicts', () => {
      const files = [
        createFile('photo.jpg'),
        createFile('document.pdf'),
        createFile('scan.tiff'),
      ];
      const existing = new Map([
        ['canvas:1', 'photo'],
        ['canvas:2', 'scan'],
      ]);

      const conflicts = detectConflicts(files, existing);
      expect(conflicts).toHaveLength(2);
      const filenames = conflicts.map(c => c.filename);
      expect(filenames).toContain('photo.jpg');
      expect(filenames).toContain('scan.tiff');
    });

    it('handles empty file list', () => {
      const existing = new Map([['canvas:1', 'photo']]);
      expect(detectConflicts([], existing)).toEqual([]);
    });

    it('handles empty existing labels', () => {
      const files = [createFile('photo.jpg')];
      expect(detectConflicts(files, new Map())).toEqual([]);
    });

    it('attaches the File object to conflict info', () => {
      const file = createFile('photo.jpg');
      const conflicts = detectConflicts([file], new Map([['c:1', 'photo']]));
      expect(conflicts[0].newFile).toBe(file);
    });
  });

  describe('detectDuplicatesInBatch', () => {
    it('detects duplicate filenames in batch', () => {
      const files = [
        createFile('photo.jpg'),
        createFile('Photo.JPG'),
        createFile('unique.png'),
      ];

      const dupes = detectDuplicatesInBatch(files);
      expect(dupes.size).toBe(1);
      expect(dupes.has('photo.jpg')).toBe(true);
      expect(dupes.get('photo.jpg')!).toHaveLength(2);
    });

    it('returns empty map when no duplicates', () => {
      const files = [
        createFile('a.jpg'),
        createFile('b.jpg'),
        createFile('c.jpg'),
      ];
      expect(detectDuplicatesInBatch(files).size).toBe(0);
    });

    it('handles empty file list', () => {
      expect(detectDuplicatesInBatch([]).size).toBe(0);
    });

    it('groups more than 2 duplicates', () => {
      const files = [
        createFile('photo.jpg'),
        createFile('Photo.jpg'),
        createFile('PHOTO.JPG'),
      ];
      const dupes = detectDuplicatesInBatch(files);
      expect(dupes.get('photo.jpg')!).toHaveLength(3);
    });

    it('is case-insensitive for matching', () => {
      const files = [createFile('Test.TXT'), createFile('test.txt')];
      const dupes = detectDuplicatesInBatch(files);
      expect(dupes.size).toBe(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. Metadata Editor
// ═══════════════════════════════════════════════════════════════════════

import {
  updateMetadataField,
  addMetadataField,
  removeMetadataField,
  getAllowedProperties,
  getAvailableProperties,
} from '../hooks/metadataEditor';

import type { IIIFItem } from '@/src/shared/types';

describe('metadataEditor', () => {
  /** Create a minimal IIIFItem for testing */
  function createResource(overrides?: Partial<IIIFItem>): IIIFItem {
    return {
      id: 'https://example.org/manifest/1',
      type: 'Manifest',
      label: { en: ['Test'] },
      metadata: [
        { label: { en: ['Author'] }, value: { en: ['Jane Doe'] } },
        { label: { en: ['Date'] }, value: { en: ['2024'] } },
      ],
      ...overrides,
    } as IIIFItem;
  }

  describe('updateMetadataField', () => {
    it('updates metadata entry at given index', () => {
      const resource = createResource();
      const patch = updateMetadataField(resource, 0, 'Creator', 'John Smith', 'en');

      expect(patch.metadata).toHaveLength(2);
      expect(patch.metadata![0]).toEqual({
        label: { en: ['Creator'] },
        value: { en: ['John Smith'] },
      });
      // Second entry unchanged
      expect(patch.metadata![1]).toEqual({
        label: { en: ['Date'] },
        value: { en: ['2024'] },
      });
    });

    it('does not mutate the original resource', () => {
      const resource = createResource();
      const originalMeta = resource.metadata![0];
      updateMetadataField(resource, 0, 'Creator', 'John Smith', 'en');
      expect(resource.metadata![0]).toBe(originalMeta);
    });

    it('respects language parameter', () => {
      const resource = createResource();
      const patch = updateMetadataField(resource, 0, 'Auteur', 'Jean Dupont', 'fr');
      expect(patch.metadata![0]).toEqual({
        label: { fr: ['Auteur'] },
        value: { fr: ['Jean Dupont'] },
      });
    });

    it('handles resource with no existing metadata', () => {
      const resource = createResource({ metadata: undefined });
      const patch = updateMetadataField(resource, 0, 'Key', 'Val', 'en');
      expect(patch.metadata).toBeDefined();
      expect(patch.metadata![0]).toEqual({
        label: { en: ['Key'] },
        value: { en: ['Val'] },
      });
    });
  });

  describe('addMetadataField', () => {
    it('adds to metadata array for non-IIIF property names', () => {
      const resource = createResource();
      const patch = addMetadataField(resource, 'Creator', 'en');
      expect(patch.metadata).toHaveLength(3);
      expect(patch.metadata![2]).toEqual({
        label: { en: ['Creator'] },
        value: { en: [''] },
      });
    });

    it('does not mutate the original metadata', () => {
      const resource = createResource();
      const originalLength = resource.metadata!.length;
      addMetadataField(resource, 'Creator', 'en');
      expect(resource.metadata!.length).toBe(originalLength);
    });

    it('handles known top-level property: rights', () => {
      const resource = createResource();
      const patch = addMetadataField(resource, 'Rights', 'en');
      expect(patch).toHaveProperty('rights');
      expect(patch.rights).toBe('');
    });

    it('handles known top-level property: behavior as empty array', () => {
      const resource = createResource();
      const patch = addMetadataField(resource, 'Behavior', 'en');
      expect(patch).toHaveProperty('behavior');
      expect(patch.behavior).toEqual([]);
    });

    it('handles known top-level property: navDate as ISO string', () => {
      const resource = createResource();
      const patch = addMetadataField(resource, 'NavDate', 'en');
      expect(patch).toHaveProperty('navDate');
      expect(typeof patch.navDate).toBe('string');
      // Should be an ISO date string
      expect(() => new Date(patch.navDate!)).not.toThrow();
    });

    it('handles known top-level property: viewingDirection', () => {
      const resource = createResource();
      const patch = addMetadataField(resource, 'ViewingDirection', 'en');
      expect(patch.viewingDirection).toBe('left-to-right');
    });

    it('handles known top-level property: requiredStatement', () => {
      const resource = createResource();
      const patch = addMetadataField(resource, 'RequiredStatement', 'en');
      expect(patch.requiredStatement).toEqual({
        label: { none: ['Attribution'] },
        value: { none: [''] },
      });
    });

    it('handles known top-level property: navPlace with GeoJSON', () => {
      const resource = createResource();
      const patch = addMetadataField(resource, 'NavPlace', 'en');
      expect((patch as any).navPlace).toEqual({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {},
      });
    });

    it('handles resource with no existing metadata', () => {
      const resource = createResource({ metadata: undefined });
      const patch = addMetadataField(resource, 'Creator', 'en');
      expect(patch.metadata).toHaveLength(1);
    });
  });

  describe('removeMetadataField', () => {
    it('removes metadata entry at given index', () => {
      const resource = createResource();
      const patch = removeMetadataField(resource, 0);
      expect(patch.metadata).toHaveLength(1);
      expect(patch.metadata![0]).toEqual({
        label: { en: ['Date'] },
        value: { en: ['2024'] },
      });
    });

    it('removes last remaining metadata entry', () => {
      const resource = createResource({
        metadata: [{ label: { en: ['Only'] }, value: { en: ['One'] } }],
      });
      const patch = removeMetadataField(resource, 0);
      expect(patch.metadata).toEqual([]);
    });

    it('does not mutate original metadata', () => {
      const resource = createResource();
      const originalLength = resource.metadata!.length;
      removeMetadataField(resource, 0);
      expect(resource.metadata!.length).toBe(originalLength);
    });
  });

  describe('getAllowedProperties', () => {
    it('returns properties for Manifest type', () => {
      const props = getAllowedProperties('Manifest');
      expect(props).toContain('label');
      expect(props).toContain('summary');
      expect(props).toContain('metadata');
      expect(props).toContain('rights');
      expect(props).toContain('viewingDirection');
    });

    it('returns Canvas-specific properties', () => {
      const props = getAllowedProperties('Canvas');
      expect(props).toContain('height');
      expect(props).toContain('width');
      expect(props).toContain('duration');
    });

    it('Canvas does not have viewingDirection', () => {
      const props = getAllowedProperties('Canvas');
      expect(props).not.toContain('viewingDirection');
    });

    it('Range has supplementary', () => {
      const props = getAllowedProperties('Range');
      expect(props).toContain('supplementary');
    });

    it('defaults to Manifest properties for unknown type', () => {
      const props = getAllowedProperties('UnknownType');
      const manifestProps = getAllowedProperties('Manifest');
      expect(props).toEqual(manifestProps);
    });
  });

  describe('getAvailableProperties', () => {
    it('excludes always-excluded properties', () => {
      const resource = createResource();
      const available = getAvailableProperties(resource);
      expect(available).not.toContain('id');
      expect(available).not.toContain('type');
      expect(available).not.toContain('items');
      expect(available).not.toContain('annotations');
      expect(available).not.toContain('structures');
      expect(available).not.toContain('label');
      expect(available).not.toContain('summary');
      expect(available).not.toContain('metadata');
    });

    it('includes non-excluded allowed properties', () => {
      const resource = createResource();
      const available = getAvailableProperties(resource);
      expect(available).toContain('rights');
      expect(available).toContain('requiredStatement');
      expect(available).toContain('provider');
      expect(available).toContain('thumbnail');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. Auth Status
// ═══════════════════════════════════════════════════════════════════════

import {
  getAuthStatus,
  setAuthService,
} from '../hooks/authStatus';

describe('authStatus', () => {
  // Reset to stub auth service before each test
  beforeEach(() => {
    setAuthService({
      getValidToken: () => null,
      getValidTokenForOrigin: () => null,
    });
  });

  describe('getAuthStatus', () => {
    it('returns "unknown" for null URL', () => {
      expect(getAuthStatus(null)).toBe('unknown');
    });

    it('returns "unknown" for undefined URL', () => {
      expect(getAuthStatus(undefined)).toBe('unknown');
    });

    it('returns "unknown" for empty string', () => {
      expect(getAuthStatus('')).toBe('unknown');
    });

    it('returns "unknown" for invalid URL', () => {
      expect(getAuthStatus('not-a-url')).toBe('unknown');
    });

    it('returns "unknown" for non-http protocol', () => {
      expect(getAuthStatus('ftp://example.org/file')).toBe('unknown');
      expect(getAuthStatus('data:text/plain;base64,abc')).toBe('unknown');
    });

    it('returns "locked" for external https URL with no token', () => {
      expect(getAuthStatus('https://iiif.example.org/manifest.json')).toBe('locked');
    });

    it('returns "locked" for external http URL with no token', () => {
      expect(getAuthStatus('http://iiif.example.org/manifest.json')).toBe('locked');
    });

    it('returns "unlocked" when auth service has valid token', () => {
      setAuthService({
        getValidToken: (url: string) => url.includes('example.org') ? 'token-123' : null,
        getValidTokenForOrigin: () => null,
      });
      expect(getAuthStatus('https://iiif.example.org/manifest.json')).toBe('unlocked');
    });

    it('returns "unlocked" when auth service has valid origin token', () => {
      setAuthService({
        getValidToken: () => null,
        getValidTokenForOrigin: (url: string) => url.includes('example.org') ? 'origin-token' : null,
      });
      expect(getAuthStatus('https://iiif.example.org/manifest.json')).toBe('unlocked');
    });

    it('returns "unknown" for local URLs (same origin)', () => {
      // In happy-dom, window.location.origin is typically "http://localhost:3000" or similar
      // The function checks if parsed.origin === window.location.origin
      const localUrl = `${window.location.origin}/api/manifest.json`;
      expect(getAuthStatus(localUrl)).toBe('unknown');
    });
  });
});
