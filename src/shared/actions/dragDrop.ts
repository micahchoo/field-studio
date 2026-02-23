/**
 * Drag Drop -- DOM behavior action (Category 3)
 *
 * Replaces useDragDrop React hook.
 * Architecture doc S4 Cat 3: Svelte action (use:dragDrop)
 *
 * Handles HTML5 drag/drop events, drop position calculation,
 * multi-select drag with custom drag image, and external file drops.
 *
 * Usage:
 *   <li use:dragDrop={{
 *     itemId: canvas.id,
 *     onDrop: handleReorder,
 *     selectedIds: $selectedCanvasIds,
 *   }}>
 */

// ---------------------------------------------------------------------------
// Conversion strategy
// ---------------------------------------------------------------------------
// The React hook used useRef + useEffect to wire dragstart/dragover/drop/etc.
// onto a ref'd element. In Svelte this maps cleanly to an action: `node` is
// the element, plain variables replace useRef, and destroy() replaces the
// useEffect cleanup return.
//
// Key behaviors preserved:
//   1. HTML5 native drag (node.draggable = true)
//   2. Custom MIME type for internal drag identification
//   3. Drop position (before/after) calculated from mouse Y relative to the
//      target's midpoint
//   4. Multi-select drag image: a cloned badge showing the count
//   5. External drops (files from OS) forwarded via onExternalDrop
//   6. data-drag-state attribute for CSS-driven visual feedback
//   7. Drop indicator attribute (data-drop-position) for CSS styling
// ---------------------------------------------------------------------------

export interface DragDropParams {
  /** Unique identifier for this draggable item */
  itemId: string;
  /** Custom MIME type used in dataTransfer (default: 'application/x-field-studio') */
  mimeType?: string;
  /** Extra key/value pairs set on dataTransfer */
  dragData?: Record<string, string>;
  /** Disable drag and drop on this element */
  disabled?: boolean;
  /** Called when dragging starts */
  onDragStart?: (id: string) => void;
  /** Called when dragging ends (regardless of drop outcome) */
  onDragEnd?: (id: string) => void;
  /** Called when an internal item is dropped on this target */
  onDrop?: (draggedId: string, targetId: string, position: 'before' | 'after') => void;
  /** Called when an external payload (e.g. OS files) is dropped */
  onExternalDrop?: (data: DataTransfer, targetId: string) => void;
  /** Returns a custom element to use as drag image (optional) */
  getDragImage?: (id: string) => HTMLElement | null;
  /** Currently selected item IDs for multi-select drag */
  selectedIds?: string[];
}

const DEFAULT_MIME = 'application/x-field-studio';

// Shared across all action instances so dragover targets can read the
// currently dragged item ID without needing dataTransfer.getData (which is
// restricted during dragover in some browsers).
let activeDragId: string | null = null;
let activeDragMime: string = DEFAULT_MIME;

/**
 * Calculate whether the cursor is in the top or bottom half of the element.
 * Returns 'before' for top half, 'after' for bottom half.
 */
function calcDropPosition(
  node: HTMLElement,
  clientY: number,
): 'before' | 'after' {
  const rect = node.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  return clientY < midpoint ? 'before' : 'after';
}

/**
 * Create a drag image element for multi-select. Shows a count badge over a
 * cloned representation of the dragged element.
 */
function createMultiDragImage(node: HTMLElement, count: number): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.zIndex = '99999';
  container.style.pointerEvents = 'none';
  container.style.display = 'flex';
  container.style.alignItems = 'flex-start';
  container.style.gap = '4px';

  // Clone the original node as visual base (simplified)
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = `${node.offsetWidth}px`;
  clone.style.maxHeight = '60px';
  clone.style.overflow = 'hidden';
  clone.style.opacity = '0.85';
  container.appendChild(clone);

  // Badge with count
  const badge = document.createElement('span');
  badge.textContent = String(count);
  badge.style.cssText =
    'display:inline-flex;align-items:center;justify-content:center;' +
    'width:22px;height:22px;border-radius:50%;background:#3b82f6;' +
    'color:#fff;font-size:12px;font-weight:700;flex-shrink:0;' +
    'box-shadow:0 1px 3px rgba(0,0,0,.3);margin-top:-6px;margin-left:-8px;';
  container.appendChild(badge);

  document.body.appendChild(container);
  return container;
}

export function dragDrop(node: HTMLElement, params: DragDropParams) {
  let {
    itemId,
    mimeType = DEFAULT_MIME,
    dragData,
    disabled = false,
    onDragStart,
    onDragEnd,
    onDrop,
    onExternalDrop,
    getDragImage,
    selectedIds,
  } = params;

  // Floating drag-image element created during drag (cleaned up on dragend)
  let dragImageEl: HTMLElement | null = null;

  // ---- Configure draggable ----

  function applyDraggable(): void {
    node.draggable = !disabled;
    node.setAttribute('data-drag-item', itemId);
    if (disabled) {
      node.removeAttribute('draggable');
    }
  }

  applyDraggable();

  // ---- Drag start ----

  function handleDragStart(e: DragEvent): void {
    if (disabled || !e.dataTransfer) return;

    activeDragId = itemId;
    activeDragMime = mimeType;

    // Set transfer data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(mimeType, itemId);
    e.dataTransfer.setData('text/plain', itemId);

    // Extra drag data
    if (dragData) {
      for (const [key, value] of Object.entries(dragData)) {
        e.dataTransfer.setData(key, value);
      }
    }

    // Custom drag image
    const customImage = getDragImage?.(itemId);
    if (customImage) {
      e.dataTransfer.setDragImage(customImage, 0, 0);
    } else if (selectedIds && selectedIds.length > 1 && selectedIds.includes(itemId)) {
      // Multi-select drag image
      dragImageEl = createMultiDragImage(node, selectedIds.length);
      e.dataTransfer.setDragImage(dragImageEl, 0, 0);
    }

    node.setAttribute('data-drag-state', 'dragging');
    onDragStart?.(itemId);
  }

  // ---- Drag over (this element is a potential drop target) ----

  function handleDragOver(e: DragEvent): void {
    if (disabled || !e.dataTransfer) return;

    // Only accept internal drags or file drops
    const isInternal = activeDragId !== null && activeDragMime === mimeType;
    const hasFiles = e.dataTransfer.types.includes('Files');

    if (!isInternal && !hasFiles) return;

    // Do not allow dropping on self
    if (isInternal && activeDragId === itemId) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const position = calcDropPosition(node, e.clientY);
    node.setAttribute('data-drop-position', position);
    node.setAttribute('data-drag-state', 'over');
  }

  // ---- Drag enter ----

  function handleDragEnter(e: DragEvent): void {
    if (disabled) return;
    e.preventDefault();
  }

  // ---- Drag leave ----

  function handleDragLeave(e: DragEvent): void {
    // Only clear if we actually left (not just moved to a child)
    if (!node.contains(e.relatedTarget as Node)) {
      node.removeAttribute('data-drop-position');
      node.removeAttribute('data-drag-state');
    }
  }

  // ---- Drop ----

  function handleDrop(e: DragEvent): void {
    if (disabled || !e.dataTransfer) return;
    e.preventDefault();
    e.stopPropagation();

    // Clear visual indicators
    node.removeAttribute('data-drop-position');
    node.removeAttribute('data-drag-state');

    // Check for external file drop
    if (e.dataTransfer.files.length > 0 && !activeDragId) {
      onExternalDrop?.(e.dataTransfer, itemId);
      return;
    }

    // Internal drop
    const draggedId = e.dataTransfer.getData(mimeType) || activeDragId;
    if (!draggedId || draggedId === itemId) return;

    const position = calcDropPosition(node, e.clientY);
    onDrop?.(draggedId, itemId, position);
  }

  // ---- Drag end (on the dragged element) ----

  function handleDragEnd(): void {
    // Clean up drag image
    if (dragImageEl) {
      dragImageEl.remove();
      dragImageEl = null;
    }

    node.removeAttribute('data-drag-state');
    node.removeAttribute('data-drop-position');
    activeDragId = null;

    onDragEnd?.(itemId);
  }

  // ---- Attach event listeners ----

  node.addEventListener('dragstart', handleDragStart);
  node.addEventListener('dragover', handleDragOver);
  node.addEventListener('dragenter', handleDragEnter);
  node.addEventListener('dragleave', handleDragLeave);
  node.addEventListener('drop', handleDrop);
  node.addEventListener('dragend', handleDragEnd);

  // ---- Action return ----

  return {
    update(newParams: DragDropParams) {
      itemId = newParams.itemId;
      mimeType = newParams.mimeType ?? DEFAULT_MIME;
      dragData = newParams.dragData;
      disabled = newParams.disabled ?? false;
      onDragStart = newParams.onDragStart;
      onDragEnd = newParams.onDragEnd;
      onDrop = newParams.onDrop;
      onExternalDrop = newParams.onExternalDrop;
      getDragImage = newParams.getDragImage;
      selectedIds = newParams.selectedIds;

      applyDraggable();
    },

    destroy() {
      // Clean up any lingering drag image
      if (dragImageEl) {
        dragImageEl.remove();
        dragImageEl = null;
      }

      // Reset module-level state if we were mid-drag
      if (activeDragId === itemId) {
        activeDragId = null;
      }

      node.removeEventListener('dragstart', handleDragStart);
      node.removeEventListener('dragover', handleDragOver);
      node.removeEventListener('dragenter', handleDragEnter);
      node.removeEventListener('dragleave', handleDragLeave);
      node.removeEventListener('drop', handleDrop);
      node.removeEventListener('dragend', handleDragEnd);
    },
  };
}
