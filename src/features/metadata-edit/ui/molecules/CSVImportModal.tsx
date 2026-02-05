/**
 * CSVImportModal Molecule
 *
 * Modal dialog for importing metadata from CSV files.
 * Uses shared ModalDialog with CSVImportWizard content.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Reduced from 300+ lines using shared ModalDialog
 * - Uses CSVImportWizard molecule (composed of feature-specific atoms)
 * - Manages only modal-specific state (open/close, file parsing)
 * - No native HTML elements in molecules
 *
 * @module features/metadata-edit/ui/molecules/CSVImportModal
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ModalDialog } from '@/src/shared/ui/molecules';
import { CSVImportWizard, type ImportStep } from './CSVImportWizard';
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

export type { ImportStep };

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
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [filenameColumn, setFilenameColumn] = useState('');
  const [mappings, setMappings] = useState<CSVColumnMapping[]>([]);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
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
      setIsAutoDetecting(false);
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
  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
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
  }, [onParseCSV, onDetectFilenameColumn, onAutoDetectMappings, defaultLanguage]);

  // Handle auto-detection
  const handleAutoDetect = useCallback(() => {
    if (headers.length === 0) return;
    setIsAutoDetecting(true);
    try {
      const detected = onDetectFilenameColumn(headers);
      if (detected) {
        setFilenameColumn(detected);
      }
      const autoMappings = onAutoDetectMappings(headers, detected);
      if (autoMappings.length > 0) {
        setMappings(autoMappings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-detection failed');
    } finally {
      setIsAutoDetecting(false);
    }
  }, [headers, onDetectFilenameColumn, onAutoDetectMappings]);

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

  // Dynamic subtitle based on step
  const subtitle = useMemo(() => {
    if (step === 'upload') return 'Upload a CSV file to import metadata';
    if (step === 'map') return 'Map CSV columns to IIIF properties';
    if (step === 'result') return 'Import completed successfully';
    return '';
  }, [step]);

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Import from CSV"
      subtitle={subtitle}
      icon="table_chart"
      size="lg"
      maxHeight="90vh"
    >
      <CSVImportWizard
        step={step}
        headers={headers}
        rows={rows}
        filenameColumn={filenameColumn}
        mappings={mappings}
        supportedProperties={supportedProperties}
        supportedLanguages={supportedLanguages}
        defaultLanguage={defaultLanguage}
        importResult={importResult || undefined}
        isLoading={isLoading}
        isAutoDetecting={isAutoDetecting}
        error={error}
        onStepChange={setStep}
        onFileUpload={handleFileUpload}
        onFilenameColumnChange={setFilenameColumn}
        onUpdateMapping={updateMapping}
        onAddMapping={addMapping}
        onRemoveMapping={removeMapping}
        onAutoDetect={handleAutoDetect}
        onImport={handleImport}
        onClose={handleClose}
      />
    </ModalDialog>
  );
};

export default CSVImportModal;
