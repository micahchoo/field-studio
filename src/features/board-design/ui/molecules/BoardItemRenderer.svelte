<!--
  BoardItemRenderer.svelte — Individual board item card
  =====================================================
  Extracted from BoardView organism. Renders a single board item
  with type-specific content (note, canvas, or generic), selection state,
  and connection handles when in connect tool mode.

  FSD Layer: features/board-design/ui/molecules
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { BoardItem } from '@/src/features/board-design/stores/boardVault.svelte';
  import { cn } from '@/src/shared/lib/cn';

  type Tool = 'select' | 'connect' | 'note' | 'text';
  type BgMode = 'grid' | 'dark' | 'light';

  interface Props {
    item: BoardItem;
    isSelected: boolean;
    activeTool: Tool;
    bgMode: BgMode;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    onPointerDown: (e: PointerEvent) => void;
    onPointerUp: (e: PointerEvent) => void;
    onDblClick: () => void;
    onContextMenu: (e: MouseEvent) => void;
  }

  let {
    item,
    isSelected,
    activeTool,
    bgMode,
    cx,
    fieldMode = false,
    onPointerDown,
    onPointerUp,
    onDblClick,
    onContextMenu,
  }: Props = $props();

  function itemBgClass(boardItem: BoardItem): string {
    if (boardItem.type === 'note') {
      return '';
    }
    return cx.surface || 'bg-white';
  }

  function itemBorderClass(boardItem: BoardItem, selected: boolean): string {
    if (selected) {
      return fieldMode
        ? 'border-3 border-yellow-500 shadow-[0_0_0_2px_rgba(234,179,8,0.3)]'
        : cn('border-3', cx.accent || 'border-blue-500', 'shadow-[0_0_0_2px_rgba(0,85,255,0.2)]');
    }
    if (boardItem.type === 'note') return 'border-2 border-black/20';
    return cn('border-2', cx.border || 'border-nb-black');
  }
</script>

<button
  type="button"
  class={cn(
    'absolute transition-shadow',
    itemBgClass(item),
    itemBorderClass(item, isSelected),
    activeTool === 'connect' && 'hover:ring-2 hover:ring-blue-400',
  )}
  style="left: {item.x}px; top: {item.y}px; width: {item.width}px; height: {item.height}px;{item.type === 'note' && item.color ? ` background-color: ${item.color};` : ''}"
  aria-pressed={isSelected}
  aria-label={item.label ?? item.resourceId ?? 'Board item'}
  onpointerdown={onPointerDown}
  onpointerup={onPointerUp}
  ondblclick={onDblClick}
  oncontextmenu={onContextMenu}
>
  <div class="w-full h-full flex flex-col overflow-hidden">
    {#if item.type === 'note'}
      <div class="flex-1 p-2 text-sm overflow-hidden">
        <span class="font-medium text-black/80">{item.label ?? 'Note'}</span>
      </div>
    {:else if item.type === 'canvas'}
      <div class={cn('flex-1 flex items-center justify-center text-xs overflow-hidden', bgMode === 'dark' ? 'text-gray-300' : cx.textMuted)}>
        <div class="text-center p-2">
          <svg class="w-8 h-8 mx-auto mb-1 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="0" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span class="truncate block max-w-full">{item.label ?? item.resourceId ?? 'Canvas'}</span>
        </div>
      </div>
    {:else}
      <div class="flex-1 flex items-center justify-center text-xs opacity-50">
        {item.type}
      </div>
    {/if}
  </div>

  {#if activeTool === 'connect'}
    <div class={cn(
      'absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2',
      fieldMode ? 'bg-yellow-400 border-yellow-600' : 'bg-blue-500 border-blue-700',
    )}></div>
  {/if}
</button>
