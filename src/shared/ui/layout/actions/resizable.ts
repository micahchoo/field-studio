/**
 * Svelte action for drag-to-resize panels
 * Ported from src/shared/lib/hooks/useResizablePanel.ts
 */

export interface ResizableParams {
  id: string;
  size: number;
  min?: number;
  max?: number;
  collapsible?: boolean | number;
  direction: 'horizontal' | 'vertical';
  onVisibilityChange?: (visible: boolean) => void;
}

const STORAGE_PREFIX = 'split-panel-';

function clampSize(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resizable(node: HTMLElement, params: ResizableParams | undefined) {
  if (!params) return { destroy() {} };

  const { id, size, min = 0, max = Infinity, collapsible, direction, onVisibilityChange } = params;
  const storageKey = `${STORAGE_PREFIX}${id}`;
  const isHorizontal = direction === 'horizontal';
  const collapseThreshold = typeof collapsible === 'number' ? collapsible : collapsible ? 100 : 0;

  let currentSize = size;
  let lastVisibleSize = size;
  let isCollapsed = false;
  let isDragging = false;

  // Load persisted size
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= 0) {
        currentSize = clampSize(parsed, min, max);
      }
    }
  } catch { /* localStorage unavailable */ }

  // Apply initial size
  function applySize(px: number) {
    if (isHorizontal) {
      node.style.width = `${px}px`;
    } else {
      node.style.height = `${px}px`;
    }
  }
  applySize(currentSize);

  // Find the resize handle
  const handle = node.querySelector('[data-resize-handle]') as HTMLElement | null;
  if (!handle) return { destroy() {} };

  function persist() {
    try {
      localStorage.setItem(storageKey, String(currentSize));
    } catch { /* ignore */ }
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    isDragging = true;
    const startPos = isHorizontal ? e.clientX : e.clientY;
    const startSize = currentSize;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';

    let rafId: number | null = null;

    function onPointerMove(ev: PointerEvent) {
      if (!isDragging) return;
      const currentPos = isHorizontal ? ev.clientX : ev.clientY;
      const delta = currentPos - startPos;
      const newSize = clampSize(startSize + delta, min, max);

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        currentSize = newSize;
        applySize(currentSize);
      });
    }

    function onPointerUp() {
      isDragging = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      if (rafId !== null) cancelAnimationFrame(rafId);

      // Check collapse
      if (collapseThreshold > 0 && currentSize < collapseThreshold) {
        isCollapsed = true;
        currentSize = 0;
        applySize(0);
        onVisibilityChange?.(false);
      } else {
        if (isCollapsed) {
          isCollapsed = false;
          onVisibilityChange?.(true);
        }
        lastVisibleSize = currentSize;
      }

      persist();
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  function onDblClick() {
    if (isCollapsed) {
      isCollapsed = false;
      currentSize = lastVisibleSize || size;
      applySize(currentSize);
      persist();
      onVisibilityChange?.(true);
    } else if (collapseThreshold > 0) {
      lastVisibleSize = currentSize;
      isCollapsed = true;
      currentSize = 0;
      applySize(0);
      persist();
      onVisibilityChange?.(false);
    }
  }

  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('dblclick', onDblClick);

  return {
    destroy() {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('dblclick', onDblClick);
    },
  };
}
