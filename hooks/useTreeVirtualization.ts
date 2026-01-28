/**
 * useTreeVirtualization - Presentation-layer tree flattening for virtualization
 * 
 * Implements the architectural pattern from Tree-Flattening-Architectural-Analysis.md:
 * - Preserves IIIF semantic integrity at data layer
 * - Flattens tree hierarchy at presentation layer for virtualization
 * - Uses Set<string> for expansion state (memory efficient)
 * - Provides ARIA-compatible tree navigation
 */

import { useState, useCallback, useMemo, useRef, useEffect, RefObject } from 'react';
import { IIIFItem, IIIFCollection, IIIFManifest, isCollection, isManifest } from '../types';
import { useVirtualization } from './useVirtualization';

/** Flattened tree node for virtualization - minimal memory footprint */
export interface FlattenedTreeNode {
  id: string;
  node: IIIFItem;
  level: number;
  parentId: string | null;
  index: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isLeaf: boolean;
}

/** Options for tree virtualization */
export interface UseTreeVirtualizationOptions {
  root: IIIFItem | null;
  containerRef: RefObject<HTMLElement | null>;
  estimatedRowHeight?: number;
  overscan?: number;
  defaultExpanded?: boolean;
  maxDepth?: number;
  /**
   * External control of expanded state. If provided, the hook becomes
   * controlled and will not manage its own expansion state.
   */
  expandedIds?: Set<string>;
  onExpandedChange?: (expandedIds: Set<string>) => void;
}

/** Return type for tree virtualization hook */
export interface UseTreeVirtualizationReturn {
  /** All flattened nodes currently visible (respects expansion state) */
  flattenedNodes: FlattenedTreeNode[];
  /** Currently visible nodes within viewport */
  visibleNodes: FlattenedTreeNode[];
  /** Range of visible indices */
  visibleRange: { start: number; end: number };
  /** Total height of virtualized container */
  totalHeight: number;
  /** Height of top spacer element */
  topSpacer: number;
  /** Height of bottom spacer element */
  bottomSpacer: number;
  /** Set of currently expanded node IDs */
  expandedIds: Set<string>;
  /** Toggle expansion state of a node */
  toggleExpanded: (id: string) => void;
  /** Expand a specific node */
  expand: (id: string) => void;
  /** Collapse a specific node */
  collapse: (id: string) => void;
  /** Expand all nodes */
  expandAll: () => void;
  /** Collapse all nodes */
  collapseAll: () => void;
  /** Check if a node is expanded */
  isExpanded: (id: string) => boolean;
  /** Get parent node from flattened array */
  getParent: (node: FlattenedTreeNode) => FlattenedTreeNode | null;
  /** Get direct children from flattened array */
  getChildren: (node: FlattenedTreeNode) => FlattenedTreeNode[];
  /** Get siblings from flattened array */
  getSiblings: (node: FlattenedTreeNode) => FlattenedTreeNode[];
  /** Find node by ID */
  findNode: (id: string) => FlattenedTreeNode | null;
  /** Navigate tree with keyboard (ARIA pattern) */
  handleKeyNavigation: (event: React.KeyboardEvent, currentId: string | null) => string | null;
}

/** Maximum nesting depth to prevent infinite recursion */
const DEFAULT_MAX_DEPTH = 15;

/**
 * Flattens a tree structure based on current expansion state
 * Uses depth-first traversal to maintain visual order
 */
function flattenTree(
  root: IIIFItem,
  expandedIds: Set<string>,
  maxDepth: number
): FlattenedTreeNode[] {
  const flattened: FlattenedTreeNode[] = [];

  const traverse = (
    node: IIIFItem,
    level: number,
    parentId: string | null
  ): void => {
    const children = (node as IIIFCollection | IIIFManifest).items || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    flattened.push({
      id: node.id,
      node,
      level,
      parentId,
      index: flattened.length,
      hasChildren,
      isExpanded: hasChildren ? isExpanded : false,
      isLeaf: !hasChildren
    });

    // Recurse into children if expanded and not at depth limit
    if (isExpanded && hasChildren && level < maxDepth) {
      children.forEach(child => traverse(child, level + 1, node.id));
    }
  };

  traverse(root, 0, null);
  return flattened;
}

/**
 * Hook for tree-aware virtualization
 * Preserves IIIF data layer while enabling virtualized rendering
 */
export function useTreeVirtualization(
  options: UseTreeVirtualizationOptions
): UseTreeVirtualizationReturn {
  const {
    root,
    containerRef,
    estimatedRowHeight = 40,
    overscan = 5,
    defaultExpanded = false,
    maxDepth = DEFAULT_MAX_DEPTH,
    expandedIds: controlledExpandedIds,
    onExpandedChange
  } = options;

  const isControlled = controlledExpandedIds !== undefined;

  // Internal expansion state for uncontrolled mode
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(() => {
    // Initialize with nodes at levels 0-2 expanded by default
    if (!root || !defaultExpanded) return new Set();
    
    const initialExpanded = new Set<string>();
    const collectIds = (node: IIIFItem, level: number) => {
      if (level >= 3) return;
      initialExpanded.add(node.id);
      const children = (node as any).items || [];
      children.forEach((child: IIIFItem) => collectIds(child, level + 1));
    };
    collectIds(root, 0);
    return initialExpanded;
  });

  // Use controlled or internal state
  const expandedIds = isControlled ? controlledExpandedIds! : internalExpandedIds;

  // Update internal state handler - supports both direct value and updater function
  const setExpandedIds = useCallback((
    newIds: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => {
    if (isControlled) {
      // In controlled mode, we need to resolve the value if it's a function
      const resolvedIds = typeof newIds === 'function' 
        ? newIds(controlledExpandedIds!)
        : newIds;
      onExpandedChange?.(resolvedIds);
    } else {
      setInternalExpandedIds(newIds);
    }
  }, [isControlled, onExpandedChange, controlledExpandedIds]);

  // Flatten tree based on current expansion state
  const flattenedNodes = useMemo(() => {
    if (!root) return [];
    return flattenTree(root, expandedIds, maxDepth);
  }, [root, expandedIds, maxDepth]);

  // Create lookup map for O(1) access
  const nodeMap = useMemo(() => {
    const map = new Map<string, FlattenedTreeNode>();
    flattenedNodes.forEach(node => map.set(node.id, node));
    return map;
  }, [flattenedNodes]);

  // Standard list virtualization
  const virtualization = useVirtualization({
    totalItems: flattenedNodes.length,
    itemHeight: estimatedRowHeight,
    containerRef,
    overscan
  });

  // Extract visible nodes
  const visibleNodes = useMemo(() => {
    const { start, end } = virtualization.visibleRange;
    return flattenedNodes.slice(start, end);
  }, [flattenedNodes, virtualization.visibleRange]);

  // Toggle expansion state
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [setExpandedIds]);

  // Expand specific node
  const expand = useCallback((id: string) => {
    setExpandedIds((prev: Set<string>) => new Set([...prev, id]));
  }, [setExpandedIds]);

  // Collapse specific node
  const collapse = useCallback((id: string) => {
    setExpandedIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [setExpandedIds]);

  // Expand all nodes
  const expandAll = useCallback(() => {
    if (!root) return;
    const allIds = new Set<string>();
    const collect = (node: IIIFItem) => {
      const children = (node as any).items || [];
      if (children.length > 0) {
        allIds.add(node.id);
        children.forEach((child: IIIFItem) => collect(child));
      }
    };
    collect(root);
    setExpandedIds(allIds);
  }, [root, setExpandedIds]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, [setExpandedIds]);

  // Check if node is expanded
  const isExpanded = useCallback((id: string) => {
    return expandedIds.has(id);
  }, [expandedIds]);

  // Get parent from flattened array
  const getParent = useCallback((node: FlattenedTreeNode): FlattenedTreeNode | null => {
    if (!node.parentId) return null;
    return nodeMap.get(node.parentId) || null;
  }, [nodeMap]);

  // Get children from flattened array (only works if parent is expanded)
  const getChildren = useCallback((node: FlattenedTreeNode): FlattenedTreeNode[] => {
    return flattenedNodes.filter(n => n.parentId === node.id);
  }, [flattenedNodes]);

  // Get siblings from flattened array
  const getSiblings = useCallback((node: FlattenedTreeNode): FlattenedTreeNode[] => {
    if (!node.parentId) return [];
    return flattenedNodes.filter(n => n.parentId === node.parentId && n.id !== node.id);
  }, [flattenedNodes]);

  // Find node by ID
  const findNode = useCallback((id: string): FlattenedTreeNode | null => {
    return nodeMap.get(id) || null;
  }, [nodeMap]);

  // Handle ARIA tree keyboard navigation
  const handleKeyNavigation = useCallback((
    event: React.KeyboardEvent,
    currentId: string | null
  ): string | null => {
    if (!currentId) return null;

    const current = findNode(currentId);
    if (!current) return null;

    switch (event.key) {
      case 'ArrowDown': {
        // Move to next visible node
        const nextIndex = current.index + 1;
        if (nextIndex < flattenedNodes.length) {
          return flattenedNodes[nextIndex].id;
        }
        break;
      }
      
      case 'ArrowUp': {
        // Move to previous visible node
        const prevIndex = current.index - 1;
        if (prevIndex >= 0) {
          return flattenedNodes[prevIndex].id;
        }
        break;
      }
      
      case 'ArrowRight': {
        event.preventDefault();
        if (current.hasChildren && !current.isExpanded) {
          // Expand and stay on current
          expand(currentId);
          return currentId;
        } else if (current.hasChildren && current.isExpanded) {
          // Already expanded, move to first child
          const children = getChildren(current);
          if (children.length > 0) {
            return children[0].id;
          }
        }
        break;
      }
      
      case 'ArrowLeft': {
        event.preventDefault();
        if (current.hasChildren && current.isExpanded) {
          // Collapse and stay on current
          collapse(currentId);
          return currentId;
        } else {
          // Move to parent
          const parent = getParent(current);
          if (parent) {
            return parent.id;
          }
        }
        break;
      }
      
      case 'Home': {
        event.preventDefault();
        if (flattenedNodes.length > 0) {
          return flattenedNodes[0].id;
        }
        break;
      }
      
      case 'End': {
        event.preventDefault();
        if (flattenedNodes.length > 0) {
          return flattenedNodes[flattenedNodes.length - 1].id;
        }
        break;
      }
    }

    return null;
  }, [flattenedNodes, findNode, getChildren, getParent, expand, collapse]);

  // Persist expansion state to localStorage (uncontrolled mode only)
  useEffect(() => {
    if (isControlled) return;
    
    const key = 'tree-expansion-state';
    try {
      localStorage.setItem(key, JSON.stringify([...internalExpandedIds]));
    } catch {
      // Ignore localStorage errors
    }
  }, [internalExpandedIds, isControlled]);

  return {
    flattenedNodes,
    visibleNodes,
    visibleRange: virtualization.visibleRange,
    totalHeight: virtualization.totalHeight,
    topSpacer: virtualization.topSpacer,
    bottomSpacer: virtualization.bottomSpacer,
    expandedIds,
    toggleExpanded,
    expand,
    collapse,
    expandAll,
    collapseAll,
    isExpanded,
    getParent,
    getChildren,
    getSiblings,
    findNode,
    handleKeyNavigation
  };
}

export default useTreeVirtualization;
