<!--
  ImageFilterPanel — Floating panel for image filter controls
  React source: src/features/viewer/ui/molecules/ImageFilterPanel.tsx (156 lines)
  Layer: molecule (FSD features/viewer/ui/molecules)

  Slide-out panel with brightness, contrast sliders and invert/grayscale
  toggles for degraded archival document enhancement.
-->

<script module lang="ts">
  import type { ImageFilterState } from '../../model/imageFilters.svelte';

  export type { ImageFilterState as FilterState };
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import RangeInput from '@/src/shared/ui/atoms/RangeInput.svelte';

  interface Props {
    filters: ImageFilterState;
    isActive: boolean;
    onBrightnessChange: (v: number) => void;
    onContrastChange: (v: number) => void;
    onToggleInvert: () => void;
    onToggleGrayscale: () => void;
    onReset: () => void;
    onClose: () => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    filters,
    isActive,
    onBrightnessChange,
    onContrastChange,
    onToggleInvert,
    onToggleGrayscale,
    onReset,
    onClose,
    cx,
    fieldMode,
  }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }

  function formatValue(v: number): string {
    return v > 0 ? `+${v}` : `${v}`;
  }
</script>

{#snippet sliderRow(label: string, value: number, min: number, max: number, onchange: (v: number) => void)}
  <div class="flex flex-col gap-1">
    <div class="flex items-center justify-between">
      <span class={cn('text-xs', fieldMode ? 'text-nb-yellow/70' : 'text-nb-black/60')}>
        {label}
      </span>
      <span class={cn('text-xs tabular-nums font-mono', fieldMode ? 'text-nb-yellow' : 'text-nb-black/80')}>
        {formatValue(value)}
      </span>
    </div>
    <RangeInput
      {min}
      {max}
      {value}
      oninput={(e) => onchange(parseInt((e.target as HTMLInputElement).value))}
      class={cn(
        'w-full h-1.5 rounded-none appearance-none cursor-pointer',
        fieldMode ? 'accent-nb-yellow bg-nb-yellow/20' : 'accent-nb-blue bg-nb-black/10'
      )}
      aria-label={label}
    />
  </div>
{/snippet}

{#snippet toggleRow(label: string, icon: string, active: boolean, ontoggle: () => void)}
  <button
    aria-label={label}
    type="button"
    onclick={ontoggle}
    class={cn(
      'flex items-center gap-2 px-3 py-2 text-xs transition-nb w-full',
      active
        ? fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-blue/10 text-nb-blue'
        : fieldMode ? 'text-nb-yellow/60 hover:bg-nb-yellow/10' : 'text-nb-black/60 hover:bg-nb-black/5'
    )}
    aria-pressed={active}
  >
    <Icon name={icon} class="text-sm" />
    <span>{label}</span>
    {#if active}
      <Icon name="check" class="ml-auto text-sm" />
    {/if}
  </button>
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class={cn(
    'absolute top-3 right-3 z-20 w-56 shadow-brutal backdrop-blur-sm border',
    fieldMode
      ? 'bg-nb-black/95 border-nb-yellow/30'
      : 'bg-nb-white border-nb-black/20'
  )}
  role="dialog"
  aria-label="Image filters"
  onkeydown={handleKeydown}
  tabindex="0"
>
  <!-- Header -->
  <div class={cn(
    'flex items-center justify-between px-3 py-2 border-b',
    fieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10'
  )}>
    <span class={cn(
      'text-xs font-semibold uppercase tracking-wider flex items-center gap-1',
      fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'
    )}>
      <Icon name="tune" class="text-sm" />
      Image Filters
    </span>
    <div class="flex items-center gap-1">
      {#if isActive}
        <Button variant="ghost" size="bare" onclick={onReset} title="Reset filters">
          <span class={cn('text-[10px]', fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/40')}>Reset</span>
        </Button>
      {/if}
      <Button variant="ghost" size="bare" onclick={onClose} aria-label="Close">
        <Icon name="close" class={cn('text-sm', fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/30')} />
      </Button>
    </div>
  </div>

  <!-- Sliders -->
  <div class="p-3 space-y-4">
    {@render sliderRow('Brightness', filters.brightness, -100, 100, onBrightnessChange)}
    {@render sliderRow('Contrast', filters.contrast, -100, 100, onContrastChange)}
  </div>

  <!-- Toggles -->
  <div class={cn('border-t', fieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10')}>
    {@render toggleRow('Invert Colors', 'invert_colors', filters.invert, onToggleInvert)}
    {@render toggleRow('Grayscale', 'filter_b_and_w', filters.grayscale, onToggleGrayscale)}
  </div>
</div>
