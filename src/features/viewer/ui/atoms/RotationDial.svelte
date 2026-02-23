<!--
  RotationDial — 4 preset rotation buttons + fine-tune slider

  ORIGINAL: src/features/viewer/ui/atoms/RotationDial.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Horizontal button group for preset rotations (0, 90, 180, 270),
  active state on matching value. Fine-tune slider for custom angles.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import Slider from './Slider.svelte';

  const DEFAULT_PRESETS = [0, 90, 180, 270];

  interface Props {
    /** Current rotation value in degrees (0-359) */
    value?: number;
    /** Callback when rotation changes */
    onChange: (rotation: number) => void;
    /** Available preset angles */
    presets?: number[];
    /** Contextual styles from parent */
    cx?: Partial<ContextualClassNames>;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    value = 0,
    onChange,
    presets = DEFAULT_PRESETS,
    cx: _cx,
    fieldMode = false,
  }: Props = $props();
</script>

<div class="space-y-3">
  <!-- Preset buttons -->
  <div class="grid grid-cols-4 gap-1">
    {#each presets as angle}
      {@const isActive = value === angle}
      <button
        onclick={() => onChange(angle)}
        class={cn(
          'text-xs font-bold py-2 px-1 border transition-nb',
          isActive
            ? fieldMode
              ? 'bg-nb-orange/20 border-nb-orange text-orange-400'
              : 'bg-orange-50 border-nb-orange text-orange-700'
            : fieldMode
              ? 'bg-transparent border-nb-black/40 text-nb-black/60'
              : 'bg-transparent border-nb-black/20 text-nb-black/50 hover:border-nb-black/40'
        )}
        aria-pressed={isActive}
        aria-label="Rotate to {angle} degrees"
      >
        {angle}°
      </button>
    {/each}
  </div>

  <!-- Fine-tune slider -->
  <div class="space-y-1">
    <Slider
      {value}
      onChange={onChange}
      min={0}
      max={359}
      color="orange"
      {fieldMode}
    />
    <div class={cn('text-center text-xs font-mono', fieldMode ? 'text-orange-400' : 'text-nb-orange')}>
      {value}°
    </div>
  </div>
</div>
