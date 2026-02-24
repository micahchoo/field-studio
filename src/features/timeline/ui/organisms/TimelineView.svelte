<!--
  TimelineView.svelte — Chronological Timeline View
  ====================================================
  React source: src/features/timeline/ui/organisms/TimelineView.tsx

  ARCHITECTURE:
  - Feature organism: Date-grouped canvas display with zoom levels
  - Uses PaneLayout with variant="default" (scrollable body)
  - SubBar shows date range minimap
  - Pure Svelte rendering (no external lib)

  PROPS:
  - root: IIIFItem — IIIF tree
  - cx: ContextualClassNames
  - fieldMode: boolean
  - t: TerminologyFn
  - onSelect: (item: IIIFItem) => void
  - onSwitchView: (mode: string) => void
-->

<script lang="ts">
  import { PaneLayout, Row } from '@/src/shared/ui/layout';
  import ViewHeader from '@/src/shared/ui/molecules/ViewHeader/ViewHeader.svelte';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import Center from '@/src/shared/ui/layout/primitives/Center.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import { TimelineStore } from '@/src/features/timeline/stores/timeline.svelte';
  import type { ZoomLevel, TimelineGroup, TimelineItem } from '@/src/features/timeline/stores/timeline.svelte';
  import type { IIIFItem } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';

  interface Props {
    root: IIIFItem;
    cx: ContextualClassNames;
    fieldMode: boolean;
    t: (key: string, fallback?: string) => string;
    onSelect: (item: IIIFItem) => void;
    onSwitchView: (mode: string) => void;
  }

  let { root, cx, fieldMode, t, onSelect, onSwitchView }: Props = $props();

  // ── Feature Store ──
  const timeline = new TimelineStore();

  // ── Derived ──
  const groups = $derived(timeline.groups);
  const hasItems = $derived(timeline.hasData);
  const zoomLevel = $derived(timeline.zoomLevel);
  const totalItems = $derived(timeline.totalItems);
  const selectedDate = $derived(timeline.selectedDate);

  const gridColumnsClass = $derived(
    zoomLevel === 'day' ? 'grid-cols-7' :
    zoomLevel === 'month' ? 'grid-cols-4' : 'grid-cols-3'
  );

  const zoomLevels: ZoomLevel[] = ['day', 'month', 'year'];

  // ── Effects ──

  // Initialize timeline store from root's canvases (items with navDate)
  $effect(() => {
    // @migration: root.items may be canvases or manifests; extract canvas-level navDate
    const items = root.items ?? [];
    const canvases = items
      .filter((item: IIIFItem) => item.type === 'Canvas' || item.type === 'Manifest')
      .flatMap((item: IIIFItem) => {
        if (item.type === 'Canvas') return [item];
        return item.items ?? [];
      })
      .map((canvas: IIIFItem) => ({
        id: canvas.id,
        label: getIIIFValue(canvas.label) || canvas.id,
        navDate: canvas.navDate,
      }));

    timeline.loadFromCanvases(canvases);
  });

  // ── Handlers ──
  function handleDotClick(dateKey: string): void {
    timeline.toggleDate(dateKey);
  }

  function handleItemClick(item: TimelineItem): void {
    onSelect({ id: item.canvasId, type: 'Canvas' } as IIIFItem);
  }

  function handleZoomChange(level: ZoomLevel): void {
    timeline.setZoomLevel(level);
  }

  // ── Minimap helpers ──
  // Position dots proportionally across the minimap bar
  function getMinimapPosition(group: TimelineGroup): number {
    return timeline.getTimelinePosition(group.date) * 100;
  }
</script>

<PaneLayout variant="default">
  {#snippet header()}
    <ViewHeader {cx}>
      {#snippet title()}
        <span class={cn('font-mono uppercase text-sm font-semibold', cx.text)}>
          {t('timeline', 'Timeline')}
        </span>
        {#if hasItems}
          <span class={cn(
            'ml-2 px-1.5 py-0.5 rounded text-xs font-bold',
            cx.accent || 'bg-nb-black text-nb-white'
          )}>
            {totalItems}
          </span>
        {/if}
      {/snippet}

      {#snippet actions()}
        <div class="flex items-center gap-1" role="radiogroup" aria-label={t('zoomLevel', 'Zoom level')}>
          {#each zoomLevels as level}
            <Button
              variant={zoomLevel === level ? 'primary' : 'ghost'}
              size="sm"
              onclick={() => handleZoomChange(level)}
              aria-checked={zoomLevel === level ? 'true' : 'false'}
              role="radio"
            >
              {t(level, level)}
            </Button>
          {/each}
        </div>
      {/snippet}

      <!-- Date range minimap in subbar -->
      {#snippet subbar()}
        {#if hasItems}
          <div class="relative flex items-center w-full h-6">
            <!-- Base line -->
            <div class={cn(
              'absolute left-0 right-0 top-1/2 h-px -translate-y-1/2',
              cx.border || 'bg-nb-black/20'
            )}></div>
            <!-- Date dots -->
            {#each groups as group (group.key)}
              {@const pct = getMinimapPosition(group)}
              <button
                class={cn(
                  'absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2',
                  'transition-all hover:scale-150',
                  selectedDate === group.key
                    ? cn('w-3 h-3', cx.accent || 'bg-nb-black')
                    : cn(cx.textMuted || 'bg-nb-black/30')
                )}
                style="left: {pct}%;"
                onclick={() => handleDotClick(group.key)}
                title="{group.displayDate}: {group.items.length} {t('items', 'items')}"
                aria-label="{group.displayDate}, {group.items.length} {t('items', 'items')}"
              ></button>
            {/each}
            <!-- Min date label -->
            {#if timeline.minDate}
              <span class={cn('absolute left-0 -bottom-0.5 text-[9px] font-mono', cx.textMuted || 'text-nb-black/40')}>
                {timeline.formatShortDate(timeline.minDate)}
              </span>
            {/if}
            <!-- Max date label -->
            {#if timeline.maxDate}
              <span class={cn('absolute right-0 -bottom-0.5 text-[9px] font-mono', cx.textMuted || 'text-nb-black/40')}>
                {timeline.formatShortDate(timeline.maxDate)}
              </span>
            {/if}
          </div>
        {/if}
      {/snippet}
    </ViewHeader>
  {/snippet}

  {#snippet body()}
    {#if !hasItems}
      <Center flex class="h-full">
        <div class={cn('text-center p-8', cx.textMuted || 'text-nb-black/50')}>
          <div class="text-4xl mb-4" aria-hidden="true">&#x1f4c5;</div>
          <p class="text-lg font-medium">{t('noDatedItems', 'No dated items')}</p>
          <p class="text-sm mt-2">
            {t('noDatedItemsHint', 'Add navDate to canvases to see them on the timeline.')}
          </p>
        </div>
      </Center>
    {:else}
      <div class="relative pl-10 pr-4 py-6" role="list" aria-label={t('timeline', 'Timeline')}>
        <!-- Vertical connector line -->
        <div
          class={cn('absolute left-[22px] top-0 bottom-0 w-0.5', cx.border || 'bg-nb-black/15')}
          aria-hidden="true"
        ></div>

        {#each groups as group (group.key)}
          {@const isExpanded = selectedDate === null || selectedDate === group.key}
          {@const isSelected = selectedDate === group.key}

          <div class="relative mb-8" aria-expanded={isExpanded}>
            <!-- Timeline dot -->
            <button
              class={cn(
                'absolute left-[-22px] top-1 w-4 h-4 rounded-full border-2',
                'transition-all hover:scale-125 -translate-x-1/2',
                isSelected
                  ? cn('scale-110', cx.accent || 'bg-nb-black border-nb-black')
                  : cn(cx.surface || 'bg-nb-white', cx.border || 'border-nb-black/40')
              )}
              onclick={() => handleDotClick(group.key)}
              aria-pressed={isSelected}
              aria-label="{t('toggle', 'Toggle')} {group.displayDate} ({group.items.length} {t('items', 'items')})"
            ></button>

            <!-- Date header -->
            <div class={cn('mb-3 flex items-baseline gap-2', cx.text || 'text-nb-black')}>
              <span class="font-semibold text-sm font-mono uppercase">
                {group.displayDate}
              </span>
              <span class={cn('text-xs', cx.textMuted || 'text-nb-black/50')}>
                {group.items.length} {group.items.length === 1 ? t('item', 'item') : t('items', 'items')}
              </span>
            </div>

            <!-- Items grid (visible when group is expanded) -->
            {#if isExpanded}
              <div class={cn('grid gap-2', gridColumnsClass)}>
                {#each group.items as item (item.id)}
                  <button
                    class={cn(
                      'rounded overflow-hidden border-2 text-left',
                      'transition-all hover:shadow-md hover:-translate-y-0.5',
                      cx.surface || 'bg-nb-white',
                      cx.border || 'border-nb-black/20',
                      'hover:border-nb-black/50'
                    )}
                    onclick={() => handleItemClick(item)}
                    aria-label="{item.label} — {timeline.formatShortDate(item.date)}"
                  >
                    <!-- @migration: thumbnail would come from canvas thumbnail resolution -->
                    <div
                      class={cn(
                        'w-full aspect-square flex items-center justify-center',
                        'text-lg font-bold',
                        cx.accent || 'bg-nb-cream text-nb-black/30'
                      )}
                      aria-hidden="true"
                    >
                      {item.label.charAt(0).toUpperCase()}
                    </div>
                    <div class="p-1.5">
                      {#if zoomLevel === 'day'}
                        <p class={cn('text-[10px] font-mono', cx.textMuted || 'text-nb-black/50')}>
                          {timeline.formatTime(item.date)}
                        </p>
                      {/if}
                      <p class={cn('text-xs truncate', cx.text || 'text-nb-black')}>
                        {item.label}
                      </p>
                      {#if zoomLevel !== 'day'}
                        <p class={cn('text-[10px]', cx.textMuted || 'text-nb-black/40')}>
                          {timeline.formatShortDate(item.date)}
                        </p>
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/snippet}
</PaneLayout>
