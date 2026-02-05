/**
 * MappingStep Molecule
 *
 * Step 2: CSV column to IIIF property mapping configuration.
 * Composes ColumnSelector, PropertySelector, MappingRow, FilePreview atoms.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Minimal local UI state
 * - No domain logic (delegates mapping updates to parent)
 * - Props-only API
 * - Uses feature-specific atoms (no native HTML elements)
 *
 * @module features/metadata-edit/ui/molecules/MappingStep
 */

import React from 'react';
import { Icon, Button } from '@/src/shared/ui/atoms';
import { ColumnSelector, type PropertyOption } from '../atoms';
import { MappingRow } from '../atoms';
import { FilePreview } from '../atoms';
import { AutoMapButton } from '../atoms';
import type { CSVColumnMapping } from '@/services/csvImporter';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface MappingStepProps {
  /** CSV column headers */
  headers: string[];
  /** CSV data rows */
  rows: Record<string, string>[];
  /** Currently selected filename column */
  filenameColumn: string;
  /** Current column mappings */
  mappings: CSVColumnMapping[];
  /** Available IIIF properties grouped by category */
  propertiesByCategory: Record<string, PropertyOption[]>;
  /** Available languages for metadata */
  supportedLanguages: Array<{ code: string; label: string }>;
  /** Called when filename column changes */
  onFilenameColumnChange: (column: string) => void;
  /** Called when a mapping is updated */
  onUpdateMapping: (index: number, updates: Partial<CSVColumnMapping>) => void;
  /** Called to add a new mapping */
  onAddMapping: () => void;
  /** Called to remove a mapping */
  onRemoveMapping: (index: number) => void;
  /** Called to trigger auto-detection */
  onAutoDetect?: () => void;
  /** Whether auto-detection is in progress */
  isAutoDetecting?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const MappingStep: React.FC<MappingStepProps> = ({
  headers,
  rows,
  filenameColumn,
  mappings,
  propertiesByCategory,
  supportedLanguages,
  onFilenameColumnChange,
  onUpdateMapping,
  onAddMapping,
  onRemoveMapping,
  onAutoDetect,
  isAutoDetecting = false,
}) => {
  const hasData = rows.length > 0;

  return (
    <div className="space-y-6">
      {/* Filename column selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Filename Column <span className="text-red-500">*</span>
          </label>
          {onAutoDetect && (
            <AutoMapButton
              onClick={onAutoDetect}
              isLoading={isAutoDetecting}
              disabled={headers.length === 0}
            />
          )}
        </div>
        <p className="text-xs text-slate-500 mb-2">
          Select the column that contains filenames for matching with IIIF resources
        </p>
        <ColumnSelector
          columns={headers}
          value={filenameColumn}
          onChange={onFilenameColumnChange}
          placeholder="Select a column..."
        />
      </div>

      {/* Data preview */}
      {hasData && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-slate-700">Data Preview</h4>
            <span className="text-xs text-slate-500">
              {rows.length} rows • {headers.length} columns
            </span>
          </div>
          <FilePreview
            headers={headers}
            rows={rows}
            maxColumns={5}
            maxRows={3}
          />
        </div>
      )}

      {/* Column mappings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-700">Column Mappings</h4>
          <div className="flex items-center gap-3">
            <Button
              onClick={onAddMapping}
              variant="ghost"
              size="sm"
              icon={<Icon name="add" className="text-sm" />}
            >
              Add Mapping
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {mappings.map((mapping, index) => (
            <MappingRow
              key={index}
              columns={headers}
              csvColumn={mapping.csvColumn}
              propertiesByCategory={propertiesByCategory}
              iiifProperty={mapping.iiifProperty}
              languages={supportedLanguages}
              language={mapping.language || ''}
              onCsvColumnChange={(column) => onUpdateMapping(index, { csvColumn: column })}
              onPropertyChange={(property) => onUpdateMapping(index, { iiifProperty: property })}
              onLanguageChange={(code) => onUpdateMapping(index, { language: code })}
              onRemove={() => onRemoveMapping(index)}
              filenameColumn={filenameColumn}
            />
          ))}

          {mappings.length === 0 && (
            <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
              <Icon name="table_rows" className="text-3xl mb-2 opacity-50" />
              <p className="text-sm">No mappings configured</p>
              <Button
                onClick={onAddMapping}
                variant="ghost"
                size="sm"
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Add your first mapping
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MappingStep;
