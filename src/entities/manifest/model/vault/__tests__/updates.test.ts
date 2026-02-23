import { describe, it, expect, beforeEach } from 'vitest';
import { normalize } from '../normalization';
import { updateEntity, addEntity, removeEntity } from '../updates';
import { getEntity, getChildIds, getDescendants, hasEntity } from '../queries';
import type { IIIFCanvas, IIIFItem } from '@/src/shared/types';
import { resetIds, createMinimalManifest, createCanvas, createPaintingAnnotation, createAnnotationPage } from './fixtures';

beforeEach(() => resetIds());

describe('updateEntity', () => {
  it('returns a new state object (immutability)', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const newState = updateEntity(state, manifest.id, { label: { en: ['Updated'] } });

    expect(newState).not.toBe(state);
    expect(newState.entities.Manifest[manifest.id]).not.toBe(state.entities.Manifest[manifest.id]);
  });

  it('preserves unmodified entities', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;
    const newState = updateEntity(state, manifest.id, { label: { en: ['Updated'] } });

    // Canvas should be the same reference (untouched)
    expect(newState.entities.Canvas[canvasId]).toBe(state.entities.Canvas[canvasId]);
  });

  it('applies partial updates correctly', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const newState = updateEntity(state, manifest.id, { label: { en: ['New Label'] } });

    const updated = getEntity(newState, manifest.id)!;
    expect(updated.label).toEqual({ en: ['New Label'] });
    expect(updated.type).toBe('Manifest');
  });

  it('returns same state when entity not found', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const newState = updateEntity(state, 'nonexistent', { label: { en: ['X'] } });

    expect(newState).toBe(state);
  });

  it('auto-fixes stale typeIndex', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    // Simulate stale index by removing from typeIndex
    const staleState = {
      ...state,
      typeIndex: { ...state.typeIndex },
    };
    delete staleState.typeIndex[manifest.id];

    const newState = updateEntity(staleState, manifest.id, { label: { en: ['Fixed'] } });
    const updated = getEntity(newState, manifest.id);
    expect(updated).not.toBeNull();
    expect(updated!.label).toEqual({ en: ['Fixed'] });
  });
});

describe('addEntity', () => {
  it('adds entity to correct store', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newCanvasId = 'https://example.org/canvas/new';
    const newCanvas: IIIFCanvas = {
      id: newCanvasId,
      type: 'Canvas',
      width: 500,
      height: 400,
      items: [],
    };

    const newState = addEntity(state, newCanvas as IIIFItem, manifest.id);

    expect(newState.entities.Canvas[newCanvasId]).toBeDefined();
    expect(newState.typeIndex[newCanvasId]).toBe('Canvas');
  });

  it('updates parent references', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const newCanvasId = 'https://example.org/canvas/new';
    const newCanvas: IIIFCanvas = {
      id: newCanvasId,
      type: 'Canvas',
      width: 500,
      height: 400,
      items: [],
    };

    const newState = addEntity(state, newCanvas as IIIFItem, manifest.id);

    expect(newState.references[manifest.id]).toContain(newCanvasId);
    expect(newState.reverseRefs[newCanvasId]).toBe(manifest.id);
  });

  it('preserves existing children when adding', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const existingCanvasId = manifest.items[0].id;

    const newCanvasId = 'https://example.org/canvas/new';
    const newCanvas: IIIFCanvas = {
      id: newCanvasId,
      type: 'Canvas',
      width: 500,
      height: 400,
      items: [],
    };

    const newState = addEntity(state, newCanvas as IIIFItem, manifest.id);

    expect(newState.references[manifest.id]).toContain(existingCanvasId);
    expect(newState.references[manifest.id]).toContain(newCanvasId);
  });
});

describe('removeEntity', () => {
  it('permanently removes entity and descendants', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = removeEntity(state, canvasId, { permanent: true });

    expect(hasEntity(newState, canvasId)).toBe(false);
    // Descendants (annotation page + annotation) should also be gone
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

  it('cleans up typeIndex for removed entities', () => {
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

  it('soft-deletes to trash when permanent is false', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const newState = removeEntity(state, canvasId, { permanent: false });

    // Entity should be gone from active state
    expect(hasEntity(newState, canvasId)).toBe(false);
    // But present in trash
    expect(newState.trashedEntities[canvasId]).toBeDefined();
  });
});
