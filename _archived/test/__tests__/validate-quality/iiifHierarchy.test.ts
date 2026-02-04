/**
 * Unit Tests for utils/iiifHierarchy.ts
 *
 * Tests IIIF Presentation API 3.0 hierarchy relationships and operations.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  // Relationship types
  getRelationshipType,
  canHaveMultipleParents,
  isStandaloneType,
  // Collection operations
  getCollectionManifests,
  getNestedCollections,
  collectionContainsManifest,
  addManifestToCollection,
  removeManifestFromCollection,
  // Manifest operations
  getManifestCanvases,
  manifestContainsCanvas,
  addCanvasToManifest,
  removeCanvasFromManifest,
  reorderManifestCanvases,
  // Tree traversal
  findAllOfType,
  findCollectionsContaining,
  findCanvasParent,
  findNodeById,
  getPathToNode,
  // Validation
  isValidChildType,
  getValidChildTypes,
  // Statistics
  countResourcesByType,
  getTreeDepth,
  // Reference tracking
  buildReferenceMap,
  getReferencingCollections,
  // ID generation
  generateId,
  // Range helpers
  createRange,
  createNestedRange,
  addRangeToManifest,
  getManifestRanges,
  flattenRangeCanvasIds,
} from '@/utils/iiifHierarchy';
import type {
  IIIFCanvas,
  IIIFCollection,
  IIIFManifest,
  IIIFRange,
} from '@/types';

// ============================================================================
// Relationship Type Tests
// ============================================================================

describe('getRelationshipType', () => {
  it('should return reference for Collection → Manifest', () => {
    expect(getRelationshipType('Collection', 'Manifest')).toBe('reference');
  });

  it('should return reference for Collection → Collection', () => {
    expect(getRelationshipType('Collection', 'Collection')).toBe('reference');
  });

  it('should return ownership for Manifest → Canvas', () => {
    expect(getRelationshipType('Manifest', 'Canvas')).toBe('ownership');
  });

  it('should return ownership for Canvas → AnnotationPage', () => {
    expect(getRelationshipType('Canvas', 'AnnotationPage')).toBe('ownership');
  });

  it('should return reference for Range → Canvas', () => {
    expect(getRelationshipType('Range', 'Canvas')).toBe('reference');
  });

  it('should return reference for Range → Range', () => {
    expect(getRelationshipType('Range', 'Range')).toBe('reference');
  });

  it('should return none for null parent', () => {
    expect(getRelationshipType(null, 'Manifest')).toBe('none');
  });

  it('should default to ownership for unknown relationships', () => {
    expect(getRelationshipType('Unknown', 'Type')).toBe('ownership');
  });
});

describe('canHaveMultipleParents', () => {
  it('should return true for Manifest', () => {
    expect(canHaveMultipleParents('Manifest')).toBe(true);
  });

  it('should return true for Canvas', () => {
    expect(canHaveMultipleParents('Canvas')).toBe(true);
  });

  it('should return false for Collection', () => {
    expect(canHaveMultipleParents('Collection')).toBe(false);
  });

  it('should return false for unknown types', () => {
    expect(canHaveMultipleParents('Unknown')).toBe(false);
  });
});

describe('isStandaloneType', () => {
  it('should return true for Manifest', () => {
    expect(isStandaloneType('Manifest')).toBe(true);
  });

  it('should return true for Collection', () => {
    expect(isStandaloneType('Collection')).toBe(true);
  });

  it('should return false for Canvas', () => {
    expect(isStandaloneType('Canvas')).toBe(false);
  });

  it('should return false for unknown types', () => {
    expect(isStandaloneType('Unknown')).toBe(false);
  });
});

// ============================================================================
// Collection Operations Tests
// ============================================================================

describe('getCollectionManifests', () => {
  it('should return manifests from collection', () => {
    const manifest1: IIIFManifest = { id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] };
    const manifest2: IIIFManifest = { id: 'm2', type: 'Manifest', label: { en: ['M2'] }, items: [] };
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: [manifest1, manifest2]
    };

    const manifests = getCollectionManifests(collection);
    expect(manifests).toHaveLength(2);
    expect(manifests[0].id).toBe('m1');
    expect(manifests[1].id).toBe('m2');
  });

  it('should return empty array for collection without items', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: undefined
    };

    const manifests = getCollectionManifests(collection);
    expect(manifests).toEqual([]);
  });

  it('should filter out non-manifest items', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: [
        { id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] },
        { id: 'c2', type: 'Collection', label: { en: ['C2'] }, items: [] } as IIIFCollection
      ]
    };

    const manifests = getCollectionManifests(collection);
    expect(manifests).toHaveLength(1);
    expect(manifests[0].type).toBe('Manifest');
  });
});

describe('getNestedCollections', () => {
  it('should return nested collections', () => {
    const nested: IIIFCollection = { id: 'c2', type: 'Collection', label: { en: ['Nested'] }, items: [] };
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Parent'] },
      items: [nested]
    };

    const nestedCollections = getNestedCollections(collection);
    expect(nestedCollections).toHaveLength(1);
    expect(nestedCollections[0].id).toBe('c2');
  });

  it('should return empty array when no nested collections', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Parent'] },
      items: [{ id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] }]
    };

    const nestedCollections = getNestedCollections(collection);
    expect(nestedCollections).toEqual([]);
  });
});

describe('collectionContainsManifest', () => {
  it('should return true when collection contains manifest', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: [{ id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] }]
    };

    expect(collectionContainsManifest(collection, 'm1')).toBe(true);
  });

  it('should return false when collection does not contain manifest', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: [{ id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] }]
    };

    expect(collectionContainsManifest(collection, 'm2')).toBe(false);
  });

  it('should return false for collection without items', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: undefined
    };

    expect(collectionContainsManifest(collection, 'm1')).toBe(false);
  });
});

describe('addManifestToCollection', () => {
  it('should add manifest to collection', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: []
    };
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: []
    };

    const updated = addManifestToCollection(collection, manifest);
    expect(updated.items).toHaveLength(1);
    expect(updated.items?.[0].id).toBe('m1');
  });

  it('should not add duplicate manifest', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: []
    };
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: [manifest]
    };

    const updated = addManifestToCollection(collection, manifest);
    expect(updated.items).toHaveLength(1);
  });

  it('should not mutate original collection', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: []
    };
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: []
    };

    addManifestToCollection(collection, manifest);
    expect(collection.items).toEqual([]);
  });
});

describe('removeManifestFromCollection', () => {
  it('should remove manifest from collection', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: [
        { id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] },
        { id: 'm2', type: 'Manifest', label: { en: ['M2'] }, items: [] }
      ]
    };

    const updated = removeManifestFromCollection(collection, 'm1');
    expect(updated.items).toHaveLength(1);
    expect(updated.items?.[0].id).toBe('m2');
  });

  it('should handle collection without items', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: undefined
    };

    const updated = removeManifestFromCollection(collection, 'm1');
    expect(updated.items).toBeUndefined();
  });

  it('should not mutate original collection', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: [{ id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] }]
    };

    removeManifestFromCollection(collection, 'm1');
    expect(collection.items).toHaveLength(1);
  });
});

// ============================================================================
// Manifest Operations Tests
// ============================================================================

describe('getManifestCanvases', () => {
  it('should return canvases from manifest', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: [
        { id: 'c1', type: 'Canvas', label: { en: ['C1'] }, width: 100, height: 100, items: [] },
        { id: 'c2', type: 'Canvas', label: { en: ['C2'] }, width: 100, height: 100, items: [] }
      ]
    };

    const canvases = getManifestCanvases(manifest);
    expect(canvases).toHaveLength(2);
  });

  it('should return empty array for manifest without items', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: undefined as any
    };

    const canvases = getManifestCanvases(manifest);
    expect(canvases).toEqual([]);
  });
});

describe('manifestContainsCanvas', () => {
  it('should return true when manifest contains canvas', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: [{ id: 'c1', type: 'Canvas', label: { en: ['C1'] }, width: 100, height: 100, items: [] }]
    };

    expect(manifestContainsCanvas(manifest, 'c1')).toBe(true);
  });

  it('should return false when manifest does not contain canvas', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: [{ id: 'c1', type: 'Canvas', label: { en: ['C1'] }, width: 100, height: 100, items: [] }]
    };

    expect(manifestContainsCanvas(manifest, 'c2')).toBe(false);
  });
});

describe('addCanvasToManifest', () => {
  it('should add canvas to end of manifest', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: []
    };
    const canvas: IIIFCanvas = {
      id: 'c1',
      type: 'Canvas',
      label: { en: ['Canvas'] },
      width: 100,
      height: 100,
      items: []
    };

    const updated = addCanvasToManifest(manifest, canvas);
    expect(updated.items).toHaveLength(1);
    expect(updated.items?.[0].id).toBe('c1');
  });

  it('should insert canvas at specific index', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: [
        { id: 'c1', type: 'Canvas', label: { en: ['C1'] }, width: 100, height: 100, items: [] }
      ]
    };
    const canvas: IIIFCanvas = {
      id: 'c2',
      type: 'Canvas',
      label: { en: ['C2'] },
      width: 100,
      height: 100,
      items: []
    };

    const updated = addCanvasToManifest(manifest, canvas, 0);
    expect(updated.items?.[0].id).toBe('c2');
    expect(updated.items?.[1].id).toBe('c1');
  });
});

describe('removeCanvasFromManifest', () => {
  it('should remove canvas from manifest', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: [
        { id: 'c1', type: 'Canvas', label: { en: ['C1'] }, width: 100, height: 100, items: [] },
        { id: 'c2', type: 'Canvas', label: { en: ['C2'] }, width: 100, height: 100, items: [] }
      ]
    };

    const updated = removeCanvasFromManifest(manifest, 'c1');
    expect(updated.items).toHaveLength(1);
    expect(updated.items?.[0].id).toBe('c2');
  });
});

describe('reorderManifestCanvases', () => {
  it('should reorder canvases according to new order', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: [
        { id: 'c1', type: 'Canvas', label: { en: ['C1'] }, width: 100, height: 100, items: [] },
        { id: 'c2', type: 'Canvas', label: { en: ['C2'] }, width: 100, height: 100, items: [] },
        { id: 'c3', type: 'Canvas', label: { en: ['C3'] }, width: 100, height: 100, items: [] }
      ]
    };

    const updated = reorderManifestCanvases(manifest, ['c3', 'c1', 'c2']);
    expect(updated.items?.[0].id).toBe('c3');
    expect(updated.items?.[1].id).toBe('c1');
    expect(updated.items?.[2].id).toBe('c2');
  });

  it('should handle unknown canvas IDs gracefully', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: [
        { id: 'c1', type: 'Canvas', label: { en: ['C1'] }, width: 100, height: 100, items: [] }
      ]
    };

    const updated = reorderManifestCanvases(manifest, ['c1', 'c2']);
    expect(updated.items).toHaveLength(1);
  });
});

// ============================================================================
// Tree Traversal Tests
// ============================================================================

describe('findAllOfType', () => {
  it('should find all items of specified type', () => {
    const root: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: [
        {
          id: 'm1',
          type: 'Manifest',
          label: { en: ['M1'] },
          items: [
            { id: 'c1', type: 'Canvas', label: { en: ['Canvas1'] }, width: 100, height: 100, items: [] },
            { id: 'c2', type: 'Canvas', label: { en: ['Canvas2'] }, width: 100, height: 100, items: [] }
          ]
        }
      ]
    };

    const canvases = findAllOfType<IIIFCanvas>(root, 'Canvas');
    expect(canvases).toHaveLength(2);
  });

  it('should find root item if matching type', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: []
    };

    const collections = findAllOfType<IIIFCollection>(collection, 'Collection');
    expect(collections).toHaveLength(1);
    expect(collections[0].id).toBe('c1');
  });

  it('should return empty array when no matches', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: []
    };

    const collections = findAllOfType<IIIFCollection>(manifest, 'Collection');
    expect(collections).toEqual([]);
  });
});

describe('findNodeById', () => {
  it('should find node by ID in tree', () => {
    const root: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: [
        {
          id: 'm1',
          type: 'Manifest',
          label: { en: ['M1'] },
          items: [
            { id: 'canvas1', type: 'Canvas', label: { en: ['Canvas'] }, width: 100, height: 100, items: [] }
          ]
        }
      ]
    };

    const found = findNodeById(root, 'canvas1');
    expect(found).toBeDefined();
    expect(found?.type).toBe('Canvas');
  });

  it('should return root if ID matches', () => {
    const root: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: []
    };

    const found = findNodeById(root, 'c1');
    expect(found).toBe(root);
  });

  it('should return null when not found', () => {
    const root: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: []
    };

    const found = findNodeById(root, 'nonexistent');
    expect(found).toBeNull();
  });
});

describe('getPathToNode', () => {
  it('should return path from root to target', () => {
    const canvas: IIIFCanvas = {
      id: 'canvas1',
      type: 'Canvas',
      label: { en: ['Canvas'] },
      width: 100,
      height: 100,
      items: []
    };
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['M1'] },
      items: [canvas]
    };
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: [manifest]
    };

    const path = getPathToNode(collection, 'canvas1');
    expect(path).toHaveLength(3);
    expect(path[0].id).toBe('c1');
    expect(path[1].id).toBe('m1');
    expect(path[2].id).toBe('canvas1');
  });

  it('should return empty array when target not found', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: []
    };

    const path = getPathToNode(collection, 'nonexistent');
    expect(path).toEqual([]);
  });
});

describe('findCanvasParent', () => {
  it('should find parent manifest of canvas', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['M1'] },
      items: [
        { id: 'c1', type: 'Canvas', label: { en: ['Canvas'] }, width: 100, height: 100, items: [] }
      ]
    };
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: [manifest]
    };

    const parent = findCanvasParent(collection, 'c1');
    expect(parent).toBeDefined();
    expect(parent?.id).toBe('m1');
  });

  it('should return null when canvas not found', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: []
    };

    const parent = findCanvasParent(collection, 'nonexistent');
    expect(parent).toBeNull();
  });
});

describe('findCollectionsContaining', () => {
  it('should find collections containing resource', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Collection'] },
      items: [
        { id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] }
      ]
    };

    const collections = findCollectionsContaining(collection, 'm1');
    expect(collections).toHaveLength(1);
    expect(collections[0].id).toBe('c1');
  });

  it('should search nested collections', () => {
    const nested: IIIFCollection = {
      id: 'c2',
      type: 'Collection',
      label: { en: ['Nested'] },
      items: [{ id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] }]
    };
    const root: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: [nested]
    };

    const collections = findCollectionsContaining(root, 'm1');
    expect(collections).toHaveLength(1);
    expect(collections[0].id).toBe('c2');
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('isValidChildType', () => {
  it('should validate Collection children', () => {
    expect(isValidChildType('Collection', 'Manifest')).toBe(true);
    expect(isValidChildType('Collection', 'Collection')).toBe(true);
    expect(isValidChildType('Collection', 'Canvas')).toBe(false);
  });

  it('should validate Manifest children', () => {
    expect(isValidChildType('Manifest', 'Canvas')).toBe(true);
    expect(isValidChildType('Manifest', 'Manifest')).toBe(false);
  });

  it('should validate Canvas children', () => {
    expect(isValidChildType('Canvas', 'AnnotationPage')).toBe(true);
    expect(isValidChildType('Canvas', 'Canvas')).toBe(false);
  });

  it('should validate Range children', () => {
    expect(isValidChildType('Range', 'Range')).toBe(true);
    expect(isValidChildType('Range', 'Canvas')).toBe(true);
    expect(isValidChildType('Range', 'Manifest')).toBe(false);
  });

  it('should return false for unknown parent types', () => {
    expect(isValidChildType('Unknown', 'Manifest')).toBe(false);
  });
});

describe('getValidChildTypes', () => {
  it('should return valid children for Collection', () => {
    const children = getValidChildTypes('Collection');
    expect(children).toContain('Collection');
    expect(children).toContain('Manifest');
  });

  it('should return valid children for Manifest', () => {
    const children = getValidChildTypes('Manifest');
    expect(children).toEqual(['Canvas']);
  });

  it('should return valid children for Range', () => {
    const children = getValidChildTypes('Range');
    expect(children).toEqual(['Range']);
  });

  it('should return empty array for unknown type', () => {
    const children = getValidChildTypes('Unknown');
    expect(children).toEqual([]);
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe('countResourcesByType', () => {
  it('should count resources by type', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: [
        {
          id: 'm1',
          type: 'Manifest',
          label: { en: ['M1'] },
          items: [
            { id: 'canvas1', type: 'Canvas', label: { en: ['C1'] }, width: 100, height: 100, items: [] }
          ]
        }
      ]
    };

    const counts = countResourcesByType(collection);
    expect(counts['Collection']).toBe(1);
    expect(counts['Manifest']).toBe(1);
    expect(counts['Canvas']).toBe(1);
  });

  it('should handle empty tree', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: []
    };

    const counts = countResourcesByType(collection);
    expect(counts['Collection']).toBe(1);
    expect(Object.keys(counts)).toHaveLength(1);
  });
});

describe('getTreeDepth', () => {
  it('should calculate tree depth correctly', () => {
    const canvas: IIIFCanvas = {
      id: 'canvas1',
      type: 'Canvas',
      label: { en: ['Canvas'] },
      width: 100,
      height: 100,
      items: []
    };
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['M1'] },
      items: [canvas]
    };
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: [manifest]
    };

    const depth = getTreeDepth(collection);
    expect(depth).toBe(3); // Collection -> Manifest -> Canvas
  });

  it('should return 1 for leaf node', () => {
    const canvas: IIIFCanvas = {
      id: 'canvas1',
      type: 'Canvas',
      label: { en: ['Canvas'] },
      width: 100,
      height: 100,
      items: []
    };

    const depth = getTreeDepth(canvas);
    expect(depth).toBe(1);
  });
});

// ============================================================================
// Reference Tracking Tests
// ============================================================================

describe('buildReferenceMap', () => {
  it('should build reference map from Collection to Manifests', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: [
        { id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] }
      ]
    };

    const refMap = buildReferenceMap(collection);
    expect(refMap.get('m1')).toContain('c1');
  });

  it('should handle nested collections', () => {
    const nested: IIIFCollection = {
      id: 'c2',
      type: 'Collection',
      label: { en: ['Nested'] },
      items: [{ id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] }]
    };
    const root: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: [nested]
    };

    const refMap = buildReferenceMap(root);
    expect(refMap.get('m1')).toContain('c2');
    expect(refMap.get('c2')).toContain('c1');
  });
});

describe('getReferencingCollections', () => {
  it('should return collections that reference target', () => {
    const collection: IIIFCollection = {
      id: 'c1',
      type: 'Collection',
      label: { en: ['Root'] },
      items: [
        { id: 'm1', type: 'Manifest', label: { en: ['M1'] }, items: [] }
      ]
    };

    const collections = getReferencingCollections(collection, 'm1');
    expect(collections).toHaveLength(1);
    expect(collections[0].id).toBe('c1');
  });
});

// ============================================================================
// ID Generation Tests
// ============================================================================

describe('generateId', () => {
  it('should generate Manifest ID', () => {
    const id = generateId('Manifest', 'https://example.com');
    expect(id).toContain('https://example.com');
    expect(id).toContain('manifest');
  });

  it('should generate Collection ID', () => {
    const id = generateId('Collection', 'https://example.com');
    expect(id).toContain('https://example.com');
    expect(id).toContain('collection');
  });

  it('should generate Range ID', () => {
    const id = generateId('Range', 'https://example.com');
    expect(id).toContain('https://example.com');
    expect(id).toContain('range');
  });

  it('should use default base URL when not provided', () => {
    const id = generateId('Manifest');
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });
});

// ============================================================================
// Range Helper Tests
// ============================================================================

describe('createRange', () => {
  it('should create range with label and canvas IDs', () => {
    const range = createRange('Chapter 1', ['canvas1', 'canvas2']);
    
    expect(range.type).toBe('Range');
    expect(range.label).toEqual({ none: ['Chapter 1'] });
    expect(range.items).toHaveLength(2);
    expect(range.items?.[0]).toEqual({ id: 'canvas1', type: 'Canvas' });
  });

  it('should use provided ID', () => {
    const range = createRange('Chapter', ['canvas1'], { id: 'custom-id' });
    expect(range.id).toBe('custom-id');
  });

  it('should include behavior when provided', () => {
    const range = createRange('Chapter', ['canvas1'], { behavior: ['sequence'] });
    expect(range.behavior).toContain('sequence');
  });
});

describe('createNestedRange', () => {
  it('should create range with child ranges', () => {
    const child1 = createRange('Section 1', ['canvas1']);
    const child2 = createRange('Section 2', ['canvas2']);
    
    const parent = createNestedRange('Chapter', [child1, child2]);
    
    expect(parent.type).toBe('Range');
    expect(parent.label).toEqual({ none: ['Chapter'] });
    expect(parent.items).toHaveLength(2);
  });
});

describe('addRangeToManifest', () => {
  it('should add range to manifest structures', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: []
    };
    const range = createRange('Chapter', ['canvas1']);

    const updated = addRangeToManifest(manifest, range);
    expect(updated.structures).toHaveLength(1);
    expect(updated.structures?.[0].label).toEqual({ none: ['Chapter'] });
  });

  it('should append to existing structures', () => {
    const existingRange = createRange('Existing', ['canvas1']);
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: [],
      structures: [existingRange]
    };
    const newRange = createRange('New', ['canvas2']);

    const updated = addRangeToManifest(manifest, newRange);
    expect(updated.structures).toHaveLength(2);
  });
});

describe('getManifestRanges', () => {
  it('should return ranges from manifest', () => {
    const range = createRange('Chapter', ['canvas1']);
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: [],
      structures: [range]
    };

    const ranges = getManifestRanges(manifest);
    expect(ranges).toHaveLength(1);
  });

  it('should return empty array when no structures', () => {
    const manifest: IIIFManifest = {
      id: 'm1',
      type: 'Manifest',
      label: { en: ['Manifest'] },
      items: []
    };

    const ranges = getManifestRanges(manifest);
    expect(ranges).toEqual([]);
  });
});

describe('flattenRangeCanvasIds', () => {
  it('should flatten canvas IDs from range', () => {
    const range: IIIFRange = {
      id: 'r1',
      type: 'Range',
      label: { en: ['Range'] },
      items: [
        { id: 'canvas1', type: 'Canvas' },
        { id: 'canvas2', type: 'Canvas' }
      ]
    };

    const ids = flattenRangeCanvasIds(range);
    expect(ids).toEqual(['canvas1', 'canvas2']);
  });

  it('should flatten nested ranges', () => {
    const childRange: IIIFRange = {
      id: 'r2',
      type: 'Range',
      label: { en: ['Child'] },
      items: [
        { id: 'canvas2', type: 'Canvas' }
      ]
    };
    const parentRange: IIIFRange = {
      id: 'r1',
      type: 'Range',
      label: { en: ['Parent'] },
      items: [
        { id: 'canvas1', type: 'Canvas' },
        childRange
      ]
    };

    const ids = flattenRangeCanvasIds(parentRange);
    expect(ids).toContain('canvas1');
    expect(ids).toContain('canvas2');
  });
});
