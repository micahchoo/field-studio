<!--
  SearchResultItem -- Single search result with highlighted matches and location info

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Renders a search result with text highlighting, selector context (prefix/exact/suffix),
  region coordinates, and time information.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import type { SearchResult } from '../molecules/ViewerSearchPanel.svelte';

  interface Props {
    result: SearchResult;
    query: string;
    fieldMode?: boolean;
  }

  let { result, query, fieldMode = false }: Props = $props();

  function highlightParts(text: string, searchQuery: string): Array<{ text: string; isMatch: boolean }> {
    if (!searchQuery) return [{ text, isMatch: false }];
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return parts.map(part => ({
      text: part,
      isMatch: part.toLowerCase() === searchQuery.toLowerCase(),
    }));
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  let markClass = $derived(cn('px-0.5 font-medium', fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-yellow/60 text-nb-yellow'));
</script>

<div>
  <p class={cn('text-sm leading-relaxed', fieldMode ? 'text-nb-black/30' : 'text-nb-black/80')}>
    {#if result.selector}
      {#if result.selector.prefix}
        <span class={fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}>...{result.selector.prefix}</span>
      {/if}
      <mark class={markClass}>{result.selector.exact}</mark>
      {#if result.selector.suffix}
        <span class={fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}>{result.selector.suffix}...</span>
      {/if}
    {:else}
      {#each highlightParts(result.text.substring(0, 200), query) as segment}
        {#if segment.isMatch}
          <mark class={cn('px-0.5 rounded', fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-yellow/60 text-nb-yellow')}>{segment.text}</mark>
        {:else}
          {segment.text}
        {/if}
      {/each}
    {/if}
  </p>

  <div class={cn('flex items-center gap-3 mt-1.5 text-xs', fieldMode ? 'text-nb-black/50' : 'text-nb-black/40')}>
    {#if result.region}
      <span class="flex items-center gap-1">
        <Icon name="crop" class="text-sm" />
        {result.region.x},{result.region.y}
      </span>
    {/if}
    {#if result.time}
      <span class="flex items-center gap-1">
        <Icon name="schedule" class="text-sm" />
        {formatTime(result.time.start)}
        {#if result.time.end}
          {' '}- {formatTime(result.time.end)}
        {/if}
      </span>
    {/if}
    <Icon
      name="arrow_forward"
      class={cn('text-sm ml-auto opacity-0 group-hover:opacity-100 transition-nb', fieldMode ? 'text-nb-black/40' : '')}
    />
  </div>
</div>
