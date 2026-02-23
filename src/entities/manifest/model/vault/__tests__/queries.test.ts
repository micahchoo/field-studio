import { describe, it, expect, beforeEach } from 'vitest';
import { normalize } from '../normalization';
import {
  getEntity,
  getEntityType,
  getParentId,
  getChildIds,
  getEntitiesByType,
  getAncestors,
  getDescendants,
  hasEntity,
  getRootId,
  getAllEntityIds,
  getEntityCount,
  getTotalEntityCount,
} from '../queries';
import type { IIIFCanvas } from '@/src/shared/types';
import {
  resetIds,
  createMinimalManifest,
  createMinimalCollection,
  createFullTree,
} from './fixtures';

beforeEach(() => resetIds());

describe('getEntity', () => {
  it('returns entity by ID (O(1))', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const result = getEntity(state, manifest.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(manifest.id);
    expect(result!.type).toBe('Manifest');
  });

  it('returns null for missing ID', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(getEntity(state, 'nonexistent')).toBeNull();
  });
});

describe('getEntityType', () => {
  it('returns correct type', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(getEntityType(state, manifest.id)).toBe('Manifest');
  });

  it('returns null for missing ID', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(getEntityType(state, 'nonexistent')).toBeNull();
  });
});

describe('getParentId', () => {
  it('returns parent for canvas', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    expect(getParentId(state, canvasId)).toBe(manifest.id);
  });

  it('returns null for root entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(getParentId(state, manifest.id)).toBeNull();
  });
});

describe('getChildIds', () => {
  it('returns child IDs for manifest', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const children = getChildIds(state, manifest.id);

    expect(children).toContain(manifest.items[0].id);
  });

  it('returns empty array for leaf/missing ID', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(getChildIds(state, 'nonexistent')).toEqual([]);
  });
});

describe('getEntitiesByType', () => {
  it('returns all canvases', () => {
    const tree = createFullTree();
    const state = normalize(tree);
    const canvases = getEntitiesByType<IIIFCanvas>(state, 'Canvas');

    expect(canvases).toHaveLength(6);
    for (const c of canvases) {
      expect(c.type).toBe('Canvas');
    }
  });

  it('returns empty array for type with no entities', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(getEntitiesByType(state, 'Collection')).toHaveLength(0);
  });
});

describe('getAncestors', () => {
  it('returns ancestor chain to root', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;
    const pageId = state.references[canvasId][0];
    const annoId = state.references[pageId][0];

    const ancestors = getAncestors(state, annoId);
    // annotation → page → canvas → manifest
    expect(ancestors).toEqual([pageId, canvasId, manifest.id]);
  });

  it('returns empty array for root entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(getAncestors(state, manifest.id)).toEqual([]);
  });
});

describe('getDescendants', () => {
  it('returns all descendants in BFS order', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const descendants = getDescendants(state, manifest.id);

    // canvas, annotationPage, annotation
    expect(descendants).toHaveLength(3);
    // First descendant should be canvas (direct child)
    expect(state.typeIndex[descendants[0]]).toBe('Canvas');
  });

  it('returns empty array for leaf entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const annoIds = Object.keys(state.entities.Annotation);
    expect(getDescendants(state, annoIds[0])).toEqual([]);
  });
});

describe('hasEntity', () => {
  it('returns true for existing entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(hasEntity(state, manifest.id)).toBe(true);
  });

  it('returns false for missing entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(hasEntity(state, 'nonexistent')).toBe(false);
  });
});

describe('getRootId', () => {
  it('returns root ID', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(getRootId(state)).toBe(manifest.id);
  });
});

describe('getAllEntityIds', () => {
  it('returns all entity IDs', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const ids = getAllEntityIds(state);

    // manifest + canvas + annotationPage + annotation = 4
    expect(ids).toHaveLength(4);
    expect(ids).toContain(manifest.id);
  });
});

describe('getEntityCount', () => {
  it('returns count for specific type', () => {
    const tree = createFullTree();
    const state = normalize(tree);
    expect(getEntityCount(state, 'Canvas')).toBe(6);
    expect(getEntityCount(state, 'Manifest')).toBe(2);
    expect(getEntityCount(state, 'Collection')).toBe(1);
  });
});

describe('getTotalEntityCount', () => {
  it('returns total across all types', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    // manifest + canvas + annotationPage + annotation = 4
    expect(getTotalEntityCount(state)).toBe(4);
  });
});
