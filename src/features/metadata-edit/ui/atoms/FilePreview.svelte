<!--
  FilePreview — CSV data preview table with column/row limits.
  React source: src/features/metadata-edit/ui/atoms/FilePreview.tsx
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    headers: string[];
    rows: Record<string, string>[];
    maxColumns?: number;
    maxRows?: number;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    headers,
    rows,
    maxColumns = 5,
    maxRows = 3,
    cx = {},
    fieldMode = false,
  }: Props = $props();

  let displayHeaders = $derived(headers.slice(0, maxColumns));
  let displayRows = $derived(rows.slice(0, maxRows));
  let hasMoreColumns = $derived(headers.length > maxColumns);
  let hasMoreRows = $derived(rows.length > maxRows);

  let cellClass = $derived(
    cn(
      'px-3 py-1.5 text-xs font-mono border truncate max-w-[160px]',
      fieldMode
        ? 'border-nb-yellow/20 text-nb-yellow'
        : cx.text ?? 'border-nb-black/10 text-nb-black/80'
    )
  );

  let headerCellClass = $derived(
    cn(
      'px-3 py-2 text-xs font-bold uppercase tracking-wider font-mono border text-left',
      fieldMode
        ? 'bg-nb-yellow/20 border-nb-yellow/30 text-nb-yellow'
        : cx.headerBg ?? 'bg-nb-cream border-nb-black/20 text-nb-black'
    )
  );
</script>

<div class="overflow-x-auto">
  <table class={cn(
    'w-full border-collapse border',
    fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/20'
  )}>
    <thead>
      <tr>
        {#each displayHeaders as header (header)}
          <th class={headerCellClass}>{header}</th>
        {/each}
        {#if hasMoreColumns}
          <th class={headerCellClass}>+{headers.length - maxColumns} more</th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each displayRows as row, i (i)}
        <tr>
          {#each displayHeaders as header (header)}
            <td class={cellClass}>{row[header] ?? ''}</td>
          {/each}
          {#if hasMoreColumns}
            <td class={cn(cellClass, 'text-center opacity-50')}>...</td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>

  {#if hasMoreRows}
    <p class={cn(
      'text-xs font-mono mt-2',
      fieldMode ? 'text-nb-yellow/60' : cx.textMuted ?? 'text-nb-black/50'
    )}>
      +{rows.length - maxRows} more row{rows.length - maxRows !== 1 ? 's' : ''}
    </p>
  {/if}
</div>
