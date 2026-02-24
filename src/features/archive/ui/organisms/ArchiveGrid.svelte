<!--
  ArchiveGrid.svelte — Archive Grid Organism
  =============================================
  Virtualized grid display for archive canvas items with:
  - Virtual scrolling via visibleRange/columns/itemSize props
  - Hover preview card with 300ms delay
  - Lasso selection via use:gridLassoSelect action
  - Keyboard navigation (data-nav-id + ArrowKey handling)
  - Drag-drop reorder when reorderEnabled
  - Density controls (compact/comfortable/spacious)
  - Badge tooltips at mouse position
  - RTL support from IIIF viewingDirection
  - Empty state with optional filter context
  React source: src/features/archive/ui/organisms/ArchiveGrid.tsx
-->
<script module lang="ts">
  export type GridDensity = 'compact' | 'comfortable' | 'spacious';
  export type ViewingDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
</script>

<script lang="ts">
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import BlurUpThumbnail from '../molecules/BlurUpThumbnail.svelte';
  import HoverPreviewCard from '../molecules/HoverPreviewCard.svelte';
  import { gridLassoSelect, type LassoRect } from '../../actions/gridLassoSelect';
  import { resolveHierarchicalThumbs } from '@/utils/imageSourceResolver';
  import { getFileDNA, type FileDNA } from '@/src/features/archive/model';
  import { RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';
  import { cn } from '@/src/shared/lib/cn';

  import type { ValidatorIssue } from '@/src/shared/types';

  interface Props {
    /** Canvas items to render */
    items: IIIFCanvas[];
    /** Visible range for virtualization */
    visibleRange: { start: number; end: number };
    /** Number of columns in the grid */
    columns: number;
    /** Size of each grid item */
    itemSize: { width: number; height: number };
    /** Check if an item is selected */
    isSelected: (id: string) => boolean;
    /** Click handler for an item (normal selection) */
    onItemClick: (e: MouseEvent | KeyboardEvent, asset: IIIFCanvas) => void;
    /** Toggle selection for multiselect (checkmark click) */
    onToggleSelect?: (id: string) => void;
    /** Context menu handler */
    onContextMenu: (e: MouseEvent, id: string) => void;
    /** Contextual styles from template */
    cx: {
      surface: string;
      text: string;
      accent: string;
      border: string;
      divider: string;
      headerBg: string;
      textMuted: string;
      input: string;
      label: string;
      active: string;
      inactive: string;
      warningBg: string;
      thumbnailBg?: string;
      [key: string]: string | undefined;
    };
    /** Current field mode */
    fieldMode: boolean;
    /** Whether mobile layout is active */
    isMobile: boolean;
    /** Active item for detail panel */
    activeItem: IIIFCanvas | null;
    /** Current filter term */
    filter?: string;
    /** Callback to clear filter */
    onClearFilter?: () => void;
    /** Grid density control */
    density?: GridDensity;
    /** Callback when density changes */
    onDensityChange?: (density: GridDensity) => void;
    /** Whether reordering is enabled (when viewer is closed) */
    reorderEnabled?: boolean;
    /** Callback when items are reordered via drag-and-drop */
    onReorder?: (fromIndex: number, toIndex: number) => void;
    /** IIIF viewingDirection from manifest */
    viewingDirection?: ViewingDirection;
    /** Validation issues keyed by item ID */
    validationIssues?: Record<string, ValidatorIssue[]>;
    /** Open/activate handler (Enter key) */
    onOpen?: (id: string) => void;
    /** Lasso selection handler (multiple IDs selected) */
    onLassoSelect?: (ids: string[]) => void;
    /** Additional class */
    class?: string;
  }

  let {
    items,
    visibleRange,
    columns,
    itemSize,
    isSelected,
    onItemClick,
    onToggleSelect,
    onContextMenu,
    cx,
    fieldMode,
    isMobile,
    activeItem,
    filter,
    onClearFilter,
    density = 'comfortable',
    onDensityChange,
    reorderEnabled = false,
    onReorder,
    viewingDirection = 'left-to-right',
    validationIssues,
    onOpen,
    onLassoSelect,
    class: className = '',
  }: Props = $props();

  // ── Derived layout computations ──

  const isRTL = $derived(viewingDirection === 'right-to-left');
  const directionStyle = $derived(isRTL ? 'direction: rtl' : '');
  const directionLabel = $derived(
    viewingDirection === 'right-to-left' ? 'RTL'
    : viewingDirection === 'top-to-bottom' ? 'TTB'
    : viewingDirection === 'bottom-to-top' ? 'BTT'
    : ''
  );
  const directionArrow = $derived(
    viewingDirection === 'right-to-left' ? '\u2190'
    : viewingDirection === 'top-to-bottom' ? '\u2193'
    : viewingDirection === 'bottom-to-top' ? '\u2191'
    : ''
  );

  const gap = 16;
  const rowHeight = $derived(itemSize.height + gap);
  const totalRows = $derived(Math.ceil(items.length / columns));

  const startRow = $derived(Math.floor(visibleRange.start / columns));
  const topSpacer = $derived(startRow * rowHeight);

  const visibleItems = $derived(items.slice(visibleRange.start, visibleRange.end));
  const endRow = $derived(Math.ceil(visibleRange.end / columns));
  const bottomSpacer = $derived(Math.max(0, (totalRows - endRow) * rowHeight));

  const gridColsClass = $derived(
    fieldMode
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
  );

  const DENSITY_CLASSES: Record<GridDensity, string> = {
    compact: 'gap-2',
    comfortable: 'gap-4',
    spacious: 'gap-6',
  };

  const PADDING_CLASSES: Record<GridDensity, string> = {
    compact: 'p-1',
    comfortable: 'p-2',
    spacious: 'p-3',
  };

  const DENSITY_OPTIONS: GridDensity[] = ['compact', 'comfortable', 'spacious'];

  // ── Hover state ──

  let hoveredId = $state<string | null>(null);
  let badgeTooltip = $state<{ text: string; x: number; y: number } | null>(null);

  // Hover preview state
  let hoverPreview = $state<{ canvas: IIIFCanvas; rect: DOMRect } | null>(null);
  let hoverTimer: ReturnType<typeof setTimeout> | null = $state(null);

  function handleHoverEnter(asset: IIIFCanvas, e: MouseEvent) {
    hoveredId = asset.id;
    const target = e.currentTarget as HTMLElement;
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      hoverPreview = { canvas: asset, rect: target.getBoundingClientRect() };
    }, 300);
  }

  function handleHoverLeave() {
    hoveredId = null;
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = null;
    hoverPreview = null;
  }

  // Clean up hover timer on unmount
  $effect(() => {
    return () => {
      if (hoverTimer) clearTimeout(hoverTimer);
    };
  });

  // ── Lasso selection ──

  let lassoRect = $state<LassoRect | null>(null);
  let isLassoing = $derived(lassoRect !== null);

  // Container ref for lasso action
  let containerEl: HTMLElement | undefined = $state();

  // ── Keyboard navigation ──

  let focusedId = $state<string | null>(null);

  function handleContainerKeyDown(e: KeyboardEvent) {
    if (!items.length) return;
    const currentIndex = focusedId ? items.findIndex(i => i.id === focusedId) : -1;

    let nextIndex: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : currentIndex;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
        break;
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = currentIndex + columns < items.length ? currentIndex + columns : currentIndex;
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = currentIndex - columns >= 0 ? currentIndex - columns : currentIndex;
        break;
      case 'Enter':
        if (focusedId) onOpen?.(focusedId);
        return;
      case ' ':
        e.preventDefault();
        if (focusedId) onToggleSelect?.(focusedId);
        return;
      default:
        return;
    }

    if (nextIndex !== null && nextIndex >= 0 && nextIndex < items.length) {
      focusedId = items[nextIndex].id;
    }
  }

  // Scroll focused item into view
  $effect(() => {
    if (!focusedId) return;
    const el = containerEl?.querySelector(`[data-nav-id="${focusedId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  // ── Drag and drop state ──

  let draggedIndex = $state<number | null>(null);
  let dropTargetIndex = $state<number | null>(null);

  function handleDragStart(e: DragEvent, index: number) {
    if (!reorderEnabled || !onReorder) return;
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', String(index));
    draggedIndex = index;
  }

  function handleDragOver(e: DragEvent, index: number) {
    if (!reorderEnabled || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    if (dropTargetIndex !== index) {
      dropTargetIndex = index;
    }
  }

  function handleDragLeave(e: DragEvent) {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget?.closest?.('[data-grid-item]')) {
      dropTargetIndex = null;
    }
  }

  function handleDrop(e: DragEvent, toIndex: number) {
    e.preventDefault();
    if (!reorderEnabled || draggedIndex === null || !onReorder) return;
    if (draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
    }
    draggedIndex = null;
    dropTargetIndex = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dropTargetIndex = null;
  }

  // ── Helper: resolve item data ──

  function getItemData(asset: IIIFCanvas) {
    const dna = getFileDNA(asset);
    const thumbUrls = resolveHierarchicalThumbs(asset, 200);
    const lowResUrls = resolveHierarchicalThumbs(asset, 50);
    const config = RESOURCE_TYPE_CONFIG['Canvas'];
    return { dna, thumbUrls, lowResUrls, config };
  }
</script>

<div
  class={cn('relative', className)}
  bind:this={containerEl}
  use:gridLassoSelect={{
    enabled: !reorderEnabled,
    onSelect: onLassoSelect,
    onUpdate: (rect) => { lassoRect = rect; },
  }}
  onkeydown={handleContainerKeyDown}
  role="grid"
  aria-label="Archive grid"
  aria-multiselectable="true"
  tabindex="0"
>
  <!-- Lasso selection overlay -->
  {#if isLassoing && lassoRect}
    <svg
      class="fixed inset-0 z-40 pointer-events-none"
      style="width: 100vw; height: 100vh"
    >
      <rect
        x={lassoRect.x}
        y={lassoRect.y}
        width={lassoRect.width}
        height={lassoRect.height}
        fill={fieldMode ? 'rgba(234,179,8,0.15)' : 'rgba(59,130,246,0.15)'}
        stroke={fieldMode ? '#eab308' : '#3b82f6'}
        stroke-dasharray="4 2"
        stroke-width="1.5"
      />
    </svg>
  {/if}

  <!-- Density controls toolbar -->
  <div class="flex items-center justify-end gap-2 mb-4">
    {#if directionLabel}
      <span class={cn(
        'text-nb-micro font-bold uppercase px-1.5 py-0.5',
        fieldMode ? 'bg-nb-black text-nb-yellow' : 'bg-nb-purple/10 text-nb-purple'
      )}>
        {directionArrow} {directionLabel}
      </span>
    {/if}
    <span class="text-xs text-nb-black/50">View:</span>
    <div class="flex items-center bg-nb-black p-0.5">
      {#each DENSITY_OPTIONS as d (d)}
        <Button
          variant="ghost"
          size="bare"
          onclick={() => onDensityChange?.(d)}
          class={cn(
            'px-2 py-1 text-xs font-medium transition-nb',
            density === d
              ? 'bg-nb-black/70 text-nb-black shadow-brutal-sm'
              : 'text-nb-black/50 hover:text-nb-black/70'
          )}
          title={`${d.charAt(0).toUpperCase() + d.slice(1)} view`}
        >
          {#if d === 'compact'}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          {:else if d === 'comfortable'}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          {:else}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
            </svg>
          {/if}
        </Button>
      {/each}
    </div>
  </div>

  <!-- Top spacer for virtual scrolling -->
  {#if topSpacer > 0}
    <div style="height: {topSpacer}px" aria-hidden="true"></div>
  {/if}

  <!-- Grid -->
  <div class={cn('grid', DENSITY_CLASSES[density], gridColsClass)} style={directionStyle}>
    {#each visibleItems as asset, visualIndex (asset.id)}
      {@const selected = isSelected(asset.id)}
      {@const itemIndex = visibleRange.start + visualIndex}
      {@const isDragging = draggedIndex === itemIndex}
      {@const isDropTarget = dropTargetIndex === itemIndex && draggedIndex !== null && draggedIndex !== itemIndex}
      {@const isFocused = focusedId === asset.id}
      {@const { dna, thumbUrls, lowResUrls, config } = getItemData(asset)}
      <div
        data-grid-item
        data-item-id={asset.id}
        data-nav-id={asset.id}
        tabindex={isFocused ? 0 : -1}
        role="gridcell"
        aria-selected={selected}
        draggable={reorderEnabled && !!onReorder}
        ondragstart={(e) => handleDragStart(e, itemIndex)}
        ondragover={(e) => handleDragOver(e, itemIndex)}
        ondragleave={handleDragLeave}
        ondrop={(e) => handleDrop(e, itemIndex)}
        ondragend={handleDragEnd}
        oncontextmenu={(e) => onContextMenu(e, asset.id)}
        onclick={(e) => onItemClick(e, asset)}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onItemClick(e, asset); }}
        onmouseenter={(e) => handleHoverEnter(asset, e)}
        onmouseleave={handleHoverLeave}
        class={cn(
          'group relative transition-nb outline-none',
          PADDING_CLASSES[density],
          reorderEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          isDragging && 'opacity-50 scale-95',
          isDropTarget && (
            fieldMode
              ? 'ring-2 ring-nb-yellow ring-offset-2 ring-offset-black'
              : 'ring-2 ring-nb-blue ring-offset-2'
          ),
          isFocused && !isDropTarget && (
            fieldMode
              ? 'ring-2 ring-offset-1 ring-nb-yellow'
              : 'ring-2 ring-offset-1 ring-nb-blue'
          ),
          selected
            ? 'bg-nb-orange/20 border-2 border-nb-orange shadow-brutal-sm'
            : 'bg-nb-black border border-nb-black/20 hover:shadow-brutal hover:border-nb-black/20'
        )}
      >
        <!-- Thumbnail area -->
        <div class="aspect-square overflow-hidden flex items-center justify-center mb-2 relative bg-nb-black">
          <!-- Selection overlay -->
          {#if selected}
            <div class="absolute inset-0 bg-nb-orange/10 z-10 pointer-events-none"></div>
          {/if}

          <!-- Validation status dot -->
          {#if validationIssues?.[asset.id]}
            {@const issues = validationIssues[asset.id]}
            <div class="absolute top-2 left-2 z-20" title={`${issues.length} issue(s)`}>
              <div class={cn(
                'w-2.5 h-2.5 rounded-full shadow-brutal-sm',
                issues.some(i => i.level === 'error') ? 'bg-nb-red' : 'bg-nb-orange'
              )}></div>
            </div>
          {/if}

          <!-- Checkmark button for multiselect -->
          <Button
            variant="ghost"
            size="bare"
            onclick={(e) => { e.stopPropagation(); onToggleSelect?.(asset.id); }}
            class={cn(
              'absolute top-2 right-2 z-20 w-6 h-6 flex items-center justify-center transition-nb shadow-brutal-sm cursor-pointer',
              selected
                ? fieldMode
                  ? 'bg-nb-yellow text-white scale-100'
                  : 'bg-nb-orange text-white scale-100'
                : 'bg-nb-white/90 text-nb-black/40 scale-0 group-hover:scale-100 hover:bg-nb-cream'
            )}
            title={selected ? 'Deselect' : 'Select (add to selection)'}
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </Button>

          <!-- Thumbnail image -->
          {#if thumbUrls.length <= 1}
            <BlurUpThumbnail
              lowResUrl={lowResUrls[0] || ''}
              highResUrl={thumbUrls[0] || ''}
              fallbackIcon={config?.icon || 'image'}
              {cx}
              {fieldMode}
            />
          {:else}
            <!-- TODO(loop): Extract StackedThumbnail from BlurUpThumbnail for multi-thumb display -->
            <BlurUpThumbnail
              lowResUrl={lowResUrls[0] || ''}
              highResUrl={thumbUrls[0] || ''}
              fallbackIcon={config?.icon || 'image'}
              {cx}
              {fieldMode}
            />
          {/if}

          <!-- Metadata badges with tooltips -->
          <div class="absolute bottom-2 right-2 flex gap-1">
            {#if dna.hasTime}
              <Button
                variant="ghost"
                size="bare"
                class="w-5 h-5 bg-nb-orange text-white flex items-center justify-center shadow-brutal-sm hover:bg-nb-orange transition-nb"
                onmouseenter={(e: MouseEvent) => { badgeTooltip = { text: 'Has date/time metadata', x: e.clientX, y: e.clientY }; }}
                onmouseleave={() => { badgeTooltip = null; }}
                title="Has Time metadata"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
            {/if}
            {#if dna.hasLocation}
              <Button
                variant="ghost"
                size="bare"
                class="w-5 h-5 bg-nb-green text-white flex items-center justify-center shadow-brutal-sm hover:bg-nb-green transition-nb"
                onmouseenter={(e: MouseEvent) => { badgeTooltip = { text: 'Has GPS location data', x: e.clientX, y: e.clientY }; }}
                onmouseleave={() => { badgeTooltip = null; }}
                title="Has GPS metadata"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </Button>
            {/if}
            {#if dna.hasDevice}
              <Button
                variant="ghost"
                size="bare"
                class="w-5 h-5 bg-sky-500 text-white flex items-center justify-center shadow-brutal-sm hover:bg-sky-600 transition-nb"
                onmouseenter={(e: MouseEvent) => { badgeTooltip = { text: 'Has camera/device info', x: e.clientX, y: e.clientY }; }}
                onmouseleave={() => { badgeTooltip = null; }}
                title="Has Device metadata"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </Button>
            {/if}
            {#if asset.rights}
              <Button
                variant="ghost"
                size="bare"
                class="w-5 h-5 bg-nb-purple text-white flex items-center justify-center shadow-brutal-sm hover:bg-nb-purple/80 transition-nb"
                onmouseenter={(e: MouseEvent) => { badgeTooltip = { text: `Rights: ${asset.rights}`, x: e.clientX, y: e.clientY }; }}
                onmouseleave={() => { badgeTooltip = null; }}
                title={`Rights: ${asset.rights}`}
              >
                <Icon name="copyright" class="text-[10px]" />
              </Button>
            {/if}
          </div>
        </div>

        <!-- Filename label -->
        <div class="px-1 min-w-0 h-6 flex items-center">
          <div
            class="text-nb-xs font-medium truncate text-nb-black"
            title={getIIIFValue(asset.label)}
          >
            {getIIIFValue(asset.label)}
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Bottom spacer for virtual scrolling -->
  {#if bottomSpacer > 0}
    <div style="height: {bottomSpacer}px" aria-hidden="true"></div>
  {/if}

  <!-- Empty state -->
  {#if items.length === 0}
    <div class="p-12 text-center">
      <div class="w-16 h-16 mx-auto mb-4 bg-nb-black flex items-center justify-center">
        <svg class="w-8 h-8 text-nb-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div class="text-lg font-medium text-nb-black mb-2">
        {filter ? 'No matching items found' : 'Your archive is empty'}
      </div>
      <p class="text-sm text-nb-black/50 max-w-sm mx-auto">
        {#if filter}
          Try adjusting your search for "{filter}" or clear the filter to see all items.
        {:else}
          Import photos and documents to start building your archive.
        {/if}
      </p>
      {#if filter && onClearFilter}
        <Button
          variant="primary"
          size="sm"
          onclick={onClearFilter}
          class="mt-6"
        >
          Clear Filter
        </Button>
      {/if}
    </div>
  {/if}

  <!-- Badge tooltip (fixed position at mouse) -->
  {#if badgeTooltip}
    <div
      class="fixed z-50 px-2 py-1 bg-nb-black text-white text-xs shadow-brutal pointer-events-none"
      style="left: {badgeTooltip.x}px; top: {badgeTooltip.y - 30}px"
    >
      {badgeTooltip.text}
    </div>
  {/if}

  <!-- Hover preview card -->
  <HoverPreviewCard
    canvas={hoverPreview?.canvas ?? null}
    visible={!!hoverPreview}
    anchorRect={hoverPreview?.rect ?? null}
    validationIssues={hoverPreview?.canvas ? validationIssues?.[hoverPreview.canvas.id] : undefined}
    {cx}
    {fieldMode}
  />
</div>
