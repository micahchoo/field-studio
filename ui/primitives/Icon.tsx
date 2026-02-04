/**
 * Icon - Atomic UI Primitive
 *
 * Renders icons as emoji strings or inline SVG ReactNodes.
 * Zero business logic — pure presentational wrapper that enforces
 * consistent sizing and accessibility via design tokens.
 */

import React from 'react';
import { TYPOGRAPHY } from '../../designSystem';

export type IconSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The icon content: an emoji string or an SVG ReactNode */
  name: string | React.ReactNode;
  /** Size preset */
  size?: IconSize;
  /** Accessible label. If omitted the icon is aria-hidden. */
  label?: string;
}

const sizeMap: Record<IconSize, string> = {
  xs: TYPOGRAPHY.fontSize.xs,   // 12px
  sm: TYPOGRAPHY.fontSize.sm,   // 14px
  base: TYPOGRAPHY.fontSize.base, // 16px
  lg: TYPOGRAPHY.fontSize.lg,   // 18px
  xl: TYPOGRAPHY.fontSize.xl,   // 20px
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'base',
  label,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: sizeMap[size],
    lineHeight: 1,
    width: sizeMap[size],
    height: sizeMap[size],
    flexShrink: 0,
    ...style,
  };

  return (
    <span
      style={baseStyle}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      {...props}
    >
      {name}
    </span>
  );
};
