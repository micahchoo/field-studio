/**
 * ViewingDirectionSelector Atom
 *
 * Dropdown for selecting IIIF viewing direction.
 * Thin wrapper around shared SelectField molecule.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses shared SelectField
 *
 * @module features/metadata-edit/ui/atoms/ViewingDirectionSelector
 */

import React from 'react';
import { SelectField } from '@/src/shared/ui/molecules';
import { VIEWING_DIRECTIONS } from '@/src/shared/constants/iiif';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface ViewingDirectionSelectorProps {
  /** Currently selected viewing direction */
  value: string;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Default value if none selected */
  defaultValue?: string;
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

export const ViewingDirectionSelector: React.FC<ViewingDirectionSelectorProps> = ({
  value,
  onChange,
  defaultValue = 'left-to-right',
  disabled = false,
  fieldMode = false,
  label = 'Viewing Direction',
  showLabel = true,
}) => {
  const displayValue = value || defaultValue;

  return (
    <SelectField
      value={displayValue}
      onChange={onChange}
      options={VIEWING_DIRECTIONS}
      disabled={disabled}
      fieldMode={fieldMode}
      label={label}
      showLabel={showLabel}
      hint="viewingDirection"
    />
  );
};

export default ViewingDirectionSelector;
