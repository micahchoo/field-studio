<!--
  TechnicalTabPanel -- Panel for editing technical IIIF properties.
  Progressive disclosure: Basic vs Advanced properties with localStorage persistence.
  Architecture: Molecule (composes LinkingPropertiesSection + AdvancedPropertiesSection atoms.
    Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  const ADVANCED_MODE_KEY = 'fieldstudio-inspector-advanced-mode';
</script>

<script lang="ts">
  import type { IIIFItem, IIIFCanvas } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import { BEHAVIOR_OPTIONS, getConflictingBehaviors } from '@/src/shared/constants/iiif';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import PropertyInput from '../atoms/PropertyInput.svelte';
  import PropertyLabel from '../atoms/PropertyLabel.svelte';
  import RightsSelector from '../atoms/RightsSelector.svelte';
  import ViewingDirectionSelector from '../atoms/ViewingDirectionSelector.svelte';
  import BehaviorSelector from '../atoms/BehaviorSelector.svelte';
  import BehaviorTag from '../atoms/BehaviorTag.svelte';
  import LinkingPropertiesSection from '../atoms/LinkingPropertiesSection.svelte';
  import AdvancedPropertiesSection from '../atoms/AdvancedPropertiesSection.svelte';

  interface Props {
    resource: IIIFItem;
    canvases?: IIIFCanvas[];
    cx: ContextualClassNames;
    fieldMode: boolean;
    onUpdateResource: (r: Partial<IIIFItem>) => void;
  }

  let {
    resource, canvases = [], cx, fieldMode, onUpdateResource,
  }: Props = $props();

  // --- State ---
  let showAdvanced = $state(loadAdvancedPref());

  function loadAdvancedPref(): boolean {
    try { return localStorage.getItem(ADVANCED_MODE_KEY) === 'true'; }
    catch { return false; }
  }

  $effect(() => {
    try { localStorage.setItem(ADVANCED_MODE_KEY, String(showAdvanced)); }
    catch { /* Ignore storage errors */ }
  });

  // --- Derived ---
  let isCollection = $derived(resource.type === 'Collection');
  let isManifestType = $derived(resource.type === 'Manifest');

  let behaviorOptions = $derived.by(() => {
    const key = resource.type?.toUpperCase() as keyof typeof BEHAVIOR_OPTIONS;
    return (BEHAVIOR_OPTIONS[key] as readonly string[] | undefined) ? [...BEHAVIOR_OPTIONS[key]] : [];
  });

  let activeBehaviors = $derived(resource.behavior || []);

  // --- Style helpers ---
  let hintClasses = $derived(cn('text-[10px] mt-1', fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'));
  let sectionBorderClasses = $derived(cn('pt-4 border-t', fieldMode ? 'border-nb-black' : 'border-nb-black/20'));
  let toggleButtonClasses = $derived(cn(
    'flex items-center gap-2 text-sm font-medium w-full',
    fieldMode ? 'text-nb-black/30 hover:text-nb-black/10' : 'text-nb-black/60 hover:text-nb-black'
  ));
  let behaviorSummaryClasses = $derived(cn(
    'mt-3 p-2 border',
    fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/10'
  ));
  let behaviorSummaryLabelClasses = $derived(cn(
    'text-[10px] uppercase font-bold mb-1',
    fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'
  ));

  function toggleAdvanced() { showAdvanced = !showAdvanced; }
</script>

<div class="space-y-6">
  <!-- Navigation Date -->
  <div>
    <PropertyLabel label="Navigation Date" dcHint="navDate" {fieldMode} {cx} />
    <PropertyInput
      type="datetime-local"
      value={resource.navDate ? resource.navDate.slice(0, 16) : ''}
      onchange={(val) => onUpdateResource({ navDate: val ? new Date(val).toISOString() : undefined })}
      {cx} {fieldMode}
    />
    <p class={hintClasses}>Used for Timeline views.</p>
  </div>

  <!-- Rights Statement -->
  <div>
    <PropertyLabel label="Rights Statement" dcHint="dc:rights" {fieldMode} {cx} />
    <RightsSelector
      value={resource.rights || ''}
      onchange={(val) => onUpdateResource({ rights: val })}
      {cx} {fieldMode} showLabel={false}
    />
  </div>

  <!-- Viewing Direction (Manifest/Collection only) -->
  {#if isManifestType || isCollection}
    <div>
      <PropertyLabel label="Viewing Direction" dcHint="viewingDirection" {fieldMode} {cx} />
      <ViewingDirectionSelector
        value={resource.viewingDirection ?? 'left-to-right'}
        onchange={(val) => onUpdateResource({ viewingDirection: val as IIIFItem['viewingDirection'] })}
        {cx} {fieldMode} showLabel={false}
      />
    </div>
  {/if}

  <!-- Behaviors -->
  <div>
    <PropertyLabel label="Behaviors" dcHint="behavior" {fieldMode} {cx} />
    <BehaviorSelector
      options={behaviorOptions} selected={activeBehaviors}
      onchange={(selected) => onUpdateResource({ behavior: selected })}
      getConflicts={getConflictingBehaviors} {fieldMode} label="" showSummary={false}
    />
    {#if activeBehaviors.length > 0}
      <div class={behaviorSummaryClasses}>
        <div class={behaviorSummaryLabelClasses}>Active Behaviors</div>
        <div class="flex flex-wrap gap-1">
          {#each activeBehaviors as b (b)}
            <BehaviorTag behavior={b} {cx} {fieldMode} />
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Advanced Toggle -->
  <div class={sectionBorderClasses}>
    <Button
      variant="ghost" size="bare" onclick={toggleAdvanced}
      class={toggleButtonClasses} aria-expanded={showAdvanced} aria-controls="advanced-properties"
    >
      {#snippet icon()}<Icon name={showAdvanced ? 'expand_less' : 'expand_more'} class="text-lg" />{/snippet}
      {#snippet children()}{showAdvanced ? 'Hide Advanced Properties' : 'Show Advanced Properties'}{/snippet}
    </Button>
  </div>

  <!-- Linking Properties -->
  <div class={cn('space-y-6', sectionBorderClasses)}>
    <LinkingPropertiesSection
      {resource} {canvases} isManifest={isManifestType}
      {onUpdateResource} {cx} {fieldMode}
    />
  </div>

  <!-- Advanced Toggle (repeated) -->
  <div class={sectionBorderClasses}>
    <Button
      variant="ghost" size="bare" onclick={toggleAdvanced}
      class={toggleButtonClasses} aria-expanded={showAdvanced} aria-controls="advanced-properties"
    >
      {#snippet icon()}<Icon name={showAdvanced ? 'expand_less' : 'expand_more'} class="text-lg" />{/snippet}
      {#snippet children()}{showAdvanced ? 'Hide Advanced Properties' : 'Show Advanced Properties'}{/snippet}
    </Button>
  </div>

  <!-- Advanced Properties -->
  {#if showAdvanced}
    <AdvancedPropertiesSection {resource} {onUpdateResource} {cx} {fieldMode} />
  {/if}
</div>
