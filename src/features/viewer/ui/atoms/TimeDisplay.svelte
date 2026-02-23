<!--
  TimeDisplay — MM:SS or HH:MM:SS display

  ORIGINAL: src/features/viewer/ui/atoms/TimeDisplay.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Pure computed display using $derived for time formatting.
  Zero local state - all props-driven.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  type TimeFormat = 'mm:ss' | 'hh:mm:ss' | 'short' | 'long';

  interface Props {
    /** Current playback time in seconds */
    currentTime?: number;
    /** Total duration in seconds */
    duration?: number;
    /** Format variant */
    format?: TimeFormat;
    /** Whether to show duration */
    showDuration?: boolean;
    /** Separator between current time and duration */
    separator?: string;
    /** Additional CSS classes */
    class?: string;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    currentTime = 0,
    duration,
    format = 'mm:ss',
    showDuration = false,
    separator = ' / ',
    class: className = '',
    fieldMode = false,
  }: Props = $props();

  function formatTime(seconds: number, fmt: TimeFormat): string {
    const s = Math.max(0, seconds);
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);

    const minsStr = mins.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');

    if (fmt === 'hh:mm:ss' || fmt === 'long' || hours > 0) {
      const hoursStr = hours.toString().padStart(2, '0');
      return `${hoursStr}:${minsStr}:${secsStr}`;
    }

    return `${mins}:${secsStr}`;
  }

  let formattedCurrent = $derived(formatTime(currentTime, format));
  let formattedDuration = $derived(duration != null ? formatTime(duration, format) : '');
  let textColor = $derived(fieldMode ? 'text-nb-yellow' : 'text-white');
</script>

<span class={cn('text-sm font-mono whitespace-nowrap', textColor, className)}>
  <time datetime="PT{Math.floor(currentTime)}S">
    {formattedCurrent}
  </time>
  {#if showDuration && duration != null}
    <span class="opacity-70">{separator}</span>
    <time datetime="PT{Math.floor(duration)}S">
      {formattedDuration}
    </time>
  {/if}
</span>
