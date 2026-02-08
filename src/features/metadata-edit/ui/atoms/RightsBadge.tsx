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
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

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
        className={`text-[10px] px-2 py-0.5 font-semibold ${
          fieldMode ? 'bg-nb-black text-nb-black/50' : 'bg-nb-cream text-nb-black/50'
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
        return fieldMode ? 'bg-nb-green/30 text-nb-green' : 'bg-nb-green/20 text-nb-green';
      }
      return fieldMode ? 'bg-nb-blue/30 text-nb-blue' : 'bg-nb-blue/20 text-nb-blue';
    }
    if (value.includes('rightsstatements.org')) {
      if (value.includes('InC')) {
        return fieldMode ? 'bg-nb-red/30 text-nb-red' : 'bg-nb-red/20 text-nb-red';
      }
      return fieldMode ? 'bg-nb-orange/10 text-nb-orange' : 'bg-nb-orange/20 text-nb-orange';
    }
    return fieldMode ? 'bg-nb-black text-nb-black/40' : 'bg-nb-cream text-nb-black/80';
  };

  const baseClass = `text-[10px] px-2 py-0.5 font-semibold ${getStyle()} ${
    interactive ? 'cursor-pointer hover:opacity-80 transition-nb' : ''
  } ${className}`;

  return (
    <span className={baseClass} onClick={onClick} title={value}>
      {label}
    </span>
  );
};

export default RightsBadge;