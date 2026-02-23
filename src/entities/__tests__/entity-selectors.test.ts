import { describe, it, expect, beforeEach } from 'vitest';
import type { NormalizedState } from '../manifest/model/vault';
import type { IIIFCanvas, IIIFCollection, IIIFManifest } from '@/src/shared/types';

import * as canvasModel from '../canvas/model';
import * as collectionModel from '../collection/model';
import * as manifestModel from '../manifest/model';

// ---------------------------------------------------------------------------
// Shared fixture: collection -> manifest -> 3 canvases
// ---------------------------------------------------------------------------

function createFixture(): NormalizedState {
  const collection: IIIFCollection = {
    id: 'coll-1',
    type: 'Collection',
    label: { en: ['Test Collection'] },
    summary: { en: ['A test collection'] },
    metadata: [
      { label: { en: ['Creator'] }, value: { en: ['Tester'] } },
    ],
    items: [],
  };

  const manifest: IIIFManifest = {
    id: 'manifest-1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    summary: { en: ['A test manifest'] },
    metadata: [
      { label: { en: ['Date'] }, value: { en: ['2026'] } },
    ],
    rights: 'http://creativecommons.org/licenses/by/4.0/',
    items: [],
  };

  const canvases: IIIFCanvas[] = [
    { id: 'canvas-1', type: 'Canvas', label: { en: ['Page 1'] }, width: 800, height: 600, items: [] },
    { id: 'canvas-2', type: 'Canvas', label: { en: ['Page 2'] }, width: 1024, height: 768, items: [] },
    { id: 'canvas-3', type: 'Canvas', label: { en: ['Page 3'] }, width: 640, height: 480, items: [] },
  ];

  return {
    entities: {
      Collection: { 'coll-1': collection },
      Manifest: { 'manifest-1': manifest },
      Canvas: {
        'canvas-1': canvases[0],
        'canvas-2': canvases[1],
        'canvas-3': canvases[2],
      },
      Range: {},
      AnnotationPage: {},
      Annotation: {},
    },
    references: {
      'coll-1': ['manifest-1'],
      'manifest-1': ['canvas-1', 'canvas-2', 'canvas-3'],
    },
    reverseRefs: {
      'manifest-1': 'coll-1',
      'canvas-1': 'manifest-1',
      'canvas-2': 'manifest-1',
      'canvas-3': 'manifest-1',
    },
    collectionMembers: {
      'coll-1': ['manifest-1'],
    },
    memberOfCollections: {
      'manifest-1': ['coll-1'],
    },
    rootId: 'coll-1',
    typeIndex: {
      'coll-1': 'Collection',
      'manifest-1': 'Manifest',
      'canvas-1': 'Canvas',
      'canvas-2': 'Canvas',
      'canvas-3': 'Canvas',
    },
    extensions: {},
    trashedEntities: {},
  };
}

let state: NormalizedState;

beforeEach(() => {
  state = createFixture();
});

// ===========================================================================
// Canvas selectors
// ===========================================================================

describe('canvas/model', () => {
  describe('selectById', () => {
    it('returns canvas when ID exists', () => {
      const canvas = canvasModel.selectById(state, 'canvas-1');
      expect(canvas).not.toBeNull();
      expect(canvas!.id).toBe('canvas-1');
      expect(canvas!.type).toBe('Canvas');
    });

    it('returns null for missing ID', () => {
      expect(canvasModel.selectById(state, 'nonexistent')).toBeNull();
    });

    it('returns null when ID belongs to a different type', () => {
      expect(canvasModel.selectById(state, 'manifest-1')).toBeNull();
    });
  });

  describe('selectAll', () => {
    it('returns all canvases', () => {
      const all = canvasModel.selectAll(state);
      expect(all).toHaveLength(3);
      expect(all.every(c => c.type === 'Canvas')).toBe(true);
    });

    it('returns empty array when no canvases exist', () => {
      state.entities.Canvas = {};
      expect(canvasModel.selectAll(state)).toHaveLength(0);
    });
  });

  describe('selectLabel', () => {
    it('returns label for existing canvas', () => {
      const label = canvasModel.selectLabel(state, 'canvas-1');
      expect(label).toEqual({ en: ['Page 1'] });
    });

    it('returns null for missing canvas', () => {
      expect(canvasModel.selectLabel(state, 'nonexistent')).toBeNull();
    });
  });

  describe('selectDimensions', () => {
    it('returns width and height', () => {
      const dims = canvasModel.selectDimensions(state, 'canvas-2');
      expect(dims).toEqual({ width: 1024, height: 768 });
    });

    it('returns null for missing canvas', () => {
      expect(canvasModel.selectDimensions(state, 'nonexistent')).toBeNull();
    });
  });

  describe('selectParentManifest', () => {
    it('returns parent manifest ID', () => {
      expect(canvasModel.selectParentManifest(state, 'canvas-1')).toBe('manifest-1');
    });

    it('returns null for orphan or missing ID', () => {
      expect(canvasModel.selectParentManifest(state, 'nonexistent')).toBeNull();
    });
  });

  describe('selectAnnotationPages', () => {
    it('returns empty array when canvas has no children', () => {
      expect(canvasModel.selectAnnotationPages(state, 'canvas-1')).toEqual([]);
    });

    it('returns child IDs when annotation pages exist', () => {
      state.references['canvas-1'] = ['ap-1', 'ap-2'];
      expect(canvasModel.selectAnnotationPages(state, 'canvas-1')).toEqual(['ap-1', 'ap-2']);
    });
  });

  describe('selectAncestors', () => {
    it('returns path to root for canvas', () => {
      const ancestors = canvasModel.selectAncestors(state, 'canvas-1');
      expect(ancestors).toEqual(['manifest-1', 'coll-1']);
    });

    it('returns empty array for root entity', () => {
      expect(canvasModel.selectAncestors(state, 'coll-1')).toEqual([]);
    });
  });

  describe('selectDescendants', () => {
    it('returns empty array for leaf canvas', () => {
      expect(canvasModel.selectDescendants(state, 'canvas-1')).toEqual([]);
    });

    it('returns descendants when children exist', () => {
      state.references['canvas-1'] = ['ap-1'];
      state.references['ap-1'] = ['anno-1'];
      expect(canvasModel.selectDescendants(state, 'canvas-1')).toEqual(['ap-1', 'anno-1']);
    });
  });

  describe('hasAnnotations', () => {
    it('returns false when canvas has no annotation pages', () => {
      expect(canvasModel.hasAnnotations(state, 'canvas-1')).toBe(false);
    });

    it('returns true when canvas has annotation pages', () => {
      state.references['canvas-1'] = ['ap-1'];
      expect(canvasModel.hasAnnotations(state, 'canvas-1')).toBe(true);
    });
  });

  describe('countAnnotations', () => {
    it('returns 0 when no annotation pages', () => {
      expect(canvasModel.countAnnotations(state, 'canvas-1')).toBe(0);
    });

    it('sums annotations across all pages', () => {
      state.references['canvas-1'] = ['ap-1', 'ap-2'];
      state.references['ap-1'] = ['anno-1', 'anno-2'];
      state.references['ap-2'] = ['anno-3'];
      expect(canvasModel.countAnnotations(state, 'canvas-1')).toBe(3);
    });
  });
});

// ===========================================================================
// Collection selectors
// ===========================================================================

describe('collection/model', () => {
  describe('selectById', () => {
    it('returns collection when ID exists', () => {
      const coll = collectionModel.selectById(state, 'coll-1');
      expect(coll).not.toBeNull();
      expect(coll!.type).toBe('Collection');
    });

    it('returns null for missing ID', () => {
      expect(collectionModel.selectById(state, 'nonexistent')).toBeNull();
    });

    it('returns null when ID belongs to a different type', () => {
      expect(collectionModel.selectById(state, 'manifest-1')).toBeNull();
    });
  });

  describe('selectAll', () => {
    it('returns all collections', () => {
      const all = collectionModel.selectAll(state);
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('coll-1');
    });
  });

  describe('selectLabel / selectSummary / selectMetadata', () => {
    it('returns label', () => {
      expect(collectionModel.selectLabel(state, 'coll-1')).toEqual({ en: ['Test Collection'] });
    });

    it('returns summary', () => {
      expect(collectionModel.selectSummary(state, 'coll-1')).toEqual({ en: ['A test collection'] });
    });

    it('returns metadata array', () => {
      const meta = collectionModel.selectMetadata(state, 'coll-1');
      expect(meta).toHaveLength(1);
      expect(meta[0].label).toEqual({ en: ['Creator'] });
    });

    it('returns null/empty for missing collection', () => {
      expect(collectionModel.selectLabel(state, 'nonexistent')).toBeNull();
      expect(collectionModel.selectSummary(state, 'nonexistent')).toBeNull();
      expect(collectionModel.selectMetadata(state, 'nonexistent')).toEqual([]);
    });
  });

  describe('selectMembers', () => {
    it('returns member IDs', () => {
      expect(collectionModel.selectMembers(state, 'coll-1')).toEqual(['manifest-1']);
    });

    it('returns empty array for collection with no members', () => {
      state.collectionMembers['coll-1'] = [];
      expect(collectionModel.selectMembers(state, 'coll-1')).toEqual([]);
    });
  });

  describe('countMembers / hasMembers', () => {
    it('counts members', () => {
      expect(collectionModel.countMembers(state, 'coll-1')).toBe(1);
    });

    it('hasMembers returns true when members exist', () => {
      expect(collectionModel.hasMembers(state, 'coll-1')).toBe(true);
    });

    it('hasMembers returns false for empty collection', () => {
      state.collectionMembers['coll-1'] = [];
      expect(collectionModel.hasMembers(state, 'coll-1')).toBe(false);
    });
  });

  describe('selectParentCollection', () => {
    it('returns null for root collection', () => {
      expect(collectionModel.selectParentCollection(state, 'coll-1')).toBeNull();
    });
  });

  describe('selectCollectionMemberships', () => {
    it('returns collections referencing this entity', () => {
      expect(collectionModel.selectCollectionMemberships(state, 'manifest-1')).toEqual(['coll-1']);
    });

    it('returns empty for entity with no memberships', () => {
      expect(collectionModel.selectCollectionMemberships(state, 'canvas-1')).toEqual([]);
    });
  });

  describe('selectAncestors', () => {
    it('returns empty for root', () => {
      expect(collectionModel.selectAncestors(state, 'coll-1')).toEqual([]);
    });
  });

  describe('selectDescendants', () => {
    it('returns all descendants of collection', () => {
      const desc = collectionModel.selectDescendants(state, 'coll-1');
      expect(desc).toContain('manifest-1');
      expect(desc).toContain('canvas-1');
      expect(desc).toContain('canvas-2');
      expect(desc).toContain('canvas-3');
      expect(desc).toHaveLength(4);
    });
  });

  describe('selectOrphanManifests', () => {
    it('returns empty when all manifests belong to a collection', () => {
      expect(collectionModel.selectOrphanManifests(state)).toEqual([]);
    });

    it('returns orphan manifest IDs', () => {
      state.memberOfCollections['manifest-1'] = [];
      expect(collectionModel.selectOrphanManifests(state)).toEqual(['manifest-1']);
    });
  });

  describe('isRoot', () => {
    it('returns true for root collection', () => {
      expect(collectionModel.isRoot(state, 'coll-1')).toBe(true);
    });

    it('returns false for non-root entity', () => {
      expect(collectionModel.isRoot(state, 'manifest-1')).toBe(false);
    });
  });

  describe('selectTopLevel', () => {
    it('returns collections with no parent', () => {
      const topLevel = collectionModel.selectTopLevel(state);
      expect(topLevel).toHaveLength(1);
      expect(topLevel[0].id).toBe('coll-1');
    });
  });
});

// ===========================================================================
// Manifest selectors
// ===========================================================================

describe('manifest/model', () => {
  describe('selectById', () => {
    it('returns manifest when ID exists', () => {
      const manifest = manifestModel.selectById(state, 'manifest-1');
      expect(manifest).not.toBeNull();
      expect(manifest!.type).toBe('Manifest');
      expect(manifest!.id).toBe('manifest-1');
    });

    it('returns null for missing ID', () => {
      expect(manifestModel.selectById(state, 'nonexistent')).toBeNull();
    });

    it('returns null when ID belongs to a different type', () => {
      expect(manifestModel.selectById(state, 'canvas-1')).toBeNull();
    });
  });

  describe('selectAll', () => {
    it('returns all manifests', () => {
      const all = manifestModel.selectAll(state);
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('manifest-1');
    });
  });

  describe('selectLabel / selectSummary / selectMetadata / selectRights', () => {
    it('returns label', () => {
      expect(manifestModel.selectLabel(state, 'manifest-1')).toEqual({ en: ['Test Manifest'] });
    });

    it('returns summary', () => {
      expect(manifestModel.selectSummary(state, 'manifest-1')).toEqual({ en: ['A test manifest'] });
    });

    it('returns metadata', () => {
      const meta = manifestModel.selectMetadata(state, 'manifest-1');
      expect(meta).toHaveLength(1);
      expect(meta[0].value).toEqual({ en: ['2026'] });
    });

    it('returns rights', () => {
      expect(manifestModel.selectRights(state, 'manifest-1')).toBe(
        'http://creativecommons.org/licenses/by/4.0/'
      );
    });

    it('returns null/empty for missing manifest', () => {
      expect(manifestModel.selectLabel(state, 'nonexistent')).toBeNull();
      expect(manifestModel.selectSummary(state, 'nonexistent')).toBeNull();
      expect(manifestModel.selectMetadata(state, 'nonexistent')).toEqual([]);
      expect(manifestModel.selectRights(state, 'nonexistent')).toBeNull();
    });
  });

  describe('selectCanvases / selectCanvasIds', () => {
    it('returns canvas IDs', () => {
      const ids = manifestModel.selectCanvases(state, 'manifest-1');
      expect(ids).toEqual(['canvas-1', 'canvas-2', 'canvas-3']);
    });

    it('selectCanvasIds returns same result', () => {
      expect(manifestModel.selectCanvasIds(state, 'manifest-1')).toEqual(
        manifestModel.selectCanvases(state, 'manifest-1')
      );
    });

    it('returns empty for missing manifest', () => {
      expect(manifestModel.selectCanvases(state, 'nonexistent')).toEqual([]);
    });
  });

  describe('countCanvases / hasCanvases', () => {
    it('counts canvases', () => {
      expect(manifestModel.countCanvases(state, 'manifest-1')).toBe(3);
    });

    it('hasCanvases returns true', () => {
      expect(manifestModel.hasCanvases(state, 'manifest-1')).toBe(true);
    });

    it('hasCanvases returns false for empty manifest', () => {
      state.references['manifest-1'] = [];
      expect(manifestModel.hasCanvases(state, 'manifest-1')).toBe(false);
    });
  });

  describe('selectParentCollection', () => {
    it('returns parent collection ID', () => {
      expect(manifestModel.selectParentCollection(state, 'manifest-1')).toBe('coll-1');
    });

    it('returns null for root or missing', () => {
      expect(manifestModel.selectParentCollection(state, 'coll-1')).toBeNull();
    });
  });

  describe('selectCollectionMemberships', () => {
    it('returns collections containing this manifest', () => {
      expect(manifestModel.selectCollectionMemberships(state, 'manifest-1')).toEqual(['coll-1']);
    });

    it('returns empty for manifest not in any collection', () => {
      state.memberOfCollections['manifest-1'] = [];
      expect(manifestModel.selectCollectionMemberships(state, 'manifest-1')).toEqual([]);
    });
  });

  describe('selectAncestors', () => {
    it('returns path to root', () => {
      expect(manifestModel.selectAncestors(state, 'manifest-1')).toEqual(['coll-1']);
    });
  });

  describe('selectDescendants', () => {
    it('returns all canvases as descendants', () => {
      const desc = manifestModel.selectDescendants(state, 'manifest-1');
      expect(desc).toEqual(['canvas-1', 'canvas-2', 'canvas-3']);
    });
  });

  describe('isOrphan', () => {
    it('returns false when manifest belongs to a collection', () => {
      expect(manifestModel.isOrphan(state, 'manifest-1')).toBe(false);
    });

    it('returns true when manifest has no collection memberships', () => {
      state.memberOfCollections['manifest-1'] = [];
      expect(manifestModel.isOrphan(state, 'manifest-1')).toBe(true);
    });

    it('returns false for non-manifest entities', () => {
      expect(manifestModel.isOrphan(state, 'canvas-1')).toBe(false);
    });
  });
});
