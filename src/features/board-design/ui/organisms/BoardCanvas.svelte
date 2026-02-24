<!--
  BoardCanvas.svelte -- Main board canvas with pan/zoom/drag/connect (Organism)
  =============================================================================
  React source: src/features/board-design/ui/organisms/BoardCanvas.tsx (389L)

  PURPOSE:
  Orchestrates the full board canvas surface including item rendering,
  connection rendering, drag interactions, rubber-band selection, alignment
  guides, resize, minimap, and zoom controls.

  ARCHITECTURE NOTES:
  - React hooks -> Svelte equivalents (already migrated):
      useCanvasDrag      -> use:canvasDrag action (../../actions/canvasDrag.ts)
      useRubberBandSelect -> use:rubberBandSelect action (../../actions/rubberBandSelect.ts)
      useAlignmentGuides  -> pure function (../../lib/alignmentGuides.ts)
  - forwardRef pattern -> bind:this={canvasEl} + optional export
  - CSS transform for pan/zoom: translate(x, y) scale(zoom) on inner container
  - Rule 7.C: Board uses native SVG, not ReactFlow
  - Rule 2.D: bgMode classes in static map (grid/dark/light)
  - Rule 3.E: $effect for keyboard event listener cleanup

  STATE MAPPING (React -> Svelte 5):
  - isResizing (useState)    -> $state(false)
  - resizeRef (useRef)       -> plain let variable (not reactive, mutation only)
  - rubberBand.isSelecting   -> derived from rubberBandSelect action
  - isDragging               -> exposed from canvasDrag action
  - selectedConnectionId     -> exposed from canvasDrag action
  - guides (useAlignmentGuides) -> $state<AlignmentGuide[]>([])
  - viewportRect (useMemo)   -> $derived from viewport

  COMPOSED CHILDREN:
  - CanvasGrid atom          (background grid pattern)
  - ConnectionLayer molecule (SVG connection lines)
  - BoardNodeLayer molecule  (all board item nodes)
  - AlignmentGuideLine atom  (snap alignment visualization)
  - SelectionBox atom        (rubber-band rect visualization) -- or inline div
  - MiniMap atom             (overview minimap at bottom-left)
  - BoardControls molecule   (zoom controls at bottom-right)

  INTERACTION FLOW:
  1. Canvas container receives pointer events
  2. use:canvasDrag action handles item drag + connection selection
  3. Resize tracked via local $state (resizeRef pattern)
  4. Rubber-band via use:rubberBandSelect action
  5. Alignment guides computed during drag via calculateAlignmentGuides()
  6. Mouse events delegate to appropriate sub-handler based on activeTool
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFItem } from '@/src/shared/types';
  import type { BoardItem, Connection, ConnectionType } from '../../model';
  import type { AlignmentGuide } from '../../lib/alignmentGuides';
  import { calculateAlignmentGuides } from '../../lib/alignmentGuides';
  import { canvasDrag, screenToCanvas } from '../../actions/canvasDrag';
  import { rubberBandSelect, type RubberBandRect } from '../../actions/rubberBandSelect';
  import CanvasGrid from '../atoms/CanvasGrid.svelte';
  import MiniMap from '../atoms/MiniMap.svelte';
  import AlignmentGuideLine from '../atoms/AlignmentGuideLine.svelte';
  import BoardNodeLayer from '../molecules/BoardNodeLayer.svelte';
  import ConnectionLayer from '../molecules/ConnectionLayer.svelte';
  import BoardControls from '../molecules/BoardControls.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    items: BoardItem[];
    connections: Connection[];
    selectedItemId: string | null;
    selectedIds?: Set<string>;
    connectingFrom: string | null;
    activeTool: 'select' | 'connect' | 'note' | 'text';
    viewport: { x: number; y: number; zoom: number };
    onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
    onSelectItem: (id: string | null) => void;
    onToggleSelectItem?: (id: string, shiftKey: boolean) => void;
    onSelectItems?: (ids: string[]) => void;
    onMoveItem: (id: string, position: { x: number; y: number }) => void;
    onMoveSelected?: (dx: number, dy: number) => void;
    onResizeItem?: (id: string, size: { w: number; h: number }) => void;
    onStartConnection: (fromId: string) => void;
    onCompleteConnection: (toId: string, type?: ConnectionType) => void;
    onAddItem: (resource: IIIFItem, position: { x: number; y: number }) => void;
    onAddNote?: (position: { x: number; y: number }) => void;
    onDoubleClickItem?: (id: string) => void;
    onDoubleClickConnection?: (id: string) => void;
    onContextMenuItem?: (e: MouseEvent, id: string) => void;
    root: IIIFItem | null;
    bgMode?: 'grid' | 'dark' | 'light';
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    items,
    connections,
    selectedItemId,
    selectedIds,
    connectingFrom,
    activeTool,
    viewport,
    onViewportChange,
    onSelectItem,
    onToggleSelectItem,
    onSelectItems,
    onMoveItem,
    onMoveSelected,
    onResizeItem,
    onStartConnection,
    onCompleteConnection,
    onAddItem,
    onAddNote,
    onDoubleClickItem,
    onDoubleClickConnection,
    onContextMenuItem,
    root,
    bgMode = 'grid',
    cx,
    fieldMode,
  }: Props = $props();

  // ── DOM refs ──
  let canvasEl = $state<HTMLDivElement | undefined>(undefined);
  let containerWidth = $state(800);
  let containerHeight = $state(600);

  // ── Local State ──
  let isResizing = $state(false);

  // Non-reactive resize tracking (mutated during resize, not read in template)
  let resizeData: {
    itemId: string;
    direction: string;
    startMouseX: number;
    startMouseY: number;
    startW: number;
    startH: number;
    startItemX: number;
    startItemY: number;
  } | null = null;

  // Alignment guides (computed during drag)
  let guides = $state<AlignmentGuide[]>([]);

  // Rubber-band selection state (updated by action callbacks)
  let rubberBandRect = $state<RubberBandRect | null>(null);
  let isRubberBanding = $state(false);

  // Track connection selection from canvasDrag action
  let selectedConnectionId = $state<string | null>(null);

  // ── Derived ──
  // Viewport rect for minimap (computed from viewport + container dimensions)
  let viewportRect = $derived.by(() => ({
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: containerWidth / viewport.zoom,
    height: containerHeight / viewport.zoom,
  }));

  // Static class map for background modes (Rule 2.D)
  const BG_MODE_CLASSES = {
    grid: '',      // CanvasGrid atom handles this
    dark: 'bg-nb-black/95',
    light: 'bg-nb-cream/95',
  } as const;

  // ── Container resize observation ──
  $effect(() => {
    if (!canvasEl) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width;
        containerHeight = entry.contentRect.height;
      }
    });
    observer.observe(canvasEl);
    return () => observer.disconnect();
  });

  // ── Coordinate Transform ──
  function toCanvas(clientX: number, clientY: number): { x: number; y: number } {
    if (!canvasEl) return { x: 0, y: 0 };
    const rect = canvasEl.getBoundingClientRect();
    return screenToCanvas(clientX, clientY, rect, viewport.zoom, viewport.x, viewport.y);
  }

  // ── Resize Logic ──
  function handleResizeStart(
    itemId: string,
    direction: string,
    startPos: { x: number; y: number },
    startSize: { w: number; h: number },
  ) {
    const item = items.find(i => i.id === itemId);
    resizeData = {
      itemId,
      direction,
      startMouseX: startPos.x,
      startMouseY: startPos.y,
      startW: startSize.w,
      startH: startSize.h,
      startItemX: item?.x ?? 0,
      startItemY: item?.y ?? 0,
    };
    isResizing = true;
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }

  function handleResizeMove(e: MouseEvent) {
    if (!resizeData || !onResizeItem) return;

    const canvasPos = toCanvas(e.clientX, e.clientY);
    const dx = canvasPos.x - resizeData.startMouseX;
    const dy = canvasPos.y - resizeData.startMouseY;
    const dir = resizeData.direction;

    let newW = resizeData.startW;
    let newH = resizeData.startH;
    let newX = resizeData.startItemX;
    let newY = resizeData.startItemY;

    // Horizontal resize
    if (dir.includes('e')) {
      newW = Math.max(80, resizeData.startW + dx);
    }
    if (dir.includes('w')) {
      const widthDelta = Math.min(dx, resizeData.startW - 80);
      newW = resizeData.startW - widthDelta;
      newX = resizeData.startItemX + widthDelta;
    }

    // Vertical resize
    if (dir.includes('s')) {
      newH = Math.max(60, resizeData.startH + dy);
    }
    if (dir.includes('n')) {
      const heightDelta = Math.min(dy, resizeData.startH - 60);
      newH = resizeData.startH - heightDelta;
      newY = resizeData.startItemY + heightDelta;
    }

    onResizeItem(resizeData.itemId, { w: newW, h: newH });

    // Move item if resizing from n/w/nw/ne/sw corners
    if (dir.includes('n') || dir.includes('w')) {
      onMoveItem(resizeData.itemId, { x: newX, y: newY });
    }
  }

  function handleResizeEnd() {
    resizeData = null;
    isResizing = false;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }

  // ── Canvas Event Handlers ──
  function handleCanvasClick(e: MouseEvent) {
    // Only handle clicks on the canvas background itself
    const target = e.target as HTMLElement;
    if (target !== canvasEl && !target.classList.contains('board-canvas-content')) return;

    if (activeTool === 'note' && onAddNote) {
      const pos = toCanvas(e.clientX, e.clientY);
      onAddNote(pos);
    } else if (activeTool === 'select') {
      onSelectItem(null);
      selectedConnectionId = null;
    }
  }

  // ── Node Selection in Connect Mode ──
  function handleNodeSelect(id: string) {
    if (activeTool === 'connect' && connectingFrom && id !== connectingFrom) {
      onCompleteConnection(id);
    } else if (activeTool === 'connect' && !connectingFrom) {
      onStartConnection(id);
    } else {
      onSelectItem(id);
    }
  }

  function handleNodeClick(id: string) {
    handleNodeSelect(id);
  }

  // ── Connect Start ──
  function handleConnectStart(id: string) {
    onStartConnection(id);
  }

  // ── Drag Start (from BoardNodeLayer) ──
  function handleDragStart(id: string, _offset: { x: number; y: number }) {
    // The canvasDrag action handles the actual drag movement.
    // This callback is for visual feedback or other side effects.
    onSelectItem(id);
  }

  // ── MiniMap Pan ──
  function handleMiniMapPan(x: number, y: number) {
    onViewportChange({
      x: -x * viewport.zoom + containerWidth / 2,
      y: -y * viewport.zoom + containerHeight / 2,
      zoom: viewport.zoom,
    });
  }

  // ── Wheel zoom ──
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = Math.min(3, Math.max(0.1, viewport.zoom * zoomFactor));

    // Zoom toward cursor position
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
      const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);

      onViewportChange({ x: newX, y: newY, zoom: newZoom });
    } else {
      onViewportChange({ ...viewport, zoom: newZoom });
    }
  }

  // ── Reactive canvasDrag params ──
  let canvasDragParams = $derived({
    zoom: viewport.zoom,
    panX: viewport.x,
    panY: viewport.y,
    onSelectItem,
    onMoveItem: (id: string, x: number, y: number) => {
      onMoveItem(id, { x, y });

      // Compute alignment guides during drag
      const dragItem = items.find(i => i.id === id);
      if (dragItem) {
        const otherItems = items.filter(i => i.id !== id).map(i => ({
          x: i.x, y: i.y, width: i.w, height: i.h,
        }));
        const result = calculateAlignmentGuides(
          { x, y, width: dragItem.w, height: dragItem.h },
          otherItems,
        );
        guides = result.guides;
      }
    },
    onSelectConnection: (id: string | null) => {
      selectedConnectionId = id;
    },
    onCanvasClick: (x: number, y: number) => {
      if (activeTool === 'note' && onAddNote) {
        onAddNote({ x, y });
      }
    },
    selectedIds: selectedIds ? Array.from(selectedIds) : [],
  });

  // ── Reactive rubberBandSelect params ──
  let rubberBandParams = $derived({
    modifier: 'none' as const,
    onStart: () => {
      isRubberBanding = true;
      rubberBandRect = null;
    },
    onUpdate: (rect: RubberBandRect) => {
      rubberBandRect = rect;
    },
    onComplete: (rect: RubberBandRect) => {
      isRubberBanding = false;
      rubberBandRect = null;

      // Find items within the rubber-band selection rectangle
      if (onSelectItems && canvasEl) {
        const containerRect = canvasEl.getBoundingClientRect();
        // Convert screen rect to canvas coords
        const canvasLeft = (rect.x) / viewport.zoom - viewport.x / viewport.zoom;
        const canvasTop = (rect.y) / viewport.zoom - viewport.y / viewport.zoom;
        const canvasWidth = rect.width / viewport.zoom;
        const canvasHeight = rect.height / viewport.zoom;

        const selectedItemIds = items
          .filter(item => {
            const itemRight = item.x + item.w;
            const itemBottom = item.y + item.h;
            const selRight = canvasLeft + canvasWidth;
            const selBottom = canvasTop + canvasHeight;
            return (
              item.x < selRight &&
              itemRight > canvasLeft &&
              item.y < selBottom &&
              itemBottom > canvasTop
            );
          })
          .map(item => item.id);

        if (selectedItemIds.length > 0) {
          onSelectItems(selectedItemIds);
        }
      }
    },
  });

  // ── Cleanup guides when drag ends ──
  $effect(() => {
    // Clear guides when no item is selected (drag ended)
    if (!selectedItemId) {
      guides = [];
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={canvasEl}
  use:canvasDrag={canvasDragParams}
  use:rubberBandSelect={rubberBandParams}
  class={cn(
    'flex-1 relative overflow-hidden',
    BG_MODE_CLASSES[bgMode],
  )}
  style:cursor={activeTool === 'select' ? 'default' : 'crosshair'}
  onclick={handleCanvasClick}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onSelectItem(null); selectedConnectionId = null; } }}
  onwheel={handleWheel}
  role="application"
  aria-label="Board canvas"
>
  <!-- Canvas content with pan/zoom transform -->
  <div
    class="absolute inset-0 board-canvas-content"
    style="transform: translate({viewport.x}px, {viewport.y}px) scale({viewport.zoom}); transform-origin: 0 0;"
  >
    <!-- Background grid (conditional on bgMode) -->
    {#if bgMode === 'grid'}
      <CanvasGrid {cx} />
    {/if}

    <!-- Connection lines (SVG layer) -->
    <ConnectionLayer
      {connections}
      {items}
      {selectedConnectionId}
      onSelectConnection={(id) => { selectedConnectionId = id; }}
      {onDoubleClickConnection}
      {cx}
      {fieldMode}
    />

    <!-- Board nodes -->
    <BoardNodeLayer
      {items}
      {selectedItemId}
      {selectedIds}
      {connectingFrom}
      onSelectItem={handleNodeClick}
      onDragStart={handleDragStart}
      onConnectStart={handleConnectStart}
      onResizeStart={onResizeItem ? handleResizeStart : undefined}
      {onDoubleClickItem}
      {onContextMenuItem}
      {cx}
      {fieldMode}
    />

    <!-- Alignment guides (drawn during drag) -->
    <AlignmentGuideLine {guides} canvasSize={{ width: 10000, height: 10000 }} />

    <!-- Rubber-band selection box -->
    {#if isRubberBanding && rubberBandRect}
      <div
        class="absolute border-2 border-dashed pointer-events-none"
        style:left="{rubberBandRect.x}px"
        style:top="{rubberBandRect.y}px"
        style:width="{rubberBandRect.width}px"
        style:height="{rubberBandRect.height}px"
        style:border-color={fieldMode ? '#facc15' : '#3b82f6'}
        style:background-color={fieldMode ? 'rgba(250, 204, 21, 0.1)' : 'rgba(59, 130, 246, 0.1)'}
        style:z-index="999"
        aria-label="Selection area"
      ></div>
    {/if}
  </div>

  <!-- MiniMap (bottom-left, outside transform) -->
  <MiniMap
    {items}
    viewportRect={viewportRect}
    onViewportChange={handleMiniMapPan}
    {cx}
    {fieldMode}
  />

  <!-- Zoom controls (bottom-right, outside transform) -->
  <BoardControls
    {viewport}
    {onViewportChange}
    {cx}
    {fieldMode}
  />
</div>
