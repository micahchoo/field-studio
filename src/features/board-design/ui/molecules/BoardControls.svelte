<!--
  BoardControls.svelte -- Pan/Zoom/Reset controls (Molecule)
  ==========================================================
  React source: src/features/board-design/ui/molecules/BoardControls.tsx (68L)

  ARCHITECTURE NOTES:
  - Stateless molecule: controlled viewport pattern, no local state
  - Composes ZoomControl atom + Button atom
  - Positioned absolutely at bottom-right of canvas
  - Rule 2.G: native <button> for the "Fit" action is acceptable
  - Rule 5.D: receives cx + fieldMode from parent (FSD molecule contract)
  - Svelte 5: all callbacks are plain props (onclick naming)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import ZoomControl from '@/src/shared/ui/atoms/ZoomControl.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';

  interface Viewport {
    x: number;
    y: number;
    zoom: number;
  }

  interface Props {
    /** Current viewport state */
    viewport: Viewport;
    /** Callback when viewport changes */
    onViewportChange: (viewport: Viewport) => void;
    /** Contextual styles */
    cx: ContextualClassNames;
    /** Field mode flag */
    fieldMode: boolean;
  }

  let {
    viewport,
    onViewportChange,
    cx,
    fieldMode,
  }: Props = $props();

  // ── Handlers ──
  // No local state needed -- pure controlled component

  function handleZoomChange(zoom: number) {
    onViewportChange({ ...viewport, zoom });
  }

  function handleFit() {
    onViewportChange({ x: 0, y: 0, zoom: 1 });
  }
</script>

<div class="absolute bottom-4 right-4 flex items-center gap-2">
  <ZoomControl
    zoom={viewport.zoom}
    min={0.3}
    max={3}
    step={0.2}
    onZoomChange={handleZoomChange}
    onFit={handleFit}
    {cx}
  />
  <Button variant="secondary" size="sm" onclick={handleFit}>
    Fit
  </Button>
</div>
