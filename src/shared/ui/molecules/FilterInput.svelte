<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    value?: string;
    delay?: number;
    placeholder?: string;
    autoFocus?: boolean;
    cx: ContextualClassNames;
    class?: string;
  }

  let {
    value = $bindable(''),
    delay = 300,
    placeholder = 'Filter...',
    autoFocus = false,
    cx,
    class: className = ''
  }: Props = $props();

  let localValue = $state(value);
  let isPending = $state(false);
  let inputRef: HTMLInputElement | undefined = $state();

  function sanitizeForInput(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();
  }

  // Debounce effect
  $effect(() => {
    const current = localValue;
    isPending = true;

    const timerId = setTimeout(() => {
      value = sanitizeForInput(current);
      isPending = false;
    }, delay);

    return () => clearTimeout(timerId);
  });

  // Sync external changes
  $effect(() => {
    if (value !== localValue && !isPending) {
      localValue = value;
    }
  });

  // Auto-focus
  $effect(() => {
    if (autoFocus && inputRef) inputRef.focus();
  });

  const showClearButton = $derived(localValue.length > 0);

  function handleClear() {
    localValue = '';
    value = '';
    inputRef?.focus();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleClear();
  }
</script>

<div class={cn('relative', className)}>
  <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
    <Icon name="search" class={cn('text-lg', cx.textMuted || 'text-nb-black/40')} />
  </div>

  <input
    bind:this={inputRef}
    bind:value={localValue}
    type="text"
    {placeholder}
    class={cn(cx.searchInput || cx.input || 'w-full border-2 border-nb-black font-mono', 'pl-10 pr-10 py-2')}
    onkeydown={handleKeydown}
    role="searchbox"
    aria-label="Filter input"
    aria-busy={isPending || undefined}
  />

  {#if showClearButton}
    <button
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-nb-black/5 rounded cursor-pointer border-0 bg-transparent"
      onclick={handleClear}
      aria-label="Clear filter"
    >
      <Icon name="close" class="text-base text-gray-500" />
    </button>
  {/if}
</div>
