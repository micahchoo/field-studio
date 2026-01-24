/**
 * Debounced Input Components
 *
 * Input and Textarea components that debounce onChange calls to avoid
 * excessive updates during typing. Used in Inspector and other forms.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  debounceMs = 300,
  ...props
}) => {
  const [innerValue, setInnerValue] = useState(value ?? '');
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
    const newVal = e.target.value;
    isTypingRef.current = true;
    setInnerValue(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(newVal);
      isTypingRef.current = false;
    }, debounceMs);
  }, [debounceMs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return <input {...props} value={innerValue} onChange={handleChange} />;
};

export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({
  value,
  onChange,
  debounceMs = 300,
  ...props
}) => {
  const [innerValue, setInnerValue] = useState(value ?? '');
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
    const newVal = e.target.value;
    isTypingRef.current = true;
    setInnerValue(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(newVal);
      isTypingRef.current = false;
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return <textarea {...props} value={innerValue} onChange={handleChange} />;
};

export default DebouncedInput;
