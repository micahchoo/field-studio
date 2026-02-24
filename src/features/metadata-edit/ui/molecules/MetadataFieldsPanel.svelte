<!--
  MetadataFieldsPanel -- Collapsible FormSections: Validation, Identity, Metadata,
  Rights & Technical (RightsTechnicalSection atom), Location (GeoEditor).
  Architecture: Molecule (Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  import type { FieldValidation } from '../atoms/ValidatedInput.svelte';
  export type { FieldValidation };

  /** Detect appropriate input type for a metadata key name */
  export function getMetadataInputType(key: string): 'date' | 'location' | 'language' | 'url' | 'rights' | 'text' {
    const k = key.toLowerCase().trim();
    if (['date', 'created', 'modified', 'issued', 'navdate'].includes(k)) return 'date';
    if (['location', 'gps', 'place', 'coverage', 'coordinates'].includes(k)) return 'location';
    if (['language', 'lang'].includes(k)) return 'language';
    if (['url', 'uri', 'link', 'homepage', 'source', 'identifier'].includes(k) || k.startsWith('http')) return 'url';
    if (['rights', 'license'].includes(k)) return 'rights';
    return 'text';
  }

  /** Map SUPPORTED_LANGUAGES to SelectField options format */
  import { SUPPORTED_LANGUAGES } from '@/src/shared/constants/iiif';
  export const LANGUAGE_SELECT_OPTIONS = SUPPORTED_LANGUAGES.map(l => ({
    value: l.code,
    label: l.nativeName ? `${l.label} (${l.nativeName})` : l.label,
  }));
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { ValidationIssue } from '../../lib/inspectorValidation';
  import type { ValidationState } from '../atoms/PropertyLabel.svelte';
  import { getIIIFValue, type IIIFItem } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import FormSection from '@/src/shared/ui/molecules/FormSection.svelte';
  import ValidatedInput from '../atoms/ValidatedInput.svelte';
  import MetadataFieldRenderer from '../atoms/MetadataFieldRenderer.svelte';
  import ValidationIssuesBar from '../atoms/ValidationIssuesBar.svelte';
  import RightsTechnicalSection from '../atoms/RightsTechnicalSection.svelte';
  import LocationPickerModal from './LocationPickerModal.svelte';
  import GeoEditor from './GeoEditor.svelte';

  // TODO: Migrate from @/utils/iiifSchema
  function isPropertyAllowed(_type: string, _field: string): boolean { return true; }

  interface Props {
    resource: IIIFItem;
    onUpdateResource: (r: Partial<IIIFItem>) => void;
    language: string;
    fieldMode: boolean;
    cx: ContextualClassNames;
    label: string;
    summary: string;
    imageUrl: string | null;
    validationIssues: ValidationIssue[];
    fixIssue: (id: string) => Partial<IIIFItem> | null;
    fixAll: () => Partial<IIIFItem> | null;
    labelValidation: FieldValidation;
    summaryValidation: FieldValidation;
    getFieldValidation: (fieldName: string) => FieldValidation;
    updateField: (index: number, key: string, value: string) => void;
    addField: (property: string) => void;
    removeField: (index: number) => void;
    availableProperties: string[];
    t: (key: string) => string;
  }

  let {
    resource, onUpdateResource, language, fieldMode, cx,
    label, summary, imageUrl,
    validationIssues, fixIssue, fixAll,
    labelValidation, summaryValidation, getFieldValidation,
    updateField, addField, removeField,
    availableProperties, t,
  }: Props = $props();

  // --- Local state ---
  let showAddMenu = $state(false);
  let locationPickerIndex = $state<number | null>(null);
  let addMenuEl: HTMLDivElement | undefined = $state();

  // --- Click-outside handler for Add Metadata dropdown ---
  $effect(() => {
    if (!showAddMenu) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (addMenuEl && !addMenuEl.contains(e.target as Node)) {
        showAddMenu = false;
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  });

  // --- Derived ---
  const isAllowed = (field: string) => isPropertyAllowed(resource.type, field);

  let navDateValidation = $derived(getFieldValidation('navDate'));

  let showRightsTechnical = $derived(
    isAllowed('rights') || isAllowed('behavior') || isAllowed('navDate') || isAllowed('viewingDirection') || isAllowed('requiredStatement')
  );

  let hasRightsTechnicalIssues = $derived(
    getFieldValidation('rights').status === 'invalid' ||
    getFieldValidation('behavior').status === 'invalid' ||
    navDateValidation.status === 'invalid'
  );

  let hasNavPlace = $derived(!!resource.navPlace);
  let metadataEntries = $derived(resource.metadata || []);

  // --- Handlers ---
  function handleFixAll() {
    const fixed = fixAll();
    if (fixed) onUpdateResource(fixed);
  }

  function handleFixIssue(issueId: string) {
    const fixed = fixIssue(issueId);
    if (fixed) onUpdateResource(fixed);
  }

  function handleAddField(property: string) {
    addField(property);
    showAddMenu = false;
  }

  function handleLocationPickerSave(val: string) {
    if (locationPickerIndex === null) return;
    const mKey = getIIIFValue(metadataEntries[locationPickerIndex]?.label, language);
    updateField(locationPickerIndex, mKey, val);
    locationPickerIndex = null;
  }
</script>

<div role="tabpanel" class="space-y-4">
  <ValidationIssuesBar
    issues={validationIssues}
    onFixAll={handleFixAll}
    onFixIssue={handleFixIssue}
    {cx}
    {fieldMode}
  />

  <!-- Identity Section (always open) -->
  <FormSection title="Identity" icon="badge" {cx}>
    {#snippet children()}
      {#if imageUrl}
        <div class={cn(
          'aspect-video overflow-hidden border',
          fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-cream border-nb-black/20'
        )}>
          <img src={imageUrl} class="w-full h-full object-contain" alt="Preview" />
        </div>
      {/if}
      <div class="space-y-3">
        <ValidatedInput
          id="inspector-label"
          label={t('Label')}
          value={label}
          onchange={(val) => onUpdateResource({ label: { [language]: [val] } })}
          validation={labelValidation}
          type="text"
          {fieldMode}
        />
        <ValidatedInput
          id="inspector-summary"
          label={t('Summary')}
          value={summary}
          onchange={(val) => onUpdateResource({ summary: { [language]: [val] } })}
          validation={summaryValidation}
          type="textarea"
          rows={3}
          {fieldMode}
        />
      </div>
    {/snippet}
  </FormSection>

  <!-- Custom Metadata Section -->
  <FormSection title={t('Metadata')} icon="list_alt" {cx}>
    {#snippet children()}
      <div class="flex justify-between items-center mb-3">
        <span class={cn('text-[10px] font-bold uppercase tracking-wider', cx.label)}>Fields</span>
        <div class="relative" bind:this={addMenuEl}>
          <Button
            variant="ghost"
            size="bare"
            onclick={() => { showAddMenu = !showAddMenu; }}
            class={cn('text-[10px] font-bold uppercase flex items-center gap-1', cx.accent)}
          >
            {#snippet children()}
              Add <Icon name="add" class="text-[10px]" />
            {/snippet}
          </Button>
          {#if showAddMenu}
            <div class={cn(
              'absolute right-0 top-full mt-1 border shadow-brutal py-2 z-50 min-w-[160px] max-h-[250px] overflow-y-auto',
              fieldMode
                ? 'bg-nb-black border-2 border-nb-yellow'
                : 'bg-nb-white border border-nb-black/20'
            )}>
              {#each availableProperties as p (p)}
                <Button
                  variant="ghost"
                  size="bare"
                  onclick={() => handleAddField(p)}
                  class={cn(
                    'w-full px-3 py-1.5 text-left text-[10px] font-bold',
                    fieldMode
                      ? 'text-nb-yellow/80 hover:bg-nb-yellow/20'
                      : 'text-nb-black/60 hover:bg-nb-blue/10'
                  )}
                >
                  {#snippet children()}{p}{/snippet}
                </Button>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="space-y-2">
        {#each metadataEntries as md, idx (idx)}
          {@const mKey = getIIIFValue(md.label, language)}
          {@const mVal = getIIIFValue(md.value, language)}
          <MetadataFieldRenderer
            metadataKey={mKey}
            metadataValue={mVal}
            inputType={getMetadataInputType(mKey)}
            onKeyChange={(val) => updateField(idx, val, mVal)}
            onValueChange={(val) => updateField(idx, mKey, val)}
            onRemove={() => removeField(idx)}
            onLocationPick={() => { locationPickerIndex = idx; }}
            {cx}
            {fieldMode}
          />
        {/each}
      </div>

      {#if locationPickerIndex !== null}
        <LocationPickerModal
          isOpen={true}
          initialValue={getIIIFValue(metadataEntries[locationPickerIndex]?.value, language) || ''}
          onSave={handleLocationPickerSave}
          onClose={() => { locationPickerIndex = null; }}
        />
      {/if}
    {/snippet}
  </FormSection>

  <!-- Rights & Technical Section (collapsed by default) -->
  {#if showRightsTechnical}
    <FormSection title="Rights & Technical" icon="shield" open={false} {cx}>
      {#snippet badge()}
        {#if hasRightsTechnicalIssues}
          <span class="w-2 h-2 rounded-full bg-nb-red shrink-0" title="Has validation issues"></span>
        {/if}
      {/snippet}
      {#snippet children()}
        <RightsTechnicalSection
          {resource}
          {onUpdateResource}
          navDateValidation={navDateValidation as ValidationState}
          {cx}
          {fieldMode}
          {isAllowed}
        />
      {/snippet}
    </FormSection>
  {/if}

  <!-- Location Section (collapsed, conditional) -->
  {#if hasNavPlace}
    <FormSection title="Location" icon="place" open={false} {cx}>
      {#snippet children()}
        <div class="flex justify-between items-center mb-2">
          <span class={cn('text-[10px] font-bold uppercase tracking-wider', cx.label)}>Geo Location</span>
          <Button
            variant="ghost"
            size="bare"
            onclick={() => onUpdateResource({ navPlace: undefined } as Partial<IIIFItem>)}
            class="text-[10px] text-nb-red hover:text-nb-red font-bold uppercase"
          >
            {#snippet children()}Remove{/snippet}
          </Button>
        </div>
        <div class={cn('border overflow-hidden', fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/20')}>
          <GeoEditor
            item={resource}
            onChange={(navPlace) => onUpdateResource({ navPlace: navPlace as Partial<IIIFItem>['navPlace'] })}
            {fieldMode}
          />
        </div>
      {/snippet}
    </FormSection>
  {/if}
</div>
