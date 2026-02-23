<!--
  PropertySelector — Grouped property dropdown for IIIF metadata columns.
  React source: src/features/metadata-edit/ui/atoms/PropertySelector.tsx (77 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  export interface PropertyOption {
    value: string;
    label: string;
    description?: string;
    category: string;
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import SelectField from '@/src/shared/ui/molecules/SelectField.svelte';

  interface SelectOptionGroup {
    label: string;
    options: { value: string; label: string }[];
  }

  interface Props {
    propertiesByCategory: Record<string, PropertyOption[]>;
    value: string;
    onchange: (property: string) => void;
    placeholder?: string;
    disabled?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    propertiesByCategory,
    value,
    onchange,
    placeholder = '(Skip this column)',
    disabled = false,
    cx = {},
    fieldMode = false,
  }: Props = $props();

  let groups: SelectOptionGroup[] = $derived(
    Object.entries(propertiesByCategory).map(([category, props]) => ({
      label: category,
      options: props.map(p => ({
        value: p.value,
        label: p.label,
      })),
    }))
  );
</script>

<SelectField
  {value}
  {onchange}
  {groups}
  {disabled}
  cx={cx as import('@/src/shared/lib/contextual-styles').ContextualClassNames}
/>
