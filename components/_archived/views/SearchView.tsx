import React, { useEffect, useRef, useState } from 'react';
import { IIIFItem } from '../../types';
import { AutocompleteResult, SearchResult, searchService } from '../../services/searchService';
import { Icon } from '../Icon';
import { RESOURCE_TYPE_CONFIG } from '../../constants';
import { EmptyState, emptyStatePresets } from '../EmptyState';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useTerminology } from '../../hooks/useTerminology';

interface SearchViewProps {
  root: IIIFItem | null;
  onSelect: (id: string) => void;
  onRevealMap?: (id: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ root, onSelect, onRevealMap }) => {
  const { settings } = useAppSettings();
  const { t } = useTerminology({ level: settings.abstractionLevel });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filter, setFilter] = useState<'All' | 'Manifest' | 'Canvas' | 'Annotation'>('All');
  const [indexing, setIndexing] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Re-index when root changes
  useEffect(() => {
    if (root) {
      setIndexing(true);
      // Small timeout to allow UI to render "Indexing..." state
      setTimeout(() => {
        searchService.buildIndex(root);
        setIndexing(false);
      }, 100);
    }
  }, [root]);

  // Search execution
  useEffect(() => {
    if (query.trim().length > 1) {
        const typeFilter = filter === 'All' ? undefined : filter;
        const res = searchService.searchWithSyntax(query);
        // Apply filter if not already in query syntax
        const filtered = typeFilter && !query.startsWith('type:')
          ? res.filter(r => r.type === typeFilter)
          : res;
        setResults(filtered);
        setShowAutocomplete(false);
    } else {
        setResults([]);
    }
  }, [query, filter]);

  // Autocomplete as user types
  useEffect(() => {
    const suggestions = searchService.autocomplete(query);
    setAutocompleteResults(suggestions);
    setAutocompleteIndex(-1);
  }, [query]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAutocompleteSelect = (value: string) => {
    setQuery(value);
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete || autocompleteResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAutocompleteIndex(prev => Math.min(prev + 1, autocompleteResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAutocompleteIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && autocompleteIndex >= 0) {
      e.preventDefault();
      handleAutocompleteSelect(autocompleteResults[autocompleteIndex].value);
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Search Header */}
      <div className="bg-white border-b p-6 shadow-sm z-10">
        <div className="max-w-3xl mx-auto w-full">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Icon name="search" className="text-iiif-blue"/>
                Global Search
            </h2>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowAutocomplete(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for manifests, annotations, content..."
                    className="w-full text-lg p-4 pl-12 bg-slate-100 border-2 border-transparent focus:bg-white focus:border-iiif-blue rounded-xl outline-none transition-all shadow-inner"
                    autoFocus
                />
                <Icon name="search" className="absolute left-4 top-5 text-slate-400 text-xl"/>
                {query && (
                    <button onClick={() => setQuery('')} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
                        <Icon name="close" />
                    </button>
                )}

                {/* Autocomplete Dropdown */}
                {showAutocomplete && autocompleteResults.length > 0 && (
                  <div
                    ref={autocompleteRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden"
                  >
                    {autocompleteResults.map((result, idx) => (
                      <button
                        key={`${result.type}-${result.value}`}
                        onClick={() => handleAutocompleteSelect(result.value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          idx === autocompleteIndex
                            ? 'bg-iiif-blue text-white'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Icon
                          name={result.icon || 'search'}
                          className={idx === autocompleteIndex ? 'text-white' : 'text-slate-400'}
                        />
                        <span className="flex-1 font-medium">{result.value}</span>
                        {result.type === 'recent' && (
                          <span className={`text-[10px] uppercase font-bold ${
                            idx === autocompleteIndex ? 'text-white/70' : 'text-slate-400'
                          }`}>Recent</span>
                        )}
                        {result.type === 'type' && result.count !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            idx === autocompleteIndex
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}>{result.count}</span>
                        )}
                      </button>
                    ))}
                    {searchService.getRecentSearches().length > 0 && (
                      <button
                        onClick={() => { searchService.clearRecentSearches(); setAutocompleteResults(searchService.autocomplete(query)); }}
                        className="w-full px-4 py-2 text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-t"
                      >
                        Clear Recent Searches
                      </button>
                    )}
                  </div>
                )}
            </div>

            <div className="flex gap-2 mt-4">
                {['All', 'Manifest', 'Canvas', 'Annotation'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                            filter === f 
                                ? 'bg-iiif-blue text-white border-iiif-blue' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {f === 'All' ? f : t(f)}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto w-full space-y-4">
            {indexing ? (
                <div className="text-center py-10 text-slate-400 animate-pulse">
                    <Icon name="sync" className="mb-2 animate-spin"/>
                    <p>Updating Search Index...</p>
                </div>
            ) : results.length > 0 ? (
                <>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                        Found {results.length} results
                    </p>
                    {results.map(res => {
                        const config = RESOURCE_TYPE_CONFIG[res.type] || RESOURCE_TYPE_CONFIG['Content'];
                        return (
                        <div 
                            key={res.id}
                            onClick={() => onSelect(res.id)}
                            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-iiif-blue cursor-pointer transition-all group"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded shrink-0 ${config.bgClass} ${config.colorClass}`}>
                                    <Icon name={config.icon} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 truncate group-hover:text-iiif-blue flex-1">
                                            {res.label}
                                        </h3>
                                        <div className="flex items-center gap-2 ml-2">
                                            {onRevealMap && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onRevealMap(res.id); }}
                                                    className="p-1 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-500 transition-colors"
                                                    title="Reveal on Map"
                                                >
                                                    <Icon name="place" className="text-xs"/>
                                                </button>
                                            )}
                                            <span className={`text-[10px] font-mono bg-slate-50 px-1.5 py-0.5 rounded text-slate-400 border border-slate-100`}>
                                                {t(res.type)}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                                        <Icon name="folder_open" className="text-[10px]"/>
                                        {res.context}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )})}
                </>
            ) : query.length > 1 ? (
                <EmptyState
                  {...emptyStatePresets.noResults({
                    onAction: () => setQuery('')
                  })}
                  message={`No results found for "${query}". Try different search terms or adjust your filters.`}
                />
            ) : (
                <EmptyState
                  icon="manage_search"
                  title="Search Your Archive"
                  message="Start typing to search for manifests, annotations, and content across your entire archive."
                />
            )}
        </div>
      </div>
    </div>
  );
};