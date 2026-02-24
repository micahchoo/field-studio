<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    count: number;
    onClear: () => void;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    children?: Snippet;
    class?: string;
  }

  let { count, onClear, cx, fieldMode = false, children, class: className = '' }: Props = $props();
</script>

{#if count > 0}
  <div class={cn('fixed bottom-8 left-4 right-4 z-[100]', className)}>
    <div class="flex items-center gap-3 p-3 rounded-lg backdrop-blur-md shadow-brutal-lg bg-nb-black/95 text-nb-cream border-2 border-nb-black">
      <span class="font-mono text-sm font-bold uppercase tracking-wide shrink-0">{count} selected</span>
      <div class="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-hide">
        {#if children}{@render children()}{/if}
      </div>
      <button type="button" class="p-1 cursor-pointer border-0 bg-transparent text-nb-cream hover:text-white" onclick={onClear} aria-label="Clear selection">
        <Icon name="x" class="text-base" />
      </button>
    </div>
  </div>
{/if}
