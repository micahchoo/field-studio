/**
 * AnnotationColorPicker Atom
 *
 * Compact color picker with 8 presets for annotation styling.
 * Reuses LAYER_COLORS palette for visual consistency.
 *
 * @module features/viewer/ui/atoms/AnnotationColorPicker
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

const PRESET_COLORS = [
  '#22c55e', // green (default)
  '#3b82f6', // blue
  '#ef4444', // red
  '#f59e0b', // amber
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

export interface AnnotationColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  fieldMode?: boolean;
  cx?: Partial<ContextualClassNames>;
}

export const AnnotationColorPicker: React.FC<AnnotationColorPickerProps> = ({
  value,
  onChange,
  fieldMode = false,
  cx,
}) => {
  return (
    <div className="flex items-center gap-1">
      {PRESET_COLORS.map(color => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={`w-5 h-5 shrink-0 transition-nb ${
            color === value
              ? 'ring-2 ring-offset-1 scale-110'
              : 'hover:scale-110'
          } ${fieldMode ? 'ring-nb-yellow ring-offset-black' : `${cx?.border ?? 'ring-nb-black'} ${cx?.surface ? 'ring-offset-current' : 'ring-offset-white'}`}`}
          style={{ backgroundColor: color }}
          aria-label={`Color ${color}`}
          title={color}
        />
      ))}
    </div>
  );
};

export default AnnotationColorPicker;
