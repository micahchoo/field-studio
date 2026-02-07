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
 * - Pristine: border-slate-300 (default)
 * - Validating: border-amber-400 with spinner icon
 * - Valid: border-green-500 with checkmark (fades after 2s)
 * - Invalid: border-red-500 with exclamation, error message below, fix button if available
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
    if (disabled) return fieldMode ? 'border-slate-700' : 'border-slate-200';
    
    switch (validation.status) {
      case 'invalid':
        return 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200';
      case 'valid':
        return showSuccess
          ? 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-200'
          : (fieldMode ? 'border-slate-800 focus:border-yellow-400' : 'border-slate-300 focus:ring-2 focus:ring-blue-500');
      case 'validating':
        return 'border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200';
      case 'pristine':
      default:
        return fieldMode
          ? 'border-slate-800 focus:border-yellow-400'
          : 'border-slate-300 focus:ring-2 focus:ring-blue-500';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (validation.status) {
      case 'invalid':
        return <Icon name="error" className="text-red-500 text-sm" />;
      case 'valid':
        return showSuccess ? <Icon name="check_circle" className="text-green-500 text-sm" /> : null;
      case 'validating':
        return (
          <span className="inline-block animate-spin">
            <Icon name="sync" className="text-amber-400 text-sm" />
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

  const baseInputClass = `w-full text-sm p-3 rounded-lg outline-none border transition-colors duration-200 ${getBorderColor()} ${
    fieldMode ? 'bg-slate-900 text-white placeholder-slate-600' : 'bg-white placeholder-slate-400'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  const InputComponent = type === 'textarea' ? 'textarea' : 'input';
  const inputType = type === 'url' ? 'url' : 'text';

  return (
    <div className="space-y-1.5">
      {/* Label with status indicator */}
      <label 
        htmlFor={id}
        className={`block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
          fieldMode ? 'text-slate-500' : 'text-slate-400'
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
            className="flex items-start gap-1.5 text-[10px] text-red-500"
            role="alert"
          >
            <Icon name="error" className="text-[10px] mt-0.5 shrink-0" />
            <span className="flex-1">{validation.message}</span>
            {validation.fix && (
              <Button variant="ghost" size="bare"
                onClick={validation.fix}
                className="shrink-0 ml-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold uppercase hover:bg-green-200 transition-colors"
                aria-label={`Fix: ${validation.fixDescription || 'Auto-fix this issue'}`}
                title={validation.fixDescription || 'Auto-fix this issue'}
              >
                Fix
              </Button>
            )}
          </div>
        )}

        {validation.status === 'validating' && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600">
            <span className="inline-block animate-spin">
              <Icon name="sync" className="text-[10px]" />
            </span>
            <span>Validating...</span>
          </div>
        )}

        {validation.status === 'valid' && showSuccess && (
          <div className="flex items-center gap-1.5 text-[10px] text-green-600">
            <Icon name="check_circle" className="text-[10px]" />
            <span>Valid</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidatedInput;
