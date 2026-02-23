<!--
  MetadataTabPanel Molecule - Card-Based Redesign

  Complete redesign following the critique:
  - Card-based layout instead of cramped spreadsheet
  - Clear visual hierarchy with grouped sections
  - Human-readable dates with date pickers
  - Separate read-only technical fields
  - Edit affordances with hover states and icons

  React source: src/features/metadata-edit/ui/molecules/MetadataTabPanel.tsx (460 lines)
  Architecture: Molecule (composes FormSection, MetadataTextField, LocationPicker,
                Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  /** Field category arrays for metadata grouping */
  const BASIC_FIELDS = ['title', 'label', 'description', 'summary', 'subject', 'creator', 'contributor'];
  const DATE_FIELDS = ['date', 'navdate', 'created', 'issued', 'modified'];
  const RIGHTS_FIELDS = ['rights', 'license', 'attribution', 'requiredstatement', 'provider'];
  const LOCATION_FIELDS = ['location', 'coverage', 'spatial', 'navplace'];
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

  interface Props {
    /** Resource being edited */
    resource: IIIFItem;
    /** Current label value (single language) */
    label: string;
    /** Current summary value (single language) */
    summary: string;
    /** Current language for metadata values */
    language: string;
    /** Contextual styles from parent */
    cx: ContextualClassNames;
    /** Field mode flag */
    fieldMode: boolean;
    /** Called when resource is updated */
    onUpdateResource: (r: Partial<IIIFItem>) => void;
    /** Get Dublin Core hint for a label */
    getDCHint: (lbl: string) => string | null;
    /** Determine if a field is a location field */
    isLocationField: (lbl: string) => boolean;
    /** Show location picker modal */
    onShowLocationPicker: (picker: { index: number; value: string } | null) => void;
  }

  let {
    resource,
    label,
    summary,
    language,
    cx,
    fieldMode,
    onUpdateResource,
    getDCHint,
    isLocationField,
    onShowLocationPicker,
  }: Props = $props();

  // -- Derived: metadata array from resource --
  let metadata = $derived(resource.metadata || []);

  // -- Derived: categorized metadata fields --

  let basicMetadata = $derived(
    metadata.filter((_md, idx) => {
      const lbl = (getIIIFValue(metadata[idx].label, language) || '').toLowerCase();
      return BASIC_FIELDS.some(f => lbl.includes(f));
    })
  );

  let dateMetadata = $derived(
    metadata.filter((_md, idx) => {
      const lbl = (getIIIFValue(metadata[idx].label, language) || '').toLowerCase();
      return DATE_FIELDS.some(f => lbl.includes(f));
    })
  );

  let rightsMetadata = $derived(
    metadata.filter((_md, idx) => {
      const lbl = (getIIIFValue(metadata[idx].label, language) || '').toLowerCase();
      return RIGHTS_FIELDS.some(f => lbl.includes(f));
    })
  );

  let otherMetadata = $derived(
    metadata.filter((_md, idx) => {
      const lbl = (getIIIFValue(metadata[idx].label, language) || '').toLowerCase();
      const allCategorized = [...BASIC_FIELDS, ...DATE_FIELDS, ...RIGHTS_FIELDS];
      return !allCategorized.some(f => lbl.includes(f));
    })
  );

  // -- Derived: section visibility flags --

  let hasDateSection = $derived(dateMetadata.length > 0 || !!resource.navDate);

  let hasLocationSection = $derived(
    metadata.some((_md, idx) => isLocationField(getIIIFValue(metadata[idx].label, language) || ''))
  );

  let hasRightsSection = $derived(
    rightsMetadata.length > 0 || !!resource.requiredStatement || !!resource.rights
  );

  let hasOtherSection = $derived(otherMetadata.length > 0);

  // -- State: section open/collapsed --
  let otherSectionOpen = $state(false);

  // -- Helpers --

  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

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
    const newMeta = metadata.filter((_: unknown, i: number) => i !== index);
    onUpdateResource({ metadata: newMeta });
  }

  function addCustomField() {
    onUpdateResource({
      metadata: [
        ...metadata,
        { label: { [language]: ['Custom Field'] }, value: { [language]: [''] } },
      ],
    });
  }

  function getActualIndex(md: { label: Record<string, string[]>; value: Record<string, string[]> }): number {
    return metadata.indexOf(md);
  }
</script>

<div class="space-y-4">
  <!-- ============================================ -->
  <!-- Basic Information                            -->
  <!-- ============================================ -->
  <FormSection title="Basic Information" icon="info" {cx}>
    {#snippet children()}
      <div class="space-y-4">
        <MetadataTextField
          label="Title"
          value={label}
          onchange={(val) => onUpdateResource({ label: { [language]: [val] } })}
          placeholder="Enter a descriptive title"
          {fieldMode}
          hint="The main name or title of this item"
        />

        <MetadataTextField
          label="Description"
          value={summary}
          onchange={(val) => onUpdateResource({ summary: { [language]: [val] } })}
          placeholder="Add a brief description..."
          type="textarea"
          {fieldMode}
          hint="A short summary of what this item contains"
        />

        <!-- Additional basic metadata -->
        {#each basicMetadata as md (getActualIndex(md))}
          {@const lbl = getIIIFValue(md.label, language)}
          {@const val = getIIIFValue(md.value, language)}
          {@const actualIdx = getActualIndex(md)}
          <MetadataTextField
            label={capitalize(lbl)}
            value={val}
            onchange={(newVal) => updateMetadataValue(actualIdx, newVal)}
            placeholder={`Enter ${lbl}...`}
            {fieldMode}
            hint={getDCHint(lbl) || undefined}
          />
        {/each}
      </div>
    {/snippet}
  </FormSection>

  <!-- ============================================ -->
  <!-- Date & Time                                  -->
  <!-- ============================================ -->
  {#if hasDateSection}
    <FormSection title="Date & Time" icon="schedule" {cx}>
      {#snippet children()}
        <div class="space-y-4">
          {#if resource.navDate}
            <MetadataTextField
              label="Navigation Date"
              value={resource.navDate}
              onchange={(val) => onUpdateResource({ navDate: val })}
              type="date"
              {fieldMode}
              hint="Used for timeline and chronological ordering"
            />
          {/if}

          {#each dateMetadata as md (getActualIndex(md))}
            {@const lbl = getIIIFValue(md.label, language)}
            {@const val = getIIIFValue(md.value, language)}
            {@const actualIdx = getActualIndex(md)}
            <MetadataTextField
              label={capitalize(lbl)}
              value={val}
              onchange={(newVal) => updateMetadataValue(actualIdx, newVal)}
              type="date"
              {fieldMode}
            />
          {/each}
        </div>
      {/snippet}
    </FormSection>
  {/if}

  <!-- ============================================ -->
  <!-- Location                                     -->
  <!-- ============================================ -->
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
                    label={capitalize(lbl)}
                    value={val}
                    onchange={(newVal) => updateMetadataValue(idx, newVal)}
                    placeholder="Enter coordinates or location..."
                    {fieldMode}
                  />
                </div>
                <div class="pt-7">
                  <LocationPicker
                    onclick={() => onShowLocationPicker({ index: idx, value: val })}
                    {fieldMode}
                  />
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/snippet}
    </FormSection>
  {/if}

  <!-- ============================================ -->
  <!-- Rights & Licensing                           -->
  <!-- ============================================ -->
  {#if hasRightsSection}
    <FormSection title="Rights & Licensing" icon="shield" {cx}>
      {#snippet children()}
        <div class="space-y-4">
          {#if resource.requiredStatement}
            <MetadataTextField
              label="Attribution"
              value={getIIIFValue(resource.requiredStatement.value, language)}
              onchange={(val) => onUpdateResource({
                requiredStatement: {
                  label: resource.requiredStatement!.label,
                  value: { [language]: [val] },
                },
              })}
              placeholder="e.g., &copy; 2024 Example Institution"
              {fieldMode}
              hint="How this item should be credited"
            />
          {/if}

          {#if resource.rights}
            <MetadataTextField
              label="Rights Statement"
              value={resource.rights}
              onchange={(val) => onUpdateResource({ rights: val })}
              placeholder="e.g., https://creativecommons.org/licenses/by/4.0/"
              {fieldMode}
              hint="URL to license or rights statement"
            />
          {/if}

          {#each rightsMetadata as md (getActualIndex(md))}
            {@const lbl = getIIIFValue(md.label, language)}
            {@const val = getIIIFValue(md.value, language)}
            {@const actualIdx = getActualIndex(md)}
            <MetadataTextField
              label={capitalize(lbl)}
              value={val}
              onchange={(newVal) => updateMetadataValue(actualIdx, newVal)}
              {fieldMode}
            />
          {/each}
        </div>
      {/snippet}
    </FormSection>
  {/if}

  <!-- ============================================ -->
  <!-- Additional Metadata (collapsed by default)   -->
  <!-- ============================================ -->
  {#if hasOtherSection}
    <FormSection title="Additional Metadata" icon="more_horiz" {cx} bind:open={otherSectionOpen}>
      {#snippet children()}
        <div class="space-y-3">
          {#each otherMetadata as md (getActualIndex(md))}
            {@const lbl = getIIIFValue(md.label, language)}
            {@const val = getIIIFValue(md.value, language)}
            {@const actualIdx = getActualIndex(md)}
            {@const dc = getDCHint(lbl)}
            <div
              class={cn(
                'p-3 border group transition-nb',
                fieldMode
                  ? 'bg-nb-black/50 border-nb-black/70 hover:border-nb-black/60'
                  : 'bg-nb-cream border-nb-black/10 hover:border-nb-black/20'
              )}
            >
              <!-- Editable label row -->
              <div class="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={lbl}
                  oninput={(e) => updateMetadataLabel(actualIdx, (e.target as HTMLInputElement).value)}
                  class={cn(
                    'text-sm font-medium bg-transparent border-b border-transparent',
                    'hover:border-nb-black/40 focus:border-nb-orange focus:outline-none flex-1',
                    fieldMode ? 'text-nb-black/20' : 'text-nb-black/70'
                  )}
                  placeholder="Field name"
                />
                {#if dc}
                  <span class={cn(
                    'text-[10px] px-1.5 py-0.5',
                    fieldMode ? 'bg-nb-black/70 text-nb-black/40' : 'bg-nb-black/10 text-nb-black/60'
                  )}>
                    {dc}
                  </span>
                {/if}
                <Button
                  variant="ghost"
                  size="bare"
                  onclick={() => removeMetadataField(actualIdx)}
                  class={cn(
                    'opacity-0 group-hover:opacity-100 transition-nb p-1 hover:bg-nb-red/20 hover:text-nb-red',
                    fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'
                  )}
                  title="Remove field"
                >
                  {#snippet children()}
                    <Icon name="close" class="text-xs" />
                  {/snippet}
                </Button>
              </div>

              <!-- Editable value row -->
              <input
                type="text"
                value={val}
                oninput={(e) => updateMetadataValue(actualIdx, (e.target as HTMLInputElement).value)}
                class={cn(
                  'w-full text-sm bg-transparent border-b border-transparent',
                  'hover:border-nb-black/20 focus:border-nb-orange focus:outline-none',
                  fieldMode ? 'text-nb-black/40' : 'text-nb-black/60'
                )}
                placeholder="Enter value..."
              />
            </div>
          {/each}
        </div>
      {/snippet}
    </FormSection>
  {/if}

  <!-- ============================================ -->
  <!-- Add Custom Field Button                      -->
  <!-- ============================================ -->
  <Button
    variant="ghost"
    size="bare"
    onclick={addCustomField}
    class={cn(
      'w-full py-3 border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-nb',
      fieldMode
        ? 'border-nb-black/70 text-nb-black/50 hover:border-nb-black/60 hover:text-nb-black/40 hover:bg-nb-black/50'
        : 'border-nb-black/20 text-nb-black/50 hover:border-nb-black/40 hover:text-nb-black/60 hover:bg-nb-cream'
    )}
  >
    {#snippet children()}
      <Icon name="add" class="text-sm" />
      Add Custom Field
    {/snippet}
  </Button>
</div>
