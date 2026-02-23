<!--
  ZoomControl - Zoom in/out/reset controls

  ORIGINAL: src/shared/ui/atoms/ZoomControl.tsx (174 lines)
  Composes Button atoms. Theme-aware via cx prop.
  aria-live="polite" on zoom display for screen readers.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    zoom: number;
    min?: number;
    max?: number;
    step?: number;
    onZoomChange: (zoom: number) => void;
    onReset?: () => void;
    onFit?: () => void;
    compact?: boolean;
    disabled?: boolean;
    cx: ContextualClassNames;
  }

  let {
    zoom,
    min = 0.25,
    max = 5,
    step = 0.25,
    onZoomChange,
    onReset,
    onFit,
    compact = false,
    disabled = false,
    cx,
  }: Props = $props();

  function handleZoomIn() {
    onZoomChange(Math.min(zoom + step, max));
  }

  function handleZoomOut() {
    onZoomChange(Math.max(zoom - step, min));
  }

  function handleReset() {
    if (onReset) {
      onReset();
    } else {
      onZoomChange(1);
    }
  }

  let canZoomIn = $derived(zoom < max);
  let canZoomOut = $derived(zoom > min);
  let canReset = $derived(zoom !== 1);
  let zoomPercent = $derived(Math.round(zoom * 100));
</script>

<div
  class="inline-flex items-center gap-1 border {cx.border} {cx.surface} p-1"
  role="group"
  aria-label="Zoom controls"
>
  <Button
    variant="ghost"
    size="sm"
    onclick={handleZoomOut}
    disabled={disabled || !canZoomOut}
    aria-label="Zoom out"
    class="!px-2"
  >
    {#snippet icon()}<Icon name="remove" />{/snippet}
  </Button>

  <div
    class="min-w-[60px] text-center text-sm font-medium {cx.text} select-none"
    aria-live="polite"
    aria-atomic="true"
  >
    {zoomPercent}%
  </div>

  <Button
    variant="ghost"
    size="sm"
    onclick={handleZoomIn}
    disabled={disabled || !canZoomIn}
    aria-label="Zoom in"
    class="!px-2"
  >
    {#snippet icon()}<Icon name="add" />{/snippet}
  </Button>

  <div class="w-px h-6 {cx.divider} mx-1"></div>

  {#if !compact}
    <Button
      variant="ghost"
      size="sm"
      onclick={handleReset}
      disabled={disabled || !canReset}
      aria-label="Reset zoom"
    >
      100%
    </Button>

    {#if onFit}
      <Button
        variant="ghost"
        size="sm"
        onclick={onFit}
        {disabled}
        aria-label="Fit to view"
        class="!px-2"
      >
        {#snippet icon()}<Icon name="fit_screen" />{/snippet}
      </Button>
    {/if}
  {/if}
</div>
