/**
 * Trash/Restore action handlers.
 * Handles: MOVE_TO_TRASH, RESTORE_FROM_TRASH, EMPTY_TRASH, BATCH_RESTORE
 */

import type { Action, ActionResult } from './types';
import type { NormalizedState } from '../vault';
import {
  emptyTrash,
  getEntity,
  moveEntityToTrash,
  restoreEntityFromTrash
} from '../vault';
import type { PropertyChange } from '@/src/shared/services/provenanceService';

export function handleTrashAction(state: NormalizedState, action: Action): ActionResult | null {
  switch (action.type) {
    case 'MOVE_TO_TRASH': {
      const entity = getEntity(state, action.id);
      if (!entity) {
        return { success: false, state, error: `Entity not found: ${action.id}` };
      }

      const changes: PropertyChange[] = [{
        property: '_state',
        oldValue: entity._state,
        newValue: 'trashed'
      }];

      return {
        success: true,
        state: moveEntityToTrash(state, action.id),
        changes
      };
    }

    case 'RESTORE_FROM_TRASH': {
      const trashed = state.trashedEntities?.[action.id];
      if (!trashed) {
        return { success: false, state, error: `Entity ${action.id} not found in trash` };
      }

      const changes: PropertyChange[] = [{
        property: '_state',
        oldValue: 'trashed',
        newValue: undefined
      }];

      return {
        success: true,
        state: restoreEntityFromTrash(state, action.id, action.options),
        changes
      };
    }

    case 'EMPTY_TRASH': {
      const trashedCount = Object.keys(state.trashedEntities || {}).length;
      if (trashedCount === 0) {
        return { success: true, state, changes: [] };
      }

      const result = emptyTrash(state);
      const changes: PropertyChange[] = [{
        property: '_trashedEntities',
        oldValue: trashedCount,
        newValue: 0
      }];

      return {
        success: result.errors.length === 0,
        state: result.state,
        changes,
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined
      };
    }

    case 'BATCH_RESTORE': {
      let currentState = state;
      const allChanges: PropertyChange[] = [];
      const errors: string[] = [];

      for (const id of action.ids) {
        if (!state.trashedEntities?.[id]) {
          errors.push(`Entity ${id} not found in trash`);
          continue;
        }

        currentState = restoreEntityFromTrash(currentState, id, action.options);
        allChanges.push({
          property: '_state',
          oldValue: 'trashed',
          newValue: undefined
        });
      }

      return {
        success: errors.length === 0,
        state: currentState,
        changes: allChanges,
        error: errors.length > 0 ? errors.join('; ') : undefined
      };
    }

    default:
      return null;
  }
}
