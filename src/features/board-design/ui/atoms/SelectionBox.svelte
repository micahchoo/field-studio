<!--
  SelectionBox.svelte — Rubber-Band Selection Rectangle
  ======================================================
  React source: src/features/board-design/ui/atoms/SelectionBox.tsx (64 lines)

  Purpose: Dashed rectangle overlay for multi-select drag (rubber-band).
  Computes position and size from start and current mouse coordinates.
  Semi-transparent fill with dashed border.

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - pointer-events-none — selection box does not capture events
  - Positioned via inline style (computed from start/current points)
  - Uses hex color for background opacity (20 = 12% in hex alpha)
  - z-index: 999 to float above all items

  Svelte 5 patterns:
  - {#if} for active state conditional rendering
  - $derived for computed left, top, width, height, borderColor
-->
<script lang="ts">
  interface Props {
    start: { x: number; y: number };
    current: { x: number; y: number };
    active: boolean;
    cx: { surface: string; accent: string };
    fieldMode: boolean;
  }

  let {
    start,
    current,
    active,
    cx,
    fieldMode,
  }: Props = $props();

  const left = $derived(Math.min(start.x, current.x));
  const top = $derived(Math.min(start.y, current.y));
  const width = $derived(Math.abs(current.x - start.x));
  const height = $derived(Math.abs(current.y - start.y));
  const borderColor = $derived(fieldMode ? '#FFE500' : cx.accent);
</script>

{#if active}
  <div
    class="absolute pointer-events-none"
    style:left="{left}px"
    style:top="{top}px"
    style:width="{width}px"
    style:height="{height}px"
    style:border="2px dashed {borderColor}"
    style:background-color="{borderColor}20"
    style:z-index="999"
    aria-label="Selection box"
  />
{/if}
