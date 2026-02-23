<!--
  StagingView Organism

  Simple two-pane view for staging: source manifests (left) + collections (right).
  Uses PaneLayout with ViewHeader for consistent layout.

  Ported from: src/features/staging/ui/organisms/StagingView.tsx (450 lines)

  Architecture:
  - PaneLayout variant="default" (scrollable body)
  - ViewHeader with stats + filter + selection info + actions
  - Split body: source pane (left, flex-1) + target pane (right, w-80)
  - Create collection modal overlay
  - Empty state when no sources
  - cx/fieldMode from template props
-->
<script module lang="ts">
  import type { SourceManifests } from '../../model';

  const EMPTY_SOURCE_MANIFESTS: SourceManifests = { byId: {}, allIds: [] };
</script>

<script lang="ts">
  import type { IIIFCollection, IIIFItem } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import {
    selectAllSourceManifests,
    selectTotalCanvasCount,
  } from '../../model';
  import PaneLayout from '@/src/shared/ui/layout/composites/PaneLayout.svelte';
  import ViewHeader from '@/src/shared/ui/molecules/ViewHeader/ViewHeader.svelte';
  import FilterInput from '@/src/shared/ui/molecules/FilterInput.svelte';
  import EmptyState from '@/src/shared/ui/molecules/EmptyState.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    root: IIIFItem | null;
    sourceManifests?: SourceManifests;
    targetCollections?: IIIFCollection[];
    cx: ContextualClassNames;
    fieldMode: boolean;
    onAddToCollection: (manifestIds: string[], collectionId: string) => void;
    onCreateCollection: (label: string, manifestIds: string[]) => void;
    onReorderCanvases: (manifestId: string, newOrder: string[]) => void;
    onRemoveFromSource: (manifestIds: string[]) => void;
    onMergeManifests?: (sourceIds: string[], targetId: string) => void;
  }

  let {
    root: _root,
    sourceManifests: externalSourceManifests,
    targetCollections = [],
    cx,
    fieldMode: _fieldMode,
    onAddToCollection,
    onCreateCollection,
    onReorderCanvases: _onReorderCanvases,
    onRemoveFromSource: _onRemoveFromSource,
    onMergeManifests: _onMergeManifests,
  }: Props = $props();

  // ── State ──
  let filter = $state('');
  let selectedSourceIds = $state<string[]>([]);
  let activeCollectionId = $state<string | null>(null);
  let isCreatingCollection = $state(false);
  let newCollectionName = $state('');

  // ── Derived ──
  const sourceManifests = $derived(externalSourceManifests ?? EMPTY_SOURCE_MANIFESTS);
  const allSourceManifests = $derived(selectAllSourceManifests(sourceManifests));
  const totalCanvases = $derived(selectTotalCanvasCount(sourceManifests));

  const filteredManifests = $derived.by(() => {
    if (!filter.trim()) return allSourceManifests;
    const lowerFilter = filter.toLowerCase();
    return allSourceManifests.filter(
      (m) =>
        m.label.toLowerCase().includes(lowerFilter) ||
        m.canvases.some((c) => c.label.toLowerCase().includes(lowerFilter))
    );
  });

  // ── Handlers ──
  function toggleSelection(id: string) {
    selectedSourceIds = selectedSourceIds.includes(id)
      ? selectedSourceIds.filter((i) => i !== id)
      : [...selectedSourceIds, id];
  }

  function selectAll() {
    selectedSourceIds = filteredManifests.map((m) => m.id);
  }

  function clearSelection() {
    selectedSourceIds = [];
  }

  function handleCreateCollection() {
    if (newCollectionName.trim() && selectedSourceIds.length > 0) {
      onCreateCollection(newCollectionName.trim(), selectedSourceIds);
      newCollectionName = '';
      isCreatingCollection = false;
      clearSelection();
    }
  }

  function handleAddToCollection(collectionId: string) {
    onAddToCollection(selectedSourceIds, collectionId);
    clearSelection();
  }
</script>

{#if allSourceManifests.length === 0}
  <EmptyState
    icon="cloud_upload"
    title="No Sources Loaded"
    description="Import files or manifests to begin staging"
    {cx}
  >
    {#snippet action()}
      <Button variant="primary" size="sm" onclick={() => { /* TODO: trigger import dialog */ }}>
        Import Files
      </Button>
    {/snippet}
  </EmptyState>

{:else}
  <PaneLayout variant="default">
    {#snippet header()}
      <ViewHeader {cx}>
        {#snippet title()}
          <h2 class="text-sm font-mono uppercase font-bold">Staging Area</h2>
        {/snippet}

        {#snippet subbar()}
          <span class={cn('text-sm', cx.textMuted)}>
            {allSourceManifests.length} manifests &middot; {totalCanvases} items
          </span>

          <FilterInput
            bind:value={filter}
            placeholder="Filter sources..."
            {cx}
          />

          {#if selectedSourceIds.length > 0}
            <span class={cn('text-sm', cx.textMuted)}>
              {selectedSourceIds.length} selected
            </span>
          {/if}
        {/snippet}

        {#snippet actions()}
          {#if selectedSourceIds.length > 0}
            <Button variant="primary" size="sm" onclick={() => isCreatingCollection = true}>
              Create Collection
            </Button>
            <Button variant="secondary" size="sm" onclick={clearSelection}>
              Clear Selection
            </Button>
          {/if}
          <Button variant="secondary" size="sm" onclick={selectAll}>
            Select All
          </Button>
        {/snippet}
      </ViewHeader>
    {/snippet}

    {#snippet body()}
      <div class="flex h-full gap-4 p-4">

        <!-- Source Pane (Left) -->
        <div class={cn('flex-1 border overflow-hidden flex flex-col', cx.headerBg, cx.border)}>
          <div class={cn('px-4 py-3 border-b flex justify-between items-center', cx.border, cx.headerBg)}>
            <h3 class={cn('font-medium', cx.text)}>Source Manifests</h3>
            <span class={cn('text-xs', cx.textMuted)}>{filteredManifests.length} shown</span>
          </div>

          <div class="flex-1 overflow-auto p-4">
            {#if filteredManifests.length === 0}
              <div class={cn('text-center py-8', cx.textMuted)}>
                No manifests match your filter
              </div>
            {:else}
              <div class="space-y-2">
                {#each filteredManifests as manifest (manifest.id)}
                  {@const isSelected = selectedSourceIds.includes(manifest.id)}
                  <button
                    type="button"
                    onclick={() => toggleSelection(manifest.id)}
                    class={cn(
                      'w-full text-left p-3 border cursor-pointer transition-nb bg-transparent',
                      isSelected
                        ? cn(cx.active, 'border-current')
                        : cn(cx.headerBg, cx.border, 'hover:opacity-80')
                    )}
                  >
                    <div class="flex items-center gap-3">
                      <!-- Selection checkbox -->
                      <div class={cn(
                        'w-4 h-4 border flex items-center justify-center',
                        isSelected ? cx.accent : cx.border
                      )}>
                        {#if isSelected}
                          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fill-rule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        {/if}
                      </div>

                      <!-- Manifest info -->
                      <div class="flex-1 min-w-0">
                        <div class={cn('font-medium truncate', cx.text)}>{manifest.label}</div>
                        <div class={cn('text-xs', cx.textMuted)}>{manifest.canvases.length} items</div>
                      </div>

                      <!-- Thumbnail -->
                      {#if manifest.canvases[0]?.thumbnail}
                        <img
                          src={manifest.canvases[0].thumbnail}
                          alt=""
                          class="w-10 h-10 object-cover rounded"
                        />
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- Target Pane (Right) -->
        <div class={cn('w-80 border overflow-hidden flex flex-col', cx.headerBg, cx.border)}>
          <div class={cn('px-4 py-3 border-b flex justify-between items-center', cx.border, cx.headerBg)}>
            <h3 class={cn('font-medium', cx.text)}>Collections</h3>
            <span class={cn('text-xs', cx.textMuted)}>{targetCollections.length}</span>
          </div>

          <div class="flex-1 overflow-auto p-4">
            {#if targetCollections.length === 0}
              <div class={cn('text-center py-8', cx.textMuted)}>
                <p class="mb-4">No collections yet</p>
                <p class="text-sm">Select manifests on the left and click "Create Collection"</p>
              </div>
            {:else}
              <div class="space-y-2">
                {#each targetCollections as collection (collection.id)}
                  {@const isActive = activeCollectionId === collection.id}
                  <button
                    type="button"
                    onclick={() => activeCollectionId = collection.id}
                    class={cn(
                      'w-full text-left p-3 border cursor-pointer transition-nb bg-transparent',
                      isActive
                        ? cn(cx.active, 'border-current')
                        : cn(cx.headerBg, cx.border, 'hover:opacity-80')
                    )}
                  >
                    <div class={cn('font-medium', cx.text)}>
                      {collection.label?.en?.[0] || 'Untitled Collection'}
                    </div>
                    <div class={cn('text-xs', cx.textMuted)}>
                      {collection.items?.length || 0} manifests
                    </div>

                    {#if isActive && selectedSourceIds.length > 0}
                      <Button
                        variant="secondary"
                        size="sm"
                        class="mt-2 w-full"
                        onclick={(e: MouseEvent) => { e.stopPropagation(); handleAddToCollection(collection.id); }}
                      >
                        Add {selectedSourceIds.length} to Collection
                      </Button>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

      </div>
    {/snippet}
  </PaneLayout>

  <!-- Create Collection Modal -->
  {#if isCreatingCollection}
    <div
      class="fixed inset-0 bg-nb-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="presentation"
    >
      <div class={cn('shadow-brutal p-6 w-96 max-w-[90vw]', cx.surface)}>
        <h3 class={cn('text-lg font-medium mb-4', cx.text)}>Create Collection</h3>
        <p class={cn('text-sm mb-4', cx.textMuted)}>
          Create a new collection with {selectedSourceIds.length} selected manifests
        </p>
        <input
          type="text"
          bind:value={newCollectionName}
          placeholder="Collection name..."
          class={cn('w-full px-3 py-2 border mb-4', cx.input, cx.border)}
        />
        <div class="flex justify-end gap-2">
          <Button variant="secondary" onclick={() => { isCreatingCollection = false; newCollectionName = ''; }}>
            Cancel
          </Button>
          <Button variant="primary" onclick={handleCreateCollection} disabled={!newCollectionName.trim()}>
            Create
          </Button>
        </div>
      </div>
    </div>
  {/if}

{/if}
