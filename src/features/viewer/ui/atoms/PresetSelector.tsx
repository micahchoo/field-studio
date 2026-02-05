/**
 * PresetSelector Atom
 *
 * Dropdown selector for IIIF Image API presets.
 * Thin wrapper around shared DropdownSelect molecule.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (delegated to DropdownSelect)
 * - No domain logic
 * - Props-only API for data
 * - Uses shared DropdownSelect
 *
 * @module features/viewer/ui/atoms/PresetSelector
 */

import React from 'react';
import { DropdownSelect } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface PresetOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
}

export interface PresetSelectorProps {
  /** Available options */
  options: PresetOption[];
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  fieldMode = false,
}) => {
  return (
    <DropdownSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      themeColor="blue"
      fieldMode={fieldMode}
      showDescriptions={true}
    />
  );
};

export default PresetSelector;
