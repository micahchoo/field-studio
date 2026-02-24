<!--
  MediaControlBar -- Combined controls bar for media player

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Wraps progress bar, annotation mode indicator, transport controls,
  volume, and fullscreen button into a single composable bar.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import PlayerControls from './PlayerControls.svelte';
  import MediaProgressBar from './MediaProgressBar.svelte';
  import VolumeControl from './VolumeControl.svelte';
  import { formatTimeForDisplay } from '../../model/annotation';
  import type { TimeRange } from '../../model/annotation';
  import type { IIIFAnnotation } from '@/src/shared/types';
  import type { ChapterMarker } from '../molecules/mediaPlayerHelpers';

  interface Props {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    playbackRate: number;
    volume: number;
    isMuted: boolean;
    isFullscreen: boolean;
    chapters: ChapterMarker[];
    annotations: IIIFAnnotation[];
    annotationModeActive: boolean;
    timeRange: TimeRange | null;
    hasAccompanyingContent: boolean;
    showAccompanying: boolean;
    showTranscript: boolean;
    mediaType: 'audio' | 'video';
    onSeek: (time: number) => void;
    onSeekRelative: (delta: number) => void;
    onTimeClick: (time: number) => void;
    onTogglePlayPause: () => void;
    onSeekToPrevChapter: () => void;
    onSeekToNextChapter: () => void;
    onSetPlaybackRate: (rate: number) => void;
    onToggleTranscript: () => void;
    onVolumeChange: (vol: number) => void;
    onMuteToggle: () => void;
    onToggleFullscreen: () => void;
    onUseCurrentTime: () => void;
    fieldMode?: boolean;
  }

  let {
    currentTime,
    duration,
    isPlaying,
    playbackRate,
    volume,
    isMuted,
    isFullscreen,
    chapters,
    annotations,
    annotationModeActive,
    timeRange,
    hasAccompanyingContent,
    showAccompanying,
    showTranscript,
    mediaType,
    onSeek,
    onSeekRelative,
    onTimeClick,
    onTogglePlayPause,
    onSeekToPrevChapter,
    onSeekToNextChapter,
    onSetPlaybackRate,
    onToggleTranscript,
    onVolumeChange,
    onMuteToggle,
    onToggleFullscreen,
    onUseCurrentTime,
    fieldMode = false,
  }: Props = $props();

  let controlBgClass = $derived(fieldMode ? 'from-black/90' : 'from-nb-black/90');
</script>

<div class={cn('bg-gradient-to-t to-transparent p-4', controlBgClass)}>
  <MediaProgressBar
    {currentTime}
    {duration}
    {chapters}
    {annotations}
    {annotationModeActive}
    {timeRange}
    {onSeek}
    {onSeekRelative}
    {onTimeClick}
    {fieldMode}
  />

  <!-- Annotation mode indicator -->
  {#if annotationModeActive}
    <div class={cn(
      'flex items-center justify-between mb-2 text-xs',
      fieldMode ? 'text-nb-yellow' : 'text-nb-green'
    )}>
      <span>
        {#if !timeRange}
          Click timeline to set start
        {:else if timeRange.end === undefined}
          Click timeline to set end
        {:else}
          Selected: {formatTimeForDisplay(timeRange.start)} - {formatTimeForDisplay(timeRange.end)}
        {/if}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onclick={onUseCurrentTime}
        class={cn('text-xs', fieldMode ? 'text-nb-yellow hover:text-nb-yellow' : 'text-nb-green hover:text-nb-green/60')}
      >
        Use current time ({formatTimeForDisplay(currentTime)})
      </Button>
    </div>
  {/if}

  <!-- Transport controls + volume + fullscreen -->
  <div class="flex flex-wrap items-center justify-between gap-2">
    <PlayerControls
      {isPlaying}
      {currentTime}
      {duration}
      {playbackRate}
      hasChapters={chapters.length > 0}
      {hasAccompanyingContent}
      {showAccompanying}
      {showTranscript}
      {onTogglePlayPause}
      onSeekRelative={onSeekRelative}
      {onSeekToPrevChapter}
      {onSeekToNextChapter}
      {onSetPlaybackRate}
      {onToggleTranscript}
      {fieldMode}
    />
    <div class="flex items-center gap-2">
      <VolumeControl
        {volume}
        {isMuted}
        {onVolumeChange}
        onMuteToggle={onMuteToggle}
        sliderWidth={64}
        {fieldMode}
      />
      {#if mediaType === 'video'}
        <button
          onclick={onToggleFullscreen}
          class="text-nb-white/60 hover:text-nb-white"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} class="text-sm" />
        </button>
      {/if}
    </div>
  </div>
</div>
