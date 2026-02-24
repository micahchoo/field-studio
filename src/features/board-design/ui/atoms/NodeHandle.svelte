<!--
  NodeHandle.svelte — Connection Handle Circle
  =============================================
  React source: src/features/board-design/ui/atoms/NodeHandle.tsx (77 lines)

  Purpose: Small circular handle on node edges for initiating connections.
  Positioned at top/right/bottom/left of a board node.
  Clicking starts a connection drag from this node.

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - Arch 2.G: Uses native <button> element (semantic HTML, not ARIA reconstruction)
  - Arch 2.D: Static position class map (no interpolation)
  - Arch 2.F: POSITION_CLASSES in <script module>
  - Inline style for dynamic size and color (since size changes with active state)

  Svelte 5 patterns:
  - $derived for computed size and color
  - onclick (lowercase) on button
-->
<script module lang="ts">
  // Arch 2.F / 2.D: Static position class map
  const POSITION_CLASSES = {
    top: '-top-1 left-1/2 -translate-x-1/2',
    right: '-right-1 top-1/2 -translate-y-1/2',
    bottom: '-bottom-1 left-1/2 -translate-x-1/2',
    left: '-left-1 top-1/2 -translate-y-1/2',
  } as const;
</script>

<script lang="ts">
  interface Props {
    position: 'top' | 'right' | 'bottom' | 'left';
    active: boolean;
    onClick: () => void;
    cx: { accent: string; surface: string };
    fieldMode: boolean;
  }

  let {
    position,
    active,
    onClick,
    cx,
    fieldMode,
  }: Props = $props();

  const posClass = $derived(POSITION_CLASSES[position]);
  const size = $derived(active ? 12 : 8);
  const color = $derived(
    active ? cx.accent : fieldMode ? '#FFE500' : cx.accent ?? '#3b82f6'
  );
</script>

<div class="absolute {posClass}">
  <button
    type="button"
    onclick={onClick}
    style:width="{size}px"
    style:height="{size}px"
    style:min-width="{size}px"
    style:min-height="{size}px"
    style:padding="0"
    style:border-radius="50%"
    style:background-color={color}
    style:border="none"
    style:cursor="crosshair"
    aria-label="Connect from {position} side"
    title="Click to start connection"
  ></button>
</div>
