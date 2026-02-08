/**
 * SelectField Molecule
 *
 * Universal select dropdown for simple and grouped options.
 * Supports native HTML select with consistent styling and accessibility.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/molecules/SelectField
 */

import React from 'react';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface SelectOptionGroup {
  readonly label: string;
  readonly options: readonly SelectOption[];
}

export interface SelectFieldProps {
  /** Current value */
  value: string;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Simple options (for non-grouped select) */
  options?: readonly SelectOption[];
  /** Grouped options (for optgroup-based select) */
  groups?: readonly SelectOptionGroup[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether disabled */
  disabled?: boolean;
  /** Optional label */
  label?: string;
  /** Whether to show label */
  showLabel?: boolean;
  /** Optional hint text (e.g.,"dc:title") */
  hint?: string;
  /** Field mode for dark theme */
  fieldMode?: boolean;
  /** Additional CSS class */
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  value,
  onChange,
  options,
  groups,
  placeholder ='Select an option...',
  disabled = false,
  label,
  showLabel = false,
  hint,
  fieldMode = false,
  className ='',
}) => {
  const inputClass =`w-full text-sm p-2.5 border focus:ring-2 focus:ring-nb-blue focus:border-nb-blue outline-none transition-nb ${
    fieldMode
      ?'bg-nb-black text-nb-black/20 border-nb-black/80'
      :'bg-nb-white text-nb-black border-nb-black/20'
  } ${disabled ?'opacity-50 cursor-not-allowed' :''} ${className}`;

  return (
    <div className="space-y-1.5">
      {showLabel && label && (
        <div className={`flex justify-between items-center ${fieldMode ?'text-nb-black/30' :'text-nb-black/80'}`}>
          <label className="block text-xs font-bold">{label}</label>
          {hint && (
            <span className={`text-[9px] font-mono px-1 ${fieldMode ?'bg-nb-black text-nb-black/50' :'bg-nb-white text-nb-black/40'}`}>
              {hint}
            </span>
          )}
        </div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={inputClass}
      >
        <option value="">{placeholder}</option>

        {/* Render simple options */}
        {options && options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}

        {/* Render grouped options */}
        {groups && groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
};

export default SelectField;
