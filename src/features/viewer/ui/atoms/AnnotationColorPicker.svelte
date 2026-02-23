<!--
  AnnotationColorPicker — Row of 8 color swatch buttons for annotation colors

  ORIGINAL: src/features/viewer/ui/atoms/AnnotationColorPicker.tsx (58 lines)
  LAYER: atom (presentation-only, zero state)
  FSD: features/viewer/ui/atoms

  Renders a horizontal row of 8 preset color buttons. The currently active
  color gets a ring highlight. Used in the annotation drawing toolbar to
  pick stroke/fill color for annotations on the viewer canvas.

  Static PRESET_COLORS in <script module> per Rule 2.F.
  cx/fieldMode optional per Rule 5.D (atom).
-->

<script module lang="ts">
  /** 8 preset annotation colors — static data, shared across all instances */
  export const PRESET_COLORS = [
    '#FF0000',  // Red
    '#FF8800',  // Orange
    '#FFEE00',  // Yellow
    '#00CC44',  // Green
    '#0088FF',  // Blue
    '#8844FF',  // Purple
    '#FF44AA',  // Pink
    '#000000',  // Black
  ] as const;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    /** Currently selected color (hex string) */
    value: string;
    /** Callback when a color swatch is clicked */
    onChange: (color: string) => void;
    fieldMode?: boolean;
    cx?: Partial<ContextualClassNames>;
    class?: string;
  }

  let { value, onChange, fieldMode = false, cx, class: className = '' }: Props = $props();
</script>

<!-- PSEUDO: Horizontal row of circular color swatch buttons -->
<div
  class={cn('flex items-center gap-1.5', className)}
  role="radiogroup"
  aria-label="Annotation color"
>
  {#each PRESET_COLORS as color (color)}
    <!-- PSEUDO: Circular button filled with the preset color; active gets ring -->
    <button
      type="button"
      class={cn(
        'w-6 h-6 rounded-full border-2 cursor-pointer transition-all',
        value === color
          ? 'ring-2 ring-offset-2 scale-110'
          : 'hover:scale-105',
        value === color && (fieldMode ? 'ring-nb-yellow ring-offset-nb-black' : 'ring-nb-black ring-offset-nb-white'),
        fieldMode ? 'border-nb-yellow' : 'border-nb-black'
      )}
      style:background-color={color}
      onclick={() => onChange(color)}
      role="radio"
      aria-checked={value === color}
      aria-label={color}
      title={color}
    ></button>
  {/each}
</div>
