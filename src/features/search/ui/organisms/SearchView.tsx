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

import React, { useEffect, useRef } from 'react';
import type { IIIFItem } from '@/types';
import { RESOURCE_TYPE_CONFIG } from '@/constants';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/src/shared/ui/molecules/EmptyState';
import { FacetPill } from '@/src/shared/ui/molecules/FacetPill';
import { ResultCard } from '@/src/shared/ui/molecules/ResultCard';
import { SearchField } from '@/src/shared/ui/molecules/SearchField';
import { LoadingState } from '@/src/shared/ui/molecules/LoadingState';
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
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    textMuted: string;
    input: string;
    label: string;
    active: string;
  };
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
  onRevealMap,
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

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

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
  const surfaceBg = fieldMode ? 'bg-black' : 'bg-slate-50';
  const headerBg = fieldMode ? 'bg-slate-900' : 'bg-white';
  const headerBorder = fieldMode ? 'border-slate-800' : 'border-slate-200';

  return (
    <div className={`flex flex-col h-full ${surfaceBg} ${cx.text}`}>
      {/* Search Header */}
      <div className={`${headerBg} border-b ${headerBorder} p-6 shadow-sm z-10`}>
        <div className="max-w-3xl mx-auto w-full">
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${cx.text}`}>
            <Icon name="search" className="text-iiif-blue" />
            Global Search
          </h2>

          {/* Search Field with Autocomplete */}
          <div className="relative">
            <SearchField
              ref={inputRef}
              value={query}
              onChange={setQuery}
              onFocus={() => {}}
              onKeyDown={handleKeyDown}
              placeholder="Search for manifests, annotations, content..."
              autoFocus
              onClear={query ? clearQuery : undefined}
              cx={cx}
              fieldMode={fieldMode}
            />

            {/* Autocomplete Dropdown */}
            {showAutocomplete && autocompleteResults.length > 0 && (
              <div
                ref={autocompleteRef}
                className={`absolute top-full left-0 right-0 mt-1 ${fieldMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl shadow-lg z-20 overflow-hidden`}
              >
                {autocompleteResults.map((result, idx) => (
                  <button
                    key={`${result.type}-${result.value}`}
                    onClick={() => handleAutocompleteClick(result.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      idx === autocompleteIndex
                        ? 'bg-iiif-blue text-white'
                        : fieldMode
                          ? 'hover:bg-slate-700 text-slate-200'
                          : 'hover:bg-slate-50 text-slate-700'
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        idx === autocompleteIndex
                          ? 'bg-white/20 text-white'
                          : fieldMode
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {result.count}
                      </span>
                    )}
                  </button>
                ))}
                {recentSearches.length > 0 && (
                  <button
                    onClick={clearRecentSearches}
                    className={`w-full px-4 py-2 text-[10px] uppercase font-bold border-t ${
                      fieldMode
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700 border-slate-700'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    Clear Recent Searches
                  </button>
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
            <LoadingState
              message="Updating Search Index..."
              spinner
              cx={cx}
              fieldMode={fieldMode}
            />
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
                  onSelect={() => onSelect(res.id)}
                  cx={cx}
                />
              ))}
            </>
          ) : shouldSearch(query) ? (
            <EmptyState
              icon="search_off"
              title="No Results Found"
              message={`No results found for "${query}". Try different search terms or adjust your filters.`}
              action={{
                label: 'Clear Search',
                onClick: clearQuery,
              }}
              cx={cx}
              fieldMode={fieldMode}
            />
          ) : (
            <EmptyState
              icon="manage_search"
              title="Search Your Archive"
              message="Start typing to search for manifests, annotations, and content across your entire archive."
              cx={cx}
              fieldMode={fieldMode}
            />
          )}
        </div>
      </div>
    </div>
  );
};
