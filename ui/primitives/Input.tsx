/**
 * Input - Atomic UI Primitive
 *
 * Pure presentational text input with label, help text, and error state.
 * Zero business logic — all state and validation lives in calling hooks.
 * Sized and styled entirely via design tokens.
 */

import React from 'react';
import { COLORS, INTERACTION, LAYOUT, PATTERNS, SPACING, TOUCH_TARGETS, TYPOGRAPHY } from '../../src/shared/config/design-tokens';

export type InputSize = 'sm' | 'base' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Size preset */
  size?: InputSize;
  /** Helper text displayed below the input */
  helpText?: string;
  /** Validation error message — also sets error styling */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Auto-focus on mount */
  autoFocusOnMount?: boolean;
}

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: {
    height: TOUCH_TARGETS.input.height.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  base: {
    height: TOUCH_TARGETS.input.height.base,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  lg: {
    height: TOUCH_TARGETS.input.height.lg,
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
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
    padding: TOUCH_TARGETS.input.padding,
    border: `1px solid ${error ? COLORS.border.error : COLORS.border.default}`,
    borderRadius: LAYOUT.borderRadius.md,
    color: disabled ? COLORS.text.disabled : COLORS.text.primary,
    backgroundColor: disabled ? COLORS.background.tertiary : COLORS.background.primary,
    transition: `border-color ${INTERACTION.duration.base} ${INTERACTION.easing.default}`,
    // Note: outline removed to allow global :focus-visible rule to work (WCAG 2.1 2.4.7)
    boxSizing: 'border-box',
    ...sizeStyles[size],
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    ...PATTERNS.form.label,
    display: 'block',
  };

  const hintStyle: React.CSSProperties = {
    display: 'block',
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: SPACING[1],
  };

  const errorStyle: React.CSSProperties = {
    display: 'block',
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.semantic.error,
    marginTop: SPACING[1],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {label && (
        <label htmlFor={id} style={labelStyle}>
          {label}
          {required && <span aria-hidden="true" style={{ color: COLORS.semantic.error }}> *</span>}
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
        <span id={`${id}-error`} role="alert" style={errorStyle}>{error}</span>
      ) : helpText ? (
        <span id={`${id}-help`} style={hintStyle}>{helpText}</span>
      ) : null}
    </div>
  );
};
