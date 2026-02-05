/**
 * CSVImportModal Molecule
 *
 * Modal dialog for importing metadata from CSV files.
 * Part of the metadata-edit feature decomposition.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives all data via props (zero context hooks)
 * - Uses shared molecules for UI elements
 * - No direct access to domain state
 *
 * IDEAL OUTCOME: Users can upload and map CSV data to IIIF metadata
 * FAILURE PREVENTED: Data loss, mapping errors, import failures
 *
 * @module features/metadata-edit/ui/molecules/CSVImportModal
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import type { CSVColumnMapping } from '@/services/csvImporter';

// Local type for import result to match expected structure
export interface CSVImportResult {
  totalRows: number;
  successCount: number;
  warningCount?: number;
  errorCount?: number;
  errors?: Array<{ row: number; message: string }>;
  matched: number;
  unmatched: number;
}

export type ImportStep = 'upload' | 'map' | 'result';

export interface CSVImportModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Available IIIF properties for mapping */
  supportedProperties: Array<{
    value: string;
    label: string;
    description?: string;
    category: string;
  }>;
  /** Available languages for metadata */
  supportedLanguages: Array<{
    code: string;
    label: string;
  }>;
  /** Default language code */
  defaultLanguage: string;
  /** Called when modal is closed */
  onClose: () => void;
  /** Called when CSV is parsed */
  onParseCSV: (text: string) => { headers: string[]; rows: Record<string, string>[] };
  /** Called when filename column is auto-detected */
  onDetectFilenameColumn: (headers: string[]) => string | null;
  /** Called when mappings are auto-detected */
  onAutoDetectMappings: (headers: string[], filenameColumn: string | null) => CSVColumnMapping[];
  /** Called when import is applied */
  onApplyImport: (mappings: CSVColumnMapping[], filenameColumn: string, rows: Record<string, string>[]) => Promise<CSVImportResult>;
  /** Called when import is cancelled */
  onCancel?: () => void;
  cx?: ContextualClassNames;
  fieldMode?: boolean;
}

/**
 * CSVImportModal Molecule
 *
 * Provides a step-by-step interface for CSV import:
 * 1. Upload - Select and parse CSV file
 * 2. Map - Configure column mappings
 * 3. Result - View import summary
 */
export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  supportedProperties,
  supportedLanguages,
  defaultLanguage,
  onClose,
  onParseCSV,
  onDetectFilenameColumn,
  onAutoDetectMappings,
  onApplyImport,
  onCancel,
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [_csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [filenameColumn, setFilenameColumn] = useState('');
  const [mappings, setMappings] = useState<CSVColumnMapping[]>([]);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setCsvText('');
      setHeaders([]);
      setRows([]);
      setFilenameColumn('');
      setMappings([]);
      setImportResult(null);
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

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

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setCsvText(text);

        const parsed = onParseCSV(text);
        setHeaders(parsed.headers);
        setRows(parsed.rows);

        const detected = onDetectFilenameColumn(parsed.headers);
        if (detected) {
          setFilenameColumn(detected);
        }

        // Try auto-detection
        const autoMappings = onAutoDetectMappings(parsed.headers, detected);
        if (autoMappings.length > 0) {
          setMappings(autoMappings);
        } else {
          // Fall back to manual mapping
          const initialMappings = parsed.headers
            .filter((h) => h !== detected)
            .slice(0, 5)
            .map((h) => ({
              csvColumn: h,
              iiifProperty: '',
              language: defaultLanguage,
            }));
          setMappings(initialMappings);
        }

        setStep('map');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file. Please try again.');
      setIsLoading(false);
    };
    reader.readAsText(file);
  }, [onParseCSV, onDetectFilenameColumn, onAutoDetectMappings, defaultLanguage]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!filenameColumn) {
      setError('Please select a filename column');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await onApplyImport(mappings, filenameColumn, rows);
      setImportResult(result);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  }, [mappings, filenameColumn, rows, onApplyImport]);

  // Handle close
  const handleClose = useCallback(() => {
    if (onCancel && step !== 'result') {
      onCancel();
    }
    onClose();
  }, [onClose, onCancel, step]);

  // Update mapping
  const updateMapping = useCallback((index: number, updates: Partial<CSVColumnMapping>) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
    );
  }, []);

  // Add new mapping
  const addMapping = useCallback(() => {
    const unusedHeaders = headers.filter(
      (h) => h !== filenameColumn && !mappings.some((m) => m.csvColumn === h)
    );
    if (unusedHeaders.length > 0) {
      setMappings((prev) => [
        ...prev,
        { csvColumn: unusedHeaders[0], iiifProperty: '', language: defaultLanguage },
      ]);
    }
  }, [headers, filenameColumn, mappings, defaultLanguage]);

  // Remove mapping
  const removeMapping = useCallback((index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="table_chart" className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Import from CSV</h2>
              <p className="text-sm text-slate-500">
                {step === 'upload' && 'Upload a CSV file to import metadata'}
                {step === 'map' && 'Map CSV columns to IIIF properties'}
                {step === 'result' && 'Import completed successfully'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            icon={<Icon name="close" className="text-slate-400" />}
            aria-label="Close modal"
          />
        </div>

        {/* Progress indicator */}
        <div className="flex items-center px-6 py-3 bg-slate-50 border-b border-slate-200">
          <StepIndicator step={1} label="Upload" active={step === 'upload'} completed={step !== 'upload'} />
          <StepConnector completed={step !== 'upload'} />
          <StepIndicator step={2} label="Map" active={step === 'map'} completed={step === 'result'} />
          <StepConnector completed={step === 'result'} />
          <StepIndicator step={3} label="Result" active={step === 'result'} completed={false} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <Icon name="error" className="text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {step === 'upload' && (
            <UploadStep
              isLoading={isLoading}
              onFileUpload={handleFileUpload}
            />
          )}

          {step === 'map' && (
            <MapStep
              headers={headers}
              rows={rows}
              filenameColumn={filenameColumn}
              mappings={mappings}
              propertiesByCategory={propertiesByCategory}
              supportedLanguages={supportedLanguages}
              onFilenameColumnChange={setFilenameColumn}
              onUpdateMapping={updateMapping}
              onAddMapping={addMapping}
              onRemoveMapping={removeMapping}
            />
          )}

          {step === 'result' && importResult && (
            <ResultStep result={importResult} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            {step === 'map' && (
              <span>
                {rows.length} rows • {mappings.filter((m) => m.iiifProperty).length} mappings configured
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
            >
              {step === 'result' ? 'Close' : 'Cancel'}
            </Button>
            {step === 'map' && (
              <Button
                onClick={handleImport}
                disabled={isLoading || !filenameColumn}
                variant="primary"
                size="sm"
                loading={isLoading}
                icon={!isLoading ? <Icon name="import_export" /> : undefined}
              >
                Import Metadata
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

interface StepIndicatorProps {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ step, label, active, completed }) => (
  <div className="flex items-center gap-2">
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        completed
          ? 'bg-green-500 text-white'
          : active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-200 text-slate-500'
      }`}
    >
      {completed ? <Icon name="check" className="text-sm" /> : step}
    </div>
    <span
      className={`text-sm font-medium ${
        active ? 'text-slate-800' : completed ? 'text-green-600' : 'text-slate-400'
      }`}
    >
      {label}
    </span>
  </div>
);

interface StepConnectorProps {
  completed: boolean;
}

const StepConnector: React.FC<StepConnectorProps> = ({ completed }) => (
  <div className={`w-16 h-0.5 mx-2 ${completed ? 'bg-green-500' : 'bg-slate-200'}`} />
);

interface UploadStepProps {
  isLoading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UploadStep: React.FC<UploadStepProps> = ({ isLoading, onFileUpload }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
      <Icon name="cloud_upload" className="text-4xl text-blue-500" />
    </div>
    <h3 className="text-lg font-semibold text-slate-800 mb-2">Upload CSV File</h3>
    <p className="text-sm text-slate-500 text-center max-w-md mb-6">
      Select a CSV file containing metadata to import. The first row should contain column headers.
    </p>
    <label className="relative">
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={onFileUpload}
        
        className="sr-only"
      />
      <span className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700:opacity-50 cursor-pointer inline-flex items-center gap-2 transition-colors">
        {isLoading ? (
          <>
            <Icon name="hourglass_empty" className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Icon name="file_upload" />
            Choose File
          </>
        )}
      </span>
    </label>
  </div>
);

interface MapStepProps {
  headers: string[];
  rows: Record<string, string>[];
  filenameColumn: string;
  mappings: CSVColumnMapping[];
  propertiesByCategory: Record<string, Array<{ value: string; label: string; description?: string; category: string }>>;
  supportedLanguages: Array<{ code: string; label: string }>;
  onFilenameColumnChange: (column: string) => void;
  onUpdateMapping: (index: number, updates: Partial<CSVColumnMapping>) => void;
  onAddMapping: () => void;
  onRemoveMapping: (index: number) => void;
}

const MapStep: React.FC<MapStepProps> = ({
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
}) => (
  <div className="space-y-6">
    {/* Filename column selector */}
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Filename Column <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-slate-500 mb-2">
        Select the column that contains filenames for matching with IIIF resources
      </p>
      <select
        value={filenameColumn}
        onChange={(e) => onFilenameColumnChange(e.target.value)}
        className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      >
        <option value="">Select a column...</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>

    {/* Data preview */}
    {rows.length > 0 && (
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-2">Data Preview</h4>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {headers.slice(0, 5).map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-slate-700">
                    {h}
                  </th>
                ))}
                {headers.length > 5 && (
                  <th className="px-3 py-2 text-left font-medium text-slate-500">+{headers.length - 5} more</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 3).map((row, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  {headers.slice(0, 5).map((h) => (
                    <td key={h} className="px-3 py-2 text-slate-600 truncate max-w-xs">
                      {row[h] || '-'}
                    </td>
                  ))}
                  {headers.length > 5 && <td className="px-3 py-2 text-slate-400">...</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Column mappings */}
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-700">Column Mappings</h4>
        <div
          onClick={onAddMapping}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
        >
          <Icon name="add" className="text-sm" />
          Add Mapping
        </div>
      </div>

      <div className="space-y-3">
        {mappings.map((mapping, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
          >
            {/* CSV Column */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">CSV Column</label>
              <select
                value={mapping.csvColumn}
                onChange={(e) => onUpdateMapping(index, { csvColumn: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {headers
                  .filter((h) => h === mapping.csvColumn || h !== filenameColumn)
                  .map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
              </select>
            </div>

            {/* Arrow */}
            <Icon name="arrow_forward" className="text-slate-400 mt-5" />

            {/* IIIF Property */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">IIIF Property</label>
              <select
                value={mapping.iiifProperty}
                onChange={(e) => onUpdateMapping(index, { iiifProperty: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">(Skip this column)</option>
                {Object.entries(propertiesByCategory).map(([category, props]) => (
                  <optgroup key={category} label={category}>
                    {props.map((prop) => (
                      <option key={prop.value} value={prop.value}>
                        {prop.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Language */}
            <div className="w-32">
              <label className="block text-xs font-medium text-slate-500 mb-1">Language</label>
              <select
                value={mapping.language}
                onChange={(e) => onUpdateMapping(index, { language: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Remove button */}
            <div
              onClick={() => onRemoveMapping(index)}
              className="mt-5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              <Icon name="delete" />
            </div>
          </div>
        ))}

        {mappings.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Icon name="table_rows" className="text-3xl mb-2 opacity-50" />
            <p className="text-sm">No mappings configured</p>
            <div
              onClick={onAddMapping}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first mapping
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

interface ResultStepConfig {
  result: CSVImportResult;
}

const ResultStep: React.FC<ResultStepConfig> = ({ result }) => (
  <div className="text-center py-8">
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <Icon name="check_circle" className="text-4xl text-green-600" />
    </div>
    <h3 className="text-lg font-semibold text-slate-800 mb-2">Import Complete</h3>
    <p className="text-sm text-slate-500 mb-6">
      Successfully processed {result.totalRows} rows
    </p>

    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
      <ResultStat
        icon="check_circle"
        value={result.successCount}
        label="Successful"
        color="green"
      />
      <ResultStat
        icon="warning"
        value={result.warningCount || 0}
        label="Warnings"
        color="amber"
      />
      <ResultStat
        icon="error"
        value={result.errorCount || 0}
        label="Errors"
        color="red"
      />
    </div>

    {result.errors && result.errors.length > 0 && (
      <div className="mt-6 text-left">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Errors</h4>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
          {result.errors.map((error, i) => (
            <div key={i} className="text-xs text-red-700 py-1">
              Row {error.row}: {error.message}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

interface ResultStatConfig {
  icon: string;
  value: number;
  label: string;
  color: 'green' | 'amber' | 'red';
}

const ResultStat: React.FC<ResultStatConfig> = ({ icon, value, label, color }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <Icon name={icon} className="text-2xl mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  );
};

export default CSVImportModal;
