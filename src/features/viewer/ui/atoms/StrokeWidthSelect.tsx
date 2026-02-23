/**
 * StrokeWidthSelect Atom
 *
 * Line width selector with 3 visual options for annotation strokes.
 *
 * @module features/viewer/ui/atoms/StrokeWidthSelect
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

const WIDTHS = [
  { value: 1, label: 'Thin' },
  { value: 2, label: 'Medium' },
  { value: 4, label: 'Thick' },
];

export interface StrokeWidthSelectProps {
  value: number;
  onChange: (width: number) => void;
  color?: string;
  fieldMode?: boolean;
  cx?: Partial<ContextualClassNames>;
}

export const StrokeWidthSelect: React.FC<StrokeWidthSelectProps> = ({
  value,
  onChange,
  color = '#22c55e',
  fieldMode = false,
  cx,
}) => {
  return (
    <div className="flex items-center gap-1">
      {WIDTHS.map(w => (
        <button
          key={w.value}
          onClick={() => onChange(w.value)}
          className={`w-7 h-5 flex items-center justify-center transition-nb ${
            w.value === value
              ? fieldMode ? 'bg-nb-yellow/20 ring-1 ring-nb-yellow/50' : `${cx?.surface ?? 'bg-nb-black/10'} ring-1 ${cx?.border ?? 'ring-nb-black/20'}`
              : fieldMode ? 'hover:bg-nb-yellow/10' : 'hover:bg-nb-black/5'
          }`}
          aria-label={w.label}
          title={`${w.label} (${w.value}px)`}
        >
          <span
            className="block rounded-full"
            style={{
              width: '16px',
              height: `${w.value}px`,
              backgroundColor: color,
            }}
          />
        </button>
      ))}
    </div>
  );
};

export default StrokeWidthSelect;
