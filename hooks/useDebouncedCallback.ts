/**
 * useDebouncedCallback Hook
 * 
 * Debounces a callback function to limit how often it can fire.
 * Essential for rapid-fire events like input changes, scroll, resize.
 * 
 * @example
 * ```tsx
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => performSearch(query),
 *   300
 * );
 * 
 * return <input onChange={e => debouncedSearch(e.target.value)} />;
 * ```
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Creates a debounced version of a callback function
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function with cancel method
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void } {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);

  // Keep callback reference up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedFn = useCallback((...args: Parameters<T>) => {
    pendingArgsRef.current = args;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (pendingArgsRef.current) {
        callbackRef.current(...pendingArgsRef.current);
        pendingArgsRef.current = null;
      }
      timeoutRef.current = null;
    }, delay);
  }, [delay]);

  // Cancel pending execution
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      pendingArgsRef.current = null;
    }
  }, []);

  // Execute immediately with pending args
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingArgsRef.current) {
      callbackRef.current(...pendingArgsRef.current);
      pendingArgsRef.current = null;
    }
  }, []);

  return Object.assign(debouncedFn, { cancel, flush });
}

/**
 * Hook for debouncing a value
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Import React for useDebouncedValue
import * as React from 'react';

export default useDebouncedCallback;
