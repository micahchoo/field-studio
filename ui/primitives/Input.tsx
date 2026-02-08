/**
 * Input - Atomic UI Primitive (Neobrutalist)
 *
 * Sharp corners, thick black border, monospace values, UPPERCASE labels.
 */

import React from 'react';

export type InputSize = 'sm' | 'base' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  size?: InputSize;
  helpText?: string;
  error?: string;
  required?: boolean;
  autoFocusOnMount?: boolean;
}

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: { height: '32px', fontSize: '0.875rem' },
  base: { height: '40px', fontSize: '1rem' },
  lg: { height: '48px', fontSize: '1.125rem' },
};

export const Input: React.FC<InputProps> = ({
  label,
  size = 'base',
  helpText,
  error,
  required,
  autoFocusOnMount = false,
  disabled,
  style,
  id,
  ...props
}) => {
  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '0 12px',
    border: `var(--theme-border-width-thick, 2px) solid ${error ? 'var(--theme-error-color, #FF3333)' : 'var(--theme-input-border, var(--theme-border-default, #000000))'}`,
    borderRadius: 0,
    color: disabled ? 'var(--theme-text-muted, #999)' : 'var(--theme-text-primary, #000000)',
    backgroundColor: disabled ? 'var(--theme-surface-secondary, #FFF8E7)' : 'var(--theme-input-bg, var(--theme-surface-primary, #FFFFFF))',
    fontFamily: 'var(--theme-font-family-mono, "JetBrains Mono", ui-monospace, monospace)',
    transition: 'all 0.1s linear',
    boxSizing: 'border-box' as const,
    ...sizeStyles[size],
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--theme-font-family-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: 'var(--theme-text-primary, #000000)',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {label && (
        <label htmlFor={id} style={labelStyle}>
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--theme-error-color, #FF3333)' }}> *</span>}
        </label>
      )}
      <input
        id={id}
        style={inputStyle}
        disabled={disabled}
        autoFocus={autoFocusOnMount}
        aria-invalid={!!error}
        aria-required={required}
        aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
        {...props}
      />
      {error ? (
        <span id={`${id}-error`} role="alert" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--theme-error-color, #FF3333)', marginTop: '4px', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{error}</span>
      ) : helpText ? (
        <span id={`${id}-help`} style={{ display: 'block', fontSize: '0.75rem', color: 'var(--theme-text-muted, #666)', marginTop: '4px', fontFamily: '"JetBrains Mono", monospace' }}>{helpText}</span>
      ) : null}
    </div>
  );
};
