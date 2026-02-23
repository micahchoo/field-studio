<!--
  RightsSelector — SelectField wrapper for IIIF rights statement selection.
  React source: src/features/metadata-edit/ui/atoms/RightsSelector.tsx (67 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import SelectField from '@/src/shared/ui/molecules/SelectField.svelte';
  import { RIGHTS_OPTIONS } from '@/src/shared/constants/metadata';

  interface Props {
    value: string;
    onchange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    label?: string;
    showLabel?: boolean;
  }

  let {
    value,
    onchange,
    placeholder = '(None Selected)',
    disabled = false,
    cx = {},
    fieldMode = false,
    label = 'Rights Statement',
    showLabel = true,
  }: Props = $props();

  // RIGHTS_OPTIONS is const-asserted; cast to mutable for SelectField options prop
  const options = RIGHTS_OPTIONS.map(o => ({ value: o.value, label: o.label }));
</script>

<SelectField
  {value}
  {options}
  label={showLabel ? label : undefined}
  hint="dc:rights"
  {disabled}
  {onchange}
  cx={cx as ContextualClassNames}
/>
