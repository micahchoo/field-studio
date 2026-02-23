<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Card from '../atoms/Card.svelte';

  interface Collection {
    id: string;
    label: string;
    thumbnails: string[];
    itemCount: number;
  }

  interface Props {
    collection: Collection;
    selected?: boolean;
    onclick?: () => void;
    oncontextmenu?: (e: MouseEvent) => void;
    cx: ContextualClassNames;
    header?: Snippet;
  }

  let {
    collection,
    selected = false,
    onclick,
    oncontextmenu,
    cx,
    header
  }: Props = $props();
</script>

<div
  class={cn(
    'relative cursor-pointer transition-all',
    selected && (cx.selected || 'ring-2 ring-nb-orange')
  )}
  role="button"
  tabindex="0"
  {onclick}
  {oncontextmenu}
  onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') onclick?.(); }}
>
  <Card {cx}>
    {#if header}
      {@render header()}
    {:else}
      <div class="p-3">
        <div class="grid grid-cols-2 gap-1 mb-2 aspect-square">
          {#each collection.thumbnails.slice(0, 4) as thumb}
            <div class={cn('overflow-hidden', cx.thumbnailBg || 'bg-nb-cream border border-nb-black/10')}>
              <img src={thumb} alt="" class="w-full h-full object-cover" loading="lazy" />
            </div>
          {/each}
          {#if collection.thumbnails.length === 0}
            <div class={cn('col-span-2 row-span-2 flex items-center justify-center', cx.placeholderBg || 'bg-nb-cream')}>
              <span class={cn('text-2xl', cx.placeholderIcon || 'text-nb-black/20')}>folder</span>
            </div>
          {/if}
        </div>
        <div class="flex items-center justify-between">
          <span class={cn('text-xs font-bold uppercase font-mono truncate', cx.text)}>{collection.label}</span>
          <span class={cn('text-[10px] font-mono shrink-0 ml-2', cx.textMuted || 'text-nb-black/50')}>{collection.itemCount}</span>
        </div>
      </div>
    {/if}
  </Card>
</div>
