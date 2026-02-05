/**
 * PropertySelector Atom
 *
 * Dropdown for selecting IIIF properties grouped by category.
 * Thin wrapper around shared SelectField molecule.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses shared SelectField
 *
 * @module features/metadata-edit/ui/atoms/PropertySelector
 */

import React, { useMemo } from 'react';
import { SelectField, type SelectOptionGroup } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface PropertyOption {
  value: string;
  label: string;
  description?: string;
  category: string;
}

export interface PropertySelectorProps {
  /** Available properties grouped by category */
  propertiesByCategory: Record<string, PropertyOption[]>;
  /** Currently selected property value */
  value: string;
  /** Called when selection changes */
  onChange: (property: string) => void;
  /** Placeholder text for empty selection */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const PropertySelector: React.FC<PropertySelectorProps> = ({
  propertiesByCategory,
  value,
  onChange,
  placeholder = '(Skip this column)',
  disabled = false,
  fieldMode = false,
}) => {
  // Convert propertiesByCategory to SelectOptionGroup format
  const groups: SelectOptionGroup[] = useMemo(() => {
    return Object.entries(propertiesByCategory).map(([category, props]) => ({
      label: category,
      options: props.map(p => ({
        value: p.value,
        label: p.label,
        description: p.description,
      })),
    }));
  }, [propertiesByCategory]);

  return (
    <SelectField
      value={value}
      onChange={onChange}
      groups={groups}
      placeholder={placeholder}
      disabled={disabled}
      fieldMode={fieldMode}
    />
  );
};

export default PropertySelector;
