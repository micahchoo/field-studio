/**
 * Canvas Drag -- DOM behavior action (Category 3)
 *
 * Replaces useCanvasDrag React hook.
 * Architecture doc S4 Cat 3: Svelte action (use:canvasDrag)
 *
 * Manages canvas dragging, viewport coordinate transformation,
 * and mouse interactions for the board canvas.
 *
 * Usage in Svelte component:
 *   <div use:canvasDrag={{ zoom, panX, panY, onMoveItem, onSelectItem }}>
 *     <div data-board-item="item1">...</div>
 *     <svg data-connection="conn1">...</svg>
 *   </div>
 */

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface CanvasDragParams {
  /** Current zoom level (1 = 100%) */
  zoom: number;
  /** Current pan offset X (canvas coordinates) */
  panX: number;
  /** Current pan offset Y (canvas coordinates) */
  panY: number;
  /** Called when an item is clicked/selected (null to deselect) */
  onSelectItem?: (id: string | null) => void;
  /** Called while dragging a single item */
  onMoveItem?: (id: string, x: number, y: number) => void;
  /** Called while dragging multiple selected items */
  onMoveItems?: (moves: Array<{ id: string; x: number; y: number }>) => void;
  /** Called when a connection element is clicked */
  onSelectConnection?: (id: string | null) => void;
  /** Called when clicking empty canvas area */
  onCanvasClick?: (x: number, y: number) => void;
  /** Currently selected item IDs (for multi-drag) */
  selectedIds?: string[];
  /** Optional grid-snap function applied to final coordinates */
  snapToGrid?: (value: number) => number;
}

// ------------------------------------------------------------------
// Coordinate transform
// ------------------------------------------------------------------

/**
 * Convert screen (client) coordinates to canvas coordinates,
 * accounting for the container offset, current zoom, and pan.
 *
 * canvasX = (screenX - containerLeft) / zoom - panX
 * canvasY = (screenY - containerTop)  / zoom - panY
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  zoom: number,
  panX: number,
  panY: number,
): { x: number; y: number } {
  return {
    x: (screenX - containerRect.left) / zoom - panX,
    y: (screenY - containerRect.top) / zoom - panY,
  };
}

// ------------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------------

/** Walk up from target to find the nearest board-item element within container */
function findBoardItem(
  target: EventTarget | null,
  container: HTMLElement,
): HTMLElement | null {
  let el = target as HTMLElement | null;
  while (el && el !== container) {
    if (el.dataset && el.dataset.boardItem != null) return el;
    el = el.parentElement;
  }
  return null;
}

/** Walk up from target to find the nearest connection element within container */
function findConnection(
  target: EventTarget | null,
  container: HTMLElement,
): HTMLElement | null {
  let el = target as HTMLElement | null;
  while (el && el !== container) {
    if (el.dataset && el.dataset.connection != null) return el;
    el = el.parentElement;
  }
  return null;
}

// ------------------------------------------------------------------
// Svelte action
// ------------------------------------------------------------------

/**
 * Svelte action: attach to the board canvas container.
 *
 * Pseudocode:
 *   1. On mousedown on [data-board-item]: start item drag
 *      - record startCanvasPos for the dragged item
 *      - record initial mouse position in canvas coords
 *   2. On mousemove (while dragging):
 *      - compute delta in canvas coords
 *      - if multi-select: call onMoveItems for all selectedIds
 *      - else: call onMoveItem for the single dragged item
 *      - apply snapToGrid if provided
 *   3. On mouseup: end drag, finalize positions
 *   4. On click on canvas (not an item or connection): call onCanvasClick, deselect
 *   5. On click on [data-connection]: call onSelectConnection
 *   6. Multi-select drag: compute delta and apply to all selectedIds
 *   7. Apply snapToGrid to final coordinate values if provided
 */
export function canvasDrag(node: HTMLElement, params: CanvasDragParams) {
  // Mutable params -- updated via the update() return
  let {
    zoom,
    panX,
    panY,
    onSelectItem,
    onMoveItem,
    onMoveItems,
    onSelectConnection,
    onCanvasClick,
    selectedIds = [],
    snapToGrid,
  } = params;

  // Drag state
  let isDragging = false;
  let dragItemId: string | null = null;
  let dragStartCanvasX = 0;
  let dragStartCanvasY = 0;
  let itemStartX = 0;
  let itemStartY = 0;
  /** Map of item ID -> starting position, populated at drag start for multi-select */
  let multiDragStarts: Map<string, { x: number; y: number }> = new Map();
  /** Whether the mouse actually moved during the press (distinguishes click from drag) */
  let didMove = false;
  /** Minimum pixel movement before we consider it a drag (prevents accidental drags) */
  const DRAG_THRESHOLD = 3;
  let thresholdMet = false;

  // ------------------------------------------------------------------
  // Mouse handlers
  // ------------------------------------------------------------------

  function handleMouseDown(e: MouseEvent) {
    // Only respond to primary button
    if (e.button !== 0) return;

    const containerRect = node.getBoundingClientRect();

    // Check if mousedown is on a board item
    const itemEl = findBoardItem(e.target, node);
    if (itemEl) {
      const itemId = itemEl.dataset.boardItem!;
      isDragging = true;
      dragItemId = itemId;
      didMove = false;
      thresholdMet = false;

      // Record the starting mouse position in canvas coords
      const canvasPos = screenToCanvas(e.clientX, e.clientY, containerRect, zoom, panX, panY);
      dragStartCanvasX = canvasPos.x;
      dragStartCanvasY = canvasPos.y;

      // Record starting item position from the element's data attributes
      itemStartX = parseFloat(itemEl.dataset.x ?? '0');
      itemStartY = parseFloat(itemEl.dataset.y ?? '0');

      // If multi-select and this item is in the selection, prepare multi-drag
      multiDragStarts.clear();
      if (selectedIds.includes(itemId) && selectedIds.length > 1) {
        // Gather start positions of all selected items from their DOM elements
        for (const sid of selectedIds) {
          const sel = node.querySelector<HTMLElement>(`[data-board-item="${sid}"]`);
          if (sel) {
            multiDragStarts.set(sid, {
              x: parseFloat(sel.dataset.x ?? '0'),
              y: parseFloat(sel.dataset.y ?? '0'),
            });
          }
        }
      }

      // Select this item (fires immediately on mousedown so UI highlights)
      onSelectItem?.(itemId);

      e.preventDefault();
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return;
    }

    // Check if mousedown is on a connection
    const connEl = findConnection(e.target, node);
    if (connEl) {
      const connId = connEl.dataset.connection!;
      onSelectConnection?.(connId);
      e.preventDefault();
      return;
    }

    // Click on empty canvas -- prepare for potential canvas click
    isDragging = false;
    dragItemId = null;
    didMove = false;

    // We handle the "canvas click" on mouseup so we can distinguish drag from click
    window.addEventListener('mouseup', handleCanvasClickUp, { once: true });
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !dragItemId) return;

    const containerRect = node.getBoundingClientRect();
    const canvasPos = screenToCanvas(e.clientX, e.clientY, containerRect, zoom, panX, panY);
    const dx = canvasPos.x - dragStartCanvasX;
    const dy = canvasPos.y - dragStartCanvasY;

    // Check threshold before starting the actual drag movement
    if (!thresholdMet) {
      const screenDx = Math.abs(e.movementX);
      const screenDy = Math.abs(e.movementY);
      if (screenDx < DRAG_THRESHOLD && screenDy < DRAG_THRESHOLD) return;
      thresholdMet = true;
    }

    didMove = true;
    e.preventDefault();

    // Multi-select drag: move all selected items by the same delta
    if (multiDragStarts.size > 1) {
      const moves: Array<{ id: string; x: number; y: number }> = [];
      for (const [id, start] of multiDragStarts) {
        const newX = snap(start.x + dx);
        const newY = snap(start.y + dy);
        moves.push({ id, x: newX, y: newY });
      }
      onMoveItems?.(moves);
    } else {
      // Single item drag
      const newX = snap(itemStartX + dx);
      const newY = snap(itemStartY + dy);
      onMoveItem?.(dragItemId, newX, newY);
    }
  }

  function handleMouseUp(_e: MouseEvent) {
    isDragging = false;
    dragItemId = null;
    multiDragStarts.clear();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  /**
   * Handle mouseup on empty canvas (registered as a one-shot listener).
   * If the mouse didn't move, treat it as a canvas click / deselect.
   */
  function handleCanvasClickUp(e: MouseEvent) {
    if (!didMove) {
      const containerRect = node.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, containerRect, zoom, panX, panY);

      // Check if mouseup is on a board item or connection (click, not drag)
      const itemEl = findBoardItem(e.target, node);
      const connEl = findConnection(e.target, node);

      if (!itemEl && !connEl) {
        // Clicked on empty canvas
        onSelectItem?.(null);
        onSelectConnection?.(null);
        onCanvasClick?.(canvasPos.x, canvasPos.y);
      }
    }
  }

  /** Apply snap-to-grid if a snap function is provided */
  function snap(value: number): number {
    return snapToGrid ? snapToGrid(value) : value;
  }

  // ------------------------------------------------------------------
  // Attach listener
  // ------------------------------------------------------------------

  node.addEventListener('mousedown', handleMouseDown);

  // ------------------------------------------------------------------
  // Svelte action return: update and destroy
  // ------------------------------------------------------------------

  return {
    update(newParams: CanvasDragParams) {
      zoom = newParams.zoom;
      panX = newParams.panX;
      panY = newParams.panY;
      onSelectItem = newParams.onSelectItem;
      onMoveItem = newParams.onMoveItem;
      onMoveItems = newParams.onMoveItems;
      onSelectConnection = newParams.onSelectConnection;
      onCanvasClick = newParams.onCanvasClick;
      selectedIds = newParams.selectedIds ?? [];
      snapToGrid = newParams.snapToGrid;
    },
    destroy() {
      node.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    },
  };
}
