/**
 * DebouncedField Atom
 *
 * Renders an <input> or <textarea> that debounces onChange.
 *
 * @module features/metadata-edit/ui/atoms/DebouncedField
 */

import React from 'react';
import { useDebouncedValue } from '@/src/shared/lib/hooks/useDebouncedValue';

export interface DebouncedFieldProps {
  value: string;
  onChange: (value: string) => void;
  inputType?: 'input' | 'textarea';
  rows?: number;
  [key: string]: unknown;
}

export const DebouncedField: React.FC<DebouncedFieldProps> = ({ value, onChange, inputType = 'input', rows, ...props }) => {
  const { value: localValue, setValue: handleChange, flush } = useDebouncedValue(value ?? '', onChange);

  const common = {
    ...props,
    value: localValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e.target.value),
    onBlur: (e: React.FocusEvent) => { flush(); const onBlurFn = (props as Record<string, unknown>).onBlur; if (typeof onBlurFn === 'function') onBlurFn(e); },
  };

  return inputType === 'textarea'
    ? <textarea {...common as React.TextareaHTMLAttributes<HTMLTextAreaElement>} rows={rows} />
    : <input {...common as React.InputHTMLAttributes<HTMLInputElement>} />;
};

export default DebouncedField;
