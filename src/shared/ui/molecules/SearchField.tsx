/**
 * SearchField Molecule
 *
 * Composes: Icon + Input atoms
 *
 * A standalone search input extracted from ViewContainer.
 * Single source of truth for search patterns across the app.
 *
 * NOTE: This is a pure presentational component - no hooks.
 * All state and debounce logic is handled by parent organism.
 *
 * IDEAL OUTCOME: Pure controlled input, parent handles all logic
 * FAILURE PREVENTED: Hook usage in molecules violates atomic design rules
 */

import React from 'react';
import { Button, Icon, Input } from '../atoms';
import { INPUT_CONSTRAINTS } from '../../config/tokens';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface SearchFieldProps {
  /** Current search value (controlled) */
  value: string;
  /** Called when value changes (parent handles debounce if needed) */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Width variant */
  width?: string;
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
 * Pure presentational component - no hooks.
 * Must be fully controlled by parent organism.
 *
 * @example
 * // Parent organism handles state and debounce
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebouncedValue(query, 300);
 *
 * <SearchField
 *   value={query}
 *   onChange={setQuery}
 *   placeholder="Search archive..."
 * />
 */
export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder ='Search...',
  width = INPUT_CONSTRAINTS.width.search,
  autoFocus = false,
  showClear = true,
  className ='',
  cx = {},
  fieldMode: _fieldMode = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange('');
  };

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
        value={value}
        onChange={handleChange}
        autoFocus={autoFocus}
        className={`
          w-full pl-10 pr-8 py-2 border  text-sm
          outline-none transition-nb
          focus:ring-2 focus:ring-offset-2
          ${cx.searchInput}
`}
        aria-label="Search"
      />

      {/* Clear Button */}
      {showClear && value && (
        <Button
          onClick={handleClear}
          variant="ghost"
          size="sm"
          className={`
            absolute right-2 top-2 p-0.5 
            transition-nb focus:outline-none focus:ring-2 focus:ring-offset-1
            ${cx.iconButton}
`}
          title="Clear search"
          aria-label="Clear search"
        >
          <Icon name="close" className="text-sm" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
};

export default SearchField;
