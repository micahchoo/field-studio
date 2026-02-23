<!--
  MetadataFieldsPanel -- Full metadata tab content organized into collapsible FormSections:
  1. Validation Status bar (issues with Fix buttons)
  2. Identity Section (always open): preview image, label, summary
  3. Custom Metadata Section (open): add dropdown, type-aware field list, remove buttons
  4. Rights & Technical Section (collapsed): rights, behaviors, navDate, viewingDirection, requiredStatement
  5. Location Section (collapsed, conditional): GeoEditor

  React source: src/features/metadata-edit/ui/molecules/MetadataFieldsPanel.tsx (465 lines)
  Architecture: Molecule (composes FormSection + atoms, click-outside $effect, Rule 5.D: cx + fieldMode)
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
  import { getIIIFValue, type IIIFItem, type IIIFManifest, isManifest } from '@/src/shared/types';
  import { BEHAVIOR_OPTIONS, getConflictingBehaviors } from '@/src/shared/constants/iiif';
  import { cn } from '@/src/shared/lib/cn';

  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import FormSection from '@/src/shared/ui/molecules/FormSection.svelte';
  import SelectField from '@/src/shared/ui/molecules/SelectField.svelte';

  import ValidatedInput from '../atoms/ValidatedInput.svelte';
  import DebouncedField from '../atoms/DebouncedField.svelte';
  import RightsSelector from '../atoms/RightsSelector.svelte';
  import BehaviorSelector from '../atoms/BehaviorSelector.svelte';
  import PropertyInput from '../atoms/PropertyInput.svelte';
  import PropertyLabel, { type ValidationState } from '../atoms/PropertyLabel.svelte';
  import ViewingDirectionSelector from '../atoms/ViewingDirectionSelector.svelte';
  import LocationPickerModal from './LocationPickerModal.svelte';

  // TODO: Migrate from @/utils/iiifSchema
  function isPropertyAllowed(_type: string, _field: string): boolean { return true; }
  // TODO: Migrate from @/utils/iiifBehaviors
  function suggestBehaviors(_type: string, _characteristics: Record<string, boolean>): string[] { return []; }

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
    resource,
    onUpdateResource,
    language,
    fieldMode,
    cx,
    label,
    summary,
    imageUrl,
    validationIssues,
    fixIssue,
    fixAll,
    labelValidation,
    summaryValidation,
    getFieldValidation,
    updateField,
    addField,
    removeField,
    availableProperties,
    t,
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

  let rightsValidation = $derived(getFieldValidation('rights'));
  let behaviorValidation = $derived(getFieldValidation('behavior'));
  let navDateValidation = $derived(getFieldValidation('navDate'));

  let showRightsTechnical = $derived(
    isAllowed('rights') || isAllowed('behavior') || isAllowed('navDate') || isAllowed('viewingDirection') || isAllowed('requiredStatement')
  );

  let hasRightsTechnicalIssues = $derived(
    rightsValidation.status === 'invalid' || behaviorValidation.status === 'invalid' || navDateValidation.status === 'invalid'
  );

  let hasNavPlace = $derived(!!(resource as unknown as Record<string, unknown>).navPlace);

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

  function handleSuggestBehaviors() {
    if (!resource) return;
    const characteristics = {
      hasDuration: !!(resource as unknown as Record<string, unknown>).duration,
      hasPageSequence: isManifest(resource) && (resource as IIIFManifest).items?.length > 1,
      hasWidth: !!(resource as unknown as Record<string, unknown>).width,
      hasHeight: !!(resource as unknown as Record<string, unknown>).height,
    };
    const suggestions = suggestBehaviors(resource.type, characteristics);
    if (suggestions.length > 0) {
      onUpdateResource({ behavior: Array.from(new Set([...(resource.behavior || []), ...suggestions])) });
    }
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

  function handleLocationPickerClose() {
    locationPickerIndex = null;
  }
</script>

<div role="tabpanel" class="space-y-4">
  <!-- Validation Status -->
  {#if validationIssues.length > 0}
    <div class={cn('p-3 border text-[10px] space-y-2', cx.warningBg)}>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 font-bold uppercase tracking-wider text-nb-orange">
          <Icon name="report_problem" class="text-sm" />
          <span>Issues ({validationIssues.length})</span>
        </div>
        {#if validationIssues.some(i => i.autoFixable)}
          <Button
            variant="ghost"
            size="bare"
            onclick={handleFixAll}
            class={cn(
              'text-[8px] font-bold uppercase px-2 py-1',
              fieldMode ? 'bg-nb-green text-nb-green' : 'bg-nb-green/20 text-nb-green'
            )}
          >
            {#snippet children()}Fix All{/snippet}
          </Button>
        {/if}
      </div>
      {#each validationIssues as issue (issue.id)}
        <div class={cn(
          'flex items-start gap-2 text-[10px]',
          issue.severity === 'error'
            ? 'text-nb-red'
            : (fieldMode ? 'text-nb-yellow/40' : 'text-nb-orange')
        )}>
          <span class="shrink-0">{issue.title}</span>
          {#if issue.autoFixable}
            <Button
              variant="ghost"
              size="bare"
              onclick={() => handleFixIssue(issue.id)}
              class="text-[8px] text-nb-green hover:underline"
            >
              {#snippet children()}Fix{/snippet}
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

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

  <!-- Custom Metadata Section (open by default) -->
  <FormSection title={t('Metadata')} icon="list_alt" {cx}>
    {#snippet children()}
      <div class="flex justify-between items-center mb-3">
        <label class={cn('text-[10px] font-bold uppercase tracking-wider', cx.label)}>Fields</label>
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
          {@const inputType = getMetadataInputType(mKey)}
          <div class={cn(
            'group relative p-3 border',
            fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/20'
          )}>
            <DebouncedField
              class={cn(
                'w-full text-[10px] font-bold uppercase bg-transparent outline-none mb-1 border-b',
                fieldMode ? 'text-nb-yellow/60 border-nb-yellow/30' : 'text-nb-black/50 border-transparent'
              )}
              value={mKey}
              onchange={(val) => updateField(idx, val, mVal)}
            />
            {#if inputType === 'date'}
              <PropertyInput
                type="datetime-local"
                value={mVal ? mVal.slice(0, 16) : ''}
                onchange={(val) => updateField(idx, mKey, val ? new Date(val).toISOString() : '')}
                {fieldMode}
                cx={cx}
              />
            {:else if inputType === 'location'}
              <PropertyInput
                type="text"
                value={mVal}
                onchange={(val) => updateField(idx, mKey, val)}
                isLocationField
                onLocationPick={() => { locationPickerIndex = idx; }}
                {fieldMode}
                cx={cx}
                placeholder="lat, lng or place name"
              />
            {:else if inputType === 'language'}
              <SelectField
                value={mVal}
                onchange={(val) => updateField(idx, mKey, val)}
                options={LANGUAGE_SELECT_OPTIONS}
                {cx}
              />
            {:else if inputType === 'url'}
              <PropertyInput
                type="url"
                value={mVal}
                onchange={(val) => updateField(idx, mKey, val)}
                {fieldMode}
                cx={cx}
                placeholder="https://..."
              />
            {:else if inputType === 'rights'}
              <RightsSelector
                value={mVal}
                onchange={(val) => updateField(idx, mKey, val)}
                {fieldMode}
                showLabel={false}
              />
            {:else}
              <DebouncedField
                class={cn('w-full text-xs bg-transparent outline-none', fieldMode ? 'text-white' : 'text-nb-black')}
                value={mVal}
                onchange={(val) => updateField(idx, mKey, val)}
              />
            {/if}
            <Button
              variant="ghost"
              size="bare"
              onclick={() => removeField(idx)}
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
        {/each}
      </div>

      <!-- Location Picker Modal for metadata fields -->
      {#if locationPickerIndex !== null}
        <LocationPickerModal
          isOpen={true}
          initialValue={getIIIFValue(metadataEntries[locationPickerIndex]?.value, language) || ''}
          onSave={handleLocationPickerSave}
          onClose={handleLocationPickerClose}
        />
      {/if}
    {/snippet}
  </FormSection>

  <!-- Rights & Technical Section (collapsed by default) -->
  {#if showRightsTechnical}
    <FormSection
      title="Rights & Technical"
      icon="shield"
      open={false}
      {cx}
    >
      {#snippet badge()}
        {#if hasRightsTechnicalIssues}
          <span class="w-2 h-2 rounded-full bg-nb-red shrink-0" title="Has validation issues"></span>
        {/if}
      {/snippet}
      {#snippet children()}
        <!-- Rights -->
        {#if isAllowed('rights')}
          <div>
            <RightsSelector
              value={resource.rights || ''}
              onchange={(val) => onUpdateResource({ rights: val || undefined })}
              {fieldMode}
            />
          </div>
        {/if}

        <!-- Behaviors -->
        {#if isAllowed('behavior')}
          <div>
            <div class="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="bare"
                onclick={handleSuggestBehaviors}
                class={cn(
                  'text-[9px] font-bold uppercase px-2 py-1 border',
                  fieldMode ? 'border-nb-yellow/30 text-nb-yellow' : 'border-nb-black/20 text-nb-blue'
                )}
              >
                {#snippet children()}Auto-Suggest{/snippet}
              </Button>
            </div>
            <BehaviorSelector
              options={[...(BEHAVIOR_OPTIONS[resource.type.toUpperCase() as keyof typeof BEHAVIOR_OPTIONS] ?? [])]}
              selected={resource.behavior || []}
              onchange={(selected) => onUpdateResource({ behavior: selected.length ? selected : undefined })}
              getConflicts={getConflictingBehaviors}
              {fieldMode}
            />
          </div>
        {/if}

        <!-- Navigation Date -->
        {#if isAllowed('navDate') && resource.navDate !== undefined}
          <div>
            <PropertyLabel label="Navigation Date" dcHint="navDate" {fieldMode} cx={cx} validation={navDateValidation as ValidationState} />
            <PropertyInput
              type="datetime-local"
              value={resource.navDate ? resource.navDate.slice(0, 16) : ''}
              onchange={(val) => onUpdateResource({ navDate: val ? new Date(val).toISOString() : undefined })}
              {fieldMode}
              cx={cx}
            />
          </div>
        {/if}

        <!-- Viewing Direction -->
        {#if isAllowed('viewingDirection') && resource.viewingDirection !== undefined}
          <div>
            <ViewingDirectionSelector
              value={resource.viewingDirection || 'left-to-right'}
              onchange={(val) => onUpdateResource({ viewingDirection: val as typeof resource.viewingDirection })}
              {fieldMode}
            />
          </div>
        {/if}

        <!-- Required Statement -->
        {#if isAllowed('requiredStatement') && resource.requiredStatement !== undefined}
          <div>
            <PropertyLabel
              label="Required Statement"
              dcHint="requiredStatement"
              {fieldMode}
              cx={cx}
            />
            <div class="space-y-2 mt-1">
              <PropertyInput
                type="text"
                placeholder="Label (e.g., Attribution)"
                value={getIIIFValue(resource.requiredStatement?.label) || ''}
                onchange={(val) => {
                  const current = resource.requiredStatement || { label: { none: [''] }, value: { none: [''] } };
                  onUpdateResource({ requiredStatement: { ...current, label: { none: [val] } } });
                }}
                {fieldMode}
                cx={cx}
              />
              <PropertyInput
                type="text"
                placeholder="Value (e.g., Provided by Example Museum)"
                value={getIIIFValue(resource.requiredStatement?.value) || ''}
                onchange={(val) => {
                  const current = resource.requiredStatement || { label: { none: ['Attribution'] }, value: { none: [''] } };
                  onUpdateResource({ requiredStatement: { ...current, value: { none: [val] } } });
                }}
                {fieldMode}
                cx={cx}
              />
            </div>
          </div>
        {/if}
      {/snippet}
    </FormSection>
  {/if}

  <!-- Location Section (collapsed, conditional) -->
  {#if hasNavPlace}
    <FormSection title="Location" icon="place" open={false} {cx}>
      {#snippet children()}
        <div class="flex justify-between items-center mb-2">
          <label class={cn('text-[10px] font-bold uppercase tracking-wider', cx.label)}>Geo Location</label>
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
          <!-- TODO: GeoEditor not yet migrated to Svelte -->
          <div class="h-[150px] flex items-center justify-center text-xs text-nb-black/40 bg-nb-cream">
            <Icon name="place" class="text-2xl mr-2" />
            GeoEditor (pending migration)
          </div>
        </div>
      {/snippet}
    </FormSection>
  {/if}
</div>
