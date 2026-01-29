/**
 * useBreadcrumbPath - Hook for building breadcrumb navigation path
 *
 * Traverses reverse references to build a path from the current entity
 * back to the root, optimized with memoization for performance.
 */

import { useMemo } from 'react';
import { IIIFItem } from '../types';

export interface BreadcrumbSegment {
  id: string;
  label: string;
  type: 'Collection' | 'Manifest' | 'Canvas';
  isCurrent: boolean;
}

export interface UseBreadcrumbPathOptions {
  /** Function to extract display label from an item */
  getLabel?: (item: IIIFItem) => string;
}

/**
 * Hook to build breadcrumb path from current entity to root
 *
 * @param currentEntityId - The ID of the current/selected entity
 * @param reverseRefs - Map of entity IDs to their parent IDs (child -> parents)
 * @param nodeMap - Map of entity IDs to their full IIIF item objects
 * @param options - Optional configuration
 * @returns Array of breadcrumb segments from root to current
 *
 * @example
 * const path = useBreadcrumbPath(
 *   selectedId,
 *   reverseRefs,
 *   nodeMap,
 *   { getLabel: (item) => getIIIFValue(item.label) }
 * );
 */
export function useBreadcrumbPath(
  currentEntityId: string | null,
  reverseRefs: Map<string, string[]>,
  nodeMap: Map<string, IIIFItem>,
  options: UseBreadcrumbPathOptions = {}
): BreadcrumbSegment[] {
  const { getLabel = (item: IIIFItem) => {
    // Default label extraction - handle various IIIF label formats
    if (!item.label) return 'Untitled';
    if (typeof item.label === 'string') return item.label;
    if (Array.isArray(item.label)) {
      const first = item.label[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object') {
        const values = Object.values(first);
        if (values.length > 0 && Array.isArray(values[0])) {
          return values[0][0] || 'Untitled';
        }
      }
    }
    if (typeof item.label === 'object') {
      const values = Object.values(item.label);
      if (values.length > 0 && Array.isArray(values[0])) {
        return values[0][0] || 'Untitled';
      }
    }
    return 'Untitled';
  } } = options;

  return useMemo(() => {
    // Edge case: null entity
    if (!currentEntityId) {
      return [];
    }

    // Edge case: entity not in node map
    const currentNode = nodeMap.get(currentEntityId);
    if (!currentNode) {
      return [];
    }

    const path: BreadcrumbSegment[] = [];
    const visited = new Set<string>(); // Prevent infinite loops
    let currentId: string | null = currentEntityId;

    // Traverse from current entity up to root using reverse refs
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const node = nodeMap.get(currentId);

      if (!node) {
        break;
      }

      // Validate type
      const validTypes: Array<'Collection' | 'Manifest' | 'Canvas'> = ['Collection', 'Manifest', 'Canvas'];
      if (!validTypes.includes(node.type as any)) {
        break;
      }

      path.unshift({
        id: node.id,
        label: getLabel(node),
        type: node.type as 'Collection' | 'Manifest' | 'Canvas',
        isCurrent: node.id === currentEntityId
      });

      // Get parent IDs from reverse refs
      const parentIds = reverseRefs.get(currentId);

      // If no parents, we've reached the root
      if (!parentIds || parentIds.length === 0) {
        break;
      }

      // Use first parent for breadcrumb path (primary hierarchy)
      // This handles the case where an item might be referenced multiple times
      currentId = parentIds[0];
    }

    return path;
  }, [currentEntityId, reverseRefs, nodeMap, getLabel]);
}

/**
 * Alternative hook that builds path from root to current using forward traversal
 * Use this when reverseRefs is not available but you have the root item
 */
export function useBreadcrumbPathFromRoot(
  currentEntityId: string | null,
  root: IIIFItem | null,
  options: UseBreadcrumbPathOptions = {}
): BreadcrumbSegment[] {
  const { getLabel = (item: IIIFItem) => {
    if (!item.label) return 'Untitled';
    if (typeof item.label === 'string') return item.label;
    if (Array.isArray(item.label)) {
      const first = item.label[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object') {
        const values = Object.values(first);
        if (values.length > 0 && Array.isArray(values[0])) {
          return values[0][0] || 'Untitled';
        }
      }
    }
    if (typeof item.label === 'object') {
      const values = Object.values(item.label);
      if (values.length > 0 && Array.isArray(values[0])) {
        return values[0][0] || 'Untitled';
      }
    }
    return 'Untitled';
  } } = options;

  return useMemo(() => {
    if (!root || !currentEntityId) {
      return [];
    }

    const path: BreadcrumbSegment[] = [];

    const findPath = (item: IIIFItem, currentPath: BreadcrumbSegment[]): boolean => {
      const segment: BreadcrumbSegment = {
        id: item.id,
        label: getLabel(item),
        type: item.type as 'Collection' | 'Manifest' | 'Canvas',
        isCurrent: item.id === currentEntityId
      };

      const newPath = [...currentPath, segment];

      if (item.id === currentEntityId) {
        path.push(...newPath);
        return true;
      }

      // Recurse into children
      const children = (item as any).items || (item as any).annotations || [];
      for (const child of children) {
        if (findPath(child, newPath)) {
          return true;
        }
      }

      return false;
    };

    findPath(root, []);
    return path;
  }, [currentEntityId, root, getLabel]);
}

export default useBreadcrumbPath;
