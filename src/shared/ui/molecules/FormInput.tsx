/**
 * FormInput Molecule
 *
 * Universal form input supporting multiple types with consistent styling.
 * Consolidates text, textarea, number, datetime, and other input patterns.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled input)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens via Tailwind
 *
 * @module shared/ui/molecules/FormInput
 */

import React, { ReactNode } from 'react';

export type FormInputType = 'text' | 'textarea' | 'number' | 'datetime-local' | 'date' | 'time' | 'email' | 'url' | 'password';

export interface FormInputProps {
  /** Current input value */
  value: string | number;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Input type */
  type?: FormInputType;
  /** Input label (optional) */
  label?: string;
  /** Input placeholder */
  placeholder?: string;
  /** Helper text or hint displayed below input */
  hint?: string;
  /** Error message to display */
  error?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Field mode for dark theme */
  fieldMode?: boolean;
  /** Optional action button/element (e.g., location picker) */
  actionButton?: ReactNode;
  /** Number of rows for textarea */
  rows?: number;
  /** Additional CSS class */
  className?: string;
  /** Input ID for label association */
  id?: string;
  /** Min value for number inputs */
  min?: number;
  /** Max value for number inputs */
  max?: number;
  /** Step value for number inputs */
  step?: number;
}

export const FormInput: React.FC<FormInputProps> = ({
  value,
  onChange,
  type = 'text',
  label,
  placeholder = '',
  hint,
  error,
  disabled = false,
  required = false,
  fieldMode = false,
  actionButton,
  rows = 3,
  className = '',
  id,
  min,
  max,
  step,
}) => {
  const inputClass = `w-full text-xs rounded px-2 py-1 border focus:outline-none focus:ring-2 transition-colors ${
    error
      ? fieldMode
        ? 'border-red-700 bg-red-900/20 text-red-300 focus:border-red-600 focus:ring-red-500/50'
        : 'border-red-300 bg-red-50 text-red-900 focus:border-red-400 focus:ring-red-200'
      : fieldMode
        ? 'bg-slate-800 text-slate-200 border-slate-700 focus:border-blue-500 focus:ring-blue-500/50'
        : 'bg-white text-slate-800 border-slate-200 focus:border-blue-400 focus:ring-blue-200'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  const labelClass = `block text-xs font-bold mb-1 ${fieldMode ? 'text-slate-300' : 'text-slate-700'}`;
  const hintClass = `text-[10px] mt-1 ${error ? (fieldMode ? 'text-red-400' : 'text-red-600') : (fieldMode ? 'text-slate-400' : 'text-slate-500')}`;

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`${inputClass} resize-none`}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
      );
    }

    const inputElement = (
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        step={step}
        className={inputClass}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
    );

    // If there's an action button, wrap input and button in a flex container
    if (actionButton) {
      return (
        <div className="flex gap-1">
          {inputElement}
          {actionButton}
        </div>
      );
    }

    return inputElement;
  };

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className={labelClass}>
          {label}
          {required && <span className={fieldMode ? 'text-red-400' : 'text-red-600'}> *</span>}
        </label>
      )}
      {renderInput()}
      {(error || hint) && (
        <div id={error ? `${id}-error` : `${id}-hint`} className={hintClass} role={error ? 'alert' : undefined}>
          {error || hint}
        </div>
      )}
    </div>
  );
};

export default FormInput;
