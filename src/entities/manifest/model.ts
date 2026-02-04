/**
 * Manifest Entity Model Layer
 *
 * Re-exports manifest-specific selectors from the vault.
 * This layer prevents features from accessing vault directly.
 *
 * All functions expect: (state: NormalizedState, id: string, ...)
 */

import {
  NormalizedState,
  getEntity,
  getChildIds,
  getParentId,
  getEntitiesByType,
  getAncestors,
  getDescendants,
  getCollectionsContaining,
  isOrphanManifest
} from '@/services/vault';
import type { IIIFManifest } from '@/types';

/**
 * Select a manifest by ID
 */
export const selectById = (state: NormalizedState, id: string): IIIFManifest | null => {
  const entity = getEntity(state, id);
  return entity?.type === 'Manifest' ? (entity as IIIFManifest) : null;
};

/**
 * Select all canvases (children) of a manifest
 */
export const selectCanvases = (state: NormalizedState, manifestId: string): string[] => {
  return getChildIds(state, manifestId);
};

/**
 * Select parent collection of a manifest (if hierarchical)
 */
export const selectParentCollection = (state: NormalizedState, manifestId: string): string | null => {
  return getParentId(state, manifestId);
};

/**
 * Select all collections that reference this manifest (many-to-many)
 */
export const selectCollectionMemberships = (state: NormalizedState, manifestId: string): string[] => {
  return getCollectionsContaining(state, manifestId);
};

/**
 * Select all manifests in the vault
 */
export const selectAll = (state: NormalizedState): IIIFManifest[] => {
  return getEntitiesByType(state, 'Manifest') as IIIFManifest[];
};

/**
 * Select all ancestors (path to root) for a manifest
 */
export const selectAncestors = (state: NormalizedState, manifestId: string): string[] => {
  return getAncestors(state, manifestId);
};

/**
 * Select all descendants of a manifest (canvases, annotation pages, annotations)
 */
export const selectDescendants = (state: NormalizedState, manifestId: string): string[] => {
  return getDescendants(state, manifestId);
};

/**
 * Select manifest label
 */
export const selectLabel = (state: NormalizedState, manifestId: string) => {
  const manifest = selectById(state, manifestId);
  return manifest?.label || null;
};

/**
 * Select manifest summary (description)
 */
export const selectSummary = (state: NormalizedState, manifestId: string) => {
  const manifest = selectById(state, manifestId);
  return manifest?.summary || null;
};

/**
 * Select manifest metadata
 */
export const selectMetadata = (state: NormalizedState, manifestId: string) => {
  const manifest = selectById(state, manifestId);
  return manifest?.metadata || [];
};

/**
 * Select manifest rights
 */
export const selectRights = (state: NormalizedState, manifestId: string) => {
  const manifest = selectById(state, manifestId);
  return manifest?.rights || null;
};

/**
 * Check if manifest is standalone (not in any collection)
 */
export const isOrphan = (state: NormalizedState, manifestId: string): boolean => {
  return isOrphanManifest(state, manifestId);
};

/**
 * Count total canvases in manifest
 */
export const countCanvases = (state: NormalizedState, manifestId: string): number => {
  return selectCanvases(state, manifestId).length;
};

/**
 * Check if manifest has canvases
 */
export const hasCanvases = (state: NormalizedState, manifestId: string): boolean => {
  return countCanvases(state, manifestId) > 0;
};

/**
 * Select canvas IDs within manifest
 */
export const selectCanvasIds = (state: NormalizedState, manifestId: string): string[] => {
  return selectCanvases(state, manifestId);
};
