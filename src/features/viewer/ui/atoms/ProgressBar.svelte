<!--
  ProgressBar — Seekable media progress bar

  ORIGINAL: src/features/viewer/ui/atoms/ProgressBar.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Shows playback progress with optional buffer indicator. Supports click/keyboard
  for seeking. Keyboard: Home/End/ArrowLeft/ArrowRight (+/- 5% increments).
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    /** Current playback time in seconds */
    currentTime?: number;
    /** Total duration in seconds */
    duration?: number;
    /** Callback when user seeks to a new time */
    onSeek?: (time: number) => void;
    /** Buffer progress (0-1) */
    buffered?: number;
    /** Height of the progress bar in pixels */
    height?: number;
    /** Whether to show the scrubber handle */
    showHandle?: boolean;
    /** Additional CSS classes */
    class?: string;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    currentTime = 0,
    duration = 0,
    onSeek,
    buffered = 0,
    height = 4,
    showHandle = true,
    class: className = '',
    fieldMode = false,
  }: Props = $props();

  let progressEl: HTMLDivElement | undefined = $state(undefined);

  let progress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
  let bufferPercent = $derived(buffered * 100);

  let trackBg = $derived(fieldMode ? 'bg-nb-black/60' : 'bg-nb-white/30');
  let progressBg = $derived(fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue');
  let bufferBg = $derived(fieldMode ? 'bg-nb-black/40' : 'bg-nb-white/20');
  let handleColor = $derived(fieldMode ? 'bg-nb-yellow' : 'bg-nb-white');

  function handleClick(e: MouseEvent) {
    if (!progressEl || duration <= 0 || !onSeek) return;
    const rect = progressEl.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, clickPosition * duration));
    onSeek(newTime);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (duration <= 0 || !onSeek) return;
    const seekStep = duration / 20; // 5% increments

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        onSeek(Math.max(0, currentTime - seekStep));
        break;
      case 'ArrowRight':
        e.preventDefault();
        onSeek(Math.min(duration, currentTime + seekStep));
        break;
      case 'Home':
        e.preventDefault();
        onSeek(0);
        break;
      case 'End':
        e.preventDefault();
        onSeek(duration);
        break;
    }
  }
</script>

<div
  bind:this={progressEl}
  class={cn('relative cursor-pointer group', trackBg, className)}
  style:height="{height}px"
  onclick={handleClick}
  role="slider"
  aria-valuenow={Math.round(progress)}
  aria-valuemin={0}
  aria-valuemax={duration}
  aria-label="Seek"
  tabindex="0"
  onkeydown={handleKeyDown}
>
  <!-- Buffered progress -->
  {#if buffered > 0}
    <div
      class={cn('absolute top-0 left-0 h-full', bufferBg)}
      style:width="{bufferPercent}%"
    ></div>
  {/if}

  <!-- Playback progress -->
  <div
    class={cn('absolute top-0 left-0 h-full transition-nb duration-75', progressBg)}
    style:width="{progress}%"
  >
    <!-- Scrubber handle -->
    {#if showHandle}
      <div
        class={cn(
          'absolute right-0 top-1/2 w-3 h-3 opacity-0 group-hover:opacity-100 transition-nb shadow-brutal-sm',
          handleColor
        )}
        style:transform="translate(50%, -50%)"
      ></div>
    {/if}
  </div>
</div>
