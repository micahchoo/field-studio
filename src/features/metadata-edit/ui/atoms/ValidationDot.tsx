/**
 * ValidationDot Atom
 *
 * Small colored indicator (6px) showing field validation status.
 * Renders nothing when the field is valid/pristine.
 *
 * @module features/metadata-edit/ui/atoms/ValidationDot
 */

import React from 'react';

export interface ValidationDotProps {
  /** Validation status */
  status: 'pristine' | 'invalid';
  /** Validation message shown as tooltip */
  message?: string;
  /** Dot color: defaults to red for errors */
  color?: 'red' | 'orange' | 'yellow';
  /** Additional CSS class */
  className?: string;
  /** Field mode styling */
  fieldMode?: boolean;
}

const COLOR_MAP = {
  red: 'bg-nb-red',
  orange: 'bg-nb-orange',
  yellow: 'bg-nb-yellow',
} as const;

export const ValidationDot: React.FC<ValidationDotProps> = ({
  status,
  message,
  color = 'red',
  className = '',
}) => {
  if (status !== 'invalid') return null;

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${COLOR_MAP[color]} ${className}`}
      title={message}
      aria-label={message || 'Validation issue'}
    />
  );
};
