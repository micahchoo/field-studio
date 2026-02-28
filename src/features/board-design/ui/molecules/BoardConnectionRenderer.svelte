<!--
  BoardConnectionRenderer.svelte — SVG connection line rendering
  ==============================================================
  Extracted from BoardView organism. Renders all connection lines
  between board items as SVG paths, plus the in-progress connection
  line when the user is actively connecting.

  FSD Layer: features/board-design/ui/molecules
-->
<script lang="ts">
  import type { BoardItem, BoardConnection } from '@/src/features/board-design/stores/boardVault.svelte';
  import * as GeoRect from '@/src/shared/lib/geometry/rect';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    connections: BoardConnection[];
    connectingFrom: string | null;
    mousePosition: { x: number; y: number };
    isAdvanced: boolean;
    fieldMode?: boolean;
    editingConnection: string | null;
    findItem: (id: string) => BoardItem | undefined;
    onEditConnection: (id: string) => void;
    cx?: Partial<ContextualClassNames>;
  }

  let {
    connections,
    connectingFrom,
    mousePosition,
    isAdvanced,
    fieldMode = false,
    editingConnection,
    findItem,
    onEditConnection,
    cx,
  }: Props = $props();

  function connectionPath(fromItem: BoardItem | undefined, toItem: BoardItem | undefined): string {
    if (!fromItem || !toItem) return '';
    const from = GeoRect.center(fromItem);
    const to = GeoRect.center(toItem);
    const midX = (from.x + to.x) / 2;
    return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  }

  function pendingConnectionPath(fromItem: BoardItem | undefined): string {
    if (!fromItem) return '';
    const from = GeoRect.center(fromItem);
    const { x: x2, y: y2 } = mousePosition;
    const midX = (from.x + x2) / 2;
    return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${y2}, ${x2} ${y2}`;
  }

  function connectionStrokeColor(type: BoardConnection['type']): string {
    if (fieldMode) {
      return type === 'sequence' ? '#D4A600' : '#B8860B';
    }
    switch (type) {
      case 'sequence': return '#0055FF';
      case 'reference': return '#00CC66';
      case 'supplement': return '#FF9900';
      case 'custom': return '#9B59B6';
      default: return '#666';
    }
  }
</script>

<svg
  class="absolute pointer-events-none"
  style="left: 0; top: 0; width: 10000px; height: 10000px; overflow: visible;"
>
  {#each connections as conn (conn.id)}
    {@const fromItem = findItem(conn.fromId)}
    {@const toItem = findItem(conn.toId)}
    {#if fromItem && toItem}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <g
        class="pointer-events-auto cursor-pointer"
        role="img"
        aria-label="{conn.type} connection from {fromItem.label ?? conn.fromId} to {toItem.label ?? conn.toId}"
      >
        <path
          d={connectionPath(fromItem, toItem)}
          fill="none"
          stroke="transparent"
          stroke-width="12"
          ondblclick={() => { onEditConnection(conn.id); }}
        />
        <path
          d={connectionPath(fromItem, toItem)}
          fill="none"
          stroke={connectionStrokeColor(conn.type)}
          stroke-width={editingConnection === conn.id ? 3 : 2}
          stroke-dasharray={conn.type === 'reference' ? '6 3' : 'none'}
          opacity={editingConnection === conn.id ? 1 : 0.7}
        />
        {#if isAdvanced}
          {@const fc = GeoRect.center(fromItem)}
          {@const tc = GeoRect.center(toItem)}
          {@const mx = (fc.x + tc.x) / 2}
          {@const my = (fc.y + tc.y) / 2}
          <text
            x={mx}
            y={my - 8}
            text-anchor="middle"
            fill={connectionStrokeColor(conn.type)}
            font-size="10"
            font-family="monospace"
          >
            {conn.label || conn.type}
          </text>
        {/if}
      </g>
    {/if}
  {/each}

  {#if connectingFrom}
    {@const fromItem = findItem(connectingFrom)}
    {#if fromItem}
      <path
        d={pendingConnectionPath(fromItem)}
        fill="none"
        stroke={fieldMode ? '#D4A600' : '#0055FF'}
        stroke-width="2"
        stroke-dasharray="8 4"
        opacity="0.6"
      />
    {/if}
  {/if}
</svg>
