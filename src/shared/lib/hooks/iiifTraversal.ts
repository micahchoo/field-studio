/**
 * IIIF Traversal — Pure computation (Category 1)
 *
 * Replaces useIIIFTraversal React hook.
 * Architecture doc §4 Cat 1: plain functions.
 *
 * Utility functions for traversing IIIF manifest tree.
 * Works with vault's NormalizedState directly.
 * Uses typeIndex, references (childIndex), and reverseRefs (parentIndex)
 * for O(1) lookups at each step.
 */

import type { NormalizedState, EntityType, IIIFItem } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

// --------------------------------------------------------------------------
// Internal helpers
// --------------------------------------------------------------------------

/** Resolve an entity from the normalized store by id, returning a slim descriptor */
function toDescriptor(
  state: NormalizedState,
  id: string
): { id: string; type: string; label?: string } | null {
  const entityType = state.typeIndex[id] as EntityType | undefined;
  if (!entityType) return null;

  const store = state.entities[entityType] as Record<string, IIIFItem>;
  const entity = store[id];
  if (!entity) return null;

  return {
    id: entity.id,
    type: entity.type,
    label: entity.label ? getIIIFValue(entity.label) : undefined,
  };
}

// --------------------------------------------------------------------------
// getAllCanvases
// --------------------------------------------------------------------------

/**
 * Get all canvases from the manifest tree.
 *
 * Pseudocode:
 *   1. Read every entry in entities.Canvas
 *   2. Map each to { id, label } descriptor
 *   3. Return as array
 */
export function getAllCanvases(
  state: NormalizedState
): Array<{ id: string; label?: string }> {
  const canvasStore = state.entities.Canvas;
  return Object.values(canvasStore).map((canvas) => ({
    id: canvas.id,
    label: canvas.label ? getIIIFValue(canvas.label) : undefined,
  }));
}

// --------------------------------------------------------------------------
// getAllItems
// --------------------------------------------------------------------------

/**
 * Get all items recursively from a parent (or from the root if parentId is omitted).
 *
 * Pseudocode:
 *   1. Determine start node: parentId or state.rootId
 *   2. BFS from start node using state.references (child ids)
 *   3. Collect every visited node as a descriptor
 */
export function getAllItems(
  state: NormalizedState,
  parentId?: string
): Array<{ id: string; type: string; label?: string }> {
  // Determine starting point
  const startId = parentId ?? state.rootId;
  if (!startId) return [];

  const results: Array<{ id: string; type: string; label?: string }> = [];

  // BFS traversal using references (child index)
  const queue: string[] = [startId];
  const visited = new Set<string>();
  let idx = 0;

  while (idx < queue.length) {
    const currentId = queue[idx++];
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const desc = toDescriptor(state, currentId);
    if (desc) {
      results.push(desc);
    }

    // Enqueue children
    const childIds = state.references[currentId];
    if (childIds) {
      for (let i = 0; i < childIds.length; i++) {
        if (!visited.has(childIds[i])) {
          queue.push(childIds[i]);
        }
      }
    }
  }

  return results;
}

// --------------------------------------------------------------------------
// getChildItems
// --------------------------------------------------------------------------

/**
 * Get direct children of a node.
 *
 * Pseudocode:
 *   1. Look up child IDs from state.references[parentId]
 *   2. Map each child ID to its descriptor
 *   3. Filter out any nulls (missing entities)
 */
export function getChildItems(
  state: NormalizedState,
  parentId: string
): Array<{ id: string; type: string; label?: string }> {
  const childIds = state.references[parentId];
  if (!childIds || childIds.length === 0) return [];

  const results: Array<{ id: string; type: string; label?: string }> = [];
  for (const childId of childIds) {
    const desc = toDescriptor(state, childId);
    if (desc) results.push(desc);
  }
  return results;
}

// --------------------------------------------------------------------------
// getAncestors
// --------------------------------------------------------------------------

/**
 * Get ancestors of an item up to root, ordered from immediate parent to root.
 *
 * Pseudocode:
 *   1. Walk up using state.reverseRefs[id] (parent index)
 *   2. Collect each ancestor's descriptor
 *   3. Stop when no parent is found (root reached)
 *   4. Guard against cycles with a visited set
 */
export function getAncestors(
  state: NormalizedState,
  itemId: string
): Array<{ id: string; type: string; label?: string }> {
  const ancestors: Array<{ id: string; type: string; label?: string }> = [];
  const visited = new Set<string>();
  let currentId = state.reverseRefs[itemId];

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const desc = toDescriptor(state, currentId);
    if (desc) ancestors.push(desc);
    currentId = state.reverseRefs[currentId];
  }

  return ancestors;
}
