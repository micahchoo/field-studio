<!--
  ResultStep — Import results summary with success/warning display.
  React source: src/features/metadata-edit/ui/molecules/ResultStep.tsx (85 lines).
  Architecture: Molecule
-->
<script module lang="ts">
  export interface CSVImportResult {
    totalRows: number;
    successCount: number;
    warningCount?: number;
    errorCount?: number;
    errors?: Array<{ row: number; message: string }>;
    matched: number;
    unmatched: number;
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import ImportSummary from '../atoms/ImportSummary.svelte';

  interface Props {
    result: CSVImportResult;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    result,
    cx = {},
    fieldMode = false,
  }: Props = $props();

  let isSuccess = $derived(
    (result.errorCount ?? 0) === 0 && result.unmatched === 0
  );
</script>

<div class="text-center py-8">
  <div class={cn(
    'w-20 h-20 flex items-center justify-center mx-auto mb-6',
    isSuccess ? 'bg-nb-green/20' : 'bg-nb-orange/20'
  )}>
    <Icon
      name={isSuccess ? 'check_circle' : 'warning'}
      class={cn('text-4xl', isSuccess ? 'text-nb-green' : 'text-nb-orange')}
    />
  </div>

  <h3 class={cn(
    'text-lg font-semibold mb-2',
    fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black'
  )}>
    {isSuccess ? 'Import Complete' : 'Import Completed with Issues'}
  </h3>

  <p class={cn(
    'text-sm mb-6',
    fieldMode ? 'text-nb-yellow/50' : cx.textMuted ?? 'text-nb-black/50'
  )}>
    Processed {result.totalRows} rows{result.matched > 0 ? ` \u2022 ${result.matched} matched` : ''}{result.unmatched > 0 ? ` \u2022 ${result.unmatched} unmatched` : ''}
  </p>

  <ImportSummary
    totalRows={result.totalRows}
    successCount={result.successCount}
    warningCount={result.warningCount}
    errorCount={result.errorCount}
    errors={result.errors}
    {cx}
    {fieldMode}
  />

  <div class={cn(
    'mt-8 text-xs max-w-md mx-auto',
    fieldMode ? 'text-nb-yellow/40' : cx.textMuted ?? 'text-nb-black/40'
  )}>
    <p>
      {isSuccess
        ? 'All metadata has been successfully imported. You can close this dialog.'
        : 'Review the errors above. You may need to adjust your CSV file and try again.'}
    </p>
  </div>
</div>
