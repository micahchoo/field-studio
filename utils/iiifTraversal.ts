/**
 * IIIF Traversal Utilities
 *
 * Centralized tree traversal, flattening, and search operations for IIIF hierarchies.
 * Consolidates duplicate traversal logic from:
 * - services/validationHealer.ts (find nodes for healing)
 * - services/searchService.ts (index canvases)
 * - hooks/useIIIFTraversal.ts (hook wrapper)
 * - services/staticSiteExporter.ts (collect items)
 * - services/exportService.ts (count manifests)
 * - services/ingestAnalyzer.ts (traverse preview nodes)
 */

import { IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest } from '@/src/shared/types';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TraversalOptions {
  /** Maximum depth to traverse (0 = unlimited) */
  maxDepth?: number;
  /** Skip circular references */
  detectCycles?: boolean;
  /** Include annotations in traversal */
  includeAnnotations?: boolean;
  /** Include structures in traversal */
  includeStructures?: boolean;
}

export interface TraversalContext {
  depth: number;
  parent: IIIFItem | null;
  path: string[];
  visited: Set<string>;
}

export interface TraversalResult<T> {
  items: T[];
  count: number;
  maxDepthReached: number;
}

export interface TreeIndex {
  nodeMap: Map<string, IIIFItem>;
  parentMap: Map<string, IIIFItem | null>;
  depthMap: Map<string, number>;
  pathMap: Map<string, string[]>;
  typeMap: Map<string, IIIFItem[]>;
}

// ============================================================================
// Core Traversal Functions
// ============================================================================

/**
 * Get children of an IIIF item
 * Handles items, annotations, and structures arrays
 */
export function getChildren(item: IIIFItem): IIIFItem[] {
  if (!item || typeof item !== 'object') return [];
  
  const children: IIIFItem[] = [];
  
  // Main items array
  if ((item as any).items && Array.isArray((item as any).items)) {
    children.push(...(item as any).items);
  }
  
  // Annotations array
  if ((item as any).annotations && Array.isArray((item as any).annotations)) {
    children.push(...(item as any).annotations);
  }
  
  // Structures array
  if ((item as any).structures && Array.isArray((item as any).structures)) {
    children.push(...(item as any).structures);
  }
  
  return children.filter(child => child && typeof child === 'object');
}

/**
 * Traverse an IIIF tree with a callback
 * @param root - Root item to start traversal
 * @param callback - Function called for each item
 * @param options - Traversal options
 */
export function traverse<T = void>(
  root: IIIFItem,
  callback: (item: IIIFItem, context: TraversalContext) => T | void,
  options: TraversalOptions = {}
): T[] {
  const results: T[] = [];
  const { maxDepth = 0, detectCycles = true } = options;
  const visited = detectCycles ? new Set<string>() : null;
  let maxDepthReached = 0;

  function visit(item: IIIFItem, parent: IIIFItem | null, depth: number, path: string[]): void {
    // Check depth limit
    if (maxDepth > 0 && depth > maxDepth) return;
    
    maxDepthReached = Math.max(maxDepthReached, depth);

    // Detect cycles
    if (visited && item.id) {
      if (visited.has(item.id)) return;
      visited.add(item.id);
    }

    const context: TraversalContext = { depth, parent, path, visited: visited || new Set() };
    const result = callback(item, context);
    
    if (result !== undefined && result !== null) {
      results.push(result as T);
    }

    // Recurse into children
    const children = getChildren(item);
    for (const child of children) {
      visit(child, item, depth + 1, [...path, item.id]);
    }
  }

  visit(root, null, 0, []);
  return results;
}

/**
 * Find a node by ID in the tree
 * @param root - Root item to search from
 * @param id - ID to find
 * @returns The found item or null
 */
export function findNodeById(root: IIIFItem, id: string): IIIFItem | null {
  if (root.id === id) return root;

  const children = getChildren(root);
  for (const child of children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Find all nodes of a specific type
 * @param root - Root item to search from
 * @param type - Type to find (e.g., 'Canvas', 'Manifest')
 * @returns Array of matching items
 */
export function findAllOfType<T extends IIIFItem = IIIFItem>(
  root: IIIFItem,
  type: string
): T[] {
  const results: T[] = [];

  traverse(root, (item) => {
    if (item.type === type) {
      results.push(item as T);
    }
  });

  return results;
}

/**
 * Find the parent of a node
 * @param root - Root item to search from
 * @param childId - ID of child to find parent for
 * @returns The parent item or null
 */
export function findParent(root: IIIFItem, childId: string): IIIFItem | null {
  let parent: IIIFItem | null = null;

  traverse(root, (item, context) => {
    const children = getChildren(item);
    if (children.some(child => child.id === childId)) {
      parent = item;
    }
  });

  return parent;
}

/**
 * Get the path from root to a node
 * @param root - Root item
 * @param targetId - ID of target node
 * @returns Array of items from root to target (excluding target)
 */
export function getPathToNode(root: IIIFItem, targetId: string): IIIFItem[] {
  const path: IIIFItem[] = [];

  const findPath = (node: IIIFItem, currentPath: IIIFItem[]): boolean => {
    if (node.id === targetId) {
      path.push(...currentPath);
      return true;
    }

    const children = getChildren(node);
    for (const child of children) {
      if (findPath(child, [...currentPath, node])) {
        return true;
      }
    }

    return false;
  };

  findPath(root, []);
  return path;
}

/**
 * Flatten entire tree to array
 * @param root - Root item
 * @param options - Traversal options
 * @returns Flat array of all items
 */
export function flattenTree(
  root: IIIFItem,
  options: TraversalOptions = {}
): IIIFItem[] {
  return findAllOfType(root, '*');
}

/**
 * Get tree depth statistics
 * @param root - Root item
 * @returns Maximum depth and node counts per level
 */
export function getTreeDepthStats(root: IIIFItem): {
  maxDepth: number;
  nodesPerLevel: number[];
  totalNodes: number;
} {
  let maxDepth = 0;
  const nodesPerLevel: number[] = [];

  traverse(root, (item, context) => {
    maxDepth = Math.max(maxDepth, context.depth);
    nodesPerLevel[context.depth] = (nodesPerLevel[context.depth] || 0) + 1;
  });

  return {
    maxDepth,
    nodesPerLevel,
    totalNodes: nodesPerLevel.reduce((sum, count) => sum + count, 0)
  };
}

// ============================================================================
// Tree Indexing (for O(1) lookups)
// ============================================================================

/**
 * Build a complete index of the tree for efficient lookups
 * This is more memory-intensive but provides O(1) access
 * @param root - Root item to index
 * @returns TreeIndex with maps for nodes, parents, depths, paths, and types
 */
export function buildTreeIndex(root: IIIFItem): TreeIndex {
  const nodeMap = new Map<string, IIIFItem>();
  const parentMap = new Map<string, IIIFItem | null>();
  const depthMap = new Map<string, number>();
  const pathMap = new Map<string, string[]>();
  const typeMap = new Map<string, IIIFItem[]>();

  traverse(root, (item, context) => {
    if (item.id) {
      nodeMap.set(item.id, item);
      parentMap.set(item.id, context.parent);
      depthMap.set(item.id, context.depth);
      pathMap.set(item.id, context.path);

      // Add to type map
      const existing = typeMap.get(item.type) || [];
      typeMap.set(item.type, [...existing, item]);
    }
  });

  return { nodeMap, parentMap, depthMap, pathMap, typeMap };
}

/**
 * Find duplicate IDs in a tree
 * @param root - Root item to check
 * @returns Array of duplicate IDs found
 */
export function findDuplicateIds(root: IIIFItem): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  traverse(root, (item) => {
    if (item.id) {
      if (seen.has(item.id)) {
        duplicates.push(item.id);
      } else {
        seen.add(item.id);
      }
    }
  });

  return [...new Set(duplicates)]; // Remove duplicates from the list itself
}

// ============================================================================
// Type-Specific Finders
// ============================================================================

/**
 * Get all Canvas items in the tree
 */
export function getAllCanvases(root: IIIFItem): IIIFCanvas[] {
  return findAllOfType<IIIFCanvas>(root, 'Canvas');
}

/**
 * Get all Manifest items in the tree
 */
export function getAllManifests(root: IIIFItem): IIIFManifest[] {
  return findAllOfType<IIIFManifest>(root, 'Manifest');
}

/**
 * Get all Collection items in the tree
 */
export function getAllCollections(root: IIIFItem): IIIFCollection[] {
  return findAllOfType<IIIFCollection>(root, 'Collection');
}

/**
 * Get all leaf nodes (items with no children)
 */
export function getAllLeafNodes(root: IIIFItem): IIIFItem[] {
  const leaves: IIIFItem[] = [];

  traverse(root, (item) => {
    const children = getChildren(item);
    if (children.length === 0) {
      leaves.push(item);
    }
  });

  return leaves;
}

// ============================================================================
// Safe Traversal (with error handling)
// ============================================================================

/**
 * Safely traverse with comprehensive error handling
 * Useful for processing user-provided IIIF data that may be malformed
 */
export function safeTraverse<T = void>(
  root: IIIFItem | null | undefined,
  callback: (item: IIIFItem, context: TraversalContext) => T | void,
  options: TraversalOptions = {}
): { results: T[]; errors: string[]; success: boolean } {
  const results: T[] = [];
  const errors: string[] = [];

  if (!root || typeof root !== 'object') {
    return { results, errors: ['Invalid root item'], success: false };
  }

  try {
    const traverseResults = traverse(root, (item, context) => {
      try {
        return callback(item, context);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error processing item ${item.id}: ${errorMsg}`);
        return undefined;
      }
    }, options);

    results.push(...traverseResults);
    return { results, errors, success: errors.length === 0 };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error during traversal';
    errors.push(errorMsg);
    return { results, errors, success: false };
  }
}

// ============================================================================
// Export default object for convenience
// ============================================================================

export default {
  traverse,
  findNodeById,
  findAllOfType,
  findParent,
  getPathToNode,
  flattenTree,
  getTreeDepthStats,
  buildTreeIndex,
  findDuplicateIds,
  getAllCanvases,
  getAllManifests,
  getAllCollections,
  getAllLeafNodes,
  getChildren,
  safeTraverse
};
