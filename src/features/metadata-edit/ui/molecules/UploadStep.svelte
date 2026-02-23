<!--
  UploadStep — File upload step for CSV import wizard.
  React source: src/features/metadata-edit/ui/molecules/UploadStep.tsx (62 lines).
  Architecture: Molecule
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import FileDropZone from '../atoms/FileDropZone.svelte';

  interface Props {
    isLoading: boolean;
    onFileUpload: (file: File) => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    isLoading,
    onFileUpload,
    cx = {},
    fieldMode = false,
  }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 px-6">
  <div class={cn(
    'w-24 h-24 flex items-center justify-center mb-6 shadow-brutal-sm',
    fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-blue/10'
  )}>
    <span class={cn('text-4xl', fieldMode ? 'text-nb-yellow' : 'text-nb-blue')}>
      &#128196;
    </span>
  </div>

  <h3 class={cn(
    'text-lg font-semibold mb-2',
    fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black'
  )}>
    Upload CSV File
  </h3>

  <p class={cn(
    'text-sm text-center max-w-md mb-6',
    fieldMode ? 'text-nb-yellow/50' : cx.textMuted ?? 'text-nb-black/50'
  )}>
    Select a CSV file containing metadata to import. The first row should
    contain column headers.
  </p>

  <FileDropZone
    {isLoading}
    onFileSelect={onFileUpload}
    buttonLabel="Choose CSV File"
    loadingLabel="Processing CSV..."
    {cx}
    {fieldMode}
  />

  <div class={cn('mt-8 text-xs max-w-md', fieldMode ? 'text-nb-yellow/40' : cx.textMuted ?? 'text-nb-black/40')}>
    <p class="mb-1">&bull; Supports .csv files with UTF-8 encoding</p>
    <p class="mb-1">&bull; First row must contain column headers</p>
    <p>&bull; Maximum file size: 10MB</p>
  </div>
</div>
