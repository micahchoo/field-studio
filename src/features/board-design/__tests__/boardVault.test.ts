/**
 * BoardVaultStore -- Comprehensive Tests
 *
 * Tests the Svelte 5 runes-based reactive class store for board design.
 * Covers constructor, lifecycle, CRUD (items/connections/notes/groups),
 * snap-to-grid, undo/redo history, auto-save, queries, and cleanup.
 *
 * ~50 tests organized in 10 describe groups.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BoardVaultStore,
  type BoardItem,
  type BoardConnection,
  type BoardState,
} from '../stores/boardVault.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal canvas item payload (without id) */
function canvasItem(overrides?: Partial<Omit<BoardItem, 'id'>>): Omit<BoardItem, 'id'> {
  return {
    resourceId: 'canvas/1',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    type: 'canvas',
    ...overrides,
  };
}

/** Minimal connection payload (without id) */
function seqConnection(
  fromId: string,
  toId: string,
  overrides?: Partial<Omit<BoardConnection, 'id'>>
): Omit<BoardConnection, 'id'> {
  return { fromId, toId, type: 'sequence', ...overrides };
}

// ---------------------------------------------------------------------------
// 1. Constructor & initialization
// ---------------------------------------------------------------------------

describe('Constructor & initialization', () => {
  it('starts with empty items and connections', () => {
    const store = new BoardVaultStore();
    expect(store.items).toEqual([]);
    expect(store.connections).toEqual([]);
    store.destroy();
  });

  it('defaults to isDirty=false, canUndo=false, canRedo=false', () => {
    const store = new BoardVaultStore();
    expect(store.isDirty).toBe(false);
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
    store.destroy();
  });

  it('applies snapEnabled and gridSize from options', () => {
    const store = new BoardVaultStore({ snapEnabled: true, gridSize: 16 });
    expect(store.state.snapEnabled).toBe(true);
    expect(store.state.gridSize).toBe(16);
    store.destroy();
  });

  it('applies maxHistory and autoSaveDelay options', () => {
    // maxHistory is internal, so we verify it indirectly via undo capping
    const store = new BoardVaultStore({ maxHistory: 2 });

    store.addItem(canvasItem({ resourceId: 'c1' }));
    store.addItem(canvasItem({ resourceId: 'c2' }));
    store.addItem(canvasItem({ resourceId: 'c3' }));

    // Should only be able to undo 2 times (maxHistory=2)
    store.undo(); // items: 2
    store.undo(); // items: 1
    store.undo(); // should no-op (capped)
    expect(store.items).toHaveLength(1);

    store.destroy();
  });
});

// ---------------------------------------------------------------------------
// 2. loadBoard
// ---------------------------------------------------------------------------

describe('loadBoard', () => {
  let store: BoardVaultStore;
  beforeEach(() => { store = new BoardVaultStore(); });
  afterEach(() => { store.destroy(); });

  it('replaces current state with the loaded state', () => {
    store.addItem(canvasItem());
    expect(store.items).toHaveLength(1);

    const newState: BoardState = {
      id: 'loaded-board',
      items: [
        { id: 'i1', resourceId: 'r1', x: 10, y: 20, width: 80, height: 60, type: 'canvas' },
        { id: 'i2', resourceId: 'r2', x: 200, y: 100, width: 120, height: 90, type: 'canvas' },
      ],
      connections: [{ id: 'c1', fromId: 'i1', toId: 'i2', type: 'sequence' }],
      gridSize: 12,
      snapEnabled: true,
    };
    store.loadBoard(newState);

    expect(store.boardId).toBe('loaded-board');
    expect(store.items).toHaveLength(2);
    expect(store.connections).toHaveLength(1);
    expect(store.state.gridSize).toBe(12);
    expect(store.state.snapEnabled).toBe(true);
  });

  it('clears undo/redo history', () => {
    store.addItem(canvasItem());
    expect(store.canUndo).toBe(true);

    store.loadBoard({
      id: 'clean',
      items: [],
      connections: [],
      gridSize: 8,
      snapEnabled: false,
    });
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
  });

  it('resets isDirty to false', () => {
    store.addItem(canvasItem());
    expect(store.isDirty).toBe(true);

    store.loadBoard({
      id: 'reset',
      items: [],
      connections: [],
      gridSize: 8,
      snapEnabled: false,
    });
    expect(store.isDirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. createBoard
// ---------------------------------------------------------------------------

describe('createBoard', () => {
  let store: BoardVaultStore;
  beforeEach(() => { store = new BoardVaultStore({ gridSize: 16, snapEnabled: true }); });
  afterEach(() => { store.destroy(); });

  it('sets board ID and clears items/connections', () => {
    store.addItem(canvasItem());
    store.addConnection(seqConnection('a', 'b'));

    store.createBoard('new-board');
    expect(store.boardId).toBe('new-board');
    expect(store.items).toEqual([]);
    expect(store.connections).toEqual([]);
    expect(store.canUndo).toBe(false);
    expect(store.isDirty).toBe(false);
  });

  it('preserves grid settings from previous state', () => {
    store.createBoard('preserved');
    expect(store.state.gridSize).toBe(16);
    expect(store.state.snapEnabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Items CRUD
// ---------------------------------------------------------------------------

describe('Items CRUD', () => {
  let store: BoardVaultStore;
  beforeEach(() => { store = new BoardVaultStore(); });
  afterEach(() => { store.destroy(); });

  it('addItem returns a generated string ID', () => {
    const id = store.addItem(canvasItem());
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('addItem appends the item to the items array', () => {
    const id = store.addItem(canvasItem({ resourceId: 'canvas/42', x: 100, y: 200 }));
    expect(store.items).toHaveLength(1);
    expect(store.items[0].id).toBe(id);
    expect(store.items[0].resourceId).toBe('canvas/42');
    expect(store.items[0].x).toBe(100);
    expect(store.items[0].y).toBe(200);
  });

  it('addItem generates unique IDs for each call', () => {
    const id1 = store.addItem(canvasItem());
    const id2 = store.addItem(canvasItem());
    expect(id1).not.toBe(id2);
  });

  it('moveItem changes x and y coordinates', () => {
    const id = store.addItem(canvasItem({ x: 10, y: 20 }));
    store.moveItem(id, 500, 600);
    const item = store.findItem(id);
    expect(item?.x).toBe(500);
    expect(item?.y).toBe(600);
  });

  it('resizeItem changes width and height', () => {
    const id = store.addItem(canvasItem({ width: 100, height: 100 }));
    store.resizeItem(id, 250, 300);
    const item = store.findItem(id);
    expect(item?.width).toBe(250);
    expect(item?.height).toBe(300);
  });

  it('resizeItem clamps to minimum 1', () => {
    const id = store.addItem(canvasItem({ width: 100, height: 100 }));
    store.resizeItem(id, -5, 0);
    const item = store.findItem(id);
    expect(item?.width).toBe(1);
    expect(item?.height).toBe(1);
  });

  it('removeItem removes the item from the array', () => {
    const id = store.addItem(canvasItem());
    expect(store.items).toHaveLength(1);
    store.removeItem(id);
    expect(store.items).toHaveLength(0);
  });

  it('removeItem also removes connections referencing the item', () => {
    const id1 = store.addItem(canvasItem({ resourceId: 'c1' }));
    const id2 = store.addItem(canvasItem({ resourceId: 'c2' }));
    const id3 = store.addItem(canvasItem({ resourceId: 'c3' }));
    store.addConnection(seqConnection(id1, id2));
    store.addConnection(seqConnection(id2, id3));
    expect(store.connections).toHaveLength(2);

    store.removeItem(id2);
    expect(store.items).toHaveLength(2);
    expect(store.connections).toHaveLength(0); // both connections touched id2
  });

  it('updateItem merges partial updates without overwriting other fields', () => {
    const id = store.addItem(canvasItem({ resourceId: 'original' }));
    store.updateItem(id, { label: 'My Canvas', color: '#FF0000' });
    const item = store.findItem(id);
    expect(item?.label).toBe('My Canvas');
    expect(item?.color).toBe('#FF0000');
    expect(item?.type).toBe('canvas');
    expect(item?.resourceId).toBe('original');
  });

  it('all item mutations set isDirty to true', () => {
    expect(store.isDirty).toBe(false);

    const id = store.addItem(canvasItem());
    expect(store.isDirty).toBe(true);

    // Reset dirty via loadBoard to test other mutations
    store.loadBoard({ id: 'b', items: [{ id, resourceId: 'r', x: 0, y: 0, width: 50, height: 50, type: 'canvas' }], connections: [], gridSize: 8, snapEnabled: false });
    expect(store.isDirty).toBe(false);

    store.moveItem(id, 10, 10);
    expect(store.isDirty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Snap to grid
// ---------------------------------------------------------------------------

describe('Snap to grid', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('with snap disabled, values pass through unchanged', () => {
    const store = new BoardVaultStore({ snapEnabled: false, gridSize: 10 });
    const id = store.addItem(canvasItem({ x: 14, y: 27 }));
    expect(store.findItem(id)?.x).toBe(14);
    expect(store.findItem(id)?.y).toBe(27);
    store.destroy();
  });

  it('with snap enabled, addItem snaps x and y to grid', () => {
    const store = new BoardVaultStore({ snapEnabled: true, gridSize: 10 });
    const id = store.addItem(canvasItem({ x: 14, y: 27 }));
    expect(store.findItem(id)?.x).toBe(10);
    expect(store.findItem(id)?.y).toBe(30);
    store.destroy();
  });

  it('moveItem snaps coordinates when snap is enabled', () => {
    const store = new BoardVaultStore({ snapEnabled: true, gridSize: 10 });
    const id = store.addItem(canvasItem({ x: 0, y: 0 }));
    store.moveItem(id, 33, 47);
    expect(store.findItem(id)?.x).toBe(30);
    expect(store.findItem(id)?.y).toBe(50);
    store.destroy();
  });

  it('custom grid size applies correctly', () => {
    const store = new BoardVaultStore({ snapEnabled: true, gridSize: 25 });
    const id = store.addItem(canvasItem({ x: 13, y: 37 }));
    // 13 -> round(13/25)*25 = round(0.52)*25 = 1*25 = 25
    // 37 -> round(37/25)*25 = round(1.48)*25 = 1*25 = 25
    expect(store.findItem(id)?.x).toBe(25);
    expect(store.findItem(id)?.y).toBe(25);
    store.destroy();
  });
});

// ---------------------------------------------------------------------------
// 6. Connections CRUD
// ---------------------------------------------------------------------------

describe('Connections CRUD', () => {
  let store: BoardVaultStore;
  beforeEach(() => { store = new BoardVaultStore(); });
  afterEach(() => { store.destroy(); });

  it('addConnection returns a generated string ID', () => {
    const id = store.addConnection(seqConnection('a', 'b'));
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('addConnection adds the connection to the connections array', () => {
    const id = store.addConnection(seqConnection('a', 'b', { type: 'reference' }));
    expect(store.connections).toHaveLength(1);
    expect(store.connections[0].id).toBe(id);
    expect(store.connections[0].type).toBe('reference');
    expect(store.connections[0].fromId).toBe('a');
    expect(store.connections[0].toId).toBe('b');
  });

  it('updateConnection merges partial fields without overwriting others', () => {
    const id = store.addConnection(seqConnection('a', 'b'));
    store.updateConnection(id, { label: 'Next', color: '#00FF00' });
    const conn = store.findConnection(id);
    expect(conn?.label).toBe('Next');
    expect(conn?.color).toBe('#00FF00');
    expect(conn?.type).toBe('sequence');
    expect(conn?.fromId).toBe('a');
  });

  it('removeConnection removes only the targeted connection', () => {
    const c1 = store.addConnection(seqConnection('a', 'b'));
    const c2 = store.addConnection(seqConnection('b', 'c', { type: 'reference' }));
    store.removeConnection(c1);
    expect(store.connections).toHaveLength(1);
    expect(store.connections[0].id).toBe(c2);
  });

  it('connection mutations set isDirty to true', () => {
    store.loadBoard({ id: 'b', items: [], connections: [], gridSize: 8, snapEnabled: false });
    expect(store.isDirty).toBe(false);

    store.addConnection(seqConnection('x', 'y'));
    expect(store.isDirty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Notes
// ---------------------------------------------------------------------------

describe('Notes', () => {
  let store: BoardVaultStore;
  beforeEach(() => { store = new BoardVaultStore(); });
  afterEach(() => { store.destroy(); });

  it('addNote creates a note-type item with default dimensions and color', () => {
    const id = store.addNote(50, 75, 'Sticky');
    const note = store.findItem(id);
    expect(note).toBeDefined();
    expect(note?.type).toBe('note');
    expect(note?.x).toBe(50);
    expect(note?.y).toBe(75);
    expect(note?.width).toBe(200);
    expect(note?.height).toBe(150);
    expect(note?.color).toBe('#FFEAA7');
    expect(note?.label).toBe('Sticky');
    expect(note?.resourceId).toBe('');
  });

  it('addNote with no label defaults to "New Note"', () => {
    const id = store.addNote(0, 0);
    expect(store.findItem(id)?.label).toBe('New Note');
  });

  it('updateNote delegates to updateItem correctly', () => {
    const id = store.addNote(10, 20, 'Original');
    store.updateNote(id, { label: 'Updated', color: '#FF0000' });
    const note = store.findItem(id);
    expect(note?.label).toBe('Updated');
    expect(note?.color).toBe('#FF0000');
    expect(note?.type).toBe('note'); // type preserved
  });
});

// ---------------------------------------------------------------------------
// 8. Groups
// ---------------------------------------------------------------------------

describe('Groups', () => {
  let store: BoardVaultStore;
  beforeEach(() => { store = new BoardVaultStore(); });
  afterEach(() => { store.destroy(); });

  it('createGroup calculates bounding box from member positions', () => {
    const i1 = store.addItem(canvasItem({ x: 50, y: 50, width: 100, height: 80 }));
    const i2 = store.addItem(canvasItem({ x: 200, y: 150, width: 60, height: 40 }));
    const gId = store.createGroup('Region', [i1, i2]);

    const group = store.findItem(gId);
    expect(group).toBeDefined();
    expect(group?.type).toBe('group');
    // padding=20: minX=50-20=30, minY=50-20=30, maxX=260+20=280, maxY=190+20=210
    expect(group?.x).toBe(30);
    expect(group?.y).toBe(30);
    expect(group?.width).toBe(250);  // 280 - 30
    expect(group?.height).toBe(180); // 210 - 30
  });

  it('createGroup assigns groupId to all member items', () => {
    const i1 = store.addItem(canvasItem({ resourceId: 'r1' }));
    const i2 = store.addItem(canvasItem({ resourceId: 'r2', x: 100 }));
    const gId = store.createGroup('G1', [i1, i2]);

    expect(store.findItem(i1)?.groupId).toBe(gId);
    expect(store.findItem(i2)?.groupId).toBe(gId);

    const members = store.getGroupMembers(gId);
    expect(members).toHaveLength(2);
    expect(members.map(m => m.id).sort()).toEqual([i1, i2].sort());
  });

  it('createGroup with no matching items creates a minimal group', () => {
    const gId = store.createGroup('Empty Group', []);
    const group = store.findItem(gId);
    expect(group).toBeDefined();
    expect(group?.type).toBe('group');
    expect(group?.label).toBe('Empty Group');
    expect(group?.x).toBe(0);
    expect(group?.y).toBe(0);
    expect(group?.width).toBe(200);
    expect(group?.height).toBe(200);
  });

  it('removeGroup removes the group item and unsets groupId on members', () => {
    const i1 = store.addItem(canvasItem({ resourceId: 'r1' }));
    const i2 = store.addItem(canvasItem({ resourceId: 'r2', x: 100 }));
    const gId = store.createGroup('G1', [i1, i2]);
    expect(store.findItem(gId)).toBeDefined();

    store.removeGroup(gId);
    expect(store.findItem(gId)).toBeUndefined();
    expect(store.findItem(i1)?.groupId).toBeUndefined();
    expect(store.findItem(i2)?.groupId).toBeUndefined();
  });

  it('addItemToGroup sets groupId on the item', () => {
    const i1 = store.addItem(canvasItem({ resourceId: 'r1' }));
    const gId = store.createGroup('G1', []);

    store.addItemToGroup(gId, i1);
    expect(store.findItem(i1)?.groupId).toBe(gId);
    expect(store.getGroupMembers(gId)).toHaveLength(1);
  });

  it('removeItemFromGroup unsets groupId on the item', () => {
    const i1 = store.addItem(canvasItem({ resourceId: 'r1' }));
    const gId = store.createGroup('G1', [i1]);
    expect(store.findItem(i1)?.groupId).toBe(gId);

    store.removeItemFromGroup(i1);
    expect(store.findItem(i1)?.groupId).toBeUndefined();
    expect(store.getGroupMembers(gId)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Undo / Redo
// ---------------------------------------------------------------------------

describe('Undo / Redo', () => {
  let store: BoardVaultStore;
  beforeEach(() => { store = new BoardVaultStore(); });
  afterEach(() => { store.destroy(); });

  it('after addItem, canUndo is true', () => {
    store.addItem(canvasItem());
    expect(store.canUndo).toBe(true);
  });

  it('undo reverts addItem (items become empty)', () => {
    store.addItem(canvasItem());
    expect(store.items).toHaveLength(1);

    store.undo();
    expect(store.items).toHaveLength(0);
  });

  it('redo restores after undo', () => {
    store.addItem(canvasItem());
    store.undo();
    expect(store.items).toHaveLength(0);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(store.items).toHaveLength(1);
  });

  it('multiple undos work as a stack', () => {
    store.addItem(canvasItem({ resourceId: 'first' }));
    store.addItem(canvasItem({ resourceId: 'second' }));
    store.addItem(canvasItem({ resourceId: 'third' }));
    expect(store.items).toHaveLength(3);

    store.undo(); // remove third
    expect(store.items).toHaveLength(2);

    store.undo(); // remove second
    expect(store.items).toHaveLength(1);
    expect(store.items[0].resourceId).toBe('first');

    store.undo(); // remove first
    expect(store.items).toHaveLength(0);
  });

  it('undo on empty history does nothing', () => {
    store.undo();
    expect(store.items).toEqual([]);
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
  });

  it('redo on empty future does nothing', () => {
    store.addItem(canvasItem());
    expect(store.canRedo).toBe(false);

    store.redo();
    expect(store.items).toHaveLength(1);
  });

  it('new mutation after undo clears redo stack', () => {
    store.addItem(canvasItem({ resourceId: 'c1' }));
    store.undo();
    expect(store.canRedo).toBe(true);

    store.addItem(canvasItem({ resourceId: 'c2' }));
    expect(store.canRedo).toBe(false);
  });

  it('undo and redo preserve full state including connections', () => {
    const id1 = store.addItem(canvasItem({ resourceId: 'c1' }));
    const id2 = store.addItem(canvasItem({ resourceId: 'c2' }));
    store.addConnection(seqConnection(id1, id2));
    expect(store.connections).toHaveLength(1);

    store.undo(); // undo addConnection
    expect(store.connections).toHaveLength(0);
    expect(store.items).toHaveLength(2); // items still present

    store.redo();
    expect(store.connections).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 10. Auto-save & persistence
// ---------------------------------------------------------------------------

describe('Auto-save & persistence', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('onSave is called after autoSaveDelay elapses', () => {
    const onSave = vi.fn();
    const store = new BoardVaultStore({ onSave, autoSaveDelay: 500 });
    store.addItem(canvasItem());
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(499);
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(store.isDirty).toBe(false);

    store.destroy();
  });

  it('save() calls onSave immediately and clears isDirty', () => {
    const onSave = vi.fn();
    const store = new BoardVaultStore({ onSave });
    store.addItem(canvasItem());
    expect(store.isDirty).toBe(true);

    store.save();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(store.isDirty).toBe(false);

    store.destroy();
  });

  it('save() passes the current board state to onSave', () => {
    const onSave = vi.fn();
    const store = new BoardVaultStore({ onSave });
    store.createBoard('test-board');
    store.addItem(canvasItem({ resourceId: 'r1' }));
    store.save();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-board',
        items: expect.arrayContaining([
          expect.objectContaining({ resourceId: 'r1' }),
        ]),
      })
    );

    store.destroy();
  });

  it('destroy() clears auto-save timer so no late calls happen', () => {
    const onSave = vi.fn();
    const store = new BoardVaultStore({ onSave, autoSaveDelay: 1000 });
    store.addItem(canvasItem());
    store.destroy();

    vi.advanceTimersByTime(2000);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('auto-save debounces: rapid mutations result in single save', () => {
    const onSave = vi.fn();
    const store = new BoardVaultStore({ onSave, autoSaveDelay: 300 });

    store.addItem(canvasItem({ resourceId: 'c1' }));
    vi.advanceTimersByTime(100);
    store.addItem(canvasItem({ resourceId: 'c2' }));
    vi.advanceTimersByTime(100);
    store.addItem(canvasItem({ resourceId: 'c3' }));

    // Only 300ms after the LAST mutation should the save fire
    vi.advanceTimersByTime(299);
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSave).toHaveBeenCalledTimes(1);

    store.destroy();
  });
});

// ---------------------------------------------------------------------------
// Query helpers (supplementary)
// ---------------------------------------------------------------------------

describe('Query helpers', () => {
  let store: BoardVaultStore;
  beforeEach(() => { store = new BoardVaultStore(); });
  afterEach(() => { store.destroy(); });

  it('findItem returns the item when it exists', () => {
    const id = store.addItem(canvasItem({ resourceId: 'target' }));
    const found = store.findItem(id);
    expect(found).toBeDefined();
    expect(found?.resourceId).toBe('target');
  });

  it('findItem returns undefined for unknown ID', () => {
    expect(store.findItem('nonexistent')).toBeUndefined();
  });

  it('findConnection returns the connection when it exists', () => {
    const id = store.addConnection(seqConnection('a', 'b'));
    const found = store.findConnection(id);
    expect(found).toBeDefined();
    expect(found?.fromId).toBe('a');
  });

  it('findConnection returns undefined for unknown ID', () => {
    expect(store.findConnection('nonexistent')).toBeUndefined();
  });

  it('getItemConnections returns all connections touching an item', () => {
    store.addConnection(seqConnection('x', 'y'));
    store.addConnection(seqConnection('y', 'z', { type: 'reference' }));
    store.addConnection(seqConnection('a', 'b'));

    const conns = store.getItemConnections('y');
    expect(conns).toHaveLength(2);
    expect(conns.every(c => c.fromId === 'y' || c.toId === 'y')).toBe(true);
  });

  it('getItemConnections returns empty array when item has no connections', () => {
    store.addConnection(seqConnection('a', 'b'));
    expect(store.getItemConnections('z')).toEqual([]);
  });

  it('getGroupMembers returns empty array when group has no members', () => {
    const gId = store.createGroup('Empty', []);
    // The group itself has type 'group' but no groupId pointing to it
    expect(store.getGroupMembers(gId)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Grid settings
// ---------------------------------------------------------------------------

describe('Grid settings', () => {
  let store: BoardVaultStore;
  beforeEach(() => { store = new BoardVaultStore(); });
  afterEach(() => { store.destroy(); });

  it('setGridSize updates gridSize', () => {
    store.setGridSize(20);
    expect(store.state.gridSize).toBe(20);
  });

  it('setGridSize clamps to minimum 1', () => {
    store.setGridSize(0);
    expect(store.state.gridSize).toBe(1);

    store.setGridSize(-10);
    expect(store.state.gridSize).toBe(1);
  });

  it('setSnapEnabled toggles snapping on and off', () => {
    expect(store.state.snapEnabled).toBe(false);

    store.setSnapEnabled(true);
    expect(store.state.snapEnabled).toBe(true);

    store.setSnapEnabled(false);
    expect(store.state.snapEnabled).toBe(false);
  });
});
