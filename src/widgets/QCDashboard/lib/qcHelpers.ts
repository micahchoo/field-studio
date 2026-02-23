/**
 * QC Dashboard Helpers
 *
 * Pure functions extracted from QCDashboard.svelte for testability
 * and reuse. No framework imports — only IIIF shared types.
 */

import type { IIIFItem } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

// ---------------------------------------------------------------------------
// Health score
// ---------------------------------------------------------------------------

/**
 * Calculate a health score as a percentage of items without errors.
 * Returns 100 when there are no items (nothing to validate).
 */
export function calculateHealthScore(errorCount: number, totalItems: number): number {
  if (totalItems === 0) return 100;
  return Math.max(0, Math.round(((totalItems - errorCount) / totalItems) * 100));
}

// ---------------------------------------------------------------------------
// Health color mapping
// ---------------------------------------------------------------------------

/** Text color class based on health score. */
export function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-orange-500';
  return 'text-red-600';
}

/** Background color class based on health score. */
export function getHealthBgColor(score: number): string {
  if (score >= 80) return 'bg-green-50';
  if (score >= 50) return 'bg-orange-50';
  return 'bg-red-50';
}

// ---------------------------------------------------------------------------
// Issue severity classes
// ---------------------------------------------------------------------------

/** Tailwind class sets for each issue severity level. */
export function getSeverityClasses(level: string): { bg: string; text: string; border: string } {
  switch (level) {
    case 'error':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    case 'warning':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    case 'info':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
}

// ---------------------------------------------------------------------------
// Tree search utilities
// ---------------------------------------------------------------------------

/**
 * Recursively search the IIIF tree for an item by id.
 * Returns null if not found or if the root is null.
 * Uses a visited set for cycle detection.
 */
export function findItemById(root: IIIFItem | null, targetId: string): IIIFItem | null {
  if (!root) return null;
  const visited = new Set<string>();

  function traverse(node: IIIFItem): IIIFItem | null {
    if (visited.has(node.id)) return null;
    visited.add(node.id);

    if (node.id === targetId) return node;

    const children = node.items as IIIFItem[] | undefined;
    const annotations = node.annotations as IIIFItem[] | undefined;
    const all = [...(children ?? []), ...(annotations ?? [])];

    for (const child of all) {
      const result = traverse(child);
      if (result) return result;
    }
    return null;
  }

  return traverse(root);
}

/**
 * Recursively search the IIIF tree for an item by id, building a
 * breadcrumb path of { id, label, type } objects from root to the target.
 * Returns { item: null, path: [] } when not found or root is null.
 * Uses a visited set for cycle detection.
 */
export function findItemAndPath(
  root: IIIFItem | null,
  targetId: string,
): { item: IIIFItem | null; path: { id: string; label: string; type: string }[] } {
  if (!root) return { item: null, path: [] };

  const pathResult: { id: string; label: string; type: string }[] = [];
  let found: IIIFItem | null = null;
  const visited = new Set<string>();

  function traverse(
    node: IIIFItem,
    currentPath: { id: string; label: string; type: string }[],
  ): boolean {
    if (visited.has(node.id)) return false;
    visited.add(node.id);

    const nodeInfo = {
      id: node.id,
      label: getIIIFValue(node.label) || 'Untitled',
      type: node.type,
    };

    if (node.id === targetId) {
      found = node;
      pathResult.push(...currentPath, nodeInfo);
      return true;
    }

    const children = node.items as IIIFItem[] | undefined;
    const annotations = node.annotations as IIIFItem[] | undefined;
    const all = [...(children ?? []), ...(annotations ?? [])];

    for (const child of all) {
      if (traverse(child, [...currentPath, nodeInfo])) return true;
    }
    return false;
  }

  traverse(root, []);
  return { item: found, path: pathResult };
}
