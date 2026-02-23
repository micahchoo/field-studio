<!--
  ViewerContent — Content area switcher by media type
  React source: src/features/viewer/ui/molecules/ViewerContent.tsx (196 lines)
  Layer: molecule (FSD features/viewer/ui/molecules)

  Renders the appropriate content for the active media type:
  - image: OSD container div (parent initializes OSD via $effect)
  - video: MediaPlayer molecule
  - audio: AudioWaveform molecule (fallback to native <audio>)
  - other: empty/error state

  OSD container ref is $bindable for parent ViewerView binding.
-->

<script module lang="ts">
  export interface ChapterMarker {
    label: string;
    start: number;
    end: number;
    color: string;
  }

  export interface ChoiceItem {
    label: string;
    body: unknown;
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IIIFCanvas, IIIFAnnotation } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    /** Canvas to display */
    canvas: IIIFCanvas | null;
    /** Media type detection */
    mediaType: 'image' | 'video' | 'audio' | 'other';
    /** Resolved image/media URL */
    resolvedUrl: string | null;
    /** Label for aria */
    label?: string;
    /** $bindable -- OSD mounts here */
    osdContainerRef?: HTMLDivElement | undefined;
    /** CSS filter string for image container */
    cssFilter?: string;
    /** Annotations for AV players */
    annotations?: IIIFAnnotation[];
    /** Called when a new annotation is created */
    onCreateAnnotation?: (annotation: IIIFAnnotation) => void;
    /** Whether annotation mode is active */
    annotationModeActive?: boolean;
    /** Toggle annotation mode */
    onAnnotationModeToggle?: (active: boolean) => void;
    /** Current time range selection */
    timeRange?: { start: number; end?: number } | null;
    /** Callback when time range changes */
    onTimeRangeChange?: (range: { start: number; end?: number } | null) => void;
    /** Callback for playback time updates */
    onPlaybackTimeUpdate?: (time: number) => void;
    /** Chapter markers for media timeline */
    chapters?: ChapterMarker[];
    /** Whether spatial annotation overlay is enabled on video */
    spatialAnnotationMode?: boolean;
    /** Callback for spatial region draw on video */
    onSpatialAnnotation?: (region: { x: number; y: number; w: number; h: number }) => void;
    /** Whether canvas has Choice bodies */
    hasChoice?: boolean;
    /** Choice items for selector */
    choiceItems?: ChoiceItem[];
    /** Active choice index */
    activeChoiceIndex?: number;
    /** Callback when choice changes */
    onChoiceSelect?: (index: number) => void;
    /** Contextual styles */
    cx: ContextualClassNames;
    /** Field mode */
    fieldMode: boolean;
  }

  let {
    canvas,
    mediaType,
    resolvedUrl,
    label = '',
    osdContainerRef = $bindable(),
    cssFilter = 'none',
    annotations = [],
    onCreateAnnotation,
    annotationModeActive = false,
    onAnnotationModeToggle,
    timeRange,
    onTimeRangeChange,
    onPlaybackTimeUpdate,
    chapters = [],
    spatialAnnotationMode = false,
    onSpatialAnnotation,
    hasChoice = false,
    choiceItems = [],
    activeChoiceIndex = 0,
    onChoiceSelect,
    cx,
    fieldMode,
  }: Props = $props();

  /** Format seconds to MM:SS */
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="flex-1 flex min-h-0 relative" role="region" aria-label={label || 'Viewer content'}>
  {#if mediaType === 'image' && resolvedUrl}
    <!-- Image: OpenSeadragon container -->
    <div
      class={cn('flex-1 relative overflow-hidden flex', fieldMode ? 'bg-nb-black' : 'bg-nb-cream')}
      style:height="100%"
    >
      <div
        bind:this={osdContainerRef}
        class="absolute inset-0 w-full h-full"
        style:background={fieldMode ? '#000' : undefined}
        style:filter={cssFilter !== 'none' ? cssFilter : undefined}
        role="img"
        aria-label={label || 'Image viewer'}
      ></div>

      <!-- Choice Selector -->
      {#if hasChoice && choiceItems.length > 1 && onChoiceSelect}
        <div class="absolute top-2 left-2 z-10 flex gap-1">
          {#each choiceItems as choice, i}
            <button
              type="button"
              class={cn(
                'px-2 py-1 text-xs font-mono border transition-nb',
                activeChoiceIndex === i
                  ? fieldMode ? 'bg-nb-yellow text-black border-nb-yellow' : 'bg-nb-blue text-white border-nb-blue'
                  : fieldMode ? 'bg-nb-black/80 text-nb-yellow/60 border-nb-yellow/30 hover:bg-nb-yellow/10' : 'bg-nb-white/80 text-nb-black/60 border-nb-black/20 hover:bg-nb-black/5'
              )}
              onclick={() => onChoiceSelect(i)}
            >
              {choice.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>

  {:else if mediaType === 'video' && resolvedUrl}
    <!-- Video: native video element (MediaPlayer molecule not yet migrated) -->
    <div class="flex-1 relative overflow-hidden" style:height="100%">
      <div class="absolute inset-0 flex items-center justify-center bg-black">
        <video
          src={resolvedUrl}
          class="w-full h-full object-contain"
          controls
          preload="metadata"
          ontimeupdate={(e) => {
            if (onPlaybackTimeUpdate) {
              onPlaybackTimeUpdate((e.target as HTMLVideoElement).currentTime);
            }
          }}
        >
          <track kind="captions" />
        </video>
      </div>
    </div>

  {:else if mediaType === 'audio' && resolvedUrl}
    <!-- Audio: native audio with chapter markers (AudioWaveform molecule pending migration) -->
    <div class="flex-1 relative overflow-hidden flex items-center justify-center p-4" style:height="100%">
      <div class="w-full max-w-2xl">
        <audio
          src={resolvedUrl}
          class="w-full"
          controls
          preload="metadata"
          ontimeupdate={(e) => {
            if (onPlaybackTimeUpdate) {
              onPlaybackTimeUpdate((e.target as HTMLAudioElement).currentTime);
            }
          }}
        >
          <track kind="captions" />
        </audio>

        <!-- Chapter markers -->
        {#if chapters.length > 0}
          <div class={cn('mt-3 space-y-1', cx.text)}>
            <p class="text-xs font-mono uppercase tracking-wider opacity-60">Chapters</p>
            {#each chapters as chapter}
              <button
                type="button"
                class={cn(
                  'block w-full text-left px-2 py-1 text-sm font-mono transition-nb',
                  fieldMode ? 'text-nb-yellow/70 hover:bg-nb-yellow/10' : 'text-nb-black/70 hover:bg-nb-black/5'
                )}
                onclick={() => {
                  if (onPlaybackTimeUpdate) onPlaybackTimeUpdate(chapter.start);
                }}
              >
                <span
                  class="inline-block w-2 h-2 rounded-full mr-2"
                  style:background-color={chapter.color}
                ></span>
                {chapter.label}
                <span class="opacity-50 ml-2">{formatTime(chapter.start)}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  {:else}
    <!-- Unsupported or no content -->
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <Icon
          name="broken_image"
          class={cn('text-4xl mb-2', fieldMode ? 'text-nb-yellow/30' : 'text-nb-black/30')}
        />
        <p class={cn('text-sm font-mono', fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/40')}>
          {#if !resolvedUrl && (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio')}
            No media source available
          {:else}
            Unsupported media type
          {/if}
        </p>
      </div>
    </div>
  {/if}
</div>
