<!--
  ColumnSelector — Dropdown for selecting CSV column headers.
  React source: src/features/metadata-edit/ui/atoms/ColumnSelector.tsx (60 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import SelectField from '@/src/shared/ui/molecules/SelectField.svelte';

  interface Props {
    columns: string[];
    value: string;
    onchange: (column: string) => void;
    placeholder?: string;
    disabled?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    columns,
    value,
    onchange,
    placeholder = 'Select a column...',
    disabled = false,
    cx = {},
    fieldMode = false,
  }: Props = $props();

  let options = $derived(columns.map(col => ({ value: col, label: col })));
</script>

<SelectField
  {value}
  {options}
  {disabled}
  {onchange}
  cx={cx as ContextualClassNames}
/>
