/**
 * CoordinateInput Atom
 *
 * X/Y/W/H coordinate input group for region/size parameters.
 * Grid layout with labeled number inputs.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled inputs)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/CoordinateInput
 */

import React from 'react';
import { Input } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface CoordinateField {
  /** Field key */
  key: string;
  /** Display label */
  label: string;
  /** Current value */
  value: number;
}

export interface CoordinateInputProps {
  /** Coordinate fields to display */
  fields: CoordinateField[];
  /** Callback when any coordinate changes */
  onChange: (key: string, value: number) => void;
  /** Number of columns in grid (1 or 2) */
  columns?: 1 | 2;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const CoordinateInput: React.FC<CoordinateInputProps> = ({
  fields,
  onChange,
  columns = 2,
  cx: _cx,
  fieldMode = false,
}) => {
  const mutedTextClass = fieldMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = fieldMode ? '!bg-slate-900 !border-slate-700 !text-white' : '';

  const gridClass = columns === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-2`}>
      {fields.map(({ key, label, value }) => (
        <div key={key} className="space-y-1">
          <label className={`text-[9px] ${mutedTextClass} uppercase font-bold`}>{label}</label>
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(key, Number(e.target.value))}
            className={`w-full text-xs ${inputClass}`}
          />
        </div>
      ))}
    </div>
  );
};

export default CoordinateInput;
