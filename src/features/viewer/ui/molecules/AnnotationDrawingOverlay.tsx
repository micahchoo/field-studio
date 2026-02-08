/**
 * AnnotationDrawingOverlay Molecule
 *
 * Thin adapter over Annotorious for OSD-integrated annotation drawing.
 * Replaces the previous manual SVG overlay + viewport tracking code.
 *
 * Annotorious handles all viewport sync, drawing tools, and annotation
 * rendering natively via OSD's overlay API.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props
 * - Delegates drawing to useAnnotorious hook
 * - Renders only a minimal status bar
 *
 * @module features/viewer/ui/molecules/AnnotationDrawingOverlay
 */

import React, { useCallback, useEffect, useRef } from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';
import type { SpatialDrawingMode } from '../../model/annotation';
import { useAnnotorious, type AnnotoriousDrawingTool } from '../../model/useAnnotorious';

export interface AnnotationDrawingOverlayProps {
  canvas: IIIFCanvas;
  viewerRef: React.MutableRefObject<any>;
  isActive: boolean;
  drawingMode: SpatialDrawingMode;
  onDrawingModeChange: (mode: SpatialDrawingMode) => void;
  onCreateAnnotation: (annotation: IIIFAnnotation) => void;
  onClose: () => void;
  existingAnnotations: IIIFAnnotation[];
  onUndoRef?: (fn: () => void) => void;
  onClearRef?: (fn: () => void) => void;
  onSaveRef?: (fn: () => void) => void;
  onDrawingStateChange?: (state: { pointCount: number; isDrawing: boolean; canSave: boolean }) => void;
  annotationText?: string;
  annotationMotivation?: 'commenting' | 'tagging' | 'describing';
  osdReady?: number;
  cx: ContextualClassNames;
  fieldMode: boolean;
}

/** Map Field Studio drawing modes to Annotorious tools */
function toAnnotoriousTool(mode: SpatialDrawingMode): AnnotoriousDrawingTool | null {
  if (mode === 'polygon') return 'polygon';
  if (mode === 'rectangle') return 'rectangle';
  // 'freehand' and 'select' have no direct Annotorious equivalent
  return null;
}

export const AnnotationDrawingOverlay: React.FC<AnnotationDrawingOverlayProps> = ({
  canvas,
  viewerRef,
  isActive,
  drawingMode,
  onCreateAnnotation,
  onClose,
  existingAnnotations,
  onUndoRef,
  onClearRef,
  onSaveRef,
  onDrawingStateChange,
  annotationText: annotationTextProp = '',
  annotationMotivation: motivationProp = 'commenting',
  osdReady = 0,
  fieldMode,
}) => {
  // Ref to store the pending annotation geometry from Annotorious
  const pendingAnnotationRef = useRef<IIIFAnnotation | null>(null);

  // Called when Annotorious completes a shape — store it; don't persist yet
  const handleAnnotoriousCreate = useCallback((annotation: IIIFAnnotation) => {
    pendingAnnotationRef.current = annotation;
    onDrawingStateChange?.({ pointCount: 3, isDrawing: false, canSave: true });
  }, [onDrawingStateChange]);

  const {
    annoRef,
    setDrawingTool,
    setDrawingEnabled,
    cancelDrawing,
    clearSelection,
  } = useAnnotorious(viewerRef, canvas, existingAnnotations, {
    fieldMode,
    osdReady,
    onCreated: handleAnnotoriousCreate,
  });

  // Sync isActive → drawingEnabled
  useEffect(() => {
    setDrawingEnabled(isActive);
    if (!isActive) {
      pendingAnnotationRef.current = null;
      onDrawingStateChange?.({ pointCount: 0, isDrawing: false, canSave: false });
    }
  }, [isActive, setDrawingEnabled, onDrawingStateChange]);

  // Sync drawingMode → tool
  useEffect(() => {
    const tool = toAnnotoriousTool(drawingMode);
    if (tool) {
      setDrawingTool(tool);
    }
  }, [drawingMode, setDrawingTool]);

  // Expose undo ref
  useEffect(() => {
    onUndoRef?.(() => {
      annoRef.current?.undo();
    });
  }, [onUndoRef, annoRef]);

  // Expose clear ref
  useEffect(() => {
    const clearFn = () => {
      cancelDrawing();
      clearSelection();
      pendingAnnotationRef.current = null;
      onDrawingStateChange?.({ pointCount: 0, isDrawing: false, canSave: false });
    };
    onClearRef?.(clearFn);
  }, [onClearRef, cancelDrawing, clearSelection, onDrawingStateChange]);

  // Expose save ref — combines stored geometry + text/motivation from Inspector
  useEffect(() => {
    const saveFn = () => {
      const pending = pendingAnnotationRef.current;
      if (!pending) return;
      if (!annotationTextProp.trim()) return;

      // Build the final annotation with text from Inspector
      const finalAnnotation: IIIFAnnotation = {
        ...pending,
        id: `${canvas.id}/annotation/${Date.now()}`,
        motivation: motivationProp,
        body: {
          type: 'TextualBody',
          value: annotationTextProp.trim(),
          format: 'text/plain',
        },
      };

      onCreateAnnotation(finalAnnotation);

      // Clean up Annotorious state — remove the draft shape
      if (annoRef.current && pending.id) {
        annoRef.current.removeAnnotation(pending.id as any);
      }

      pendingAnnotationRef.current = null;
      onDrawingStateChange?.({ pointCount: 0, isDrawing: false, canSave: false });
    };
    onSaveRef?.(saveFn);
  }, [onSaveRef, annotationTextProp, motivationProp, canvas.id, onCreateAnnotation, onDrawingStateChange, annoRef]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingAnnotationRef.current) {
          cancelDrawing();
          clearSelection();
          pendingAnnotationRef.current = null;
          onDrawingStateChange?.({ pointCount: 0, isDrawing: false, canSave: false });
        } else {
          onClose();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        annoRef.current?.undo();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, onClose, cancelDrawing, clearSelection, onDrawingStateChange, annoRef]);

  if (!isActive) return null;

  return (
    <div
      className={`
        absolute bottom-4 left-4 z-20 px-3 py-2 text-xs font-medium
        ${fieldMode ? 'bg-nb-black/95 text-nb-black/20' : 'bg-nb-white text-nb-black/60'}
        border ${fieldMode ? 'border-nb-yellow/50' : 'border-nb-black/20'}
        backdrop-blur-sm shadow-brutal
      `}
    >
      {pendingAnnotationRef.current
        ? 'Shape ready — enter text in Inspector and save'
        : drawingMode === 'polygon'
          ? 'Click to add points, close shape to finish'
          : drawingMode === 'rectangle'
            ? 'Click and drag to draw a rectangle'
            : 'Select a drawing tool'
      }
    </div>
  );
};

export default AnnotationDrawingOverlay;
