/**
 * Resizable Panel -- DOM behavior action (Category 3)
 *
 * Replaces useResizablePanel React hook.
 * Architecture doc S4 Cat 3: Svelte action (use:resizablePanel)
 *
 * Handles mouse/touch drag, keyboard arrows, double-click reset,
 * localStorage persistence, and collapse threshold.
 *
 * Note: The existing `resizable` action in layout/actions/ applies to the
 * *panel* element and looks for a child handle. This action instead is
 * applied directly to the *handle* element, keeping the handle decoupled
 * from the panel DOM structure. It dispatches a custom 'resize' event so
 * the parent component can apply the size however it wants (CSS var, style
 * binding, store, etc.).
 *
 * Usage:
 *   <div bind:this={panel}>
 *     <div use:resizablePanel={{ id: 'sidebar', defaultSize: 280, direction: 'horizontal', side: 'left' }} />
 *   </div>
 */

export interface ResizablePanelParams {
  /** Unique ID for localStorage persistence key */
  id: string;
  /** Default / initial size in pixels */
  defaultSize: number;
  /** Minimum allowed size in pixels (default: 0) */
  minSize?: number;
  /** Maximum allowed size in pixels (default: Infinity) */
  maxSize?: number;
  /** Drag axis (default: 'horizontal') */
  direction?: 'horizontal' | 'vertical';
  /** Which side the panel sits on -- determines delta sign (default: 'left') */
  side?: 'left' | 'right' | 'top' | 'bottom';
  /** Size below which the panel collapses to 0. Set 0 to disable (default: 0) */
  collapseThreshold?: number;
  /** Persist size in localStorage (default: true) */
  persist?: boolean;
  /** Called on every resize tick with the new size */
  onResize?: (size: number) => void;
  /** Called when the panel collapses (size hits 0) */
  onCollapse?: () => void;
  /** Called when the panel expands from collapsed state */
  onExpand?: () => void;
}

// ---------------------------------------------------------------------------
// Conversion strategy
// ---------------------------------------------------------------------------
// React hook kept refs for size/dragging and attached window-level listeners
// via useEffect. The Svelte action mirrors this with plain variables (no
// $state/$effect) and manual addEventListener/removeEventListener on init and
// destroy.
//
// Key differences from the layout/actions/resizable.ts already in the repo:
//   1. `node` IS the handle, not the panel. Caller decides how to apply size.
//   2. Dispatches CustomEvent('resize') with { size, isCollapsed }.
//   3. Full keyboard support (ArrowLeft/Right/Up/Down, Home, End).
//   4. Touch support via touchstart/touchmove/touchend.
//   5. Debounced localStorage writes (500 ms).
//   6. ARIA attributes on handle (role="separator", aria-orientation, etc.).
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'resizable-panel-';
const KEYBOARD_STEP = 10;
const KEYBOARD_STEP_LARGE = 50;
const PERSIST_DEBOUNCE_MS = 500;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resizablePanel(node: HTMLElement, params: ResizablePanelParams) {
  // ---- Destructure with defaults ----
  let {
    id,
    defaultSize,
    minSize = 0,
    maxSize = Infinity,
    direction = 'horizontal',
    side = 'left',
    collapseThreshold = 0,
    persist = true,
    onResize,
    onCollapse,
    onExpand,
  } = params;

  const isHorizontal = () => direction === 'horizontal';

  // ---- Mutable tracking variables (no $state -- pure action) ----
  let currentSize = defaultSize;
  let lastVisibleSize = defaultSize;
  let isCollapsed = false;
  let isDragging = false;
  let rafId: number | null = null;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- localStorage helpers ----

  function storageKey(): string {
    return `${STORAGE_PREFIX}${id}`;
  }

  function loadPersistedSize(): number | null {
    if (!persist) return null;
    try {
      const raw = localStorage.getItem(storageKey());
      if (raw !== null) {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch {
      /* localStorage unavailable */
    }
    return null;
  }

  function persistSize(size: number): void {
    if (!persist) return;
    if (persistTimer !== null) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey(), String(size));
      } catch {
        /* ignore */
      }
    }, PERSIST_DEBOUNCE_MS);
  }

  // ---- Dispatch custom event ----

  function dispatch(size: number, collapsed: boolean): void {
    node.dispatchEvent(
      new CustomEvent('resize', {
        detail: { size, isCollapsed: collapsed },
        bubbles: true,
      }),
    );
    onResize?.(size);
  }

  // ---- Apply size + collapse logic ----

  function applySize(newSize: number, fireEvent = true): void {
    const clamped = clamp(newSize, minSize, maxSize);

    // Collapse check
    if (collapseThreshold > 0 && clamped < collapseThreshold && clamped < lastVisibleSize) {
      if (!isCollapsed) {
        isCollapsed = true;
        currentSize = 0;
        onCollapse?.();
      }
    } else {
      if (isCollapsed) {
        isCollapsed = false;
        onExpand?.();
      }
      currentSize = clamped;
      lastVisibleSize = clamped;
    }

    updateAriaValue();
    if (fireEvent) dispatch(currentSize, isCollapsed);
  }

  // ---- ARIA attributes ----

  function setAriaAttributes(): void {
    node.setAttribute('role', 'separator');
    node.setAttribute('aria-orientation', isHorizontal() ? 'horizontal' : 'vertical');
    node.setAttribute('aria-valuemin', String(minSize));
    node.setAttribute('aria-valuemax', String(maxSize === Infinity ? 9999 : maxSize));
    node.setAttribute('aria-valuenow', String(currentSize));
    if (!node.hasAttribute('tabindex')) {
      node.setAttribute('tabindex', '0');
    }
  }

  function updateAriaValue(): void {
    node.setAttribute('aria-valuenow', String(currentSize));
  }

  // ---- Pointer (mouse) drag ----

  function getDelta(clientPos: number, startPos: number): number {
    const raw = clientPos - startPos;
    // For right / bottom panels the delta is inverted
    if (side === 'right' || side === 'bottom') return -raw;
    return raw;
  }

  function handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return; // left button only
    e.preventDefault();
    startDrag(isHorizontal() ? e.clientX : e.clientY);
  }

  // ---- Touch drag ----

  function handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    startDrag(isHorizontal() ? touch.clientX : touch.clientY);
  }

  // ---- Shared drag logic ----

  let dragStartPos = 0;
  let dragStartSize = 0;

  function startDrag(startPos: number): void {
    isDragging = true;
    dragStartPos = startPos;
    dragStartSize = isCollapsed ? lastVisibleSize : currentSize;

    // Set cursor on body to prevent flickering
    document.body.style.userSelect = 'none';
    document.body.style.cursor = isHorizontal() ? 'col-resize' : 'row-resize';
    node.setAttribute('data-dragging', 'true');

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!isDragging) return;
    const clientPos = isHorizontal() ? e.clientX : e.clientY;
    scheduleResize(clientPos);
  }

  function handleTouchMove(e: TouchEvent): void {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const clientPos = isHorizontal() ? touch.clientX : touch.clientY;
    scheduleResize(clientPos);
  }

  function scheduleResize(clientPos: number): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const delta = getDelta(clientPos, dragStartPos);
      const newSize = dragStartSize + delta;
      applySize(newSize);
      rafId = null;
    });
  }

  function stopDrag(): void {
    isDragging = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    node.removeAttribute('data-dragging');

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    persistSize(currentSize);

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }

  function handlePointerUp(): void {
    stopDrag();
  }

  function handleTouchEnd(): void {
    stopDrag();
  }

  // ---- Double-click: reset to defaultSize or toggle collapse ----

  function handleDblClick(): void {
    if (isCollapsed) {
      // Expand to last visible size or default
      isCollapsed = false;
      currentSize = lastVisibleSize || defaultSize;
      onExpand?.();
    } else if (collapseThreshold > 0) {
      // Collapse
      lastVisibleSize = currentSize;
      isCollapsed = true;
      currentSize = 0;
      onCollapse?.();
    } else {
      // No collapse -- reset to default
      currentSize = defaultSize;
      lastVisibleSize = defaultSize;
    }

    updateAriaValue();
    dispatch(currentSize, isCollapsed);
    persistSize(currentSize);
  }

  // ---- Keyboard resize ----

  function handleKeydown(e: KeyboardEvent): void {
    const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
    const horizontal = isHorizontal();

    let handled = true;

    switch (e.key) {
      case 'ArrowLeft':
        if (horizontal) {
          applySize((isCollapsed ? lastVisibleSize : currentSize) - step);
        } else {
          handled = false;
        }
        break;
      case 'ArrowRight':
        if (horizontal) {
          applySize((isCollapsed ? lastVisibleSize : currentSize) + step);
        } else {
          handled = false;
        }
        break;
      case 'ArrowUp':
        if (!horizontal) {
          applySize((isCollapsed ? lastVisibleSize : currentSize) - step);
        } else {
          handled = false;
        }
        break;
      case 'ArrowDown':
        if (!horizontal) {
          applySize((isCollapsed ? lastVisibleSize : currentSize) + step);
        } else {
          handled = false;
        }
        break;
      case 'Home':
        applySize(minSize);
        break;
      case 'End':
        applySize(maxSize === Infinity ? defaultSize * 3 : maxSize);
        break;
      case 'Enter':
        // Toggle collapse
        handleDblClick();
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
      persistSize(currentSize);
    }
  }

  // ---- Initialization ----

  // Load persisted size and apply
  const stored = loadPersistedSize();
  if (stored !== null) {
    if (collapseThreshold > 0 && stored === 0) {
      isCollapsed = true;
      currentSize = 0;
    } else {
      currentSize = clamp(stored, minSize, maxSize);
      lastVisibleSize = currentSize;
    }
  }

  setAriaAttributes();
  dispatch(currentSize, isCollapsed);

  // Attach listeners to the handle node
  node.addEventListener('pointerdown', handlePointerDown);
  node.addEventListener('touchstart', handleTouchStart, { passive: false });
  node.addEventListener('dblclick', handleDblClick);
  node.addEventListener('keydown', handleKeydown);

  // ---- Action return ----

  return {
    update(newParams: ResizablePanelParams) {
      id = newParams.id;
      defaultSize = newParams.defaultSize;
      minSize = newParams.minSize ?? 0;
      maxSize = newParams.maxSize ?? Infinity;
      direction = newParams.direction ?? 'horizontal';
      side = newParams.side ?? 'left';
      collapseThreshold = newParams.collapseThreshold ?? 0;
      persist = newParams.persist ?? true;
      onResize = newParams.onResize;
      onCollapse = newParams.onCollapse;
      onExpand = newParams.onExpand;

      // Re-apply ARIA in case direction changed
      setAriaAttributes();
    },

    destroy() {
      // Cancel any pending RAF / timer
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (persistTimer !== null) clearTimeout(persistTimer);

      // Clean up drag state in case destroy is called mid-drag
      if (isDragging) {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      }

      node.removeEventListener('pointerdown', handlePointerDown);
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('dblclick', handleDblClick);
      node.removeEventListener('keydown', handleKeydown);
    },
  };
}
