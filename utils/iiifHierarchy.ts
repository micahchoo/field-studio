/**
 * IIIF Hierarchy Utilities
 *
 * Centralized logic for IIIF Presentation API 3.0 hierarchy relationships.
 * This module ensures consistent handling of the non-hierarchical IIIF model
 * throughout the application.
 *
 * Key IIIF 3.0 Concepts:
 * - Collections REFERENCE Manifests (many-to-many, pointers)
 * - Manifests OWN Canvases (one-to-many, exclusive)
 * - Same Manifest can appear in multiple Collections
 * - Collections are "cheap overlays" - curated lists of pointers
 * - Manifests are "atomic publishing units" - standalone shareable objects
 *
 * Relationship Types:
 * - Collection → Manifest: REFERENCE (non-hierarchical, many-to-many)
 * - Collection → Collection: REFERENCE (nested collections)
 * - Manifest → Canvas: OWNERSHIP (hierarchical, exclusive)
 * - Canvas → AnnotationPage: OWNERSHIP (hierarchical)
 * - Range → Canvas: REFERENCE (structural overlay, can reference partial canvases)
 */

import {
  IIIFItem,
  IIIFCollection,
  IIIFManifest,
  IIIFCanvas,
  IIIFRange,
  isCollection,
  isManifest,
  isCanvas,
  isRange
} from '../types';
import { IIIF_CONFIG } from '../constants';

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

  // Collections REFERENCE Manifests and other Collections (many-to-many)
  if (parentType === 'Collection') {
    if (childType === 'Manifest' || childType === 'Collection') {
      return 'reference';
    }
  }

  // Manifests OWN Canvases (exclusive, hierarchical)
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

  // Ranges REFERENCE Canvases (structural overlay)
  if (parentType === 'Range') {
    if (childType === 'Canvas' || childType === 'Range') {
      return 'reference';
    }
  }

  return 'ownership'; // Default to ownership for unknown relationships
}

/**
 * Check if a resource type can have multiple parents
 */
export function canHaveMultipleParents(type: string): boolean {
  // Manifests can be in multiple Collections
  // Canvases can be referenced by multiple Ranges
  return type === 'Manifest' || type === 'Canvas';
}

/**
 * Check if a resource type is standalone (can exist without parent)
 */
export function isStandaloneType(type: string): boolean {
  // Manifests and Collections can exist standalone
  return type === 'Manifest' || type === 'Collection';
}

// ============================================================================
// Collection Operations
// ============================================================================

/**
 * Get all Manifests referenced by a Collection (direct children only)
 */
export function getCollectionManifests(collection: IIIFCollection): IIIFManifest[] {
  if (!collection.items) return [];
  return collection.items.filter(isManifest);
}

/**
 * Get all nested Collections within a Collection
 */
export function getNestedCollections(collection: IIIFCollection): IIIFCollection[] {
  if (!collection.items) return [];
  return collection.items.filter(isCollection);
}

/**
 * Check if a Collection contains a specific Manifest
 */
export function collectionContainsManifest(
  collection: IIIFCollection,
  manifestId: string
): boolean {
  if (!collection.items) return false;
  return collection.items.some(item => item.id === manifestId);
}

/**
 * Add a Manifest to a Collection (creates a reference)
 * Note: In IIIF 3.0, this is adding a REFERENCE, not moving the Manifest
 */
export function addManifestToCollection(
  collection: IIIFCollection,
  manifest: IIIFManifest
): IIIFCollection {
  const items = collection.items || [];

  // Check if already present
  if (items.some(item => item.id === manifest.id)) {
    return collection; // Already referenced
  }

  return {
    ...collection,
    items: [...items, manifest]
  };
}

/**
 * Remove a Manifest reference from a Collection
 * Note: This removes the REFERENCE, not the Manifest itself
 */
export function removeManifestFromCollection(
  collection: IIIFCollection,
  manifestId: string
): IIIFCollection {
  if (!collection.items) return collection;

  return {
    ...collection,
    items: collection.items.filter(item => item.id !== manifestId)
  };
}

// ============================================================================
// Manifest Operations
// ============================================================================

/**
 * Get all Canvases owned by a Manifest
 */
export function getManifestCanvases(manifest: IIIFManifest): IIIFCanvas[] {
  return manifest.items || [];
}

/**
 * Check if a Manifest contains a specific Canvas
 */
export function manifestContainsCanvas(
  manifest: IIIFManifest,
  canvasId: string
): boolean {
  if (!manifest.items) return false;
  return manifest.items.some(canvas => canvas.id === canvasId);
}

/**
 * Add a Canvas to a Manifest (ownership)
 */
export function addCanvasToManifest(
  manifest: IIIFManifest,
  canvas: IIIFCanvas,
  index?: number
): IIIFManifest {
  const items = manifest.items || [];

  if (typeof index === 'number') {
    const newItems = [...items];
    newItems.splice(index, 0, canvas);
    return { ...manifest, items: newItems };
  }

  return {
    ...manifest,
    items: [...items, canvas]
  };
}

/**
 * Remove a Canvas from a Manifest
 */
export function removeCanvasFromManifest(
  manifest: IIIFManifest,
  canvasId: string
): IIIFManifest {
  if (!manifest.items) return manifest;

  return {
    ...manifest,
    items: manifest.items.filter(canvas => canvas.id !== canvasId)
  };
}

/**
 * Reorder Canvases within a Manifest
 */
export function reorderManifestCanvases(
  manifest: IIIFManifest,
  newOrder: string[]
): IIIFManifest {
  if (!manifest.items) return manifest;

  const canvasMap = new Map(manifest.items.map(c => [c.id, c]));
  const reordered = newOrder
    .map(id => canvasMap.get(id))
    .filter((c): c is IIIFCanvas => c !== undefined);

  return {
    ...manifest,
    items: reordered
  };
}

// ============================================================================
// Tree Traversal
// ============================================================================

/**
 * Find all items of a specific type in the IIIF tree
 */
export function findAllOfType<T extends IIIFItem>(
  root: IIIFItem,
  type: string
): T[] {
  const results: T[] = [];

  const traverse = (node: IIIFItem) => {
    if (node.type === type) {
      results.push(node as T);
    }
    const items = (node as any).items || [];
    items.forEach(traverse);
  };

  traverse(root);
  return results;
}

/**
 * Find all Collections that contain a specific resource
 */
export function findCollectionsContaining(
  root: IIIFItem,
  targetId: string
): IIIFCollection[] {
  const results: IIIFCollection[] = [];

  const traverse = (node: IIIFItem) => {
    if (isCollection(node)) {
      const hasTarget = node.items?.some(item => item.id === targetId);
      if (hasTarget) {
        results.push(node);
      }
    }
    const items = (node as any).items || [];
    items.forEach(traverse);
  };

  traverse(root);
  return results;
}

/**
 * Find the parent Manifest of a Canvas
 */
export function findCanvasParent(
  root: IIIFItem,
  canvasId: string
): IIIFManifest | null {
  const traverse = (node: IIIFItem): IIIFManifest | null => {
    if (isManifest(node)) {
      if (node.items?.some(canvas => canvas.id === canvasId)) {
        return node;
      }
    }

    const items = (node as any).items || [];
    for (const child of items) {
      const found = traverse(child);
      if (found) return found;
    }

    return null;
  };

  return traverse(root);
}

/**
 * Find a node by ID in the IIIF tree
 */
export function findNodeById(root: IIIFItem, id: string): IIIFItem | null {
  if (root.id === id) return root;

  const items = (root as any).items || (root as any).annotations || [];
  for (const child of items) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Get the path from root to a node
 */
export function getPathToNode(root: IIIFItem, targetId: string): IIIFItem[] {
  const path: IIIFItem[] = [];

  const traverse = (node: IIIFItem, currentPath: IIIFItem[]): boolean => {
    const newPath = [...currentPath, node];

    if (node.id === targetId) {
      path.push(...newPath);
      return true;
    }

    const items = (node as any).items || [];
    for (const child of items) {
      if (traverse(child, newPath)) {
        return true;
      }
    }

    return false;
  };

  traverse(root, []);
  return path;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if adding a child to a parent is valid according to IIIF spec
 */
export function isValidChildType(parentType: string, childType: string): boolean {
  const validChildren: Record<string, string[]> = {
    Collection: ['Collection', 'Manifest'],
    Manifest: ['Canvas'],
    Canvas: ['AnnotationPage'],
    AnnotationPage: ['Annotation'],
    Range: ['Range', 'Canvas'] // Ranges reference, don't own
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
    Range: ['Range']
  };

  return validChildren[parentType] || [];
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Count all resources by type in the tree
 */
export function countResourcesByType(root: IIIFItem): Record<string, number> {
  const counts: Record<string, number> = {};

  const traverse = (node: IIIFItem) => {
    counts[node.type] = (counts[node.type] || 0) + 1;
    const items = (node as any).items || [];
    items.forEach(traverse);
  };

  traverse(root);
  return counts;
}

/**
 * Get tree depth
 */
export function getTreeDepth(root: IIIFItem): number {
  const getDepth = (node: IIIFItem, depth: number): number => {
    const items = (node as any).items || [];
    if (items.length === 0) return depth;
    return Math.max(...items.map((child: IIIFItem) => getDepth(child, depth + 1)));
  };

  return getDepth(root, 1);
}

// ============================================================================
// Cross-Collection Reference Tracking
// ============================================================================

/**
 * Build a map of resource IDs to the Collections that reference them.
 * This enables showing "Referenced in N collections" badges and navigation.
 *
 * @param root - The root IIIF item to traverse
 * @returns Map<resourceId, collectionIds[]>
 */
export function buildReferenceMap(root: IIIFItem): Map<string, string[]> {
  const refs = new Map<string, string[]>();

  const traverse = (item: IIIFItem, parentCollectionId?: string) => {
    // Track references from Collections to their children
    if (parentCollectionId) {
      if (isCollection(item) || isManifest(item)) {
        const existing = refs.get(item.id) || [];
        if (!existing.includes(parentCollectionId)) {
          refs.set(item.id, [...existing, parentCollectionId]);
        }
      }
    }

    // Recurse into children
    const items = (item as any).items || [];
    items.forEach((child: IIIFItem) => traverse(
      child,
      isCollection(item) ? item.id : parentCollectionId
    ));
  };

  traverse(root);
  return refs;
}

/**
 * Get all Collections that reference a given resource ID
 */
export function getReferencingCollections(
  root: IIIFItem,
  targetId: string
): IIIFCollection[] {
  const refMap = buildReferenceMap(root);
  const collectionIds = refMap.get(targetId) || [];

  return collectionIds
    .map(id => findNodeById(root, id))
    .filter((node): node is IIIFCollection => node !== null && isCollection(node));
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a standard IIIF resource ID using centralized configuration
 */
export function generateId(type: 'Manifest' | 'Collection' | 'Range', baseUrl?: string): string {
  const base = baseUrl || IIIF_CONFIG.BASE_URL.DEFAULT;
  const uuid = typeof crypto.randomUUID === 'function' 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);

  switch (type) {
    case 'Manifest':
      return IIIF_CONFIG.ID_PATTERNS.MANIFEST(base, uuid);
    case 'Collection':
      return IIIF_CONFIG.ID_PATTERNS.COLLECTION(base, uuid);
    case 'Range':
      return IIIF_CONFIG.ID_PATTERNS.RANGE(base, uuid);
  }
  return `${base}/${(type as string).toLowerCase()}/${uuid}`;
}

// ============================================================================
// Range Helpers
// ============================================================================

/**
 * Create a new Range with the given canvases
 */
export function createRange(
  label: string,
  canvasIds: string[],
  options: { behavior?: string[]; id?: string; baseUrl?: string } = {}
): IIIFRange {
  const id = options.id || generateId('Range', options.baseUrl);

  return {
    id,
    type: 'Range',
    label: { none: [label] },
    behavior: options.behavior,
    items: canvasIds.map(canvasId => ({
      id: canvasId,
      type: 'Canvas' as const
    }))
  };
}

/**
 * Create a nested Range (chapter with sub-sections)
 */
export function createNestedRange(
  label: string,
  childRanges: IIIFRange[],
  options: { behavior?: string[]; id?: string; baseUrl?: string } = {}
): IIIFRange {
  const id = options.id || generateId('Range', options.baseUrl);

  return {
    id,
    type: 'Range',
    label: { none: [label] },
    behavior: options.behavior,
    items: childRanges
  };
}

/**
 * Add a Range to a Manifest's structures
 */
export function addRangeToManifest(
  manifest: IIIFManifest,
  range: IIIFRange
): IIIFManifest {
  const structures = manifest.structures || [];

  return {
    ...manifest,
    structures: [...structures, range]
  };
}

/**
 * Get all Ranges from a Manifest
 */
export function getManifestRanges(manifest: IIIFManifest): IIIFRange[] {
  return manifest.structures || [];
}

/**
 * Flatten all canvas IDs referenced by a Range (including nested ranges)
 */
export function flattenRangeCanvasIds(range: IIIFRange): string[] {
  const ids: string[] = [];

  const traverse = (item: any) => {
    if (isCanvas(item) || (typeof item === 'object' && isCanvas(item))) {
      ids.push(item.id);
    } else if (isRange(item)) {
      (item.items || []).forEach(traverse);
    } else if (typeof item === 'string') {
      ids.push(item);
    }
  };

  (range.items || []).forEach(traverse);
  return ids;
}
