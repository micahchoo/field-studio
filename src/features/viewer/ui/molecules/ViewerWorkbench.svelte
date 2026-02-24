<!--
  ViewerWorkbench — IIIF Image API parameter workbench modal
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
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IIIFCanvas } from '@/src/shared/types';
  import type { RegionMode, SizeMode, RegionCoords, SizeValues } from '../atoms/WorkbenchParameterControls.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import PreviewHeader from '../atoms/PreviewHeader.svelte';
  import QualitySelector from '../atoms/QualitySelector.svelte';
  import FormatSelector from '../atoms/FormatSelector.svelte';
  import WorkbenchFooter from '../atoms/WorkbenchFooter.svelte';
  import WorkbenchParameterControls from '../atoms/WorkbenchParameterControls.svelte';

  interface Props {
    canvas: IIIFCanvas;
    onApply: (url: string) => void;
    onClose: () => void;
    cx?: ContextualClassNames | Record<string, string>;
    fieldMode?: boolean;
  }

  let {
    canvas, onApply, onClose, cx: _cx, fieldMode = false,
  }: Props = $props();

  // Local UI state
  let regionMode = $state<RegionMode>('full');
  let sizeMode = $state<SizeMode>('max');
  let regionCoords = $state<RegionCoords>({ x: 0, y: 0, w: 100, h: 100 });
  let sizeVal = $state<SizeValues>({ w: 1000, h: 1000, pct: 100 });
  let rotationDeg = $state(0);
  let mirrored = $state(false);
  let upscale = $state(false);
  let quality = $state('default');
  let format = $state('jpg');
  let activeTab = $state<'params' | 'code'>('params');

  // Extract image service URL from canvas
  // svelte-ignore state_referenced_locally -- intentional: initial-value capture, canvas is static for workbench lifetime
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
      region: r, size: s,
      rotation: mirrored ? `!${rotationDeg}` : rotationDeg.toString(),
      quality, format,
    };
  });

  let url = $derived(
    service
      ? `${imageId}/${params.region}/${params.size}/${params.rotation}/${params.quality}.${params.format}`
      : imageId
  );

  function handleReset() {
    regionMode = 'full'; sizeMode = 'max';
    regionCoords = { x: 0, y: 0, w: 100, h: 100 };
    sizeVal = { w: 1000, h: 1000, pct: 100 };
    rotationDeg = 0; mirrored = false; upscale = false;
    quality = 'default'; format = 'jpg';
  }

  function handleKeydown(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }

  let bgClass = $derived(fieldMode ? 'bg-nb-black' : 'bg-nb-white');
  let borderClass = $derived(fieldMode ? 'border-nb-black' : 'border-nb-black/20');
  let textClass = $derived(fieldMode ? 'text-white' : 'text-nb-black');
  let mutedClass = $derived(fieldMode ? 'text-white/50' : 'text-nb-black/50');

  function tabClass(tab: 'params' | 'code'): string {
    const base = 'flex-1 px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-nb';
    if (activeTab === tab) {
      return cn(base, fieldMode
        ? 'bg-nb-yellow/20 text-nb-yellow border-b-2 border-nb-yellow'
        : 'bg-nb-blue/10 text-nb-blue border-b-2 border-nb-blue');
    }
    return cn(base, fieldMode ? 'text-white/40 hover:text-white/60' : 'text-nb-black/40 hover:text-nb-black/60');
  }

  let codeBlockClass = $derived(cn(
    'p-3 text-xs font-mono overflow-x-auto border',
    fieldMode ? 'bg-nb-black border-nb-yellow/20 text-nb-yellow/80' : 'bg-nb-cream border-nb-black/10 text-nb-black/80'
  ));
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nb-black/60 backdrop-blur-sm"
  onclick={onClose}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="IIIF Image API Workbench"
  tabindex="0"
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
      <div class="flex-1 relative overflow-hidden flex items-center justify-center bg-nb-black">
        {#if url}
          <img
            src={url}
            alt=""
            class="max-w-full max-h-full object-contain"
            style={rotationDeg !== 0 ? `transform: rotate(${rotationDeg}deg)${mirrored ? ' scaleX(-1)' : ''}` : mirrored ? 'transform: scaleX(-1)' : ''}
          />
        {:else}
          <div class="text-white/30 text-sm font-mono">No image service available</div>
        {/if}
      </div>
      <div class={cn(
        'px-4 py-2 border-t font-mono text-xs truncate',
        fieldMode ? 'border-nb-yellow/30 bg-nb-black text-nb-yellow/60' : 'border-nb-black/20 bg-nb-cream text-nb-black/60'
      )}>
        {url || 'No URL'}
      </div>
    </div>

    <!-- Right: Controls -->
    <div class={cn('w-96 flex flex-col border-l', bgClass, borderClass)}>
      <div class={cn('flex border-b', borderClass)}>
        <button type="button" class={tabClass('params')} onclick={() => activeTab = 'params'}>
          <Icon name="tune" class="text-sm mr-1" /> Parameters
        </button>
        <button type="button" class={tabClass('code')} onclick={() => activeTab = 'code'}>
          <Icon name="code" class="text-sm mr-1" /> Code
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        {#if activeTab === 'params'}
          <div class="p-4 space-y-6">
            <WorkbenchParameterControls
              {regionMode} {sizeMode} {regionCoords} {sizeVal}
              {rotationDeg} {mirrored} {upscale}
              onRegionModeChange={(m) => regionMode = m}
              onSizeModeChange={(m) => sizeMode = m}
              onRegionCoordsChange={(c) => regionCoords = c}
              onSizeValChange={(v) => sizeVal = v}
              onRotationDegChange={(d) => rotationDeg = d}
              onMirroredChange={(m) => mirrored = m}
              onUpscaleChange={(u) => upscale = u}
              {fieldMode}
            />

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
          <div class="p-4 space-y-4">
            <div class="space-y-1">
              <span class={cn('text-[10px] font-mono font-bold uppercase tracking-wider', mutedClass)}>cURL</span>
              <pre class={codeBlockClass}>{`curl -X GET "${url}"`}</pre>
            </div>
            <div class="space-y-1">
              <span class={cn('text-[10px] font-mono font-bold uppercase tracking-wider', mutedClass)}>HTML</span>
              <pre class={codeBlockClass}>{`<img src="${url}" alt="IIIF Image" loading="lazy" />`}</pre>
            </div>
            <div class="space-y-1">
              <span class={cn('text-[10px] font-mono font-bold uppercase tracking-wider', mutedClass)}>Full URL</span>
              <pre class={cn(codeBlockClass, 'break-all whitespace-pre-wrap')}>{url}</pre>
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
