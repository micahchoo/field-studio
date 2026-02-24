<!--
  StructureTabPanel -- Range/Structure Editor for IIIF Manifests.
  Provides CRUD operations for IIIF Ranges (Table of Contents).
  Architecture: Molecule (composes RangeTreeList atom + RangeEditModal molecule)
-->
<script module lang="ts">
  import type {
    IIIFManifest, IIIFRange, IIIFRangeReference, IIIFCanvas,
  } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { AppSettings } from '@/src/shared/stores/appSettings.svelte';

  export interface StructureTabPanelProps {
    manifest: IIIFManifest;
    onUpdateManifest: (updates: Partial<IIIFManifest>) => void;
    settings: AppSettings;
    cx: ContextualClassNames;
    canvases: IIIFCanvas[];
    fieldMode?: boolean;
  }
</script>

<script lang="ts">
  import { getIIIFValue } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import RangeTreeList from '../atoms/RangeTreeList.svelte';
  import RangeEditModal from './RangeEditModal.svelte';

  let {
    manifest, onUpdateManifest, settings, cx, canvases, fieldMode = false,
  }: StructureTabPanelProps = $props();

  let expandedRanges = $state(new Set<string>());
  let selectedRangeId = $state<string | null>(null);
  let modalOpen = $state(false);
  let editingRange = $state<IIIFRange | null>(null);
  let dragOverRangeId = $state<string | null>(null);
  let draggedRangeId = $state<string | null>(null);

  let structures = $derived(manifest.structures || []);

  // ---------- Helpers ----------

  function generateRangeId(): string {
    return `${manifest.id}/range/${Date.now()}-${crypto.randomUUID().slice(0, 9)}`;
  }

  function toggleExpand(rangeId: string) {
    const next = new Set(expandedRanges);
    if (next.has(rangeId)) next.delete(rangeId); else next.add(rangeId);
    expandedRanges = next;
  }

  function getCanvasIdsFromRange(range: IIIFRange): string[] {
    return (range.items || [])
      .filter((item): item is IIIFRangeReference =>
        typeof item !== 'string' && 'type' in item && item.type === 'Canvas'
      )
      .map(ref => ref.id);
  }

  function getNestedRanges(items: IIIFRange['items'] | undefined): IIIFRange[] {
    return (items || []).filter((item): item is IIIFRange =>
      typeof item !== 'string' && 'type' in item && item.type === 'Range'
    );
  }

  function getCanvasRefs(items: IIIFRange['items'] | undefined): IIIFRangeReference[] {
    return (items || []).filter((item): item is IIIFRangeReference =>
      typeof item !== 'string' && 'type' in item && item.type === 'Canvas'
    );
  }

  // ---------- CRUD ----------

  function handleCreateRange(label: string, canvasIds: string[]) {
    const newRange: IIIFRange = {
      id: generateRangeId(),
      type: 'Range',
      label: { [settings.language]: [label] },
      items: canvasIds.map(id => ({ id, type: 'Canvas' as const })),
    };
    onUpdateManifest({ structures: [...structures, newRange] });
  }

  function handleUpdateRange(rangeId: string, label: string, canvasIds: string[]) {
    function updateInList(ranges: IIIFRange[]): IIIFRange[] {
      return ranges.map(range => {
        if (range.id === rangeId) {
          const nestedRanges = getNestedRanges(range.items);
          const canvasRefs: IIIFRangeReference[] = canvasIds.map(id => ({ id, type: 'Canvas' as const }));
          return { ...range, label: { [settings.language]: [label] }, items: [...canvasRefs, ...nestedRanges] };
        }
        if (range.items) {
          const nested = getNestedRanges(range.items);
          if (nested.length > 0) {
            const refs = getCanvasRefs(range.items);
            return { ...range, items: [...refs, ...updateInList(nested)] };
          }
        }
        return range;
      });
    }
    onUpdateManifest({ structures: updateInList(structures) });
    editingRange = null;
  }

  function handleDeleteRange(rangeId: string) {
    function deleteFromList(ranges: IIIFRange[]): IIIFRange[] {
      return ranges.filter(r => r.id !== rangeId).map(range => {
        if (range.items) {
          const nested = getNestedRanges(range.items);
          if (nested.length > 0) {
            const refs = getCanvasRefs(range.items);
            return { ...range, items: [...refs, ...deleteFromList(nested)] };
          }
        }
        return range;
      });
    }
    onUpdateManifest({ structures: deleteFromList(structures) });
    if (selectedRangeId === rangeId) selectedRangeId = null;
  }

  function handleModalSave(label: string, canvasIds: string[]) {
    if (editingRange) handleUpdateRange(editingRange.id, label, canvasIds);
    else handleCreateRange(label, canvasIds);
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
    if (draggedRangeId !== rangeId) dragOverRangeId = rangeId;
  }

  function handleDrop(e: DragEvent, targetRangeId: string) {
    e.preventDefault();
    const sourceRangeId = e.dataTransfer?.getData('text/plain');
    if (!sourceRangeId || sourceRangeId === targetRangeId) {
      draggedRangeId = null; dragOverRangeId = null; return;
    }
    const sourceIndex = structures.findIndex(r => r.id === sourceRangeId);
    const targetIndex = structures.findIndex(r => r.id === targetRangeId);
    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newStructures = [...structures];
      const [removed] = newStructures.splice(sourceIndex, 1);
      newStructures.splice(targetIndex, 0, removed);
      onUpdateManifest({ structures: newStructures });
    }
    draggedRangeId = null; dragOverRangeId = null;
  }

  function handleDragEnd() { draggedRangeId = null; dragOverRangeId = null; }

  // ---------- Supplementary AnnotationCollection ----------

  function handleSupplementaryChange(
    rangeId: string,
    supplementary: { id: string; type: 'AnnotationCollection' } | undefined
  ) {
    function updateInList(ranges: IIIFRange[]): IIIFRange[] {
      return ranges.map(range => {
        if (range.id === rangeId) {
          if (supplementary) return { ...range, supplementary };
          const { supplementary: _, ...rest } = range;
          // eslint-disable-next-line @field-studio/prefer-type-guards -- destructure-omit pattern
          return rest as IIIFRange;
        }
        if (range.items) {
          const nested = getNestedRanges(range.items);
          if (nested.length > 0) {
            const refs = getCanvasRefs(range.items);
            return { ...range, items: [...refs, ...updateInList(nested)] };
          }
        }
        return range;
      });
    }
    onUpdateManifest({ structures: updateInList(structures) });
  }

  // ---------- Modal helpers ----------

  function openCreateModal() { editingRange = null; modalOpen = true; }
  function openEditModal(range: IIIFRange) { editingRange = range; modalOpen = true; }
  function closeModal() { modalOpen = false; editingRange = null; }

  function handleSelect(rangeId: string) {
    selectedRangeId = rangeId === selectedRangeId ? null : rangeId;
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
        <Icon name="account_tree" class={cn('text-sm', settings.fieldMode ? 'text-nb-purple/60' : 'text-nb-purple')} />
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
    variant="ghost" size="bare" onclick={openCreateModal}
    class={cn(
      'w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed',
      'text-xs font-bold uppercase transition-nb',
      settings.fieldMode
        ? 'border-nb-black/80 text-nb-black/40 hover:border-nb-yellow hover:text-nb-yellow hover:bg-nb-yellow/20'
        : 'border-nb-black/20 text-nb-black/50 hover:border-nb-blue hover:text-nb-blue hover:bg-nb-blue/10'
    )}
  >
    {#snippet children()}<Icon name="add" class="text-sm" /> Add Range{/snippet}
  </Button>

  <!-- Range tree -->
  {#if structures.length > 0}
    <div class={cn(
      'border overflow-hidden',
      settings.fieldMode ? 'border-nb-black/80 bg-nb-black' : 'border-nb-black/20 bg-nb-white'
    )}>
      <RangeTreeList
        ranges={structures}
        {expandedRanges}
        {selectedRangeId}
        {dragOverRangeId}
        {canvases}
        fieldMode={settings.fieldMode}
        language={settings.language}
        onToggleExpand={toggleExpand}
        onSelect={handleSelect}
        onEdit={openEditModal}
        onDelete={handleDeleteRange}
        onSupplementaryChange={handleSupplementaryChange}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      />
    </div>
  {:else}
    <div class={cn('text-center py-8', cx.textMuted)}>
      <Icon name="segment" class="text-4xl mb-2 opacity-30" />
      <p class="text-sm">No structural ranges defined</p>
      <p class="text-[10px] mt-1">Add ranges to create a table of contents for navigation</p>
    </div>
  {/if}

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
