<!--
  ArchivePane Molecule

  Right pane showing archive collection structure with drag-drop.
  Displays collections and allows organizing manifests into them.

  Ported from: src/features/staging/ui/molecules/ArchivePane.tsx (369 lines)

  Architecture:
  - Per-node state managed via Maps/Sets in the parent scope
  - CollectionNode rendered as {#snippet} with state lookups
  - Drag-drop with IIIF Content State interop on drop
  - Inline rename with input element
-->
<script lang="ts">
  import type { SourceManifests } from '@/src/entities/collection/model/stagingService';
  import type { ArchiveLayout, ArchiveNode } from '@/src/features/staging/stores/stagingState.svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import { contentStateService } from '@/src/shared/services/contentState';

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

  // --- Per-node state (managed via Maps/Sets) ---
  // All collection nodes start expanded; user can toggle individual nodes
  let userCollapsedNodes = $state(new Set<string>());
  let expandedNodes = $derived.by(() => {
    const allIds = new Set<string>();
    for (const child of archiveLayout.root.children) {
      if (!userCollapsedNodes.has(child.id)) {
        allIds.add(child.id);
      }
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

  // --- New collection drop zone handlers ---

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
    const raw = e.dataTransfer!.getData('application/iiif-manifest-ids');
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as string[];
      if (ids.length > 0) {
        const newId = onCreateCollection('New Collection');
        onAddToCollection(newId, ids);
      }
    } catch {
      /* ignore malformed data */
    }
  }

  // --- CollectionNode helpers ---

  function extractManifestIds(e: DragEvent): string[] | null {
    // Try application/iiif-manifest-ids first (internal drag)
    const raw = e.dataTransfer!.getData('application/iiif-manifest-ids');
    if (raw) {
      try {
        const ids = JSON.parse(raw) as string[];
        if (ids.length > 0) return ids;
      } catch {
        /* ignore malformed data */
      }
    }

    // Fallback: try IIIF Content State (external drag interop)
    try {
      const contentState = contentStateService.handleDrop(e.dataTransfer!);
      if (contentState?.manifestId) {
        return [contentState.manifestId];
      }
    } catch {
      /* ignore */
    }

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
    if (ids) {
      onAddToCollection(nodeId, ids);
    }
  }

  function handleToggleExpand(nodeId: string) {
    const next = new Set(userCollapsedNodes);
    if (expandedNodes.has(nodeId)) {
      // Currently expanded → collapse by adding to userCollapsedNodes
      next.add(nodeId);
    } else {
      // Currently collapsed → expand by removing from userCollapsedNodes
      next.delete(nodeId);
    }
    userCollapsedNodes = next;
  }

  function startRenaming(nodeId: string, currentName: string) {
    renamingNodeId = nodeId;
    renameText = currentName;
  }

  function handleRenameSubmit(nodeId: string) {
    if (renameText.trim()) {
      onRenameCollection(nodeId, renameText);
      renamingNodeId = null;
    }
  }

  function handleRenameKeyDown(e: KeyboardEvent, nodeId: string) {
    if (e.key === 'Enter') handleRenameSubmit(nodeId);
    if (e.key === 'Escape') renamingNodeId = null;
  }
</script>

{#snippet collectionNode(node: ArchiveNode)}
  {@const isExpanded = expandedNodes.has(node.id)}
  {@const isRenaming = renamingNodeId === node.id}
  {@const isDragOver = dragOverNodeId === node.id}
  {@const manifestCount = node.manifestIds?.length || 0}

  <div
    class={cn(
      'border-b transition-all duration-150',
      isDragOver ? 'border-2 border-dashed border-nb-blue bg-nb-blue/5' : 'border-nb-black/10',
    )}
    onclick={onFocus}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus(); } }}
    ondragover={(e) => handleNodeDragOver(e, node.id)}
    ondragleave={handleNodeDragLeave}
    ondrop={(e) => handleNodeDrop(e, node.id)}
    role="treeitem"
    aria-selected={false}
    tabindex="0"
  >
    <!-- Collection header -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex items-center gap-2 p-2 hover:bg-nb-cream cursor-pointer group"
      oncontextmenu={(e) => { e.preventDefault(); onContextMenu?.(e, node.id); }}
    >
      <Button
        variant="ghost"
        size="bare"
        onclick={() => handleToggleExpand(node.id)}
        class="p-0.5 hover:bg-nb-cream rounded"
      >
        <Icon
          name={isExpanded ? 'expand_more' : 'chevron_right'}
          class="text-base"
        />
      </Button>

      <Icon name="folder" class="text-base text-nb-blue" />

      {#if isRenaming}
        <!-- svelte-ignore a11y_autofocus -->
        <input
          type="text"
          bind:value={renameText}
          onblur={() => handleRenameSubmit(node.id)}
          onkeydown={(e) => handleRenameKeyDown(e, node.id)}
          class="flex-1 px-1 py-0.5 text-sm border border-nb-black/20 rounded"
          autofocus
          onclick={(e) => e.stopPropagation()}
        />
      {:else}
        <span class="flex-1 text-sm font-medium text-nb-black/80">
          {node.name}
        </span>
        <span class="text-xs text-nb-black/50 px-2 py-0.5 bg-nb-cream rounded">
          {manifestCount}
        </span>
      {/if}

      <!-- Actions (visible on hover) -->
      <div class="hidden group-hover:flex gap-1">
        <Button
          variant="ghost"
          size="bare"
          onclick={(e) => {
            e.stopPropagation();
            startRenaming(node.id, node.name);
          }}
          class="p-0.5 hover:bg-nb-cream text-nb-black/60 text-xs"
          title="Rename"
        >
          <Icon name="edit" class="text-sm" />
        </Button>
        <Button
          variant="ghost"
          size="bare"
          onclick={(e) => {
            e.stopPropagation();
            onDeleteCollection(node.id);
          }}
          class="p-0.5 hover:bg-nb-red/40 text-nb-red text-xs"
          title="Delete"
        >
          <Icon name="delete" class="text-sm" />
        </Button>
      </div>
    </div>

    <!-- Manifests in collection -->
    {#if isExpanded && node.manifestIds && node.manifestIds.length > 0}
      <div class="bg-nb-white border-l border-nb-black/20 ml-4">
        {#each node.manifestIds as manifestId (manifestId)}
          {@const manifest = sourceManifests.manifests.find((m) => m.id === manifestId)}
          {#if manifest}
            <div
              class="flex items-center gap-2 p-2 pl-6 hover:bg-nb-cream text-xs text-nb-black/80 group"
            >
              <Icon name="description" class="text-sm text-nb-black/40" />
              <span class="flex-1 truncate">{manifest.name}</span>
              <Button
                variant="ghost"
                size="bare"
                onclick={(e) => {
                  e.stopPropagation();
                  onRemoveFromCollection(node.id, [manifestId]);
                }}
                class="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-nb-red/40 text-nb-red"
                title="Remove from collection"
              >
                <Icon name="close" class="text-sm" />
              </Button>
            </div>
          {/if}
        {/each}
      </div>
    {/if}

    <!-- Empty state -->
    {#if isExpanded && (!node.manifestIds || node.manifestIds.length === 0)}
      <div class={cn(
        'p-3 pl-10 text-xs italic',
        isDragOver ? 'text-nb-blue font-medium' : 'text-nb-black/40',
      )}>
        {isDragOver ? 'Drop here to add' : 'No manifests. Drag from left pane to add.'}
      </div>
    {/if}
  </div>
{/snippet}

<div
  class={cn(
    'h-full flex flex-col bg-nb-cream/30 border border-nb-black/20 overflow-hidden',
    isFocused && 'ring-2 ring-nb-blue',
  )}
>
  <!-- Header -->
  <div
    class="p-3 border-b border-nb-black/20 bg-nb-cream/40"
    onclick={onFocus}
    role="presentation"
  >
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-bold text-nb-black/80">Archive Layout</h3>
      <Button
        variant="ghost"
        size="bare"
        onclick={() => { showNewCollectionInput = !showNewCollectionInput; }}
        class="p-1 hover:bg-nb-cream text-nb-black/60 text-sm"
        title="Create new collection"
      >
        <Icon name="add" class="text-base" />
      </Button>
    </div>

    {#if showNewCollectionInput}
      <div class="flex gap-2">
        <!-- svelte-ignore a11y_autofocus -->
        <input
          type="text"
          bind:value={newCollectionName}
          onkeydown={handleCreateKeyDown}
          placeholder="Collection name..."
          class="flex-1 px-2 py-1 text-sm border border-nb-black/20 rounded"
          autofocus
        />
        <Button
          variant="ghost"
          size="bare"
          onclick={handleCreateCollection}
          class="px-2 py-1 text-sm bg-nb-blue text-white hover:bg-nb-blue"
        >
          Create
        </Button>
      </div>
    {/if}
  </div>

  <!-- Collections list -->
  <div class="flex-1 overflow-y-auto">
    {#if archiveLayout.root.children.length === 0}
      <div class="p-6 text-center text-sm text-nb-black/50">
        <Icon name="inbox" class="text-4xl mb-2 block opacity-50" />
        <p>No collections yet</p>
        <p class="text-xs mt-1">Create one using the + button above, or drag items here</p>
      </div>
    {:else}
      {#each archiveLayout.root.children as collection (collection.id)}
        {@render collectionNode(collection)}
      {/each}
    {/if}

    <!-- Drop zone for creating new collection -->
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

  <!-- Footer -->
  <div class="p-2 border-t border-nb-black/20 bg-nb-cream/40 text-xs text-nb-black/50">
    <div class="flex justify-between">
      <span>
        {archiveLayout.root.children.length} collection{archiveLayout.root.children.length !== 1 ? 's' : ''}
      </span>
      <span>
        {sourceManifests.manifests.length} manifest{sourceManifests.manifests.length !== 1 ? 's' : ''}
      </span>
    </div>
  </div>
</div>
