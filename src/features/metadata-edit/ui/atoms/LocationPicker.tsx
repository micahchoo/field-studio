/**
 * LocationPicker Atom
 *
 * Button trigger for opening a GPS coordinate picker modal.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/LocationPicker
 */

import React from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface LocationPickerProps {
  /** Called when the picker is clicked */
  onClick: () => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Button title/tooltip */
  title?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onClick,
  disabled = false,
  cx,
  fieldMode = false,
  className = '',
  title = 'Pick Location on Map',
}) => {
  const buttonClass = `bg-nb-green/20 hover:bg-nb-green/30 text-nb-green p-1.5 border border-nb-green/30 transition-nb flex-shrink-0 ${
    fieldMode ? 'bg-nb-green/30 text-nb-green border-nb-green' : ''
  } ${className}`;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={buttonClass}
      title={title}
      aria-label={title}
      icon={<Icon name="location_on" className="text-sm" />}
    />
  );
};

export default LocationPicker;