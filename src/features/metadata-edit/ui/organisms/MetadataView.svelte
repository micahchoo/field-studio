<!--
  MetadataView.svelte — Spreadsheet Metadata Editor (Svelte 5)
  =============================================================
  Migrated from: src/features/metadata-edit/ui/organisms/MetadataView.tsx

  Bulk metadata editing in a spreadsheet layout with inline cell editing,
  dynamic column extraction, grouped headers, CSV export, and unsaved change guard.
-->

<script lang="ts">
  import { PaneLayout } from '@/src/shared/ui/layout';
  import ViewHeader from '@/src/shared/ui/molecules/ViewHeader/ViewHeader.svelte';
  import FilterInput from '@/src/shared/ui/molecules/FilterInput.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import { Row } from '@/src/shared/ui/layout';
  import { cn } from '@/src/shared/lib/cn';
  import { getIIIFValue } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFItem, AbstractionLevel } from '@/src/shared/types';

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface MetadataViewProps {
    root: IIIFItem | null;
    cx: ContextualClassNames;
    fieldMode: boolean;
    onUpdate: (updatedRoot: IIIFItem) => void;
    filterIds?: string[] | null;
    onClearFilter?: () => void;
    abstractionLevel?: AbstractionLevel;
  }

  let {
    root,
    cx,
    fieldMode,
    onUpdate,
    filterIds = null,
    onClearFilter,
    abstractionLevel = 'standard',
  }: MetadataViewProps = $props();

  // ---------------------------------------------------------------------------
  // Types & Constants
  // ---------------------------------------------------------------------------

  type ResourceTab = 'All' | 'Collection' | 'Manifest' | 'Canvas' | 'All Entities';

  interface ColumnDef {
    key: string;
    label: string;
    editable: boolean;
    group: 'core' | 'descriptive' | 'custom';
  }

  interface ColumnGroup {
    label: string;
    columns: ColumnDef[];
  }

  interface FlatItem {
    id: string;
    type: string;
    label: string;
    summary: string;
    rights: string;
    navDate: string;
    metadata: Record<string, string>;
    _source: IIIFItem;
  }

  const COLUMN_WIDTHS: Record<string, string> = {
    id: '200px',
    type: '100px',
    label: '250px',
    summary: '300px',
    rights: '180px',
    navDate: '150px',
  };

  const DEFAULT_COLUMN_WIDTH = '150px';

  function getColumnWidth(key: string): string {
    return COLUMN_WIDTHS[key] ?? DEFAULT_COLUMN_WIDTH;
  }

  // ---------------------------------------------------------------------------
  // Local State
  // ---------------------------------------------------------------------------

  let filter = $state('');
  let activeTab = $state<ResourceTab>('All');
  let hasUnsavedChanges = $state(false);
  let editingCell = $state<{ itemId: string; column: string } | null>(null);
  let editInputRef: HTMLInputElement | undefined = $state();

  // ---------------------------------------------------------------------------
  // Tab configuration
  // ---------------------------------------------------------------------------

  const tabs = $derived.by(() => {
    const base: { value: ResourceTab; label: string }[] = [
      { value: 'All', label: 'All Items' },
      { value: 'Collection', label: 'Collections' },
      { value: 'Manifest', label: 'Manifests' },
      { value: 'Canvas', label: 'Items' },
    ];
    if (abstractionLevel === 'advanced') {
      base.push({ value: 'All Entities', label: 'All Entities' });
    }
    return base;
  });

  // ---------------------------------------------------------------------------
  // Derived: Flatten, filter, extract columns
  // ---------------------------------------------------------------------------

  /** Flatten the IIIF tree into a flat array of editable items */
  const allItems = $derived.by((): FlatItem[] => {
    if (!root) return [];
    return flattenTree(root, activeTab);
  });

  /** Apply pipeline/prop ID filter */
  const idFilteredItems = $derived.by((): FlatItem[] => {
    if (!filterIds || filterIds.length === 0) return allItems;
    return allItems.filter((item) => filterIds!.includes(item.id));
  });

  /** Apply text search filter */
  const filteredItems = $derived.by((): FlatItem[] => {
    if (!filter) return idFilteredItems;
    const lower = filter.toLowerCase();
    return idFilteredItems.filter((item) =>
      item.label.toLowerCase().includes(lower) ||
      item.id.toLowerCase().includes(lower) ||
      item.type.toLowerCase().includes(lower) ||
      item.summary.toLowerCase().includes(lower) ||
      Object.values(item.metadata).some((v) => v.toLowerCase().includes(lower))
    );
  });

  /** Dynamically extract column definitions from items */
  const columns = $derived.by((): ColumnDef[] => {
    const cols: ColumnDef[] = [
      { key: 'id', label: 'ID', editable: false, group: 'core' },
      { key: 'type', label: 'Type', editable: false, group: 'core' },
      { key: 'label', label: 'Label', editable: true, group: 'core' },
    ];

    // Check if any item has summary, rights, navDate
    const hasSummary = filteredItems.some((i) => i.summary);
    const hasRights = filteredItems.some((i) => i.rights);
    const hasNavDate = filteredItems.some((i) => i.navDate);

    if (hasSummary) cols.push({ key: 'summary', label: 'Summary', editable: true, group: 'descriptive' });
    if (hasRights) cols.push({ key: 'rights', label: 'Rights', editable: true, group: 'descriptive' });
    if (hasNavDate) cols.push({ key: 'navDate', label: 'Nav Date', editable: true, group: 'descriptive' });

    // Collect custom metadata keys across all items
    const customKeys = new Set<string>();
    for (const item of filteredItems) {
      for (const key of Object.keys(item.metadata)) {
        customKeys.add(key);
      }
    }
    for (const key of [...customKeys].sort()) {
      cols.push({ key, label: key, editable: true, group: 'custom' });
    }

    return cols;
  });

  /** Group columns for header rendering */
  const columnGroups = $derived.by((): ColumnGroup[] => {
    const groups: ColumnGroup[] = [];
    const core = columns.filter((c) => c.group === 'core');
    const desc = columns.filter((c) => c.group === 'descriptive');
    const custom = columns.filter((c) => c.group === 'custom');

    if (core.length > 0) groups.push({ label: 'Core', columns: core });
    if (desc.length > 0) groups.push({ label: 'Descriptive', columns: desc });
    if (custom.length > 0) groups.push({ label: `Custom (${custom.length})`, columns: custom });

    return groups;
  });

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Warn before unload if unsaved changes
  $effect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  });

  // Auto-focus input when editingCell changes
  $effect(() => {
    if (editingCell && editInputRef) {
      editInputRef.focus();
      editInputRef.select();
    }
  });

  // ---------------------------------------------------------------------------
  // Tree Helpers
  // ---------------------------------------------------------------------------

  function flattenTree(item: IIIFItem, tab: ResourceTab): FlatItem[] {
    const results: FlatItem[] = [];
    collectItems(item, results, tab);
    return results;
  }

  function collectItems(item: IIIFItem, out: FlatItem[], tab: ResourceTab): void {
    const shouldInclude =
      tab === 'All'
        ? ['Collection', 'Manifest', 'Canvas'].includes(item.type)
        : tab === 'All Entities'
          ? true
          : item.type === tab;

    if (shouldInclude) {
      out.push(flattenItem(item));
    }

    if (item.items && Array.isArray(item.items)) {
      for (const child of item.items) {
        if (child && typeof child === 'object' && 'id' in child) {
          collectItems(child as IIIFItem, out, tab);
        }
      }
    }
  }

  function flattenItem(item: IIIFItem): FlatItem {
    const metadataMap: Record<string, string> = {};
    if (item.metadata) {
      for (const pair of item.metadata) {
        const key = getIIIFValue(pair.label);
        const value = getIIIFValue(pair.value);
        if (key) metadataMap[key] = value;
      }
    }

    return {
      id: item.id,
      type: item.type,
      label: getIIIFValue(item.label),
      summary: getIIIFValue(item.summary),
      rights: item.rights ?? '',
      navDate: item.navDate ?? '',
      metadata: metadataMap,
      _source: item,
    };
  }

  /** Get the display value of an item for a given column */
  function getItemValue(item: FlatItem, column: string): string {
    switch (column) {
      case 'id': return item.id;
      case 'type': return item.type;
      case 'label': return item.label;
      case 'summary': return item.summary;
      case 'rights': return item.rights;
      case 'navDate': return item.navDate;
      default: return item.metadata[column] ?? '';
    }
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  function handleCellEdit(itemId: string, column: string, value: string) {
    if (!root) return;

    const updatedRoot = updateItemInTree(root, itemId, column, value);
    hasUnsavedChanges = true;
    onUpdate(updatedRoot);
  }

  function updateItemInTree(node: IIIFItem, itemId: string, column: string, value: string): IIIFItem {
    if (node.id === itemId) {
      const updated = { ...node };

      if (column === 'label') {
        updated.label = { en: [value] };
      } else if (column === 'summary') {
        updated.summary = { en: [value] };
      } else if (column === 'rights') {
        updated.rights = value || undefined;
      } else if (column === 'navDate') {
        updated.navDate = value || undefined;
      } else {
        // Custom metadata field
        const metadata = [...(updated.metadata || [])];
        const existingIndex = metadata.findIndex((m) => {
          const mLabel = getIIIFValue(m.label);
          return mLabel.toLowerCase() === column.toLowerCase();
        });

        if (existingIndex >= 0) {
          metadata[existingIndex] = {
            label: { en: [column] },
            value: { en: [value] },
          };
        } else if (value) {
          metadata.push({
            label: { en: [column] },
            value: { en: [value] },
          });
        }
        updated.metadata = metadata;
      }

      return updated;
    }

    // Recurse into children
    if (node.items && Array.isArray(node.items)) {
      return {
        ...node,
        items: node.items.map((child: IIIFItem) => updateItemInTree(child, itemId, column, value)),
      };
    }

    return node;
  }

  function handleCellKeyDown(e: KeyboardEvent, itemId: string, column: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.currentTarget as HTMLInputElement;
      handleCellEdit(itemId, column, target.value);
      editingCell = null;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editingCell = null;
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget as HTMLInputElement;
      handleCellEdit(itemId, column, target.value);
      // Move to next editable column
      const editableCols = columns.filter((c) => c.editable);
      const currentIdx = editableCols.findIndex((c) => c.key === column);
      if (currentIdx >= 0 && currentIdx < editableCols.length - 1) {
        editingCell = { itemId, column: editableCols[currentIdx + 1].key };
      } else {
        editingCell = null;
      }
    }
  }

  function handleExportCSV() {
    const headers = columns.map((c) => c.label);
    const rows = filteredItems.map((item) =>
      columns.map((col) => {
        const val = getItemValue(item, col.key);
        // Escape CSV values
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
    );

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `metadata-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleSave() {
    if (root) {
      onUpdate(root);
    }
    hasUnsavedChanges = false;
  }

  function handleClearPipeline() {
    onClearFilter?.();
  }

  function startEditing(itemId: string, column: string) {
    const col = columns.find((c) => c.key === column);
    if (col?.editable) {
      editingCell = { itemId, column };
    }
  }
</script>

<PaneLayout variant="default">
  <!-- Pipeline banner (conditional) -->
  {#snippet header()}
    {#if filterIds && filterIds.length > 0}
      <div class={cn(
        'px-3 py-2 flex items-center gap-2 text-sm border-b',
        cx.warningBg || (fieldMode ? 'bg-nb-orange/20 border-nb-orange' : 'bg-nb-blue/10 border-nb-blue/30')
      )}>
        <span class={cn('font-mono text-xs', cx.text)}>
          Showing {filterIds.length} filtered item{filterIds.length === 1 ? '' : 's'} from pipeline
        </span>
        {#if onClearFilter}
          <Button size="sm" variant="ghost" onclick={handleClearPipeline}>
            Clear filter
          </Button>
        {/if}
      </div>
    {/if}

    <ViewHeader {cx}>
      {#snippet title()}
        <span class={cn('font-mono uppercase text-sm font-semibold', cx.text)}>
          Metadata
        </span>
      {/snippet}

      {#snippet subbar()}
        <Row gap="sm" align="center" wrap class="flex-1">
          <!-- Tab pills -->
          <div class={cn('flex p-0.5', fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-cream')} role="radiogroup" aria-label="Resource type">
            {#each tabs as tab (tab.value)}
              <button
                type="button"
                class={cn(
                  'px-2.5 py-1 text-xs font-medium border-0 cursor-pointer',
                  activeTab === tab.value
                    ? (fieldMode
                      ? 'bg-nb-yellow text-nb-black font-bold'
                      : 'bg-nb-black text-nb-white font-bold')
                    : (fieldMode
                      ? 'bg-transparent text-nb-yellow/40 hover:text-nb-yellow'
                      : 'bg-transparent text-nb-black/60 hover:text-nb-black')
                )}
                onclick={() => { activeTab = tab.value; }}
                aria-checked={activeTab === tab.value}
                role="radio"
              >
                {tab.label}
              </button>
            {/each}
          </div>

          <!-- Filter input -->
          <FilterInput
            bind:value={filter}
            placeholder="Filter metadata..."
            {cx}
            class="w-48"
          />

          <!-- ID filter indicator -->
          {#if filterIds && filterIds.length > 0 && onClearFilter}
            <div class={cn(
              'flex items-center gap-2 px-2 py-1 text-xs',
              fieldMode ? 'bg-nb-blue/30 text-nb-blue/60' : 'bg-nb-blue/10 text-nb-blue'
            )}>
              <span>{filterIds.length} selected</span>
              <button
                type="button"
                class="hover:underline font-medium border-0 bg-transparent cursor-pointer text-inherit"
                onclick={onClearFilter}
              >
                Clear
              </button>
            </div>
          {/if}

          <div class="flex-1"></div>

          <!-- Export CSV -->
          <Button size="sm" variant="secondary" onclick={handleExportCSV}>
            Export CSV
          </Button>
        </Row>
      {/snippet}
    </ViewHeader>
  {/snippet}

  {#snippet body()}
    {#if !root}
      <!-- Empty state: no root -->
      <div class={cn('flex items-center justify-center h-full p-8', cx.surface)}>
        <div class={cn('text-center', fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/60')}>
          <div class={cn(
            'w-16 h-16 mx-auto mb-4 flex items-center justify-center',
            fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-cream'
          )}>
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2">No Archive Loaded</h3>
          <p class="text-sm">Import files or open a collection to start editing metadata</p>
        </div>
      </div>
    {:else if filteredItems.length === 0}
      <!-- Empty state: no matches -->
      <div class={cn('flex items-center justify-center h-full p-8', cx.surface)}>
        <div class={cn('text-center', fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/60')}>
          <h3 class="text-lg font-semibold mb-2">
            {filter ? 'No Matches Found' : 'No Items'}
          </h3>
          <p class="text-sm mb-4">
            {filter
              ? `No items match "${filter}". Try adjusting your search.`
              : 'This collection has no items of the selected type.'}
          </p>
          {#if filter}
            <Button size="sm" variant="secondary" onclick={() => { filter = ''; }}>
              Clear Filter
            </Button>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Spreadsheet table -->
      <div class={cn('overflow-auto flex-1', fieldMode ? 'bg-nb-black' : 'bg-nb-white', 'border', cx.border)}>
        <table class="w-full text-sm border-collapse" role="grid" aria-label="Metadata editor">
          <!-- Grouped column headers (row 1) -->
          <thead class={cn('sticky top-0 z-10', fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-white')}>
            <tr>
              <!-- Row number header -->
              <th
                class={cn(
                  'px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider border-b w-12 min-w-[48px]',
                  cx.textMuted, cx.border
                )}
              >
                #
              </th>
              {#each columnGroups as group (group.label)}
                <th
                  colspan={group.columns.length}
                  class={cn(
                    'px-4 py-2 text-center text-[9px] font-semibold uppercase tracking-wider border-b',
                    cx.textMuted, cx.border,
                    fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-cream/50'
                  )}
                >
                  {group.label}
                </th>
              {/each}
            </tr>

            <!-- Individual column names (row 2) -->
            <tr class={fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-white'}>
              <th class={cn('px-3 py-2 border-b w-12', cx.border)}></th>
              {#each columns as col (col.key)}
                <th
                  class={cn(
                    'px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider border-b whitespace-nowrap',
                    cx.textMuted, cx.border,
                    col.key === 'label' ? (fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-cream') : ''
                  )}
                  style="width: {getColumnWidth(col.key)}; min-width: {getColumnWidth(col.key)}"
                  scope="col"
                >
                  <span class="truncate block max-w-[150px]" title={col.label}>
                    {col.label}
                  </span>
                </th>
              {/each}
            </tr>
          </thead>

          <tbody class={cx.text}>
            {#each filteredItems as item, rowIndex (item.id)}
              <tr class={cn(
                'border-b transition-nb',
                cx.border,
                fieldMode ? 'hover:bg-nb-yellow/10' : 'hover:bg-nb-cream/50'
              )}>
                <!-- Row number -->
                <td class={cn('px-3 py-2 text-xs tabular-nums', cx.textMuted)}>
                  {rowIndex + 1}
                </td>

                {#each columns as col (col.key)}
                  <td
                    class={cn(
                      'px-4 py-2 border-b',
                      cx.border,
                      col.key === 'label' ? (fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-cream/50') : '',
                      editingCell?.itemId === item.id && editingCell?.column === col.key
                        ? (cx.selected || (fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-blue/10'))
                        : ''
                    )}
                    style="width: {getColumnWidth(col.key)}; min-width: {getColumnWidth(col.key)}"
                    role="gridcell"
                    aria-label="{col.label} for {item.label || item.id}"
                    onclick={() => startEditing(item.id, col.key)}
                  >
                    {#if editingCell?.itemId === item.id && editingCell?.column === col.key}
                      <!-- Editing mode -->
                      <input
                        bind:this={editInputRef}
                        type="text"
                        value={getItemValue(item, col.key)}
                        onblur={(e) => {
                          handleCellEdit(item.id, col.key, (e.currentTarget as HTMLInputElement).value);
                          editingCell = null;
                        }}
                        onkeydown={(e) => handleCellKeyDown(e, item.id, col.key)}
                        class={cn(
                          'w-full px-2 py-1 text-sm border outline-none focus:ring-2 focus:ring-nb-blue/20',
                          fieldMode
                            ? 'bg-nb-yellow/20 border-nb-yellow text-nb-yellow focus:border-nb-yellow'
                            : 'bg-nb-white border-nb-black/20 text-nb-black focus:border-nb-blue'
                        )}
                      />
                    {:else if col.key === 'id'}
                      <!-- ID: monospace truncated -->
                      <code
                        class={cn('text-[10px] truncate block font-mono', cx.textMuted)}
                        title={item.id}
                      >
                        {item.id.split('/').pop() || item.id}
                      </code>
                    {:else if col.key === 'type'}
                      <!-- Type: badge -->
                      <span class={cn(
                        'inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase',
                        fieldMode ? 'bg-nb-yellow/20 text-nb-yellow/80' : 'bg-nb-cream text-nb-black/60'
                      )}>
                        {item.type}
                      </span>
                    {:else}
                      <!-- Regular display value -->
                      {@const cellValue = getItemValue(item, col.key)}
                      <span
                        class={cn(
                          col.key === 'label' ? 'font-medium' : '',
                          col.group === 'custom' || col.key === 'summary' ? 'truncate block max-w-[200px]' : '',
                          !cellValue ? 'italic opacity-40' : '',
                          cx.text
                        )}
                        title={cellValue}
                      >
                        {cellValue || '-'}
                      </span>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/snippet}

  {#snippet footer()}
    <div class={cn(
      'flex items-center justify-between px-4 py-3 border-t',
      cx.border,
      fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-white'
    )}>
      <div class={cn('text-xs', cx.textMuted)} aria-live="polite">
        {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        {#if filter && allItems.length !== filteredItems.length}
          <span> (filtered from {allItems.length})</span>
        {/if}
      </div>

      {#if hasUnsavedChanges}
        <div class="flex items-center gap-3">
          <span class="text-xs text-nb-orange font-medium">
            Unsaved changes
          </span>
          <Button size="sm" variant="primary" onclick={handleSave}>
            Save Changes
          </Button>
        </div>
      {/if}
    </div>
  {/snippet}
</PaneLayout>
