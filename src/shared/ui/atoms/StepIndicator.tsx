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
import { Icon } from './Icon';

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
  variant?: 'numbered' | 'simple';
  /** Additional CSS class */
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  step,
  label,
  active,
  completed,
  variant = 'numbered',
  className = '',
}) => {
  const numberClasses = completed
    ? 'bg-green-500 text-white'
    : active
      ? 'bg-blue-600 text-white'
      : 'bg-slate-200 text-slate-500';

  const labelClasses = active
    ? 'text-slate-800 dark:text-slate-200'
    : completed
      ? 'text-green-600 dark:text-green-400'
      : 'text-slate-400 dark:text-slate-500';

  if (variant === 'simple') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className={`w-2 h-2 rounded-full ${
            completed ? 'bg-green-500' : active ? 'bg-blue-600' : 'bg-slate-200'
          }`}
        />
        <span className={`text-sm font-medium ${labelClasses}`}>{label}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${numberClasses}`}
      >
        {completed ? <Icon name="check" className="text-sm" /> : step}
      </div>
      <span className={`text-sm font-medium ${labelClasses}`}>{label}</span>
    </div>
  );
};

export default StepIndicator;
