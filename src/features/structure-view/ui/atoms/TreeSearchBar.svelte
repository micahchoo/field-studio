<!--
  TreeSearchBar.svelte — Search input with match count
  React source: TreeSearchBar.tsx (131L)
  Pure presentational: search input, clear button, match info
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';

  interface Props {
    query: string;
    onQueryChange: (query: string) => void;
    matchCount?: number;
    totalCount?: number;
    class?: string;
    autoFocus?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    query,
    onQueryChange,
    matchCount,
    totalCount,
    class: className = '',
    autoFocus = false,
    cx,
    fieldMode = false,
  }: Props = $props();

  const showMatchInfo = $derived(
    matchCount !== undefined && totalCount !== undefined && query.length > 0
  );

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    onQueryChange(target.value);
  }
</script>

<div class="space-y-2 {className}">
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg class={cn('h-4 w-4', cx?.textMuted ?? 'text-nb-black/40')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      type="text"
      value={query}
      oninput={handleInput}
      placeholder="Find items..."
      autofocus={autoFocus}
      class={cn(
        'w-full pl-10 pr-10 py-2.5 text-sm transition-nb focus:outline-none',
        cx?.searchInput ?? cx?.input ?? 'bg-nb-black border border-nb-black/20 text-nb-cream placeholder:text-nb-black/40 focus:ring-2 focus:ring-nb-orange/30 focus:border-nb-orange',
      )}
      aria-label="Search structure tree"
    />
    {#if query}
      <Button variant="ghost" size="bare"
        type="button"
        onclick={() => onQueryChange('')}
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-nb-black/40 hover:text-nb-black/60 transition-nb"
        aria-label="Clear search"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Button>
    {/if}
  </div>

  {#if showMatchInfo}
    <div class="flex justify-between items-center text-sm px-1">
      <span class={cn('font-serif', cx?.textMuted ?? 'text-nb-black/50')}>
        {#if matchCount === 0}
          No matches found
        {:else}
          <span class={cn('font-medium', cx?.text ?? 'text-nb-black/20')}>{matchCount}</span>
          {' '}of{' '}
          <span class={cn(cx?.textMuted ?? 'text-nb-black/50')}>{totalCount}</span>
          {' '}items
        {/if}
      </span>
      {#if matchCount === 0}
        <Button variant="ghost" size="bare"
          onclick={() => onQueryChange('')}
          class="text-sm text-nb-orange hover:text-nb-orange font-medium transition-nb"
        >
          Clear search
        </Button>
      {/if}
    </div>
  {/if}
</div>
