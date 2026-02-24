/**
 * Range/Structure action handlers.
 * Handles: ADD_RANGE, REMOVE_RANGE, ADD_CANVAS_TO_RANGE,
 *          REMOVE_CANVAS_FROM_RANGE, REORDER_RANGE_ITEMS, ADD_NESTED_RANGE
 */

import type { Action, ActionResult } from './types';
import type { NormalizedState } from '../vault';
import {
  addEntity,
  getEntity,
  removeEntity,
  updateEntity
} from '../vault';
import type { IIIFItem, IIIFManifest, IIIFRange } from '@/src/shared/types';
import type { PropertyChange } from '@/src/shared/services/provenanceService';

/** Union of all valid range item types (IIIF 3.0 §5.8). */
type RangeItem = IIIFRange['items'][number];

export function handleRangeAction(state: NormalizedState, action: Action): ActionResult | null {
  switch (action.type) {
    case 'ADD_RANGE': {
      // Validate range
      if (!action.range.id) {
        return { success: false, state, error: 'Range must have an id' };
      }
      if (action.range.type !== 'Range') {
        return { success: false, state, error: 'Range must have type "Range"' };
      }

      // Get manifest to add range to
      const manifest = getEntity(state, action.manifestId) as IIIFManifest;
      if (!manifest) {
        return { success: false, state, error: `Manifest not found: ${action.manifestId}` };
      }

      // Add the range entity to state
      let newState = addEntity(state, action.range as IIIFItem, action.manifestId);

      // Update manifest's structures array
      const currentStructures = (manifest.structures || []).map(s =>
        typeof s === 'string' ? s : s.id
      );
      const newStructures = [...currentStructures];
      if (typeof action.index === 'number') {
        newStructures.splice(action.index, 0, action.range.id);
      } else {
        newStructures.push(action.range.id);
      }

      // Update manifest with new structures reference
      newState = updateEntity(newState, action.manifestId, {
        structures: newStructures.map(id => ({ id, type: 'Range' }))
      } as Partial<IIIFManifest>);

      return {
        success: true,
        state: newState,
        changes: [{ property: 'structures', oldValue: currentStructures, newValue: newStructures }]
      };
    }

    case 'REMOVE_RANGE': {
      const manifest = getEntity(state, action.manifestId) as IIIFManifest;
      if (!manifest) {
        return { success: false, state, error: `Manifest not found: ${action.manifestId}` };
      }

      const range = getEntity(state, action.rangeId);
      if (!range) {
        return { success: false, state, error: `Range not found: ${action.rangeId}` };
      }

      // Remove from structures array
      const currentStructures = (manifest.structures || []).map(s =>
        typeof s === 'string' ? s : s.id
      );
      const newStructures = currentStructures.filter(id => id !== action.rangeId);

      // Remove entity and update manifest
      let newState = removeEntity(state, action.rangeId);
      newState = updateEntity(newState, action.manifestId, {
        structures: newStructures.map(id => ({ id, type: 'Range' }))
      } as Partial<IIIFManifest>);

      return {
        success: true,
        state: newState,
        changes: [{ property: 'structures', oldValue: currentStructures, newValue: newStructures }]
      };
    }

    case 'ADD_CANVAS_TO_RANGE': {
      const range = getEntity(state, action.rangeId) as IIIFRange;
      if (!range) {
        return { success: false, state, error: `Range not found: ${action.rangeId}` };
      }

      // Verify canvas exists
      const canvas = getEntity(state, action.canvasId);
      if (!canvas) {
        return { success: false, state, error: `Canvas not found: ${action.canvasId}` };
      }

      // Get current items (could be references or nested ranges)
      const currentItems = range.items || [];
      const currentItemIds = currentItems.map((item: RangeItem) => item.id ?? '');

      // Check if already in range
      if (currentItemIds.includes(action.canvasId)) {
        return { success: false, state, error: 'Canvas already in range' };
      }

      // Add canvas reference to range items
      const newItems = [...currentItems];
      const canvasRef = { id: action.canvasId, type: 'Canvas' as const };
      if (typeof action.index === 'number') {
        newItems.splice(action.index, 0, canvasRef);
      } else {
        newItems.push(canvasRef);
      }

      const newState = updateEntity(state, action.rangeId, {
        items: newItems
      } as Partial<IIIFRange>);

      return {
        success: true,
        state: newState,
        changes: [{ property: 'items', oldValue: currentItems, newValue: newItems }]
      };
    }

    case 'REMOVE_CANVAS_FROM_RANGE': {
      const range = getEntity(state, action.rangeId) as IIIFRange;
      if (!range) {
        return { success: false, state, error: `Range not found: ${action.rangeId}` };
      }

      const currentItems = range.items || [];
      const newItems = currentItems.filter((item: RangeItem) =>
        (item.id ?? '') !== action.canvasId
      );

      if (newItems.length === currentItems.length) {
        return { success: false, state, error: 'Canvas not found in range' };
      }

      const newState = updateEntity(state, action.rangeId, {
        items: newItems
      } as Partial<IIIFRange>);

      return {
        success: true,
        state: newState,
        changes: [{ property: 'items', oldValue: currentItems, newValue: newItems }]
      };
    }

    case 'REORDER_RANGE_ITEMS': {
      const range = getEntity(state, action.rangeId) as IIIFRange;
      if (!range) {
        return { success: false, state, error: `Range not found: ${action.rangeId}` };
      }

      const currentItems = range.items || [];
      const currentIds = currentItems.map((item: RangeItem) => item.id ?? '');

      // Validate the new order contains all current items
      if (currentIds.length !== action.order.length) {
        return { success: false, state, error: 'Reorder must include all existing items' };
      }

      const currentSet = new Set(currentIds);
      for (const id of action.order) {
        if (!currentSet.has(id)) {
          return { success: false, state, error: `Unknown item ID in range: ${id}` };
        }
      }

      // Build new items array in the specified order
      const itemMap = new Map(currentItems.map((item: RangeItem) => [item.id ?? '', item]));
      const newItems = action.order.map(id => itemMap.get(id)!);

      const newState = updateEntity(state, action.rangeId, {
        items: newItems
      } as Partial<IIIFRange>);

      return {
        success: true,
        state: newState,
        changes: [{ property: 'items', oldValue: currentItems, newValue: newItems }]
      };
    }

    case 'ADD_NESTED_RANGE': {
      const parentRange = getEntity(state, action.parentRangeId) as IIIFRange;
      if (!parentRange) {
        return { success: false, state, error: `Parent range not found: ${action.parentRangeId}` };
      }

      // Validate new range
      if (!action.range.id) {
        return { success: false, state, error: 'Range must have an id' };
      }
      if (action.range.type !== 'Range') {
        return { success: false, state, error: 'Range must have type "Range"' };
      }

      // Add the nested range entity to state
      let newState = addEntity(state, action.range as IIIFItem, action.parentRangeId);

      // Add reference to parent's items
      const currentItems = parentRange.items || [];
      const newItems = [...currentItems];
      const rangeRef = { id: action.range.id, type: 'Range' as const };
      if (typeof action.index === 'number') {
        newItems.splice(action.index, 0, rangeRef);
      } else {
        newItems.push(rangeRef);
      }

      newState = updateEntity(newState, action.parentRangeId, {
        items: newItems
      } as Partial<IIIFRange>);

      return {
        success: true,
        state: newState,
        changes: [{ property: 'items', oldValue: currentItems, newValue: newItems }]
      };
    }

    default:
      return null;
  }
}
