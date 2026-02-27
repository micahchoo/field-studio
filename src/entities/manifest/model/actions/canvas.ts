/**
 * Canvas-related action handlers.
 * Handles: ADD_CANVAS, REMOVE_CANVAS, REORDER_CANVASES, UPDATE_CANVAS_DIMENSIONS, GROUP_INTO_MANIFEST
 */

import type { Action, ActionResult } from './types';
import type { NormalizedState } from '../vault';
import {
  addEntity,
  getEntity,
  moveEntity,
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

    case 'GROUP_INTO_MANIFEST': {
      if (action.canvasIds.length === 0) {
        return { success: false, state, error: 'No canvas IDs provided' };
      }

      const rootId = state.rootId;
      if (!rootId) {
        return { success: false, state, error: 'No root entity' };
      }

      // Validate all canvas IDs exist
      for (const canvasId of action.canvasIds) {
        if (!getEntity(state, canvasId)) {
          return { success: false, state, error: `Canvas not found: ${canvasId}` };
        }
      }

      // Create new manifest entity
      const manifest: IIIFItem = {
        id: action.manifestId,
        type: 'Manifest',
        label: action.label,
        items: [],
      };

      // Add manifest as child of root
      let newState = addEntity(state, manifest, rootId);

      // Move each canvas into the new manifest
      for (const canvasId of action.canvasIds) {
        newState = moveEntity(newState, canvasId, action.manifestId);
      }

      return {
        success: true,
        state: newState,
        changes: [{ property: 'items', oldValue: null, newValue: action.manifestId }],
      };
    }

    default:
      return null;
  }
}
