<!--
  AudioControls -- Transport controls for the AudioWaveform player

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Play/pause, seek, playback rate, volume, and time display for waveform player.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { Icon } from '@/src/shared/ui/atoms';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';
  import PlayPauseButton from './PlayPauseButton.svelte';
  import { formatTimeForDisplay } from '../../model/annotation';

  interface Props {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playbackRate: number;
    volume: number;
    onTogglePlayPause: () => void;
    onRewind: () => void;
    onForward: () => void;
    onPlaybackRateChange: (rate: number) => void;
    onVolumeChange: (vol: number) => void;
    fieldMode?: boolean;
  }

  let {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    onTogglePlayPause,
    onRewind,
    onForward,
    onPlaybackRateChange,
    onVolumeChange,
    fieldMode = false,
  }: Props = $props();

  const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

  function cyclePlaybackRate(): void {
    const idx = RATES.indexOf(playbackRate);
    onPlaybackRateChange(RATES[(idx + 1) % RATES.length]);
  }
</script>

<div class="p-4 border-t border-nb-white/10">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex items-center gap-1">
      <PlayPauseButton {isPlaying} onToggle={onTogglePlayPause} {fieldMode} />
      <IconButton
        icon="replay_10"
        label="Rewind 10s"
        onclick={onRewind}
        size="sm"
        class="!text-white hover:!text-nb-blue"
      />
      <IconButton
        icon="forward_10"
        label="Forward 10s"
        onclick={onForward}
        size="sm"
        class="!text-white hover:!text-nb-blue"
      />
      <span class={cn(
        'text-xs font-mono tabular-nums ml-1',
        fieldMode ? 'text-nb-yellow/70' : 'text-nb-white/60'
      )}>
        {formatTimeForDisplay(currentTime)} / {formatTimeForDisplay(duration)}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={cyclePlaybackRate}
        class={cn(
          'text-xs font-mono px-1.5 py-0.5',
          fieldMode ? 'text-nb-yellow/70 hover:text-nb-yellow' : 'text-nb-white/60 hover:text-nb-white'
        )}
        title="Playback speed"
      >
        {playbackRate}x
      </button>
      <!-- eslint-disable-next-line @field-studio/no-native-html-in-molecules -- atom: native range input for volume -->
      <div class="flex items-center gap-1">
        <Icon
          name={volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
          class={cn('text-sm', fieldMode ? 'text-nb-yellow/60' : 'text-nb-white/40')}
        />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          oninput={(e) => onVolumeChange(Number((e.target as HTMLInputElement).value))}
          class="w-16 h-1 accent-current"
        />
      </div>
    </div>
  </div>
</div>
