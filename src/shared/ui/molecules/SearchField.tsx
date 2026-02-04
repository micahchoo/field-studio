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

import React, { useState, useCallback, useEffect } from 'react';
import { Icon, Input } from '../atoms';
import { INPUT_CONSTRAINTS } from '../../config/tokens';
import { useContextualStyles } from '../../../hooks/useContextualStyles';
import { useAppSettings } from '../../../hooks/useAppSettings';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

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
}) => {
  // Theme via context (no fieldMode prop)
  const { settings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);

  // Local state
  const [text, setText] = useState(value);

  // Sync external value
  useEffect(() => {
    setText(value);
  }, [value]);

  // Debounce text for onChange
  const debouncedText = useDebouncedValue(text, INPUT_CONSTRAINTS.debounceMs);

  // Fire onChange when debounced value changes
  useEffect(() => {
    onChange?.(debouncedText);
    onSearch?.(debouncedText);
  }, [debouncedText, onChange, onSearch]);

  const handleClear = useCallback(() => {
    setText('');
  }, []);

  return (
    <div className={`relative ${width} ${className}`}>
      {/* Search Icon */}
      <Icon
        name="search"
        className={`
          absolute left-3 top-2.5 text-lg pointer-events-none
          ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}
        `}
        aria-hidden="true"
      />

      {/* Input */}
      <Input
        type="text"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={autoFocus}
        className={`
          w-full pl-10 pr-8 py-2 border rounded-md text-sm
          outline-none transition-all
          focus:ring-2 focus:ring-offset-2
          ${
            settings.fieldMode
              ? 'bg-slate-800 border-slate-600 text-white focus:border-yellow-400 focus:ring-yellow-400 focus:ring-offset-slate-900'
              : 'bg-slate-100 border-transparent focus:bg-white focus:border-iiif-blue focus:ring-blue-600 focus:ring-offset-white'
          }
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
            ${
              settings.fieldMode
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700 focus:ring-yellow-400 focus:ring-offset-slate-900'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 focus:ring-blue-600 focus:ring-offset-white'
            }
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
