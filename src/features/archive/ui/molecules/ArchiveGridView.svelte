<!--
  ArchiveGridView Molecule
  =========================
  Simple grid layout for archive canvas items with selection, thumbnail,
  label, and validation indicator. Extracted from ArchiveView organism.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IIIFItem } from '@/src/shared/types';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    items: IIIFItem[];
    selectedIds: Set<string>;
    activeItemId: string | null;
    cx: ContextualClassNames;
    fieldMode: boolean;
    validationIssues?: Map<string, unknown[]>;
    getLabel: (item: IIIFItem) => string;
    getThumbnailUrl: (item: IIIFItem) => string;
    onItemClick: (e: MouseEvent | KeyboardEvent, item: IIIFItem) => void;
    onOpen: (item: IIIFItem) => void;
    onContextMenu: (e: MouseEvent, item: IIIFItem) => void;
  }

  let {
    items,
    selectedIds,
    activeItemId,
    cx,
    fieldMode,
    validationIssues,
    getLabel,
    getThumbnailUrl,
    onItemClick,
    onOpen,
    onContextMenu,
  }: Props = $props();
</script>

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
  {#each items as canvas (canvas.id)}
    {@const selected = selectedIds.has(canvas.id)}
    {@const active = activeItemId === canvas.id}
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
      onclick={(e) => onItemClick(e, canvas)}
      ondblclick={() => onOpen(canvas)}
      oncontextmenu={(e) => onContextMenu(e, canvas)}
      onkeydown={(e) => {
        if (e.key === 'Enter') onOpen(canvas);
        if (e.key === ' ') { e.preventDefault(); onItemClick(e, canvas); }
      }}
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
      <div class="px-2 py-1.5 min-h-[2rem] flex items-center gap-1">
        <span class={cn('text-xs truncate flex-1', cx.text || 'text-nb-black')} title={label}>
          {label}
        </span>
        {#if hasIssues}
          <span class="w-2 h-2 rounded-full bg-nb-red shrink-0" title="Has validation issues"></span>
        {/if}
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
