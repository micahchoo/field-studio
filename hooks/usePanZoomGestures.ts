/**
 * usePanZoomGestures Hook
 *
 * Unified gesture handling for pan and zoom operations.
 * Provides consistent mouse wheel zoom and drag-to-pan behavior across all viewers.
 */

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { type Point, VIEWPORT_DEFAULTS } from '../constants/viewport';
import type { UseViewportReturn } from './useViewport';

// ============================================================================
// Types
// ============================================================================

export interface UsePanZoomGesturesOptions {
  /** Callback when zoom changes */
  onZoom?: (delta: number, center: Point) => void;
  /** Callback when pan changes */
  onPan?: (dx: number, dy: number) => void;
  /** Callback when panning starts */
  onPanStart?: () => void;
  /** Callback when panning ends */
  onPanEnd?: () => void;
  /** Enable/disable gestures */
  enabled?: boolean;
  /** Which mouse button triggers panning ('left' | 'middle' | 'any') */
  panButton?: 'left' | 'middle' | 'any';
  /** Mouse wheel sensitivity for zoom */
  zoomSensitivity?: number;
  /** Whether to prevent default scroll behavior */
  preventDefault?: boolean;
  /** Require Ctrl/Cmd key for wheel zoom (useful when scroll should pan instead) */
  requireCtrlForZoom?: boolean;
  /** Enable wheel panning when zoom not active */
  enableWheelPan?: boolean;
}

export interface UsePanZoomGesturesReturn {
  /** Whether the user is currently panning */
  isPanning: boolean;
  /** Whether pan mode is active (space held) */
  isPanModeActive: boolean;
  /** Event handlers to attach to the container */
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
  };
  /** Set pan mode (for space bar toggle) */
  setPanModeActive: (active: boolean) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePanZoomGestures(
  containerRef: RefObject<HTMLElement | null>,
  viewport: UseViewportReturn,
  options: UsePanZoomGesturesOptions = {}
): UsePanZoomGesturesReturn {
  const {
    onZoom,
    onPan,
    onPanStart,
    onPanEnd,
    enabled = true,
    panButton = 'middle',
    zoomSensitivity = VIEWPORT_DEFAULTS.WHEEL_SENSITIVITY,
    preventDefault = true,
    requireCtrlForZoom = false,
    enableWheelPan = false,
  } = options;

  const [isPanning, setIsPanning] = useState(false);
  const [isPanModeActive, setIsPanModeActive] = useState(false);
  const lastPanPosition = useRef<Point | null>(null);

  // Check if mouse button matches pan button config
  const isPanButton = useCallback(
    (e: React.MouseEvent | MouseEvent): boolean => {
      if (panButton === 'any') return true;
      if (panButton === 'middle') return e.button === 1;
      if (panButton === 'left') return e.button === 0;
      return false;
    },
    [panButton]
  );

  // Check if pan should be triggered (button match or space+left-click)
  const shouldStartPan = useCallback(
    (e: React.MouseEvent | MouseEvent): boolean => {
      // Middle button always pans
      if (e.button === 1) return true;
      // Left button pans if pan mode is active (space held) or shift held
      if (e.button === 0 && (isPanModeActive || e.shiftKey)) return true;
      // Left button pans if configured as pan button
      if (panButton === 'left' && e.button === 0) return true;
      // Any button if configured
      if (panButton === 'any') return true;
      return false;
    },
    [isPanModeActive, panButton]
  );

  // Mouse down handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;

      if (shouldStartPan(e)) {
        e.preventDefault();
        setIsPanning(true);
        lastPanPosition.current = { x: e.clientX, y: e.clientY };
        onPanStart?.();
      }
    },
    [enabled, shouldStartPan, onPanStart]
  );

  // Mouse move handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !isPanning || !lastPanPosition.current) return;

      const dx = e.clientX - lastPanPosition.current.x;
      const dy = e.clientY - lastPanPosition.current.y;

      lastPanPosition.current = { x: e.clientX, y: e.clientY };

      viewport.pan(dx, dy);
      onPan?.(dx, dy);
    },
    [enabled, isPanning, viewport, onPan]
  );

  // Mouse up handler
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        lastPanPosition.current = null;
        onPanEnd?.();
      }
    },
    [isPanning, onPanEnd]
  );

  // Mouse leave handler
  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        lastPanPosition.current = null;
        onPanEnd?.();
      }
    },
    [isPanning, onPanEnd]
  );

  // Wheel handler
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!enabled) return;

      const container = containerRef.current;
      if (!container) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const shouldZoom = requireCtrlForZoom ? isCtrlOrCmd : true;

      if (shouldZoom) {
        if (preventDefault) {
          e.preventDefault();
        }

        const rect = container.getBoundingClientRect();
        const point: Point = { x: e.clientX, y: e.clientY };

        // Zoom at the cursor position
        viewport.zoomAtPoint(e.deltaY, point, rect);
        onZoom?.(e.deltaY, point);
      } else if (enableWheelPan && !isCtrlOrCmd) {
        // Use wheel for panning when not zooming
        if (preventDefault) {
          e.preventDefault();
        }
        viewport.pan(-e.deltaX, -e.deltaY);
        onPan?.(-e.deltaX, -e.deltaY);
      }
    },
    [enabled, containerRef, requireCtrlForZoom, preventDefault, enableWheelPan, viewport, onZoom, onPan]
  );

  // Global mouse up listener to handle mouse release outside container
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        lastPanPosition.current = null;
        onPanEnd?.();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isPanning, onPanEnd]);

  return {
    isPanning,
    isPanModeActive,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onWheel: handleWheel,
    },
    setPanModeActive: setIsPanModeActive,
  };
}
