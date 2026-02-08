/**
 * Drop Indicator Atom
 *
 * Visual indicator for valid/invalid drop zones in the tree.
 * Shows a colored line indicating where a drop will occur.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Pure presentational component
 * - No state or logic
 * - Props-only API
 *
 * @module features/structure-view/ui/atoms/DropIndicator
 */

import React from 'react';

export type DropPosition = 'before' | 'after' | 'inside';

export interface DropIndicatorProps {
  /** Position of the drop indicator */
  position: DropPosition;
  /** Whether the drop is valid */
  isValid: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Drop Indicator Atom
 *
 * @example
 * <DropIndicator position="before" isValid={true} />
 */
export const DropIndicator: React.FC<DropIndicatorProps> = ({
  position,
  isValid,
  className = '',
}) => {
  const baseClasses = 'absolute left-0 right-0 h-0.5 z-10 pointer-events-none';
  const colorClasses = isValid
    ? 'bg-nb-blue shadow-[0_0_4px_rgba(59,130,246,0.5)]'
    : 'bg-nb-red shadow-[0_0_4px_rgba(239,68,68,0.5)]';

  const positionClasses = {
    before: '-top-0.5',
    after: '-bottom-0.5',
    inside: 'top-1/2 -translate-y-1/2',
  };

  return (
    <div
      className={`${baseClasses} ${colorClasses} ${positionClasses[position]} ${className}`}
      role="presentation"
      aria-hidden="true"
    >
      {/* Arrow indicator for before/after */}
      {(position === 'before' || position === 'after') && (
        <div
          className={`absolute left-1 w-2 h-2 ${isValid ? 'bg-nb-blue' : 'bg-nb-red'} ${
            position === 'before' ? '-top-[3px]' : '-top-[3px]'
          }`}
        />
      )}
    </div>
  );
};

DropIndicator.displayName = 'DropIndicator';

export default DropIndicator;
