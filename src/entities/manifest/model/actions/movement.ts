/**
 * Movement-related action handlers.
 * Handles: MOVE_ITEM, BATCH_UPDATE, RELOAD_TREE
 */

import type { Action, ActionResult } from './types';
import type { NormalizedState } from '../vault';
import {
  getEntity,
  moveEntity,
  normalize,
  updateEntity
} from '../vault';
import type { IIIFItem } from '@/src/shared/types';
import type { PropertyChange } from '@/src/shared/services/provenanceService';
import {
  getRelationshipType,
  getValidChildTypes,
  isValidChildType
} from '@/utils/iiifHierarchy';

export function handleMovementAction(state: NormalizedState, action: Action): ActionResult | null {
  switch (action.type) {
    case 'MOVE_ITEM': {
      // Validate the move using centralized IIIF hierarchy rules
      const itemToMove = getEntity(state, action.itemId);
      const newParent = getEntity(state, action.newParentId);

      if (!itemToMove) {
        return { success: false, state, error: `Item not found: ${action.itemId}` };
      }
      if (!newParent) {
        return { success: false, state, error: `Parent not found: ${action.newParentId}` };
      }

      // Check if move is valid according to IIIF spec
      if (!isValidChildType(newParent.type, itemToMove.type)) {
        const validChildren = getValidChildTypes(newParent.type);
        return {
          success: false,
          state,
          error: `Cannot move ${itemToMove.type} into ${newParent.type}. Valid children: ${validChildren.join(', ') || 'none'}`
        };
      }

      // Determine relationship type for the move
      const relationshipType = getRelationshipType(newParent.type, itemToMove.type);

      return {
        success: true,
        state: moveEntity(state, action.itemId, action.newParentId, action.index),
        changes: [{
          property: '_parentId',
          oldValue: state.reverseRefs[action.itemId],
          newValue: action.newParentId
        }, {
          property: '_relationshipType',
          oldValue: null,
          newValue: relationshipType
        }]
      };
    }

    case 'BATCH_UPDATE': {
      let currentState = state;
      const allChanges: PropertyChange[] = [];

      for (const update of action.updates) {
        const entity = getEntity(state, update.id);
        currentState = updateEntity(currentState, update.id, update.changes);
        for (const [prop, value] of Object.entries(update.changes)) {
          const oldValue = entity ? (entity as unknown as Record<string, unknown>)[prop] : undefined;
          allChanges.push({
            property: prop,
            oldValue,
            newValue: value
          });
        }
      }

      return {
        success: true,
        state: currentState,
        changes: allChanges
      };
    }

    case 'RELOAD_TREE': {
      // Re-normalize the entire tree from a modified root
      // This is used after healing operations to sync vault with modified tree
      try {
        const newState = normalize(action.root);
        return {
          success: true,
          state: newState,
          changes: [{ property: '_root', oldValue: state.rootId, newValue: newState.rootId }]
        };
      } catch (e) {
        return {
          success: false,
          state,
          error: e instanceof Error ? e.message : 'Failed to reload tree'
        };
      }
    }

    default:
      return null;
  }
}
