/**
 * Annotation Tool Model
 *
 * Domain-specific logic for the polygon annotation tool.
 * Manages drawing state, point manipulation, and annotation creation.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Pure business logic, no UI concerns
 * - Reactive hooks for drawing state
 * - SVG path utilities
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { IIIFAnnotation, IIIFCanvas } from '@/types';
import type { Point } from '@/constants/viewport';

// ============================================================================
// Types
// ============================================================================

export type DrawingMode = 'polygon' | 'rectangle' | 'freehand' | 'select';

export interface AnnotationState {
  mode: DrawingMode;
  points: Point[];
  isDrawing: boolean;
  annotationText: string;
  motivation: 'commenting' | 'tagging' | 'describing';
  showExisting: boolean;
  freehandPoints: Point[];
  cursorPoint: Point | null;
  scale: number;
  offset: { x: number; y: number };
}

export interface UseAnnotationReturn extends AnnotationState {
  // Refs
  containerRef: React.RefObject<HTMLDivElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  
  // Computed
  canClose: boolean;
  canSave: boolean;
  existingSvgAnnotations: IIIFAnnotation[];
  
  // Actions
  setMode: (mode: DrawingMode) => void;
  setAnnotationText: (text: string) => void;
  setMotivation: (mot: 'commenting' | 'tagging' | 'describing') => void;
  setShowExisting: (show: boolean) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleClick: (e: React.MouseEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleUndo: () => void;
  handleClear: () => void;
  handleSave: () => IIIFAnnotation | null;
  getCanvasCoords: (e: React.MouseEvent | MouseEvent) => Point;
  updateScale: (canvas: IIIFCanvas) => void;
}

// ============================================================================
// SVG Utilities
// ============================================================================

export const pointsToSvgPath = (points: Point[], closed: boolean = true): string => {
  if (points.length < 2) return '';
  const pathParts = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  if (closed && points.length >= 3) pathParts.push('Z');
  return pathParts.join(' ');
};

export const createSvgSelector = (
  points: Point[],
  canvasWidth: number,
  canvasHeight: number
): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}"><path d="${pointsToSvgPath(points, true)}"/></svg>`;
};

export const parseSvgSelector = (svgValue: string): Point[] => {
  const points: Point[] = [];
  const pathMatch = svgValue.match(/d="([^"]+)"/);
  if (!pathMatch) return points;
  const commands = pathMatch[1].match(/[MLZ][\d.,\s-]*/gi);
  if (!commands) return points;
  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    if (type === 'Z') continue;
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
    if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      points.push({ x: coords[0], y: coords[1] });
    }
  }
  return points;
};

export const getBoundingBox = (points: Point[]) => {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

// ============================================================================
// Path Simplification
// ============================================================================

export const simplifyPath = (pts: Point[], tolerance: number): Point[] => {
  if (pts.length <= 2) return pts;
  const result: Point[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = result[result.length - 1];
    const dist = Math.sqrt(
      Math.pow(pts[i].x - prev.x, 2) + Math.pow(pts[i].y - prev.y, 2)
    );
    if (dist > tolerance) result.push(pts[i]);
  }
  result.push(pts[pts.length - 1]);
  return result;
};

// ============================================================================
// Hook
// ============================================================================

export const useAnnotation = (
  canvas: IIIFCanvas,
  existingAnnotations: IIIFAnnotation[],
  onCreateAnnotation: (annotation: IIIFAnnotation) => void,
  onClose: () => void
): UseAnnotationReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [mode, setModeState] = useState<DrawingMode>('polygon');
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotationText, setAnnotationText] = useState('');
  const [motivation, setMotivation] = useState<'commenting' | 'tagging' | 'describing'>('commenting');
  const [showExisting, setShowExisting] = useState(true);
  const [freehandPoints, setFreehandPoints] = useState<Point[]>([]);
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Calculate fit-to-screen scale
  const updateScale = useCallback((c: IIIFCanvas) => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const padding = 48;
    const scaleX = (containerRect.width - padding) / c.width;
    const scaleY = (containerRect.height - padding) / c.height;
    const fitScale = Math.min(scaleX, scaleY, 1);

    setScale(fitScale);
    setOffset({
      x: (containerRect.width - c.width * fitScale) / 2,
      y: (containerRect.height - c.height * fitScale) / 2,
    });
  }, []);

  // Get canvas coordinates from mouse event
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent | MouseEvent): Point => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      return {
        x: (mouseX - offset.x) / scale,
        y: (mouseY - offset.y) / scale,
      };
    },
    [scale, offset]
  );

  // Mouse handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const point = getCanvasCoords(e);
      setCursorPoint(point);

      if (mode === 'freehand' && isDrawing) {
        setFreehandPoints((prev) => [...prev, point]);
      }
    },
    [mode, isDrawing, getCanvasCoords]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || mode === 'select') return;

      const point = getCanvasCoords(e);

      if (mode === 'polygon') {
        // Check if clicking near first point to close
        if (points.length >= 3) {
          const first = points[0];
          const dist = Math.sqrt(
            Math.pow(point.x - first.x, 2) + Math.pow(point.y - first.y, 2)
          );
          if (dist < 15) {
            setIsDrawing(false);
            return;
          }
        }
        setPoints((prev) => [...prev, point]);
        setIsDrawing(true);
      } else if (mode === 'rectangle') {
        if (points.length === 0) {
          setPoints([point]);
          setIsDrawing(true);
        } else if (points.length === 1) {
          const start = points[0];
          setPoints([
            start,
            { x: point.x, y: start.y },
            point,
            { x: start.x, y: point.y },
          ]);
          setIsDrawing(false);
        }
      }
    },
    [mode, points, getCanvasCoords]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (mode === 'freehand' && e.button === 0) {
        const point = getCanvasCoords(e);
        setFreehandPoints([point]);
        setIsDrawing(true);
      }
    },
    [mode, getCanvasCoords]
  );

  const handleMouseUp = useCallback(() => {
    if (mode === 'freehand' && isDrawing) {
      // Simplify freehand path
      if (freehandPoints.length > 2) {
        const simplified = simplifyPath(freehandPoints, 3);
        setPoints(simplified);
      }
      setFreehandPoints([]);
      setIsDrawing(false);
    }
  }, [mode, isDrawing, freehandPoints]);

  const handleUndo = useCallback(() => {
    setPoints((prev) => {
      const newPoints = prev.slice(0, -1);
      if (newPoints.length < 2) setIsDrawing(false);
      return newPoints;
    });
  }, []);

  const handleClear = useCallback(() => {
    setPoints([]);
    setFreehandPoints([]);
    setIsDrawing(false);
  }, []);

  const handleSave = useCallback((): IIIFAnnotation | null => {
    if (points.length < 3) return null;
    if (!annotationText.trim()) return null;

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
    setAnnotationText('');
    return annotation;
  }, [points, annotationText, motivation, canvas, onCreateAnnotation, handleClear]);

  // Set mode with clear
  const setMode = useCallback(
    (newMode: DrawingMode) => {
      setModeState(newMode);
      handleClear();
    },
    [handleClear]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawing) handleClear();
        else onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'Enter' && points.length >= 3) {
        setIsDrawing(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDrawing, points.length, onClose, handleClear, handleUndo]);

  // Filter existing SVG annotations
  const existingSvgAnnotations = existingAnnotations.filter((anno) => {
    const selector = (anno.target as any)?.selector;
    return selector?.type === 'SvgSelector';
  });

  // Check if can close polygon
  const canClose =
    points.length >= 3 &&
    cursorPoint &&
    (() => {
      const first = points[0];
      const dist = Math.sqrt(
        Math.pow((cursorPoint?.x || 0) - first.x, 2) +
          Math.pow((cursorPoint?.y || 0) - first.y, 2)
      );
      return dist < 15;
    })();

  const canSave = points.length >= 3 && annotationText.trim().length > 0;

  return {
    mode,
    points,
    isDrawing,
    annotationText,
    motivation,
    showExisting,
    freehandPoints,
    cursorPoint,
    scale,
    offset,
    containerRef,
    imageRef,
    canClose,
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
    getCanvasCoords,
    updateScale,
  };
};
