/**
 * Canvas Entity - Public API
 *
 * Features import canvas entity operations from this file:
 *
 * import { canvas } from '@/src/entities';
 *
 * // Access selectors
 * const canvasData = canvas.model.selectById(state, id);
 * const dimensions = canvas.model.selectDimensions(state, id);
 *
 * // Create actions (dispatch separately)
 * const action = canvas.actions.updateLabel(id, { en: ['New Label'] });
 */

export * as model from './model';
export * as actions from './actions';
export type { IIIFCanvas } from '@/types';
