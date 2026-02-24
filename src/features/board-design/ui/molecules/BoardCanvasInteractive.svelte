<!--
  BoardCanvasInteractive.svelte — Interactive board canvas with pan/zoom/rubber-band
  ===================================================================================
  Extracted from BoardView organism. Encapsulates the canvas div with all
  pan, zoom, rubber-band selection, drop, and pointer-move interaction state.
  Renders background, transform container, connection lines, board items,
  rubber-band selection box, and the zoom/count overlay via children slots.

  FSD Layer: features/board-design/ui/molecules
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { BoardItem } from '@/src/features/board-design/stores/boardVault.svelte';
  import type { BoardMultiSelectStore } from '@/src/features/board-design/stores/multiSelect.svelte';
  import { cn } from '@/src/shared/lib/cn';

  type Tool = 'select' | 'connect' | 'note' | 'text';
  type BgMode = 'grid' | 'dark' | 'light';

  interface Props {
    viewport: { x: number; y: number; zoom: number };
    bgMode: BgMode;
    activeTool: Tool;
    fieldMode?: boolean;
    cx: ContextualClassNames;
    boardItems: BoardItem[];
    selection: BoardMultiSelectStore;
    findItem: (id: string) => BoardItem | undefined;
    onMoveItem: (id: string, x: number, y: number) => void;
    onAddNote: (x: number, y: number) => void;
    onAddItemFromDrop: (resourceId: string, x: number, y: number) => void;
    onClearContext: () => void;
    /** Snippet for the transform container children (groups, connections, items, rubber-band) */
    canvasContent: Snippet<[{
      mousePosition: { x: number; y: number };
      rubberBandRect: { x: number; y: number; width: number; height: number } | null;
      handleItemPointerDown: (e: PointerEvent, itemId: string) => void;
      handleItemPointerUp: (e: PointerEvent, itemId: string) => void;
    }]>;
    /** Snippet for overlays outside the transform (zoom indicator, etc.) */
    overlays?: Snippet;
  }

  let {
    viewport = $bindable(),
    bgMode,
    activeTool,
    fieldMode = false,
    cx,
    boardItems,
    selection,
    findItem,
    onMoveItem,
    onAddNote,
    onAddItemFromDrop,
    onClearContext,
    canvasContent,
    overlays,
  }: Props = $props();

  // ── Local state ──
  let canvasEl = $state<HTMLDivElement | undefined>(undefined);
  let mousePosition = $state({ x: 0, y: 0 });
  let draggingId = $state<string | null>(null);
  let dragStart = $state({ x: 0, y: 0, itemX: 0, itemY: 0 });
  let rubberBand = $state<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0, viewX: 0, viewY: 0 });
  let connectingFrom = $state<string | null>(null);

  // ── Derived ──
  let rubberBandRect = $derived.by(() => {
    if (!rubberBand) return null;
    const x = Math.min(rubberBand.startX, rubberBand.endX);
    const y = Math.min(rubberBand.startY, rubberBand.endY);
    const w = Math.abs(rubberBand.endX - rubberBand.startX);
    const h = Math.abs(rubberBand.endY - rubberBand.startY);
    return { x, y, width: w, height: h };
  });

  let gridBgStyle = $derived.by(() => {
    const size = 20 * viewport.zoom;
    const color = fieldMode ? 'rgba(200,170,0,0.15)' : 'rgba(0,0,0,0.08)';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect fill="none" width="${size}" height="${size}"/><path d="M${size} 0L0 0 0 ${size}" fill="none" stroke="${color}" stroke-width="1"/></svg>`;
    const encoded = btoa(svg);
    return `background-image: url("data:image/svg+xml;base64,${encoded}"); background-size: ${size}px ${size}px;`;
  });

  // ── Canvas coordinate transform ──
  function toCanvas(clientX: number, clientY: number): { x: number; y: number } {
    if (!canvasEl) return { x: 0, y: 0 };
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom,
    };
  }

  // ── Wheel pan/zoom ──
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.1, Math.min(5, viewport.zoom + delta));
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const scale = newZoom / viewport.zoom;
        viewport = { x: mx - scale * (mx - viewport.x), y: my - scale * (my - viewport.y), zoom: newZoom };
      } else {
        viewport = { ...viewport, zoom: newZoom };
      }
    } else {
      viewport = { ...viewport, x: viewport.x - e.deltaX, y: viewport.y - e.deltaY };
    }
  }

  // ── Pointer handlers ──
  function handleCanvasPointerDown(e: PointerEvent) {
    if (e.button === 1 || isPanning) {
      e.preventDefault();
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY, viewX: viewport.x, viewY: viewport.y };
      return;
    }
    const target = e.target as HTMLElement;
    if (target === canvasEl || target.dataset.canvasBg === 'true') {
      if (activeTool === 'select') {
        if (!e.shiftKey) selection.clearSelection();
        const pos = toCanvas(e.clientX, e.clientY);
        rubberBand = { startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y };
      } else if (activeTool === 'note') {
        const pos = toCanvas(e.clientX, e.clientY);
        onAddNote(pos.x, pos.y);
      }
      onClearContext();
    }
  }

  function handleCanvasPointerMove(e: PointerEvent) {
    if (canvasEl) {
      mousePosition = toCanvas(e.clientX, e.clientY);
    }
    if (isPanning) {
      viewport = { ...viewport, x: panStart.viewX + (e.clientX - panStart.x), y: panStart.viewY + (e.clientY - panStart.y) };
      return;
    }
    if (rubberBand && canvasEl) {
      const pos = toCanvas(e.clientX, e.clientY);
      rubberBand = { ...rubberBand, endX: pos.x, endY: pos.y };
    }
    if (draggingId) {
      const dx = (e.clientX - dragStart.x) / viewport.zoom;
      const dy = (e.clientY - dragStart.y) / viewport.zoom;
      if (selection.isSelected(draggingId) && selection.count > 1) {
        selection.moveSelected(dx, dy, (id, pos) => onMoveItem(id, pos.x, pos.y), boardItems);
        dragStart = { ...dragStart, x: e.clientX, y: e.clientY };
        const item = findItem(draggingId);
        if (item) { dragStart.itemX = item.x; dragStart.itemY = item.y; }
      } else {
        onMoveItem(draggingId, dragStart.itemX + dx, dragStart.itemY + dy);
      }
    }
  }

  function handleCanvasPointerUp(_e: PointerEvent) {
    if (isPanning) { isPanning = false; return; }
    if (rubberBand && rubberBandRect) {
      const rect = rubberBandRect;
      const selectedIds = boardItems
        .filter(item => item.type !== 'group' && item.x < rect.x + rect.width && item.x + item.width > rect.x && item.y < rect.y + rect.height && item.y + item.height > rect.y)
        .map(item => item.id);
      if (selectedIds.length > 0) selection.selectItems(selectedIds);
      rubberBand = null;
    }
    draggingId = null;
  }

  function handleItemPointerDown(e: PointerEvent, itemId: string) {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (activeTool === 'connect') { connectingFrom = itemId; return; }
    const item = findItem(itemId);
    if (!item) return;
    draggingId = itemId;
    dragStart = { x: e.clientX, y: e.clientY, itemX: item.x, itemY: item.y };
  }

  function handleItemPointerUp(e: PointerEvent, itemId: string) {
    if (activeTool === 'connect' && connectingFrom) {
      // Handled externally via onCompleteConnection
      connectingFrom = null;
      return;
    }
    if (draggingId === itemId) {
      const dx = Math.abs(e.clientX - dragStart.x);
      const dy = Math.abs(e.clientY - dragStart.y);
      if (dx < 3 && dy < 3) {
        selection.toggleItem(itemId, e.shiftKey);
      }
    }
    draggingId = null;
  }

  function handleBoardDrop(e: DragEvent) {
    e.preventDefault();
    if (!canvasEl) return;
    const pos = toCanvas(e.clientX, e.clientY);
    const data = e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('application/json');
    if (data) onAddItemFromDrop(data, pos.x, pos.y);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={canvasEl}
  class="h-full w-full relative select-none"
  style="cursor: {isPanning ? 'grabbing' : activeTool === 'connect' ? 'crosshair' : activeTool === 'note' ? 'cell' : 'default'};"
  role="application"
  aria-label="Board design canvas"
  onwheel={handleWheel}
  onpointerdown={handleCanvasPointerDown}
  onpointermove={handleCanvasPointerMove}
  onpointerup={handleCanvasPointerUp}
  ondrop={handleBoardDrop}
  ondragover={(e) => e.preventDefault()}
>
  <!-- Background layer -->
  {#if bgMode === 'grid'}
    <div class={cn('absolute inset-0', cx.pageBg || 'bg-white')} style={gridBgStyle} data-canvas-bg="true"></div>
  {:else if bgMode === 'dark'}
    <div class="absolute inset-0 bg-gray-900" data-canvas-bg="true"></div>
  {:else}
    <div class="absolute inset-0 bg-white" data-canvas-bg="true"></div>
  {/if}

  <!-- Transform container for pan/zoom -->
  <div
    class="absolute origin-top-left"
    style="transform: translate({viewport.x}px, {viewport.y}px) scale({viewport.zoom}); will-change: transform;"
  >
    {@render canvasContent({ mousePosition, rubberBandRect, handleItemPointerDown, handleItemPointerUp })}
  </div>

  {@render overlays?.()}
</div>
