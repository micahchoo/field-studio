/**
 * IIIF Tree Traversal
 * Organism - depends on molecules/search
 */

import type { IIIFItem } from '../../../types';

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
  const i = item as Record<string, unknown>;

  // Main items array
  if (i.items && Array.isArray(i.items)) {
    children.push(...(i.items as IIIFItem[]));
  }

  // Annotations array
  if (i.annotations && Array.isArray(i.annotations)) {
    children.push(...(i.annotations as IIIFItem[]));
  }

  // Structures array
  if (i.structures && Array.isArray(i.structures)) {
    children.push(...(i.structures as IIIFItem[]));
  }

  return children.filter((child) => child && typeof child === 'object');
}

/**
 * Traverse an IIIF tree with a callback
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

  function visit(
    item: IIIFItem,
    parent: IIIFItem | null,
    depth: number,
    path: string[]
  ): void {
    if (maxDepth > 0 && depth > maxDepth) return;

    maxDepthReached = Math.max(maxDepthReached, depth);

    if (visited && item.id) {
      if (visited.has(item.id)) return;
      visited.add(item.id);
    }

    const context: TraversalContext = {
      depth,
      parent,
      path,
      visited: visited || new Set(),
    };
    const result = callback(item, context);

    if (result !== undefined && result !== null) {
      results.push(result as T);
    }

    const children = getChildren(item);
    for (const child of children) {
      visit(child, item, depth + 1, [...path, item.id]);
    }
  }

  visit(root, null, 0, []);
  return results;
}

/**
 * Safe traverse that catches errors
 */
export function safeTraverse<T = void>(
  root: IIIFItem,
  callback: (item: IIIFItem, context: TraversalContext) => T | void,
  options?: TraversalOptions
): { results: T[]; error?: Error } {
  try {
    const results = traverse(root, callback, options);
    return { results };
  } catch (error) {
    return { results: [], error: error as Error };
  }
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Find a node by ID in the tree (comprehensive version)
 */
export function findNodeById(
  root: IIIFItem,
  id: string
): IIIFItem | null {
  if (root.id === id) return root;

  const children = getChildren(root);
  for (const child of children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Find all nodes of a specific type (comprehensive version)
 * This is the primary export - uses full traversal
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
 */
export function findParent(
  root: IIIFItem,
  childId: string
): IIIFItem | null {
  let parent: IIIFItem | null = null;

  traverse(root, (item) => {
    const children = getChildren(item);
    if (children.some((child) => child.id === childId)) {
      parent = item;
    }
  });

  return parent;
}

/**
 * Get the path from root to a node
 */
export function getPathToNode(
  root: IIIFItem,
  targetId: string
): IIIFItem[] {
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

// ============================================================================
// Collection Functions
// ============================================================================

/**
 * Get all canvases in the tree
 */
export function getAllCanvases(root: IIIFItem): IIIFItem[] {
  return findAllOfType(root, 'Canvas');
}

/**
 * Get all manifests in the tree
 */
export function getAllManifests(root: IIIFItem): IIIFItem[] {
  return findAllOfType(root, 'Manifest');
}

/**
 * Get all collections in the tree
 */
export function getAllCollections(root: IIIFItem): IIIFItem[] {
  return findAllOfType(root, 'Collection');
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
// Tree Index
// ============================================================================

/**
 * Build a complete index of the tree
 */
export function buildTreeIndex(root: IIIFItem): TreeIndex {
  const nodeMap = new Map<string, IIIFItem>();
  const parentMap = new Map<string, IIIFItem | null>();
  const depthMap = new Map<string, number>();
  const pathMap = new Map<string, string[]>();
  const typeMap = new Map<string, IIIFItem[]>();

  traverse(
    root,
    (item, context) => {
      nodeMap.set(item.id, item);
      parentMap.set(item.id, context.parent);
      depthMap.set(item.id, context.depth);
      pathMap.set(item.id, context.path);

      const typeList = typeMap.get(item.type) || [];
      typeList.push(item);
      typeMap.set(item.type, typeList);
    },
    { detectCycles: true }
  );

  return { nodeMap, parentMap, depthMap, pathMap, typeMap };
}

// ============================================================================
// Tree Statistics
// ============================================================================

export interface TreeStats {
  totalNodes: number;
  maxDepth: number;
  typeCounts: Record<string, number>;
}

/**
 * Get tree depth statistics
 */
export function getTreeDepthStats(root: IIIFItem): TreeStats {
  let totalNodes = 0;
  let maxDepth = 0;
  const typeCounts: Record<string, number> = {};

  traverse(
    root,
    (item, context) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, context.depth);
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    },
    { detectCycles: true }
  );

  return { totalNodes, maxDepth, typeCounts };
}

// ============================================================================
// Duplicate Detection
// ============================================================================

export interface DuplicateIdResult {
  id: string;
  occurrences: number;
  paths: string[][];
}

/**
 * Find duplicate IDs in the tree
 */
export function findDuplicateIds(root: IIIFItem): DuplicateIdResult[] {
  const idMap = new Map<string, { count: number; paths: string[][] }>();

  traverse(root, (item, context) => {
    const existing = idMap.get(item.id);
    if (existing) {
      existing.count++;
      existing.paths.push([...context.path, item.id]);
    } else {
      idMap.set(item.id, { count: 1, paths: [[...context.path, item.id]] });
    }
  });

  return Array.from(idMap.entries())
    .filter(([, data]) => data.count > 1)
    .map(([id, data]) => ({
      id,
      occurrences: data.count,
      paths: data.paths,
    }));
}

/**
 * Check if tree has duplicate IDs
 */
export function hasDuplicateIds(root: IIIFItem): boolean {
  return findDuplicateIds(root).length > 0;
}

// ============================================================================
// Flattening
// ============================================================================

/**
 * Flatten tree to array (breadth-first)
 */
export function flattenTree(root: IIIFItem): IIIFItem[] {
  const result: IIIFItem[] = [];
  const queue: IIIFItem[] = [root];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const item = queue.shift()!;

    if (visited.has(item.id)) continue;
    visited.add(item.id);

    result.push(item);

    const children = getChildren(item);
    queue.push(...children);
  }

  return result;
}
