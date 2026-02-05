/**
 * PropertyInput Atom
 *
 * Input field for metadata property values with optional label and location picker.
 * Thin wrapper around shared FormInput molecule.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses shared FormInput
 *
 * @module features/metadata-edit/ui/atoms/PropertyInput
 */

import React from 'react';
import { FormInput } from '@/src/shared/ui/molecules';
import { LocationPicker } from '../atoms/LocationPicker';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface PropertyInputProps {
  /** Current input value */
  value: string;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Input label (optional) */
  label?: string;
  /** Input placeholder */
  placeholder?: string;
  /** Input type (default 'text') */
  type?: 'text' | 'textarea' | 'datetime-local';
  /** Whether this field is a location field (shows location picker button) */
  isLocationField?: boolean;
  /** Called when location picker button is clicked */
  onLocationPick?: () => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const PropertyInput: React.FC<PropertyInputProps> = ({
  value,
  onChange,
  label,
  placeholder = '',
  type = 'text',
  isLocationField = false,
  onLocationPick,
  disabled = false,
  cx,
  fieldMode = false,
}) => {
  // Create location picker action button if needed
  const actionButton = isLocationField && onLocationPick ? (
    <LocationPicker
      onClick={onLocationPick}
      disabled={disabled}
      cx={cx}
      fieldMode={fieldMode}
      title="Pick Location on Map"
    />
  ) : undefined;

  return (
    <FormInput
      value={value}
      onChange={onChange}
      type={type}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      fieldMode={fieldMode}
      actionButton={actionButton}
    />
  );
};

export default PropertyInput;
