/**
 * IIIF Tree Traversal
 * Organism - depends on molecules/search
 */

import type { IIIFItem } from '@/src/shared/types';

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

  const i = item as unknown as Record<string, unknown>;
  const items = i.items as IIIFItem[] | undefined;
  const annotations = i.annotations as IIIFItem[] | undefined;
  const structures = i.structures as IIIFItem[] | undefined;

  const hasItems = items && Array.isArray(items);
  const hasAnnotations = annotations && Array.isArray(annotations);
  const hasStructures = structures && Array.isArray(structures);

  // Fast path: only items (most common case)
  if (hasItems && !hasAnnotations && !hasStructures) {
    return items;
  }

  if (!hasItems && !hasAnnotations && !hasStructures) {
    return [];
  }

  // Slow path: multiple arrays need merging
  const children: IIIFItem[] = [];
  if (hasItems) {
    for (let j = 0; j < items.length; j++) children.push(items[j]);
  }
  if (hasAnnotations) {
    for (let j = 0; j < annotations.length; j++) children.push(annotations[j]);
  }
  if (hasStructures) {
    for (let j = 0; j < structures.length; j++) children.push(structures[j]);
  }
  return children;
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
  // Mutable path array — push/pop instead of copying on every recursion
  const mutablePath: string[] = [];

  function visit(
    item: IIIFItem,
    parent: IIIFItem | null,
    depth: number,
  ): void {
    if (maxDepth > 0 && depth > maxDepth) return;

    if (visited && item.id) {
      if (visited.has(item.id)) return;
      visited.add(item.id);
    }

    const context: TraversalContext = {
      depth,
      parent,
      path: mutablePath.slice(), // snapshot only when callback actually uses it
      visited: visited || new Set(),
    };
    const result = callback(item, context);

    if (result !== undefined && result !== null) {
      results.push(result as T);
    }

    const children = getChildren(item);
    mutablePath.push(item.id);
    for (let i = 0; i < children.length; i++) {
      visit(children[i], item, depth + 1);
    }
    mutablePath.pop();
  }

  visit(root, null, 0);
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
  // Dedicated search with early termination (avoids full tree traversal)
  function search(node: IIIFItem): IIIFItem | null {
    const children = getChildren(node);
    for (let i = 0; i < children.length; i++) {
      if (children[i].id === childId) return node;
    }
    for (let i = 0; i < children.length; i++) {
      const found = search(children[i]);
      if (found) return found;
    }
    return null;
  }
  return search(root);
}

/**
 * Get the path from root to a node
 */
export function getPathToNode(
  root: IIIFItem,
  targetId: string
): IIIFItem[] {
  // Use mutable stack with push/pop instead of creating new arrays at each level
  const stack: IIIFItem[] = [];

  const findPath = (node: IIIFItem): boolean => {
    if (node.id === targetId) {
      return true;
    }

    stack.push(node);
    const children = getChildren(node);
    for (let i = 0; i < children.length; i++) {
      if (findPath(children[i])) {
        return true;
      }
    }
    stack.pop();
    return false;
  };

  findPath(root);
  return stack;
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
 * Check if tree has duplicate IDs (short-circuits on first duplicate)
 */
export function hasDuplicateIds(root: IIIFItem): boolean {
  const seen = new Set<string>();
  const check = (node: IIIFItem): boolean => {
    if (seen.has(node.id)) return true;
    seen.add(node.id);
    const children = getChildren(node);
    for (let i = 0; i < children.length; i++) {
      if (check(children[i])) return true;
    }
    return false;
  };
  return check(root);
}

// ============================================================================
// Flattening
// ============================================================================

/**
 * Flatten tree to array (breadth-first)
 */
export function flattenTree(root: IIIFItem): IIIFItem[] {
  const result: IIIFItem[] = [root];
  const visited = new Set<string>([root.id]);
  // Use index pointer instead of shift() which is O(n) on arrays
  let head = 0;

  while (head < result.length) {
    const item = result[head++];
    const children = getChildren(item);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!visited.has(child.id)) {
        visited.add(child.id);
        result.push(child);
      }
    }
  }

  return result;
}
