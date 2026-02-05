/**
 * TechnicalProperty Atom
 *
 * Read-only technical property row displaying label and value.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/TechnicalProperty
 */

import React from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface TechnicalPropertyProps {
  /** Property label */
  label: string;
  /** Property value */
  value: string;
  /** Whether to show a badge style */
  badge?: boolean;
  /** Whether the property is in field mode */
  fieldMode?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Additional CSS class */
  className?: string;
}

export const TechnicalProperty: React.FC<TechnicalPropertyProps> = ({
  label,
  value,
  badge = false,
  fieldMode = false,
  cx,
  className = '',
}) => {
  if (badge) {
    return (
      <div className={`flex justify-between items-center ${className}`}>
        <span className={`text-[10px] font-bold uppercase ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {label}
        </span>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${
            fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className={`text-[10px] font-bold uppercase ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </div>
      <div
        className={`text-xs font-mono break-all ${fieldMode ? 'text-slate-300' : 'text-slate-700'}`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
};

export default TechnicalProperty;