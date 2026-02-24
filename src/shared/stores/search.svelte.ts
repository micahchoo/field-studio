/**
 * Search Store — Svelte 5 Runes Interface
 *
 * Reactive wrapper around searchService for Content Search API 2.0.
 * Manages query state, local/remote results, facets, and index status.
 *
 * Usage:
 *   import { search } from '@/src/shared/stores/search.svelte';
 *
 *   search.query = 'sunset';          // triggers re-search
 *   search.results                     // reactive result list
 *   search.facets                      // reactive facet counts
 *   search.isSearching                 // loading state
 */

import type {
  SearchResult,
  SearchFacets,
  SearchIndexEntry,
  SearchQuery,
  Term,
} from '@/src/shared/types/search-api';
import {
  computeFacets,
  queryRemoteSearch,
  fetchAutocompleteSuggestions,
  parseSearchResponse,
} from '@/src/shared/services/searchService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchScope = 'all' | 'local' | 'remote';
export type SearchField = 'all' | 'label' | 'summary' | 'metadata' | 'annotation_body' | 'annotation_tag';

interface RemoteSearchEndpoint {
  serviceId: string;
  label: string;
  autocompleteId?: string;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

class SearchStore {
  // ── Query state ──
  #query = $state('');
  #scope = $state<SearchScope>('all');
  #field = $state<SearchField>('all');
  #motivation = $state<string | undefined>(undefined);

  // ── Results ──
  #localResults = $state<SearchResult[]>([]);
  #remoteResults = $state<SearchResult[]>([]);
  #remoteTotalHits = $state(0);
  #remoteNextPage = $state<string | undefined>(undefined);

  // ── Facets ──
  #facets = $state<SearchFacets>({});

  // ── Status ──
  #isSearching = $state(false);
  #isIndexing = $state(false);
  #indexedCount = $state(0);
  #error = $state<string | null>(null);

  // ── Autocomplete ──
  #suggestions = $state<Term[]>([]);

  // ── Remote endpoints (populated when remote manifests declare SearchService2) ──
  #remoteEndpoints = $state<RemoteSearchEndpoint[]>([]);

  // ── Internal ──
  #localIndex: SearchIndexEntry[] = [];
  #searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ──────────────────────────────────────────────
  // Getters — reactive reads
  // ──────────────────────────────────────────────

  get query(): string { return this.#query; }
  set query(v: string) {
    this.#query = v;
    this.#debouncedSearch();
  }

  get scope(): SearchScope { return this.#scope; }
  set scope(v: SearchScope) { this.#scope = v; this.#executeSearch(); }

  get field(): SearchField { return this.#field; }
  set field(v: SearchField) { this.#field = v; this.#executeSearch(); }

  get motivation(): string | undefined { return this.#motivation; }
  set motivation(v: string | undefined) { this.#motivation = v; this.#executeSearch(); }

  get localResults(): readonly SearchResult[] { return this.#localResults; }
  get remoteResults(): readonly SearchResult[] { return this.#remoteResults; }
  get allResults(): readonly SearchResult[] {
    if (this.#scope === 'local') return this.#localResults;
    if (this.#scope === 'remote') return this.#remoteResults;
    return [...this.#localResults, ...this.#remoteResults];
  }
  get totalHits(): number {
    return this.#localResults.length + this.#remoteTotalHits;
  }
  get hasMoreRemote(): boolean { return !!this.#remoteNextPage; }

  get facets(): SearchFacets { return this.#facets; }
  get isSearching(): boolean { return this.#isSearching; }
  get isIndexing(): boolean { return this.#isIndexing; }
  get indexedCount(): number { return this.#indexedCount; }
  get error(): string | null { return this.#error; }
  get suggestions(): readonly Term[] { return this.#suggestions; }
  get remoteEndpoints(): readonly RemoteSearchEndpoint[] { return this.#remoteEndpoints; }

  // ──────────────────────────────────────────────
  // Index Management
  // ──────────────────────────────────────────────

  /** Rebuild the local search index from scratch */
  rebuildIndex(entries: SearchIndexEntry[]): void {
    this.#isIndexing = true;
    this.#localIndex = entries;
    this.#indexedCount = entries.length;
    this.#isIndexing = false;
  }

  /** Incrementally add entries to the index */
  addToIndex(entries: SearchIndexEntry[]): void {
    this.#localIndex.push(...entries);
    this.#indexedCount = this.#localIndex.length;
  }

  /** Remove entries for an entity from the index */
  removeFromIndex(entityId: string): void {
    this.#localIndex = this.#localIndex.filter((e) => e.entityId !== entityId);
    this.#indexedCount = this.#localIndex.length;
  }

  /** Clear the entire index */
  clearIndex(): void {
    this.#localIndex = [];
    this.#indexedCount = 0;
    this.#localResults = [];
    this.#facets = {};
  }

  // ──────────────────────────────────────────────
  // Remote Endpoint Registration
  // ──────────────────────────────────────────────

  /** Register a remote SearchService2 endpoint */
  registerRemoteEndpoint(endpoint: RemoteSearchEndpoint): void {
    const exists = this.#remoteEndpoints.some((e) => e.serviceId === endpoint.serviceId);
    if (!exists) {
      this.#remoteEndpoints = [...this.#remoteEndpoints, endpoint];
    }
  }

  /** Remove a remote endpoint */
  unregisterRemoteEndpoint(serviceId: string): void {
    this.#remoteEndpoints = this.#remoteEndpoints.filter((e) => e.serviceId !== serviceId);
  }

  // ──────────────────────────────────────────────
  // Search Execution
  // ──────────────────────────────────────────────

  #debouncedSearch(): void {
    if (this.#searchDebounceTimer) clearTimeout(this.#searchDebounceTimer);
    this.#searchDebounceTimer = setTimeout(() => this.#executeSearch(), 200);
  }

  #executeSearch(): void {
    const q = this.#query.trim();
    if (!q) {
      this.#localResults = [];
      this.#remoteResults = [];
      this.#remoteTotalHits = 0;
      this.#facets = {};
      this.#error = null;
      return;
    }

    this.#isSearching = true;
    this.#error = null;

    // Local search (synchronous — simple substring for now, FlexSearch integration later)
    if (this.#scope !== 'remote') {
      this.#searchLocal(q);
    }

    // Remote search (async)
    if (this.#scope !== 'local' && this.#remoteEndpoints.length > 0) {
      this.#searchRemote(q);
    } else {
      this.#remoteResults = [];
      this.#remoteTotalHits = 0;
      this.#isSearching = false;
    }
  }

  #searchLocal(q: string): void {
    const lower = q.toLowerCase();
    const fieldFilter = this.#field;
    const motivationFilter = this.#motivation;

    const matches: SearchResult[] = [];
    for (const entry of this.#localIndex) {
      // Field filter
      if (fieldFilter !== 'all' && entry.field !== fieldFilter) continue;

      // Text match
      const idx = entry.text.toLowerCase().indexOf(lower);
      if (idx === -1) continue;

      // Motivation filter (only applies to annotation entries)
      if (motivationFilter && entry.field.startsWith('annotation_')) {
        // Simplified — full FlexSearch integration would handle this
      }

      matches.push({
        entry,
        score: 1.0 / (idx + 1), // Simple relevance: earlier match = higher score
        highlights: [
          {
            prefix: entry.text.slice(Math.max(0, idx - 40), idx),
            exact: entry.text.slice(idx, idx + q.length),
            suffix: entry.text.slice(idx + q.length, idx + q.length + 40),
          },
        ],
      });
    }

    // Sort by score (descending)
    matches.sort((a, b) => b.score - a.score);

    this.#localResults = matches;
    this.#facets = computeFacets(matches);
    if (this.#scope === 'local') this.#isSearching = false;
  }

  async #searchRemote(q: string): Promise<void> {
    try {
      const query: SearchQuery = { q };
      if (this.#motivation) query.motivation = this.#motivation;

      // Query all remote endpoints in parallel
      const results = await Promise.allSettled(
        this.#remoteEndpoints.map((ep) =>
          queryRemoteSearch(ep.serviceId, query),
        ),
      );

      const allRemote: SearchResult[] = [];
      let totalHits = 0;
      let nextPage: string | undefined;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allRemote.push(...result.value.results);
          totalHits += result.value.total;
          if (result.value.nextPage) nextPage = result.value.nextPage;
        }
      }

      this.#remoteResults = allRemote;
      this.#remoteTotalHits = totalHits;
      this.#remoteNextPage = nextPage;
    } catch (err) {
      this.#error = err instanceof Error ? err.message : 'Remote search failed';
    } finally {
      this.#isSearching = false;
    }
  }

  /** Load more remote results from the next page */
  async loadMoreRemote(): Promise<void> {
    if (!this.#remoteNextPage) return;
    this.#isSearching = true;

    try {
      const resp = await fetch(this.#remoteNextPage, {
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) throw new Error(`Failed: ${resp.status}`);

      const page = await resp.json();
      const { results, nextPage } = parseSearchResponse(page);

      this.#remoteResults = [...this.#remoteResults, ...results];
      this.#remoteNextPage = nextPage;
    } catch (err) {
      this.#error = err instanceof Error ? err.message : 'Failed to load more';
    } finally {
      this.#isSearching = false;
    }
  }

  // ──────────────────────────────────────────────
  // Autocomplete
  // ──────────────────────────────────────────────

  /** Fetch autocomplete suggestions from remote endpoints */
  async fetchSuggestions(q: string): Promise<void> {
    if (q.length < 2) {
      this.#suggestions = [];
      return;
    }

    const results = await Promise.allSettled(
      this.#remoteEndpoints
        .filter((ep) => ep.autocompleteId)
        .map((ep) => fetchAutocompleteSuggestions(ep.autocompleteId!, q)),
    );

    const terms: Term[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') terms.push(...result.value);
    }
    this.#suggestions = terms;
  }

  /** Clear suggestions */
  clearSuggestions(): void {
    this.#suggestions = [];
  }

  // ──────────────────────────────────────────────
  // Reset
  // ──────────────────────────────────────────────

  /** Reset all search state */
  reset(): void {
    this.#query = '';
    this.#scope = 'all';
    this.#field = 'all';
    this.#motivation = undefined;
    this.#localResults = [];
    this.#remoteResults = [];
    this.#remoteTotalHits = 0;
    this.#remoteNextPage = undefined;
    this.#facets = {};
    this.#isSearching = false;
    this.#error = null;
    this.#suggestions = [];
  }
}

/** Global singleton */
export const search = new SearchStore();
