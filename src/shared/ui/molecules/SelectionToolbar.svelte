<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '../atoms/Button.svelte';

  interface Props {
    count: number;
    onClear: () => void;
    onSelectAll?: () => void;
    cx: ContextualClassNames;
    children?: Snippet;
    class?: string;
  }

  let { count, onClear, onSelectAll, cx, children, class: className = '' }: Props = $props();
</script>

<div class={cn('flex items-center gap-2 px-3 py-1.5', cx.headerBg || 'bg-nb-cream border-b-2 border-nb-black', className)}>
  <span class={cn('text-[10px] font-bold uppercase tracking-wider font-mono shrink-0', cx.text)}>{count} selected</span>
  <div class="flex items-center gap-1 flex-1">
    {#if children}{@render children()}{/if}
  </div>
  {#if onSelectAll}
    <Button variant="ghost" size="bare" onclick={onSelectAll}>
      {#snippet children()}
        <span class="text-[10px] font-bold uppercase font-mono">All</span>
      {/snippet}
    </Button>
  {/if}
  <Button variant="ghost" size="bare" onclick={onClear}>
    {#snippet children()}
      <span class="text-[10px] font-bold uppercase font-mono">Clear</span>
    {/snippet}
  </Button>
</div>
