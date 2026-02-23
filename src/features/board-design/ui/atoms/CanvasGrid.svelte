<!--
  CanvasGrid.svelte — CSS Background Grid Pattern
  ================================================
  React source: src/features/board-design/ui/atoms/CanvasGrid.tsx (52 lines)

  Purpose: Renders a repeating CSS grid background using background-image
  linear-gradient pattern. Used as the board workspace background.

  Architecture notes:
  - Arch 5.D: Receives cx (ContextualClassNames) prop — uses cx.gridLine, cx.gridBg
  - No fieldMode prop needed (colors come from cx)
  - No state, no events — purely decorative
  - aria-hidden="true" since grid is decorative

  Svelte 5 patterns:
  - {#if} for conditional rendering when !visible
  - Inline style object for dynamic backgroundImage/backgroundSize
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    cellSize?: number;
    lineWidth?: number;
    visible?: boolean;
    cx: ContextualClassNames;
  }

  let {
    cellSize = 20,
    lineWidth = 1,
    visible = true,
    cx,
  }: Props = $props();

  // Dynamic CSS grid pattern via inline style
  const gridStyle = $derived({
    backgroundImage: `
      linear-gradient(${cx.gridLine} ${lineWidth}px, transparent ${lineWidth}px),
      linear-gradient(90deg, ${cx.gridLine} ${lineWidth}px, transparent ${lineWidth}px)
    `,
    backgroundSize: `${cellSize}px ${cellSize}px`,
  });
</script>

{#if visible}
  <div
    class="absolute inset-0 opacity-20 {cx.gridBg}"
    style:background-image={gridStyle.backgroundImage}
    style:background-size={gridStyle.backgroundSize}
    aria-hidden="true"
  />
{/if}
