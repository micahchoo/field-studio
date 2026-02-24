<!--
  ExportDialog.svelte — Main archive export wizard (Svelte 5 port)
  Ported from: src/features/export/ui/ExportDialog.tsx (886 lines)

  Architecture:
    Multi-step wizard dialog for exporting IIIF archives in 5 formats:
      1. Canopy IIIF Site    -- Next.js static site with search + themes
      2. Raw IIIF            -- JSON documents and optional assets
      3. OCFL Package        -- Oxford Common File Layout 1.1 w/ versioning
      4. BagIt Bag           -- RFC 8493 w/ checksums
      5. Activity Log        -- IIIF Change Discovery API 1.0

    Steps: config -> [canopy-config | archival-config] -> dry-run -> exporting

  FSD Layer: features/export/ui/organisms
  Rule 5.D: Receives cx + fieldMode via props (never resolves theme internally)
-->

<script module lang="ts">
  /** Wizard step identifiers -- linear flow with conditional branches */
  export type ExportStep =
    | 'config'
    | 'canopy-config'
    | 'archival-config'
    | 'dry-run'
    | 'exporting';

  /** Export format identifiers -- map 1:1 to export service methods */
  export type ExportFormat =
    | 'raw-iiif'
    | 'canopy'
    | 'ocfl'
    | 'bagit'
    | 'activity-log';

  /** Step labels for the header subtitle */
  const STEP_LABELS: Record<ExportStep, string> = {
    'config':          'Step 1: Format Selection',
    'canopy-config':   'Step 2: Site Configuration',
    'archival-config': 'Step 2: Package Configuration',
    'dry-run':         'Step 2: Integrity & Preview',
    'exporting':       'Step 3: Generating',
  };
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFItem } from '@/src/shared/types';
  import type { CanopyConfig, ImageApiOptions, VirtualFile } from '../../model/exportService';
  import type { ArchivalPackageOptions } from '../../model/archivalPackageService';
  import type { ValidationIssue } from '@/src/features/metadata-edit/lib/inspectorValidation';

  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import ExportDryRun from '../molecules/ExportDryRun.svelte';
  import ExportFormatSelector from '../molecules/ExportFormatSelector.svelte';
  import ExportOptionsPanel from '../molecules/ExportOptionsPanel.svelte';
  import ExportProgressDisplay from '../molecules/ExportProgressDisplay.svelte';
  import { cn } from '@/src/shared/lib/cn';

  // ── Props ──
  interface Props {
    root: IIIFItem | null;
    onClose: () => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let { root, onClose, cx, fieldMode }: Props = $props();

  // ── State ──
  let step: ExportStep = $state('config');
  let format: ExportFormat = $state('canopy');
  let includeAssets: boolean = $state(true);
  let ignoreErrors: boolean = $state(false);
  let processing: boolean = $state(false);
  let progress: { status: string; percent: number } = $state({ status: '', percent: 0 });
  let errorMsg: string | null = $state(null);
  let virtualFiles: VirtualFile[] = $state([]);
  let integrityIssues: ValidationIssue[] = $state([]);

  // svelte-ignore state_referenced_locally
  let canopyConfig: CanopyConfig = $state({
    title: 'IIIF Collection',
    baseUrl: '',
    port: 8765,
    theme: { accentColor: 'indigo', grayColor: 'slate', appearance: 'light' as const },
    search: { enabled: true, indexSummary: true },
    metadata: [],
    featured: [],
  });

  let imageApiOptions: ImageApiOptions = $state({
    includeWebP: false,
    includeGrayscale: false,
    includeSquare: false,
    tileSize: 512,
  });

  let archivalConfig: Partial<ArchivalPackageOptions> = $state({
    includeMedia: true,
    digestAlgorithm: 'sha256',
    organization: '',
    description: '',
    externalId: '',
    versionMessage: 'Initial export from IIIF Field Studio',
    user: { name: '', email: '' },
  });

  // ── Derived ──
  let manifestList = $derived(root ? collectManifests(root) : []);
  let dialogWidth = $derived((step as ExportStep) === 'dry-run' ? 'max-w-5xl w-full' : 'max-w-md w-full');
  let criticalErrors = $derived(integrityIssues.filter(i => i.severity === 'error'));
  let canExport = $derived(criticalErrors.length === 0 || ignoreErrors);

  let configNextLabel = $derived.by(() => {
    if (format === 'canopy') return 'Configure Site';
    if (format === 'ocfl' || format === 'bagit') return 'Configure Package';
    if (format === 'activity-log') return 'Export Log';
    return 'Start Dry Run';
  });

  let configNextIcon = $derived((format as ExportFormat) === 'activity-log' ? 'download' : 'arrow_forward');

  // ── Effects ──
  $effect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  $effect(() => {
    const _step = step;
    const _format = format;
    const _includeAssets = includeAssets;
    if (root && _step === 'dry-run') handleDryRun();
  });

  // ── Async Handlers ──
  async function handleDryRun(): Promise<void> {
    if (!root) return;
    if (format === 'ocfl' || format === 'bagit' || format === 'activity-log') {
      virtualFiles = [];
      return;
    }
    processing = true;
    try {
      // Stubbed: export service not yet wired
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : 'Export preview failed';
    } finally {
      processing = false;
    }
  }

  async function handleFinalExport(): Promise<void> {
    if (!root) return;
    step = 'exporting';
    errorMsg = null;
    try {
      // Stubbed: export service not yet wired
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : 'Export failed';
      step = 'dry-run';
    }
  }

  async function handleCanopyExport(): Promise<void> {
    if (canopyConfig.metadata.length === 0 && root) {
      // Stubbed: metadata extraction not yet wired
    }
    step = 'dry-run';
  }

  async function handleActivityLogExport(): Promise<void> {
    step = 'exporting';
    errorMsg = null;
    progress = { status: 'Gathering activity history...', percent: 0 };
    try {
      // Stubbed: activity stream service not yet wired
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : 'Failed to export activity log';
      step = 'config';
    }
  }

  async function handleArchivalExport(): Promise<void> {
    if (!root) return;
    step = 'exporting';
    errorMsg = null;
    progress = { status: 'Initializing archival package...', percent: 0 };
    try {
      // Stubbed: archival package service not yet wired
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : `Failed to create ${format.toUpperCase()} package`;
      step = 'archival-config';
    }
  }

  // ── Helpers ──
  function collectManifests(_item: IIIFItem): { id: string; label: string }[] {
    return [];
  }

  function handleConfigNext(): void {
    if (format === 'canopy') {
      step = 'canopy-config';
    } else if (format === 'ocfl' || format === 'bagit') {
      step = 'archival-config';
    } else if (format === 'activity-log') {
      handleActivityLogExport();
    } else {
      step = 'dry-run';
    }
  }
</script>

<!-- Modal Overlay -->
<div class="fixed inset-0 bg-nb-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" role="none">
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="export-dialog-title"
    class={cn('bg-nb-white shadow-brutal-lg transition-nb duration-500 overflow-hidden flex flex-col', dialogWidth)}
  >
    <!-- Header -->
    <div class="p-6 border-b flex justify-between items-center bg-nb-white">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-iiif-blue flex items-center justify-center text-white shadow-brutal">
          <Icon name="publish" />
        </div>
        <div>
          <h2 id="export-dialog-title" class="text-lg font-black text-nb-black uppercase tracking-tighter">
            Archive Export
          </h2>
          <p class="text-[10px] font-bold text-nb-black/40 uppercase tracking-widest">
            {STEP_LABELS[step]}
          </p>
        </div>
      </div>
      {#if step !== 'exporting'}
        <Button variant="ghost" size="bare" onclick={onClose} aria-label="Close dialog" class="p-2 hover:bg-nb-cream text-nb-black/40 transition-nb">
          <Icon name="close" />
        </Button>
      {/if}
    </div>

    <!-- Body (scrollable) -->
    <div class="flex-1 overflow-y-auto p-8">
      {#if errorMsg}
        <div class="bg-nb-red/10 border border-nb-red/30 p-4 text-nb-red text-sm mb-6 flex gap-3 animate-in shake" role="alert">
          <Icon name="error" class="shrink-0 mt-0.5" />
          <div>
            <p class="font-bold mb-1 uppercase tracking-tighter">Integrity Failure</p>
            <p class="opacity-80">{errorMsg}</p>
          </div>
        </div>
      {/if}

      {#if step === 'config'}
        <ExportFormatSelector
          {format}
          {includeAssets}
          {cx}
          {fieldMode}
          onFormatChange={(f) => { format = f; }}
          onIncludeAssetsChange={(v) => { includeAssets = v; }}
        />

      {:else if step === 'archival-config' || step === 'canopy-config'}
        <ExportOptionsPanel
          {step}
          format={format as 'canopy' | 'ocfl' | 'bagit'}
          {cx}
          {fieldMode}
          {canopyConfig}
          {imageApiOptions}
          {manifestList}
          onCanopyConfigChange={(c) => { canopyConfig = c; }}
          onImageApiOptionsChange={(o) => { imageApiOptions = o; }}
          {archivalConfig}
          onArchivalConfigChange={(c) => { archivalConfig = c; }}
        />

      {:else if step === 'dry-run'}
        <div class="space-y-6 animate-in fade-in duration-500">
          {#if processing}
            <div class="h-[500px] flex flex-col items-center justify-center gap-4 text-nb-black/40" aria-live="polite">
              <div class="w-12 h-12 border-4 border-nb-black/10 border-t-iiif-blue animate-spin"></div>
              <p class="text-xs font-black uppercase tracking-widest">Synthesizing Archive DNA...</p>
            </div>
          {:else}
            <div class="flex gap-4 mb-4">
              <div class={cn('flex-1 p-4 border-2 flex items-center gap-4', criticalErrors.length > 0 ? 'bg-nb-red/10 border-nb-red/30 text-nb-red' : 'bg-nb-green/10 border-nb-green/30 text-nb-green')}>
                <Icon name={criticalErrors.length > 0 ? 'error' : 'verified'} class="text-2xl" />
                <div>
                  <p class="font-bold text-sm">
                    {criticalErrors.length > 0 ? `${criticalErrors.length} Critical Issues` : 'Spec Compliance: Valid'}
                  </p>
                  <p class="text-[10px] opacity-75">
                    {criticalErrors.length > 0 ? 'Fix issues below to ensure interoperability.' : 'Archive meets IIIF Presentation 3.0 standards.'}
                  </p>
                </div>
              </div>
              <div class="p-4 bg-nb-white border border-nb-black/20 flex flex-col justify-center min-w-[120px]">
                <span class="text-[9px] font-black text-nb-black/40 uppercase">Package Size</span>
                <span class="text-sm font-bold text-nb-black/80">~{includeAssets ? 'Calculated' : 'Small'}</span>
              </div>
            </div>

            <ExportDryRun files={virtualFiles} {cx} {fieldMode} />

            {#if criticalErrors.length > 0}
              <div class="mt-4 p-4 bg-nb-orange/10 border border-nb-orange/20 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <Icon name="warning" class="text-nb-orange" />
                  <span class="text-xs font-medium text-nb-orange">Archive has critical issues. You must fix them or override integrity.</span>
                </div>
                <label class="flex items-center gap-2 cursor-pointer bg-nb-white px-3 py-1.5 border border-nb-orange/20 shadow-brutal-sm">
                  <input type="checkbox" bind:checked={ignoreErrors} class="text-nb-orange" />
                  <span class="text-[9px] font-black uppercase text-nb-orange">Ignore Errors</span>
                </label>
              </div>
            {/if}
          {/if}
        </div>

      {:else if step === 'exporting'}
        <ExportProgressDisplay {progress} {cx} {fieldMode} />
      {/if}
    </div>

    <!-- Footer -->
    <div class="p-6 bg-nb-white border-t flex justify-between items-center shrink-0">
      {#if step === 'config'}
        <Button variant="ghost" size="sm" onclick={onClose}>Cancel</Button>
        <Button variant="primary" size="base" onclick={handleConfigNext}>
          {#snippet iconAfter()}<Icon name={configNextIcon} />{/snippet}
          {configNextLabel}
        </Button>

      {:else if step === 'archival-config'}
        <Button variant="ghost" size="sm" onclick={() => { step = 'config'; }}>Back</Button>
        <Button variant="primary" size="base" onclick={handleArchivalExport}>
          {#snippet iconAfter()}<Icon name="download" />{/snippet}
          Export {format.toUpperCase()}
        </Button>

      {:else if step === 'canopy-config'}
        <Button variant="ghost" size="sm" onclick={() => { step = 'config'; }}>Back</Button>
        <Button variant="primary" size="base" onclick={handleCanopyExport}>
          {#snippet iconAfter()}<Icon name="arrow_forward" />{/snippet}
          Generate Site Config
        </Button>

      {:else if step === 'dry-run' && !processing}
        <Button variant="ghost" size="sm" onclick={() => { step = 'config'; }}>Back to Settings</Button>
        <Button variant="success" size="base" onclick={handleFinalExport} disabled={!canExport}>
          {#snippet iconAfter()}<Icon name="download" />{/snippet}
          Finalize & Download ZIP
        </Button>
      {/if}
    </div>
  </div>
</div>
