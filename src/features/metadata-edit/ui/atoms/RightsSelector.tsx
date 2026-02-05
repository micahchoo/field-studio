/**
 * RightsSelector Atom
 *
 * Dropdown for selecting a rights statement.
 * Thin wrapper around shared SelectField molecule.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses shared SelectField
 *
 * @module features/metadata-edit/ui/atoms/RightsSelector
 */

import React from 'react';
import { SelectField } from '@/src/shared/ui/molecules';
import { RIGHTS_OPTIONS } from '@/src/shared/constants/metadata';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface RightsSelectorProps {
  /** Currently selected rights statement (URL) */
  value: string;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Placeholder text for empty selection */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
  /** Label for the selector */
  label?: string;
  /** Whether to show label */
  showLabel?: boolean;
}

export const RightsSelector: React.FC<RightsSelectorProps> = ({
  value,
  onChange,
  placeholder = '(None Selected)',
  disabled = false,
  fieldMode = false,
  label = 'Rights Statement',
  showLabel = true,
}) => {
  return (
    <SelectField
      value={value}
      onChange={onChange}
      options={RIGHTS_OPTIONS}
      placeholder={placeholder}
      disabled={disabled}
      fieldMode={fieldMode}
      label={label}
      showLabel={showLabel}
      hint="dc:rights"
    />
  );
};

export default RightsSelector;
