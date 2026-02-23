<!--
  CanvasItem.svelte — Generic Draggable Canvas Wrapper
  ====================================================
  React source: src/features/board-design/ui/atoms/CanvasItem.tsx (79 lines)

  Purpose: Generic absolutely-positioned wrapper that handles mouse-down
  for drag initiation and click selection. Wraps arbitrary child content.

  Architecture notes:
  - No cx prop (styling is inline position + shared classes)
  - fieldMode prop for ring color variant
  - Arch 2.D: Static class maps for ring colors (no interpolation)
  - Arch 2.G: Native div with onmousedown handler
  - children -> Svelte Snippet pattern: uses {@render children()} slot

  Svelte 5 patterns:
  - Snippet for children content
  - $props() with Snippet type
  - onmousedown (lowercase) event handler
-->
<script module lang="ts">
  // Arch 2.D / 2.F: Static ring class maps
  const RING_COLORS = {
    field: 'ring-nb-yellow ring-offset-nb-black',
    default: 'ring-iiif-blue ring-offset-white',
  } as const;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    id: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    selected: boolean;
    dragging?: boolean;
    onDragStart: (id: string, offset: { x: number; y: number }) => void;
    onClick: (id: string) => void;
    fieldMode: boolean;
    children: Snippet;
  }

  let {
    id,
    position,
    size,
    selected,
    dragging = false,
    onDragStart,
    onClick,
    fieldMode,
    children,
  }: Props = $props();

  const ringColor = $derived(fieldMode ? RING_COLORS.field : RING_COLORS.default);

  function handleMouseDown(e: MouseEvent) {
    e.stopPropagation();
    onClick(id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onDragStart(id, { x: offsetX, y: offsetY });
  }
</script>

<div
  onmousedown={handleMouseDown}
  class={cn(
    'absolute shadow-brutal overflow-hidden cursor-move transition-shadow',
    selected && 'ring-2 ring-offset-2',
    dragging && 'ring-4 ring-offset-1 opacity-90',
    ringColor,
  )}
  style:left="{position.x}px"
  style:top="{position.y}px"
  style:width="{size.width}px"
  style:height="{size.height}px"
>
  {@render children()}
</div>
