/**
 * Viewport Keyboard -- DOM behavior action (Category 3)
 *
 * Replaces useViewportKeyboard React hook.
 * Architecture doc S4 Cat 3: Svelte action (use:viewportKeyboard)
 *
 * Keyboard shortcuts for viewport control: zoom, pan, rotation, and reset.
 * Applied to a viewport container element (Board, Map, Viewer canvas).
 *
 * Key bindings:
 *   +/=          Zoom in
 *   -/_          Zoom out
 *   Arrow keys   Pan (Shift = large step)
 *   R            Rotate clockwise
 *   Shift+R      Rotate counter-clockwise
 *   Ctrl/Cmd+0   Reset view
 *   0            Reset view (alternative)
 *   F            Fit to viewport (fires onReset)
 *
 * All shortcuts are suppressed when focus is inside an input, textarea,
 * select, or contenteditable element.
 *
 * Usage:
 *   <div
 *     use:viewportKeyboard={{
 *       onZoomIn: () => zoom(1.2),
 *       onZoomOut: () => zoom(0.8),
 *       onPan: (dx, dy) => pan(dx, dy),
 *       onRotateCW: () => rotate(90),
 *       onReset: () => resetView(),
 *     }}
 *     tabindex="0"
 *   />
 */

// ---------------------------------------------------------------------------
// Conversion strategy
// ---------------------------------------------------------------------------
// The React hook used useEffect with a keydown listener on the window scoped
// to a ref container. The Svelte action attaches the listener directly to
// `node`. Because keyboard events only fire on focused elements or the
// document, the node must be focusable (tabindex="0"). We set tabindex if
// the caller didn't, and clean it up on destroy only if we added it.
//
// Feature flags (enableZoom, enablePan, etc.) are checked at runtime so the
// action can be updated without re-mounting. The `onShortcut` callback
// provides a generic notification hook for analytics or status bar display.
// ---------------------------------------------------------------------------

export interface ViewportKeyboardParams {
  /** Master enable/disable (default: true) */
  enabled?: boolean;
  /** Enable zoom shortcuts +/- (default: true) */
  enableZoom?: boolean;
  /** Enable pan shortcuts arrows (default: true) */
  enablePan?: boolean;
  /** Enable rotation shortcuts R/Shift+R (default: true) */
  enableRotation?: boolean;
  /** Enable reset shortcut Ctrl+0 (default: true) */
  enableReset?: boolean;
  /** Pixels to pan per arrow key press (default: 50). Shift multiplies by 4. */
  panStep?: number;
  /** Degrees to rotate per R key press (default: 90) */
  rotationStep?: number;
  /** Called on zoom in (+/=) */
  onZoomIn?: () => void;
  /** Called on zoom out (-/_) */
  onZoomOut?: () => void;
  /** Called on arrow-key pan with pixel delta */
  onPan?: (dx: number, dy: number) => void;
  /** Called on clockwise rotation (R) */
  onRotateCW?: () => void;
  /** Called on counter-clockwise rotation (Shift+R) */
  onRotateCCW?: () => void;
  /** Called on reset view (Ctrl+0, 0, F) */
  onReset?: () => void;
  /** Generic callback fired for every handled shortcut with action name */
  onShortcut?: (action: string) => void;
}

/** Tags that should suppress viewport shortcuts to avoid conflicting with typing */
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTyping(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  if (INPUT_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

export function viewportKeyboard(node: HTMLElement, params: ViewportKeyboardParams) {
  let {
    enabled = true,
    enableZoom = true,
    enablePan = true,
    enableRotation = true,
    enableReset = true,
    panStep = 50,
    rotationStep = 90,
    onZoomIn,
    onZoomOut,
    onPan,
    onRotateCW,
    onRotateCCW,
    onReset,
    onShortcut,
  } = params;

  // Track whether we added tabindex ourselves so we can clean it up
  let addedTabindex = false;

  function ensureFocusable(): void {
    if (!node.hasAttribute('tabindex') && node.tabIndex < 0) {
      node.setAttribute('tabindex', '0');
      addedTabindex = true;
    }
  }

  ensureFocusable();

  // ---- Keyboard handler ----

  function handleKeydown(e: KeyboardEvent): void {
    if (!enabled) return;
    if (isTyping(e)) return;

    const hasCtrl = e.ctrlKey || e.metaKey;
    const hasShift = e.shiftKey;
    const step = hasShift ? panStep * 4 : panStep;

    let handled = true;
    let action = '';

    switch (e.key) {
      // ---- Zoom ----
      case '+':
      case '=':
        if (enableZoom) {
          onZoomIn?.();
          action = 'zoom-in';
        } else {
          handled = false;
        }
        break;

      case '-':
      case '_':
        if (enableZoom) {
          onZoomOut?.();
          action = 'zoom-out';
        } else {
          handled = false;
        }
        break;

      // ---- Pan ----
      case 'ArrowUp':
        if (enablePan) {
          onPan?.(0, step);
          action = 'pan-up';
        } else {
          handled = false;
        }
        break;

      case 'ArrowDown':
        if (enablePan) {
          onPan?.(0, -step);
          action = 'pan-down';
        } else {
          handled = false;
        }
        break;

      case 'ArrowLeft':
        if (enablePan) {
          onPan?.(step, 0);
          action = 'pan-left';
        } else {
          handled = false;
        }
        break;

      case 'ArrowRight':
        if (enablePan) {
          onPan?.(-step, 0);
          action = 'pan-right';
        } else {
          handled = false;
        }
        break;

      // ---- Rotation ----
      case 'r':
        if (enableRotation && !hasCtrl) {
          if (hasShift) {
            onRotateCCW?.();
            action = 'rotate-ccw';
          } else {
            onRotateCW?.();
            action = 'rotate-cw';
          }
        } else {
          handled = false;
        }
        break;

      case 'R':
        // Shift+R (capital R) for counter-clockwise
        if (enableRotation && !hasCtrl) {
          onRotateCCW?.();
          action = 'rotate-ccw';
        } else {
          handled = false;
        }
        break;

      // ---- Reset ----
      case '0':
        if (enableReset) {
          // Both Ctrl+0 and plain 0 trigger reset
          if (hasCtrl) {
            e.preventDefault(); // Prevent browser zoom reset
          }
          onReset?.();
          action = 'reset';
        } else {
          handled = false;
        }
        break;

      case 'f':
      case 'F':
        // Fit to viewport (common convention in image/map viewers)
        if (enableReset && !hasCtrl) {
          onReset?.();
          action = 'fit';
        } else {
          handled = false;
        }
        break;

      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      if (action) {
        onShortcut?.(action);
      }
    }
  }

  // ---- Attach listener ----

  node.addEventListener('keydown', handleKeydown);

  // ---- Action return ----

  return {
    update(newParams: ViewportKeyboardParams) {
      enabled = newParams.enabled ?? true;
      enableZoom = newParams.enableZoom ?? true;
      enablePan = newParams.enablePan ?? true;
      enableRotation = newParams.enableRotation ?? true;
      enableReset = newParams.enableReset ?? true;
      panStep = newParams.panStep ?? 50;
      rotationStep = newParams.rotationStep ?? 90;
      onZoomIn = newParams.onZoomIn;
      onZoomOut = newParams.onZoomOut;
      onPan = newParams.onPan;
      onRotateCW = newParams.onRotateCW;
      onRotateCCW = newParams.onRotateCCW;
      onReset = newParams.onReset;
      onShortcut = newParams.onShortcut;
    },

    destroy() {
      node.removeEventListener('keydown', handleKeydown);

      // Only remove tabindex if we added it
      if (addedTabindex) {
        node.removeAttribute('tabindex');
        addedTabindex = false;
      }
    },
  };
}
