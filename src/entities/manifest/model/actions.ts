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
  IIIFAnnotationPage,
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
  | { type: 'UPDATE_ANNOTATION'; annotationId: string; updates: Partial<Pick<IIIFAnnotation, 'body' | 'motivation'>> }
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
  | { type: 'ADD_NESTED_RANGE'; parentRangeId: string; range: IIIFRange; index?: number }
  // Phase 4: IIIF Presentation API 3.0 Feature Actions
  | { type: 'CREATE_ANNOTATION_PAGE'; canvasId: string; label?: LanguageMap; motivation?: string }
  | { type: 'UPDATE_ANNOTATION_PAGE_LABEL'; pageId: string; label: LanguageMap }
  | { type: 'MOVE_ANNOTATION_TO_PAGE'; annotationId: string; targetPageId: string }
  | { type: 'SET_ANNOTATION_PAGE_BEHAVIOR'; pageId: string; behavior: string[] }
  | { type: 'UPDATE_LINKING_PROPERTY'; id: string; property: 'rendering' | 'seeAlso' | 'homepage' | 'provider'; value: unknown[] }
  | { type: 'UPDATE_REQUIRED_STATEMENT'; id: string; requiredStatement: { label: LanguageMap; value: LanguageMap } | undefined }
  | { type: 'BATCH_UPDATE_NAV_DATE'; updates: Array<{ id: string; navDate: string }> }
  | { type: 'UPDATE_START'; id: string; start: { id: string; type: 'Canvas' | 'SpecificResource'; source?: string; selector?: unknown } | undefined }
  | { type: 'UPDATE_RANGE_SUPPLEMENTARY'; rangeId: string; supplementary: { id: string; type: 'AnnotationCollection' } | undefined }
  // Phase 5: Board Design Actions
  | { type: 'CREATE_BOARD'; boardId: string; title: string; behavior?: string[] }
  | { type: 'UPDATE_BOARD_ITEM_POSITION'; annotationId: string; surfaceCanvasId: string; x: number; y: number; w: number; h: number }
  | { type: 'REMOVE_BOARD_ITEM'; annotationId: string; surfaceCanvasId: string };

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

      case 'UPDATE_ANNOTATION': {
        const annotation = getEntity(state, action.annotationId);
        if (!annotation) {
          return { success: false, state, error: `Annotation not found: ${action.annotationId}` };
        }

        const changes: PropertyChange[] = [];
        if (action.updates.body !== undefined) {
          changes.push({ property: 'body', oldValue: (annotation as unknown as Record<string, unknown>).body, newValue: action.updates.body });
        }
        if (action.updates.motivation !== undefined) {
          changes.push({ property: 'motivation', oldValue: (annotation as unknown as Record<string, unknown>).motivation, newValue: action.updates.motivation });
        }

        return {
          success: true,
          state: updateEntity(state, action.annotationId, action.updates as Partial<IIIFItem>),
          changes
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

      // ============================================================================
      // Phase 4: IIIF Presentation API 3.0 Feature Actions
      // ============================================================================

      case 'CREATE_ANNOTATION_PAGE': {
        const canvas = getEntity(state, action.canvasId);
        if (!canvas) {
          return { success: false, state, error: `Canvas not found: ${action.canvasId}` };
        }

        const motivation = action.motivation || 'supplementing';
        const pageId = `${action.canvasId}/annotations/${motivation}-${Date.now()}`;
        const annotationPage: IIIFItem = {
          id: pageId,
          type: 'AnnotationPage',
          label: action.label,
          behavior: [],
          items: []
        };

        const newState = addEntity(state, annotationPage, action.canvasId);
        return {
          success: true,
          state: newState,
          changes: [{ property: 'annotations', oldValue: null, newValue: pageId }]
        };
      }

      case 'UPDATE_ANNOTATION_PAGE_LABEL': {
        const page = getEntity(state, action.pageId);
        if (!page) {
          return { success: false, state, error: `Annotation page not found: ${action.pageId}` };
        }

        const error = validateLanguageMap(action.label, 'label');
        if (error) return { success: false, state, error };

        return {
          success: true,
          state: updateEntity(state, action.pageId, { label: action.label }),
          changes: [{ property: 'label', oldValue: page.label, newValue: action.label }]
        };
      }

      case 'MOVE_ANNOTATION_TO_PAGE': {
        const annotation = getEntity(state, action.annotationId);
        if (!annotation) {
          return { success: false, state, error: `Annotation not found: ${action.annotationId}` };
        }

        const targetPage = getEntity(state, action.targetPageId);
        if (!targetPage) {
          return { success: false, state, error: `Target page not found: ${action.targetPageId}` };
        }

        const newState = moveEntity(state, action.annotationId, action.targetPageId);
        return {
          success: true,
          state: newState,
          changes: [{
            property: '_parentId',
            oldValue: state.reverseRefs[action.annotationId],
            newValue: action.targetPageId
          }]
        };
      }

      case 'SET_ANNOTATION_PAGE_BEHAVIOR': {
        const page = getEntity(state, action.pageId);
        if (!page) {
          return { success: false, state, error: `Annotation page not found: ${action.pageId}` };
        }

        return {
          success: true,
          state: updateEntity(state, action.pageId, { behavior: action.behavior }),
          changes: [{ property: 'behavior', oldValue: page.behavior, newValue: action.behavior }]
        };
      }

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

      // ================================================================
      // Phase 5: Board Design Actions
      // ================================================================

      case 'CREATE_BOARD': {
        const surfaceId = `${action.boardId}/surface`;
        const paintingPageId = `${surfaceId}/items/painting`;
        const supplementingPageId = `${surfaceId}/annotations/supplementing`;

        // Create the board manifest
        const boardManifest: IIIFManifest = {
          id: action.boardId,
          type: 'Manifest',
          label: { en: [action.title] },
          items: [],
        };
        if (action.behavior) {
          (boardManifest as IIIFManifest & { behavior?: string[] }).behavior = action.behavior;
        }

        // Create the board surface canvas
        const surfaceCanvas: IIIFCanvas = {
          id: surfaceId,
          type: 'Canvas',
          label: { en: [`${action.title} — Board Surface`] },
          width: 10000,
          height: 10000,
          items: [],
        };

        // Create painting annotation page (for board items)
        const paintingPage: IIIFAnnotationPage = {
          id: paintingPageId,
          type: 'AnnotationPage',
          items: [],
        };

        // Create supplementing annotation page (for connections/notes)
        const supplementingPage: IIIFAnnotationPage = {
          id: supplementingPageId,
          type: 'AnnotationPage',
          items: [],
        };

        // Add all entities to state
        let boardState = state;

        // Add manifest to root collection if one exists
        const rootCollection = state.rootId ? getEntity(state, state.rootId) : null;
        if (rootCollection && state.typeIndex[state.rootId!] === 'Collection') {
          boardState = addEntity(boardState, boardManifest, state.rootId!);
        } else {
          // Add manifest without a parent — just insert into the store
          const manifestStore = { ...boardState.entities.Manifest, [action.boardId]: boardManifest };
          boardState = { ...boardState, entities: { ...boardState.entities, Manifest: manifestStore }, typeIndex: { ...boardState.typeIndex, [action.boardId]: 'Manifest' } };
        }

        // Add surface canvas to manifest
        boardState = addEntity(boardState, surfaceCanvas, action.boardId);
        // Add painting page to surface canvas
        boardState = addEntity(boardState, paintingPage, surfaceId);
        // Add supplementing page to surface canvas
        boardState = addEntity(boardState, supplementingPage, surfaceId);

        return {
          success: true,
          state: boardState,
          changes: [{ property: 'board', oldValue: null, newValue: action.boardId }]
        };
      }

      case 'UPDATE_BOARD_ITEM_POSITION': {
        // Update the target of a painting annotation to change its xywh position
        const annotation = getEntity(state, action.annotationId) as IIIFAnnotation | null;
        if (!annotation) {
          return { success: false, state, error: `Board item annotation not found: ${action.annotationId}` };
        }

        const xywh = `${Math.round(action.x)},${Math.round(action.y)},${Math.round(action.w)},${Math.round(action.h)}`;
        const newTarget = `${action.surfaceCanvasId}#xywh=${xywh}`;

        return {
          success: true,
          state: updateEntity(state, action.annotationId, { target: newTarget } as Partial<IIIFItem>),
          changes: [{ property: 'target', oldValue: annotation.target, newValue: newTarget }]
        };
      }

      case 'REMOVE_BOARD_ITEM': {
        // Remove a board item annotation and any linking annotations that reference it
        const itemAnnotation = getEntity(state, action.annotationId);
        if (!itemAnnotation) {
          return { success: false, state, error: `Board item not found: ${action.annotationId}` };
        }

        let removalState = removeEntity(state, action.annotationId);

        // Find and remove linking annotations that reference this item
        const supplementingPageId = `${action.surfaceCanvasId}/annotations/supplementing`;
        const supplementingAnnoIds = removalState.references[supplementingPageId] || [];
        for (const annoId of supplementingAnnoIds) {
          const anno = getEntity(removalState, annoId) as IIIFAnnotation | null;
          if (!anno) continue;
          const body = Array.isArray(anno.body) ? anno.body[0] : anno.body;
          const source = (body as { source?: string })?.source;
          const target = typeof anno.target === 'string' ? anno.target : '';
          if (source === action.annotationId || target === action.annotationId) {
            removalState = removeEntity(removalState, annoId);
          }
        }

        return {
          success: true,
          state: removalState,
          changes: [{ property: 'board-item', oldValue: action.annotationId, newValue: null }]
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

  updateAnnotation: (annotationId: string, updates: Partial<Pick<IIIFAnnotation, 'body' | 'motivation'>>): Action =>
    ({ type: 'UPDATE_ANNOTATION', annotationId, updates }),

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
    ({ type: 'ADD_NESTED_RANGE', parentRangeId, range, index }),

  // Phase 4: IIIF Presentation API 3.0 Feature Action Creators
  createAnnotationPage: (canvasId: string, label?: LanguageMap, motivation?: string): Action =>
    ({ type: 'CREATE_ANNOTATION_PAGE', canvasId, label, motivation }),

  updateAnnotationPageLabel: (pageId: string, label: LanguageMap): Action =>
    ({ type: 'UPDATE_ANNOTATION_PAGE_LABEL', pageId, label }),

  moveAnnotationToPage: (annotationId: string, targetPageId: string): Action =>
    ({ type: 'MOVE_ANNOTATION_TO_PAGE', annotationId, targetPageId }),

  setAnnotationPageBehavior: (pageId: string, behavior: string[]): Action =>
    ({ type: 'SET_ANNOTATION_PAGE_BEHAVIOR', pageId, behavior }),

  updateLinkingProperty: (id: string, property: 'rendering' | 'seeAlso' | 'homepage' | 'provider', value: unknown[]): Action =>
    ({ type: 'UPDATE_LINKING_PROPERTY', id, property, value }),

  updateRequiredStatement: (id: string, requiredStatement: { label: LanguageMap; value: LanguageMap } | undefined): Action =>
    ({ type: 'UPDATE_REQUIRED_STATEMENT', id, requiredStatement }),

  batchUpdateNavDate: (updates: Array<{ id: string; navDate: string }>): Action =>
    ({ type: 'BATCH_UPDATE_NAV_DATE', updates }),

  updateStart: (id: string, start: { id: string; type: 'Canvas' | 'SpecificResource'; source?: string; selector?: unknown } | undefined): Action =>
    ({ type: 'UPDATE_START', id, start }),

  updateRangeSupplementary: (rangeId: string, supplementary: { id: string; type: 'AnnotationCollection' } | undefined): Action =>
    ({ type: 'UPDATE_RANGE_SUPPLEMENTARY', rangeId, supplementary }),

  // Phase 5: Board Design Action Creators
  createBoard: (boardId: string, title: string, behavior?: string[]): Action =>
    ({ type: 'CREATE_BOARD', boardId, title, behavior }),

  updateBoardItemPosition: (annotationId: string, surfaceCanvasId: string, x: number, y: number, w: number, h: number): Action =>
    ({ type: 'UPDATE_BOARD_ITEM_POSITION', annotationId, surfaceCanvasId, x, y, w, h }),

  removeBoardItem: (annotationId: string, surfaceCanvasId: string): Action =>
    ({ type: 'REMOVE_BOARD_ITEM', annotationId, surfaceCanvasId }),
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
