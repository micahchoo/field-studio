/**
 * Canvas Entity Model Layer
 *
 * Re-exports canvas-specific selectors from the vault.
 * This layer prevents features from accessing vault directly.
 *
 * All functions expect: (state: NormalizedState, id: string, ...)
 */

import {
  getAncestors,
  getChildIds,
  getDescendants,
  getEntitiesByType,
  getEntity,
  getParentId,
  NormalizedState
} from '@/services/vault';
import type { IIIFCanvas } from '@/types';

/**
 * Select a canvas by ID
 */
export const selectById = (state: NormalizedState, id: string): IIIFCanvas | null => {
  const entity = getEntity(state, id);
  return entity?.type === 'Canvas' ? (entity as IIIFCanvas) : null;
};

/**
 * Select all annotation pages (children) of a canvas
 */
export const selectAnnotationPages = (state: NormalizedState, canvasId: string): string[] => {
  return getChildIds(state, canvasId);
};

/**
 * Select parent manifest of a canvas
 */
export const selectParentManifest = (state: NormalizedState, canvasId: string): string | null => {
  return getParentId(state, canvasId);
};

/**
 * Select all canvases in the vault
 */
export const selectAll = (state: NormalizedState): IIIFCanvas[] => {
  return getEntitiesByType(state, 'Canvas') as IIIFCanvas[];
};

/**
 * Select all ancestors (path to root) for a canvas
 */
export const selectAncestors = (state: NormalizedState, canvasId: string): string[] => {
  return getAncestors(state, canvasId);
};

/**
 * Select all descendants of a canvas (nested annotation pages and annotations)
 */
export const selectDescendants = (state: NormalizedState, canvasId: string): string[] => {
  return getDescendants(state, canvasId);
};

/**
 * Select canvas dimensions
 */
export const selectDimensions = (state: NormalizedState, canvasId: string) => {
  const canvas = selectById(state, canvasId);
  return canvas ? { width: canvas.width, height: canvas.height } : null;
};

/**
 * Select canvas label
 */
export const selectLabel = (state: NormalizedState, canvasId: string) => {
  const canvas = selectById(state, canvasId);
  return canvas?.label || null;
};

/**
 * Check if canvas has annotations
 */
export const hasAnnotations = (state: NormalizedState, canvasId: string): boolean => {
  const pages = selectAnnotationPages(state, canvasId);
  return pages.length > 0;
};

/**
 * Count total annotations in a canvas
 */
export const countAnnotations = (state: NormalizedState, canvasId: string): number => {
  const pages = selectAnnotationPages(state, canvasId);
  return pages.reduce((count, pageId) => {
    return count + getChildIds(state, pageId).length;
  }, 0);
};
