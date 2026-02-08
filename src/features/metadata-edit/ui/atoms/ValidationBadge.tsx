/**
 * ValidationBadge Atom
 *
 * Badge displaying validation status (success, warning, error).
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/ValidationBadge
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
export type ValidationStatus = 'success' | 'warning' | 'error';

export interface ValidationBadgeProps {
  /** Validation status */
  status: ValidationStatus;
  /** Count or value to display */
  value?: number;
  /** Label text */
  label?: string;
  /** Icon name (defaults based on status) */
  icon?: string;
}

const statusConfig: Record<
  ValidationStatus,
  { icon: string; bgColor: string; textColor: string }
> = {
  success: {
    icon: 'check_circle',
    bgColor: 'bg-nb-green/10',
    textColor: 'text-nb-green',
  },
  warning: {
    icon: 'warning',
    bgColor: 'bg-nb-orange/10',
    textColor: 'text-nb-orange',
  },
  error: {
    icon: 'error',
    bgColor: 'bg-nb-red/10',
    textColor: 'text-nb-red',
  },
};

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({
  status,
  value,
  label,
  icon,
}) => {
  const config = statusConfig[status];
  const displayIcon = icon || config.icon;

  return (
    <div className={`p-4 ${config.bgColor} ${config.textColor}`}>
      <Icon name={displayIcon} className="text-2xl mb-2" />
      {value !== undefined && (
        <div className="text-2xl font-bold">{value}</div>
      )}
      {label && <div className="text-xs opacity-75">{label}</div>}
    </div>
  );
};

export default ValidationBadge;
