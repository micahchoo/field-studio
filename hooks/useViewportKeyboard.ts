/**
 * useViewportKeyboard Hook
 *
 * Standardized keyboard shortcuts for viewport control.
 * Provides consistent keyboard-based pan, zoom, and rotation across all viewers.
 */

import { type RefObject, useCallback, useEffect } from 'react';
import { VIEWPORT_DEFAULTS, VIEWPORT_KEYBOARD } from '../constants/viewport';
import type { UseViewportReturn } from './useViewport';
import type { UsePanZoomGesturesReturn } from './usePanZoomGestures';

// ============================================================================
// Types
// ============================================================================

export interface UseViewportKeyboardOptions {
  /** Enable/disable keyboard shortcuts */
  enabled?: boolean;
  /** Enable zoom shortcuts (+/-) */
  enableZoom?: boolean;
  /** Enable pan shortcuts (arrow keys) */
  enablePan?: boolean;
  /** Enable rotation shortcuts (R/Shift+R) */
  enableRotation?: boolean;
  /** Enable reset shortcut (Cmd/Ctrl+0) */
  enableReset?: boolean;
  /** Enable space bar for pan mode */
  enableSpacePan?: boolean;
  /** Pan amount per arrow key press */
  panStep?: number;
  /** Rotation amount per key press */
  rotationStep?: number;
  /** Callback when shortcuts are triggered */
  onShortcut?: (action: string) => void;
}

export interface UseViewportKeyboardReturn {
  /** Manually trigger a keyboard action */
  triggerAction: (action: 'zoomIn' | 'zoomOut' | 'reset' | 'panUp' | 'panDown' | 'panLeft' | 'panRight' | 'rotateCW' | 'rotateCCW') => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useViewportKeyboard(
  containerRef: RefObject<HTMLElement | null>,
  viewport: UseViewportReturn,
  gestures?: UsePanZoomGesturesReturn,
  options: UseViewportKeyboardOptions = {}
): UseViewportKeyboardReturn {
  const {
    enabled = true,
    enableZoom = true,
    enablePan = true,
    enableRotation = false,
    enableReset = true,
    enableSpacePan = true,
    panStep = VIEWPORT_DEFAULTS.PAN_KEYBOARD_STEP,
    rotationStep = VIEWPORT_DEFAULTS.ROTATION_STEP,
    onShortcut,
  } = options;

  // Trigger action programmatically
  const triggerAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'zoomIn':
          viewport.zoomIn();
          break;
        case 'zoomOut':
          viewport.zoomOut();
          break;
        case 'reset':
          viewport.reset();
          break;
        case 'panUp':
          viewport.pan(0, panStep);
          break;
        case 'panDown':
          viewport.pan(0, -panStep);
          break;
        case 'panLeft':
          viewport.pan(panStep, 0);
          break;
        case 'panRight':
          viewport.pan(-panStep, 0);
          break;
        case 'rotateCW':
          viewport.rotate(rotationStep);
          break;
        case 'rotateCCW':
          viewport.rotate(-rotationStep);
          break;
      }
      onShortcut?.(action);
    },
    [viewport, panStep, rotationStep, onShortcut]
  );

  // Keyboard event handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Only respond if the container or its children have focus, or if document.body has focus
      const {activeElement} = document;
      const isContainerFocused =
        container.contains(activeElement) ||
        activeElement === document.body ||
        activeElement === null;

      // Don't capture if user is typing in an input
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        (activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (!isContainerFocused) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const {key} = e;

      // Space bar for pan mode
      if (enableSpacePan && key === VIEWPORT_KEYBOARD.PAN_MODE && !e.repeat) {
        e.preventDefault();
        gestures?.setPanModeActive(true);
        return;
      }

      // Zoom shortcuts
      if (enableZoom) {
        if ((VIEWPORT_KEYBOARD.ZOOM_IN as readonly string[]).includes(key)) {
          e.preventDefault();
          triggerAction('zoomIn');
          return;
        }
        if ((VIEWPORT_KEYBOARD.ZOOM_OUT as readonly string[]).includes(key)) {
          e.preventDefault();
          triggerAction('zoomOut');
          return;
        }
      }

      // Reset shortcut (Cmd/Ctrl + 0)
      if (enableReset && key === VIEWPORT_KEYBOARD.RESET && isCtrlOrCmd) {
        e.preventDefault();
        triggerAction('reset');
        return;
      }

      // Pan shortcuts (arrow keys)
      if (enablePan) {
        switch (key) {
          case VIEWPORT_KEYBOARD.PAN_UP:
            e.preventDefault();
            triggerAction('panUp');
            return;
          case VIEWPORT_KEYBOARD.PAN_DOWN:
            e.preventDefault();
            triggerAction('panDown');
            return;
          case VIEWPORT_KEYBOARD.PAN_LEFT:
            e.preventDefault();
            triggerAction('panLeft');
            return;
          case VIEWPORT_KEYBOARD.PAN_RIGHT:
            e.preventDefault();
            triggerAction('panRight');
            return;
        }
      }

      // Rotation shortcuts
      if (enableRotation && viewport.config.enableRotation) {
        if (key === VIEWPORT_KEYBOARD.ROTATE_CCW && e.shiftKey) {
          e.preventDefault();
          triggerAction('rotateCCW');
          return;
        }
        if (key.toLowerCase() === VIEWPORT_KEYBOARD.ROTATE_CW.toLowerCase() && !e.shiftKey) {
          e.preventDefault();
          triggerAction('rotateCW');
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release pan mode when space is released
      if (enableSpacePan && e.key === VIEWPORT_KEYBOARD.PAN_MODE) {
        gestures?.setPanModeActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    enabled,
    enableZoom,
    enablePan,
    enableRotation,
    enableReset,
    enableSpacePan,
    containerRef,
    viewport,
    gestures,
    triggerAction,
  ]);

  return {
    triggerAction,
  };
}
