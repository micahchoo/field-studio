import { describe, it, expect, beforeEach } from 'vitest';
import { normalize } from '../normalization';
import { moveEntityToTrash, restoreEntityFromTrash, emptyTrash } from '../trash';
import { hasEntity, getChildIds, getParentId } from '../queries';
import { resetIds, createMinimalManifest, createMinimalCollection } from './fixtures';

beforeEach(() => resetIds());

describe('moveEntityToTrash', () => {
  it('captures TrashedEntity metadata', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = moveEntityToTrash(state, canvasId);
    const trashed = newState.trashedEntities[canvasId];

    expect(trashed).toBeDefined();
    expect(trashed.entity.id).toBe(canvasId);
    expect(trashed.originalParentId).toBe(manifest.id);
    expect(trashed.trashedAt).toBeGreaterThan(0);
    expect(trashed.childIds).toBeDefined();
  });

  it('removes entity from active state', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = moveEntityToTrash(state, canvasId);

    expect(hasEntity(newState, canvasId)).toBe(false);
    expect(getChildIds(newState, manifest.id)).not.toContain(canvasId);
  });

  it('descendants follow parent to trash', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;
    const pageIds = state.references[canvasId] || [];

    const newState = moveEntityToTrash(state, canvasId);

    // Descendants should be removed from active state
    for (const pid of pageIds) {
      expect(hasEntity(newState, pid)).toBe(false);
    }
  });

  it('nulls rootId when root is trashed', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newState = moveEntityToTrash(state, manifest.id);
    expect(newState.rootId).toBeNull();
  });

  it('returns same state for nonexistent entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newState = moveEntityToTrash(state, 'nonexistent');
    expect(newState).toBe(state);
  });

  it('preserves collection membership in trash metadata', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);
    const manifest1Id = collection.items[0].id;

    const newState = moveEntityToTrash(state, manifest1Id);
    const trashed = newState.trashedEntities[manifest1Id];

    expect(trashed.memberOfCollections).toContain(collection.id);
  });
});

describe('restoreEntityFromTrash', () => {
  it('restores entity to active state', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const trashed = moveEntityToTrash(state, canvasId);
    const restored = restoreEntityFromTrash(trashed, canvasId);

    expect(hasEntity(restored, canvasId)).toBe(true);
    expect(restored.trashedEntities[canvasId]).toBeUndefined();
  });

  it('restores to original parent by default', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const trashed = moveEntityToTrash(state, canvasId);
    const restored = restoreEntityFromTrash(trashed, canvasId);

    expect(getChildIds(restored, manifest.id)).toContain(canvasId);
    expect(getParentId(restored, canvasId)).toBe(manifest.id);
  });

  it('restores to new parent when specified', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const trashed = moveEntityToTrash(state, canvasId);
    const restored = restoreEntityFromTrash(trashed, canvasId, { parentId: manifest.id });

    expect(getChildIds(restored, manifest.id)).toContain(canvasId);
  });

  it('restores with index positioning', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const trashed = moveEntityToTrash(state, canvasId);
    const restored = restoreEntityFromTrash(trashed, canvasId, { index: 0 });

    const children = getChildIds(restored, manifest.id);
    expect(children[0]).toBe(canvasId);
  });

  it('returns same state for entity not in trash', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const result = restoreEntityFromTrash(state, 'nonexistent');
    expect(result).toBe(state);
  });
});

describe('emptyTrash', () => {
  it('permanently deletes all trashed entities', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const trashed = moveEntityToTrash(state, canvasId);
    expect(Object.keys(trashed.trashedEntities).length).toBeGreaterThan(0);

    const { state: emptied, deletedCount, errors } = emptyTrash(trashed);

    expect(Object.keys(emptied.trashedEntities)).toHaveLength(0);
    expect(deletedCount).toBeGreaterThan(0);
    expect(errors).toHaveLength(0);
  });
});
