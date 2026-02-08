/**
 * Button - Atomic UI Primitive (Neobrutalist)
 *
 * Sharp corners, thick borders, offset shadow, UPPERCASE text,
 * press-translate effect on active. size="bare" preserves 650+ usages.
 */

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'bare' | 'sm' | 'base' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  fullWidth?: boolean;
  minimal?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--theme-accent-primary, #0055FF)',
    color: 'var(--theme-text-inverse, #FFFFFF)',
    border: '2px solid var(--theme-border-default, #000000)',
    boxShadow: 'var(--theme-shadow-base, 4px 4px 0 0 #000)',
  },
  secondary: {
    backgroundColor: 'var(--theme-surface-secondary, #FFF8E7)',
    color: 'var(--theme-text-primary, #000000)',
    border: '2px solid var(--theme-border-default, #000000)',
    boxShadow: 'var(--theme-shadow-sm, 2px 2px 0 0 #000)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'inherit',
    border: '2px solid transparent',
  },
  danger: {
    backgroundColor: 'var(--theme-error-color, #FF3333)',
    color: 'var(--theme-text-inverse, #FFFFFF)',
    border: '2px solid var(--theme-border-default, #000000)',
    boxShadow: 'var(--theme-shadow-base, 4px 4px 0 0 #000)',
  },
  success: {
    backgroundColor: 'var(--theme-success-color, #00CC66)',
    color: 'var(--theme-text-primary, #000000)',
    border: '2px solid var(--theme-border-default, #000000)',
    boxShadow: 'var(--theme-shadow-base, 4px 4px 0 0 #000)',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  bare: {
    // No sizing - allows Tailwind classes to control appearance
  },
  sm: {
    height: '32px',
    padding: '0 12px',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  base: {
    height: '40px',
    padding: '0 16px',
    fontSize: '0.875rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  lg: {
    height: '48px',
    padding: '0 24px',
    fontSize: '1rem',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  xl: {
    height: '56px',
    padding: '0 32px',
    fontSize: '1.125rem',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
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
    gap: '0.5rem',
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.1s linear',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.5 : 1,
    borderRadius: 0,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(minimal && {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
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
        <span style={{ marginRight: '0.5rem' }} aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="square"
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
