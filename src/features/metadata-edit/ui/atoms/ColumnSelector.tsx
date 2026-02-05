/**
 * ColumnSelector Atom
 *
 * Dropdown for selecting CSV column headers.
 * Thin wrapper around shared SelectField molecule.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses shared SelectField
 *
 * @module features/metadata-edit/ui/atoms/ColumnSelector
 */

import React from 'react';
import { SelectField } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface ColumnSelectorProps {
  /** Available column headers */
  columns: string[];
  /** Currently selected column */
  value: string;
  /** Called when selection changes */
  onChange: (column: string) => void;
  /** Placeholder text for empty selection */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  value,
  onChange,
  placeholder = 'Select a column...',
  disabled = false,
  fieldMode = false,
}) => {
  const options = columns.map(col => ({ value: col, label: col }));

  return (
    <SelectField
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      fieldMode={fieldMode}
    />
  );
};

export default ColumnSelector;
