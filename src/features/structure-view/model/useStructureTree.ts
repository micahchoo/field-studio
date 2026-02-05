/**
 * Structure Tree Model
 *
 * Business logic for the structure view using migrated atomic utils.
 * Handles tree traversal, node selection, and hierarchical operations.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IIIFItem, IIIFCollection, IIIFManifest, IIIFCanvas } from '@/types';
import {
  getAllCollections,
  getAllManifests,
  getAllCanvases,
  findNodeById,
  getPathToNode,
  buildTreeIndex,
  getTreeDepthStats,
  getChildren,
  findParent,
  type TreeIndex,
  type TreeStats,
} from '@/utils/organisms/iiif/traversal';
import {
  getRelationshipType,
  canHaveMultipleParents,
  isValidChildType,
  getValidChildTypes,
} from '@/utils/organisms/iiif/hierarchy';
import type { IIIFRelationshipType } from '@/utils/organisms/iiif/hierarchy';

export interface StructureNode {
  id: string;
  type: string;
  label: string;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isDragging: boolean;
  childCount: number;
  relationship: IIIFRelationshipType;
  parentId: string | null;
}

export interface StructureViewState {
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  draggingId: string | null;
  dropTargetId: string | null;
}

export interface UseStructureTreeOptions {
  root: IIIFItem | null;
  onUpdate?: (newRoot: IIIFItem) => void;
}

export interface UseStructureTreeReturn {
  // Tree data
  treeIndex: TreeIndex | null;
  treeStats: TreeStats | null;
  flattenedNodes: StructureNode[];
  filteredNodes: StructureNode[];
  
  // Selection
  selectedIds: Set<string>;
  selectNode: (id: string, additive?: boolean) => void;
  selectRange: (fromId: string, toId: string) => void;
  clearSelection: () => void;
  
  // Expansion
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandToNode: (id: string) => void;
  
  // Drag & Drop
  draggingId: string | null;
  dropTargetId: string | null;
  setDraggingId: (id: string | null) => void;
  setDropTargetId: (id: string | null) => void;
  canDrop: (draggedId: string, targetId: string) => boolean;
  
  // Navigation
  getNodePath: (id: string) => IIIFItem[];
  getNodeChildren: (id: string) => IIIFItem[];
  getNodeParent: (id: string) => IIIFItem | null;
  scrollToNode: (id: string) => void;
  setScrollContainerRef: (el: HTMLDivElement | null) => void;
  
  // Filtering
  filterQuery: string;
  setFilterQuery: (query: string) => void;
  matchCount: number;
  
  // Queries
  findNode: (id: string) => IIIFItem | null;
  getValidDropTargets: (draggedId: string) => string[];
  getRelationship: (parentId: string | null, childType: string) => IIIFRelationshipType;
}

export function useStructureTree({
  root,
  onUpdate,
}: UseStructureTreeOptions): UseStructureTreeReturn {
  // State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Tree index for O(1) lookups
  const treeIndex = useMemo(() => {
    if (!root) return null;
    return buildTreeIndex(root);
  }, [root]);

  // Tree statistics
  const treeStats = useMemo(() => {
    if (!root) return null;
    return getTreeDepthStats(root);
  }, [root]);

  // Flattened nodes for rendering
  const flattenedNodes = useMemo(() => {
    if (!root || !treeIndex) return [];

    const nodes: StructureNode[] = [];
    const visited = new Set<string>();

    const traverse = (item: IIIFItem, depth: number, parentId: string | null) => {
      if (visited.has(item.id)) return;
      visited.add(item.id);

      const children = getChildren(item);
      const relationship = getRelationshipType(parentId ? treeIndex.nodeMap.get(parentId)?.type || null : null, item.type);

      nodes.push({
        id: item.id,
        type: item.type,
        label: getItemLabel(item),
        depth,
        isExpanded: expandedIds.has(item.id),
        isSelected: selectedIds.has(item.id),
        isDragging: draggingId === item.id,
        childCount: children.length,
        relationship,
        parentId,
      });

      // Only traverse children if expanded (for virtual scrolling optimization)
      if (expandedIds.has(item.id) || depth === 0) {
        children.forEach((child) => traverse(child, depth + 1, item.id));
      }
    };

    traverse(root, 0, null);
    return nodes;
  }, [root, treeIndex, expandedIds, selectedIds, draggingId]);

  // Debounced filter query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(filterQuery.toLowerCase().trim());
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filterQuery]);

  // Filtered nodes with ancestor inclusion
  const filteredNodes = useMemo(() => {
    if (!debouncedQuery) return flattenedNodes;

    const query = debouncedQuery.toLowerCase();
    const matchingIds = new Set<string>();
    
    // Find all nodes that match the query
    flattenedNodes.forEach((node) => {
      if (node.label.toLowerCase().includes(query) || 
          node.type.toLowerCase().includes(query) ||
          node.id.toLowerCase().includes(query)) {
        matchingIds.add(node.id);
      }
    });

    // Include all ancestors of matching nodes
    const ancestorIds = new Set<string>();
    matchingIds.forEach((id) => {
      const node = flattenedNodes.find((n) => n.id === id);
      if (node?.parentId) {
        let currentId: string | null = node.parentId;
        while (currentId) {
          ancestorIds.add(currentId);
          const parent = flattenedNodes.find((n) => n.id === currentId);
          currentId = parent?.parentId || null;
        }
      }
    });

    // Return nodes that are either matching or ancestors
    return flattenedNodes.filter((node) => 
      matchingIds.has(node.id) || ancestorIds.has(node.id)
    );
  }, [flattenedNodes, debouncedQuery]);

  // Auto-expand to show filtered matches
  useEffect(() => {
    if (debouncedQuery && filteredNodes.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        // Expand all ancestors of matching nodes
        filteredNodes.forEach((node) => {
          if (node.childCount > 0) {
            // Check if this node has descendants that match
            const hasMatchingDescendants = flattenedNodes.some((n) => {
              if (n.id === node.id) return false;
              let currentId: string | null = n.parentId;
              while (currentId) {
                if (currentId === node.id) {
                  const matchesQuery = n.label.toLowerCase().includes(debouncedQuery) ||
                    n.type.toLowerCase().includes(debouncedQuery);
                  if (matchesQuery) return true;
                }
                const parent = flattenedNodes.find((p) => p.id === currentId);
                currentId = parent?.parentId || null;
              }
              return false;
            });
            if (hasMatchingDescendants) {
              next.add(node.id);
            }
          }
        });
        return next;
      });
    }
  }, [debouncedQuery, filteredNodes, flattenedNodes]);

  // Selection handlers
  const selectNode = useCallback((id: string, additive = false) => {
    setSelectedIds((prev) => {
      const next = new Set(additive ? prev : []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectRange = useCallback((fromId: string, toId: string) => {
    if (!treeIndex) return;

    const fromIndex = flattenedNodes.findIndex((n) => n.id === fromId);
    const toIndex = flattenedNodes.findIndex((n) => n.id === toId);

    if (fromIndex === -1 || toIndex === -1) return;

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(flattenedNodes[i].id);
      }
      return next;
    });
  }, [flattenedNodes, treeIndex]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Expansion handlers
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!treeIndex) return;
    setExpandedIds(new Set(treeIndex.nodeMap.keys()));
  }, [treeIndex]);

  const collapseAll = useCallback(() => {
    if (!root) return;
    // Keep root expanded
    setExpandedIds(new Set([root.id]));
  }, [root]);

  const expandToNode = useCallback((id: string) => {
    if (!root || !treeIndex) return;
    const path = getPathToNode(root, id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      path.forEach((item) => next.add(item.id));
      return next;
    });
  }, [root, treeIndex]);

  // Scroll to node helper
  const scrollToNode = useCallback((id: string) => {
    if (!scrollContainerRef.current) return;
    
    const nodeIndex = filteredNodes.findIndex((n) => n.id === id);
    if (nodeIndex === -1) return;
    
    // Calculate position (assuming 36px row height)
    const rowHeight = 36;
    const scrollPosition = nodeIndex * rowHeight;
    
    scrollContainerRef.current.scrollTo({
      top: scrollPosition - 100, // Offset for visibility
      behavior: 'smooth',
    });
  }, [filteredNodes]);

  // Drop validation
  const canDrop = useCallback((draggedId: string, targetId: string): boolean => {
    if (!treeIndex || draggedId === targetId) return false;

    const dragged = treeIndex.nodeMap.get(draggedId);
    const target = treeIndex.nodeMap.get(targetId);

    if (!dragged || !target) return false;

    // Can't drop parent into child
    const path = getPathToNode(dragged, targetId);
    if (path.length > 0) return false;

    // Check valid parent-child relationship
    return isValidChildType(target.type, dragged.type);
  }, [treeIndex]);

  const getValidDropTargets = useCallback((draggedId: string): string[] => {
    if (!treeIndex) return [];
    const dragged = treeIndex.nodeMap.get(draggedId);
    if (!dragged) return [];

    return Array.from(treeIndex.nodeMap.values())
      .filter((target) => canDrop(draggedId, target.id))
      .map((target) => target.id);
  }, [treeIndex, canDrop]);

  // Navigation helpers
  const getNodePath = useCallback((id: string): IIIFItem[] => {
    if (!root) return [];
    return getPathToNode(root, id);
  }, [root]);

  const getNodeChildren = useCallback((id: string): IIIFItem[] => {
    const node = treeIndex?.nodeMap.get(id);
    if (!node) return [];
    return getChildren(node);
  }, [treeIndex]);

  const getNodeParent = useCallback((id: string): IIIFItem | null => {
    if (!root) return null;
    return findParent(root, id);
  }, [root]);

  const findNode = useCallback((id: string): IIIFItem | null => {
    if (!root) return null;
    return findNodeById(root, id);
  }, [root]);

  const getRelationship = useCallback((parentId: string | null, childType: string): IIIFRelationshipType => {
    const parentType = parentId ? treeIndex?.nodeMap.get(parentId)?.type || null : null;
    return getRelationshipType(parentType, childType);
  }, [treeIndex]);

  return {
    treeIndex,
    treeStats,
    flattenedNodes,
    filteredNodes,
    selectedIds,
    selectNode,
    selectRange,
    clearSelection,
    expandedIds,
    toggleExpanded,
    expandAll,
    collapseAll,
    expandToNode,
    draggingId,
    dropTargetId,
    setDraggingId,
    setDropTargetId,
    canDrop,
    getNodePath,
    getNodeChildren,
    getNodeParent,
    scrollToNode,
    filterQuery,
    setFilterQuery,
    matchCount: filteredNodes.length,
    findNode,
    getValidDropTargets,
    getRelationship,
    // Expose ref setter for virtualization
    setScrollContainerRef: (el: HTMLDivElement | null) => {
      scrollContainerRef.current = el;
    },
  };
}

// Helper to get item label
function getItemLabel(item: IIIFItem): string {
  if ('label' in item && item.label) {
    const label = item.label as Record<string, string[]>;
    const values = Object.values(label).flat();
    if (values.length > 0) return values[0];
  }
  return `${item.type} ${item.id.slice(-8)}`;
}
