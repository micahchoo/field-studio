/**
 * MappingRow Atom
 *
 * Single CSV column to IIIF property mapping row.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/MappingRow
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules';
import { ColumnSelector } from './ColumnSelector';
import { type PropertyOption, PropertySelector } from './PropertySelector';
import { type LanguageOption, LanguageTag } from './LanguageTag';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface MappingRowProps {
  /** Available CSV columns */
  columns: string[];
  /** Currently selected CSV column */
  csvColumn: string;
  /** Available IIIF properties grouped by category */
  propertiesByCategory: Record<string, PropertyOption[]>;
  /** Currently selected IIIF property */
  iiifProperty: string;
  /** Available languages */
  languages: LanguageOption[];
  /** Currently selected language code */
  language: string;
  /** Called when CSV column changes */
  onCsvColumnChange: (column: string) => void;
  /** Called when IIIF property changes */
  onPropertyChange: (property: string) => void;
  /** Called when language changes */
  onLanguageChange: (code: string) => void;
  /** Called when row is removed */
  onRemove: () => void;
  /** Filename column to exclude from options */
  filenameColumn?: string;
  /** Whether the row is disabled */
  disabled?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const MappingRow: React.FC<MappingRowProps> = ({
  columns,
  csvColumn,
  propertiesByCategory,
  iiifProperty,
  languages,
  language,
  onCsvColumnChange,
  onPropertyChange,
  onLanguageChange,
  onRemove,
  filenameColumn,
  disabled = false,
}) => {
  // Filter out filename column from available columns
  const availableColumns = columns.filter(
    (col) => col === csvColumn || col !== filenameColumn
  );

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
      {/* CSV Column */}
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-slate-500 mb-1">
          CSV Column
        </label>
        <ColumnSelector
          columns={availableColumns}
          value={csvColumn}
          onChange={onCsvColumnChange}
          disabled={disabled}
        />
      </div>

      {/* Arrow */}
      <div className="flex-shrink-0 pt-5">
        <Icon name="arrow_forward" className="text-slate-400" />
      </div>

      {/* IIIF Property */}
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-slate-500 mb-1">
          IIIF Property
        </label>
        <PropertySelector
          propertiesByCategory={propertiesByCategory}
          value={iiifProperty}
          onChange={onPropertyChange}
          disabled={disabled}
        />
      </div>

      {/* Language */}
      <div className="w-32 flex-shrink-0">
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Language
        </label>
        <LanguageTag
          languages={languages}
          value={language}
          onChange={onLanguageChange}
          disabled={disabled}
        />
      </div>

      {/* Remove button */}
      <div className="flex-shrink-0 mt-5">
        <IconButton
          icon="delete"
          ariaLabel="Remove mapping"
          onClick={onRemove}
          disabled={disabled}
          variant="ghost"
          size="sm"
        />
      </div>
    </div>
  );
};

export default MappingRow;
