/**
 * useViewport Hook
 *
 * Core viewport state management for unified pan/zoom behavior across all image viewing components.
 * Provides a consistent API for manipulating viewport state including zoom, pan, and rotation.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  VIEWPORT_DEFAULTS,
  DEFAULT_VIEWPORT_STATE,
  type ViewportState,
  type Point,
} from '../constants/viewport';

// ============================================================================
// Types
// ============================================================================

export interface UseViewportOptions {
  /** Minimum zoom level (default: 0.1) */
  minScale?: number;
  /** Maximum zoom level (default: 5) */
  maxScale?: number;
  /** Initial zoom level (default: 1) */
  initialScale?: number;
  /** Initial pan X offset */
  initialX?: number;
  /** Initial pan Y offset */
  initialY?: number;
  /** Initial rotation in degrees */
  initialRotation?: number;
  /** Enable rotation controls */
  enableRotation?: boolean;
  /** Zoom step multiplier (default: 1.2) */
  zoomStep?: number;
}

export interface UseViewportReturn {
  /** Current viewport state */
  viewport: ViewportState;
  /** Set viewport state directly */
  setViewport: (v: ViewportState | ((prev: ViewportState) => ViewportState)) => void;
  /** Zoom in by one step */
  zoomIn: () => void;
  /** Zoom out by one step */
  zoomOut: () => void;
  /** Zoom to a specific scale level */
  zoomTo: (scale: number) => void;
  /** Zoom to fit content within container */
  zoomToFit: (containerRect: DOMRect, contentWidth: number, contentHeight: number, padding?: number) => void;
  /** Zoom at a specific point (for mouse wheel zoom) */
  zoomAtPoint: (delta: number, point: Point, containerRect: DOMRect) => void;
  /** Pan by delta amounts */
  pan: (dx: number, dy: number) => void;
  /** Pan to absolute position */
  panTo: (x: number, y: number) => void;
  /** Rotate by degrees (increments of 90) */
  rotate: (degrees: number) => void;
  /** Reset viewport to initial state */
  reset: () => void;
  /** Get CSS transform style for the viewport */
  getTransformStyle: () => React.CSSProperties;
  /** Get CSS transform string */
  getTransformString: () => string;
  /** Convert screen coordinates to canvas coordinates */
  screenToCanvas: (screenX: number, screenY: number, containerRect: DOMRect) => Point;
  /** Convert canvas coordinates to screen coordinates */
  canvasToScreen: (canvasX: number, canvasY: number, containerRect: DOMRect) => Point;
  /** Current scale as percentage */
  scalePercent: number;
  /** Configuration */
  config: {
    minScale: number;
    maxScale: number;
    zoomStep: number;
    enableRotation: boolean;
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useViewport(options: UseViewportOptions = {}): UseViewportReturn {
  const {
    minScale = VIEWPORT_DEFAULTS.MIN_SCALE,
    maxScale = VIEWPORT_DEFAULTS.MAX_SCALE,
    initialScale = VIEWPORT_DEFAULTS.INITIAL_SCALE,
    initialX = 0,
    initialY = 0,
    initialRotation = VIEWPORT_DEFAULTS.INITIAL_ROTATION,
    enableRotation = false,
    zoomStep = VIEWPORT_DEFAULTS.ZOOM_STEP,
  } = options;

  const initialState: ViewportState = {
    x: initialX,
    y: initialY,
    scale: Math.max(minScale, Math.min(maxScale, initialScale)),
    rotation: initialRotation,
  };

  const [viewport, setViewportState] = useState<ViewportState>(initialState);

  // Clamp scale to valid range
  const clampScale = useCallback(
    (scale: number) => Math.max(minScale, Math.min(maxScale, scale)),
    [minScale, maxScale]
  );

  // Normalize rotation to 0-359 range
  const normalizeRotation = useCallback((degrees: number) => {
    const normalized = degrees % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }, []);

  // Set viewport with clamping
  const setViewport = useCallback(
    (v: ViewportState | ((prev: ViewportState) => ViewportState)) => {
      setViewportState((prev) => {
        const newState = typeof v === 'function' ? v(prev) : v;
        return {
          ...newState,
          scale: clampScale(newState.scale),
          rotation: normalizeRotation(newState.rotation),
        };
      });
    },
    [clampScale, normalizeRotation]
  );

  // Zoom in by step
  const zoomIn = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      scale: clampScale(prev.scale * zoomStep),
    }));
  }, [setViewport, clampScale, zoomStep]);

  // Zoom out by step
  const zoomOut = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      scale: clampScale(prev.scale / zoomStep),
    }));
  }, [setViewport, clampScale, zoomStep]);

  // Zoom to specific scale
  const zoomTo = useCallback(
    (scale: number) => {
      setViewport((prev) => ({
        ...prev,
        scale: clampScale(scale),
      }));
    },
    [setViewport, clampScale]
  );

  // Zoom to fit content in container
  const zoomToFit = useCallback(
    (containerRect: DOMRect, contentWidth: number, contentHeight: number, padding = 40) => {
      const availableWidth = containerRect.width - padding * 2;
      const availableHeight = containerRect.height - padding * 2;

      const scaleX = availableWidth / contentWidth;
      const scaleY = availableHeight / contentHeight;
      const fitScale = Math.min(scaleX, scaleY);

      // Center the content
      const scaledWidth = contentWidth * fitScale;
      const scaledHeight = contentHeight * fitScale;
      const x = (containerRect.width - scaledWidth) / 2;
      const y = (containerRect.height - scaledHeight) / 2;

      setViewport({
        x,
        y,
        scale: clampScale(fitScale),
        rotation: viewport.rotation,
      });
    },
    [setViewport, clampScale, viewport.rotation]
  );

  // Zoom at a specific point (maintains position under cursor)
  const zoomAtPoint = useCallback(
    (delta: number, point: Point, containerRect: DOMRect) => {
      setViewport((prev) => {
        const newScale = clampScale(prev.scale * (1 - delta * VIEWPORT_DEFAULTS.WHEEL_SENSITIVITY));

        // Calculate the point in content space
        const contentX = (point.x - containerRect.left - prev.x) / prev.scale;
        const contentY = (point.y - containerRect.top - prev.y) / prev.scale;

        // Calculate new position to keep the point under cursor
        const newX = point.x - containerRect.left - contentX * newScale;
        const newY = point.y - containerRect.top - contentY * newScale;

        return {
          ...prev,
          x: newX,
          y: newY,
          scale: newScale,
        };
      });
    },
    [setViewport, clampScale]
  );

  // Pan by delta
  const pan = useCallback(
    (dx: number, dy: number) => {
      setViewport((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    },
    [setViewport]
  );

  // Pan to absolute position
  const panTo = useCallback(
    (x: number, y: number) => {
      setViewport((prev) => ({
        ...prev,
        x,
        y,
      }));
    },
    [setViewport]
  );

  // Rotate by degrees
  const rotate = useCallback(
    (degrees: number) => {
      if (!enableRotation) return;
      setViewport((prev) => ({
        ...prev,
        rotation: normalizeRotation(prev.rotation + degrees),
      }));
    },
    [setViewport, enableRotation, normalizeRotation]
  );

  // Reset to initial state
  const reset = useCallback(() => {
    setViewportState(initialState);
  }, [initialState]);

  // Get CSS transform string
  const getTransformString = useCallback(() => {
    const { x, y, scale, rotation } = viewport;
    const transforms: string[] = [];

    if (x !== 0 || y !== 0) {
      transforms.push(`translate(${x}px, ${y}px)`);
    }

    if (scale !== 1) {
      transforms.push(`scale(${scale})`);
    }

    if (rotation !== 0) {
      transforms.push(`rotate(${rotation}deg)`);
    }

    return transforms.join(' ') || 'none';
  }, [viewport]);

  // Get CSS transform style object
  const getTransformStyle = useCallback((): React.CSSProperties => {
    return {
      transform: getTransformString(),
      transformOrigin: '0 0',
    };
  }, [getTransformString]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number, containerRect: DOMRect): Point => {
      const { x, y, scale, rotation } = viewport;

      // Translate to viewport-relative coordinates
      let cx = (screenX - containerRect.left - x) / scale;
      let cy = (screenY - containerRect.top - y) / scale;

      // Apply inverse rotation if needed
      if (rotation !== 0) {
        const rad = (-rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rx = cx * cos - cy * sin;
        const ry = cx * sin + cy * cos;
        cx = rx;
        cy = ry;
      }

      return { x: cx, y: cy };
    },
    [viewport]
  );

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback(
    (canvasX: number, canvasY: number, containerRect: DOMRect): Point => {
      const { x, y, scale, rotation } = viewport;

      let cx = canvasX;
      let cy = canvasY;

      // Apply rotation if needed
      if (rotation !== 0) {
        const rad = (rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rx = cx * cos - cy * sin;
        const ry = cx * sin + cy * cos;
        cx = rx;
        cy = ry;
      }

      // Apply scale and translation
      const screenX = cx * scale + x + containerRect.left;
      const screenY = cy * scale + y + containerRect.top;

      return { x: screenX, y: screenY };
    },
    [viewport]
  );

  // Scale as percentage
  const scalePercent = Math.round(viewport.scale * 100);

  // Configuration object for consumers
  const config = useMemo(
    () => ({
      minScale,
      maxScale,
      zoomStep,
      enableRotation,
    }),
    [minScale, maxScale, zoomStep, enableRotation]
  );

  return {
    viewport,
    setViewport,
    zoomIn,
    zoomOut,
    zoomTo,
    zoomToFit,
    zoomAtPoint,
    pan,
    panTo,
    rotate,
    reset,
    getTransformStyle,
    getTransformString,
    screenToCanvas,
    canvasToScreen,
    scalePercent,
    config,
  };
}

// Re-export types from constants
export type { ViewportState, Point } from '../constants/viewport';
