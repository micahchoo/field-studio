<!--
  ArchiveList.svelte — Archive List/Table Organism
  ==================================================
  Table view for archive items with sortable columns.
  Displays metadata per item in a scannable format.
  Features:
  - Sortable column headers (label, type, date, dimensions)
  - Row selection with visual feedback
  - Thumbnail preview in first column
  - Drag-drop reorder when enabled
  - Validation issue indicators
  - Field mode support
  - Footer stats bar
  React source: src/features/archive/ui/organisms/ArchiveList.tsx
-->
<script module lang="ts">
  export type SortColumn = 'label' | 'type' | 'date' | 'dimensions' | 'size';
  export type SortDirection = 'asc' | 'desc';
</script>

<script lang="ts">
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import EmptyState from '@/src/shared/ui/molecules/EmptyState.svelte';
  import { resolveHierarchicalThumbs } from '@/utils/imageSourceResolver';
  import { getFileDNA } from '@/src/features/archive/model';
  import { cn } from '@/src/shared/lib/cn';

  import type { TreeValidationIssue } from '@/src/shared/types';

  // Column configuration
  const COLUMNS: { key: SortColumn; label: string; width: string; align?: 'left' | 'center' | 'right' }[] = [
    { key: 'label', label: 'Name', width: 'flex-1' },
    { key: 'type', label: 'Type', width: 'w-24', align: 'center' },
    { key: 'date', label: 'Date', width: 'w-32' },
    { key: 'dimensions', label: 'Dimensions', width: 'w-28', align: 'right' },
  ];

  // Empty state config
  const EMPTY_STATE = {
    icon: 'inbox',
    title: 'No Items',
    description: 'This area is empty. Add items to get started.',
  };

  interface Props {
    /** Canvas items to render */
    items: IIIFCanvas[];
    /** Check if an item is selected */
    isSelected: (id: string) => boolean;
    /** Click handler for an item */
    onItemClick: (e: MouseEvent | KeyboardEvent, asset: IIIFCanvas) => void;
    /** Double-click handler */
    onItemDoubleClick?: (asset: IIIFCanvas) => void;
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
      [key: string]: string | undefined;
    };
    /** Current field mode */
    fieldMode: boolean;
    /** Active item for detail panel */
    activeItem: IIIFCanvas | null;
    /** Whether reordering is enabled */
    reorderEnabled?: boolean;
    /** Callback when items are reordered */
    onReorder?: (fromIndex: number, toIndex: number) => void;
    /** Validation issues keyed by item ID */
    validationIssues?: Record<string, TreeValidationIssue[]>;
    /** Additional class */
    class?: string;
  }

  let {
    items,
    isSelected,
    onItemClick,
    onItemDoubleClick,
    onContextMenu,
    cx,
    fieldMode,
    activeItem,
    reorderEnabled = false,
    onReorder,
    validationIssues,
    class: className = '',
  }: Props = $props();

  // ── Sort state ──

  let sortColumn = $state<SortColumn>('label');
  let sortDirection = $state<SortDirection>('asc');

  // ── Drag and drop state ──

  let draggedIndex = $state<number | null>(null);
  let dropTargetIndex = $state<number | null>(null);

  // ── Sort logic ──

  /** Get sort value for a canvas based on column */
  function getSortValue(canvas: IIIFCanvas, column: SortColumn): string | number {
    switch (column) {
      case 'label':
        return getIIIFValue(canvas.label, 'en') || 'Untitled';
      case 'type':
        return canvas.type || 'Canvas';
      case 'date': {
        if (canvas.navDate) return canvas.navDate;
        const dateMeta = canvas.metadata?.find((m) => {
          const label = getIIIFValue(m.label, 'en')?.toLowerCase();
          return label?.includes('date');
        });
        return dateMeta?.value?.en?.[0] || '';
      }
      case 'dimensions':
      case 'size':
        return (canvas.width || 0) * (canvas.height || 0);
      default:
        return '';
    }
  }

  /** Sorted items — disabled when reorder mode is enabled to preserve manual order */
  const sortedItems = $derived.by(() => {
    if (reorderEnabled) return items;

    const sorted = [...items].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  });

  // ── Event handlers ──

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  }

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

  function handleDragLeave() {
    // Don't clear immediately to prevent flickering
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
</script>

{#if items.length === 0}
  <!-- Empty state -->
  <EmptyState
    icon={EMPTY_STATE.icon}
    title={EMPTY_STATE.title}
    description={EMPTY_STATE.description}
    {cx}
  />
{:else}
  <div class={cn('flex-1 overflow-auto', cx.surface, className)}>
    <table class="w-full border-collapse">
      <!-- Header -->
      <thead class={cn('sticky top-0 z-10', fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-cream')}>
        <tr>
          <!-- Drag handle column (only when reorder enabled) -->
          {#if reorderEnabled}
            <th class={cn('w-8 px-1 py-3 border-b', cx.border)}></th>
          {/if}

          <!-- Thumbnail column -->
          <th class={cn('w-16 px-3 py-3 border-b', cx.border)}></th>

          <!-- Data columns -->
          {#each COLUMNS as col (col.key)}
            <th
              class={cn(
                'px-3 py-3 border-b text-left text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-nb-black/5 transition-nb',
                cx.border,
                col.width,
                col.align === 'center' && 'text-center',
                col.align === 'right' && 'text-right',
                cx.textMuted
              )}
              onclick={() => handleSort(col.key)}
            >
              <span class="inline-flex items-center gap-1">
                {col.label}
                {#if sortColumn === col.key}
                  <Icon
                    name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    class="text-xs"
                  />
                {/if}
              </span>
            </th>
          {/each}

          <!-- Actions column -->
          <th class={cn('w-12 px-3 py-3 border-b', cx.border)}></th>
        </tr>
      </thead>

      <!-- Body -->
      <tbody>
        {#each sortedItems as canvas, index (canvas.id)}
          {@const selected = isSelected(canvas.id)}
          {@const active = activeItem?.id === canvas.id}
          {@const label = getIIIFValue(canvas.label, 'en') || 'Untitled'}
          {@const thumbUrls = resolveHierarchicalThumbs(canvas, 100)}
          {@const thumbUrl = thumbUrls[0] || ''}
          {@const isDragging = draggedIndex === index}
          {@const isDropTarget = dropTargetIndex === index && draggedIndex !== null && draggedIndex !== index}
          <tr
            draggable={reorderEnabled && !!onReorder}
            ondragstart={(e) => handleDragStart(e, index)}
            ondragover={(e) => handleDragOver(e, index)}
            ondragleave={handleDragLeave}
            ondrop={(e) => handleDrop(e, index)}
            ondragend={handleDragEnd}
            onclick={(e) => onItemClick(e, canvas)}
            ondblclick={() => onItemDoubleClick?.(canvas)}
            oncontextmenu={(e) => onContextMenu(e, canvas.id)}
            class={cn(
              'border-b transition-nb',
              cx.border,
              reorderEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
              isDragging && 'opacity-50',
              isDropTarget && (
                fieldMode
                  ? 'ring-2 ring-inset ring-nb-yellow bg-nb-yellow/10'
                  : 'ring-2 ring-inset ring-nb-blue bg-nb-blue/10'
              ),
              active
                ? fieldMode ? 'bg-nb-yellow/30' : 'bg-nb-blue/20'
                : selected
                  ? fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-blue/10'
                  : fieldMode ? 'hover:bg-nb-yellow/20' : 'hover:bg-nb-cream/50'
            )}
          >
            <!-- Drag handle (only when reorder enabled) -->
            {#if reorderEnabled}
              <td class="px-1 py-2">
                <div class={cn(
                  'flex items-center justify-center cursor-grab active:cursor-grabbing',
                  fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'
                )}>
                  <Icon name="drag_indicator" class="text-lg" />
                </div>
              </td>
            {/if}

            <!-- Thumbnail -->
            <td class="px-3 py-2">
              <div class={cn(
                'w-10 h-10 overflow-hidden',
                fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-cream/80'
              )}>
                {#if thumbUrl}
                  <img
                    src={thumbUrl}
                    alt=""
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                {:else}
                  <div class="w-full h-full flex items-center justify-center">
                    <Icon name="image" class={cn('text-sm', cx.textMuted)} />
                  </div>
                {/if}
              </div>
            </td>

            <!-- Label -->
            <td class={cn('px-3 py-2', cx.text)}>
              <div class="flex items-center gap-2">
                {#if selected}
                  <Icon
                    name="check_circle"
                    class={cn('text-sm', fieldMode ? 'text-nb-yellow' : 'text-nb-blue')}
                  />
                {/if}
                {#if validationIssues?.[canvas.id]}
                  {@const issues = validationIssues[canvas.id]}
                  <div
                    class={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      issues.some(i => i.severity === 'error') ? 'bg-nb-red' : 'bg-nb-orange'
                    )}
                    title={`${issues.length} issue(s)`}
                  ></div>
                {/if}
                <span class="font-medium truncate">{label}</span>
              </div>
            </td>

            <!-- Type -->
            <td class="px-3 py-2 text-center">
              <span class={cn(
                'inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase',
                fieldMode
                  ? 'bg-nb-yellow/20 text-nb-yellow'
                  : 'bg-nb-cream text-nb-black/60'
              )}>
                {canvas.type}
              </span>
            </td>

            <!-- Date -->
            <td class={cn('px-3 py-2', cx.textMuted)}>
              <span class="text-sm">
                {canvas.navDate
                  ? new Date(canvas.navDate).toLocaleDateString()
                  : '-'
                }
              </span>
            </td>

            <!-- Dimensions -->
            <td class={cn('px-3 py-2 text-right', cx.textMuted)}>
              <span class="text-sm font-mono">
                {canvas.width && canvas.height
                  ? `${canvas.width}\u00D7${canvas.height}`
                  : '-'
                }
              </span>
            </td>

            <!-- Actions -->
            <td class="px-3 py-2">
              <Button
                variant="ghost"
                size="bare"
                onclick={(e) => { e.stopPropagation(); onContextMenu(e, canvas.id); }}
                class={cn(
                  'p-1 transition-nb',
                  fieldMode
                    ? 'hover:bg-nb-yellow/20 text-nb-yellow'
                    : 'hover:bg-nb-cream text-nb-black/40'
                )}
              >
                <Icon name="more_vert" class="text-sm" />
              </Button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <!-- Footer stats -->
    <div class={cn(
      'sticky bottom-0 px-4 py-2 border-t',
      cx.border,
      fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-white'
    )}>
      <span class={cn('text-xs', cx.textMuted)}>
        {items.length} {items.length === 1 ? 'item' : 'items'}
      </span>
    </div>
  </div>
{/if}
