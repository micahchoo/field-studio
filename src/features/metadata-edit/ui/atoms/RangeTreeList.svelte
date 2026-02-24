<!--
  RangeTreeList -- Recursive tree renderer for IIIF Range structures.
  Extracted from StructureTabPanel molecule. Renders up to 3 levels of nesting.
  Architecture: Atom (composes RangeTreeItem)
-->
<script lang="ts">
  import type { IIIFRange, IIIFRangeReference, IIIFCanvas } from '@/src/shared/types';
  import RangeTreeItem from './RangeTreeItem.svelte';

  interface Props {
    ranges: IIIFRange[];
    expandedRanges: Set<string>;
    selectedRangeId: string | null;
    dragOverRangeId: string | null;
    canvases: IIIFCanvas[];
    fieldMode: boolean;
    language: string;
    onToggleExpand: (rangeId: string) => void;
    onSelect: (rangeId: string) => void;
    onEdit: (range: IIIFRange) => void;
    onDelete: (rangeId: string) => void;
    onSupplementaryChange: (rangeId: string, supplementary: { id: string; type: 'AnnotationCollection' } | undefined) => void;
    onDragStart: (e: DragEvent, rangeId: string) => void;
    onDragOver: (e: DragEvent, rangeId: string) => void;
    onDrop: (e: DragEvent, rangeId: string) => void;
    onDragEnd: () => void;
  }

  let {
    ranges, expandedRanges, selectedRangeId, dragOverRangeId,
    canvases, fieldMode, language,
    onToggleExpand, onSelect, onEdit, onDelete, onSupplementaryChange,
    onDragStart, onDragOver, onDrop, onDragEnd,
  }: Props = $props();

  /** Extract nested ranges from items */
  function getNestedRanges(items: IIIFRange['items'] | undefined): IIIFRange[] {
    return (items || []).filter((item): item is IIIFRange =>
      typeof item !== 'string' && 'type' in item && item.type === 'Range'
    );
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div ondragend={onDragEnd}>
  {#each ranges as range (range.id)}
    {@const nestedRanges = getNestedRanges(range.items)}
    {@const isExpanded = expandedRanges.has(range.id)}
    <div class="group">
      <RangeTreeItem
        {range} depth={0} {isExpanded}
        onToggle={() => onToggleExpand(range.id)}
        onSelect={() => onSelect(range.id)}
        isSelected={selectedRangeId === range.id}
        onEdit={() => onEdit(range)}
        onDelete={() => onDelete(range.id)}
        {onSupplementaryChange} {fieldMode} {language} {canvases}
        onDragStart={(e) => onDragStart(e, range.id)}
        onDragOver={(e) => onDragOver(e, range.id)}
        onDrop={(e) => onDrop(e, range.id)}
        isDragOver={dragOverRangeId === range.id}
      />
      {#if isExpanded && nestedRanges.length > 0}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div ondragend={onDragEnd}>
          {#each nestedRanges as nested (nested.id)}
            {@const nestedChildren = getNestedRanges(nested.items)}
            {@const isNestedExpanded = expandedRanges.has(nested.id)}
            <div class="group">
              <RangeTreeItem
                range={nested} depth={1} isExpanded={isNestedExpanded}
                onToggle={() => onToggleExpand(nested.id)}
                onSelect={() => onSelect(nested.id)}
                isSelected={selectedRangeId === nested.id}
                onEdit={() => onEdit(nested)}
                onDelete={() => onDelete(nested.id)}
                {onSupplementaryChange} {fieldMode} {language} {canvases}
                onDragStart={(e) => onDragStart(e, nested.id)}
                onDragOver={(e) => onDragOver(e, nested.id)}
                onDrop={(e) => onDrop(e, nested.id)}
                isDragOver={dragOverRangeId === nested.id}
              />
              {#if isNestedExpanded && nestedChildren.length > 0}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div ondragend={onDragEnd}>
                  {#each nestedChildren as deep (deep.id)}
                    <div class="group">
                      <RangeTreeItem
                        range={deep} depth={2}
                        isExpanded={expandedRanges.has(deep.id)}
                        onToggle={() => onToggleExpand(deep.id)}
                        onSelect={() => onSelect(deep.id)}
                        isSelected={selectedRangeId === deep.id}
                        onEdit={() => onEdit(deep)}
                        onDelete={() => onDelete(deep.id)}
                        {onSupplementaryChange} {fieldMode} {language} {canvases}
                        onDragStart={(e) => onDragStart(e, deep.id)}
                        onDragOver={(e) => onDragOver(e, deep.id)}
                        onDrop={(e) => onDrop(e, deep.id)}
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
