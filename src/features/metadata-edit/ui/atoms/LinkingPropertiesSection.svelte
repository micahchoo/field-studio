<!--
  LinkingPropertiesSection -- Provider, Homepage, Rendering, SeeAlso, Required Statement, Start Canvas.
  Extracted from TechnicalTabPanel molecule.
  Architecture: Atom (composes AgentEditor, LinkListEditor, PropertyInput, PropertyLabel, StartPropertyEditor)
-->
<script lang="ts">
  import type { IIIFItem, IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import PropertyInput from './PropertyInput.svelte';
  import PropertyLabel from './PropertyLabel.svelte';
  import AgentEditor from '@/src/shared/ui/molecules/AgentEditor.svelte';
  import LinkListEditor from '@/src/shared/ui/molecules/LinkListEditor.svelte';
  import StartPropertyEditor from './StartPropertyEditor.svelte';

  interface Props {
    resource: IIIFItem;
    canvases: IIIFCanvas[];
    isManifest: boolean;
    onUpdateResource: (r: Partial<IIIFItem>) => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    resource,
    canvases,
    isManifest,
    onUpdateResource,
    cx = {},
    fieldMode = false,
  }: Props = $props();

  function handleRequiredStatementLabelChange(val: string) {
    const current = resource.requiredStatement || { label: { none: [''] }, value: { none: [''] } };
    onUpdateResource({ requiredStatement: { ...current, label: { none: [val] } } });
  }

  function handleRequiredStatementValueChange(val: string) {
    const current = resource.requiredStatement || { label: { none: ['Attribution'] }, value: { none: [''] } };
    onUpdateResource({ requiredStatement: { ...current, value: { none: [val] } } });
  }
</script>

<!-- Provider -->
<div>
  <PropertyLabel label="Provider" dcHint="provider" {fieldMode} {cx} />
  <AgentEditor
    value={(resource.provider || []) as import('@/src/shared/ui/molecules/AgentEditor.svelte').AgentItem[]}
    onChange={(agents) => onUpdateResource({ provider: agents as typeof resource.provider })}
    cx={cx as ContextualClassNames} {fieldMode}
  />
</div>

<!-- Homepage -->
<div>
  <PropertyLabel label="Homepage" dcHint="homepage" {fieldMode} {cx} />
  <LinkListEditor
    value={(resource.homepage || []) as import('@/src/shared/ui/molecules/LinkListEditor.svelte').LinkItem[]}
    onChange={(links) => onUpdateResource({ homepage: links as typeof resource.homepage })}
    resourceType="homepage" {fieldMode} cx={cx as ContextualClassNames}
  />
</div>

<!-- Rendering (Downloads) -->
<div>
  <PropertyLabel label="Rendering" dcHint="rendering" {fieldMode} {cx} />
  <LinkListEditor
    value={(resource.rendering || []) as import('@/src/shared/ui/molecules/LinkListEditor.svelte').LinkItem[]}
    onChange={(links) => onUpdateResource({ rendering: links as typeof resource.rendering })}
    resourceType="rendering" {fieldMode} cx={cx as ContextualClassNames}
  />
</div>

<!-- See Also -->
<div>
  <PropertyLabel label="See Also" dcHint="seeAlso" {fieldMode} {cx} />
  <LinkListEditor
    value={(resource.seeAlso || []) as import('@/src/shared/ui/molecules/LinkListEditor.svelte').LinkItem[]}
    onChange={(links) => onUpdateResource({ seeAlso: links as typeof resource.seeAlso })}
    resourceType="seeAlso" {fieldMode} cx={cx as ContextualClassNames}
  />
</div>

<!-- Required Statement -->
<div>
  <PropertyLabel label="Required Statement" dcHint="requiredStatement" {fieldMode} {cx} />
  <div class="space-y-2">
    <PropertyInput
      type="text"
      value={getIIIFValue(resource.requiredStatement?.label)}
      onchange={handleRequiredStatementLabelChange}
      {cx} {fieldMode}
      placeholder="Label (e.g., Attribution)"
    />
    <PropertyInput
      type="text"
      value={getIIIFValue(resource.requiredStatement?.value)}
      onchange={handleRequiredStatementValueChange}
      {cx} {fieldMode}
      placeholder="Value (e.g., Provided by Example Museum)"
    />
  </div>
</div>

<!-- Start Canvas (Manifests only) -->
{#if isManifest && canvases.length > 0}
  <div>
    <PropertyLabel label="Start Canvas" dcHint="start" {fieldMode} {cx} />
    <StartPropertyEditor
      value={resource.start as import('./StartPropertyEditor.svelte').StartValue | undefined}
      {canvases}
      onChange={(start) => onUpdateResource({ start: start as typeof resource.start })}
      {fieldMode}
    />
  </div>
{/if}
