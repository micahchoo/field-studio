<!--
  PlayPauseButton — Toggle button showing play or pause icon

  ORIGINAL: src/features/viewer/ui/atoms/PlayPauseButton.tsx (62 lines)
  LAYER: atom (presentation-only, zero state)
  FSD: features/viewer/ui/atoms

  Renders an IconButton that toggles between play_arrow and pause
  Material icons based on isPlaying state. Used in audio/video player
  controls in the viewer and timeline features.

  cx/fieldMode optional per Rule 5.D (atom).
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';
  import { LIGHT_CLASSES, FIELD_CLASSES } from '@/src/shared/lib/contextual-styles';

  interface Props {
    /** Whether media is currently playing */
    isPlaying: boolean;
    /** Callback when button is clicked */
    onToggle: () => void;
    /** Icon size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Visual variant — not yet fully wired, reserved for future styling */
    variant?: 'default' | 'primary' | 'ghost';
    /** Whether the button is disabled */
    disabled?: boolean;
    fieldMode?: boolean;
    cx?: Partial<ContextualClassNames>;
    class?: string;
  }

  let {
    isPlaying,
    onToggle,
    size = 'md',
    variant = 'default',
    disabled = false,
    fieldMode = false,
    cx,
    class: className = ''
  }: Props = $props();

  let icon = $derived(isPlaying ? 'pause' : 'play_arrow');
  let label = $derived(isPlaying ? 'Pause' : 'Play');

  /**
   * PSEUDO: Resolve full cx for IconButton (molecule requires full cx).
   */
  let resolvedCx = $derived(
    fieldMode
      ? { ...FIELD_CLASSES, ...cx } as ContextualClassNames
      : { ...LIGHT_CLASSES, ...cx } as ContextualClassNames
  );
</script>

<!-- PSEUDO: IconButton toggling between play_arrow and pause icons -->
<IconButton
  {icon}
  {label}
  onclick={onToggle}
  {disabled}
  {size}
  cx={resolvedCx}
  class={cn(
    variant === 'primary' && 'bg-nb-black text-nb-white',
    variant === 'primary' && fieldMode && 'bg-nb-yellow text-nb-black',
    className
  )}
/>
