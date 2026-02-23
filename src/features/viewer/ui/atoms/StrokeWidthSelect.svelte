<!--
  StrokeWidthSelect — 3 buttons showing proportional stroke-width dots

  ORIGINAL: src/features/viewer/ui/atoms/StrokeWidthSelect.tsx (62 lines)
  LAYER: atom (presentation-only, zero state)
  FSD: features/viewer/ui/atoms

  Renders 3 buttons, each showing a filled circle whose diameter is
  proportional to the stroke width it represents. The active width
  gets a ring highlight. Used alongside AnnotationColorPicker in
  the annotation drawing toolbar.

  Static WIDTHS array in <script module> per Rule 2.F.
  cx/fieldMode optional per Rule 5.D (atom).
-->

<script module lang="ts">
  /** Available stroke widths — static data, shared across all instances */
  export const WIDTHS = [
    { value: 2, dotSize: 'w-1.5 h-1.5' },
    { value: 4, dotSize: 'w-2.5 h-2.5' },
    { value: 8, dotSize: 'w-4 h-4' },
  ] as const;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    /** Currently selected stroke width */
    value: number;
    /** Callback when a width button is clicked */
    onChange: (width: number) => void;
    /** Current stroke color — fills the dots */
    color?: string;
    fieldMode?: boolean;
    cx?: Partial<ContextualClassNames>;
    class?: string;
  }

  let {
    value,
    onChange,
    color = '#000000',
    fieldMode = false,
    cx,
    class: className = ''
  }: Props = $props();
</script>

<!-- PSEUDO: Row of 3 square buttons, each containing a proportionally-sized filled dot -->
<div
  class={cn('flex items-center gap-1', className)}
  role="radiogroup"
  aria-label="Stroke width"
>
  {#each WIDTHS as width (width.value)}
    <!-- PSEUDO: Square button housing a dot; active width gets ring highlight -->
    <button
      type="button"
      class={cn(
        'w-8 h-8 flex items-center justify-center border-2 rounded cursor-pointer transition-all',
        value === width.value
          ? 'ring-2 ring-offset-1'
          : 'hover:bg-nb-black/5',
        value === width.value && (fieldMode ? 'ring-nb-yellow ring-offset-nb-black border-nb-yellow' : 'ring-nb-black ring-offset-nb-white border-nb-black'),
        fieldMode ? 'border-nb-yellow/60' : 'border-nb-black/40'
      )}
      onclick={() => onChange(width.value)}
      role="radio"
      aria-checked={value === width.value}
      aria-label="{width.value}px stroke"
      title="{width.value}px"
    >
      <!-- PSEUDO: Filled circle sized proportionally to the stroke width -->
      <span
        class={cn('rounded-full', width.dotSize)}
        style:background-color={color}
      ></span>
    </button>
  {/each}
</div>
