/**
 * SearchPanel - IIIF Content Search 2.0 UI Component
 *
 * Provides search within manifests with:
 * - Search input with autocomplete
 * - Result list with hit highlighting
 * - Navigation to search hits
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AutocompleteTerm,
  contentSearchService,
  SearchResult,
  SearchService
} from '../services/contentSearchService';
import { IIIFManifest } from '../types';
import { Icon } from './Icon';

interface SearchPanelProps {
  /** The manifest to search within */
  manifest: IIIFManifest | null;
  /** Search service extracted from manifest */
  searchService: SearchService | null;
  /** Callback when a result is selected */
  onResultSelect: (result: SearchResult) => void;
  /** Callback when results change (for overlay rendering) */
  onResultsChange?: (results: SearchResult[]) => void;
  /** Currently selected canvas ID (to highlight relevant results) */
  currentCanvasId?: string;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  manifest,
  searchService,
  onResultSelect,
  onResultsChange,
  currentCanvasId
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<AutocompleteTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteService = searchService
    ? contentSearchService.extractAutocompleteService(searchService)
    : null;

  // Handle search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchService || !searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      onResultsChange?.([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await contentSearchService.search(searchService.id, searchQuery);
      const parsed = contentSearchService.parseResults(response);

      setResults(parsed);
      setTotal(response.partOf?.total || parsed.length);
      onResultsChange?.(parsed);
    } catch (e: any) {
      setError(e.message || 'Search failed');
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchService, onResultsChange]);

  // Handle autocomplete
  const fetchSuggestions = useCallback(async (input: string) => {
    if (!autocompleteService || input.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await contentSearchService.autocomplete(autocompleteService.id, input);
      setSuggestions(response.terms);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  }, [autocompleteService]);

  // Debounced input handler
  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 200);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    performSearch(query);
  };

  // Handle suggestion selection
  const selectSuggestion = (term: AutocompleteTerm) => {
    setQuery(term.value);
    setShowSuggestions(false);
    performSearch(term.value);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setTotal(0);
    setError(null);
    onResultsChange?.([]);
    inputRef.current?.focus();
  };

  // Group results by canvas
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.canvasId]) {
      acc[result.canvasId] = [];
    }
    acc[result.canvasId].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  if (!searchService) {
    return (
      <div className="p-4 text-center text-slate-500">
        <Icon name="search_off" className="text-4xl mb-2 opacity-50" />
        <p className="text-sm">No search service available for this manifest.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="p-3 border-b bg-white sticky top-0 z-10">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search within manifest..."
            className="w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-iiif-blue focus:border-transparent"
            aria-label="Search within manifest"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showSuggestions}
          />
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <Icon name="close" />
            </button>
          )}

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              id="search-suggestions"
              role="listbox"
              className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-auto"
            >
              {suggestions.map((term, index) => (
                <li
                  key={term.value}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => selectSuggestion(term)}
                  className={`px-4 py-2 cursor-pointer flex items-center justify-between ${
                    index === selectedIndex ? 'bg-blue-50 text-iiif-blue' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">{term.value}</span>
                  {term.count && (
                    <span className="text-xs text-slate-400">{term.count}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-iiif-blue rounded-full animate-spin"></div>
          </div>
        )}

        {error && (
          <div className="p-4 m-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <Icon name="error" className="inline mr-2" />
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && query && (
          <div className="p-8 text-center text-slate-500">
            <Icon name="search_off" className="text-4xl mb-2 opacity-50" />
            <p className="text-sm">No results found for "{query}"</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            {/* Results Header */}
            <div className="px-4 py-2 bg-slate-50 border-b text-xs font-medium text-slate-600 sticky top-0">
              {total} result{total !== 1 ? 's' : ''} for "{query}"
            </div>

            {/* Grouped Results */}
            <div className="divide-y">
              {Object.entries(groupedResults).map(([canvasId, canvasResults]) => (
                <div
                  key={canvasId}
                  className={`${
                    currentCanvasId === canvasId ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {/* Canvas Header */}
                  <div className="px-4 py-2 bg-slate-100/50 text-xs font-medium text-slate-500 flex items-center gap-2">
                    <Icon name="image" className="text-sm" />
                    <span className="truncate flex-1">
                      {canvasId.split('/').pop()}
                    </span>
                    <span className="text-slate-400">
                      {canvasResults.length} hit{canvasResults.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Results for this canvas */}
                  {canvasResults.map((result, index) => (
                    <button
                      key={`${result.canvasId}-${index}`}
                      onClick={() => onResultSelect(result)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors group"
                    >
                      <SearchResultItem result={result} query={query} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Individual search result item with highlighting
 */
const SearchResultItem: React.FC<{ result: SearchResult; query: string }> = ({
  result,
  query
}) => {
  // Highlight the query in the text
  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${escapeRegex(searchQuery)})`, 'gi'));

    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div>
      <p className="text-sm text-slate-700 leading-relaxed">
        {result.selector ? (
          <>
            {result.selector.prefix && (
              <span className="text-slate-400">...{result.selector.prefix}</span>
            )}
            <mark className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-medium">
              {result.selector.exact}
            </mark>
            {result.selector.suffix && (
              <span className="text-slate-400">{result.selector.suffix}...</span>
            )}
          </>
        ) : (
          highlightText(result.text.substring(0, 200), query)
        )}
      </p>

      {/* Location info */}
      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
        {result.region && (
          <span className="flex items-center gap-1">
            <Icon name="crop" className="text-sm" />
            {result.region.x},{result.region.y}
          </span>
        )}
        {result.time && (
          <span className="flex items-center gap-1">
            <Icon name="schedule" className="text-sm" />
            {formatTime(result.time.start)}
            {result.time.end && ` - ${formatTime(result.time.end)}`}
          </span>
        )}
        <Icon
          name="arrow_forward"
          className="text-sm ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
};

// Utility functions
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Hook for using content search in components
 */
export const useContentSearch = (manifest: IIIFManifest | null) => {
  const [searchService, setSearchService] = useState<SearchService | null>(null);

  useEffect(() => {
    if (manifest) {
      const service = contentSearchService.extractSearchService(manifest);
      setSearchService(service);
    } else {
      setSearchService(null);
    }
  }, [manifest]);

  return { searchService };
};

export default SearchPanel;
