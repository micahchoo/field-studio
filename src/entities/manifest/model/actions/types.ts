/**
 * Action type definitions for the mutation system.
 */

import type {
  IIIFAnnotation,
  IIIFCanvas,
  IIIFItem,
  IIIFRange,
  LanguageMap
} from '@/src/shared/types';
import type { NormalizedState } from '../vault';
import type { PropertyChange } from '@/src/shared/services/provenanceService';

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

export interface HistoryEntry {
  action: Action;
  /** Forward patches to re-apply this action */
  forwardPatches: import('@/src/shared/lib/jsonPatch').Patch[];
  /** Reverse patches to undo this action */
  reversePatches: import('@/src/shared/lib/jsonPatch').Patch[];
  /** Entity ID affected (for coalescing) */
  entityId?: string;
  timestamp: number;
}
