/**
 * AnnotationDrawingOverlay Molecule
 *
 * Integrated annotation drawing overlay that works directly on top of the OSD viewer.
 * Uses OSD viewport coordinates to ensure annotations align with the actual image.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props
 * - Uses useAnnotation hook for drawing logic
 * - Renders directly over OSD without separate window
 *
 * @module features/viewer/ui/molecules/AnnotationDrawingOverlay
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';
import {
  createSvgSelector,
  type SpatialDrawingMode,
  parseSvgSelector,
  pointsToSvgPath,
  simplifyPath,
} from '../../model/annotation';
import type { Point } from '@/src/shared/constants/viewport';

export interface AnnotationDrawingOverlayProps {
  /** The canvas being annotated */
  canvas: IIIFCanvas;
  /** Reference to OpenSeadragon viewer */
  viewerRef: React.MutableRefObject<any>;
  /** Whether annotation mode is active */
  isActive: boolean;
  /** Current drawing mode - controlled by toolbar (spatial modes only) */
  drawingMode: SpatialDrawingMode;
  /** Callback when drawing mode changes */
  onDrawingModeChange: (mode: SpatialDrawingMode) => void;
  /** Callback when annotation is created */
  onCreateAnnotation: (annotation: IIIFAnnotation) => void;
  /** Callback to close annotation mode */
  onClose: () => void;
  /** Existing annotations to display */
  existingAnnotations: IIIFAnnotation[];
  /** Callback to expose undo function to parent */
  onUndoRef?: (fn: () => void) => void;
  /** Callback to expose clear function to parent */
  onClearRef?: (fn: () => void) => void;
  /** Callback to expose save function to parent */
  onSaveRef?: (fn: () => void) => void;
  /** Callback when drawing state changes (for status display) */
  onDrawingStateChange?: (state: { pointCount: number; isDrawing: boolean; canSave: boolean }) => void;
  /** Annotation text - controlled from parent (Inspector) */
  annotationText?: string;
  /** Annotation motivation - controlled from parent (Inspector) */
  annotationMotivation?: 'commenting' | 'tagging' | 'describing';
  /** Contextual styles */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
}

/**
 * AnnotationDrawingOverlay
 *
 * Renders annotation drawing tools directly on the OSD viewer
 */
export const AnnotationDrawingOverlay: React.FC<AnnotationDrawingOverlayProps> = ({
  canvas,
  viewerRef,
  isActive,
  drawingMode,
  onDrawingModeChange,
  onCreateAnnotation,
  onClose,
  existingAnnotations,
  onUndoRef,
  onClearRef,
  onSaveRef,
  onDrawingStateChange,
  annotationText: annotationTextProp = '',
  annotationMotivation: motivationProp = 'commenting',
  cx,
  fieldMode,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Drawing state - mode is now controlled from parent
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([]);
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);
  const [showExisting, setShowExisting] = useState(true);

  // Use controlled text/motivation from props (managed by Inspector)
  const annotationText = annotationTextProp;
  const motivation = motivationProp;

  // Use controlled mode from props
  const mode = drawingMode;

  // Viewport state for syncing with OSD
  const [viewportBounds, setViewportBounds] = useState({ x: 0, y: 0, width: canvas.width, height: canvas.height });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Update viewport bounds from OSD
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !isActive) return;

    const updateViewport = () => {
      if (!viewer.viewport) return;

      const bounds = viewer.viewport.getBounds(true);
      const containerRect = viewer.container.getBoundingClientRect();

      setViewportBounds({
        x: bounds.x * canvas.width,
        y: bounds.y * canvas.height * (canvas.width / canvas.height),
        width: bounds.width * canvas.width,
        height: bounds.height * canvas.height * (canvas.width / canvas.height),
      });

      setContainerSize({
        width: containerRect.width,
        height: containerRect.height,
      });
    };

    // Initial update
    updateViewport();

    // Listen for viewport changes
    viewer.addHandler('animation', updateViewport);
    viewer.addHandler('zoom', updateViewport);
    viewer.addHandler('pan', updateViewport);
    viewer.addHandler('resize', updateViewport);

    return () => {
      viewer.removeHandler('animation', updateViewport);
      viewer.removeHandler('zoom', updateViewport);
      viewer.removeHandler('pan', updateViewport);
      viewer.removeHandler('resize', updateViewport);
    };
  }, [viewerRef, isActive, canvas.width, canvas.height]);

  // Convert screen coordinates to image coordinates
  const screenToImageCoords = useCallback((screenX: number, screenY: number): Point => {
    const viewer = viewerRef.current;
    if (!viewer?.viewport) return { x: 0, y: 0 };

    const containerRect = viewer.container.getBoundingClientRect();
    const point = new (window as any).OpenSeadragon.Point(
      screenX - containerRect.left,
      screenY - containerRect.top
    );

    const viewportPoint = viewer.viewport.pointFromPixel(point);

    return {
      x: viewportPoint.x * canvas.width,
      y: viewportPoint.y * canvas.width, // OSD uses width for both dimensions
    };
  }, [viewerRef, canvas.width]);

  // Convert image coordinates to screen coordinates for display
  const imageToScreenCoords = useCallback((imgX: number, imgY: number): { x: number; y: number } => {
    const viewer = viewerRef.current;
    if (!viewer?.viewport) return { x: 0, y: 0 };

    const viewportPoint = new (window as any).OpenSeadragon.Point(
      imgX / canvas.width,
      imgY / canvas.width
    );

    const pixelPoint = viewer.viewport.pixelFromPoint(viewportPoint);
    return { x: pixelPoint.x, y: pixelPoint.y };
  }, [viewerRef, canvas.width]);

  // Mouse event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isActive) return;

    const point = screenToImageCoords(e.clientX, e.clientY);
    setCursorPoint(point);

    if (mode === 'freehand' && isDrawing) {
      setFreehandPoints(prev => [...prev, point]);
    }
  }, [isActive, mode, isDrawing, screenToImageCoords]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isActive || e.button !== 0 || mode === 'select') return;

    e.preventDefault();
    e.stopPropagation();

    const point = screenToImageCoords(e.clientX, e.clientY);

    if (mode === 'polygon') {
      // Check if clicking near first point to close
      if (points.length >= 3) {
        const first = points[0];
        const dist = Math.sqrt(Math.pow(point.x - first.x, 2) + Math.pow(point.y - first.y, 2));
        const closeThreshold = viewportBounds.width / containerSize.width * 15; // Scale threshold
        if (dist < closeThreshold) {
          setIsDrawing(false);
          // Form is shown in Inspector when shape is ready
          return;
        }
      }
      setPoints(prev => [...prev, point]);
      setIsDrawing(true);
    } else if (mode === 'rectangle') {
      if (points.length === 0) {
        setPoints([point]);
        setIsDrawing(true);
      } else if (points.length === 1) {
        const start = points[0];
        setPoints([start, { x: point.x, y: start.y }, point, { x: start.x, y: point.y }]);
        setIsDrawing(false);
        // Form is shown in Inspector when shape is ready
      }
    }
  }, [isActive, mode, points, screenToImageCoords, viewportBounds.width, containerSize.width]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive) return;

    if (mode === 'freehand' && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      const point = screenToImageCoords(e.clientX, e.clientY);
      setFreehandPoints([point]);
      setIsDrawing(true);
    }
  }, [isActive, mode, screenToImageCoords]);

  const handleMouseUp = useCallback(() => {
    if (mode === 'freehand' && isDrawing) {
      if (freehandPoints.length > 2) {
        const simplified = simplifyPath(freehandPoints, 3);
        setPoints(simplified);
        // Form is shown in Inspector when shape is ready
      }
      setFreehandPoints([]);
      setIsDrawing(false);
    }
  }, [mode, isDrawing, freehandPoints]);

  // Actions
  const handleUndo = useCallback(() => {
    setPoints(prev => {
      const newPoints = prev.slice(0, -1);
      if (newPoints.length < 2) setIsDrawing(false);
      return newPoints;
    });
  }, []);

  const handleClear = useCallback(() => {
    setPoints([]);
    setFreehandPoints([]);
    setIsDrawing(false);
    // Text is managed by parent (ViewerView/Inspector)
  }, []);

  const handleSave = useCallback(() => {
    if (points.length < 3) return;
    if (!annotationText.trim()) return;

    const annotation: IIIFAnnotation = {
      id: `${canvas.id}/annotation/${Date.now()}`,
      type: 'Annotation',
      motivation,
      body: {
        type: 'TextualBody',
        value: annotationText.trim(),
        format: 'text/plain',
      },
      target: {
        type: 'SpecificResource',
        source: canvas.id,
        selector: {
          type: 'SvgSelector',
          value: createSvgSelector(points, canvas.width, canvas.height),
        },
      },
    };

    onCreateAnnotation(annotation);
    handleClear();
  }, [points, annotationText, motivation, canvas, onCreateAnnotation, handleClear]);

  const setModeWithClear = useCallback((newMode: SpatialDrawingMode) => {
    onDrawingModeChange(newMode);
    handleClear();
  }, [onDrawingModeChange, handleClear]);

  // Expose undo/clear/save to parent via refs
  useEffect(() => {
    onUndoRef?.(handleUndo);
  }, [onUndoRef, handleUndo]);

  useEffect(() => {
    onClearRef?.(handleClear);
  }, [onClearRef, handleClear]);

  useEffect(() => {
    onSaveRef?.(handleSave);
  }, [onSaveRef, handleSave]);

  // Notify parent of drawing state changes
  useEffect(() => {
    onDrawingStateChange?.({
      pointCount: points.length,
      isDrawing,
      canSave: points.length >= 3 && annotationText.trim().length > 0,
    });
  }, [points.length, isDrawing, annotationText, onDrawingStateChange]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawing) {
          handleClear();
        } else {
          onClose();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'Enter' && points.length >= 3 && isDrawing) {
        // Close the shape when pressing Enter
        setIsDrawing(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, isDrawing, points.length, onClose, handleClear, handleUndo]);

  // Filter existing SVG annotations
  const existingSvgAnnotations = existingAnnotations.filter(anno => {
    const selector = (anno.target as any)?.selector;
    return selector?.type === 'SvgSelector';
  });

  // Can close polygon check
  const canClose = points.length >= 3 && cursorPoint && (() => {
    const first = points[0];
    const dist = Math.sqrt(Math.pow((cursorPoint?.x || 0) - first.x, 2) + Math.pow((cursorPoint?.y || 0) - first.y, 2));
    const closeThreshold = viewportBounds.width / containerSize.width * 15;
    return dist < closeThreshold;
  })();

  const accentColor = fieldMode ? 'rgb(234, 179, 8)' : 'rgb(34, 197, 94)'; // yellow-500 or green-500
  const accentColorFaded = fieldMode ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)';

  // Only render when annotation mode is active
  // Existing annotations are shown in the Inspector panel when mode is off
  if (!isActive) return null;

  return (
    <>
      {/* Drawing Overlay */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 z-10 ${mode !== 'select' ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ pointerEvents: mode === 'select' ? 'none' : 'auto' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* SVG Layer for shapes - positioned via CSS to match OSD container */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {/* Existing annotations */}
          {showExisting && existingSvgAnnotations.map((anno) => {
            const selector = (anno.target as any)?.selector;
            const existingPoints = parseSvgSelector(selector?.value || '');
            if (existingPoints.length < 3) return null;

            const screenPoints = existingPoints.map(p => imageToScreenCoords(p.x, p.y));

            return (
              <path
                key={anno.id}
                d={pointsToSvgPath(screenPoints, true)}
                fill="rgba(59, 130, 246, 0.15)"
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth={2}
              />
            );
          })}

          {/* Freehand preview */}
          {mode === 'freehand' && freehandPoints.length > 1 && (
            <path
              d={pointsToSvgPath(freehandPoints.map(p => imageToScreenCoords(p.x, p.y)), false)}
              fill="none"
              stroke={accentColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Current drawing */}
          {points.length >= 2 && (
            <>
              <polyline
                points={points.map(p => {
                  const screen = imageToScreenCoords(p.x, p.y);
                  return `${screen.x},${screen.y}`;
                }).join(' ')}
                fill="none"
                stroke={accentColor}
                strokeWidth={2}
                strokeDasharray={isDrawing ? '5,5' : 'none'}
              />
              {points.length >= 3 && (
                <path
                  d={pointsToSvgPath(points.map(p => imageToScreenCoords(p.x, p.y)), !isDrawing)}
                  fill={isDrawing ? 'none' : accentColorFaded}
                  stroke={accentColor}
                  strokeWidth={2}
                  strokeDasharray={isDrawing ? '5,5' : 'none'}
                />
              )}
            </>
          )}

          {/* Point markers */}
          {points.map((p, i) => {
            const screen = imageToScreenCoords(p.x, p.y);
            return (
              <circle
                key={i}
                cx={screen.x}
                cy={screen.y}
                r={6}
                fill={i === 0 ? accentColor : 'white'}
                stroke={accentColor}
                strokeWidth={2}
              />
            );
          })}

          {/* Close indicator */}
          {canClose && points[0] && (
            <>
              {(() => {
                const screen = imageToScreenCoords(points[0].x, points[0].y);
                return (
                  <>
                    <circle
                      cx={screen.x}
                      cy={screen.y}
                      r={15}
                      fill="none"
                      stroke={accentColor}
                      strokeWidth={2}
                      strokeDasharray="3,3"
                      opacity={0.8}
                    />
                    <text
                      x={screen.x + 20}
                      y={screen.y - 20}
                      fill="white"
                      fontSize={12}
                      fontWeight="bold"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                    >
                      Click to close
                    </text>
                  </>
                );
              })()}
            </>
          )}
        </svg>
      </div>

      {/* Drawing status bar */}
      <div
        className={`
          absolute bottom-4 left-4 z-20 px-3 py-2 rounded-lg text-xs font-medium
          ${fieldMode ? 'bg-stone-900/95 text-stone-300' : 'bg-white/95 text-slate-600'}
          border ${fieldMode ? 'border-yellow-900/50' : 'border-slate-200'}
          backdrop-blur-sm shadow-lg
        `}
      >
        {mode === 'polygon' && (
          <>
            {points.length === 0 ? 'Click to start drawing' :
             points.length < 3 ? `${points.length} point${points.length > 1 ? 's' : ''} - need at least 3` :
             isDrawing ? 'Click first point to close, or press Enter' :
             'Shape ready - click to add more points'}
          </>
        )}
        {mode === 'rectangle' && (
          points.length === 0 ? 'Click to set first corner' : 'Click to set opposite corner'
        )}
        {mode === 'freehand' && 'Click and drag to draw'}
        {mode === 'select' && 'Pan mode - use normal viewer controls'}

        {points.length >= 3 && (
          <span className={`ml-2 ${fieldMode ? 'text-yellow-400' : 'text-green-600'}`}>
            | {points.length} pts
          </span>
        )}
      </div>

    </>
  );
};

export default AnnotationDrawingOverlay;
