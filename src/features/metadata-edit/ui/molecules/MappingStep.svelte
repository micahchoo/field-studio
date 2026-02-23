<!--
  MappingStep — CSV column to IIIF property mapping configuration.
  React source: src/features/metadata-edit/ui/molecules/MappingStep.tsx (168 lines).
  Architecture: Molecule
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { CSVColumnMapping } from '@/src/shared/types';
  import type { PropertyOption } from '../atoms/PropertySelector.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import AutoMapButton from '../atoms/AutoMapButton.svelte';
  import ColumnSelector from '../atoms/ColumnSelector.svelte';
  import FilePreview from '../atoms/FilePreview.svelte';
  import MappingRow from '../atoms/MappingRow.svelte';

  interface Props {
    headers: string[];
    rows: Record<string, string>[];
    filenameColumn: string;
    mappings: CSVColumnMapping[];
    propertiesByCategory: Record<string, PropertyOption[]>;
    supportedLanguages: Array<{ code: string; label: string }>;
    onFilenameColumnChange: (column: string) => void;
    onUpdateMapping: (index: number, updates: Partial<CSVColumnMapping>) => void;
    onAddMapping: () => void;
    onRemoveMapping: (index: number) => void;
    onAutoDetect?: () => void;
    isAutoDetecting?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
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
    cx = {},
    fieldMode = false,
  }: Props = $props();

  let hasData = $derived(rows.length > 0);

  let labelClass = $derived(cn(
    'text-sm font-medium',
    fieldMode ? 'text-nb-yellow/80' : cx.text ?? 'text-nb-black/80'
  ));

  let mutedClass = $derived(cn(
    'text-xs',
    fieldMode ? 'text-nb-yellow/50' : cx.textMuted ?? 'text-nb-black/50'
  ));
</script>

<div class="space-y-6">
  <!-- Filename column selector -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <label class={cn('block', labelClass)}>
        Filename Column <span class="text-nb-red">*</span>
      </label>
      {#if onAutoDetect}
        <AutoMapButton
          onclick={onAutoDetect}
          isLoading={isAutoDetecting}
          disabled={headers.length === 0}
          {cx}
          {fieldMode}
        />
      {/if}
    </div>
    <p class={cn(mutedClass, 'mb-2')}>
      Select the column that contains filenames for matching with IIIF resources
    </p>
    <ColumnSelector
      columns={headers}
      value={filenameColumn}
      onchange={onFilenameColumnChange}
      placeholder="Select a column..."
      {cx}
      {fieldMode}
    />
  </div>

  <!-- Data preview -->
  {#if hasData}
    <div>
      <div class="flex items-center justify-between mb-2">
        <h4 class={labelClass}>Data Preview</h4>
        <span class={mutedClass}>
          {rows.length} rows &bull; {headers.length} columns
        </span>
      </div>
      <FilePreview
        {headers}
        {rows}
        maxColumns={5}
        maxRows={3}
        {cx}
        {fieldMode}
      />
    </div>
  {/if}

  <!-- Column mappings -->
  <div>
    <div class="flex items-center justify-between mb-3">
      <h4 class={labelClass}>Column Mappings</h4>
      <Button onclick={onAddMapping} variant="ghost" size="sm">
        {#snippet icon()}
          <Icon name="add" class="text-sm" />
        {/snippet}
        Add Mapping
      </Button>
    </div>

    <div class="space-y-3">
      {#each mappings as mapping, index (index)}
        <MappingRow
          columns={headers}
          csvColumn={mapping.csvColumn}
          {propertiesByCategory}
          iiifProperty={mapping.iiifProperty}
          languages={supportedLanguages}
          language={mapping.language || ''}
          onCsvColumnChange={(column) => onUpdateMapping(index, { csvColumn: column })}
          onPropertyChange={(property) => onUpdateMapping(index, { iiifProperty: property })}
          onLanguageChange={(code) => onUpdateMapping(index, { language: code })}
          onRemove={() => onRemoveMapping(index)}
          {filenameColumn}
          {cx}
          {fieldMode}
        />
      {/each}

      {#if mappings.length === 0}
        <div class={cn(
          'text-center py-8 border-2 border-dashed',
          fieldMode
            ? 'text-nb-yellow/50 border-nb-yellow/20'
            : 'text-nb-black/50 border-nb-black/20'
        )}>
          <Icon name="table_rows" class="text-3xl mb-2 opacity-50" />
          <p class="text-sm">No mappings configured</p>
          <Button
            onclick={onAddMapping}
            variant="ghost"
            size="sm"
            class={cn('mt-2', fieldMode ? 'text-nb-yellow' : 'text-nb-blue hover:text-nb-blue')}
          >
            Add your first mapping
          </Button>
        </div>
      {/if}
    </div>
  </div>
</div>
