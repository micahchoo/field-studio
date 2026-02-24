<!--
  PlayerControls — Transport controls for media player

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Play/pause button, seek buttons, chapter navigation,
  playback speed control, and time display.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';
  import PlayPauseButton from './PlayPauseButton.svelte';
  import { formatTimeForDisplay } from '../../model/annotation';

  interface Props {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playbackRate: number;
    hasChapters: boolean;
    hasAccompanyingContent?: boolean;
    showAccompanying?: boolean;
    showTranscript?: boolean;
    onTogglePlayPause: () => void;
    onSeekRelative: (delta: number) => void;
    onSeekToPrevChapter?: () => void;
    onSeekToNextChapter?: () => void;
    onSetPlaybackRate: (rate: number) => void;
    onToggleTranscript?: () => void;
    fieldMode?: boolean;
  }

  let {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    hasChapters,
    hasAccompanyingContent = false,
    showAccompanying = true,
    showTranscript = false,
    onTogglePlayPause,
    onSeekRelative,
    onSeekToPrevChapter,
    onSeekToNextChapter,
    onSetPlaybackRate,
    onToggleTranscript,
    fieldMode = false,
  }: Props = $props();

  const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

  function cyclePlaybackRate(): void {
    const idx = RATES.indexOf(playbackRate);
    const nextRate = RATES[(idx + 1) % RATES.length];
    onSetPlaybackRate(nextRate);
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <!-- Left group -->
  <div class="flex items-center gap-1">
    <PlayPauseButton {isPlaying} onToggle={onTogglePlayPause} {fieldMode} />
    <IconButton
      icon="replay_10"
      label="Rewind 10s"
      onclick={() => onSeekRelative(-10)}
      size="sm"
      class="!text-white hover:!text-nb-blue"
    />
    <IconButton
      icon="forward_10"
      label="Forward 10s"
      onclick={() => onSeekRelative(10)}
      size="sm"
      class="!text-white hover:!text-nb-blue"
    />
    {#if hasChapters && onSeekToPrevChapter && onSeekToNextChapter}
      <IconButton
        icon="skip_previous"
        label="Previous chapter"
        onclick={onSeekToPrevChapter}
        size="sm"
        class="!text-white hover:!text-nb-blue"
      />
      <IconButton
        icon="skip_next"
        label="Next chapter"
        onclick={onSeekToNextChapter}
        size="sm"
        class="!text-white hover:!text-nb-blue"
      />
    {/if}
    <span class={cn(
      'text-xs font-mono tabular-nums ml-1',
      fieldMode ? 'text-nb-yellow/70' : 'text-nb-white/60'
    )}>
      {formatTimeForDisplay(currentTime)} / {formatTimeForDisplay(duration)}
    </span>
  </div>

  <!-- Right group -->
  <div class="flex items-center gap-2">
    <!-- Transcript toggle -->
    {#if hasAccompanyingContent && showAccompanying && onToggleTranscript}
      <IconButton
        icon="subtitles"
        label={showTranscript ? 'Hide transcript' : 'Show transcript'}
        onclick={onToggleTranscript}
        size="sm"
        class={cn('!text-white hover:!text-nb-blue', showTranscript && '!bg-nb-blue/30')}
      />
    {/if}

    <!-- Playback rate -->
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
  </div>
</div>
