<!--
  ViewerContentArea -- Media content area with OSD, audio, video and measurement overlay

  LAYER: molecule
  FSD: features/viewer/ui/molecules

  Renders the main content area of the viewer, switching between:
  - Image: OSD container with optional measurement overlay and CSS filters
  - Audio: native audio element with chapter markers
  - Video: native video element
  - Other: unsupported media placeholder
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { MediaType, ChapterMarker } from '../organisms/viewerViewHelpers';
  import type { ImageFilterStore } from '@/src/features/viewer/model/imageFilters.svelte';
  import type { MeasurementStore } from '@/src/features/viewer/model/measurement.svelte';
  import type { MediaPlayerStore } from '@/src/features/viewer/stores/mediaPlayer.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    mediaType: MediaType;
    label: string;
    resolvedImageUrl: string | null;
    chapters: ChapterMarker[];
    filters: ImageFilterStore;
    measurement: MeasurementStore;
    player: MediaPlayerStore;
    osdContainerRef: HTMLDivElement | undefined;
    videoRef: HTMLVideoElement | HTMLAudioElement | undefined;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    t: (key: string) => string;
  }

  let {
    mediaType, label, resolvedImageUrl, chapters,
    filters, measurement, player,
    osdContainerRef = $bindable(),
    videoRef = $bindable(),
    cx, fieldMode = false, t,
  }: Props = $props();
</script>

{#if mediaType === 'image'}
  <div
    bind:this={osdContainerRef}
    class="absolute inset-0"
    style={filters.cssFilter !== 'none' ? `filter: ${filters.cssFilter}` : undefined}
    role="img"
    aria-label={label || 'Canvas viewer'}
  ></div>

  {#if measurement.active}
    <div class="absolute inset-0 pointer-events-auto z-10" aria-label="Measurement overlay">
      <div class={cn(
        'absolute top-2 right-2 px-2 py-1 rounded text-xs font-mono',
        fieldMode ? 'bg-nb-yellow text-nb-black' : 'bg-nb-black text-nb-white'
      )}>
        Measurement: {measurement.isDrawing ? 'Drawing...' : `${measurement.measurements.length} measurements`}
      </div>
    </div>
  {/if}

{:else if mediaType === 'audio'}
  <div class="flex-1 flex items-center justify-center p-4">
    {#if resolvedImageUrl}
      <div class="w-full max-w-2xl">
        <audio
          bind:this={videoRef}
          src={resolvedImageUrl}
          class="w-full"
          controls
          preload="metadata"
        >
          <track kind="captions" />
        </audio>

        {#if chapters.length > 0}
          <div class={cn('mt-3 space-y-1', cx.text)}>
            <p class="text-xs font-mono uppercase tracking-wider opacity-60">{t('Chapters')}</p>
            {#each chapters as chapter}
              <button
                aria-label={chapter.label}
                class={cn('block w-full text-left px-2 py-1 rounded text-sm font-mono hover:opacity-80', cx.iconButton)}
                onclick={() => player.seek(chapter.start)}
              >
                <span class="inline-block w-2 h-2 rounded-full mr-2" style:background-color={chapter.color}></span>
                {chapter.label}
                <span class="opacity-50 ml-2">
                  {player.formatTime(chapter.start)}
                  {#if chapter.end !== chapter.start}
                    - {player.formatTime(chapter.end)}
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        {/if}

        <div class={cn('mt-2 text-xs font-mono text-center', cx.textMuted)}>
          {player.formatTime()} / {player.formatTime(player.duration)}
        </div>
      </div>
    {:else}
      <p class={cn('text-sm font-mono', cx.textMuted)}>{t('No audio source available')}</p>
    {/if}
  </div>

{:else if mediaType === 'video'}
  <div class="flex-1 flex items-center justify-center bg-black">
    {#if resolvedImageUrl}
      <video
        bind:this={videoRef}
        src={resolvedImageUrl}
        class="w-full h-full object-contain"
        controls
        preload="metadata"
      >
        <track kind="captions" />
      </video>
    {:else}
      <p class="text-sm font-mono text-white/50">{t('No video source available')}</p>
    {/if}
  </div>

{:else}
  <div class={cn('flex-1 flex items-center justify-center', cx.text)}>
    <div class="text-center">
      <p class="text-sm font-mono opacity-60">{t('Unsupported media type')}</p>
    </div>
  </div>
{/if}
