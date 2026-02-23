<!--
  ImagePreview — IIIF image with rotation/mirror transforms

  ORIGINAL: src/features/viewer/ui/atoms/ImagePreview.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Displays IIIF image with loading and error states.
  Apply CSS transform for rotation and mirror.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  const ERROR_SVG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%231e293b" width="400" height="300"/><text fill="%2394a3b8" x="50%25" y="50%25" text-anchor="middle" font-family="sans-serif">Invalid Request</text></svg>';

  interface Props {
    /** Image URL to display */
    src?: string;
    /** Rotation in degrees */
    rotation?: number;
    /** Whether image is mirrored horizontally */
    mirrored?: boolean;
    /** Alt text for accessibility */
    alt?: string;
    /** Field mode styling */
    fieldMode?: boolean;
  }

  let {
    src = '',
    rotation = 0,
    mirrored = false,
    alt = 'IIIF Image Preview',
    fieldMode = false,
  }: Props = $props();

  let hasError = $state(false);
  let isLoading = $state(true);

  let transformValue = $derived(`scaleX(${mirrored ? -1 : 1}) rotate(${rotation}deg)`);

  function handleError() {
    hasError = true;
    isLoading = false;
  }

  function handleLoad() {
    isLoading = false;
  }

  // Reset states when src changes
  $effect(() => {
    if (src) {
      hasError = false;
      isLoading = true;
    }
  });
</script>

<div class={cn(
  'flex-1 flex items-center justify-center p-6 relative group',
  fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
)}>
  <!-- Grid background pattern -->
  <div
    class="absolute inset-0 opacity-5"
    style:background-image="radial-gradient(#64748b 1px, transparent 1px)"
    style:background-size="20px 20px"
  ></div>

  <!-- Loading state -->
  {#if isLoading && !hasError && src}
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="animate-pulse flex flex-col items-center gap-2">
        <div class="w-8 h-8 border-2 border-nb-black/60 border-t-nb-blue animate-spin"></div>
        <span class="text-nb-black/50 text-xs">Loading...</span>
      </div>
    </div>
  {/if}

  <!-- Image -->
  {#if src}
    <img
      src={hasError ? ERROR_SVG : src}
      class="max-w-[90%] max-h-[90%] object-contain shadow-brutal-lg ring-1 ring-white/20 transition-nb bg-nb-black"
      style:transform={transformValue}
      onerror={handleError}
      onload={handleLoad}
      {alt}
    />
  {/if}
</div>
