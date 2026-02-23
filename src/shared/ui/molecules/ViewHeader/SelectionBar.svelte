<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from './types';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '../../atoms/Button.svelte';
  import Icon from '../../atoms/Icon.svelte';

  interface Props {
    count: number;
    onClear: () => void;
    cx: ContextualClassNames;
    isMobile?: boolean;
    children?: Snippet;
  }

  let { count, onClear, cx, isMobile = false, children }: Props = $props();
</script>

{#if count > 0}
  {#if isMobile}
    <!-- Mobile: Fixed bottom floating bar -->
    <div class="absolute bottom-8 left-4 right-4 z-[100]">
      <div class={cn(
        'flex items-center gap-3 p-3 rounded-lg backdrop-blur-md shadow-brutal-lg',
        'bg-nb-black/95 text-nb-cream border-2 border-nb-black'
      )}>
        <span class="font-mono text-sm font-bold uppercase tracking-wide shrink-0">
          {count} selected
        </span>
        <div class="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-hide">
          {#if children}{@render children()}{/if}
        </div>
        <Button variant="ghost" size="bare" onclick={onClear}>
          <Icon name="x" class="w-4 h-4" />
        </Button>
      </div>
    </div>
  {:else}
    <!-- Desktop: Full-width banner -->
    <div class={cn(
      'w-full flex items-center justify-between gap-4 px-4 py-2 border-b shrink-0',
      'animate-in slide-in-from-top-2 duration-200',
      cx.headerBg || 'bg-nb-cream',
      cx.divider || 'border-nb-black/20'
    )}>
      <span class={cn(
        'font-mono text-xs font-bold uppercase tracking-wider',
        cx.text || 'text-nb-black'
      )}>
        {count} selected
      </span>
      <div class="flex items-center gap-2">
        {#if children}{@render children()}{/if}
        <Button variant="ghost" size="bare" onclick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  {/if}
{/if}
