/**
 * RotationDial Atom
 *
 * Visual rotation control with preset buttons (0°, 90°, 180°, 270°)
 * and fine-tune slider for custom angles.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/RotationDial
 */

import React from 'react';
import { Button } from '@/ui/primitives/Button';
import { Slider } from './Slider';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface RotationDialProps {
  /** Current rotation value in degrees (0-359) */
  value: number;
  /** Callback when rotation changes */
  onChange: (value: number) => void;
  /** Available preset angles */
  presets?: number[];
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

const PRESETS = [0, 90, 180, 270];

export const RotationDial: React.FC<RotationDialProps> = ({
  value,
  onChange,
  presets = PRESETS,
  cx: _cx,
  fieldMode = false,
}) => {
  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="grid grid-cols-4 gap-1">
        {presets.map(angle => {
          const isActive = value === angle;
          const activeStyles = fieldMode
            ? { backgroundColor: 'rgba(249, 115, 22, 0.2)', borderColor: '#f97316', color: '#fb923c' }
            : { backgroundColor: '#fff7ed', borderColor: '#f97316', color: '#c2410c' };

          const inactiveStyles = fieldMode
            ? { backgroundColor: 'transparent', borderColor: '#334155', color: '#cbd5e1' }
            : { backgroundColor: 'transparent', borderColor: '#e2e8f0', color: '#475569' };

          return (
            <Button
              key={angle}
              onClick={() => onChange(angle)}
              variant="secondary"
              size="sm"
              style={{
                ...isActive ? activeStyles : inactiveStyles,
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '8px 4px',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '4px',
              }}
            >
              {angle}°
            </Button>
          );
        })}
      </div>

      {/* Fine-tune slider */}
      <div className="space-y-1">
        <Slider
          value={value}
          onChange={onChange}
          min={0}
          max={359}
          color="orange"
          fieldMode={fieldMode}
        />
        <div className={`text-center text-xs font-mono ${fieldMode ? 'text-orange-400' : 'text-nb-orange'}`}>
          {value}°
        </div>
      </div>
    </div>
  );
};

export default RotationDial;
