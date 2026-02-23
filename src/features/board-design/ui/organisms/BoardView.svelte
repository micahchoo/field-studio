<!--
  BoardView.svelte — Board Design Canvas
  ========================================
  Feature organism: Visual board for item placement + connections.
  Uses PaneLayout with variant="canvas" (overflow-hidden body).
  Board canvas is a custom implementation (no external lib).
  Uses Svelte actions for drag, pan-zoom gestures.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IIIFItem } from '@/src/shared/types';
  import PaneLayout from '@/src/shared/ui/layout/composites/PaneLayout.svelte';
  import BoardHeader from './BoardHeader.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import { BoardVaultStore } from '@/src/features/board-design/stores/boardVault.svelte';
  import type { BoardItem, BoardConnection, BoardState } from '@/src/features/board-design/stores/boardVault.svelte';
  import { BoardMultiSelectStore } from '@/src/features/board-design/stores/multiSelect.svelte';
  import { PresentationModeStore } from '@/src/features/board-design/stores/presentationMode.svelte';

  // @migration: ConnectionLine, ConnectionEditPanel, PresentationOverlay, AlignmentGuideLine
  // These sub-components would be imported from board-design atoms/molecules once implemented.
  // import ConnectionLine from '../atoms/ConnectionLine.svelte';
  // import AlignmentGuideLine from '../atoms/AlignmentGuideLine.svelte';
  // import ConnectionEditPanel from '../molecules/ConnectionEditPanel.svelte';
  // import PresentationOverlay from '../organisms/PresentationOverlay.svelte';

  // ── Types ──
  type Tool = 'select' | 'connect' | 'note' | 'text';
  type BgMode = 'grid' | 'dark' | 'light';
  type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';

  interface GroupOverlay {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }

  interface Props {
    root: IIIFItem;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    t: (key: string) => string;
    isAdvanced?: boolean;
    activeTool?: Tool;
    onToolChange?: (tool: Tool) => void;
    onSelectId?: (id: string) => void;
    onSelect?: (item: IIIFItem) => void;
    onSaveBoard?: (state: BoardState) => void;
    onSwitchView?: (mode: string) => void;
    initialState?: BoardState;
  }

  let {
    root,
    cx,
    fieldMode = false,
    t,
    isAdvanced = false,
    activeTool = $bindable('select'),
    onToolChange,
    onSelectId,
    onSelect,
    onSaveBoard,
    onSwitchView,
    initialState,
  }: Props = $props();

  // ── Feature Stores ──
  const board = new BoardVaultStore({
    snapEnabled: true,
    gridSize: 8,
    onSave: (state) => onSaveBoard?.(state),
  });
  const selection = new BoardMultiSelectStore();
  const presentation = new PresentationModeStore();

  // ── Local State ──
  let viewport = $state({ x: 0, y: 0, zoom: 1 });
  let bgMode = $state<BgMode>('grid');
  let snapEnabled = $state(true);
  let connectingFrom = $state<string | null>(null);
  let contextMenu = $state<{ x: number; y: number; itemId: string } | null>(null);
  let editingConnection = $state<string | null>(null);
  let canvasEl = $state<HTMLDivElement | undefined>(undefined);
  let mousePosition = $state({ x: 0, y: 0 });

  // Drag state for items
  let draggingId = $state<string | null>(null);
  let dragStart = $state({ x: 0, y: 0, itemX: 0, itemY: 0 });

  // Rubber-band selection state
  let rubberBand = $state<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0, viewX: 0, viewY: 0 });

  // ── Derived ──
  let boardItems = $derived(board.items);
  let boardConnections = $derived(board.connections);
  let hasSelection = $derived(selection.hasSelection);
  let selectionCount = $derived(selection.count);

  let groupOverlays = $derived.by((): GroupOverlay[] => {
    const groups = boardItems.filter(item => item.type === 'group');
    return groups.map(group => {
      const members = board.getGroupMembers(group.id);
      if (members.length === 0) {
        return { id: group.id, label: group.label ?? 'Group', x: group.x, y: group.y, width: group.width, height: group.height };
      }
      const padding = 20;
      const minX = Math.min(group.x, ...members.map(m => m.x)) - padding;
      const minY = Math.min(group.y, ...members.map(m => m.y)) - padding;
      const maxX = Math.max(group.x + group.width, ...members.map(m => m.x + m.width)) + padding;
      const maxY = Math.max(group.y + group.height, ...members.map(m => m.y + m.height)) + padding;
      return { id: group.id, label: group.label ?? 'Group', x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    });
  });

  let rubberBandRect = $derived.by(() => {
    if (!rubberBand) return null;
    const x = Math.min(rubberBand.startX, rubberBand.endX);
    const y = Math.min(rubberBand.startY, rubberBand.endY);
    const w = Math.abs(rubberBand.endX - rubberBand.startX);
    const h = Math.abs(rubberBand.endY - rubberBand.startY);
    return { x, y, width: w, height: h };
  });

  // Grid background SVG pattern as inline data URI
  let gridBgStyle = $derived.by(() => {
    const size = 20 * viewport.zoom;
    const color = fieldMode ? 'rgba(200,170,0,0.15)' : 'rgba(0,0,0,0.08)';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect fill="none" width="${size}" height="${size}"/><path d="M${size} 0L0 0 0 ${size}" fill="none" stroke="${color}" stroke-width="1"/></svg>`;
    const encoded = btoa(svg);
    return `background-image: url("data:image/svg+xml;base64,${encoded}"); background-size: ${size}px ${size}px;`;
  });

  // ── Lifecycle ──
  onMount(() => {
    if (initialState) {
      board.loadBoard(initialState);
    }
  });

  onDestroy(() => {
    board.destroy();
    presentation.destroy();
  });

  // ── Keyboard shortcuts ──
  $effect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // If presentation mode is active, delegate to presentation handler
      if (presentation.isActive) {
        if (presentation.handleKeyboard(e)) {
          e.preventDefault();
          return;
        }
      }

      // Ignore shortcuts when typing in input fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            activeTool = 'select';
            onToolChange?.('select');
            e.preventDefault();
            return;
          case 'c':
            if (!e.shiftKey) {
              activeTool = 'connect';
              onToolChange?.('connect');
              e.preventDefault();
            }
            return;
          case 't':
            activeTool = 'text';
            onToolChange?.('text');
            e.preventDefault();
            return;
          case 'n':
            activeTool = 'note';
            onToolChange?.('note');
            e.preventDefault();
            return;
          case 'g':
            if (selection.count > 1) {
              handleCreateGroup('Group');
              e.preventDefault();
            }
            return;
          case 'delete':
          case 'backspace':
            handleDeleteSelected();
            e.preventDefault();
            return;
          case 'escape':
            connectingFrom = null;
            contextMenu = null;
            editingConnection = null;
            selection.clearSelection();
            return;
        }
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            if (e.shiftKey) {
              board.redo();
            } else {
              board.undo();
            }
            e.preventDefault();
            return;
          case 'y':
            board.redo();
            e.preventDefault();
            return;
          case 'a':
            selection.selectAll(boardItems);
            e.preventDefault();
            return;
          case 's':
            handleSave();
            e.preventDefault();
            return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // ── Event Handlers ──

  function handleToolChange(tool: Tool) {
    activeTool = tool;
    onToolChange?.(tool);
  }

  function handleSelectItem(id: string) {
    selection.clearSelection();
    selection.toggleItem(id, false);
    onSelectId?.(id);

    const item = board.findItem(id);
    if (item?.resourceId && onSelect) {
      // @migration: would resolve IIIFItem from vault by resourceId
      // onSelect(resolveItem(item.resourceId));
    }
  }

  function handleToggleSelectItem(id: string, shiftKey: boolean) {
    selection.toggleItem(id, shiftKey);
    onSelectId?.(id);
  }

  function handleStartConnection(fromId: string) {
    connectingFrom = fromId;
  }

  function handleCompleteConnection(toId: string) {
    if (connectingFrom && connectingFrom !== toId) {
      board.addConnection({
        fromId: connectingFrom,
        toId,
        type: 'sequence',
      });
    }
    connectingFrom = null;
  }

  function handleMoveItem(id: string, pos: { x: number; y: number }) {
    board.moveItem(id, pos.x, pos.y);
  }

  function handleDeleteSelected() {
    selection.deleteSelected((id) => board.removeItem(id));
  }

  function handleSave() {
    board.save();
  }

  function handleDoubleClickItem(id: string) {
    const item = board.findItem(id);
    if (item?.resourceId) {
      onSwitchView?.('viewer');
    }
  }

  function handleContextMenu(e: MouseEvent, itemId: string) {
    e.preventDefault();
    contextMenu = { x: e.clientX, y: e.clientY, itemId };
    selection.toggleItem(itemId, false);
  }

  function handleCreateGroup(label: string) {
    const ids = Array.from(selection.selectedIds);
    if (ids.length < 2) return;
    board.createGroup(label, ids);
    selection.clearSelection();
  }

  function handleAlign(type: AlignType) {
    const ids = Array.from(selection.selectedIds);
    if (ids.length < 2) return;

    const items = ids.map(id => board.findItem(id)).filter((i): i is BoardItem => i !== undefined);
    if (items.length < 2) return;

    switch (type) {
      case 'left': {
        const minX = Math.min(...items.map(i => i.x));
        items.forEach(i => board.moveItem(i.id, minX, i.y));
        break;
      }
      case 'right': {
        const maxRight = Math.max(...items.map(i => i.x + i.width));
        items.forEach(i => board.moveItem(i.id, maxRight - i.width, i.y));
        break;
      }
      case 'center-h': {
        const avgX = items.reduce((sum, i) => sum + i.x + i.width / 2, 0) / items.length;
        items.forEach(i => board.moveItem(i.id, avgX - i.width / 2, i.y));
        break;
      }
      case 'top': {
        const minY = Math.min(...items.map(i => i.y));
        items.forEach(i => board.moveItem(i.id, i.x, minY));
        break;
      }
      case 'bottom': {
        const maxBottom = Math.max(...items.map(i => i.y + i.height));
        items.forEach(i => board.moveItem(i.id, i.x, maxBottom - i.height));
        break;
      }
      case 'center-v': {
        const avgY = items.reduce((sum, i) => sum + i.y + i.height / 2, 0) / items.length;
        items.forEach(i => board.moveItem(i.id, i.x, avgY - i.height / 2));
        break;
      }
    }
  }

  function handleAutoArrange(arrangement: string) {
    const items = boardItems.filter(i => i.type !== 'group');
    if (items.length === 0) return;

    const spacing = 20;

    switch (arrangement) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(items.length));
        items.forEach((item, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          board.moveItem(item.id, col * (item.width + spacing), row * (item.height + spacing));
        });
        break;
      }
      case 'strip': {
        let x = 0;
        items.forEach(item => {
          board.moveItem(item.id, x, 0);
          x += item.width + spacing;
        });
        break;
      }
      case 'book': {
        const cols = 2;
        items.forEach((item, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          board.moveItem(item.id, col * (item.width + spacing * 4), row * (item.height + spacing));
        });
        break;
      }
      case 'circle': {
        const radius = Math.max(200, items.length * 40);
        const cx = radius + 100;
        const cy = radius + 100;
        items.forEach((item, i) => {
          const angle = (2 * Math.PI * i) / items.length - Math.PI / 2;
          board.moveItem(item.id, cx + radius * Math.cos(angle) - item.width / 2, cy + radius * Math.sin(angle) - item.height / 2);
        });
        break;
      }
      case 'timeline': {
        items.forEach((item, i) => {
          board.moveItem(item.id, i * (item.width + spacing), 100);
        });
        break;
      }
    }
  }

  function handleBoardDrop(e: DragEvent) {
    e.preventDefault();
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    // Try to get IIIF Content State or plain ID from drop data
    const data = e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('application/json');
    if (data) {
      board.addItem({
        resourceId: data,
        x,
        y,
        width: 200,
        height: 150,
        type: 'canvas',
      });
    }
  }

  function handleAddNote(x: number, y: number) {
    board.addNote(x, y);
  }

  // @migration: Export functions would use html2canvas or similar
  function handleExport() {
    // Export as IIIF Manifest
    onSaveBoard?.(board.state);
  }

  function handleExportPNG() {
    // @migration: Would use html2canvas to capture board as PNG
    console.warn('PNG export not yet implemented in Svelte migration');
  }

  function handleExportSVG() {
    // @migration: Would serialize SVG connections + item rects
    console.warn('SVG export not yet implemented in Svelte migration');
  }

  function handleCopyContentState() {
    // @migration: Would serialize board as IIIF Content State and copy to clipboard
    console.warn('Content State copy not yet implemented in Svelte migration');
  }

  // ── Pan/Zoom via mouse ──

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.1, Math.min(5, viewport.zoom + delta));
      // Zoom toward cursor position
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const scale = newZoom / viewport.zoom;
        viewport = {
          x: mx - scale * (mx - viewport.x),
          y: my - scale * (my - viewport.y),
          zoom: newZoom,
        };
      } else {
        viewport = { ...viewport, zoom: newZoom };
      }
    } else {
      // Pan
      viewport = {
        ...viewport,
        x: viewport.x - e.deltaX,
        y: viewport.y - e.deltaY,
      };
    }
  }

  function handleCanvasPointerDown(e: PointerEvent) {
    // Middle-click or space-held: start panning
    if (e.button === 1 || isPanning) {
      e.preventDefault();
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY, viewX: viewport.x, viewY: viewport.y };
      return;
    }

    // If clicking on empty canvas area in select mode, start rubber-band
    const target = e.target as HTMLElement;
    if (target === canvasEl || target.dataset.canvasBg === 'true') {
      if (activeTool === 'select') {
        if (!e.shiftKey) {
          selection.clearSelection();
        }
        const rect = canvasEl!.getBoundingClientRect();
        const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
        const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
        rubberBand = { startX: x, startY: y, endX: x, endY: y };
      } else if (activeTool === 'note') {
        const rect = canvasEl!.getBoundingClientRect();
        const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
        const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
        handleAddNote(x, y);
      }
      // Close context menu
      contextMenu = null;
    }
  }

  function handleCanvasPointerMove(e: PointerEvent) {
    // Track mouse for in-progress connection line
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      mousePosition = {
        x: (e.clientX - rect.left - viewport.x) / viewport.zoom,
        y: (e.clientY - rect.top - viewport.y) / viewport.zoom,
      };
    }

    // Pan
    if (isPanning) {
      viewport = {
        ...viewport,
        x: panStart.viewX + (e.clientX - panStart.x),
        y: panStart.viewY + (e.clientY - panStart.y),
      };
      return;
    }

    // Rubber-band
    if (rubberBand && canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      rubberBand = {
        ...rubberBand,
        endX: (e.clientX - rect.left - viewport.x) / viewport.zoom,
        endY: (e.clientY - rect.top - viewport.y) / viewport.zoom,
      };
    }

    // Dragging items
    if (draggingId) {
      const dx = (e.clientX - dragStart.x) / viewport.zoom;
      const dy = (e.clientY - dragStart.y) / viewport.zoom;
      const newX = dragStart.itemX + dx;
      const newY = dragStart.itemY + dy;

      if (selection.isSelected(draggingId) && selection.count > 1) {
        // Move all selected items
        selection.moveSelected(
          dx,
          dy,
          (id, pos) => board.moveItem(id, pos.x, pos.y),
          boardItems,
        );
        // Reset drag start to avoid compounding
        dragStart = { ...dragStart, x: e.clientX, y: e.clientY };
        // Update itemX/itemY from current item position
        const item = board.findItem(draggingId);
        if (item) {
          dragStart.itemX = item.x;
          dragStart.itemY = item.y;
        }
      } else {
        handleMoveItem(draggingId, { x: newX, y: newY });
      }
    }
  }

  function handleCanvasPointerUp(e: PointerEvent) {
    if (isPanning) {
      isPanning = false;
      return;
    }

    // Finish rubber-band selection
    if (rubberBand && rubberBandRect) {
      const rect = rubberBandRect;
      const selectedIds = boardItems
        .filter(item => {
          return (
            item.type !== 'group' &&
            item.x < rect.x + rect.width &&
            item.x + item.width > rect.x &&
            item.y < rect.y + rect.height &&
            item.y + item.height > rect.y
          );
        })
        .map(item => item.id);

      if (selectedIds.length > 0) {
        selection.selectItems(selectedIds);
      }
      rubberBand = null;
    }

    // End item drag
    draggingId = null;
  }

  // ── Item drag start ──
  function handleItemPointerDown(e: PointerEvent, itemId: string) {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (activeTool === 'connect') {
      handleStartConnection(itemId);
      return;
    }

    const item = board.findItem(itemId);
    if (!item) return;

    draggingId = itemId;
    dragStart = { x: e.clientX, y: e.clientY, itemX: item.x, itemY: item.y };
  }

  function handleItemPointerUp(e: PointerEvent, itemId: string) {
    if (activeTool === 'connect' && connectingFrom) {
      handleCompleteConnection(itemId);
      return;
    }

    // If not dragged significantly, treat as click
    if (draggingId === itemId) {
      const dx = Math.abs(e.clientX - dragStart.x);
      const dy = Math.abs(e.clientY - dragStart.y);
      if (dx < 3 && dy < 3) {
        handleToggleSelectItem(itemId, e.shiftKey);
      }
    }
    draggingId = null;
  }

  // ── Context menu actions ──
  function handleContextAction(action: string) {
    if (!contextMenu) return;
    const itemId = contextMenu.itemId;

    switch (action) {
      case 'delete':
        board.removeItem(itemId);
        selection.clearSelection();
        break;
      case 'duplicate': {
        const item = board.findItem(itemId);
        if (item) {
          board.addItem({
            resourceId: item.resourceId,
            x: item.x + 30,
            y: item.y + 30,
            width: item.width,
            height: item.height,
            type: item.type,
            label: item.label,
            color: item.color,
          });
        }
        break;
      }
      case 'bring-front':
        // @migration: z-index management would reorder items array
        break;
      case 'send-back':
        // @migration: z-index management would reorder items array
        break;
      case 'open-viewer':
        handleDoubleClickItem(itemId);
        break;
    }
    contextMenu = null;
  }

  // ── Connection line path helper ──
  function connectionPath(fromItem: BoardItem | undefined, toItem: BoardItem | undefined): string {
    if (!fromItem || !toItem) return '';
    const x1 = fromItem.x + fromItem.width / 2;
    const y1 = fromItem.y + fromItem.height / 2;
    const x2 = toItem.x + toItem.width / 2;
    const y2 = toItem.y + toItem.height / 2;
    // Cubic bezier with control points offset horizontally
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  }

  function pendingConnectionPath(fromItem: BoardItem | undefined): string {
    if (!fromItem) return '';
    const x1 = fromItem.x + fromItem.width / 2;
    const y1 = fromItem.y + fromItem.height / 2;
    const x2 = mousePosition.x;
    const y2 = mousePosition.y;
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  }

  function connectionStrokeColor(type: BoardConnection['type']): string {
    if (fieldMode) {
      return type === 'sequence' ? '#D4A600' : '#B8860B';
    }
    switch (type) {
      case 'sequence': return '#0055FF';
      case 'reference': return '#00CC66';
      case 'supplement': return '#FF9900';
      case 'custom': return '#9B59B6';
      default: return '#666';
    }
  }

  // ── Item display helpers ──
  function itemBgClass(item: BoardItem): string {
    if (item.type === 'note') {
      return '';  // Note uses inline color style
    }
    return cx.surface || 'bg-white';
  }

  function itemBorderClass(item: BoardItem, isSelected: boolean): string {
    if (isSelected) {
      return fieldMode
        ? 'border-3 border-yellow-500 shadow-[0_0_0_2px_rgba(234,179,8,0.3)]'
        : cn('border-3', cx.accent || 'border-blue-500', 'shadow-[0_0_0_2px_rgba(0,85,255,0.2)]');
    }
    if (item.type === 'note') return 'border-2 border-black/20';
    return cn('border-2', cx.border || 'border-nb-black');
  }
</script>

<PaneLayout variant="canvas">
  {#snippet header()}
    <BoardHeader
      {cx}
      {fieldMode}
      title="Board Design"
      {activeTool}
      onToolChange={handleToolChange}
      canUndo={board.canUndo}
      canRedo={board.canRedo}
      onUndo={() => board.undo()}
      onRedo={() => board.redo()}
      onSave={handleSave}
      isDirty={board.isDirty}
      onExport={handleExport}
      onExportPNG={handleExportPNG}
      onExportSVG={handleExportSVG}
      onCopyContentState={handleCopyContentState}
      onPresent={() => presentation.enter(boardItems, boardConnections)}
      onDelete={handleDeleteSelected}
      {hasSelection}
      itemCount={boardItems.length}
      connectionCount={boardConnections.length}
      {selectionCount}
      {bgMode}
      onBgModeChange={(m) => { bgMode = m; }}
      onAlign={handleAlign}
      {snapEnabled}
      onSnapToggle={() => { snapEnabled = !snapEnabled; board.setSnapEnabled(!board.state.snapEnabled); }}
      onAutoArrange={handleAutoArrange}
    />
  {/snippet}

  {#snippet body()}
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
        <div
          class={cn('absolute inset-0', cx.pageBg || 'bg-white')}
          style={gridBgStyle}
          data-canvas-bg="true"
        ></div>
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
        <!-- Group overlays (behind items) -->
        {#each groupOverlays as group (group.id)}
          <div
            class={cn(
              'absolute border-2 border-dashed rounded-lg pointer-events-none',
              fieldMode ? 'border-yellow-500/40' : 'border-blue-300/50',
            )}
            style="left: {group.x}px; top: {group.y}px; width: {group.width}px; height: {group.height}px;"
          >
            <span class={cn(
              'absolute -top-5 left-1 text-xs font-mono px-1 rounded',
              bgMode === 'dark' ? 'text-gray-300 bg-gray-800/80' : cn(cx.textMuted, 'bg-white/80'),
            )}>
              {group.label}
            </span>
          </div>
        {/each}

        <!-- Connection lines (SVG overlay) -->
        <svg
          class="absolute pointer-events-none"
          style="left: 0; top: 0; width: 10000px; height: 10000px; overflow: visible;"
        >
          {#each boardConnections as conn (conn.id)}
            {@const fromItem = board.findItem(conn.fromId)}
            {@const toItem = board.findItem(conn.toId)}
            {#if fromItem && toItem}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <g
                class="pointer-events-auto cursor-pointer"
                role="img"
                aria-label="{conn.type} connection from {fromItem.label ?? conn.fromId} to {toItem.label ?? conn.toId}"
              >
                <!-- Hit area (wider invisible stroke) -->
                <path
                  d={connectionPath(fromItem, toItem)}
                  fill="none"
                  stroke="transparent"
                  stroke-width="12"
                  ondblclick={() => { editingConnection = conn.id; }}
                />
                <!-- Visible line -->
                <path
                  d={connectionPath(fromItem, toItem)}
                  fill="none"
                  stroke={connectionStrokeColor(conn.type)}
                  stroke-width={editingConnection === conn.id ? 3 : 2}
                  stroke-dasharray={conn.type === 'reference' ? '6 3' : 'none'}
                  opacity={editingConnection === conn.id ? 1 : 0.7}
                />
                <!-- Connection type label -->
                {#if isAdvanced}
                  {@const mx = (fromItem.x + fromItem.width / 2 + toItem.x + toItem.width / 2) / 2}
                  {@const my = (fromItem.y + fromItem.height / 2 + toItem.y + toItem.height / 2) / 2}
                  <text
                    x={mx}
                    y={my - 8}
                    text-anchor="middle"
                    fill={connectionStrokeColor(conn.type)}
                    font-size="10"
                    font-family="monospace"
                  >
                    {conn.label || conn.type}
                  </text>
                {/if}
              </g>
            {/if}
          {/each}

          <!-- In-progress connection line -->
          {#if connectingFrom}
            {@const fromItem = board.findItem(connectingFrom)}
            {#if fromItem}
              <path
                d={pendingConnectionPath(fromItem)}
                fill="none"
                stroke={fieldMode ? '#D4A600' : '#0055FF'}
                stroke-width="2"
                stroke-dasharray="8 4"
                opacity="0.6"
              />
            {/if}
          {/if}
        </svg>

        <!-- Board items -->
        {#each boardItems as item (item.id)}
          {#if item.type !== 'group'}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class={cn(
                'absolute transition-shadow',
                itemBgClass(item),
                itemBorderClass(item, selection.isSelected(item.id)),
                activeTool === 'connect' && 'hover:ring-2 hover:ring-blue-400',
              )}
              style="left: {item.x}px; top: {item.y}px; width: {item.width}px; height: {item.height}px;{item.type === 'note' && item.color ? ` background-color: ${item.color};` : ''}"
              role="button"
              tabindex="0"
              aria-selected={selection.isSelected(item.id)}
              aria-label={item.label ?? item.resourceId ?? 'Board item'}
              onpointerdown={(e) => handleItemPointerDown(e, item.id)}
              onpointerup={(e) => handleItemPointerUp(e, item.id)}
              ondblclick={() => handleDoubleClickItem(item.id)}
              oncontextmenu={(e) => handleContextMenu(e, item.id)}
            >
              <!-- Item content -->
              <div class="w-full h-full flex flex-col overflow-hidden">
                {#if item.type === 'note'}
                  <!-- Note card -->
                  <div class="flex-1 p-2 text-sm overflow-hidden">
                    <span class="font-medium text-black/80">{item.label ?? 'Note'}</span>
                  </div>
                {:else if item.type === 'canvas'}
                  <!-- Canvas item card -->
                  <div class={cn('flex-1 flex items-center justify-center text-xs overflow-hidden', bgMode === 'dark' ? 'text-gray-300' : cx.textMuted)}>
                    <!-- @migration: Would show thumbnail via IIIF Image API service worker -->
                    <div class="text-center p-2">
                      <svg class="w-8 h-8 mx-auto mb-1 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="0" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span class="truncate block max-w-full">{item.label ?? item.resourceId ?? 'Canvas'}</span>
                    </div>
                  </div>
                {:else}
                  <div class="flex-1 flex items-center justify-center text-xs opacity-50">
                    {item.type}
                  </div>
                {/if}
              </div>

              <!-- Connection handle (visible in connect mode) -->
              {#if activeTool === 'connect'}
                <div class={cn(
                  'absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2',
                  fieldMode ? 'bg-yellow-400 border-yellow-600' : 'bg-blue-500 border-blue-700',
                )}></div>
              {/if}
            </div>
          {/if}
        {/each}

        <!-- Rubber-band selection box -->
        {#if rubberBandRect && rubberBandRect.width > 2 && rubberBandRect.height > 2}
          <div
            class={cn(
              'absolute border-2 pointer-events-none',
              fieldMode
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-blue-500 bg-blue-500/10',
            )}
            style="left: {rubberBandRect.x}px; top: {rubberBandRect.y}px; width: {rubberBandRect.width}px; height: {rubberBandRect.height}px;"
          ></div>
        {/if}
      </div>

      <!-- Zoom indicator (bottom-right) -->
      <div class={cn(
        'absolute bottom-3 right-3 px-2 py-1 rounded text-xs font-mono',
        bgMode === 'dark' ? 'bg-gray-800 text-gray-300' : cn(cx.surface || 'bg-white', cx.textMuted, 'border', cx.border || 'border-black/10'),
      )}>
        {Math.round(viewport.zoom * 100)}%
      </div>

      <!-- Item count (bottom-left, advanced only) -->
      {#if isAdvanced}
        <div class={cn(
          'absolute bottom-3 left-3 px-2 py-1 rounded text-xs font-mono',
          bgMode === 'dark' ? 'bg-gray-800 text-gray-300' : cn(cx.surface || 'bg-white', cx.textMuted),
        )}>
          {boardItems.filter(i => i.type !== 'group').length} items · {boardConnections.length} connections
          {#if hasSelection} · {selectionCount} selected{/if}
        </div>
      {/if}
    </div>
  {/snippet}
</PaneLayout>

<!-- Context menu overlay -->
{#if contextMenu}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="fixed inset-0 z-[100]" onclick={() => { contextMenu = null; }}>
    <div
      class={cn(
        'absolute z-[101] rounded shadow-lg border-2 py-1 min-w-[160px]',
        cx.surface || 'bg-white',
        cx.border || 'border-nb-black',
      )}
      style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
      onclick={(e: MouseEvent) => e.stopPropagation()}
      role="menu"
    >
      <button
        class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
        onclick={() => handleContextAction('open-viewer')}
        role="menuitem"
      >
        Open in Viewer
      </button>
      <button
        class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
        onclick={() => handleContextAction('duplicate')}
        role="menuitem"
      >
        Duplicate
      </button>
      <div class={cn('my-1 mx-2 h-px', cx.divider || 'bg-black/10')}></div>
      <button
        class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
        onclick={() => handleContextAction('bring-front')}
        role="menuitem"
      >
        Bring to Front
      </button>
      <button
        class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
        onclick={() => handleContextAction('send-back')}
        role="menuitem"
      >
        Send to Back
      </button>
      <div class={cn('my-1 mx-2 h-px', cx.divider || 'bg-black/10')}></div>
      <button
        class={cn('block w-full px-3 py-1.5 text-sm text-left text-red-600 hover:bg-red-50', cx.text)}
        onclick={() => handleContextAction('delete')}
        role="menuitem"
      >
        Delete
      </button>
    </div>
  </div>
{/if}

<!-- Connection edit panel (modal) -->
{#if editingConnection}
  {@const conn = board.findConnection(editingConnection)}
  {#if conn}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30" onclick={() => { editingConnection = null; }}>
      <div
        class={cn('rounded-lg shadow-xl border-2 p-4 min-w-[300px]', cx.surface || 'bg-white', cx.border || 'border-nb-black')}
        onclick={(e: MouseEvent) => e.stopPropagation()}
        role="dialog"
        aria-label="Edit connection"
      >
        <h3 class={cn('font-mono uppercase text-sm font-semibold mb-3', cx.text)}>Edit Connection</h3>

        <div class="space-y-3">
          <div>
            <label class={cn('block text-xs font-medium mb-1', cx.textMuted)}>Type</label>
            <select
              class={cn('w-full px-2 py-1.5 text-sm border-2 rounded', cx.border || 'border-nb-black', cx.surface || 'bg-white')}
              value={conn.type}
              onchange={(e) => {
                const target = e.target as HTMLSelectElement;
                board.updateConnection(editingConnection!, { type: target.value as BoardConnection['type'] });
              }}
            >
              <option value="sequence">Sequence</option>
              <option value="reference">Reference</option>
              <option value="supplement">Supplement</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label class={cn('block text-xs font-medium mb-1', cx.textMuted)}>Label</label>
            <input
              class={cn('w-full px-2 py-1.5 text-sm border-2 rounded', cx.border || 'border-nb-black', cx.surface || 'bg-white')}
              type="text"
              value={conn.label ?? ''}
              oninput={(e) => {
                const target = e.target as HTMLInputElement;
                board.updateConnection(editingConnection!, { label: target.value || undefined });
              }}
              placeholder="Optional label..."
            />
          </div>
        </div>

        <div class="flex justify-between mt-4">
          <button
            class="text-sm text-red-600 hover:text-red-700 font-medium"
            onclick={() => { board.removeConnection(editingConnection!); editingConnection = null; }}
          >
            Delete Connection
          </button>
          <button
            class={cn('text-sm font-medium px-3 py-1 rounded', cx.accent || 'bg-blue-500 text-white')}
            onclick={() => { editingConnection = null; }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<!-- Presentation overlay -->
{#if presentation.isActive}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="fixed inset-0 z-[200] bg-black flex flex-col">
    <!-- Presentation header -->
    <div class="flex items-center justify-between px-6 py-3 bg-black/80 text-white">
      <span class="font-mono text-sm">
        Slide {presentation.currentIndex + 1} / {presentation.totalSlides}
      </span>
      <div class="flex items-center gap-3">
        <button
          class="text-sm px-3 py-1 rounded hover:bg-white/10"
          onclick={() => presentation.toggleAutoAdvance()}
        >
          {presentation.isAutoAdvancing ? 'Pause' : 'Auto'}
        </button>
        <button
          class="text-sm px-3 py-1 rounded hover:bg-white/10"
          onclick={() => presentation.exit()}
        >
          Exit (Esc)
        </button>
      </div>
    </div>

    <!-- Slide content -->
    <div class="flex-1 flex items-center justify-center text-white">
      {#if presentation.currentSlide}
        {@const slideItem = board.findItem(presentation.currentSlide.id)}
        {#if slideItem}
          <div class="text-center max-w-2xl">
            <!-- @migration: Would render actual item thumbnail/content -->
            <div class="w-64 h-48 mx-auto mb-6 border-2 border-white/20 rounded flex items-center justify-center">
              {#if slideItem.type === 'note'}
                <div class="p-4 text-lg" style:background-color={slideItem.color || '#FFEAA7'} style:color="black">
                  {slideItem.label ?? 'Note'}
                </div>
              {:else}
                <svg class="w-16 h-16 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <rect x="3" y="3" width="18" height="18" rx="0" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              {/if}
            </div>
            <h2 class="text-2xl font-mono uppercase tracking-wider">
              {slideItem.label ?? slideItem.resourceId ?? 'Item'}
            </h2>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Presentation navigation -->
    <div class="flex items-center justify-center gap-4 py-4 bg-black/80">
      <button
        class="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 disabled:opacity-30"
        onclick={() => presentation.prev()}
        disabled={presentation.isFirst && !presentation.isAutoAdvancing}
        aria-label="Previous slide"
      >
        <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <!-- Progress dots -->
      <div class="flex gap-1.5">
        {#each presentation.slides as slide, i (slide.id)}
          <button
            class={cn(
              'w-2 h-2 rounded-full transition-all',
              i === presentation.currentIndex ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50',
            )}
            onclick={() => presentation.goTo(i)}
            aria-label="Go to slide {i + 1}"
          ></button>
        {/each}
      </div>

      <button
        class="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 disabled:opacity-30"
        onclick={() => presentation.next()}
        disabled={presentation.isLast && !presentation.isAutoAdvancing}
        aria-label="Next slide"
      >
        <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>

    <!-- Progress bar -->
    <div class="h-1 bg-white/10">
      <div
        class="h-full bg-white/60 transition-all duration-300"
        style="width: {presentation.progress * 100}%;"
      ></div>
    </div>
  </div>
{/if}
