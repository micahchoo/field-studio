/**
 * FormatSelector Atom
 *
 * Dropdown selector for IIIF Image API format options.
 * Thin wrapper around shared DropdownSelect molecule.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (delegated to DropdownSelect)
 * - No domain logic
 * - Props-only API for data
 * - Uses shared DropdownSelect
 *
 * @module features/viewer/ui/atoms/FormatSelector
 */

import React from 'react';
import { DropdownSelect } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface FormatOption {
  /** Format value */
  value: string;
  /** Display label */
  label: string;
}

export interface FormatSelectorProps {
  /** Available format options */
  options: FormatOption[];
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  options,
  value,
  onChange,
  fieldMode = false,
}) => {
  return (
    <DropdownSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Select format..."
      themeColor="yellow"
      fieldMode={fieldMode}
      showDescriptions={false}
    />
  );
};

export default FormatSelector;
