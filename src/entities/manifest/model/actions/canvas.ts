/**
 * Canvas-related action handlers.
 * Handles: ADD_CANVAS, REMOVE_CANVAS, REORDER_CANVASES, UPDATE_CANVAS_DIMENSIONS
 */

import type { Action, ActionResult } from './types';
import type { NormalizedState } from '../vault';
import {
  addEntity,
  getEntity,
  removeEntity,
  reorderChildren,
  updateEntity
} from '../vault';
import type { IIIFCanvas, IIIFItem } from '@/src/shared/types';
import type { PropertyChange } from '@/src/shared/services/provenanceService';
import { validateCanvasDimensions } from './validation';

export function handleCanvasAction(state: NormalizedState, action: Action): ActionResult | null {
  switch (action.type) {
    case 'UPDATE_CANVAS_DIMENSIONS': {
      const error = validateCanvasDimensions(action.width, action.height);
      if (error) return { success: false, state, error };

      const canvas = getEntity(state, action.canvasId) as IIIFCanvas;
      const changes: PropertyChange[] = [
        { property: 'width', oldValue: canvas?.width, newValue: action.width },
        { property: 'height', oldValue: canvas?.height, newValue: action.height }
      ];

      return {
        success: true,
        state: updateEntity(state, action.canvasId, {
          width: action.width,
          height: action.height
        } as Partial<IIIFCanvas>),
        changes
      };
    }

    case 'ADD_CANVAS': {
      // Validate canvas
      if (!action.canvas.id) {
        return { success: false, state, error: 'Canvas must have an id' };
      }

      const dimError = validateCanvasDimensions(action.canvas.width, action.canvas.height);
      if (dimError) return { success: false, state, error: dimError };

      let newState = addEntity(state, action.canvas as IIIFItem, action.manifestId);

      // Handle index positioning
      if (typeof action.index === 'number') {
        const children = [...(state.references[action.manifestId] || [])];
        const newId = action.canvas.id;
        // Remove from end (where addEntity put it) and insert at index
        const filtered = children.filter(id => id !== newId);
        filtered.splice(action.index, 0, newId);
        newState = reorderChildren(newState, action.manifestId, filtered);
      }

      return {
        success: true,
        state: newState,
        changes: [{ property: 'items', oldValue: null, newValue: action.canvas.id }]
      };
    }

    case 'REMOVE_CANVAS': {
      return {
        success: true,
        state: removeEntity(state, action.canvasId),
        changes: [{ property: 'items', oldValue: action.canvasId, newValue: null }]
      };
    }

    case 'REORDER_CANVASES': {
      // Validate that all IDs exist in current children
      const currentChildren = state.references[action.manifestId] || [];
      const currentSet = new Set(currentChildren);

      if (currentChildren.length !== action.order.length) {
        return { success: false, state, error: 'Reorder must include all existing canvases' };
      }

      for (const id of action.order) {
        if (!currentSet.has(id)) {
          return { success: false, state, error: `Unknown canvas ID: ${id}` };
        }
      }

      return {
        success: true,
        state: reorderChildren(state, action.manifestId, action.order),
        changes: [{
          property: 'items',
          oldValue: currentChildren,
          newValue: action.order
        }]
      };
    }

    default:
      return null;
  }
}
