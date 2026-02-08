/**
 * StatusBadge Molecule
 *
 * Composes: Icon atom + text span
 *
 * Displays status indicators with consistent styling.
 * Used for item counts, validation states, and process status.
 *
 * IDEAL OUTCOME: Clear, scannable status indicators
 * FAILURE PREVENTED: Inconsistent status styling across views
 */

import React from 'react';
import { Icon } from '../atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export type StatusVariant ='default' |'success' |'warning' |'error' |'info' |'accent';

export interface StatusBadgeProps {
  /** Status text */
  label: string;
  /** Optional icon name */
  icon?: string;
  /** Visual variant */
  variant?: StatusVariant;
  /** Size variant */
  size?:'sm' |'md';
  /** Pulse animation for active states */
  pulse?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
}

/**
 * StatusBadge Molecule
 *
 * @example
 * <StatusBadge
 *   label="12 selected"
 *   icon="check_circle"
 *   variant="accent"
 * />
 *
 * @example
 * <StatusBadge
 *   label="Processing..."
 *   icon="sync"
 *   variant="info"
 *   pulse
 * />
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  icon,
  variant ='default',
  size ='md',
  pulse = false,
  className ='',
  cx = {},
  fieldMode = false,
}) => {
  // Context is provided via props (no hook calls)

  const sizeClasses = {
    sm:'px-2 py-0.5 text-xs gap-1',
    md:'px-3 py-1 text-sm gap-1.5',
  };

  const variantClasses: Record<StatusVariant, string> = {
    default:`${cx.subtleBg} ${cx.subtleText}`,
    success: fieldMode
      ?'bg-nb-green/20 text-nb-green border border-nb-green/30'
      :'bg-nb-green/10 text-nb-green border border-nb-green/30',
    warning: fieldMode
      ?'bg-nb-orange/20 text-nb-orange border border-nb-orange/30'
      :'bg-nb-orange/10 text-nb-orange border border-nb-orange/20',
    error: fieldMode
      ?'bg-nb-red/20 text-nb-red border border-nb-red/30'
      :'bg-nb-red/10 text-nb-red border border-nb-red/30',
    info: fieldMode
      ?'bg-nb-blue/20 text-nb-blue border border-nb-blue/30'
      :'bg-nb-blue/10 text-nb-blue border border-nb-blue/30',
    accent: cx.accentBadge,
  };

  return (
    <span
      className={`
        inline-flex items-center  font-medium
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${pulse ?'animate-pulse' :''}
        ${className}
`}
    >
      {icon && (
        <Icon
          name={icon}
          className={`${size ==='sm' ?'text-xs' :'text-sm'} ${pulse ?'animate-spin' :''}`}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
