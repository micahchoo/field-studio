<!--
  MediaProgressBar — Progress bar with chapter markers, annotation markers,
  time range selection, and hover tooltip

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Interactive progress bar for media player with support for:
  - Chapter region overlays
  - Time-based annotation markers
  - Annotation time range selection
  - Playhead position and hover tooltip
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import ChapterMarkers from './ChapterMarkers.svelte';
  import {
    formatTimeForDisplay,
    getAnnotationTimeRange,
    isTimeBasedAnnotation,
  } from '../../model/annotation';
  import type { TimeRange } from '../../model/annotation';
  import type { ChapterMarker } from '../molecules/mediaPlayerHelpers';
  import type { IIIFAnnotation } from '@/src/shared/types';

  interface Props {
    currentTime: number;
    duration: number;
    chapters: ChapterMarker[];
    annotations: IIIFAnnotation[];
    annotationModeActive: boolean;
    timeRange: TimeRange | null;
    onSeek: (time: number) => void;
    onSeekRelative: (delta: number) => void;
    onTimeClick: (time: number) => void;
    fieldMode?: boolean;
  }

  let {
    currentTime,
    duration,
    chapters,
    annotations,
    annotationModeActive,
    timeRange,
    onSeek,
    onSeekRelative,
    onTimeClick,
    fieldMode = false,
  }: Props = $props();

  let progressEl: HTMLDivElement | undefined = $state(undefined);
  let hoveredTime = $state<number | null>(null);

  let timeAnnotations = $derived(annotations.filter(isTimeBasedAnnotation));
  let currentPercent = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
  let timeRangeStartPercent = $derived(
    timeRange && duration > 0 ? (timeRange.start / duration) * 100 : 0
  );
  let timeRangeEndPercent = $derived(
    timeRange?.end !== undefined && duration > 0
      ? (timeRange.end / duration) * 100
      : timeRangeStartPercent
  );

  function getTimeFromPosition(clientX: number): number {
    if (!progressEl || duration === 0) return 0;
    const rect = progressEl.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }

  function handleClick(e: MouseEvent) {
    onTimeClick(getTimeFromPosition(e.clientX));
  }

  function handleProgressHover(e: MouseEvent) {
    hoveredTime = getTimeFromPosition(e.clientX);
    if (duration === 0) hoveredTime = null;
  }

  function handleProgressLeave() { hoveredTime = null; }
</script>

<!-- eslint-disable-next-line @field-studio/prefer-semantic-elements -- custom progress bar with chapter markers and annotation overlay children -->
<div
  bind:this={progressEl}
  class={cn(
    'relative h-2 cursor-pointer mb-3',
    annotationModeActive && 'ring-2 ring-offset-2',
    annotationModeActive && (fieldMode ? 'ring-nb-yellow ring-offset-black' : 'ring-nb-green ring-offset-nb-black')
  )}
  style:background={fieldMode ? '#334155' : '#475569'}
  onclick={handleClick}
  onkeydown={(e) => { if (e.key === 'ArrowLeft') onSeekRelative(-5); else if (e.key === 'ArrowRight') onSeekRelative(5); }}
  onmousemove={handleProgressHover}
  onmouseleave={handleProgressLeave}
  role="slider"
  aria-label="Playback progress"
  aria-valuemin={0}
  aria-valuemax={duration}
  aria-valuenow={currentTime}
  tabindex="0"
>
  <ChapterMarkers {chapters} {duration} onSeek={onSeek} />

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
