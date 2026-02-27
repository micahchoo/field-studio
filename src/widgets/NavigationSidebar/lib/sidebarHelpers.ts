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

/** Vault accessor callbacks for normalized state traversal */
export interface VaultAccessors {
  getEntity: (id: string) => IIIFItem | null;
  getChildIds: (id: string) => string[];
  getAncestors: (id: string) => string[];
}

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

/**
 * Map an IIIF resource type to a Material Icons ligature name.
 * All names must use the underscore format required by the Material Icons font.
 */
export function getTypeIcon(type: string): string {
  switch (type) {
    case 'Collection': return 'folder';
    case 'Manifest': return 'menu_book';
    case 'Canvas': return 'image';
    case 'Range': return 'layers';
    default: return 'insert_drive_file';
  }
}

// ---------------------------------------------------------------------------
// Descendant search (normalized)
// ---------------------------------------------------------------------------

/**
 * Check whether any entity in `ids` (or their descendants) has a label
 * matching `query` (case-insensitive).
 */
export function hasDescendantMatch(
  ids: string[],
  accessors: VaultAccessors,
  query: string,
): boolean {
  const lowerQuery = query.toLowerCase();

  for (const id of ids) {
    const entity = accessors.getEntity(id);
    if (!entity) continue;
    const label = getIIIFValue(entity.label) || entity.type || entity.id;
    if (label.toLowerCase().includes(lowerQuery)) return true;

    const childIds = accessors.getChildIds(id);
    if (childIds.length > 0 && hasDescendantMatch(childIds, accessors, query)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Breadcrumbs (normalized)
// ---------------------------------------------------------------------------

/**
 * Build a breadcrumb path from root down to `targetId` using vault ancestors.
 */
export function computeBreadcrumbs(
  targetId: string | null,
  accessors: VaultAccessors,
): { id: string; label: string }[] {
  if (!targetId) return [];

  const entity = accessors.getEntity(targetId);
  if (!entity) return [];

  const ancestorIds = accessors.getAncestors(targetId);
  const path = [...ancestorIds.reverse(), targetId].map(id => {
    const e = accessors.getEntity(id);
    return { id, label: e ? (getIIIFValue(e.label) || e.type || e.id) : id };
  });
  return path;
}

// ---------------------------------------------------------------------------
// Tree flattening (normalized)
// ---------------------------------------------------------------------------

/**
 * Flatten the IIIF entity tree into a depth-first list of `FlatTreeNode`
 * objects, respecting expand/collapse state and an optional search filter.
 *
 * When a search `query` is provided, only nodes whose label matches
 * (or that have a matching descendant) are included, and children of
 * matching ancestors are always shown regardless of expand state.
 */
export function flattenTree(
  rootId: string | null,
  accessors: VaultAccessors,
  expandedIds: Set<string>,
  query: string,
): FlatTreeNode[] {
  if (!rootId) return [];

  const nodes: FlatTreeNode[] = [];
  const lowerQuery = query.toLowerCase().trim();

  function walk(id: string, depth: number): void {
    const entity = accessors.getEntity(id);
    if (!entity) return;

    const label = getIIIFValue(entity.label) || entity.type || entity.id;
    const childIds = accessors.getChildIds(id);
    const hasChildren = childIds.length > 0;
    const isExpanded = expandedIds.has(id);

    // When searching, skip nodes that neither match nor have matching descendants
    if (lowerQuery) {
      const matchesSelf = label.toLowerCase().includes(lowerQuery);
      const hasMatchingDescendant = hasChildren && hasDescendantMatch(childIds, accessors, lowerQuery);

      if (!matchesSelf && !hasMatchingDescendant) return;
    }

    nodes.push({
      id,
      label,
      type: entity.type,
      depth,
      hasChildren,
      isExpanded,
    });

    // Recurse into children if expanded, or if searching and has matches
    if (hasChildren && (isExpanded || lowerQuery)) {
      for (const childId of childIds) {
        walk(childId, depth + 1);
      }
    }
  }

  walk(rootId, 0);
  return nodes;
}
