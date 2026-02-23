/**
 * Board Design Model Tests
 *
 * Comprehensive tests for all 17 exported functions from the board-design model.
 * Covers selectors, helpers, layout algorithms, snapping, and IIIF export.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  // Types
  type BoardItem,
  type BoardState,
  type Connection,
  type ConnectionType,
  type AnchorSide,
  type IIIFContentType,
  type BoardItemMeta,
  type BoardGroup,
  type LayoutArrangement,
  // Functions
  selectAllItems,
  selectAllConnections,
  selectItemById,
  selectConnectionsForItem,
  selectIsEmpty,
  selectBoardBounds,
  detectContentType,
  formatDuration,
  enrichBoardItemMeta,
  createBoardItem,
  createConnection,
  calculateAnchorPoints,
  getConnectionLabel,
  autoArrangeItems,
  snapToGrid,
  exportToManifest,
  createInitialBoardState,
} from '../model/index';

import type { IIIFItem, IIIFManifest } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

// ============================================================================
// Test Helpers
// ============================================================================

function makeBoardItem(overrides: Partial<BoardItem> = {}): BoardItem {
  return {
    id: 'item-1',
    resourceId: 'canvas-1',
    x: 100,
    y: 200,
    w: 200,
    h: 150,
    resourceType: 'Canvas',
    label: 'Test Canvas',
    ...overrides,
  };
}

function makeBoardState(overrides: Partial<BoardState> = {}): BoardState {
  return {
    items: [],
    connections: [],
    groups: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    ...overrides,
  };
}

function makeConnection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: 'conn-1',
    fromId: 'item-1',
    toId: 'item-2',
    type: 'associated',
    ...overrides,
  };
}

function makeIIIFResource(type: string, overrides: Partial<IIIFItem> = {}): IIIFItem {
  return {
    id: `test-${type.toLowerCase()}-1`,
    type,
    label: { en: ['Test Resource'] },
    ...overrides,
  } as IIIFItem;
}

// ============================================================================
// 1. Selectors
// ============================================================================

describe('Board Selectors', () => {
  describe('selectAllItems', () => {
    it('returns empty array for empty state', () => {
      const state = makeBoardState();
      expect(selectAllItems(state)).toEqual([]);
    });

    it('returns all items from populated state', () => {
      const items = [
        makeBoardItem({ id: 'a' }),
        makeBoardItem({ id: 'b' }),
        makeBoardItem({ id: 'c' }),
      ];
      const state = makeBoardState({ items });
      expect(selectAllItems(state)).toHaveLength(3);
      expect(selectAllItems(state)).toBe(state.items);
    });

    it('returns the same reference (no copying)', () => {
      const state = makeBoardState({ items: [makeBoardItem()] });
      expect(selectAllItems(state)).toBe(state.items);
    });
  });

  describe('selectAllConnections', () => {
    it('returns empty array for empty state', () => {
      const state = makeBoardState();
      expect(selectAllConnections(state)).toEqual([]);
    });

    it('returns all connections from populated state', () => {
      const connections = [
        makeConnection({ id: 'c1' }),
        makeConnection({ id: 'c2' }),
      ];
      const state = makeBoardState({ connections });
      expect(selectAllConnections(state)).toHaveLength(2);
      expect(selectAllConnections(state)).toBe(state.connections);
    });
  });

  describe('selectItemById', () => {
    it('returns undefined for empty state', () => {
      const state = makeBoardState();
      expect(selectItemById(state, 'nonexistent')).toBeUndefined();
    });

    it('returns undefined for non-matching id', () => {
      const state = makeBoardState({ items: [makeBoardItem({ id: 'item-1' })] });
      expect(selectItemById(state, 'item-99')).toBeUndefined();
    });

    it('returns the correct item by id', () => {
      const target = makeBoardItem({ id: 'target', label: 'Target Item' });
      const state = makeBoardState({
        items: [
          makeBoardItem({ id: 'other' }),
          target,
          makeBoardItem({ id: 'another' }),
        ],
      });
      expect(selectItemById(state, 'target')).toBe(target);
    });
  });

  describe('selectConnectionsForItem', () => {
    it('returns empty array when no connections exist', () => {
      const state = makeBoardState();
      expect(selectConnectionsForItem(state, 'item-1')).toEqual([]);
    });

    it('returns connections where item is fromId', () => {
      const conn = makeConnection({ id: 'c1', fromId: 'item-1', toId: 'item-2' });
      const state = makeBoardState({ connections: [conn] });
      expect(selectConnectionsForItem(state, 'item-1')).toEqual([conn]);
    });

    it('returns connections where item is toId', () => {
      const conn = makeConnection({ id: 'c1', fromId: 'item-2', toId: 'item-1' });
      const state = makeBoardState({ connections: [conn] });
      expect(selectConnectionsForItem(state, 'item-1')).toEqual([conn]);
    });

    it('returns both incoming and outgoing connections', () => {
      const outgoing = makeConnection({ id: 'out', fromId: 'item-1', toId: 'item-2' });
      const incoming = makeConnection({ id: 'in', fromId: 'item-3', toId: 'item-1' });
      const unrelated = makeConnection({ id: 'none', fromId: 'item-2', toId: 'item-3' });
      const state = makeBoardState({ connections: [outgoing, incoming, unrelated] });
      const result = selectConnectionsForItem(state, 'item-1');
      expect(result).toHaveLength(2);
      expect(result).toContain(outgoing);
      expect(result).toContain(incoming);
    });

    it('does not return connections for unrelated items', () => {
      const conn = makeConnection({ id: 'c1', fromId: 'item-2', toId: 'item-3' });
      const state = makeBoardState({ connections: [conn] });
      expect(selectConnectionsForItem(state, 'item-1')).toEqual([]);
    });
  });

  describe('selectIsEmpty', () => {
    it('returns true for empty state', () => {
      expect(selectIsEmpty(makeBoardState())).toBe(true);
    });

    it('returns false when items exist', () => {
      const state = makeBoardState({ items: [makeBoardItem()] });
      expect(selectIsEmpty(state)).toBe(false);
    });

    it('returns true even when connections exist but no items', () => {
      const state = makeBoardState({ connections: [makeConnection()] });
      expect(selectIsEmpty(state)).toBe(true);
    });
  });

  describe('selectBoardBounds', () => {
    it('returns null for empty state', () => {
      expect(selectBoardBounds(makeBoardState())).toBeNull();
    });

    it('returns bounds for a single item', () => {
      const item = makeBoardItem({ x: 50, y: 100, w: 200, h: 150 });
      const state = makeBoardState({ items: [item] });
      const bounds = selectBoardBounds(state);
      expect(bounds).toEqual({
        minX: 50,
        minY: 100,
        maxX: 250,  // 50 + 200
        maxY: 250,  // 100 + 150
      });
    });

    it('calculates correct bounds across multiple items', () => {
      const items = [
        makeBoardItem({ id: 'a', x: 10, y: 20, w: 100, h: 50 }),
        makeBoardItem({ id: 'b', x: 300, y: 400, w: 200, h: 100 }),
        makeBoardItem({ id: 'c', x: -50, y: -30, w: 80, h: 60 }),
      ];
      const state = makeBoardState({ items });
      const bounds = selectBoardBounds(state);
      expect(bounds).toEqual({
        minX: -50,    // item c
        minY: -30,    // item c
        maxX: 500,    // item b: 300 + 200
        maxY: 500,    // item b: 400 + 100
      });
    });

    it('handles items at the origin', () => {
      const item = makeBoardItem({ x: 0, y: 0, w: 100, h: 100 });
      const state = makeBoardState({ items: [item] });
      const bounds = selectBoardBounds(state);
      expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    });
  });
});

// ============================================================================
// 2. detectContentType
// ============================================================================

describe('detectContentType', () => {
  it('returns Image for resource with Image body', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [{ items: [{ body: { type: 'Image' } }] }],
    } as Partial<IIIFItem>);
    expect(detectContentType(resource)).toBe('Image');
  });

  it('returns Video for resource with Video body', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [{ items: [{ body: { type: 'Video' } }] }],
    } as Partial<IIIFItem>);
    expect(detectContentType(resource)).toBe('Video');
  });

  it('returns Audio for resource with Sound body', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [{ items: [{ body: { type: 'Sound' } }] }],
    } as Partial<IIIFItem>);
    expect(detectContentType(resource)).toBe('Audio');
  });

  it('returns Audio for resource with Audio body', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [{ items: [{ body: { type: 'Audio' } }] }],
    } as Partial<IIIFItem>);
    expect(detectContentType(resource)).toBe('Audio');
  });

  it('returns Text for resource with Text body', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [{ items: [{ body: { type: 'Text' } }] }],
    } as Partial<IIIFItem>);
    expect(detectContentType(resource)).toBe('Text');
  });

  it('returns Dataset for resource with Dataset body', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [{ items: [{ body: { type: 'Dataset' } }] }],
    } as Partial<IIIFItem>);
    expect(detectContentType(resource)).toBe('Dataset');
  });

  it('returns Model for resource with Model body', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [{ items: [{ body: { type: 'Model' } }] }],
    } as Partial<IIIFItem>);
    expect(detectContentType(resource)).toBe('Model');
  });

  it('returns Unknown when items is absent', () => {
    const resource = makeIIIFResource('Canvas');
    expect(detectContentType(resource)).toBe('Unknown');
  });

  it('returns Unknown when items is empty', () => {
    const resource = makeIIIFResource('Canvas', { items: [] });
    expect(detectContentType(resource)).toBe('Unknown');
  });

  it('returns Unknown when annotation pages have no items', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [{ items: [] }],
    } as Partial<IIIFItem>);
    expect(detectContentType(resource)).toBe('Unknown');
  });

  it('handles body as an array (takes first element)', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [{ items: [{ body: [{ type: 'Video' }, { type: 'Image' }] }] }],
    } as Partial<IIIFItem>);
    expect(detectContentType(resource)).toBe('Video');
  });

  it('returns first detected type across multiple annotation pages', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [
        { items: [{ body: { type: 'Image' } }] },
        { items: [{ body: { type: 'Video' } }] },
      ],
    } as Partial<IIIFItem>);
    expect(detectContentType(resource)).toBe('Image');
  });
});

// ============================================================================
// 3. formatDuration
// ============================================================================

describe('formatDuration', () => {
  it('formats 0 seconds as "0:00"', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats sub-minute values with leading zero on seconds', () => {
    expect(formatDuration(5)).toBe('0:05');
  });

  it('formats exactly one minute', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('formats 65 seconds as "1:05"', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('formats 3600 seconds (1 hour) as "60:00"', () => {
    expect(formatDuration(3600)).toBe('60:00');
  });

  it('truncates fractional seconds', () => {
    expect(formatDuration(5.9)).toBe('0:05');
  });

  it('formats 119 seconds as "1:59"', () => {
    expect(formatDuration(119)).toBe('1:59');
  });

  it('formats 90 seconds as "1:30"', () => {
    expect(formatDuration(90)).toBe('1:30');
  });
});

// ============================================================================
// 4. enrichBoardItemMeta
// ============================================================================

describe('enrichBoardItemMeta', () => {
  it('detects contentType for Canvas resources', () => {
    const canvas = makeIIIFResource('Canvas', {
      items: [{ items: [{ body: { type: 'Image' } }] }],
    } as Partial<IIIFItem>);
    const meta = enrichBoardItemMeta(canvas);
    expect(meta.contentType).toBe('Image');
  });

  it('includes duration for Canvas with duration', () => {
    const canvas = makeIIIFResource('Canvas', {
      duration: 120.5,
      items: [{ items: [{ body: { type: 'Video' } }] }],
    } as unknown as Partial<IIIFItem>);
    const meta = enrichBoardItemMeta(canvas);
    expect(meta.duration).toBe(120.5);
    expect(meta.contentType).toBe('Video');
  });

  it('counts canvasCount for Manifest resources', () => {
    const manifest = makeIIIFResource('Manifest', {
      items: [{}, {}, {}],
    } as Partial<IIIFItem>);
    const meta = enrichBoardItemMeta(manifest);
    expect(meta.canvasCount).toBe(3);
  });

  it('returns canvasCount 0 for Manifest without items', () => {
    const manifest = makeIIIFResource('Manifest');
    const meta = enrichBoardItemMeta(manifest);
    expect(meta.canvasCount).toBe(0);
  });

  it('counts itemCount for Collection resources', () => {
    const collection = makeIIIFResource('Collection', {
      items: [{}, {}, {}, {}],
    } as Partial<IIIFItem>);
    const meta = enrichBoardItemMeta(collection);
    expect(meta.itemCount).toBe(4);
  });

  it('returns itemCount 0 for Collection without items', () => {
    const collection = makeIIIFResource('Collection');
    const meta = enrichBoardItemMeta(collection);
    expect(meta.itemCount).toBe(0);
  });

  it('extracts rangeChildIds for Range resources', () => {
    const range = makeIIIFResource('Range', {
      items: [{ id: 'child-1' }, { id: 'child-2' }],
    } as Partial<IIIFItem>);
    const meta = enrichBoardItemMeta(range);
    expect(meta.rangeChildIds).toEqual(['child-1', 'child-2']);
    expect(meta.rangeCollapsed).toBe(true);
  });

  it('returns empty rangeChildIds for Range without items', () => {
    const range = makeIIIFResource('Range');
    const meta = enrichBoardItemMeta(range);
    expect(meta.rangeChildIds).toEqual([]);
    expect(meta.rangeCollapsed).toBe(true);
  });

  it('extracts summary from resource', () => {
    const resource = makeIIIFResource('Canvas', {
      summary: { en: ['A brief description'] },
    } as Partial<IIIFItem>);
    const meta = enrichBoardItemMeta(resource);
    expect(meta.summary).toBe('A brief description');
  });

  it('does not set summary when absent', () => {
    const resource = makeIIIFResource('Canvas');
    const meta = enrichBoardItemMeta(resource);
    expect(meta.summary).toBeUndefined();
  });

  it('extracts navDate from resource', () => {
    const resource = makeIIIFResource('Canvas', {
      navDate: '2024-01-15T00:00:00Z',
    } as Partial<IIIFItem>);
    const meta = enrichBoardItemMeta(resource);
    expect(meta.navDate).toBe('2024-01-15T00:00:00Z');
  });

  it('extracts up to 3 metadata entries for preview', () => {
    const resource = makeIIIFResource('Canvas', {
      metadata: [
        { label: { en: ['Title'] }, value: { en: ['My Title'] } },
        { label: { en: ['Date'] }, value: { en: ['2024'] } },
        { label: { en: ['Author'] }, value: { en: ['Jane Doe'] } },
        { label: { en: ['Format'] }, value: { en: ['Digital'] } },
      ],
    } as Partial<IIIFItem>);
    const meta = enrichBoardItemMeta(resource);
    expect(meta.metadataPreview).toHaveLength(3);
    expect(meta.metadataPreview![0]).toEqual({ key: 'Title', value: 'My Title' });
    expect(meta.metadataPreview![1]).toEqual({ key: 'Date', value: '2024' });
    expect(meta.metadataPreview![2]).toEqual({ key: 'Author', value: 'Jane Doe' });
  });

  it('handles metadata with empty arrays', () => {
    const resource = makeIIIFResource('Canvas', {
      metadata: [],
    } as Partial<IIIFItem>);
    const meta = enrichBoardItemMeta(resource);
    expect(meta.metadataPreview).toBeUndefined();
  });
});

// ============================================================================
// 5. createBoardItem
// ============================================================================

describe('createBoardItem', () => {
  it('creates a board item with default size', () => {
    const resource = makeIIIFResource('Canvas');
    const item = createBoardItem(resource, { x: 100, y: 200 });
    expect(item.x).toBe(100);
    expect(item.y).toBe(200);
    expect(item.w).toBe(200);
    expect(item.h).toBe(150);
    expect(item.resourceId).toBe('test-canvas-1');
    expect(item.resourceType).toBe('Canvas');
  });

  it('creates a board item with custom size', () => {
    const resource = makeIIIFResource('Canvas');
    const item = createBoardItem(resource, { x: 0, y: 0 }, { w: 400, h: 300 });
    expect(item.w).toBe(400);
    expect(item.h).toBe(300);
  });

  it('extracts label from IIIF resource', () => {
    const resource = makeIIIFResource('Canvas', {
      label: { en: ['My Canvas'] },
    });
    const item = createBoardItem(resource, { x: 0, y: 0 });
    expect(item.label).toBe('My Canvas');
  });

  it('falls back to resource id when label is missing', () => {
    const resource = makeIIIFResource('Canvas', { label: undefined });
    const item = createBoardItem(resource, { x: 0, y: 0 });
    expect(item.label).toBe('test-canvas-1');
  });

  it('generates unique IDs', () => {
    const resource = makeIIIFResource('Canvas');
    const item1 = createBoardItem(resource, { x: 0, y: 0 });
    const item2 = createBoardItem(resource, { x: 0, y: 0 });
    expect(item1.id).not.toBe(item2.id);
  });

  it('includes meta from enrichBoardItemMeta', () => {
    const resource = makeIIIFResource('Canvas', {
      items: [{ items: [{ body: { type: 'Image' } }] }],
    } as Partial<IIIFItem>);
    const item = createBoardItem(resource, { x: 0, y: 0 });
    expect(item.meta).toBeDefined();
    expect(item.meta?.contentType).toBe('Image');
  });

  it('resolves blobUrl from thumbnail', () => {
    const resource = makeIIIFResource('Canvas', {
      thumbnail: [{ id: 'http://example.com/thumb.jpg', type: 'Image', format: 'image/jpeg' }],
    } as Partial<IIIFItem>);
    const item = createBoardItem(resource, { x: 0, y: 0 });
    expect(item.blobUrl).toBe('http://example.com/thumb.jpg');
  });

  it('resolves blobUrl from _blobUrl when no thumbnail', () => {
    const resource = makeIIIFResource('Canvas', {
      _blobUrl: 'blob:http://localhost/abc123',
    });
    const item = createBoardItem(resource, { x: 0, y: 0 });
    expect(item.blobUrl).toBe('blob:http://localhost/abc123');
  });
});

// ============================================================================
// 6. createConnection
// ============================================================================

describe('createConnection', () => {
  it('creates a connection with default type', () => {
    const conn = createConnection('from-1', 'to-2');
    expect(conn.fromId).toBe('from-1');
    expect(conn.toId).toBe('to-2');
    expect(conn.type).toBe('associated');
    expect(conn.id).toBeDefined();
    expect(conn.id.startsWith('conn-')).toBe(true);
  });

  it('creates a connection with specified type', () => {
    const conn = createConnection('a', 'b', 'partOf');
    expect(conn.type).toBe('partOf');
  });

  it('creates a connection with options', () => {
    const conn = createConnection('a', 'b', 'references', {
      label: 'My Link',
      fromAnchor: 'R',
      toAnchor: 'L',
      style: 'curved',
      color: '#ff0000',
    });
    expect(conn.label).toBe('My Link');
    expect(conn.fromAnchor).toBe('R');
    expect(conn.toAnchor).toBe('L');
    expect(conn.style).toBe('curved');
    expect(conn.color).toBe('#ff0000');
  });

  it('generates unique IDs for each connection', () => {
    const c1 = createConnection('a', 'b');
    const c2 = createConnection('a', 'b');
    expect(c1.id).not.toBe(c2.id);
  });

  it('supports all connection types', () => {
    const types: ConnectionType[] = ['associated', 'partOf', 'similarTo', 'references', 'requires', 'sequence'];
    for (const type of types) {
      const conn = createConnection('a', 'b', type);
      expect(conn.type).toBe(type);
    }
  });
});

// ============================================================================
// 7. calculateAnchorPoints
// ============================================================================

describe('calculateAnchorPoints', () => {
  it('returns R->L when toItem is to the right (horizontal dominant)', () => {
    const from = makeBoardItem({ x: 0, y: 100 });
    const to = makeBoardItem({ x: 300, y: 100 });
    const anchors = calculateAnchorPoints(from, to);
    expect(anchors.from).toBe('R');
    expect(anchors.to).toBe('L');
  });

  it('returns L->R when toItem is to the left (horizontal dominant)', () => {
    const from = makeBoardItem({ x: 300, y: 100 });
    const to = makeBoardItem({ x: 0, y: 100 });
    const anchors = calculateAnchorPoints(from, to);
    expect(anchors.from).toBe('L');
    expect(anchors.to).toBe('R');
  });

  it('returns B->T when toItem is below (vertical dominant)', () => {
    const from = makeBoardItem({ x: 100, y: 0 });
    const to = makeBoardItem({ x: 100, y: 300 });
    const anchors = calculateAnchorPoints(from, to);
    expect(anchors.from).toBe('B');
    expect(anchors.to).toBe('T');
  });

  it('returns T->B when toItem is above (vertical dominant)', () => {
    const from = makeBoardItem({ x: 100, y: 300 });
    const to = makeBoardItem({ x: 100, y: 0 });
    const anchors = calculateAnchorPoints(from, to);
    expect(anchors.from).toBe('T');
    expect(anchors.to).toBe('B');
  });

  it('handles equal horizontal and vertical distance (uses vertical)', () => {
    // When abs(dx) === abs(dy), the else branch fires (vertical)
    const from = makeBoardItem({ x: 0, y: 0 });
    const to = makeBoardItem({ x: 100, y: 100 });
    const anchors = calculateAnchorPoints(from, to);
    expect(anchors.from).toBe('B');
    expect(anchors.to).toBe('T');
  });

  it('handles overlapping items (same position) as vertical', () => {
    const from = makeBoardItem({ x: 100, y: 100 });
    const to = makeBoardItem({ x: 100, y: 100 });
    const anchors = calculateAnchorPoints(from, to);
    // dx=0, dy=0 => abs(0) > abs(0) is false => vertical branch
    // dy > 0 is false => from='T', to='B'
    expect(anchors.from).toBe('T');
    expect(anchors.to).toBe('B');
  });

  it('diagonal top-right favors horizontal when dx > dy', () => {
    const from = makeBoardItem({ x: 0, y: 0 });
    const to = makeBoardItem({ x: 500, y: 100 });
    const anchors = calculateAnchorPoints(from, to);
    expect(anchors.from).toBe('R');
    expect(anchors.to).toBe('L');
  });
});

// ============================================================================
// 8. getConnectionLabel
// ============================================================================

describe('getConnectionLabel', () => {
  it('returns simple label for associated', () => {
    expect(getConnectionLabel('associated', false)).toBe('Related');
  });

  it('returns advanced label for associated', () => {
    expect(getConnectionLabel('associated', true)).toBe('Associated');
  });

  it('returns simple label for partOf', () => {
    expect(getConnectionLabel('partOf', false)).toBe('Part of');
  });

  it('returns advanced label for partOf', () => {
    expect(getConnectionLabel('partOf', true)).toBe('Part Of');
  });

  it('returns simple label for similarTo', () => {
    expect(getConnectionLabel('similarTo', false)).toBe('Similar');
  });

  it('returns advanced label for similarTo', () => {
    expect(getConnectionLabel('similarTo', true)).toBe('Similar To');
  });

  it('returns simple label for references', () => {
    expect(getConnectionLabel('references', false)).toBe('References');
  });

  it('returns advanced label for references', () => {
    expect(getConnectionLabel('references', true)).toBe('References');
  });

  it('returns simple label for requires', () => {
    expect(getConnectionLabel('requires', false)).toBe('Needs');
  });

  it('returns advanced label for requires', () => {
    expect(getConnectionLabel('requires', true)).toBe('Requires');
  });

  it('returns simple label for sequence', () => {
    expect(getConnectionLabel('sequence', false)).toBe('Next');
  });

  it('returns advanced label for sequence', () => {
    expect(getConnectionLabel('sequence', true)).toBe('Sequence');
  });

  it('returns the type string for unknown type', () => {
    expect(getConnectionLabel('unknownType' as ConnectionType, false)).toBe('unknownType');
    expect(getConnectionLabel('unknownType' as ConnectionType, true)).toBe('unknownType');
  });
});

// ============================================================================
// 9. autoArrangeItems
// ============================================================================

describe('autoArrangeItems', () => {
  const canvasSize = { width: 1000, height: 800 };

  it('returns empty array for empty items', () => {
    expect(autoArrangeItems([], 'grid', canvasSize)).toEqual([]);
  });

  describe('grid arrangement', () => {
    it('arranges items in grid columns based on sqrt', () => {
      const items = Array.from({ length: 4 }, (_, i) =>
        makeBoardItem({ id: `item-${i}` })
      );
      const result = autoArrangeItems(items, 'grid', canvasSize);
      expect(result).toHaveLength(4);

      // 4 items => ceil(sqrt(4)) = 2 cols
      // Items should be arranged in 2x2 grid
      // All items get w=200, h=150
      result.forEach((item) => {
        expect(item.w).toBe(200);
        expect(item.h).toBe(150);
      });

      // Row 0: items 0 and 1 should have same y
      expect(result[0].y).toBe(result[1].y);
      // Row 1: items 2 and 3 should have same y
      expect(result[2].y).toBe(result[3].y);
      // Different rows should have different y
      expect(result[0].y).not.toBe(result[2].y);
    });

    it('calculates correct number of columns', () => {
      // 9 items => ceil(sqrt(9)) = 3 cols
      const items = Array.from({ length: 9 }, (_, i) =>
        makeBoardItem({ id: `item-${i}` })
      );
      const result = autoArrangeItems(items, 'grid', canvasSize);

      // Row 0: items 0, 1, 2
      expect(result[0].y).toBe(result[1].y);
      expect(result[1].y).toBe(result[2].y);
      // Row 1: items 3, 4, 5
      expect(result[3].y).toBe(result[4].y);
    });

    it('centers the grid horizontally', () => {
      const items = [makeBoardItem({ id: 'single' })];
      const result = autoArrangeItems(items, 'grid', canvasSize);
      // 1 item => 1 col, totalW = 200, startX = 500 - 100 = 400
      expect(result[0].x).toBe(400);
    });
  });

  describe('continuous arrangement', () => {
    it('arranges items in a single row (LTR)', () => {
      const items = [
        makeBoardItem({ id: 'a' }),
        makeBoardItem({ id: 'b' }),
        makeBoardItem({ id: 'c' }),
      ];
      const result = autoArrangeItems(items, 'continuous', canvasSize);

      // All items should have the same y (centered vertically)
      const expectedY = canvasSize.height / 2 - 150 / 2; // centerY - itemH/2
      result.forEach((item) => {
        expect(item.y).toBe(expectedY);
        expect(item.w).toBe(200);
        expect(item.h).toBe(150);
      });

      // x should increase left to right
      expect(result[0].x).toBeLessThan(result[1].x);
      expect(result[1].x).toBeLessThan(result[2].x);
    });

    it('arranges items in a single column for top-to-bottom', () => {
      const items = [
        makeBoardItem({ id: 'a' }),
        makeBoardItem({ id: 'b' }),
      ];
      const result = autoArrangeItems(items, 'continuous', canvasSize, 'top-to-bottom');

      // All items should have the same x (centered horizontally)
      const expectedX = canvasSize.width / 2 - 200 / 2;
      result.forEach((item) => {
        expect(item.x).toBe(expectedX);
      });

      // y should increase top to bottom
      expect(result[0].y).toBeLessThan(result[1].y);
    });
  });

  describe('paged arrangement', () => {
    it('arranges items in 2-up pairs', () => {
      const items = [
        makeBoardItem({ id: 'p1' }),
        makeBoardItem({ id: 'p2' }),
        makeBoardItem({ id: 'p3' }),
        makeBoardItem({ id: 'p4' }),
      ];
      const result = autoArrangeItems(items, 'paged', canvasSize);

      // First pair: items 0 and 1 should be on same row
      expect(result[0].y).toBe(result[1].y);
      // Second pair: items 2 and 3 should be on same row
      expect(result[2].y).toBe(result[3].y);
      // Different pairs on different rows
      expect(result[0].y).not.toBe(result[2].y);

      // In LTR, first item in pair is on left, second on right
      expect(result[0].x).toBeLessThan(result[1].x);
    });

    it('reverses page order for RTL', () => {
      const items = [
        makeBoardItem({ id: 'p1' }),
        makeBoardItem({ id: 'p2' }),
      ];
      const resultLTR = autoArrangeItems(items, 'paged', canvasSize, 'left-to-right');
      const resultRTL = autoArrangeItems(items, 'paged', canvasSize, 'right-to-left');

      // In RTL, first item (index 0) of each pair should be on the right
      // RTL reverses the items array, so the layout is mirrored
      // Also the isRTL flag swaps left/right within each pair
      expect(resultRTL[0].x).toBeGreaterThan(resultRTL[1].x);
    });
  });

  describe('circle arrangement', () => {
    it('positions items in a circle around the center', () => {
      const items = Array.from({ length: 4 }, (_, i) =>
        makeBoardItem({ id: `c-${i}` })
      );
      const result = autoArrangeItems(items, 'circle', canvasSize);
      expect(result).toHaveLength(4);

      // All items should have w=200, h=150
      result.forEach((item) => {
        expect(item.w).toBe(200);
        expect(item.h).toBe(150);
      });

      // Items should be spread around the center
      // Verify they're not all at the same position
      const uniqueXs = new Set(result.map((i) => Math.round(i.x)));
      expect(uniqueXs.size).toBeGreaterThan(1);
    });

    it('radius scales with item count', () => {
      const small = Array.from({ length: 3 }, (_, i) =>
        makeBoardItem({ id: `s-${i}` })
      );
      const large = Array.from({ length: 10 }, (_, i) =>
        makeBoardItem({ id: `l-${i}` })
      );

      const smallResult = autoArrangeItems(small, 'circle', canvasSize);
      const largeResult = autoArrangeItems(large, 'circle', canvasSize);

      // Larger set should have a larger radius (items spread further from center)
      const smallMaxDist = Math.max(
        ...smallResult.map((i) =>
          Math.sqrt(
            (i.x + 100 - canvasSize.width / 2) ** 2 +
            (i.y + 75 - canvasSize.height / 2) ** 2
          )
        )
      );
      const largeMaxDist = Math.max(
        ...largeResult.map((i) =>
          Math.sqrt(
            (i.x + 100 - canvasSize.width / 2) ** 2 +
            (i.y + 75 - canvasSize.height / 2) ** 2
          )
        )
      );
      expect(largeMaxDist).toBeGreaterThan(smallMaxDist);
    });
  });

  describe('timeline arrangement', () => {
    it('arranges items horizontally with staggered heights', () => {
      const items = [
        makeBoardItem({ id: 't1' }),
        makeBoardItem({ id: 't2' }),
        makeBoardItem({ id: 't3' }),
      ];
      const result = autoArrangeItems(items, 'timeline', canvasSize);

      // x should increase
      expect(result[0].x).toBeLessThan(result[1].x);
      expect(result[1].x).toBeLessThan(result[2].x);

      // Staggered: even indices get -20 offset, odd indices get +20
      const centerY = canvasSize.height / 2;
      const itemH = 150;
      expect(result[0].y).toBe(centerY - 20 - itemH / 2);
      expect(result[1].y).toBe(centerY + 20 - itemH / 2);
      expect(result[2].y).toBe(centerY - 20 - itemH / 2);
    });
  });

  describe('RTL reverses item order', () => {
    it('reverses item order for right-to-left', () => {
      const items = [
        makeBoardItem({ id: 'first', label: 'First' }),
        makeBoardItem({ id: 'second', label: 'Second' }),
      ];
      const resultLTR = autoArrangeItems(items, 'continuous', canvasSize, 'left-to-right');
      const resultRTL = autoArrangeItems(items, 'continuous', canvasSize, 'right-to-left');

      // LTR: 'first' is at lower x
      const ltrFirstX = resultLTR.find((i) => i.id === 'first')!.x;
      const ltrSecondX = resultLTR.find((i) => i.id === 'second')!.x;
      expect(ltrFirstX).toBeLessThan(ltrSecondX);

      // RTL: reversed items processed, 'second' gets position 0 (lower x), 'first' gets position 1
      const rtlFirstX = resultRTL.find((i) => i.id === 'first')!.x;
      const rtlSecondX = resultRTL.find((i) => i.id === 'second')!.x;
      expect(rtlSecondX).toBeLessThan(rtlFirstX);
    });

    it('reverses item order for bottom-to-top', () => {
      const items = [
        makeBoardItem({ id: 'first' }),
        makeBoardItem({ id: 'second' }),
      ];
      const resultTTB = autoArrangeItems(items, 'continuous', canvasSize, 'top-to-bottom');
      const resultBTT = autoArrangeItems(items, 'continuous', canvasSize, 'bottom-to-top');

      // TTB: first is at lower y
      const ttbFirstY = resultTTB.find((i) => i.id === 'first')!.y;
      const ttbSecondY = resultTTB.find((i) => i.id === 'second')!.y;
      expect(ttbFirstY).toBeLessThan(ttbSecondY);

      // BTT: reversed, second is at lower y
      const bttFirstY = resultBTT.find((i) => i.id === 'first')!.y;
      const bttSecondY = resultBTT.find((i) => i.id === 'second')!.y;
      expect(bttSecondY).toBeLessThan(bttFirstY);
    });
  });

  it('returns items unchanged for unknown arrangement', () => {
    const items = [makeBoardItem({ id: 'orig', x: 50, y: 60 })];
    const result = autoArrangeItems(items, 'unknown' as LayoutArrangement, canvasSize);
    expect(result).toEqual(items);
  });
});

// ============================================================================
// 10. snapToGrid
// ============================================================================

describe('snapToGrid', () => {
  it('snaps to default grid size of 20', () => {
    expect(snapToGrid({ x: 13, y: 27 })).toEqual({ x: 20, y: 20 });
  });

  it('snaps to nearest grid point (rounding)', () => {
    expect(snapToGrid({ x: 9, y: 11 })).toEqual({ x: 0, y: 20 });
  });

  it('does not change already-aligned values', () => {
    expect(snapToGrid({ x: 40, y: 60 })).toEqual({ x: 40, y: 60 });
  });

  it('snaps to custom grid size', () => {
    expect(snapToGrid({ x: 17, y: 33 }, 10)).toEqual({ x: 20, y: 30 });
  });

  it('handles negative coordinates', () => {
    expect(snapToGrid({ x: -13, y: -27 })).toEqual({ x: -20, y: -20 });
  });

  it('handles zero position', () => {
    expect(snapToGrid({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('snaps large values correctly', () => {
    expect(snapToGrid({ x: 999, y: 1001 })).toEqual({ x: 1000, y: 1000 });
  });

  it('handles grid size of 1 (no snapping effect)', () => {
    expect(snapToGrid({ x: 13.7, y: 27.3 }, 1)).toEqual({ x: 14, y: 27 });
  });
});

// ============================================================================
// 11. exportToManifest
// ============================================================================

describe('exportToManifest', () => {
  it('creates a manifest with correct type and label', () => {
    const state = makeBoardState();
    const manifest = exportToManifest(state, 'My Board');
    expect(manifest.type).toBe('Manifest');
    expect(manifest.label).toEqual({ en: ['My Board'] });
  });

  it('includes items as canvases', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'i1', resourceId: 'canvas-1', label: 'Canvas 1', w: 200, h: 150 }),
        makeBoardItem({ id: 'i2', resourceId: 'canvas-2', label: 'Canvas 2', w: 300, h: 200 }),
      ],
    });
    const manifest = exportToManifest(state, 'Test');
    expect(manifest.items).toHaveLength(2);
    expect((manifest.items![0] as unknown as Record<string, unknown>).type).toBe('Canvas');
    expect((manifest.items![0] as unknown as Record<string, unknown>).id).toBe('canvas-1');
    expect((manifest.items![0] as unknown as Record<string, unknown>).label).toEqual({ en: ['Canvas 1'] });
  });

  it('filters out note items', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'i1', isNote: true, label: 'A Note' }),
        makeBoardItem({ id: 'i2', isNote: false, label: 'A Canvas' }),
      ],
    });
    const manifest = exportToManifest(state, 'Test');
    expect(manifest.items).toHaveLength(1);
    expect((manifest.items![0] as unknown as Record<string, unknown>).label).toEqual({ en: ['A Canvas'] });
  });

  it('adds behavior from options', () => {
    const state = makeBoardState();
    const manifest = exportToManifest(state, 'Test', {
      behavior: ['paged'],
    });
    expect((manifest as Record<string, unknown>).behavior).toEqual(['paged']);
  });

  it('adds default behavior from templateType', () => {
    const state = makeBoardState();
    const narrative = exportToManifest(state, 'Test', { templateType: 'narrative' });
    expect((narrative as Record<string, unknown>).behavior).toEqual(['individuals']);
  });

  it('does not add behavior when templateType has no mapping', () => {
    const state = makeBoardState();
    const manifest = exportToManifest(state, 'Test', { templateType: 'comparison' });
    expect((manifest as Record<string, unknown>).behavior).toBeUndefined();
  });

  it('explicit behavior overrides templateType behavior', () => {
    const state = makeBoardState();
    const manifest = exportToManifest(state, 'Test', {
      behavior: ['continuous'],
      templateType: 'narrative',
    });
    expect((manifest as Record<string, unknown>).behavior).toEqual(['continuous']);
  });

  it('adds viewingDirection from options', () => {
    const state = makeBoardState();
    const manifest = exportToManifest(state, 'Test', {
      viewingDirection: 'right-to-left',
    });
    expect((manifest as Record<string, unknown>).viewingDirection).toBe('right-to-left');
  });

  it('does not add viewingDirection when not specified', () => {
    const state = makeBoardState();
    const manifest = exportToManifest(state, 'Test');
    expect((manifest as Record<string, unknown>).viewingDirection).toBeUndefined();
  });

  it('adds navDate for timeline template', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'i1', resourceId: 'c1' }),
        makeBoardItem({ id: 'i2', resourceId: 'c2' }),
      ],
    });
    const manifest = exportToManifest(state, 'Timeline', { templateType: 'timeline' });
    const canvas0 = manifest.items![0] as unknown as Record<string, unknown>;
    const canvas1 = manifest.items![1] as unknown as Record<string, unknown>;
    expect(canvas0.navDate).toBeDefined();
    expect(canvas1.navDate).toBeDefined();
    // navDate should be a valid ISO 8601 string
    expect(typeof canvas0.navDate).toBe('string');
    expect((canvas0.navDate as string)).toMatch(/^\d{4}-01-01T00:00:00Z$/);
  });

  it('adds navDate when includeNavDate is true', () => {
    const state = makeBoardState({
      items: [makeBoardItem({ id: 'i1', resourceId: 'c1' })],
    });
    const manifest = exportToManifest(state, 'Test', { includeNavDate: true });
    const canvas = manifest.items![0] as unknown as Record<string, unknown>;
    expect(canvas.navDate).toBeDefined();
  });

  it('adds navPlace for map template', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'i1', resourceId: 'c1', x: 500, y: 500, label: 'Place' }),
      ],
    });
    const manifest = exportToManifest(state, 'Map', { templateType: 'map' });
    const canvas = manifest.items![0] as unknown as Record<string, unknown>;
    expect(canvas.navPlace).toBeDefined();
    const navPlace = canvas.navPlace as { type: string; geometry: { type: string; coordinates: number[] }; properties: { name: string } };
    expect(navPlace.type).toBe('Feature');
    expect(navPlace.geometry.type).toBe('Point');
    expect(navPlace.geometry.coordinates).toHaveLength(2);
    expect(navPlace.properties.name).toBe('Place');
  });

  it('adds start property for highlighted item', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'highlighted', resourceId: 'canvas-start' }),
        makeBoardItem({ id: 'other', resourceId: 'canvas-other' }),
      ],
    });
    const manifest = exportToManifest(state, 'Test', { highlightedItemId: 'highlighted' });
    const start = (manifest as Record<string, unknown>).start as { id: string; type: string };
    expect(start).toBeDefined();
    expect(start.id).toBe('canvas-start');
    expect(start.type).toBe('Canvas');
  });

  it('does not add start when highlightedItemId does not match', () => {
    const state = makeBoardState({
      items: [makeBoardItem({ id: 'i1' })],
    });
    const manifest = exportToManifest(state, 'Test', { highlightedItemId: 'nonexistent' });
    expect((manifest as Record<string, unknown>).start).toBeUndefined();
  });

  it('adds structures for groups', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'i1', resourceId: 'c1' }),
        makeBoardItem({ id: 'i2', resourceId: 'c2' }),
        makeBoardItem({ id: 'i3', resourceId: 'c3' }),
      ],
    });
    const manifest = exportToManifest(state, 'Test', {
      groups: [
        { label: 'Group A', itemIds: ['i1', 'i2'] },
        { label: 'Group B', itemIds: ['i3'] },
      ],
    });
    const structures = (manifest as Record<string, unknown>).structures as Array<Record<string, unknown>>;
    expect(structures).toHaveLength(2);
    expect(structures[0].type).toBe('Range');
    expect(structures[0].label).toEqual({ en: ['Group A'] });
    const rangeItems = structures[0].items as Array<{ id: string; type: string }>;
    expect(rangeItems).toHaveLength(2);
    expect(rangeItems[0]).toEqual({ id: 'c1', type: 'Canvas' });
    expect(rangeItems[1]).toEqual({ id: 'c2', type: 'Canvas' });
  });

  it('filters out unresolvable group itemIds', () => {
    const state = makeBoardState({
      items: [makeBoardItem({ id: 'i1', resourceId: 'c1' })],
    });
    const manifest = exportToManifest(state, 'Test', {
      groups: [{ label: 'Mixed', itemIds: ['i1', 'missing-id'] }],
    });
    const structures = (manifest as Record<string, unknown>).structures as Array<Record<string, unknown>>;
    const rangeItems = structures[0].items as Array<{ id: string; type: string }>;
    expect(rangeItems).toHaveLength(1);
    expect(rangeItems[0].id).toBe('c1');
  });

  it('does not add structures when groups is empty', () => {
    const state = makeBoardState();
    const manifest = exportToManifest(state, 'Test', { groups: [] });
    expect((manifest as Record<string, unknown>).structures).toBeUndefined();
  });

  it('adds annotations for connections', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'i1', resourceId: 'canvas-a' }),
        makeBoardItem({ id: 'i2', resourceId: 'canvas-b' }),
      ],
      connections: [
        makeConnection({ id: 'conn-1', fromId: 'i1', toId: 'i2', type: 'associated' }),
      ],
    });
    const manifest = exportToManifest(state, 'Test');
    const annotations = (manifest as Record<string, unknown>).annotations as Array<Record<string, unknown>>;
    expect(annotations).toHaveLength(1);
    expect(annotations[0].type).toBe('AnnotationPage');
    const annoItems = annotations[0].items as Array<Record<string, unknown>>;
    expect(annoItems).toHaveLength(1);
    expect(annoItems[0].type).toBe('Annotation');
    expect(annoItems[0].motivation).toBe('linking');
    expect(annoItems[0].target).toBe('canvas-a');
    expect((annoItems[0].body as Record<string, unknown>).source).toBe('canvas-b');
  });

  it('maps connection types to correct motivations', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'i1', resourceId: 'c1' }),
        makeBoardItem({ id: 'i2', resourceId: 'c2' }),
      ],
      connections: [
        makeConnection({ id: 'cs', fromId: 'i1', toId: 'i2', type: 'similarTo' }),
      ],
    });
    const manifest = exportToManifest(state, 'Test');
    const annotations = (manifest as Record<string, unknown>).annotations as Array<Record<string, unknown>>;
    const annoItems = annotations[0].items as Array<Record<string, unknown>>;
    expect(annoItems[0].motivation).toBe('comparing');
  });

  it('includes connection metadata as service when present', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'i1', resourceId: 'c1' }),
        makeBoardItem({ id: 'i2', resourceId: 'c2' }),
      ],
      connections: [
        makeConnection({
          id: 'conn-meta',
          fromId: 'i1',
          toId: 'i2',
          type: 'associated',
          fromAnchor: 'R',
          toAnchor: 'L',
          style: 'curved',
          color: '#00ff00',
        }),
      ],
    });
    const manifest = exportToManifest(state, 'Test');
    const annotations = (manifest as Record<string, unknown>).annotations as Array<Record<string, unknown>>;
    const annoItems = annotations[0].items as Array<Record<string, unknown>>;
    const service = (annoItems[0].service as Array<Record<string, unknown>>);
    expect(service).toHaveLength(1);
    expect(service[0].type).toBe('ConnectionMetadata');
    expect(service[0].fromAnchor).toBe('R');
    expect(service[0].toAnchor).toBe('L');
    expect(service[0].style).toBe('curved');
    expect(service[0].color).toBe('#00ff00');
  });

  it('does not include service when connection has no metadata', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'i1', resourceId: 'c1' }),
        makeBoardItem({ id: 'i2', resourceId: 'c2' }),
      ],
      connections: [
        makeConnection({ id: 'conn-plain', fromId: 'i1', toId: 'i2', type: 'associated' }),
      ],
    });
    const manifest = exportToManifest(state, 'Test');
    const annotations = (manifest as Record<string, unknown>).annotations as Array<Record<string, unknown>>;
    const annoItems = annotations[0].items as Array<Record<string, unknown>>;
    expect(annoItems[0].service).toBeUndefined();
  });

  it('does not add annotations when no connections exist', () => {
    const state = makeBoardState({
      items: [makeBoardItem({ id: 'i1' })],
      connections: [],
    });
    const manifest = exportToManifest(state, 'Test');
    expect((manifest as Record<string, unknown>).annotations).toBeUndefined();
  });

  it('resolves board item IDs to resource IDs in connections', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'board-a', resourceId: 'iiif-resource-a' }),
        makeBoardItem({ id: 'board-b', resourceId: 'iiif-resource-b' }),
      ],
      connections: [
        makeConnection({ id: 'c1', fromId: 'board-a', toId: 'board-b' }),
      ],
    });
    const manifest = exportToManifest(state, 'Test');
    const annotations = (manifest as Record<string, unknown>).annotations as Array<Record<string, unknown>>;
    const annoItems = annotations[0].items as Array<Record<string, unknown>>;
    expect(annoItems[0].target).toBe('iiif-resource-a');
    expect((annoItems[0].body as Record<string, unknown>).source).toBe('iiif-resource-b');
  });

  it('includes connection label when provided', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'i1', resourceId: 'c1' }),
        makeBoardItem({ id: 'i2', resourceId: 'c2' }),
      ],
      connections: [
        makeConnection({ id: 'cl', fromId: 'i1', toId: 'i2', label: 'See also' }),
      ],
    });
    const manifest = exportToManifest(state, 'Test');
    const annotations = (manifest as Record<string, unknown>).annotations as Array<Record<string, unknown>>;
    const annoItems = annotations[0].items as Array<Record<string, unknown>>;
    expect(annoItems[0].label).toEqual({ en: ['See also'] });
  });

  it('produces empty items array when all items are notes', () => {
    const state = makeBoardState({
      items: [
        makeBoardItem({ id: 'n1', isNote: true }),
        makeBoardItem({ id: 'n2', isNote: true }),
      ],
    });
    const manifest = exportToManifest(state, 'Notes Only');
    expect(manifest.items).toHaveLength(0);
  });
});

// ============================================================================
// 12. createInitialBoardState
// ============================================================================

describe('createInitialBoardState', () => {
  it('creates an empty board state', () => {
    const state = createInitialBoardState();
    expect(state.items).toEqual([]);
    expect(state.connections).toEqual([]);
    expect(state.groups).toEqual([]);
    expect(state.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('returns a new object each time', () => {
    const state1 = createInitialBoardState();
    const state2 = createInitialBoardState();
    expect(state1).not.toBe(state2);
    expect(state1.items).not.toBe(state2.items);
  });

  it('starts with empty state passing isEmpty check', () => {
    const state = createInitialBoardState();
    expect(selectIsEmpty(state)).toBe(true);
    expect(selectBoardBounds(state)).toBeNull();
    expect(selectAllItems(state)).toHaveLength(0);
    expect(selectAllConnections(state)).toHaveLength(0);
  });
});
