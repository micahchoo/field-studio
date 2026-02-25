<!--
  ArchiveView.svelte — Archive Grid/List View
  =============================================
  Feature organism: archive view with grid/list/grouped display.
  Uses PaneLayout with variant="default" (scrollable body).
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IIIFItem } from '@/src/shared/types';
  import { getIIIFValue, isCanvas } from '@/src/shared/types';
  import PaneLayout from '@/src/shared/ui/layout/composites/PaneLayout.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Center from '@/src/shared/ui/layout/primitives/Center.svelte';
  import ArchiveHeader from './ArchiveHeader.svelte';
  import ArchiveEmptyState from '../atoms/ArchiveEmptyState.svelte';
  import ArchiveContextMenu from '../molecules/ArchiveContextMenu.svelte';
  import ArchiveFilmstrip from '../molecules/ArchiveFilmstrip.svelte';
  import ArchiveGridView from '../molecules/ArchiveGridView.svelte';
  import ArchiveListView from '../molecules/ArchiveListView.svelte';
  import ArchiveGroupedView from '../molecules/ArchiveGroupedView.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import { viewRegistry } from '@/src/shared/stores/viewRegistry.svelte';
  import type { ArchiveViewState } from '@/src/features/archive/stores/archiveViewState.svelte';

  type ViewMode = 'grid' | 'list' | 'grouped';
  type SortMode = 'name' | 'date' | 'size';
  type SortDirection = 'asc' | 'desc';

  interface Props {
    cx: ContextualClassNames;
    fieldMode: boolean;
    t: (key: string) => string;
    root: IIIFItem;
    filmstripMode?: boolean;
    validationIssues?: Map<string, unknown[]>;
    onSelect: (item: IIIFItem) => void;
    onOpen: (item: IIIFItem) => void;
    onUpdate: (newRoot: IIIFItem) => void;
    onBatchEdit: (ids: string[]) => void;
    showViewerPanel: boolean;
    showInspectorPanel: boolean;
    onToggleViewerPanel: () => void;
    onToggleInspectorPanel: () => void;
    onOpenImport: () => void;
    onOpenExternalImport: () => void;
  }

  let {
    cx,
    fieldMode,
    t,
    root,
    filmstripMode = false,
    validationIssues,
    onSelect,
    onOpen,
    onUpdate,
    onBatchEdit,
    showViewerPanel,
    showInspectorPanel,
    onToggleViewerPanel,
    onToggleInspectorPanel,
    onOpenImport,
    onOpenExternalImport,
  }: Props = $props();

  // ── ViewRegistry state (§0.1) ──
  const archiveState = viewRegistry.get('archive') as ArchiveViewState;

  // Seed viewMode from localStorage on first mount (if still default)
  if (archiveState.viewMode === 'grid') {
    const stored = loadViewMode();
    if (stored !== 'grid') archiveState.setViewMode(stored);
  }

  // Derived reads from archiveState (survive view switches)
  const view = $derived(archiveState.viewMode);
  const filter = $derived(archiveState.filter);
  const sortBy = $derived(archiveState.sortBy);
  const sortDirection = $derived(archiveState.sortDirection);
  const groupByManifest = $derived(archiveState.groupByManifest);
  const selectedIds = $derived(archiveState.selection as ReadonlySet<string> & Set<string>);

  // Local-only state (transient UI, not preserved across view switches)
  let filterInput = $state('');
  let contextMenu = $state<{ x: number; y: number; item: IIIFItem } | null>(null);

  // activeItem derived from archiveState.activeItemId + canvases
  // (defined after canvases $derived below)

  // ── Debounced filter ──
  $effect(() => {
    const value = filterInput;
    const timer = setTimeout(() => { archiveState.setFilter(value); }, 300);
    return () => clearTimeout(timer);
  });

  // ── Derived State ──
  const canvases = $derived(extractCanvases(root));
  const filteredCanvases = $derived(filterAndSort(canvases, filter, sortBy, sortDirection));
  const isEmpty = $derived(canvases.length === 0);
  const hasCanvasSelected = $derived(selectedIds.size > 0);
  const selectionHasGPS = $derived(checkSelectionHasGPS(selectedIds, canvases));
  const reorderEnabled = $derived(!filmstripMode && !showViewerPanel);

  // activeItem: derived from archiveState.activeItemId
  const activeItem = $derived(
    archiveState.activeItemId
      ? canvases.find((c) => c.id === archiveState.activeItemId) ?? null
      : null
  );

  // ── Effects ──

  // Persist viewMode to localStorage
  $effect(() => {
    try { localStorage.setItem('archive-view-mode', view); } catch { /* unavailable */ }
  });

  // Sync activeItemId when selection changes
  $effect(() => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      archiveState.setActiveItemId(id);
    } else if (selectedIds.size > 1) {
      if (!archiveState.activeItemId || !selectedIds.has(archiveState.activeItemId)) {
        archiveState.setActiveItemId(Array.from(selectedIds)[0] ?? null);
      }
    } else {
      archiveState.setActiveItemId(null);
    }
  });

  $effect(() => {
    if (!reorderEnabled || !activeItem || selectedIds.size !== 1) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      const currentIndex = filteredCanvases.findIndex((c) => c.id === activeItem!.id);
      if (currentIndex === -1) return;
      const targetIndex =
        e.key === 'ArrowUp'
          ? Math.max(0, currentIndex - 1)
          : Math.min(filteredCanvases.length - 1, currentIndex + 1);
      if (targetIndex !== currentIndex) handleReorder(currentIndex, targetIndex);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // ── Helper Functions ──

  function loadViewMode(): ViewMode {
    try {
      const stored = localStorage.getItem('archive-view-mode');
      if (stored === 'grid' || stored === 'list' || stored === 'grouped') return stored;
    } catch { /* unavailable */ }
    return 'grid';
  }

  function extractCanvases(item: IIIFItem): IIIFItem[] {
    const result: IIIFItem[] = [];
    if (item.type === 'Canvas') { result.push(item); return result; }
    if (item.items && Array.isArray(item.items)) {
      for (const child of item.items) {
        if (typeof child === 'object' && child !== null && 'type' in child) {
          if (child.type === 'Canvas') result.push(child as IIIFItem);
          else if (child.type === 'Manifest' || child.type === 'Collection') result.push(...extractCanvases(child as IIIFItem));
        }
      }
    }
    return result;
  }

  function matchesFilter(item: IIIFItem, filterText: string): boolean {
    if (!filterText) return true;
    const lower = filterText.toLowerCase();
    if (getIIIFValue(item.label).toLowerCase().includes(lower)) return true;
    if (item.metadata) {
      for (const entry of item.metadata) {
        if (getIIIFValue(entry.value).toLowerCase().includes(lower)) return true;
        if (getIIIFValue(entry.label).toLowerCase().includes(lower)) return true;
      }
    }
    if (item._filename && item._filename.toLowerCase().includes(lower)) return true;
    return false;
  }

  function filterAndSort(items: IIIFItem[], filterText: string, sort: SortMode, dir: SortDirection): IIIFItem[] {
    let result = filterText ? items.filter((item) => matchesFilter(item, filterText)) : [...items];
    result.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case 'name': cmp = getIIIFValue(a.label).toLowerCase().localeCompare(getIIIFValue(b.label).toLowerCase()); break;
        case 'date': cmp = (a.navDate || '').localeCompare(b.navDate || ''); break;
        case 'size': {
          const sizeA = isCanvas(a) && a.width && a.height ? a.width * a.height : 0;
          const sizeB = isCanvas(b) && b.width && b.height ? b.width * b.height : 0;
          cmp = sizeA - sizeB;
          break;
        }
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return result;
  }

  function checkSelectionHasGPS(ids: Set<string>, items: IIIFItem[]): boolean {
    for (const item of items) {
      if (!ids.has(item.id)) continue;
      if (item.navDate) return true;
      if (item.metadata) {
        for (const entry of item.metadata) {
          const label = getIIIFValue(entry.label).toLowerCase();
          if (label.includes('gps') || label.includes('latitude') || label.includes('longitude') || label.includes('coordinates')) return true;
        }
      }
    }
    return false;
  }

  function getLabel(item: IIIFItem): string {
    return getIIIFValue(item.label) || item._filename || 'Untitled';
  }

  function getThumbnailUrl(item: IIIFItem): string {
    if (item._blobUrl) return item._blobUrl;
    return item.thumbnail?.[0]?.id || '';
  }

  // ── Event Handlers ──

  function handleItemClick(e: MouseEvent | KeyboardEvent, item: IIIFItem) {
    if (e.shiftKey && activeItem) {
      const startIdx = filteredCanvases.findIndex((c) => c.id === activeItem!.id);
      const endIdx = filteredCanvases.findIndex((c) => c.id === item.id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeIds = filteredCanvases.slice(lo, hi + 1).map(c => c.id);
        archiveState.selectRange(rangeIds);
      }
    } else if (e.ctrlKey || e.metaKey) {
      archiveState.toggleSelection(item.id);
    } else {
      archiveState.setSelection(new Set([item.id]));
      onSelect(item);
    }
  }

  function handleContextMenu(e: MouseEvent, item: IIIFItem) {
    e.preventDefault();
    if (!selectedIds.has(item.id)) archiveState.setSelection(new Set([item.id]));
    contextMenu = { x: e.clientX, y: e.clientY, item };
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    if (!onUpdate) return;
    const newRoot = JSON.parse(JSON.stringify(root)) as IIIFItem;
    const reorderInParent = (parent: IIIFItem): boolean => {
      if (!parent.items || !Array.isArray(parent.items)) return false;
      const hasCanvases = parent.items.some(
        (c: unknown) => typeof c === 'object' && c !== null && 'type' in c && (c as IIIFItem).type === 'Canvas'
      );
      if (hasCanvases) {
        const items = [...parent.items];
        const [movedItem] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, movedItem);
        parent.items = items;
        return true;
      }
      for (const child of parent.items) {
        if (typeof child === 'object' && child !== null && 'type' in child) {
          if (reorderInParent(child as IIIFItem)) return true;
        }
      }
      return false;
    };
    if (reorderInParent(newRoot)) onUpdate(newRoot);
  }

  function handleGroupIntoManifest() {
    if (selectedIds.size === 0) return;
    const newRoot = JSON.parse(JSON.stringify(root)) as IIIFItem;
    const canvasesToMove: IIIFItem[] = [];
    const removeFromParent = (parent: IIIFItem) => {
      if (!parent.items) return;
      for (let i = parent.items.length - 1; i >= 0; i--) {
        const child = parent.items[i] as IIIFItem;
        if (selectedIds.has(child.id) && child.type === 'Canvas') canvasesToMove.push(parent.items.splice(i, 1)[0] as IIIFItem);
        else if (child.items) removeFromParent(child);
      }
    };
    removeFromParent(newRoot);
    if (canvasesToMove.length === 0) return;
    const manifestId = `urn:field-studio:manifest:${crypto.randomUUID()}`;
    if (!newRoot.items) newRoot.items = [];
    newRoot.items.push({ id: manifestId, type: 'Manifest', label: { en: ['Selection Bundle'] }, items: canvasesToMove });
    onUpdate(newRoot);
    archiveState.setSelection(new Set([manifestId]));
  }

  function handleEditMetadata() { onBatchEdit(Array.from(selectedIds)); }

  // Future: Pipeline navigation to map/board views
  function handleOpenMap() {}
  function handleComposeOnBoard() {}

  function groupCanvasesByManifest(item: IIIFItem): Array<{ manifestId: string; manifestLabel: string; canvases: IIIFItem[] }> {
    const groups: Array<{ manifestId: string; manifestLabel: string; canvases: IIIFItem[] }> = [];
    function walk(node: IIIFItem) {
      if (node.type === 'Manifest' && node.items) {
        const mc = node.items.filter(
          (c: unknown) => typeof c === 'object' && c !== null && 'type' in c && (c as IIIFItem).type === 'Canvas'
        ) as IIIFItem[];
        if (mc.length > 0) groups.push({ manifestId: node.id, manifestLabel: getIIIFValue(node.label) || 'Untitled Manifest', canvases: mc });
      }
      if (node.items && Array.isArray(node.items)) {
        for (const child of node.items) {
          if (typeof child === 'object' && child !== null && 'type' in child) {
            const tc = child as IIIFItem;
            if (tc.type === 'Collection' || tc.type === 'Manifest') walk(tc);
          }
        }
      }
    }
    walk(item);
    return groups;
  }
</script>

{#if !root || isEmpty}
  <ArchiveEmptyState {cx} {t} {onOpenImport} {onOpenExternalImport} />
{:else}
  <PaneLayout variant="default" class={cn('relative', cx.pageBg)}>
    {#snippet header()}
      {#if !filmstripMode}
        <ArchiveHeader
          {cx}
          {fieldMode}
          bind:filter={filterInput}
          {view}
          onViewChange={(v) => archiveState.setViewMode(v)}
          {sortBy}
          onSortChange={(v) => archiveState.setSortBy(v)}
          {sortDirection}
          onSortDirectionChange={(v) => archiveState.setSortDirection(v)}
          {groupByManifest}
          onToggleGroupByManifest={() => archiveState.setGroupByManifest(!groupByManifest)}
          selectedCount={selectedIds.size}
          {selectionHasGPS}
          onClearSelection={() => archiveState.clearSelection()}
          onGroupIntoManifest={handleGroupIntoManifest}
          onOpenMap={handleOpenMap}
          onEditMetadata={handleEditMetadata}
          onBatchEdit={handleEditMetadata}
          onComposeOnBoard={handleComposeOnBoard}
          {showViewerPanel}
          {showInspectorPanel}
          {onToggleViewerPanel}
          {onToggleInspectorPanel}
          {hasCanvasSelected}
        />
      {:else}
        <div class="px-3 py-2.5 border-b border-mode-accent-border bg-mode-accent-bg-subtle">
          <span class={cn('text-[10px] font-bold uppercase tracking-wider font-mono', fieldMode ? 'text-nb-yellow' : 'text-nb-black/40')}>
            {filteredCanvases.length} items
          </span>
        </div>
      {/if}
    {/snippet}

    {#snippet body()}
      {#if filmstripMode}
        <ArchiveFilmstrip
          items={filteredCanvases}
          {selectedIds}
          activeItemId={activeItem?.id ?? null}
          {cx}
          {fieldMode}
          {getLabel}
          {getThumbnailUrl}
          onItemClick={handleItemClick}
          onOpen={onOpen}
          onContextMenu={handleContextMenu}
        />
      {:else if view === 'grid'}
        <ArchiveGridView
          items={filteredCanvases}
          {selectedIds}
          activeItemId={activeItem?.id ?? null}
          {cx}
          {fieldMode}
          {validationIssues}
          {getLabel}
          {getThumbnailUrl}
          onItemClick={handleItemClick}
          onOpen={onOpen}
          onContextMenu={handleContextMenu}
        />
      {:else if view === 'list'}
        <ArchiveListView
          items={filteredCanvases}
          {selectedIds}
          activeItemId={activeItem?.id ?? null}
          {cx}
          {fieldMode}
          {getLabel}
          {getThumbnailUrl}
          onItemClick={handleItemClick}
          onOpen={onOpen}
          onContextMenu={handleContextMenu}
        />
      {:else if view === 'grouped'}
        <ArchiveGroupedView
          groups={groupCanvasesByManifest(root)}
          {selectedIds}
          {cx}
          {fieldMode}
          {getLabel}
          {getThumbnailUrl}
          onItemClick={handleItemClick}
          onOpen={onOpen}
          onContextMenu={handleContextMenu}
        />
      {/if}

      {#if !filmstripMode && filteredCanvases.length === 0 && canvases.length > 0}
        <Center class="py-16">
          <div class="text-center">
            <Icon name="search_off" class={cn('text-4xl mb-2', cx.textMuted)} />
            <p class={cn('text-sm', cx.textMuted)}>No items match "{filter}"</p>
            <Button variant="ghost" size="sm" onclick={() => { filterInput = ''; }} class="mt-2">Clear filter</Button>
          </div>
        </Center>
      {/if}
    {/snippet}
  </PaneLayout>

  {#if contextMenu}
    <ArchiveContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      isItemSelected={selectedIds.has(contextMenu.item.id)}
      {fieldMode}
      onOpen={() => { onOpen(contextMenu!.item); contextMenu = null; }}
      onToggleSelect={() => {
        archiveState.toggleSelection(contextMenu!.item.id);
        contextMenu = null;
      }}
      onGroupIntoManifest={handleGroupIntoManifest}
      onEditMetadata={handleEditMetadata}
      onClose={() => { contextMenu = null; }}
    />
  {/if}
{/if}
