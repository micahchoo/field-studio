/**
 * PropertyLabel Atom
 *
 * Field label with optional Dublin Core hint badge.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/PropertyLabel
 */

import React from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface PropertyLabelProps {
  /** Label text */
  label: string;
  /** Optional Dublin Core mapping (e.g., 'dc:title') */
  dcHint?: string;
  /** Whether the label is in field mode */
  fieldMode?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Additional CSS class */
  className?: string;
  /** Whether to show the DC hint badge */
  showHint?: boolean;
}

export const PropertyLabel: React.FC<PropertyLabelProps> = ({
  label,
  dcHint,
  fieldMode = false,
  cx,
  className = '',
  showHint = true,
}) => {
  const baseClass = `block text-xs font-bold ${fieldMode ? 'text-slate-300' : 'text-slate-700'} ${className}`;

  return (
    <div className="flex justify-between items-center">
      <span className={baseClass}>{label}</span>
      {showHint && dcHint && (
        <span
          className={`text-[9px] font-mono px-1 rounded ${
            fieldMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400'
          }`}
          title="Dublin Core Mapping"
        >
          {dcHint}
        </span>
      )}
    </div>
  );
};

export default PropertyLabel;