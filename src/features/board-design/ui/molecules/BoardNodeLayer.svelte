<!--
  BoardNodeLayer.svelte -- Renders all board nodes with shared tooltip (Molecule)
  ===============================================================================
  React source: src/features/board-design/ui/molecules/BoardNodeLayer.tsx (104L)

  ARCHITECTURE NOTES:
  - Single local state: hoveredItemId ($state<string | null>)
  - Single MetadataTooltip instance shared across all BoardNode atoms
  - Hover callback from each BoardNode updates tooltip position
  - Rule 2.C: items array is read-only prop; use $state.raw() if internalized
  - Rule 5.D: receives cx + fieldMode from parent (FSD molecule contract)
  - Composes: BoardNode atom x N, MetadataTooltip atom x 1
  - Each node rendered via {#each items as item (item.id)} keyed block
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { BoardItem } from '../../model';
  import BoardNode from '../atoms/BoardNode.svelte';
  import MetadataTooltip from '../atoms/MetadataTooltip.svelte';

  interface Props {
    /** Array of board items to render */
    items: BoardItem[];
    /** Currently selected item ID */
    selectedItemId: string | null;
    /** Multi-select IDs */
    selectedIds?: Set<string>;
    /** ID of item being connected from */
    connectingFrom: string | null;
    /** Callback when item is selected */
    onSelectItem: (id: string) => void;
    /** Callback when drag starts */
    onDragStart: (id: string, offset: { x: number; y: number }) => void;
    /** Callback when connection starts */
    onConnectStart: (id: string) => void;
    /** Callback when resize starts */
    onResizeStart?: (id: string, direction: string, startPos: { x: number; y: number }, startSize: { w: number; h: number }) => void;
    /** Callback when item is double-clicked */
    onDoubleClickItem?: (id: string) => void;
    /** Callback when item is right-clicked */
    onContextMenuItem?: (e: MouseEvent, id: string) => void;
    /** Contextual styles */
    cx: ContextualClassNames;
    /** Field mode flag */
    fieldMode: boolean;
  }

  let {
    items,
    selectedItemId,
    selectedIds,
    connectingFrom,
    onSelectItem,
    onDragStart,
    onConnectStart,
    onResizeStart,
    onDoubleClickItem,
    onContextMenuItem,
    cx,
    fieldMode,
  }: Props = $props();

  // ── Local State ──
  // Single hover state shared across all nodes
  let hoveredItemId = $state<string | null>(null);

  // ── Derived ──
  // Resolve the hovered item for tooltip positioning
  let hoveredItem = $derived(
    hoveredItemId ? items.find(i => i.id === hoveredItemId) ?? null : null
  );

  // ── Handlers ──
  function handleHover(id: string | null) {
    hoveredItemId = id;
  }
</script>

{#each items as item (item.id)}
  <BoardNode
    id={item.id}
    position={{ x: item.x, y: item.y }}
    size={{ width: item.w, height: item.h }}
    resource={item}
    selected={selectedItemId === item.id || (selectedIds?.has(item.id) ?? false)}
    connectingFrom={connectingFrom === item.id}
    onSelect={onSelectItem}
    {onDragStart}
    onConnectStart={onConnectStart}
    {onResizeStart}
    onDoubleClick={onDoubleClickItem}
    onContextMenu={onContextMenuItem}
    onHover={handleHover}
    {cx}
    {fieldMode}
  />
{/each}

<!-- Single tooltip for hovered item (not the selected item) -->
{#if hoveredItem && hoveredItemId !== selectedItemId}
  <MetadataTooltip
    meta={hoveredItem.meta}
    visible={true}
    position={{ x: hoveredItem.x + hoveredItem.w, y: hoveredItem.y }}
    {cx}
    {fieldMode}
  />
{/if}
