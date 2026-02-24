/**
 * Edge cases and stress tests — built from the ground up.
 * Tests unusual inputs, boundary conditions, and combined operations.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { normalize, createEmptyState } from '../normalization';
import { denormalize } from '../denormalization';
import { updateEntity, addEntity, removeEntity } from '../updates';
import { moveEntityToTrash, restoreEntityFromTrash, emptyTrash } from '../trash';
import { moveEntity, reorderChildren } from '../movement';
import { addToCollection, removeFromCollection, getCollectionMembers } from '../collections';
import { getEntity, hasEntity, getChildIds, getParentId, getDescendants, getAncestors, getTotalEntityCount } from '../queries';
import { Vault } from '../vault';
import type { IIIFItem, IIIFManifest } from '@/src/shared/types';
import {
  resetIds,
  createMinimalManifest,
  createMinimalCollection,
  createManifest,
  createFullTree,
} from './fixtures';

beforeEach(() => resetIds());

// ============================================================================
// Empty / Minimal State
// ============================================================================

describe('empty state edge cases', () => {
  it('getEntity on empty state returns null', () => {
    const state = createEmptyState();
    expect(getEntity(state, 'anything')).toBeNull();
  });

  it('getDescendants on empty state returns empty', () => {
    const state = createEmptyState();
    expect(getDescendants(state, 'anything')).toEqual([]);
  });

  it('removeEntity on empty state is a no-op', () => {
    const state = createEmptyState();
    const result = removeEntity(state, 'nonexistent');
    expect(result).toBe(state);
  });

  it('moveEntity on empty state is a no-op', () => {
    const state = createEmptyState();
    const result = moveEntity(state, 'a', 'b');
    expect(result).toBe(state);
  });

  it('denormalize on empty state returns null', () => {
    const state = createEmptyState();
    expect(denormalize(state)).toBeNull();
  });

  it('emptyTrash on empty state returns 0 count', () => {
    const state = createEmptyState();
    const result = emptyTrash(state);
    expect(result.deletedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});

// ============================================================================
// Single Entity
// ============================================================================

describe('single entity manifest', () => {
  it('normalizes manifest with no canvases', () => {
    const manifest = createManifest({ canvasCount: 0 });
    const state = normalize(manifest);

    expect(state.rootId).toBe(manifest.id);
    expect(Object.keys(state.entities.Canvas)).toHaveLength(0);
    expect(getChildIds(state, manifest.id)).toEqual([]);
  });

  it('round-trips manifest with no canvases', () => {
    const manifest = createManifest({ canvasCount: 0 });
    const state = normalize(manifest);
    const result = denormalize(state) as IIIFManifest;

    expect(result.items).toHaveLength(0);
  });
});

// ============================================================================
// Large Trees
// ============================================================================

describe('large tree operations', () => {
  it('handles manifest with many canvases', () => {
    const manifest = createManifest({ canvasCount: 50 });
    const state = normalize(manifest);

    expect(Object.keys(state.entities.Canvas)).toHaveLength(50);
    expect(getChildIds(state, manifest.id)).toHaveLength(50);

    // Denormalization should work
    const result = denormalize(state) as IIIFManifest;
    expect(result.items).toHaveLength(50);
  });

  it('full tree descendants count is correct', () => {
    const tree = createFullTree();
    const state = normalize(tree);

    // Collection has no hierarchical children (uses collectionMembers)
    // But each manifest has canvases → pages → annotations
    const manifest1Id = tree.items[0].id;
    const descendants = getDescendants(state, manifest1Id);

    // 3 canvases + 6 annotation pages (3 painting + 3 supplementing) + 6 annotations = 15
    expect(descendants).toHaveLength(15);
  });
});

// ============================================================================
// Immutability
// ============================================================================

describe('immutability guarantees', () => {
  it('updateEntity returns new state object', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const newState = updateEntity(state, manifest.id, { label: { en: ['Updated'] } });

    expect(newState).not.toBe(state);
  });

  it('addEntity does not mutate original state', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const originalChildCount = getChildIds(state, manifest.id).length;

    addEntity(state, {
      id: 'new-canvas',
      type: 'Canvas',
      width: 100,
      height: 100,
      items: [],
    } as unknown as IIIFItem, manifest.id);

    // Original state should be unchanged
    expect(getChildIds(state, manifest.id)).toHaveLength(originalChildCount);
  });

  it('moveEntityToTrash does not mutate original state', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    moveEntityToTrash(state, canvasId);

    // Original state should still have the entity
    expect(hasEntity(state, canvasId)).toBe(true);
  });

  it('moveEntity does not mutate original state', () => {
    const manifest = createManifest({ canvasCount: 2 });
    const state = normalize(manifest);
    const canvas1 = manifest.items[0].id;
    const _canvas2 = manifest.items[1].id;

    // Add a second manifest to move to
    const manifest2 = createManifest({ canvasCount: 0 });
    const state2 = addEntity(state, manifest2 as IIIFItem, manifest.id);

    moveEntity(state2, canvas1, manifest2.id);

    // Original state2 should be unchanged
    expect(getChildIds(state2, manifest.id)).toContain(canvas1);
  });
});

// ============================================================================
// Sequential Operations
// ============================================================================

describe('sequential operation chains', () => {
  it('add → update → remove chain', () => {
    const manifest = createMinimalManifest();
    let state = normalize(manifest);

    // Add
    const newCanvas: IIIFItem = {
      id: 'https://example.org/canvas/chain',
      type: 'Canvas',
      width: 200,
      height: 200,
      items: [],
    } as unknown as IIIFItem;
    state = addEntity(state, newCanvas, manifest.id);
    expect(hasEntity(state, newCanvas.id)).toBe(true);

    // Update
    state = updateEntity(state, newCanvas.id, { label: { en: ['Chained Canvas'] } });
    expect(getEntity(state, newCanvas.id)!.label).toEqual({ en: ['Chained Canvas'] });

    // Remove (permanent)
    state = removeEntity(state, newCanvas.id, { permanent: true });
    expect(hasEntity(state, newCanvas.id)).toBe(false);
  });

  it('trash → empty → add new entity with same parent', () => {
    const manifest = createMinimalManifest();
    let state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    // Trash
    state = moveEntityToTrash(state, canvasId);
    expect(hasEntity(state, canvasId)).toBe(false);

    // Empty trash
    const { state: emptied } = emptyTrash(state);
    state = emptied;

    // Add new canvas to same parent
    const newCanvas: IIIFItem = {
      id: 'https://example.org/canvas/replacement',
      type: 'Canvas',
      width: 300,
      height: 300,
      items: [],
    } as unknown as IIIFItem;
    state = addEntity(state, newCanvas, manifest.id);

    expect(hasEntity(state, newCanvas.id)).toBe(true);
    expect(getParentId(state, newCanvas.id)).toBe(manifest.id);
  });

  it('multiple trash and restore cycles', () => {
    const manifest = createMinimalManifest();
    let state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    for (let i = 0; i < 5; i++) {
      state = moveEntityToTrash(state, canvasId);
      expect(hasEntity(state, canvasId)).toBe(false);

      state = restoreEntityFromTrash(state, canvasId);
      expect(hasEntity(state, canvasId)).toBe(true);
    }

    // Should still be properly connected
    expect(getParentId(state, canvasId)).toBe(manifest.id);
    expect(getChildIds(state, manifest.id)).toContain(canvasId);
  });
});

// ============================================================================
// Concurrent-like Operations
// ============================================================================

describe('operations on different parts of the tree', () => {
  it('can update different entities sequentially from same base state', () => {
    const tree = createFullTree();
    let state = normalize(tree);

    const manifest1 = tree.items[0] as IIIFManifest;
    const manifest2 = tree.items[1] as IIIFManifest;

    state = updateEntity(state, manifest1.id, { label: { en: ['Manifest A'] } });
    state = updateEntity(state, manifest2.id, { label: { en: ['Manifest B'] } });

    expect(getEntity(state, manifest1.id)!.label).toEqual({ en: ['Manifest A'] });
    expect(getEntity(state, manifest2.id)!.label).toEqual({ en: ['Manifest B'] });
  });
});

// ============================================================================
// Vault Class Edge Cases
// ============================================================================

describe('Vault class edge cases', () => {
  it('handles rapid sequential updates', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);

    for (let i = 0; i < 100; i++) {
      vault.update(manifest.id, { label: { en: [`Update ${i}`] } });
    }

    expect(vault.get(manifest.id)!.label).toEqual({ en: ['Update 99'] });
  });

  it('export after trash reflects removal', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const canvasId = manifest.items[0].id;

    vault.moveToTrash(canvasId);
    const exported = vault.export() as IIIFManifest;

    expect(exported.items).toHaveLength(0);
  });

  it('snapshot before trash + restore after = original state', () => {
    const manifest = createMinimalManifest();
    const vault = new Vault(manifest);
    const canvasId = manifest.items[0].id;

    const snap = vault.snapshot();
    vault.moveToTrash(canvasId);
    vault.restore(snap);

    expect(vault.has(canvasId)).toBe(true);
    expect(vault.getChildren(manifest.id)).toContain(canvasId);
  });
});

// ============================================================================
// Collection Edge Cases
// ============================================================================

describe('collection edge cases', () => {
  it('removing all members from collection leaves empty members list', () => {
    const collection = createMinimalCollection();
    let state = normalize(collection);
    const manifest1Id = collection.items[0].id;
    const manifest2Id = collection.items[1].id;

    state = removeFromCollection(state, collection.id, manifest1Id);
    state = removeFromCollection(state, collection.id, manifest2Id);

    expect(getCollectionMembers(state, collection.id)).toHaveLength(0);
  });

  it('adding same manifest to multiple collections', () => {
    // Create two collections with different manifests
    const coll1 = createMinimalCollection();
    let state = normalize(coll1);

    // Create a second collection manually
    const coll2Id = 'https://example.org/collection/second';
    state = addEntity(state, {
      id: coll2Id,
      type: 'Collection',
      items: [],
    } as unknown as IIIFItem, coll1.id);
    state.typeIndex[coll2Id] = 'Collection';
    state.collectionMembers[coll2Id] = [];

    // Add manifest1 to coll2
    const manifest1Id = coll1.items[0].id;
    state = addToCollection(state, coll2Id, manifest1Id);

    // Manifest should be in both collections
    expect(state.memberOfCollections[manifest1Id]).toContain(coll1.id);
    expect(state.memberOfCollections[manifest1Id]).toContain(coll2Id);
  });
});

// ============================================================================
// Deep Ancestor/Descendant Chains
// ============================================================================

describe('deep hierarchy traversal', () => {
  it('getAncestors returns full chain for deeply nested entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    // Find the deepest entity (annotation)
    const annoIds = Object.keys(state.entities.Annotation);
    expect(annoIds.length).toBeGreaterThan(0);

    const ancestors = getAncestors(state, annoIds[0]);
    // annotation → page → canvas → manifest
    expect(ancestors).toHaveLength(3);
    expect(ancestors[ancestors.length - 1]).toBe(manifest.id);
  });

  it('getDescendants traverses through all levels', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const all = getDescendants(state, manifest.id);
    // canvas + annotationPage + annotation = 3
    expect(all).toHaveLength(3);
  });
});

// ============================================================================
// Reorder Edge Cases
// ============================================================================

describe('reorderChildren edge cases', () => {
  it('reorder with same order is a no-op (structurally)', () => {
    const manifest = createManifest({ canvasCount: 3 });
    const state = normalize(manifest);
    const order = getChildIds(state, manifest.id);

    const newState = reorderChildren(state, manifest.id, [...order]);
    expect(getChildIds(newState, manifest.id)).toEqual(order);
  });

  it('reorder to empty array removes all children from references', () => {
    const manifest = createManifest({ canvasCount: 2 });
    const state = normalize(manifest);

    const newState = reorderChildren(state, manifest.id, []);
    expect(getChildIds(newState, manifest.id)).toHaveLength(0);
  });
});

// ============================================================================
// State Consistency
// ============================================================================

describe('state consistency invariants', () => {
  it('every entity in typeIndex exists in its entity store', () => {
    const tree = createFullTree();
    const state = normalize(tree);

    for (const [id, type] of Object.entries(state.typeIndex)) {
      const store = state.entities[type] as Record<string, IIIFItem>;
      expect(store[id]).toBeDefined();
    }
  });

  it('every child has a reverse ref to its parent', () => {
    const tree = createFullTree();
    const state = normalize(tree);

    for (const [parentId, childIds] of Object.entries(state.references)) {
      for (const childId of childIds) {
        expect(state.reverseRefs[childId]).toBe(parentId);
      }
    }
  });

  it('collection membership is bidirectional', () => {
    const tree = createFullTree();
    const state = normalize(tree);

    for (const [collId, memberIds] of Object.entries(state.collectionMembers)) {
      for (const memberId of memberIds) {
        expect(state.memberOfCollections[memberId]).toContain(collId);
      }
    }

    for (const [memberId, collIds] of Object.entries(state.memberOfCollections)) {
      for (const collId of collIds) {
        expect(state.collectionMembers[collId]).toContain(memberId);
      }
    }
  });

  it('total entity count matches typeIndex size', () => {
    const tree = createFullTree();
    const state = normalize(tree);

    expect(getTotalEntityCount(state)).toBe(Object.keys(state.typeIndex).length);
  });
});
