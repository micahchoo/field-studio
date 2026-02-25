/**
 * ViewRegistry Store Tests
 *
 * Tests the Svelte 5 runes ViewRegistry store.
 * Validates provider registration, active view tracking,
 * selection delegation, and snapshot round-trips.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ViewId, ViewSnapshot, ViewFilters, ViewStateProvider } from '@/src/shared/types/viewProtocol';

// ═══════════════════════════════════════════════════════════════════════
// Helper: createMockProvider
// ═══════════════════════════════════════════════════════════════════════

/**
 * Creates a minimal ViewStateProvider implementation using closures.
 * Not a class — validates that the registry works with plain objects.
 */
function createMockProvider(
  viewId: ViewId,
  initialSelection: ReadonlySet<string> = new Set()
): ViewStateProvider {
  let selection: ReadonlySet<string> = initialSelection;
  let filters: Readonly<ViewFilters> = {};
  let version = 0;

  return {
    viewId,

    get selection(): ReadonlySet<string> {
      return selection;
    },

    setSelection(ids: ReadonlySet<string>): void {
      selection = ids;
    },

    get filters(): Readonly<ViewFilters> {
      return filters;
    },

    getSnapshot(): ViewSnapshot {
      version++;
      return {
        viewId,
        version,
        data: {
          selectedIds: [...selection],
          filters: { ...filters },
        },
      };
    },

    restoreSnapshot(snapshot: ViewSnapshot): void {
      if (snapshot.viewId !== viewId) {
        throw new Error(
          `Cannot restore snapshot for "${snapshot.viewId}" into "${viewId}" provider`
        );
      }
      const ids = snapshot.data.selectedIds;
      selection = new Set(Array.isArray(ids) ? (ids as string[]) : []);
      filters = (snapshot.data.filters ?? {}) as ViewFilters;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe('ViewRegistry', () => {
  // Import both the class and singleton
  let ViewRegistry: typeof import('@/src/shared/stores/viewRegistry.svelte').ViewRegistry;
  let viewRegistry: import('@/src/shared/stores/viewRegistry.svelte').ViewRegistry;
  let viewRegistrySingleton: typeof import('@/src/shared/stores/viewRegistry.svelte').viewRegistry;

  beforeEach(async () => {
    // Dynamic import to get the class constructor
    const mod = await import('@/src/shared/stores/viewRegistry.svelte');
    ViewRegistry = mod.ViewRegistry;
    viewRegistrySingleton = mod.viewRegistry;
    // Fresh instance per test — NOT the singleton
    viewRegistry = new ViewRegistry();
  });

  // ─────────────────────────────────────────────────────────────────────
  // 1. register / get
  // ─────────────────────────────────────────────────────────────────────

  describe('register / get', () => {
    it('registers and retrieves a provider', () => {
      const provider = createMockProvider('archive');
      viewRegistry.register(provider);
      expect(viewRegistry.get('archive')).toBe(provider);
    });

    it('returns undefined for unregistered viewId', () => {
      expect(viewRegistry.get('viewer')).toBeUndefined();
    });

    it('replaces provider on re-register with same viewId', () => {
      const first = createMockProvider('archive');
      const second = createMockProvider('archive');
      viewRegistry.register(first);
      viewRegistry.register(second);
      expect(viewRegistry.get('archive')).toBe(second);
      expect(viewRegistry.get('archive')).not.toBe(first);
    });

    it('handles multiple providers for different views', () => {
      const archive = createMockProvider('archive');
      const viewer = createMockProvider('viewer');
      const map = createMockProvider('map');
      viewRegistry.register(archive);
      viewRegistry.register(viewer);
      viewRegistry.register(map);
      expect(viewRegistry.get('archive')).toBe(archive);
      expect(viewRegistry.get('viewer')).toBe(viewer);
      expect(viewRegistry.get('map')).toBe(map);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 2. unregister
  // ─────────────────────────────────────────────────────────────────────

  describe('unregister', () => {
    it('removes a registered provider', () => {
      const provider = createMockProvider('viewer');
      viewRegistry.register(provider);
      expect(viewRegistry.get('viewer')).toBe(provider);

      viewRegistry.unregister('viewer');
      expect(viewRegistry.get('viewer')).toBeUndefined();
    });

    it('is a no-op for unregistered viewId', () => {
      // Should not throw
      viewRegistry.unregister('timeline');
      expect(viewRegistry.get('timeline')).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 3. registeredViewIds
  // ─────────────────────────────────────────────────────────────────────

  describe('registeredViewIds', () => {
    it('is empty initially', () => {
      expect(viewRegistry.registeredViewIds).toEqual([]);
    });

    it('returns all registered view IDs', () => {
      viewRegistry.register(createMockProvider('archive'));
      viewRegistry.register(createMockProvider('viewer'));
      viewRegistry.register(createMockProvider('boards'));

      const ids = viewRegistry.registeredViewIds;
      expect(ids).toHaveLength(3);
      expect(ids).toContain('archive');
      expect(ids).toContain('viewer');
      expect(ids).toContain('boards');
    });

    it('updates after unregister', () => {
      viewRegistry.register(createMockProvider('archive'));
      viewRegistry.register(createMockProvider('viewer'));
      expect(viewRegistry.registeredViewIds).toHaveLength(2);

      viewRegistry.unregister('archive');
      expect(viewRegistry.registeredViewIds).toHaveLength(1);
      expect(viewRegistry.registeredViewIds).toContain('viewer');
      expect(viewRegistry.registeredViewIds).not.toContain('archive');
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 4. activeViewId
  // ─────────────────────────────────────────────────────────────────────

  describe('activeViewId', () => {
    it('defaults to "archive"', () => {
      expect(viewRegistry.activeViewId).toBe('archive');
    });

    it('can be set via setActiveView', () => {
      viewRegistry.setActiveView('viewer');
      expect(viewRegistry.activeViewId).toBe('viewer');
    });

    it('tracks changes', () => {
      viewRegistry.setActiveView('boards');
      expect(viewRegistry.activeViewId).toBe('boards');

      viewRegistry.setActiveView('map');
      expect(viewRegistry.activeViewId).toBe('map');

      viewRegistry.setActiveView('timeline');
      expect(viewRegistry.activeViewId).toBe('timeline');
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 5. activeProvider
  // ─────────────────────────────────────────────────────────────────────

  describe('activeProvider', () => {
    it('returns the provider for the active view', () => {
      const archive = createMockProvider('archive');
      viewRegistry.register(archive);
      expect(viewRegistry.activeProvider).toBe(archive);
    });

    it('returns undefined if no provider is registered for active view', () => {
      expect(viewRegistry.activeProvider).toBeUndefined();
    });

    it('updates when active view changes', () => {
      const archive = createMockProvider('archive');
      const viewer = createMockProvider('viewer');
      viewRegistry.register(archive);
      viewRegistry.register(viewer);

      expect(viewRegistry.activeProvider).toBe(archive);

      viewRegistry.setActiveView('viewer');
      expect(viewRegistry.activeProvider).toBe(viewer);
    });

    it('returns undefined when switching to a view with no provider', () => {
      const archive = createMockProvider('archive');
      viewRegistry.register(archive);
      expect(viewRegistry.activeProvider).toBe(archive);

      viewRegistry.setActiveView('search');
      expect(viewRegistry.activeProvider).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 6. activeSelection
  // ─────────────────────────────────────────────────────────────────────

  describe('activeSelection', () => {
    it('returns an empty frozen set when no active provider', () => {
      const selection = viewRegistry.activeSelection;
      expect(selection.size).toBe(0);
      expect(Object.isFrozen(selection)).toBe(true);
    });

    it('returns the active provider selection', () => {
      const provider = createMockProvider('archive', new Set(['item-1', 'item-2']));
      viewRegistry.register(provider);

      const selection = viewRegistry.activeSelection;
      expect(selection.size).toBe(2);
      expect(selection.has('item-1')).toBe(true);
      expect(selection.has('item-2')).toBe(true);
    });

    it('reflects selection changes on the provider', () => {
      const provider = createMockProvider('archive');
      viewRegistry.register(provider);

      expect(viewRegistry.activeSelection.size).toBe(0);

      provider.setSelection(new Set(['new-item']));
      expect(viewRegistry.activeSelection.size).toBe(1);
      expect(viewRegistry.activeSelection.has('new-item')).toBe(true);
    });

    it('returns empty frozen set when switching away from provider', () => {
      const provider = createMockProvider('archive', new Set(['item-1']));
      viewRegistry.register(provider);
      expect(viewRegistry.activeSelection.size).toBe(1);

      viewRegistry.setActiveView('viewer'); // no provider registered
      const selection = viewRegistry.activeSelection;
      expect(selection.size).toBe(0);
      expect(Object.isFrozen(selection)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 7. Snapshot round-trip
  // ─────────────────────────────────────────────────────────────────────

  describe('Snapshot round-trip', () => {
    it('getSnapshot/restoreSnapshot works on a provider', () => {
      const provider = createMockProvider('archive', new Set(['a', 'b']));
      viewRegistry.register(provider);

      // Take snapshot
      const snapshot = provider.getSnapshot();
      expect(snapshot.viewId).toBe('archive');
      expect(snapshot.data.selectedIds).toEqual(['a', 'b']);

      // Modify state
      provider.setSelection(new Set(['c']));
      expect(provider.selection.size).toBe(1);

      // Restore snapshot
      provider.restoreSnapshot(snapshot);
      expect(provider.selection.size).toBe(2);
      expect(provider.selection.has('a')).toBe(true);
      expect(provider.selection.has('b')).toBe(true);
    });

    it('rejects restoring snapshot with mismatched viewId', () => {
      const provider = createMockProvider('archive');
      viewRegistry.register(provider);

      const badSnapshot: ViewSnapshot = {
        viewId: 'viewer',
        version: 1,
        data: {},
      };

      expect(() => provider.restoreSnapshot(badSnapshot)).toThrow(
        'Cannot restore snapshot for "viewer" into "archive" provider'
      );
    });

    it('state survives unregister then re-register if snapshot was taken', () => {
      const provider = createMockProvider('archive', new Set(['x', 'y']));
      viewRegistry.register(provider);

      // Take snapshot before unregister
      const snapshot = provider.getSnapshot();

      // Unregister — provider is gone from registry
      viewRegistry.unregister('archive');
      expect(viewRegistry.get('archive')).toBeUndefined();

      // Create a new provider and restore the snapshot
      const newProvider = createMockProvider('archive');
      newProvider.restoreSnapshot(snapshot);
      viewRegistry.register(newProvider);

      expect(viewRegistry.get('archive')).toBe(newProvider);
      expect(newProvider.selection.size).toBe(2);
      expect(newProvider.selection.has('x')).toBe(true);
      expect(newProvider.selection.has('y')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 8. Singleton export
  // ─────────────────────────────────────────────────────────────────────

  describe('Singleton export', () => {
    it('viewRegistry is an instance of ViewRegistry', () => {
      expect(viewRegistrySingleton).toBeInstanceOf(ViewRegistry);
    });
  });
});
