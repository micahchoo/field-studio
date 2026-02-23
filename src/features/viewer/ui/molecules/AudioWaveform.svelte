<!--
  AudioWaveform — WaveSurfer.js waveform + timeline + transport controls

  ORIGINAL: src/features/viewer/ui/molecules/AudioWaveform.tsx (170 lines)
  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  WaveSurfer.js integration for audio waveform visualization with annotation
  region support, timeline ruler, and transport controls.
-->

<script lang="ts" module>
  import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { TimeRange } from '../../model/annotation';

  /** Colors for annotation regions on the waveform */
  const REGION_COLORS = [
    'rgba(59, 130, 246, 0.3)',
    'rgba(34, 197, 94, 0.3)',
    'rgba(168, 85, 247, 0.3)',
    'rgba(245, 158, 11, 0.3)',
    'rgba(239, 68, 68, 0.3)',
    'rgba(6, 182, 212, 0.3)',
  ];
</script>

<script lang="ts">
  /* eslint-disable @field-studio/lifecycle-restrictions -- WaveSurfer.js integration requires $effect lifecycle hooks to init/sync external library */
  /* eslint-disable @field-studio/no-native-html-in-molecules -- Volume slider requires native range input for audio control */
  import { onMount } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';
  import { Icon } from '@/src/shared/ui/atoms';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';
  import PlayPauseButton from '@/src/features/viewer/ui/atoms/PlayPauseButton.svelte';
  import { formatTimeForDisplay, getAnnotationTimeRange, isTimeBasedAnnotation } from '../../model/annotation';
  import { getIIIFValue } from '@/src/shared/types';

  interface Props {
    canvas: IIIFCanvas;
    src: string;
    annotations?: IIIFAnnotation[];
    annotationModeActive?: boolean;
    onAnnotationModeToggle?: (active: boolean) => void;
    timeRange?: TimeRange | null;
    onTimeRangeChange?: (range: TimeRange | null) => void;
    onTimeUpdate?: (time: number) => void;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
    class?: string;
  }

  let {
    canvas,
    src,
    annotations = [],
    annotationModeActive = false,
    onAnnotationModeToggle,
    timeRange = null,
    onTimeRangeChange,
    onTimeUpdate,
    cx,
    fieldMode = false,
    class: className = '',
  }: Props = $props();

  // DOM refs
  let waveformEl: HTMLDivElement | undefined = $state(undefined);
  let timelineEl: HTMLDivElement | undefined = $state(undefined);

  // WaveSurfer instance (non-reactive to avoid proxy overhead)
  let ws: any = null;
  let regionsPlugin: any = null;
  let dragDisableFn: (() => void) | null = null;
  let lastTimeUpdate = 0;

  // Reactive state
  let isReady = $state(false);
  let isLoading = $state(true);
  let currentTime = $state(0);
  let duration = $state(0);
  let isPlaying = $state(false);
  let volume = $state(0.8);
  let playbackRate = $state(1);

  // Derived
  let canvasLabel = $derived(getIIIFValue(canvas.label) || 'Audio');

  // --- Controls ---

  function togglePlayPause() {
    ws?.playPause();
  }

  function seekTo(time: number) {
    if (ws && duration > 0) {
      ws.seekTo(time / duration);
    }
  }

  function handleRewind() {
    seekTo(Math.max(0, currentTime - 10));
  }

  function handleForward() {
    seekTo(Math.min(duration, currentTime + 10));
  }

  function handleVolumeChange(vol: number) {
    volume = vol;
    ws?.setVolume(vol);
  }

  function handlePlaybackRateChange(rate: number) {
    playbackRate = rate;
    ws?.setPlaybackRate(rate);
  }

  // --- WaveSurfer init ---

  onMount(() => {
    // The $effect below handles init once waveformEl and src are ready
    return () => {
      if (ws) {
        ws.destroy();
        ws = null;
        regionsPlugin = null;
      }
    };
  });

  // Initialize WaveSurfer when container and src are available
  $effect(() => {
    if (!waveformEl || !src) return;

    // Destroy previous instance
    if (ws) {
      ws.destroy();
      ws = null;
      regionsPlugin = null;
    }

    isLoading = true;
    isReady = false;

    // Dynamic import to keep WaveSurfer out of the main bundle
    (async () => {
      const WaveSurfer = (await import('wavesurfer.js')).default;
      const RegionsPlugin = (await import('wavesurfer.js/dist/plugins/regions.js')).default;
      const TimelinePlugin = (await import('wavesurfer.js/dist/plugins/timeline.js')).default;
      const HoverPlugin = (await import('wavesurfer.js/dist/plugins/hover.js')).default;

      if (!waveformEl) return; // check after async

      const regions = RegionsPlugin.create();
      regionsPlugin = regions;

      const plugins: any[] = [regions];

      if (timelineEl) {
        plugins.push(TimelinePlugin.create({ container: timelineEl }));
      }

      plugins.push(HoverPlugin.create({
        lineColor: fieldMode ? '#eab308' : '#22c55e',
        lineWidth: 2,
        labelBackground: fieldMode ? '#000' : '#333',
        labelColor: '#fff',
        labelSize: '11px',
      }));

      const instance = WaveSurfer.create({
        container: waveformEl,
        url: src,
        waveColor: fieldMode ? '#eab308' : '#64748b',
        progressColor: fieldMode ? '#fbbf24' : '#22c55e',
        cursorColor: fieldMode ? '#fbbf24' : '#3b82f6',
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 'auto',
        normalize: true,
        plugins,
      });

      ws = instance;

      instance.on('ready', () => {
        isReady = true;
        isLoading = false;
        duration = instance.getDuration();
      });

      instance.on('loading', () => {
        isLoading = true;
      });

      instance.on('timeupdate', (time: number) => {
        const now = Date.now();
        if (now - lastTimeUpdate > 250) {
          lastTimeUpdate = now;
          currentTime = time;
          onTimeUpdate?.(time);
        }
      });

      instance.on('play', () => { isPlaying = true; });
      instance.on('pause', () => { isPlaying = false; });
      instance.on('finish', () => { isPlaying = false; });

      // Region creation events
      regions.on('region-created', (region: any) => {
        if (region.id?.startsWith('user-')) {
          onTimeRangeChange?.({ start: region.start, end: region.end });
        }
      });

      regions.on('region-updated', (region: any) => {
        if (region.id?.startsWith('user-')) {
          onTimeRangeChange?.({ start: region.start, end: region.end });
        }
      });
    })();

    return () => {
      if (ws) {
        ws.destroy();
        ws = null;
        regionsPlugin = null;
      }
    };
  });

  // Enable/disable region creation for annotation mode
  $effect(() => {
    if (!regionsPlugin) return;

    if (dragDisableFn) {
      dragDisableFn();
      dragDisableFn = null;
    }

    if (annotationModeActive) {
      dragDisableFn = regionsPlugin.enableDragSelection({
        color: fieldMode ? 'rgba(234, 179, 8, 0.3)' : 'rgba(34, 197, 94, 0.3)',
        id: `user-${Date.now()}`,
      });
    }
  });

  // Sync annotation regions to waveform
  $effect(() => {
    if (!regionsPlugin || !isReady) return;

    // Access annotations to track dependency
    const annos = annotations;

    // Clear existing annotation regions (keep user-created ones)
    regionsPlugin.getRegions().forEach((r: any) => {
      if (!r.id?.startsWith('user-')) {
        r.remove();
      }
    });

    // Add annotation regions
    const timeAnnotations = annos.filter(isTimeBasedAnnotation);
    timeAnnotations.forEach((anno: IIIFAnnotation, idx: number) => {
      const range = getAnnotationTimeRange(anno);
      if (!range) return;

      const body = anno.body as { value?: string };
      regionsPlugin.addRegion({
        id: `anno-${anno.id}`,
        start: range.start,
        end: range.end ?? range.start + 0.5,
        color: REGION_COLORS[idx % REGION_COLORS.length],
        content: body?.value || '',
        drag: false,
        resize: false,
      });
    });
  });
</script>

<div class={cn('flex flex-col bg-nb-black w-full h-full', className)}>
  <!-- Header -->
  <div class="flex items-center gap-3 px-4 py-3">
    <Icon
      name="audiotrack"
      class={cn('text-2xl', fieldMode ? 'text-nb-yellow/60' : 'text-nb-white/40')}
    />
    <div>
      <p class={cn('text-sm font-medium', fieldMode ? 'text-nb-yellow' : 'text-nb-white')}>
        {canvasLabel}
      </p>
      {#if duration > 0}
        <p class="text-xs text-nb-white/40">
          {formatTimeForDisplay(duration)}
        </p>
      {/if}
    </div>
  </div>

  <!-- Waveform -->
  <div class="flex-1 flex flex-col justify-center px-4">
    <div
      bind:this={waveformEl}
      class={cn('w-full transition-opacity', isLoading ? 'opacity-50' : 'opacity-100')}
      style:min-height="120px"
    ></div>

    <!-- Timeline -->
    <div bind:this={timelineEl} class="w-full mt-1"></div>

    <!-- Loading overlay -->
    {#if isLoading}
      <div class="flex items-center justify-center py-4">
        <Icon
          name="hourglass_empty"
          class={cn('text-xl animate-spin', fieldMode ? 'text-nb-yellow/40' : 'text-nb-white/30')}
        />
        <span class="text-xs text-nb-white/30 ml-2">Loading waveform...</span>
      </div>
    {/if}
  </div>

  <!-- Annotation range indicator -->
  {#if annotationModeActive && timeRange}
    <div class={cn(
      'flex items-center justify-center py-1 text-xs',
      fieldMode ? 'text-nb-yellow' : 'text-nb-green'
    )}>
      Selected: {formatTimeForDisplay(timeRange.start)}
      {#if timeRange.end !== undefined}
        {' '}- {formatTimeForDisplay(timeRange.end)}
      {/if}
    </div>
  {/if}

  <!-- Controls -->
  <div class="p-4 border-t border-nb-white/10">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <!-- Left group -->
      <div class="flex items-center gap-1">
        <PlayPauseButton {isPlaying} onToggle={togglePlayPause} {fieldMode} />
        <IconButton
          icon="replay_10"
          label="Rewind 10s"
          onclick={handleRewind}
          size="sm"
          class="!text-white hover:!text-nb-blue"
        />
        <IconButton
          icon="forward_10"
          label="Forward 10s"
          onclick={handleForward}
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

      <!-- Right group -->
      <div class="flex items-center gap-2">
        <!-- Playback rate -->
        <button
          onclick={() => {
            const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
            const idx = rates.indexOf(playbackRate);
            const nextRate = rates[(idx + 1) % rates.length];
            handlePlaybackRateChange(nextRate);
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
            oninput={(e) => handleVolumeChange(Number((e.target as HTMLInputElement).value))}
            class="w-16 h-1 accent-current"
          />
        </div>
      </div>
    </div>
  </div>
</div>
