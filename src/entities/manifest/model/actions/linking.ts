/**
 * Linking property action handlers.
 * Handles: UPDATE_LINKING_PROPERTY, UPDATE_REQUIRED_STATEMENT,
 *          BATCH_UPDATE_NAV_DATE, UPDATE_START, UPDATE_RANGE_SUPPLEMENTARY
 */

import type { Action, ActionResult } from './types';
import type { NormalizedState } from '../vault';
import { getEntity, updateEntity } from '../vault';
import type { IIIFItem, IIIFRange } from '@/src/shared/types';
import type { PropertyChange } from '@/src/shared/services/provenanceService';
import { validateLanguageMap } from './validation';
import { isValidNavDate } from '@/utils';

export function handleLinkingAction(state: NormalizedState, action: Action): ActionResult | null {
  switch (action.type) {
    case 'UPDATE_LINKING_PROPERTY': {
      const entity = getEntity(state, action.id);
      if (!entity) {
        return { success: false, state, error: `Entity not found: ${action.id}` };
      }

      const oldValue = (entity as unknown as Record<string, unknown>)[action.property];
      const changes: PropertyChange[] = [{
        property: action.property,
        oldValue,
        newValue: action.value
      }];

      return {
        success: true,
        state: updateEntity(state, action.id, { [action.property]: action.value } as Partial<IIIFItem>),
        changes
      };
    }

    case 'UPDATE_REQUIRED_STATEMENT': {
      const entity = getEntity(state, action.id);
      if (!entity) {
        return { success: false, state, error: `Entity not found: ${action.id}` };
      }

      if (action.requiredStatement) {
        const labelError = validateLanguageMap(action.requiredStatement.label, 'requiredStatement.label');
        if (labelError) return { success: false, state, error: labelError };
        const valueError = validateLanguageMap(action.requiredStatement.value, 'requiredStatement.value');
        if (valueError) return { success: false, state, error: valueError };
      }

      return {
        success: true,
        state: updateEntity(state, action.id, { requiredStatement: action.requiredStatement }),
        changes: [{ property: 'requiredStatement', oldValue: entity.requiredStatement, newValue: action.requiredStatement }]
      };
    }

    case 'BATCH_UPDATE_NAV_DATE': {
      let currentState = state;
      const allChanges: PropertyChange[] = [];

      for (const update of action.updates) {
        if (!isValidNavDate(update.navDate)) {
          return { success: false, state, error: `Invalid navDate for ${update.id}: ${update.navDate}` };
        }

        const entity = getEntity(currentState, update.id);
        if (!entity) {
          return { success: false, state, error: `Entity not found: ${update.id}` };
        }

        allChanges.push({ property: 'navDate', oldValue: entity.navDate, newValue: update.navDate });
        currentState = updateEntity(currentState, update.id, { navDate: update.navDate });
      }

      return {
        success: true,
        state: currentState,
        changes: allChanges
      };
    }

    case 'UPDATE_START': {
      const entity = getEntity(state, action.id);
      if (!entity) {
        return { success: false, state, error: `Entity not found: ${action.id}` };
      }

      if (action.start && action.start.type === 'Canvas') {
        const canvas = getEntity(state, action.start.id);
        if (!canvas) {
          return { success: false, state, error: `Start canvas not found: ${action.start.id}` };
        }
      }

      const oldStart = entity.start;
      return {
        success: true,
        state: updateEntity(state, action.id, { start: action.start } as Partial<IIIFItem>),
        changes: [{ property: 'start', oldValue: oldStart, newValue: action.start }]
      };
    }

    case 'UPDATE_RANGE_SUPPLEMENTARY': {
      const range = getEntity(state, action.rangeId) as IIIFRange;
      if (!range) {
        return { success: false, state, error: `Range not found: ${action.rangeId}` };
      }

      const oldSupplementary = (range as IIIFItem).supplementary;
      return {
        success: true,
        state: updateEntity(state, action.rangeId, { supplementary: action.supplementary } as Partial<IIIFItem>),
        changes: [{ property: 'supplementary', oldValue: oldSupplementary, newValue: action.supplementary }]
      };
    }

    default:
      return null;
  }
}
