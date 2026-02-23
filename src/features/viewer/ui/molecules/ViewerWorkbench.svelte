<!--
  ViewerWorkbench — IIIF Image API parameter workbench modal
  React source: src/features/viewer/ui/molecules/ViewerWorkbench.tsx (197 lines)
  Layer: molecule (FSD features/viewer/ui/molecules)

  Full-screen modal for building and previewing IIIF Image API 3.0 URLs.
  Two-column layout: preview left, controls right with tabs (Parameters/Code).
-->

<script module lang="ts">
  interface ImageApiParams {
    region: string;
    size: string;
    rotation: string;
    quality: string;
    format: string;
  }

  type RegionMode = 'full' | 'square' | 'pct' | 'pixel';
  type SizeMode = 'max' | 'pct' | 'w' | 'h' | 'wh' | 'bestfit';

  const REGION_PRESETS = [
    { value: 'full', label: 'Full', description: 'Entire image' },
    { value: 'square', label: 'Square', description: 'Centered square crop' },
    { value: 'pixel', label: 'Pixels', description: 'x,y,w,h in pixels' },
    { value: 'pct', label: 'Percent', description: 'Percent-based region' },
  ] as const;

  const SIZE_PRESETS = [
    { value: 'max', label: 'Max', description: 'Maximum available size' },
    { value: 'pct', label: 'Percent', description: 'Scale by percentage' },
    { value: 'w', label: 'Width', description: 'Width only, auto height' },
    { value: 'h', label: 'Height', description: 'Height only, auto width' },
    { value: 'wh', label: 'Exact', description: 'Exact width,height' },
    { value: 'bestfit', label: 'Best Fit', description: 'Fit within dimensions' },
  ] as const;

  const QUALITY_OPTIONS = [
    { value: 'default', label: 'Default', description: 'Recommended quality' },
    { value: 'color', label: 'Color', description: 'Full color (if available)' },
    { value: 'gray', label: 'Gray', description: 'Grayscale conversion' },
    { value: 'bitonal', label: 'Bitonal', description: 'Black and white only' },
  ] as const;

  const FORMAT_OPTIONS = [
    { value: 'jpg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
    { value: 'webp', label: 'WebP' },
    { value: 'tif', label: 'TIFF' },
  ] as const;
</script>

<script lang="ts">
  /* eslint-disable @field-studio/no-native-html-in-molecules -- Rotation slider requires native range input for IIIF Image API parameter control */
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IIIFCanvas } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import PreviewHeader from '../atoms/PreviewHeader.svelte';
  import PresetSelector from '../atoms/PresetSelector.svelte';
  import QualitySelector from '../atoms/QualitySelector.svelte';
  import FormatSelector from '../atoms/FormatSelector.svelte';
  import WorkbenchFooter from '../atoms/WorkbenchFooter.svelte';

  interface Props {
    canvas: IIIFCanvas;
    onApply: (url: string) => void;
    onClose: () => void;
    cx?: ContextualClassNames | Record<string, string>;
    fieldMode?: boolean;
  }

  let {
    canvas,
    onApply,
    onClose,
    cx: _cx,
    fieldMode = false,
  }: Props = $props();

  // Local UI state
  let regionMode = $state<RegionMode>('full');
  let sizeMode = $state<SizeMode>('max');
  let regionCoords = $state({ x: 0, y: 0, w: 100, h: 100 });
  let sizeVal = $state({ w: 1000, h: 1000, pct: 100 });
  let rotationDeg = $state(0);
  let mirrored = $state(false);
  let upscale = $state(false);
  let quality = $state('default');
  let format = $state('jpg');
  let activeTab = $state<'params' | 'code'>('params');

  // Extract image service URL from canvas
  const paintingBody = canvas.items?.[0]?.items?.[0]?.body as { id?: string; service?: Array<{ id: string }> } | undefined;
  const service = paintingBody?.service?.[0];
  const rawImageId = service?.id || paintingBody?.id || '';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  let imageId = $derived.by(() => {
    if (!rawImageId) return '';
    if (rawImageId.startsWith('http')) return rawImageId;
    if (rawImageId.startsWith('/')) return `${baseUrl}${rawImageId}`;
    return rawImageId;
  });

  let params = $derived.by((): ImageApiParams => {
    let r = 'full';
    if (regionMode === 'square') r = 'square';
    else if (regionMode === 'pct') r = `pct:${regionCoords.x},${regionCoords.y},${regionCoords.w},${regionCoords.h}`;
    else if (regionMode === 'pixel') r = `${regionCoords.x},${regionCoords.y},${regionCoords.w},${regionCoords.h}`;

    let s = 'max';
    const up = upscale ? '^' : '';
    if (sizeMode === 'pct') s = `${up}pct:${sizeVal.pct}`;
    else if (sizeMode === 'w') s = `${up}${sizeVal.w},`;
    else if (sizeMode === 'h') s = `${up},${sizeVal.h}`;
    else if (sizeMode === 'wh') s = `${up}${sizeVal.w},${sizeVal.h}`;
    else if (sizeMode === 'bestfit') s = `${up}!${sizeVal.w},${sizeVal.h}`;

    return {
      region: r,
      size: s,
      rotation: mirrored ? `!${rotationDeg}` : rotationDeg.toString(),
      quality,
      format,
    };
  });

  let url = $derived(
    service
      ? `${imageId}/${params.region}/${params.size}/${params.rotation}/${params.quality}.${params.format}`
      : imageId
  );

  function handleReset() {
    regionMode = 'full';
    sizeMode = 'max';
    regionCoords = { x: 0, y: 0, w: 100, h: 100 };
    sizeVal = { w: 1000, h: 1000, pct: 100 };
    rotationDeg = 0;
    mirrored = false;
    upscale = false;
    quality = 'default';
    format = 'jpg';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  let bgClass = $derived(fieldMode ? 'bg-nb-black' : 'bg-nb-white');
  let borderClass = $derived(fieldMode ? 'border-nb-black' : 'border-nb-black/20');
  let textClass = $derived(fieldMode ? 'text-white' : 'text-nb-black');
  let mutedClass = $derived(fieldMode ? 'text-white/50' : 'text-nb-black/50');
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nb-black/60 backdrop-blur-sm"
  onclick={onClose}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="IIIF Image API Workbench"
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class={cn(bgClass, 'w-full max-w-6xl h-[90vh] shadow-brutal-lg border flex overflow-hidden', borderClass)}
    onclick={(e) => e.stopPropagation()}
  >
    <!-- Left: Preview -->
    <div class="flex-1 bg-nb-black relative flex flex-col overflow-hidden">
      <PreviewHeader {fieldMode} />
      <!-- Image preview -->
      <div class="flex-1 relative overflow-hidden flex items-center justify-center bg-nb-black">
        {#if url}
          <img
            src={url}
            alt="IIIF Image preview"
            class="max-w-full max-h-full object-contain"
            style={rotationDeg !== 0 ? `transform: rotate(${rotationDeg}deg)${mirrored ? ' scaleX(-1)' : ''}` : mirrored ? 'transform: scaleX(-1)' : ''}
          />
        {:else}
          <div class="text-white/30 text-sm font-mono">No image service available</div>
        {/if}
      </div>
      <!-- URL bar -->
      <div class={cn(
        'px-4 py-2 border-t font-mono text-xs truncate',
        fieldMode ? 'border-nb-yellow/30 bg-nb-black text-nb-yellow/60' : 'border-nb-black/20 bg-nb-cream text-nb-black/60'
      )}>
        {url || 'No URL'}
      </div>
    </div>

    <!-- Right: Controls -->
    <div class={cn('w-96 flex flex-col border-l', bgClass, borderClass)}>
      <!-- Tab bar -->
      <div class={cn('flex border-b', borderClass)}>
        <button
          type="button"
          class={cn(
            'flex-1 px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-nb',
            activeTab === 'params'
              ? fieldMode ? 'bg-nb-yellow/20 text-nb-yellow border-b-2 border-nb-yellow' : 'bg-nb-blue/10 text-nb-blue border-b-2 border-nb-blue'
              : fieldMode ? 'text-white/40 hover:text-white/60' : 'text-nb-black/40 hover:text-nb-black/60'
          )}
          onclick={() => activeTab = 'params'}
        >
          <Icon name="tune" class="text-sm mr-1" />
          Parameters
        </button>
        <button
          type="button"
          class={cn(
            'flex-1 px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-nb',
            activeTab === 'code'
              ? fieldMode ? 'bg-nb-yellow/20 text-nb-yellow border-b-2 border-nb-yellow' : 'bg-nb-blue/10 text-nb-blue border-b-2 border-nb-blue'
              : fieldMode ? 'text-white/40 hover:text-white/60' : 'text-nb-black/40 hover:text-nb-black/60'
          )}
          onclick={() => activeTab = 'code'}
        >
          <Icon name="code" class="text-sm mr-1" />
          Code
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        {#if activeTab === 'params'}
          <div class="p-4 space-y-6">
            <!-- Region -->
            <fieldset class="space-y-2">
              <legend class={cn('text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1', textClass)}>
                <Icon name="crop" class="text-sm text-green-500" />
                Region
              </legend>
              <p class={cn('text-[10px]', mutedClass)}>
                {REGION_PRESETS.find(p => p.value === regionMode)?.description}
              </p>
              <PresetSelector
                options={REGION_PRESETS.map(p => ({ value: p.value, label: p.label, description: p.description }))}
                value={regionMode}
                onChange={(v) => regionMode = v as RegionMode}
                {fieldMode}
              />
              {#if regionMode !== 'full' && regionMode !== 'square'}
                <div class="grid grid-cols-4 gap-2 mt-2">
                  {#each [
                    { key: 'x', label: 'X' },
                    { key: 'y', label: 'Y' },
                    { key: 'w', label: regionMode === 'pct' ? 'W %' : 'Width' },
                    { key: 'h', label: regionMode === 'pct' ? 'H %' : 'Height' },
                  ] as field}
                    <label class={cn('text-[10px] font-mono', mutedClass)}>
                      {field.label}
                      <input
                        type="number"
                        value={regionCoords[field.key as keyof typeof regionCoords]}
                        oninput={(e) => {
                          const val = parseInt((e.target as HTMLInputElement).value) || 0;
                          regionCoords = { ...regionCoords, [field.key]: val };
                        }}
                        class={cn(
                          'w-full px-2 py-1 text-xs font-mono border mt-0.5',
                          fieldMode ? 'bg-nb-black border-nb-yellow/30 text-nb-yellow' : 'bg-nb-white border-nb-black/20 text-nb-black'
                        )}
                      />
                    </label>
                  {/each}
                </div>
              {/if}
            </fieldset>

            <!-- Size -->
            <fieldset class="space-y-2">
              <legend class={cn('text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1', textClass)}>
                <Icon name="aspect_ratio" class="text-sm text-blue-500" />
                Size
              </legend>
              <p class={cn('text-[10px]', mutedClass)}>
                {SIZE_PRESETS.find(p => p.value === sizeMode)?.description}
              </p>
              <div class="flex gap-2 items-center">
                <label class={cn('flex items-center gap-1 text-[10px]', mutedClass)}>
                  <input type="checkbox" bind:checked={upscale} />
                  Upscale (^)
                </label>
                <PresetSelector
                  options={SIZE_PRESETS.map(p => ({ value: p.value, label: p.label, description: p.description }))}
                  value={sizeMode}
                  onChange={(v) => sizeMode = v as SizeMode}
                  {fieldMode}
                />
              </div>
              {#if sizeMode === 'pct'}
                <div class="mt-2">
                  <label class={cn('text-[10px] font-mono', mutedClass)}>
                    Percent
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={sizeVal.pct}
                      oninput={(e) => {
                        const val = parseInt((e.target as HTMLInputElement).value) || 100;
                        sizeVal = { ...sizeVal, pct: val };
                      }}
                      class={cn(
                        'w-20 px-2 py-1 text-xs font-mono border ml-1',
                        fieldMode ? 'bg-nb-black border-nb-yellow/30 text-nb-yellow' : 'bg-nb-white border-nb-black/20 text-nb-black'
                      )}
                    />
                  </label>
                </div>
              {:else if sizeMode !== 'max'}
                <div class="flex gap-2 mt-2">
                  {#if sizeMode !== 'h'}
                    <label class={cn('text-[10px] font-mono', mutedClass)}>
                      Width
                      <input
                        type="number"
                        value={sizeVal.w}
                        oninput={(e) => {
                          const val = parseInt((e.target as HTMLInputElement).value) || 0;
                          sizeVal = { ...sizeVal, w: val };
                        }}
                        class={cn(
                          'w-20 px-2 py-1 text-xs font-mono border ml-1',
                          fieldMode ? 'bg-nb-black border-nb-yellow/30 text-nb-yellow' : 'bg-nb-white border-nb-black/20 text-nb-black'
                        )}
                      />
                    </label>
                  {/if}
                  {#if sizeMode !== 'w'}
                    <label class={cn('text-[10px] font-mono', mutedClass)}>
                      Height
                      <input
                        type="number"
                        value={sizeVal.h}
                        oninput={(e) => {
                          const val = parseInt((e.target as HTMLInputElement).value) || 0;
                          sizeVal = { ...sizeVal, h: val };
                        }}
                        class={cn(
                          'w-20 px-2 py-1 text-xs font-mono border ml-1',
                          fieldMode ? 'bg-nb-black border-nb-yellow/30 text-nb-yellow' : 'bg-nb-white border-nb-black/20 text-nb-black'
                        )}
                      />
                    </label>
                  {/if}
                </div>
              {/if}
            </fieldset>

            <!-- Rotation -->
            <fieldset class="space-y-2">
              <legend class={cn('text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1', textClass)}>
                <Icon name="rotate_right" class="text-sm text-orange-500" />
                Rotation
              </legend>
              <div class="flex items-center gap-2">
                <div class="flex gap-1">
                  {#each [0, 90, 180, 270] as deg}
                    <button
                      type="button"
                      class={cn(
                        'px-2 py-1 text-xs font-mono border transition-nb',
                        rotationDeg === deg
                          ? fieldMode ? 'bg-nb-yellow text-black border-nb-yellow' : 'bg-nb-blue text-white border-nb-blue'
                          : fieldMode ? 'border-nb-yellow/30 text-nb-yellow/60 hover:bg-nb-yellow/10' : 'border-nb-black/20 text-nb-black/60 hover:bg-nb-black/5'
                      )}
                      onclick={() => rotationDeg = deg}
                    >
                      {deg}&deg;
                    </button>
                  {/each}
                </div>
                <label class={cn('flex items-center gap-1 text-[10px]', mutedClass)}>
                  <input type="checkbox" bind:checked={mirrored} />
                  Mirror (!)
                </label>
              </div>
              <input
                type="range"
                min="0"
                max="359"
                bind:value={rotationDeg}
                class={cn(
                  'w-full h-1.5 appearance-none cursor-pointer',
                  fieldMode ? 'accent-nb-yellow bg-nb-yellow/20' : 'accent-nb-blue bg-nb-black/10'
                )}
                aria-label="Rotation degrees"
              />
              <div class={cn('text-[10px] font-mono text-center', mutedClass)}>{rotationDeg}&deg;</div>
            </fieldset>

            <!-- Quality & Format -->
            <div class="grid grid-cols-2 gap-4">
              <fieldset class="space-y-2">
                <legend class={cn('text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1', textClass)}>
                  <Icon name="high_quality" class="text-sm text-purple-500" />
                  Quality
                </legend>
                <QualitySelector
                  options={QUALITY_OPTIONS.map(q => ({ value: q.value, label: q.label }))}
                  value={quality}
                  onChange={(q) => quality = q}
                  {fieldMode}
                />
              </fieldset>
              <fieldset class="space-y-2">
                <legend class={cn('text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1', textClass)}>
                  <Icon name="image" class="text-sm text-yellow-500" />
                  Format
                </legend>
                <FormatSelector
                  options={FORMAT_OPTIONS.map(f => ({ value: f.value, label: f.label }))}
                  value={format}
                  onChange={(f) => format = f}
                  {fieldMode}
                />
              </fieldset>
            </div>
          </div>
        {:else}
          <!-- Code tab -->
          <div class="p-4 space-y-4">
            <div class="space-y-1">
              <span class={cn('text-[10px] font-mono font-bold uppercase tracking-wider', mutedClass)}>cURL</span>
              <pre class={cn(
                'p-3 text-xs font-mono overflow-x-auto border',
                fieldMode ? 'bg-nb-black border-nb-yellow/20 text-nb-yellow/80' : 'bg-nb-cream border-nb-black/10 text-nb-black/80'
              )}>{`curl -X GET "${url}"`}</pre>
            </div>
            <div class="space-y-1">
              <span class={cn('text-[10px] font-mono font-bold uppercase tracking-wider', mutedClass)}>HTML</span>
              <pre class={cn(
                'p-3 text-xs font-mono overflow-x-auto border',
                fieldMode ? 'bg-nb-black border-nb-yellow/20 text-nb-yellow/80' : 'bg-nb-cream border-nb-black/10 text-nb-black/80'
              )}>{`<img src="${url}" alt="IIIF Image" loading="lazy" />`}</pre>
            </div>
            <div class="space-y-1">
              <span class={cn('text-[10px] font-mono font-bold uppercase tracking-wider', mutedClass)}>Full URL</span>
              <pre class={cn(
                'p-3 text-xs font-mono overflow-x-auto border break-all whitespace-pre-wrap',
                fieldMode ? 'bg-nb-black border-nb-yellow/20 text-nb-yellow/80' : 'bg-nb-cream border-nb-black/10 text-nb-black/80'
              )}>{url}</pre>
            </div>
          </div>
        {/if}
      </div>

      <WorkbenchFooter
        onApply={() => { onApply(url); onClose(); }}
        onReset={handleReset}
        {fieldMode}
      />
    </div>
  </div>
</div>
