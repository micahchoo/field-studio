/**
 * Vault Selectors Tests - User Workflow Tests
 *
 * Tests the vault selector hooks from a user workflow perspective.
 * Focuses on what users can do with entities, not internal implementation details.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  useBulkOperations,
  useCanvas,
  useEntity,
  useHistory,
  useManifest,
  useRoot,
  useVaultDispatch,
  useVaultState,
  VaultProvider,
} from '@/hooks/useIIIFEntity';
import { actions } from '@/services/actions';
import type { IIIFCanvas, IIIFCollection, IIIFManifest } from '@/types';

// Wrapper component using VaultProvider
const createWrapper = (initialRoot?: IIIFManifest | IIIFCollection) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <VaultProvider initialRoot={initialRoot || null}>
        {children}
      </VaultProvider>
    );
  };
};

// ============================================================================
// Test Fixtures - Realistic User Data
// ============================================================================

const createTestManifest = (id: string, label: string, canvasCount: number = 2): IIIFManifest => ({
  '@context': 'http://iiif.io/api/presentation/3/context.json',
  id: `https://example.com/manifest/${id}`,
  type: 'Manifest',
  label: { en: [label] },
  summary: { en: [`A test manifest with ${canvasCount} canvases`] },
  items: Array.from({ length: canvasCount }, (_, i) => ({
    id: `https://example.com/canvas/${id}-${i + 1}`,
    type: 'Canvas',
    label: { en: [`Page ${i + 1}`] },
    width: 2000,
    height: 3000,
    items: [],
  })),
});

const createTestCollection = (id: string, label: string): IIIFCollection => ({
  '@context': 'http://iiif.io/api/presentation/3/context.json',
  id: `https://example.com/collection/${id}`,
  type: 'Collection',
  label: { en: [label] },
  items: [],
});

// ============================================================================
// User Workflow: Entity Management
// ============================================================================

describe('User Workflow: Entity Management', () => {
  it('should allow user to view manifest details', () => {
    const manifest = createTestManifest('archival-001', 'Site A Excavation Photos');

    const { result } = renderHook(() => useManifest(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    // User can see manifest data
    expect(result.current.manifest).toBeDefined();
    expect(result.current.label?.get()).toBe('Site A Excavation Photos');
    expect(result.current.canvases).toHaveLength(2);
  });

  it('should allow user to view canvas details', () => {
    const manifest = createTestManifest('archival-001', 'Test');
    const canvasId = manifest.items[0].id;

    const { result } = renderHook(() => useCanvas(canvasId), {
      wrapper: createWrapper(manifest),
    });

    // User can see canvas data
    expect(result.current.canvas).toBeDefined();
    expect(result.current.label?.get()).toBe('Page 1');
    expect(result.current.dimensions).toEqual({ width: 2000, height: 3000 });
  });

  it('should return null for non-existent entity', () => {
    const manifest = createTestManifest('test', 'Test');

    const { result } = renderHook(() => useEntity('https://example.com/nonexistent'), {
      wrapper: createWrapper(manifest),
    });

    // User gets null for missing entity
    expect(result.current.entity).toBeNull();
  });
});

// ============================================================================
// User Workflow: Editing Operations
// ============================================================================

describe('User Workflow: Editing Operations', () => {
  it('should allow user to rename a manifest', () => {
    const manifest = createTestManifest('edit-test', 'Original Title');

    const { result } = renderHook(() => useManifest(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    // Verify initial label
    expect(result.current.label?.get()).toBe('Original Title');

    // User renames the manifest
    act(() => {
      const success = result.current.updateLabel({ en: ['Updated Title'] });
      expect(success).toBe(true);
    });

    // Label is updated
    expect(result.current.label?.get()).toBe('Updated Title');
  });

  it('should allow user to add a canvas to manifest', () => {
    const manifest = createTestManifest('add-test', 'Test');

    const { result } = renderHook(() => useManifest(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    const initialCount = result.current.canvases.length;

    // User adds a new canvas
    const newCanvas: IIIFCanvas = {
      id: `https://example.com/canvas/new-${Date.now()}`,
      type: 'Canvas',
      label: { en: ['New Photo'] },
      width: 1920,
      height: 1080,
      items: [],
    };

    act(() => {
      const success = result.current.addCanvas(newCanvas);
      expect(success).toBe(true);
    });

    // Canvas count increased
    expect(result.current.canvases.length).toBe(initialCount + 1);
    expect(result.current.canvases[initialCount].label?.en).toEqual(['New Photo']);
  });

  it('should allow user to remove a canvas', () => {
    const manifest = createTestManifest('remove-test', 'Test', 3);
    const canvasToRemove = manifest.items[1].id;

    const { result } = renderHook(() => useManifest(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    const initialCount = result.current.canvases.length;

    // User removes second canvas
    act(() => {
      const success = result.current.removeCanvas(canvasToRemove);
      expect(success).toBe(true);
    });

    // Canvas count decreased
    expect(result.current.canvases.length).toBe(initialCount - 1);
  });

  it('should allow user to reorder canvases', () => {
    const manifest = createTestManifest('reorder-test', 'Test', 3);
    const originalOrder = manifest.items.map(c => c.id);

    const { result } = renderHook(() => useManifest(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    // User reorders: reverse the order
    const reversedOrder = [...originalOrder].reverse();

    act(() => {
      const success = result.current.reorderCanvases(reversedOrder);
      expect(success).toBe(true);
    });

    // Order is reversed
    const newOrder = result.current.canvases.map(c => c.id);
    expect(newOrder).toEqual(reversedOrder);
  });

  it('should allow user to update canvas dimensions', () => {
    const manifest = createTestManifest('dims-test', 'Test');
    const canvasId = manifest.items[0].id;

    const { result } = renderHook(() => useCanvas(canvasId), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current.dimensions).toEqual({ width: 2000, height: 3000 });

    // User updates dimensions
    act(() => {
      const success = result.current.updateDimensions(4000, 6000);
      expect(success).toBe(true);
    });

    // Dimensions updated
    expect(result.current.dimensions).toEqual({ width: 4000, height: 6000 });
  });
});

// ============================================================================
// User Workflow: Undo/Redo
// ============================================================================

describe('User Workflow: Undo/Redo', () => {
  it('should track undo/redo availability', () => {
    const manifest = createTestManifest('undo-test', 'Test');

    const { result } = renderHook(() => useHistory(), {
      wrapper: createWrapper(manifest),
    });

    // Initially can't undo
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should allow undo after making changes', () => {
    const manifest = createTestManifest('undo-action-test', 'Original');

    const { result: historyResult } = renderHook(() => useHistory(), {
      wrapper: createWrapper(manifest),
    });

    const { result: manifestResult } = renderHook(() => useManifest(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    // Make a change
    act(() => {
      manifestResult.current.updateLabel({ en: ['Changed'] });
    });

    // Now can undo
    expect(historyResult.current.canUndo).toBe(true);
  });
});

// ============================================================================
// User Workflow: Bulk Operations
// ============================================================================

describe('User Workflow: Bulk Operations', () => {
  it('should allow batch updates to multiple entities', () => {
    const manifest = createTestManifest('batch-test', 'Test', 3);

    const { result } = renderHook(() => useBulkOperations(), {
      wrapper: createWrapper(manifest),
    });

    const canvasIds = manifest.items.map(c => c.id);

    // User batch updates all canvas labels
    act(() => {
      const updates = canvasIds.map((id, i) => ({
        id,
        changes: {
          label: { en: [`Photo ${i + 100}`] },
        },
      }));

      const success = result.current.batchUpdate(updates);
      expect(success).toBe(true);
    });

    // Verify updates were applied
    const { result: manifestResult } = renderHook(() => useManifest(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    expect(manifestResult.current.canvases[0].label?.en).toEqual(['Photo 100']);
    expect(manifestResult.current.canvases[1].label?.en).toEqual(['Photo 101']);
    expect(manifestResult.current.canvases[2].label?.en).toEqual(['Photo 102']);
  });

  it('should allow batch label updates', () => {
    const manifest = createTestManifest('batch-label-test', 'Test', 2);

    const { result } = renderHook(() => useBulkOperations(), {
      wrapper: createWrapper(manifest),
    });

    const canvasIds = manifest.items.map(c => c.id);

    // User updates multiple labels at once
    act(() => {
      const items = [
        { id: canvasIds[0], label: { en: ['First Image'] } },
        { id: canvasIds[1], label: { en: ['Second Image'] } },
      ];

      const success = result.current.updateMultipleLabels(items);
      expect(success).toBe(true);
    });

    // Verify labels updated
    const { result: manifestResult } = renderHook(() => useManifest(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    expect(manifestResult.current.canvases[0].label?.en).toEqual(['First Image']);
    expect(manifestResult.current.canvases[1].label?.en).toEqual(['Second Image']);
  });
});

// ============================================================================
// User Workflow: Root Management
// ============================================================================

describe('User Workflow: Root Management', () => {
  it('should allow user to view root manifest', () => {
    const manifest = createTestManifest('root-test', 'My Archive');

    const { result } = renderHook(() => useRoot(), {
      wrapper: createWrapper(manifest),
    });

    expect(result.current.root).toBeDefined();
    expect(result.current.rootType).toBe('Manifest');
    expect(result.current.rootId).toBe(manifest.id);
  });

  it('should allow user to load a new root', () => {
    const manifest1 = createTestManifest('first', 'First Manifest');

    const { result } = renderHook(() => useRoot(), {
      wrapper: createWrapper(manifest1),
    });

    expect(result.current.rootId).toBe(manifest1.id);

    // User loads a different manifest
    const manifest2 = createTestManifest('second', 'Second Manifest');

    act(() => {
      result.current.loadRoot(manifest2);
    });

    expect(result.current.rootId).toBe(manifest2.id);
  });

  it('should allow user to export current root', () => {
    const manifest = createTestManifest('export-test', 'Export Test');

    const { result } = renderHook(() => useRoot(), {
      wrapper: createWrapper(manifest),
    });

    const exported = result.current.exportRoot();

    expect(exported).toBeDefined();
    expect(exported?.id).toBe(manifest.id);
    expect(exported?.type).toBe('Manifest');
  });
});

// ============================================================================
// User Workflow: Entity Relationships
// ============================================================================

describe('User Workflow: Entity Relationships', () => {
  it('should allow user to view entity parent', () => {
    const manifest = createTestManifest('parent-test', 'Test');
    const canvasId = manifest.items[0].id;

    const { result } = renderHook(() => useEntity(canvasId), {
      wrapper: createWrapper(manifest),
    });

    // User can see the parent relationship
    expect(result.current.parentId).toBe(manifest.id);
  });

  it('should allow user to view entity children', () => {
    const manifest = createTestManifest('children-test', 'Test', 3);

    const { result } = renderHook(() => useEntity(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    // User can see child IDs
    expect(result.current.childIds).toHaveLength(3);
    expect(result.current.childIds).toContain(manifest.items[0].id);
  });

  it('should allow user to view entity type', () => {
    const manifest = createTestManifest('type-test', 'Test');

    const { result: manifestResult } = renderHook(() => useEntity(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    expect(manifestResult.current.type).toBe('Manifest');

    const { result: canvasResult } = renderHook(() => useEntity(manifest.items[0].id), {
      wrapper: createWrapper(manifest),
    });

    expect(canvasResult.current.type).toBe('Canvas');
  });
});

// ============================================================================
// Error Handling: User-Facing Behavior
// ============================================================================

describe('Error Handling: User-Facing Behavior', () => {
  it('should handle operations on non-existent manifest gracefully', () => {
    const manifest = createTestManifest('test', 'Test');

    const { result } = renderHook(() => useManifest('https://example.com/nonexistent'), {
      wrapper: createWrapper(manifest),
    });

    // Returns null manifest but doesn't crash
    expect(result.current.manifest).toBeNull();

    // Operations fail gracefully
    const updateResult = result.current.updateLabel({ en: ['New Label'] });
    expect(updateResult).toBe(false);
  });

  it('should handle operations on null canvas gracefully', () => {
    const manifest = createTestManifest('test', 'Test');

    const { result } = renderHook(() => useCanvas(null), {
      wrapper: createWrapper(manifest),
    });

    // Returns null canvas
    expect(result.current.canvas).toBeNull();

    // Operations fail gracefully
    const updateResult = result.current.updateDimensions(100, 100);
    expect(updateResult).toBe(false);
  });
});

// ============================================================================
// State Consistency: User Perspective
// ============================================================================

describe('State Consistency: User Perspective', () => {
  it('should maintain consistent state after multiple operations', () => {
    const manifest = createTestManifest('consistency-test', 'Test', 2);

    const { result } = renderHook(() => useManifest(manifest.id), {
      wrapper: createWrapper(manifest),
    });

    // User performs multiple operations
    act(() => {
      result.current.updateLabel({ en: ['First Change'] });
    });

    act(() => {
      result.current.updateLabel({ en: ['Second Change'] });
    });

    act(() => {
      result.current.updateLabel({ en: ['Final Change'] });
    });

    // State reflects final change
    expect(result.current.label?.get()).toBe('Final Change');
    // Canvases still accessible
    expect(result.current.canvases).toHaveLength(2);
  });

  it('should allow entity updates to propagate to all selectors', () => {
    const manifest = createTestManifest('propagation-test', 'Test');
    const canvasId = manifest.items[0].id;

    // Two hooks viewing same entity
    const { result: entityResult } = renderHook(() => useEntity(canvasId), {
      wrapper: createWrapper(manifest),
    });

    const { result: canvasResult } = renderHook(() => useCanvas(canvasId), {
      wrapper: createWrapper(manifest),
    });

    // Initial state matches
    expect(entityResult.current.entity?.id).toBe(canvasResult.current.canvas?.id);

    // Update through entity hook - update the label
    act(() => {
      entityResult.current.update({ label: { en: ['Updated via Entity'] } });
    });

    // Both hooks see updated state
    expect((entityResult.current.entity as IIIFCanvas)?.label?.en).toEqual(['Updated via Entity']);
    expect(canvasResult.current.label?.get()).toBe('Updated via Entity');
  });
});
