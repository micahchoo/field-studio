<!--
  TreeNodeItem.svelte — Single tree row with drag-drop
  React source: TreeNodeItem.tsx (195L)
  Composes: ExpandButton, StructureNodeIcon, NodeLabel, DropIndicator
  Local state: localDropPosition, isDraggingOver
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import ExpandButton from '../atoms/ExpandButton.svelte';
  import StructureNodeIcon from '../atoms/StructureNodeIcon.svelte';
  import NodeLabel from '../atoms/NodeLabel.svelte';
  import DropIndicator from '../atoms/DropIndicator.svelte';
  import type { DropPosition } from '../atoms/types';
  import type { StructureNode } from '../../stores/structureTree.svelte';

  interface Props {
    node: StructureNode;
    onSelect: (id: string, additive: boolean) => void;
    onToggleExpand: (id: string) => void;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    onDrop: (targetId: string, position?: DropPosition) => void;
    style?: string;
    canDrop?: boolean;
    dropPosition?: DropPosition | null;
    isDropOver?: boolean;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    node,
    onSelect,
    onToggleExpand,
    onDragStart,
    onDragEnd,
    onDrop,
    style = '',
    canDrop = false,
    dropPosition = null,
    isDropOver = false,
    cx = {} as ContextualClassNames,
    fieldMode = false,
  }: Props = $props();

  let localDropPosition = $state<DropPosition | null>(null);
  let isDraggingOver = $state(false);

  function calculateDropPosition(e: DragEvent): DropPosition {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    if (y < height * 0.25) return 'before';
    if (y > height * 0.75) return 'after';
    return 'inside';
  }

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    onSelect(node.id, e.metaKey || e.ctrlKey);
  }

  function handleExpandClick(e: MouseEvent) {
    e.stopPropagation();
    onToggleExpand(node.id);
  }

  function handleDragStart(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(node.id);
  }

  function handleDragEnd() {
    onDragEnd();
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = canDrop ? 'move' : 'none';
    }
    if (canDrop) {
      localDropPosition = calculateDropPosition(e);
      isDraggingOver = true;
    }
  }

  function handleDragLeave() {
    isDraggingOver = false;
    localDropPosition = null;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const position = localDropPosition || 'inside';
    onDrop(node.id, position);
    isDraggingOver = false;
    localDropPosition = null;
  }

  const indentWidth = $derived(node.depth * 16);
  const effectiveDropPosition = $derived(dropPosition || localDropPosition);
  const effectiveIsDropOver = $derived(isDropOver || isDraggingOver);

  const typeColorClass = $derived(
    node.type === 'Collection' ? 'text-nb-blue' :
    node.type === 'Manifest' ? 'text-nb-green' :
    node.type === 'Canvas' ? 'text-nb-purple' :
    node.type === 'Range' ? 'text-nb-orange' : ''
  );
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  role="treeitem"
  aria-level={node.depth + 1}
  aria-expanded={node.childCount > 0 ? node.isExpanded : undefined}
  aria-selected={node.isSelected}
  tabindex={node.isSelected ? 0 : -1}
  {style}
  class={cn(
    'relative flex items-center gap-1 px-2 py-1.5 cursor-pointer',
    'border-b border-nb-black/10',
    'hover:bg-nb-cream',
    'transition-nb',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nb-blue focus-visible:ring-inset',
    node.isSelected && 'bg-nb-blue/10',
    effectiveIsDropOver && canDrop && 'bg-nb-blue/10',
  )}
  onclick={handleClick}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e as unknown as MouseEvent); }}
  draggable="true"
  ondragstart={handleDragStart}
  ondragend={handleDragEnd}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  {#if effectiveIsDropOver && canDrop && effectiveDropPosition}
    <DropIndicator position={effectiveDropPosition} isValid={canDrop} />
  {/if}

  <span style="width: {indentWidth}px" class="flex-shrink-0"></span>

  <ExpandButton
    isExpanded={node.isExpanded}
    onclick={handleExpandClick}
    hasChildren={node.childCount > 0}
  />

  <StructureNodeIcon
    type={node.type}
    class={cn('flex-shrink-0 ml-1', typeColorClass)}
  />

  <NodeLabel
    label={node.label}
    type={node.type}
    isSelected={node.isSelected}
    isDragging={false}
    class="flex-1 ml-2"
  />

  {#if node.childCount > 0}
    <span class="text-xs text-nb-black/40 px-1.5 py-0.5 bg-nb-cream">
      {node.childCount}
    </span>
  {/if}
</div>
