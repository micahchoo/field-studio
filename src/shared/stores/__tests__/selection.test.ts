/**
 * SelectionStore — Unit Tests
 *
 * Tests the Svelte 5 runes-based reactive class store for shared multi-item
 * selection with modifier key support.
 *
 * Both the class (SelectionStore) and the global singleton (selection) are
 * tested. Each describe block creates a fresh instance via `new SelectionStore()`
 * to ensure complete test isolation.
 *
 * Source: src/shared/stores/selection.svelte.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SelectionStore, selection } from '@/src/shared/stores/selection.svelte';

// ============================================================================
// Constructor defaults
// ============================================================================

describe('SelectionStore — defaults', () => {
  let store: SelectionStore;

  beforeEach(() => {
    store = new SelectionStore();
  });

  it('ids is an empty Set by default', () => {
    expect(store.ids.size).toBe(0);
  });

  it('count is 0 by default', () => {
    expect(store.count).toBe(0);
  });

  it('isSelected returns false for any id when empty', () => {
    expect(store.isSelected('anything')).toBe(false);
  });
});

// ============================================================================
// select
// ============================================================================

describe('SelectionStore — select', () => {
  let store: SelectionStore;

  beforeEach(() => {
    store = new SelectionStore();
  });

  it('selects a single string id', () => {
    store.select('item-1');
    expect(store.isSelected('item-1')).toBe(true);
    expect(store.count).toBe(1);
  });

  it('selects multiple ids from an array', () => {
    store.select(['item-1', 'item-2', 'item-3']);
    expect(store.count).toBe(3);
    expect(store.isSelected('item-2')).toBe(true);
  });

  it('adds to existing selection without replacing it', () => {
    store.select('item-1');
    store.select('item-2');
    expect(store.count).toBe(2);
    expect(store.isSelected('item-1')).toBe(true);
  });

  it('does not duplicate an already-selected id', () => {
    store.select('item-1');
    store.select('item-1');
    expect(store.count).toBe(1);
  });

  it('selects an empty array without error', () => {
    store.select([]);
    expect(store.count).toBe(0);
  });
});

// ============================================================================
// set
// ============================================================================

describe('SelectionStore — set', () => {
  let store: SelectionStore;

  beforeEach(() => {
    store = new SelectionStore();
  });

  it('replaces selection with the provided ids', () => {
    store.select('old-1');
    store.select('old-2');
    store.set(['new-a', 'new-b']);
    expect(store.isSelected('old-1')).toBe(false);
    expect(store.isSelected('new-a')).toBe(true);
    expect(store.isSelected('new-b')).toBe(true);
    expect(store.count).toBe(2);
  });

  it('set with empty array clears all selection', () => {
    store.select('item-1');
    store.set([]);
    expect(store.count).toBe(0);
  });

  it('set with duplicate ids deduplicates via Set', () => {
    store.set(['a', 'a', 'b']);
    expect(store.count).toBe(2);
  });
});

// ============================================================================
// clear
// ============================================================================

describe('SelectionStore — clear', () => {
  let store: SelectionStore;

  beforeEach(() => {
    store = new SelectionStore();
  });

  it('removes all selected ids', () => {
    store.select(['a', 'b', 'c']);
    store.clear();
    expect(store.count).toBe(0);
  });

  it('isSelected returns false for all items after clear', () => {
    store.select(['x', 'y']);
    store.clear();
    expect(store.isSelected('x')).toBe(false);
    expect(store.isSelected('y')).toBe(false);
  });

  it('clear on an already empty store is safe', () => {
    expect(() => store.clear()).not.toThrow();
    expect(store.count).toBe(0);
  });
});

// ============================================================================
// isSelected
// ============================================================================

describe('SelectionStore — isSelected', () => {
  let store: SelectionStore;

  beforeEach(() => {
    store = new SelectionStore();
  });

  it('returns true for a selected id', () => {
    store.select('target');
    expect(store.isSelected('target')).toBe(true);
  });

  it('returns false for a non-selected id', () => {
    store.select('other');
    expect(store.isSelected('target')).toBe(false);
  });

  it('returns false after the id has been deselected via toggle', () => {
    store.select('target');
    store.toggle('target');
    expect(store.isSelected('target')).toBe(false);
  });
});

// ============================================================================
// toggle
// ============================================================================

describe('SelectionStore — toggle', () => {
  let store: SelectionStore;

  beforeEach(() => {
    store = new SelectionStore();
  });

  it('adds an unselected id', () => {
    store.toggle('item-1');
    expect(store.isSelected('item-1')).toBe(true);
    expect(store.count).toBe(1);
  });

  it('removes an already-selected id', () => {
    store.select('item-1');
    store.toggle('item-1');
    expect(store.isSelected('item-1')).toBe(false);
    expect(store.count).toBe(0);
  });

  it('toggling back and forth returns to original state', () => {
    store.toggle('x');
    store.toggle('x');
    expect(store.isSelected('x')).toBe(false);
  });

  it('does not affect other selected ids when toggling one', () => {
    store.select(['a', 'b', 'c']);
    store.toggle('b');
    expect(store.isSelected('a')).toBe(true);
    expect(store.isSelected('c')).toBe(true);
    expect(store.count).toBe(2);
  });
});

// ============================================================================
// selectWithModifier — plain click (no modifiers)
// ============================================================================

describe('SelectionStore — selectWithModifier plain click', () => {
  let store: SelectionStore;

  beforeEach(() => {
    store = new SelectionStore();
  });

  it('replaces existing selection with a single id', () => {
    store.select(['a', 'b', 'c']);
    store.selectWithModifier('d', { ctrlKey: false, shiftKey: false });
    expect(store.count).toBe(1);
    expect(store.isSelected('d')).toBe(true);
  });

  it('works on an empty selection', () => {
    store.selectWithModifier('x', { ctrlKey: false, shiftKey: false });
    expect(store.count).toBe(1);
    expect(store.isSelected('x')).toBe(true);
  });
});

// ============================================================================
// selectWithModifier — Ctrl/Cmd (ctrlKey: true)
// ============================================================================

describe('SelectionStore — selectWithModifier Ctrl', () => {
  let store: SelectionStore;

  beforeEach(() => {
    store = new SelectionStore();
  });

  it('adds an unselected item without clearing others', () => {
    store.select('a');
    store.selectWithModifier('b', { ctrlKey: true, shiftKey: false });
    expect(store.isSelected('a')).toBe(true);
    expect(store.isSelected('b')).toBe(true);
    expect(store.count).toBe(2);
  });

  it('removes an already-selected item (toggle behaviour)', () => {
    store.select(['a', 'b']);
    store.selectWithModifier('b', { ctrlKey: true, shiftKey: false });
    expect(store.isSelected('b')).toBe(false);
    expect(store.isSelected('a')).toBe(true);
  });
});

// ============================================================================
// selectWithModifier — Shift (range select)
// ============================================================================

describe('SelectionStore — selectWithModifier Shift range', () => {
  const ITEMS = [
    { id: 'item-0' },
    { id: 'item-1' },
    { id: 'item-2' },
    { id: 'item-3' },
    { id: 'item-4' },
  ];

  let store: SelectionStore;

  beforeEach(() => {
    store = new SelectionStore();
  });

  it('selects the range from last selected to current (forward direction)', () => {
    // First select item-1 as anchor
    store.selectWithModifier('item-1', { ctrlKey: false, shiftKey: false });
    // Shift-click item-4
    store.selectWithModifier('item-4', { ctrlKey: false, shiftKey: true }, ITEMS);
    expect(store.isSelected('item-1')).toBe(true);
    expect(store.isSelected('item-2')).toBe(true);
    expect(store.isSelected('item-3')).toBe(true);
    expect(store.isSelected('item-4')).toBe(true);
  });

  it('selects the range in reverse direction (from higher index to lower)', () => {
    store.selectWithModifier('item-4', { ctrlKey: false, shiftKey: false });
    store.selectWithModifier('item-1', { ctrlKey: false, shiftKey: true }, ITEMS);
    expect(store.isSelected('item-1')).toBe(true);
    expect(store.isSelected('item-2')).toBe(true);
    expect(store.isSelected('item-3')).toBe(true);
    expect(store.isSelected('item-4')).toBe(true);
  });

  it('falls back to single select when no items array provided', () => {
    store.select('item-0');
    store.selectWithModifier('item-3', { ctrlKey: false, shiftKey: true });
    // Without the items list, falls through to select(id)
    expect(store.isSelected('item-3')).toBe(true);
  });

  it('falls back to single select when no prior selection exists', () => {
    // No anchor established
    store.selectWithModifier('item-2', { ctrlKey: false, shiftKey: true }, ITEMS);
    expect(store.isSelected('item-2')).toBe(true);
    expect(store.count).toBe(1);
  });

  it('falls back to single select when anchor id not found in items', () => {
    // Anchor id exists in store but not in the items list
    store.select('unknown-anchor');
    store.selectWithModifier('item-2', { ctrlKey: false, shiftKey: true }, ITEMS);
    expect(store.isSelected('item-2')).toBe(true);
  });

  it('range-select merges range ids into the current selection Set', () => {
    // Ctrl-select item-0 first, then set item-1 as anchor
    store.selectWithModifier('item-0', { ctrlKey: true, shiftKey: false });
    // Now anchor is item-1 via plain click (replaces, but we then shift-click)
    store.selectWithModifier('item-1', { ctrlKey: false, shiftKey: false });
    // Shift-click item-3: should add item-1..item-3 to current store (which has item-1)
    store.selectWithModifier('item-3', { ctrlKey: false, shiftKey: true }, ITEMS);
    // All range ids should be present (item-1 through item-3)
    expect(store.isSelected('item-1')).toBe(true);
    expect(store.isSelected('item-2')).toBe(true);
    expect(store.isSelected('item-3')).toBe(true);
  });
});

// ============================================================================
// count derived
// ============================================================================

describe('SelectionStore — count', () => {
  let store: SelectionStore;

  beforeEach(() => {
    store = new SelectionStore();
  });

  it('is 0 initially', () => {
    expect(store.count).toBe(0);
  });

  it('increments with each unique select call', () => {
    store.select('a');
    expect(store.count).toBe(1);
    store.select('b');
    expect(store.count).toBe(2);
  });

  it('does not increase when selecting a duplicate', () => {
    store.select('a');
    store.select('a');
    expect(store.count).toBe(1);
  });

  it('decrements when a selected id is toggled off', () => {
    store.select(['x', 'y']);
    store.toggle('x');
    expect(store.count).toBe(1);
  });

  it('reaches 0 after clear', () => {
    store.select(['a', 'b', 'c']);
    store.clear();
    expect(store.count).toBe(0);
  });
});

// ============================================================================
// Global singleton
// ============================================================================

describe('selection singleton', () => {
  beforeEach(() => {
    selection.clear();
  });

  it('is an instance of SelectionStore', () => {
    expect(selection).toBeInstanceOf(SelectionStore);
  });

  it('starts empty after clear', () => {
    expect(selection.count).toBe(0);
  });

  it('select and isSelected work on the singleton', () => {
    selection.select('global-item');
    expect(selection.isSelected('global-item')).toBe(true);
    selection.clear();
  });
});
