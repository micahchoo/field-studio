<!--
  GroupedArchiveGrid.svelte — Grouped archive grid by manifest
  =============================================================
  Groups canvases by parent manifest with collapsible sections.
  Each section has a header (chevron, book icon, label, count) and
  a responsive grid of canvas thumbnail cards with selection support.
  React source: src/features/archive/ui/molecules/GroupedArchiveGrid.tsx
-->
<script lang="ts">
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import BlurUpThumbnail from './BlurUpThumbnail.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface ManifestGroup {
    manifestId: string;
    manifestLabel: string;
    canvases: IIIFCanvas[];
  }

  type GridDensity = 'compact' | 'comfortable' | 'spacious';

  interface Props {
    groups: ManifestGroup[];
    isSelected: (id: string) => boolean;
    onItemClick: (e: MouseEvent, canvas: IIIFCanvas) => void;
    onToggleSelect: (canvas: IIIFCanvas) => void;
    onContextMenu: (e: MouseEvent, canvas: IIIFCanvas) => void;
    validationIssues?: Map<string, unknown[]>;
    cx: { surface?: string; text?: string; textMuted?: string; divider?: string; thumbnailBg?: string; selected?: string; [key: string]: string | undefined };
    fieldMode: boolean;
    density?: GridDensity;
    class?: string;
  }

  let {
    groups,
    isSelected,
    onItemClick,
    onToggleSelect,
    onContextMenu,
    validationIssues,
    cx,
    fieldMode,
    density = 'comfortable',
    class: className = '',
  }: Props = $props();

  let collapsed = $state<Set<string>>(new Set());

  function toggleCollapse(manifestId: string) {
    const next = new Set(collapsed);
    if (next.has(manifestId)) {
      next.delete(manifestId);
    } else {
      next.add(manifestId);
    }
    collapsed = next;
  }

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

  /** Get thumbnail URLs for a canvas (low-res + high-res) */
  function resolveThumbs(canvas: IIIFCanvas): { low: string; high: string } {
    const thumb = canvas.thumbnail?.[0];
    const id = thumb?.id || '';
    if (!id) return { low: '', high: '' };
    // Low-res: append size hint for a small version
    // High-res: the original thumbnail URL
    return { low: id, high: id };
  }

  /** Get the label for a canvas */
  function getLabel(canvas: IIIFCanvas): string {
    return getIIIFValue(canvas.label) || canvas._filename || 'Untitled';
  }

  /** Handle checkbox click without propagating to item click */
  function handleCheckboxClick(e: MouseEvent, canvas: IIIFCanvas) {
    e.stopPropagation();
    onToggleSelect(canvas);
  }
</script>

{#if groups.length === 0}
  <!-- Empty state -->
  <div class="flex flex-col items-center justify-center py-16">
    <Icon
      name="inventory_2"
      class={cn('text-4xl mb-3 opacity-40', cx.textMuted || 'text-nb-black/30')}
    />
    <p class={cn('text-sm', cx.textMuted || 'text-nb-black/50')}>
      No manifest groups to display
    </p>
  </div>
{:else}
  <div class={cn('space-y-6', className)}>
    {#each groups as group (group.manifestId)}
      {@const isCollapsed = collapsed.has(group.manifestId)}
      <div class="group/section">
        <!-- Section header -->
        <button
          type="button"
          class={cn(
            'flex items-center gap-2 w-full text-left px-3 py-2 cursor-pointer transition-nb',
            fieldMode ? 'hover:bg-nb-yellow/10' : 'hover:bg-nb-black/5',
            cx.divider ? `border-b ${cx.divider}` : 'border-b border-nb-black/10'
          )}
          aria-label="Toggle {group.manifestLabel}"
          onclick={() => toggleCollapse(group.manifestId)}
          aria-expanded={!isCollapsed}
          aria-controls="group-{group.manifestId}"
        >
          <!-- Chevron toggle -->
          <Icon
            name="expand_more"
            class={cn(
              'text-lg transition-transform duration-200',
              isCollapsed && '-rotate-90',
              cx.textMuted || 'text-nb-black/40'
            )}
          />

          <!-- Book icon -->
          <Icon
            name="auto_stories"
            class={cn('text-base', fieldMode ? 'text-nb-yellow/70' : 'text-nb-blue/60')}
          />

          <!-- Manifest label -->
          <span class={cn(
            'font-mono text-xs font-bold uppercase tracking-wider flex-1 truncate',
            cx.text || 'text-nb-black'
          )}>
            {group.manifestLabel}
          </span>

          <!-- Canvas count -->
          <span class={cn(
            'text-xs font-mono tabular-nums shrink-0',
            cx.textMuted || 'text-nb-black/40'
          )}>
            {group.canvases.length}
          </span>
        </button>

        <!-- Grid of canvas items -->
        {#if !isCollapsed}
          <div
            id="group-{group.manifestId}"
            class={cn('grid', gridColsClass, DENSITY_CLASSES[density], 'p-4')}
            role="grid"
            aria-label="{group.manifestLabel} canvases"
          >
            {#each group.canvases as canvas (canvas.id)}
              {@const selected = isSelected(canvas.id)}
              {@const thumbs = resolveThumbs(canvas)}
              {@const label = getLabel(canvas)}
              {@const hasIssues = validationIssues?.has(canvas.id)}
              <div
                role="gridcell"
                aria-selected={selected}
                class={cn(
                  'group relative flex flex-col overflow-hidden cursor-pointer transition-nb',
                  cx.thumbnailBg || 'bg-nb-cream border-2 border-nb-black',
                  selected && (cx.selected || 'ring-2 ring-nb-blue'),
                  PADDING_CLASSES[density]
                )}
                onclick={(e) => onItemClick(e, canvas)}
                oncontextmenu={(e) => onContextMenu(e, canvas)}
                onkeydown={(e) => {
                  if (e.key === ' ') {
                    e.preventDefault();
                    onToggleSelect(canvas);
                  }
                }}
                tabindex="0"
              >
                <!-- Thumbnail -->
                <div class={cn(
                  'aspect-square overflow-hidden',
                  fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
                )}>
                  <BlurUpThumbnail
                    lowResUrl={thumbs.low}
                    highResUrl={thumbs.high}
                    {cx}
                    {fieldMode}
                  />
                </div>

                <!-- Label bar -->
                <div class="px-1.5 py-1 min-h-[1.75rem] flex items-center gap-1">
                  <span class={cn('text-xs truncate flex-1', cx.text || 'text-nb-black')}>
                    {label}
                  </span>

                  <!-- Validation dot -->
                  {#if hasIssues}
                    <span
                      class="w-2 h-2 rounded-full bg-nb-red shrink-0"
                      title="Has validation issues"
                    ></span>
                  {/if}
                </div>

                <!-- Selection checkmark overlay -->
                {#if selected}
                  <div class={cn(
                    'absolute top-1.5 left-1.5 w-5 h-5 flex items-center justify-center rounded-sm',
                    fieldMode ? 'bg-nb-yellow text-nb-black' : 'bg-nb-blue text-nb-white'
                  )}>
                    <Icon name="check" class="text-sm" />
                  </div>
                {/if}

                <!-- Hover checkbox (non-selected items) -->
                {#if !selected}
                  <button
                    type="button"
                    class={cn(
                      'absolute top-1.5 left-1.5 w-5 h-5 flex items-center justify-center rounded-sm',
                      'opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer',
                      fieldMode
                        ? 'bg-nb-black/50 text-nb-yellow border border-nb-yellow/40'
                        : 'bg-nb-white/80 text-nb-black/40 border border-nb-black/20'
                    )}
                    onclick={(e) => handleCheckboxClick(e, canvas)}
                    aria-label="Select {label}"
                  >
                    <Icon name="check_box_outline_blank" class="text-xs" />
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
