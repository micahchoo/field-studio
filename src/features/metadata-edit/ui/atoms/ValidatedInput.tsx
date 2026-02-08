import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';

export type ValidationStatus = 'pristine' | 'valid' | 'invalid' | 'validating';

export interface FieldValidation {
  status: ValidationStatus;
  message?: string;
  fix?: () => void;
  fixDescription?: string;
}

export interface ValidatedInputProps {
  value: string;
  onChange: (value: string) => void;
  validation: FieldValidation;
  label: string;
  id: string;
  type?: 'text' | 'textarea' | 'url';
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  fieldMode?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/**
 * ValidatedInput - Field-level validation component for IIIF Inspector
 * 
 * Visual States:
 * - Pristine: border-nb-black/20 (default)
 * - Validating: border-nb-orange with spinner icon
 * - Valid: border-nb-green with checkmark (fades after 2s)
 * - Invalid: border-nb-red with exclamation, error message below, fix button if available
 * 
 * Accessibility:
 * - Screen reader announcements via aria-live
 * - Proper ARIA attributes for validation state
 * - Keyboard navigation support
 */
export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  value,
  onChange,
  validation,
  label,
  id,
  type = 'text',
  placeholder,
  disabled = false,
  rows = 3,
  fieldMode = false,
  onFocus,
  onBlur,
}) => {
  const [innerValue, setInnerValue] = useState(value ?? '');
  const [showSuccess, setShowSuccess] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef<boolean>(false);
  const isFocused = useRef<boolean>(false);
  const onChangeRef = useRef<(val: string) => void>(onChange);

  onChangeRef.current = onChange;

  // Sync with external value when not typing/focused
  useEffect(() => {
    if (!isTyping.current && !isFocused.current) {
      setInnerValue(value ?? '');
    }
  }, [value]);

  // Handle success state fade after 2 seconds
  useEffect(() => {
    if (validation.status === 'valid') {
      setShowSuccess(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } else {
      setShowSuccess(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [validation.status]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    isTyping.current = true;
    setInnerValue(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(newVal);
      isTyping.current = false;
    }, 300);
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    isFocused.current = true;
    onFocus?.(e as React.FocusEvent<HTMLInputElement>);
  }, [onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    isFocused.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      onChangeRef.current(innerValue);
      isTyping.current = false;
    }
    onBlur?.(e as React.FocusEvent<HTMLInputElement>);
  }, [onBlur, innerValue]);

  // Determine border color based on validation state
  const getBorderColor = () => {
    if (disabled) return fieldMode ? 'border-nb-black/80' : 'border-nb-black/20';
    
    switch (validation.status) {
      case 'invalid':
        return 'border-nb-red focus:border-nb-red focus:ring-2 focus:ring-red-200';
      case 'valid':
        return showSuccess
          ? 'border-nb-green focus:border-nb-green focus:ring-2 focus:ring-green-200'
          : (fieldMode ? 'border-nb-black focus:border-nb-yellow' : 'border-nb-black/20 focus:ring-2 focus:ring-nb-blue');
      case 'validating':
        return 'border-nb-orange focus:border-nb-orange focus:ring-2 focus:ring-nb-orange/20';
      case 'pristine':
      default:
        return fieldMode
          ? 'border-nb-black focus:border-nb-yellow'
          : 'border-nb-black/20 focus:ring-2 focus:ring-nb-blue';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (validation.status) {
      case 'invalid':
        return <Icon name="error" className="text-nb-red text-sm" />;
      case 'valid':
        return showSuccess ? <Icon name="check_circle" className="text-nb-green text-sm" /> : null;
      case 'validating':
        return (
          <span className="inline-block animate-spin">
            <Icon name="sync" className="text-nb-orange text-sm" />
          </span>
        );
      case 'pristine':
      default:
        return null;
    }
  };

  // Get ARIA attributes for accessibility
  const getAriaAttributes = () => {
    const attrs: Record<string, string> = {
      'aria-describedby': `${id}-help`,
    };

    if (validation.status === 'invalid') {
      attrs['aria-invalid'] = 'true';
      attrs['aria-errormessage'] = `${id}-error`;
    } else if (validation.status === 'valid') {
      attrs['aria-invalid'] = 'false';
    }

    return attrs;
  };

  const baseInputClass = `w-full text-sm p-3 outline-none border transition-nb ${getBorderColor()} ${
    fieldMode ? 'bg-theme-input-bg text-white placeholder-theme-input-placeholder' : 'bg-theme-input-bg placeholder-theme-input-placeholder'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  const InputComponent = type === 'textarea' ? 'textarea' : 'input';
  const inputType = type === 'url' ? 'url' : 'text';

  return (
    <div className="space-y-1.5">
      {/* Label with status indicator */}
      <label 
        htmlFor={id}
        className={`block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
          fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/60'
        }`}
      >
        {label}
        {getStatusIcon()}
      </label>

      {/* Input field */}
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            id={id}
            value={innerValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            rows={rows}
            className={`${baseInputClass} resize-none`}
            {...getAriaAttributes()}
          />
        ) : (
          <input
            id={id}
            type={inputType}
            value={innerValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            className={baseInputClass}
            {...getAriaAttributes()}
          />
        )}
      </div>

      {/* Validation message area with aria-live for screen readers */}
      <div 
        id={`${id}-help`}
        className="min-h-[20px]"
        aria-live="polite"
        aria-atomic="true"
      >
        {validation.status === 'invalid' && validation.message && (
          <div 
            id={`${id}-error`}
            className="flex items-start gap-1.5 text-[10px] text-nb-red"
            role="alert"
          >
            <Icon name="error" className="text-[10px] mt-0.5 shrink-0" />
            <span className="flex-1">{validation.message}</span>
            {validation.fix && (
              <Button variant="ghost" size="bare"
                onClick={validation.fix}
                className="shrink-0 ml-1 px-2 py-0.5 bg-nb-green/20 text-nb-green text-[9px] font-bold uppercase hover:bg-nb-green/30 transition-nb"
                aria-label={`Fix: ${validation.fixDescription || 'Auto-fix this issue'}`}
                title={validation.fixDescription || 'Auto-fix this issue'}
              >
                Fix
              </Button>
            )}
          </div>
        )}

        {validation.status === 'validating' && (
          <div className="flex items-center gap-1.5 text-[10px] text-nb-orange">
            <span className="inline-block animate-spin">
              <Icon name="sync" className="text-[10px]" />
            </span>
            <span>Validating...</span>
          </div>
        )}

        {validation.status === 'valid' && showSuccess && (
          <div className="flex items-center gap-1.5 text-[10px] text-nb-green">
            <Icon name="check_circle" className="text-[10px]" />
            <span>Valid</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidatedInput;
