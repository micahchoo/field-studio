<!--
  StructureTreeView.svelte — Main structure tree organism
  React source: StructureTreeView.tsx (281L)

  ARCHITECTURE:
  - Feature organism: has business logic via StructureTreeStore
  - Composes: VirtualTreeList, TreeSearchBar, StructureToolbar, EmptyStructure
  - Syncs external selection, handles keyboard shortcuts
  - Mobile responsive with adaptive indentation

  PROPS:
  - root: IIIFItem | null — IIIF tree root
  - onUpdate: (newRoot) => void — tree structure changed
  - onSelect: (id) => void — node selected
  - onOpen: (item) => void — node double-clicked (navigate)
  - selectedId: string | null — externally selected ID
  - containerHeight: number — virtual list height
  - fieldMode: boolean
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { IIIFItem } from '@/src/shared/types';
  import { StructureTreeStore } from '../../stores/structureTree.svelte';
  import { TreeSearchBar } from '../atoms';
  import type { DropPosition } from '../atoms/types';
  import { EmptyStructure, StructureToolbar, VirtualTreeList } from '../molecules';

  interface Props {
    root: IIIFItem | null;
    onUpdate?: (newRoot: IIIFItem) => void;
    onSelect?: (id: string) => void;
    onOpen?: (item: IIIFItem) => void;
    selectedId?: string | null;
    class?: string;
    containerHeight?: number;
    fieldMode?: boolean;
  }

  let {
    root,
    onUpdate,
    onSelect,
    onOpen,
    selectedId = null,
    class: className = '',
    containerHeight = 400,
    fieldMode = false,
  }: Props = $props();

  // ── Store ──
  const tree = new StructureTreeStore();

  // ── Build tree when root changes ──
  $effect(() => {
    if (root) {
      const state = buildSimpleState(root);
      tree.buildFromVault(state, root.id);
    }
  });

  // ── Sync external selection ──
  $effect(() => {
    if (selectedId && !tree.selectedIds.has(selectedId)) {
      tree.selectNode(selectedId);
    }
  });

  // ── Notify parent of selection changes ──
  $effect(() => {
    if (onSelect && tree.selectedIds.size === 1) {
      const [id] = tree.selectedIds;
      onSelect(id);
    }
  });

  // ── Keyboard shortcut: Ctrl/Cmd+F to focus search ──
  $effect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          '[aria-label="Search structure tree"]',
        );
        searchInput?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // ── Derived values ──
  const visibleNodes = $derived(tree.visibleNodes);
  const flattenedNodes = $derived(tree.flattenedNodes);
  const matchCount = $derived(tree.matchCount);
  const filterQuery = $derived(tree.filterQuery);
  const treeStats = $derived(tree.treeStats);

  // ── Handlers ──
  function handleSelect(id: string, additive: boolean) {
    tree.selectNode(id, { additive });
  }

  function handleDragStart(id: string) {
    tree.startDrag(id);
  }

  function handleDragEnd() {
    tree.endDrag();
  }

  function handleDrop(targetId: string, position?: DropPosition) {
    const draggingId = tree.draggingId;
    if (!draggingId) return;

    if (tree.canDrop(draggingId, targetId)) {
      const draggedNode = tree.findNode(draggingId);
      const targetNode = tree.findNode(targetId);

      if (draggedNode && targetNode && onUpdate && root) {
        // @migration: Implement actual tree move using vault operations
        console.debug(`Move ${draggedNode.type} to ${targetNode.type} position: ${position}`);
      }
    }

    tree.endDrag();
  }

  function handleDoubleClick(id: string) {
    const node = tree.findNode(id);
    if (node && onOpen) {
      onOpen(node as unknown as IIIFItem);
    }
  }

  // ── Build a simplified NormalizedState from an IIIFItem tree ──
  function buildSimpleState(
    item: IIIFItem,
  ): { entities: Record<string, Record<string, unknown>>; typeIndex: Record<string, string>; references: Record<string, string[]> } {
    const entities: Record<string, Record<string, unknown>> = {};
    const typeIndex: Record<string, string> = {};
    const references: Record<string, string[]> = {};

    function walk(node: IIIFItem) {
      const type = node.type || 'Unknown';
      if (!entities[type]) entities[type] = {};
      entities[type][node.id] = node;
      typeIndex[node.id] = type;

      const childIds: string[] = [];
      const children = (node.items ?? []) as IIIFItem[];
      for (const child of children) {
        childIds.push(child.id);
        walk(child);
      }
      references[node.id] = childIds;
    }

    walk(item);
    return { entities, typeIndex, references };
  }
</script>

{#if !root}
  <EmptyStructure class={className} />
{:else}
  <div
    class={cn(
      'flex flex-col h-full',
      'bg-nb-black',
      'border border-nb-black/20 overflow-hidden',
      'shadow-brutal-sm',
      className,
    )}
  >
    <!-- Search Bar -->
    <div class="p-4 border-b border-nb-black/20 bg-nb-black/30">
      <TreeSearchBar
        query={filterQuery}
        onQueryChange={(q) => tree.setFilterQuery(q)}
        {matchCount}
        totalCount={flattenedNodes.length}
      />
    </div>

    <!-- Toolbar: expand/collapse, selection info -->
    <StructureToolbar
      totalNodes={filterQuery ? matchCount : flattenedNodes.length}
      selectedCount={tree.selectedIds.size}
      onExpandAll={() => tree.expandAll()}
      onCollapseAll={() => tree.collapseAll()}
      onClearSelection={() => tree.clearSelection()}
      abstractionLevel={fieldMode ? 'advanced' : 'standard'}
    />

    <!-- Virtual Tree Content -->
    <VirtualTreeList
      nodes={visibleNodes}
      {containerHeight}
      onSelect={handleSelect}
      onToggleExpand={(id) => tree.toggleExpanded(id)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
      onDoubleClick={handleDoubleClick}
      class="flex-1"
    />

    <!-- Status bar -->
    {#if treeStats}
      <div
        class="px-4 py-2.5 border-t border-nb-black/20 bg-nb-black/80 text-sm text-nb-cream/50 flex items-center justify-between"
      >
        <span class="font-serif">
          {treeStats.totalNodes}
          {treeStats.totalNodes === 1 ? 'node' : 'nodes'}
        </span>
        {#if filterQuery}
          <span class="text-nb-orange font-medium">
            Showing {matchCount} of {flattenedNodes.length}
          </span>
        {/if}
      </div>
    {/if}
  </div>
{/if}
