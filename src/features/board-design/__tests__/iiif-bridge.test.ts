/**
 * Tests for the IIIF Bridge Layer
 *
 * Verifies conversion between BoardState UI model and IIIF Manifest structures,
 * including round-trip fidelity, edge cases, and helper utilities.
 *
 * @module features/board-design/__tests__/iiif-bridge.test
 */

import { describe, it, expect } from 'vitest';
import { boardStateToManifest, manifestToBoardState, generateBoardId, isBoardManifest } from '../model/iiif-bridge';
import type { BoardState, BoardItem, Connection, BoardGroup } from '../model/index';
import type { IIIFManifest, IIIFAnnotation, IIIFCanvas, IIIFAnnotationPage } from '@/src/shared/types';

// ============================================================================
// Helpers
// ============================================================================

function makeBoardItem(overrides: Partial<BoardItem> = {}): BoardItem {
  return {
    id: 'item-1',
    resourceId: 'canvas/1',
    x: 100, y: 200, width: 200, height: 150,
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

function makeNoteItem(overrides: Partial<BoardItem> = {}): BoardItem {
  return {
    id: 'note-1',
    resourceId: 'note-1',
    x: 300, y: 400, width: 180, height: 120,
    resourceType: 'Text',
    label: 'My Note',
    annotation: 'This is a note about the board layout',
    isNote: true,
    ...overrides,
  };
}

function makeGroup(overrides: Partial<BoardGroup> = {}): BoardGroup {
  return {
    id: 'group-1',
    label: 'Test Group',
    itemIds: ['item-1', 'item-2'],
    ...overrides,
  };
}

// ============================================================================
// boardStateToManifest
// ============================================================================

describe('boardStateToManifest', () => {
  it('creates a manifest with correct id, type, and label', () => {
    const state = makeBoardState();
    const manifest = boardStateToManifest(state, 'board-123', 'My Board');

    expect(manifest.id).toBe('board-123');
    expect(manifest.type).toBe('Manifest');
    expect(manifest.label).toEqual({ en: ['My Board'] });
  });

  it('creates a surface canvas with 10000x10000 dimensions', () => {
    const state = makeBoardState();
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    expect(manifest.items).toHaveLength(1);
    const surface = manifest.items[0];
    expect(surface.type).toBe('Canvas');
    expect(surface.width).toBe(10000);
    expect(surface.height).toBe(10000);
  });

  it('assigns the surface canvas id as boardId + /surface', () => {
    const state = makeBoardState();
    const manifest = boardStateToManifest(state, 'board-42', 'Test');

    expect(manifest.items[0].id).toBe('board-42/surface');
  });

  it('converts board items to painting annotations with correct xywh target', () => {
    const item = makeBoardItem({ id: 'item-a', x: 50, y: 75, width: 300, height: 250 });
    const state = makeBoardState({ items: [item] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const surface = manifest.items[0];
    const paintingPage = surface.items[0];
    expect(paintingPage.items).toHaveLength(1);

    const annotation = paintingPage.items[0];
    expect(annotation.motivation).toBe('painting');
    expect(annotation.target).toBe('board-1/surface#xywh=50,75,300,250');
  });

  it('sets the annotation body source to the item resourceId', () => {
    const item = makeBoardItem({ resourceId: 'https://example.org/canvas/99' });
    const state = makeBoardState({ items: [item] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const annotation = manifest.items[0].items[0].items[0];
    const body = annotation.body as { source?: string };
    expect(body.source).toBe('https://example.org/canvas/99');
  });

  it('rounds fractional coordinates in xywh fragment', () => {
    const item = makeBoardItem({ x: 100.7, y: 200.3, width: 150.5, height: 80.9 });
    const state = makeBoardState({ items: [item] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const annotation = manifest.items[0].items[0].items[0];
    expect(annotation.target).toBe('board-1/surface#xywh=101,200,151,81');
  });

  it('converts notes to commenting annotations', () => {
    const note = makeNoteItem();
    const state = makeBoardState({ items: [note] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    // Notes go to supplementing page (annotations array), not painting page
    const surface = manifest.items[0] as IIIFCanvas & { annotations?: IIIFAnnotationPage[] };
    expect(surface.annotations).toBeDefined();
    expect(surface.annotations).toHaveLength(1);

    const supplementingPage = surface.annotations![0];
    const noteAnnotation = supplementingPage.items[0];
    expect(noteAnnotation.motivation).toBe('commenting');
  });

  it('sets note body.value to the annotation text', () => {
    const note = makeNoteItem({ annotation: 'Important observation' });
    const state = makeBoardState({ items: [note] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const surface = manifest.items[0] as IIIFCanvas & { annotations?: IIIFAnnotationPage[] };
    const noteAnnotation = surface.annotations![0].items[0];
    const body = noteAnnotation.body as { value?: string };
    expect(body.value).toBe('Important observation');
  });

  it('converts connections to linking annotations', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
    const conn = makeConnection({ fromId: 'item-1', toId: 'item-2', type: 'references' });
    const state = makeBoardState({ items: [item1, item2], connections: [conn] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const surface = manifest.items[0] as IIIFCanvas & { annotations?: IIIFAnnotationPage[] };
    expect(surface.annotations).toBeDefined();

    const linkAnnotation = surface.annotations![0].items.find(
      a => a.motivation === 'linking'
    );
    expect(linkAnnotation).toBeDefined();
    expect(linkAnnotation!.target).toBe('canvas/1');
    const body = linkAnnotation!.body as { source?: string };
    expect(body.source).toBe('canvas/2');
  });

  it('produces a manifest with empty painting annotation page for empty board', () => {
    const state = makeBoardState();
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const surface = manifest.items[0];
    expect(surface.items).toHaveLength(1);
    expect(surface.items[0].items).toHaveLength(0);
  });

  it('serializes viewport in service block', () => {
    const state = makeBoardState({ viewport: { x: 500, y: -200, zoom: 2.5 } });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const services = (manifest as IIIFManifest & { service?: Array<{ type: string; x?: number; y?: number; zoom?: number }> }).service;
    expect(services).toBeDefined();
    expect(services).toHaveLength(1);
    expect(services![0].type).toBe('BoardViewport');
    expect(services![0].x).toBe(500);
    expect(services![0].y).toBe(-200);
    expect(services![0].zoom).toBe(2.5);
  });

  it('serializes groups as Range structures', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
    const group = makeGroup({ id: 'grp-1', label: 'Chapter 1', itemIds: ['item-1', 'item-2'], color: '#ff0000' });
    const state = makeBoardState({ items: [item1, item2], groups: [group] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const structures = (manifest as IIIFManifest & { structures?: Array<{ id: string; type: string; label?: Record<string, string[]>; items?: Array<{ id: string; type: string }>; service?: Array<{ type: string; color?: string }> }> }).structures;
    expect(structures).toBeDefined();
    expect(structures).toHaveLength(1);
    expect(structures![0].type).toBe('Range');
    expect(structures![0].label).toEqual({ en: ['Chapter 1'] });
    expect(structures![0].items).toHaveLength(2);
    expect(structures![0].items![0]).toEqual({ id: 'canvas/1', type: 'Canvas' });
    expect(structures![0].items![1]).toEqual({ id: 'canvas/2', type: 'Canvas' });
  });

  it('serializes group color in a service block on the Range', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const group = makeGroup({ id: 'grp-1', itemIds: ['item-1'], color: '#00ff00' });
    const state = makeBoardState({ items: [item1], groups: [group] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const structures = (manifest as IIIFManifest & { structures?: Array<{ service?: Array<{ type: string; color?: string }> }> }).structures;
    expect(structures![0].service).toBeDefined();
    expect(structures![0].service![0].type).toBe('GroupMetadata');
    expect(structures![0].service![0].color).toBe('#00ff00');
  });

  it('applies options.behavior to the manifest', () => {
    const state = makeBoardState();
    const manifest = boardStateToManifest(state, 'board-1', 'Test', { behavior: ['continuous', 'auto-advance'] });

    const result = manifest as IIIFManifest & { behavior?: string[] };
    expect(result.behavior).toEqual(['continuous', 'auto-advance']);
  });

  it('defaults behavior to ["individuals"] when no option is given', () => {
    const state = makeBoardState();
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const result = manifest as IIIFManifest & { behavior?: string[] };
    expect(result.behavior).toEqual(['individuals']);
  });

  it('applies options.viewingDirection to the manifest', () => {
    const state = makeBoardState();
    const manifest = boardStateToManifest(state, 'board-1', 'Test', { viewingDirection: 'right-to-left' });

    expect(manifest.viewingDirection).toBe('right-to-left');
  });

  it('serializes connection metadata (anchor, style, color) in annotation service blocks', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
    const conn = makeConnection({
      fromId: 'item-1',
      toId: 'item-2',
      fromAnchor: 'R',
      toAnchor: 'L',
      style: 'curved',
      color: '#0000ff',
    });
    const state = makeBoardState({ items: [item1, item2], connections: [conn] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const surface = manifest.items[0] as IIIFCanvas & { annotations?: IIIFAnnotationPage[] };
    const linkAnnotation = surface.annotations![0].items.find(a => a.motivation === 'linking')!;
    const services = (linkAnnotation as IIIFAnnotation & { service?: Array<{ type: string; fromAnchor?: string; toAnchor?: string; style?: string; color?: string }> }).service;
    expect(services).toBeDefined();
    expect(services![0].type).toBe('ConnectionMetadata');
    expect(services![0].fromAnchor).toBe('R');
    expect(services![0].toAnchor).toBe('L');
    expect(services![0].style).toBe('curved');
    expect(services![0].color).toBe('#0000ff');
  });

  it('does not create supplementing page when there are no connections or notes', () => {
    const item = makeBoardItem();
    const state = makeBoardState({ items: [item] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const surface = manifest.items[0] as IIIFCanvas & { annotations?: IIIFAnnotationPage[] };
    expect(surface.annotations).toBeUndefined();
  });
});

// ============================================================================
// manifestToBoardState
// ============================================================================

describe('manifestToBoardState', () => {
  it('parses painting annotations back to items with correct x, y, w, h', () => {
    const item = makeBoardItem({ id: 'item-a', x: 120, y: 340, width: 250, height: 175 });
    const state = makeBoardState({ items: [item] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].x).toBe(120);
    expect(result.items[0].y).toBe(340);
    expect(result.items[0].width).toBe(250);
    expect(result.items[0].height).toBe(175);
  });

  it('parses commenting annotations back to notes', () => {
    const note = makeNoteItem({ annotation: 'Restored note' });
    const state = makeBoardState({ items: [note] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    const notes = result.items.filter(i => i.isNote);
    expect(notes).toHaveLength(1);
    expect(notes[0].annotation).toBe('Restored note');
    expect(notes[0].resourceType).toBe('Text');
  });

  it('parses linking annotations back to connections', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
    const conn = makeConnection({ type: 'references' });
    const state = makeBoardState({ items: [item1, item2], connections: [conn] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    expect(result.connections).toHaveLength(1);
    expect(result.connections[0].type).toBe('references');
  });

  it('extracts viewport from service block', () => {
    const state = makeBoardState({ viewport: { x: 123, y: 456, zoom: 3.0 } });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    expect(result.viewport).toEqual({ x: 123, y: 456, zoom: 3 });
  });

  it('extracts groups from Range structures', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
    const group = makeGroup({ id: 'grp-1', label: 'Section A', itemIds: ['item-1', 'item-2'] });
    const state = makeBoardState({ items: [item1, item2], groups: [group] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].label).toBe('Section A');
    // Group itemIds should reference the internal item IDs from the parsed items
    expect(result.groups[0].itemIds).toHaveLength(2);
  });

  it('returns empty state when manifest has no items', () => {
    const manifest: IIIFManifest = {
      id: 'empty-manifest',
      type: 'Manifest',
      label: { en: ['Empty'] },
      items: [],
    };
    const result = manifestToBoardState(manifest);

    expect(result.items).toHaveLength(0);
    expect(result.connections).toHaveLength(0);
    expect(result.groups).toHaveLength(0);
  });

  it('returns default viewport when manifest has no service block', () => {
    const manifest: IIIFManifest = {
      id: 'no-service',
      type: 'Manifest',
      label: { en: ['No Service'] },
      items: [],
    };
    const result = manifestToBoardState(manifest);

    expect(result.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('reads connection metadata from service blocks', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
    const conn = makeConnection({
      fromId: 'item-1',
      toId: 'item-2',
      fromAnchor: 'B',
      toAnchor: 'T',
      style: 'elbow',
      color: '#ff00ff',
    });
    const state = makeBoardState({ items: [item1, item2], connections: [conn] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    expect(result.connections).toHaveLength(1);
    expect(result.connections[0].fromAnchor).toBe('B');
    expect(result.connections[0].toAnchor).toBe('T');
    expect(result.connections[0].style).toBe('elbow');
    expect(result.connections[0].color).toBe('#ff00ff');
  });

  it('reverse-lookups resource IDs to internal item IDs for connections', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
    const conn = makeConnection({ fromId: 'item-1', toId: 'item-2' });
    const state = makeBoardState({ items: [item1, item2], connections: [conn] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    // The connection's fromId/toId should be internal IDs (resolved from resourceIds)
    // Since boardStateToManifest stores resourceIds in the annotation, manifestToBoardState
    // must reverse-lookup to find the internal item IDs
    const resultConn = result.connections[0];
    expect(resultConn.fromId).toBe('item-1');
    expect(resultConn.toId).toBe('item-2');
  });

  it('preserves item label from annotation body', () => {
    const item = makeBoardItem({ label: 'My Custom Label' });
    const state = makeBoardState({ items: [item] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    expect(result.items[0].label).toBe('My Custom Label');
  });

  it('preserves item resourceId from annotation body source', () => {
    const item = makeBoardItem({ resourceId: 'https://example.org/canvas/42' });
    const state = makeBoardState({ items: [item] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    expect(result.items[0].resourceId).toBe('https://example.org/canvas/42');
  });
});

// ============================================================================
// Round-trip Tests
// ============================================================================

describe('round-trip: boardState -> manifest -> boardState', () => {
  it('preserves board items through round-trip', () => {
    const items = [
      makeBoardItem({ id: 'item-1', resourceId: 'canvas/1', x: 10, y: 20, width: 300, height: 200, label: 'First' }),
      makeBoardItem({ id: 'item-2', resourceId: 'canvas/2', x: 500, y: 600, width: 150, height: 100, label: 'Second' }),
    ];
    const state = makeBoardState({ items });
    const manifest = boardStateToManifest(state, 'board-rt', 'Round Trip');
    const result = manifestToBoardState(manifest);

    expect(result.items.filter(i => !i.isNote)).toHaveLength(2);
    const first = result.items.find(i => i.id === 'item-1');
    const second = result.items.find(i => i.id === 'item-2');
    expect(first).toBeDefined();
    expect(first!.x).toBe(10);
    expect(first!.y).toBe(20);
    expect(first!.width).toBe(300);
    expect(first!.height).toBe(200);
    expect(first!.label).toBe('First');
    expect(first!.resourceId).toBe('canvas/1');
    expect(second).toBeDefined();
    expect(second!.x).toBe(500);
    expect(second!.y).toBe(600);
  });

  it('preserves connections through round-trip', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
    const conn = makeConnection({
      id: 'conn-rt',
      fromId: 'item-1',
      toId: 'item-2',
      type: 'partOf',
      fromAnchor: 'R',
      toAnchor: 'L',
      style: 'straight',
      color: '#abcdef',
    });
    const state = makeBoardState({ items: [item1, item2], connections: [conn] });
    const manifest = boardStateToManifest(state, 'board-rt', 'Round Trip');
    const result = manifestToBoardState(manifest);

    expect(result.connections).toHaveLength(1);
    const rc = result.connections[0];
    expect(rc.id).toBe('conn-rt');
    expect(rc.type).toBe('partOf');
    expect(rc.fromId).toBe('item-1');
    expect(rc.toId).toBe('item-2');
    expect(rc.fromAnchor).toBe('R');
    expect(rc.toAnchor).toBe('L');
    expect(rc.style).toBe('straight');
    expect(rc.color).toBe('#abcdef');
  });

  it('preserves notes through round-trip', () => {
    const note = makeNoteItem({
      id: 'note-rt',
      x: 400, y: 500, width: 200, height: 180,
      annotation: 'Detailed note content for round-trip testing',
    });
    const state = makeBoardState({ items: [note] });
    const manifest = boardStateToManifest(state, 'board-rt', 'Round Trip');
    const result = manifestToBoardState(manifest);

    const notes = result.items.filter(i => i.isNote);
    expect(notes).toHaveLength(1);
    expect(notes[0].annotation).toBe('Detailed note content for round-trip testing');
    expect(notes[0].x).toBe(400);
    expect(notes[0].y).toBe(500);
    expect(notes[0].width).toBe(200);
    expect(notes[0].height).toBe(180);
    expect(notes[0].isNote).toBe(true);
  });

  it('preserves viewport through round-trip', () => {
    const state = makeBoardState({ viewport: { x: -350, y: 720, zoom: 1.75 } });
    const manifest = boardStateToManifest(state, 'board-rt', 'Round Trip');
    const result = manifestToBoardState(manifest);

    expect(result.viewport.x).toBe(-350);
    expect(result.viewport.y).toBe(720);
    expect(result.viewport.zoom).toBe(1.75);
  });

  it('preserves groups through round-trip', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
    const item3 = makeBoardItem({ id: 'item-3', resourceId: 'canvas/3' });
    const group = makeGroup({
      id: 'grp-rt',
      label: 'Round Trip Group',
      itemIds: ['item-1', 'item-3'],
      color: '#123456',
    });
    const state = makeBoardState({ items: [item1, item2, item3], groups: [group] });
    const manifest = boardStateToManifest(state, 'board-rt', 'Round Trip');
    const result = manifestToBoardState(manifest);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].label).toBe('Round Trip Group');
    expect(result.groups[0].itemIds).toHaveLength(2);
    expect(result.groups[0].color).toBe('#123456');
    // The group's itemIds should reference the restored internal IDs
    const groupItemIds = result.groups[0].itemIds;
    expect(groupItemIds).toContain('item-1');
    expect(groupItemIds).toContain('item-3');
  });
});

// ============================================================================
// generateBoardId
// ============================================================================

describe('generateBoardId', () => {
  it('returns a string starting with "board-"', () => {
    const id = generateBoardId();
    expect(id.startsWith('board-')).toBe(true);
  });

  it('generates unique IDs on each call', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(generateBoardId());
    }
    expect(ids.size).toBe(50);
  });

  it('contains a UUID fragment after the timestamp', () => {
    const id = generateBoardId();
    // Format: board-{timestamp}-{uuid_fragment}
    const parts = id.split('-');
    // "board" is parts[0], timestamp is parts[1], UUID fragment is parts[2]+
    expect(parts.length).toBeGreaterThanOrEqual(3);
    // The timestamp part should be numeric
    expect(/^\d+$/.test(parts[1])).toBe(true);
    // There should be a UUID fragment following
    const uuidFragment = parts.slice(2).join('-');
    expect(uuidFragment.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// isBoardManifest
// ============================================================================

describe('isBoardManifest', () => {
  it('returns true for a manifest with BoardViewport service', () => {
    const state = makeBoardState();
    const manifest = boardStateToManifest(state, 'board-1', 'Board');
    expect(isBoardManifest(manifest)).toBe(true);
  });

  it('returns false for a regular manifest without service', () => {
    const manifest: IIIFManifest = {
      id: 'regular-manifest',
      type: 'Manifest',
      label: { en: ['Regular'] },
      items: [],
    };
    expect(isBoardManifest(manifest)).toBe(false);
  });

  it('returns false for a manifest with non-BoardViewport services', () => {
    const manifest: IIIFManifest = {
      id: 'other-service',
      type: 'Manifest',
      label: { en: ['Other'] },
      items: [],
      service: [{ id: 'svc-1', type: 'ImageService3' }],
    } as IIIFManifest;
    expect(isBoardManifest(manifest)).toBe(false);
  });
});

// ============================================================================
// Additional edge case tests
// ============================================================================

describe('edge cases', () => {
  it('handles mixed items and notes together', () => {
    const item = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const note = makeNoteItem({ id: 'note-1' });
    const state = makeBoardState({ items: [item, note] });
    const manifest = boardStateToManifest(state, 'board-1', 'Mixed');

    // Painting page should have only the regular item
    const paintingPage = manifest.items[0].items[0];
    expect(paintingPage.items).toHaveLength(1);
    expect(paintingPage.items[0].motivation).toBe('painting');

    // Supplementing page should have the note
    const surface = manifest.items[0] as IIIFCanvas & { annotations?: IIIFAnnotationPage[] };
    expect(surface.annotations).toBeDefined();
    const noteAnnotations = surface.annotations![0].items.filter(a => a.motivation === 'commenting');
    expect(noteAnnotations).toHaveLength(1);
  });

  it('handles all connection types correctly', () => {
    const connectionTypes: Array<Connection['type']> = [
      'associated', 'partOf', 'similarTo', 'references', 'requires', 'sequence',
    ];

    for (const connType of connectionTypes) {
      const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
      const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
      const conn = makeConnection({ type: connType, fromId: 'item-1', toId: 'item-2' });
      const state = makeBoardState({ items: [item1, item2], connections: [conn] });
      const manifest = boardStateToManifest(state, 'board-1', 'Test');
      const result = manifestToBoardState(manifest);

      expect(result.connections[0].type).toBe(connType);
    }
  });

  it('handles note with label fallback when annotation is empty', () => {
    const note = makeNoteItem({ annotation: undefined, label: 'Note Title' });
    const state = makeBoardState({ items: [note] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const surface = manifest.items[0] as IIIFCanvas & { annotations?: IIIFAnnotationPage[] };
    const noteAnnotation = surface.annotations![0].items[0];
    const body = noteAnnotation.body as { value?: string };
    // When annotation is undefined, falls back to label
    expect(body.value).toBe('Note Title');
  });

  it('preserves non-Canvas resourceType through round-trip via _resourceType', () => {
    const item = makeBoardItem({ id: 'item-1', resourceId: 'manifest/1', resourceType: 'Manifest' });
    const state = makeBoardState({ items: [item] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    expect(result.items[0].resourceType).toBe('Manifest');
  });

  it('preserves item meta through round-trip via _meta', () => {
    const item = makeBoardItem({
      id: 'item-1',
      meta: {
        contentType: 'Image',
        duration: undefined,
        canvasCount: 5,
        summary: 'A brief summary',
      },
    });
    const state = makeBoardState({ items: [item] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');
    const result = manifestToBoardState(manifest);

    expect(result.items[0].meta).toBeDefined();
    expect(result.items[0].meta!.contentType).toBe('Image');
    expect(result.items[0].meta!.canvasCount).toBe(5);
    expect(result.items[0].meta!.summary).toBe('A brief summary');
  });

  it('handles groups without color property', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const group: BoardGroup = { id: 'grp-no-color', label: 'No Color', itemIds: ['item-1'] };
    const state = makeBoardState({ items: [item1], groups: [group] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const structures = (manifest as IIIFManifest & { structures?: Array<{ service?: unknown[] }> }).structures;
    // No service block when no color
    expect(structures![0].service).toBeUndefined();

    const result = manifestToBoardState(manifest);
    expect(result.groups[0].label).toBe('No Color');
    expect(result.groups[0].color).toBeUndefined();
  });

  it('connection without metadata does not produce a service block', () => {
    const item1 = makeBoardItem({ id: 'item-1', resourceId: 'canvas/1' });
    const item2 = makeBoardItem({ id: 'item-2', resourceId: 'canvas/2' });
    const conn = makeConnection({ fromId: 'item-1', toId: 'item-2' });
    // Ensure no anchor/style/color
    delete (conn as Partial<Connection>).fromAnchor;
    delete (conn as Partial<Connection>).toAnchor;
    delete (conn as Partial<Connection>).style;
    delete (conn as Partial<Connection>).color;
    const state = makeBoardState({ items: [item1, item2], connections: [conn] });
    const manifest = boardStateToManifest(state, 'board-1', 'Test');

    const surface = manifest.items[0] as IIIFCanvas & { annotations?: IIIFAnnotationPage[] };
    const linkAnnotation = surface.annotations![0].items.find(a => a.motivation === 'linking')!;
    const services = (linkAnnotation as IIIFAnnotation & { service?: unknown[] }).service;
    expect(services).toBeUndefined();
  });
});
