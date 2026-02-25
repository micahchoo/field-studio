/**
 * ViewStateProvider Protocol Types Tests
 *
 * Tests the ViewBus protocol types defined in Phase 0.1 (ROADMAP.md S0.1).
 * Validates type shapes, the appModeToViewId mapping function,
 * and a mock implementation of ViewStateProvider.
 */

import { describe, it, expect } from 'vitest';
import type { ViewId, ViewSnapshot, ViewFilters, ViewStateProvider } from '../viewProtocol';
import { appModeToViewId } from '../viewProtocol';
import type { AppMode } from '@/src/shared/stores/appMode.svelte';

// ═══════════════════════════════════════════════════════════════════════
// 1. ViewId
// ═══════════════════════════════════════════════════════════════════════

describe('ViewId', () => {
  it('accepts all 7 valid view names', () => {
    const validIds: ViewId[] = [
      'archive',
      'viewer',
      'boards',
      'search',
      'map',
      'timeline',
      'metadata',
    ];
    expect(validIds).toHaveLength(7);
    // Each should be assignable without error
    for (const id of validIds) {
      const assigned: ViewId = id;
      expect(assigned).toBe(id);
    }
  });

  it('rejects invalid strings at compile time', () => {
    // @ts-expect-error 'invalid' is not assignable to ViewId
    const bad: ViewId = 'invalid';
    // Runtime: the variable exists but the type system rejects it
    expect(bad).toBe('invalid');
  });

  it('rejects deprecated AppMode values at compile time', () => {
    // @ts-expect-error 'collections' is not assignable to ViewId
    const collections: ViewId = 'collections';
    expect(collections).toBe('collections');

    // @ts-expect-error 'structure' is not assignable to ViewId
    const structure: ViewId = 'structure';
    expect(structure).toBe('structure');

    // @ts-expect-error 'trash' is not assignable to ViewId
    const trash: ViewId = 'trash';
    expect(trash).toBe('trash');

    // @ts-expect-error 'admin-deps' is not assignable to ViewId
    const adminDeps: ViewId = 'admin-deps';
    expect(adminDeps).toBe('admin-deps');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. ViewSnapshot
// ═══════════════════════════════════════════════════════════════════════

describe('ViewSnapshot', () => {
  it('requires viewId, version, and data', () => {
    const snapshot: ViewSnapshot = {
      viewId: 'archive',
      version: 1,
      data: { selectedIds: ['a', 'b'] },
    };
    expect(snapshot.viewId).toBe('archive');
    expect(snapshot.version).toBe(1);
    expect(snapshot.data).toEqual({ selectedIds: ['a', 'b'] });
  });

  it('data accepts arbitrary keys with unknown values', () => {
    const snapshot: ViewSnapshot = {
      viewId: 'viewer',
      version: 2,
      data: {
        zoom: 1.5,
        rotation: 90,
        nested: { foo: [1, 2, 3] },
        flag: true,
      },
    };
    expect(Object.keys(snapshot.data)).toHaveLength(4);
  });

  it('has readonly properties', () => {
    const snapshot: ViewSnapshot = {
      viewId: 'map',
      version: 1,
      data: {},
    };
    // Readonly at compile time - these should error
    // @ts-expect-error Cannot assign to 'viewId' because it is a read-only property
    snapshot.viewId = 'boards';
    // @ts-expect-error Cannot assign to 'version' because it is a read-only property
    snapshot.version = 2;
    // @ts-expect-error Cannot assign to 'data' because it is a read-only property
    snapshot.data = {};
    // Runtime: the assignments work in JS, but TS catches them
    expect(snapshot).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. ViewFilters
// ═══════════════════════════════════════════════════════════════════════

describe('ViewFilters', () => {
  it('accepts Record<string, unknown>', () => {
    const filters: ViewFilters = {
      type: 'Manifest',
      hasAnnotations: true,
      dateRange: { start: '2024-01-01', end: '2024-12-31' },
    };
    expect(filters.type).toBe('Manifest');
    expect(filters.hasAnnotations).toBe(true);
  });

  it('accepts empty object', () => {
    const filters: ViewFilters = {};
    expect(Object.keys(filters)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. ViewStateProvider — mock implementation
// ═══════════════════════════════════════════════════════════════════════

describe('ViewStateProvider', () => {
  /** Non-trivial mock that validates snapshot viewId on restore */
  class MockViewState implements ViewStateProvider {
    readonly viewId: ViewId = 'archive';
    #selection: ReadonlySet<string> = new Set();
    #filters: Readonly<ViewFilters> = {};
    #version = 0;

    get selection(): ReadonlySet<string> {
      return this.#selection;
    }

    setSelection(ids: ReadonlySet<string>): void {
      this.#selection = ids;
    }

    get filters(): Readonly<ViewFilters> {
      return this.#filters;
    }

    getSnapshot(): ViewSnapshot {
      this.#version++;
      return {
        viewId: this.viewId,
        version: this.#version,
        data: {
          selectedIds: [...this.#selection],
          filters: { ...this.#filters },
        },
      };
    }

    restoreSnapshot(snapshot: ViewSnapshot): void {
      if (snapshot.viewId !== this.viewId) {
        throw new Error(
          `Cannot restore snapshot for "${snapshot.viewId}" into "${this.viewId}" provider`
        );
      }
      const ids = snapshot.data.selectedIds;
      this.#selection = new Set(Array.isArray(ids) ? (ids as string[]) : []);
      this.#filters = (snapshot.data.filters ?? {}) as ViewFilters;
    }
  }

  it('can be implemented by a concrete class', () => {
    const state: ViewStateProvider = new MockViewState();
    expect(state.viewId).toBe('archive');
  });

  it('manages selection as ReadonlySet<string>', () => {
    const state = new MockViewState();
    expect(state.selection.size).toBe(0);

    state.setSelection(new Set(['canvas-1', 'canvas-2']));
    expect(state.selection.size).toBe(2);
    expect(state.selection.has('canvas-1')).toBe(true);
    expect(state.selection.has('canvas-2')).toBe(true);
  });

  it('provides readonly filters', () => {
    const state = new MockViewState();
    expect(state.filters).toEqual({});
  });

  it('produces a snapshot with incremented version', () => {
    const state = new MockViewState();
    state.setSelection(new Set(['item-a']));

    const snap1 = state.getSnapshot();
    expect(snap1.viewId).toBe('archive');
    expect(snap1.version).toBe(1);
    expect(snap1.data.selectedIds).toEqual(['item-a']);

    const snap2 = state.getSnapshot();
    expect(snap2.version).toBe(2);
  });

  it('restores from a valid snapshot', () => {
    const state = new MockViewState();
    const snapshot: ViewSnapshot = {
      viewId: 'archive',
      version: 5,
      data: {
        selectedIds: ['restored-1', 'restored-2'],
        filters: { type: 'Canvas' },
      },
    };

    state.restoreSnapshot(snapshot);
    expect(state.selection.size).toBe(2);
    expect(state.selection.has('restored-1')).toBe(true);
    expect(state.selection.has('restored-2')).toBe(true);
  });

  // Adversarial test
  it('throws when restoring a snapshot with wrong viewId', () => {
    const state = new MockViewState();
    const badSnapshot: ViewSnapshot = {
      viewId: 'viewer', // Wrong: MockViewState.viewId is 'archive'
      version: 1,
      data: {},
    };

    expect(() => state.restoreSnapshot(badSnapshot)).toThrow(
      'Cannot restore snapshot for "viewer" into "archive" provider'
    );
  });

  it('handles restoring snapshot with missing optional data gracefully', () => {
    const state = new MockViewState();
    const snapshot: ViewSnapshot = {
      viewId: 'archive',
      version: 1,
      data: {}, // No selectedIds, no filters
    };

    state.restoreSnapshot(snapshot);
    expect(state.selection.size).toBe(0);
    expect(state.filters).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. appModeToViewId
// ═══════════════════════════════════════════════════════════════════════

describe('appModeToViewId', () => {
  it('maps all 7 valid modes to their ViewId', () => {
    const mappings: Array<[AppMode, ViewId]> = [
      ['archive', 'archive'],
      ['viewer', 'viewer'],
      ['boards', 'boards'],
      ['search', 'search'],
      ['map', 'map'],
      ['timeline', 'timeline'],
      ['metadata', 'metadata'],
    ];

    for (const [mode, expectedViewId] of mappings) {
      expect(appModeToViewId(mode)).toBe(expectedViewId);
    }
  });

  it('returns undefined for deprecated "collections" mode', () => {
    expect(appModeToViewId('collections')).toBeUndefined();
  });

  it('returns undefined for deprecated "structure" mode', () => {
    expect(appModeToViewId('structure')).toBeUndefined();
  });

  it('returns undefined for deprecated "trash" mode', () => {
    expect(appModeToViewId('trash')).toBeUndefined();
  });

  it('returns undefined for deprecated "admin-deps" mode', () => {
    expect(appModeToViewId('admin-deps')).toBeUndefined();
  });

  it('returns correct type (ViewId | undefined)', () => {
    const result: ViewId | undefined = appModeToViewId('archive');
    expect(result).toBeDefined();

    const undefinedResult: ViewId | undefined = appModeToViewId('trash');
    expect(undefinedResult).toBeUndefined();
  });
});
