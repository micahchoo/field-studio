/**
 * IIIF Hierarchy Operations
 * Organism - depends on traversal
 *
 * Note: Uses findAllOfTypeSimple instead of the comprehensive findAllOfType
 * from traversal.ts for performance when only items array is needed.
 */

import type { IIIFItem } from '../../../types';
import { findNodeById, getPathToNode } from './traversal';

// ============================================================================
// Relationship Types
// ============================================================================

export type IIIFRelationshipType = 'reference' | 'ownership' | 'none';

/**
 * Determine the relationship type between parent and child
 */
export function getRelationshipType(
  parentType: string | null,
  childType: string
): IIIFRelationshipType {
  if (!parentType) return 'none';

  // Collections REFERENCE Manifests and other Collections
  if (parentType === 'Collection') {
    if (childType === 'Manifest' || childType === 'Collection') {
      return 'reference';
    }
  }

  // Manifests OWN Canvases
  if (parentType === 'Manifest' && childType === 'Canvas') {
    return 'ownership';
  }

  // Canvases OWN AnnotationPages
  if (parentType === 'Canvas' && childType === 'AnnotationPage') {
    return 'ownership';
  }

  // AnnotationPages OWN Annotations
  if (parentType === 'AnnotationPage' && childType === 'Annotation') {
    return 'ownership';
  }

  // Ranges REFERENCE Canvases
  if (parentType === 'Range') {
    if (childType === 'Canvas' || childType === 'Range') {
      return 'reference';
    }
  }

  return 'ownership';
}

/**
 * Check if a resource type can have multiple parents
 */
export function canHaveMultipleParents(type: string): boolean {
  return type === 'Manifest' || type === 'Canvas';
}

/**
 * Check if a resource type is standalone
 */
export function isStandaloneType(type: string): boolean {
  return type === 'Manifest' || type === 'Collection';
}

// ============================================================================
// Collection Operations
// ============================================================================

interface CollectionLike {
  id: string;
  type: 'Collection';
  items?: IIIFItem[];
}

interface ManifestLike {
  id: string;
  type: 'Manifest';
}

/**
 * Get all Manifests referenced by a Collection (direct children only)
 */
export function getCollectionManifests(
  collection: CollectionLike
): ManifestLike[] {
  if (!collection.items) return [];
  return collection.items.filter(
    (item): item is ManifestLike => item.type === 'Manifest'
  );
}

/**
 * Get all nested Collections within a Collection
 */
export function getNestedCollections(
  collection: CollectionLike
): CollectionLike[] {
  if (!collection.items) return [];
  return collection.items.filter(
    (item): item is CollectionLike => item.type === 'Collection'
  );
}

/**
 * Check if a Collection contains a specific Manifest
 */
export function collectionContainsManifest(
  collection: CollectionLike,
  manifestId: string
): boolean {
  if (!collection.items) return false;
  return collection.items.some((item) => item.id === manifestId);
}

/**
 * Add a Manifest to a Collection
 */
export function addManifestToCollection(
  collection: CollectionLike,
  manifest: ManifestLike
): CollectionLike {
  const items = collection.items || [];

  if (items.some((item) => item.id === manifest.id)) {
    return collection;
  }

  return {
    ...collection,
    items: [...items, manifest],
  };
}

/**
 * Remove a Manifest reference from a Collection
 */
export function removeManifestFromCollection(
  collection: CollectionLike,
  manifestId: string
): CollectionLike {
  if (!collection.items) return collection;

  return {
    ...collection,
    items: collection.items.filter((item) => item.id !== manifestId),
  };
}

// ============================================================================
// Manifest Operations
// ============================================================================

interface ManifestWithItems {
  id: string;
  type: 'Manifest';
  items?: CanvasLike[];
}

interface CanvasLike {
  id: string;
  type: 'Canvas';
}

/**
 * Get all Canvases owned by a Manifest
 */
export function getManifestCanvases(
  manifest: ManifestWithItems
): CanvasLike[] {
  return manifest.items || [];
}

/**
 * Check if a Manifest contains a specific Canvas
 */
export function manifestContainsCanvas(
  manifest: ManifestWithItems,
  canvasId: string
): boolean {
  if (!manifest.items) return false;
  return manifest.items.some((canvas) => canvas.id === canvasId);
}

/**
 * Add a Canvas to a Manifest
 */
export function addCanvasToManifest(
  manifest: ManifestWithItems,
  canvas: CanvasLike,
  index?: number
): ManifestWithItems {
  const items = manifest.items || [];

  if (typeof index === 'number') {
    const newItems = [...items];
    newItems.splice(index, 0, canvas);
    return { ...manifest, items: newItems };
  }

  return { ...manifest, items: [...items, canvas] };
}

/**
 * Remove a Canvas from a Manifest
 */
export function removeCanvasFromManifest(
  manifest: ManifestWithItems,
  canvasId: string
): ManifestWithItems {
  if (!manifest.items) return manifest;

  return {
    ...manifest,
    items: manifest.items.filter((canvas) => canvas.id !== canvasId),
  };
}

/**
 * Reorder Canvases in a Manifest
 */
export function reorderManifestCanvases(
  manifest: ManifestWithItems,
  orderedIds: string[]
): ManifestWithItems {
  if (!manifest.items) return manifest;

  const itemMap = new Map(manifest.items.map((c) => [c.id, c]));
  const reordered = orderedIds
    .map((id) => itemMap.get(id))
    .filter((c): c is CanvasLike => c !== undefined);

  return { ...manifest, items: reordered };
}

// ============================================================================
// Simple Tree Search (items array only - faster than full traversal)
// ============================================================================

/**
 * Find all items of a specific type (simple version - items array only)
 * Use this when you only need the items property, not annotations/structures
 */
export function findAllOfTypeSimple<T extends IIIFItem = IIIFItem>(
  root: IIIFItem,
  type: string
): T[] {
  const results: T[] = [];

  const traverse = (node: IIIFItem) => {
    if (node.type === type) {
      results.push(node as T);
    }
    const items = (node as Record<string, unknown>).items as
      | IIIFItem[]
      | undefined;
    if (items && Array.isArray(items)) {
      items.forEach(traverse);
    }
  };

  traverse(root);
  return results;
}

// ============================================================================
// Cross-Collection Reference Tracking
// ============================================================================

export interface ReferenceMap {
  manifestToCollections: Map<string, string[]>;
  collectionToManifests: Map<string, string[]>;
}

/**
 * Build a map of references between Collections and Manifests
 */
export function buildReferenceMap(
  collections: CollectionLike[]
): ReferenceMap {
  const manifestToCollections = new Map<string, string[]>();
  const collectionToManifests = new Map<string, string[]>();

  for (const collection of collections) {
    const manifestIds: string[] = [];

    const processCollection = (col: CollectionLike) => {
      const manifests = getCollectionManifests(col);
      for (const manifest of manifests) {
        manifestIds.push(manifest.id);

        const collections = manifestToCollections.get(manifest.id) || [];
        collections.push(col.id);
        manifestToCollections.set(manifest.id, collections);
      }

      const nested = getNestedCollections(col);
      for (const child of nested) {
        processCollection(child);
      }
    };

    processCollection(collection);
    collectionToManifests.set(collection.id, manifestIds);
  }

  return { manifestToCollections, collectionToManifests };
}

/**
 * Find Collections that reference a specific Manifest
 */
export function getReferencingCollections(
  manifestId: string,
  referenceMap: ReferenceMap
): string[] {
  return referenceMap.manifestToCollections.get(manifestId) || [];
}

// ============================================================================
// Range Operations
// ============================================================================

interface RangeLike {
  id: string;
  type: 'Range';
  items?: (RangeLike | CanvasLike | { id: string; type: string })[];
}

/**
 * Create a new Range
 */
export function createRange(
  id: string,
  label: string,
  options?: { items?: (RangeLike | CanvasLike)[] }
): RangeLike {
  return {
    id,
    type: 'Range',
    items: options?.items || [],
  };
}

/**
 * Create a nested Range structure
 */
export function createNestedRange(
  ranges: Array<{ id: string; label: string }>
): RangeLike | null {
  if (ranges.length === 0) return null;

  const [first, ...rest] = ranges;
  const root = createRange(first.id, first.label);

  let current = root;
  for (const range of rest) {
    const child = createRange(range.id, range.label);
    current.items = current.items || [];
    current.items.push(child);
    current = child;
  }

  return root;
}

/**
 * Add a Range to a Manifest's structures
 */
export function addRangeToManifest(
  manifest: ManifestWithItems & { structures?: RangeLike[] },
  range: RangeLike
): ManifestWithItems & { structures: RangeLike[] } {
  const structures = manifest.structures || [];
  return { ...manifest, structures: [...structures, range] };
}

/**
 * Get all Ranges from a Manifest
 */
export function getManifestRanges(
  manifest: ManifestWithItems & { structures?: RangeLike[] }
): RangeLike[] {
  return manifest.structures || [];
}

/**
 * Flatten Range to get all Canvas IDs
 */
export function flattenRangeCanvasIds(range: RangeLike): string[] {
  const ids: string[] = [];

  const process = (r: RangeLike) => {
    if (!r.items) return;

    for (const item of r.items) {
      if (item.type === 'Canvas') {
        ids.push(item.id);
      } else if (item.type === 'Range') {
        process(item as RangeLike);
      }
    }
  };

  process(range);
  return ids;
}

// ============================================================================
// Tree Statistics
// ============================================================================

interface Countable {
  items?: Countable[];
  [key: string]: unknown;
}

/**
 * Count resources by type (simple version)
 */
export function countResourcesByType(
  root: Countable
): Record<string, number> {
  const counts: Record<string, number> = {};

  const traverse = (node: Countable) => {
    const type = (node as { type: string }).type;
    if (type) {
      counts[type] = (counts[type] || 0) + 1;
    }
    if (node.items) {
      node.items.forEach(traverse);
    }
  };

  traverse(root);
  return counts;
}

/**
 * Get tree depth (simple version)
 */
export function getTreeDepth(root: Countable): number {
  let maxDepth = 0;

  const traverse = (node: Countable, depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    if (node.items) {
      node.items.forEach((child) => traverse(child, depth + 1));
    }
  };

  traverse(root, 0);
  return maxDepth;
}

// Re-export from traversal for convenience
export { findNodeById, getPathToNode };

// ============================================================================
// Additional Tree Functions (from legacy iiifHierarchy.ts)
// ============================================================================

interface CollectionWithItems {
  id: string;
  type: 'Collection';
  items?: IIIFItem[];
}

/**
 * Find all Collections that contain a specific resource
 */
export function findCollectionsContaining(
  root: IIIFItem,
  targetId: string
): CollectionWithItems[] {
  const results: CollectionWithItems[] = [];

  const traverse = (node: IIIFItem) => {
    if (node.type === 'Collection') {
      const col = node as CollectionWithItems;
      const hasTarget = col.items?.some((item) => item.id === targetId);
      if (hasTarget) {
        results.push(col);
      }
    }
    const items = (node as Record<string, IIIFItem[]>).items || [];
    items.forEach(traverse);
  };

  traverse(root);
  return results;
}

interface ManifestWithItems {
  id: string;
  type: 'Manifest';
  items?: IIIFItem[];
}

/**
 * Find the parent Manifest of a Canvas
 */
export function findCanvasParent(
  root: IIIFItem,
  canvasId: string
): ManifestWithItems | null {
  const traverse = (node: IIIFItem): ManifestWithItems | null => {
    if (node.type === 'Manifest') {
      const manifest = node as ManifestWithItems;
      if (manifest.items?.some((canvas) => canvas.id === canvasId)) {
        return manifest;
      }
    }

    const items = (node as Record<string, IIIFItem[]>).items || [];
    for (const child of items) {
      const found = traverse(child);
      if (found) return found;
    }

    return null;
  };

  return traverse(root);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if adding a child to a parent is valid according to IIIF spec
 */
export function isValidChildType(
  parentType: string,
  childType: string
): boolean {
  const validChildren: Record<string, string[]> = {
    Collection: ['Collection', 'Manifest'],
    Manifest: ['Canvas'],
    Canvas: ['AnnotationPage'],
    AnnotationPage: ['Annotation'],
    Range: ['Range', 'Canvas'],
  };

  return validChildren[parentType]?.includes(childType) || false;
}

/**
 * Get the valid child types for a parent type
 */
export function getValidChildTypes(parentType: string): string[] {
  const validChildren: Record<string, string[]> = {
    Collection: ['Collection', 'Manifest'],
    Manifest: ['Canvas'],
    Canvas: ['AnnotationPage'],
    AnnotationPage: ['Annotation'],
    Range: ['Range'],
  };

  return validChildren[parentType] || [];
}
