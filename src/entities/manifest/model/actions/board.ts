/**
 * Board design action handlers.
 * Handles: CREATE_BOARD, UPDATE_BOARD_ITEM_POSITION, REMOVE_BOARD_ITEM
 */

import type { Action, ActionResult } from './types';
import type { NormalizedState } from '../vault';
import {
  addEntity,
  getEntity,
  removeEntity,
  updateEntity
} from '../vault';
import type {
  IIIFAnnotation,
  IIIFAnnotationPage,
  IIIFCanvas,
  IIIFItem,
  IIIFManifest
} from '@/src/shared/types';

export function handleBoardAction(state: NormalizedState, action: Action): ActionResult | null {
  switch (action.type) {
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
      return null;
  }
}
