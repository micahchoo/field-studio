
import React, { useEffect, useMemo, useState } from 'react';
import { getIIIFValue, IIIFItem } from '@/src/shared/types';
import { CSVColumnMapping, csvImporter, CSVImportResult, SUPPORTED_IIIF_PROPERTIES } from '../services/csvImporter';
import { CSV_SUPPORTED_PROPERTIES, SUPPORTED_LANGUAGES } from '@/src/shared/constants';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import {
  completeCheckpoint,
  deleteCheckpoint,
  failCheckpoint,
  formatCheckpointAge,
  getActiveCheckpoint,
  IngestCheckpoint,
  listCheckpoints,
  resumeFromCheckpoint
} from '../services/ingestState';

type DialogMode = 'import' | 'export';
type ImportStep = 'upload' | 'map' | 'result' | 'resume';
type ExportStep = 'configure' | 'preview' | 'complete';

interface CSVImportDialogProps {
  root: IIIFItem;
  onApply: (updatedRoot: IIIFItem) => void;
  onClose: () => void;
  initialMode?: DialogMode;
  /** Source ID for checkpoint tracking */
  sourceId?: string;
}

export const CSVImportDialog: React.FC<CSVImportDialogProps> = ({ root, onApply, onClose, initialMode = 'import', sourceId }) => {
  const [mode, setMode] = useState<DialogMode>(initialMode);

  // Import state
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [filenameColumn, setFilenameColumn] = useState('');
  const [mappings, setMappings] = useState<CSVColumnMapping[]>([]);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);

  // Checkpoint state
  const [checkpoints, setCheckpoints] = useState<IngestCheckpoint[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<IngestCheckpoint | null>(null);
  const [isLoadingCheckpoints, setIsLoadingCheckpoints] = useState(false);

  // Load checkpoints on mount
  useEffect(() => {
    if (mode === 'import' && sourceId) {
      loadAvailableCheckpoints();
    }
  }, [mode, sourceId]);

  const loadAvailableCheckpoints = async () => {
    setIsLoadingCheckpoints(true);
    try {
      const allCheckpoints = await listCheckpoints();
      // Filter for checkpoints related to this source or CSV imports
      const relevant = allCheckpoints.filter(cp =>
        cp.sourceId === sourceId ||
        cp.sourceId.startsWith('csv_') ||
        cp.metadata?.type === 'csv_import'
      );
      setCheckpoints(relevant);
    } catch (error) {
      console.error('Failed to load checkpoints:', error);
    } finally {
      setIsLoadingCheckpoints(false);
    }
  };

  const handleResumeFromCheckpoint = async (checkpoint: IngestCheckpoint) => {
    try {
      const resumed = await resumeFromCheckpoint(checkpoint.id);
      setSelectedCheckpoint(resumed);

      // Restore CSV state from checkpoint metadata
      if (resumed.metadata.csvText) {
        setCsvText(resumed.metadata.csvText as string);
        const parsed = csvImporter.parseCSV(resumed.metadata.csvText as string);
        setHeaders(parsed.headers);
        setRows(parsed.rows);
        setFilenameColumn((resumed.metadata.filenameColumn as string) || parsed.headers[0]);

        if (resumed.metadata.mappings) {
          setMappings(resumed.metadata.mappings as CSVColumnMapping[]);
        }

        setAutoDetected(true);
        setImportStep('map');
      }
    } catch (error) {
      console.error('Failed to resume checkpoint:', error);
      alert('Failed to resume import. Please start fresh.');
    }
  };

  const saveCheckpointDuringImport = async () => {
    if (!selectedCheckpoint) return;

    try {
      await completeCheckpoint(selectedCheckpoint.id);
    } catch (error) {
      console.error('Failed to save checkpoint:', error);
    }
  };

  // Export state
  const [exportStep, setExportStep] = useState<ExportStep>('configure');
  const [exportItemTypes, setExportItemTypes] = useState<('Canvas' | 'Manifest' | 'Collection')[]>(['Canvas']);
  const [exportProperties, setExportProperties] = useState<string[]>([
    'label', 'summary', 'metadata.title', 'metadata.creator', 'metadata.date', 'metadata.description'
  ]);
  const [exportIncludeId, setExportIncludeId] = useState(true);
  const [exportLanguage, setExportLanguage] = useState('en');
  const [exportPreview, setExportPreview] = useState<string>('');
  const [exportItemCount, setExportItemCount] = useState(0);

  const supportedProps = csvImporter.getSupportedProperties();
  const exportColumns = csvImporter.getExportColumns();

  // Group export columns by category
  const exportColumnsByCategory = useMemo(() => {
    const grouped: Record<string, typeof exportColumns> = {};
    for (const col of exportColumns) {
      if (!grouped[col.category]) grouped[col.category] = [];
      grouped[col.category].push(col);
    }
    return grouped;
  }, [exportColumns]);

  // Import handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        setCsvText(text);
        const parsed = csvImporter.parseCSV(text);
        setHeaders(parsed.headers);
        setRows(parsed.rows);

        const detected = csvImporter.detectFilenameColumn(parsed.headers);
        if (detected) setFilenameColumn(detected);

        // Try auto-detection first (works well with staging template exports)
        const autoMappings = csvImporter.autoDetectMappings(parsed.headers, detected || '');
        let initialMappings: CSVColumnMapping[] = [];

        if (autoMappings.length > 0) {
          // Use auto-detected mappings
          setMappings(autoMappings);
          setAutoDetected(true);
        } else {
          // Fall back to manual mapping setup
          initialMappings = parsed.headers
            .filter(h => h !== detected)
            .slice(0, 5)
            .map(h => ({ csvColumn: h, iiifProperty: '', language: 'en' }));
          setMappings(initialMappings);
          setAutoDetected(false);
        }

        // Create checkpoint for resumable import
        if (sourceId) {
          const { createCheckpoint } = await import('../services/ingestState');
          const checkpoint = await createCheckpoint({
            sourceId: sourceId || `csv_${Date.now()}`,
            sourceName: file.name,
            files: parsed.rows.map((row, idx) => ({
              path: row[detected || parsed.headers[0]] || `row_${idx}`,
              size: 0,
              lastModified: Date.now()
            })),
            metadata: {
              type: 'csv_import',
              csvText: text,
              filenameColumn: detected || parsed.headers[0],
              mappings: autoMappings.length > 0 ? autoMappings : initialMappings,
              rowCount: parsed.rows.length
            }
          });
          setSelectedCheckpoint(checkpoint);
        }

        setImportStep('map');
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Failed to parse CSV file. Please check the file format.');
      }
    };
    reader.onerror = () => {
      alert('Failed to read the file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (index: number, field: keyof CSVColumnMapping, value: string) => {
    setMappings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addMapping = () => {
    const unmapped = headers.filter(h =>
      h !== filenameColumn && !mappings.some(m => m.csvColumn === h)
    );
    if (unmapped.length > 0) {
      setMappings(prev => [...prev, { csvColumn: unmapped[0], iiifProperty: '', language: 'en' }]);
    }
  };

  const removeMapping = (index: number) => {
    setMappings(prev => prev.filter((_, i) => i !== index));
  };

  const handleApply = async () => {
    const validMappings = mappings.filter(m => m.csvColumn && m.iiifProperty);
    const { updatedRoot, result } = csvImporter.applyMappings(root, rows, filenameColumn, validMappings);
    setImportResult(result);
    setImportStep('result');

    if (result.matched > 0) {
      onApply(updatedRoot);
      // Complete the checkpoint
      if (selectedCheckpoint) {
        await completeCheckpoint(selectedCheckpoint.id);
      }
    } else {
      // Mark checkpoint as failed if no matches
      if (selectedCheckpoint) {
        await failCheckpoint(selectedCheckpoint.id, 'No items matched the CSV data');
      }
    }
  };

  const handleDeleteCheckpoint = async (checkpointId: string) => {
    try {
      await deleteCheckpoint(checkpointId);
      await loadAvailableCheckpoints();
    } catch (error) {
      console.error('Failed to delete checkpoint:', error);
    }
  };

  // Export handlers
  const toggleExportProperty = (prop: string) => {
    setExportProperties(prev =>
      prev.includes(prop)
        ? prev.filter(p => p !== prop)
        : [...prev, prop]
    );
  };

  const toggleExportItemType = (type: 'Canvas' | 'Manifest' | 'Collection') => {
    setExportItemTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGeneratePreview = () => {
    const result = csvImporter.exportCSV(root, {
      properties: exportProperties,
      language: exportLanguage,
      includeId: exportIncludeId,
      includeType: true,
      itemTypes: exportItemTypes
    });
    setExportPreview(result.csv);
    setExportItemCount(result.itemCount);
    setExportStep('preview');
  };

  const handleExportDownload = () => {
    const filename = `iiif-metadata-${new Date().toISOString().split('T')[0]}.csv`;
    csvImporter.downloadCSV(exportPreview, filename);
    setExportStep('complete');
  };

  const handleSelectAllProperties = () => {
    setExportProperties([...SUPPORTED_IIIF_PROPERTIES]);
  };

  const handleSelectNoneProperties = () => {
    setExportProperties([]);
  };

  const handleSmartSelectProperties = () => {
    const result = csvImporter.exportCSVSmart(root, {
      language: exportLanguage,
      includeId: exportIncludeId,
      itemTypes: exportItemTypes
    });
    const headerLine = result.csv.split('\n')[0];
    const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, ''));
    const detected = headers.filter(h => SUPPORTED_IIIF_PROPERTIES.includes(h));
    setExportProperties(detected.length > 0 ? detected : ['label']);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Icon name="table_chart" className="text-green-600" />
              CSV Metadata {mode === 'import' ? 'Import' : 'Export'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <Icon name="close" />
            </button>
          </div>
          {/* Mode tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => { setMode('import'); setImportStep('upload'); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                mode === 'import' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon name="upload" className="text-base" /> Import
            </button>
            <button
              onClick={() => { setMode('export'); setExportStep('configure'); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                mode === 'export' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon name="download" className="text-base" /> Export
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* ============ IMPORT MODE ============ */}
          {mode === 'import' && importStep === 'upload' && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="upload_file" className="text-4xl text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Upload CSV File</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Import metadata from a CSV spreadsheet. The file should have a column for filenames and columns for metadata fields.
              </p>

              {/* Resume import section */}
              {checkpoints.length > 0 && (
                <div className="mb-8 max-w-md mx-auto">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-amber-800 font-bold mb-3">
                      <Icon name="history" />
                      Resume Previous Import
                    </div>
                    <div className="space-y-2">
                      {checkpoints.slice(0, 3).map(cp => (
                        <div
                          key={cp.id}
                          className="flex items-center justify-between bg-white rounded p-3"
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm text-slate-700">
                              {cp.sourceName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {formatCheckpointAge(cp.timestamp)} • {cp.processedFiles} of {cp.totalFiles} rows
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResumeFromCheckpoint(cp)}
                              className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600"
                            >
                              Resume
                            </button>
                            <button
                              onClick={() => handleDeleteCheckpoint(cp.id)}
                              className="px-2 py-1.5 text-slate-400 hover:text-red-500"
                            >
                              <Icon name="delete" className="text-sm" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {checkpoints.length > 3 && (
                      <p className="text-[11px] text-amber-600 mt-2">
                        +{checkpoints.length - 3} more imports available
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400">or start new</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                </div>
              )}

              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="bg-iiif-blue text-white px-6 py-3 rounded-lg font-bold cursor-pointer hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
                  <Icon name="folder_open" /> Choose CSV File
                </span>
              </label>
            </div>
          )}

          {mode === 'import' && importStep === 'map' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 font-bold mb-1">
                  <Icon name="check_circle" /> CSV Loaded
                </div>
                <p className="text-green-700 text-sm">
                  Found {headers.length} columns and {rows.length} rows
                </p>
              </div>

              {autoDetected && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 font-bold mb-1">
                    <Icon name="auto_awesome" /> Columns Auto-Detected
                  </div>
                  <p className="text-blue-700 text-sm">
                    {mappings.filter(m => m.iiifProperty).length} columns were automatically mapped to IIIF properties.
                    This CSV appears to be from the Ingest Workbench metadata template.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Filename Column (to match with archive items)
                </label>
                <select
                  value={filenameColumn}
                  onChange={(e) => setFilenameColumn(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-slate-700">
                    Column Mappings
                  </label>
                  <button
                    onClick={addMapping}
                    className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold text-slate-600 flex items-center gap-1"
                  >
                    <Icon name="add" className="text-sm" /> Add Mapping
                  </button>
                </div>

                <div className="space-y-2">
                  {mappings.map((mapping, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg">
                      <select
                        value={mapping.csvColumn}
                        onChange={(e) => handleMappingChange(idx, 'csvColumn', e.target.value)}
                        className="flex-1 border rounded p-2 text-sm"
                      >
                        <option value="">Select CSV Column</option>
                        {headers.filter(h => h !== filenameColumn).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>

                      <Icon name="arrow_forward" className="text-slate-400" />

                      <select
                        value={mapping.iiifProperty}
                        onChange={(e) => handleMappingChange(idx, 'iiifProperty', e.target.value)}
                        className="flex-1 border rounded p-2 text-sm"
                      >
                        <option value="">Select IIIF Property</option>
                        {supportedProps.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>

                      <select
                        value={mapping.language}
                        onChange={(e) => handleMappingChange(idx, 'language', e.target.value)}
                        className="w-20 border rounded p-2 text-sm"
                      >
                        {SUPPORTED_LANGUAGES.slice(0, 6).map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.code}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => removeMapping(idx)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Icon name="delete" className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-100 rounded-lg p-4">
                <h4 className="font-bold text-sm text-slate-700 mb-2">Preview (first 3 rows)</h4>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="border-b">
                        {headers.slice(0, 5).map(h => (
                          <th key={h} className="text-left p-2 font-bold text-slate-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 3).map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-200">
                          {headers.slice(0, 5).map(h => (
                            <td key={h} className="p-2 text-slate-600 truncate max-w-[150px]">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {mode === 'import' && importStep === 'result' && importResult && (
            <div className="text-center py-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                importResult.matched > 0 ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                <Icon
                  name={importResult.matched > 0 ? 'check_circle' : 'warning'}
                  className={`text-4xl ${importResult.matched > 0 ? 'text-green-600' : 'text-amber-600'}`}
                />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-4">
                {importResult.matched > 0 ? 'Import Complete' : 'Import Issues'}
              </h3>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6">
                <div className={`${importResult.matched > 0 ? 'bg-green-50' : 'bg-slate-100'} p-4 rounded-lg`}>
                  <div className={`text-3xl font-bold ${importResult.matched > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                    {importResult.matched}
                  </div>
                  <div className={`text-sm ${importResult.matched > 0 ? 'text-green-700' : 'text-slate-500'}`}>Items Updated</div>
                </div>
                <div className={`${importResult.unmatched > 0 ? 'bg-amber-50' : 'bg-slate-100'} p-4 rounded-lg`}>
                  <div className={`text-3xl font-bold ${importResult.unmatched > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                    {importResult.unmatched}
                  </div>
                  <div className={`text-sm ${importResult.unmatched > 0 ? 'text-amber-700' : 'text-slate-500'}`}>Not Matched</div>
                </div>
              </div>

              {/* Unmatched items help */}
              {importResult.unmatched > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left max-w-md mx-auto mb-4">
                  <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                    <Icon name="lightbulb" />
                    Troubleshooting Tips
                  </div>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Check that filenames in the CSV match exactly (case-sensitive)</li>
                    <li>• Make sure you selected the correct filename column</li>
                    <li>• File extensions may be stored differently (.jpg vs .jpeg)</li>
                    <li>• Try exporting a template first to see the expected format</li>
                  </ul>
                </div>
              )}

              {/* Error messages with solutions */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                    <Icon name="error" />
                    Errors ({importResult.errors.length})
                  </div>
                  <ul className="text-sm text-red-700 space-y-2">
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Icon name="cancel" className="text-xs mt-1 flex-shrink-0" />
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                  {importResult.errors.length > 5 && (
                    <p className="text-xs text-red-600 mt-2">
                      +{importResult.errors.length - 5} more errors
                    </p>
                  )}

                  {/* Common solutions */}
                  <div className="mt-4 pt-3 border-t border-red-200">
                    <p className="text-xs font-bold text-red-800 mb-2">Common Solutions:</p>
                    <ul className="text-xs text-red-700 space-y-1">
                      <li>• If file access errors: Check file permissions or enable CORS</li>
                      <li>• If "file not found": Ensure files haven't been moved</li>
                      <li>• If encoding errors: Save CSV as UTF-8 format</li>
                      <li>• If parsing fails: Check for special characters in filenames</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============ EXPORT MODE ============ */}
          {mode === 'export' && exportStep === 'configure' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800 font-bold mb-1">
                  <Icon name="info" /> Export Metadata as CSV
                </div>
                <p className="text-blue-700 text-sm">
                  Export item metadata to a CSV file for bulk editing in a spreadsheet. Re-import the modified CSV to update your archive.
                </p>
              </div>

              {/* Item Types */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Item Types to Export
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(['Canvas', 'Manifest', 'Collection'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => toggleExportItemType(type)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                        exportItemTypes.includes(type)
                          ? 'bg-iiif-blue text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {type}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Preferred Language
                </label>
                <select
                  value={exportLanguage}
                  onChange={(e) => setExportLanguage(e.target.value)}
                  className="border rounded-lg p-2 text-sm"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Include ID */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeId"
                  checked={exportIncludeId}
                  onChange={(e) => setExportIncludeId(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="includeId" className="text-sm text-slate-700">
                  Include IIIF ID column (useful for re-importing)
                </label>
              </div>

              {/* Properties */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Properties to Export
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSmartSelectProperties}
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded font-bold"
                    >
                      Smart Select
                    </button>
                    <button
                      onClick={handleSelectAllProperties}
                      className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold text-slate-600"
                    >
                      All
                    </button>
                    <button
                      onClick={handleSelectNoneProperties}
                      className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-bold text-slate-600"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries(exportColumnsByCategory).map(([category, cols]) => (
                    <div key={category}>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{category}</div>
                      <div className="flex flex-wrap gap-2">
                        {cols.map(col => (
                          <button
                            key={col.key}
                            onClick={() => toggleExportProperty(col.key)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              exportProperties.includes(col.key)
                                ? 'bg-iiif-blue text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={col.key}
                          >
                            {col.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'export' && exportStep === 'preview' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 font-bold mb-1">
                  <Icon name="check_circle" /> CSV Generated
                </div>
                <p className="text-green-700 text-sm">
                  {exportItemCount} items ready for export with {exportProperties.length + (exportIncludeId ? 2 : 1)} columns
                </p>
              </div>

              <div className="bg-slate-100 rounded-lg p-4">
                <h4 className="font-bold text-sm text-slate-700 mb-2">Preview</h4>
                <div className="overflow-x-auto">
                  <pre className="text-xs text-slate-600 whitespace-pre overflow-x-auto max-h-64">
                    {exportPreview.split('\n').slice(0, 10).join('\n')}
                    {exportPreview.split('\n').length > 10 && '\n...'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {mode === 'export' && exportStep === 'complete' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="check_circle" className="text-4xl text-green-600" />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-4">Export Complete</h3>

              <p className="text-slate-500 max-w-md mx-auto">
                Your CSV file has been downloaded. Open it in a spreadsheet application to edit metadata, then use the Import tab to apply changes back to your archive.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          {mode === 'import' && importStep === 'map' && (
            <>
              <button onClick={() => setImportStep('upload')} className="text-slate-500 font-bold hover:text-slate-700">
                Back
              </button>
              <button
                onClick={handleApply}
                disabled={mappings.filter(m => m.csvColumn && m.iiifProperty).length === 0}
                className="bg-iiif-blue text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icon name="play_arrow" /> Apply Mappings
              </button>
            </>
          )}

          {mode === 'import' && importStep === 'result' && (
            <button
              onClick={onClose}
              className="mx-auto bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-700"
            >
              Done
            </button>
          )}

          {mode === 'export' && exportStep === 'configure' && (
            <>
              <div />
              <button
                onClick={handleGeneratePreview}
                disabled={exportProperties.length === 0 || exportItemTypes.length === 0}
                className="bg-iiif-blue text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icon name="visibility" /> Preview Export
              </button>
            </>
          )}

          {mode === 'export' && exportStep === 'preview' && (
            <>
              <button onClick={() => setExportStep('configure')} className="text-slate-500 font-bold hover:text-slate-700">
                Back
              </button>
              <button
                onClick={handleExportDownload}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2"
              >
                <Icon name="download" /> Download CSV
              </button>
            </>
          )}

          {mode === 'export' && exportStep === 'complete' && (
            <button
              onClick={onClose}
              className="mx-auto bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
