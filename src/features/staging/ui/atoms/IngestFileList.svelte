<!--
  IngestFileList Atom
  =====================
  Expandable file list with status indicators for ingest progress.
  Groups files by status: error, processing, completed, pending.
  Extracted from IngestProgressPanel molecule.
-->
<script lang="ts">
  import type { FileStatus, IngestFileInfo, IngestProgress } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { FILE_STATUS_CONFIG } from '../molecules/IngestProgressPanel.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    progress: IngestProgress;
    showFiles: boolean;
    onToggleFiles: () => void;
    onRetryFile?: (fileId: string) => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    progress,
    showFiles = $bindable(),
    onToggleFiles,
    onRetryFile,
  }: Props = $props();

  const pendingFiles = $derived(progress.files.filter(f => f.status === 'pending'));
  const processingFiles = $derived(progress.files.filter(f => f.status === 'processing'));
  const completedFiles = $derived(progress.files.filter(f => f.status === 'completed'));
  const errorFiles = $derived(progress.files.filter(f => f.status === 'error'));
</script>

{#snippet fileStatusBadge(status: FileStatus)}
  {@const config = FILE_STATUS_CONFIG[status]}
  <div class={cn('flex items-center gap-1 text-xs', config.color)}>
    <Icon name={config.icon} class={cn('text-sm', status === 'processing' ? 'animate-spin' : '')} />
    <span>{config.label}</span>
  </div>
{/snippet}

{#snippet fileListItem(file: IngestFileInfo, retryFn?: () => void)}
  <div class="flex items-center justify-between py-2 px-3 hover:bg-nb-cream/50 transition-nb">
    <div class="flex items-center gap-3 min-w-0 flex-1">
      {@render fileStatusBadge(file.status)}
      <div class="min-w-0 flex-1">
        <p class="text-sm text-nb-black/70 truncate" title={file.name}>{file.name}</p>
        {#if file.error}
          <p class="text-xs text-nb-red truncate" title={file.error}>{file.error}</p>
        {/if}
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      {#if file.status === 'processing'}
        <div class="w-16 h-1 bg-nb-cream overflow-hidden">
          <div class="h-full bg-nb-blue transition-nb" style:width="{file.progress}%"></div>
        </div>
      {/if}
      {#if file.status === 'error' && retryFn}
        <Button variant="ghost" size="bare" onclick={retryFn} class="p-1 hover:bg-nb-cream transition-nb" title="Retry">
          <Icon name="refresh" class="text-sm text-nb-black/50" />
        </Button>
      {/if}
    </div>
  </div>
{/snippet}

<div>
  <Button variant="ghost" size="bare"
    onclick={onToggleFiles}
    class="w-full px-4 py-3 flex items-center justify-between hover:bg-nb-cream/50 transition-nb"
  >
    <div class="flex items-center gap-2">
      <Icon name="folder_open" class="text-nb-black/40" />
      <span class="font-medium text-nb-black/70">Files</span>
      <div class="flex items-center gap-1 text-xs">
        {#if completedFiles.length > 0}
          <span class="px-1.5 py-0.5 bg-nb-green/20 text-nb-green rounded">{completedFiles.length}</span>
        {/if}
        {#if processingFiles.length > 0}
          <span class="px-1.5 py-0.5 bg-nb-blue/20 text-nb-blue rounded">{processingFiles.length}</span>
        {/if}
        {#if errorFiles.length > 0}
          <span class="px-1.5 py-0.5 bg-nb-red/20 text-nb-red rounded">{errorFiles.length}</span>
        {/if}
        {#if pendingFiles.length > 0}
          <span class="px-1.5 py-0.5 bg-nb-cream text-nb-black/60 rounded">{pendingFiles.length}</span>
        {/if}
      </div>
    </div>
    <Icon name={showFiles ? 'expand_less' : 'expand_more'} class="text-nb-black/40 transition-transform" />
  </Button>

  {#if showFiles}
    <div class="max-h-64 overflow-y-auto">
      {#if progress.files.length === 0}
        <p class="px-4 py-3 text-sm text-nb-black/40 italic">No files to process</p>
      {:else}
        <div class="divide-y divide-nb-black/10">
          {#each errorFiles as file (file.id)}
            {@render fileListItem(file, onRetryFile ? () => onRetryFile(file.id) : undefined)}
          {/each}
          {#each processingFiles as file (file.id)}
            {@render fileListItem(file)}
          {/each}
          {#each completedFiles as file (file.id)}
            {@render fileListItem(file)}
          {/each}
          {#each pendingFiles as file (file.id)}
            {@render fileListItem(file)}
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
