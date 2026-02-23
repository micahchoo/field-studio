/**
 * Navigation Sidebar Helpers
 *
 * Pure functions extracted from Sidebar.svelte for testability
 * and reuse. No framework imports — only IIIF shared types.
 */

import type { IIIFItem } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A flattened tree node ready for list rendering. */
export interface FlatTreeNode {
  id: string;
  label: string;
  type: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

/** Map an IIIF resource type to an icon name. */
export function getTypeIcon(type: string): string {
  switch (type) {
    case 'Collection': return 'folder';
    case 'Manifest': return 'book-open';
    case 'Canvas': return 'image';
    case 'Range': return 'layers';
    default: return 'file';
  }
}

// ---------------------------------------------------------------------------
// Descendant search
// ---------------------------------------------------------------------------

/**
 * Check whether any item in `items` (or their descendants) has a label
 * matching `query` (case-insensitive).
 */
export function hasDescendantMatch(items: IIIFItem[], query: string): boolean {
  const lowerQuery = query.toLowerCase();

  for (const item of items) {
    const label = getIIIFValue(item.label) || item.type || item.id;
    if (label.toLowerCase().includes(lowerQuery)) return true;

    const children = item.items as IIIFItem[] | undefined;
    if (children && hasDescendantMatch(children, query)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

/**
 * Build a breadcrumb path from `root` down to the item whose id equals
 * `targetId`. Returns an empty array when root is null or the target
 * is not found.
 */
export function computeBreadcrumbs(
  root: IIIFItem | null,
  targetId: string,
): { id: string; label: string }[] {
  if (!root) return [];

  const path: { id: string; label: string }[] = [];

  function walk(
    node: IIIFItem,
    trail: { id: string; label: string }[],
  ): boolean {
    const nodeLabel = getIIIFValue(node.label) || node.type || node.id;
    const currentTrail = [...trail, { id: node.id, label: nodeLabel }];

    if (node.id === targetId) {
      path.push(...currentTrail);
      return true;
    }

    const children = node.items as IIIFItem[] | undefined;
    if (children) {
      for (const child of children) {
        if (walk(child, currentTrail)) return true;
      }
    }
    return false;
  }

  walk(root, []);
  return path;
}

// ---------------------------------------------------------------------------
// Tree flattening
// ---------------------------------------------------------------------------

/**
 * Flatten an IIIF item tree into a depth-first list of `FlatTreeNode`
 * objects, respecting expand/collapse state and an optional search filter.
 *
 * When a search `query` is provided, only nodes whose label matches
 * (or that have a matching descendant) are included, and children of
 * matching ancestors are always shown regardless of expand state.
 */
export function flattenTree(
  root: IIIFItem | null,
  expandedIds: Set<string>,
  query: string,
): FlatTreeNode[] {
  if (!root) return [];

  const nodes: FlatTreeNode[] = [];
  const lowerQuery = query.toLowerCase().trim();

  function walk(item: IIIFItem, depth: number): void {
    const label = getIIIFValue(item.label) || item.type || item.id;
    const children = item.items as IIIFItem[] | undefined;
    const hasChildren = Array.isArray(children) && children.length > 0;
    const isExpanded = expandedIds.has(item.id);

    // When searching, skip nodes that neither match nor have matching descendants
    if (lowerQuery) {
      const matchesSelf = label.toLowerCase().includes(lowerQuery);
      const hasMatchingDescendant = hasChildren && hasDescendantMatch(children!, lowerQuery);

      if (!matchesSelf && !hasMatchingDescendant) return;
    }

    nodes.push({
      id: item.id,
      label,
      type: item.type,
      depth,
      hasChildren,
      isExpanded,
    });

    // Recurse into children if expanded, or if searching and has matches
    if (hasChildren && (isExpanded || lowerQuery)) {
      for (const child of children!) {
        walk(child, depth + 1);
      }
    }
  }

  walk(root, 0);
  return nodes;
}
