<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    selected?: boolean;
    disabled?: boolean;
    onclick?: () => void;
    leading?: Snippet;
    trailing?: Snippet;
    cx: ContextualClassNames;
    class?: string;
    children: Snippet;
  }

  let {
    selected = false,
    disabled = false,
    onclick,
    leading,
    trailing,
    cx,
    class: className = '',
    children
  }: Props = $props();

  const stateClasses = $derived(
    selected
      ? cn(cx.selected || 'bg-nb-orange/15 border-l-4 border-l-nb-orange', cx.selectedText || 'text-nb-black font-bold')
      : 'border-l-4 border-transparent hover:bg-nb-cream/50'
  );
</script>

<button
  type="button"
  class={cn(
    'flex items-center gap-3 px-4 py-2 text-left transition-colors w-full border-0 bg-transparent',
    stateClasses,
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    cx.text,
    className
  )}
  {disabled}
  {onclick}
  role="listitem"
  aria-selected={selected}
>
  {#if leading}
    <div class="flex-shrink-0">{@render leading()}</div>
  {/if}

  <div class="flex-1 min-w-0">{@render children()}</div>

  {#if trailing}
    <div class="flex-shrink-0">{@render trailing()}</div>
  {/if}
</button>
