<!--
  VolumeControl — Volume slider + mute button

  ORIGINAL: src/features/viewer/ui/atoms/VolumeControl.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Mute icon button (volume_off/volume_down/volume_up based on level)
  + horizontal range slider. Shows 0% when muted.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { LIGHT_CLASSES, FIELD_CLASSES } from '@/src/shared/lib/contextual-styles';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';

  interface Props {
    /** Current volume level (0-1) */
    volume?: number;
    /** Whether audio is muted */
    isMuted?: boolean;
    /** Callback when volume changes */
    onVolumeChange: (vol: number) => void;
    /** Callback when mute is toggled */
    onMuteToggle: () => void;
    /** Width of the volume slider in pixels */
    sliderWidth?: number;
    /** Additional CSS classes */
    class?: string;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    volume = 1,
    isMuted = false,
    onVolumeChange,
    onMuteToggle,
    sliderWidth = 80,
    class: className = '',
    fieldMode = false,
  }: Props = $props();

  let resolvedCx: ContextualClassNames = $derived(
    fieldMode ? FIELD_CLASSES : LIGHT_CLASSES
  );

  let volumeIcon = $derived(() => {
    if (isMuted || volume === 0) return 'volume_off';
    if (volume > 0.5) return 'volume_up';
    return 'volume_down';
  });

  let displayVolume = $derived(isMuted ? 0 : volume);
  let accentColor = $derived(fieldMode ? '#facc15' : '#3b82f6');
  let trackBg = $derived(fieldMode ? '#475569' : '#cbd5e1');
  let percentage = $derived(displayVolume * 100);
  let sliderBackground = $derived(
    `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${percentage}%, ${trackBg} ${percentage}%, ${trackBg} 100%)`
  );
</script>

<div class={cn('flex items-center gap-2', className)}>
  <IconButton
    icon={volumeIcon()}
    label={isMuted ? 'Unmute' : 'Mute'}
    onclick={onMuteToggle}
    size="md"
    cx={resolvedCx}
    class="!text-white hover:!text-nb-blue"
  />
  <input
    type="range"
    min={0}
    max={1}
    step={0.05}
    value={displayVolume}
    oninput={(e) => onVolumeChange(parseFloat((e.target as HTMLInputElement).value))}
    class="h-1 cursor-pointer"
    style:width="{sliderWidth}px"
    style:appearance="none"
    style:border-radius="3px"
    style:background={sliderBackground}
    style:outline="none"
    aria-label="Volume"
    aria-valuemin={0}
    aria-valuemax={1}
    aria-valuenow={displayVolume}
  />
</div>
