/**
 * QualitySelector Atom
 *
 * Dropdown selector for IIIF Image API quality options.
 * Thin wrapper around shared DropdownSelect molecule.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (delegated to DropdownSelect)
 * - No domain logic
 * - Props-only API for data
 * - Uses shared DropdownSelect
 *
 * @module features/viewer/ui/atoms/QualitySelector
 */

import React from 'react';
import { DropdownSelect } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface QualityOption {
  /** Quality value */
  value: string;
  /** Display label */
  label: string;
  /** Description text */
  description?: string;
}

export interface QualitySelectorProps {
  /** Available quality options */
  options: QualityOption[];
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
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
      placeholder="Select quality..."
      themeColor="purple"
      fieldMode={fieldMode}
      showDescriptions={true}
    />
  );
};

export default QualitySelector;
