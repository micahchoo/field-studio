/**
 * Search Feature Model
 *
 * Domain-specific selectors and state management for the search feature.
 * Wraps searchService and provides reactive state management.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Pure business logic, no UI concerns
 * - Re-exports from searchService for FSD boundary
 * - Reactive hooks for search state
 *
 * IDEAL OUTCOME: Consistent search behavior across the app
 * FAILURE PREVENTED: Stale search results, race conditions, memory leaks
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IIIFItem } from '@/types';
import { AutocompleteResult, SearchResult, searchService } from '@/services/searchService';
import { UI_TIMING } from '@/src/shared/config/tokens';

// ============================================================================
// Types
// ============================================================================

export type SearchFilter = 'All' | 'Manifest' | 'Canvas' | 'Annotation';

export interface SearchState {
  query: string;
  results: SearchResult[];
  filter: SearchFilter;
  indexing: boolean;
  autocompleteResults: AutocompleteResult[];
  autocompleteIndex: number;
  showAutocomplete: boolean;
}

export interface UseSearchReturn extends SearchState {
  setQuery: (query: string) => void;
  setFilter: (filter: SearchFilter) => void;
  selectAutocomplete: (value: string) => void;
  navigateAutocomplete: (direction: 'up' | 'down') => void;
  closeAutocomplete: () => void;
  clearQuery: () => void;
  clearRecentSearches: () => void;
  recentSearches: string[];
}

// ============================================================================
// Reactive Hook
// ============================================================================

/**
 * useSearch - Reactive search state management
 *
 * Encapsulates all search logic including:
 * - Index building when root changes
 * - Debounced search execution
 * - Autocomplete suggestions
 * - Keyboard navigation
 *
 * @param root - Root IIIF item to search within
 * @returns Search state and actions
 */
export const useSearch = (root: IIIFItem | null): UseSearchReturn => {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filter, setFilterState] = useState<SearchFilter>('All');
  const [indexing, setIndexing] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Re-index when root changes
  useEffect(() => {
    if (!root) {
      setResults([]);
      return;
    }

    setIndexing(true);
    // Small timeout to allow UI to render "Indexing..." state
    const timer = setTimeout(() => {
      searchService.buildIndex(root);
      if (isMountedRef.current) {
        setIndexing(false);
        // Refresh results if there's an active query
        if (query.trim().length > 1) {
          executeSearch(query, filter);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [root]);

  // Update recent searches when autocomplete changes
  useEffect(() => {
    setRecentSearches(searchService.getRecentSearches());
  }, []);

  // Execute search with current query and filter
  const executeSearch = useCallback((searchQuery: string, searchFilter: SearchFilter) => {
    if (searchQuery.trim().length <= 1) {
      setResults([]);
      return;
    }

    const typeFilter = searchFilter === 'All' ? undefined : searchFilter;
    const res = searchService.searchWithSyntax(searchQuery);

    // Apply filter if not already in query syntax
    const filtered = typeFilter && !searchQuery.startsWith('type:')
      ? res.filter(r => r.type === typeFilter)
      : res;

    setResults(filtered);
  }, []);

  // Debounced search execution
  const setQuery = useCallback((newQuery: string) => {
    // Guard against non-string query
    const safeQuery = typeof newQuery === 'string' ? newQuery : '';
    setQueryState(safeQuery);
    setShowAutocomplete(true);

    // Update autocomplete immediately
    const suggestions = searchService.autocomplete(safeQuery);
    setAutocompleteResults(suggestions);
    setAutocompleteIndex(-1);

    // Debounce actual search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        executeSearch(newQuery, filter);
        setShowAutocomplete(false);
      }
    }, UI_TIMING.debounce);
  }, [filter, executeSearch]);

  // Set filter and re-execute search if needed
  const setFilter = useCallback((newFilter: SearchFilter) => {
    setFilterState(newFilter);
    if (query.trim().length > 1) {
      executeSearch(query, newFilter);
    }
  }, [query, executeSearch]);

  // Select autocomplete suggestion
  const selectAutocomplete = useCallback((value: string) => {
    setQueryState(value);
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
    executeSearch(value, filter);
  }, [filter, executeSearch]);

  // Navigate autocomplete with keyboard
  const navigateAutocomplete = useCallback((direction: 'up' | 'down') => {
    if (autocompleteResults.length === 0) return;

    setAutocompleteIndex(prev => {
      if (direction === 'down') {
        return Math.min(prev + 1, autocompleteResults.length - 1);
      } else {
        return Math.max(prev - 1, -1);
      }
    });
  }, [autocompleteResults.length]);

  const closeAutocomplete = useCallback(() => {
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
  }, []);

  const clearQuery = useCallback(() => {
    setQueryState('');
    setResults([]);
    setAutocompleteResults([]);
    setShowAutocomplete(false);
  }, []);

  const clearRecentSearches = useCallback(() => {
    searchService.clearRecentSearches();
    setRecentSearches([]);
    setAutocompleteResults(searchService.autocomplete(query));
  }, [query]);

  return {
    query,
    results,
    filter,
    indexing,
    autocompleteResults,
    autocompleteIndex,
    showAutocomplete,
    recentSearches,
    setQuery,
    setFilter,
    selectAutocomplete,
    navigateAutocomplete,
    closeAutocomplete,
    clearQuery,
    clearRecentSearches,
  };
};

// ============================================================================
// Pure Functions (for use outside React)
// ============================================================================

/**
 * Get result count display text
 */
export const getResultCountText = (count: number): string => {
  if (count === 0) return 'No results';
  if (count === 1) return '1 result';
  return `${count} results`;
};

/**
 * Check if query should trigger search
 */
export const shouldSearch = (query: string): boolean => {
  return query.trim().length > 1;
};
