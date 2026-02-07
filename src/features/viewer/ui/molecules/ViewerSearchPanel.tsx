/**
 * ViewerSearchPanel Molecule
 *
 * Composes: Icon atom + Input atom + IconButton molecule
 *
 * IIIF Content Search 2.0 UI for searching within manifests.
 * Provides search input with autocomplete and result list.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Composes atoms: Icon, Input
 * - Composes molecules: IconButton
 * - Local UI state only (useState, useCallback, useEffect)
 * - No domain logic - search service passed as prop
 *
 * IDEAL OUTCOME: Users can search within IIIF manifests
 * FAILURE PREVENTED: Search timeouts, result overflow, focus loss
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Icon, Input } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { IIIFManifest } from '@/src/shared/types';

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

export interface ViewerSearchPanelProps {
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
  /** Contextual styles from template (unused but passed for consistency) */
  cx?: ContextualClassNames | Record<string, string>;
  /** Current field mode */
  fieldMode?: boolean;
  /** Callback to perform search - delegates to service */
  onSearch: (query: string) => Promise<SearchResult[]>;
  /** Callback to fetch autocomplete suggestions */
  onFetchSuggestions?: (input: string) => Promise<Array<{ value: string; count?: number }>>;
}

/**
 * ViewerSearchPanel Molecule
 *
 * @example
 * <ViewerSearchPanel
 *   manifest={manifest}
 *   searchService={searchService}
 *   onResultSelect={handleResultSelect}
 *   onSearch={searchFn}
 *   cx={cx}
 *   fieldMode={fieldMode}
 * />
 */
export const ViewerSearchPanel: React.FC<ViewerSearchPanelProps> = ({
  manifest: _manifest,
  searchService,
  onResultSelect,
  onResultsChange,
  currentCanvasId,
  cx: _cx,
  fieldMode = false,
  onSearch,
  onFetchSuggestions,
}) => {
  const [query, setQuery] = useState('');
  const [localQuery, setLocalQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ value: string; count?: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Sync local query with external query
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

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
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults);
      setTotal(searchResults.length);
      onResultsChange?.(searchResults);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Search failed';
      setError(errorMessage);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchService, onSearch, onResultsChange]);

  // Handle autocomplete
  const fetchSuggestions = useCallback(async (input: string) => {
    if (!onFetchSuggestions || input.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await onFetchSuggestions(input);
      setSuggestions(response);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  }, [onFetchSuggestions]);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {value} = e.target;
    setLocalQuery(value);
    setQuery(value);
    setSelectedIndex(-1);

    // Debounce suggestions
    setTimeout(() => {
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
  const selectSuggestion = (term: { value: string }) => {
    setLocalQuery(term.value);
    setQuery(term.value);
    setShowSuggestions(false);
    performSearch(term.value);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    setLocalQuery('');
    setResults([]);
    setSuggestions([]);
    setTotal(0);
    setError(null);
    onResultsChange?.([]);
  };

  // Group results by canvas
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.canvasId]) {
      acc[result.canvasId] = [];
    }
    acc[result.canvasId].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Styling based on field mode
  const bgClass = fieldMode ? 'bg-slate-950' : 'bg-white';
  const textClass = fieldMode ? 'text-white' : 'text-slate-900';
  const borderClass = fieldMode ? 'border-slate-800' : 'border-slate-200';
  const mutedTextClass = fieldMode ? 'text-slate-400' : 'text-slate-500';

  if (!searchService) {
    return (
      <div className={`p-4 text-center ${mutedTextClass}`}>
        <Icon name="search_off" className="text-4xl mb-2 opacity-50" />
        <p className="text-sm">No search service available for this manifest.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${bgClass}`}>
      {/* Search Input */}
      <form onSubmit={handleSubmit} className={`p-3 border-b ${borderClass} sticky top-0 z-10 ${bgClass}`}>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Icon name="search" className={mutedTextClass} />
          </div>
          <Input
            value={localQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search within manifest..."
            className={`w-full pl-10 pr-10 ${fieldMode ? '!bg-slate-900 !border-slate-700 !text-white' : '!bg-white !border-slate-200'}`}
            aria-label="Search within manifest"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showSuggestions}
          />
          {query && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <IconButton
                icon="close"
                ariaLabel="Clear search"
                onClick={clearSearch}
                variant="ghost"
                size="sm"
                className={`${mutedTextClass} hover:${textClass}`}
              />
            </div>
          )}

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              id="search-suggestions"
              role="listbox"
              className={`absolute top-full left-0 right-0 mt-1 ${fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-lg z-20 max-h-60 overflow-auto`}
            >
              {suggestions.map((term, index) => (
                <li
                  key={term.value}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => selectSuggestion(term)}
                  className={`px-4 py-2 cursor-pointer flex items-center justify-between ${
                    index === selectedIndex
                      ? fieldMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-600'
                      : fieldMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">{term.value}</span>
                  {term.count && (
                    <span className={`text-xs ${mutedTextClass}`}>{term.count}</span>
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
            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}

        {error && (
          <div className={`p-4 m-3 ${fieldMode ? 'bg-red-900/30 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'} border rounded-lg text-sm`}>
            <Icon name="error" className="inline mr-2" />
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && query && (
          <div className={`p-8 text-center ${mutedTextClass}`}>
            <Icon name="search_off" className="text-4xl mb-2 opacity-50" />
            <p className="text-sm">No results found for "{query}"</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            {/* Results Header */}
            <div className={`px-4 py-2 ${fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'} border-b text-xs font-medium ${mutedTextClass} sticky top-0`}>
              {total} result{total !== 1 ? 's' : ''} for "{query}"
            </div>

            {/* Grouped Results */}
            <div className="divide-y">
              {Object.entries(groupedResults).map(([canvasId, canvasResults]) => (
                <div
                  key={canvasId}
                  className={`${
                    currentCanvasId === canvasId
                      ? fieldMode ? 'bg-blue-900/30' : 'bg-blue-50/50'
                      : ''
                  }`}
                >
                  {/* Canvas Header */}
                  <div className={`px-4 py-2 ${fieldMode ? 'bg-slate-900/50' : 'bg-slate-100/50'} text-xs font-medium ${mutedTextClass} flex items-center gap-2`}>
                    <Icon name="image" className="text-sm" />
                    <span className="truncate flex-1">
                      {canvasId.split('/').pop()}
                    </span>
                    <span className={mutedTextClass}>
                      {canvasResults.length} hit{canvasResults.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Results for this canvas */}
                  {canvasResults.map((result, index) => (
                    <div
                      key={`${result.canvasId}-${index}`}
                      onClick={() => onResultSelect(result)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onResultSelect(result); }}
                      className={`w-full px-4 py-3 text-left transition-colors group cursor-pointer ${
                        fieldMode
                          ? 'hover:bg-slate-800 text-slate-300'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      <SearchResultItem result={result} query={query} fieldMode={fieldMode} />
                    </div>
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
const SearchResultItem: React.FC<{
  result: SearchResult;
  query: string;
  fieldMode?: boolean;
}> = ({
  result,
  query,
  fieldMode = false,
}) => {
  // Highlight the query in the text
  const highlightText = (text: string, searchQuery: string): React.ReactNode => {
    if (!searchQuery) return text;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark
          key={i}
          className={`${fieldMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-200 text-yellow-900'} px-0.5 rounded`}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div>
      <p className={`text-sm leading-relaxed ${fieldMode ? 'text-slate-300' : 'text-slate-700'}`}>
        {result.selector ? (
          <>
            {result.selector.prefix && (
              <span className={fieldMode ? 'text-slate-500' : 'text-slate-400'}>...{result.selector.prefix}</span>
            )}
            <mark className={`${fieldMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-200 text-yellow-900'} px-0.5 rounded font-medium`}>
              {result.selector.exact}
            </mark>
            {result.selector.suffix && (
              <span className={fieldMode ? 'text-slate-500' : 'text-slate-400'}>{result.selector.suffix}...</span>
            )}
          </>
        ) : (
          highlightText(result.text.substring(0, 200), query)
        )}
      </p>

      {/* Location info */}
      <div className={`flex items-center gap-3 mt-1.5 text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
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
          className={`text-sm ml-auto opacity-0 group-hover:opacity-100 transition-opacity ${fieldMode ? 'text-slate-400' : ''}`}
        />
      </div>
    </div>
  );
};

/**
 * Format seconds to MM:SS
 */
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default ViewerSearchPanel;
