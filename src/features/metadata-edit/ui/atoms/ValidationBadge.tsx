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
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

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
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

const statusConfig: Record<
  ValidationStatus,
  { icon: string; bgColor: string; textColor: string }
> = {
  success: {
    icon: 'check_circle',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
  warning: {
    icon: 'warning',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  error: {
    icon: 'error',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
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
    <div className={`p-4 rounded-lg ${config.bgColor} ${config.textColor}`}>
      <Icon name={displayIcon} className="text-2xl mb-2" />
      {value !== undefined && (
        <div className="text-2xl font-bold">{value}</div>
      )}
      {label && <div className="text-xs opacity-75">{label}</div>}
    </div>
  );
};

export default ValidationBadge;
