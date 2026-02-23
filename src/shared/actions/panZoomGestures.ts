/**
 * Pan Zoom Gestures -- DOM behavior action (Category 3)
 *
 * Replaces usePanZoomGestures React hook.
 * Architecture doc S4 Cat 3: Svelte action (use:panZoomGestures)
 *
 * Unified mouse/wheel/touch gesture handling for pan and zoom on
 * canvas/viewport containers such as the Board and Map views.
 *
 * Supports:
 *   - Wheel zoom at cursor position (Ctrl+wheel or standalone)
 *   - Wheel pan (when enableWheelPan and no Ctrl)
 *   - Middle-mouse-button drag to pan
 *   - Left-mouse-button drag to pan (configurable via panButton)
 *   - Space + left-click drag to pan (canvas tool convention)
 *   - Touch pinch-to-zoom
 *   - Touch two-finger pan
 *
 * Usage:
 *   <div use:panZoomGestures={{
 *     onZoom: handleZoom,
 *     onPan: handlePan,
 *     zoomSensitivity: 0.002,
 *   }} />
 */

// ---------------------------------------------------------------------------
// Conversion strategy
// ---------------------------------------------------------------------------
// The React hook used useRef for the container element and useEffect to
// attach wheel/pointer/key listeners. In the Svelte action:
//   - `node` IS the container element
//   - Plain variables replace useRef for drag tracking
//   - destroy() cleans up all listeners
//   - No $state/$effect -- pure DOM + event wiring
//
// Key details:
//   - Wheel events use { passive: false } to allow preventDefault
//   - Mouse move during pan uses RAF throttle for smooth 60fps updates
//   - A global pointerup/pointermove ensures we catch releases outside node
//   - Space-bar state is tracked to enable space+click panning
// ---------------------------------------------------------------------------

export interface PanZoomParams {
  /** Called on zoom. delta > 0 = zoom in, < 0 = zoom out. Center is cursor position relative to node. */
  onZoom?: (delta: number, centerX: number, centerY: number) => void;
  /** Called on pan with the pixel displacement since last tick */
  onPan?: (dx: number, dy: number) => void;
  /** Called when a pan gesture starts */
  onPanStart?: () => void;
  /** Called when a pan gesture ends */
  onPanEnd?: () => void;
  /** Master enable/disable (default: true) */
  enabled?: boolean;
  /** Which mouse button initiates a pan drag: 'left' (0), 'middle' (1), 'any' (default: 'middle') */
  panButton?: 'left' | 'middle' | 'any';
  /** Zoom sensitivity multiplier (default: 0.001) */
  zoomSensitivity?: number;
  /** Require Ctrl/Cmd to zoom with wheel (default: false) */
  requireCtrlForZoom?: boolean;
  /** Use wheel without Ctrl as pan instead of zoom (default: false). Only relevant when requireCtrlForZoom is true. */
  enableWheelPan?: boolean;
}

// Map panButton string to MouseEvent.button value
function buttonMatch(setting: 'left' | 'middle' | 'any', button: number): boolean {
  if (setting === 'any') return true;
  if (setting === 'left') return button === 0;
  if (setting === 'middle') return button === 1;
  return false;
}

export function panZoomGestures(node: HTMLElement, params: PanZoomParams) {
  let {
    onZoom,
    onPan,
    onPanStart,
    onPanEnd,
    enabled = true,
    panButton = 'middle',
    zoomSensitivity = 0.001,
    requireCtrlForZoom = false,
    enableWheelPan = false,
  } = params;

  // ---- Mutable tracking state (plain variables) ----
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;
  let rafId: number | null = null;
  let spaceHeld = false;

  // ---- Touch tracking for pinch-to-zoom ----
  let lastTouchDist: number | null = null;
  let lastTouchCenterX = 0;
  let lastTouchCenterY = 0;
  let isTouchPanning = false;

  // ---- Wheel handler ----

  function handleWheel(e: WheelEvent): void {
    if (!enabled) return;

    const hasCtrl = e.ctrlKey || e.metaKey;

    // Determine whether this wheel event should zoom or pan
    const shouldZoom = requireCtrlForZoom ? hasCtrl : !enableWheelPan || hasCtrl;

    if (shouldZoom) {
      e.preventDefault();
      // Calculate cursor position relative to node
      const rect = node.getBoundingClientRect();
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;

      // Normalize delta across browsers. Positive deltaY = scroll down = zoom out.
      const delta = -e.deltaY * zoomSensitivity;
      onZoom?.(delta, centerX, centerY);
    } else if (enableWheelPan && !hasCtrl) {
      e.preventDefault();
      // Wheel pan: deltaX = horizontal, deltaY = vertical
      onPan?.(-e.deltaX, -e.deltaY);
    }
  }

  // ---- Pointer pan (mouse drag) ----

  function handlePointerDown(e: PointerEvent): void {
    if (!enabled) return;

    // Space + left click always pans
    const isSpacePan = spaceHeld && e.button === 0;
    const isButtonPan = buttonMatch(panButton, e.button);

    if (!isSpacePan && !isButtonPan) return;

    e.preventDefault();
    isPanning = true;
    lastX = e.clientX;
    lastY = e.clientY;

    node.style.cursor = 'grabbing';
    node.setPointerCapture(e.pointerId);
    onPanStart?.();

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!isPanning) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    // RAF throttle for smooth updates
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const dx = clientX - lastX;
      const dy = clientY - lastY;
      lastX = clientX;
      lastY = clientY;
      onPan?.(dx, dy);
      rafId = null;
    });
  }

  function handlePointerUp(e: PointerEvent): void {
    if (!isPanning) return;
    isPanning = false;

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    node.style.cursor = '';
    try {
      node.releasePointerCapture(e.pointerId);
    } catch {
      /* pointerId may already be released */
    }

    onPanEnd?.();

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  // ---- Space bar tracking (for space+click pan) ----

  function handleKeyDown(e: KeyboardEvent): void {
    if (!enabled) return;
    if (e.key === ' ' && !spaceHeld) {
      // Only intercept space when not typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      e.preventDefault();
      spaceHeld = true;
      node.style.cursor = 'grab';
    }
  }

  function handleKeyUp(e: KeyboardEvent): void {
    if (e.key === ' ') {
      spaceHeld = false;
      if (!isPanning) {
        node.style.cursor = '';
      }
    }
  }

  // ---- Touch gestures (pinch-to-zoom and two-finger pan) ----

  function touchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleTouchStart(e: TouchEvent): void {
    if (!enabled) return;

    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      lastTouchDist = touchDistance(t1, t2);

      const rect = node.getBoundingClientRect();
      lastTouchCenterX = (t1.clientX + t2.clientX) / 2 - rect.left;
      lastTouchCenterY = (t1.clientY + t2.clientY) / 2 - rect.top;
      isTouchPanning = true;
      onPanStart?.();
    }
  }

  function handleTouchMove(e: TouchEvent): void {
    if (!enabled) return;

    if (e.touches.length === 2 && lastTouchDist !== null) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = touchDistance(t1, t2);

      const rect = node.getBoundingClientRect();
      const centerX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const centerY = (t1.clientY + t2.clientY) / 2 - rect.top;

      // Pinch zoom
      const scale = dist / lastTouchDist;
      const delta = (scale - 1) * 2; // Amplify for usable sensitivity
      onZoom?.(delta, centerX, centerY);

      // Two-finger pan
      const panDx = centerX - lastTouchCenterX;
      const panDy = centerY - lastTouchCenterY;
      if (Math.abs(panDx) > 0.5 || Math.abs(panDy) > 0.5) {
        onPan?.(panDx, panDy);
      }

      lastTouchDist = dist;
      lastTouchCenterX = centerX;
      lastTouchCenterY = centerY;
    }
  }

  function handleTouchEnd(e: TouchEvent): void {
    if (e.touches.length < 2) {
      lastTouchDist = null;
      if (isTouchPanning) {
        isTouchPanning = false;
        onPanEnd?.();
      }
    }
  }

  // ---- Prevent default context menu on middle click ----

  function handleContextMenu(e: MouseEvent): void {
    // Middle-click sometimes triggers context menu; prevent it when we use middle for pan
    if (panButton === 'middle' || panButton === 'any') {
      if (e.button === 1) {
        e.preventDefault();
      }
    }
  }

  // Prevent middle-click auto-scroll behavior
  function handleAuxClick(e: MouseEvent): void {
    if (!enabled) return;
    if (e.button === 1 && (panButton === 'middle' || panButton === 'any')) {
      e.preventDefault();
    }
  }

  // ---- Initialization ----

  // Passive: false is required to preventDefault on wheel for zoom
  node.addEventListener('wheel', handleWheel, { passive: false });
  node.addEventListener('pointerdown', handlePointerDown);
  node.addEventListener('keydown', handleKeyDown);
  node.addEventListener('keyup', handleKeyUp);
  node.addEventListener('touchstart', handleTouchStart, { passive: false });
  node.addEventListener('touchmove', handleTouchMove, { passive: false });
  node.addEventListener('touchend', handleTouchEnd);
  node.addEventListener('contextmenu', handleContextMenu);
  node.addEventListener('auxclick', handleAuxClick);

  // Make the node focusable for space-bar detection if it isn't already
  if (!node.hasAttribute('tabindex') && node.tabIndex < 0) {
    node.setAttribute('tabindex', '0');
  }

  // ---- Action return ----

  return {
    update(newParams: PanZoomParams) {
      onZoom = newParams.onZoom;
      onPan = newParams.onPan;
      onPanStart = newParams.onPanStart;
      onPanEnd = newParams.onPanEnd;
      enabled = newParams.enabled ?? true;
      panButton = newParams.panButton ?? 'middle';
      zoomSensitivity = newParams.zoomSensitivity ?? 0.001;
      requireCtrlForZoom = newParams.requireCtrlForZoom ?? false;
      enableWheelPan = newParams.enableWheelPan ?? false;
    },

    destroy() {
      // Cancel pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // End any active pan
      if (isPanning) {
        isPanning = false;
        node.style.cursor = '';
        onPanEnd?.();
      }

      // Reset space state
      spaceHeld = false;

      node.removeEventListener('wheel', handleWheel);
      node.removeEventListener('pointerdown', handlePointerDown);
      node.removeEventListener('keydown', handleKeyDown);
      node.removeEventListener('keyup', handleKeyUp);
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
      node.removeEventListener('touchend', handleTouchEnd);
      node.removeEventListener('contextmenu', handleContextMenu);
      node.removeEventListener('auxclick', handleAuxClick);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    },
  };
}
