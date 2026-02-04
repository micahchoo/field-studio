/**
 * Manifest Entity - Public API
 *
 * Features import manifest entity operations from this file:
 *
 * import { manifest } from '@/src/entities';
 *
 * // Access selectors
 * const manifestData = manifest.model.selectById(state, id);
 * const canvases = manifest.model.selectCanvases(state, id);
 *
 * // Create actions (dispatch separately)
 * const action = manifest.actions.updateLabel(id, { en: ['New Label'] });
 */

export * as model from './model';
export * as actions from './actions';
export type { IIIFManifest } from '@/types';
