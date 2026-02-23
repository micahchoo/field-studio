<!--
  UpscaleToggle — Checkbox/button for image upscaling

  ORIGINAL: src/features/viewer/ui/atoms/UpscaleToggle.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Toggle button for allowing upscaling beyond original image size.
  Zero state - controlled by parent.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    /** Whether upscale is enabled */
    value?: boolean;
    /** Callback when toggle is clicked */
    onChange: (enabled: boolean) => void;
    /** Tooltip text */
    title?: string;
    /** Contextual styles from parent */
    cx?: Partial<ContextualClassNames>;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    value = false,
    onChange,
    title = 'Allow upscaling beyond original size',
    cx: _cx,
    fieldMode = false,
  }: Props = $props();
</script>

<button
  class={cn(
    'text-[9px] font-bold uppercase tracking-wide px-2 py-1 border transition-all duration-150',
    value
      ? 'bg-nb-blue border-nb-blue text-white'
      : fieldMode
        ? 'bg-transparent border-nb-black/40 text-nb-black/60'
        : 'bg-transparent border-nb-black/20 text-nb-black/50 hover:border-nb-black/40'
  )}
  onclick={() => onChange(!value)}
  {title}
  aria-pressed={value}
  aria-label={title}
>
  Upscale ^
</button>
