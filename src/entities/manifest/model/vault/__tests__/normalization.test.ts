import { describe, it, expect, beforeEach } from 'vitest';
import { createEmptyState, normalize } from '../normalization';
import {
  resetIds,
  createMinimalManifest,
  createMinimalCollection,
  createCanvas,
  createSupplementingAnnotation,
  createFullTree,
  createManifest,
} from './fixtures';

beforeEach(() => resetIds());

describe('createEmptyState', () => {
  it('returns correct shape with all entity stores empty', () => {
    const state = createEmptyState();
    expect(state.entities.Collection).toEqual({});
    expect(state.entities.Manifest).toEqual({});
    expect(state.entities.Canvas).toEqual({});
    expect(state.entities.Range).toEqual({});
    expect(state.entities.AnnotationPage).toEqual({});
    expect(state.entities.Annotation).toEqual({});
    expect(state.references).toEqual({});
    expect(state.reverseRefs).toEqual({});
    expect(state.collectionMembers).toEqual({});
    expect(state.memberOfCollections).toEqual({});
    expect(state.rootId).toBeNull();
    expect(state.typeIndex).toEqual({});
    expect(state.extensions).toEqual({});
    expect(state.trashedEntities).toEqual({});
  });
});

describe('normalize', () => {
  it('stores entities in the correct type-based stores', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    expect(Object.keys(state.entities.Manifest)).toHaveLength(1);
    expect(Object.keys(state.entities.Canvas)).toHaveLength(1);
    expect(Object.keys(state.entities.AnnotationPage)).toHaveLength(1);
    expect(Object.keys(state.entities.Annotation)).toHaveLength(1);
  });

  it('sets rootId to the top-level entity', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    expect(state.rootId).toBe(manifest.id);
  });

  it('populates typeIndex for all entities', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    expect(state.typeIndex[manifest.id]).toBe('Manifest');
    const canvasId = manifest.items[0].id;
    expect(state.typeIndex[canvasId]).toBe('Canvas');
  });

  it('sets up hierarchical references (Manifest → Canvas)', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;

    expect(state.references[manifest.id]).toContain(canvasId);
    expect(state.reverseRefs[canvasId]).toBe(manifest.id);
  });

  it('sets up collection membership indexes', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);

    const memberIds = state.collectionMembers[collection.id];
    expect(memberIds).toHaveLength(2);

    for (const mid of memberIds) {
      expect(state.memberOfCollections[mid]).toContain(collection.id);
    }
  });

  it('does NOT set reverseRefs for collection members (many-to-many)', () => {
    const collection = createMinimalCollection();
    const state = normalize(collection);

    const manifest1Id = collection.items[0].id;
    // Collection members use collectionMembers/memberOfCollections, not reverseRefs
    expect(state.reverseRefs[manifest1Id]).toBeUndefined();
  });

  it('separates painting and supplementing annotation pages as children of canvas', () => {
    const canvasId = 'https://example.org/canvas/special';
    const suppAnno = createSupplementingAnnotation(canvasId);
    const canvas = createCanvas({ id: canvasId, supplementingAnnotations: [suppAnno] });
    const manifest = createManifest({ items: [canvas] });
    const state = normalize(manifest);

    // Canvas should have 2 annotation page children (1 painting + 1 supplementing)
    const canvasChildren = state.references[canvasId];
    expect(canvasChildren).toHaveLength(2);

    // Both should be AnnotationPage type
    for (const childId of canvasChildren) {
      expect(state.typeIndex[childId]).toBe('AnnotationPage');
    }
  });

  it('stores annotations with correct parent references', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);

    const annotationIds = Object.keys(state.entities.Annotation);
    expect(annotationIds).toHaveLength(1);

    const annoId = annotationIds[0];
    const pageId = state.reverseRefs[annoId];
    expect(state.typeIndex[pageId]).toBe('AnnotationPage');
  });

  it('populates typeIndex accurately for all entity types', () => {
    const tree = createFullTree();
    const state = normalize(tree);

    // Check counts by type
    const types = Object.values(state.typeIndex);
    expect(types.filter(t => t === 'Collection')).toHaveLength(1);
    expect(types.filter(t => t === 'Manifest')).toHaveLength(2);
    expect(types.filter(t => t === 'Canvas')).toHaveLength(6);
    // 6 painting pages + 6 supplementing pages = 12
    expect(types.filter(t => t === 'AnnotationPage')).toHaveLength(12);
    // 6 painting annotations + 6 supplementing annotations = 12
    expect(types.filter(t => t === 'Annotation')).toHaveLength(12);
  });

  it('clears nested items/annotations on stored canvas entities', () => {
    const manifest = createMinimalManifest();
    const state = normalize(manifest);
    const canvasId = manifest.items[0].id;
    const storedCanvas = state.entities.Canvas[canvasId];

    expect(storedCanvas.items).toEqual([]);
  });

  it('normalizes ranges from manifest.structures', () => {
    const manifest = createManifest({ canvasCount: 2 });
    const canvasIds = manifest.items.map(c => c.id);
    manifest.structures = [{
      id: 'https://example.org/range/1',
      type: 'Range',
      label: { en: ['Chapter 1'] },
      items: canvasIds.map(cid => ({ id: cid, type: 'Canvas' as const })),
    }];

    const state = normalize(manifest);
    expect(state.entities.Range['https://example.org/range/1']).toBeDefined();
    expect(state.typeIndex['https://example.org/range/1']).toBe('Range');
  });
});
