<!--
  ViewingDirectionSelector — SelectField wrapper for IIIF viewing direction.
  React source: src/features/metadata-edit/ui/atoms/ViewingDirectionSelector.tsx (68 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  export type ViewingDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import SelectField from '@/src/shared/ui/molecules/SelectField.svelte';
  import { VIEWING_DIRECTIONS } from '@/src/shared/constants/iiif';

  interface Props {
    value: ViewingDirection;
    onchange: (value: string) => void;
    defaultValue?: ViewingDirection;
    disabled?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    label?: string;
    showLabel?: boolean;
  }

  let {
    value,
    onchange,
    defaultValue = 'left-to-right',
    disabled = false,
    cx = {},
    fieldMode = false,
    label = 'Viewing Direction',
    showLabel = true,
  }: Props = $props();

  let displayValue = $derived(value || defaultValue);

  // VIEWING_DIRECTIONS is const-asserted; cast to mutable for SelectField options prop
  const options = VIEWING_DIRECTIONS.map(o => ({ value: o.value, label: o.label }));
</script>

<SelectField
  value={displayValue}
  {options}
  label={showLabel ? label : undefined}
  hint="viewingDirection"
  {disabled}
  {onchange}
  cx={cx as ContextualClassNames}
/>
