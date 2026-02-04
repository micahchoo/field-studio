/**
 * Collection Entity Model Layer
 *
 * Re-exports collection-specific selectors from the vault.
 * This layer prevents features from accessing vault directly.
 *
 * All functions expect: (state: NormalizedState, id: string, ...)
 */

import {
  getAncestors,
  getChildIds,
  getCollectionMembers,
  getCollectionsContaining,
  getDescendants,
  getEntitiesByType,
  getEntity,
  getOrphanManifests,
  getParentId,
  NormalizedState
} from '@/services/vault';
import type { IIIFCollection } from '@/types';

/**
 * Select a collection by ID
 */
export const selectById = (state: NormalizedState, id: string): IIIFCollection | null => {
  const entity = getEntity(state, id);
  return entity?.type === 'Collection' ? (entity as IIIFCollection) : null;
};

/**
 * Select all members (manifests or nested collections) of a collection
 */
export const selectMembers = (state: NormalizedState, collectionId: string): string[] => {
  return getCollectionMembers(state, collectionId);
};

/**
 * Select parent collection (hierarchical ownership)
 */
export const selectParentCollection = (state: NormalizedState, collectionId: string): string | null => {
  return getParentId(state, collectionId);
};

/**
 * Select all collections that reference this collection (many-to-many)
 */
export const selectCollectionMemberships = (state: NormalizedState, collectionId: string): string[] => {
  return getCollectionsContaining(state, collectionId);
};

/**
 * Select all collections in the vault
 */
export const selectAll = (state: NormalizedState): IIIFCollection[] => {
  return getEntitiesByType(state, 'Collection') as IIIFCollection[];
};

/**
 * Select all ancestors (path to root) for a collection
 */
export const selectAncestors = (state: NormalizedState, collectionId: string): string[] => {
  return getAncestors(state, collectionId);
};

/**
 * Select all descendants of a collection (nested items, canvases, etc.)
 */
export const selectDescendants = (state: NormalizedState, collectionId: string): string[] => {
  return getDescendants(state, collectionId);
};

/**
 * Select collection label
 */
export const selectLabel = (state: NormalizedState, collectionId: string) => {
  const collection = selectById(state, collectionId);
  return collection?.label || null;
};

/**
 * Select collection summary (description)
 */
export const selectSummary = (state: NormalizedState, collectionId: string) => {
  const collection = selectById(state, collectionId);
  return collection?.summary || null;
};

/**
 * Select collection metadata
 */
export const selectMetadata = (state: NormalizedState, collectionId: string) => {
  const collection = selectById(state, collectionId);
  return collection?.metadata || [];
};

/**
 * Count members (manifests or nested collections)
 */
export const countMembers = (state: NormalizedState, collectionId: string): number => {
  return selectMembers(state, collectionId).length;
};

/**
 * Check if collection has members
 */
export const hasMembers = (state: NormalizedState, collectionId: string): boolean => {
  return countMembers(state, collectionId) > 0;
};

/**
 * Get all orphan manifests (manifests not in any collection)
 */
export const selectOrphanManifests = (state: NormalizedState): string[] => {
  return getOrphanManifests(state).map(m => m.id);
};

/**
 * Check if collection is the root collection
 */
export const isRoot = (state: NormalizedState, collectionId: string): boolean => {
  return state.rootId === collectionId;
};

/**
 * Select top-level collections (no parent)
 */
export const selectTopLevel = (state: NormalizedState): IIIFCollection[] => {
  return selectAll(state).filter(c => !selectParentCollection(state, c.id));
};
