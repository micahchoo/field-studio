<!--
  ViewerSearchPanel — IIIF Content Search 2.0 UI
  React source: src/features/viewer/ui/molecules/ViewerSearchPanel.tsx (464 lines)
  Layer: molecule (FSD features/viewer/ui/molecules)

  Search form with autocomplete, debounced suggestions, grouped results by
  canvas, keyboard navigation (arrow keys, enter, escape).
-->

<script module lang="ts">
  export interface SearchResult {
    id: string;
    canvasId: string;
    text: string;
    selector?: {
      prefix?: string;
      exact: string;
      suffix?: string;
    };
    region?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    time?: {
      start: number;
      end?: number;
    };
  }

  export interface SearchService {
    id: string;
    type: string;
    profile?: string;
  }

  /** Format seconds to MM:SS */
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IIIFManifest } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';

  interface Props {
    manifest: IIIFManifest | null;
    searchService: SearchService | null;
    onResultSelect: (result: SearchResult) => void;
    onResultsChange?: (results: SearchResult[]) => void;
    currentCanvasId?: string;
    cx?: ContextualClassNames | Record<string, string>;
    fieldMode?: boolean;
    onSearch: (query: string) => Promise<SearchResult[]>;
    onFetchSuggestions?: (input: string) => Promise<Array<{ value: string; count?: number }>>;
  }

  let {
    manifest: _manifest,
    searchService,
    onResultSelect,
    onResultsChange,
    currentCanvasId,
    cx: _cx,
    fieldMode = false,
    onSearch,
    onFetchSuggestions,
  }: Props = $props();

  // Internal state
  let query = $state('');
  let localQuery = $state('');
  let results = $state<SearchResult[]>([]);
  let suggestions = $state<Array<{ value: string; count?: number }>>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let total = $state(0);
  let showSuggestions = $state(false);
  let selectedIndex = $state(-1);
  let suggestionTimeoutId: ReturnType<typeof setTimeout> | undefined;

  // Derived styling
  let bgClass = $derived(fieldMode ? 'bg-nb-black' : 'bg-nb-white');
  let textClass = $derived(fieldMode ? 'text-white' : 'text-nb-black');
  let borderClass = $derived(fieldMode ? 'border-nb-black' : 'border-nb-black/20');
  let mutedTextClass = $derived(fieldMode ? 'text-nb-black/40' : 'text-nb-black/50');

  // Group results by canvas
  let groupedResults = $derived.by(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const result of results) {
      if (!groups[result.canvasId]) {
        groups[result.canvasId] = [];
      }
      groups[result.canvasId].push(result);
    }
    return groups;
  });

  // Perform search
  async function performSearch(searchQuery: string) {
    if (!searchService || !searchQuery.trim()) {
      results = [];
      total = 0;
      onResultsChange?.([]);
      return;
    }

    loading = true;
    error = null;

    try {
      const searchResults = await onSearch(searchQuery);
      results = searchResults;
      total = searchResults.length;
      onResultsChange?.(searchResults);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Search failed';
      error = errorMessage;
      results = [];
      total = 0;
    } finally {
      loading = false;
    }
  }

  // Fetch autocomplete suggestions
  async function fetchSuggestions(input: string) {
    if (!onFetchSuggestions || input.length < 2) {
      suggestions = [];
      return;
    }

    try {
      const response = await onFetchSuggestions(input);
      suggestions = response;
      showSuggestions = true;
    } catch {
      suggestions = [];
    }
  }

  // Handle input changes with debounced suggestions
  function handleInputChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    localQuery = value;
    query = value;
    selectedIndex = -1;

    // Debounce suggestions
    if (suggestionTimeoutId) clearTimeout(suggestionTimeoutId);
    suggestionTimeoutId = setTimeout(() => {
      fetchSuggestions(value);
    }, 200);
  }

  // Handle form submission
  function handleSubmit(e: Event) {
    e.preventDefault();
    showSuggestions = false;
    performSearch(query);
  }

  // Select a suggestion
  function selectSuggestion(term: { value: string }) {
    localQuery = term.value;
    query = term.value;
    showSuggestions = false;
    performSearch(term.value);
  }

  // Keyboard navigation for autocomplete
  function handleKeyDown(e: KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      showSuggestions = false;
    }
  }

  // Clear search
  function clearSearch() {
    query = '';
    localQuery = '';
    results = [];
    suggestions = [];
    total = 0;
    error = null;
    onResultsChange?.([]);
  }

  // Highlight query matches in text
  function highlightParts(text: string, searchQuery: string): Array<{ text: string; isMatch: boolean }> {
    if (!searchQuery) return [{ text, isMatch: false }];
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return parts.map(part => ({
      text: part,
      isMatch: part.toLowerCase() === searchQuery.toLowerCase(),
    }));
  }
</script>

{#snippet highlightMatch(text: string, searchQuery: string)}
  {#each highlightParts(text, searchQuery) as segment}
    {#if segment.isMatch}
      <mark class={cn(
        'px-0.5 rounded',
        fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-yellow/60 text-nb-yellow'
      )}>{segment.text}</mark>
    {:else}
      {segment.text}
    {/if}
  {/each}
{/snippet}

{#snippet searchResultItem(result: SearchResult, searchQuery: string)}
  <div>
    <p class={cn('text-sm leading-relaxed', fieldMode ? 'text-nb-black/30' : 'text-nb-black/80')}>
      {#if result.selector}
        {#if result.selector.prefix}
          <span class={fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}>...{result.selector.prefix}</span>
        {/if}
        <mark class={cn(
          'px-0.5 font-medium',
          fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-yellow/60 text-nb-yellow'
        )}>{result.selector.exact}</mark>
        {#if result.selector.suffix}
          <span class={fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}>{result.selector.suffix}...</span>
        {/if}
      {:else}
        {@render highlightMatch(result.text.substring(0, 200), searchQuery)}
      {/if}
    </p>

    <!-- Location info -->
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
{/snippet}

{#if !searchService}
  <div class={cn('p-4 text-center', mutedTextClass)}>
    <Icon name="search_off" class="text-4xl mb-2 opacity-50" />
    <p class="text-sm">No search service available for this manifest.</p>
  </div>
{:else}
  <div class={cn('flex flex-col h-full', bgClass)}>
    <!-- Search Input -->
    <form onsubmit={handleSubmit} class={cn('p-3 border-b sticky top-0 z-10', borderClass, bgClass)}>
      <div class="relative">
        <div class="absolute left-3 top-1/2 -translate-y-1/2">
          <Icon name="search" class={mutedTextClass} />
        </div>
        <input
          type="text"
          value={localQuery}
          oninput={handleInputChange}
          onkeydown={handleKeyDown}
          onfocus={() => { if (suggestions.length > 0) showSuggestions = true; }}
          placeholder="Search within manifest..."
          class={cn(
            'w-full pl-10 pr-10 py-2 text-sm border font-mono',
            fieldMode ? 'bg-nb-black border-nb-black/80 text-white' : 'bg-nb-white border-nb-black/20 text-nb-black'
          )}
          aria-label="Search within manifest"
          aria-autocomplete={onFetchSuggestions ? 'list' : 'none'}
          aria-controls="search-suggestions"
          aria-expanded={showSuggestions}
        />
        {#if query}
          <div class="absolute right-2 top-1/2 -translate-y-1/2">
            <Button variant="ghost" size="bare" onclick={clearSearch} aria-label="Clear search">
              <Icon name="close" class={cn('text-sm', mutedTextClass)} />
            </Button>
          </div>
        {/if}

        <!-- Autocomplete Suggestions -->
        {#if showSuggestions && suggestions.length > 0}
          <ul
            id="search-suggestions"
            role="listbox"
            class={cn(
              'absolute top-full left-0 right-0 mt-1 border shadow-brutal z-20 max-h-60 overflow-auto',
              fieldMode ? 'bg-nb-black border-nb-black/80' : 'bg-nb-white border-nb-black/20'
            )}
          >
            {#each suggestions as term, index}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <li
                role="option"
                aria-selected={index === selectedIndex}
                onclick={() => selectSuggestion(term)}
                class={cn(
                  'px-4 py-2 cursor-pointer flex items-center justify-between',
                  index === selectedIndex
                    ? fieldMode ? 'bg-nb-blue text-nb-blue/60' : 'bg-nb-blue/10 text-nb-blue'
                    : fieldMode ? 'hover:bg-nb-black text-nb-black/30' : 'hover:bg-nb-white'
                )}
              >
                <span class="text-sm">{term.value}</span>
                {#if term.count}
                  <span class={cn('text-xs', mutedTextClass)}>{term.count}</span>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </form>

    <!-- Results -->
    <div class="flex-1 overflow-auto">
      {#if loading}
        <div class="flex items-center justify-center py-8">
          <div class="w-6 h-6 border-2 border-nb-black/20 border-t-nb-blue animate-spin"></div>
        </div>
      {/if}

      {#if error}
        <div class={cn(
          'p-4 m-3 border text-sm',
          fieldMode ? 'bg-nb-red/30 border-nb-red text-nb-red/60' : 'bg-nb-red/10 border-nb-red/30 text-nb-red'
        )}>
          <Icon name="error" class="inline mr-2" />
          {error}
        </div>
      {/if}

      {#if !loading && !error && results.length === 0 && query}
        <div class={cn('p-8 text-center', mutedTextClass)}>
          <Icon name="search_off" class="text-4xl mb-2 opacity-50" />
          <p class="text-sm">No results found for "{query}"</p>
        </div>
      {/if}

      {#if !loading && results.length > 0}
        <!-- Results Header -->
        <div class={cn(
          'px-4 py-2 border-b text-xs font-medium sticky top-0',
          fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white',
          mutedTextClass
        )}>
          {total} result{total !== 1 ? 's' : ''} for "{query}"
        </div>

        <!-- Grouped Results -->
        <div class="divide-y">
          {#each Object.entries(groupedResults) as [canvasId, canvasResults]}
            <div class={currentCanvasId === canvasId
              ? fieldMode ? 'bg-nb-blue/30' : 'bg-nb-blue/10'
              : ''
            }>
              <!-- Canvas Header -->
              <div class={cn(
                'px-4 py-2 text-xs font-medium flex items-center gap-2',
                fieldMode ? 'bg-nb-black/50' : 'bg-nb-cream/50',
                mutedTextClass
              )}>
                <Icon name="image" class="text-sm" />
                <span class="truncate flex-1">
                  {canvasId.split('/').pop()}
                </span>
                <span class={mutedTextClass}>
                  {canvasResults.length} hit{canvasResults.length !== 1 ? 's' : ''}
                </span>
              </div>

              <!-- Results for this canvas -->
              {#each canvasResults as result, index}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  onclick={() => onResultSelect(result)}
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onResultSelect(result); }}
                  class={cn(
                    'w-full px-4 py-3 text-left transition-nb group cursor-pointer',
                    fieldMode
                      ? 'hover:bg-nb-black text-nb-black/30'
                      : 'hover:bg-nb-white text-nb-black/80'
                  )}
                  role="button"
                  tabindex="0"
                >
                  {@render searchResultItem(result, query)}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
