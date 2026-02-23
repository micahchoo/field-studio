<!--
  ContinuousViewer.svelte — Virtualized scroll viewer using IntersectionObserver

  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  Each canvas is rendered as a div with the correct aspect ratio. An
  IntersectionObserver tracks which canvas is in the viewport and calls
  onCanvasInView. Scrolls to activeCanvasId when it changes.
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import { onMount, tick } from 'svelte';

  interface Props {
    canvases: IIIFCanvas[];
    activeCanvasId?: string;
    gap?: number;
    horizontal?: boolean;
    fieldMode: boolean;
    cx: ContextualClassNames;
    onCanvasInView?: (canvasId: string) => void;
  }

  let {
    canvases,
    activeCanvasId,
    gap = 16,
    horizontal = false,
    fieldMode,
    cx,
    onCanvasInView,
  }: Props = $props();

  let containerEl: HTMLDivElement | undefined = $state(undefined);
  // Plain object from canvasId -> element, managed via Svelte action
  const canvasElements: Record<string, HTMLDivElement> = {};
  let intersectionObserver: IntersectionObserver | null = null;

  // Extract thumbnail URL from canvas
  function getThumbnailUrl(canvas: IIIFCanvas): string | null {
    const anyCanvas = canvas as any;
    if (anyCanvas.thumbnail) {
      const thumb = anyCanvas.thumbnail;
      if (Array.isArray(thumb) && thumb[0]?.id) return thumb[0].id;
      if (typeof thumb === 'string') return thumb;
    }
    const body = canvas.items?.[0]?.items?.[0]?.body as any;
    if (body?.id) return body.id;
    return null;
  }

  function getAspectRatio(canvas: IIIFCanvas): number {
    const w = canvas.width ?? 4;
    const h = canvas.height ?? 3;
    return w / h;
  }

  onMount(() => {
    if (onCanvasInView) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const canvasId = (entry.target as HTMLElement).dataset.canvasId;
              if (canvasId) onCanvasInView!(canvasId);
            }
          }
        },
        { threshold: 0.5 }
      );
    }

    return () => {
      if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
      }
    };
  });

  // Scroll to active canvas when it changes
  $effect(() => {
    const id = activeCanvasId;
    if (!id) return;
    tick().then(() => {
      const el = canvasElements[id];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  // Svelte action: register/unregister canvas element with IntersectionObserver
  function canvasItem(el: HTMLDivElement, canvasId: string) {
    canvasElements[canvasId] = el;
    if (intersectionObserver) intersectionObserver.observe(el);

    return {
      update(newCanvasId: string) {
        delete canvasElements[canvasId];
        canvasElements[newCanvasId] = el;
      },
      destroy() {
        if (intersectionObserver) intersectionObserver.unobserve(el);
        delete canvasElements[canvasId];
      },
    };
  }
</script>

<div
  bind:this={containerEl}
  class={cn(
    'flex overflow-auto',
    horizontal ? 'flex-row items-center' : 'flex-col items-center',
    fieldMode ? 'bg-nb-black' : 'bg-nb-cream',
    'w-full h-full'
  )}
  style:gap="{gap}px"
  style:padding="{gap}px"
  role="list"
  aria-label="Canvas list"
>
  {#each canvases as canvas (canvas.id)}
    {@const ratio = getAspectRatio(canvas)}
    {@const thumb = getThumbnailUrl(canvas)}
    {@const isActive = canvas.id === activeCanvasId}
    {@const label = getIIIFValue(canvas.label) ?? 'Canvas'}

    <div
      use:canvasItem={canvas.id}
      data-canvas-id={canvas.id}
      class={cn(
        'relative shrink-0 overflow-hidden border-4 transition-nb',
        isActive
          ? fieldMode ? 'border-nb-yellow shadow-brutal' : 'border-nb-black shadow-brutal'
          : fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/20',
        horizontal ? 'h-full' : 'w-full max-w-2xl'
      )}
      style:aspect-ratio={String(ratio)}
      role="listitem"
      aria-label={label}
    >
      {#if thumb}
        <img
          src={thumb}
          alt={label}
          class="w-full h-full object-contain"
          loading="lazy"
        />
      {:else}
        <div class={cn(
          'w-full h-full flex items-center justify-center',
          fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-black/10'
        )}>
          <span class="material-symbols-outlined text-4xl opacity-30">image</span>
        </div>
      {/if}

      <!-- Canvas label overlay -->
      <div class={cn(
        'absolute bottom-0 left-0 right-0 px-2 py-1 text-xs font-mono truncate',
        fieldMode ? 'bg-nb-black/80 text-nb-yellow' : 'bg-nb-white/80 text-nb-black'
      )}>
        {label}
      </div>
    </div>
  {/each}
</div>
