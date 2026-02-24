<!--
  ArchivePane Molecule

  Right pane showing archive collection structure with drag-drop.
  Displays collections and allows organizing manifests into them.

  Architecture:
  - Per-node state managed via Maps/Sets in the parent scope
  - ArchiveCollectionNode rendered per collection
  - Drag-drop with IIIF Content State interop on drop
  - Inline rename with input element
-->
<script lang="ts">
  import type { SourceManifests } from '@/src/entities/collection/model/stagingService';
  import type { ArchiveLayout, ArchiveNode } from '@/src/features/staging/stores/stagingState.svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import { Icon } from '@/src/shared/ui/atoms';
  import { contentStateService } from '@/src/shared/services/contentState';
  import ArchivePaneHeader from '../atoms/ArchivePaneHeader.svelte';
  import ArchiveCollectionNode from '../atoms/ArchiveCollectionNode.svelte';

  interface ArchivePaneProps {
    archiveLayout: ArchiveLayout;
    sourceManifests: SourceManifests;
    onAddToCollection: (collectionId: string, manifestIds: string[]) => void;
    onRemoveFromCollection: (collectionId: string, manifestIds: string[]) => void;
    onCreateCollection: (name: string) => string;
    onRenameCollection: (collectionId: string, newName: string) => void;
    onDeleteCollection: (collectionId: string) => void;
    onFocus: () => void;
    isFocused: boolean;
    onContextMenu?: (e: MouseEvent, collectionId: string) => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    archiveLayout,
    sourceManifests,
    onAddToCollection,
    onRemoveFromCollection,
    onCreateCollection,
    onRenameCollection,
    onDeleteCollection,
    onFocus,
    isFocused,
    onContextMenu,
    cx,
    fieldMode: _fieldMode,
  }: ArchivePaneProps = $props();

  // --- Header state ---
  let showNewCollectionInput = $state(false);
  let newCollectionName = $state('');

  // --- New collection drop zone state ---
  let isNewCollectionDragOver = $state(false);

  // --- Per-node state ---
  let userCollapsedNodes = $state(new Set<string>());
  let expandedNodes = $derived.by(() => {
    const allIds = new Set<string>();
    for (const child of archiveLayout.root.children) {
      if (!userCollapsedNodes.has(child.id)) allIds.add(child.id);
    }
    return allIds;
  });
  let renamingNodeId = $state<string | null>(null);
  let dragOverNodeId = $state<string | null>(null);
  let renameText = $state('');

  // --- Header handlers ---
  function handleCreateCollection() {
    if (newCollectionName.trim()) {
      onCreateCollection(newCollectionName);
      newCollectionName = '';
      showNewCollectionInput = false;
    }
  }

  function handleCreateKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleCreateCollection();
    if (e.key === 'Escape') showNewCollectionInput = false;
  }

  // --- New collection drop zone ---
  function handleNewCollectionDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
    isNewCollectionDragOver = true;
  }

  function handleNewCollectionDragLeave(e: DragEvent) {
    const currentTarget = e.currentTarget as HTMLElement;
    if (currentTarget.contains(e.relatedTarget as Node)) return;
    isNewCollectionDragOver = false;
  }

  function handleNewCollectionDrop(e: DragEvent) {
    e.preventDefault();
    isNewCollectionDragOver = false;
    const ids = extractManifestIds(e);
    if (ids && ids.length > 0) {
      const newId = onCreateCollection('New Collection');
      onAddToCollection(newId, ids);
    }
  }

  // --- Shared helpers ---
  function extractManifestIds(e: DragEvent): string[] | null {
    const raw = e.dataTransfer!.getData('application/iiif-manifest-ids');
    if (raw) {
      try {
        const ids = JSON.parse(raw) as string[];
        if (ids.length > 0) return ids;
      } catch { /* ignore */ }
    }
    try {
      const contentState = contentStateService.handleDrop(e.dataTransfer!);
      if (contentState?.manifestId) return [contentState.manifestId];
    } catch { /* ignore */ }
    return null;
  }

  function handleNodeDragOver(e: DragEvent, nodeId: string) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
    dragOverNodeId = nodeId;
  }

  function handleNodeDragLeave(e: DragEvent) {
    const currentTarget = e.currentTarget as HTMLElement;
    if (currentTarget.contains(e.relatedTarget as Node)) return;
    dragOverNodeId = null;
  }

  function handleNodeDrop(e: DragEvent, nodeId: string) {
    e.preventDefault();
    dragOverNodeId = null;
    const ids = extractManifestIds(e);
    if (ids) onAddToCollection(nodeId, ids);
  }

  function handleToggleExpand(nodeId: string) {
    const next = new Set(userCollapsedNodes);
    if (expandedNodes.has(nodeId)) next.add(nodeId); else next.delete(nodeId);
    userCollapsedNodes = next;
  }

  function startRenaming(nodeId: string, currentName: string) {
    renamingNodeId = nodeId;
    renameText = currentName;
  }

  function handleRenameSubmit(nodeId: string) {
    if (renameText.trim()) { onRenameCollection(nodeId, renameText); renamingNodeId = null; }
  }

  function handleRenameKeyDown(e: KeyboardEvent, nodeId: string) {
    if (e.key === 'Enter') handleRenameSubmit(nodeId);
    if (e.key === 'Escape') renamingNodeId = null;
  }
</script>

<div class={cn(
  'h-full flex flex-col bg-nb-cream/30 border border-nb-black/20 overflow-hidden',
  isFocused && 'ring-2 ring-nb-blue',
)}>
  <ArchivePaneHeader
    bind:showNewCollectionInput
    bind:newCollectionName
    onToggleInput={() => { showNewCollectionInput = !showNewCollectionInput; }}
    onCreate={handleCreateCollection}
    onCreateKeyDown={handleCreateKeyDown}
    {onFocus}
  />

  <div class="flex-1 overflow-y-auto">
    {#if archiveLayout.root.children.length === 0}
      <div class="p-6 text-center text-sm text-nb-black/50">
        <Icon name="inbox" class="text-4xl mb-2 block opacity-50" />
        <p>No collections yet</p>
        <p class="text-xs mt-1">Create one using the + button above, or drag items here</p>
      </div>
    {:else}
      {#each archiveLayout.root.children as collection (collection.id)}
        <ArchiveCollectionNode
          node={collection}
          {sourceManifests}
          isExpanded={expandedNodes.has(collection.id)}
          isRenaming={renamingNodeId === collection.id}
          isDragOver={dragOverNodeId === collection.id}
          bind:renameText
          {onFocus}
          onToggleExpand={handleToggleExpand}
          onStartRenaming={startRenaming}
          onRenameSubmit={handleRenameSubmit}
          onRenameKeyDown={handleRenameKeyDown}
          onDelete={onDeleteCollection}
          {onRemoveFromCollection}
          onDragOver={handleNodeDragOver}
          onDragLeave={handleNodeDragLeave}
          onDrop={handleNodeDrop}
          {onContextMenu}
        />
      {/each}
    {/if}

    <div
      class={cn(
        'm-2 p-4 border-2 border-dashed text-center text-xs transition-all duration-150',
        isNewCollectionDragOver
          ? 'border-nb-blue bg-nb-blue/10 text-nb-blue font-medium scale-[1.02]'
          : 'border-nb-black/15 text-nb-black/30',
      )}
      ondragover={handleNewCollectionDragOver}
      ondragleave={handleNewCollectionDragLeave}
      ondrop={handleNewCollectionDrop}
      role="listitem"
    >
      <Icon
        name="add"
        class={cn('text-lg mb-1 block transition-colors', isNewCollectionDragOver ? 'text-nb-blue' : 'text-nb-black/20')}
      />
      {isNewCollectionDragOver ? 'Drop to create new collection' : 'Drop here for new collection'}
    </div>
  </div>

  <div class="p-2 border-t border-nb-black/20 bg-nb-cream/40 text-xs text-nb-black/50">
    <div class="flex justify-between">
      <span>{archiveLayout.root.children.length} collection{archiveLayout.root.children.length !== 1 ? 's' : ''}</span>
      <span>{sourceManifests.manifests.length} manifest{sourceManifests.manifests.length !== 1 ? 's' : ''}</span>
    </div>
  </div>
</div>
