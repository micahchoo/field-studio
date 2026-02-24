<!--
  MediaPlayer -- Full IIIF AV player with chapter navigation, annotations,
  spatial annotation drawing, transcript panel, and Media Session API

  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  IIIF Presentation API 3.0 AV features:
  - placeholderCanvas: Poster frames / loading placeholders
  - accompanyingCanvas: Transcripts, subtitles, synchronized content
  - timeMode behaviors: trim, scale, loop
  - W3C Media Fragments URI 1.0 time-based annotations
-->

<script lang="ts" module>
  export type { ChapterMarker } from './mediaPlayerHelpers';
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import MediaControlBar from '../atoms/MediaControlBar.svelte';
  import SpatialAnnotationOverlay from '../atoms/SpatialAnnotationOverlay.svelte';
  import TranscriptPanel from './TranscriptPanel.svelte';
  import {
    extractPlaceholderCanvas,
    extractAccompanyingCanvas,
    extractTimeMode,
    extractSyncPoints,
    findCurrentSyncPoint,
    createKeyboardHandler,
    setupMediaSession,
    getMediaErrorMessage,
    findNextChapter,
    findPrevChapterTime,
    computeTimeRangeClick,
  } from './mediaPlayerHelpers';
  import type { ChapterMarker } from './mediaPlayerHelpers';
  import { formatTimeForDisplay } from '../../model/annotation';
  import type { TimeRange } from '../../model/annotation';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';

  interface Props {
    canvas: IIIFCanvas;
    src: string;
    mediaType: 'audio' | 'video';
    poster?: string;
    autoPlay?: boolean;
    muted?: boolean;
    showAccompanying?: boolean;
    annotations?: IIIFAnnotation[];
    annotationModeActive?: boolean;
    onAnnotationModeToggle?: (active: boolean) => void;
    timeRange?: TimeRange | null;
    onTimeRangeChange?: (range: TimeRange | null) => void;
    onTimeUpdate?: (time: number) => void;
    chapters?: ChapterMarker[];
    spatialAnnotationMode?: boolean;
    onSpatialAnnotation?: (region: { x: number; y: number; w: number; h: number }) => void;
    onEnded?: () => void;
    class?: string;
    cx?: ContextualClassNames | Record<string, string>;
    fieldMode?: boolean;
  }

  let {
    canvas, src, mediaType, poster,
    autoPlay = false,
    muted: initialMuted = false,
    showAccompanying = true,
    annotations = [],
    annotationModeActive = false, onAnnotationModeToggle,
    timeRange = null, onTimeRangeChange,
    onTimeUpdate,
    chapters = [],
    spatialAnnotationMode = false, onSpatialAnnotation,
    onEnded,
    class: className = '', cx,
    fieldMode = false,
  }: Props = $props();

  // --- DOM refs + state ---
  let containerEl: HTMLDivElement | undefined = $state(undefined);
  let mediaEl: HTMLVideoElement | HTMLAudioElement | undefined = $state(undefined);
  let currentTime = $state(0);
  let duration = $state(0);
  let isPlaying = $state(false);
  // svelte-ignore state_referenced_locally -- intentional: initial-value capture from muted prop alias
  let isMuted = $state(initialMuted);
  let volume = $state(1);
  let playbackRate = $state(1);
  let isBuffering = $state(false);
  let showPoster = $state(true);
  let error = $state<string | null>(null);
  let showTranscript = $state(false);
  let isFullscreen = $state(false);

  // --- Derived (IIIF AV features via helpers) ---
  let canvasLabel = $derived(getIIIFValue(canvas.label) || 'Media');
  let placeholderCanvas = $derived(extractPlaceholderCanvas(canvas));
  let accompanyingCanvas = $derived(extractAccompanyingCanvas(canvas));
  let timeMode = $derived(extractTimeMode(canvas, duration));
  let posterUrl = $derived(poster ?? placeholderCanvas?.thumbnail ?? null);
  let syncPoints = $derived(extractSyncPoints(accompanyingCanvas));
  let hasAccompanyingContent = $derived(syncPoints.length > 0);
  let currentSyncPoint = $derived(findCurrentSyncPoint(syncPoints, currentTime));

  // --- Media event handlers ---
  function handleLoadedMetadata() { if (mediaEl) duration = mediaEl.duration; }
  function handleTimeUpdate() { if (!mediaEl) return; currentTime = mediaEl.currentTime; onTimeUpdate?.(mediaEl.currentTime); }
  function handlePlay() { isPlaying = true; showPoster = false; }
  function handlePause() { isPlaying = false; }
  function handleEnded() { isPlaying = false; onEnded?.(); }
  function handleWaiting() { isBuffering = true; }
  function handleCanPlay() { isBuffering = false; }
  function handleError(e: Event) {
    error = getMediaErrorMessage((e.currentTarget as HTMLMediaElement)?.error?.code);
    isPlaying = false; isBuffering = false;
  }

  // --- Controls ---
  async function togglePlayPause() {
    if (!mediaEl) return;
    try {
      if (isPlaying) mediaEl.pause(); else await mediaEl.play();
      error = null;
    } catch (e: unknown) { error = `Unable to play: ${(e as Error).message}`; isPlaying = false; }
  }
  function toggleMute() { if (!mediaEl) return; mediaEl.muted = !mediaEl.muted; isMuted = mediaEl.muted; }
  function setVolumeValue(vol: number) { if (!mediaEl) return; mediaEl.volume = vol; volume = vol; isMuted = vol === 0; }
  function seek(time: number) { if (!mediaEl) return; mediaEl.currentTime = time; currentTime = time; }
  function seekRelative(delta: number) { seek(Math.max(0, Math.min(duration, (mediaEl?.currentTime ?? 0) + delta))); }
  function setPlaybackRateValue(rate: number) { if (!mediaEl) return; mediaEl.playbackRate = rate; playbackRate = rate; }
  function seekToNextChapter() { const next = findNextChapter(chapters, currentTime); if (next) seek(next.start); }
  function seekToPrevChapter() { seek(findPrevChapterTime(chapters, currentTime)); }

  function handleTimeClick(time: number) {
    if (annotationModeActive && onTimeRangeChange) {
      onTimeRangeChange(computeTimeRangeClick(timeRange, time));
    } else { seek(time); }
  }
  function handleUseCurrentTime() {
    if (onTimeRangeChange) onTimeRangeChange(computeTimeRangeClick(timeRange, currentTime));
  }
  function toggleFullscreen() {
    if (!containerEl) return;
    if (document.fullscreenElement) { document.exitFullscreen(); isFullscreen = false; }
    else { containerEl.requestFullscreen(); isFullscreen = true; }
  }

  // --- Keyboard + Media Session ---
  let handleKeyDown = $derived(createKeyboardHandler({
    togglePlayPause, seekRelative, setVolume: setVolumeValue, getVolume: () => volume,
    toggleMute, toggleFullscreen, toggleTranscript: () => { showTranscript = !showTranscript; },
    seek, getDuration: () => duration, seekToPrevChapter, seekToNextChapter,
  }));

  $effect(() => { if (timeMode?.mode === 'loop' && mediaEl) mediaEl.loop = true; });
  $effect(() => { if (timeMode?.mode === 'trim' && mediaEl) mediaEl.currentTime = 0; });
  $effect(() => setupMediaSession({
    title: canvasLabel, togglePlayPause, seekRelative,
    seekToPrevChapter: chapters.length > 0 ? seekToPrevChapter : undefined,
    seekToNextChapter: chapters.length > 0 ? seekToNextChapter : undefined,
  }));
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={containerEl}
  class={cn(
    'flex bg-nb-black w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-nb-blue focus-visible:ring-inset',
    showTranscript && hasAccompanyingContent ? 'flex-row' : 'flex-col',
    className
  )}
  tabindex="0"
  onkeydown={handleKeyDown}
  role="application"
  aria-label="{mediaType === 'video' ? 'Video' : 'Audio'} player. Press Space to play/pause, arrow keys to seek, Up/Down for volume."
>
  <div class={cn('relative group flex-1 flex flex-col', showTranscript && hasAccompanyingContent ? '' : 'w-full')}>
    <!-- Poster overlay (video only) -->
    {#if showPoster && posterUrl && mediaType === 'video'}
      <div class="absolute inset-0 z-10">
        <img src={posterUrl} alt="Video poster" class="w-full h-full object-contain" />
        <div class="absolute inset-0 flex items-center justify-center">
          <button
            onclick={togglePlayPause}
            class="w-20 h-20 flex items-center justify-center rounded-full bg-nb-white/90 text-nb-blue hover:bg-nb-white text-4xl"
            aria-label="Play"
          >
            <Icon name="play_arrow" class="text-4xl" />
          </button>
        </div>
      </div>
    {/if}

    <!-- Error overlay -->
    {#if error}
      <div class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-nb-black/80">
        <Icon name="error" class={cn('text-4xl mb-2', fieldMode ? 'text-nb-yellow' : 'text-red-400')} />
        <p class="text-sm text-nb-white/80 mb-3">{error}</p>
        <Button variant="ghost" size="sm" onclick={() => { error = null; }} class="text-nb-white/60">Retry</Button>
      </div>
    {/if}

    <!-- Media element -->
    <div class="flex-1 flex items-center justify-center relative">
      {#if mediaType === 'video'}
        <video
          bind:this={mediaEl}
          {src}
          muted={isMuted}
          class="max-w-full max-h-full w-auto h-auto bg-nb-black"
          playsinline
          onloadedmetadata={handleLoadedMetadata}
          ontimeupdate={handleTimeUpdate}
          onplay={handlePlay}
          onpause={handlePause}
          onended={handleEnded}
          onwaiting={handleWaiting}
          oncanplay={handleCanPlay}
          onerror={handleError}
        ></video>
        {#if spatialAnnotationMode && onSpatialAnnotation}
          <SpatialAnnotationOverlay videoEl={mediaEl as HTMLVideoElement} onRegionDrawn={onSpatialAnnotation} {fieldMode} />
        {/if}
      {:else}
        <div class="flex flex-col items-center justify-center text-white text-center p-8">
          <Icon name="audiotrack" class="text-8xl opacity-40 mb-6" />
          <p class="text-xl font-medium mb-2">{canvasLabel}</p>
          {#if duration > 0}
            <p class="text-sm text-nb-black/40">{formatTimeForDisplay(currentTime)} / {formatTimeForDisplay(duration)}</p>
          {/if}
          <audio
            bind:this={mediaEl}
            {src}
            muted={isMuted}
            onloadedmetadata={handleLoadedMetadata}
            ontimeupdate={handleTimeUpdate}
            onplay={handlePlay}
            onpause={handlePause}
            onended={handleEnded}
            onwaiting={handleWaiting}
            oncanplay={handleCanPlay}
            onerror={handleError}
          ></audio>
        </div>
      {/if}
      {#if isBuffering}
        <div class="absolute inset-0 flex items-center justify-center bg-nb-black/40">
          <Icon name="hourglass_empty" class={cn('text-4xl animate-spin', fieldMode ? 'text-nb-yellow' : 'text-nb-white/60')} />
        </div>
      {/if}
    </div>

    <!-- Subtitle overlay -->
    {#if currentSyncPoint && !showTranscript}
      <div class="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none">
        <div class="bg-nb-black/80 text-white px-4 py-2 max-w-[80%] text-center">
          <p class="text-sm">{String(currentSyncPoint.accompanyingPosition)}</p>
        </div>
      </div>
    {/if}

    <MediaControlBar
      {currentTime} {duration} {isPlaying} {playbackRate} {volume} {isMuted} {isFullscreen}
      {chapters} {annotations} {annotationModeActive} {timeRange}
      {hasAccompanyingContent} {showAccompanying} {showTranscript} {mediaType}
      onSeek={seek} onSeekRelative={seekRelative} onTimeClick={handleTimeClick}
      onTogglePlayPause={togglePlayPause} onSeekToPrevChapter={seekToPrevChapter}
      onSeekToNextChapter={seekToNextChapter} onSetPlaybackRate={setPlaybackRateValue}
      onToggleTranscript={() => { showTranscript = !showTranscript; }}
      onVolumeChange={setVolumeValue} onMuteToggle={toggleMute}
      onToggleFullscreen={toggleFullscreen} onUseCurrentTime={handleUseCurrentTime}
      {fieldMode}
    />

    {#if timeMode}
      <div class="absolute top-2 left-2">
        <span class={cn('text-[10px] font-bold uppercase px-2 py-1', fieldMode ? 'bg-nb-yellow/80 text-black' : 'bg-nb-blue/80 text-white')}>
          {timeMode.mode}
        </span>
      </div>
    {/if}
  </div>

  {#if showTranscript && hasAccompanyingContent}
    <TranscriptPanel
      {syncPoints} {currentSyncPoint} {accompanyingCanvas}
      onSeek={seek} onClose={() => { showTranscript = false; }}
      {fieldMode}
    />
  {/if}
</div>
