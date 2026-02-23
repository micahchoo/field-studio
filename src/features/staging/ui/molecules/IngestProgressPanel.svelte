<!--
  IngestProgressPanel Molecule

  Visual progress display for ingest operations.
  3 variants: full, compact, minimal.

  Ported from: src/features/staging/ui/molecules/IngestProgressPanel.tsx (540 lines)

  Architecture:
  - Static config maps in <script module> (STAGE_CONFIG, FILE_STATUS_CONFIG, LOG_LEVEL_CONFIG)
  - Helper sub-components as Svelte snippets: progressBar, stageIndicator, fileStatusBadge, logEntry, fileListItem
  - $state for showLog, showFiles toggles
  - $derived for stats computation
  - Variant-based rendering (minimal/compact/full)
  - cx/fieldMode theming
-->
<script module lang="ts">
  import type { FileStatus, IngestActivityLogEntry, IngestFileInfo, IngestProgress, IngestStage } from '@/src/shared/types';
  import type { IngestControls } from '@/src/shared/lib/hooks/useIngestProgress';

  export const STAGE_CONFIG: Record<IngestStage, { icon: string; label: string; color: string }> = {
    scanning:   { icon: 'search',       label: 'Scanning files...',          color: 'text-nb-blue' },
    analyzing:  { icon: 'analytics',    label: 'Analyzing files...',         color: 'text-nb-blue' },
    processing: { icon: 'memory',       label: 'Processing files...',        color: 'text-nb-blue' },
    building:   { icon: 'build',        label: 'Building manifests...',      color: 'text-nb-orange' },
    finalizing: { icon: 'save',         label: 'Saving to storage...',       color: 'text-nb-orange' },
    complete:   { icon: 'check_circle', label: 'Complete!',                  color: 'text-nb-green' },
    cancelled:  { icon: 'cancel',       label: 'Cancelled',                  color: 'text-nb-black/50' },
    error:      { icon: 'error',        label: 'Error occurred',             color: 'text-nb-red' },
  };

  export const FILE_STATUS_CONFIG: Record<FileStatus, { icon: string; color: string; label: string }> = {
    pending:    { icon: 'hourglass_empty', color: 'text-nb-black/40', label: 'Pending' },
    processing: { icon: 'sync',            color: 'text-nb-blue',     label: 'Processing' },
    completed:  { icon: 'check_circle',    color: 'text-nb-green',    label: 'Completed' },
    complete:   { icon: 'check_circle',    color: 'text-nb-green',    label: 'Complete' },
    error:      { icon: 'error',           color: 'text-nb-red',      label: 'Error' },
    skipped:    { icon: 'skip_next',       color: 'text-nb-orange',   label: 'Skipped' },
  };

  export const LOG_LEVEL_CONFIG: Record<IngestActivityLogEntry['level'], { icon: string; color: string }> = {
    info:    { icon: 'info',    color: 'text-nb-blue' },
    warn:    { icon: 'warning', color: 'text-nb-orange' },
    error:   { icon: 'error',  color: 'text-nb-red' },
  };
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { formatETA, formatSpeed } from '@/src/shared/lib/hooks/useIngestProgress';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import EmptyState from '@/src/shared/ui/molecules/EmptyState.svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    /** Current progress state */
    progress: IngestProgress | null;
    /** Control functions */
    controls: IngestControls;
    /** Visual variant */
    variant?: 'full' | 'compact' | 'minimal';
    /** Whether to show the activity log by default */
    showLogByDefault?: boolean;
    /** Whether to show the file list by default */
    showFilesByDefault?: boolean;
    /** Callback when user clicks retry on a failed file */
    onRetryFile?: (fileId: string) => void;
    /** Callback when ingest is cancelled */
    oncancel?: () => void;
    /** Additional CSS classes */
    class?: string;
    /** Contextual styles */
    cx?: Partial<ContextualClassNames>;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    progress,
    controls,
    variant = 'full',
    showLogByDefault = false,
    showFilesByDefault = false,
    onRetryFile,
    oncancel,
    class: className = '',
    cx,
    fieldMode = false,
  }: Props = $props();

  // -- Internal State --
  let showLog = $state(showLogByDefault);
  let showFiles = $state(showFilesByDefault);

  // -- Derived --
  let stats = $derived.by(() => {
    if (!progress) return null;
    return {
      completedPercent: progress.filesTotal > 0
        ? Math.round((progress.filesCompleted / progress.filesTotal) * 100)
        : 0,
      hasErrors: progress.filesError > 0,
      hasFailedFiles: progress.files.some(f => f.status === 'error'),
      recentLog: progress.activityLog.slice(-5),
    };
  });

  let isTerminal = $derived(
    progress?.stage === 'complete' || progress?.stage === 'cancelled' || progress?.stage === 'error'
  );

  let pendingFiles = $derived(progress?.files.filter(f => f.status === 'pending') ?? []);
  let processingFiles = $derived(progress?.files.filter(f => f.status === 'processing') ?? []);
  let completedFiles = $derived(progress?.files.filter(f => f.status === 'completed') ?? []);
  let errorFiles = $derived(progress?.files.filter(f => f.status === 'error') ?? []);

  // -- Handlers --
  function handleCancel() {
    controls.cancel();
    oncancel?.();
  }
</script>

<!-- ===== Snippets ===== -->

{#snippet progressBar(percent: number, extraClass?: string)}
  <div class={cn('relative h-2 bg-nb-cream/80 overflow-hidden', extraClass)}>
    <div
      class="absolute top-0 left-0 h-full bg-gradient-to-r from-nb-blue/100 to-blue-400 transition-nb ease-out"
      style:width="{Math.min(100, Math.max(0, percent))}%"
    ></div>
  </div>
{/snippet}

{#snippet stageIndicator(stage: IngestStage)}
  {@const config = STAGE_CONFIG[stage]}
  <div class="flex items-center gap-2">
    <Icon name={config.icon} class={cn('text-lg', config.color, stage === 'processing' ? 'animate-pulse' : '')} />
    <span class={cn('font-medium', config.color)}>{config.label}</span>
  </div>
{/snippet}

{#snippet fileStatusBadge(status: FileStatus)}
  {@const config = FILE_STATUS_CONFIG[status]}
  <div class={cn('flex items-center gap-1 text-xs', config.color)}>
    <Icon name={config.icon} class={cn('text-sm', status === 'processing' ? 'animate-spin' : '')} />
    <span>{config.label}</span>
  </div>
{/snippet}

{#snippet logEntryRow(entry: IngestActivityLogEntry)}
  {@const config = LOG_LEVEL_CONFIG[entry.level]}
  {@const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
  <div class="flex items-start gap-2 py-1.5 px-2 hover:bg-nb-cream/50 transition-nb">
    <Icon name={config.icon} class={cn('text-sm mt-0.5 shrink-0', config.color)} />
    <div class="flex-1 min-w-0">
      <p class="text-sm text-nb-black/70 truncate">{entry.message}</p>
      <p class="text-xs text-nb-black/40">{time}</p>
    </div>
  </div>
{/snippet}

{#snippet fileListItem(file: IngestFileInfo, retryFn?: () => void)}
  <div class="flex items-center justify-between py-2 px-3 hover:bg-nb-cream/50 transition-nb">
    <div class="flex items-center gap-3 min-w-0 flex-1">
      {@render fileStatusBadge(file.status)}
      <div class="min-w-0 flex-1">
        <p class="text-sm text-nb-black/70 truncate" title={file.name}>
          {file.name}
        </p>
        {#if file.error}
          <p class="text-xs text-nb-red truncate" title={file.error}>
            {file.error}
          </p>
        {/if}
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      {#if file.status === 'processing'}
        <div class="w-16 h-1 bg-nb-cream overflow-hidden">
          <div
            class="h-full bg-nb-blue transition-nb"
            style:width="{file.progress}%"
          ></div>
        </div>
      {/if}
      {#if file.status === 'error' && retryFn}
        <Button variant="ghost" size="bare"
          onclick={retryFn}
          class="p-1 hover:bg-nb-cream transition-nb"
          title="Retry"
        >
          <Icon name="refresh" class="text-sm text-nb-black/50" />
        </Button>
      {/if}
    </div>
  </div>
{/snippet}

<!-- ===== Template ===== -->

{#if variant === 'minimal'}
  <!-- MINIMAL VARIANT: bar + percentage only -->
  {#if progress}
    <div class={cn('bg-nb-white p-3 shadow-brutal-sm border border-nb-black/20', className)}>
      <div class="flex items-center justify-between mb-2">
        {@render stageIndicator(progress.stage)}
        <span class="text-sm font-medium text-nb-black/50">
          {progress.overallProgress}%
        </span>
      </div>
      {@render progressBar(progress.overallProgress)}
    </div>
  {/if}

{:else if variant === 'compact'}
  <!-- COMPACT VARIANT: key stats without expandable sections -->
  {#if progress}
    <div class={cn('bg-nb-white p-4 shadow-brutal-sm border border-nb-black/20', className)}>
      <div class="flex items-center justify-between mb-3">
        {@render stageIndicator(progress.stage)}
        <div class="flex items-center gap-2">
          {#if !progress.isPaused && !isTerminal}
            <Button variant="ghost" size="bare"
              onclick={() => controls.pause()}
              class="p-1.5 hover:bg-nb-cream transition-nb"
              title="Pause"
            >
              <Icon name="pause" class="text-sm text-nb-black/50" />
            </Button>
          {/if}
          {#if progress.isPaused}
            <Button variant="ghost" size="bare"
              onclick={() => controls.resume()}
              class="p-1.5 hover:bg-nb-cream transition-nb"
              title="Resume"
            >
              <Icon name="play_arrow" class="text-sm text-nb-green" />
            </Button>
          {/if}
          {#if !isTerminal}
            <Button variant="ghost" size="bare"
              onclick={handleCancel}
              class="p-1.5 hover:bg-nb-cream transition-nb"
              title="Cancel"
            >
              <Icon name="cancel" class="text-sm text-nb-red" />
            </Button>
          {/if}
        </div>
      </div>

      {@render progressBar(progress.overallProgress, 'mb-3')}

      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-2xl font-bold text-nb-black/70">
            {progress.filesCompleted}<span class="text-sm font-normal text-nb-black/40"> / {progress.filesTotal}</span>
          </p>
          <p class="text-xs text-nb-black/50">Files</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-nb-black/70">
            {formatSpeed(progress.speed)}
          </p>
          <p class="text-xs text-nb-black/50">Speed</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-nb-black/70">
            {formatETA(progress.etaSeconds)}
          </p>
          <p class="text-xs text-nb-black/50">ETA</p>
        </div>
      </div>

      {#if progress.filesError > 0}
        <div class="mt-3 p-2 bg-nb-red/10 flex items-center gap-2">
          <Icon name="error" class="text-nb-red" />
          <span class="text-sm text-nb-red">
            {progress.filesError} file(s) failed
          </span>
        </div>
      {/if}
    </div>
  {/if}

{:else}
  <!-- FULL VARIANT: all features -->
  {#if !progress}
    <EmptyState
      icon="hourglass_empty"
      title="No Active Ingest"
      description="Start an ingest operation to see progress here"
      cx={{ surface: '', text: 'text-nb-black', accent: 'text-nb-blue', textMuted: 'text-nb-black/50' }}
    />
  {:else}
    <div class={cn('bg-nb-white shadow-brutal-sm border border-nb-black/20 overflow-hidden', className)}>
      <!-- Header -->
      <div class="p-4 border-b border-nb-black/20">
        <div class="flex items-center justify-between mb-3">
          {@render stageIndicator(progress.stage)}
          <div class="flex items-center gap-1">
            {#if !progress.isPaused && !isTerminal}
              <Button variant="ghost" size="bare"
                onclick={() => controls.pause()}
                class="p-2 hover:bg-nb-cream transition-nb"
                title="Pause"
              >
                <Icon name="pause" class="text-nb-black/50" />
              </Button>
            {/if}
            {#if progress.isPaused}
              <Button variant="ghost" size="bare"
                onclick={() => controls.resume()}
                class="p-2 hover:bg-nb-cream transition-nb"
                title="Resume"
              >
                <Icon name="play_arrow" class="text-nb-green" />
              </Button>
            {/if}
            {#if !isTerminal}
              <Button variant="ghost" size="bare"
                onclick={handleCancel}
                class="p-2 hover:bg-nb-cream transition-nb"
                title="Cancel"
              >
                <Icon name="cancel" class="text-nb-red" />
              </Button>
            {/if}
          </div>
        </div>

        <!-- Main Progress -->
        <div class="flex items-center gap-4">
          <div class="flex-1">
            {@render progressBar(progress.overallProgress)}
          </div>
          <span class="text-lg font-bold text-nb-black/70 w-12 text-right">
            {progress.overallProgress}%
          </span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-nb-black/20 bg-nb-cream">
        <div class="text-center">
          <p class="text-2xl font-bold text-nb-black/70">
            {progress.filesCompleted}<span class="text-sm font-normal text-nb-black/40">/{progress.filesTotal}</span>
          </p>
          <p class="text-xs text-nb-black/50 uppercase tracking-wide">Files</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-nb-black/70">
            {formatSpeed(progress.speed)}
          </p>
          <p class="text-xs text-nb-black/50 uppercase tracking-wide">Speed</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-nb-black/70">
            {formatETA(progress.etaSeconds)}
          </p>
          <p class="text-xs text-nb-black/50 uppercase tracking-wide">ETA</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-nb-black/70">
            {#if progress.filesError > 0}
              <span class="text-nb-red">{progress.filesError}</span>
            {:else}
              0
            {/if}
          </p>
          <p class="text-xs text-nb-black/50 uppercase tracking-wide">Errors</p>
        </div>
      </div>

      <!-- Current File -->
      {#if progress.currentFile && progress.stage === 'processing'}
        <div class="px-4 py-3 border-b border-nb-black/20">
          <p class="text-xs text-nb-black/50 uppercase tracking-wide mb-1">Current File</p>
          <div class="flex items-center gap-3">
            <Icon name="image" class="text-nb-black/40" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-nb-black/70 truncate">
                {progress.currentFile.name}
              </p>
              <p class="text-xs text-nb-black/50">
                {(progress.currentFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div class="w-24">
              {@render progressBar(progress.currentFile.progress)}
            </div>
          </div>
        </div>
      {/if}

      <!-- Activity Log -->
      <div class="border-b border-nb-black/20">
        <Button variant="ghost" size="bare"
          onclick={() => showLog = !showLog}
          class="w-full px-4 py-3 flex items-center justify-between hover:bg-nb-cream/50 transition-nb"
        >
          <div class="flex items-center gap-2">
            <Icon name="history" class="text-nb-black/40" />
            <span class="font-medium text-nb-black/70">Activity Log</span>
            <span class="text-xs text-nb-black/40">({progress.activityLog.length} entries)</span>
          </div>
          <Icon
            name={showLog ? 'expand_less' : 'expand_more'}
            class="text-nb-black/40 transition-transform"
          />
        </Button>

        {#if showLog}
          <div class="max-h-48 overflow-y-auto">
            {#if progress.activityLog.length === 0}
              <p class="px-4 py-3 text-sm text-nb-black/40 italic">No activity yet</p>
            {:else}
              {#each progress.activityLog.slice().reverse() as entry, idx (`${entry.timestamp}-${idx}`)}
                {@render logEntryRow(entry)}
              {/each}
            {/if}
          </div>
        {/if}
      </div>

      <!-- File List -->
      <div>
        <Button variant="ghost" size="bare"
          onclick={() => showFiles = !showFiles}
          class="w-full px-4 py-3 flex items-center justify-between hover:bg-nb-cream/50 transition-nb"
        >
          <div class="flex items-center gap-2">
            <Icon name="folder_open" class="text-nb-black/40" />
            <span class="font-medium text-nb-black/70">Files</span>
            <div class="flex items-center gap-1 text-xs">
              {#if completedFiles.length > 0}
                <span class="px-1.5 py-0.5 bg-nb-green/20 text-nb-green rounded">
                  {completedFiles.length}
                </span>
              {/if}
              {#if processingFiles.length > 0}
                <span class="px-1.5 py-0.5 bg-nb-blue/20 text-nb-blue rounded">
                  {processingFiles.length}
                </span>
              {/if}
              {#if errorFiles.length > 0}
                <span class="px-1.5 py-0.5 bg-nb-red/20 text-nb-red rounded">
                  {errorFiles.length}
                </span>
              {/if}
              {#if pendingFiles.length > 0}
                <span class="px-1.5 py-0.5 bg-nb-cream text-nb-black/60 rounded">
                  {pendingFiles.length}
                </span>
              {/if}
            </div>
          </div>
          <Icon
            name={showFiles ? 'expand_less' : 'expand_more'}
            class="text-nb-black/40 transition-transform"
          />
        </Button>

        {#if showFiles}
          <div class="max-h-64 overflow-y-auto">
            {#if progress.files.length === 0}
              <p class="px-4 py-3 text-sm text-nb-black/40 italic">No files to process</p>
            {:else}
              <div class="divide-y divide-nb-black/10">
                <!-- Error files first -->
                {#each errorFiles as file (file.id)}
                  {@render fileListItem(file, onRetryFile ? () => onRetryFile(file.id) : undefined)}
                {/each}
                <!-- Then processing -->
                {#each processingFiles as file (file.id)}
                  {@render fileListItem(file)}
                {/each}
                <!-- Then completed -->
                {#each completedFiles as file (file.id)}
                  {@render fileListItem(file)}
                {/each}
                <!-- Then pending -->
                {#each pendingFiles as file (file.id)}
                  {@render fileListItem(file)}
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
