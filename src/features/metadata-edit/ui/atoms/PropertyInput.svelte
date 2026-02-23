<!--
  PropertyInput — Input field for metadata property values with optional location picker.
  React source: src/features/metadata-edit/ui/atoms/PropertyInput.tsx (84 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import FormInput from '@/src/shared/ui/molecules/FormInput.svelte';
  import LocationPicker from './LocationPicker.svelte';

  interface Props {
    value: string;
    onchange: (value: string) => void;
    label?: string;
    placeholder?: string;
    type?: 'text' | 'textarea' | 'datetime-local' | 'url';
    isLocationField?: boolean;
    onLocationPick?: () => void;
    disabled?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    value,
    onchange,
    label,
    placeholder = '',
    type = 'text',
    isLocationField = false,
    onLocationPick,
    disabled = false,
    cx = {},
    fieldMode = false,
  }: Props = $props();
</script>

<FormInput
  {value}
  oninput={onchange}
  {type}
  {label}
  {placeholder}
  {disabled}
  cx={cx as import('@/src/shared/lib/contextual-styles').ContextualClassNames}
>
  {#snippet action()}
    {#if isLocationField && onLocationPick}
      <LocationPicker
        onclick={onLocationPick}
        {disabled}
        {cx}
        {fieldMode}
        title="Pick Location on Map"
      />
    {/if}
  {/snippet}
</FormInput>
