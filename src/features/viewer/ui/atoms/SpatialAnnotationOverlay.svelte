<!--
  SpatialAnnotationOverlay — SVG drawing overlay for spatial annotations on video

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Renders an SVG overlay on top of a video element for drawing
  spatial annotation rectangles. Reports the drawn region via callback.
-->

<script lang="ts">
  import { getSpatialCoords, computeSpatialRegion } from '../molecules/mediaPlayerHelpers';

  interface Props {
    videoEl: HTMLVideoElement | null;
    onRegionDrawn: (region: { x: number; y: number; w: number; h: number }) => void;
    fieldMode?: boolean;
  }

  let {
    videoEl,
    onRegionDrawn,
    fieldMode = false,
  }: Props = $props();

  let drawStart = $state<{ x: number; y: number } | null>(null);
  let drawEnd = $state<{ x: number; y: number } | null>(null);

  function handleMouseDown(e: MouseEvent) {
    const coords = getSpatialCoords(e, videoEl);
    if (coords) { drawStart = coords; drawEnd = coords; }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!drawStart) return;
    const coords = getSpatialCoords(e, videoEl);
    if (coords) drawEnd = coords;
  }

  function handleMouseUp() {
    if (drawStart && drawEnd) {
      const region = computeSpatialRegion(drawStart, drawEnd);
      if (region) onRegionDrawn(region);
    }
    drawStart = null;
    drawEnd = null;
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svg
  class="absolute inset-0 w-full h-full cursor-crosshair"
  style:pointer-events="all"
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  role="application"
  aria-label="Spatial annotation drawing area"
>
  {#if drawStart && drawEnd}
    <rect
      x="{Math.min(drawStart.x, drawEnd.x) * 100}%"
      y="{Math.min(drawStart.y, drawEnd.y) * 100}%"
      width="{Math.abs(drawEnd.x - drawStart.x) * 100}%"
      height="{Math.abs(drawEnd.y - drawStart.y) * 100}%"
      fill={fieldMode ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)'}
      stroke={fieldMode ? '#eab308' : '#22c55e'}
      stroke-width="2"
    />
  {/if}
</svg>
