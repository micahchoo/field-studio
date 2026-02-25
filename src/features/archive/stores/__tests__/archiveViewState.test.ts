/**
 * ArchiveViewState Tests
 *
 * Tests for the archive view's ViewStateProvider implementation.
 * Covers: defaults, selection, view mode, filter/sort, activeItemId,
 * snapshot round-trip, ViewStateProvider.filters, and lifecycle.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ArchiveViewState } from '../archiveViewState.svelte';
import type { ViewSnapshot } from '@/src/shared/types/viewProtocol';

// ═══════════════════════════════════════════════════════════════════════
// 1. Basics — defaults
// ═══════════════════════════════════════════════════════════════════════

describe('ArchiveViewState — basics', () => {
  it('has viewId "archive"', () => {
    const state = new ArchiveViewState();
    expect(state.viewId).toBe('archive');
  });

  it('defaults to grid view mode', () => {
    const state = new ArchiveViewState();
    expect(state.viewMode).toBe('grid');
  });

  it('defaults to empty filter', () => {
    const state = new ArchiveViewState();
    expect(state.filter).toBe('');
  });

  it('defaults to name sort ascending', () => {
    const state = new ArchiveViewState();
    expect(state.sortBy).toBe('name');
    expect(state.sortDirection).toBe('asc');
  });

  it('defaults to no grouping', () => {
    const state = new ArchiveViewState();
    expect(state.groupByManifest).toBe(false);
  });

  it('defaults to empty selection', () => {
    const state = new ArchiveViewState();
    expect(state.selection.size).toBe(0);
  });

  it('defaults to null activeItemId', () => {
    const state = new ArchiveViewState();
    expect(state.activeItemId).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Selection (ViewStateProvider)
// ═══════════════════════════════════════════════════════════════════════

describe('ArchiveViewState — selection', () => {
  let state: ArchiveViewState;

  beforeEach(() => {
    state = new ArchiveViewState();
  });

  it('setSelection replaces the entire selection', () => {
    state.setSelection(new Set(['a', 'b']));
    expect(state.selection.size).toBe(2);
    expect(state.selection.has('a')).toBe(true);
    expect(state.selection.has('b')).toBe(true);

    state.setSelection(new Set(['c']));
    expect(state.selection.size).toBe(1);
    expect(state.selection.has('c')).toBe(true);
    expect(state.selection.has('a')).toBe(false);
  });

  it('setSelection with empty set clears selection', () => {
    state.setSelection(new Set(['a', 'b']));
    expect(state.selection.size).toBe(2);

    state.setSelection(new Set());
    expect(state.selection.size).toBe(0);
  });

  it('toggleSelection adds an unselected id', () => {
    state.toggleSelection('x');
    expect(state.selection.has('x')).toBe(true);
    expect(state.selection.size).toBe(1);
  });

  it('toggleSelection removes an already-selected id', () => {
    state.setSelection(new Set(['x', 'y']));
    state.toggleSelection('x');
    expect(state.selection.has('x')).toBe(false);
    expect(state.selection.has('y')).toBe(true);
    expect(state.selection.size).toBe(1);
  });

  it('clearSelection empties the selection', () => {
    state.setSelection(new Set(['a', 'b', 'c']));
    state.clearSelection();
    expect(state.selection.size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. View mode
// ═══════════════════════════════════════════════════════════════════════

describe('ArchiveViewState — view mode', () => {
  it('setViewMode changes the mode', () => {
    const state = new ArchiveViewState();
    expect(state.viewMode).toBe('grid');

    state.setViewMode('list');
    expect(state.viewMode).toBe('list');

    state.setViewMode('grouped');
    expect(state.viewMode).toBe('grouped');

    state.setViewMode('grid');
    expect(state.viewMode).toBe('grid');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Filter and sort
// ═══════════════════════════════════════════════════════════════════════

describe('ArchiveViewState — filter and sort', () => {
  let state: ArchiveViewState;

  beforeEach(() => {
    state = new ArchiveViewState();
  });

  it('setFilter updates the filter string', () => {
    state.setFilter('landscape');
    expect(state.filter).toBe('landscape');
  });

  it('setSortBy changes the sort field', () => {
    state.setSortBy('date');
    expect(state.sortBy).toBe('date');

    state.setSortBy('size');
    expect(state.sortBy).toBe('size');
  });

  it('setSortDirection sets the direction explicitly', () => {
    state.setSortDirection('desc');
    expect(state.sortDirection).toBe('desc');

    state.setSortDirection('asc');
    expect(state.sortDirection).toBe('asc');
  });

  it('toggleSortDirection flips asc to desc and vice versa', () => {
    expect(state.sortDirection).toBe('asc');

    state.toggleSortDirection();
    expect(state.sortDirection).toBe('desc');

    state.toggleSortDirection();
    expect(state.sortDirection).toBe('asc');
  });

  it('setGroupByManifest toggles grouping', () => {
    expect(state.groupByManifest).toBe(false);

    state.setGroupByManifest(true);
    expect(state.groupByManifest).toBe(true);

    state.setGroupByManifest(false);
    expect(state.groupByManifest).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. activeItemId
// ═══════════════════════════════════════════════════════════════════════

describe('ArchiveViewState — activeItemId', () => {
  it('setActiveItemId sets and clears the active item', () => {
    const state = new ArchiveViewState();
    expect(state.activeItemId).toBeNull();

    state.setActiveItemId('canvas-42');
    expect(state.activeItemId).toBe('canvas-42');

    state.setActiveItemId(null);
    expect(state.activeItemId).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Snapshot round-trip
// ═══════════════════════════════════════════════════════════════════════

describe('ArchiveViewState — snapshot round-trip', () => {
  it('getSnapshot captures all state', () => {
    const state = new ArchiveViewState();
    state.setViewMode('list');
    state.setFilter('test-filter');
    state.setSortBy('date');
    state.setSortDirection('desc');
    state.setGroupByManifest(true);
    state.setSelection(new Set(['id-1', 'id-2']));
    state.setActiveItemId('id-1');

    const snapshot = state.getSnapshot();
    expect(snapshot.viewId).toBe('archive');
    expect(snapshot.version).toBe(1);
    expect(snapshot.data.viewMode).toBe('list');
    expect(snapshot.data.filter).toBe('test-filter');
    expect(snapshot.data.sortBy).toBe('date');
    expect(snapshot.data.sortDirection).toBe('desc');
    expect(snapshot.data.groupByManifest).toBe(true);
    expect(snapshot.data.selectedIds).toEqual(expect.arrayContaining(['id-1', 'id-2']));
    expect((snapshot.data.selectedIds as string[]).length).toBe(2);
    expect(snapshot.data.activeItemId).toBe('id-1');
  });

  it('restoreSnapshot restores all state', () => {
    const state = new ArchiveViewState();
    const snapshot: ViewSnapshot = {
      viewId: 'archive',
      version: 1,
      data: {
        viewMode: 'grouped',
        filter: 'restored-filter',
        sortBy: 'size',
        sortDirection: 'desc',
        groupByManifest: true,
        selectedIds: ['r-1', 'r-2', 'r-3'],
        activeItemId: 'r-2',
      },
    };

    state.restoreSnapshot(snapshot);
    expect(state.viewMode).toBe('grouped');
    expect(state.filter).toBe('restored-filter');
    expect(state.sortBy).toBe('size');
    expect(state.sortDirection).toBe('desc');
    expect(state.groupByManifest).toBe(true);
    expect(state.selection.size).toBe(3);
    expect(state.selection.has('r-1')).toBe(true);
    expect(state.selection.has('r-2')).toBe(true);
    expect(state.selection.has('r-3')).toBe(true);
    expect(state.activeItemId).toBe('r-2');
  });

  it('fresh instance round-trip preserves state', () => {
    const original = new ArchiveViewState();
    original.setViewMode('list');
    original.setFilter('round-trip');
    original.setSortBy('size');
    original.setSortDirection('desc');
    original.setGroupByManifest(true);
    original.setSelection(new Set(['a', 'b']));
    original.setActiveItemId('a');

    const snapshot = original.getSnapshot();

    const restored = new ArchiveViewState();
    restored.restoreSnapshot(snapshot);

    expect(restored.viewMode).toBe('list');
    expect(restored.filter).toBe('round-trip');
    expect(restored.sortBy).toBe('size');
    expect(restored.sortDirection).toBe('desc');
    expect(restored.groupByManifest).toBe(true);
    expect(restored.selection).toEqual(new Set(['a', 'b']));
    expect(restored.activeItemId).toBe('a');
  });

  it('throws on wrong viewId', () => {
    const state = new ArchiveViewState();
    const badSnapshot: ViewSnapshot = {
      viewId: 'viewer',
      version: 1,
      data: {},
    };

    expect(() => state.restoreSnapshot(badSnapshot)).toThrow(
      'Cannot restore snapshot for "viewer" into "archive" provider'
    );
  });

  it('handles partial data gracefully (missing fields use defaults)', () => {
    const state = new ArchiveViewState();
    // First, set to non-default state
    state.setViewMode('list');
    state.setFilter('something');
    state.setSortBy('date');
    state.setSortDirection('desc');
    state.setGroupByManifest(true);
    state.setSelection(new Set(['x']));
    state.setActiveItemId('x');

    // Restore a snapshot with empty data
    const sparseSnapshot: ViewSnapshot = {
      viewId: 'archive',
      version: 1,
      data: {},
    };

    state.restoreSnapshot(sparseSnapshot);
    expect(state.viewMode).toBe('grid');
    expect(state.filter).toBe('');
    expect(state.sortBy).toBe('name');
    expect(state.sortDirection).toBe('asc');
    expect(state.groupByManifest).toBe(false);
    expect(state.selection.size).toBe(0);
    expect(state.activeItemId).toBeNull();
  });

  it('is forward-compatible with future version (does not throw)', () => {
    const state = new ArchiveViewState();
    const futureSnapshot: ViewSnapshot = {
      viewId: 'archive',
      version: 99,
      data: {
        viewMode: 'list',
        filter: 'future',
        sortBy: 'name',
        sortDirection: 'asc',
        groupByManifest: false,
        selectedIds: ['f-1'],
        activeItemId: 'f-1',
        // Future fields that don't exist yet
        newFeatureFlag: true,
        experimentalLayout: 'masonry',
      },
    };

    expect(() => state.restoreSnapshot(futureSnapshot)).not.toThrow();
    // Known fields should still be restored
    expect(state.viewMode).toBe('list');
    expect(state.filter).toBe('future');
    expect(state.selection.has('f-1')).toBe(true);
    expect(state.activeItemId).toBe('f-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Filters (ViewStateProvider)
// ═══════════════════════════════════════════════════════════════════════

describe('ArchiveViewState — ViewStateProvider.filters', () => {
  it('returns textFilter from filters getter', () => {
    const state = new ArchiveViewState();
    state.setFilter('hello');
    expect(state.filters.textFilter).toBe('hello');
  });

  it('returns sortBy from filters getter', () => {
    const state = new ArchiveViewState();
    state.setSortBy('date');
    expect(state.filters.sortBy).toBe('date');
  });

  it('returns sortDirection from filters getter', () => {
    const state = new ArchiveViewState();
    state.setSortDirection('desc');
    expect(state.filters.sortDirection).toBe('desc');
  });

  it('returns groupByManifest from filters getter', () => {
    const state = new ArchiveViewState();
    state.setGroupByManifest(true);
    expect(state.filters.groupByManifest).toBe(true);
  });

  it('reflects all filter state combined', () => {
    const state = new ArchiveViewState();
    state.setFilter('photo');
    state.setSortBy('size');
    state.setSortDirection('desc');
    state.setGroupByManifest(true);

    const filters = state.filters;
    expect(filters).toEqual({
      textFilter: 'photo',
      sortBy: 'size',
      sortDirection: 'desc',
      groupByManifest: true,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. Lifecycle
// ═══════════════════════════════════════════════════════════════════════

describe('ArchiveViewState — lifecycle', () => {
  it('state persists on same instance (simulated mount/unmount/remount)', () => {
    const state = new ArchiveViewState();

    // "Mount" — set some state
    state.setViewMode('list');
    state.setFilter('persist-test');
    state.setSelection(new Set(['p-1']));

    // "Unmount" — just stop using (no destroy needed)
    // "Remount" — use the same instance
    expect(state.viewMode).toBe('list');
    expect(state.filter).toBe('persist-test');
    expect(state.selection.has('p-1')).toBe(true);
  });

  it('getSnapshot returns non-trivial data (stub check)', () => {
    const state = new ArchiveViewState();
    state.setViewMode('grouped');
    state.setFilter('non-trivial');
    state.setSortBy('date');
    state.setSelection(new Set(['s-1', 's-2']));

    const snapshot = state.getSnapshot();

    // Should have meaningful content, not just empty/default
    expect(Object.keys(snapshot.data).length).toBeGreaterThanOrEqual(5);
    expect(snapshot.data.viewMode).toBe('grouped');
    expect(snapshot.data.filter).toBe('non-trivial');
    expect((snapshot.data.selectedIds as string[]).length).toBe(2);
  });
});
