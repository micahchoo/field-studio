<!--
  ChapterMarkers — Chapter markers on media progress bar

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Renders colored chapter regions on a media player progress bar.
  Each chapter is a clickable button that seeks to that chapter's start time.
-->

<script lang="ts">
  import type { ChapterMarker } from '../molecules/mediaPlayerHelpers';

  interface Props {
    chapters: ChapterMarker[];
    duration: number;
    onSeek: (time: number) => void;
  }

  let {
    chapters,
    duration,
    onSeek,
  }: Props = $props();
</script>

{#each chapters as ch}
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
      onclick={(e) => { e.stopPropagation(); onSeek(ch.start); }}
      title={ch.label}
    >
      <div class="absolute -top-6 left-0 hidden group-hover/ch:block px-1 py-0.5 text-[9px] text-white bg-nb-black/90 whitespace-nowrap z-10">
        {ch.label}
      </div>
    </button>
  {/if}
{/each}
