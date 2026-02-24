<!--
  BoardToolbar.svelte — Zoom indicator + item/connection count overlay
  ====================================================================
  Extracted from BoardView organism. Renders the bottom-right zoom
  percentage indicator and the bottom-left item/connection count
  (visible only in advanced mode).

  FSD Layer: features/board-design/ui/molecules
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  type BgMode = 'grid' | 'dark' | 'light';

  interface Props {
    zoom: number;
    bgMode: BgMode;
    isAdvanced: boolean;
    itemCount: number;
    connectionCount: number;
    hasSelection: boolean;
    selectionCount: number;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    zoom,
    bgMode,
    isAdvanced,
    itemCount,
    connectionCount,
    hasSelection,
    selectionCount,
    cx,
    fieldMode = false,
  }: Props = $props();
</script>

<!-- Zoom indicator (bottom-right) -->
<div class={cn(
  'absolute bottom-3 right-3 px-2 py-1 rounded text-xs font-mono',
  bgMode === 'dark' ? 'bg-gray-800 text-gray-300' : cn(cx.surface || 'bg-white', cx.textMuted, 'border', cx.border || 'border-black/10'),
)}>
  {Math.round(zoom * 100)}%
</div>

<!-- Item count (bottom-left, advanced only) -->
{#if isAdvanced}
  <div class={cn(
    'absolute bottom-3 left-3 px-2 py-1 rounded text-xs font-mono',
    bgMode === 'dark' ? 'bg-gray-800 text-gray-300' : cn(cx.surface || 'bg-white', cx.textMuted),
  )}>
    {itemCount} items · {connectionCount} connections
    {#if hasSelection} · {selectionCount} selected{/if}
  </div>
{/if}
