/**
 * useIIIFTraversal - Memoized IIIF tree traversal utilities
 * 
 * Provides efficient, memoized functions for finding and traversing
 * IIIF items in a hierarchical structure. Consolidates duplicated
 * traversal logic across all views.
 */

import { useCallback, useMemo } from 'react';
import { IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest } from '../types';

export interface UseIIIFTraversalReturn {
  /** Find a node by ID anywhere in the tree */
  findNode: (id: string) => IIIFItem | null;
  /** Find all nodes of a specific type */
  findAllByType: <T extends IIIFItem = IIIFItem>(type: string) => T[];
  /** Flatten entire tree to array */
  flattenItems: () => IIIFItem[];
  /** Get direct children of a node */
  getChildren: (id: string) => IIIFItem[];
  /** Get parent of a node */
  getParent: (id: string) => IIIFItem | null;
  /** Get all Canvas items in the tree */
  getAllCanvases: () => IIIFCanvas[];
  /** Get all Manifest items in the tree */
  getAllManifests: () => IIIFManifest[];
  /** Get all Collection items in the tree */
  getAllCollections: () => IIIFCollection[];
  /** Check if a node exists in the tree */
  hasNode: (id: string) => boolean;
  /** Get depth of a node in the tree (0 = root) */
  getDepth: (id: string) => number;
  /** Get path from root to node as array of IDs */
  getPath: (id: string) => string[];
}

/**
 * Hook providing memoized IIIF tree traversal functions
 * 
 * @param root - The root IIIF item (Collection/Manifest) to traverse
 * @returns Object containing various traversal utility functions
 * 
 * @example
 * const { findNode, findAllByType, getAllCanvases } = useIIIFTraversal(root);
 * const canvas = findNode('canvas-123');
 * const allManifests = findAllByType<IIIFManifest>('Manifest');
 */
export function useIIIFTraversal(root: IIIFItem | null): UseIIIFTraversalReturn {
  // Build lookup maps for O(1) access - computed once when root changes
  const { nodeMap, parentMap, depthMap, pathMap, typeMap } = useMemo(() => {
    const nodeMap = new Map<string, IIIFItem>();
    const parentMap = new Map<string, IIIFItem | null>();
    const depthMap = new Map<string, number>();
    const pathMap = new Map<string, string[]>();
    const typeMap = new Map<string, IIIFItem[]>();

    if (!root) {
      return { nodeMap, parentMap, depthMap, pathMap, typeMap };
    }

    const traverse = (item: IIIFItem, parent: IIIFItem | null, depth: number, path: string[]) => {
      nodeMap.set(item.id, item);
      parentMap.set(item.id, parent);
      depthMap.set(item.id, depth);
      pathMap.set(item.id, [...path, item.id]);

      // Add to type map
      const existing = typeMap.get(item.type) || [];
      typeMap.set(item.type, [...existing, item]);

      // Recurse into children
      const children = (item as any).items || (item as any).annotations || [];
      children.forEach((child: IIIFItem) => traverse(child, item, depth + 1, [...path, item.id]));
    };

    traverse(root, null, 0, []);

    return { nodeMap, parentMap, depthMap, pathMap, typeMap };
  }, [root]);

  const findNode = useCallback((id: string): IIIFItem | null => {
    return nodeMap.get(id) || null;
  }, [nodeMap]);

  const findAllByType = useCallback(<T extends IIIFItem = IIIFItem>(type: string): T[] => {
    return (typeMap.get(type) || []) as T[];
  }, [typeMap]);

  const flattenItems = useCallback((): IIIFItem[] => {
    return Array.from(nodeMap.values());
  }, [nodeMap]);

  const getChildren = useCallback((id: string): IIIFItem[] => {
    const node = nodeMap.get(id);
    if (!node) return [];
    return (node as any).items || (node as any).annotations || [];
  }, [nodeMap]);

  const getParent = useCallback((id: string): IIIFItem | null => {
    return parentMap.get(id) || null;
  }, [parentMap]);

  const getAllCanvases = useCallback((): IIIFCanvas[] => {
    return (typeMap.get('Canvas') || []) as IIIFCanvas[];
  }, [typeMap]);

  const getAllManifests = useCallback((): IIIFManifest[] => {
    return (typeMap.get('Manifest') || []) as IIIFManifest[];
  }, [typeMap]);

  const getAllCollections = useCallback((): IIIFCollection[] => {
    return (typeMap.get('Collection') || []) as IIIFCollection[];
  }, [typeMap]);

  const hasNode = useCallback((id: string): boolean => {
    return nodeMap.has(id);
  }, [nodeMap]);

  const getDepth = useCallback((id: string): number => {
    return depthMap.get(id) ?? -1;
  }, [depthMap]);

  const getPath = useCallback((id: string): string[] => {
    return pathMap.get(id) || [];
  }, [pathMap]);

  return {
    findNode,
    findAllByType,
    flattenItems,
    getChildren,
    getParent,
    getAllCanvases,
    getAllManifests,
    getAllCollections,
    hasNode,
    getDepth,
    getPath
  };
}

export default useIIIFTraversal;
