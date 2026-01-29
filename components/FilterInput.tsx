/**
 * FilterInput - Standardized filter input component
 *
 * Provides consistent filter input UI across views following
 * the iiif-component skill patterns.
 */

import React, { useState, useCallback } from 'react';
import { Icon } from './Icon';
import { sanitizeForInput } from '../utils/inputValidation';

export interface FilterInputProps {
  /** Current filter value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Width class (default: w-64) */
  width?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Clear button visibility */
  showClear?: boolean;
  /** Input id for accessibility */
  id?: string;
  /** ARIA label for screen readers */
  ariaLabel?: string;
}

/**
 * Standardized filter input component
 * 
 * @example
 * <FilterInput 
 *   value={filter}
 *   onChange={setFilter}
 *   placeholder="Filter archive..."
 * />
 * 
 * @example
 * <FilterInput 
 *   value={filter}
 *   onChange={setFilter}
 *   fieldMode
 *   width="w-96"
 *   autoFocus
 * />
 */
export const FilterInput: React.FC<FilterInputProps> = ({
  value,
  onChange,
  placeholder = "Filter...",
  fieldMode = false,
  className = '',
  width = 'w-64',
  autoFocus = false,
  showClear = true,
  id,
  ariaLabel
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitize input to prevent injection
    const sanitized = sanitizeForInput(e.target.value, {
      maxLength: 500,
      allowHtml: false,
    });
    setLocalValue(sanitized);
    onChange(sanitized);
  }, [onChange]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  const inputId = id || 'filter-input';
  const clearButtonId = `${inputId}-clear`;

  return (
    <div className={`relative ${width} ${className}`}>
      <Icon
        name="search"
        className={`
          absolute left-3 top-2.5 text-lg
          ${fieldMode ? 'text-slate-500' : 'text-slate-400'}
        `}
        aria-hidden="true"
      />
      <input
        id={inputId}
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        autoFocus={autoFocus}
        aria-label={ariaLabel || placeholder}
        className={`
          w-full pl-10 pr-8 py-2 border rounded-md text-sm
          outline-none transition-all
          focus:ring-2 focus:ring-offset-2
          ${fieldMode
            ? 'bg-slate-800 border-slate-600 text-white focus:border-yellow-400 focus:ring-yellow-400 focus:ring-offset-slate-900 placeholder:text-slate-600'
            : 'bg-slate-100 border-transparent focus:bg-white focus:border-iiif-blue focus:ring-blue-600 focus:ring-offset-white'
          }
        `}
      />
      {showClear && localValue && (
        <button
          id={clearButtonId}
          onClick={handleClear}
          className={`
            absolute right-2 top-2 p-0.5 rounded-full
            transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
            ${fieldMode
              ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700 focus:ring-yellow-400 focus:ring-offset-slate-900'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 focus:ring-blue-600 focus:ring-offset-white'
            }
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
