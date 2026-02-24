<!--
  MiniMap.svelte — Canvas Overview Widget
  ========================================
  React source: src/features/board-design/ui/atoms/MiniMap.tsx (127 lines)

  Purpose: Small overview map showing all board items as colored rectangles
  and a viewport rectangle. Click to pan the viewport to that position.
  Positioned absolutely in the bottom-left corner of the board.

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - Arch 2.D: Static class strings for item/viewport colors
  - Arch 2.G: Native div with onclick handler (not ARIA reconstruction)
  - Minimal local state — all data from props
  - Scale computation: fits all items into 150x100 minimap area

  Svelte 5 patterns:
  - $derived for effectiveBounds, scale, and item positions
  - {#each} for item rectangles
  - {#if} for viewport rectangle
  - onclick handler on the minimap area
-->
<script module lang="ts">
  // Arch 2.D / 2.F: Static color maps
  const ITEM_COLORS = {
    field: 'bg-nb-yellow',
    default: 'bg-nb-blue',
  } as const;

  const VIEWPORT_COLORS = {
    field: 'border-nb-yellow bg-nb-yellow',
    default: 'border-nb-blue bg-nb-blue',
  } as const;
</script>

<script lang="ts">
  import type { BoardItem } from '../../model';

  interface Props {
    items: BoardItem[];
    bounds?: { minX: number; minY: number; maxX: number; maxY: number } | null;
    viewportRect?: { x: number; y: number; width: number; height: number };
    onViewportChange?: (x: number, y: number) => void;
    cx: { surface: string; accent: string; text: string };
    fieldMode: boolean;
  }

  let {
    items,
    bounds,
    viewportRect,
    onViewportChange,
    cx,
    fieldMode,
  }: Props = $props();

  // Compute effective bounds from items if not provided
  const effectiveBounds = $derived(
    bounds || (items.length > 0
      ? {
          minX: Math.min(...items.map(i => i.x)),
          minY: Math.min(...items.map(i => i.y)),
          maxX: Math.max(...items.map(i => i.x + i.w)),
          maxY: Math.max(...items.map(i => i.y + i.h)),
        }
      : { minX: 0, minY: 0, maxX: 1000, maxY: 800 })
  );

  const totalWidth = $derived(effectiveBounds.maxX - effectiveBounds.minX || 1000);
  const totalHeight = $derived(effectiveBounds.maxY - effectiveBounds.minY || 800);

  const mapWidth = 150;
  const mapHeight = 100;
  const scale = $derived(Math.min(mapWidth / totalWidth, mapHeight / totalHeight));

  const itemColor = $derived(fieldMode ? ITEM_COLORS.field : ITEM_COLORS.default);
  const vpColor = $derived(fieldMode ? VIEWPORT_COLORS.field : VIEWPORT_COLORS.default);
  const borderClass = $derived(fieldMode ? 'border-nb-black/80' : 'border-nb-black/20');

  function handleClick(e: MouseEvent) {
    if (!onViewportChange) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale + effectiveBounds.minX;
    const y = (e.clientY - rect.top) / scale + effectiveBounds.minY;
    onViewportChange(x, y);
  }
</script>

<div class="absolute bottom-4 left-4 w-40 h-28 p-2 shadow-brutal {cx.surface} border {borderClass} backdrop-blur-sm bg-opacity-90">
  <div class="text-xs font-medium mb-1">Canvas Overview</div>
  <div
    class="relative w-full h-20 border border-nb-black/30 overflow-hidden cursor-pointer"
    onclick={handleClick}
    onkeydown={(e) => { if (e.key==="Enter"||e.key===" ") { e.preventDefault(); undefined; } }}
    aria-label="MiniMap - click to pan"
    role="button"
    tabindex="0"
  >
    <!-- Background -->
    <div class="absolute inset-0 opacity-20 {fieldMode ? 'bg-nb-black' : cx.surface || 'bg-nb-black'}" ></div>

    <!-- Items -->
    {#each items as item (item.id)}
      <div
        class="absolute opacity-70 {itemColor}"
        style:left="{(item.x - effectiveBounds.minX) * scale}px"
        style:top="{(item.y - effectiveBounds.minY) * scale}px"
        style:width="{Math.max(item.w * scale, 2)}px"
        style:height="{Math.max(item.h * scale, 2)}px"
        title={item.label}
      ></div>
    {/each}

    <!-- Viewport rectangle -->
    {#if viewportRect}
      <div
        class="absolute border-2 bg-opacity-20 {vpColor}"
        style:left="{(viewportRect.x - effectiveBounds.minX) * scale}px"
        style:top="{(viewportRect.y - effectiveBounds.minY) * scale}px"
        style:width="{viewportRect.width * scale}px"
        style:height="{viewportRect.height * scale}px"
        aria-label="Current viewport"
      ></div>
    {/if}
  </div>
</div>
