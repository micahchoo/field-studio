/**
 * RightsBadge Atom
 *
 * Badge displaying a rights statement with appropriate styling.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/RightsBadge
 */

import React from 'react';
import { RIGHTS_OPTIONS } from '@/src/shared/constants/metadata';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface RightsBadgeProps {
  /** Rights statement value (URL) */
  value: string;
  /** Whether the badge is interactive (clickable) */
  interactive?: boolean;
  /** Callback when badge is clicked */
  onClick?: () => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
  /** Additional CSS class */
  className?: string;
}

export const RightsBadge: React.FC<RightsBadgeProps> = ({
  value,
  interactive = false,
  onClick,
  cx,
  fieldMode = false,
  className = '',
}) => {
  if (!value) {
    return (
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
          fieldMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500'
        } ${className}`}
      >
        No rights statement
      </span>
    );
  }

  const option = RIGHTS_OPTIONS.find((opt) => opt.value === value);
  const label = option?.label || value;

  // Determine styling based on rights type
  const getStyle = () => {
    if (value.includes('creativecommons.org')) {
      if (value.includes('zero')) {
        return fieldMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800';
      }
      return fieldMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800';
    }
    if (value.includes('rightsstatements.org')) {
      if (value.includes('InC')) {
        return fieldMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800';
      }
      return fieldMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800';
    }
    return fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700';
  };

  const baseClass = `text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStyle()} ${
    interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
  } ${className}`;

  return (
    <span className={baseClass} onClick={onClick} title={value}>
      {label}
    </span>
  );
};

export default RightsBadge;