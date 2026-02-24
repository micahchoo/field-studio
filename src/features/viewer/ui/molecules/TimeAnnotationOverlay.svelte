<!--
  TimeAnnotationOverlay.svelte — Time range selection UI overlay on progress bar

  LAYER: molecule (receives fieldMode prop)
  FSD: features/viewer/ui/molecules

  Visual overlay showing a selected time range as a highlighted band on top of
  a progress bar. Click to start range, click again to end range. Shows a
  clear (X) button for an existing range and start/end time labels.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import { formatTimeForDisplay } from '@/src/features/viewer/model/annotation';

  interface TimeRange {
    start: number;
    end?: number;
  }

  interface Props {
    currentTime: number;
    duration: number;
    timeRange: TimeRange | null;
    isSelecting: boolean;
    onRangeStart: (time: number) => void;
    onRangeEnd: (time: number) => void;
    onRangeClear: () => void;
    fieldMode: boolean;
    cx?: ContextualClassNames;
  }

  let {
    currentTime,
    duration,
    timeRange,
    isSelecting,
    onRangeStart,
    onRangeEnd,
    onRangeClear,
    fieldMode,
    cx = {} as ContextualClassNames,
  }: Props = $props();

  let trackEl: HTMLDivElement | undefined = $state(undefined);
  let hoveredTime = $state<number | null>(null);

  let accentColor = $derived(fieldMode ? '#FFE500' : '#22c55e');
  let accentBg = $derived(fieldMode ? 'bg-nb-yellow/30' : 'bg-green-500/30');
  let accentBorder = $derived(fieldMode ? 'border-nb-yellow' : 'border-green-500');
  let accentText = $derived(fieldMode ? 'text-nb-yellow' : 'text-green-500');

  // Percentage positions
  let rangeStartPct = $derived(
    timeRange && duration > 0 ? (timeRange.start / duration) * 100 : 0
  );
  let rangeEndPct = $derived(
    timeRange?.end !== undefined && duration > 0
      ? (timeRange.end / duration) * 100
      : rangeStartPct
  );
  let currentPct = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
  let hoveredPct = $derived(
    hoveredTime !== null && duration > 0 ? (hoveredTime / duration) * 100 : null
  );

  function getTimeFromMouseX(clientX: number): number {
    if (!trackEl || duration === 0) return 0;
    const rect = trackEl.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }

  function handleClick(e: MouseEvent) {
    const time = getTimeFromMouseX(e.clientX);
    if (!timeRange || timeRange.end !== undefined) {
      onRangeStart(time);
    } else {
      const start = Math.min(timeRange.start, time);
      const end = Math.max(timeRange.start, time);
      onRangeEnd(end);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    hoveredTime = getTimeFromMouseX(e.clientX);
  }

  function handleMouseLeave() {
    hoveredTime = null;
  }
</script>

<div class="relative flex flex-col gap-1 select-none" aria-label="Time annotation range selector">
  <!-- Status text -->
  <div class={cn('text-xs font-mono flex items-center justify-between', accentText)}>
    <span>
      {#if !timeRange}
        Click to set start point
      {:else if timeRange.end === undefined}
        Click to set end point &mdash; start: {formatTimeForDisplay(timeRange.start)}
      {:else}
        Range: {formatTimeForDisplay(timeRange.start)} &ndash; {formatTimeForDisplay(timeRange.end)}
      {/if}
    </span>

    {#if timeRange}
      <button
        class={cn(
          'ml-2 flex items-center gap-0.5 px-1 py-0.5 border text-xs font-mono',
          fieldMode
            ? 'border-nb-yellow/60 text-nb-yellow hover:bg-nb-yellow/20'
            : 'border-green-500/60 text-green-600 hover:bg-green-500/10'
        )}
        onclick={onRangeClear}
        aria-label="Clear time range"
        title="Clear selection"
      >
        <span class="material-symbols-outlined text-xs leading-none">close</span>
        Clear
      </button>
    {/if}
  </div>

  <!-- Progress track -->
  <div
    bind:this={trackEl}
    class={cn(
      'relative h-4 cursor-pointer',
      isSelecting && cn('ring-2 ring-offset-1', fieldMode ? 'ring-nb-yellow ring-offset-black' : 'ring-green-500 ring-offset-white')
    )}
    style:background={fieldMode ? '#1e293b' : '#e2e8f0'}
    onclick={handleClick}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // Use midpoint of track as fallback for keyboard activation
        if (!timeRange || timeRange.end !== undefined) {
          onRangeStart(duration / 2);
        } else {
          onRangeEnd(Math.min(duration, (timeRange.start + duration) / 2));
        }
      }
    }}
    onmousemove={handleMouseMove}
    onmouseleave={handleMouseLeave}
    role="slider"
    aria-label="Time range track"
    aria-valuemin={0}
    aria-valuemax={duration}
    aria-valuenow={timeRange?.start ?? currentTime}
    tabindex="0"
  >
    <!-- Current playback progress -->
    <div
      class={cn('absolute top-0 bottom-0 left-0 opacity-30', fieldMode ? 'bg-nb-yellow' : 'bg-blue-500')}
      style:width="{currentPct}%"
    ></div>

    <!-- Selected range band -->
    {#if timeRange}
      <div
        class={cn('absolute top-0 bottom-0', accentBg)}
        style:left="{rangeStartPct}%"
        style:width="{Math.max(0.5, rangeEndPct - rangeStartPct)}%"
      ></div>

      <!-- Start handle -->
      <div
        class={cn('absolute top-0 bottom-0 w-0.5', fieldMode ? 'bg-nb-yellow' : 'bg-green-500')}
        style:left="{rangeStartPct}%"
      ></div>

      <!-- End handle (if set) -->
      {#if timeRange.end !== undefined}
        <div
          class={cn('absolute top-0 bottom-0 w-0.5', fieldMode ? 'bg-nb-yellow' : 'bg-green-500')}
          style:left="{rangeEndPct}%"
        ></div>
      {/if}
    {/if}

    <!-- Playhead -->
    <div
      class={cn('absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5', fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue')}
      style:left="calc({currentPct}% - 5px)"
    ></div>

    <!-- Hover time tooltip -->
    {#if hoveredTime !== null && hoveredPct !== null}
      <div
        class={cn(
          'absolute -top-7 transform -translate-x-1/2 px-1.5 py-0.5 text-[10px] font-mono pointer-events-none',
          fieldMode ? 'bg-nb-black text-nb-yellow border border-nb-yellow/40' : 'bg-nb-black/80 text-nb-white'
        )}
        style:left="{hoveredPct}%"
      >
        {formatTimeForDisplay(hoveredTime)}
      </div>
    {/if}
  </div>

  <!-- Time labels -->
  {#if timeRange && timeRange.end !== undefined}
    <div class="flex justify-between text-[10px] font-mono tabular-nums" style:color={accentColor}>
      <span>Start: {formatTimeForDisplay(timeRange.start)}</span>
      <span>Duration: {formatTimeForDisplay(timeRange.end - timeRange.start)}</span>
      <span>End: {formatTimeForDisplay(timeRange.end)}</span>
    </div>
  {/if}
</div>
