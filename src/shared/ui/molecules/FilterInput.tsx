/**
 * FilterInput Molecule
 *
 * Composes: Icon + Input atoms + debounce logic
 *
 * A search/filter input with built-in debounce, clear button, and fieldMode theming.
 * Receives `cx` and `fieldMode` as optional props from organism.
 * NOTE: Does NOT call useContextualStyles — receives cx via props.
 *
 * IDEAL OUTCOME: User types, onChange is called once after debounce period
 * FAILURE PREVENTED: Excessive onChange calls don't thrash parent state
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Icon, Input } from '../atoms';
import { INPUT_CONSTRAINTS } from '../../config/tokens';
import { sanitizeForInput } from '@/utils/inputValidation';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface FilterInputProps {
  /** Current filter value */
  value: string;
  /** Change handler (called after debounce) */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Width class (default: w-64 from INPUT_CONSTRAINTS) */
  width?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Clear button visibility */
  showClear?: boolean;
  /** Input id for accessibility */
  id?: string;
  /** ARIA label for screen readers */
  ariaLabel?: string;
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
}

/**
 * FilterInput Molecule
 *
 * @example
 * const [filter, setFilter] = useState('');
 * <FilterInput
 *   value={filter}
 *   onChange={setFilter}
 *   placeholder="Filter items..."
 * />
 */
export const FilterInput: React.FC<FilterInputProps> = ({
  value,
  onChange,
  placeholder = 'Filter...',
  className = '',
  width = INPUT_CONSTRAINTS.width.filter,
  autoFocus = false,
  showClear = true,
  id,
  ariaLabel,
  cx = {},
  fieldMode = false,
}) => {
  // Context is provided via props (no hook calls)

  // Local state for uncontrolled input behavior
  const [localValue, setLocalValue] = useState(value);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle input change with debounce
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;

      // Sanitize input
      const sanitized = sanitizeForInput(rawValue, {
        maxLength: INPUT_CONSTRAINTS.maxLengthDefault,
        allowHtml: false,
      });

      // Update local state immediately (for UI responsiveness)
      setLocalValue(sanitized);

      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new debounce timer
      const timer = setTimeout(() => {
        onChange(sanitized);
      }, INPUT_CONSTRAINTS.debounceMs);

      setDebounceTimer(timer);
    },
    [onChange, debounceTimer]
  );

  // Handle clear button
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    // Clear any pending debounce
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
  }, [onChange, debounceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const inputId = id || 'filter-input';
  const clearButtonId = `${inputId}-clear`;

  return (
    <div className={`relative ${width} ${className}`}>
      {/* Search Icon */}
      <Icon
        name="search"
        className={`
          absolute left-3 top-2.5 text-lg
          ${cx.label}
        `}
        aria-hidden="true"
      />

      {/* Input Field - using Input atom */}
      <Input
        id={inputId}
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        autoFocus={autoFocus}
        aria-label={ariaLabel || placeholder}
        className={`
          pl-10 pr-8 py-2 border rounded-md text-sm
          outline-none transition-all
          focus:ring-2 focus:ring-offset-2
          ${cx.searchInput}
        `}
      />

      {/* Clear Button */}
      {showClear && localValue && (
        <button
          id={clearButtonId}
          onClick={handleClear}
          className={`
            absolute right-2 top-2 p-0.5 rounded-full
            transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
            ${cx.iconButton}
          `}
          title="Clear filter"
          aria-label="Clear filter"
          type="button"
        >
          <Icon name="close" className="text-sm" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default FilterInput;
