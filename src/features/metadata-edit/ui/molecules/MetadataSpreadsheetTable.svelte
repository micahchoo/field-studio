<!--
  MetadataSpreadsheetTable -- Spreadsheet table with grouped headers, inline cell editing.
  Extracted from MetadataView organism.
  Architecture: Molecule (Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  export interface ColumnDef {
    key: string;
    label: string;
    editable: boolean;
    group: 'core' | 'descriptive' | 'custom';
  }

  export interface ColumnGroup {
    label: string;
    columns: ColumnDef[];
  }

  export interface FlatItem {
    id: string;
    type: string;
    label: string;
    summary: string;
    rights: string;
    navDate: string;
    metadata: Record<string, string>;
    _source: import('@/src/shared/types').IIIFItem;
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    items: FlatItem[];
    columns: ColumnDef[];
    columnGroups: ColumnGroup[];
    editingCell: { itemId: string; column: string } | null;
    cx: ContextualClassNames;
    fieldMode: boolean;
    getColumnWidth: (key: string) => string;
    getItemValue: (item: FlatItem, column: string) => string;
    onStartEditing: (itemId: string, column: string) => void;
    onCellEdit: (itemId: string, column: string, value: string) => void;
    onCellKeyDown: (e: KeyboardEvent, itemId: string, column: string) => void;
    onClearEditing: () => void;
  }

  let {
    items, columns, columnGroups, editingCell, cx, fieldMode,
    getColumnWidth, getItemValue,
    onStartEditing, onCellEdit, onCellKeyDown, onClearEditing,
  }: Props = $props();

  let editInputRef: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (editingCell && editInputRef) {
      editInputRef.focus();
      editInputRef.select();
    }
  });
</script>

<div class={cn('overflow-auto flex-1', fieldMode ? 'bg-nb-black' : 'bg-nb-white', 'border', cx.border)}>
  <table class="w-full text-sm border-collapse" role="grid" aria-label="Metadata editor">
    <!-- Grouped column headers (row 1) -->
    <thead class={cn('sticky top-0 z-10', fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-white')}>
      <tr>
        <th class={cn(
          'px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider border-b w-12 min-w-[48px]',
          cx.textMuted, cx.border
        )}>
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
            <span class="truncate block max-w-[150px]" title={col.label}>{col.label}</span>
          </th>
        {/each}
      </tr>
    </thead>

    <tbody class={cx.text}>
      {#each items as item, rowIndex (item.id)}
        <tr class={cn('border-b transition-nb', cx.border, fieldMode ? 'hover:bg-nb-yellow/10' : 'hover:bg-nb-cream/50')}>
          <td class={cn('px-3 py-2 text-xs tabular-nums', cx.textMuted)}>{rowIndex + 1}</td>
          {#each columns as col (col.key)}
            <td
              class={cn(
                'px-4 py-2 border-b', cx.border,
                col.key === 'label' ? (fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-cream/50') : '',
                editingCell?.itemId === item.id && editingCell?.column === col.key
                  ? (cx.selected || (fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-blue/10'))
                  : ''
              )}
              style="width: {getColumnWidth(col.key)}; min-width: {getColumnWidth(col.key)}"
              role="gridcell"
              aria-label="{col.label} for {item.label || item.id}"
              onclick={() => onStartEditing(item.id, col.key)}
            >
              {#if editingCell?.itemId === item.id && editingCell?.column === col.key}
                <input
                  bind:this={editInputRef}
                  type="text"
                  value={getItemValue(item, col.key)}
                  onblur={(e) => {
                    onCellEdit(item.id, col.key, (e.currentTarget as HTMLInputElement).value);
                    onClearEditing();
                  }}
                  onkeydown={(e) => onCellKeyDown(e, item.id, col.key)}
                  class={cn(
                    'w-full px-2 py-1 text-sm border outline-none focus:ring-2 focus:ring-nb-blue/20',
                    fieldMode
                      ? 'bg-nb-yellow/20 border-nb-yellow text-nb-yellow focus:border-nb-yellow'
                      : 'bg-nb-white border-nb-black/20 text-nb-black focus:border-nb-blue'
                  )}
                />
              {:else if col.key === 'id'}
                <code class={cn('text-[10px] truncate block font-mono', cx.textMuted)} title={item.id}>
                  {item.id.split('/').pop() || item.id}
                </code>
              {:else if col.key === 'type'}
                <span class={cn(
                  'inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase',
                  fieldMode ? 'bg-nb-yellow/20 text-nb-yellow/80' : 'bg-nb-cream text-nb-black/60'
                )}>
                  {item.type}
                </span>
              {:else}
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
