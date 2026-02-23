<!--
  MappingRow — CSV-to-IIIF column mapping row with selectors and remove action.
  React source: src/features/metadata-edit/ui/atoms/MappingRow.tsx
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { LanguageOption } from './LanguageTag.svelte';
  import type { PropertyOption } from './PropertySelector.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import ColumnSelector from './ColumnSelector.svelte';
  import PropertySelector from './PropertySelector.svelte';
  import LanguageTag from './LanguageTag.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';

  interface Props {
    columns: string[];
    csvColumn: string;
    propertiesByCategory: Record<string, PropertyOption[]>;
    iiifProperty: string;
    languages: LanguageOption[];
    language: string;
    onCsvColumnChange: (column: string) => void;
    onPropertyChange: (property: string) => void;
    onLanguageChange: (code: string) => void;
    onRemove: () => void;
    filenameColumn?: string;
    disabled?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
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
    cx = {},
    fieldMode = false,
  }: Props = $props();

  let availableColumns = $derived(
    filenameColumn
      ? columns.filter(c => c !== filenameColumn)
      : columns
  );
</script>

<div class={cn(
  'flex items-center gap-2 p-2 border',
  fieldMode ? 'border-nb-yellow/20 bg-nb-black' : 'border-nb-black/10 bg-nb-white',
  disabled && 'opacity-50 pointer-events-none'
)}>
  <!-- CSV Column selector -->
  <div class="flex-1 min-w-0">
    <ColumnSelector
      columns={availableColumns}
      value={csvColumn}
      onchange={onCsvColumnChange}
      {disabled}
      {cx}
      {fieldMode}
    />
  </div>

  <!-- Arrow icon -->
  <Icon
    name="arrow_forward"
    class={cn('text-lg shrink-0', fieldMode ? 'text-nb-yellow/50' : cx.textMuted ?? 'text-nb-black/40')}
  />

  <!-- IIIF Property selector -->
  <div class="flex-1 min-w-0">
    <PropertySelector
      {propertiesByCategory}
      value={iiifProperty}
      onchange={onPropertyChange}
      {disabled}
      {cx}
      {fieldMode}
    />
  </div>

  <!-- Language selector -->
  <div class="w-24 shrink-0">
    <LanguageTag
      {languages}
      value={language}
      onchange={onLanguageChange}
      {disabled}
      {cx}
      {fieldMode}
    />
  </div>

  <!-- Remove button -->
  <IconButton
    icon="close"
    onclick={onRemove}
    label="Remove mapping"
    size="sm"
    disabled={disabled}
    cx={cx as ContextualClassNames}
  />
</div>
