<!--
  RangeTreeItem -- Single range item in the tree structure for IIIF Range editing.
  React source: src/features/metadata-edit/ui/molecules/StructureTabPanel.tsx (lines 65-221)
  Architecture: Atom (no internal state, props-only, draggable tree node)
-->
<script module lang="ts">
  import type { IIIFRange, IIIFRangeReference, IIIFCanvas } from '@/src/shared/types';

  export interface RangeTreeItemProps {
    range: IIIFRange;
    depth: number;
    isExpanded: boolean;
    onToggle: () => void;
    onSelect: () => void;
    isSelected: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onSupplementaryChange?: (rangeId: string, supplementary: { id: string; type: 'AnnotationCollection' } | undefined) => void;
    fieldMode: boolean;
    language: string;
    canvases: IIIFCanvas[];
    onDragStart?: (e: DragEvent) => void;
    onDragOver?: (e: DragEvent) => void;
    onDrop?: (e: DragEvent) => void;
    isDragOver?: boolean;
  }
</script>

<script lang="ts">
  import { getIIIFValue } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  let {
    range,
    depth,
    isExpanded,
    onToggle,
    onSelect,
    isSelected,
    onEdit,
    onDelete,
    onSupplementaryChange,
    fieldMode,
    language,
    canvases,
    onDragStart,
    onDragOver,
    onDrop,
    isDragOver = false,
  }: RangeTreeItemProps = $props();

  let label = $derived(getIIIFValue(range.label, language) || 'Untitled Range');

  let hasChildren = $derived(range.items && range.items.length > 0);

  let nestedRanges = $derived(
    range.items?.filter((item): item is IIIFRange =>
      typeof item !== 'string' && 'type' in item && item.type === 'Range'
    ) || []
  );

  let canvasRefs = $derived(
    range.items?.filter((item): item is IIIFRangeReference =>
      typeof item !== 'string' && 'type' in item && item.type === 'Canvas'
    ) || []
  );

  let supplementaryId = $derived((range as unknown as Record<string, unknown>).supplementary
    ? ((range as unknown as Record<string, unknown>).supplementary as { id: string })?.id || ''
    : ''
  );

  function handleToggleClick(e: MouseEvent) {
    e.stopPropagation();
    onToggle();
  }

  function handleEditClick(e: MouseEvent) {
    e.stopPropagation();
    onEdit();
  }

  function handleDeleteClick(e: MouseEvent) {
    e.stopPropagation();
    onDelete();
  }

  function handleSupplementaryInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = target.value.trim();
    onSupplementaryChange?.(
      range.id,
      val ? { id: val, type: 'AnnotationCollection' } : undefined
    );
  }

  function handleClearSupplementary() {
    onSupplementaryChange?.(range.id, undefined);
  }

  function handleSupplementaryContainerClick(e: MouseEvent) {
    e.stopPropagation();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  draggable="true"
  ondragstart={onDragStart}
  ondragover={onDragOver}
  ondrop={onDrop}
  class={cn(
    'transition-nb',
    isDragOver
      ? (fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-blue/20')
      : ''
  )}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    onclick={onSelect}
    class={cn(
      'flex items-center gap-2 px-2 py-2 cursor-pointer transition-nb',
      isSelected
        ? (fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-blue/20')
        : (fieldMode ? 'hover:bg-nb-black' : 'hover:bg-nb-cream')
    )}
    style:padding-left="{depth * 16 + 8}px"
  >
    <!-- Expand/Collapse toggle -->
    {#if hasChildren}
      <Button
        variant="ghost"
        size="bare"
        onclick={handleToggleClick}
        class={cn('p-0.5', fieldMode ? 'hover:bg-nb-black/80' : 'hover:bg-nb-cream')}
      >
        {#snippet children()}
          <Icon
            name={isExpanded ? 'expand_more' : 'chevron_right'}
            class={cn('text-sm', fieldMode ? 'text-nb-black/40' : 'text-nb-black/50')}
          />
        {/snippet}
      </Button>
    {:else}
      <div class="w-5"></div>
    {/if}

    <!-- Range Icon -->
    <Icon
      name="segment"
      class={cn('text-sm', fieldMode ? 'text-nb-purple/60' : 'text-nb-purple')}
    />

    <!-- Label -->
    <span class={cn('flex-1 text-xs font-medium truncate', fieldMode ? 'text-white' : 'text-nb-black')}>
      {label}
    </span>

    <!-- Item counts -->
    <div class="flex items-center gap-1.5">
      {#if canvasRefs.length > 0}
        <span class={cn(
          'text-[9px] px-1.5 py-0.5',
          fieldMode ? 'bg-nb-black text-nb-black/40' : 'bg-nb-cream text-nb-black/60'
        )}>
          {canvasRefs.length} pages
        </span>
      {/if}
      {#if nestedRanges.length > 0}
        <span class={cn(
          'text-[9px] px-1.5 py-0.5',
          fieldMode ? 'bg-nb-purple/50 text-nb-purple/40' : 'bg-nb-purple/10 text-nb-purple'
        )}>
          {nestedRanges.length} sub
        </span>
      {/if}
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-nb">
      <Button
        variant="ghost"
        size="bare"
        onclick={handleEditClick}
        class={cn('p-1', fieldMode ? 'hover:bg-nb-black/80 text-nb-black/40' : 'hover:bg-nb-cream text-nb-black/50')}
      >
        {#snippet children()}
          <Icon name="edit" class="text-[10px]" />
        {/snippet}
      </Button>
      <Button
        variant="ghost"
        size="bare"
        onclick={handleDeleteClick}
        class="p-1 hover:bg-nb-red/20 text-nb-red hover:text-nb-red"
      >
        {#snippet children()}
          <Icon name="delete" class="text-[10px]" />
        {/snippet}
      </Button>
    </div>
  </div>

  <!-- Supplementary AnnotationCollection link (shown when selected) -->
  {#if isSelected && onSupplementaryChange}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class={cn(
        'mx-2 mb-2 p-2 border text-xs',
        fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/20'
      )}
      style:margin-left="{depth * 16 + 28}px"
      onclick={handleSupplementaryContainerClick}
    >
      <div class={cn(
        'text-[9px] font-bold uppercase tracking-wider mb-1',
        fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'
      )}>
        <Icon name="library_books" class="text-[10px] mr-1 inline" />
        Supplementary Annotations
      </div>
      <div class="flex gap-2 items-center">
        <input
          type="url"
          value={supplementaryId}
          oninput={handleSupplementaryInput}
          placeholder="AnnotationCollection URI"
          class={cn(
            'flex-1 text-xs px-2 py-1 border outline-none',
            fieldMode
              ? 'bg-nb-black border-nb-black/80 text-white placeholder-nb-black/60 focus:border-nb-yellow'
              : 'bg-nb-white border-nb-black/20 placeholder-nb-black/40 focus:border-nb-blue'
          )}
        />
        {#if supplementaryId}
          <Button
            variant="ghost"
            size="bare"
            onclick={handleClearSupplementary}
            class="text-nb-red hover:text-nb-red p-0.5"
          >
            {#snippet children()}
              <Icon name="close" class="text-xs" />
            {/snippet}
          </Button>
        {/if}
      </div>
    </div>
  {/if}
</div>
