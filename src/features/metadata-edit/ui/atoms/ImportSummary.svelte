<!--
  ImportSummary — CSV import results display with success/warning/error counts.
  React source: src/features/metadata-edit/ui/atoms/ImportSummary.tsx
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  export interface ImportError {
    row: number;
    message: string;
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import ValidationBadge from './ValidationBadge.svelte';

  interface Props {
    totalRows: number;
    successCount: number;
    warningCount?: number;
    errorCount?: number;
    errors?: ImportError[];
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    totalRows,
    successCount,
    warningCount = 0,
    errorCount = 0,
    errors = [],
    cx = {},
    fieldMode = false,
  }: Props = $props();
</script>

<div class={cn('space-y-4', fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black')}>
  <!-- Summary cards grid -->
  <div class="grid grid-cols-3 gap-3">
    <ValidationBadge status="success" value={successCount} label="Imported" {fieldMode} />
    <ValidationBadge status="warning" value={warningCount} label="Warnings" {fieldMode} />
    <ValidationBadge status="error" value={errorCount} label="Errors" {fieldMode} />
  </div>

  <!-- Total row count -->
  <p class={cn('text-sm font-mono', fieldMode ? 'text-nb-yellow/70' : cx.textMuted ?? 'text-nb-black/50')}>
    {totalRows} total row{totalRows !== 1 ? 's' : ''} processed
  </p>

  <!-- Error list -->
  {#if errors.length > 0}
    <div class={cn(
      'border p-3 space-y-1 max-h-40 overflow-y-auto',
      fieldMode
        ? 'border-nb-red/50 bg-nb-red/10'
        : 'border-nb-red/30 bg-nb-red/5'
    )}>
      <p class="text-xs font-bold uppercase tracking-wider font-mono text-nb-red mb-2">Errors</p>
      {#each errors as error (error.row + ':' + error.message)}
        <p class="text-xs font-mono">
          <span class="font-bold text-nb-red">Row {error.row}:</span>
          <span class={fieldMode ? 'text-nb-yellow/80' : cx.text ?? 'text-nb-black/80'}>
            {error.message}
          </span>
        </p>
      {/each}
    </div>
  {/if}
</div>
