<!--
  MetadataTabPanel -- Card-Based Metadata Editor with grouped sections.
  Architecture: Molecule (composes FormSection, MetadataTextField, LocationPicker,
    OtherMetadataCard. Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  const BASIC_FIELDS = ['title', 'label', 'description', 'summary', 'subject', 'creator', 'contributor'];
  const DATE_FIELDS = ['date', 'navdate', 'created', 'issued', 'modified'];
  const RIGHTS_FIELDS = ['rights', 'license', 'attribution', 'requiredstatement', 'provider'];

  function matchesCategory(lbl: string, fields: readonly string[]): boolean {
    const lower = lbl.toLowerCase();
    return fields.some(f => lower.includes(f));
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFItem } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import FormSection from '@/src/shared/ui/molecules/FormSection.svelte';
  import LocationPicker from '../atoms/LocationPicker.svelte';
  import MetadataTextField from '../atoms/MetadataTextField.svelte';
  import OtherMetadataCard from '../atoms/OtherMetadataCard.svelte';

  interface Props {
    resource: IIIFItem;
    label: string;
    summary: string;
    language: string;
    cx: ContextualClassNames;
    fieldMode: boolean;
    onUpdateResource: (r: Partial<IIIFItem>) => void;
    getDCHint: (lbl: string) => string | null;
    isLocationField: (lbl: string) => boolean;
    onShowLocationPicker: (picker: { index: number; value: string } | null) => void;
  }

  let {
    resource, label, summary, language, cx, fieldMode,
    onUpdateResource, getDCHint, isLocationField, onShowLocationPicker,
  }: Props = $props();

  let metadata = $derived(resource.metadata || []);

  let basicMetadata = $derived(metadata.filter((_, idx) =>
    matchesCategory(getIIIFValue(metadata[idx].label, language) || '', BASIC_FIELDS)
  ));
  let dateMetadata = $derived(metadata.filter((_, idx) =>
    matchesCategory(getIIIFValue(metadata[idx].label, language) || '', DATE_FIELDS)
  ));
  let rightsMetadata = $derived(metadata.filter((_, idx) =>
    matchesCategory(getIIIFValue(metadata[idx].label, language) || '', RIGHTS_FIELDS)
  ));
  let otherMetadata = $derived(metadata.filter((_, idx) => {
    const lbl = (getIIIFValue(metadata[idx].label, language) || '').toLowerCase();
    return ![...BASIC_FIELDS, ...DATE_FIELDS, ...RIGHTS_FIELDS].some(f => lbl.includes(f));
  }));

  let hasDateSection = $derived(dateMetadata.length > 0 || !!resource.navDate);
  let hasLocationSection = $derived(metadata.some((_, idx) => isLocationField(getIIIFValue(metadata[idx].label, language) || '')));
  let hasRightsSection = $derived(rightsMetadata.length > 0 || !!resource.requiredStatement || !!resource.rights);
  let hasOtherSection = $derived(otherMetadata.length > 0);

  let otherSectionOpen = $state(false);

  function capitalize(str: string): string { return str.charAt(0).toUpperCase() + str.slice(1); }

  function updateMetadataValue(index: number, newVal: string) {
    const newMeta = [...metadata];
    newMeta[index] = { ...newMeta[index], value: { [language]: [newVal] } };
    onUpdateResource({ metadata: newMeta });
  }

  function updateMetadataLabel(index: number, newLabel: string) {
    const newMeta = [...metadata];
    newMeta[index] = { ...newMeta[index], label: { [language]: [newLabel] } };
    onUpdateResource({ metadata: newMeta });
  }

  function removeMetadataField(index: number) {
    onUpdateResource({ metadata: metadata.filter((_: unknown, i: number) => i !== index) });
  }

  function addCustomField() {
    onUpdateResource({
      metadata: [...metadata, { label: { [language]: ['Custom Field'] }, value: { [language]: [''] } }],
    });
  }

  function getActualIndex(md: { label: Record<string, string[]>; value: Record<string, string[]> }): number {
    return metadata.indexOf(md);
  }
</script>

<div class="space-y-4">
  <!-- Basic Information -->
  <FormSection title="Basic Information" icon="info" {cx}>
    {#snippet children()}
      <div class="space-y-4">
        <MetadataTextField
          label="Title" value={label}
          onchange={(val) => onUpdateResource({ label: { [language]: [val] } })}
          placeholder="Enter a descriptive title" {fieldMode}
          hint="The main name or title of this item"
        />
        <MetadataTextField
          label="Description" value={summary}
          onchange={(val) => onUpdateResource({ summary: { [language]: [val] } })}
          placeholder="Add a brief description..." type="textarea" {fieldMode}
          hint="A short summary of what this item contains"
        />
        {#each basicMetadata as md (getActualIndex(md))}
          {@const lbl = getIIIFValue(md.label, language)}
          {@const val = getIIIFValue(md.value, language)}
          {@const actualIdx = getActualIndex(md)}
          <MetadataTextField
            label={capitalize(lbl)} value={val}
            onchange={(newVal) => updateMetadataValue(actualIdx, newVal)}
            placeholder={`Enter ${lbl}...`} {fieldMode}
            hint={getDCHint(lbl) || undefined}
          />
        {/each}
      </div>
    {/snippet}
  </FormSection>

  <!-- Date & Time -->
  {#if hasDateSection}
    <FormSection title="Date & Time" icon="schedule" {cx}>
      {#snippet children()}
        <div class="space-y-4">
          {#if resource.navDate}
            <MetadataTextField
              label="Navigation Date" value={resource.navDate}
              onchange={(val) => onUpdateResource({ navDate: val })}
              type="date" {fieldMode} hint="Used for timeline and chronological ordering"
            />
          {/if}
          {#each dateMetadata as md (getActualIndex(md))}
            {@const actualIdx = getActualIndex(md)}
            <MetadataTextField
              label={capitalize(getIIIFValue(md.label, language))}
              value={getIIIFValue(md.value, language)}
              onchange={(newVal) => updateMetadataValue(actualIdx, newVal)}
              type="date" {fieldMode}
            />
          {/each}
        </div>
      {/snippet}
    </FormSection>
  {/if}

  <!-- Location -->
  {#if hasLocationSection}
    <FormSection title="Location" icon="place" {cx}>
      {#snippet children()}
        <div class="space-y-4">
          {#each metadata as md, idx (idx)}
            {@const lbl = getIIIFValue(md.label, language)}
            {#if isLocationField(lbl)}
              {@const val = getIIIFValue(md.value, language)}
              <div class="flex gap-2">
                <div class="flex-1">
                  <MetadataTextField
                    label={capitalize(lbl)} value={val}
                    onchange={(newVal) => updateMetadataValue(idx, newVal)}
                    placeholder="Enter coordinates or location..." {fieldMode}
                  />
                </div>
                <div class="pt-7">
                  <LocationPicker onclick={() => onShowLocationPicker({ index: idx, value: val })} {fieldMode} />
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/snippet}
    </FormSection>
  {/if}

  <!-- Rights & Licensing -->
  {#if hasRightsSection}
    <FormSection title="Rights & Licensing" icon="shield" {cx}>
      {#snippet children()}
        <div class="space-y-4">
          {#if resource.requiredStatement}
            <MetadataTextField
              label="Attribution" value={getIIIFValue(resource.requiredStatement.value, language)}
              onchange={(val) => onUpdateResource({
                requiredStatement: { label: resource.requiredStatement!.label, value: { [language]: [val] } },
              })}
              placeholder="e.g., &copy; 2024 Example Institution" {fieldMode}
              hint="How this item should be credited"
            />
          {/if}
          {#if resource.rights}
            <MetadataTextField
              label="Rights Statement" value={resource.rights}
              onchange={(val) => onUpdateResource({ rights: val })}
              placeholder="e.g., https://creativecommons.org/licenses/by/4.0/" {fieldMode}
              hint="URL to license or rights statement"
            />
          {/if}
          {#each rightsMetadata as md (getActualIndex(md))}
            {@const actualIdx = getActualIndex(md)}
            <MetadataTextField
              label={capitalize(getIIIFValue(md.label, language))}
              value={getIIIFValue(md.value, language)}
              onchange={(newVal) => updateMetadataValue(actualIdx, newVal)}
              {fieldMode}
            />
          {/each}
        </div>
      {/snippet}
    </FormSection>
  {/if}

  <!-- Additional Metadata (collapsed by default) -->
  {#if hasOtherSection}
    <FormSection title="Additional Metadata" icon="more_horiz" {cx} bind:open={otherSectionOpen}>
      {#snippet children()}
        <div class="space-y-3">
          {#each otherMetadata as md (getActualIndex(md))}
            {@const actualIdx = getActualIndex(md)}
            <OtherMetadataCard
              label={getIIIFValue(md.label, language)}
              value={getIIIFValue(md.value, language)}
              dcHint={getDCHint(getIIIFValue(md.label, language))}
              onLabelChange={(newLabel) => updateMetadataLabel(actualIdx, newLabel)}
              onValueChange={(newVal) => updateMetadataValue(actualIdx, newVal)}
              onRemove={() => removeMetadataField(actualIdx)}
              {fieldMode}
            />
          {/each}
        </div>
      {/snippet}
    </FormSection>
  {/if}

  <!-- Add Custom Field -->
  <Button
    variant="ghost" size="bare" onclick={addCustomField}
    class={cn(
      'w-full py-3 border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-nb',
      fieldMode
        ? 'border-nb-black/70 text-nb-black/50 hover:border-nb-black/60 hover:text-nb-black/40 hover:bg-nb-black/50'
        : 'border-nb-black/20 text-nb-black/50 hover:border-nb-black/40 hover:text-nb-black/60 hover:bg-nb-cream'
    )}
  >
    {#snippet children()}<Icon name="add" class="text-sm" /> Add Custom Field{/snippet}
  </Button>
</div>
