<!--
  PagedViewer.svelte — Book-spread viewer with recto/verso page pairs

  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  First canvas is displayed solo (cover), then canvases are paired as
  verso + recto (LTR) or recto + verso (RTL). nonPaged canvases bypass
  the pairing logic and are shown individually.
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';

  interface Props {
    canvases: IIIFCanvas[];
    nonPaged?: string[];
    facingPages?: boolean;
    isRTL?: boolean;
    activeCanvasId?: string;
    onPageChange?: (canvasId: string) => void;
    fieldMode: boolean;
    cx: ContextualClassNames;
  }

  let {
    canvases,
    nonPaged = [],
    facingPages = true,
    isRTL = false,
    activeCanvasId,
    onPageChange,
    fieldMode,
    cx,
  }: Props = $props();

  type SingleSpread = { type: 'single'; canvas: IIIFCanvas };
  type PairSpread = { type: 'pair'; left: IIIFCanvas; right: IIIFCanvas };
  type Spread = SingleSpread | PairSpread;

  let spreads = $derived.by((): Spread[] => {
    const result: Spread[] = [];
    const nonPagedSet = new Set(nonPaged);
    const paged = canvases.filter(c => !nonPagedSet.has(c.id));
    const nonPagedList = canvases.filter(c => nonPagedSet.has(c.id));

    // Non-paged canvases are always solo
    for (const c of nonPagedList) {
      result.push({ type: 'single', canvas: c });
    }

    if (!facingPages || paged.length === 0) {
      for (const c of paged) result.push({ type: 'single', canvas: c });
      return result;
    }

    // First canvas is cover (solo), then pairs
    result.push({ type: 'single', canvas: paged[0] });

    for (let i = 1; i < paged.length; i += 2) {
      const verso = paged[i];
      const recto = paged[i + 1];

      if (!recto) {
        result.push({ type: 'single', canvas: verso });
      } else if (isRTL) {
        result.push({ type: 'pair', left: recto, right: verso });
      } else {
        result.push({ type: 'pair', left: verso, right: recto });
      }
    }

    return result;
  });

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

  function isCanvasActive(canvas: IIIFCanvas): boolean {
    return canvas.id === activeCanvasId;
  }

  function renderPageButton(canvas: IIIFCanvas, extraClass: string = '') {
    // Used in template for single pages
    return { canvas, thumb: getThumbnailUrl(canvas), label: getIIIFValue(canvas.label) ?? 'Page', active: isCanvasActive(canvas), extraClass };
  }
</script>

<div
  class={cn(
    'flex flex-col gap-4 overflow-y-auto p-4 w-full h-full',
    fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
  )}
  role="list"
  aria-label="Page spreads"
>
  {#each spreads as spread, spreadIndex (spreadIndex)}
    {#if spread.type === 'single'}
      {#each [spread.canvas] as canvas (canvas.id)}
        {@const thumb = getThumbnailUrl(canvas)}
        {@const label = getIIIFValue(canvas.label) ?? 'Page'}
        {@const active = isCanvasActive(canvas)}
        <!-- Single page -->
        <div class="flex justify-center" role="listitem">
          <button
            class={cn(
              'flex flex-col items-center gap-2 max-w-xs w-full',
              'focus-visible:outline-none focus-visible:ring-2',
              active ? cx.focusRing : ''
            )}
            onclick={() => onPageChange?.(canvas.id)}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
          >
            <div
              class={cn(
                'w-full border-4 overflow-hidden transition-nb',
                active
                  ? fieldMode ? 'border-nb-yellow shadow-brutal' : 'border-nb-black shadow-brutal'
                  : fieldMode ? 'border-nb-yellow/40 hover:border-nb-yellow' : 'border-nb-black/30 hover:border-nb-black'
              )}
              style:aspect-ratio="0.707"
            >
              {#if thumb}
                <img src={thumb} alt={label} class="w-full h-full object-contain" loading="lazy" />
              {:else}
                <div class={cn(
                  'w-full h-full flex items-center justify-center',
                  fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-black/10'
                )}>
                  <span class="material-symbols-outlined text-4xl opacity-30">description</span>
                </div>
              {/if}
            </div>
            <span class={cn('text-xs font-mono truncate max-w-full', active ? cx.text : cx.textMuted)}>
              {label}
            </span>
          </button>
        </div>
      {/each}
    {:else}
      <!-- Two-page spread -->
      <div
        class={cn(
          'flex gap-0 justify-center',
          isRTL ? 'flex-row-reverse' : 'flex-row'
        )}
        role="listitem"
      >
        {#each [spread.left, spread.right] as canvas, pageIdx (canvas.id)}
          {@const thumb = getThumbnailUrl(canvas)}
          {@const label = getIIIFValue(canvas.label) ?? 'Page'}
          {@const active = isCanvasActive(canvas)}
          {@const isLeftPage = pageIdx === 0}

          <button
            class={cn(
              'flex flex-col items-center gap-2 flex-1 max-w-56',
              'focus-visible:outline-none focus-visible:ring-2',
              active ? cx.focusRing : ''
            )}
            onclick={() => onPageChange?.(canvas.id)}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
          >
            <div
              class={cn(
                'w-full border-y-4 overflow-hidden transition-nb',
                isLeftPage ? 'border-l-4 border-r-2' : 'border-r-4 border-l-2',
                active
                  ? fieldMode ? 'border-nb-yellow shadow-brutal' : 'border-nb-black shadow-brutal'
                  : fieldMode ? 'border-nb-yellow/40 hover:border-nb-yellow' : 'border-nb-black/30 hover:border-nb-black'
              )}
              style:aspect-ratio="0.707"
            >
              {#if thumb}
                <img src={thumb} alt={label} class="w-full h-full object-contain" loading="lazy" />
              {:else}
                <div class={cn(
                  'w-full h-full flex items-center justify-center',
                  fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-black/10'
                )}>
                  <span class="material-symbols-outlined text-4xl opacity-30">description</span>
                </div>
              {/if}
            </div>
            <span class={cn('text-xs font-mono truncate max-w-full', active ? cx.text : cx.textMuted)}>
              {label}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  {/each}
</div>
