<!--
  WorkbenchParameterControls -- Region, Size, and Rotation controls for the IIIF Image API workbench

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Renders the three parameter fieldsets (Region, Size, Rotation) used in the
  workbench parameter tab. Each fieldset uses PresetSelector for mode selection
  and inline numeric inputs for detailed values.
-->

<script module lang="ts">
  export type RegionMode = 'full' | 'square' | 'pct' | 'pixel';
  export type SizeMode = 'max' | 'pct' | 'w' | 'h' | 'wh' | 'bestfit';

  export interface RegionCoords {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  export interface SizeValues {
    w: number;
    h: number;
    pct: number;
  }

  export const REGION_PRESETS = [
    { value: 'full', label: 'Full', description: 'Entire image' },
    { value: 'square', label: 'Square', description: 'Centered square crop' },
    { value: 'pixel', label: 'Pixels', description: 'x,y,w,h in pixels' },
    { value: 'pct', label: 'Percent', description: 'Percent-based region' },
  ] as const;

  export const SIZE_PRESETS = [
    { value: 'max', label: 'Max', description: 'Maximum available size' },
    { value: 'pct', label: 'Percent', description: 'Scale by percentage' },
    { value: 'w', label: 'Width', description: 'Width only, auto height' },
    { value: 'h', label: 'Height', description: 'Height only, auto width' },
    { value: 'wh', label: 'Exact', description: 'Exact width,height' },
    { value: 'bestfit', label: 'Best Fit', description: 'Fit within dimensions' },
  ] as const;
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import PresetSelector from './PresetSelector.svelte';

  interface Props {
    regionMode: RegionMode;
    sizeMode: SizeMode;
    regionCoords: RegionCoords;
    sizeVal: SizeValues;
    rotationDeg: number;
    mirrored: boolean;
    upscale: boolean;
    onRegionModeChange: (mode: RegionMode) => void;
    onSizeModeChange: (mode: SizeMode) => void;
    onRegionCoordsChange: (coords: RegionCoords) => void;
    onSizeValChange: (val: SizeValues) => void;
    onRotationDegChange: (deg: number) => void;
    onMirroredChange: (mirrored: boolean) => void;
    onUpscaleChange: (upscale: boolean) => void;
    fieldMode?: boolean;
  }

  let {
    regionMode, sizeMode, regionCoords, sizeVal,
    rotationDeg, mirrored, upscale,
    onRegionModeChange, onSizeModeChange, onRegionCoordsChange,
    onSizeValChange, onRotationDegChange, onMirroredChange, onUpscaleChange,
    fieldMode = false,
  }: Props = $props();

  let textClass = $derived(fieldMode ? 'text-white' : 'text-nb-black');
  let mutedClass = $derived(fieldMode ? 'text-white/50' : 'text-nb-black/50');
  let inputClass = $derived(
    fieldMode
      ? 'bg-nb-black border-nb-yellow/30 text-nb-yellow'
      : 'bg-nb-white border-nb-black/20 text-nb-black'
  );

  function handleNumericInput(e: Event): number {
    return parseInt((e.target as HTMLInputElement).value) || 0;
  }
</script>

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
    onChange={(v) => onRegionModeChange(v as RegionMode)}
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
            value={regionCoords[field.key as keyof RegionCoords]}
            oninput={(e) => onRegionCoordsChange({ ...regionCoords, [field.key]: handleNumericInput(e) })}
            class={cn('w-full px-2 py-1 text-xs font-mono border mt-0.5', inputClass)}
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
      <input type="checkbox" checked={upscale} onchange={() => onUpscaleChange(!upscale)} />
      Upscale (^)
    </label>
    <PresetSelector
      options={SIZE_PRESETS.map(p => ({ value: p.value, label: p.label, description: p.description }))}
      value={sizeMode}
      onChange={(v) => onSizeModeChange(v as SizeMode)}
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
          oninput={(e) => onSizeValChange({ ...sizeVal, pct: handleNumericInput(e) || 100 })}
          class={cn('w-20 px-2 py-1 text-xs font-mono border ml-1', inputClass)}
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
            oninput={(e) => onSizeValChange({ ...sizeVal, w: handleNumericInput(e) })}
            class={cn('w-20 px-2 py-1 text-xs font-mono border ml-1', inputClass)}
          />
        </label>
      {/if}
      {#if sizeMode !== 'w'}
        <label class={cn('text-[10px] font-mono', mutedClass)}>
          Height
          <input
            type="number"
            value={sizeVal.h}
            oninput={(e) => onSizeValChange({ ...sizeVal, h: handleNumericInput(e) })}
            class={cn('w-20 px-2 py-1 text-xs font-mono border ml-1', inputClass)}
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
          onclick={() => onRotationDegChange(deg)}
        >
          {deg}&deg;
        </button>
      {/each}
    </div>
    <label class={cn('flex items-center gap-1 text-[10px]', mutedClass)}>
      <input type="checkbox" checked={mirrored} onchange={() => onMirroredChange(!mirrored)} />
      Mirror (!)
    </label>
  </div>
  <input
    type="range"
    min="0"
    max="359"
    value={rotationDeg}
    oninput={(e) => onRotationDegChange(parseInt((e.target as HTMLInputElement).value))}
    class={cn(
      'w-full h-1.5 appearance-none cursor-pointer',
      fieldMode ? 'accent-nb-yellow bg-nb-yellow/20' : 'accent-nb-blue bg-nb-black/10'
    )}
    aria-label="Rotation degrees"
  />
  <div class={cn('text-[10px] font-mono text-center', mutedClass)}>{rotationDeg}&deg;</div>
</fieldset>
