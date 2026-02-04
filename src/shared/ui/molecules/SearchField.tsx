/**
 * SearchField Molecule
 *
 * Composes: Icon + Input atoms + debounce
 *
 * A standalone search input extracted from ViewContainer.
 * Single source of truth for search patterns across the app.
 *
 * IDEAL OUTCOME: Typing triggers onChange after debounce, independent of parent
 * FAILURE PREVENTED: User input loss or thrashing parent component state
 */

import React, { useCallback } from 'react';
import { Icon, Input } from '../atoms';
import { INPUT_CONSTRAINTS } from '../../config/tokens';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface SearchFieldProps {
  /** Current search value */
  value?: string;
  /** Called with debounced search value */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Width variant */
  width?: string;
  /** Optional: execute search when value changes */
  onSearch?: (value: string) => void;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Show clear button */
  showClear?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
}

/**
 * SearchField Molecule
 *
 * @example
 * const [query, setQuery] = useState('');
 * <SearchField
 *   value={query}
 *   onChange={setQuery}
 *   placeholder="Search archive..."
 *   onSearch={executeSearch}
 * />
 */
export const SearchField: React.FC<SearchFieldProps> = ({
  value = '',
  onChange,
  placeholder = 'Search...',
  width = INPUT_CONSTRAINTS.width.search,
  onSearch,
  autoFocus = false,
  showClear = true,
  className = '',
  cx = {},
  fieldMode = false,
}) => {
  // Context is provided via props (no hook calls)

  // Debounce text for onChange - hook manages local state and calls onChange after delay
  const { localValue: text, handleChange, flush } = useDebouncedValue(
    value,
    (newValue) => {
      onChange?.(newValue);
      onSearch?.(newValue);
    },
    INPUT_CONSTRAINTS.debounceMs
  );

  const handleClear = useCallback(() => {
    handleChange('');
    flush(); // Flush immediately on clear
  }, [handleChange, flush]);

  return (
    <div className={`relative ${width} ${className}`}>
      {/* Search Icon */}
      <Icon
        name="search"
        className={`
          absolute left-3 top-2.5 text-lg pointer-events-none
          ${cx.label}
        `}
        aria-hidden="true"
      />

      {/* Input */}
      <Input
        type="text"
        placeholder={placeholder}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        autoFocus={autoFocus}
        className={`
          w-full pl-10 pr-8 py-2 border rounded-md text-sm
          outline-none transition-all
          focus:ring-2 focus:ring-offset-2
          ${cx.searchInput}
        `}
        aria-label="Search"
      />

      {/* Clear Button */}
      {showClear && text && (
        <button
          onClick={handleClear}
          className={`
            absolute right-2 top-2 p-0.5 rounded-full
            transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
            ${cx.iconButton}
          `}
          type="button"
          title="Clear search"
          aria-label="Clear search"
        >
          <Icon name="close" className="text-sm" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default SearchField;
