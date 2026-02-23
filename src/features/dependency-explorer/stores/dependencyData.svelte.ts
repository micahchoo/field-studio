/**
 * DependencyDataStore — Svelte 5 reactive class replacing useDependencyData hook
 * React source: model/useDependencyData.ts (129 lines)
 * Architecture: Category 2 (reactive class) + Category 4 (async data loading)
 */

import type { DependencyGraph, FileAnalysis, FilterType, SortBy, SortOrder } from '../types';

const DATA_URL = '/field-studio/dependencies.json';

/** Filter patterns adapted for React+Svelte codebases */
const FILTER_PATTERNS: Record<FilterType, RegExp> = {
  all: /.*/,
  components: /\.(tsx|jsx|svelte)$/,
  hooks: /(use[A-Z].*\.(ts|tsx)$)|(\.svelte\.ts$)/,
  utils: /(util|helper|lib)\./i,
  services: /Service\.(ts|tsx)$/,
  types: /(types|\.(d\.ts))$/i,
};

export class DependencyDataStore {
  // Large domain data — use $state.raw to avoid deep proxies
  #data = $state.raw<DependencyGraph | null>(null);
  #isLoading = $state(true);
  #error = $state<Error | null>(null);

  // UI state
  #searchQuery = $state('');
  #filterType = $state<FilterType>('all');
  #sortBy = $state<SortBy>('name');
  #sortOrder = $state<SortOrder>('asc');
  #refreshKey = $state(0);

  // Public getters
  get data() { return this.#data; }
  get isLoading() { return this.#isLoading; }
  get error() { return this.#error; }
  get searchQuery() { return this.#searchQuery; }
  get filterType() { return this.#filterType; }
  get sortBy() { return this.#sortBy; }
  get sortOrder() { return this.#sortOrder; }

  /** Filtered, searched, and sorted files */
  get filteredFiles(): FileAnalysis[] {
    if (!this.#data) return [];

    let files = Object.values(this.#data.files);

    // Apply type filter
    if (this.#filterType !== 'all') {
      files = files.filter(f => FILTER_PATTERNS[this.#filterType].test(f.fileName));
    }

    // Apply search filter
    const query = this.#searchQuery.trim().toLowerCase();
    if (query) {
      files = files.filter(f => {
        const searchable = [
          f.filePath,
          f.fileName,
          ...f.exports.map(e => e.name),
          ...f.imports.flatMap(i => i.specifiers),
        ].join(' ').toLowerCase();
        return searchable.includes(query);
      });
    }

    // Apply sorting
    files.sort((a, b) => {
      let comparison = 0;
      switch (this.#sortBy) {
        case 'name': comparison = a.filePath.localeCompare(b.filePath); break;
        case 'size': comparison = a.size - b.size; break;
        case 'imports': comparison = a.imports.length - b.imports.length; break;
        case 'exports': comparison = a.exports.length - b.exports.length; break;
        case 'dependents': comparison = a.dependents.length - b.dependents.length; break;
      }
      return this.#sortOrder === 'desc' ? -comparison : comparison;
    });

    return files;
  }

  // Mutations
  setSearch(query: string) { this.#searchQuery = query; }
  setFilter(type: FilterType) { this.#filterType = type; }

  setSortBy(column: SortBy) {
    if (this.#sortBy === column) {
      this.#sortOrder = this.#sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.#sortBy = column;
      this.#sortOrder = 'asc';
    }
  }

  refresh() { this.#refreshKey++; }

  /** Load dependency data from JSON file */
  async loadData(signal?: AbortSignal): Promise<void> {
    this.#isLoading = true;
    this.#error = null;

    try {
      const response = await fetch(`${DATA_URL}?_=${this.#refreshKey}`, { signal });
      if (!response.ok) {
        throw new Error(`Failed to load dependency data: ${response.status}`);
      }
      const json = await response.json();
      if (!signal?.aborted) {
        this.#data = json;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!signal?.aborted) {
        this.#error = err instanceof Error ? err : new Error(String(err));
      }
    } finally {
      if (!signal?.aborted) {
        this.#isLoading = false;
      }
    }
  }
}
