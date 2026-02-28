<!--
  ConnectionLayer.svelte -- SVG overlay rendering all connection lines (Molecule)
  ===============================================================================
  React source: src/features/board-design/ui/molecules/ConnectionLayer.tsx (98L)

  ARCHITECTURE NOTES:
  - Stateless molecule: no local state
  - Rule 7.C: Board uses native SVG, not ReactFlow
  - SVG container is pointer-events-none; individual ConnectionLine atoms
    handle their own pointer events
  - getAnchorPoint() helper computes coordinates from item bounds + anchor side
  - Rule 5.D: receives cx + fieldMode from parent
  - Pre-filters to only valid connections (both endpoints exist) via $derived
  - Composes: ConnectionLine atom x N inside an <svg>
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { AnchorSide, BoardItem, Connection } from '../../model';
  import * as GeoRect from '@/src/shared/lib/geometry/rect';
  import ConnectionLine from '../atoms/ConnectionLine.svelte';

  interface Props {
    /** Array of connections to render */
    connections: Connection[];
    /** Array of board items for anchor calculations */
    items: BoardItem[];
    /** Currently selected connection ID */
    selectedConnectionId: string | null;
    /** Callback when connection is selected */
    onSelectConnection: (id: string) => void;
    /** Callback when connection is double-clicked */
    onDoubleClickConnection?: (id: string) => void;
    /** Contextual styles */
    cx: ContextualClassNames;
    /** Field mode flag */
    fieldMode: boolean;
  }

  let {
    connections,
    items,
    selectedConnectionId,
    onSelectConnection,
    onDoubleClickConnection,
    cx,
    fieldMode,
  }: Props = $props();

  // ── Helpers ──
  /**
   * Get anchor point coordinates for a connection endpoint.
   * Returns the midpoint of the specified side of the item's bounding box.
   * Falls back to center if no anchor specified.
   */
  function getAnchorPoint(item: BoardItem, anchor: AnchorSide | undefined): { x: number; y: number } {
    const c = GeoRect.center(item);

    switch (anchor) {
      case 'T': return { x: c.x, y: item.y };
      case 'R': return { x: GeoRect.right(item), y: c.y };
      case 'B': return { x: c.x, y: GeoRect.bottom(item) };
      case 'L': return { x: item.x, y: c.y };
      default:  return c;
    }
  }

  // ── Derived ──
  // Pre-filter connections to only those with valid endpoints
  // and pre-compute anchor positions for rendering
  interface ResolvedConnection {
    conn: Connection;
    from: { x: number; y: number };
    to: { x: number; y: number };
    showArrow: boolean;
  }

  let resolvedConnections = $derived.by((): ResolvedConnection[] => {
    const result: ResolvedConnection[] = [];
    for (const conn of connections) {
      const fromItem = items.find(i => i.id === conn.fromId);
      const toItem = items.find(i => i.id === conn.toId);
      if (!fromItem || !toItem) continue;
      result.push({
        conn,
        from: getAnchorPoint(fromItem, conn.fromAnchor),
        to: getAnchorPoint(toItem, conn.toAnchor),
        showArrow: conn.type === 'sequence' || conn.type === 'requires' || conn.type === 'partOf',
      });
    }
    return result;
  });
</script>

<svg class="absolute inset-0 pointer-events-none" style="width: 100%; height: 100%;">
  {#each resolvedConnections as { conn, from, to, showArrow } (conn.id)}
    <ConnectionLine
      id={conn.id}
      {from}
      {to}
      type={conn.type}
      label={conn.label}
      selected={selectedConnectionId === conn.id}
      style={conn.style}
      color={conn.color}
      {showArrow}
      onSelect={onSelectConnection}
      onDoubleClick={onDoubleClickConnection}
      {cx}
      {fieldMode}
    />
  {/each}
</svg>
