<!--
  ViewerOverlayPanels -- Side overlay panels for image filters, comparison, and annotation layers

  LAYER: molecule
  FSD: features/viewer/ui/molecules

  Renders three overlay panels inside the viewer content area:
  - Image filter panel (brightness, contrast, saturation, invert, grayscale)
  - Comparison viewer badge with close button
  - Annotation layer panel with visibility toggles
-->

<script lang="ts">
  /* eslint-disable @field-studio/no-native-html-in-molecules -- Filter panel uses native range inputs for brightness/contrast/saturation sliders */
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { ImageFilterStore } from '@/src/features/viewer/model/imageFilters.svelte';
  import type { AnnotationLayerStore } from '@/src/features/viewer/model/annotationLayers.svelte';
  import type { ComparisonStore } from '@/src/features/viewer/model/comparison.svelte';
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    filters: ImageFilterStore;
    layers: AnnotationLayerStore;
    comparison: ComparisonStore;
    showFilterPanel: boolean;
    showLayerPanel: boolean;
    secondComparisonCanvas: IIIFCanvas | null;
    onCloseFilterPanel: () => void;
    onCloseLayerPanel: () => void;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    t: (key: string) => string;
  }

  let {
    filters, layers, comparison,
    showFilterPanel, showLayerPanel, secondComparisonCanvas,
    onCloseFilterPanel, onCloseLayerPanel,
    cx, fieldMode = false, t,
  }: Props = $props();
</script>

<!-- Image filter panel (side overlay) -->
{#if showFilterPanel}
  <div
    class={cn(
      'absolute top-0 right-0 w-64 h-full border-l-4 p-3 z-20 overflow-y-auto',
      fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-white border-nb-black'
    )}
    role="region"
    aria-label="Image filters"
  >
    <div class="flex items-center justify-between mb-3">
      <h3 class={cn('font-mono text-xs uppercase tracking-wider font-bold', cx.text)}>
        {t('Filters')}
      </h3>
      <button class={cn('p-1 rounded', cx.iconButton)} onclick={onCloseFilterPanel} aria-label="Close filters">&#10005;</button>
    </div>

    <label class={cn('block mb-2', cx.text)}>
      <span class="text-xs font-mono uppercase tracking-wider">{t('Brightness')}</span>
      <input type="range" min="0" max="200" value={filters.brightness}
        oninput={(e) => filters.setBrightness(parseInt((e.target as HTMLInputElement).value))}
        class="w-full mt-1" />
    </label>

    <label class={cn('block mb-2', cx.text)}>
      <span class="text-xs font-mono uppercase tracking-wider">{t('Contrast')}</span>
      <input type="range" min="0" max="200" value={filters.contrast}
        oninput={(e) => filters.setContrast(parseInt((e.target as HTMLInputElement).value))}
        class="w-full mt-1" />
    </label>

    <label class={cn('block mb-2', cx.text)}>
      <span class="text-xs font-mono uppercase tracking-wider">{t('Saturation')}</span>
      <input type="range" min="0" max="200" value={filters.saturation}
        oninput={(e) => filters.setSaturation(parseInt((e.target as HTMLInputElement).value))}
        class="w-full mt-1" />
    </label>

    <div class="flex gap-2 mt-2">
      <button
        class={cn(
          'flex-1 px-2 py-1 rounded text-xs font-mono uppercase border-2',
          filters.invert ? cx.active : cx.iconButton,
          fieldMode ? 'border-nb-yellow' : 'border-nb-black'
        )}
        onclick={() => filters.toggleInvert()}
      >{t('Invert')}</button>
      <button
        class={cn(
          'flex-1 px-2 py-1 rounded text-xs font-mono uppercase border-2',
          filters.grayscale ? cx.active : cx.iconButton,
          fieldMode ? 'border-nb-yellow' : 'border-nb-black'
        )}
        onclick={() => filters.toggleGrayscale()}
      >{t('Grayscale')}</button>
    </div>

    {#if !filters.isDefault}
      <button
        class={cn(
          'w-full mt-3 px-2 py-1 rounded text-xs font-mono uppercase border-2',
          cx.iconButton, fieldMode ? 'border-nb-yellow' : 'border-nb-black'
        )}
        onclick={() => filters.reset()}
      >{t('Reset filters')}</button>
    {/if}
  </div>
{/if}

<!-- Comparison viewer overlay -->
{#if comparison.isActive && secondComparisonCanvas}
  <div
    class={cn('absolute inset-0 z-15', fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream/80')}
    role="region"
    aria-label="Comparison viewer"
  >
    <div class={cn('absolute top-2 left-2 px-2 py-1 rounded text-xs font-mono', cx.active)}>
      {t('Comparing')}: {getIIIFValue(secondComparisonCanvas.label)}
      <button class="ml-2 underline" onclick={() => comparison.reset()}>{t('Close')}</button>
    </div>
  </div>
{/if}

<!-- Annotation layer panel -->
{#if layers.layers.length > 0 && showLayerPanel}
  <div
    class={cn(
      'absolute top-0 left-0 w-56 h-full border-r-4 p-3 z-20 overflow-y-auto',
      fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-white border-nb-black'
    )}
    role="region"
    aria-label="Annotation layers"
  >
    <div class="flex items-center justify-between mb-3">
      <h3 class={cn('font-mono text-xs uppercase tracking-wider font-bold', cx.text)}>
        {t('Layers')}
      </h3>
      <div class="flex gap-1">
        <button class={cn('p-1 rounded text-xs', cx.iconButton)} onclick={() => layers.toggleAll()} title={t('Toggle all')}>&#128065;</button>
        <button class={cn('p-1 rounded', cx.iconButton)} onclick={onCloseLayerPanel} aria-label="Close layers panel">&#10005;</button>
      </div>
    </div>

    {#each layers.layers as layer}
      <div class="flex items-center gap-2 mb-1">
        <button
          class={cn('p-0.5 rounded', cx.iconButton)}
          onclick={() => layers.toggleVisibility(layer.id)}
          title={layer.visible ? t('Hide layer') : t('Show layer')}
          aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.label}`}
        >
          {layer.visible ? '&#128065;' : '&#128064;'}
        </button>
        <span class="w-3 h-3 rounded-full border shrink-0" style:background-color={layer.color} style:opacity={layer.opacity}></span>
        <span class={cn('text-xs font-mono truncate', cx.text)}>{layer.label}</span>
      </div>
    {/each}
  </div>
{/if}
