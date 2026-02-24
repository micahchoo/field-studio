<!--
  ArchiveCollectionNode Atom
  ============================
  Renders a single collection node in the archive pane tree.
  Supports expand/collapse, rename, delete, drag-drop.
  Extracted from ArchivePane molecule.
-->
<script lang="ts">
  import type { ArchiveNode } from '@/src/features/staging/stores/stagingState.svelte';
  import type { SourceManifests } from '@/src/entities/collection/model/stagingService';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';

  interface Props {
    node: ArchiveNode;
    sourceManifests: SourceManifests;
    isExpanded: boolean;
    isRenaming: boolean;
    isDragOver: boolean;
    renameText: string;
    onFocus: () => void;
    onToggleExpand: (nodeId: string) => void;
    onStartRenaming: (nodeId: string, currentName: string) => void;
    onRenameSubmit: (nodeId: string) => void;
    onRenameKeyDown: (e: KeyboardEvent, nodeId: string) => void;
    onDelete: (nodeId: string) => void;
    onRemoveFromCollection: (collectionId: string, manifestIds: string[]) => void;
    onDragOver: (e: DragEvent, nodeId: string) => void;
    onDragLeave: (e: DragEvent) => void;
    onDrop: (e: DragEvent, nodeId: string) => void;
    onContextMenu?: (e: MouseEvent, collectionId: string) => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    node,
    sourceManifests,
    isExpanded,
    isRenaming,
    isDragOver,
    renameText = $bindable(),
    onFocus,
    onToggleExpand,
    onStartRenaming,
    onRenameSubmit,
    onRenameKeyDown,
    onDelete,
    onRemoveFromCollection,
    onDragOver,
    onDragLeave,
    onDrop,
    onContextMenu,
  }: Props = $props();

  const manifestCount = $derived(node.manifestIds?.length || 0);
</script>

<div
  class={cn(
    'border-b transition-all duration-150',
    isDragOver ? 'border-2 border-dashed border-nb-blue bg-nb-blue/5' : 'border-nb-black/10',
  )}
  onclick={onFocus}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus(); } }}
  ondragover={(e) => onDragOver(e, node.id)}
  ondragleave={onDragLeave}
  ondrop={(e) => onDrop(e, node.id)}
  role="treeitem"
  aria-selected={false}
  tabindex="0"
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flex items-center gap-2 p-2 hover:bg-nb-cream cursor-pointer group"
    oncontextmenu={(e) => { e.preventDefault(); onContextMenu?.(e, node.id); }}
  >
    <Button variant="ghost" size="bare" onclick={() => onToggleExpand(node.id)} class="p-0.5 hover:bg-nb-cream rounded">
      <Icon name={isExpanded ? 'expand_more' : 'chevron_right'} class="text-base" />
    </Button>

    <Icon name="folder" class="text-base text-nb-blue" />

    {#if isRenaming}
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        bind:value={renameText}
        onblur={() => onRenameSubmit(node.id)}
        onkeydown={(e) => onRenameKeyDown(e, node.id)}
        class="flex-1 px-1 py-0.5 text-sm border border-nb-black/20 rounded"
        autofocus
        onclick={(e) => e.stopPropagation()}
      />
    {:else}
      <span class="flex-1 text-sm font-medium text-nb-black/80">{node.name}</span>
      <span class="text-xs text-nb-black/50 px-2 py-0.5 bg-nb-cream rounded">{manifestCount}</span>
    {/if}

    <div class="hidden group-hover:flex gap-1">
      <Button variant="ghost" size="bare"
        onclick={(e) => { e.stopPropagation(); onStartRenaming(node.id, node.name); }}
        class="p-0.5 hover:bg-nb-cream text-nb-black/60 text-xs" title="Rename"
      >
        <Icon name="edit" class="text-sm" />
      </Button>
      <Button variant="ghost" size="bare"
        onclick={(e) => { e.stopPropagation(); onDelete(node.id); }}
        class="p-0.5 hover:bg-nb-red/40 text-nb-red text-xs" title="Delete"
      >
        <Icon name="delete" class="text-sm" />
      </Button>
    </div>
  </div>

  {#if isExpanded && node.manifestIds && node.manifestIds.length > 0}
    <div class="bg-nb-white border-l border-nb-black/20 ml-4">
      {#each node.manifestIds as manifestId (manifestId)}
        {@const manifest = sourceManifests.manifests.find((m) => m.id === manifestId)}
        {#if manifest}
          <div class="flex items-center gap-2 p-2 pl-6 hover:bg-nb-cream text-xs text-nb-black/80 group">
            <Icon name="description" class="text-sm text-nb-black/40" />
            <span class="flex-1 truncate">{manifest.name}</span>
            <Button variant="ghost" size="bare"
              onclick={(e) => { e.stopPropagation(); onRemoveFromCollection(node.id, [manifestId]); }}
              class="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-nb-red/40 text-nb-red" title="Remove from collection"
            >
              <Icon name="close" class="text-sm" />
            </Button>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  {#if isExpanded && (!node.manifestIds || node.manifestIds.length === 0)}
    <div class={cn(
      'p-3 pl-10 text-xs italic',
      isDragOver ? 'text-nb-blue font-medium' : 'text-nb-black/40',
    )}>
      {isDragOver ? 'Drop here to add' : 'No manifests. Drag from left pane to add.'}
    </div>
  {/if}
</div>
