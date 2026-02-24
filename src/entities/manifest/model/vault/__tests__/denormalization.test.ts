import { describe, it, expect, beforeEach } from 'vitest';
import { denormalize, denormalizeCanvas } from '../denormalization';
import { normalize, createEmptyState } from '../normalization';
import type { IIIFCollection, IIIFManifest } from '@/src/shared/types';
import {
  resetIds,
  createMinimalManifest,
  createMinimalCollection,
  createCanvas,
  createSupplementingAnnotation,
  createManifest,
  createFullTree,
} from './fixtures';

beforeEach(() => resetIds());

describe('denormalize', () => {
  it('returns null when rootId is null', () => {
    const state = createEmptyState();
    expect(denormalize(state)).toBeNull();
  });

  it('reconstructs a minimal manifest tree', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const result = denormalize(state) as IIIFManifest;

    expect(result).not.toBeNull();
    expect(result.id).toBe(manifest.id);
    expect(result.type).toBe('Manifest');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe('Canvas');
  });

  it('reconstructs canvas.items with painting annotations only', () => {
    const canvasId = 'https://example.org/canvas/paint-test';
    const suppAnno = createSupplementingAnnotation(canvasId);
    const canvas = createCanvas({ id: canvasId, supplementingAnnotations: [suppAnno] });
    const manifest = createManifest({ items: [canvas] });
    const state = normalize(manifest);
    const result = denormalize(state) as IIIFManifest;

    const resultCanvas = result.items[0];
    // canvas.items should only have painting annotation pages
    expect(resultCanvas.items).toHaveLength(1);
    expect(resultCanvas.items[0].items[0].motivation).toBe('painting');
  });

  it('reconstructs canvas.annotations with non-painting annotations only', () => {
    const canvasId = 'https://example.org/canvas/supp-test';
    const suppAnno = createSupplementingAnnotation(canvasId);
    const canvas = createCanvas({ id: canvasId, supplementingAnnotations: [suppAnno] });
    const manifest = createManifest({ items: [canvas] });
    const state = normalize(manifest);
    const result = denormalize(state) as IIIFManifest;

    const resultCanvas = result.items[0];
    expect(resultCanvas.annotations).toBeDefined();
    expect(resultCanvas.annotations!).toHaveLength(1);
    expect(resultCanvas.annotations![0].items[0].motivation).toBe('commenting');
  });

  it('reconstructs a collection with member manifests', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);
    const result = denormalize(state) as IIIFCollection;

    expect(result.id).toBe(collection.id);
    expect(result.type).toBe('Collection');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].type).toBe('Manifest');
  });

  it('reconstructs a full tree with all entity types', () => {
    const tree = createFullTree();
    const state = normalize(tree);
    const result = denormalize(state) as IIIFCollection;

    expect(result.type).toBe('Collection');
    expect(result.items).toHaveLength(2);

    const manifest = result.items[0] as IIIFManifest;
    expect(manifest.items).toHaveLength(3);

    const canvas = manifest.items[0];
    expect(canvas.items).toHaveLength(1);
    expect(canvas.annotations).toHaveLength(1);
  });
});

describe('denormalizeCanvas', () => {
  it('separates painting from non-painting annotation pages', () => {
    const canvasId = 'https://example.org/canvas/sep-test';
    const suppAnno = createSupplementingAnnotation(canvasId);
    const canvas = createCanvas({ id: canvasId, supplementingAnnotations: [suppAnno] });
    const manifest = createManifest({ items: [canvas] });
    const state = normalize(manifest);

    const result = denormalizeCanvas(state, canvasId);
    expect(result.items).toHaveLength(1);
    expect(result.annotations).toHaveLength(1);
  });

  it('handles canvas with only painting annotations', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    const result = denormalizeCanvas(state, canvasId);
    expect(result.items).toHaveLength(1);
    // When normalized canvas has no supplementing annotation pages,
    // denormalization returns the original stored value (empty array from normalization)
    expect(result.annotations).toEqual([]);
  });
});

describe('round-trip: normalize → denormalize', () => {
  it('produces structurally equivalent manifest tree', () => {
    const original = createMinimalManifest();
    const state = normalize(original);
    const reconstructed = denormalize(state) as IIIFManifest;

    expect(reconstructed.id).toBe(original.id);
    expect(reconstructed.type).toBe(original.type);
    expect(reconstructed.items).toHaveLength(original.items.length);
    expect(reconstructed.items[0].id).toBe(original.items[0].id);
    expect(reconstructed.items[0].width).toBe(original.items[0].width);
    expect(reconstructed.items[0].height).toBe(original.items[0].height);
  });

  it('produces structurally equivalent collection tree', () => {
    const original = createMinimalCollection();
    const state = normalize(original);
    const reconstructed = denormalize(state) as IIIFCollection;

    expect(reconstructed.id).toBe(original.id);
    expect(reconstructed.items).toHaveLength(original.items.length);
    for (let i = 0; i < original.items.length; i++) {
      expect(reconstructed.items[i].id).toBe(original.items[i].id);
    }
  });

  it('preserves annotation content through round-trip', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const result = denormalize(state) as IIIFManifest;

    const originalAnno = manifest.items[0].items[0].items[0];
    const resultAnno = result.items[0].items[0].items[0];
    expect(resultAnno.motivation).toBe(originalAnno.motivation);
    expect(resultAnno.target).toBe(originalAnno.target);
  });
});
