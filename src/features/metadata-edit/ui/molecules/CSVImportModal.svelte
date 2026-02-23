<!--
  CSVImportModal — Modal dialog for importing metadata from CSV files.
  React source: src/features/metadata-edit/ui/molecules/CSVImportModal.tsx (281 lines).
  Architecture: Molecule
-->
<script module lang="ts">
  export type { CSVImportResult } from './ResultStep.svelte';
  export type { ImportStep } from './CSVImportWizard.svelte';
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { CSVColumnMapping } from '@/src/shared/types';
  import type { CSVImportResult } from './ResultStep.svelte';
  import type { ImportStep } from './CSVImportWizard.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import ModalDialog from '@/src/shared/ui/molecules/ModalDialog.svelte';
  import CSVImportWizard from './CSVImportWizard.svelte';

  interface Props {
    isOpen: boolean;
    supportedProperties: Array<{
      value: string;
      label: string;
      description?: string;
      category: string;
    }>;
    supportedLanguages: Array<{ code: string; label: string }>;
    defaultLanguage: string;
    onClose: () => void;
    onParseCSV: (text: string) => { headers: string[]; rows: Record<string, string>[] };
    onDetectFilenameColumn: (headers: string[]) => string | null;
    onAutoDetectMappings: (headers: string[], filenameColumn: string | null) => CSVColumnMapping[];
    onApplyImport: (mappings: CSVColumnMapping[], filenameColumn: string, rows: Record<string, string>[]) => Promise<CSVImportResult>;
    onCancel?: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
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
    cx = {},
    fieldMode = false,
  }: Props = $props();

  // Wizard state
  let step: ImportStep = $state('upload');
  let headers: string[] = $state([]);
  let rows: Record<string, string>[] = $state([]);
  let filenameColumn: string = $state('');
  let mappings: CSVColumnMapping[] = $state([]);
  let importResult: CSVImportResult | undefined = $state(undefined);
  let isLoading: boolean = $state(false);
  let isAutoDetecting: boolean = $state(false);
  let error: string | null = $state(null);

  // Reset all state when modal opens
  $effect(() => {
    if (isOpen) {
      step = 'upload';
      headers = [];
      rows = [];
      filenameColumn = '';
      mappings = [];
      importResult = undefined;
      isLoading = false;
      isAutoDetecting = false;
      error = null;
    }
  });

  // Dynamic subtitle based on step
  let subtitle = $derived.by(() => {
    if (step === 'upload') return 'Upload a CSV file to import metadata';
    if (step === 'map') return 'Map CSV columns to IIIF properties';
    if (step === 'result') return 'Import completed successfully';
    return '';
  });

  // Handle file upload
  async function handleFileUpload(file: File) {
    isLoading = true;
    error = null;

    try {
      const text = await file.text();
      const parsed = onParseCSV(text);
      headers = parsed.headers;
      rows = parsed.rows;

      const detected = onDetectFilenameColumn(parsed.headers);
      if (detected) {
        filenameColumn = detected;
      }

      // Try auto-detection
      const autoMappings = onAutoDetectMappings(parsed.headers, detected);
      if (autoMappings.length > 0) {
        mappings = autoMappings;
      } else {
        // Fall back to manual mapping
        mappings = parsed.headers
          .filter(h => h !== detected)
          .slice(0, 5)
          .map(h => ({
            csvColumn: h,
            iiifProperty: '',
            language: defaultLanguage,
          }));
      }

      step = 'map';
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to parse CSV file';
    } finally {
      isLoading = false;
    }
  }

  // Handle auto-detection
  function handleAutoDetect() {
    if (headers.length === 0) return;
    isAutoDetecting = true;
    try {
      const detected = onDetectFilenameColumn(headers);
      if (detected) {
        filenameColumn = detected;
      }
      const autoMappings = onAutoDetectMappings(headers, detected);
      if (autoMappings.length > 0) {
        mappings = autoMappings;
      }
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Auto-detection failed';
    } finally {
      isAutoDetecting = false;
    }
  }

  // Handle import
  async function handleImport() {
    if (!filenameColumn) {
      error = 'Please select a filename column';
      return;
    }

    isLoading = true;
    error = null;

    try {
      const result = await onApplyImport(mappings, filenameColumn, rows);
      importResult = result;
      step = 'result';
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Import failed';
    } finally {
      isLoading = false;
    }
  }

  // Handle close
  function handleClose() {
    if (onCancel && step !== 'result') {
      onCancel();
    }
    onClose();
  }

  // Update mapping
  function updateMapping(index: number, updates: Partial<CSVColumnMapping>) {
    mappings = mappings.map((m, i) => (i === index ? { ...m, ...updates } : m));
  }

  // Add new mapping
  function addMapping() {
    const unusedHeaders = headers.filter(
      h => h !== filenameColumn && !mappings.some(m => m.csvColumn === h)
    );
    if (unusedHeaders.length > 0) {
      mappings = [
        ...mappings,
        { csvColumn: unusedHeaders[0], iiifProperty: '', language: defaultLanguage },
      ];
    }
  }

  // Remove mapping
  function removeMapping(index: number) {
    mappings = mappings.filter((_, i) => i !== index);
  }
</script>

<ModalDialog
  open={isOpen}
  onClose={handleClose}
  size="lg"
  cx={cx as ContextualClassNames}
>
  {#snippet header()}
    <div class="flex items-center gap-3">
      <Icon name="table_chart" class={cn('text-xl', fieldMode ? 'text-nb-yellow' : cx.accent ?? 'text-nb-blue')} />
      <div>
        <h2 class={cn('text-lg font-mono uppercase font-bold', fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black')}>
          Import from CSV
        </h2>
        <p class={cn('text-xs', fieldMode ? 'text-nb-yellow/50' : cx.textMuted ?? 'text-nb-black/50')}>
          {subtitle}
        </p>
      </div>
    </div>
  {/snippet}

  <CSVImportWizard
    {step}
    {headers}
    {rows}
    {filenameColumn}
    {mappings}
    {supportedProperties}
    {supportedLanguages}
    {defaultLanguage}
    {importResult}
    {isLoading}
    {isAutoDetecting}
    {error}
    onStepChange={(s) => { step = s; }}
    onFileUpload={handleFileUpload}
    onFilenameColumnChange={(col) => { filenameColumn = col; }}
    onUpdateMapping={updateMapping}
    onAddMapping={addMapping}
    onRemoveMapping={removeMapping}
    onAutoDetect={handleAutoDetect}
    onImport={handleImport}
    onClose={handleClose}
    {cx}
    {fieldMode}
  />
</ModalDialog>
