/**
 * StepConnector Atom
 *
 * Visual connector line between steps in a wizard or stepper.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/atoms/StepConnector
 */

import React from 'react';

export interface StepConnectorProps {
  /** Whether the connector should show as completed/active */
  completed: boolean;
  /** Width of the connector line */
  width?: string;
  /** Additional CSS class */
  className?: string;
}

export const StepConnector: React.FC<StepConnectorProps> = ({
  completed,
  width = 'w-16',
  className = '',
}) => {
  return (
    <div
      className={`h-0.5 mx-2 ${width} ${
        completed ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
      } ${className}`}
    />
  );
};

export default StepConnector;
