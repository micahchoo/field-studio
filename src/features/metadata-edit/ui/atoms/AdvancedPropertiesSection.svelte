<!--
  AdvancedPropertiesSection -- Part Of + Thumbnail URL with preview.
  Extracted from TechnicalTabPanel molecule.
  Architecture: Atom (composes PropertyInput, PropertyLabel)
-->
<script lang="ts">
  import type { IIIFItem } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import PropertyInput from './PropertyInput.svelte';
  import PropertyLabel from './PropertyLabel.svelte';

  interface Props {
    resource: IIIFItem;
    onUpdateResource: (r: Partial<IIIFItem>) => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    resource,
    onUpdateResource,
    cx = {},
    fieldMode = false,
  }: Props = $props();

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
    (e.target as HTMLImageElement).style.display = 'none';
  }
</script>

<div
  id="advanced-properties"
  class={cn(
    'space-y-6 pt-2 pb-4',
    fieldMode ? 'border-b border-nb-black' : 'border-b border-nb-black/20'
  )}
>
  <!-- Part Of -->
  <div>
    <PropertyLabel label="Part Of" dcHint="partOf" {fieldMode} {cx} />
    <PropertyInput
      type="text"
      value={resource.partOf?.[0]?.id || ''}
      onchange={handlePartOfChange}
      {cx} {fieldMode}
      placeholder="Parent collection URI"
    />
  </div>

  <!-- Thumbnail URL -->
  <div>
    <PropertyLabel label="Thumbnail" dcHint="thumbnail" {fieldMode} {cx} />
    <PropertyInput
      type="url"
      value={resource.thumbnail?.[0]?.id || ''}
      onchange={handleThumbnailChange}
      {cx} {fieldMode}
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
