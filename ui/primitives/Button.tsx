/**
 * Button - Atomic UI Primitive
 * 
 * Pure presentational button with zero business logic.
 * Accepts only primitive props (value, onChange, disabled) and design tokens.
 * Follows Atomic Design principles for maximum reusability.
 */

import React from 'react';
import { COLORS, INTERACTION, LAYOUT, SPACING, TOUCH_TARGETS } from '../../src/shared/config/design-tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'bare' | 'sm' | 'base' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Icon to display before text */
  icon?: React.ReactNode;
  /** Icon to display after text */
  iconAfter?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Minimal style (no background, border only) */
  minimal?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: COLORS.primary[500],
    color: COLORS.text.inverse,
    border: `1px solid ${COLORS.primary[600]}`,
  },
  secondary: {
    backgroundColor: COLORS.background.secondary,
    color: COLORS.text.primary,
    border: `1px solid ${COLORS.border.default}`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'inherit', // Allow color to be set via className or parent
    border: '1px solid transparent',
  },
  danger: {
    backgroundColor: COLORS.semantic.error,
    color: COLORS.text.inverse,
    border: `1px solid ${COLORS.semantic.error}`,
  },
  success: {
    backgroundColor: COLORS.semantic.success,
    color: COLORS.text.inverse,
    border: `1px solid ${COLORS.semantic.success}`,
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  bare: {
    // No sizing - allows Tailwind classes to control appearance
  },
  sm: {
    height: TOUCH_TARGETS.button.sm.height,
    padding: TOUCH_TARGETS.button.sm.padding,
    fontSize: '0.875rem',
    borderRadius: LAYOUT.borderRadius.sm,
  },
  base: {
    height: TOUCH_TARGETS.button.base.height,
    padding: TOUCH_TARGETS.button.base.padding,
    fontSize: '1rem',
    borderRadius: LAYOUT.borderRadius.base,
  },
  lg: {
    height: TOUCH_TARGETS.button.lg.height,
    padding: TOUCH_TARGETS.button.lg.padding,
    fontSize: '1.125rem',
    borderRadius: LAYOUT.borderRadius.md,
  },
  xl: {
    height: TOUCH_TARGETS.button.xl.height,
    padding: TOUCH_TARGETS.button.xl.padding,
    fontSize: '1.25rem',
    borderRadius: LAYOUT.borderRadius.lg,
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'base',
  loading = false,
  icon,
  iconAfter,
  fullWidth = false,
  minimal = false,
  disabled,
  children,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: INTERACTION.duration.base,
    // Note: outline removed to allow global :focus-visible rule to work (WCAG 2.1 2.4.7)
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.6 : 1,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(minimal && {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    }),
    ...style,
  };

  return (
    <button
      style={baseStyle}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span style={{ marginRight: SPACING[2] }} aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        </span>
      )}
      {icon && !loading && <span style={{ display: 'flex' }}>{icon}</span>}
      {children && <span>{children}</span>}
      {iconAfter && <span style={{ display: 'flex' }}>{iconAfter}</span>}
    </button>
  );
};