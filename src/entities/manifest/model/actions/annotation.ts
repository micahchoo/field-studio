/**
 * Annotation-related action handlers.
 * Handles: ADD_ANNOTATION, REMOVE_ANNOTATION, UPDATE_ANNOTATION,
 *          CREATE_ANNOTATION_PAGE, UPDATE_ANNOTATION_PAGE_LABEL,
 *          MOVE_ANNOTATION_TO_PAGE, SET_ANNOTATION_PAGE_BEHAVIOR
 */

import type { Action, ActionResult } from './types';
import type { NormalizedState } from '../vault';
import {
  addEntity,
  getEntity,
  moveEntity,
  removeEntity,
  updateEntity
} from '../vault';
import type { IIIFItem } from '@/src/shared/types';
import type { PropertyChange } from '@/src/shared/services/provenanceService';
import { validateLanguageMap } from './validation';

export function handleAnnotationAction(state: NormalizedState, action: Action): ActionResult | null {
  switch (action.type) {
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

    default:
      return null;
  }
}
