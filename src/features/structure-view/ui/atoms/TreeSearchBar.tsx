/**
 * Tree Search Bar Atom
 *
 * Search input specifically designed for the structure tree.
 * Includes debounced input, match count display, and clear button.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes FilterInput molecule
 * - No domain logic, only search UI
 * - Props-only API
 *
 * @module features/structure-view/ui/atoms/TreeSearchBar
 */

import React from 'react';
import { FilterInput } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

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
  cx = {},
  fieldMode = false,
}) => {
  const showMatchInfo = matchCount !== undefined && totalCount !== undefined && query;

  return (
    <div className={`space-y-1 ${className}`}>
      <FilterInput
        value={query}
        onChange={onQueryChange}
        placeholder="Search tree..."
        ariaLabel="Search structure tree"
        autoFocus={autoFocus}
        cx={cx}
        fieldMode={fieldMode}
        className="w-full"
      />
      
      {/* Match count info */}
      {showMatchInfo && (
        <div className="flex justify-between items-center text-xs px-1">
          <span className={fieldMode ? 'text-slate-400' : 'text-slate-500'}>
            {matchCount === 0 ? (
              'No matches'
            ) : (
              <>
                <span className="font-medium">{matchCount}</span>
                {' '}of{' '}
                <span className="font-medium">{totalCount}</span>
                {' '}items
              </>
            )}
          </span>
          {matchCount === 0 && (
            <button
              onClick={() => onQueryChange('')}
              className={`text-xs underline hover:no-underline ${
                fieldMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
};

TreeSearchBar.displayName = 'TreeSearchBar';

export default TreeSearchBar;
