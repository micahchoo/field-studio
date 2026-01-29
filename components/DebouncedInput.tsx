/**
 * Debounced Input Components
 *
 * Input and Textarea components that debounce onChange calls to avoid
 * excessive updates during typing. Used in Inspector and other forms.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { validateTextInput, ValidationOptions, ValidationResult } from '../utils/inputValidation';

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  /** Validation options for input sanitization */
  validation?: ValidationOptions;
  /** Callback for validation errors */
  onValidationError?: (result: ValidationResult) => void;
  /** Whether to show validation errors inline */
  showValidationErrors?: boolean;
}

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  /** Validation options for input sanitization */
  validation?: ValidationOptions;
  /** Callback for validation errors */
  onValidationError?: (result: ValidationResult) => void;
  /** Whether to show validation errors inline */
  showValidationErrors?: boolean;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  debounceMs = 300,
  validation,
  onValidationError,
  showValidationErrors = false,
  ...props
}) => {
  const [innerValue, setInnerValue] = useState(value ?? '');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Keep onChange ref current without triggering effects
  onChangeRef.current = onChange;

  // Sync from external prop changes only when not actively typing
  useEffect(() => {
    if (!isTypingRef.current) {
      setInnerValue(value ?? '');
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Validate and sanitize input
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

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(sanitizedValue);
      isTypingRef.current = false;
    }, debounceMs);
  }, [debounceMs, validation, onValidationError]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full">
      <input
        {...props}
        value={innerValue}
        onChange={handleChange}
        aria-invalid={!!validationError}
        aria-describedby={validationError && showValidationErrors ? `${props.id}-error` : props['aria-describedby']}
      />
      {showValidationErrors && validationError && (
        <div
          id={`${props.id}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {validationError}
        </div>
      )}
    </div>
  );
};

export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({
  value,
  onChange,
  debounceMs = 300,
  validation,
  onValidationError,
  showValidationErrors = false,
  ...props
}) => {
  const [innerValue, setInnerValue] = useState(value ?? '');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!isTypingRef.current) {
      setInnerValue(value ?? '');
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawValue = e.target.value;

    // Validate and sanitize input
    const validationResult = validateTextInput(rawValue, validation);

    if (!validationResult.isValid) {
      setValidationError(validationResult.error);
      onValidationError?.(validationResult);
    } else {
      setValidationError(undefined);
    }

    const sanitizedValue = validationResult.value;
    isTypingRef.current = true;
    setInnerValue(sanitizedValue);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(sanitizedValue);
      isTypingRef.current = false;
    }, debounceMs);
  }, [debounceMs, validation, onValidationError]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full">
      <textarea
        {...props}
        value={innerValue}
        onChange={handleChange}
        aria-invalid={!!validationError}
        aria-describedby={validationError && showValidationErrors ? `${props.id}-error` : props['aria-describedby']}
      />
      {showValidationErrors && validationError && (
        <div
          id={`${props.id}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {validationError}
        </div>
      )}
    </div>
  );
};

export default DebouncedInput;
