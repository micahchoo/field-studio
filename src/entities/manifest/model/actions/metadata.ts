/**
 * Metadata-related action handlers.
 * Handles: UPDATE_LABEL, UPDATE_SUMMARY, UPDATE_METADATA, UPDATE_RIGHTS,
 *          UPDATE_NAV_DATE, UPDATE_BEHAVIOR, UPDATE_VIEWING_DIRECTION
 */

import type { Action, ActionResult } from './types';
import type { NormalizedState } from '../vault';
import { getEntity, updateEntity } from '../vault';
import type { IIIFManifest } from '@/src/shared/types';
import type { PropertyChange } from '@/src/shared/services/provenanceService';
import { validateLanguageMap, validateBehavior } from './validation';
import {
  isValidNavDate,
  isValidViewingDirection
} from '@/utils';

export function handleMetadataAction(state: NormalizedState, action: Action): ActionResult | null {
  switch (action.type) {
    case 'UPDATE_LABEL': {
      const error = validateLanguageMap(action.label, 'label');
      if (error) return { success: false, state, error };

      const entity = getEntity(state, action.id);
      const changes: PropertyChange[] = [{
        property: 'label',
        oldValue: entity?.label,
        newValue: action.label
      }];

      return {
        success: true,
        state: updateEntity(state, action.id, { label: action.label }),
        changes
      };
    }

    case 'UPDATE_SUMMARY': {
      const error = validateLanguageMap(action.summary, 'summary');
      if (error) return { success: false, state, error };

      const entity = getEntity(state, action.id);
      const changes: PropertyChange[] = [{
        property: 'summary',
        oldValue: entity?.summary,
        newValue: action.summary
      }];

      return {
        success: true,
        state: updateEntity(state, action.id, { summary: action.summary }),
        changes
      };
    }

    case 'UPDATE_METADATA': {
      // Validate each metadata entry
      for (let i = 0; i < action.metadata.length; i++) {
        const entry = action.metadata[i];
        const labelError = validateLanguageMap(entry.label, `metadata[${i}].label`);
        if (labelError) return { success: false, state, error: labelError };
        const valueError = validateLanguageMap(entry.value, `metadata[${i}].value`);
        if (valueError) return { success: false, state, error: valueError };
      }

      const entity = getEntity(state, action.id);
      const changes: PropertyChange[] = [{
        property: 'metadata',
        oldValue: entity?.metadata,
        newValue: action.metadata
      }];

      return {
        success: true,
        state: updateEntity(state, action.id, { metadata: action.metadata }),
        changes
      };
    }

    case 'UPDATE_RIGHTS': {
      // Validate rights URL format
      if (action.rights && !action.rights.startsWith('http')) {
        return { success: false, state, error: 'Rights must be a valid URL' };
      }

      const entity = getEntity(state, action.id);
      const changes: PropertyChange[] = [{
        property: 'rights',
        oldValue: entity?.rights,
        newValue: action.rights
      }];

      return {
        success: true,
        state: updateEntity(state, action.id, { rights: action.rights }),
        changes
      };
    }

    case 'UPDATE_NAV_DATE': {
      // Use centralized navDate validation
      if (action.navDate && !isValidNavDate(action.navDate)) {
        return { success: false, state, error: 'navDate must be a valid ISO 8601 date-time' };
      }

      const entity = getEntity(state, action.id);
      const changes: PropertyChange[] = [{
        property: 'navDate',
        oldValue: entity?.navDate,
        newValue: action.navDate
      }];

      return {
        success: true,
        state: updateEntity(state, action.id, { navDate: action.navDate }),
        changes
      };
    }

    case 'UPDATE_BEHAVIOR': {
      const entity = getEntity(state, action.id);
      if (!entity) {
        return { success: false, state, error: `Entity not found: ${action.id}` };
      }

      const error = validateBehavior(action.behavior, entity.type);
      if (error) return { success: false, state, error };

      const changes: PropertyChange[] = [{
        property: 'behavior',
        oldValue: entity.behavior,
        newValue: action.behavior
      }];

      return {
        success: true,
        state: updateEntity(state, action.id, { behavior: action.behavior }),
        changes
      };
    }

    case 'UPDATE_VIEWING_DIRECTION': {
      // Use centralized viewingDirection validation
      if (!isValidViewingDirection(action.viewingDirection)) {
        return {
          success: false,
          state,
          error: `Invalid viewing direction: ${action.viewingDirection}. Must be: left-to-right, right-to-left, top-to-bottom, or bottom-to-top`
        };
      }

      const entity = getEntity(state, action.id);
      const oldViewingDirection = entity && 'viewingDirection' in entity
        ? (entity as IIIFManifest).viewingDirection
        : undefined;
      const changes: PropertyChange[] = [{
        property: 'viewingDirection',
        oldValue: oldViewingDirection,
        newValue: action.viewingDirection
      }];

      return {
        success: true,
        state: updateEntity(state, action.id, { viewingDirection: action.viewingDirection } as Partial<IIIFManifest>),
        changes
      };
    }

    default:
      return null;
  }
}
