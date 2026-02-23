<!--
  UrlBar — IIIF URL display + copy

  ORIGINAL: src/features/viewer/ui/atoms/UrlBar.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Displays the IIIF Image API URL with colored segments.
  Includes copy functionality with success state.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { LIGHT_CLASSES, FIELD_CLASSES } from '@/src/shared/lib/contextual-styles';
  import UrlSegment from './UrlSegment.svelte';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';

  interface Props {
    /** IIIF image API URL string, or individual parts */
    url?: string;
    /** Base image ID/service URL */
    imageId?: string;
    /** Region parameter */
    region?: string;
    /** Size parameter */
    size?: string;
    /** Rotation parameter */
    rotation?: string;
    /** Quality parameter */
    quality?: string;
    /** Format parameter */
    format?: string;
    /** Contextual styles from parent */
    cx?: Partial<ContextualClassNames>;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    url,
    imageId = '',
    region = 'full',
    size = 'max',
    rotation = '0',
    quality = 'default',
    format = 'jpg',
    cx: _cx,
    fieldMode = false,
  }: Props = $props();

  let showCopied = $state(false);

  let resolvedUrl = $derived(
    url || (imageId ? `${imageId}/${region}/${size}/${rotation}/${quality}.${format}` : '')
  );

  let resolvedCx = $derived(fieldMode ? FIELD_CLASSES : LIGHT_CLASSES);
  let mutedTextClass = $derived(fieldMode ? 'text-nb-black/40' : 'text-nb-black/50');

  async function handleCopy() {
    if (!resolvedUrl) return;
    await navigator.clipboard.writeText(resolvedUrl);
    showCopied = true;
    setTimeout(() => { showCopied = false; }, 2000);
  }
</script>

<div class="p-3 bg-nb-black font-mono text-xs border-t border-white/10 shrink-0">
  <div class="flex items-center gap-1">
    {#if imageId}
      <span class="{mutedTextClass} truncate max-w-[150px]">{imageId}/</span>
      <UrlSegment value={region} label="Region" color="green" />
      <span class={mutedTextClass}>/</span>
      <UrlSegment value={size} label="Size" color="blue" />
      <span class={mutedTextClass}>/</span>
      <UrlSegment value={rotation} label="Rotation" color="orange" />
      <span class={mutedTextClass}>/</span>
      <UrlSegment value={quality} label="Quality" color="purple" />
      <span class={mutedTextClass}>.</span>
      <UrlSegment value={format} label="Format" color="yellow" />
    {:else if url}
      <span class="text-nb-white/70 truncate flex-1 font-mono text-xs">{url}</span>
    {/if}
    <div class="flex-1"></div>
    <IconButton
      icon="content_copy"
      label="Copy URL"
      onclick={handleCopy}
      size="sm"
      cx={resolvedCx}
      class="!text-white/60 hover:!text-white"
    />
    {#if showCopied}
      <span class="text-nb-green text-xs">Copied!</span>
    {/if}
  </div>
</div>
