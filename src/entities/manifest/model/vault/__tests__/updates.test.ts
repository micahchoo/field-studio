import { describe, it, expect, beforeEach } from 'vitest';
import { normalize } from '../normalization';
import { updateEntity, addEntity, removeEntity } from '../updates';
import { getEntity, hasEntity, getChildIds, getParentId } from '../queries';
import type { IIIFCanvas, IIIFItem, IIIFManifest } from '@/src/shared/types';
import { resetIds, createMinimalManifest, createMinimalCollection, createManifest } from './fixtures';

beforeEach(() => resetIds());

describe('updateEntity', () => {
  it('returns new state with updated entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newState = updateEntity(state, manifest.id, { label: { en: ['Updated'] } });

    expect(newState).not.toBe(state);
    expect(getEntity(newState, manifest.id)!.label).toEqual({ en: ['Updated'] });
  });

  it('preserves unmodified entities (structural sharing)', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = updateEntity(state, manifest.id, { label: { en: ['Updated'] } });

    // Canvas store should be the same reference (untouched)
    expect(newState.entities.Canvas).toBe(state.entities.Canvas);
  });

  it('returns same state for nonexistent entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newState = updateEntity(state, 'nonexistent', { label: { en: ['Test'] } });
    expect(newState).toBe(state);
  });

  it('strips id from updates to prevent store key mismatch', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newState = updateEntity(state, manifest.id, { id: 'new-id', label: { en: ['Updated'] } } as Partial<IIIFItem>);
    // Should still be accessible by old ID
    expect(getEntity(newState, manifest.id)).not.toBeNull();
    expect(getEntity(newState, manifest.id)!.label).toEqual({ en: ['Updated'] });
  });
});

describe('addEntity', () => {
  it('adds entity to correct type store', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newCanvas: IIIFCanvas = {
      id: 'https://example.org/canvas/new',
      type: 'Canvas',
      width: 500,
      height: 400,
      items: [],
    };

    const newState = addEntity(state, newCanvas as IIIFItem, manifest.id);

    expect(hasEntity(newState, newCanvas.id)).toBe(true);
    expect(newState.typeIndex[newCanvas.id]).toBe('Canvas');
  });

  it('updates parent references', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newCanvas: IIIFCanvas = {
      id: 'https://example.org/canvas/new',
      type: 'Canvas',
      width: 500,
      height: 400,
      items: [],
    };

    const newState = addEntity(state, newCanvas as IIIFItem, manifest.id);

    expect(getChildIds(newState, manifest.id)).toContain(newCanvas.id);
    expect(getParentId(newState, newCanvas.id)).toBe(manifest.id);
  });

  it('preserves existing children', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const existingCanvasId = manifest.items[0].id;

    const newCanvas: IIIFCanvas = {
      id: 'https://example.org/canvas/new',
      type: 'Canvas',
      width: 500,
      height: 400,
      items: [],
    };

    const newState = addEntity(state, newCanvas as IIIFItem, manifest.id);

    expect(getChildIds(newState, manifest.id)).toContain(existingCanvasId);
    expect(getChildIds(newState, manifest.id)).toContain(newCanvas.id);
  });
});

describe('removeEntity', () => {
  it('permanently removes entity and descendants', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = removeEntity(state, canvasId, { permanent: true });

    expect(hasEntity(newState, canvasId)).toBe(false);
    // Descendants should also be gone
    const pageIds = state.references[canvasId] || [];
    for (const pid of pageIds) {
      expect(hasEntity(newState, pid)).toBe(false);
    }
  });

  it('removes from parent references', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = removeEntity(state, canvasId, { permanent: true });

    expect(getChildIds(newState, manifest.id)).not.toContain(canvasId);
  });

  it('cleans up typeIndex', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = removeEntity(state, canvasId, { permanent: true });

    expect(newState.typeIndex[canvasId]).toBeUndefined();
  });

  it('nulls rootId when root is removed', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newState = removeEntity(state, manifest.id, { permanent: true });

    expect(newState.rootId).toBeNull();
  });

  it('soft-deletes to trash by default', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = removeEntity(state, canvasId);

    expect(hasEntity(newState, canvasId)).toBe(false);
    expect(newState.trashedEntities[canvasId]).toBeDefined();
  });

  it('returns same state for nonexistent entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newState = removeEntity(state, 'nonexistent');
    expect(newState).toBe(state);
  });
});
