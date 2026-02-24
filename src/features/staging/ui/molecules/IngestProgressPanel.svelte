<!--
  IngestProgressPanel Molecule

  Visual progress display for ingest operations.
  3 variants: full, compact, minimal.

  Architecture:
  - Static config maps in <script module> (STAGE_CONFIG, FILE_STATUS_CONFIG, LOG_LEVEL_CONFIG)
  - Snippets: progressBar, stageIndicator, logEntryRow
  - IngestStats and IngestFileList extracted to atoms
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
  import IngestStats from '../atoms/IngestStats.svelte';
  import IngestFileList from '../atoms/IngestFileList.svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    progress: IngestProgress | null;
    controls: IngestControls;
    variant?: 'full' | 'compact' | 'minimal';
    showLogByDefault?: boolean;
    showFilesByDefault?: boolean;
    onRetryFile?: (fileId: string) => void;
    oncancel?: () => void;
    class?: string;
    cx?: Partial<ContextualClassNames>;
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

  // svelte-ignore state_referenced_locally -- intentional: initial-value capture from prop default
  let showLog = $state(showLogByDefault);
  // svelte-ignore state_referenced_locally -- intentional: initial-value capture from prop default
  let showFiles = $state(showFilesByDefault);

  let isTerminal = $derived(
    progress?.stage === 'complete' || progress?.stage === 'cancelled' || progress?.stage === 'error'
  );

  function handleCancel() {
    controls.cancel();
    oncancel?.();
  }
</script>

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

{#snippet controlButtons()}
  {#if !progress?.isPaused && !isTerminal}
    <Button variant="ghost" size="bare" onclick={() => controls.pause()} class="p-1.5 hover:bg-nb-cream transition-nb" title="Pause">
      <Icon name="pause" class="text-sm text-nb-black/50" />
    </Button>
  {/if}
  {#if progress?.isPaused}
    <Button variant="ghost" size="bare" onclick={() => controls.resume()} class="p-1.5 hover:bg-nb-cream transition-nb" title="Resume">
      <Icon name="play_arrow" class="text-sm text-nb-green" />
    </Button>
  {/if}
  {#if !isTerminal}
    <Button variant="ghost" size="bare" onclick={handleCancel} class="p-1.5 hover:bg-nb-cream transition-nb" title="Cancel">
      <Icon name="cancel" class="text-sm text-nb-red" />
    </Button>
  {/if}
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

{#if variant === 'minimal'}
  {#if progress}
    <div class={cn('bg-nb-white p-3 shadow-brutal-sm border border-nb-black/20', className)}>
      <div class="flex items-center justify-between mb-2">
        {@render stageIndicator(progress.stage)}
        <span class="text-sm font-medium text-nb-black/50">{progress.overallProgress}%</span>
      </div>
      {@render progressBar(progress.overallProgress)}
    </div>
  {/if}

{:else if variant === 'compact'}
  {#if progress}
    <div class={cn('bg-nb-white p-4 shadow-brutal-sm border border-nb-black/20', className)}>
      <div class="flex items-center justify-between mb-3">
        {@render stageIndicator(progress.stage)}
        <div class="flex items-center gap-2">{@render controlButtons()}</div>
      </div>
      {@render progressBar(progress.overallProgress, 'mb-3')}
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-2xl font-bold text-nb-black/70">{progress.filesCompleted}<span class="text-sm font-normal text-nb-black/40"> / {progress.filesTotal}</span></p>
          <p class="text-xs text-nb-black/50">Files</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-nb-black/70">{formatSpeed(progress.speed)}</p>
          <p class="text-xs text-nb-black/50">Speed</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-nb-black/70">{formatETA(progress.etaSeconds)}</p>
          <p class="text-xs text-nb-black/50">ETA</p>
        </div>
      </div>
      {#if progress.filesError > 0}
        <div class="mt-3 p-2 bg-nb-red/10 flex items-center gap-2">
          <Icon name="error" class="text-nb-red" />
          <span class="text-sm text-nb-red">{progress.filesError} file(s) failed</span>
        </div>
      {/if}
    </div>
  {/if}

{:else}
  {#if !progress}
    <EmptyState
      icon="hourglass_empty"
      title="No Active Ingest"
      description="Start an ingest operation to see progress here"
      cx={{ surface: '', text: 'text-nb-black', accent: 'text-nb-blue', textMuted: 'text-nb-black/50' }}
    />
  {:else}
    <div class={cn('bg-nb-white shadow-brutal-sm border border-nb-black/20 overflow-hidden', className)}>
      <div class="p-4 border-b border-nb-black/20">
        <div class="flex items-center justify-between mb-3">
          {@render stageIndicator(progress.stage)}
          <div class="flex items-center gap-1">{@render controlButtons()}</div>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex-1">{@render progressBar(progress.overallProgress)}</div>
          <span class="text-lg font-bold text-nb-black/70 w-12 text-right">{progress.overallProgress}%</span>
        </div>
      </div>

      <IngestStats {progress} />

      {#if progress.currentFile && progress.stage === 'processing'}
        <div class="px-4 py-3 border-b border-nb-black/20">
          <p class="text-xs text-nb-black/50 uppercase tracking-wide mb-1">Current File</p>
          <div class="flex items-center gap-3">
            <Icon name="image" class="text-nb-black/40" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-nb-black/70 truncate">{progress.currentFile.name}</p>
              <p class="text-xs text-nb-black/50">{(progress.currentFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div class="w-24">{@render progressBar(progress.currentFile.progress)}</div>
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
          <Icon name={showLog ? 'expand_less' : 'expand_more'} class="text-nb-black/40 transition-transform" />
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

      <IngestFileList
        {progress}
        bind:showFiles
        onToggleFiles={() => showFiles = !showFiles}
        {onRetryFile}
      />
    </div>
  {/if}
{/if}
