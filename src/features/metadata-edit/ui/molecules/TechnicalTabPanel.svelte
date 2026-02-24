<!--
  TechnicalTabPanel -- Panel for editing technical IIIF properties.
  React source: src/features/metadata-edit/ui/molecules/TechnicalTabPanel.tsx (391 lines)
  Architecture: Molecule (composes PropertyInput, PropertyLabel, RightsSelector,
    ViewingDirectionSelector, BehaviorSelector, BehaviorTag atoms. Rule 5.D: cx + fieldMode)

  FEATURES:
  - Progressive disclosure: Basic vs Advanced properties with localStorage persistence
  - Navigation Date, Rights Statement, Viewing Direction, Behaviors (basic)
  - Linking Properties: Provider, Homepage, Rendering, SeeAlso, Required Statement, Start Canvas
  - Advanced Properties: Part Of, Thumbnail URL with preview
-->
<script module lang="ts">
  // Storage key for advanced mode preference
  const ADVANCED_MODE_KEY = 'fieldstudio-inspector-advanced-mode';

  // Field definitions for progressive disclosure
  const BASIC_FIELDS = ['navDate', 'rights'] as const;
  const ADVANCED_FIELDS = ['viewingDirection', 'behavior', 'logo', 'homepage', 'seeAlso', 'rendering', 'service'] as const;
</script>

<script lang="ts">
  import type { IIIFItem, IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import PropertyInput from '../atoms/PropertyInput.svelte';
  import PropertyLabel from '../atoms/PropertyLabel.svelte';
  import RightsSelector from '../atoms/RightsSelector.svelte';
  import ViewingDirectionSelector from '../atoms/ViewingDirectionSelector.svelte';
  import BehaviorSelector from '../atoms/BehaviorSelector.svelte';
  import BehaviorTag from '../atoms/BehaviorTag.svelte';
  import AgentEditor from '@/src/shared/ui/molecules/AgentEditor.svelte';
  import LinkListEditor from '@/src/shared/ui/molecules/LinkListEditor.svelte';
  import StartPropertyEditor from '../atoms/StartPropertyEditor.svelte';
  import { BEHAVIOR_OPTIONS, getConflictingBehaviors } from '@/src/shared/constants/iiif';

  interface Props {
    /** Resource being edited */
    resource: IIIFItem;
    /** Available canvases for start property (Manifests) */
    canvases?: IIIFCanvas[];
    /** Contextual styles from parent */
    cx: ContextualClassNames;
    /** Field mode flag */
    fieldMode: boolean;
    /** Called when resource is updated */
    onUpdateResource: (r: Partial<IIIFItem>) => void;
  }

  let {
    resource,
    canvases = [],
    cx,
    fieldMode,
    onUpdateResource,
  }: Props = $props();

  // --- State ---
  let showAdvanced = $state(loadAdvancedPref());

  function loadAdvancedPref(): boolean {
    try {
      return localStorage.getItem(ADVANCED_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  // Persist advanced mode preference
  $effect(() => {
    try {
      localStorage.setItem(ADVANCED_MODE_KEY, String(showAdvanced));
    } catch {
      // Ignore storage errors
    }
  });

  // --- Derived values ---
  let isCollection = $derived(resource.type === 'Collection');
  let isManifest = $derived(resource.type === 'Manifest');

  /** Map resource.type to BEHAVIOR_OPTIONS key (uppercase) */
  let behaviorOptions = $derived.by(() => {
    const key = resource.type?.toUpperCase() as keyof typeof BEHAVIOR_OPTIONS;
    return (BEHAVIOR_OPTIONS[key] as readonly string[] | undefined)
      ? [...BEHAVIOR_OPTIONS[key]]
      : [];
  });

  let activeBehaviors = $derived(resource.behavior || []);

  // --- Style helpers ---
  let hintClasses = $derived(
    cn('text-[10px] mt-1', fieldMode ? 'text-nb-black/50' : 'text-nb-black/40')
  );

  let sectionBorderClasses = $derived(
    cn('pt-4 border-t', fieldMode ? 'border-nb-black' : 'border-nb-black/20')
  );

  let toggleButtonClasses = $derived(
    cn(
      'flex items-center gap-2 text-sm font-medium w-full',
      fieldMode
        ? 'text-nb-black/30 hover:text-nb-black/10'
        : 'text-nb-black/60 hover:text-nb-black'
    )
  );

  let behaviorSummaryClasses = $derived(
    cn(
      'mt-3 p-2 border',
      fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/10'
    )
  );

  let behaviorSummaryLabelClasses = $derived(
    cn(
      'text-[10px] uppercase font-bold mb-1',
      fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'
    )
  );

  // --- Handlers ---
  function handleNavDateChange(val: string) {
    onUpdateResource({ navDate: val ? new Date(val).toISOString() : undefined });
  }

  function handleRightsChange(val: string) {
    onUpdateResource({ rights: val });
  }

  function handleViewingDirectionChange(val: string) {
    onUpdateResource({ viewingDirection: val as IIIFItem['viewingDirection'] });
  }

  function handleBehaviorChange(selected: string[]) {
    onUpdateResource({ behavior: selected });
  }

  function handleRequiredStatementLabelChange(val: string) {
    const current = resource.requiredStatement || { label: { none: [''] }, value: { none: [''] } };
    onUpdateResource({
      requiredStatement: { ...current, label: { none: [val] } },
    });
  }

  function handleRequiredStatementValueChange(val: string) {
    const current = resource.requiredStatement || { label: { none: ['Attribution'] }, value: { none: [''] } };
    onUpdateResource({
      requiredStatement: { ...current, value: { none: [val] } },
    });
  }

  function handlePartOfChange(val: string) {
    if (val.trim()) {
      onUpdateResource({ partOf: [{ id: val.trim(), type: 'Collection' }] } as Partial<IIIFItem>);
    } else {
      onUpdateResource({ partOf: undefined } as Partial<IIIFItem>);
    }
  }

  function handleThumbnailChange(val: string) {
    if (val.trim()) {
      onUpdateResource({
        thumbnail: [{ id: val.trim(), type: 'Image', format: 'image/jpeg' }],
      } as Partial<IIIFItem>);
    } else {
      onUpdateResource({ thumbnail: undefined } as Partial<IIIFItem>);
    }
  }

  function handleThumbnailError(e: Event) {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
  }

  function toggleAdvanced() {
    showAdvanced = !showAdvanced;
  }
</script>

<div class="space-y-6">
  <!-- === BASIC PROPERTIES === -->

  <!-- Navigation Date -->
  <div>
    <PropertyLabel
      label="Navigation Date"
      dcHint="navDate"
      {fieldMode}
      {cx}
    />
    <PropertyInput
      type="datetime-local"
      value={resource.navDate ? resource.navDate.slice(0, 16) : ''}
      onchange={handleNavDateChange}
      {cx}
      {fieldMode}
    />
    <p class={hintClasses}>
      Used for Timeline views.
    </p>
  </div>

  <!-- Rights Statement -->
  <div>
    <PropertyLabel
      label="Rights Statement"
      dcHint="dc:rights"
      {fieldMode}
      {cx}
    />
    <RightsSelector
      value={resource.rights || ''}
      onchange={handleRightsChange}
      {cx}
      {fieldMode}
      showLabel={false}
    />
  </div>

  <!-- Viewing Direction (only for Manifest/Collection) -->
  {#if isManifest || isCollection}
    <div>
      <PropertyLabel
        label="Viewing Direction"
        dcHint="viewingDirection"
        {fieldMode}
        {cx}
      />
      <ViewingDirectionSelector
        value={resource.viewingDirection ?? 'left-to-right'}
        onchange={handleViewingDirectionChange}
        {cx}
        {fieldMode}
        showLabel={false}
      />
    </div>
  {/if}

  <!-- Behaviors -->
  <div>
    <PropertyLabel
      label="Behaviors"
      dcHint="behavior"
      {fieldMode}
      {cx}
    />
    <BehaviorSelector
      options={behaviorOptions}
      selected={activeBehaviors}
      onchange={handleBehaviorChange}
      getConflicts={getConflictingBehaviors}
      {fieldMode}
      label=""
      showSummary={false}
    />

    <!-- Active Behaviors Summary -->
    {#if activeBehaviors.length > 0}
      <div class={behaviorSummaryClasses}>
        <div class={behaviorSummaryLabelClasses}>
          Active Behaviors
        </div>
        <div class="flex flex-wrap gap-1">
          {#each activeBehaviors as b (b)}
            <BehaviorTag
              behavior={b}
              {cx}
              {fieldMode}
            />
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- === ADVANCED PROPERTIES TOGGLE === -->
  <div class={sectionBorderClasses}>
    <Button
      variant="ghost"
      size="bare"
      onclick={toggleAdvanced}
      class={toggleButtonClasses}
      aria-expanded={showAdvanced}
      aria-controls="advanced-properties"
    >
      {#snippet icon()}
        <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} class="text-lg" />
      {/snippet}
      {#snippet children()}
        {showAdvanced ? 'Hide Advanced Properties' : 'Show Advanced Properties'}
      {/snippet}
    </Button>
  </div>

  <!-- === LINKING PROPERTIES (Standard+ level) === -->
  <div class={cn('space-y-6', sectionBorderClasses)}>
    <!-- Provider -->
    <div>
      <PropertyLabel
        label="Provider"
        dcHint="provider"
        {fieldMode}
        {cx}
      />
      <AgentEditor
        value={(resource.provider || []) as import('@/src/shared/ui/molecules/AgentEditor.svelte').AgentItem[]}
        onChange={(agents) => onUpdateResource({ provider: agents as typeof resource.provider })}
        {cx}
        {fieldMode}
      />
    </div>

    <!-- Homepage -->
    <div>
      <PropertyLabel
        label="Homepage"
        dcHint="homepage"
        {fieldMode}
        {cx}
      />
      <LinkListEditor
        value={(resource.homepage || []) as import('@/src/shared/ui/molecules/LinkListEditor.svelte').LinkItem[]}
        onChange={(links) => onUpdateResource({ homepage: links as typeof resource.homepage })}
        resourceType="homepage"
        {fieldMode}
        {cx}
      />
    </div>

    <!-- Rendering (Downloads) -->
    <div>
      <PropertyLabel
        label="Rendering"
        dcHint="rendering"
        {fieldMode}
        {cx}
      />
      <LinkListEditor
        value={(resource.rendering || []) as import('@/src/shared/ui/molecules/LinkListEditor.svelte').LinkItem[]}
        onChange={(links) => onUpdateResource({ rendering: links as typeof resource.rendering })}
        resourceType="rendering"
        {fieldMode}
        {cx}
      />
    </div>

    <!-- See Also -->
    <div>
      <PropertyLabel
        label="See Also"
        dcHint="seeAlso"
        {fieldMode}
        {cx}
      />
      <LinkListEditor
        value={(resource.seeAlso || []) as import('@/src/shared/ui/molecules/LinkListEditor.svelte').LinkItem[]}
        onChange={(links) => onUpdateResource({ seeAlso: links as typeof resource.seeAlso })}
        resourceType="seeAlso"
        {fieldMode}
        {cx}
      />
    </div>

    <!-- Required Statement -->
    <div>
      <PropertyLabel
        label="Required Statement"
        dcHint="requiredStatement"
        {fieldMode}
        {cx}
      />
      <div class="space-y-2">
        <PropertyInput
          type="text"
          value={getIIIFValue(resource.requiredStatement?.label)}
          onchange={handleRequiredStatementLabelChange}
          {cx}
          {fieldMode}
          placeholder="Label (e.g., Attribution)"
        />
        <PropertyInput
          type="text"
          value={getIIIFValue(resource.requiredStatement?.value)}
          onchange={handleRequiredStatementValueChange}
          {cx}
          {fieldMode}
          placeholder="Value (e.g., Provided by Example Museum)"
        />
      </div>
    </div>

    <!-- Start Canvas (Manifests only) -->
    {#if isManifest && canvases.length > 0}
      <div>
        <PropertyLabel
          label="Start Canvas"
          dcHint="start"
          {fieldMode}
          {cx}
        />
        <StartPropertyEditor
          value={resource.start as import('../atoms/StartPropertyEditor.svelte').StartValue | undefined}
          {canvases}
          onChange={(start) => onUpdateResource({ start: start as typeof resource.start })}
          {fieldMode}
        />
      </div>
    {/if}
  </div>

  <!-- === ADVANCED PROPERTIES TOGGLE (repeated before advanced section) === -->
  <div class={sectionBorderClasses}>
    <Button
      variant="ghost"
      size="bare"
      onclick={toggleAdvanced}
      class={toggleButtonClasses}
      aria-expanded={showAdvanced}
      aria-controls="advanced-properties"
    >
      {#snippet icon()}
        <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} class="text-lg" />
      {/snippet}
      {#snippet children()}
        {showAdvanced ? 'Hide Advanced Properties' : 'Show Advanced Properties'}
      {/snippet}
    </Button>
  </div>

  <!-- === ADVANCED PROPERTIES === -->
  {#if showAdvanced}
    <div
      id="advanced-properties"
      class={cn(
        'space-y-6 pt-2 pb-4',
        fieldMode ? 'border-b border-nb-black' : 'border-b border-nb-black/20'
      )}
    >
      <!-- Part Of -->
      <div>
        <PropertyLabel
          label="Part Of"
          dcHint="partOf"
          {fieldMode}
          {cx}
        />
        <PropertyInput
          type="text"
          value={resource.partOf?.[0]?.id || ''}
          onchange={handlePartOfChange}
          {cx}
          {fieldMode}
          placeholder="Parent collection URI"
        />
      </div>

      <!-- Thumbnail URL -->
      <div>
        <PropertyLabel
          label="Thumbnail"
          dcHint="thumbnail"
          {fieldMode}
          {cx}
        />
        <PropertyInput
          type="url"
          value={resource.thumbnail?.[0]?.id || ''}
          onchange={handleThumbnailChange}
          {cx}
          {fieldMode}
          placeholder="https://example.com/thumb.jpg"
        />
        {#if resource.thumbnail?.[0]?.id}
          <div class="mt-2">
            <img
              src={resource.thumbnail[0].id}
              alt="Thumbnail preview"
              class="h-16 border border-nb-black/20 object-cover"
              onerror={handleThumbnailError}
            />
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
