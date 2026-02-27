<!--
  BoardView.svelte — Board Design Canvas
  ========================================
  Feature organism: Visual board for item placement + connections.
  Uses PaneLayout with variant="canvas" (overflow-hidden body).
  Board canvas is a custom implementation (no external lib).
  Delegates canvas interactions to BoardCanvasInteractive molecule.
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
  import { vault } from '@/src/shared/stores/vault.svelte';
  import { contentStateService } from '@/src/shared/services/contentState';
  import { computeAlignment, computeAutoArrange } from '@/src/features/board-design/model/boardLayout';
  import type { AlignType } from '@/src/features/board-design/model/boardLayout';

  import BoardCanvasInteractive from '../molecules/BoardCanvasInteractive.svelte';
  import BoardContextMenu from '../molecules/BoardContextMenu.svelte';
  import BoardItemRenderer from '../molecules/BoardItemRenderer.svelte';
  import BoardConnectionRenderer from '../molecules/BoardConnectionRenderer.svelte';
  import BoardConnectionEditDialog from '../molecules/BoardConnectionEditDialog.svelte';
  import BoardToolbar from '../molecules/BoardToolbar.svelte';
  import PresentationOverlay from '../organisms/PresentationOverlay.svelte';

  // ── Types ──
  type Tool = 'select' | 'connect' | 'note' | 'text';
  type BgMode = 'grid' | 'dark' | 'light';

  interface GroupOverlay {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }

  interface Props {
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
  let contextMenu = $state<{ x: number; y: number; itemId: string } | null>(null);
  let editingConnection = $state<string | null>(null);

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

  // ── Lifecycle ──
  onMount(() => {
    if (initialState) board.loadBoard(initialState);
  });

  onDestroy(() => {
    board.destroy();
    presentation.destroy();
  });

  // ── Keyboard shortcuts ──
  $effect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (presentation.isActive) {
        if (presentation.handleKeyboard(e)) { e.preventDefault(); return; }
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v': activeTool = 'select'; onToolChange?.('select'); e.preventDefault(); return;
          case 'c': if (!e.shiftKey) { activeTool = 'connect'; onToolChange?.('connect'); e.preventDefault(); } return;
          case 't': activeTool = 'text'; onToolChange?.('text'); e.preventDefault(); return;
          case 'n': activeTool = 'note'; onToolChange?.('note'); e.preventDefault(); return;
          case 'g': if (selection.count > 1) { handleCreateGroup('Group'); e.preventDefault(); } return;
          case 'delete': case 'backspace': handleDeleteSelected(); e.preventDefault(); return;
          case 'escape': contextMenu = null; editingConnection = null; selection.clearSelection(); return;
        }
      }
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z': if (e.shiftKey) { board.redo(); } else { board.undo(); } e.preventDefault(); return;
          case 'y': board.redo(); e.preventDefault(); return;
          case 'a': selection.selectAll(boardItems); e.preventDefault(); return;
          case 's': board.save(); e.preventDefault(); return;
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // ── Event Handlers ──
  function handleToolChange(tool: Tool) { activeTool = tool; onToolChange?.(tool); }

  function handleSelectItem(id: string) {
    selection.clearSelection();
    selection.toggleItem(id, false);
    onSelectId?.(id);
    const item = board.findItem(id);
    if (item?.resourceId && onSelect) {
      const resource = vault.peekEntity(item.resourceId);
      if (resource) onSelect(resource);
    }
  }

  function handleDeleteSelected() { selection.deleteSelected((id) => board.removeItem(id)); }

  function handleDoubleClickItem(id: string) {
    const item = board.findItem(id);
    if (item?.resourceId) onSwitchView?.('viewer');
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
    for (const cmd of computeAlignment(items, type)) board.moveItem(cmd.id, cmd.x, cmd.y);
  }

  function handleAutoArrange(arrangement: string) {
    const items = boardItems.filter(i => i.type !== 'group');
    for (const cmd of computeAutoArrange(items, arrangement)) board.moveItem(cmd.id, cmd.x, cmd.y);
  }

  function handleExport() { onSaveBoard?.(board.state); }

  function handleExportPNG() {
    // Deferred: html2canvas not installed (npm install html2canvas)
    console.warn('PNG export not yet implemented — requires html2canvas dependency');
  }

  function handleExportSVG() {
    // Deferred: SVG serialization library needed
    console.warn('SVG export not yet implemented — requires SVG serialization');
  }

  async function handleCopyContentState(): Promise<void> {
    const selectedIds = Array.from(selection.selectedIds);
    const items = selectedIds
      .map(id => board.findItem(id))
      .filter((i): i is BoardItem => i !== undefined && i.resourceId !== undefined);
    if (items.length === 0) {
      console.warn('No items with resource IDs selected for Content State export');
      return;
    }
    const item = items[0];
    const state = contentStateService.createContentState({ manifestId: vault.rootId!, canvasId: item.resourceId! });
    const encoded = contentStateService.encode(state);
    await navigator.clipboard.writeText(encoded);
  }

  function handleContextAction(action: string) {
    if (!contextMenu) return;
    const itemId = contextMenu.itemId;
    switch (action) {
      case 'delete': board.removeItem(itemId); selection.clearSelection(); break;
      case 'duplicate': {
        const item = board.findItem(itemId);
        if (item) {
          board.addItem({
            resourceId: item.resourceId, x: item.x + 30, y: item.y + 30,
            width: item.width, height: item.height, type: item.type, label: item.label, color: item.color,
          });
        }
        break;
      }
      case 'bring-front': board.bringToFront(itemId); break;
      case 'send-back': board.sendToBack(itemId); break;
      case 'open-viewer': handleDoubleClickItem(itemId); break;
    }
    contextMenu = null;
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
      onSave={() => board.save()}
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
    <BoardCanvasInteractive
      bind:viewport
      {bgMode}
      {activeTool}
      {fieldMode}
      {cx}
      {boardItems}
      {selection}
      findItem={(id) => board.findItem(id)}
      onMoveItem={(id, x, y) => board.moveItem(id, x, y)}
      onAddNote={(x, y) => board.addNote(x, y)}
      onAddItemFromDrop={(resourceId, x, y) => board.addItem({ resourceId, x, y, width: 200, height: 150, type: 'canvas' })}
      onClearContext={() => { contextMenu = null; }}
    >
      {#snippet canvasContent({ mousePosition, rubberBandRect, handleItemPointerDown, handleItemPointerUp })}
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

        <!-- Connection lines -->
        <BoardConnectionRenderer
          connections={boardConnections}
          connectingFrom={null}
          {mousePosition}
          {isAdvanced}
          {fieldMode}
          {editingConnection}
          findItem={(id) => board.findItem(id)}
          onEditConnection={(id) => { editingConnection = id; }}
        />

        <!-- Board items -->
        {#each boardItems as item (item.id)}
          {#if item.type !== 'group'}
            <BoardItemRenderer
              {item}
              isSelected={selection.isSelected(item.id)}
              {activeTool}
              {bgMode}
              {cx}
              {fieldMode}
              onPointerDown={(e) => handleItemPointerDown(e, item.id)}
              onPointerUp={(e) => handleItemPointerUp(e, item.id)}
              onDblClick={() => handleDoubleClickItem(item.id)}
              onContextMenu={(e) => handleContextMenu(e, item.id)}
            />
          {/if}
        {/each}

        <!-- Rubber-band selection box -->
        {#if rubberBandRect && rubberBandRect.width > 2 && rubberBandRect.height > 2}
          <div
            class={cn(
              'absolute border-2 pointer-events-none',
              fieldMode ? 'border-yellow-500 bg-yellow-500/10' : 'border-blue-500 bg-blue-500/10',
            )}
            style="left: {rubberBandRect.x}px; top: {rubberBandRect.y}px; width: {rubberBandRect.width}px; height: {rubberBandRect.height}px;"
          ></div>
        {/if}
      {/snippet}

      {#snippet overlays()}
        <BoardToolbar
          zoom={viewport.zoom}
          {bgMode}
          {isAdvanced}
          itemCount={boardItems.filter(i => i.type !== 'group').length}
          connectionCount={boardConnections.length}
          {hasSelection}
          {selectionCount}
          {cx}
          {fieldMode}
        />
      {/snippet}
    </BoardCanvasInteractive>
  {/snippet}
</PaneLayout>

<!-- Context menu overlay -->
{#if contextMenu}
  <BoardContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    {cx}
    {fieldMode}
    onAction={handleContextAction}
    onClose={() => { contextMenu = null; }}
  />
{/if}

<!-- Connection edit panel (modal) -->
{#if editingConnection}
  {@const conn = board.findConnection(editingConnection)}
  {#if conn}
    <BoardConnectionEditDialog
      connection={conn}
      {cx}
      {fieldMode}
      onUpdateType={(type) => board.updateConnection(editingConnection!, { type })}
      onUpdateLabel={(label) => board.updateConnection(editingConnection!, { label })}
      onDelete={() => { board.removeConnection(editingConnection!); editingConnection = null; }}
      onClose={() => { editingConnection = null; }}
    />
  {/if}
{/if}

<!-- Presentation overlay -->
{#if presentation.isActive}
  <PresentationOverlay
    currentItem={presentation.currentSlide}
    findItem={(id) => board.findItem(id)}
    currentIndex={presentation.currentIndex}
    totalSlides={presentation.totalSlides}
    isAutoAdvancing={presentation.isAutoAdvancing}
    onNext={() => presentation.next()}
    onPrev={() => presentation.prev()}
    onExit={() => presentation.exit()}
    onToggleAutoAdvance={() => presentation.toggleAutoAdvance()}
    onGoTo={(i) => presentation.goTo(i)}
  />
{/if}
