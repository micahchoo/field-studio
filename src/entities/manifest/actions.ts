/**
 * Manifest Entity Actions Layer
 *
 * Re-exports manifest-specific action creators from the action system.
 * This layer prevents features from accessing the action dispatcher directly.
 *
 * All action creators return an Action that should be dispatched via
 * the ActionDispatcher (typically handled by the Vault singleton).
 */

import { actions as vaultActions } from '@/services/actions';
import type { Action } from '@/services/actions';
import type { IIIFCanvas, LanguageMap } from '@/types';

/**
 * Update manifest label
 */
export const updateLabel = (manifestId: string, label: LanguageMap): Action => {
  return vaultActions.updateLabel(manifestId, label);
};

/**
 * Update manifest summary (description)
 */
export const updateSummary = (manifestId: string, summary: LanguageMap): Action => {
  return vaultActions.updateSummary(manifestId, summary);
};

/**
 * Update manifest metadata fields
 */
export const updateMetadata = (
  manifestId: string,
  metadata: Array<{ label: LanguageMap; value: LanguageMap }>
): Action => {
  return vaultActions.updateMetadata(manifestId, metadata);
};

/**
 * Update manifest rights
 */
export const updateRights = (manifestId: string, rights: string): Action => {
  return vaultActions.updateRights(manifestId, rights);
};

/**
 * Update manifest navigation date
 */
export const updateNavDate = (manifestId: string, navDate: string | undefined): Action => {
  return vaultActions.updateNavDate(manifestId, navDate);
};

/**
 * Update manifest viewing behaviors
 */
export const updateBehavior = (manifestId: string, behavior: string[]): Action => {
  return vaultActions.updateBehavior(manifestId, behavior);
};

/**
 * Update manifest viewing direction
 */
export const updateViewingDirection = (
  manifestId: string,
  viewingDirection: string
): Action => {
  return vaultActions.updateViewingDirection(manifestId, viewingDirection);
};

/**
 * Add canvas to manifest
 */
export const addCanvas = (
  manifestId: string,
  canvas: IIIFCanvas,
  index?: number
): Action => {
  return vaultActions.addCanvas(manifestId, canvas, index);
};

/**
 * Remove canvas from manifest
 */
export const removeCanvas = (manifestId: string, canvasId: string): Action => {
  return vaultActions.removeCanvas(manifestId, canvasId);
};

/**
 * Reorder canvases within manifest
 */
export const reorderCanvases = (manifestId: string, order: string[]): Action => {
  return vaultActions.reorderCanvases(manifestId, order);
};

/**
 * Move manifest to different parent collection
 */
export const moveToCollection = (
  manifestId: string,
  collectionId: string,
  index?: number
): Action => {
  return vaultActions.moveItem(manifestId, collectionId, index);
};

/**
 * Batch update manifest properties
 */
export const batchUpdate = (
  manifestId: string,
  changes: Partial<Record<string, unknown>>
): Action => {
  return vaultActions.batchUpdate([{ id: manifestId, changes }]);
};
