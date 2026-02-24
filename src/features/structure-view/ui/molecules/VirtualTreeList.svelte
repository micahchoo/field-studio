<!--
  VirtualTreeList.svelte — Virtual scrolling for large tree structures
  React source: VirtualTreeList.tsx (290L)
  Handles 1000+ nodes at 60fps with keyboard navigation
  Local state: scrollTop
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import TreeNodeItem from './TreeNodeItem.svelte';
  import type { StructureNode } from '../../stores/structureTree.svelte';
  import type { DropPosition } from '../atoms/types';

  interface Props {
    nodes: StructureNode[];
    containerHeight: number;
    rowHeight?: number;
    overscan?: number;
    onSelect: (id: string, additive: boolean) => void;
    onToggleExpand: (id: string) => void;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    onDrop: (targetId: string, position?: DropPosition) => void;
    onDoubleClick?: (id: string) => void;
    class?: string;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    nodes,
    containerHeight,
    rowHeight = 36,
    overscan = 5,
    onSelect,
    onToggleExpand,
    onDragStart,
    onDragEnd,
    onDrop,
    onDoubleClick,
    class: className = '',
    cx = {} as ContextualClassNames,
    fieldMode = false,
  }: Props = $props();

  let scrollTop = $state(0);
  let scrollContainer: HTMLDivElement | undefined = $state();

  // Total content height
  const totalHeight = $derived(nodes.length * rowHeight);

  // Visible range with overscan
  const startIndex = $derived(Math.max(0, Math.floor(scrollTop / rowHeight) - overscan));
  const endIndex = $derived(
    Math.min(nodes.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan)
  );

  // Virtual nodes with absolute positioning styles
  const virtualNodes = $derived(
    nodes.slice(startIndex, endIndex).map((node, i) => ({
      ...node,
      virtualIndex: startIndex + i,
      style: `position: absolute; top: ${(startIndex + i) * rowHeight}px; left: 0; right: 0; height: ${rowHeight}px;`,
    }))
  );

  // Currently selected index
  const selectedIndex = $derived(nodes.findIndex(n => n.isSelected));

  function handleScroll(e: Event) {
    const target = e.currentTarget as HTMLDivElement;
    scrollTop = target.scrollTop;
  }

  function handleDoubleClick(id: string) {
    onDoubleClick?.(id);
  }

  function handleKeyDown(e: KeyboardEvent) {
    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const currentNode = nodes[currentIndex];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < nodes.length - 1) {
          const nextNode = nodes[currentIndex + 1];
          onSelect(nextNode.id, false);
          // Scroll into view
          if (scrollContainer) {
            const nextTop = (currentIndex + 1) * rowHeight;
            const containerBottom = scrollTop + containerHeight;
            if (nextTop + rowHeight > containerBottom) {
              scrollContainer.scrollTop = nextTop - containerHeight + rowHeight;
            }
          }
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          const prevNode = nodes[currentIndex - 1];
          onSelect(prevNode.id, false);
          if (scrollContainer) {
            const prevTop = (currentIndex - 1) * rowHeight;
            if (prevTop < scrollTop) {
              scrollContainer.scrollTop = prevTop;
            }
          }
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (currentNode && currentNode.childCount > 0 && !currentNode.isExpanded) {
          onToggleExpand(currentNode.id);
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (currentNode) {
          if (currentNode.isExpanded) {
            onToggleExpand(currentNode.id);
          } else if (currentNode.depth > 0 && currentNode.parentId) {
            const parentIndex = nodes.findIndex(n => n.id === currentNode.parentId);
            if (parentIndex >= 0) {
              onSelect(nodes[parentIndex].id, false);
            }
          }
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentNode && currentNode.childCount > 0) {
          onToggleExpand(currentNode.id);
        }
        break;

      case 'Home':
        e.preventDefault();
        if (nodes.length > 0) {
          onSelect(nodes[0].id, false);
          if (scrollContainer) {
            scrollContainer.scrollTop = 0;
          }
        }
        break;

      case 'End':
        e.preventDefault();
        if (nodes.length > 0) {
          onSelect(nodes[nodes.length - 1].id, false);
          if (scrollContainer) {
            scrollContainer.scrollTop = totalHeight;
          }
        }
        break;

      case '*':
        e.preventDefault();
        if (currentNode) {
          const siblings = nodes.filter(
            n => n.parentId === currentNode.parentId && n.childCount > 0
          );
          for (const n of siblings) {
            if (!n.isExpanded) onToggleExpand(n.id);
          }
        }
        break;
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={scrollContainer}
  onscroll={handleScroll}
  onkeydown={handleKeyDown}
  class={cn('overflow-y-auto overflow-x-hidden', className)}
  style="height: {containerHeight}px;"
  role="tree"
  aria-label="Structure tree"
  aria-activedescendant={nodes.find(n => n.isSelected)?.id}
  tabindex="0"
>
  <div style="height: {totalHeight}px; position: relative;">
    {#each virtualNodes as vNode (vNode.id)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        style={vNode.style}
        ondblclick={() => handleDoubleClick(vNode.id)}
      >
        <TreeNodeItem
          node={vNode}
          {onSelect}
          onToggleExpand={onToggleExpand}
          {onDragStart}
          {onDragEnd}
          {onDrop}
        />
      </div>
    {/each}
  </div>

  {#if nodes.length === 0}
    <div class="flex flex-col items-center justify-center p-8 text-center text-nb-black/50">
      <p class="text-sm font-medium">No items</p>
      <p class="text-xs mt-1">No nodes match the current view</p>
    </div>
  {/if}
</div>
