<!--
  BoardDesignPanel.svelte -- Inspector panel for selected board node (Molecule)
  =============================================================================
  React source: src/features/board-design/ui/molecules/BoardDesignPanel.tsx (136L)

  ARCHITECTURE NOTES:
  - Stateless molecule: all data from props, no local state
  - Shows position, size, connections list, and action buttons
  - Returns placeholder text when boardItem is null
  - Rule 2.D: Tailwind classes in static class maps, not interpolated
  - Rule 5.D: receives cx + fieldMode from parent (FSD molecule contract)
  - Composes: ConnectionTypeBadge atom, Button, Icon atoms
  - Filters connections for current item via $derived
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { BoardItem, Connection } from '../../model';
  import { getConnectionLabel } from '../../model';
  import ConnectionTypeBadge from '../atoms/ConnectionTypeBadge.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    /** Currently selected board item (null when nothing selected) */
    boardItem: BoardItem | null;
    /** All board connections */
    connections: Connection[];
    /** All board items (for resolving connection target labels) */
    items: BoardItem[];
    /** Open item in viewer */
    onOpenViewer?: () => void;
    /** Remove item from board */
    onRemove?: () => void;
    /** Advanced mode shows extra detail */
    isAdvanced?: boolean;
    /** Contextual styles */
    cx: ContextualClassNames;
    /** Field mode flag */
    fieldMode: boolean;
  }

  let {
    boardItem,
    connections,
    items,
    onOpenViewer,
    onRemove,
    isAdvanced = false,
    cx,
    fieldMode,
  }: Props = $props();

  // ── Derived ──
  // Filter connections attached to the selected item
  let itemConnections = $derived(
    boardItem
      ? connections.filter(c => c.fromId === boardItem.id || c.toId === boardItem.id)
      : []
  );

  // ── Helpers ──
  // Resolve the label of the other end of a connection
  function getTargetLabel(conn: Connection): string {
    if (!boardItem) return 'Unknown';
    const targetId = conn.fromId === boardItem.id ? conn.toId : conn.fromId;
    const target = items.find(i => i.id === targetId);
    return target?.label || 'Unknown';
  }

  // Static Tailwind class maps (Rule 2.D -- no interpolation)
  const SECTION_BORDER = {
    field: 'mb-4 pb-4 border-b border-nb-black/30',
    normal: 'mb-4 pb-4 border-b border-nb-black/10',
  } as const;

  const LABEL_COLOR = {
    field: 'text-xs font-bold uppercase tracking-wider mb-2 text-nb-black/50',
    normal: 'text-xs font-bold uppercase tracking-wider mb-2 text-nb-black/40',
  } as const;

  const VALUE_COLOR = {
    field: 'text-sm font-mono text-nb-black/20',
    normal: 'text-sm font-mono text-nb-black/70',
  } as const;

  let sectionClass = $derived(fieldMode ? SECTION_BORDER.field : SECTION_BORDER.normal);
  let labelClass = $derived(fieldMode ? LABEL_COLOR.field : LABEL_COLOR.normal);
  let valueClass = $derived(fieldMode ? VALUE_COLOR.field : VALUE_COLOR.normal);
</script>

{#if !boardItem}
  <div class="p-4 text-sm {cx.textMuted || 'text-nb-black/40'}">
    Select a board item to see design properties.
  </div>
{:else}
  <div class="p-4 space-y-1">
    <!-- Position section -->
    <div class={sectionClass}>
      <p class={labelClass}>Position</p>
      <div class="flex items-center gap-4">
        <span class={valueClass}>X: {Math.round(boardItem.x)}</span>
        <span class={valueClass}>Y: {Math.round(boardItem.y)}</span>
      </div>
    </div>

    <!-- Size section -->
    <div class={sectionClass}>
      <p class={labelClass}>Size</p>
      <span class={valueClass}>{Math.round(boardItem.w)} &times; {Math.round(boardItem.h)}</span>
    </div>

    <!-- Connections section -->
    <div class={sectionClass}>
      <p class={labelClass}>Connections ({itemConnections.length})</p>
      {#if itemConnections.length === 0}
        <p class="text-xs {cx.textMuted || 'text-nb-black/40'}">No connections</p>
      {:else}
        <div class="space-y-2">
          {#each itemConnections as conn (conn.id)}
            {@const isOutgoing = conn.fromId === boardItem.id}
            <div class="flex items-center gap-2 text-xs">
              <Icon name={isOutgoing ? 'arrow_forward' : 'arrow_back'} class="text-sm" />
              <ConnectionTypeBadge type={conn.type} {cx} {fieldMode} />
              <span class={cx.text}>{getTargetLabel(conn)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Action buttons -->
    <div class="flex flex-col gap-2">
      {#if onOpenViewer}
        <Button variant="secondary" size="sm" onclick={onOpenViewer}>
          {#snippet icon()}<Icon name="visibility" />{/snippet}
          Open in Viewer
        </Button>
      {/if}
      {#if onRemove}
        <Button variant="danger" size="sm" onclick={onRemove}>
          {#snippet icon()}<Icon name="delete" />{/snippet}
          Remove from Board
        </Button>
      {/if}
    </div>
  </div>
{/if}
