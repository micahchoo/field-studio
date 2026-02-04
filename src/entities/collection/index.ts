/**
 * Collection Entity - Public API
 *
 * Features import collection entity operations from this file:
 *
 * import { collection } from '@/src/entities';
 *
 * // Access selectors
 * const collectionData = collection.model.selectById(state, id);
 * const members = collection.model.selectMembers(state, id);
 *
 * // Create actions (dispatch separately)
 * const action = collection.actions.updateLabel(id, { en: ['New Label'] });
 */

export * as model from './model';
export * as actions from './actions';
export type { IIIFCollection } from '@/types';
