/**
 * useDebouncedValue
 *
 * Manages local input state with a debounced flush to the parent onChange.
 * Mirrors the focus/blur semantics of the old DebouncedInput/DebouncedTextarea
 * pair: external value syncs while idle, flush fires immediately on blur.
 *
 * @param value    Current value from the parent (syncs when not actively editing)
 * @param onChange Callback fired after `delay` ms of inactivity, or immediately on flush
 * @param delay    Debounce window in ms (default 300)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useDebouncedValue<T>(
  value: T,
  onChange: (value: T) => void,
  delay: number = 300
) {
  const [localValue, setLocalValue] = useState<T>(value);
  const onChangeRef = useRef(onChange);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditingRef = useRef(false);

  // Always keep the ref current so the timeout closure calls the latest handler
  onChangeRef.current = onChange;

  // Sync from parent when the user is not mid-edit
  useEffect(() => {
    if (!isEditingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  // Cleanup any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /** Set local value and start/reset the debounce timer */
  const handleChange = useCallback((newValue: T) => {
    isEditingRef.current = true;
    setLocalValue(newValue);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(newValue);
      isEditingRef.current = false;
    }, delay);
  }, [delay]);

  /** Flush any pending value immediately — call this on blur */
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isEditingRef.current = false;
    // Use a functional read of localValue via ref to avoid stale closure
    onChangeRef.current(localValue);
  }, [localValue]);

  return { localValue, handleChange, flush };
}
