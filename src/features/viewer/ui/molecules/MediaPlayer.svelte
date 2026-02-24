<!--
  MediaPlayer — Full IIIF AV player with chapter navigation, annotations,
  spatial annotation drawing, transcript panel, and Media Session API

  ORIGINAL: src/features/viewer/ui/molecules/MediaPlayer.tsx (617 lines)
  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  IIIF Presentation API 3.0 AV features:
  - placeholderCanvas: Poster frames / loading placeholders
  - accompanyingCanvas: Transcripts, subtitles, synchronized content
  - timeMode behaviors: trim, scale, loop
  - W3C Media Fragments URI 1.0 time-based annotations
-->

<script lang="ts" module>
  /** Chapter/range marker extracted from IIIF structures */
  export interface ChapterMarker {
    label: string;
    start: number;
    end: number;
    color: string;
  }
</script>

<script lang="ts">
  /* eslint-disable @field-studio/no-native-html-in-molecules -- Volume/progress sliders require native range inputs for media control */
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';
  import PlayPauseButton from '@/src/features/viewer/ui/atoms/PlayPauseButton.svelte';
  import {
    formatTimeForDisplay,
    getAnnotationTimeRange,
    isTimeBasedAnnotation,
  } from '../../model/annotation';
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
    canvas,
    src,
    mediaType,
    poster,
    autoPlay = false,
    muted: initialMuted = false,
    showAccompanying = true,
    annotations = [],
    annotationModeActive = false,
    onAnnotationModeToggle,
    timeRange = null,
    onTimeRangeChange,
    onTimeUpdate,
    chapters = [],
    spatialAnnotationMode = false,
    onSpatialAnnotation,
    onEnded,
    class: className = '',
    cx,
    fieldMode = false,
  }: Props = $props();

  // --- DOM refs ---
  let containerEl: HTMLDivElement | undefined = $state(undefined);
  let progressEl: HTMLDivElement | undefined = $state(undefined);
  let videoContainerEl: HTMLDivElement | undefined = $state(undefined);
  let mediaEl: HTMLVideoElement | HTMLAudioElement | undefined = $state(undefined);

  // --- Media playback state ---
  let currentTime = $state(0);
  let duration = $state(0);
  let isPlaying = $state(false);
  let isMuted = $state(initialMuted);
  let volume = $state(1);
  let playbackRate = $state(1);
  let isBuffering = $state(false);
  let showPoster = $state(true);
  let error = $state<string | null>(null);

  // --- UI state ---
  let showTranscript = $state(false);
  let hoveredTime = $state<number | null>(null);

  // --- Spatial annotation state (video only) ---
  let drawStart = $state<{ x: number; y: number } | null>(null);
  let drawEnd = $state<{ x: number; y: number } | null>(null);

  // --- Derived ---

  let canvasLabel = $derived(getIIIFValue(canvas.label) || 'Media');

  // IIIF AV features
  let avCanvas = $derived(canvas as any);
  let placeholderCanvas = $derived.by(() => {
    try {
      const pc = avCanvas.placeholderCanvas;
      if (!pc) return null;
      // Extract thumbnail from placeholder canvas
      const items = pc.items || [];
      for (const page of items) {
        for (const anno of (page as any).items || []) {
          const body = Array.isArray(anno.body) ? anno.body[0] : anno.body;
          if (body?.id) return { id: pc.id, thumbnail: body.id };
        }
      }
      return null;
    } catch { return null; }
  });

  let accompanyingCanvas = $derived.by(() => {
    try {
      const ac = avCanvas.accompanyingCanvas;
      if (!ac) return null;
      return ac;
    } catch { return null; }
  });

  let timeMode = $derived.by(() => {
    try {
      const behavior = avCanvas.behavior;
      if (!behavior) return null;
      const behaviors = Array.isArray(behavior) ? behavior : [behavior];
      for (const b of behaviors) {
        if (b === 'auto-advance' || b === 'no-auto-advance') continue;
        if (b.startsWith?.('trim') || b === 'trim') return { mode: 'trim' as const, start: 0, end: duration };
        if (b === 'loop') return { mode: 'loop' as const };
        if (b === 'scale') return { mode: 'scale' as const };
      }
      return null;
    } catch { return null; }
  });

  let posterUrl = $derived(poster ?? placeholderCanvas?.thumbnail ?? null);

  // Sync points from accompanying canvas (for transcript panel)
  let syncPoints = $derived.by(() => {
    if (!accompanyingCanvas) return [];
    try {
      const annos = accompanyingCanvas.annotations || accompanyingCanvas.items || [];
      const points: Array<{ mainTime: number; accompanyingPosition: string }> = [];
      for (const page of annos) {
        for (const anno of (page as any).items || []) {
          const body = Array.isArray(anno.body) ? anno.body[0] : anno.body;
          const text = body?.value || '';
          const target = anno.target;
          const source = typeof target === 'string' ? target : target?.source;
          if (typeof source === 'string' && source.includes('#t=')) {
            const match = source.match(/#t=(\d+(?:\.\d+)?)/);
            if (match) {
              points.push({ mainTime: parseFloat(match[1]), accompanyingPosition: text });
            }
          }
        }
      }
      return points.sort((a, b) => a.mainTime - b.mainTime);
    } catch { return []; }
  });

  let hasAccompanyingContent = $derived(syncPoints.length > 0);

  // Current sync point (for subtitle overlay)
  let currentSyncPoint = $derived.by(() => {
    if (syncPoints.length === 0) return null;
    let current: typeof syncPoints[0] | null = null;
    for (const point of syncPoints) {
      if (point.mainTime <= currentTime) current = point;
      else break;
    }
    return current;
  });

  // Time-based annotations for display on progress bar
  let timeAnnotations = $derived(annotations.filter(isTimeBasedAnnotation));

  // Progress percentages
  let currentPercent = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
  let timeRangeStartPercent = $derived(
    timeRange && duration > 0 ? (timeRange.start / duration) * 100 : 0
  );
  let timeRangeEndPercent = $derived(
    timeRange?.end !== undefined && duration > 0
      ? (timeRange.end / duration) * 100
      : timeRangeStartPercent
  );

  // --- Media event handlers ---

  function handleLoadedMetadata() {
    if (mediaEl) duration = mediaEl.duration;
  }

  function handleTimeUpdate() {
    if (!mediaEl) return;
    currentTime = mediaEl.currentTime;
    onTimeUpdate?.(mediaEl.currentTime);
  }

  function handlePlay() {
    isPlaying = true;
    showPoster = false;
  }

  function handlePause() {
    isPlaying = false;
  }

  function handleEnded() {
    isPlaying = false;
    onEnded?.();
  }

  function handleWaiting() {
    isBuffering = true;
  }

  function handleCanPlay() {
    isBuffering = false;
  }

  function handleError(e: Event) {
    const el = e.currentTarget as HTMLVideoElement | HTMLAudioElement;
    const code = el?.error?.code;
    if (code === 1) error = 'Media loading aborted';
    else if (code === 2) error = 'Network error while loading media';
    else if (code === 3) error = 'Media decoding failed';
    else if (code === 4) error = 'Media format not supported';
    else error = 'Unknown media error';
    isPlaying = false;
    isBuffering = false;
  }

  // --- Controls ---

  async function togglePlayPause() {
    if (!mediaEl) return;
    try {
      if (isPlaying) {
        mediaEl.pause();
      } else {
        await mediaEl.play();
      }
      error = null;
    } catch (e: unknown) {
      error = `Unable to play: ${(e as Error).message}`;
      isPlaying = false;
    }
  }

  function toggleMute() {
    if (!mediaEl) return;
    mediaEl.muted = !mediaEl.muted;
    isMuted = mediaEl.muted;
  }

  function setVolumeValue(vol: number) {
    if (!mediaEl) return;
    mediaEl.volume = vol;
    volume = vol;
    isMuted = vol === 0;
  }

  function seek(time: number) {
    if (!mediaEl) return;
    mediaEl.currentTime = time;
    currentTime = time;
  }

  function seekRelative(delta: number) {
    seek(Math.max(0, Math.min(duration, (mediaEl?.currentTime ?? 0) + delta)));
  }

  function setPlaybackRateValue(rate: number) {
    if (!mediaEl) return;
    mediaEl.playbackRate = rate;
    playbackRate = rate;
  }

  // --- Progress bar ---

  function getTimeFromPosition(clientX: number): number {
    if (!progressEl || duration === 0) return 0;
    const rect = progressEl.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }

  function handleProgressClick(e: MouseEvent) {
    const time = getTimeFromPosition(e.clientX);

    if (annotationModeActive && onTimeRangeChange) {
      if (!timeRange || timeRange.end !== undefined) {
        onTimeRangeChange({ start: time });
      } else {
        const start = Math.min(timeRange.start, time);
        const end = Math.max(timeRange.start, time);
        onTimeRangeChange({ start, end });
      }
    } else {
      seek(time);
    }
  }

  function handleProgressHover(e: MouseEvent) {
    hoveredTime = getTimeFromPosition(e.clientX);
  }

  function handleProgressLeave() {
    hoveredTime = null;
  }

  // --- Chapter navigation ---

  function seekToNextChapter() {
    if (chapters.length === 0) return;
    const next = chapters.find(c => c.start > currentTime + 0.5);
    if (next) seek(next.start);
  }

  function seekToPrevChapter() {
    if (chapters.length === 0) return;
    const current = [...chapters].reverse().find(c => c.start <= currentTime);
    if (current && currentTime - current.start > 2) {
      seek(current.start);
    } else {
      const idx = chapters.findIndex(c => c.start <= currentTime);
      if (idx > 0) seek(chapters[idx - 1].start);
      else seek(0);
    }
  }

  // --- Annotation mode ---

  function handleUseCurrentTime() {
    if (!onTimeRangeChange) return;
    if (!timeRange || timeRange.end !== undefined) {
      onTimeRangeChange({ start: currentTime });
    } else {
      const start = Math.min(timeRange.start, currentTime);
      const end = Math.max(timeRange.start, currentTime);
      onTimeRangeChange({ start, end });
    }
  }

  // --- Spatial annotation on video ---

  function getSpatialCoords(e: MouseEvent): { x: number; y: number } | null {
    const video = mediaEl as HTMLVideoElement | null;
    if (!video || !videoContainerEl) return null;
    const rect = video.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  function handleSpatialMouseDown(e: MouseEvent) {
    if (!spatialAnnotationMode) return;
    const coords = getSpatialCoords(e);
    if (coords) {
      drawStart = coords;
      drawEnd = coords;
    }
  }

  function handleSpatialMouseMove(e: MouseEvent) {
    if (!drawStart) return;
    const coords = getSpatialCoords(e);
    if (coords) drawEnd = coords;
  }

  function handleSpatialMouseUp() {
    if (drawStart && drawEnd && onSpatialAnnotation) {
      const x = Math.min(drawStart.x, drawEnd.x);
      const y = Math.min(drawStart.y, drawEnd.y);
      const w = Math.abs(drawEnd.x - drawStart.x);
      const h = Math.abs(drawEnd.y - drawStart.y);
      if (w > 0.01 && h > 0.01) {
        onSpatialAnnotation({ x, y, w, h });
      }
    }
    drawStart = null;
    drawEnd = null;
  }

  // --- Fullscreen ---

  let isFullscreen = $state(false);

  function toggleFullscreen() {
    if (!containerEl) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      isFullscreen = false;
    } else {
      containerEl.requestFullscreen();
      isFullscreen = true;
    }
  }

  // --- Keyboard shortcuts ---

  function handleKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    const key = e.key.toLowerCase();

    if (key === '[') { e.preventDefault(); seekToPrevChapter(); return; }
    if (key === ']') { e.preventDefault(); seekToNextChapter(); return; }

    switch (key) {
      case ' ':
      case 'k':
        e.preventDefault(); togglePlayPause(); break;
      case 'arrowleft':
      case 'j':
        e.preventDefault(); seekRelative(-10); break;
      case 'arrowright':
      case 'l':
        e.preventDefault(); seekRelative(10); break;
      case 'arrowup':
        e.preventDefault(); setVolumeValue(Math.min(1, volume + 0.1)); break;
      case 'arrowdown':
        e.preventDefault(); setVolumeValue(Math.max(0, volume - 0.1)); break;
      case 'm':
        e.preventDefault(); toggleMute(); break;
      case 'f':
        e.preventDefault(); toggleFullscreen(); break;
      case 't':
        e.preventDefault(); showTranscript = !showTranscript; break;
      case 'home':
        e.preventDefault(); seek(0); break;
      case 'end':
        e.preventDefault(); seek(duration); break;
    }
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      seek(duration * (parseInt(key) / 10));
    }
  }

  // --- TimeMode effects ---

  $effect(() => {
    if (timeMode?.mode === 'loop' && mediaEl) {
      mediaEl.loop = true;
    }
  });

  $effect(() => {
    if (timeMode?.mode === 'trim' && mediaEl) {
      mediaEl.currentTime = 0;
    }
  });

  // --- Media Session API ---

  $effect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: canvasLabel,
    });

    navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
    navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
    navigator.mediaSession.setActionHandler('seekbackward', () => seekRelative(-10));
    navigator.mediaSession.setActionHandler('seekforward', () => seekRelative(10));

    if (chapters.length > 0) {
      navigator.mediaSession.setActionHandler('previoustrack', () => seekToPrevChapter());
      navigator.mediaSession.setActionHandler('nexttrack', () => seekToNextChapter());
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      } catch { /* ignore */ }
    };
  });

  // Styling
  let controlBgClass = $derived(fieldMode ? 'from-black/90' : 'from-nb-black/90');
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
  <!-- Main Media Area -->
  <div class={cn(
    'relative group flex-1 flex flex-col',
    showTranscript && hasAccompanyingContent ? '' : 'w-full'
  )}>
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
        <Button variant="ghost" size="sm" onclick={() => { error = null; }} class="text-nb-white/60">
          Retry
        </Button>
      </div>
    {/if}

    <!-- Media element -->
    <div bind:this={videoContainerEl} class="flex-1 flex items-center justify-center relative">
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

        <!-- Spatial annotation overlay (video only) -->
        {#if spatialAnnotationMode}
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <svg
            class="absolute inset-0 w-full h-full cursor-crosshair"
            style:pointer-events="all"
            onmousedown={handleSpatialMouseDown}
            onmousemove={handleSpatialMouseMove}
            onmouseup={handleSpatialMouseUp}
            role="application"
            aria-label="Spatial annotation drawing area"
          >
            {#if drawStart && drawEnd}
              <rect
                x="{Math.min(drawStart.x, drawEnd.x) * 100}%"
                y="{Math.min(drawStart.y, drawEnd.y) * 100}%"
                width="{Math.abs(drawEnd.x - drawStart.x) * 100}%"
                height="{Math.abs(drawEnd.y - drawStart.y) * 100}%"
                fill={fieldMode ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)'}
                stroke={fieldMode ? '#eab308' : '#22c55e'}
                stroke-width="2"
              />
            {/if}
          </svg>
        {/if}
      {:else}
        <!-- Audio display -->
        <div class="flex flex-col items-center justify-center text-white text-center p-8">
          <Icon name="audiotrack" class="text-8xl opacity-40 mb-6" />
          <p class="text-xl font-medium mb-2">{canvasLabel}</p>
          {#if duration > 0}
            <p class="text-sm text-nb-black/40">
              {formatTimeForDisplay(currentTime)} / {formatTimeForDisplay(duration)}
            </p>
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

      <!-- Buffering indicator -->
      {#if isBuffering}
        <div class="absolute inset-0 flex items-center justify-center bg-nb-black/40">
          <Icon name="hourglass_empty" class={cn(
            'text-4xl animate-spin',
            fieldMode ? 'text-nb-yellow' : 'text-nb-white/60'
          )} />
        </div>
      {/if}
    </div>

    <!-- Subtitle overlay (current sync point) -->
    {#if currentSyncPoint && !showTranscript}
      <div class="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none">
        <div class="bg-nb-black/80 text-white px-4 py-2 max-w-[80%] text-center">
          <p class="text-sm">{String(currentSyncPoint.accompanyingPosition)}</p>
        </div>
      </div>
    {/if}

    <!-- Controls -->
    <div class={cn('bg-gradient-to-t to-transparent p-4', controlBgClass)}>
      <!-- Progress Bar -->
      <div
        bind:this={progressEl}
        class={cn(
          'relative h-2 cursor-pointer mb-3',
          annotationModeActive && 'ring-2 ring-offset-2',
          annotationModeActive && (fieldMode ? 'ring-nb-yellow ring-offset-black' : 'ring-nb-green ring-offset-nb-black')
        )}
        style:background={fieldMode ? '#334155' : '#475569'}
        onclick={handleProgressClick}
        onkeydown={(e) => { if (e.key === 'ArrowLeft') seekRelative(-5); else if (e.key === 'ArrowRight') seekRelative(5); }}
        onmousemove={handleProgressHover}
        onmouseleave={handleProgressLeave}
        role="slider"
        aria-label="Playback progress"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabindex="0"
      >
        <!-- Chapter markers -->
        {#each chapters as ch, idx}
          {#if duration > 0}
            {@const startPct = (ch.start / duration) * 100}
            {@const endPct = (ch.end / duration) * 100}
            <button
              type="button"
              class="absolute top-0 bottom-0 cursor-pointer group/ch p-0"
              style:left="{startPct}%"
              style:width="{Math.max(0.5, endPct - startPct)}%"
              style:background-color="{ch.color}30"
              style:border-left="1px solid {ch.color}80"
              onclick={(e) => { e.stopPropagation(); seek(ch.start); }}
              title={ch.label}
            >
              <div class="absolute -top-6 left-0 hidden group-hover/ch:block px-1 py-0.5 text-[9px] text-white bg-nb-black/90 whitespace-nowrap z-10">
                {ch.label}
              </div>
            </button>
          {/if}
        {/each}

        <!-- Time annotation markers -->
        {#each timeAnnotations as anno}
          {@const range = getAnnotationTimeRange(anno)}
          {#if range && duration > 0}
            {@const startPct = (range.start / duration) * 100}
            {@const endPct = range.end !== undefined ? (range.end / duration) * 100 : startPct + 0.5}
            <div
              class="absolute top-0 bottom-0 bg-nb-blue/50"
              style:left="{startPct}%"
              style:width="{Math.max(0.5, endPct - startPct)}%"
              title={(anno.body as { value?: string })?.value || 'Annotation'}
            ></div>
          {/if}
        {/each}

        <!-- Current time range selection -->
        {#if annotationModeActive && timeRange}
          <div
            class={cn('absolute top-0 bottom-0', fieldMode ? 'bg-nb-yellow/40' : 'bg-nb-green/40')}
            style:left="{timeRangeStartPercent}%"
            style:width="{Math.max(0.5, timeRangeEndPercent - timeRangeStartPercent)}%"
          ></div>
        {/if}

        <!-- Played progress -->
        <div
          class={cn('absolute top-0 bottom-0 left-0 transition-nb', fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue')}
          style:width="{currentPercent}%"
        ></div>

        <!-- Playhead -->
        <div
          class={cn('absolute top-1/2 -translate-y-1/2 w-3 h-3 shadow-brutal-sm transition-nb', fieldMode ? 'bg-nb-yellow' : 'bg-nb-white')}
          style:left="calc({currentPercent}% - 6px)"
        ></div>

        <!-- Hover time tooltip -->
        {#if hoveredTime !== null}
          <div
            class="absolute -top-8 transform -translate-x-1/2 px-2 py-1 text-xs text-white bg-nb-black/80"
            style:left="{(hoveredTime / duration) * 100}%"
          >
            {formatTimeForDisplay(hoveredTime)}
          </div>
        {/if}
      </div>

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
            onclick={handleUseCurrentTime}
            class={cn('text-xs', fieldMode ? 'text-nb-yellow hover:text-nb-yellow' : 'text-nb-green hover:text-nb-green/60')}
          >
            Use current time ({formatTimeForDisplay(currentTime)})
          </Button>
        </div>
      {/if}

      <!-- Transport controls -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <!-- Left group -->
        <div class="flex items-center gap-1">
          <PlayPauseButton {isPlaying} onToggle={togglePlayPause} {fieldMode} />
          <IconButton
            icon="replay_10"
            label="Rewind 10s"
            onclick={() => seekRelative(-10)}
            size="sm"
            class="!text-white hover:!text-nb-blue"
          />
          <IconButton
            icon="forward_10"
            label="Forward 10s"
            onclick={() => seekRelative(10)}
            size="sm"
            class="!text-white hover:!text-nb-blue"
          />
          {#if chapters.length > 0}
            <IconButton
              icon="skip_previous"
              label="Previous chapter"
              onclick={seekToPrevChapter}
              size="sm"
              class="!text-white hover:!text-nb-blue"
            />
            <IconButton
              icon="skip_next"
              label="Next chapter"
              onclick={seekToNextChapter}
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
          {#if hasAccompanyingContent && showAccompanying}
            <IconButton
              icon="subtitles"
              label={showTranscript ? 'Hide transcript' : 'Show transcript'}
              onclick={() => { showTranscript = !showTranscript; }}
              size="sm"
              class={cn('!text-white hover:!text-nb-blue', showTranscript && '!bg-nb-blue/30')}
            />
          {/if}

          <!-- Playback rate -->
          <button
            onclick={() => {
              const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
              const idx = rates.indexOf(playbackRate);
              const nextRate = rates[(idx + 1) % rates.length];
              setPlaybackRateValue(nextRate);
            }}
            class={cn(
              'text-xs font-mono px-1.5 py-0.5',
              fieldMode ? 'text-nb-yellow/70 hover:text-nb-yellow' : 'text-nb-white/60 hover:text-nb-white'
            )}
            title="Playback speed"
          >
            {playbackRate}x
          </button>

          <!-- Volume -->
          <div class="flex items-center gap-1">
            <button
              onclick={toggleMute}
              class="text-nb-white/60 hover:text-nb-white"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              <Icon
                name={isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                class="text-sm"
              />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              oninput={(e) => setVolumeValue(Number((e.target as HTMLInputElement).value))}
              class="w-16 h-1 accent-current"
              aria-label="Volume"
            />
          </div>

          <!-- Fullscreen (video only) -->
          {#if mediaType === 'video'}
            <button
              onclick={toggleFullscreen}
              class="text-nb-white/60 hover:text-nb-white"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} class="text-sm" />
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- TimeMode indicator -->
    {#if timeMode}
      <div class="absolute top-2 left-2">
        <span class={cn(
          'text-[10px] font-bold uppercase px-2 py-1',
          fieldMode ? 'bg-nb-yellow/80 text-black' : 'bg-nb-blue/80 text-white'
        )}>
          {timeMode.mode}
        </span>
      </div>
    {/if}
  </div>

  <!-- Transcript Panel -->
  {#if showTranscript && hasAccompanyingContent}
    <div class={cn(
      'w-80 bg-nb-black border-l flex flex-col',
      fieldMode ? 'border-nb-black' : 'border-nb-black/80'
    )}>
      <!-- Header -->
      <div class={cn(
        'p-3 border-b flex items-center justify-between',
        fieldMode ? 'border-nb-black' : 'border-nb-black/80'
      )}>
        <div class="flex items-center gap-2">
          <Icon name="subtitles" class="text-nb-black/40" />
          <span class={cn('text-sm font-medium', fieldMode ? 'text-nb-yellow' : 'text-white')}>
            {accompanyingCanvas?.label ? getIIIFValue(accompanyingCanvas.label) : 'Transcript'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="bare"
          onclick={() => { showTranscript = false; }}
          class="text-nb-black/40 hover:text-white p-1"
        >
          <Icon name="close" class="text-lg" />
        </Button>
      </div>

      <!-- Transcript body -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {#each syncPoints as point, idx}
          <button
            onclick={() => seek(point.mainTime)}
            class={cn(
              'w-full text-left p-2 transition-nb',
              currentSyncPoint === point
                ? fieldMode
                  ? 'bg-nb-yellow/20 border border-nb-yellow/50'
                  : 'bg-nb-blue/20 border border-nb-blue/50'
                : fieldMode
                  ? 'hover:bg-nb-black'
                  : 'hover:bg-nb-black/80'
            )}
          >
            <div class={cn(
              'text-[10px] font-mono mb-1',
              fieldMode ? 'text-nb-yellow/70' : 'text-nb-blue'
            )}>
              {formatTimeForDisplay(point.mainTime)}
            </div>
            <div class={cn(
              'text-sm',
              fieldMode ? 'text-nb-black/30' : 'text-nb-black/20'
            )}>
              {String(point.accompanyingPosition)}
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
