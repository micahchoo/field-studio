/**
 * Action-Driven Mutation System with Undo/Redo
 *
 * Implements validated, auditable mutations with full undo/redo support.
 * Actions are dispatched through a reducer that validates changes before
 * applying them to the normalized state.
 *
 * Key features:
 * - Pre-mutation validation
 * - Typed action definitions
 * - Undo/redo history stack
 * - Batch operations
 * - Change event notifications
 *
 * @see ARCHITECTURE_INSPIRATION.md Pattern 4
 */

import {
  addEntity,
  emptyTrash,
  getEntity,
  moveEntity,
  moveEntityToTrash,
  normalize,
  NormalizedState,
  removeEntity,
  reorderChildren,
  restoreEntityFromTrash,
  updateEntity,
  VaultSnapshot
} from './vault';
import {
  IIIFAnnotation,
  IIIFCanvas,
  IIIFItem,
  IIIFManifest,
  IIIFRange,
  IIIFRangeReference,
  LanguageMap
} from '@/src/shared/types';
import { PropertyChange, provenanceService } from '@/src/shared/services/provenanceService';
import {
  getRelationshipType,
  getValidChildTypes,
  isValidChildType
} from '@/utils/iiifHierarchy';
import {
  isValidNavDate,
  isValidViewingDirection
} from '@/utils';
import {
  validateBehaviors as centralizedValidateBehaviors,
  findBehaviorConflicts,
} from '@/utils/iiifBehaviors';

// ============================================================================
// Action Types
// ============================================================================

export type Action =
  | { type: 'UPDATE_LABEL'; id: string; label: LanguageMap }
  | { type: 'UPDATE_SUMMARY'; id: string; summary: LanguageMap }
  | { type: 'UPDATE_METADATA'; id: string; metadata: Array<{ label: LanguageMap; value: LanguageMap }> }
  | { type: 'UPDATE_RIGHTS'; id: string; rights: string }
  | { type: 'UPDATE_NAV_DATE'; id: string; navDate: string | undefined }
  | { type: 'UPDATE_BEHAVIOR'; id: string; behavior: string[] }
  | { type: 'UPDATE_VIEWING_DIRECTION'; id: string; viewingDirection: string }
  | { type: 'ADD_CANVAS'; manifestId: string; canvas: IIIFCanvas; index?: number }
  | { type: 'REMOVE_CANVAS'; manifestId: string; canvasId: string }
  | { type: 'REORDER_CANVASES'; manifestId: string; order: string[] }
  | { type: 'ADD_ANNOTATION'; canvasId: string; annotation: IIIFAnnotation }
  | { type: 'REMOVE_ANNOTATION'; canvasId: string; annotationId: string }
  | { type: 'UPDATE_CANVAS_DIMENSIONS'; canvasId: string; width: number; height: number }
  | { type: 'MOVE_ITEM'; itemId: string; newParentId: string; index?: number }
  | { type: 'BATCH_UPDATE'; updates: Array<{ id: string; changes: Partial<IIIFItem> }> }
  | { type: 'RELOAD_TREE'; root: IIIFItem }
  // Phase 2: Trash/Restore System Actions
  | { type: 'MOVE_TO_TRASH'; id: string; options?: { preserveRelationships?: boolean } }
  | { type: 'RESTORE_FROM_TRASH'; id: string; options?: { parentId?: string; index?: number } }
  | { type: 'EMPTY_TRASH' }
  | { type: 'BATCH_RESTORE'; ids: string[]; options?: { parentId?: string } }
  // Phase 3: Range/Structure Actions
  | { type: 'ADD_RANGE'; manifestId: string; range: IIIFRange; index?: number }
  | { type: 'REMOVE_RANGE'; manifestId: string; rangeId: string }
  | { type: 'ADD_CANVAS_TO_RANGE'; rangeId: string; canvasId: string; index?: number }
  | { type: 'REMOVE_CANVAS_FROM_RANGE'; rangeId: string; canvasId: string }
  | { type: 'REORDER_RANGE_ITEMS'; rangeId: string; order: string[] }
  | { type: 'ADD_NESTED_RANGE'; parentRangeId: string; range: IIIFRange; index?: number };

export interface ActionResult {
  success: boolean;
  state: NormalizedState;
  error?: string;
  changes?: PropertyChange[];
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a language map structure
 */
function validateLanguageMap(label: LanguageMap | undefined, fieldName: string): string | null {
  if (!label) return null; // undefined is OK for optional fields

  if (typeof label !== 'object') {
    return `${fieldName} must be an object`;
  }

  for (const [locale, values] of Object.entries(label)) {
    if (!Array.isArray(values)) {
      return `${fieldName}["${locale}"] must be an array`;
    }
    for (const value of values) {
      if (typeof value !== 'string') {
        return `${fieldName}["${locale}"] must contain only strings`;
      }
    }
  }

  return null;
}

/**
 * IIIF 3.0 Behavior Validation
 *
 * Uses centralized behavior validation from utils/iiifBehaviors.ts
 * which implements the complete IIIF Presentation API 3.0 specification.
 */
function validateBehavior(behavior: string[], entityType: string): string | null {
  // Use centralized behavior validation
  const validationResult = centralizedValidateBehaviors(entityType, behavior);

  // Return first error if any
  if (validationResult.errors.length > 0) {
    return validationResult.errors[0];
  }

  // Check for disjoint set conflicts using centralized utility
  const conflicts = findBehaviorConflicts(behavior);
  if (conflicts.length > 0) {
    return conflicts[0];
  }

  return null;
}

/**
 * Validate canvas dimensions
 */
function validateCanvasDimensions(width: number, height: number): string | null {
  if (typeof width !== 'number' || width <= 0) {
    return 'Canvas width must be a positive number';
  }
  if (typeof height !== 'number' || height <= 0) {
    return 'Canvas height must be a positive number';
  }
  return null;
}

// ============================================================================
// Reducer
// ============================================================================

/**
 * Main reducer - applies validated actions to state
 */
export function reduce(state: NormalizedState, action: Action): ActionResult {
  try {
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
        const newSet = new Set(action.order);

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

      case 'ADD_ANNOTATION': {
        if (!action.annotation.id) {
          return { success: false, state, error: 'Annotation must have an id' };
        }

        // Annotations must be inside an AnnotationPage
        // Check if there's an existing non-painting annotation page for this canvas
        const canvasChildIds = state.references[action.canvasId] || [];
        let annotationPageId: string | null = null;

        // Look for existing non-painting annotation page
        for (const childId of canvasChildIds) {
          if (state.typeIndex[childId] === 'AnnotationPage') {
            // Check if this page contains non-painting annotations
            const pageAnnoIds = state.references[childId] || [];
            // Consider it a non-painting page if:
            // 1. It's empty (new page) or
            // 2. First annotation is not painting
            if (pageAnnoIds.length === 0) {
              // Skip empty painting pages (these are for images/videos)
              continue;
            }
            const firstAnno = state.entities.Annotation[pageAnnoIds[0]];
            if (firstAnno && (firstAnno as unknown as Record<string, unknown>).motivation !== 'painting') {
              annotationPageId = childId;
              break;
            }
          }
        }

        let newState = state;

        // If no non-painting annotation page exists, create one
        if (!annotationPageId) {
          annotationPageId = `${action.canvasId}/annotations/supplementing`;
          const annotationPage = {
            id: annotationPageId,
            type: 'AnnotationPage' as const,
            items: []
          };

          // Add the annotation page to the state
          newState = addEntity(newState, annotationPage as IIIFItem, action.canvasId);
        }

        // Add the annotation to the annotation page
        newState = addEntity(newState, action.annotation as IIIFItem, annotationPageId);

        return {
          success: true,
          state: newState,
          changes: [{ property: 'annotations', oldValue: null, newValue: action.annotation.id }]
        };
      }

      case 'REMOVE_ANNOTATION': {
        return {
          success: true,
          state: removeEntity(state, action.annotationId),
          changes: [{ property: 'annotations', oldValue: action.annotationId, newValue: null }]
        };
      }

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
          currentState = updateEntity(currentState, update.id, update.changes);
          for (const [prop, value] of Object.entries(update.changes)) {
            const entity = getEntity(state, update.id);
            // Dynamic property access requires casting through unknown
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

      // ============================================================================
      // Phase 2: Trash/Restore System Actions
      // ============================================================================

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

      // ============================================================================
      // Phase 3: Range/Structure Actions
      // ============================================================================

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
        const currentItemIds = currentItems.map((item: any) =>
          typeof item === 'string' ? item : item.id
        );

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
        const newItems = currentItems.filter((item: any) => {
          const itemId = typeof item === 'string' ? item : item.id;
          return itemId !== action.canvasId;
        });

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
        const currentIds = currentItems.map((item: any) =>
          typeof item === 'string' ? item : item.id
        );

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
        const itemMap = new Map(currentItems.map((item: any) => [
          typeof item === 'string' ? item : item.id,
          item
        ]));
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
        return { success: false, state, error: `Unknown action type` };
    }
  } catch (e) {
    return {
      success: false,
      state,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Undo/Redo History Manager
// ============================================================================

export interface HistoryEntry {
  action: Action;
  beforeState: NormalizedState;
  afterState: NormalizedState;
  timestamp: number;
}

export class ActionHistory {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Record a new action
   */
  push(entry: Omit<HistoryEntry, 'timestamp'>): void {
    // Remove any redo history when new action is pushed
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new entry
    this.history.push({
      ...entry,
      timestamp: Date.now()
    });

    // Enforce max size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get state to undo to
   */
  undo(): NormalizedState | null {
    if (!this.canUndo()) return null;

    const entry = this.history[this.currentIndex];
    this.currentIndex--;
    return entry.beforeState;
  }

  /**
   * Get state to redo to
   */
  redo(): NormalizedState | null {
    if (!this.canRedo()) return null;

    this.currentIndex++;
    const entry = this.history[this.currentIndex];
    return entry.afterState;
  }

  /**
   * Get current history position info
   */
  getStatus(): { position: number; total: number; canUndo: boolean; canRedo: boolean } {
    return {
      position: this.currentIndex + 1,
      total: this.history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  /**
   * Get recent history entries
   */
  getRecent(count: number = 10): HistoryEntry[] {
    const start = Math.max(0, this.currentIndex - count + 1);
    return this.history.slice(start, this.currentIndex + 1);
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

// ============================================================================
// Action Dispatcher
// ============================================================================

export class ActionDispatcher {
  private state: NormalizedState;
  private history: ActionHistory;
  private listeners: Set<(state: NormalizedState, action: Action) => void> = new Set();
  private errorListeners: Set<(error: string, action: Action) => void> = new Set();

  constructor(initialState: NormalizedState, historySize: number = 100) {
    this.state = initialState;
    this.history = new ActionHistory(historySize);
  }

  /**
   * Dispatch an action with validation
   */
  dispatch(action: Action): boolean {
    const beforeState = this.state;
    const result = reduce(this.state, action);

    if (!result.success) {
      // Notify error listeners
      for (const listener of this.errorListeners) {
        listener(result.error || 'Unknown error', action);
      }
      return false;
    }

    // Update state
    this.state = result.state;

    // Record in history
    this.history.push({
      action,
      beforeState,
      afterState: result.state
    });

    // Record in provenance (for certain actions)
    if (result.changes && result.changes.length > 0) {
      const id = 'id' in action ? (action as any).id :
                 'canvasId' in action ? (action as any).canvasId :
                 'manifestId' in action ? (action as any).manifestId : null;

      if (id) {
        provenanceService.recordUpdate(id, result.changes, action.type);
      }
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(this.state, action);
    }

    return true;
  }

  /**
   * Undo last action
   */
  undo(): boolean {
    const previousState = this.history.undo();
    if (!previousState) return false;

    this.state = previousState;

    // Notify listeners with synthetic action
    for (const listener of this.listeners) {
      listener(this.state, { type: 'BATCH_UPDATE', updates: [] });
    }

    return true;
  }

  /**
   * Redo previously undone action
   */
  redo(): boolean {
    const nextState = this.history.redo();
    if (!nextState) return false;

    this.state = nextState;

    // Notify listeners with synthetic action
    for (const listener of this.listeners) {
      listener(this.state, { type: 'BATCH_UPDATE', updates: [] });
    }

    return true;
  }

  /**
   * Get current state
   */
  getState(): NormalizedState {
    return this.state;
  }

  /**
   * Get history status
   */
  getHistoryStatus() {
    return this.history.getStatus();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: NormalizedState, action: Action) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to errors
   */
  onError(listener: (error: string, action: Action) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }
}

// ============================================================================
// Action Creators (Convenience Functions)
// ============================================================================

export const actions = {
  updateLabel: (id: string, label: LanguageMap): Action =>
    ({ type: 'UPDATE_LABEL', id, label }),

  updateSummary: (id: string, summary: LanguageMap): Action =>
    ({ type: 'UPDATE_SUMMARY', id, summary }),

  updateMetadata: (id: string, metadata: Array<{ label: LanguageMap; value: LanguageMap }>): Action =>
    ({ type: 'UPDATE_METADATA', id, metadata }),

  updateRights: (id: string, rights: string): Action =>
    ({ type: 'UPDATE_RIGHTS', id, rights }),

  updateNavDate: (id: string, navDate: string | undefined): Action =>
    ({ type: 'UPDATE_NAV_DATE', id, navDate }),

  updateBehavior: (id: string, behavior: string[]): Action =>
    ({ type: 'UPDATE_BEHAVIOR', id, behavior }),

  updateViewingDirection: (id: string, viewingDirection: string): Action =>
    ({ type: 'UPDATE_VIEWING_DIRECTION', id, viewingDirection }),

  addCanvas: (manifestId: string, canvas: IIIFCanvas, index?: number): Action =>
    ({ type: 'ADD_CANVAS', manifestId, canvas, index }),

  removeCanvas: (manifestId: string, canvasId: string): Action =>
    ({ type: 'REMOVE_CANVAS', manifestId, canvasId }),

  reorderCanvases: (manifestId: string, order: string[]): Action =>
    ({ type: 'REORDER_CANVASES', manifestId, order }),

  addAnnotation: (canvasId: string, annotation: IIIFAnnotation): Action =>
    ({ type: 'ADD_ANNOTATION', canvasId, annotation }),

  removeAnnotation: (canvasId: string, annotationId: string): Action =>
    ({ type: 'REMOVE_ANNOTATION', canvasId, annotationId }),

  updateCanvasDimensions: (canvasId: string, width: number, height: number): Action =>
    ({ type: 'UPDATE_CANVAS_DIMENSIONS', canvasId, width, height }),

  moveItem: (itemId: string, newParentId: string, index?: number): Action =>
    ({ type: 'MOVE_ITEM', itemId, newParentId, index }),

  batchUpdate: (updates: Array<{ id: string; changes: Partial<IIIFItem> }>): Action =>
    ({ type: 'BATCH_UPDATE', updates }),

  reloadTree: (root: IIIFItem): Action =>
    ({ type: 'RELOAD_TREE', root }),

  // Phase 2: Trash/Restore System Action Creators
  moveToTrash: (id: string, options?: { preserveRelationships?: boolean }): Action =>
    ({ type: 'MOVE_TO_TRASH', id, options }),

  restoreFromTrash: (id: string, options?: { parentId?: string; index?: number }): Action =>
    ({ type: 'RESTORE_FROM_TRASH', id, options }),

  emptyTrash: (): Action =>
    ({ type: 'EMPTY_TRASH' }),

  batchRestore: (ids: string[], options?: { parentId?: string }): Action =>
    ({ type: 'BATCH_RESTORE', ids, options }),

  // Phase 3: Range/Structure Action Creators
  addRange: (manifestId: string, range: IIIFRange, index?: number): Action =>
    ({ type: 'ADD_RANGE', manifestId, range, index }),

  removeRange: (manifestId: string, rangeId: string): Action =>
    ({ type: 'REMOVE_RANGE', manifestId, rangeId }),

  addCanvasToRange: (rangeId: string, canvasId: string, index?: number): Action =>
    ({ type: 'ADD_CANVAS_TO_RANGE', rangeId, canvasId, index }),

  removeCanvasFromRange: (rangeId: string, canvasId: string): Action =>
    ({ type: 'REMOVE_CANVAS_FROM_RANGE', rangeId, canvasId }),

  reorderRangeItems: (rangeId: string, order: string[]): Action =>
    ({ type: 'REORDER_RANGE_ITEMS', rangeId, order }),

  addNestedRange: (parentRangeId: string, range: IIIFRange, index?: number): Action =>
    ({ type: 'ADD_NESTED_RANGE', parentRangeId, range, index })
};

// ============================================================================
// Test API - Factory Functions and Aliases
// ============================================================================

/**
 * Factory function to create ActionHistory instance
 * @param options Configuration options
 * @returns New ActionHistory instance
 */
export function createActionHistory(options?: { maxSize?: number }): ActionHistory {
  return new ActionHistory(options?.maxSize);
}

/**
 * Validate an action before execution
 * @param action Action to validate
 * @returns Validation result with valid flag and optional error
 */
export function validateAction(action: Action): { valid: boolean; error?: string } {
  // Create a temporary empty state for validation
  const tempState: NormalizedState = {
    entities: {
      Collection: {},
      Manifest: {},
      Canvas: {},
      Range: {},
      AnnotationPage: {},
      Annotation: {}
    },
    references: {},
    reverseRefs: {},
    collectionMembers: {},
    memberOfCollections: {},
    rootId: null,
    typeIndex: {},
    extensions: {},
    trashedEntities: {}
  };

  try {
    const result = reduce(tempState, action);
    return { valid: !result.error, error: result.error };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Execute an action on state
 * Alias for reduce() to match test expectations
 */
export const executeAction = reduce;
