<!--
  ArchiveListView Molecule
  =========================
  Tabular list view for archive items with thumbnail, name, size, and date columns.
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
      {#each items as canvas (canvas.id)}
        {@const selected = selectedIds.has(canvas.id)}
        {@const active = activeItemId === canvas.id}
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
          onclick={(e) => onItemClick(e, canvas)}
          ondblclick={() => onOpen(canvas)}
          oncontextmenu={(e) => onContextMenu(e, canvas)}
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
            {#if isCanvas(canvas) && canvas.width && canvas.height}
              {canvas.width} x {canvas.height}
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
