<!--
  StructureTabPanel -- Range/Structure Editor for IIIF Manifests.
  React source: src/features/metadata-edit/ui/molecules/StructureTabPanel.tsx (742 lines)
  Architecture: Molecule (internal state, composes RangeTreeItem atom + RangeEditModal molecule)

  Provides full CRUD operations for IIIF Ranges (Table of Contents):
  - Create, edit, delete ranges
  - Nested range hierarchy with tree UI
  - Assign canvases to ranges
  - Drag-drop reordering of range items

  Conforms to IIIF Presentation 3.0 structures specification.
-->
<script module lang="ts">
  import type {
    IIIFManifest,
    IIIFRange,
    IIIFRangeReference,
    IIIFCanvas,
  } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { AppSettings } from '@/src/shared/stores/appSettings.svelte';

  export interface StructureTabPanelProps {
    /** The manifest containing structures */
    manifest: IIIFManifest;
    /** Callback when structure is updated */
    onUpdateManifest: (updates: Partial<IIIFManifest>) => void;
    /** App settings for theming */
    settings: AppSettings;
    /** Contextual style classes (passed from Inspector) */
    cx: ContextualClassNames;
    /** Available canvases in the manifest */
    canvases: IIIFCanvas[];
    /** Field mode flag */
    fieldMode?: boolean;
  }
</script>

<script lang="ts">
  import { getIIIFValue } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import RangeTreeItem from '../atoms/RangeTreeItem.svelte';
  import RangeEditModal from './RangeEditModal.svelte';

  let {
    manifest,
    onUpdateManifest,
    settings,
    cx,
    canvases,
    fieldMode = false,
  }: StructureTabPanelProps = $props();

  let expandedRanges = $state(new Set<string>());
  let selectedRangeId = $state<string | null>(null);
  let modalOpen = $state(false);
  let editingRange = $state<IIIFRange | null>(null);
  let dragOverRangeId = $state<string | null>(null);
  let draggedRangeId = $state<string | null>(null);

  let structures = $derived(manifest.structures || []);

  // ---------- Helpers ----------

  /** Generate unique ID for new ranges */
  function generateRangeId(): string {
    return `${manifest.id}/range/${Date.now()}-${crypto.randomUUID().slice(0, 9)}`;
  }

  /** Toggle range expansion */
  function toggleExpand(rangeId: string) {
    const next = new Set(expandedRanges);
    if (next.has(rangeId)) {
      next.delete(rangeId);
    } else {
      next.add(rangeId);
    }
    expandedRanges = next;
  }

  /** Get canvas IDs from a range */
  function getCanvasIdsFromRange(range: IIIFRange): string[] {
    return (range.items || [])
      .filter((item): item is IIIFRangeReference =>
        typeof item !== 'string' && 'type' in item && item.type === 'Canvas'
      )
      .map(ref => ref.id);
  }

  /** Extract nested ranges from items */
  function getNestedRanges(items: IIIFRange['items'] | undefined): IIIFRange[] {
    return (items || []).filter((item): item is IIIFRange =>
      typeof item !== 'string' && 'type' in item && item.type === 'Range'
    );
  }

  /** Extract canvas refs from items */
  function getCanvasRefs(items: IIIFRange['items'] | undefined): IIIFRangeReference[] {
    return (items || []).filter((item): item is IIIFRangeReference =>
      typeof item !== 'string' && 'type' in item && item.type === 'Canvas'
    );
  }

  // ---------- CRUD ----------

  /** Create new range */
  function handleCreateRange(label: string, canvasIds: string[]) {
    const newRange: IIIFRange = {
      id: generateRangeId(),
      type: 'Range',
      label: { [settings.language]: [label] },
      items: canvasIds.map(id => ({ id, type: 'Canvas' as const })),
    };
    onUpdateManifest({ structures: [...structures, newRange] });
  }

  /** Update existing range (recursive in tree) */
  function handleUpdateRange(rangeId: string, label: string, canvasIds: string[]) {
    function updateRangeInList(ranges: IIIFRange[]): IIIFRange[] {
      return ranges.map(range => {
        if (range.id === rangeId) {
          const nestedRanges = getNestedRanges(range.items);
          const canvasRefs: IIIFRangeReference[] = canvasIds.map(id => ({ id, type: 'Canvas' as const }));
          return {
            ...range,
            label: { [settings.language]: [label] },
            items: [...canvasRefs, ...nestedRanges],
          };
        }
        if (range.items) {
          const nested = getNestedRanges(range.items);
          if (nested.length > 0) {
            const updatedNested = updateRangeInList(nested);
            const refs = getCanvasRefs(range.items);
            return { ...range, items: [...refs, ...updatedNested] };
          }
        }
        return range;
      });
    }

    onUpdateManifest({ structures: updateRangeInList(structures) });
    editingRange = null;
  }

  /** Delete range (recursive in tree) */
  function handleDeleteRange(rangeId: string) {
    function deleteRangeFromList(ranges: IIIFRange[]): IIIFRange[] {
      return ranges
        .filter(range => range.id !== rangeId)
        .map(range => {
          if (range.items) {
            const nested = getNestedRanges(range.items);
            if (nested.length > 0) {
              const updatedNested = deleteRangeFromList(nested);
              const refs = getCanvasRefs(range.items);
              return { ...range, items: [...refs, ...updatedNested] };
            }
          }
          return range;
        });
    }

    onUpdateManifest({ structures: deleteRangeFromList(structures) });
    if (selectedRangeId === rangeId) {
      selectedRangeId = null;
    }
  }

  /** Handle save from modal (create or update) */
  function handleModalSave(label: string, canvasIds: string[]) {
    if (editingRange) {
      handleUpdateRange(editingRange.id, label, canvasIds);
    } else {
      handleCreateRange(label, canvasIds);
    }
    modalOpen = false;
    editingRange = null;
  }

  // ---------- Drag and Drop ----------

  function handleDragStart(e: DragEvent, rangeId: string) {
    if (!e.dataTransfer) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rangeId);
    draggedRangeId = rangeId;
  }

  function handleDragOver(e: DragEvent, rangeId: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (draggedRangeId !== rangeId) {
      dragOverRangeId = rangeId;
    }
  }

  function handleDrop(e: DragEvent, targetRangeId: string) {
    e.preventDefault();
    const sourceRangeId = e.dataTransfer?.getData('text/plain');

    if (!sourceRangeId || sourceRangeId === targetRangeId) {
      draggedRangeId = null;
      dragOverRangeId = null;
      return;
    }

    // Reorder top-level structures
    const sourceIndex = structures.findIndex(r => r.id === sourceRangeId);
    const targetIndex = structures.findIndex(r => r.id === targetRangeId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newStructures = [...structures];
      const [removed] = newStructures.splice(sourceIndex, 1);
      newStructures.splice(targetIndex, 0, removed);
      onUpdateManifest({ structures: newStructures });
    }

    draggedRangeId = null;
    dragOverRangeId = null;
  }

  function handleDragEnd() {
    draggedRangeId = null;
    dragOverRangeId = null;
  }

  // ---------- Supplementary AnnotationCollection ----------

  function handleSupplementaryChange(
    rangeId: string,
    supplementary: { id: string; type: 'AnnotationCollection' } | undefined
  ) {
    function updateSupplementaryInList(ranges: IIIFRange[]): IIIFRange[] {
      return ranges.map(range => {
        if (range.id === rangeId) {
          const updated = { ...range } as Record<string, unknown>;
          if (supplementary) {
            updated.supplementary = supplementary;
          } else {
            delete updated.supplementary;
          }
          return updated as unknown as IIIFRange;
        }
        if (range.items) {
          const nested = getNestedRanges(range.items);
          if (nested.length > 0) {
            const updatedNested = updateSupplementaryInList(nested);
            const refs = getCanvasRefs(range.items);
            return { ...range, items: [...refs, ...updatedNested] };
          }
        }
        return range;
      });
    }

    onUpdateManifest({ structures: updateSupplementaryInList(structures) });
  }

  // ---------- Modal helpers ----------

  function openCreateModal() {
    editingRange = null;
    modalOpen = true;
  }

  function openEditModal(range: IIIFRange) {
    editingRange = range;
    modalOpen = true;
  }

  function closeModal() {
    modalOpen = false;
    editingRange = null;
  }

  let modalInitialLabel = $derived(
    editingRange ? getIIIFValue(editingRange.label, settings.language) || '' : ''
  );

  let modalInitialCanvasIds = $derived(
    editingRange ? getCanvasIdsFromRange(editingRange) : []
  );
</script>

<div class="space-y-4">
  <!-- Info banner -->
  <div class={cn('p-3 border', cx.surface, cx.border)}>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Icon
          name="account_tree"
          class={cn('text-sm', settings.fieldMode ? 'text-nb-purple/60' : 'text-nb-purple')}
        />
        <span class={cn('text-xs font-bold uppercase', settings.fieldMode ? 'text-nb-purple/60' : 'text-nb-purple')}>
          Table of Contents
        </span>
      </div>
      <span class={cn('text-[10px]', cx.textMuted)}>
        {structures.length} {structures.length === 1 ? 'range' : 'ranges'}
      </span>
    </div>
    <p class={cn('text-[10px] mt-1', cx.textMuted)}>
      Define structural divisions like chapters, sections, or groups
    </p>
  </div>

  <!-- Add Range button -->
  <Button
    variant="ghost"
    size="bare"
    onclick={openCreateModal}
    class={cn(
      'w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed',
      'text-xs font-bold uppercase transition-nb',
      settings.fieldMode
        ? 'border-nb-black/80 text-nb-black/40 hover:border-nb-yellow hover:text-nb-yellow hover:bg-nb-yellow/20'
        : 'border-nb-black/20 text-nb-black/50 hover:border-nb-blue hover:text-nb-blue hover:bg-nb-blue/10'
    )}
  >
    {#snippet children()}
      <Icon name="add" class="text-sm" />
      Add Range
    {/snippet}
  </Button>

  <!-- Range tree -->
  {#if structures.length > 0}
    <div class={cn(
      'border overflow-hidden',
      settings.fieldMode ? 'border-nb-black/80 bg-nb-black' : 'border-nb-black/20 bg-nb-white'
    )}>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div ondragend={handleDragEnd}>
        {#each structures as range (range.id)}
          {@const nestedRanges = getNestedRanges(range.items)}
          {@const isExpanded = expandedRanges.has(range.id)}
          <div class="group">
            <RangeTreeItem
              {range}
              depth={0}
              {isExpanded}
              onToggle={() => toggleExpand(range.id)}
              onSelect={() => { selectedRangeId = range.id === selectedRangeId ? null : range.id; }}
              isSelected={selectedRangeId === range.id}
              onEdit={() => openEditModal(range)}
              onDelete={() => handleDeleteRange(range.id)}
              onSupplementaryChange={handleSupplementaryChange}
              fieldMode={settings.fieldMode}
              language={settings.language}
              {canvases}
              onDragStart={(e) => handleDragStart(e, range.id)}
              onDragOver={(e) => handleDragOver(e, range.id)}
              onDrop={(e) => handleDrop(e, range.id)}
              isDragOver={dragOverRangeId === range.id}
            />
            {#if isExpanded && nestedRanges.length > 0}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div ondragend={handleDragEnd}>
                {#each nestedRanges as nested (nested.id)}
                  {@const nestedChildren = getNestedRanges(nested.items)}
                  {@const isNestedExpanded = expandedRanges.has(nested.id)}
                  <div class="group">
                    <RangeTreeItem
                      range={nested}
                      depth={1}
                      isExpanded={isNestedExpanded}
                      onToggle={() => toggleExpand(nested.id)}
                      onSelect={() => { selectedRangeId = nested.id === selectedRangeId ? null : nested.id; }}
                      isSelected={selectedRangeId === nested.id}
                      onEdit={() => openEditModal(nested)}
                      onDelete={() => handleDeleteRange(nested.id)}
                      onSupplementaryChange={handleSupplementaryChange}
                      fieldMode={settings.fieldMode}
                      language={settings.language}
                      {canvases}
                      onDragStart={(e) => handleDragStart(e, nested.id)}
                      onDragOver={(e) => handleDragOver(e, nested.id)}
                      onDrop={(e) => handleDrop(e, nested.id)}
                      isDragOver={dragOverRangeId === nested.id}
                    />
                    {#if isNestedExpanded && nestedChildren.length > 0}
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div ondragend={handleDragEnd}>
                        {#each nestedChildren as deep (deep.id)}
                          <div class="group">
                            <RangeTreeItem
                              range={deep}
                              depth={2}
                              isExpanded={expandedRanges.has(deep.id)}
                              onToggle={() => toggleExpand(deep.id)}
                              onSelect={() => { selectedRangeId = deep.id === selectedRangeId ? null : deep.id; }}
                              isSelected={selectedRangeId === deep.id}
                              onEdit={() => openEditModal(deep)}
                              onDelete={() => handleDeleteRange(deep.id)}
                              onSupplementaryChange={handleSupplementaryChange}
                              fieldMode={settings.fieldMode}
                              language={settings.language}
                              {canvases}
                              onDragStart={(e) => handleDragStart(e, deep.id)}
                              onDragOver={(e) => handleDragOver(e, deep.id)}
                              onDrop={(e) => handleDrop(e, deep.id)}
                              isDragOver={dragOverRangeId === deep.id}
                            />
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class={cn('text-center py-8', cx.textMuted)}>
      <Icon name="segment" class="text-4xl mb-2 opacity-30" />
      <p class="text-sm">No structural ranges defined</p>
      <p class="text-[10px] mt-1">
        Add ranges to create a table of contents for navigation
      </p>
    </div>
  {/if}

  <!-- Edit/Create Modal -->
  <RangeEditModal
    isOpen={modalOpen}
    onClose={closeModal}
    onSave={handleModalSave}
    initialLabel={modalInitialLabel}
    initialCanvasIds={modalInitialCanvasIds}
    availableCanvases={canvases}
    isEditing={!!editingRange}
    fieldMode={settings.fieldMode}
    language={settings.language}
  />
</div>
