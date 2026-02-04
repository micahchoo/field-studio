/**
 * Entities Layer - Public API
 *
 * Features import entities from this file:
 *
 * import { canvas, manifest, collection } from '@/src/entities';
 *
 * // Access selectors and actions
 * const canvasData = canvas.model.selectById(state, id);
 * const action = canvas.actions.updateLabel(id, label);
 */

export * as canvas from './canvas';
export * as manifest from './manifest';
export * as collection from './collection';
