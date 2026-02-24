<!--
  SearchView.svelte — Global Search View (Svelte 5)
  ==================================================
  Migrated from: src/features/search/ui/organisms/SearchView.tsx

  Full-text search with autocomplete, filter pills, and result cards.
  Uses the global search store singleton for query/result management.
-->

<script lang="ts">
  import { PaneLayout } from '@/src/shared/ui/layout';
  import ViewHeader from '@/src/shared/ui/molecules/ViewHeader/ViewHeader.svelte';
  import SearchField from '@/src/shared/ui/molecules/SearchField.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import { Row, Center } from '@/src/shared/ui/layout';
  import { cn } from '@/src/shared/lib/cn';
  import { search } from '@/src/shared/stores';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFItem } from '@/src/shared/types';
  import type { SearchResult, SearchIndexEntry } from '@/src/shared/types/search-api';
  import { buildIndexEntries } from '@/src/shared/services/searchService';

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface SearchViewProps {
    root: IIIFItem | null;
    cx: ContextualClassNames;
    fieldMode: boolean;
    t: (key: string) => string;
    onSelect: (id: string) => void;
    onRevealMap?: (id: string) => void;
  }

  let {
    root,
    cx,
    fieldMode,
    t,
    onSelect,
    onRevealMap,
  }: SearchViewProps = $props();

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  type SearchFilter = 'All' | 'Manifest' | 'Canvas' | 'Annotation';
  const FILTER_OPTIONS: SearchFilter[] = ['All', 'Manifest', 'Canvas', 'Annotation'];
  const SEARCH_TIPS = ['sunset', 'archaeological site', '2017', 'portrait'];

  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------

  let showAutocomplete = $state(false);
  let autocompleteIndex = $state(-1);
  let activeFilter = $state<SearchFilter>('All');

  let inputRef: HTMLInputElement | undefined = $state();
  let autocompleteRef: HTMLDivElement | undefined = $state();

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const hasQuery = $derived(search.query.trim().length >= 2);

  const filteredResults = $derived.by(() => {
    const results = search.allResults;
    if (activeFilter === 'All') return results;
    return results.filter((r: SearchResult) => {
      const et = r.entry.entityType;
      if (activeFilter === 'Annotation') return et === 'Annotation';
      return et === activeFilter;
    });
  });

  const resultCount = $derived(filteredResults.length);

  // Build display-friendly autocomplete items from suggestions
  const autocompleteSuggestions = $derived(
    search.suggestions.map((term) => term.value)
  );

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Build search index when root changes
  $effect(() => {
    if (!root) {
      search.clearIndex();
      return;
    }
    const entries = collectIndexEntries(root);
    search.rebuildIndex(entries);
  });

  // Close autocomplete on outside click
  $effect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        autocompleteRef && !autocompleteRef.contains(target) &&
        inputRef && !inputRef.contains(target)
      ) {
        showAutocomplete = false;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Recursively collect search index entries from the IIIF tree */
  function collectIndexEntries(item: IIIFItem): SearchIndexEntry[] {
    const entries: SearchIndexEntry[] = [];

    entries.push(...buildIndexEntries(
      item.id,
      item.type,
      {
        label: item.label,
        summary: item.summary,
        metadata: item.metadata,
      },
    ));

    if (item.items && Array.isArray(item.items)) {
      for (const child of item.items) {
        if (child && typeof child === 'object' && 'id' in child) {
          entries.push(...collectIndexEntries(child as IIIFItem));
        }
      }
    }

    return entries;
  }

  function getResultCountText(count: number): string {
    return `${count} result${count === 1 ? '' : 's'}`;
  }

  function getResultLabel(result: SearchResult): string {
    return result.entry.text.slice(0, 80) || result.entry.entityId;
  }

  function getMatchSnippet(result: SearchResult): string {
    if (result.highlights.length === 0) return '';
    const h = result.highlights[0];
    return `${h.prefix}${h.exact}${h.suffix}`;
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  function handleResultSelect(id: string) {
    // Future: Pipeline navigation to archive view
    onSelect(id);
  }

  function handleQueryChange(value: string) {
    search.query = value;
    showAutocomplete = true;
    autocompleteIndex = -1;
    if (value.length >= 2) {
      search.fetchSuggestions(value);
    } else {
      search.clearSuggestions();
    }
  }

  function handleSelectSuggestion(value: string) {
    search.query = value;
    showAutocomplete = false;
    autocompleteIndex = -1;
    search.clearSuggestions();
    inputRef?.focus();
  }

  function handleFilterChange(f: SearchFilter) {
    activeFilter = f;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!showAutocomplete || autocompleteSuggestions.length === 0) {
      if (e.key === 'Escape') {
        showAutocomplete = false;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        autocompleteIndex = Math.min(autocompleteIndex + 1, autocompleteSuggestions.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        autocompleteIndex = Math.max(autocompleteIndex - 1, -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (autocompleteIndex >= 0 && autocompleteIndex < autocompleteSuggestions.length) {
          handleSelectSuggestion(autocompleteSuggestions[autocompleteIndex]);
        }
        break;
      case 'Escape':
        showAutocomplete = false;
        autocompleteIndex = -1;
        break;
    }
  }

  function handleTipClick(tip: string) {
    search.query = tip;
    showAutocomplete = false;
  }

  function handleClearQuery() {
    search.reset();
    activeFilter = 'All';
    inputRef?.focus();
  }
</script>

<PaneLayout variant="default">
  {#snippet header()}
    <ViewHeader {cx}>
      {#snippet title()}
        <span class={cn('font-mono uppercase text-sm font-semibold', cx.text)}>
          Search
        </span>
        {#if hasQuery && resultCount > 0}
          <div class={cn('h-4 w-px', fieldMode ? 'bg-nb-yellow/40' : 'bg-nb-black/20')}></div>
          <span class={cn(
            'text-[10px] font-bold uppercase font-mono',
            fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'
          )}>
            {getResultCountText(resultCount)}
          </span>
        {/if}
      {/snippet}

      {#snippet actions()}
        {#if !search.query && !search.isIndexing}
          <div class={cn('flex items-center gap-1 text-xs', cx.textMuted)}>
            <span class="text-[10px] font-mono uppercase">Try:</span>
            {#each SEARCH_TIPS as tip}
              <button
                type="button"
                class={cn(
                  'px-1.5 py-0.5 text-[10px] font-mono border-0 bg-transparent cursor-pointer',
                  fieldMode
                    ? 'text-nb-yellow/40 hover:text-nb-yellow hover:bg-nb-yellow/10'
                    : 'text-nb-black/40 hover:text-nb-black hover:bg-nb-black/10'
                )}
                onclick={() => handleTipClick(tip)}
              >
                {tip}
              </button>
            {/each}
          </div>
        {/if}
      {/snippet}

      {#snippet subbar()}
        <!-- Search field with autocomplete -->
        <div class="flex-1 max-w-xl relative" role="search">
          <SearchField
            bind:value={search.query}
            {cx}
            placeholder="Search items, metadata, or content..."
            autoFocus
            width="w-full"
          />
          <!-- We capture keydown and focus on the wrapping div for the autocomplete -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onkeydown={handleKeyDown}
            onfocusin={() => { showAutocomplete = true; }}
            class="absolute inset-0 pointer-events-none"
          ></div>

          {#if showAutocomplete && autocompleteSuggestions.length > 0}
            <div
              bind:this={autocompleteRef}
              class={cn(
                'absolute top-full left-0 right-0 mt-1 z-20 overflow-hidden border',
                fieldMode
                  ? 'bg-nb-black border-nb-black/80 shadow-brutal-field'
                  : 'bg-nb-white border-nb-black/20 shadow-brutal'
              )}
              role="listbox"
              aria-label="Search suggestions"
            >
              {#each autocompleteSuggestions as suggestion, i (suggestion)}
                <button
                  type="button"
                  class={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left text-sm border-0 cursor-pointer',
                    i === autocompleteIndex
                      ? 'bg-iiif-blue text-white'
                      : fieldMode
                        ? 'hover:bg-nb-black/80 text-nb-yellow/80 bg-transparent'
                        : 'hover:bg-nb-cream text-nb-black/80 bg-transparent'
                  )}
                  aria-label={suggestion}
                  onclick={() => handleSelectSuggestion(suggestion)}
                  role="option"
                  aria-selected={i === autocompleteIndex}
                  id="autocomplete-option-{i}"
                >
                  <span class="flex-1 font-medium">{suggestion}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Filter pills -->
        <div class="flex gap-1.5 overflow-x-auto" role="radiogroup" aria-label="Result type filter">
          {#each FILTER_OPTIONS as filterOption (filterOption)}
            <button
              type="button"
              class={cn(
                'px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider font-mono border-0 cursor-pointer shrink-0',
                activeFilter === filterOption
                  ? (fieldMode
                    ? 'bg-nb-yellow text-nb-black'
                    : 'bg-nb-black text-nb-white')
                  : (fieldMode
                    ? 'bg-nb-yellow/10 text-nb-yellow/60 hover:text-nb-yellow'
                    : 'bg-nb-cream text-nb-black/50 hover:text-nb-black')
              )}
              onclick={() => handleFilterChange(filterOption)}
              aria-checked={activeFilter === filterOption}
              role="radio"
            >
              {filterOption === 'All' ? filterOption : t(filterOption)}
              {#if activeFilter === filterOption && filterOption !== 'All' && hasQuery}
                <span class="ml-1 opacity-70">({resultCount})</span>
              {/if}
            </button>
          {/each}
        </div>
      {/snippet}
    </ViewHeader>
  {/snippet}

  {#snippet body()}
    <div class={cn('p-4 sm:p-6', cx.surface)}>
      <div class="max-w-3xl mx-auto w-full space-y-4">
        {#if search.isIndexing}
          <!-- Indexing state -->
          <div class={cn('text-center py-12', fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/60')}>
            <div class="w-16 h-16 mx-auto mb-4 relative">
              <svg class="w-full h-full animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Updating Search Index</h3>
            <p class="text-sm mb-4">This may take a few minutes for large archives</p>
            <div class={cn('w-64 h-2 mx-auto overflow-hidden', fieldMode ? 'bg-nb-black' : 'bg-nb-black/10')}>
              <div class="h-full bg-nb-orange animate-pulse w-2/3"></div>
            </div>
          </div>
        {:else if hasQuery && resultCount > 0}
          <!-- Results list -->
          <p
            class={cn('text-xs font-bold uppercase tracking-widest mb-4', cx.textMuted)}
            aria-live="polite"
          >
            {getResultCountText(resultCount)}
          </p>
          <div role="list" aria-label="Search results">
            {#each filteredResults as result (result.entry.id)}
              <button
                type="button"
                class={cn(
                  'w-full text-left p-4 border-b flex gap-3 cursor-pointer border-0',
                  'transition-nb',
                  cx.surface,
                  cx.border ? `border-b ${cx.border}` : 'border-b border-nb-black/10',
                  fieldMode ? 'hover:bg-nb-yellow/10' : 'hover:bg-nb-cream'
                )}
                onclick={() => handleResultSelect(result.entry.entityId)}
              >
                <div class="flex-1 min-w-0">
                  <p class={cn('font-medium truncate', cx.text)}>
                    {getResultLabel(result)}
                  </p>
                  <div class={cn('flex items-center gap-2 mt-1 text-xs', cx.textMuted)}>
                    <span class={cn(
                      'inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase',
                      fieldMode ? 'bg-nb-yellow/20 text-nb-yellow/80' : 'bg-nb-cream text-nb-black/60'
                    )}>
                      {result.entry.entityType}
                    </span>
                    <span class="truncate">
                      {result.entry.field}: {getMatchSnippet(result)}
                    </span>
                  </div>
                  {#if result.highlights.length > 0}
                    <p class={cn('text-sm mt-1.5', cx.textMuted)}>
                      <span class="opacity-60">{result.highlights[0].prefix}</span>
                      <mark class={cn(
                        'font-bold px-0.5',
                        fieldMode ? 'bg-nb-yellow/30 text-nb-yellow' : 'bg-nb-orange/20 text-nb-black'
                      )}>
                        {result.highlights[0].exact}
                      </mark>
                      <span class="opacity-60">{result.highlights[0].suffix}</span>
                    </p>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {:else if hasQuery && resultCount === 0}
          <!-- No results -->
          <Center flex>
            <div class={cn('text-center py-12', fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/60')}>
              <div class={cn(
                'w-16 h-16 mx-auto mb-4 flex items-center justify-center',
                fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-cream'
              )}>
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold mb-2">No results for "{search.query}"</h3>
              <p class="text-sm mb-4">Try different keywords or remove filters.</p>
              <Row gap="sm" justify="center">
                <Button size="sm" variant="secondary" onclick={handleClearQuery}>
                  Clear Search
                </Button>
                {#if activeFilter !== 'All'}
                  <Button size="sm" variant="ghost" onclick={() => { activeFilter = 'All'; }}>
                    Reset Filters
                  </Button>
                {/if}
              </Row>
            </div>
          </Center>
        {:else}
          <!-- Initial state: search tips -->
          <div class={cn('text-center py-12', fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/60')}>
            <div class={cn(
              'w-16 h-16 mx-auto mb-4 flex items-center justify-center',
              fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-cream'
            )}>
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Search Your Archive</h3>
            <p class="text-sm mb-4">Find items by name, metadata, or content</p>
            <div class={cn(
              'text-xs p-4 max-w-sm mx-auto text-left',
              fieldMode ? 'bg-nb-yellow/10 text-nb-yellow/60' : 'bg-nb-cream text-nb-black/60'
            )}>
              <p class="font-medium mb-2">Search tips:</p>
              <ul class="space-y-1 list-disc list-inside">
                <li>Use specific keywords for better results</li>
                <li>Filter by type using the pills above</li>
                <li>Search looks at titles, descriptions, and metadata</li>
              </ul>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/snippet}
</PaneLayout>
