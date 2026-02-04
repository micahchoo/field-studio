/**
 * Collection Entity Actions Layer
 *
 * Re-exports collection-specific action creators from the action system.
 * This layer prevents features from accessing the action dispatcher directly.
 *
 * All action creators return an Action that should be dispatched via
 * the ActionDispatcher (typically handled by the Vault singleton).
 */

import { actions as vaultActions } from '@/services/actions';
import type { Action } from '@/services/actions';
import type { LanguageMap } from '@/types';

/**
 * Update collection label
 */
export const updateLabel = (collectionId: string, label: LanguageMap): Action => {
  return vaultActions.updateLabel(collectionId, label);
};

/**
 * Update collection summary (description)
 */
export const updateSummary = (collectionId: string, summary: LanguageMap): Action => {
  return vaultActions.updateSummary(collectionId, summary);
};

/**
 * Update collection metadata fields
 */
export const updateMetadata = (
  collectionId: string,
  metadata: Array<{ label: LanguageMap; value: LanguageMap }>
): Action => {
  return vaultActions.updateMetadata(collectionId, metadata);
};

/**
 * Update collection rights
 */
export const updateRights = (collectionId: string, rights: string): Action => {
  return vaultActions.updateRights(collectionId, rights);
};

/**
 * Update collection viewing behaviors
 */
export const updateBehavior = (collectionId: string, behavior: string[]): Action => {
  return vaultActions.updateBehavior(collectionId, behavior);
};

/**
 * Add member (manifest or nested collection) to collection
 * Note: This is a reference, not ownership. The member can be in multiple collections.
 */
export const addMember = (
  collectionId: string,
  memberId: string
): Action => {
  // Collections use the same ADD_CANVAS action pattern but for references
  // The vault handles this appropriately
  return vaultActions.moveItem(memberId, collectionId);
};

/**
 * Move nested collection to different parent
 */
export const moveToParentCollection = (
  collectionId: string,
  parentCollectionId: string,
  index?: number
): Action => {
  return vaultActions.moveItem(collectionId, parentCollectionId, index);
};

/**
 * Batch update collection properties
 */
export const batchUpdate = (
  collectionId: string,
  changes: Partial<Record<string, unknown>>
): Action => {
  return vaultActions.batchUpdate([{ id: collectionId, changes }]);
};
