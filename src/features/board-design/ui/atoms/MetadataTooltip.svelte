<!--
  MetadataTooltip.svelte — Hover Metadata Preview Tooltip
  =======================================================
  React source: src/features/board-design/ui/atoms/MetadataTooltip.tsx (83 lines)

  Purpose: Fixed-position tooltip near cursor showing IIIF metadata:
  summary, navDate, duration, canvasCount, itemCount, and up to 3
  metadata key-value pairs. Positioned absolutely relative to board.

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - Arch 2.D: Static bg class strings (no interpolation)
  - pointer-events-none — tooltip does not capture mouse events
  - Positioned via inline style (left/top from position prop)

  Svelte 5 patterns:
  - {#if} for visibility + content conditional checks
  - {#each} for metadata preview list
  - $derived for hasContent check and bg class
-->
<script lang="ts">
  import type { BoardItemMeta } from '../../model';

  interface Props {
    meta: BoardItemMeta | undefined;
    visible: boolean;
    position: { x: number; y: number };
    cx: { surface: string; text: string };
    fieldMode: boolean;
  }

  let {
    meta,
    visible,
    position,
    cx: _cx,
    fieldMode,
  }: Props = $props();

  const hasContent = $derived(
    meta && (
      meta.summary ||
      (meta.metadataPreview && meta.metadataPreview.length > 0) ||
      meta.navDate ||
      meta.duration != null ||
      meta.canvasCount != null ||
      meta.itemCount != null
    )
  );

  const bgClass = $derived(
    fieldMode
      ? 'bg-nb-black border-nb-yellow/30'
      : 'bg-nb-black border-nb-black/20'
  );
</script>

{#if visible && meta && hasContent}
  <div
    class="absolute z-50 pointer-events-none border shadow-brutal max-w-xs min-w-[180px] p-2.5 space-y-1.5 {bgClass}"
    style:left="{position.x + 8}px"
    style:top="{position.y - 8}px"
  >
    {#if meta.summary}
      <p class="text-[11px] text-nb-white/80 line-clamp-2">{meta.summary}</p>
    {/if}

    {#if meta.navDate}
      <p class="text-[10px] text-nb-white/60">
        <span class="font-bold text-nb-white/40 mr-1">Date:</span>
        {new Date(meta.navDate).toLocaleDateString()}
      </p>
    {/if}

    {#if meta.duration != null}
      <p class="text-[10px] text-nb-white/60">
        <span class="font-bold text-nb-white/40 mr-1">Duration:</span>
        {Math.floor(meta.duration / 60)}:{Math.floor(meta.duration % 60).toString().padStart(2, '0')}
      </p>
    {/if}

    {#if meta.canvasCount != null}
      <p class="text-[10px] text-nb-white/60">
        <span class="font-bold text-nb-white/40 mr-1">Canvases:</span>
        {meta.canvasCount}
      </p>
    {/if}

    {#if meta.itemCount != null}
      <p class="text-[10px] text-nb-white/60">
        <span class="font-bold text-nb-white/40 mr-1">Items:</span>
        {meta.itemCount}
      </p>
    {/if}

    {#if meta.metadataPreview && meta.metadataPreview.length > 0}
      <div class="border-t border-nb-white/10 pt-1.5 space-y-0.5">
        {#each meta.metadataPreview as m}
          <p class="text-[10px] text-nb-white/60 truncate">
            <span class="font-bold text-nb-white/40 mr-1">{m.key}:</span>
            {m.value}
          </p>
        {/each}
      </div>
    {/if}
  </div>
{/if}
