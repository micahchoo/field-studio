<!--
  ArchiveGroupedView Molecule
  ============================
  Groups canvases by parent manifest for the grouped view mode.
  Extracted from ArchiveView organism.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IIIFItem } from '@/src/shared/types';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface ManifestGroup {
    manifestId: string;
    manifestLabel: string;
    canvases: IIIFItem[];
  }

  interface Props {
    groups: ManifestGroup[];
    selectedIds: Set<string>;
    cx: ContextualClassNames;
    fieldMode: boolean;
    getLabel: (item: IIIFItem) => string;
    getThumbnailUrl: (item: IIIFItem) => string;
    onItemClick: (e: MouseEvent | KeyboardEvent, item: IIIFItem) => void;
    onOpen: (item: IIIFItem) => void;
    onContextMenu: (e: MouseEvent, item: IIIFItem) => void;
  }

  let {
    groups,
    selectedIds,
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
  {#each groups as group (group.manifestId)}
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
            onclick={(e) => onItemClick(e, canvas)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onItemClick(e, canvas); }}
            ondblclick={() => onOpen(canvas)}
            oncontextmenu={(e) => onContextMenu(e, canvas)}
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
              <span class={cn('text-xs truncate block', cx.text)} title={label}>{label}</span>
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
