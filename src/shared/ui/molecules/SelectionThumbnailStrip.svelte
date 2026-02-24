<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface ThumbnailItem {
    id: string;
    src: string;
    label?: string;
  }

  interface Props {
    items: ThumbnailItem[];
    cx: ContextualClassNames;
    fieldMode?: boolean;
    class?: string;
  }

  let { items, cx, fieldMode = false, class: className = '' }: Props = $props();
</script>

<div class={cn('flex items-center gap-1 overflow-x-auto py-1 px-2', className)}>
  {#each items as item}
    <div class={cn('shrink-0 w-10 h-10 overflow-hidden', cx.thumbnailBg || 'bg-nb-cream border border-nb-black/10')} title={item.label}>
      <img src={item.src} alt={item.label || ''} class="w-full h-full object-cover" loading="lazy" />
    </div>
  {/each}
  {#if items.length === 0}
    <span class={cn('text-xs font-mono', cx.textMuted || 'text-nb-black/40')}>No selection</span>
  {/if}
</div>
