/**
 * Canvas Entity Actions Layer
 *
 * Re-exports canvas-specific action creators from the action system.
 * This layer prevents features from accessing the action dispatcher directly.
 *
 * All action creators return an Action that should be dispatched via
 * the ActionDispatcher (typically handled by the Vault singleton).
 */

import { actions as vaultActions } from '@/services/actions';
import type { Action } from '@/services/actions';
import type { IIIFCanvas, IIIFAnnotation, LanguageMap } from '@/types';

/**
 * Update canvas label
 */
export const updateLabel = (canvasId: string, label: LanguageMap): Action => {
  return vaultActions.updateLabel(canvasId, label);
};

/**
 * Update canvas summary (description)
 */
export const updateSummary = (canvasId: string, summary: LanguageMap): Action => {
  return vaultActions.updateSummary(canvasId, summary);
};

/**
 * Update canvas metadata fields
 */
export const updateMetadata = (
  canvasId: string,
  metadata: Array<{ label: LanguageMap; value: LanguageMap }>
): Action => {
  return vaultActions.updateMetadata(canvasId, metadata);
};

/**
 * Update canvas dimensions
 */
export const updateDimensions = (
  canvasId: string,
  width: number,
  height: number
): Action => {
  return vaultActions.updateCanvasDimensions(canvasId, width, height);
};

/**
 * Add annotation to canvas
 */
export const addAnnotation = (
  canvasId: string,
  annotation: IIIFAnnotation
): Action => {
  return vaultActions.addAnnotation(canvasId, annotation);
};

/**
 * Remove annotation from canvas
 */
export const removeAnnotation = (
  canvasId: string,
  annotationId: string
): Action => {
  return vaultActions.removeAnnotation(canvasId, annotationId);
};

/**
 * Move canvas to a different parent (manifest)
 */
export const moveToManifest = (
  canvasId: string,
  manifestId: string,
  index?: number
): Action => {
  return vaultActions.moveItem(canvasId, manifestId, index);
};

/**
 * Batch update canvas properties
 */
export const batchUpdate = (
  canvasId: string,
  changes: Partial<IIIFCanvas>
): Action => {
  return vaultActions.batchUpdate([{ id: canvasId, changes }]);
};
