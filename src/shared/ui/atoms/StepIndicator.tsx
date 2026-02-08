/**
 * StepIndicator Atom
 *
 * Step indicator for multi-step wizard or navigation.
 * Displays step number, label, and completion status.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/atoms/StepIndicator
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';

export interface StepIndicatorProps {
  /** Step number (1, 2, 3, etc.) */
  step: number;
  /** Step label text */
  label: string;
  /** Whether this is the currently active step */
  active: boolean;
  /** Whether this step has been completed */
  completed: boolean;
  /** Visual variant */
  variant?:'numbered' |'simple';
  /** Additional CSS class */
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  step,
  label,
  active,
  completed,
  variant ='numbered',
  className ='',
}) => {
  const numberClasses = completed
    ?'bg-nb-green text-white'
    : active
      ?'bg-nb-blue text-white'
      :'bg-nb-cream text-nb-black/50';

  const labelClasses = active
    ?'text-nb-black/20'
    : completed
      ?'text-nb-green'
      :'text-nb-black/40';

  if (variant ==='simple') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`w-2 h-2 ${
            completed ?'bg-nb-green' : active ?'bg-nb-blue' :'bg-nb-cream'
          }`}
        />
        <span className={`text-sm font-medium ${labelClasses}`}>{label}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`w-8 h-8 flex items-center justify-center font-bold text-sm ${numberClasses}`}
      >
        {completed ? <Icon name="check" className="text-sm" /> : step}
      </div>
      <span className={`text-sm font-medium ${labelClasses}`}>{label}</span>
    </div>
  );
};

export default StepIndicator;
