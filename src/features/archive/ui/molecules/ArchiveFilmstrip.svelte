<!--
  ArchiveFilmstrip Molecule
  ==========================
  Vertical thumbnail strip for sidebar filmstrip mode.
  Extracted from ArchiveView organism.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IIIFItem } from '@/src/shared/types';
  import { isCanvas } from '@/src/shared/types';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    items: IIIFItem[];
    selectedIds: Set<string>;
    activeItemId: string | null;
    cx: ContextualClassNames;
    fieldMode: boolean;
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
    getLabel,
    getThumbnailUrl,
    onItemClick,
    onOpen,
    onContextMenu,
  }: Props = $props();
</script>

<div class="flex flex-col divide-y divide-nb-black/50">
  {#each items as canvas (canvas.id)}
    {@const selected = selectedIds.has(canvas.id)}
    {@const active = activeItemId === canvas.id}
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
      onclick={(e) => onItemClick(e, canvas)}
      ondblclick={() => onOpen(canvas)}
      oncontextmenu={(e) => onContextMenu(e, canvas)}
    >
      <div class="w-14 h-14 overflow-hidden bg-nb-cream/80 shrink-0">
        {#if thumbnailUrl}
          <img src={thumbnailUrl} alt="" class="w-full h-full object-cover" loading="lazy" />
        {:else}
          <div class="w-full h-full flex items-center justify-center">
            <Icon name="image" class={cn('text-xl', cx.textMuted)} />
          </div>
        {/if}
      </div>

      <div class="flex-1 min-w-0">
        <div class={cn('text-sm font-medium truncate', cx.text)} title={label}>
          {label}
        </div>
        {#if isCanvas(canvas) && canvas.width && canvas.height}
          <div class={cn('text-xs', cx.textMuted)}>
            {canvas.width} x {canvas.height}
          </div>
        {/if}
      </div>

      {#if selected}
        <div class={cn('shrink-0', fieldMode ? 'text-nb-yellow' : 'text-nb-blue')}>
          <Icon name="check_circle" class="text-lg" />
        </div>
      {/if}
    </button>
  {/each}
</div>
