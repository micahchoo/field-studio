/**
 * DebouncedInput Molecule
 *
 * Composes: Input atom + debounce logic + validation
 *
 * A text input that debounces onChange calls to avoid thrashing parent state.
 * Supports optional real-time validation with error display.
 *
 * IDEAL OUTCOME: onChange fires once after debounce, not on every keystroke
 * FAILURE PREVENTED: Form state thrashing during rapid typing
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '../atoms';
import { INPUT_CONSTRAINTS } from '../../config/tokens';
import {
  validateTextInput,
  ValidationOptions,
  ValidationResult,
} from '../../../utils/inputValidation';

export interface DebouncedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Current value */
  value: string;
  /** Called with debounced value */
  onChange: (value: string) => void;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Validation options for input sanitization */
  validation?: ValidationOptions;
  /** Callback for validation errors */
  onValidationError?: (result: ValidationResult) => void;
  /** Whether to show validation errors inline */
  showValidationErrors?: boolean;
}

/**
 * DebouncedInput Molecule
 *
 * @example
 * const [text, setText] = useState('');
 * <DebouncedInput
 *   value={text}
 *   onChange={setText}
 *   debounceMs={500}
 *   validation={{ maxLength: 500 }}
 *   showValidationErrors
 * />
 */
export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  debounceMs = INPUT_CONSTRAINTS.debounceMs,
  validation,
  onValidationError,
  showValidationErrors = false,
  id,
  ...props
}) => {
  // Local state for immediate UI feedback
  const [innerValue, setInnerValue] = useState(value ?? '');
  const [validationError, setValidationError] = useState<string | undefined>(
    undefined
  );

  // Refs for effect guards
  const onChangeRef = useRef(onChange);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Keep onChange ref current
  onChangeRef.current = onChange;

  // Sync from external prop changes (only when not actively typing)
  useEffect(() => {
    if (!isTypingRef.current) {
      setInnerValue(value ?? '');
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;

      // Validate and sanitize
      const validationResult = validateTextInput(rawValue, validation);

      if (!validationResult.isValid) {
        setValidationError(validationResult.error);
        onValidationError?.(validationResult);
        // Still allow typing but show error
      } else {
        setValidationError(undefined);
      }

      const sanitizedValue = validationResult.value;
      isTypingRef.current = true;
      setInnerValue(sanitizedValue);

      // Clear existing timer
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Set new debounce timer
      timeoutRef.current = setTimeout(() => {
        onChangeRef.current(sanitizedValue);
        isTypingRef.current = false;
      }, debounceMs);
    },
    [debounceMs, validation, onValidationError]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const inputId = id || 'debounced-input';
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full">
      <Input
        {...props}
        id={inputId}
        value={innerValue}
        onChange={handleChange}
        aria-invalid={!!validationError}
        aria-describedby={
          validationError && showValidationErrors ? errorId : props['aria-describedby']
        }
      />

      {/* Validation Error Display */}
      {showValidationErrors && validationError && (
        <div
          id={errorId}
          className="mt-1 text-sm text-red-600 font-medium"
          role="alert"
        >
          {validationError}
        </div>
      )}
    </div>
  );
};

export default DebouncedInput;
