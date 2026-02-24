<!--
  RightsTechnicalSection -- Rights, Behaviors, NavDate, ViewingDirection, RequiredStatement.
  Extracted from MetadataFieldsPanel molecule.
  Architecture: Atom (composes RightsSelector, BehaviorSelector, PropertyInput, PropertyLabel,
    ViewingDirectionSelector)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { type IIIFItem, isManifest, isCanvas, getIIIFValue } from '@/src/shared/types';
  import { BEHAVIOR_OPTIONS, getConflictingBehaviors } from '@/src/shared/constants/iiif';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import RightsSelector from './RightsSelector.svelte';
  import BehaviorSelector from './BehaviorSelector.svelte';
  import PropertyInput from './PropertyInput.svelte';
  import PropertyLabel, { type ValidationState } from './PropertyLabel.svelte';
  import ViewingDirectionSelector from './ViewingDirectionSelector.svelte';

  // TODO: Migrate from @/utils/iiifBehaviors
  function suggestBehaviors(_type: string, _characteristics: Record<string, boolean>): string[] { return []; }

  interface Props {
    resource: IIIFItem;
    onUpdateResource: (r: Partial<IIIFItem>) => void;
    navDateValidation: ValidationState;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    isAllowed: (field: string) => boolean;
  }

  let {
    resource,
    onUpdateResource,
    navDateValidation,
    cx = {},
    fieldMode = false,
    isAllowed,
  }: Props = $props();

  function handleSuggestBehaviors() {
    if (!resource) return;
    const asCanvas = isCanvas(resource) ? resource : null;
    const characteristics = {
      hasDuration: !!asCanvas?.duration,
      hasPageSequence: isManifest(resource) && resource.items?.length > 1,
      hasWidth: !!asCanvas?.width,
      hasHeight: !!asCanvas?.height,
    };
    const suggestions = suggestBehaviors(resource.type, characteristics);
    if (suggestions.length > 0) {
      onUpdateResource({ behavior: Array.from(new Set([...(resource.behavior || []), ...suggestions])) });
    }
  }
</script>

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
    <PropertyLabel label="Navigation Date" dcHint="navDate" {fieldMode} cx={cx} validation={navDateValidation} />
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
    <PropertyLabel label="Required Statement" dcHint="requiredStatement" {fieldMode} cx={cx} />
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
