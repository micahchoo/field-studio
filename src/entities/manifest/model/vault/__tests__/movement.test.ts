import { describe, it, expect, beforeEach } from 'vitest';
import { normalize } from '../normalization';
import { moveEntity, reorderChildren, insertChildAt, removeChild } from '../movement';
import { addEntity } from '../updates';
import { getChildIds, getParentId } from '../queries';
import type { IIIFCanvas, IIIFItem } from '@/src/shared/types';
import { resetIds, createManifest } from './fixtures';

beforeEach(() => resetIds());

function setupTwoManifestState() {
  const manifest1 = createManifest({ canvasCount: 2 });
  const manifest2 = createManifest({ canvasCount: 1 });

  // Normalize manifest1 as root, then manually add manifest2 entities
  let state = normalize(manifest1);

  // Add manifest2 as a sibling (add to state but not to any parent for this test)
  state = addEntity(state, manifest2 as IIIFItem, manifest1.id);
  // Add manifest2's canvases
  for (const canvas of manifest2.items) {
    state = addEntity(state, canvas as IIIFItem, manifest2.id);
  }

  return { state, manifest1, manifest2 };
}

describe('moveEntity', () => {
  it('moves entity to new parent', () => {
    const { state, manifest1, manifest2 } = setupTwoManifestState();
    const canvasToMove = manifest1.items[0].id;

    const newState = moveEntity(state, canvasToMove, manifest2.id);

    expect(getParentId(newState, canvasToMove)).toBe(manifest2.id);
    expect(getChildIds(newState, manifest2.id)).toContain(canvasToMove);
    expect(getChildIds(newState, manifest1.id)).not.toContain(canvasToMove);
  });

  it('updates reverseRefs on parent switch', () => {
    const { state, manifest1, manifest2 } = setupTwoManifestState();
    const canvasToMove = manifest1.items[0].id;

    const newState = moveEntity(state, canvasToMove, manifest2.id);

    expect(newState.reverseRefs[canvasToMove]).toBe(manifest2.id);
  });

  it('inserts at specific index when provided', () => {
    const { state, manifest1, manifest2 } = setupTwoManifestState();
    const canvasToMove = manifest1.items[0].id;

    const newState = moveEntity(state, canvasToMove, manifest2.id, 0);
    const children = getChildIds(newState, manifest2.id);
    expect(children[0]).toBe(canvasToMove);
  });

  it('returns same state when entity has no parent', () => {
    const manifest = createManifest({ canvasCount: 1 });
    const state = normalize(manifest);

    // Root has no reverseRef, so moveEntity returns same state
    const newState = moveEntity(state, manifest.id, 'some-parent');
    expect(newState).toBe(state);
  });
});

describe('reorderChildren', () => {
  it('replaces references array with new order', () => {
    const manifest = createManifest({ canvasCount: 3 });
    const state = normalize(manifest);

    const originalOrder = getChildIds(state, manifest.id);
    const reversed = [...originalOrder].reverse();

    const newState = reorderChildren(state, manifest.id, reversed);
    expect(getChildIds(newState, manifest.id)).toEqual(reversed);
  });

  it('preserves other state', () => {
    const manifest = createManifest({ canvasCount: 2 });
    const state = normalize(manifest);

    const originalOrder = getChildIds(state, manifest.id);
    const reversed = [...originalOrder].reverse();

    const newState = reorderChildren(state, manifest.id, reversed);
    expect(newState.rootId).toBe(state.rootId);
    expect(newState.typeIndex).toBe(state.typeIndex);
  });
});

describe('insertChildAt', () => {
  it('inserts child at specific index', () => {
    const manifest = createManifest({ canvasCount: 2 });
    const state = normalize(manifest);

    const newCanvasId = 'https://example.org/canvas/inserted';
    const newState = insertChildAt(state, manifest.id, newCanvasId, 1);

    const children = getChildIds(newState, manifest.id);
    expect(children[1]).toBe(newCanvasId);
    expect(children).toHaveLength(3);
  });

  it('sets reverseRefs for inserted child', () => {
    const manifest = createManifest({ canvasCount: 1 });
    const state = normalize(manifest);

    const newCanvasId = 'https://example.org/canvas/inserted';
    const newState = insertChildAt(state, manifest.id, newCanvasId, 0);

    expect(getParentId(newState, newCanvasId)).toBe(manifest.id);
  });
});

describe('removeChild', () => {
  it('removes child from parent references', () => {
    const manifest = createManifest({ canvasCount: 2 });
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = removeChild(state, manifest.id, canvasId);

    expect(getChildIds(newState, manifest.id)).not.toContain(canvasId);
  });

  it('cleans up reverseRefs', () => {
    const manifest = createManifest({ canvasCount: 2 });
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = removeChild(state, manifest.id, canvasId);
    expect(newState.reverseRefs[canvasId]).toBeUndefined();
  });

  it('does not delete the entity itself', () => {
    const manifest = createManifest({ canvasCount: 2 });
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = removeChild(state, manifest.id, canvasId);
    // Entity should still exist in the store
    expect(newState.entities.Canvas[canvasId]).toBeDefined();
    expect(newState.typeIndex[canvasId]).toBe('Canvas');
  });
});
