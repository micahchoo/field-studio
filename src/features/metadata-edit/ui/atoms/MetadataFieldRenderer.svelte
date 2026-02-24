<!--
  MetadataFieldRenderer -- Single metadata field entry card with type-aware input.
  Extracted from MetadataFieldsPanel molecule.
  Architecture: Atom (composes PropertyInput, DebouncedField, RightsSelector, SelectField)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import SelectField from '@/src/shared/ui/molecules/SelectField.svelte';
  import PropertyInput from './PropertyInput.svelte';
  import DebouncedField from './DebouncedField.svelte';
  import RightsSelector from './RightsSelector.svelte';
  import { getMetadataInputType, LANGUAGE_SELECT_OPTIONS } from '../molecules/MetadataFieldsPanel.svelte';

  interface Props {
    /** The metadata key (label) */
    metadataKey: string;
    /** The metadata value */
    metadataValue: string;
    /** Detected input type for this field */
    inputType: ReturnType<typeof getMetadataInputType>;
    /** Called when the key (label) changes */
    onKeyChange: (newKey: string) => void;
    /** Called when the value changes */
    onValueChange: (newValue: string) => void;
    /** Called to remove this field */
    onRemove: () => void;
    /** Called to open location picker */
    onLocationPick?: () => void;
    /** Contextual styles */
    cx?: Partial<ContextualClassNames>;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    metadataKey,
    metadataValue,
    inputType,
    onKeyChange,
    onValueChange,
    onRemove,
    onLocationPick,
    cx = {},
    fieldMode = false,
  }: Props = $props();
</script>

<div class={cn(
  'group relative p-3 border',
  fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/20'
)}>
  <DebouncedField
    class={cn(
      'w-full text-[10px] font-bold uppercase bg-transparent outline-none mb-1 border-b',
      fieldMode ? 'text-nb-yellow/60 border-nb-yellow/30' : 'text-nb-black/50 border-transparent'
    )}
    value={metadataKey}
    onchange={onKeyChange}
  />
  {#if inputType === 'date'}
    <PropertyInput
      type="datetime-local"
      value={metadataValue ? metadataValue.slice(0, 16) : ''}
      onchange={(val) => onValueChange(val ? new Date(val).toISOString() : '')}
      {fieldMode}
      cx={cx}
    />
  {:else if inputType === 'location'}
    <PropertyInput
      type="text"
      value={metadataValue}
      onchange={onValueChange}
      isLocationField
      onLocationPick={onLocationPick}
      {fieldMode}
      cx={cx}
      placeholder="lat, lng or place name"
    />
  {:else if inputType === 'language'}
    <SelectField
      value={metadataValue}
      onchange={onValueChange}
      options={LANGUAGE_SELECT_OPTIONS}
      cx={cx as ContextualClassNames}
    />
  {:else if inputType === 'url'}
    <PropertyInput
      type="url"
      value={metadataValue}
      onchange={onValueChange}
      {fieldMode}
      cx={cx}
      placeholder="https://..."
    />
  {:else if inputType === 'rights'}
    <RightsSelector
      value={metadataValue}
      onchange={onValueChange}
      {fieldMode}
      showLabel={false}
    />
  {:else}
    <DebouncedField
      class={cn('w-full text-xs bg-transparent outline-none', fieldMode ? 'text-white' : 'text-nb-black')}
      value={metadataValue}
      onchange={onValueChange}
    />
  {/if}
  <Button
    variant="ghost"
    size="bare"
    onclick={onRemove}
    class={cn(
      'absolute top-2 right-2 opacity-0 group-hover:opacity-100',
      fieldMode ? 'text-nb-yellow/40 hover:text-nb-red' : 'text-nb-black/30 hover:text-nb-red'
    )}
  >
    {#snippet children()}
      <Icon name="close" class="text-xs" />
    {/snippet}
  </Button>
</div>
