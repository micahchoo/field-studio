<!--
  BoardNode.svelte — Positioned Board Item Card
  ===============================================
  React source: src/features/board-design/ui/atoms/BoardNode.tsx (256 lines)

  Purpose: Renders a positioned card for each board item. Supports multiple
  resource types (Canvas, Manifest, Collection, Range, Note) with type-specific
  visual treatments. Composes TypeBadge, ContentTypeIcon, ItemBadge atoms.

  Architecture notes:
  - Arch 5.D: Receives cx (ContextualClassNames) and fieldMode props
  - Arch 2.D: Static Tailwind maps for type-specific classes (no interpolation)
  - Arch 2.G: Uses native HTML button elements for anchors/handles
  - Arch 2.F: Static config maps go in <script module> block
  - Event handlers: lowercase (onmousedown, ondblclick, oncontextmenu, etc.)
  - Composes: TypeBadge, ContentTypeIcon, ItemBadge (imported atoms)

  Svelte 5 patterns:
  - $props() destructuring for all props
  - {#if}/{:else if}/{:else} for type-variant rendering
  - Inline event handlers with stopPropagation via wrapper functions
  - Snippet not needed — child content is built-in, not passed from parent
-->
<script module lang="ts">
  // Arch 2.F: Static data in module block — shared across all instances
  // Arch 2.D: Full static Tailwind class strings (no interpolation)

  const NOTE_CLASSES = 'bg-nb-yellow/90 border-2 border-nb-yellow';

  const COLLECTION_CLASSES = {
    field: 'border-2 border-dashed border-nb-purple/50 bg-nb-black',
    default: 'border-2 border-dashed border-nb-purple/30 bg-nb-white',
  } as const;

  const RANGE_CLASSES = {
    field: 'border-l-4 border-l-cyan-600 bg-nb-black border-t border-r border-b border-nb-black/60',
    default: 'border-l-4 border-l-cyan-600 bg-nb-white border-t border-r border-b border-nb-black/10',
  } as const;

  const MANIFEST_ACCENT = {
    field: 'bg-gradient-to-r from-nb-blue/20 to-transparent',
    default: 'bg-gradient-to-r from-nb-blue/10 to-transparent',
  } as const;

  const RESIZE_HANDLE_COLORS = {
    field: 'bg-nb-orange',
    default: 'bg-iiif-blue',
  } as const;

  const RING_CLASSES = {
    field: 'ring-nb-yellow ring-offset-nb-black',
    default: 'ring-iiif-blue ring-offset-white',
  } as const;

  const ANCHOR_POSITIONS = [
    { cls: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' },
    { cls: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2' },
    { cls: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' },
    { cls: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2' },
  ] as const;

  const RESIZE_HANDLES = [
    { direction: 'se', cls: 'bottom-0 right-0 cursor-se-resize' },
    { direction: 'sw', cls: 'bottom-0 left-0 cursor-sw-resize' },
    { direction: 'ne', cls: 'top-0 right-0 cursor-ne-resize' },
    { direction: 'nw', cls: 'top-0 left-0 cursor-nw-resize' },
  ] as const;
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { BoardItem } from '../../model';
  import { formatDuration } from '../../model';
  import TypeBadge from './TypeBadge.svelte';
  import ContentTypeIcon from './ContentTypeIcon.svelte';
  import ItemBadge from './ItemBadge.svelte';

  interface Props {
    id: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    resource: BoardItem;
    selected: boolean;
    connectingFrom: boolean;
    onSelect: (id: string) => void;
    onDragStart: (id: string, offset: { x: number; y: number }) => void;
    onConnectStart: (id: string) => void;
    onResizeStart?: (id: string, direction: string, startPos: { x: number; y: number }, startSize: { w: number; h: number }) => void;
    onDoubleClick?: (id: string) => void;
    onContextMenu?: (e: MouseEvent, id: string) => void;
    onHover?: (id: string | null) => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    id,
    position,
    size,
    resource,
    selected,
    connectingFrom,
    onSelect,
    onDragStart,
    onConnectStart,
    onResizeStart,
    onDoubleClick,
    onContextMenu,
    onHover,
    cx,
    fieldMode,
  }: Props = $props();

  // Derived state
  const isNote = $derived(resource.isNote);
  const isCollection = $derived(resource.resourceType === 'Collection');
  const isManifest = $derived(resource.resourceType === 'Manifest');
  const isRange = $derived(resource.resourceType === 'Range');
  const meta = $derived(resource.meta);
  const contentType = $derived(meta?.contentType || 'Unknown');

  // Arch 2.D: Select from static maps, never interpolate
  const typeClasses = $derived(
    isNote ? NOTE_CLASSES
    : isCollection ? (fieldMode ? COLLECTION_CLASSES.field : COLLECTION_CLASSES.default)
    : isRange ? (fieldMode ? RANGE_CLASSES.field : RANGE_CLASSES.default)
    : fieldMode ? 'bg-nb-black' : 'bg-nb-white'
  );

  const headerAccent = $derived(
    isManifest ? (fieldMode ? MANIFEST_ACCENT.field : MANIFEST_ACCENT.default) : ''
  );

  const resizeHandleColor = $derived(
    fieldMode ? RESIZE_HANDLE_COLORS.field : RESIZE_HANDLE_COLORS.default
  );

  const ringClasses = $derived(
    !isNote && !isCollection && !isRange
      ? (fieldMode ? RING_CLASSES.field : RING_CLASSES.default)
      : ''
  );

  // Event handlers (lowercase per Svelte convention)
  function handleMouseDown(e: MouseEvent) {
    e.stopPropagation();
    onSelect(id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onDragStart(id, { x: offsetX, y: offsetY });
  }

  function handleAnchorClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    onConnectStart(id);
  }

  function handleResizeMouseDown(e: MouseEvent, direction: string) {
    e.stopPropagation();
    e.preventDefault();
    onResizeStart?.(id, direction, { x: e.clientX, y: e.clientY }, { w: size.width, h: size.height });
  }

  function handleDblClick(e: MouseEvent) {
    e.stopPropagation();
    onDoubleClick?.(id);
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class={cn(
    'absolute shadow-brutal cursor-move transition-shadow',
    selected && 'ring-2 ring-offset-2',
    connectingFrom && 'ring-2 ring-nb-yellow',
    typeClasses,
    ringClasses,
  )}
  style:left="{position.x}px"
  style:top="{position.y}px"
  style:width="{size.width}px"
  style:height="{size.height}px"
  onmousedown={handleMouseDown}
  ondblclick={handleDblClick}
  oncontextmenu={handleContextMenu}
  onmouseenter={() => onHover?.(id)}
  onmouseleave={() => onHover?.(null)}
>
  {#if isNote}
    <!-- Yellow sticky note card -->
    <div class="p-3 h-full flex flex-col">
      <p class="text-xs text-nb-black/80 whitespace-pre-wrap break-words">
        {resource.annotation?.substring(0, 120) || resource.label}
      </p>
    </div>
  {:else}
    <!-- Thumbnail area -->
    <div class={cn(
      'relative h-24 flex items-center justify-center overflow-hidden',
      cx.placeholderBg,
      headerAccent,
    )}>
      {#if resource.blobUrl}
        <img
          src={resource.blobUrl}
          alt={resource.label}
          loading="lazy"
          class="w-full h-full object-cover"
        />
      {:else if isCollection}
        <span class="material-symbols-outlined text-3xl text-nb-purple/40" aria-hidden="true">folder</span>
      {:else if isRange}
        <span class="material-symbols-outlined text-3xl text-cyan-600/40" aria-hidden="true">folder_special</span>
      {:else if contentType === 'Audio'}
        <span class="material-symbols-outlined text-3xl text-nb-orange/40" aria-hidden="true">audiotrack</span>
      {:else}
        <span class="material-symbols-outlined text-3xl text-nb-black/20" aria-hidden="true">image</span>
      {/if}

      <!-- Video/Audio play overlay -->
      {#if (contentType === 'Video' || contentType === 'Audio') && resource.blobUrl}
        <div class="absolute inset-0 flex items-center justify-center bg-nb-black/30">
          <span class="material-symbols-outlined text-2xl text-nb-white/80" aria-hidden="true">play_arrow</span>
        </div>
      {/if}

      <!-- Type badge (top-left) -->
      <div class="absolute top-1 left-1">
        <TypeBadge resourceType={resource.resourceType} {cx} {fieldMode} />
      </div>

      <!-- Content type icon (top-right) -->
      {#if meta?.contentType}
        <div class="absolute top-1 right-1">
          <ContentTypeIcon contentType={meta.contentType} {cx} {fieldMode} />
        </div>
      {/if}

      <!-- Item badges (bottom-right): canvasCount, itemCount, duration -->
      <div class="absolute bottom-1 right-1 flex flex-col items-end gap-0.5">
        {#if meta?.canvasCount != null && meta.canvasCount > 0}
          <ItemBadge value="{meta.canvasCount} canvases" icon="layers" {cx} {fieldMode} />
        {/if}
        {#if meta?.itemCount != null && meta.itemCount > 0}
          <ItemBadge value="{meta.itemCount} items" icon="folder" {cx} {fieldMode} />
        {/if}
        {#if meta?.duration != null}
          <ItemBadge value={formatDuration(meta.duration)} icon="schedule" {cx} {fieldMode} />
        {/if}
      </div>
    </div>

    <!-- Label -->
    <div class="p-2">
      <p class={cn(
        'text-xs truncate',
        fieldMode ? 'text-nb-white/80' : 'text-nb-black/80',
      )}>
        {resource.label}
      </p>
      {#if isRange && meta?.rangeChildIds && meta.rangeChildIds.length > 0}
        <p class={cn(
          'text-[10px] mt-0.5',
          fieldMode ? 'text-cyan-400/60' : 'text-cyan-600/60',
        )}>
          {meta.rangeChildIds.length} canvases
        </p>
      {/if}
    </div>
  {/if}

  <!-- Connection anchor points (visible when selected) -->
  {#if selected}
    {#each ANCHOR_POSITIONS as anchor}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute w-2 h-2 rounded-full bg-nb-yellow cursor-crosshair {anchor.cls}"
        onmousedown={handleAnchorClick}
      />
    {/each}
  {/if}

  <!-- Resize handles (visible when selected and onResizeStart provided) -->
  {#if selected && onResizeStart}
    {#each RESIZE_HANDLES as handle}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute w-2.5 h-2.5 {resizeHandleColor} {handle.cls}"
        onmousedown={(e: MouseEvent) => handleResizeMouseDown(e, handle.direction)}
      />
    {/each}
  {/if}
</div>
