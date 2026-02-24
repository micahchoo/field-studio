<!--
  StagingBanners Molecule
  ========================
  Banner strip for the staging workbench: keyboard DnD instructions,
  CSV import summary, unsupported files warning, conflict detection,
  and analysis summary bar.
  Extracted from StagingWorkbench organism.
-->
<script lang="ts">
  import type { UnsupportedFile } from '../../model/stagingWorkbenchHelpers';
  import type { IngestAnalysisResult } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';
  import type { ConflictReport } from '../../model/conflictDetection';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import ConflictPanel from './ConflictPanel.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    enableKeyboardDnd: boolean;
    csvImportSummary: string | null;
    unsupportedFiles: UnsupportedFile[];
    unsupportedExts: string[];
    showUnsupportedBanner: boolean;
    unsupportedExpanded: boolean;
    onToggleUnsupportedExpanded: () => void;
    onDismissUnsupported: () => void;
    conflicts: ConflictReport;
    conflictDismissed: boolean;
    onConflictExclude: (path: string) => void;
    onDismissConflict: () => void;
    analysisResult: IngestAnalysisResult | null;
    showPreview: boolean;
    onTogglePreview: () => void;
    onReanalyze: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    enableKeyboardDnd,
    csvImportSummary,
    unsupportedFiles,
    unsupportedExts,
    showUnsupportedBanner,
    unsupportedExpanded,
    onToggleUnsupportedExpanded,
    onDismissUnsupported,
    conflicts,
    conflictDismissed,
    onConflictExclude,
    onDismissConflict,
    analysisResult,
    showPreview,
    onTogglePreview,
    onReanalyze,
    cx,
    fieldMode,
  }: Props = $props();
</script>

{#if enableKeyboardDnd}
  <div class="flex-shrink-0 px-4 py-2 bg-sky-50 border-b border-sky-200 text-sky-700 text-xs flex items-center gap-2">
    <Icon name="keyboard" class="text-sky-500" />
    <span class="font-medium">Keyboard:</span>
    <span>Arrow keys to navigate | Space to select | Enter to drop | Escape to cancel</span>
  </div>
{/if}

{#if csvImportSummary}
  <div class="flex-shrink-0 px-4 py-2 bg-nb-green/10 border-b border-nb-green/30 text-nb-green text-xs flex items-center gap-2">
    <Icon name="check_circle" class="text-nb-green" />
    <span>{csvImportSummary}</span>
  </div>
{/if}

{#if showUnsupportedBanner && unsupportedFiles.length > 0}
  <div class="flex-shrink-0 border-b border-nb-orange/30 bg-nb-orange/5">
    <div class="flex items-center justify-between px-4 py-2">
      <div class="flex items-center gap-2">
        <Icon name="warning" class="text-nb-orange text-sm" />
        <span class="text-xs text-nb-orange">
          {unsupportedFiles.length} unsupported file{unsupportedFiles.length !== 1 ? 's' : ''} will be skipped
        </span>
        <span class="text-[10px] text-nb-black/40">(.{unsupportedExts.join(', .')})</span>
      </div>
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="bare" onclick={onToggleUnsupportedExpanded}
          class="px-2 py-1 text-[10px] text-nb-black/50 hover:bg-nb-cream"
        >
          {unsupportedExpanded ? 'Collapse' : 'Details'}
        </Button>
        <Button variant="ghost" size="bare" onclick={onDismissUnsupported}
          class="p-1 text-nb-black/40 hover:bg-nb-cream"
        >
          <Icon name="close" class="text-sm" />
        </Button>
      </div>
    </div>
    {#if unsupportedExpanded}
      <div class="max-h-32 overflow-y-auto border-t border-nb-orange/20 px-4 py-2">
        {#each unsupportedFiles as f (f.path)}
          <div class="text-[11px] text-nb-black/50 py-0.5 truncate">
            <span class="text-nb-orange">.{f.ext}</span> {f.path}
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

{#if conflicts.hasConflicts && !conflictDismissed}
  <ConflictPanel
    {conflicts}
    onExcludePath={onConflictExclude}
    onDismiss={onDismissConflict}
  />
{/if}

{#if analysisResult}
  <div class="flex-shrink-0 px-4 py-1.5 border-b border-nb-black/10 bg-nb-cream/50 flex items-center justify-between">
    <div class="flex items-center gap-3 text-xs text-nb-black/60">
      <Icon name="auto_fix_high" class="text-nb-purple text-sm" />
      <span>
        {analysisResult.summary.proposedManifests} manifest{analysisResult.summary.proposedManifests !== 1 ? 's' : ''},
        {analysisResult.summary.proposedCollections} collection{analysisResult.summary.proposedCollections !== 1 ? 's' : ''} detected
      </span>
      {#if analysisResult.summary.hasMarkerFiles}
        <span class="px-1.5 py-0.5 bg-nb-purple/10 text-nb-purple text-[10px]">Marker files found</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="bare" onclick={onTogglePreview}
        class={cn('px-2 py-1 text-[10px] flex items-center gap-1', showPreview ? 'text-nb-blue bg-nb-blue/10' : 'text-nb-black/50 hover:bg-nb-cream')}
      >
        <Icon name="preview" class="text-sm" /> Preview
      </Button>
      <Button variant="ghost" size="bare" onclick={onReanalyze}
        class="px-2 py-1 text-[10px] text-nb-black/50 hover:bg-nb-cream flex items-center gap-1"
      >
        <Icon name="refresh" class="text-sm" /> Re-analyze
      </Button>
    </div>
  </div>
{/if}
