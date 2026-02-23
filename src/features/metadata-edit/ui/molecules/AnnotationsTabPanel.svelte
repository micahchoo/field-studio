<!--
  AnnotationsTabPanel -- Panel for displaying and managing IIIF annotations.
  React source: src/features/metadata-edit/ui/molecules/AnnotationsTabPanel.tsx (228 lines)
  Architecture: Molecule (composes ListContainer, AnnotationItem, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  export type SortMode = 'default' | 'motivation' | 'type';

  export const SORT_PILLS: { mode: SortMode; label: string }[] = [
    { mode: 'default', label: 'Order' },
    { mode: 'motivation', label: 'Purpose' },
    { mode: 'type', label: 'Type' },
  ];
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFAnnotation } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import ListContainer from '@/src/shared/ui/molecules/ListContainer.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import AnnotationItem from '../atoms/AnnotationItem.svelte';

  interface Props {
    annotations: IIIFAnnotation[];
    language?: string;
    selectedAnnotationId?: string;
    cx: ContextualClassNames;
    fieldMode: boolean;
    onSelectAnnotation?: (annotation: IIIFAnnotation) => void;
    onDeleteAnnotation?: (annotation: IIIFAnnotation) => void;
    onEditAnnotation?: (annotation: IIIFAnnotation, newText: string) => void;
    onAddAnnotation?: () => void;
    onBulkDeleteAnnotations?: (ids: string[]) => void;
  }

  let {
    annotations,
    language = 'en',
    selectedAnnotationId,
    cx,
    fieldMode,
    onSelectAnnotation,
    onDeleteAnnotation,
    onEditAnnotation,
    onAddAnnotation,
    onBulkDeleteAnnotations,
  }: Props = $props();

  let sortMode = $state<SortMode>('default');
  let selectMode = $state(false);
  let selectedIds = $state(new Set<string>());

  /** Detect if annotation has a time-based FragmentSelector (t=...) */
  function hasTimeSelector(annotation: IIIFAnnotation): boolean {
    const target = annotation.target as unknown;
    if (typeof target === 'string') return target.includes('#t=');
    if (target && typeof target === 'object') {
      const t = target as Record<string, unknown>;
      if (typeof t.source === 'string' && t.source.includes('#t=')) return true;
      const selector = t.selector as Record<string, unknown> | undefined;
      if (selector?.type === 'FragmentSelector' && typeof selector.value === 'string' && selector.value.startsWith('t=')) return true;
    }
    return false;
  }

  function getMotivation(annotation: IIIFAnnotation): string {
    if (Array.isArray(annotation.motivation)) return annotation.motivation[0] || '';
    return annotation.motivation || 'commenting';
  }

  let sortedAnnotations = $derived.by(() => {
    if (sortMode === 'default') return annotations;
    const sorted = [...annotations];
    if (sortMode === 'motivation') {
      sorted.sort((a, b) => getMotivation(a).localeCompare(getMotivation(b)));
    } else if (sortMode === 'type') {
      sorted.sort((a, b) => {
        const aTime = hasTimeSelector(a) ? 0 : 1;
        const bTime = hasTimeSelector(b) ? 0 : 1;
        return aTime - bTime;
      });
    }
    return sorted;
  });

  function handleToggleCheck(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    selectedIds = next;
  }

  function handleSelectAll() {
    if (selectedIds.size === annotations.length) {
      selectedIds = new Set();
    } else {
      selectedIds = new Set(annotations.map(a => a.id));
    }
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (onBulkDeleteAnnotations) {
      onBulkDeleteAnnotations(Array.from(selectedIds));
    } else if (onDeleteAnnotation) {
      for (const anno of annotations) {
        if (selectedIds.has(anno.id)) onDeleteAnnotation(anno);
      }
    }
    selectedIds = new Set();
    selectMode = false;
  }

  function exitSelectMode() {
    selectMode = false;
    selectedIds = new Set();
  }
</script>

<ListContainer
  items={annotations}
  emptyIcon="comments_disabled"
  emptyMessage="No annotations yet."
  {cx}
>
  {#snippet children()}
    <!-- Sort & Select controls -->
    {#if annotations.length > 1}
      <div class="flex items-center justify-between mb-2">
        <!-- Sort pills -->
        <div class="flex gap-1">
          {#each SORT_PILLS as pill (pill.mode)}
            <Button
              variant="ghost"
              size="bare"
              onclick={() => { sortMode = pill.mode; }}
              class={cn(
                'px-2 py-0.5 text-[9px] font-bold uppercase border',
                sortMode === pill.mode
                  ? (fieldMode ? 'border-nb-yellow bg-nb-yellow/20 text-nb-yellow' : 'border-nb-blue bg-nb-blue/10 text-nb-blue')
                  : (fieldMode ? 'border-nb-black/50 text-nb-yellow/40' : 'border-nb-black/20 text-nb-black/50')
              )}
            >
              {#snippet children()}{pill.label}{/snippet}
            </Button>
          {/each}
        </div>
        <!-- Select toggle -->
        {#if onDeleteAnnotation || onBulkDeleteAnnotations}
          <Button
            variant="ghost"
            size="bare"
            onclick={() => selectMode ? exitSelectMode() : (selectMode = true)}
            class={cn(
              'px-2 py-0.5 text-[9px] font-bold uppercase',
              selectMode
                ? (fieldMode ? 'text-nb-yellow' : 'text-nb-blue')
                : (fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/50')
            )}
          >
            {#snippet children()}{selectMode ? 'Cancel' : 'Select'}{/snippet}
          </Button>
        {/if}
      </div>
    {/if}

    <!-- Bulk delete bar -->
    {#if selectMode}
      <div class={cn(
        'flex items-center justify-between p-2 mb-2 border',
        fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-cream border-nb-black/20'
      )}>
        <Button
          variant="ghost"
          size="bare"
          onclick={handleSelectAll}
          class={cn('text-[9px] font-bold uppercase', fieldMode ? 'text-nb-yellow' : 'text-nb-blue')}
        >
          {#snippet children()}{selectedIds.size === annotations.length ? 'Deselect All' : 'Select All'}{/snippet}
        </Button>
        <Button
          variant="ghost"
          size="bare"
          onclick={handleBulkDelete}
          disabled={selectedIds.size === 0}
          class={cn(
            'text-[9px] font-bold uppercase px-2 py-0.5 disabled:opacity-40',
            fieldMode ? 'bg-nb-red/20 text-nb-red' : 'bg-nb-red/10 text-nb-red'
          )}
        >
          {#snippet children()}
            <Icon name="delete" class="text-[10px] mr-0.5 inline" />
            Delete Selected ({selectedIds.size})
          {/snippet}
        </Button>
      </div>
    {/if}

    <!-- Annotation list -->
    {#each sortedAnnotations as annotation (annotation.id)}
      <AnnotationItem
        {annotation}
        {language}
        selected={selectedAnnotationId === annotation.id}
        onclick={() => onSelectAnnotation?.(annotation)}
        onDelete={onDeleteAnnotation && !selectMode
          ? (id) => { const found = annotations.find(a => a.id === id); if (found) onDeleteAnnotation(found); }
          : undefined}
        onEdit={onEditAnnotation
          ? (id, text) => { const found = annotations.find(a => a.id === id); if (found) onEditAnnotation(found, text); }
          : undefined}
        expanded={selectedAnnotationId === annotation.id && !selectMode}
        {cx}
        {fieldMode}
        showCheckbox={selectMode}
        checked={selectedIds.has(annotation.id)}
        onCheckChange={(checked) => handleToggleCheck(annotation.id, checked)}
      />
    {/each}
  {/snippet}
</ListContainer>
