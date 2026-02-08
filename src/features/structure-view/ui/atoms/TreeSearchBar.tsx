/**
 * Tree Search Bar Atom
 *
 * Refined search input with archival aesthetic.
 * Clean, warm design with subtle depth.
 *
 * BOLD AESTHETIC:
 * - Warm stone palette with amber accents
 * - Refined typography (serif for counts)
 * - Generous padding and corners
 * - Subtle focus states
 *
 * @module features/structure-view/ui/atoms/TreeSearchBar
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
export interface TreeSearchBarProps {
  /** Current search query */
  query: string;
  /** Callback when query changes */
  onQueryChange: (query: string) => void;
  /** Number of matches found */
  matchCount?: number;
  /** Total number of items */
  totalCount?: number;
  /** Additional className */
  className?: string;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
}

/**
 * Tree Search Bar Atom
 *
 * @example
 * <TreeSearchBar
 *   query={filterQuery}
 *   onQueryChange={setFilterQuery}
 *   matchCount={23}
 *   totalCount={156}
 * />
 */
export const TreeSearchBar: React.FC<TreeSearchBarProps> = ({
  query,
  onQueryChange,
  matchCount,
  totalCount,
  className = '',
  autoFocus = false,
}) => {
  const showMatchInfo = matchCount !== undefined && totalCount !== undefined && query;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Search input with refined styling */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-nb-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Find items..."
          autoFocus={autoFocus}
          className={`
            w-full pl-10 pr-10 py-2.5
            bg-nb-black
            border border-nb-black/20
            
            text-sm text-nb-cream
            placeholder:text-nb-black/40
            focus:outline-none focus:ring-2 focus:ring-nb-orange/30 focus:border-nb-orange
            transition-nb 
          `}
          aria-label="Search structure tree"
        />
        {/* Clear button */}
        {query && (
          <Button variant="ghost" size="bare"
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-nb-black/40 hover:text-nb-black/60 transition-nb"
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        )}
      </div>
      
      {/* Match count info with refined typography */}
      {showMatchInfo && (
        <div className="flex justify-between items-center text-sm px-1">
          <span className="text-nb-black/50 font-serif">
            {matchCount === 0 ? (
              'No matches found'
            ) : (
              <>
                <span className="font-medium text-nb-black/20">{matchCount}</span>
                {' '}of{' '}
                <span className="text-nb-black/50">{totalCount}</span>
                {' '}items
              </>
            )}
          </span>
          {matchCount === 0 && (
            <Button variant="ghost" size="bare"
              onClick={() => onQueryChange('')}
              className="text-sm text-nb-orange hover:text-nb-orange font-medium transition-nb"
            >
              Clear search
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

TreeSearchBar.displayName = 'TreeSearchBar';

export default TreeSearchBar;
