/**
 * Vault Query Functions (Organism Layer)
 *
 * O(1) lookup functions for querying the normalized state.
 * These provide fast access to entities and their relationships.
 */

import type { EntityType, IIIFItem, NormalizedState } from '@/src/shared/types';

/**
 * Get an entity by ID - O(1)
 */
export function getEntity(state: NormalizedState, id: string): IIIFItem | null {
  const type = state.typeIndex[id];
  if (!type) return null;

  const store = state.entities[type] as Record<string, IIIFItem>;
  return store[id] || null;
}

/**
 * Get entity type by ID - O(1)
 */
export function getEntityType(state: NormalizedState, id: string): EntityType | null {
  return state.typeIndex[id] || null;
}

/**
 * Get parent ID - O(1)
 */
export function getParentId(state: NormalizedState, id: string): string | null {
  return state.reverseRefs[id] || null;
}

/**
 * Get child IDs - O(1)
 */
export function getChildIds(state: NormalizedState, id: string): string[] {
  return state.references[id] || [];
}

/**
 * Get all entities of a type
 */
export function getEntitiesByType<T extends IIIFItem>(
  state: NormalizedState,
  type: EntityType
): T[] {
  const store = state.entities[type] as Record<string, T>;
  return Object.values(store);
}

/**
 * Get ancestors (path to root)
 */
export function getAncestors(state: NormalizedState, id: string): string[] {
  const ancestors: string[] = [];
  let currentId = state.reverseRefs[id];

  while (currentId) {
    ancestors.push(currentId);
    currentId = state.reverseRefs[currentId];
  }

  return ancestors;
}

/**
 * Get all descendants recursively
 */
export function getDescendants(state: NormalizedState, id: string): string[] {
  const descendants: string[] = [];
  const queue = [...(state.references[id] || [])];

  while (queue.length > 0) {
    const childId = queue.shift()!;
    descendants.push(childId);
    queue.push(...(state.references[childId] || []));
  }

  return descendants;
}

/**
 * Check if an entity exists
 */
export function hasEntity(state: NormalizedState, id: string): boolean {
  return !!state.typeIndex[id];
}

/**
 * Get root entity ID
 */
export function getRootId(state: NormalizedState): string | null {
  return state.rootId;
}

/**
 * Get all entity IDs in the state
 */
export function getAllEntityIds(state: NormalizedState): string[] {
  return Object.keys(state.typeIndex);
}

/**
 * Get entity count by type
 */
export function getEntityCount(state: NormalizedState, type: EntityType): number {
  return Object.keys(state.entities[type]).length;
}

/**
 * Get total entity count
 */
export function getTotalEntityCount(state: NormalizedState): number {
  return Object.values(state.entities).reduce(
    (total, store) => total + Object.keys(store).length,
    0
  );
}
