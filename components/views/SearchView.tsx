
import React, { useState, useEffect } from 'react';
import { IIIFItem } from '../../types';
import { searchService, SearchResult } from '../../services/searchService';
import { Icon } from '../Icon';

interface SearchViewProps {
  root: IIIFItem | null;
  onSelect: (id: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ root, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filter, setFilter] = useState<'All' | 'Manifest' | 'Canvas' | 'Annotation'>('All');
  const [indexing, setIndexing] = useState(false);

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
        const res = searchService.search(query, typeFilter);
        setResults(res);
    } else {
        setResults([]);
    }
  }, [query, filter]);

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
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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
                        {f}
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
                    {results.map(res => (
                        <div 
                            key={res.id}
                            onClick={() => onSelect(res.id)}
                            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-iiif-blue cursor-pointer transition-all group"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded shrink-0 ${
                                    res.type === 'Manifest' ? 'bg-green-100 text-green-600' :
                                    res.type === 'Canvas' ? 'bg-blue-100 text-blue-600' :
                                    'bg-amber-100 text-amber-600'
                                }`}>
                                    <Icon name={
                                        res.type === 'Manifest' ? 'menu_book' :
                                        res.type === 'Canvas' ? 'image' :
                                        'comment'
                                    } />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between">
                                        <h3 className="font-bold text-slate-800 truncate group-hover:text-iiif-blue">
                                            {res.label}
                                        </h3>
                                        <span className="text-[10px] font-mono bg-slate-50 px-1.5 py-0.5 rounded text-slate-400 border border-slate-100">
                                            {res.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                                        <Icon name="folder_open" className="text-[10px]"/>
                                        {res.context}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </>
            ) : query.length > 1 ? (
                <div className="text-center py-20 text-slate-400">
                    <Icon name="search_off" className="text-4xl mb-2 text-slate-300"/>
                    <p>No results found for "{query}"</p>
                </div>
            ) : (
                <div className="text-center py-20 text-slate-400">
                    <Icon name="manage_search" className="text-4xl mb-2 text-slate-300"/>
                    <p>Start typing to search your archive.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
