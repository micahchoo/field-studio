/**
 * SearchView Organism
 *
 * Main organism for the search feature. Provides global search across IIIF items.
 * Composes molecules: SearchField, FacetPill, ResultCard, EmptyState
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props from FieldModeTemplate (no hook calls)
 * - Composes molecules for all UI elements
 * - Domain logic delegated to model/useSearch hook
 * - No prop-drilling of fieldMode
 *
 * IDEAL OUTCOME: Users can search, filter, and navigate to IIIF items
 * FAILURE PREVENTED: Search thrashing, stale results, keyboard traps
 *
 * LEGACY NOTE: This is the refactored version of components/views/SearchView.tsx
 * The original component (264 lines) mixed search logic, UI concerns, and used
 * useAppSettings directly. This organism receives context via props.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import type { IIIFItem } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { FacetPill } from '@/src/shared/ui/molecules/FacetPill';
import { ResultCard } from '@/src/shared/ui/molecules/ResultCard';
import { SearchField } from '@/src/shared/ui/molecules/SearchField';
import { usePipeline } from '@/src/shared/lib/hooks';
import {
  getResultCountText,
  type SearchFilter,
  shouldSearch,
  useSearch,
} from '../../model';

export interface SearchViewProps {
  /** Root IIIF item to search within */
  root: IIIFItem | null;
  /** Called when a result is selected */
  onSelect: (id: string) => void;
  /** Optional callback to reveal item on map */
  onRevealMap?: (id: string) => void;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
  /** Terminology function from template */
  t: (key: string) => string;
}

const FILTER_OPTIONS: SearchFilter[] = ['All', 'Manifest', 'Canvas', 'Annotation'];

/**
 * SearchView Organism
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode, t }) => (
 *     <SearchView
 *       root={root}
 *       onSelect={handleSelect}
 *       onRevealMap={handleRevealMap}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *       t={t}
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const SearchView: React.FC<SearchViewProps> = ({
  root,
  onSelect,
  onRevealMap: _onRevealMap,
  cx,
  fieldMode,
  t,
}) => {
  const {
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
  } = useSearch(root);

  const { searchToArchive } = usePipeline();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Handle result selection with pipeline context
  const handleResultSelect = useCallback((id: string) => {
    // Set pipeline context for smooth navigation
    searchToArchive(id);
    // Navigate to archive
    onSelect(id);
  }, [searchToArchive, onSelect]);

  // Handle click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        closeAutocomplete();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeAutocomplete]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete || autocompleteResults.length === 0) {
      if (e.key === 'Escape') {
        closeAutocomplete();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        navigateAutocomplete('down');
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigateAutocomplete('up');
        break;
      case 'Enter':
        e.preventDefault();
        if (autocompleteIndex >= 0) {
          selectAutocomplete(autocompleteResults[autocompleteIndex].value);
          inputRef.current?.focus();
        }
        break;
      case 'Escape':
        closeAutocomplete();
        break;
    }
  };

  const handleAutocompleteClick = (value: string) => {
    selectAutocomplete(value);
    inputRef.current?.focus();
  };

  // Determine surface background based on fieldMode
  const surfaceBg = fieldMode ? 'bg-nb-black' : 'bg-nb-white';
  const headerBg = fieldMode ? 'bg-nb-black' : 'bg-nb-white';
  const headerBorder = fieldMode ? 'border-nb-black' : 'border-nb-black/20';

  return (
    <div className={`flex flex-col h-full ${surfaceBg} ${cx.text}`}>
      {/* Search Header */}
      <div className={`border-b border-l-4 border-l-mode-accent-border bg-mode-accent-bg-subtle transition-mode ${headerBorder} p-6 shadow-brutal-sm z-10`}>
        <div className="max-w-3xl mx-auto w-full">
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${cx.text}`}>
            <Icon name="search" className="text-mode-accent" />
            Global Search
          </h2>

          {/* Search Tips */}
          {!query && !indexing && (
            <div className={`mb-4 flex flex-wrap gap-2 text-sm ${cx.textMuted}`}>
              <span>Try:</span>
              {['sunset', 'archaeological site', '2017', 'portrait'].map((tip) => (
                <Button variant="ghost" size="bare"
                  key={tip}
                  onClick={() => setQuery(tip)}
                  className={`px-2 py-0.5 text-xs transition-nb ${
                    fieldMode
                      ? 'bg-nb-black text-nb-black/40 hover:bg-nb-black/70 hover:text-nb-black/20'
                      : 'bg-nb-cream text-nb-black/60 hover:bg-nb-black/10 hover:text-nb-black/70'
                  }`}
                >
                  {tip}
                </Button>
              ))}
            </div>
          )}

          {/* Search Field with Autocomplete */}
          <div className="relative">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search for items, metadata, or content..."
              autoFocus
              cx={cx}
              fieldMode={fieldMode}
            />

            {/* Autocomplete Dropdown */}
            {showAutocomplete && autocompleteResults.length > 0 && (
              <div
                ref={autocompleteRef}
                className={`absolute top-full left-0 right-0 mt-1 ${fieldMode ? 'bg-nb-black border-nb-black/80' : 'bg-nb-white border-nb-black/20'} border  shadow-brutal z-20 overflow-hidden`}
              >
                {autocompleteResults.map((result, idx) => (
                  <div
                    key={`${result.type}-${result.value}`}
                    onClick={() => handleAutocompleteClick(result.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-nb ${
                      idx === autocompleteIndex
                        ? 'bg-iiif-blue text-white'
                        : fieldMode
                          ? 'hover:bg-nb-black/80 text-nb-black/20'
                          : 'hover:bg-nb-white text-nb-black/80'
                    }`}
                  >
                    <Icon
                      name={result.icon || 'search'}
                      className={idx === autocompleteIndex ? 'text-white' : cx.textMuted}
                    />
                    <span className="flex-1 font-medium">{result.value}</span>
                    {result.type === 'recent' && (
                      <span className={`text-[10px] uppercase font-bold ${
                        idx === autocompleteIndex ? 'text-white/70' : cx.textMuted
                      }`}>
                        Recent
                      </span>
                    )}
                    {result.type === 'type' && result.count !== undefined && (
                      <span className={`text-xs px-2 py-0.5 ${
                        idx === autocompleteIndex
                          ? 'bg-nb-white/20 text-white'
                          : fieldMode
                            ? 'bg-nb-black/80 text-nb-black/30'
                            : 'bg-nb-cream text-nb-black/50'
                      }`}>
                        {result.count}
                      </span>
                    )}
                  </div>
                ))}
                {recentSearches.length > 0 && (
                  <div
                    onClick={clearRecentSearches}
                    className={`w-full px-4 py-2 text-[10px] uppercase font-bold border-t ${
                      fieldMode
                        ? 'text-nb-black/40 hover:text-nb-black/20 hover:bg-nb-black/80 border-nb-black/80'
                        : 'text-nb-black/40 hover:text-nb-black/60 hover:bg-nb-white border-nb-black/20'
                    }`}
                  >
                    Clear Recent Searches
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 mt-4">
            {FILTER_OPTIONS.map((f) => (
              <FacetPill
                key={f}
                label={f === 'All' ? f : t(f)}
                active={filter === f}
                onToggle={() => setFilter(f)}
                count={f !== 'All' && filter === f ? results.length : undefined}
                cx={cx}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar ${cx.surface}`}>
        <div className="max-w-3xl mx-auto w-full space-y-4">
          {indexing ? (
            <div className={`text-center py-12 ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/60'}`}>
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <svg className="w-full h-full animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Updating Search Index</h3>
              <p className="text-sm mb-4">This may take a few minutes for large archives</p>
              <div className={`w-64 h-2 mx-auto overflow-hidden ${fieldMode ? 'bg-nb-black' : 'bg-nb-black/10'}`}>
                <div className="h-full bg-nb-orange animate-pulse w-2/3" />
              </div>
            </div>
          ) : results.length > 0 ? (
            <>
              <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${cx.textMuted}`}>
                {getResultCountText(results.length)}
              </p>
              {results.map((res) => (
                <ResultCard
                  key={res.id}
                  id={res.id}
                  title={res.label}
                  type={res.type}
                  onSelect={() => handleResultSelect(res.id)}
                  cx={cx}
                />
              ))}
            </>
          ) : shouldSearch(query) ? (
            <div className={`text-center py-12 ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/60'}`}>
              <div className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
              <p className="text-sm mb-2">No results for "{query}"</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Button variant="ghost" size="bare"
                  onClick={clearQuery}
                  className={`px-4 py-2 text-sm font-medium transition-nb ${
                    fieldMode
                      ? 'bg-nb-black text-nb-black/20 hover:bg-nb-black/70'
                      : 'bg-nb-cream text-nb-black/70 hover:bg-nb-black/10'
                  }`}
                >
                  Clear Search
                </Button>
                <Button variant="ghost" size="bare"
                  onClick={() => setFilter('All')}
                  className={`px-4 py-2 text-sm font-medium transition-nb ${
                    fieldMode
                      ? 'bg-nb-black text-nb-black/20 hover:bg-nb-black/70'
                      : 'bg-nb-cream text-nb-black/70 hover:bg-nb-black/10'
                  }`}
                >
                  Reset Filters
                </Button>
              </div>
              <p className={`text-xs mt-4 ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/50'}`}>
                Try different keywords or check your spelling
              </p>
            </div>
          ) : (
            <div className={`text-center py-12 ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/60'}`}>
              <div className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Search Your Archive</h3>
              <p className="text-sm mb-4">Find items by name, metadata, or content</p>
              <div className={`text-xs p-4 max-w-sm mx-auto text-left ${fieldMode ? 'bg-nb-black text-nb-black/40' : 'bg-nb-cream text-nb-black/60'}`}>
                <p className="font-medium mb-2">Search tips:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Use specific keywords for better results</li>
                  <li>Filter by type using the pills above</li>
                  <li>Search looks at titles, descriptions, and metadata</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
