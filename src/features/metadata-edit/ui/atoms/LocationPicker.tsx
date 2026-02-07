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
  const buttonClass = `bg-green-100 hover:bg-green-200 text-green-700 p-1.5 rounded border border-green-200 transition-colors flex-shrink-0 ${
    fieldMode ? 'bg-green-900/30 text-green-400 border-green-800' : ''
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