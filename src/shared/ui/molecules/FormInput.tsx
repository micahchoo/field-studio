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

export type FormInputType ='text' |'textarea' |'number' |'datetime-local' |'date' |'time' |'email' |'url' |'password';

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
  type ='text',
  label,
  placeholder ='',
  hint,
  error,
  disabled = false,
  required = false,
  fieldMode = false,
  actionButton,
  rows = 3,
  className ='',
  id,
  min,
  max,
  step,
}) => {
  const inputClass =`w-full text-xs px-2 py-1 border focus:outline-none focus:ring-2 transition-nb ${
    error
      ? fieldMode
        ?'border-nb-red bg-nb-red/20 text-nb-red/60 focus:border-nb-red focus:ring-red-500/50'
        :'border-nb-red/40 bg-nb-red/10 text-nb-red focus:border-nb-red focus:ring-red-200'
      : fieldMode
        ?'bg-nb-black text-nb-black/20 border-nb-black/80 focus:border-nb-blue focus:ring-nb-blue/50'
        :'bg-nb-white text-nb-black border-nb-black/20 focus:border-nb-blue focus:ring-nb-blue/30'
  } ${disabled ?'opacity-50 cursor-not-allowed' :''} ${className}`;

  const labelClass =`block text-xs font-bold mb-1 ${fieldMode ?'text-nb-black/30' :'text-nb-black/80'}`;
  const hintClass =`text-[10px] mt-1 ${error ? (fieldMode ?'text-nb-red' :'text-nb-red') : (fieldMode ?'text-nb-black/40' :'text-nb-black/50')}`;

  const renderInput = () => {
    if (type ==='textarea') {
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
          aria-describedby={error ?`${id}-error` : hint ?`${id}-hint` : undefined}
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
        aria-describedby={error ?`${id}-error` : hint ?`${id}-hint` : undefined}
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
          {required && <span className={fieldMode ?'text-nb-red' :'text-nb-red'}> *</span>}
        </label>
      )}
      {renderInput()}
      {(error || hint) && (
        <div id={error ?`${id}-error` :`${id}-hint`} className={hintClass} role={error ?'alert' : undefined}>
          {error || hint}
        </div>
      )}
    </div>
  );
};

export default FormInput;
