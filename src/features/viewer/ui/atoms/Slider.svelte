<!--
  Slider — Generic range input

  ORIGINAL: src/features/viewer/ui/atoms/Slider.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Range slider control for numeric values.
  Wraps native range input with consistent styling and gradient background.
-->

<script lang="ts">
  type SliderColor = 'orange' | 'blue' | 'green' | 'purple';

  interface Props {
    /** Current value */
    value: number;
    /** Minimum value */
    min?: number;
    /** Maximum value */
    max?: number;
    /** Step increment */
    step?: number;
    /** Callback when value changes */
    onChange: (value: number) => void;
    /** Color accent for the slider */
    color?: SliderColor;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    value,
    min = 0,
    max = 100,
    step = 1,
    onChange,
    color = 'orange',
    fieldMode = false,
  }: Props = $props();

  const colorMap: Record<SliderColor, string> = {
    orange: '#f97316',
    blue:   '#3b82f6',
    green:  '#22c55e',
    purple: '#a855f7',
  };

  let percentage = $derived(((value - min) / (max - min)) * 100);
  let accentColor = $derived(colorMap[color]);
  let trackBg = $derived(fieldMode ? '#334155' : '#e2e8f0');
  let sliderBackground = $derived(
    `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percentage}%, ${trackBg} ${percentage}%, ${trackBg} 100%)`
  );
</script>

<input
  type="range"
  {min}
  {max}
  {step}
  {value}
  oninput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
  class="w-full cursor-pointer"
  style:appearance="none"
  style:height="6px"
  style:border-radius="3px"
  style:background={sliderBackground}
  style:outline="none"
  aria-label="Slider"
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={value}
/>
