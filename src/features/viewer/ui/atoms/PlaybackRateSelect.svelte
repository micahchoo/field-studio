<!--
  PlaybackRateSelect — Dropdown for playback rate selection

  ORIGINAL: src/features/viewer/ui/atoms/PlaybackRateSelect.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Allows selection of common playback rates (0.5x to 2x).
  Rendered as a native <select> for simplicity and accessibility.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  const DEFAULT_RATES = [
    { value: 0.5,  label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1,    label: '1x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5,  label: '1.5x' },
    { value: 2,    label: '2x' },
  ];

  interface Props {
    /** Currently selected playback rate */
    value?: number;
    /** Callback when rate changes */
    onChange: (rate: number) => void;
    /** Field mode flag */
    fieldMode?: boolean;
    /** Contextual styles from parent */
    cx?: Partial<ContextualClassNames>;
  }

  let {
    value = 1,
    onChange,
    fieldMode = false,
    cx: _cx,
  }: Props = $props();
</script>

<select
  class={cn(
    'text-xs font-mono border px-1 py-0.5 cursor-pointer transition-nb',
    fieldMode
      ? 'bg-nb-black border-nb-yellow/60 text-nb-yellow'
      : 'bg-nb-white border-nb-black/20 text-nb-black'
  )}
  value={value}
  onchange={(e) => onChange(Number((e.target as HTMLSelectElement).value))}
  aria-label="Playback rate"
>
  {#each DEFAULT_RATES as rate}
    <option value={rate.value} selected={rate.value === value}>
      {rate.label}
    </option>
  {/each}
</select>
