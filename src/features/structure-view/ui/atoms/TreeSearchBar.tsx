/**
 * Tree Search Bar Atom
 *
 * Refined search input with archival aesthetic.
 * Clean, warm design with subtle depth.
 *
 * BOLD AESTHETIC:
 * - Warm stone palette with amber accents
 * - Refined typography (serif for counts)
 * - Generous padding and rounded corners
 * - Subtle focus states
 *
 * @module features/structure-view/ui/atoms/TreeSearchBar
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

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
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
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
          <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            bg-white dark:bg-stone-800
            border border-stone-200 dark:border-stone-700
            rounded-xl
            text-sm text-stone-900 dark:text-stone-100
            placeholder:text-stone-400
            focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500
            transition-all duration-200
          `}
          aria-label="Search structure tree"
        />
        {/* Clear button */}
        {query && (
          <Button variant="ghost" size="bare"
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
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
          <span className="text-stone-500 dark:text-stone-400 font-serif">
            {matchCount === 0 ? (
              'No matches found'
            ) : (
              <>
                <span className="font-medium text-stone-700 dark:text-stone-300">{matchCount}</span>
                {' '}of{' '}
                <span className="text-stone-500">{totalCount}</span>
                {' '}items
              </>
            )}
          </span>
          {matchCount === 0 && (
            <Button variant="ghost" size="bare"
              onClick={() => onQueryChange('')}
              className="text-sm text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium transition-colors"
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
