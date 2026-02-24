<!--
  ArchiveView.svelte — Archive Grid/List View
  =============================================
  Feature organism: archive view with grid/list/grouped display.
  Uses PaneLayout with variant="default" (scrollable body).
  React source: src/features/archive/ui/organisms/ArchiveView.tsx
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IIIFItem, IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import PaneLayout from '@/src/shared/ui/layout/composites/PaneLayout.svelte';
  import GuidanceEmptyState from '@/src/shared/ui/molecules/GuidanceEmptyState.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Center from '@/src/shared/ui/layout/primitives/Center.svelte';
  import ArchiveHeader from './ArchiveHeader.svelte';
  import { cn } from '@/src/shared/lib/cn';

  // @migration: These types would come from the archive feature model
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

  // ── Local State ──
  let view = $state<ViewMode>(loadViewMode());
  let filter = $state('');
  let sortBy = $state<SortMode>('name');
  let sortDirection = $state<SortDirection>('asc');
  let groupByManifest = $state(false);
  let activeItem = $state<IIIFItem | null>(null);
  let contextMenu = $state<{ x: number; y: number; item: IIIFItem } | null>(null);
  let selectedIds = $state(new Set<string>());

  // ── Derived State ──
  const canvases = $derived(extractCanvases(root));
  const filteredCanvases = $derived(filterAndSort(canvases, filter, sortBy, sortDirection));
  const isEmpty = $derived(canvases.length === 0);
  const hasCanvasSelected = $derived(selectedIds.size > 0);
  const selectionHasGPS = $derived(checkSelectionHasGPS(selectedIds, canvases));
  const reorderEnabled = $derived(!filmstripMode && !showViewerPanel);

  // ── Effects ──

  // Persist view mode to localStorage
  $effect(() => {
    try {
      localStorage.setItem('archive-view-mode', view);
    } catch {
      // localStorage might be unavailable
    }
  });

  // Update activeItem when selection changes
  $effect(() => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      activeItem = canvases.find((c) => c.id === id) ?? null;
    } else if (selectedIds.size > 1) {
      if (!activeItem || !selectedIds.has(activeItem.id)) {
        activeItem = canvases.find((c) => c.id === Array.from(selectedIds)[0]) ?? null;
      }
    } else {
      activeItem = null;
    }
  });

  // Keyboard: Alt+Up/Down for reorder (when viewer closed + single selection)
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

      if (targetIndex !== currentIndex) {
        handleReorder(currentIndex, targetIndex);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Close context menu on Escape
  $effect(() => {
    if (!contextMenu) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        contextMenu = null;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Close context menu on outside click
  $effect(() => {
    if (!contextMenu) return;

    function handleClick() {
      contextMenu = null;
    }

    // Delay to not close immediately on the triggering right-click
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClick);
    };
  });

  // ── Helper Functions ──

  /** Load persisted view mode from localStorage */
  function loadViewMode(): ViewMode {
    try {
      const stored = localStorage.getItem('archive-view-mode');
      if (stored === 'grid' || stored === 'list' || stored === 'grouped') return stored;
    } catch {
      // localStorage unavailable
    }
    return 'grid';
  }

  /** Recursively extract all Canvas items from the root IIIF tree */
  function extractCanvases(item: IIIFItem): IIIFItem[] {
    const result: IIIFItem[] = [];

    if (item.type === 'Canvas') {
      result.push(item);
      return result;
    }

    if (item.items && Array.isArray(item.items)) {
      for (const child of item.items) {
        if (typeof child === 'object' && child !== null && 'type' in child) {
          if (child.type === 'Canvas') {
            result.push(child as IIIFItem);
          } else if (child.type === 'Manifest' || child.type === 'Collection') {
            result.push(...extractCanvases(child as IIIFItem));
          }
        }
      }
    }

    return result;
  }

  /** Check if label or metadata matches filter text */
  function matchesFilter(item: IIIFItem, filterText: string): boolean {
    if (!filterText) return true;
    const lower = filterText.toLowerCase();
    const label = getIIIFValue(item.label);
    if (label.toLowerCase().includes(lower)) return true;

    // Check metadata values
    if (item.metadata) {
      for (const entry of item.metadata) {
        const val = getIIIFValue(entry.value);
        if (val.toLowerCase().includes(lower)) return true;
        const lab = getIIIFValue(entry.label);
        if (lab.toLowerCase().includes(lower)) return true;
      }
    }

    // Check filename
    if (item._filename && item._filename.toLowerCase().includes(lower)) return true;

    return false;
  }

  /** Apply filter text + sort to canvases */
  function filterAndSort(
    items: IIIFItem[],
    filterText: string,
    sort: SortMode,
    dir: SortDirection
  ): IIIFItem[] {
    let result = filterText ? items.filter((item) => matchesFilter(item, filterText)) : [...items];

    result.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case 'name': {
          const labelA = getIIIFValue(a.label).toLowerCase();
          const labelB = getIIIFValue(b.label).toLowerCase();
          cmp = labelA.localeCompare(labelB);
          break;
        }
        case 'date': {
          const dateA = a.navDate || '';
          const dateB = b.navDate || '';
          cmp = dateA.localeCompare(dateB);
          break;
        }
        case 'size': {
          const sizeA = (a as IIIFCanvas).width && (a as IIIFCanvas).height
            ? (a as IIIFCanvas).width * (a as IIIFCanvas).height
            : 0;
          const sizeB = (b as IIIFCanvas).width && (b as IIIFCanvas).height
            ? (b as IIIFCanvas).width * (b as IIIFCanvas).height
            : 0;
          cmp = sizeA - sizeB;
          break;
        }
      }
      return dir === 'asc' ? cmp : -cmp;
    });

    return result;
  }

  /** Check if any selected canvas has GPS metadata */
  function checkSelectionHasGPS(ids: Set<string>, items: IIIFItem[]): boolean {
    for (const item of items) {
      if (!ids.has(item.id)) continue;
      if (item.navDate) return true; // navDate is a proxy; real GPS check would inspect metadata
      if (item.metadata) {
        for (const entry of item.metadata) {
          const label = getIIIFValue(entry.label).toLowerCase();
          if (label.includes('gps') || label.includes('latitude') || label.includes('longitude') || label.includes('coordinates')) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /** Get label text for a canvas */
  function getLabel(item: IIIFItem): string {
    return getIIIFValue(item.label) || item._filename || 'Untitled';
  }

  /** Get thumbnail URL for a canvas */
  function getThumbnailUrl(item: IIIFItem): string {
    const thumb = item.thumbnail?.[0];
    return thumb?.id || '';
  }

  // ── Event Handlers ──

  /** Handle click with Shift/Ctrl modifier support for multi-selection */
  function handleItemClick(e: MouseEvent, item: IIIFItem) {
    if (e.shiftKey && activeItem) {
      // Range select: from activeItem to clicked item
      const startIdx = filteredCanvases.findIndex((c) => c.id === activeItem!.id);
      const endIdx = filteredCanvases.findIndex((c) => c.id === item.id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const newSet = new Set(selectedIds);
        for (let i = lo; i <= hi; i++) {
          newSet.add(filteredCanvases[i].id);
        }
        selectedIds = newSet;
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle individual selection
      const newSet = new Set(selectedIds);
      if (newSet.has(item.id)) {
        newSet.delete(item.id);
      } else {
        newSet.add(item.id);
      }
      selectedIds = newSet;
    } else {
      // Single select
      selectedIds = new Set([item.id]);
      onSelect(item);
    }
  }

  /** Handle right-click context menu */
  function handleContextMenu(e: MouseEvent, item: IIIFItem) {
    e.preventDefault();
    // If item not in selection, select it
    if (!selectedIds.has(item.id)) {
      selectedIds = new Set([item.id]);
    }
    contextMenu = { x: e.clientX, y: e.clientY, item };
  }

  /** Handle drag-based reorder */
  function handleReorder(fromIndex: number, toIndex: number) {
    if (!onUpdate) return;
    const newRoot = JSON.parse(JSON.stringify(root)) as IIIFItem;

    const reorderInParent = (parent: IIIFItem): boolean => {
      if (!parent.items || !Array.isArray(parent.items)) return false;
      const hasCanvases = parent.items.some(
        (item: unknown) => typeof item === 'object' && item !== null && 'type' in item && (item as IIIFItem).type === 'Canvas'
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

    if (reorderInParent(newRoot)) {
      onUpdate(newRoot);
    }
  }

  /** Clear all selected items */
  function clearSelection() {
    selectedIds = new Set();
  }

  /** Context menu: Open in viewer */
  function handleContextOpen() {
    if (contextMenu) {
      onOpen(contextMenu.item);
      contextMenu = null;
    }
  }

  /** Context menu: Toggle select */
  function handleContextToggleSelect() {
    if (!contextMenu) return;
    const newSet = new Set(selectedIds);
    if (newSet.has(contextMenu.item.id)) {
      newSet.delete(contextMenu.item.id);
    } else {
      newSet.add(contextMenu.item.id);
    }
    selectedIds = newSet;
    contextMenu = null;
  }

  // ── Selection Bar Action Handlers ──

  function handleGroupIntoManifest() {
    // @migration: Would create a new Manifest from selected canvases via onUpdate
    if (selectedIds.size === 0) return;
    const newRoot = JSON.parse(JSON.stringify(root)) as IIIFItem;
    const canvasesToMove: IIIFItem[] = [];

    const removeFromParent = (parent: IIIFItem) => {
      if (!parent.items) return;
      for (let i = parent.items.length - 1; i >= 0; i--) {
        const child = parent.items[i] as IIIFItem;
        if (selectedIds.has(child.id) && child.type === 'Canvas') {
          canvasesToMove.push(parent.items.splice(i, 1)[0] as IIIFItem);
        } else if (child.items) {
          removeFromParent(child);
        }
      }
    };

    removeFromParent(newRoot);

    if (canvasesToMove.length === 0) return;

    const manifestId = `urn:field-studio:manifest:${crypto.randomUUID()}`;
    const newManifest: IIIFItem = {
      id: manifestId,
      type: 'Manifest',
      label: { en: ['Selection Bundle'] },
      items: canvasesToMove,
    };

    if (!newRoot.items) newRoot.items = [];
    newRoot.items.push(newManifest);
    onUpdate(newRoot);
    selectedIds = new Set([manifestId]);
  }

  function handleEditMetadata() {
    onBatchEdit(Array.from(selectedIds));
  }

  function handleBatchEditAction() {
    onBatchEdit(Array.from(selectedIds));
  }

  // @migration: Pipeline navigation handlers would integrate with app router
  function handleOpenMap() {
    // Would switch to Map view with selected IDs
  }

  function handleComposeOnBoard() {
    // Would switch to Board view with selected IDs
  }

  // ── Empty State Steps ──
  const emptySteps = $derived([
    { icon: 'upload', text: `Add photos, videos, or documents to your ${t('Archive').toLowerCase()}` },
    { icon: 'folder', text: `Structure items into ${t('Collection')}s and ${t('Manifest')}s` },
    { icon: 'download', text: `Share your archive as IIIF or publish online` },
  ]);

  // ── Grouped View Helper ──

  /** Group canvases by their parent Manifest for the grouped view */
  function groupCanvasesByManifest(
    item: IIIFItem
  ): Array<{ manifestId: string; manifestLabel: string; canvases: IIIFItem[] }> {
    const groups: Array<{ manifestId: string; manifestLabel: string; canvases: IIIFItem[] }> = [];

    function walk(node: IIIFItem) {
      if (node.type === 'Manifest' && node.items) {
        const manifestCanvases = node.items.filter(
          (child: unknown) =>
            typeof child === 'object' &&
            child !== null &&
            'type' in child &&
            (child as IIIFItem).type === 'Canvas'
        ) as IIIFItem[];

        if (manifestCanvases.length > 0) {
          groups.push({
            manifestId: node.id,
            manifestLabel: getIIIFValue(node.label) || 'Untitled Manifest',
            canvases: manifestCanvases,
          });
        }
      }

      if (node.items && Array.isArray(node.items)) {
        for (const child of node.items) {
          if (typeof child === 'object' && child !== null && 'type' in child) {
            const typedChild = child as IIIFItem;
            if (typedChild.type === 'Collection' || typedChild.type === 'Manifest') {
              walk(typedChild);
            }
          }
        }
      }
    }

    walk(item);
    return groups;
  }
</script>

{#if !root || isEmpty}
  <!-- Empty state: show onboarding guidance -->
  <GuidanceEmptyState
    icon="inventory_2"
    title="Welcome to Field Studio"
    description={`Create, organize, and publish ${t('Archive').toLowerCase()}s. Start by importing your media files.`}
    steps={emptySteps}
    {cx}
  >
    {#snippet action()}
      <div class="flex items-center gap-3">
        <Button variant="primary" size="base" onclick={onOpenImport}>
          {#snippet icon()}
            <Icon name="folder_open" class="text-lg" />
          {/snippet}
          {t('Ingest')} Folder
        </Button>
        <Button variant="secondary" size="base" onclick={onOpenExternalImport}>
          {#snippet icon()}
            <Icon name="link" class="text-lg" />
          {/snippet}
          {t('Ingest')} from URL
        </Button>
      </div>
    {/snippet}
  </GuidanceEmptyState>
{:else}
  <PaneLayout variant="default" class={cn('relative', cx.pageBg)}>
    {#snippet header()}
      {#if !filmstripMode}
        <ArchiveHeader
          {cx}
          {fieldMode}
          bind:filter
          {view}
          onViewChange={(v) => (view = v)}
          {sortBy}
          onSortChange={(v) => (sortBy = v)}
          {sortDirection}
          onSortDirectionChange={(v) => (sortDirection = v)}
          {groupByManifest}
          onToggleGroupByManifest={() => (groupByManifest = !groupByManifest)}
          selectedCount={selectedIds.size}
          {selectionHasGPS}
          onClearSelection={clearSelection}
          onGroupIntoManifest={handleGroupIntoManifest}
          onOpenMap={handleOpenMap}
          onEditMetadata={handleEditMetadata}
          onBatchEdit={handleBatchEditAction}
          onComposeOnBoard={handleComposeOnBoard}
          {showViewerPanel}
          {showInspectorPanel}
          {onToggleViewerPanel}
          {onToggleInspectorPanel}
          {hasCanvasSelected}
        />
      {:else}
        <!-- Filmstrip compact header -->
        <div class="px-3 py-2.5 border-b border-mode-accent-border bg-mode-accent-bg-subtle">
          <span class={cn(
            'text-[10px] font-bold uppercase tracking-wider font-mono',
            fieldMode ? 'text-nb-yellow' : 'text-nb-black/40'
          )}>
            {filteredCanvases.length} items
          </span>
        </div>
      {/if}
    {/snippet}

    {#snippet body()}
      {#if filmstripMode}
        <!-- Filmstrip: vertical thumbnail strip for sidebar -->
        <div class="flex flex-col divide-y divide-nb-black/50">
          {#each filteredCanvases as canvas (canvas.id)}
            {@const selected = selectedIds.has(canvas.id)}
            {@const active = activeItem?.id === canvas.id}
            {@const thumbnailUrl = getThumbnailUrl(canvas)}
            {@const label = getLabel(canvas)}
            <button
              type="button"
              class={cn(
                'flex items-center gap-3 px-3 py-2.5 text-left w-full border-l-4 transition-nb cursor-pointer',
                active
                  ? 'bg-mode-accent-bg-dark border-l-mode-accent-border pl-2'
                  : selected
                    ? 'bg-mode-accent-bg-subtle border-l-mode-accent-border'
                    : 'border-l-transparent hover:bg-nb-white/5'
              )}
              onclick={(e) => handleItemClick(e, canvas)}
              ondblclick={() => onOpen(canvas)}
              oncontextmenu={(e) => handleContextMenu(e, canvas)}
            >
              <!-- Thumbnail -->
              <div class="w-14 h-14 overflow-hidden bg-nb-cream/80 shrink-0">
                {#if thumbnailUrl}
                  <img
                    src={thumbnailUrl}
                    alt=""
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                {:else}
                  <div class="w-full h-full flex items-center justify-center">
                    <Icon name="image" class={cn('text-xl', cx.textMuted)} />
                  </div>
                {/if}
              </div>

              <!-- Label -->
              <div class="flex-1 min-w-0">
                <div class={cn('text-sm font-medium truncate', cx.text)}>
                  {label}
                </div>
                {#if (canvas as IIIFCanvas).width && (canvas as IIIFCanvas).height}
                  <div class={cn('text-xs', cx.textMuted)}>
                    {(canvas as IIIFCanvas).width} x {(canvas as IIIFCanvas).height}
                  </div>
                {/if}
              </div>

              <!-- Selection indicator -->
              {#if selected}
                <div class={cn('shrink-0', fieldMode ? 'text-nb-yellow' : 'text-nb-blue')}>
                  <Icon name="check_circle" class="text-lg" />
                </div>
              {/if}
            </button>
          {/each}
        </div>
      {:else if view === 'grid'}
        <!-- Grid view -->
        <div
          class={cn(
            'grid gap-2 p-6 pb-8',
            fieldMode ? 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]',
            cx.surface
          )}
          role="grid"
          aria-multiselectable="true"
          aria-label="Archive grid"
        >
          {#each filteredCanvases as canvas (canvas.id)}
            {@const selected = selectedIds.has(canvas.id)}
            {@const active = activeItem?.id === canvas.id}
            {@const thumbnailUrl = getThumbnailUrl(canvas)}
            {@const label = getLabel(canvas)}
            {@const hasIssues = validationIssues?.has(canvas.id)}
            <div
              role="gridcell"
              aria-selected={selected}
              class={cn(
                'group relative flex flex-col overflow-hidden cursor-pointer transition-nb',
                cx.thumbnailBg || 'bg-nb-cream border-2 border-nb-black',
                selected && (cx.selected || 'ring-2 ring-nb-blue'),
                active && 'ring-2 ring-offset-2',
                active && (fieldMode ? 'ring-nb-yellow' : 'ring-nb-blue')
              )}
              onclick={(e) => handleItemClick(e, canvas)}
              ondblclick={() => onOpen(canvas)}
              oncontextmenu={(e) => handleContextMenu(e, canvas)}
              onkeydown={(e) => {
                if (e.key === 'Enter') onOpen(canvas);
                if (e.key === ' ') { e.preventDefault(); handleItemClick(e as unknown as MouseEvent, canvas); }
              }}
              tabindex="0"
            >
              <!-- Thumbnail image -->
              <div class={cn('aspect-square overflow-hidden', fieldMode ? 'bg-nb-black' : 'bg-nb-cream')}>
                {#if thumbnailUrl}
                  <img
                    src={thumbnailUrl}
                    alt={label}
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                {:else}
                  <div class="w-full h-full flex items-center justify-center">
                    <Icon name="image" class={cn('text-3xl', cx.textMuted || 'text-nb-black/30')} />
                  </div>
                {/if}
              </div>

              <!-- Label bar -->
              <div class="px-2 py-1.5 min-h-[2rem] flex items-center gap-1">
                <span class={cn('text-xs truncate flex-1', cx.text || 'text-nb-black')}>
                  {label}
                </span>
                {#if hasIssues}
                  <span class="w-2 h-2 rounded-full bg-nb-red shrink-0" title="Has validation issues"></span>
                {/if}
              </div>

              <!-- Selection checkbox overlay -->
              {#if selected}
                <div class={cn(
                  'absolute top-1.5 left-1.5 w-5 h-5 flex items-center justify-center rounded-sm',
                  fieldMode ? 'bg-nb-yellow text-nb-black' : 'bg-nb-blue text-nb-white'
                )}>
                  <Icon name="check" class="text-sm" />
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else if view === 'list'}
        <!-- List view -->
        <div class="p-6 pb-8">
          <table class={cn('w-full text-sm', cx.text)} role="grid" aria-multiselectable="true">
            <thead>
              <tr class={cn('border-b-2', cx.divider || 'border-nb-black/20')}>
                <th class="text-left py-2 px-3 font-mono text-xs uppercase tracking-wider font-bold w-12"></th>
                <th class="text-left py-2 px-3 font-mono text-xs uppercase tracking-wider font-bold">Name</th>
                <th class="text-left py-2 px-3 font-mono text-xs uppercase tracking-wider font-bold hidden md:table-cell">Size</th>
                <th class="text-left py-2 px-3 font-mono text-xs uppercase tracking-wider font-bold hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredCanvases as canvas (canvas.id)}
                {@const selected = selectedIds.has(canvas.id)}
                {@const active = activeItem?.id === canvas.id}
                {@const thumbnailUrl = getThumbnailUrl(canvas)}
                {@const label = getLabel(canvas)}
                <tr
                  aria-selected={selected}
                  class={cn(
                    'border-b cursor-pointer transition-nb',
                    cx.divider || 'border-nb-black/10',
                    selected && (cx.selected || 'bg-nb-blue/10'),
                    active && (fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-blue/15'),
                    !selected && !active && 'hover:bg-nb-black/5'
                  )}
                  onclick={(e) => handleItemClick(e, canvas)}
                  ondblclick={() => onOpen(canvas)}
                  oncontextmenu={(e) => handleContextMenu(e, canvas)}
                >
                  <td class="py-2 px-3">
                    <div class="w-8 h-8 overflow-hidden bg-nb-cream/80">
                      {#if thumbnailUrl}
                        <img src={thumbnailUrl} alt="" class="w-full h-full object-cover" loading="lazy" />
                      {:else}
                        <div class="w-full h-full flex items-center justify-center">
                          <Icon name="image" class={cn('text-sm', cx.textMuted)} />
                        </div>
                      {/if}
                    </div>
                  </td>
                  <td class="py-2 px-3">
                    <span class="font-medium">{label}</span>
                  </td>
                  <td class={cn('py-2 px-3 hidden md:table-cell', cx.textMuted)}>
                    {#if (canvas as IIIFCanvas).width && (canvas as IIIFCanvas).height}
                      {(canvas as IIIFCanvas).width} x {(canvas as IIIFCanvas).height}
                    {:else}
                      --
                    {/if}
                  </td>
                  <td class={cn('py-2 px-3 hidden lg:table-cell', cx.textMuted)}>
                    {canvas.navDate || '--'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else if view === 'grouped'}
        <!-- Grouped view: group canvases by parent manifest -->
        <!-- @migration: GroupedArchiveGrid component would be imported here -->
        <div class="p-6 pb-8">
          {#each groupCanvasesByManifest(root) as group (group.manifestId)}
            <div class="mb-6">
              <h3 class={cn('font-mono text-xs font-bold uppercase tracking-wider mb-3 px-1', cx.textMuted)}>
                {group.manifestLabel}
                <span class="ml-1 opacity-50">({group.canvases.length})</span>
              </h3>
              <div class={cn(
                'grid gap-2',
                fieldMode ? 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]'
              )}>
                {#each group.canvases as canvas (canvas.id)}
                  {@const selected = selectedIds.has(canvas.id)}
                  {@const thumbnailUrl = getThumbnailUrl(canvas)}
                  {@const label = getLabel(canvas)}
                  <div
                    role="gridcell"
                    aria-selected={selected}
                    class={cn(
                      'flex flex-col overflow-hidden cursor-pointer transition-nb',
                      cx.thumbnailBg || 'bg-nb-cream border-2 border-nb-black',
                      selected && (cx.selected || 'ring-2 ring-nb-blue')
                    )}
                    onclick={(e) => handleItemClick(e, canvas)}
                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleItemClick(e as unknown as MouseEvent, canvas); }}
                    ondblclick={() => onOpen(canvas)}
                    oncontextmenu={(e) => handleContextMenu(e, canvas)}
                    tabindex="0"
                  >
                    <div class={cn('aspect-square overflow-hidden', fieldMode ? 'bg-nb-black' : 'bg-nb-cream')}>
                      {#if thumbnailUrl}
                        <img src={thumbnailUrl} alt={label} class="w-full h-full object-cover" loading="lazy" />
                      {:else}
                        <div class="w-full h-full flex items-center justify-center">
                          <Icon name="image" class={cn('text-3xl', cx.textMuted || 'text-nb-black/30')} />
                        </div>
                      {/if}
                    </div>
                    <div class="px-2 py-1.5">
                      <span class={cn('text-xs truncate block', cx.text)}>{label}</span>
                    </div>
                    {#if selected}
                      <div class={cn(
                        'absolute top-1.5 left-1.5 w-5 h-5 flex items-center justify-center rounded-sm',
                        fieldMode ? 'bg-nb-yellow text-nb-black' : 'bg-nb-blue text-nb-white'
                      )}>
                        <Icon name="check" class="text-sm" />
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if !filmstripMode && filteredCanvases.length === 0 && canvases.length > 0}
        <!-- Filter produced no results -->
        <Center class="py-16">
          <div class="text-center">
            <Icon name="search_off" class={cn('text-4xl mb-2', cx.textMuted)} />
            <p class={cn('text-sm', cx.textMuted)}>
              No items match "{filter}"
            </p>
            <Button variant="ghost" size="sm" onclick={() => (filter = '')} class="mt-2">
              Clear filter
            </Button>
          </div>
        </Center>
      {/if}
    {/snippet}
  </PaneLayout>

  <!-- Context Menu overlay -->
  {#if contextMenu}
    <div
      class="fixed inset-0 z-[200]"
      onclick={() => (contextMenu = null)}
      oncontextmenu={(e) => { e.preventDefault(); contextMenu = null; }}
      role="presentation"
    >
      <div
        class={cn(
          'absolute z-[201] min-w-[180px] py-1 shadow-brutal-lg border-2',
          fieldMode
            ? 'bg-nb-black border-nb-yellow text-nb-yellow'
            : 'bg-nb-white border-nb-black text-nb-black'
        )}
        style:left="{contextMenu.x}px"
        style:top="{contextMenu.y}px"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => { if (e.key === 'Escape') contextMenu = null; }}
        role="menu"
        aria-label="Canvas context menu"
        tabindex="0"
      >
        <button
          type="button"
          class={cn(
            'w-full text-left px-4 py-2 text-sm flex items-center gap-3 cursor-pointer',
            fieldMode ? 'hover:bg-nb-yellow/20' : 'hover:bg-nb-cream'
          )}
          onclick={handleContextOpen}
          role="menuitem"
        >
          <Icon name="visibility" class="text-base" />
          Open in Viewer
        </button>
        <button
          type="button"
          class={cn(
            'w-full text-left px-4 py-2 text-sm flex items-center gap-3 cursor-pointer',
            fieldMode ? 'hover:bg-nb-yellow/20' : 'hover:bg-nb-cream'
          )}
          onclick={handleContextToggleSelect}
          role="menuitem"
        >
          <Icon
            name={selectedIds.has(contextMenu.item.id) ? 'check_box' : 'check_box_outline_blank'}
            class="text-base"
          />
          {selectedIds.has(contextMenu.item.id) ? 'Deselect' : 'Select'}
        </button>

        <div class={cn('my-1', fieldMode ? 'border-t border-nb-yellow/30' : 'border-t border-nb-black/10')}></div>

        <button
          type="button"
          class={cn(
            'w-full text-left px-4 py-2 text-sm flex items-center gap-3 cursor-pointer',
            fieldMode ? 'hover:bg-nb-yellow/20' : 'hover:bg-nb-cream'
          )}
          onclick={() => { handleGroupIntoManifest(); contextMenu = null; }}
          role="menuitem"
        >
          <Icon name="auto_stories" class="text-base" />
          Group into Manifest
        </button>
        <button
          type="button"
          class={cn(
            'w-full text-left px-4 py-2 text-sm flex items-center gap-3 cursor-pointer',
            fieldMode ? 'hover:bg-nb-yellow/20' : 'hover:bg-nb-cream'
          )}
          onclick={() => { handleEditMetadata(); contextMenu = null; }}
          role="menuitem"
        >
          <Icon name="table_chart" class="text-base" />
          Edit in Catalog
        </button>
      </div>
    </div>
  {/if}
{/if}
