/**
 * DebouncedInput Molecule
 *
 * Composes: Input atom + debounce + validation
 *
 * Text input that debounces onChange to prevent parent thrashing.
 * Configurable debounce delay and optional validation feedback.
 *
 * IDEAL OUTCOME: User types freely, parent receives onChange once after debounce
 * FAILURE PREVENTED: Excessive re-renders from rapid input changes
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Input } from '../atoms';
import { INPUT_CONSTRAINTS, UI_TIMING } from '../../config/tokens';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import { sanitizeForInput } from '@/utils/inputValidation';

export interface DebouncedInputProps {
  /** Current input value */
  value: string;
  /** Called with debounced value */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in ms (default: 300ms from INPUT_CONSTRAINTS) */
  debounceMs?: number;
  /** Max length validation */
  maxLength?: number;
  /** Input type */
  type?: 'text' | 'search' | 'email' | 'url';
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Input id for accessibility */
  id?: string;
  /** ARIA label */
  ariaLabel?: string;
  /** Show character count */
  showCount?: boolean;
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
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
 *   maxLength={500}
 *   showCount
 * />
 */
export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter text...',
  debounceMs = INPUT_CONSTRAINTS.debounceMs,
  maxLength = INPUT_CONSTRAINTS.maxLengthDefault,
  type = 'text',
  className = '',
  disabled = false,
  autoFocus = false,
  id,
  ariaLabel,
  showCount = false,
  cx = {},
  fieldMode = false,
}) => {
  // Context is provided via props (no hook calls)

  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(value);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Handle input change with debounce
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;

      // Sanitize input
      const sanitized = sanitizeForInput(rawValue, {
        maxLength,
        allowHtml: false,
      });

      // Update local state immediately for responsive UI
      setLocalValue(sanitized);
      setIsDebouncing(true);

      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new debounce timer
      const timer = setTimeout(() => {
        onChange(sanitized);
        setIsDebouncing(false);
      }, debounceMs);

      setDebounceTimer(timer);
    },
    [debounceTimer, debounceMs, maxLength, onChange]
  );

  const characterCount = localValue.length;
  const isNearLimit = maxLength > 0 && characterCount > maxLength * 0.9;

  return (
    <div className={`relative ${className}`}>
      <Input
        type={type}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        id={id}
        aria-label={ariaLabel}
        className={`
          w-full
          ${cx.input}
          ${isDebouncing ? 'opacity-80' : ''}
          transition-opacity
          duration-${UI_TIMING.transition}
        `}
      />

      {/* Character count indicator */}
      {showCount && (
        <span
          className={`
            absolute right-3 top-2.5 text-xs
            ${isNearLimit ? 'text-amber-500 font-medium' : cx.textMuted}
          `}
          aria-live="polite"
        >
          {characterCount}/{maxLength}
        </span>
      )}

      {/* Debouncing indicator */}
      {isDebouncing && (
        <span
          className={`
            absolute right-3 top-2.5 text-xs
            ${cx.textMuted}
            animate-pulse
          `}
          aria-hidden="true"
        >
          ...
        </span>
      )}
    </div>
  );
};

export default DebouncedInput;
