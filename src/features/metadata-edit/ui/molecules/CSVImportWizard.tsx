/**
 * CSVImportWizard Molecule
 *
 * Complete wizard for CSV import workflow.
 * Composes UploadStep, MappingStep, ResultStep molecules with step management.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Manages wizard step state (upload → map → result)
 * - No domain logic (delegates to parent callbacks)
 * - Props-only API
 * - Uses feature-specific molecules and atoms
 *
 * @module features/metadata-edit/ui/molecules/CSVImportWizard
 */

import React, { useMemo } from 'react';
import { Button, Icon, StepConnector as WizardStepConnector, StepIndicator as WizardStepIndicator } from '@/src/shared/ui/atoms';
import { UploadStep } from './UploadStep';
import { MappingStep } from './MappingStep';
import { ResultStep } from './ResultStep';
import type { CSVColumnMapping } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export type ImportStep = 'upload' | 'map' | 'result';

export interface CSVImportWizardProps {
  /** Current step of the wizard */
  step: ImportStep;
  /** CSV column headers */
  headers: string[];
  /** CSV data rows */
  rows: Record<string, string>[];
  /** Currently selected filename column */
  filenameColumn: string;
  /** Current column mappings */
  mappings: CSVColumnMapping[];
  /** Available IIIF properties for mapping */
  supportedProperties: Array<{
    value: string;
    label: string;
    description?: string;
    category: string;
  }>;
  /** Available languages for metadata */
  supportedLanguages: Array<{ code: string; label: string }>;
  /** Default language code */
  defaultLanguage: string;
  /** Import result (for result step) */
  importResult?: {
    totalRows: number;
    successCount: number;
    warningCount?: number;
    errorCount?: number;
    errors?: Array<{ row: number; message: string }>;
    matched: number;
    unmatched: number;
  };
  /** Whether any operation is in progress */
  isLoading?: boolean;
  /** Whether auto-detection is in progress */
  isAutoDetecting?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Called when step changes (optional, can be managed by parent) */
  onStepChange?: (step: ImportStep) => void;
  /** Called when a file is uploaded */
  onFileUpload: (file: File) => void;
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
  /** Called to execute import */
  onImport?: () => void;
  /** Called to close/reset the wizard */
  onClose?: () => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const CSVImportWizard: React.FC<CSVImportWizardProps> = ({
  step,
  headers,
  rows,
  filenameColumn,
  mappings,
  supportedProperties,
  supportedLanguages,
  defaultLanguage,
  importResult,
  isLoading = false,
  isAutoDetecting = false,
  error,
  onStepChange,
  onFileUpload,
  onFilenameColumnChange,
  onUpdateMapping,
  onAddMapping,
  onRemoveMapping,
  onAutoDetect,
  onImport,
  onClose,
  fieldMode = false,
}) => {
  // Group properties by category
  const propertiesByCategory = useMemo(() => {
    const grouped: Record<string, typeof supportedProperties> = {};
    for (const prop of supportedProperties) {
      if (!grouped[prop.category]) {
        grouped[prop.category] = [];
      }
      grouped[prop.category].push(prop);
    }
    return grouped;
  }, [supportedProperties]);

  return (
    <div className={`flex flex-col h-full ${fieldMode ? 'bg-nb-black' : 'bg-nb-white'}`}>
      {/* Progress indicator */}
      <div className={`flex items-center px-6 py-3 border-b ${fieldMode ? 'bg-nb-black border-nb-black/80' : 'bg-nb-white border-nb-black/20'}`}>
        <WizardStepIndicator step={1} label="Upload" active={step === 'upload'} completed={step !== 'upload'} />
        <WizardStepConnector completed={step !== 'upload'} />
        <WizardStepIndicator step={2} label="Map" active={step === 'map'} completed={step === 'result'} />
        <WizardStepConnector completed={step === 'result'} />
        <WizardStepIndicator step={3} label="Result" active={step === 'result'} completed={false} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className={`mb-4 p-4 flex items-center gap-3 ${fieldMode ? 'bg-nb-red/30 border border-nb-red' : 'bg-nb-red/10 border border-nb-red/30'}`}>
            <Icon name="error" className={fieldMode ? 'text-nb-red' : 'text-nb-red'} />
            <span className={`text-sm ${fieldMode ? 'text-nb-red/60' : 'text-nb-red'}`}>{error}</span>
          </div>
        )}

        {step === 'upload' && (
          <UploadStep
            isLoading={isLoading}
            onFileUpload={onFileUpload}
            fieldMode={fieldMode}
          />
        )}

        {step === 'map' && (
          <MappingStep
            headers={headers}
            rows={rows}
            filenameColumn={filenameColumn}
            mappings={mappings}
            propertiesByCategory={propertiesByCategory}
            supportedLanguages={supportedLanguages}
            onFilenameColumnChange={onFilenameColumnChange}
            onUpdateMapping={onUpdateMapping}
            onAddMapping={onAddMapping}
            onRemoveMapping={onRemoveMapping}
            onAutoDetect={onAutoDetect}
            isAutoDetecting={isAutoDetecting}
            fieldMode={fieldMode}
          />
        )}

        {step === 'result' && importResult && (
          <ResultStep result={importResult} fieldMode={fieldMode} />
        )}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between p-4 border-t ${fieldMode ? 'bg-nb-black border-nb-black/80' : 'bg-nb-white border-nb-black/20'}`}>
        <div className={`text-sm ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>
          {step === 'map' && (
            <span>
              {rows.length} rows • {mappings.filter((m) => m.iiifProperty).length} mappings configured
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
          >
            {step === 'result' ? 'Close' : 'Cancel'}
          </Button>
          {step === 'map' && (
            <Button
              onClick={onImport}
              disabled={isLoading || !filenameColumn}
              variant="primary"
              size="sm"
              loading={isLoading}
            >
              Import Metadata
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImportWizard;
