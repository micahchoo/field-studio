/**
 * AnnotationToolPanel Organism
 *
 * Full annotation tool as a panel/organism.
 * Composes molecules: AnnotationToolbar, AnnotationCanvas, AnnotationForm
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx via props from template
 * - Composes feature-specific molecules
 * - Domain logic delegated to useAnnotation hook
 */

import React, { useEffect } from 'react';
import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';
import { useAnnotation } from '../../model';
import {
  AnnotationCanvas,
  AnnotationForm,
  AnnotationToolbar,
} from '../molecules';

export interface AnnotationToolPanelProps {
  /** Canvas to annotate */
  canvas: IIIFCanvas;
  /** Image URL for the canvas */
  imageUrl: string;
  /** Existing annotations */
  existingAnnotations?: IIIFAnnotation[];
  /** Callback when annotation is created */
  onCreateAnnotation: (annotation: IIIFAnnotation) => void;
  /** Callback when panel closes */
  onClose: () => void;
  /** Contextual styles */
  cx: {
    text: string;
    textMuted: string;
    active: string;
    surface: string;
  };
}

/**
 * AnnotationToolPanel Organism
 */
export const AnnotationToolPanel: React.FC<AnnotationToolPanelProps> = ({
  canvas,
  imageUrl,
  existingAnnotations = [],
  onCreateAnnotation,
  onClose,
  cx: _cx,
}) => {
  const {
    mode,
    points,
    isDrawing,
    annotationText,
    motivation,
    showExisting,
    freehandPoints,
    containerRef,
    imageRef,
    canSave,
    existingSvgAnnotations,
    setMode,
    setAnnotationText,
    setMotivation,
    setShowExisting,
    handleMouseMove,
    handleClick,
    handleMouseDown,
    handleMouseUp,
    handleUndo,
    handleClear,
    handleSave,
    updateScale,
  } = useAnnotation(canvas, existingAnnotations, onCreateAnnotation, onClose);

  // Initialize scale on mount
  useEffect(() => {
    updateScale(canvas);
  }, [canvas, updateScale]);

  return (
    <div className="absolute inset-0 z-50 bg-nb-black flex flex-col">
      <AnnotationToolbar
        currentMode={mode}
        existingCount={existingSvgAnnotations.length}
        showExisting={showExisting}
        onModeChange={setMode}
        onToggleExisting={() => setShowExisting(!showExisting)}
        onClose={onClose}
      />

      <div className="flex-1 flex overflow-hidden">
        <AnnotationCanvas
          canvas={canvas}
          imageUrl={imageUrl}
          points={points}
          freehandPoints={freehandPoints}
          existingAnnotations={existingAnnotations}
          showExisting={showExisting}
          isDrawing={isDrawing}
          scale={1}
          offset={{ x: 0, y: 0 }}
          containerRef={containerRef}
          imageRef={imageRef}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        <AnnotationForm
          text={annotationText}
          motivation={motivation}
          pointCount={points.length}
          canSave={canSave}
          onTextChange={setAnnotationText}
          onMotivationChange={setMotivation}
          onSave={handleSave}
          onUndo={handleUndo}
          onClear={handleClear}
        />
      </div>
    </div>
  );
};
