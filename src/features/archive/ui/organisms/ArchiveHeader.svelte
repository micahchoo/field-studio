<!--
  ArchiveHeader.svelte — Archive Toolbar (Stateless molecule)
  ============================================================
  Wraps ViewHeader with snippet slots for title, actions, subbar.
  SelectionBar appears when items are selected.
  React source: src/features/archive/ui/organisms/ArchiveHeader.tsx
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import ViewHeader from '@/src/shared/ui/molecules/ViewHeader/ViewHeader.svelte';
  import SelectionBar from '@/src/shared/ui/molecules/ViewHeader/SelectionBar.svelte';
  import SearchField from '@/src/shared/ui/molecules/SearchField.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Row from '@/src/shared/ui/layout/primitives/Row.svelte';
  import { cn } from '@/src/shared/lib/cn';

  type ViewMode = 'grid' | 'list' | 'grouped';
  type SortMode = 'name' | 'date' | 'size';
  type SortDirection = 'asc' | 'desc';

  interface Props {
    cx: ContextualClassNames;
    fieldMode: boolean;
    /** Two-way bindable filter string (owned by ArchiveView) */
    filter: string;
    view: ViewMode;
    onViewChange: (view: ViewMode) => void;
    sortBy: SortMode;
    onSortChange: (field: SortMode) => void;
    sortDirection: SortDirection;
    onSortDirectionChange: (dir: SortDirection) => void;
    groupByManifest: boolean;
    onToggleGroupByManifest: () => void;
    selectedCount: number;
    selectionHasGPS?: boolean;
    onClearSelection: () => void;
    onGroupIntoManifest?: () => void;
    onOpenMap?: () => void;
    onEditMetadata?: () => void;
    onBatchEdit?: () => void;
    onComposeOnBoard?: () => void;
    showViewerPanel: boolean;
    onToggleViewerPanel: () => void;
    showInspectorPanel: boolean;
    onToggleInspectorPanel: () => void;
    hasCanvasSelected?: boolean;
  }

  let {
    cx,
    fieldMode,
    filter = $bindable(''),
    view,
    onViewChange,
    sortBy,
    onSortChange,
    sortDirection,
    onSortDirectionChange,
    groupByManifest,
    onToggleGroupByManifest,
    selectedCount,
    selectionHasGPS = false,
    onClearSelection,
    onGroupIntoManifest,
    onOpenMap,
    onEditMetadata,
    onBatchEdit,
    onComposeOnBoard,
    showViewerPanel,
    onToggleViewerPanel,
    showInspectorPanel,
    onToggleInspectorPanel,
    hasCanvasSelected = false,
  }: Props = $props();

  const hasSelection = $derived(selectedCount > 0);
  const showReorderHint = $derived(hasCanvasSelected && !showViewerPanel);

  // Sort options definition
  const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
    { value: 'name', label: 'Name' },
    { value: 'date', label: 'Date' },
    { value: 'size', label: 'Size' },
  ];

  function handleSortClick(opt: SortMode) {
    if (sortBy === opt) {
      onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(opt);
      onSortDirectionChange('asc');
    }
  }

  // Dynamic class helpers for toggle buttons
  function panelToggleClass(active: boolean): string {
    if (active) {
      return fieldMode
        ? 'bg-nb-yellow/30 text-nb-yellow'
        : 'bg-nb-blue/30 text-nb-blue';
    }
    return fieldMode
      ? 'text-nb-yellow hover:bg-nb-yellow/20'
      : 'text-nb-black/40 hover:bg-nb-black/80';
  }

  function sortButtonClass(active: boolean): string {
    if (active) {
      return fieldMode
        ? 'bg-nb-yellow/30 text-nb-yellow'
        : 'bg-nb-blue/20 text-nb-blue';
    }
    return fieldMode
      ? 'text-nb-yellow/60 hover:text-nb-yellow'
      : 'text-nb-black/40 hover:text-nb-black/70';
  }

  const selectionTextColor = $derived(fieldMode ? 'text-nb-yellow/40' : 'text-white');
</script>

<ViewHeader {cx} height="default">
  {#snippet title()}
    <span class={cn('font-mono uppercase text-sm font-semibold', cx.text)}>
      Archive
    </span>
    {#if !hasSelection && !showReorderHint}
      <div class={cn('h-4 w-px', fieldMode ? 'bg-nb-yellow/40' : 'bg-nb-black/20')}></div>
      <span class={cn(
        'text-nb-caption font-bold uppercase tracking-wider font-mono hidden md:inline',
        cx.textMuted || 'text-nb-black/40'
      )}>
        Select items to begin synthesis pipeline
      </span>
    {/if}
    {#if showReorderHint}
      <div class={cn('h-4 w-px', fieldMode ? 'bg-nb-yellow/40' : 'bg-nb-black/20')}></div>
      <span class={cn(
        'text-[10px] font-bold uppercase tracking-wider font-mono hidden md:inline',
        fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'
      )}>
        Viewer closed — reorder enabled
      </span>
    {/if}
  {/snippet}

  {#snippet actions()}
    {#if hasCanvasSelected}
      <Row gap="xs" align="center">
        <Button
          variant="ghost"
          size="bare"
          onclick={onToggleInspectorPanel}
          class={cn('p-1.5 transition-nb', panelToggleClass(showInspectorPanel))}
          title={showInspectorPanel ? 'Hide Inspector' : 'Show Inspector'}
          aria-expanded={showInspectorPanel}
          aria-label="Toggle inspector panel"
        >
          <Icon name="info" class="text-lg" />
        </Button>
        <Button
          variant="ghost"
          size="bare"
          onclick={onToggleViewerPanel}
          class={cn('p-1.5 transition-nb', panelToggleClass(showViewerPanel))}
          title={showViewerPanel ? 'Close Viewer' : 'Open Viewer'}
          aria-expanded={showViewerPanel}
          aria-label="Toggle viewer panel"
        >
          <Icon name={showViewerPanel ? 'visibility' : 'visibility_off'} class="text-lg" />
        </Button>
      </Row>
    {/if}
  {/snippet}

  {#snippet subbar()}
    <Row gap="sm" align="center" wrap class="flex-1">
      <!-- Search / filter field -->
      <SearchField
        bind:value={filter}
        placeholder="Filter archive..."
        width="w-48"
        showClear={true}
        {cx}
      />

      <!-- Sort buttons -->
      <div class="flex items-center gap-1">
        {#each SORT_OPTIONS as opt (opt.value)}
          <Button
            variant="ghost"
            size="bare"
            onclick={() => handleSortClick(opt.value)}
            class={cn(
              'px-2 py-1 text-xs font-medium flex items-center gap-0.5 transition-nb',
              sortButtonClass(sortBy === opt.value)
            )}
            title={`Sort by ${opt.label}`}
            aria-pressed={sortBy === opt.value}
          >
            {opt.label}
            {#if sortBy === opt.value}
              <Icon
                name={sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                class="text-xs"
              />
            {/if}
          </Button>
        {/each}

        <!-- Group by manifest toggle -->
        <Button
          variant="ghost"
          size="bare"
          onclick={onToggleGroupByManifest}
          class={cn(
            'px-2 py-1 text-xs font-medium flex items-center gap-0.5 transition-nb',
            sortButtonClass(groupByManifest)
          )}
          title={groupByManifest ? 'Ungroup' : 'Group by Manifest'}
          aria-pressed={groupByManifest}
        >
          <Icon name="auto_stories" class="text-sm" />
        </Button>
      </div>

      <!-- View mode toggle (pushed to the right) -->
      <div class="ml-auto flex items-center" role="radiogroup" aria-label="Archive view mode">
        <Row gap="xs">
          <Button
            variant="ghost"
            size="bare"
            onclick={() => onViewChange('grid')}
            class={cn('p-1.5 transition-nb', sortButtonClass(view === 'grid'))}
            aria-checked={view === 'grid'}
            title="Grid view"
          >
            <Icon name="grid_view" class="text-lg" />
          </Button>
          <Button
            variant="ghost"
            size="bare"
            onclick={() => onViewChange('list')}
            class={cn('p-1.5 transition-nb', sortButtonClass(view === 'list'))}
            aria-checked={view === 'list'}
            title="List view"
          >
            <Icon name="view_list" class="text-lg" />
          </Button>
        </Row>
      </div>
    </Row>
  {/snippet}
</ViewHeader>

{#if hasSelection}
  <SelectionBar count={selectedCount} onClear={onClearSelection} {cx}>
    {#snippet children()}
      <Button
        variant="ghost"
        size="sm"
        onclick={onGroupIntoManifest}
        class={selectionTextColor}
      >
        {#snippet icon()}
          <Icon name="auto_stories" class={cn('text-sm', fieldMode ? 'text-nb-yellow' : 'text-nb-green')} />
        {/snippet}
        Group into Manifest
      </Button>

      {#if selectionHasGPS}
        <Button
          variant="ghost"
          size="sm"
          onclick={onOpenMap}
          class={selectionTextColor}
        >
          {#snippet icon()}
            <Icon name="explore" class={cn('text-sm', fieldMode ? 'text-nb-yellow' : 'text-nb-blue')} />
          {/snippet}
          View on Map
        </Button>
      {/if}

      <Button
        variant="ghost"
        size="sm"
        onclick={onEditMetadata}
        class={selectionTextColor}
      >
        {#snippet icon()}
          <Icon name="table_chart" class={cn('text-sm', fieldMode ? 'text-nb-yellow' : 'text-nb-orange')} />
        {/snippet}
        Edit in Catalog
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onclick={onComposeOnBoard}
        class={selectionTextColor}
      >
        {#snippet icon()}
          <Icon name="dashboard" class={cn('text-sm', fieldMode ? 'text-nb-yellow' : 'text-nb-pink')} />
        {/snippet}
        Compose on Board
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onclick={onBatchEdit}
        class={selectionTextColor}
      >
        Batch Edit
      </Button>
    {/snippet}
  </SelectionBar>
{/if}
