/**
 * FilterInput - Standardized filter input component
 * 
 * Provides consistent filter input UI across views following
 * the iiif-component skill patterns.
 */

import React from 'react';
import { Icon } from './Icon';

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
  showClear = true
}) => {
  return (
    <div className={`relative ${width} ${className}`}>
      <Icon 
        name="search" 
        className={`
          absolute left-3 top-2.5 text-lg
          ${fieldMode ? 'text-slate-500' : 'text-slate-400'}
        `} 
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className={`
          w-full pl-10 pr-8 py-2 border rounded-md text-sm 
          outline-none transition-all
          ${fieldMode 
            ? 'bg-slate-800 border-slate-600 text-white focus:border-yellow-400 placeholder:text-slate-600' 
            : 'bg-slate-100 border-transparent focus:bg-white focus:border-iiif-blue'
          }
        `}
      />
      {showClear && value && (
        <button
          onClick={() => onChange('')}
          className={`
            absolute right-2 top-2 p-0.5 rounded-full
            transition-colors
            ${fieldMode 
              ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
            }
          `}
          title="Clear filter"
        >
          <Icon name="close" className="text-sm" />
        </button>
      )}
    </div>
  );
};

export default FilterInput;
