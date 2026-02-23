<!--
  CSVImportWizard — Complete wizard for CSV import workflow with step management.
  React source: src/features/metadata-edit/ui/molecules/CSVImportWizard.tsx (209 lines).
  Architecture: Molecule
-->
<script module lang="ts">
  export type ImportStep = 'upload' | 'map' | 'result';
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { CSVColumnMapping } from '@/src/shared/types';
  import type { CSVImportResult } from './ResultStep.svelte';
  import type { PropertyOption } from '../atoms/PropertySelector.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import StepIndicator from '@/src/shared/ui/atoms/StepIndicator.svelte';
  import StepConnector from '@/src/shared/ui/atoms/StepConnector.svelte';
  import UploadStep from './UploadStep.svelte';
  import MappingStep from './MappingStep.svelte';
  import ResultStep from './ResultStep.svelte';

  interface Props {
    step: ImportStep;
    headers: string[];
    rows: Record<string, string>[];
    filenameColumn: string;
    mappings: CSVColumnMapping[];
    supportedProperties: Array<{
      value: string;
      label: string;
      description?: string;
      category: string;
    }>;
    supportedLanguages: Array<{ code: string; label: string }>;
    defaultLanguage: string;
    importResult?: CSVImportResult;
    isLoading?: boolean;
    isAutoDetecting?: boolean;
    error?: string | null;
    onStepChange?: (step: ImportStep) => void;
    onFileUpload: (file: File) => void;
    onFilenameColumnChange: (column: string) => void;
    onUpdateMapping: (index: number, updates: Partial<CSVColumnMapping>) => void;
    onAddMapping: () => void;
    onRemoveMapping: (index: number) => void;
    onAutoDetect?: () => void;
    onImport?: () => void;
    onClose?: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
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
    cx = {},
    fieldMode = false,
  }: Props = $props();

  // Group properties by category
  let propertiesByCategory: Record<string, PropertyOption[]> = $derived.by(() => {
    const grouped: Record<string, PropertyOption[]> = {};
    for (const prop of supportedProperties) {
      if (!grouped[prop.category]) {
        grouped[prop.category] = [];
      }
      grouped[prop.category].push(prop);
    }
    return grouped;
  });

  let configuredCount = $derived(mappings.filter(m => m.iiifProperty).length);
</script>

<div class={cn('flex flex-col h-full', fieldMode ? 'bg-nb-black' : 'bg-nb-white')}>
  <!-- Progress indicator -->
  <div class={cn(
    'flex items-center px-6 py-3 border-b',
    fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-white border-nb-black/20'
  )}>
    <StepIndicator step={1} label="Upload" active={step === 'upload'} completed={step !== 'upload'} />
    <StepConnector completed={step !== 'upload'} />
    <StepIndicator step={2} label="Map" active={step === 'map'} completed={step === 'result'} />
    <StepConnector completed={step === 'result'} />
    <StepIndicator step={3} label="Result" active={step === 'result'} completed={false} />
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-6">
    {#if error}
      <div class={cn(
        'mb-4 p-4 flex items-center gap-3',
        fieldMode ? 'bg-nb-red/30 border border-nb-red' : 'bg-nb-red/10 border border-nb-red/30'
      )}>
        <Icon name="error" class="text-nb-red" />
        <span class={cn('text-sm', fieldMode ? 'text-nb-red/60' : 'text-nb-red')}>{error}</span>
      </div>
    {/if}

    {#if step === 'upload'}
      <UploadStep
        {isLoading}
        {onFileUpload}
        {cx}
        {fieldMode}
      />
    {:else if step === 'map'}
      <MappingStep
        {headers}
        {rows}
        {filenameColumn}
        {mappings}
        {propertiesByCategory}
        {supportedLanguages}
        {onFilenameColumnChange}
        {onUpdateMapping}
        {onAddMapping}
        {onRemoveMapping}
        {onAutoDetect}
        {isAutoDetecting}
        {cx}
        {fieldMode}
      />
    {:else if step === 'result' && importResult}
      <ResultStep result={importResult} {cx} {fieldMode} />
    {/if}
  </div>

  <!-- Footer -->
  <div class={cn(
    'flex items-center justify-between p-4 border-t',
    fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-white border-nb-black/20'
  )}>
    <div class={cn('text-sm', fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/50')}>
      {#if step === 'map'}
        <span>{rows.length} rows &bull; {configuredCount} mappings configured</span>
      {/if}
    </div>
    <div class="flex items-center gap-3">
      <Button onclick={onClose} variant="ghost" size="sm">
        {step === 'result' ? 'Close' : 'Cancel'}
      </Button>
      {#if step === 'map'}
        <Button
          onclick={onImport}
          disabled={isLoading || !filenameColumn}
          variant="primary"
          size="sm"
          loading={isLoading}
        >
          Import Metadata
        </Button>
      {/if}
    </div>
  </div>
</div>
