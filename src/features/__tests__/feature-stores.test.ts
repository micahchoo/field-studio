/**
 * Feature-Specific Stores Tests
 *
 * Tests the Svelte 5 runes-based reactive class stores migrated
 * from React hooks. Each describe block covers one store class:
 * constructor defaults, key mutations, and query helpers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// 1. BoardVaultStore
// ============================================================================

import {
  BoardVaultStore,
  type BoardState,
} from '@/src/features/board-design/stores/boardVault.svelte';

describe('BoardVaultStore', () => {
  let board: BoardVaultStore;

  beforeEach(() => {
    board = new BoardVaultStore();
  });

  // -- Constructor defaults --

  it('starts with empty items and connections', () => {
    expect(board.items).toEqual([]);
    expect(board.connections).toEqual([]);
    expect(board.isDirty).toBe(false);
    expect(board.canUndo).toBe(false);
    expect(board.canRedo).toBe(false);
  });

  it('applies constructor options', () => {
    const b = new BoardVaultStore({ snapEnabled: true, gridSize: 16 });
    expect(b.state.snapEnabled).toBe(true);
    expect(b.state.gridSize).toBe(16);
  });

  // -- Items CRUD --

  it('addItem returns an ID and appends the item', () => {
    const id = board.addItem({
      resourceId: 'canvas/1',
      x: 100,
      y: 200,
      width: 300,
      height: 150,
      type: 'canvas',
    });
    expect(typeof id).toBe('string');
    expect(board.items).toHaveLength(1);
    expect(board.items[0].resourceId).toBe('canvas/1');
    expect(board.items[0].x).toBe(100);
    expect(board.items[0].y).toBe(200);
    expect(board.isDirty).toBe(true);
  });

  it('moveItem updates coordinates', () => {
    const id = board.addItem({
      resourceId: 'c1',
      x: 10,
      y: 20,
      width: 50,
      height: 50,
      type: 'canvas',
    });
    board.moveItem(id, 500, 600);
    const found = board.findItem(id);
    expect(found?.x).toBe(500);
    expect(found?.y).toBe(600);
  });

  it('resizeItem clamps to minimum 1', () => {
    const id = board.addItem({
      resourceId: 'c1',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      type: 'canvas',
    });
    board.resizeItem(id, -5, 0);
    const found = board.findItem(id);
    expect(found?.width).toBe(1);
    expect(found?.height).toBe(1);
  });

  it('removeItem removes the item and its connections', () => {
    const id1 = board.addItem({
      resourceId: 'c1',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      type: 'canvas',
    });
    const id2 = board.addItem({
      resourceId: 'c2',
      x: 100,
      y: 0,
      width: 50,
      height: 50,
      type: 'canvas',
    });
    board.addConnection({ fromId: id1, toId: id2, type: 'sequence' });
    expect(board.connections).toHaveLength(1);

    board.removeItem(id1);
    expect(board.items).toHaveLength(1);
    expect(board.items[0].id).toBe(id2);
    expect(board.connections).toHaveLength(0);
  });

  it('updateItem merges partial updates', () => {
    const id = board.addItem({
      resourceId: 'c1',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      type: 'canvas',
    });
    board.updateItem(id, { label: 'My Canvas', color: '#FF0000' });
    const found = board.findItem(id);
    expect(found?.label).toBe('My Canvas');
    expect(found?.color).toBe('#FF0000');
    expect(found?.type).toBe('canvas');
  });

  // -- Connections CRUD --

  it('addConnection returns an ID and appends the connection', () => {
    const connId = board.addConnection({
      fromId: 'a',
      toId: 'b',
      type: 'reference',
    });
    expect(typeof connId).toBe('string');
    expect(board.connections).toHaveLength(1);
    expect(board.connections[0].type).toBe('reference');
  });

  it('updateConnection merges partial updates', () => {
    const connId = board.addConnection({
      fromId: 'a',
      toId: 'b',
      type: 'sequence',
    });
    board.updateConnection(connId, { label: 'Next' });
    const found = board.findConnection(connId);
    expect(found?.label).toBe('Next');
    expect(found?.type).toBe('sequence');
  });

  it('removeConnection removes only that connection', () => {
    const c1 = board.addConnection({ fromId: 'a', toId: 'b', type: 'sequence' });
    const c2 = board.addConnection({ fromId: 'b', toId: 'c', type: 'reference' });
    board.removeConnection(c1);
    expect(board.connections).toHaveLength(1);
    expect(board.connections[0].id).toBe(c2);
  });

  // -- Notes --

  it('addNote creates a note-type item with defaults', () => {
    const id = board.addNote(50, 75, 'My Note');
    const note = board.findItem(id);
    expect(note?.type).toBe('note');
    expect(note?.label).toBe('My Note');
    expect(note?.width).toBe(200);
    expect(note?.height).toBe(150);
    expect(note?.color).toBe('#FFEAA7');
  });

  it('addNote with no label uses "New Note"', () => {
    const id = board.addNote(0, 0);
    expect(board.findItem(id)?.label).toBe('New Note');
  });

  // -- Groups --

  it('createGroup assigns groupId to members', () => {
    const i1 = board.addItem({ resourceId: 'r1', x: 0, y: 0, width: 50, height: 50, type: 'canvas' });
    const i2 = board.addItem({ resourceId: 'r2', x: 100, y: 100, width: 50, height: 50, type: 'canvas' });
    const gId = board.createGroup('G1', [i1, i2]);

    expect(board.findItem(gId)?.type).toBe('group');
    expect(board.findItem(gId)?.label).toBe('G1');
    const members = board.getGroupMembers(gId);
    expect(members).toHaveLength(2);
    expect(members.map(m => m.id).sort()).toEqual([i1, i2].sort());
  });

  it('removeGroup unsets groupId on members', () => {
    const i1 = board.addItem({ resourceId: 'r1', x: 0, y: 0, width: 50, height: 50, type: 'canvas' });
    const gId = board.createGroup('G1', [i1]);
    expect(board.findItem(i1)?.groupId).toBe(gId);

    board.removeGroup(gId);
    expect(board.findItem(gId)).toBeUndefined();
    expect(board.findItem(i1)?.groupId).toBeUndefined();
  });

  it('addItemToGroup and removeItemFromGroup work', () => {
    const i1 = board.addItem({ resourceId: 'r1', x: 0, y: 0, width: 50, height: 50, type: 'canvas' });
    const gId = board.createGroup('G1', []);

    board.addItemToGroup(gId, i1);
    expect(board.findItem(i1)?.groupId).toBe(gId);

    board.removeItemFromGroup(i1);
    expect(board.findItem(i1)?.groupId).toBeUndefined();
  });

  // -- Undo / Redo --

  it('undo restores the previous state', () => {
    board.addItem({ resourceId: 'c1', x: 0, y: 0, width: 50, height: 50, type: 'canvas' });
    expect(board.items).toHaveLength(1);
    expect(board.canUndo).toBe(true);

    board.undo();
    expect(board.items).toHaveLength(0);
    expect(board.canRedo).toBe(true);
  });

  it('redo restores the undone state', () => {
    board.addItem({ resourceId: 'c1', x: 0, y: 0, width: 50, height: 50, type: 'canvas' });
    board.undo();
    expect(board.items).toHaveLength(0);

    board.redo();
    expect(board.items).toHaveLength(1);
  });

  it('new mutation after undo clears redo stack', () => {
    board.addItem({ resourceId: 'c1', x: 0, y: 0, width: 50, height: 50, type: 'canvas' });
    board.undo();
    expect(board.canRedo).toBe(true);

    board.addItem({ resourceId: 'c2', x: 10, y: 10, width: 50, height: 50, type: 'canvas' });
    expect(board.canRedo).toBe(false);
  });

  it('undo no-ops when history is empty', () => {
    board.undo();
    expect(board.items).toEqual([]);
  });

  it('redo no-ops when future is empty', () => {
    board.addItem({ resourceId: 'c1', x: 0, y: 0, width: 50, height: 50, type: 'canvas' });
    board.redo();
    expect(board.items).toHaveLength(1);
  });

  // -- Grid snapping --

  it('snaps coordinates when snapEnabled is true', () => {
    const b = new BoardVaultStore({ snapEnabled: true, gridSize: 10 });
    const id = b.addItem({
      resourceId: 'r1',
      x: 14,
      y: 27,
      width: 100,
      height: 100,
      type: 'canvas',
    });
    expect(b.findItem(id)?.x).toBe(10);
    expect(b.findItem(id)?.y).toBe(30);
  });

  it('does not snap when snapEnabled is false', () => {
    const b = new BoardVaultStore({ snapEnabled: false, gridSize: 10 });
    const id = b.addItem({
      resourceId: 'r1',
      x: 14,
      y: 27,
      width: 100,
      height: 100,
      type: 'canvas',
    });
    expect(b.findItem(id)?.x).toBe(14);
    expect(b.findItem(id)?.y).toBe(27);
  });

  // -- Grid settings --

  it('setGridSize clamps to minimum 1', () => {
    board.setGridSize(0);
    expect(board.state.gridSize).toBe(1);
    board.setGridSize(20);
    expect(board.state.gridSize).toBe(20);
  });

  it('setSnapEnabled toggles snapping', () => {
    board.setSnapEnabled(true);
    expect(board.state.snapEnabled).toBe(true);
    board.setSnapEnabled(false);
    expect(board.state.snapEnabled).toBe(false);
  });

  // -- loadBoard / createBoard --

  it('loadBoard replaces state and clears history', () => {
    board.addItem({ resourceId: 'c1', x: 0, y: 0, width: 50, height: 50, type: 'canvas' });
    expect(board.canUndo).toBe(true);

    const newState: BoardState = {
      id: 'board-99',
      items: [],
      connections: [],
      gridSize: 4,
      snapEnabled: true,
    };
    board.loadBoard(newState);
    expect(board.boardId).toBe('board-99');
    expect(board.items).toEqual([]);
    expect(board.canUndo).toBe(false);
    expect(board.isDirty).toBe(false);
  });

  it('createBoard initializes a fresh board with given id', () => {
    board.createBoard('new-board');
    expect(board.boardId).toBe('new-board');
    expect(board.items).toEqual([]);
    expect(board.connections).toEqual([]);
  });

  // -- Query helpers --

  it('getItemConnections returns connections for a given item', () => {
    board.addConnection({ fromId: 'x', toId: 'y', type: 'sequence' });
    board.addConnection({ fromId: 'y', toId: 'z', type: 'reference' });
    board.addConnection({ fromId: 'a', toId: 'b', type: 'custom' });

    const conns = board.getItemConnections('y');
    expect(conns).toHaveLength(2);
  });

  // -- Auto-save --

  it('triggers onSave after autoSaveDelay', () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const b = new BoardVaultStore({ onSave, autoSaveDelay: 500 });
    b.addItem({ resourceId: 'c1', x: 0, y: 0, width: 50, height: 50, type: 'canvas' });
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(b.isDirty).toBe(false);

    b.destroy();
    vi.useRealTimers();
  });

  it('save() manually triggers onSave callback', () => {
    const onSave = vi.fn();
    const b = new BoardVaultStore({ onSave });
    b.addItem({ resourceId: 'c1', x: 0, y: 0, width: 50, height: 50, type: 'canvas' });
    b.save();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(b.isDirty).toBe(false);
    b.destroy();
  });
});

// ============================================================================
// 2. BoardMultiSelectStore
// ============================================================================

import { BoardMultiSelectStore } from '@/src/features/board-design/stores/multiSelect.svelte';

describe('BoardMultiSelectStore', () => {
  let sel: BoardMultiSelectStore;

  beforeEach(() => {
    sel = new BoardMultiSelectStore();
  });

  it('starts with empty selection', () => {
    expect(sel.count).toBe(0);
    expect(sel.hasSelection).toBe(false);
  });

  it('toggleItem without shift replaces selection', () => {
    sel.toggleItem('a', false);
    expect(sel.count).toBe(1);
    expect(sel.isSelected('a')).toBe(true);

    sel.toggleItem('b', false);
    expect(sel.count).toBe(1);
    expect(sel.isSelected('a')).toBe(false);
    expect(sel.isSelected('b')).toBe(true);
  });

  it('toggleItem with shift adds/removes from selection', () => {
    sel.toggleItem('a', true);
    sel.toggleItem('b', true);
    expect(sel.count).toBe(2);
    expect(sel.isSelected('a')).toBe(true);
    expect(sel.isSelected('b')).toBe(true);

    sel.toggleItem('a', true);
    expect(sel.count).toBe(1);
    expect(sel.isSelected('a')).toBe(false);
  });

  it('selectItems replaces selection with provided IDs', () => {
    sel.toggleItem('x', false);
    sel.selectItems(['a', 'b', 'c']);
    expect(sel.count).toBe(3);
    expect(sel.isSelected('x')).toBe(false);
  });

  it('clearSelection empties all', () => {
    sel.selectItems(['a', 'b']);
    sel.clearSelection();
    expect(sel.count).toBe(0);
    expect(sel.hasSelection).toBe(false);
  });

  it('selectAll selects all provided items', () => {
    const items = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 10, y: 10 },
      { id: 'c', x: 20, y: 20 },
    ];
    sel.selectAll(items);
    expect(sel.count).toBe(3);
  });

  it('deleteSelected calls removeItem for each and clears', () => {
    sel.selectItems(['a', 'b']);
    const removeFn = vi.fn();
    sel.deleteSelected(removeFn);
    expect(removeFn).toHaveBeenCalledWith('a');
    expect(removeFn).toHaveBeenCalledWith('b');
    expect(sel.count).toBe(0);
  });

  it('moveSelected calls moveItem with offset positions', () => {
    const items = [
      { id: 'a', x: 10, y: 20 },
      { id: 'b', x: 100, y: 200 },
    ];
    sel.selectItems(['a', 'b']);
    const moveFn = vi.fn();
    sel.moveSelected(5, -3, moveFn, items);
    expect(moveFn).toHaveBeenCalledWith('a', { x: 15, y: 17 });
    expect(moveFn).toHaveBeenCalledWith('b', { x: 105, y: 197 });
  });
});

// ============================================================================
// 3. PresentationModeStore
// ============================================================================

import { PresentationModeStore } from '@/src/features/board-design/stores/presentationMode.svelte';

describe('PresentationModeStore', () => {
  let pres: PresentationModeStore;

  beforeEach(() => {
    pres = new PresentationModeStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    pres.destroy();
    vi.useRealTimers();
  });

  const slides = [
    { id: 's1', label: 'Slide 1' },
    { id: 's2', label: 'Slide 2' },
    { id: 's3', label: 'Slide 3' },
  ];

  it('starts inactive', () => {
    expect(pres.isActive).toBe(false);
    expect(pres.totalSlides).toBe(0);
    expect(pres.currentSlide).toBeNull();
  });

  it('enter activates with slides at index 0', () => {
    pres.enter(slides, []);
    expect(pres.isActive).toBe(true);
    expect(pres.totalSlides).toBe(3);
    expect(pres.currentIndex).toBe(0);
    expect(pres.currentSlide?.id).toBe('s1');
    expect(pres.isFirst).toBe(true);
    expect(pres.isLast).toBe(false);
  });

  it('enter with empty items does not activate', () => {
    pres.enter([], []);
    expect(pres.isActive).toBe(false);
  });

  it('enter orders slides via BFS through sequence connections', () => {
    // s1 -> s3 -> s2 (sequence chain)
    const conns = [
      { fromId: 's1', toId: 's3', type: 'sequence' },
      { fromId: 's3', toId: 's2', type: 'sequence' },
    ];
    pres.enter(slides, conns);
    expect(pres.slides.map(s => s.id)).toEqual(['s1', 's3', 's2']);
  });

  it('enter appends unreachable items after BFS items', () => {
    const items = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
      { id: 'orphan' },
    ];
    const conns = [
      { fromId: 'a', toId: 'b', type: 'sequence' },
      { fromId: 'b', toId: 'c', type: 'sequence' },
    ];
    pres.enter(items, conns);
    expect(pres.slides.map(s => s.id)).toEqual(['a', 'b', 'c', 'orphan']);
  });

  it('non-sequence connections are ignored in ordering', () => {
    const conns = [
      { fromId: 's1', toId: 's3', type: 'reference' },
    ];
    pres.enter(slides, conns);
    // All items are "roots" with no sequence connections, so order is original
    expect(pres.slides.map(s => s.id)).toEqual(['s1', 's2', 's3']);
  });

  it('next wraps around', () => {
    pres.enter(slides, []);
    pres.next();
    expect(pres.currentIndex).toBe(1);
    pres.next();
    expect(pres.currentIndex).toBe(2);
    expect(pres.isLast).toBe(true);
    pres.next();
    expect(pres.currentIndex).toBe(0);
  });

  it('prev wraps around', () => {
    pres.enter(slides, []);
    pres.prev();
    expect(pres.currentIndex).toBe(2);
    pres.prev();
    expect(pres.currentIndex).toBe(1);
  });

  it('goTo jumps to valid index, ignores out-of-range', () => {
    pres.enter(slides, []);
    pres.goTo(2);
    expect(pres.currentIndex).toBe(2);
    pres.goTo(-1);
    expect(pres.currentIndex).toBe(2);
    pres.goTo(99);
    expect(pres.currentIndex).toBe(2);
  });

  it('progress reflects position', () => {
    pres.enter(slides, []);
    // Index 0 => 1/3
    expect(pres.progress).toBeCloseTo(1 / 3, 5);
    pres.next();
    expect(pres.progress).toBeCloseTo(2 / 3, 5);
    pres.next();
    expect(pres.progress).toBeCloseTo(1, 5);
  });

  it('exit resets to inactive state', () => {
    pres.enter(slides, []);
    pres.next();
    pres.exit();
    expect(pres.isActive).toBe(false);
    expect(pres.totalSlides).toBe(0);
    expect(pres.currentIndex).toBe(0);
  });

  // -- Auto-advance --

  it('toggleAutoAdvance starts and stops auto-advancing', () => {
    pres.enter(slides, []);
    pres.toggleAutoAdvance();
    expect(pres.isAutoAdvancing).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(pres.currentIndex).toBe(1);

    vi.advanceTimersByTime(5000);
    expect(pres.currentIndex).toBe(2);

    pres.toggleAutoAdvance();
    expect(pres.isAutoAdvancing).toBe(false);

    vi.advanceTimersByTime(10000);
    expect(pres.currentIndex).toBe(2);
  });

  it('setAutoAdvanceInterval changes the interval', () => {
    pres.enter(slides, []);
    pres.setAutoAdvanceInterval(1000);
    pres.toggleAutoAdvance();

    vi.advanceTimersByTime(1000);
    expect(pres.currentIndex).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(pres.currentIndex).toBe(2);
  });

  it('setAutoAdvanceInterval clamps to minimum 500ms', () => {
    pres.enter(slides, []);
    pres.setAutoAdvanceInterval(100);
    pres.toggleAutoAdvance();

    // Should use 500ms, not 100ms
    vi.advanceTimersByTime(499);
    expect(pres.currentIndex).toBe(0);
    vi.advanceTimersByTime(1);
    expect(pres.currentIndex).toBe(1);
  });

  // -- Keyboard handling --

  it('handleKeyboard returns false when inactive', () => {
    const e = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    expect(pres.handleKeyboard(e)).toBe(false);
  });

  it('handleKeyboard navigates with arrow keys', () => {
    pres.enter(slides, []);
    expect(pres.handleKeyboard(new KeyboardEvent('keydown', { key: 'ArrowRight' }))).toBe(true);
    expect(pres.currentIndex).toBe(1);

    expect(pres.handleKeyboard(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))).toBe(true);
    expect(pres.currentIndex).toBe(0);
  });

  it('handleKeyboard Home/End jump to first/last', () => {
    pres.enter(slides, []);
    pres.handleKeyboard(new KeyboardEvent('keydown', { key: 'End' }));
    expect(pres.currentIndex).toBe(2);

    pres.handleKeyboard(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(pres.currentIndex).toBe(0);
  });

  it('handleKeyboard Escape exits presentation', () => {
    pres.enter(slides, []);
    pres.handleKeyboard(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(pres.isActive).toBe(false);
  });

  it('handleKeyboard "a" toggles auto-advance', () => {
    pres.enter(slides, []);
    pres.handleKeyboard(new KeyboardEvent('keydown', { key: 'a' }));
    expect(pres.isAutoAdvancing).toBe(true);
    pres.handleKeyboard(new KeyboardEvent('keydown', { key: 'a' }));
    expect(pres.isAutoAdvancing).toBe(false);
  });

  it('handleKeyboard returns false for unrecognized keys', () => {
    pres.enter(slides, []);
    expect(pres.handleKeyboard(new KeyboardEvent('keydown', { key: 'z' }))).toBe(false);
  });
});

// ============================================================================
// 4. SearchStore
// ============================================================================

import { SearchStore, type SearchFilter } from '@/src/features/search/stores/search.svelte';

describe('SearchStore', () => {
  let search: SearchStore;

  beforeEach(() => {
    search = new SearchStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    search.destroy();
    vi.useRealTimers();
  });

  it('starts with empty state', () => {
    expect(search.query).toBe('');
    expect(search.results).toEqual([]);
    expect(search.filter).toBe('All');
    expect(search.hasResults).toBe(false);
    expect(search.resultCount).toBe(0);
    expect(search.recentSearches).toEqual([]);
  });

  // -- Index building --

  it('buildIndex builds an index from items', () => {
    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Painting of Flowers' },
      { id: '2', type: 'Manifest', label: 'Botanical Collection' },
    ]);
    expect(search.isIndexing).toBe(false);
  });

  // -- Query and search execution --

  it('setQuery triggers debounced search', () => {
    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Painting of Flowers' },
      { id: '2', type: 'Manifest', label: 'Botanical Collection' },
    ]);

    search.setQuery('painting');
    // Before debounce fires, no results yet
    expect(search.results).toEqual([]);

    vi.advanceTimersByTime(300);
    expect(search.hasResults).toBe(true);
    expect(search.results[0].label).toBe('Painting of Flowers');
  });

  it('empty query clears results', () => {
    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Test' },
    ]);
    search.setQuery('test');
    vi.advanceTimersByTime(300);
    expect(search.hasResults).toBe(true);

    search.setQuery('');
    expect(search.results).toEqual([]);
    expect(search.hasResults).toBe(false);
  });

  it('clearQuery resets query and results', () => {
    search.setQuery('something');
    search.clearQuery();
    expect(search.query).toBe('');
    expect(search.results).toEqual([]);
    expect(search.showAutocomplete).toBe(false);
  });

  // -- Filter by type --

  it('setFilter re-executes search with type filter', () => {
    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Painting' },
      { id: '2', type: 'Manifest', label: 'Painting Collection' },
    ]);
    search.setQuery('painting');
    vi.advanceTimersByTime(300);
    expect(search.results).toHaveLength(2);

    search.setFilter('Canvas');
    expect(search.filter).toBe('Canvas');
    expect(search.results).toHaveLength(1);
    expect(search.results[0].type).toBe('Canvas');
  });

  // -- Scoring --

  it('exact label match scores highest', () => {
    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'flower' },
      { id: '2', type: 'Canvas', label: 'flower garden' },
      { id: '3', type: 'Canvas', label: 'sunflower' },
    ]);
    search.setQuery('flower');
    vi.advanceTimersByTime(300);
    // 'flower' has exact match (100) + starts-with (50) + token exact (10)
    // 'flower garden' has starts-with (50) + token exact (10)
    // 'sunflower' has contains (20)
    expect(search.results[0].id).toBe('1');
  });

  it('metadata matches contribute to score', () => {
    search.buildIndex([
      {
        id: '1',
        type: 'Canvas',
        label: 'Canvas One',
        metadata: { description: 'A beautiful painting' },
      },
    ]);
    search.setQuery('beautiful');
    vi.advanceTimersByTime(300);
    expect(search.hasResults).toBe(true);
    expect(search.results[0].snippet).toBeDefined();
  });

  // -- Autocomplete --

  it('autocomplete shows matching labels from index', () => {
    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Painting Alpha' },
      { id: '2', type: 'Canvas', label: 'Painting Beta' },
      { id: '3', type: 'Canvas', label: 'Sculpture' },
    ]);
    search.setQuery('paint');
    expect(search.showAutocomplete).toBe(true);
    expect(search.autocompleteResults.length).toBeGreaterThan(0);
    expect(search.autocompleteResults.every(r => r.toLowerCase().startsWith('paint'))).toBe(true);
  });

  it('navigateAutocomplete cycles through suggestions', () => {
    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Painting Alpha' },
      { id: '2', type: 'Canvas', label: 'Painting Beta' },
    ]);
    search.setQuery('paint');
    expect(search.autocompleteIndex).toBe(-1);

    search.navigateAutocomplete('down');
    expect(search.autocompleteIndex).toBe(0);

    search.navigateAutocomplete('down');
    expect(search.autocompleteIndex).toBe(1);

    // Wrap around
    search.navigateAutocomplete('down');
    expect(search.autocompleteIndex).toBe(-1);
  });

  it('navigateAutocomplete wraps up from -1', () => {
    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Painting Alpha' },
      { id: '2', type: 'Canvas', label: 'Painting Beta' },
    ]);
    search.setQuery('paint');
    search.navigateAutocomplete('up');
    expect(search.autocompleteIndex).toBe(1); // wraps to last
  });

  it('selectAutocomplete sets query and executes immediately', () => {
    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Painting Alpha' },
    ]);
    search.setQuery('paint');
    search.selectAutocomplete(0);
    expect(search.query).toBe('Painting Alpha');
    expect(search.showAutocomplete).toBe(false);
    // Search should have executed immediately
    expect(search.hasResults).toBe(true);
  });

  it('closeAutocomplete hides the dropdown', () => {
    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Painting' },
    ]);
    search.setQuery('paint');
    expect(search.showAutocomplete).toBe(true);
    search.closeAutocomplete();
    expect(search.showAutocomplete).toBe(false);
    expect(search.autocompleteIndex).toBe(-1);
  });

  // -- Recent searches --

  it('recent searches are tracked after debounce fires', () => {
    search.buildIndex([]);
    search.setQuery('test query');
    vi.advanceTimersByTime(300);
    expect(search.recentSearches).toContain('test query');
  });

  it('recent searches are deduplicated (case-insensitive)', () => {
    search.buildIndex([]);
    search.setQuery('Hello');
    vi.advanceTimersByTime(300);
    search.setQuery('hello');
    vi.advanceTimersByTime(300);
    // Should have only one entry (most recent at front)
    expect(search.recentSearches.filter(r => r.toLowerCase() === 'hello')).toHaveLength(1);
  });

  it('clearRecentSearches empties the list', () => {
    search.buildIndex([]);
    search.setQuery('test');
    vi.advanceTimersByTime(300);
    search.clearRecentSearches();
    expect(search.recentSearches).toEqual([]);
  });

  it('autocomplete includes matching recent searches', () => {
    search.buildIndex([]);
    search.setQuery('painting details');
    vi.advanceTimersByTime(300);

    search.setQuery('pain');
    expect(search.autocompleteResults).toContain('painting details');
  });

  // -- Display utilities --

  it('getResultCountText returns formatted text', () => {
    expect(search.getResultCountText()).toBe('No results');

    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Test' },
    ]);
    search.setQuery('test');
    vi.advanceTimersByTime(300);
    expect(search.getResultCountText()).toBe('1 result');

    search.buildIndex([
      { id: '1', type: 'Canvas', label: 'Test One' },
      { id: '2', type: 'Canvas', label: 'Test Two' },
    ]);
    search.setQuery('test');
    vi.advanceTimersByTime(300);
    expect(search.getResultCountText()).toBe('2 results');
  });
});

// ============================================================================
// 5. MapStore
// ============================================================================

import { MapStore } from '@/src/features/map/stores/map.svelte';

describe('MapStore', () => {
  let map: MapStore;

  beforeEach(() => {
    map = new MapStore();
  });

  it('starts with no geo data', () => {
    expect(map.hasGeoData).toBe(false);
    expect(map.geoItems).toEqual([]);
    expect(map.bounds).toBeNull();
    expect(map.clusters).toEqual([]);
    expect(map.zoom).toBe(1);
  });

  // -- Coordinate parsing: decimal --

  it('parses decimal coordinates from canvas metadata', () => {
    map.loadFromManifest([
      {
        id: 'canvas-1',
        label: 'NYC',
        metadata: [{ label: 'coordinates', value: '40.7128, -74.0060' }],
      },
    ]);
    expect(map.hasGeoData).toBe(true);
    expect(map.geoItems).toHaveLength(1);
    expect(map.geoItems[0].lat).toBeCloseTo(40.7128, 3);
    expect(map.geoItems[0].lng).toBeCloseTo(-74.006, 3);
    expect(map.geoItems[0].canvasId).toBe('canvas-1');
  });

  it('parses decimal with direction suffixes', () => {
    map.loadFromManifest([
      {
        id: 'c1',
        label: 'London',
        metadata: [{ label: 'location', value: '51.5074N, 0.1278W' }],
      },
    ]);
    expect(map.hasGeoData).toBe(true);
    expect(map.geoItems[0].lat).toBeCloseTo(51.5074, 3);
    expect(map.geoItems[0].lng).toBeCloseTo(-0.1278, 3);
  });

  // -- Coordinate parsing: DMS --

  it('parses DMS coordinates', () => {
    map.loadFromManifest([
      {
        id: 'c2',
        label: 'NYC DMS',
        metadata: [{ label: 'gps', value: '40°42\'46"N 74°0\'22"W' }],
      },
    ]);
    expect(map.hasGeoData).toBe(true);
    const item = map.geoItems[0];
    // 40 + 42/60 + 46/3600 = ~40.7128
    expect(item.lat).toBeCloseTo(40.7128, 2);
    expect(item.lng).toBeLessThan(0); // W = negative
  });

  // -- Coordinate parsing: edge cases --

  it('ignores canvases without metadata', () => {
    map.loadFromManifest([
      { id: 'c1', label: 'No Meta' },
    ]);
    expect(map.hasGeoData).toBe(false);
  });

  it('ignores metadata fields that do not look geographic', () => {
    map.loadFromManifest([
      {
        id: 'c1',
        label: 'Canvas',
        metadata: [{ label: 'description', value: '40.7128, -74.0060' }],
      },
    ]);
    expect(map.hasGeoData).toBe(false);
  });

  it('ignores invalid coordinate values', () => {
    map.loadFromManifest([
      {
        id: 'c1',
        label: 'Bad',
        metadata: [{ label: 'coordinates', value: 'not a coordinate' }],
      },
    ]);
    expect(map.hasGeoData).toBe(false);
  });

  it('takes only the first valid coordinate per canvas', () => {
    map.loadFromManifest([
      {
        id: 'c1',
        label: 'Multi',
        metadata: [
          { label: 'location', value: '10.0, 20.0' },
          { label: 'gps', value: '30.0, 40.0' },
        ],
      },
    ]);
    expect(map.geoItems).toHaveLength(1);
    expect(map.geoItems[0].lat).toBeCloseTo(10.0, 3);
  });

  // -- Bounds calculation --

  it('calculates bounds with padding', () => {
    map.loadFromManifest([
      {
        id: 'c1',
        label: 'A',
        metadata: [{ label: 'coordinates', value: '10.0, 20.0' }],
      },
      {
        id: 'c2',
        label: 'B',
        metadata: [{ label: 'coordinates', value: '20.0, 40.0' }],
      },
    ]);
    const bounds = map.bounds!;
    expect(bounds).not.toBeNull();
    // lat range = 10..20, padding = 10% of 10 = 1 on each side
    expect(bounds.minLat).toBeLessThan(10);
    expect(bounds.maxLat).toBeGreaterThan(20);
    expect(bounds.minLng).toBeLessThan(20);
    expect(bounds.maxLng).toBeGreaterThan(40);
  });

  // -- Clustering --

  it('creates clusters from multiple items', () => {
    map.loadFromManifest([
      { id: 'c1', label: 'A', metadata: [{ label: 'coordinates', value: '10.0, 20.0' }] },
      { id: 'c2', label: 'B', metadata: [{ label: 'coordinates', value: '10.001, 20.001' }] },
      { id: 'c3', label: 'C', metadata: [{ label: 'coordinates', value: '50.0, 80.0' }] },
    ]);
    expect(map.clusters.length).toBeGreaterThanOrEqual(1);
    // Two nearby items should cluster together, distant one separate
    const totalClusteredItems = map.clusters.reduce((sum, c) => sum + c.items.length, 0);
    expect(totalClusteredItems).toBe(3);
  });

  it('single item creates a single cluster', () => {
    map.loadFromManifest([
      { id: 'c1', label: 'A', metadata: [{ label: 'coordinates', value: '10.0, 20.0' }] },
    ]);
    expect(map.clusters).toHaveLength(1);
    expect(map.clusters[0].items).toHaveLength(1);
  });

  // -- Viewport controls --

  it('zoomIn increases zoom', () => {
    const before = map.zoom;
    map.loadFromManifest([
      { id: 'c1', label: 'A', metadata: [{ label: 'coordinates', value: '10.0, 20.0' }] },
    ]);
    map.zoomIn();
    expect(map.zoom).toBeGreaterThan(before);
  });

  it('zoomOut decreases zoom', () => {
    map.loadFromManifest([
      { id: 'c1', label: 'A', metadata: [{ label: 'coordinates', value: '10.0, 20.0' }] },
    ]);
    map.zoomIn();
    map.zoomIn();
    const afterIn = map.zoom;
    map.zoomOut();
    expect(map.zoom).toBeLessThan(afterIn);
  });

  it('resetView restores defaults', () => {
    map.loadFromManifest([
      { id: 'c1', label: 'A', metadata: [{ label: 'coordinates', value: '10.0, 20.0' }] },
    ]);
    map.zoomIn();
    map.setPan(100, 200);
    map.setHoveredItem('c1-geo');
    map.selectCluster('cluster-0');

    map.resetView();
    expect(map.zoom).toBe(1);
    expect(map.panX).toBe(0);
    expect(map.panY).toBe(0);
    expect(map.hoveredItemId).toBeNull();
    expect(map.selectedClusterId).toBeNull();
  });

  it('setPan updates pan coordinates', () => {
    map.setPan(42, -15);
    expect(map.panX).toBe(42);
    expect(map.panY).toBe(-15);
  });

  // -- geoToPixel projection --

  it('geoToPixel returns center when bounds is null', () => {
    const pos = map.geoToPixel(10, 20, 800, 600);
    expect(pos.x).toBe(400);
    expect(pos.y).toBe(300);
  });

  // -- Format utilities --

  it('formatCoordinates formats lat/lng with direction', () => {
    expect(map.formatCoordinates(40.7128, -74.006)).toBe('40.7128N, 74.0060W');
    expect(map.formatCoordinates(-33.8688, 151.2093)).toBe('33.8688S, 151.2093E');
  });

  it('formatBounds returns "No bounds" when empty', () => {
    expect(map.formatBounds()).toBe('No bounds');
  });
});

// ============================================================================
// 6. TimelineStore
// ============================================================================

import { TimelineStore } from '@/src/features/timeline/stores/timeline.svelte';

describe('TimelineStore', () => {
  let tl: TimelineStore;

  beforeEach(() => {
    tl = new TimelineStore();
  });

  it('starts with no data', () => {
    expect(tl.hasData).toBe(false);
    expect(tl.totalItems).toBe(0);
    expect(tl.groups).toEqual([]);
    expect(tl.zoomLevel).toBe('month');
    expect(tl.minDate).toBeNull();
    expect(tl.maxDate).toBeNull();
  });

  // -- navDate extraction --

  it('extracts items from canvases with navDate', () => {
    tl.loadFromCanvases([
      { id: 'c1', label: 'Photo 1', navDate: '2024-01-15T00:00:00Z' },
      { id: 'c2', label: 'Photo 2', navDate: '2024-06-20T00:00:00Z' },
      { id: 'c3', label: 'No date' },
    ]);
    expect(tl.hasData).toBe(true);
    expect(tl.totalItems).toBe(2);
  });

  it('skips canvases with invalid navDate', () => {
    tl.loadFromCanvases([
      { id: 'c1', label: 'Bad', navDate: 'not-a-date' },
      { id: 'c2', label: 'Good', navDate: '2024-03-01T00:00:00Z' },
    ]);
    expect(tl.totalItems).toBe(1);
  });

  it('sets minDate and maxDate correctly', () => {
    tl.loadFromCanvases([
      { id: 'c1', navDate: '2024-06-20T00:00:00Z' },
      { id: 'c2', navDate: '2023-01-15T00:00:00Z' },
      { id: 'c3', navDate: '2025-12-31T00:00:00Z' },
    ]);
    expect(tl.minDate!.getFullYear()).toBe(2023);
    expect(tl.maxDate!.getFullYear()).toBe(2025);
  });

  // -- Zoom levels --

  it('groups by month at default zoom', () => {
    tl.loadFromCanvases([
      { id: 'c1', navDate: '2024-01-10T00:00:00Z' },
      { id: 'c2', navDate: '2024-01-20T00:00:00Z' },
      { id: 'c3', navDate: '2024-03-05T00:00:00Z' },
    ]);
    // Two items in Jan 2024, one in Mar 2024 => 2 groups
    expect(tl.groups).toHaveLength(2);
    expect(tl.groups[0].items).toHaveLength(2);
    expect(tl.groups[1].items).toHaveLength(1);
  });

  it('setZoomLevel to "year" regroups', () => {
    tl.loadFromCanvases([
      { id: 'c1', navDate: '2024-01-10T00:00:00Z' },
      { id: 'c2', navDate: '2024-06-20T00:00:00Z' },
      { id: 'c3', navDate: '2025-03-05T00:00:00Z' },
    ]);
    tl.setZoomLevel('year');
    expect(tl.zoomLevel).toBe('year');
    // Two items in 2024, one in 2025 => 2 groups
    expect(tl.groups).toHaveLength(2);
    expect(tl.groups[0].items).toHaveLength(2);
  });

  it('setZoomLevel to "day" regroups', () => {
    // Use non-UTC dates to avoid timezone boundary issues in local env
    tl.loadFromCanvases([
      { id: 'c1', navDate: '2024-01-10T12:00:00' },
      { id: 'c2', navDate: '2024-01-10T18:00:00' },
      { id: 'c3', navDate: '2024-01-11T12:00:00' },
    ]);
    tl.setZoomLevel('day');
    expect(tl.zoomLevel).toBe('day');
    // Two items on Jan 10, one on Jan 11 => 2 groups
    expect(tl.groups).toHaveLength(2);
    expect(tl.groups[0].items).toHaveLength(2);
  });

  it('setZoomLevel clears selectedDate', () => {
    tl.loadFromCanvases([
      { id: 'c1', navDate: '2024-01-10T00:00:00Z' },
    ]);
    tl.setSelectedDate('2024-01');
    expect(tl.selectedDate).toBe('2024-01');
    tl.setZoomLevel('year');
    expect(tl.selectedDate).toBeNull();
  });

  // -- Chronological grouping --

  it('groups are sorted chronologically', () => {
    // Use local dates (no Z suffix) to avoid timezone boundary shifts
    tl.loadFromCanvases([
      { id: 'c1', navDate: '2025-12-01T12:00:00' },
      { id: 'c2', navDate: '2023-01-15T12:00:00' },
      { id: 'c3', navDate: '2024-06-15T12:00:00' },
    ]);
    tl.setZoomLevel('year');
    expect(tl.groups[0].key).toBe('2023');
    expect(tl.groups[1].key).toBe('2024');
    expect(tl.groups[2].key).toBe('2025');
  });

  // -- Selection --

  it('setSelectedDate and toggleDate work', () => {
    tl.setSelectedDate('2024-01');
    expect(tl.selectedDate).toBe('2024-01');
    tl.toggleDate('2024-01');
    expect(tl.selectedDate).toBeNull();
    tl.toggleDate('2024-03');
    expect(tl.selectedDate).toBe('2024-03');
  });

  // -- Display utilities --

  it('getGridColumns returns different values per zoom', () => {
    expect(tl.getGridColumns()).toBe(4); // default: month
    tl.setZoomLevel('day');
    expect(tl.getGridColumns()).toBe(7);
    tl.setZoomLevel('year');
    expect(tl.getGridColumns()).toBe(3);
  });

  it('getTimelinePosition returns 0..1 normalized position', () => {
    tl.loadFromCanvases([
      { id: 'c1', navDate: '2024-01-01T00:00:00Z' },
      { id: 'c2', navDate: '2024-12-31T00:00:00Z' },
    ]);
    const pos = tl.getTimelinePosition(new Date('2024-07-01T00:00:00Z'));
    expect(pos).toBeGreaterThan(0.3);
    expect(pos).toBeLessThan(0.7);
  });

  it('getTimelinePosition returns 0.5 for single date', () => {
    tl.loadFromCanvases([
      { id: 'c1', navDate: '2024-06-15T00:00:00Z' },
    ]);
    const pos = tl.getTimelinePosition(new Date('2024-06-15T00:00:00Z'));
    expect(pos).toBe(0.5);
  });

  it('formatDisplayDate varies by zoom level', () => {
    // Use local date (no Z suffix) to avoid timezone-induced day shift
    const date = new Date(2024, 2, 15); // March 15, 2024 local
    expect(tl.formatDisplayDate(date)).toMatch(/March 2024/); // month
    tl.setZoomLevel('year');
    expect(tl.formatDisplayDate(date)).toBe('2024');
    tl.setZoomLevel('day');
    expect(tl.formatDisplayDate(date)).toMatch(/15 March 2024/);
  });

  it('formatTime returns HH:MM', () => {
    const d = new Date('2024-01-01T14:35:00Z');
    const result = tl.formatTime(d);
    // Note: may vary by timezone in test env, just check format
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('formatShortDate returns "D Mon YYYY"', () => {
    // Use local date (no Z suffix) to avoid timezone-induced day shift
    const d = new Date(2024, 2, 15); // March 15, 2024 local
    expect(tl.formatShortDate(d)).toMatch(/15 Mar 2024/);
  });
});

// ============================================================================
// 7. StructureTreeStore
// ============================================================================

import { StructureTreeStore } from '@/src/features/structure-view/stores/structureTree.svelte';

describe('StructureTreeStore', () => {
  let tree: StructureTreeStore;

  // Minimal vault-like state fixture
  function makeVaultState() {
    return {
      typeIndex: {
        'root': 'Collection',
        'manifest-1': 'Manifest',
        'canvas-1': 'Canvas',
        'canvas-2': 'Canvas',
        'range-1': 'Range',
      } as Record<string, string>,
      entities: {
        Collection: {
          'root': { id: 'root', label: { en: ['My Collection'] } },
        },
        Manifest: {
          'manifest-1': { id: 'manifest-1', label: { en: ['My Manifest'] } },
        },
        Canvas: {
          'canvas-1': { id: 'canvas-1', label: { en: ['Canvas One'] } },
          'canvas-2': { id: 'canvas-2', label: { en: ['Canvas Two'] } },
        },
        Range: {
          'range-1': { id: 'range-1', label: { en: ['Chapter 1'] } },
        },
      } as Record<string, Record<string, any>>,
      references: {
        'root': ['manifest-1'],
        'manifest-1': ['canvas-1', 'canvas-2', 'range-1'],
        'canvas-1': [],
        'canvas-2': [],
        'range-1': [],
      } as Record<string, string[]>,
    };
  }

  beforeEach(() => {
    tree = new StructureTreeStore();
  });

  // -- buildFromVault --

  it('builds tree from vault state', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    expect(tree.rootId).toBe('root');
    expect(tree.treeStats.totalNodes).toBe(5);
  });

  it('expands root node by default', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    expect(tree.expandedIds.has('root')).toBe(true);
  });

  it('extracts labels from IIIF label objects', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    const root = tree.findNode('root');
    expect(root?.label).toBe('My Collection');
  });

  it('falls back to entity id when no label', () => {
    const state = makeVaultState();
    delete (state.entities.Canvas['canvas-1'] as any).label;
    tree.buildFromVault(state, 'root');
    const node = tree.findNode('canvas-1');
    expect(node?.label).toBe('canvas-1');
  });

  // -- Flattened nodes --

  it('flattenedNodes returns only root when children collapsed', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    // Root is expanded, manifest-1 is not
    // Should see: root, manifest-1 (as child of root), but not canvases
    const flat = tree.flattenedNodes;
    const ids = flat.map(n => n.id);
    expect(ids).toContain('root');
    expect(ids).toContain('manifest-1');
    expect(ids).not.toContain('canvas-1');
  });

  it('expanding a node shows its children', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.toggleExpanded('manifest-1');
    const flat = tree.flattenedNodes;
    const ids = flat.map(n => n.id);
    expect(ids).toContain('canvas-1');
    expect(ids).toContain('canvas-2');
    expect(ids).toContain('range-1');
  });

  // -- Selection --

  it('selectNode single-select replaces selection', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.selectNode('canvas-1');
    expect(tree.selectedIds.has('canvas-1')).toBe(true);
    expect(tree.treeStats.selectedNodes).toBe(1);

    tree.selectNode('canvas-2');
    expect(tree.selectedIds.has('canvas-1')).toBe(false);
    expect(tree.selectedIds.has('canvas-2')).toBe(true);
  });

  it('selectNode additive toggles', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.selectNode('canvas-1');
    tree.selectNode('canvas-2', { additive: true });
    expect(tree.selectedIds.size).toBe(2);

    tree.selectNode('canvas-1', { additive: true });
    expect(tree.selectedIds.size).toBe(1);
    expect(tree.selectedIds.has('canvas-1')).toBe(false);
  });

  it('selectNode range selects contiguous range', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.toggleExpanded('manifest-1');
    tree.selectNode('canvas-1');
    tree.selectNode('range-1', { range: true });
    // canvas-1, canvas-2, range-1 are contiguous in flattened order
    expect(tree.selectedIds.size).toBe(3);
  });

  it('clearSelection empties the set', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.selectNode('canvas-1');
    tree.clearSelection();
    expect(tree.selectedIds.size).toBe(0);
  });

  it('selectNode ignores unknown IDs', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.selectNode('nonexistent');
    expect(tree.selectedIds.size).toBe(0);
  });

  // -- Expansion --

  it('toggleExpanded toggles the expansion state', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    expect(tree.expandedIds.has('root')).toBe(true);
    tree.toggleExpanded('root');
    expect(tree.expandedIds.has('root')).toBe(false);
    tree.toggleExpanded('root');
    expect(tree.expandedIds.has('root')).toBe(true);
  });

  it('expandAll expands all nodes with children', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.expandAll();
    expect(tree.expandedIds.has('root')).toBe(true);
    expect(tree.expandedIds.has('manifest-1')).toBe(true);
    // Leaf nodes should not be in expanded set
    expect(tree.expandedIds.has('canvas-1')).toBe(false);
  });

  it('collapseAll clears all expansions', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.expandAll();
    tree.collapseAll();
    expect(tree.expandedIds.size).toBe(0);
  });

  it('expandToNode expands all ancestors', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.collapseAll();
    tree.expandToNode('canvas-1');
    expect(tree.expandedIds.has('root')).toBe(true);
    expect(tree.expandedIds.has('manifest-1')).toBe(true);
  });

  // -- Filtering --

  it('setFilterQuery filters by label', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.toggleExpanded('manifest-1');
    tree.setFilterQuery('Canvas One');
    const filtered = tree.filteredNodes;
    const ids = filtered.map(n => n.id);
    expect(ids).toContain('canvas-1');
    expect(ids).not.toContain('canvas-2');
    // Ancestors should be preserved
    expect(ids).toContain('root');
    expect(ids).toContain('manifest-1');
  });

  it('matchCount returns number of matches', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.setFilterQuery('Canvas');
    expect(tree.matchCount).toBe(2);
  });

  it('empty filter returns all flattenedNodes', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.setFilterQuery('');
    expect(tree.visibleNodes).toEqual(tree.flattenedNodes);
  });

  // -- Navigation helpers --

  it('getNodePath returns path from root to node', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    const path = tree.getNodePath('canvas-1');
    expect(path.map(n => n.id)).toEqual(['root', 'manifest-1', 'canvas-1']);
  });

  it('getNodeChildren returns direct children', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    const children = tree.getNodeChildren('manifest-1');
    expect(children).toHaveLength(3);
    expect(children.map(c => c.id).sort()).toEqual(['canvas-1', 'canvas-2', 'range-1'].sort());
  });

  it('getNodeParent returns the parent', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    expect(tree.getNodeParent('canvas-1')?.id).toBe('manifest-1');
    expect(tree.getNodeParent('root')).toBeNull();
  });

  // -- Drag and Drop --

  it('canDrop prevents drop on self', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    expect(tree.canDrop('root', 'root')).toBe(false);
  });

  it('canDrop prevents drop on ancestor (cycle)', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    expect(tree.canDrop('manifest-1', 'root')).toBe(false);
  });

  it('canDrop prevents drop on current parent', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    expect(tree.canDrop('manifest-1', 'root')).toBe(false);
  });

  it('canDrop prevents drop on non-container type (Canvas)', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    expect(tree.canDrop('canvas-2', 'canvas-1')).toBe(false);
  });

  it('canDrop allows drop on valid container', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    // canvas-1 can be dropped onto range-1 (Range is a container type)
    expect(tree.canDrop('canvas-1', 'range-1')).toBe(true);
  });

  it('getValidDropTargets returns all valid targets', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    const targets = tree.getValidDropTargets('canvas-1');
    expect(targets).toContain('range-1');
    expect(targets).not.toContain('canvas-1');
    expect(targets).not.toContain('manifest-1'); // already its parent
  });

  it('startDrag / setDropTarget / endDrag manage drag state', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.startDrag('canvas-1');
    expect(tree.draggingId).toBe('canvas-1');

    tree.setDropTarget('range-1');
    expect(tree.dropTargetId).toBe('range-1');

    tree.endDrag();
    expect(tree.draggingId).toBeNull();
    expect(tree.dropTargetId).toBeNull();
  });

  // -- scrollToNode --

  it('scrollToNode expands ancestors and calls scroll callback', () => {
    tree.buildFromVault(makeVaultState(), 'root');
    tree.collapseAll();
    const scrollCb = vi.fn();
    tree.setScrollCallback(scrollCb);
    tree.scrollToNode('canvas-1');
    expect(tree.expandedIds.has('manifest-1')).toBe(true);
    expect(scrollCb).toHaveBeenCalledWith('canvas-1');
  });
});

// ============================================================================
// 8. IngestProgressStore
// ============================================================================

import { IngestProgressStore } from '@/src/shared/lib/hooks/ingestProgress.svelte';

describe('IngestProgressStore', () => {
  let ingest: IngestProgressStore;

  beforeEach(() => {
    ingest = new IngestProgressStore();
  });

  it('starts with no operations', () => {
    expect(ingest.operations).toEqual([]);
    expect(ingest.isActive).toBe(false);
    expect(ingest.log).toEqual([]);
  });

  // -- Operation tracking --

  it('startOperation creates a running operation', () => {
    ingest.startOperation('batch-1', 'Import folder', 42);
    expect(ingest.operations).toHaveLength(1);
    expect(ingest.operations[0].id).toBe('batch-1');
    expect(ingest.operations[0].status).toBe('running');
    expect(ingest.operations[0].filesTotal).toBe(42);
    expect(ingest.operations[0].progress).toBe(0);
    expect(ingest.isActive).toBe(true);
  });

  it('updateProgress updates file counts and progress', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.updateProgress('b1', 5);
    const op = ingest.operations[0];
    expect(op.filesCompleted).toBe(5);
    expect(op.progress).toBeCloseTo(0.5, 2);
  });

  it('updateProgress auto-completes when all files processed', () => {
    ingest.startOperation('b1', 'Import', 3);
    ingest.updateProgress('b1', 3);
    expect(ingest.operations[0].status).toBe('completed');
    expect(ingest.operations[0].progress).toBe(1);
  });

  it('updateProgress accounts for failed files in progress', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.updateProgress('b1', 5, 2);
    // processed = 5 + 2 = 7, progress = 7/10 = 0.7
    expect(ingest.operations[0].progress).toBeCloseTo(0.7, 2);
    expect(ingest.operations[0].filesFailed).toBe(2);
  });

  it('updateProgress ignores non-running operations', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.completeOperation('b1');
    ingest.updateProgress('b1', 5);
    expect(ingest.operations[0].status).toBe('completed');
  });

  // -- Operation lifecycle --

  it('completeOperation marks as completed', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.completeOperation('b1');
    expect(ingest.operations[0].status).toBe('completed');
    expect(ingest.operations[0].progress).toBe(1);
  });

  it('failOperation marks as failed with error', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.failOperation('b1', 'Network error');
    expect(ingest.operations[0].status).toBe('failed');
    expect(ingest.operations[0].error).toBe('Network error');
  });

  it('pauseOperation only pauses running operations', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.pauseOperation('b1');
    expect(ingest.operations[0].status).toBe('paused');

    // Pausing a paused op should not change status
    ingest.pauseOperation('b1');
    expect(ingest.operations[0].status).toBe('paused');
  });

  it('resumeOperation only resumes paused operations', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.pauseOperation('b1');
    ingest.resumeOperation('b1');
    expect(ingest.operations[0].status).toBe('running');

    // Resuming a running op does nothing
    ingest.resumeOperation('b1');
    expect(ingest.operations[0].status).toBe('running');
  });

  it('cancelOperation cancels active operations', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.cancelOperation('b1');
    expect(ingest.operations[0].status).toBe('cancelled');
  });

  it('cancelOperation ignores already-completed operations', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.completeOperation('b1');
    ingest.cancelOperation('b1');
    expect(ingest.operations[0].status).toBe('completed');
  });

  it('cancelAll cancels all active operations', () => {
    ingest.startOperation('b1', 'Import A', 10);
    ingest.startOperation('b2', 'Import B', 5);
    ingest.completeOperation('b2');
    ingest.cancelAll();
    expect(ingest.operations.find(o => o.id === 'b1')?.status).toBe('cancelled');
    expect(ingest.operations.find(o => o.id === 'b2')?.status).toBe('completed');
  });

  it('clearCompleted removes terminal operations', () => {
    ingest.startOperation('b1', 'Import A', 10);
    ingest.startOperation('b2', 'Import B', 5);
    ingest.startOperation('b3', 'Import C', 3);
    ingest.completeOperation('b1');
    ingest.failOperation('b3', 'err');
    ingest.clearCompleted();
    expect(ingest.operations).toHaveLength(1);
    expect(ingest.operations[0].id).toBe('b2');
  });

  // -- Aggregate progress --

  it('aggregate computes overall progress', () => {
    ingest.startOperation('b1', 'A', 10);
    ingest.startOperation('b2', 'B', 10);
    ingest.updateProgress('b1', 5);
    ingest.updateProgress('b2', 3);

    const agg = ingest.aggregate;
    expect(agg.totalOperations).toBe(2);
    expect(agg.totalFiles).toBe(20);
    expect(agg.completedFiles).toBe(8);
    expect(agg.overallProgress).toBeCloseTo(0.4, 2);
    expect(agg.isActive).toBe(true);
  });

  it('aggregate counts completedOperations', () => {
    ingest.startOperation('b1', 'A', 2);
    ingest.startOperation('b2', 'B', 2);
    ingest.completeOperation('b1');
    expect(ingest.aggregate.completedOperations).toBe(1);
  });

  it('aggregate isActive is false when no running ops', () => {
    ingest.startOperation('b1', 'A', 2);
    ingest.completeOperation('b1');
    expect(ingest.aggregate.isActive).toBe(false);
  });

  // -- Activity log --

  it('logs operations lifecycle events', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.pauseOperation('b1');
    ingest.resumeOperation('b1');
    ingest.completeOperation('b1');
    // Should have at least 4 log entries: start, pause, resume, complete
    expect(ingest.log.length).toBeGreaterThanOrEqual(4);
    expect(ingest.log[0].level).toBe('info');
    expect(ingest.log[0].message).toContain('Started');
  });

  it('failure logs at error level', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.failOperation('b1', 'Disk full');
    const failLog = ingest.log.find(e => e.level === 'error');
    expect(failLog).toBeDefined();
    expect(failLog!.message).toContain('Disk full');
  });

  it('cancellation logs at warn level', () => {
    ingest.startOperation('b1', 'Import', 10);
    ingest.cancelOperation('b1');
    const cancelLog = ingest.log.find(e => e.level === 'warn');
    expect(cancelLog).toBeDefined();
    expect(cancelLog!.message).toContain('Cancelled');
  });

  it('auto-complete with failures logs at warn level', () => {
    ingest.startOperation('b1', 'Import', 3);
    ingest.updateProgress('b1', 2, 1);
    const warnLog = ingest.log.find(e => e.level === 'warn' && e.message.includes('Completed'));
    expect(warnLog).toBeDefined();
  });
});

// ============================================================================
// 9. StagingStateStore
// ============================================================================

import { StagingStateStore, type ArchiveNode } from '@/src/shared/lib/hooks/stagingState.svelte';

describe('StagingStateStore', () => {
  let staging: StagingStateStore;

  const sampleNodes: ArchiveNode[] = [
    { id: 'f1', label: 'File One', type: 'file' },
    { id: 'f2', label: 'File Two', type: 'file' },
    { id: 'f3', label: 'File Three', type: 'file' },
    { id: 'dir1', label: 'Folder A', type: 'folder', children: ['f1'] },
  ];

  beforeEach(() => {
    staging = new StagingStateStore();
  });

  it('starts empty', () => {
    expect(staging.nodes).toEqual([]);
    expect(staging.hasSelection).toBe(false);
    expect(staging.layout).toBe('flat');
    expect(staging.rootCollectionId).toBeNull();
  });

  // -- setNodes --

  it('setNodes replaces all nodes and clears selection', () => {
    staging.setNodes(sampleNodes);
    expect(staging.nodes).toHaveLength(4);
    expect(staging.hasSelection).toBe(false);
  });

  // -- Selection modes --

  it('select single replaces previous selection', () => {
    staging.setNodes(sampleNodes);
    staging.select('f1');
    expect(staging.selectionCount).toBe(1);
    expect(staging.selectedIds.has('f1')).toBe(true);

    staging.select('f2');
    expect(staging.selectionCount).toBe(1);
    expect(staging.selectedIds.has('f1')).toBe(false);
    expect(staging.selectedIds.has('f2')).toBe(true);
  });

  it('toggleSelect adds and removes', () => {
    staging.setNodes(sampleNodes);
    staging.toggleSelect('f1');
    staging.toggleSelect('f2');
    expect(staging.selectionCount).toBe(2);

    staging.toggleSelect('f1');
    expect(staging.selectionCount).toBe(1);
    expect(staging.selectedIds.has('f1')).toBe(false);
  });

  it('selectAll selects every node', () => {
    staging.setNodes(sampleNodes);
    staging.selectAll();
    expect(staging.selectionCount).toBe(4);
  });

  it('clearSelection clears all', () => {
    staging.setNodes(sampleNodes);
    staging.selectAll();
    staging.clearSelection();
    expect(staging.selectionCount).toBe(0);
  });

  it('selectRange selects contiguous range', () => {
    staging.setNodes(sampleNodes);
    staging.selectRange('f1', 'f3');
    expect(staging.selectionCount).toBe(3);
    expect(staging.selectedIds.has('f1')).toBe(true);
    expect(staging.selectedIds.has('f2')).toBe(true);
    expect(staging.selectedIds.has('f3')).toBe(true);
  });

  it('selectRange with invalid ids does nothing', () => {
    staging.setNodes(sampleNodes);
    staging.selectRange('f1', 'nonexistent');
    expect(staging.selectionCount).toBe(0);
  });

  it('selectedNodes returns resolved ArchiveNode objects', () => {
    staging.setNodes(sampleNodes);
    staging.select('f1');
    expect(staging.selectedNodes).toHaveLength(1);
    expect(staging.selectedNodes[0].label).toBe('File One');
  });

  // -- Layout modes --

  it('setLayout changes the layout mode', () => {
    staging.setLayout('grouped');
    expect(staging.layout).toBe('grouped');
    staging.setLayout('tree');
    expect(staging.layout).toBe('tree');
  });

  // -- Tree operations --

  it('toggleExpanded toggles expansion', () => {
    staging.setNodes(sampleNodes);
    staging.toggleExpanded('dir1');
    expect(staging.expandedIds.has('dir1')).toBe(true);
    staging.toggleExpanded('dir1');
    expect(staging.expandedIds.has('dir1')).toBe(false);
  });

  it('expandAll expands folder and collection nodes', () => {
    staging.setNodes(sampleNodes);
    staging.expandAll();
    expect(staging.expandedIds.has('dir1')).toBe(true);
    expect(staging.expandedIds.has('f1')).toBe(false);
  });

  it('collapseAll clears all expansions', () => {
    staging.setNodes(sampleNodes);
    staging.expandAll();
    staging.collapseAll();
    expect(staging.expandedIds.size).toBe(0);
  });

  // -- Node CRUD --

  it('addNode adds or replaces a node', () => {
    staging.setNodes(sampleNodes);
    staging.addNode({ id: 'f4', label: 'File Four', type: 'file' });
    expect(staging.nodes).toHaveLength(5);

    staging.addNode({ id: 'f1', label: 'Updated File One', type: 'file' });
    expect(staging.nodes).toHaveLength(5);
    const updated = staging.nodes.find(n => n.id === 'f1');
    expect(updated?.label).toBe('Updated File One');
  });

  it('removeNode removes the node and cleans up', () => {
    staging.setNodes([
      { id: 'parent', label: 'Parent', type: 'folder', children: ['child1', 'child2'] },
      { id: 'child1', label: 'Child 1', type: 'file', parentId: 'parent' },
      { id: 'child2', label: 'Child 2', type: 'file', parentId: 'parent' },
    ]);
    staging.select('child1');
    staging.toggleExpanded('parent');

    staging.removeNode('child1');
    expect(staging.nodes.find(n => n.id === 'child1')).toBeUndefined();
    expect(staging.selectedIds.has('child1')).toBe(false);
    // Parent's children should no longer include child1
    const parent = staging.nodes.find(n => n.id === 'parent');
    expect(parent?.children).toEqual(['child2']);
  });

  it('removeNode recursively removes descendants', () => {
    staging.setNodes([
      { id: 'parent', label: 'P', type: 'folder', children: ['child'] },
      { id: 'child', label: 'C', type: 'folder', children: ['grandchild'] },
      { id: 'grandchild', label: 'GC', type: 'file', parentId: 'child' },
    ]);
    staging.removeNode('child');
    expect(staging.nodes.find(n => n.id === 'child')).toBeUndefined();
    expect(staging.nodes.find(n => n.id === 'grandchild')).toBeUndefined();
  });

  it('moveNode moves a node to a new parent', () => {
    staging.setNodes([
      { id: 'folderA', label: 'A', type: 'folder', children: ['f1'] },
      { id: 'folderB', label: 'B', type: 'folder', children: [] },
      { id: 'f1', label: 'File', type: 'file', parentId: 'folderA' },
    ]);
    staging.moveNode('f1', 'folderB');
    const f1 = staging.nodes.find(n => n.id === 'f1');
    expect(f1?.parentId).toBe('folderB');
    const folderA = staging.nodes.find(n => n.id === 'folderA');
    expect(folderA?.children).toEqual([]);
    const folderB = staging.nodes.find(n => n.id === 'folderB');
    expect(folderB?.children).toContain('f1');
  });

  // -- Collection CRUD --

  it('createCollection creates a collection node', () => {
    const id = staging.createCollection('My Collection');
    expect(typeof id).toBe('string');
    const coll = staging.nodes.find(n => n.id === id);
    expect(coll?.type).toBe('collection');
    expect(coll?.label).toBe('My Collection');
    expect(staging.expandedIds.has(id)).toBe(true);
  });

  it('createCollection sets rootCollectionId on first call', () => {
    const id = staging.createCollection('Root');
    expect(staging.rootCollectionId).toBe(id);

    const id2 = staging.createCollection('Second');
    expect(staging.rootCollectionId).toBe(id); // Still the first one
  });

  it('createCollection with parentId adds to parents children', () => {
    const parentId = staging.createCollection('Parent');
    const childId = staging.createCollection('Child', parentId);
    const parent = staging.nodes.find(n => n.id === parentId);
    expect(parent?.children).toContain(childId);
  });

  it('addToCollection moves nodes into a collection', () => {
    staging.setNodes(sampleNodes);
    const collId = staging.createCollection('Test Collection');
    staging.addToCollection(collId, ['f1', 'f2']);

    const f1 = staging.nodes.find(n => n.id === 'f1');
    expect(f1?.parentId).toBe(collId);
    const coll = staging.nodes.find(n => n.id === collId);
    expect(coll?.children).toContain('f1');
    expect(coll?.children).toContain('f2');
  });

  it('removeFromCollection unparents nodes', () => {
    staging.setNodes(sampleNodes);
    const collId = staging.createCollection('Test');
    staging.addToCollection(collId, ['f1', 'f2']);
    staging.removeFromCollection(collId, ['f1']);

    const f1 = staging.nodes.find(n => n.id === 'f1');
    expect(f1?.parentId).toBeUndefined();
    const coll = staging.nodes.find(n => n.id === collId);
    expect(coll?.children).not.toContain('f1');
    expect(coll?.children).toContain('f2');
  });

  // -- Grouping --

  it('getGroupedByBreadcrumb groups by parent path', () => {
    staging.setNodes([
      { id: 'root', label: 'Root', type: 'folder' },
      { id: 'child', label: 'Child', type: 'file', parentId: 'root' },
      { id: 'orphan', label: 'Orphan', type: 'file' },
    ]);
    const groups = staging.getGroupedByBreadcrumb();
    // 'child' has path 'Root', 'orphan' and 'root' have path '(root)'
    expect(groups.has('Root')).toBe(true);
    expect(groups.has('(root)')).toBe(true);
    expect(groups.get('Root')!.length).toBe(1);
  });
});

// ============================================================================
// 10. LayerHistoryStore
// ============================================================================

import {
  LayerHistoryStore,
  type PlacedResource,
  type LayerState,
} from '@/src/shared/lib/hooks/layerHistory.svelte';

describe('LayerHistoryStore', () => {
  let layers: LayerHistoryStore;

  const makeLayer = (id: string, overrides?: Partial<PlacedResource>): PlacedResource => ({
    id,
    annotationId: `anno-${id}`,
    sourceUrl: `http://example.com/${id}.jpg`,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    opacity: 1,
    ...overrides,
  });

  beforeEach(() => {
    layers = new LayerHistoryStore();
  });

  it('starts with empty layers', () => {
    expect(layers.layers).toEqual([]);
    expect(layers.canUndo).toBe(false);
    expect(layers.canRedo).toBe(false);
    expect(layers.present.canvasWidth).toBe(0);
    expect(layers.present.canvasHeight).toBe(0);
  });

  it('constructor accepts initial state', () => {
    const initial: LayerState = {
      layers: [makeLayer('img1')],
      canvasWidth: 800,
      canvasHeight: 600,
    };
    const store = new LayerHistoryStore(initial);
    expect(store.layers).toHaveLength(1);
    expect(store.present.canvasWidth).toBe(800);
  });

  // -- addLayer --

  it('addLayer appends a resource and enables undo', () => {
    layers.addLayer(makeLayer('img1'));
    expect(layers.layers).toHaveLength(1);
    expect(layers.canUndo).toBe(true);

    layers.addLayer(makeLayer('img2'));
    expect(layers.layers).toHaveLength(2);
  });

  // -- removeLayer --

  it('removeLayer removes a layer by id', () => {
    layers.addLayer(makeLayer('img1'));
    layers.addLayer(makeLayer('img2'));
    layers.removeLayer('img1');
    expect(layers.layers).toHaveLength(1);
    expect(layers.layers[0].id).toBe('img2');
  });

  // -- updateLayer --

  it('updateLayer modifies layer properties', () => {
    layers.addLayer(makeLayer('img1'));
    layers.updateLayer('img1', { opacity: 0.5, x: 42 });
    expect(layers.layers[0].opacity).toBe(0.5);
    expect(layers.layers[0].x).toBe(42);
    expect(layers.layers[0].id).toBe('img1'); // id should not change
  });

  it('updateLayer no-ops for unknown id', () => {
    layers.addLayer(makeLayer('img1'));
    layers.updateLayer('nonexistent', { opacity: 0 });
    expect(layers.layers).toHaveLength(1);
    expect(layers.canUndo).toBe(true); // from addLayer only
  });

  // -- reorderLayers --

  it('reorderLayers moves a layer to a new position', () => {
    layers.addLayer(makeLayer('a'));
    layers.addLayer(makeLayer('b'));
    layers.addLayer(makeLayer('c'));
    layers.reorderLayers(0, 2);
    expect(layers.layers.map(l => l.id)).toEqual(['b', 'c', 'a']);
  });

  it('reorderLayers no-ops for invalid indices', () => {
    layers.addLayer(makeLayer('a'));
    layers.addLayer(makeLayer('b'));
    layers.reorderLayers(-1, 0);
    layers.reorderLayers(0, 5);
    layers.reorderLayers(0, 0);
    expect(layers.layers.map(l => l.id)).toEqual(['a', 'b']);
  });

  // -- Undo / Redo --

  it('undo restores previous state', () => {
    layers.addLayer(makeLayer('img1'));
    layers.addLayer(makeLayer('img2'));
    expect(layers.layers).toHaveLength(2);

    layers.undo();
    expect(layers.layers).toHaveLength(1);
    expect(layers.canRedo).toBe(true);
  });

  it('redo restores the undone state', () => {
    layers.addLayer(makeLayer('img1'));
    layers.undo();
    expect(layers.layers).toHaveLength(0);

    layers.redo();
    expect(layers.layers).toHaveLength(1);
  });

  it('undo no-ops when history is empty', () => {
    layers.undo();
    expect(layers.layers).toEqual([]);
  });

  it('redo no-ops when future is empty', () => {
    layers.addLayer(makeLayer('img1'));
    layers.redo();
    expect(layers.layers).toHaveLength(1);
  });

  it('new mutation after undo clears redo stack', () => {
    layers.addLayer(makeLayer('img1'));
    layers.addLayer(makeLayer('img2'));
    layers.undo();
    expect(layers.canRedo).toBe(true);

    layers.addLayer(makeLayer('img3'));
    expect(layers.canRedo).toBe(false);
  });

  it('undo/redo preserves canvas dimensions', () => {
    const store = new LayerHistoryStore({
      layers: [],
      canvasWidth: 800,
      canvasHeight: 600,
    });
    store.addLayer(makeLayer('img1'));
    store.undo();
    expect(store.present.canvasWidth).toBe(800);
    expect(store.present.canvasHeight).toBe(600);
  });

  // -- loadFromCanvas --

  it('loadFromCanvas extracts painting annotations', () => {
    const state = {
      entities: {
        Collection: {},
        Manifest: {},
        Canvas: {
          'canvas-1': { id: 'canvas-1', type: 'Canvas', width: 1024, height: 768 },
        },
        Range: {},
        AnnotationPage: {
          'page-1': { id: 'page-1', type: 'AnnotationPage', items: [] },
        },
        Annotation: {
          'anno-1': {
            id: 'anno-1',
            type: 'Annotation',
            motivation: 'painting',
            body: {
              id: 'http://example.com/image.jpg',
              type: 'Image',
              format: 'image/jpeg',
              width: 800,
              height: 600,
            },
            target: 'canvas-1#xywh=10,20,800,600',
          },
        },
      },
      references: {
        'canvas-1': ['page-1'],
        'page-1': ['anno-1'],
      },
      reverseRefs: {},
      collectionMembers: {},
      memberOfCollections: {},
      rootId: null,
      typeIndex: {},
      extensions: {},
      trashedEntities: {},
    };

    layers.loadFromCanvas('canvas-1', state as any);
    expect(layers.layers).toHaveLength(1);
    expect(layers.layers[0].x).toBe(10);
    expect(layers.layers[0].y).toBe(20);
    expect(layers.layers[0].width).toBe(800);
    expect(layers.layers[0].height).toBe(600);
    expect(layers.present.canvasWidth).toBe(1024);
    expect(layers.present.canvasHeight).toBe(768);
    // loadFromCanvas should clear undo history
    expect(layers.canUndo).toBe(false);
  });

  it('loadFromCanvas skips non-painting annotations', () => {
    const state = {
      entities: {
        Collection: {},
        Manifest: {},
        Canvas: {
          'canvas-1': { id: 'canvas-1', type: 'Canvas', width: 100, height: 100 },
        },
        Range: {},
        AnnotationPage: {
          'page-1': { id: 'page-1', type: 'AnnotationPage', items: [] },
        },
        Annotation: {
          'anno-1': {
            id: 'anno-1',
            type: 'Annotation',
            motivation: 'commenting',
            body: { type: 'TextualBody', value: 'A comment', format: 'text/plain' },
            target: 'canvas-1',
          },
        },
      },
      references: {
        'canvas-1': ['page-1'],
        'page-1': ['anno-1'],
      },
      reverseRefs: {},
      collectionMembers: {},
      memberOfCollections: {},
      rootId: null,
      typeIndex: {},
      extensions: {},
      trashedEntities: {},
    };

    layers.loadFromCanvas('canvas-1', state as any);
    expect(layers.layers).toHaveLength(0);
  });

  // -- buildCanvas --

  it('buildCanvas produces IIIF annotation page structure', () => {
    const store = new LayerHistoryStore({
      layers: [
        makeLayer('img1', { x: 10, y: 20, width: 300, height: 200 }),
        makeLayer('img2', { x: 0, y: 0, width: 500, height: 400 }),
      ],
      canvasWidth: 1024,
      canvasHeight: 768,
    });

    const result = store.buildCanvas();
    expect(result.width).toBe(1024);
    expect(result.height).toBe(768);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe('AnnotationPage');
    expect(result.items[0].items).toHaveLength(2);

    const anno = result.items[0].items[0];
    expect(anno.motivation).toBe('painting');
    expect(anno.target).toBe('canvas#xywh=10,20,300,200');
  });
});
