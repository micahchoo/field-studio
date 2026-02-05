/**
 * Slider Atom
 *
 * Range slider control for numeric values.
 * Wraps native range input with consistent styling.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/Slider
 */

import React from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface SliderProps {
  /** Current value */
  value: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Color accent for the slider */
  color?: 'orange' | 'blue' | 'green' | 'purple';
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

const colorMap = {
  orange: '#f97316',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
};

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  color = 'orange',
  cx: _cx,
  fieldMode = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const percentage = ((value - min) / (max - min)) * 100;
  const accentColor = colorMap[color];
  const trackBg = fieldMode ? '#334155' : '#e2e8f0';

  const sliderBg = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percentage}%, ${trackBg} ${percentage}%, ${trackBg} 100%)`;

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={handleChange}
      className="w-full"
      style={{
        appearance: 'none',
        height: '6px',
        borderRadius: '3px',
        background: sliderBg,
        outline: 'none',
        cursor: 'pointer',
      }}
    />
  );
};

export default Slider;
