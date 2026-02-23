/**
 * Search — State container with async (Category 2+4)
 *
 * Replaces useSearch React hook.
 * Architecture doc §4 Cat 2+4: Reactive class + async methods.
 *
 * Full-text search with autocomplete, keyboard navigation,
 * and recent search tracking.
 *
 * Usage in Svelte component:
 *   const search = new SearchStore();
 *
 *   // Reactive reads in template / $derived
 *   search.results
 *   search.resultCount
 *   search.hasResults
 *
 *   // Mutations
 *   search.setQuery('painting')
 *   search.setFilter('Canvas')
 *
 *   // Cleanup
 *   onDestroy(() => search.destroy());
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type SearchFilter = 'All' | 'Manifest' | 'Canvas' | 'Annotation';

export interface SearchResult {
  id: string;
  type: string;
  label: string;
  snippet?: string;
  score: number;
  parentLabel?: string;
}

/** An indexable item fed into the search engine */
export interface IndexableItem {
  id: string;
  type: string;
  label: string;
  metadata?: Record<string, string>;
  parentLabel?: string;
}

// ──────────────────────────────────────────────
// Internal search index entry (pre-processed for fast matching)
// ──────────────────────────────────────────────

interface IndexEntry {
  item: IndexableItem;
  /** Lowercased label for matching */
  labelLower: string;
  /** Lowercased metadata values concatenated */
  metaLower: string;
  /** Individual lowercased tokens from label + metadata */
  tokens: string[];
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const MAX_RECENT = 10;
const MAX_AUTOCOMPLETE = 8;

// ──────────────────────────────────────────────
// Store class
// ──────────────────────────────────────────────

export class SearchStore {
  // -- Reactive state (Svelte 5 runes) --
  #query = $state('');
  #results = $state<SearchResult[]>([]);
  #filter = $state<SearchFilter>('All');
  #isIndexing = $state(false);
  #autocompleteResults = $state<string[]>([]);
  #autocompleteIndex = $state(-1);
  #showAutocomplete = $state(false);
  #recentSearches = $state<string[]>([]);

  // -- Non-reactive internals --
  #index: IndexEntry[] = [];
  #debounceTimer: ReturnType<typeof setTimeout> | null = null;
  #debounceMs = 300;

  // ──────────────────────────────────────────────
  // Reactive getters — tracked by Svelte's runtime
  // ──────────────────────────────────────────────

  get query(): string { return this.#query; }
  get results(): SearchResult[] { return this.#results; }
  get filter(): SearchFilter { return this.#filter; }
  get isIndexing(): boolean { return this.#isIndexing; }
  get resultCount(): number { return this.#results.length; }
  get autocompleteResults(): string[] { return this.#autocompleteResults; }
  get autocompleteIndex(): number { return this.#autocompleteIndex; }
  get showAutocomplete(): boolean { return this.#showAutocomplete; }
  get recentSearches(): string[] { return this.#recentSearches; }
  get hasResults(): boolean { return this.#results.length > 0; }

  // ──────────────────────────────────────────────
  // Public mutations — query and filter
  // ──────────────────────────────────────────────

  /**
   * Set the search query. Triggers debounced search execution
   * and updates autocomplete suggestions.
   */
  setQuery(query: string): void {
    this.#query = query;

    // If query is empty, clear results and hide autocomplete
    if (!query.trim()) {
      this.#results = [];
      this.#autocompleteResults = [];
      this.#showAutocomplete = false;
      this.#autocompleteIndex = -1;
      if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
      return;
    }

    // Update autocomplete immediately (cheap operation)
    this.#autocompleteResults = this.#getAutocomplete(query);
    this.#showAutocomplete = this.#autocompleteResults.length > 0;
    this.#autocompleteIndex = -1;

    // Debounce the actual search execution
    if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => {
      this.#executeSearch();
      this.#addToRecent(query);
    }, this.#debounceMs);
  }

  /** Set type filter and re-execute search immediately */
  setFilter(filter: SearchFilter): void {
    this.#filter = filter;
    // Re-run search with new filter (no debounce needed)
    if (this.#query.trim()) {
      this.#executeSearch();
    }
  }

  /** Clear query, results, and autocomplete */
  clearQuery(): void {
    this.#query = '';
    this.#results = [];
    this.#autocompleteResults = [];
    this.#showAutocomplete = false;
    this.#autocompleteIndex = -1;
    if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
  }

  // ──────────────────────────────────────────────
  // Autocomplete — keyboard navigation for suggestion list
  // ──────────────────────────────────────────────

  /** Select an autocomplete suggestion by index, set it as query, execute */
  selectAutocomplete(index: number): void {
    if (index < 0 || index >= this.#autocompleteResults.length) return;
    const selected = this.#autocompleteResults[index];
    this.#query = selected;
    this.#showAutocomplete = false;
    this.#autocompleteIndex = -1;

    // Execute immediately (user made a deliberate choice)
    if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
    this.#executeSearch();
    this.#addToRecent(selected);
  }

  /** Navigate the autocomplete list with arrow keys */
  navigateAutocomplete(direction: 'up' | 'down'): void {
    const count = this.#autocompleteResults.length;
    if (count === 0) return;

    if (direction === 'down') {
      // Wrap around: -1 -> 0 -> 1 -> ... -> count-1 -> -1
      this.#autocompleteIndex =
        this.#autocompleteIndex >= count - 1 ? -1 : this.#autocompleteIndex + 1;
    } else {
      // Wrap around: -1 -> count-1 -> count-2 -> ... -> 0 -> -1
      this.#autocompleteIndex =
        this.#autocompleteIndex <= -1 ? count - 1 : this.#autocompleteIndex - 1;
    }
  }

  /** Hide autocomplete dropdown */
  closeAutocomplete(): void {
    this.#showAutocomplete = false;
    this.#autocompleteIndex = -1;
  }

  // ──────────────────────────────────────────────
  // Recent searches
  // ──────────────────────────────────────────────

  /** Clear all saved recent searches */
  clearRecentSearches(): void {
    this.#recentSearches = [];
  }

  // ──────────────────────────────────────────────
  // Index building — call when root/manifest changes
  // ──────────────────────────────────────────────

  /**
   * Build the search index from a flat list of items.
   * Tokenizes labels and metadata values for fast matching.
   * Call this when the vault root changes.
   */
  buildIndex(
    items: Array<{
      id: string;
      type: string;
      label: string;
      metadata?: Record<string, string>;
      parentLabel?: string;
    }>
  ): void {
    this.#isIndexing = true;

    // Pseudocode:
    // For each item:
    //   - lowercase the label
    //   - lowercase + concatenate all metadata values
    //   - tokenize label + metadata into searchable tokens
    //   - store as IndexEntry for fast matching

    this.#index = items.map((item) => {
      const labelLower = (item.label || '').toLowerCase();
      const metaValues = item.metadata ? Object.values(item.metadata) : [];
      const metaLower = metaValues.map((v) => v.toLowerCase()).join(' ');

      // Build token list from label words + metadata words
      const allText = `${labelLower} ${metaLower}`;
      const tokens = allText
        .split(/[\s,;:._\-/\\|]+/)
        .filter((t) => t.length > 0);

      return {
        item,
        labelLower,
        metaLower,
        tokens,
      };
    });

    this.#isIndexing = false;

    // Re-run search if there's an active query
    if (this.#query.trim()) {
      this.#executeSearch();
    }
  }

  // ──────────────────────────────────────────────
  // Internal: search execution engine
  // ──────────────────────────────────────────────

  /**
   * Execute search against the index.
   *
   * Scoring algorithm:
   *   - Exact label match:      100 points
   *   - Label starts with term:  50 points (per term)
   *   - Label contains term:     20 points (per term)
   *   - Metadata contains term:   5 points (per term)
   *   - Multiple term matches get additive scoring
   */
  #executeSearch(): void {
    const raw = this.#query.trim().toLowerCase();
    if (!raw) {
      this.#results = [];
      return;
    }

    // Tokenize the query into individual search terms
    const queryTerms = raw
      .split(/[\s,;:._\-/\\|]+/)
      .filter((t) => t.length > 0);

    if (queryTerms.length === 0) {
      this.#results = [];
      return;
    }

    // Pseudocode:
    // For each indexed entry:
    //   - Skip if filter is set and type doesn't match
    //   - Score each query term against label and metadata
    //   - If score > 0, add to results with snippet
    // Sort results by score descending

    const scored: SearchResult[] = [];

    for (const entry of this.#index) {
      // Apply type filter
      if (this.#filter !== 'All' && entry.item.type !== this.#filter) {
        continue;
      }

      let score = 0;
      let snippet: string | undefined;

      // Check for exact full-query match on label
      if (entry.labelLower === raw) {
        score += 100;
      }

      // Score each query term
      for (const term of queryTerms) {
        // Label prefix match (starts with)
        if (entry.labelLower.startsWith(term)) {
          score += 50;
        }
        // Label contains match
        else if (entry.labelLower.includes(term)) {
          score += 20;
        }

        // Metadata contains match
        if (entry.metaLower.includes(term)) {
          score += 5;
          // Extract snippet from metadata showing the match context
          if (!snippet) {
            snippet = this.#extractSnippet(entry.metaLower, term);
          }
        }

        // Token exact match bonus (a full token matches exactly)
        if (entry.tokens.includes(term)) {
          score += 10;
        }
      }

      if (score > 0) {
        scored.push({
          id: entry.item.id,
          type: entry.item.type,
          label: entry.item.label,
          snippet,
          score,
          parentLabel: entry.item.parentLabel,
        });
      }
    }

    // Sort by score descending, then by label alphabetically for ties
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.label.localeCompare(b.label);
    });

    this.#results = scored;
  }

  /** Extract a snippet around the first occurrence of a term in text */
  #extractSnippet(text: string, term: string): string {
    const idx = text.indexOf(term);
    if (idx === -1) return '';

    const snippetRadius = 40;
    const start = Math.max(0, idx - snippetRadius);
    const end = Math.min(text.length, idx + term.length + snippetRadius);

    let snippet = text.slice(start, end).trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Add a query to the recent searches list.
   * Deduplicates, moves to front, trims to MAX_RECENT.
   */
  #addToRecent(query: string): void {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    // Remove duplicate if it exists, then prepend
    const filtered = this.#recentSearches.filter(
      (r) => r.toLowerCase() !== trimmed.toLowerCase()
    );
    this.#recentSearches = [trimmed, ...filtered].slice(0, MAX_RECENT);
  }

  /**
   * Get autocomplete suggestions from index tokens and recent searches.
   * Returns unique suggestions matching the partial query.
   */
  #getAutocomplete(partial: string): string[] {
    const lower = partial.trim().toLowerCase();
    if (!lower) return [];

    // Pseudocode:
    // 1. Collect matching labels from the index (prefix match)
    // 2. Collect matching recent searches (prefix match)
    // 3. Deduplicate and limit to MAX_AUTOCOMPLETE

    const suggestions = new Set<string>();

    // From recent searches (higher priority — added first)
    for (const recent of this.#recentSearches) {
      if (recent.toLowerCase().startsWith(lower) && recent.toLowerCase() !== lower) {
        suggestions.add(recent);
      }
      if (suggestions.size >= MAX_AUTOCOMPLETE) break;
    }

    // From indexed labels (prefix or contains match)
    for (const entry of this.#index) {
      if (suggestions.size >= MAX_AUTOCOMPLETE) break;

      if (
        entry.labelLower.startsWith(lower) &&
        entry.labelLower !== lower
      ) {
        suggestions.add(entry.item.label);
      }
    }

    return Array.from(suggestions).slice(0, MAX_AUTOCOMPLETE);
  }

  // ──────────────────────────────────────────────
  // Display utilities
  // ──────────────────────────────────────────────

  /** Format result count text with pluralization */
  getResultCountText(): string {
    const count = this.#results.length;
    if (count === 0) return 'No results';
    if (count === 1) return '1 result';
    return `${count} results`;
  }

  // ──────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────

  /** Clean up timers. Call from onDestroy or $effect cleanup. */
  destroy(): void {
    if (this.#debounceTimer) {
      clearTimeout(this.#debounceTimer);
      this.#debounceTimer = null;
    }
  }
}
