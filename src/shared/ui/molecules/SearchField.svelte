<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    value?: string;
    placeholder?: string;
    width?: string;
    autoFocus?: boolean;
    showClear?: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    class?: string;
  }

  let {
    value = $bindable(''),
    placeholder = 'Search...',
    width = 'w-64',
    autoFocus = false,
    showClear = true,
    cx,
    fieldMode = false,
    class: className = ''
  }: Props = $props();

  let inputRef: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (autoFocus && inputRef) inputRef.focus();
  });

  const showClearButton = $derived(showClear && value.length > 0);

  function handleClear() {
    value = '';
    inputRef?.focus();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleClear();
  }
</script>

<div class={cn('relative', width, className)}>
  <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
    <Icon name="search" class={cn('text-lg', cx.textMuted || 'text-nb-black/40')} />
  </div>

  <input
    bind:this={inputRef}
    bind:value
    type="search"
    {placeholder}
    class={cn(cx.searchInput || cx.input || 'w-full border-2 border-nb-black font-mono', 'pl-10 pr-10 py-2')}
    onkeydown={handleKeydown}
    aria-label="Search"
  />

  {#if showClearButton}
    <button
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-nb-black/5 rounded cursor-pointer border-0 bg-transparent"
      onclick={handleClear}
      aria-label="Clear search"
    >
      <Icon name="close" class="text-base text-gray-500" />
    </button>
  {/if}
</div>
