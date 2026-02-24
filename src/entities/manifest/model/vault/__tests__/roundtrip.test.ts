import { describe, it, expect, beforeEach } from 'vitest';
import { normalize } from '../normalization';
import { denormalize } from '../denormalization';
import { updateEntity } from '../updates';
import { moveEntityToTrash, restoreEntityFromTrash } from '../trash';
import { hasEntity } from '../queries';
import type { IIIFCollection, IIIFManifest } from '@/src/shared/types';
import {
  resetIds,
  createMinimalManifest,
  createMinimalCollection,
  createFullTree,
} from './fixtures';

beforeEach(() => resetIds());

describe('normalize → denormalize round-trip', () => {
  it('preserves manifest structure', () => {
    const original = createMinimalManifest();
    const state = normalize(original);
    const result = denormalize(state) as IIIFManifest;

    expect(result.id).toBe(original.id);
    expect(result.type).toBe(original.type);
    expect(result.label).toEqual(original.label);
    expect(result.items).toHaveLength(original.items.length);

    const origCanvas = original.items[0];
    const resultCanvas = result.items[0];
    expect(resultCanvas.id).toBe(origCanvas.id);
    expect(resultCanvas.width).toBe(origCanvas.width);
    expect(resultCanvas.height).toBe(origCanvas.height);
  });

  it('preserves collection member count', () => {
    const original = createMinimalCollection();
    const state = normalize(original);
    const result = denormalize(state) as IIIFCollection;

    expect(result.items).toHaveLength(original.items.length);
  });

  it('preserves full tree with all entity types', () => {
    const original = createFullTree();
    const state = normalize(original);
    const result = denormalize(state) as IIIFCollection;

    expect(result.items).toHaveLength(2);
    const manifest = result.items[0] as IIIFManifest;
    expect(manifest.items).toHaveLength(3);
    expect(manifest.items[0].items).toHaveLength(1); // painting page
    expect(manifest.items[0].annotations).toHaveLength(1); // supplementing page
  });
});

describe('normalize → update → denormalize', () => {
  it('preserves unrelated entities after update', () => {
    const original = createMinimalManifest();
    const state = normalize(original);
    const canvasId = original.items[0].id;

    // Update only the manifest label
    const updated = updateEntity(state, original.id, { label: { en: ['Updated Manifest'] } });
    const result = denormalize(updated) as IIIFManifest;

    // Canvas should be unchanged
    const resultCanvas = result.items[0];
    expect(resultCanvas.id).toBe(canvasId);
    expect(resultCanvas.width).toBe(original.items[0].width);

    // Manifest label should be updated
    expect(result.label).toEqual({ en: ['Updated Manifest'] });
  });

  it('reflects canvas dimension changes', () => {
    const original = createMinimalManifest();
    const state = normalize(original);
    const canvasId = original.items[0].id;

    const updated = updateEntity(state, canvasId, { width: 2000, height: 1500 } as Partial<IIIFManifest>);
    const result = denormalize(updated) as IIIFManifest;

    expect(result.items[0].width).toBe(2000);
    expect(result.items[0].height).toBe(1500);
  });
});

describe('normalize → trash → restore → denormalize', () => {
  it('recovers the original entity after trash and restore', () => {
    const original = createMinimalManifest();
    const state = normalize(original);
    const canvasId = original.items[0].id;

    // Trash the canvas
    const trashed = moveEntityToTrash(state, canvasId);
    expect(hasEntity(trashed, canvasId)).toBe(false);

    // Restore from trash
    const restored = restoreEntityFromTrash(trashed, canvasId);
    expect(hasEntity(restored, canvasId)).toBe(true);

    // Denormalize and verify structure
    const result = denormalize(restored) as IIIFManifest;
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(canvasId);
  });

  it('restored entity has correct parent relationship', () => {
    const original = createMinimalManifest();
    const state = normalize(original);
    const canvasId = original.items[0].id;

    const trashed = moveEntityToTrash(state, canvasId);
    const restored = restoreEntityFromTrash(trashed, canvasId);

    expect(restored.reverseRefs[canvasId]).toBe(original.id);
    expect(restored.references[original.id]).toContain(canvasId);
  });
});
