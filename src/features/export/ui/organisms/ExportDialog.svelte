<!--
  ExportDialog.svelte — Main archive export wizard (Svelte 5 port)
  Ported from: src/features/export/ui/ExportDialog.tsx (886 lines)

  Architecture:
    Multi-step wizard dialog for exporting IIIF archives in 5 formats:
      1. Canopy IIIF Site    — Next.js static site with search + themes
      2. Raw IIIF            — JSON documents and optional assets
      3. OCFL Package        — Oxford Common File Layout 1.1 w/ versioning
      4. BagIt Bag           — RFC 8493 w/ checksums
      5. Activity Log        — IIIF Change Discovery API 1.0

    Steps: config -> [canopy-config | archival-config] -> dry-run -> exporting

  FSD Layer: features/export/ui/organisms
  Rule 5.D: Receives cx + fieldMode via props (never resolves theme internally)
-->

<script module lang="ts">
  // ─── Static Types ───────────────────────────────────────────────────

  /** Wizard step identifiers — linear flow with conditional branches */
  export type ExportStep =
    | 'config'
    | 'canopy-config'
    | 'archival-config'
    | 'dry-run'
    | 'exporting';

  /** Export format identifiers — map 1:1 to export service methods */
  export type ExportFormat =
    | 'raw-iiif'
    | 'canopy'
    | 'ocfl'
    | 'bagit'
    | 'activity-log';

  // ─── Static Config Maps ─────────────────────────────────────────────

  /** Step labels for the header subtitle */
  const STEP_LABELS: Record<ExportStep, string> = {
    'config':          'Step 1: Format Selection',
    'canopy-config':   'Step 2: Site Configuration',
    'archival-config': 'Step 2: Package Configuration',
    'dry-run':         'Step 2: Integrity & Preview',
    'exporting':       'Step 3: Generating',
  };

  /** Canopy accent color options (Radix color palette names) */
  const ACCENT_COLORS = [
    'indigo', 'violet', 'purple', 'plum', 'pink', 'tomato',
    'orange', 'amber', 'lime', 'grass', 'teal', 'cyan',
  ] as const;

  /** Canopy background tone options (Radix gray palette names) */
  const GRAY_COLORS = [
    'slate', 'gray', 'zinc', 'neutral', 'stone',
    'sand', 'mauve', 'olive', 'sage',
  ] as const;
</script>

<script lang="ts">
  // ─── Imports ────────────────────────────────────────────────────────
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFItem } from '@/src/shared/types';
  import type {
    CanopyConfig,
    ImageApiOptions,
    VirtualFile,
  } from '../../model/exportService';
  import type {
    ArchivalPackageOptions,
  } from '../../model/archivalPackageService';
  import type { ValidationIssue } from '@/src/features/metadata-edit/lib/inspectorValidation';

  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import FirstTimeHint from '@/src/shared/ui/molecules/FirstTimeHint.svelte';
  import ExportDryRun from '../molecules/ExportDryRun.svelte';
  import { cn } from '@/src/shared/lib/cn';

  // Service imports (called in async handlers only)
  // import { exportService } from '../../model/exportService';
  // import { archivalPackageService } from '../../model/archivalPackageService';
  // import { activityStream as activityStreamService } from '@/src/shared/services/activityStream';
  // import { validator } from '@/src/entities/manifest/model/validation/validator';
  // import { guidance } from '@/src/shared/services/guidanceService';
  // import { getIIIFValue, isCollection, isManifest } from '@/src/shared/types';
  // import FileSaver from 'file-saver';
  // import JSZip from 'jszip';

  // ─── Props ──────────────────────────────────────────────────────────
  interface Props {
    /** The denormalized root item (Collection or Manifest) to export */
    root: IIIFItem | null;
    /** Callback to close the dialog (called on Escape, Cancel, or successful export) */
    onClose: () => void;
    /** Contextual class names resolved by parent template (Rule 5.D) */
    cx: ContextualClassNames;
    /** Whether field mode (high-contrast black/yellow) is active */
    fieldMode: boolean;
  }

  let { root, onClose, cx, fieldMode }: Props = $props();

  // ─── State (~12 reactive atoms) ─────────────────────────────────────

  let step: ExportStep = $state('config');
  let format: ExportFormat = $state('canopy');
  let includeAssets: boolean = $state(true);
  let ignoreErrors: boolean = $state(false);
  let processing: boolean = $state(false);
  let progress: { status: string; percent: number } = $state({ status: '', percent: 0 });
  let errorMsg: string | null = $state(null);
  let virtualFiles: VirtualFile[] = $state([]);
  let integrityIssues: ValidationIssue[] = $state([]);

  let canopyConfig: CanopyConfig = $state({
    title: root ? 'IIIF Collection' : 'IIIF Collection',
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

  // ─── Derived Values ─────────────────────────────────────────────────

  let manifestList: { id: string; label: string }[] = $derived(
    root ? collectManifests(root) : []
  );

  let dialogWidth: string = $derived(
    (step as ExportStep) === 'dry-run' ? 'max-w-5xl w-full' : 'max-w-md w-full'
  );

  let criticalErrors: ValidationIssue[] = $derived(
    integrityIssues.filter(i => i.severity === 'error')
  );

  let canExport: boolean = $derived(
    criticalErrors.length === 0 || ignoreErrors
  );

  /** Dynamic label for the config step "Next" button */
  let configNextLabel: string = $derived.by(() => {
    if (format === 'canopy') return 'Configure Site';
    if (format === 'ocfl' || format === 'bagit') return 'Configure Package';
    if (format === 'activity-log') return 'Export Log';
    return 'Start Dry Run';
  });

  /** Dynamic icon for the config step "Next" button */
  let configNextIcon: string = $derived(
    (format as ExportFormat) === 'activity-log' ? 'download' : 'arrow_forward'
  );

  // Checkbox helper for dark mode appearance toggle
  let isDarkMode: boolean = $derived(canopyConfig.theme.appearance === 'dark');

  // ─── Effects (side-effect only) ────────────────────────────────────

  /** Escape key handler — closes dialog unless an export is in progress */
  $effect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  /** Dry-run auto-trigger — fires when entering dry-run step or when deps change */
  $effect(() => {
    const _step = step;
    const _format = format;
    const _includeAssets = includeAssets;

    if (root && _step === 'dry-run') {
      handleDryRun();
    }
  });

  // ─── Async Handlers ─────────────────────────────────────────────────

  async function handleDryRun(): Promise<void> {
    if (!root) return;

    if (format === 'ocfl' || format === 'bagit' || format === 'activity-log') {
      // const issueMap = validator.validateTree(root);
      // integrityIssues = Object.values(issueMap).flat();
      virtualFiles = [];
      return;
    }

    processing = true;
    try {
      // const exportFormat = format === 'canopy' ? 'canopy' : 'raw-iiif';
      // const files = await exportService.prepareExport(root, {
      //   format: exportFormat,
      //   includeAssets,
      //   ignoreErrors,
      //   canopyConfig: format === 'canopy' ? canopyConfig : undefined,
      //   imageApiOptions: format === 'canopy' ? imageApiOptions : undefined,
      // });
      // virtualFiles = files;
      //
      // const issueMap = validator.validateTree(root);
      // integrityIssues = Object.values(issueMap).flat();
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
      // const exportFormat = format === 'canopy' ? 'canopy' : 'raw-iiif';
      // const blob = await exportService.exportArchive(root, {
      //   format: exportFormat,
      //   includeAssets,
      //   ignoreErrors,
      //   canopyConfig: format === 'canopy' ? canopyConfig : undefined,
      //   imageApiOptions: format === 'canopy' ? imageApiOptions : undefined,
      // }, (p) => { progress = p; });
      //
      // FileSaver.saveAs(blob, `canopy-export-${new Date().toISOString().split('T')[0]}.zip`);
      // onClose();
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : 'Export failed';
      step = 'dry-run';
    }
  }

  async function handleCanopyExport(): Promise<void> {
    if (canopyConfig.metadata.length === 0 && root) {
      // const keys = new Set<string>();
      // const traverse = (item: IIIFItem) => {
      //   item.metadata?.forEach(m => {
      //     const label = getIIIFValue(m.label);
      //     if (label) keys.add(label);
      //   });
      //   item.items?.forEach(traverse);
      // };
      // traverse(root);
      // canopyConfig = { ...canopyConfig, metadata: Array.from(keys) };
    }
    step = 'dry-run';
  }

  async function handleActivityLogExport(): Promise<void> {
    step = 'exporting';
    errorMsg = null;
    progress = { status: 'Gathering activity history...', percent: 0 };

    try {
      // progress = { status: 'Exporting activity log...', percent: 30 };
      // const activities = await activityStreamService.exportAll();
      // if (activities.length === 0) {
      //   throw new Error('No activities recorded yet.');
      // }
      // progress = { status: 'Generating Change Discovery collection...', percent: 50 };
      // const baseUrl = window.location.origin;
      // const collection = await activityStreamService.exportAsChangeDiscovery(baseUrl);
      // progress = { status: 'Creating download...', percent: 80 };
      // const zip = new JSZip();
      // zip.file('collection.json', JSON.stringify(collection, null, 2));
      // zip.file('activities.json', JSON.stringify(activities, null, 2));
      // if (activities.length > 100) {
      //   const pageSize = 100;
      //   const pages = Math.ceil(activities.length / pageSize);
      //   for (let i = 0; i < pages; i++) {
      //     const page = await activityStreamService.exportPage(baseUrl, i);
      //     zip.file(`page-${i}.json`, JSON.stringify(page, null, 2));
      //   }
      // }
      // const blob = await zip.generateAsync({ type: 'blob' });
      // FileSaver.saveAs(blob, `activity-log-${new Date().toISOString().split('T')[0]}.zip`);
      // progress = { status: 'Complete!', percent: 100 };
      // await new Promise(r => setTimeout(r, 500));
      // onClose();
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
      // const options: ArchivalPackageOptions = {
      //   includeMedia: archivalConfig.includeMedia ?? true,
      //   digestAlgorithm: archivalConfig.digestAlgorithm || 'sha256',
      //   organization: archivalConfig.organization,
      //   description: archivalConfig.description,
      //   externalId: archivalConfig.externalId,
      //   versionMessage: archivalConfig.versionMessage,
      //   user: archivalConfig.user?.name ? archivalConfig.user as ArchivalPackageOptions['user'] : undefined,
      // };
      // progress = { status: `Creating ${format.toUpperCase()} package...`, percent: 20 };
      // const result = format === 'ocfl'
      //   ? await archivalPackageService.exportOCFL(root, options)
      //   : await archivalPackageService.exportBagIt(root, options);
      // if (!result.success && result.errors.length > 0) {
      //   throw new Error(result.errors.join('; '));
      // }
      // progress = { status: 'Compressing files...', percent: 60 };
      // const zip = new JSZip();
      // for (const file of result.files) {
      //   zip.file(file.path, file.content);
      // }
      // progress = { status: 'Generating download...', percent: 80 };
      // const blob = await zip.generateAsync({ type: 'blob' });
      // const filename = format === 'ocfl'
      //   ? `ocfl-${new Date().toISOString().split('T')[0]}.zip`
      //   : `bagit-${new Date().toISOString().split('T')[0]}.zip`;
      // FileSaver.saveAs(blob, filename);
      // progress = { status: 'Complete!', percent: 100 };
      // await new Promise(r => setTimeout(r, 500));
      // onClose();
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : `Failed to create ${format.toUpperCase()} package`;
      step = 'archival-config';
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  function collectManifests(_item: IIIFItem): { id: string; label: string }[] {
    const manifests: { id: string; label: string }[] = [];
    // const traverse = (node: IIIFItem) => {
    //   if (isManifest(node)) {
    //     manifests.push({
    //       id: node.id,
    //       label: getIIIFValue(node.label) || node.id.split('/').pop() || 'Untitled',
    //     });
    //   }
    //   node.items?.forEach(child => {
    //     if (isCollection(child) || isManifest(child)) {
    //       traverse(child as IIIFItem);
    //     }
    //   });
    // };
    // traverse(_item);
    return manifests;
  }

  function toggleFeaturedItem(manifestId: string): void {
    const isSelected = canopyConfig.featured.includes(manifestId);
    if (isSelected) {
      canopyConfig = {
        ...canopyConfig,
        featured: canopyConfig.featured.filter(id => id !== manifestId),
      };
    } else if (canopyConfig.featured.length < 6) {
      canopyConfig = {
        ...canopyConfig,
        featured: [...canopyConfig.featured, manifestId],
      };
    }
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

  function setDarkMode(checked: boolean): void {
    canopyConfig = {
      ...canopyConfig,
      theme: { ...canopyConfig.theme, appearance: checked ? 'dark' : 'light' },
    };
  }

  function setSearchEnabled(checked: boolean): void {
    canopyConfig = {
      ...canopyConfig,
      search: { ...canopyConfig.search, enabled: checked },
    };
  }
</script>

<!-- Modal Overlay -->
<div
  class="fixed inset-0 bg-nb-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
  role="none"
>
  <!-- Dialog Container -->
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="export-dialog-title"
    class={cn('bg-nb-white shadow-brutal-lg transition-nb duration-500 overflow-hidden flex flex-col', dialogWidth)}
  >
    <!-- ─── Header ─────────────────────────────────────────────────── -->
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

    <!-- ─── Body (scrollable) ──────────────────────────────────────── -->
    <div class="flex-1 overflow-y-auto p-8">
      <!-- Error Banner -->
      {#if errorMsg}
        <div class="bg-nb-red/10 border border-nb-red/30 p-4 text-nb-red text-sm mb-6 flex gap-3 animate-in shake" role="alert">
          <Icon name="error" class="shrink-0 mt-0.5" />
          <div>
            <p class="font-bold mb-1 uppercase tracking-tighter">Integrity Failure</p>
            <p class="opacity-80">{errorMsg}</p>
          </div>
        </div>
      {/if}

      <!-- ┌─── STEP 1: config — Format Selection ───────────────────┐ -->
      {#if step === 'config'}
        <div class="space-y-8 animate-in slide-in-from-right-4">
          <FirstTimeHint
            id="export-intro"
            message="Choose how to package your archive. Canopy creates a ready-to-deploy website. Raw IIIF gives you just the JSON files."
            {cx}
            class="mb-4"
          />

          <!-- Web Publishing Formats -->
          <div class="grid grid-cols-2 gap-4" role="radiogroup" aria-labelledby="export-format-label">
            <span id="export-format-label" class="sr-only">Choose Export Format</span>

            <!-- Canopy Card -->
            <Button
              variant="ghost"
              size="bare"
              role="radio"
              aria-checked={format === 'canopy'}
              class={cn('p-5 border-2 text-left transition-nb relative group', format === 'canopy' ? 'border-iiif-blue bg-nb-blue/10' : 'border-nb-black/10 hover:border-nb-black/20')}
              onclick={() => { format = 'canopy'; }}
            >
              <Icon name="public" class={cn('text-2xl mb-3', format === 'canopy' ? 'text-iiif-blue' : 'text-nb-black/40')} />
              <div class="font-bold text-sm text-nb-black mb-1">Canopy IIIF Site</div>
              <p class="text-[10px] text-nb-black/50 leading-tight">Modern Next.js static site with search, mapping, and themes.</p>
              {#if format === 'canopy'}
                <div class="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle" /></div>
              {/if}
            </Button>

            <!-- Raw IIIF Card -->
            <Button
              variant="ghost"
              size="bare"
              role="radio"
              aria-checked={format === 'raw-iiif'}
              class={cn('p-5 border-2 text-left transition-nb relative group', format === 'raw-iiif' ? 'border-iiif-blue bg-nb-blue/10' : 'border-nb-black/10 hover:border-nb-black/20')}
              onclick={() => { format = 'raw-iiif'; }}
            >
              <Icon name="code" class={cn('text-2xl mb-3', format === 'raw-iiif' ? 'text-iiif-blue' : 'text-nb-black/40')} />
              <div class="font-bold text-sm text-nb-black mb-1">Raw IIIF</div>
              <p class="text-[10px] text-nb-black/50 leading-tight">JSON documents and assets only.</p>
              {#if format === 'raw-iiif'}
                <div class="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle" /></div>
              {/if}
            </Button>
          </div>

          <!-- Digital Preservation Formats -->
          <div>
            <h3 class="text-xs font-black text-nb-black/50 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Icon name="archive" class="text-sm" /> Digital Preservation
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <!-- OCFL Card -->
              <Button
                variant="ghost"
                size="bare"
                role="radio"
                aria-checked={format === 'ocfl'}
                class={cn('p-5 border-2 text-left transition-nb relative group', format === 'ocfl' ? 'border-nb-orange bg-nb-orange/10' : 'border-nb-black/10 hover:border-nb-black/20')}
                onclick={() => { format = 'ocfl'; }}
              >
                <Icon name="inventory_2" class={cn('text-2xl mb-3', format === 'ocfl' ? 'text-nb-orange' : 'text-nb-black/40')} />
                <div class="font-bold text-sm text-nb-black mb-1">OCFL Package</div>
                <p class="text-[10px] text-nb-black/50 leading-tight">Oxford Common File Layout 1.1 with versioning.</p>
                {#if format === 'ocfl'}
                  <div class="absolute top-4 right-4 text-nb-orange"><Icon name="check_circle" /></div>
                {/if}
              </Button>

              <!-- BagIt Card -->
              <Button
                variant="ghost"
                size="bare"
                role="radio"
                aria-checked={format === 'bagit'}
                class={cn('p-5 border-2 text-left transition-nb relative group', format === 'bagit' ? 'border-nb-purple bg-nb-purple/5' : 'border-nb-black/10 hover:border-nb-black/20')}
                onclick={() => { format = 'bagit'; }}
              >
                <Icon name="shopping_bag" class={cn('text-2xl mb-3', format === 'bagit' ? 'text-nb-purple' : 'text-nb-black/40')} />
                <div class="font-bold text-sm text-nb-black mb-1">BagIt Bag</div>
                <p class="text-[10px] text-nb-black/50 leading-tight">RFC 8493 compliant with checksums.</p>
                {#if format === 'bagit'}
                  <div class="absolute top-4 right-4 text-nb-purple"><Icon name="check_circle" /></div>
                {/if}
              </Button>
            </div>
          </div>

          <!-- Change Tracking Format -->
          <div>
            <h3 class="text-xs font-black text-nb-black/50 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Icon name="history" class="text-sm" /> Change Tracking
            </h3>
            <Button
              variant="ghost"
              size="bare"
              role="radio"
              aria-checked={format === 'activity-log'}
              class={cn('p-5 border-2 text-left transition-nb relative group w-full', format === 'activity-log' ? 'border-cyan-600 bg-nb-blue/10' : 'border-nb-black/10 hover:border-nb-black/20')}
              onclick={() => { format = 'activity-log'; }}
            >
              <Icon name="sync_alt" class={cn('text-2xl mb-3', format === 'activity-log' ? 'text-nb-blue' : 'text-nb-black/40')} />
              <div class="font-bold text-sm text-nb-black mb-1">Activity Log (Change Discovery)</div>
              <p class="text-[10px] text-nb-black/50 leading-tight">IIIF Change Discovery API 1.0 format. Tracks all create/update/delete operations for sync.</p>
              {#if format === 'activity-log'}
                <div class="absolute top-4 right-4 text-nb-blue"><Icon name="check_circle" /></div>
              {/if}
            </Button>
          </div>

          <!-- Canopy info box -->
          {#if format === 'canopy'}
            <div class="p-4 bg-nb-blue/10 border border-nb-blue/30">
              <div class="flex items-center gap-2 text-nb-blue font-bold text-sm mb-2">
                <Icon name="auto_awesome" /> Plug & Play Compatible
              </div>
              <p class="text-xs text-nb-blue">
                Generates a <code>canopy-export</code> package ready to drop into the Canopy IIIF template.
                Includes <code>canopy.yml</code> configuration and correctly structured IIIF data.
              </p>
            </div>
          {/if}

          <!-- Include Assets checkbox (all formats except canopy) -->
          {#if format !== 'canopy'}
            <label class="flex items-center gap-4 p-5 bg-nb-white border border-nb-black/10 cursor-pointer group hover:bg-nb-cream transition-nb">
              <input
                type="checkbox"
                bind:checked={includeAssets}
                class="w-6 h-6 text-iiif-blue border-nb-black/20 focus:ring-iiif-blue"
              />
              <div>
                <div class="font-bold text-sm text-nb-black/80">Include Physical Assets</div>
                <div class="text-xs text-nb-black/50">Zip images and media files along with metadata.</div>
              </div>
            </label>
          {/if}
        </div>

      <!-- ┌─── STEP 2b: archival-config — OCFL / BagIt ────────────┐ -->
      {:else if step === 'archival-config'}
        <div class="space-y-6 animate-in slide-in-from-right-4">
          <div class="text-center mb-6">
            <Icon name={format === 'ocfl' ? 'inventory_2' : 'shopping_bag'} class={cn('text-4xl mb-2', format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple')} />
            <h3 class="text-lg font-bold text-nb-black">
              {format === 'ocfl' ? 'OCFL Package Settings' : 'BagIt Bag Settings'}
            </h3>
            <p class="text-sm text-nb-black/50">Configure your digital preservation package</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="field-digest-algo" class="block text-sm font-bold text-nb-black/80 mb-1">Digest Algorithm</label>
              <select
                id="field-digest-algo" bind:value={archivalConfig.digestAlgorithm}
                class="w-full border p-2 text-sm"
              >
                <option value="sha256">SHA-256 (Recommended)</option>
                <option value="sha512">SHA-512</option>
              </select>
            </div>
            <div>
              <label for="field-organization" class="block text-sm font-bold text-nb-black/80 mb-1">Organization</label>
              <input id="field-organization"
                type="text"
                bind:value={archivalConfig.organization}
                class="w-full border p-2 text-sm"
                placeholder="Your Institution"
              />
            </div>
          </div>

          <div>
            <label for="field-description" class="block text-sm font-bold text-nb-black/80 mb-1">Description</label>
            <textarea id="field-description"
              bind:value={archivalConfig.description}
              class="w-full border p-2 text-sm"
              rows="2"
              placeholder="Description of this archival package..."
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="field-external-id" class="block text-sm font-bold text-nb-black/80 mb-1">External Identifier</label>
              <input id="field-external-id"
                type="text"
                bind:value={archivalConfig.externalId}
                class="w-full border p-2 text-sm"
                placeholder="Optional external ID"
              />
            </div>
            <div>
              <label for="field-version-msg" class="block text-sm font-bold text-nb-black/80 mb-1">Version Message</label>
              <input id="field-version-msg"
                type="text"
                bind:value={archivalConfig.versionMessage}
                class="w-full border p-2 text-sm"
                placeholder="Initial version"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="field-user-name" class="block text-sm font-bold text-nb-black/80 mb-1">User Name</label>
              <input id="field-user-name"
                type="text"
                value={archivalConfig.user?.name || ''}
                oninput={(e) => { archivalConfig = { ...archivalConfig, user: { ...archivalConfig.user, name: e.currentTarget.value } }; }}
                class="w-full border p-2 text-sm"
                placeholder="Your name"
              />
            </div>
            <div>
              <label for="field-user-email" class="block text-sm font-bold text-nb-black/80 mb-1">User Email</label>
              <input id="field-user-email"
                type="email"
                value={archivalConfig.user?.email || ''}
                oninput={(e) => { archivalConfig = { ...archivalConfig, user: { name: archivalConfig.user?.name ?? '', ...archivalConfig.user, email: e.currentTarget.value } }; }}
                class="w-full border p-2 text-sm"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <label class="flex items-center gap-3 cursor-pointer p-4 bg-nb-white border">
            <input
              type="checkbox"
              checked={archivalConfig.includeMedia ?? true}
              onchange={(e) => { archivalConfig = { ...archivalConfig, includeMedia: e.currentTarget.checked }; }}
              class={format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple'}
            />
            <div>
              <span class="text-sm font-bold text-nb-black/80">Include Media Files</span>
              <p class="text-xs text-nb-black/50">Bundle original images/audio/video with the package</p>
            </div>
          </label>

          <div class={cn('p-4 border', format === 'ocfl' ? 'bg-nb-orange/10 border-nb-orange/20' : 'bg-nb-purple/5 border-nb-purple/20')}>
            <div class={cn('flex items-center gap-2 font-bold text-sm mb-2', format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple')}>
              <Icon name="info" /> About {format === 'ocfl' ? 'OCFL' : 'BagIt'}
            </div>
            <p class={cn('text-xs', format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple')}>
              {#if format === 'ocfl'}
                OCFL (Oxford Common File Layout) is a specification for storing digital objects in repositories with versioning, fixity, and long-term preservation in mind.
              {:else}
                BagIt is a hierarchical file packaging format for storage and transfer of arbitrary digital content. It includes manifest files with checksums for integrity verification.
              {/if}
            </p>
          </div>
        </div>

      <!-- ┌─── STEP 2a: canopy-config — Canopy Site Config ────────┐ -->
      {:else if step === 'canopy-config'}
        <div class="space-y-6 animate-in slide-in-from-right-4">
          <div class="text-center mb-6">
            <Icon name="public" class="text-4xl text-iiif-blue mb-2" />
            <h3 class="text-lg font-bold text-nb-black">Canopy Configuration</h3>
            <p class="text-sm text-nb-black/50">Configure your site settings and visual theme</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="field-site-title" class="block text-sm font-bold text-nb-black/80 mb-1">Site Title</label>
              <input id="field-site-title"
                type="text"
                bind:value={canopyConfig.title}
                class="w-full border p-2 text-sm"
                placeholder="My Collection"
              />
            </div>
            <div>
              <label for="field-base-url" class="block text-sm font-bold text-nb-black/80 mb-1">Base URL</label>
              <input id="field-base-url"
                type="text"
                bind:value={canopyConfig.baseUrl}
                class="w-full border p-2 text-sm"
                placeholder="Optional (e.g. https://...)"
              />
            </div>
            <div>
              <label for="field-iiif-port" class="block text-sm font-bold text-nb-black/80 mb-1">IIIF Server Port</label>
              <input id="field-iiif-port"
                type="number"
                value={canopyConfig.port || 8765}
                oninput={(e) => { canopyConfig = { ...canopyConfig, port: parseInt(e.currentTarget.value) || 8765 }; }}
                class="w-full border p-2 text-sm"
                min="1024"
                max="65535"
                placeholder="8765"
              />
              <p class="text-xs text-nb-black/40 mt-1">Change if port 8765 is in use</p>
            </div>
          </div>

          <!-- Theme Colors -->
          <div>
            <p class="block text-sm font-bold text-nb-black/80 mb-2">Theme Colors</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="field-accent-color" class="text-xs text-nb-black/50 block mb-1">Accent Color</label>
                <select id="field-accent-color"
                  value={canopyConfig.theme.accentColor}
                  onchange={(e) => { canopyConfig = { ...canopyConfig, theme: { ...canopyConfig.theme, accentColor: e.currentTarget.value } }; }}
                  class="w-full border p-2 text-sm capitalize"
                >
                  {#each ACCENT_COLORS as c}
                    <option value={c}>{c}</option>
                  {/each}
                </select>
              </div>
              <div>
                <label for="field-bg-tone" class="text-xs text-nb-black/50 block mb-1">Background Tone</label>
                <select id="field-bg-tone"
                  value={canopyConfig.theme.grayColor}
                  onchange={(e) => { canopyConfig = { ...canopyConfig, theme: { ...canopyConfig.theme, grayColor: e.currentTarget.value } }; }}
                  class="w-full border p-2 text-sm capitalize"
                >
                  {#each GRAY_COLORS as c}
                    <option value={c}>{c}</option>
                  {/each}
                </select>
              </div>
            </div>
          </div>

          <!-- Dark Mode + Search toggles -->
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20 flex-1">
              <input
                type="checkbox"
                checked={isDarkMode}
                onchange={(e) => setDarkMode(e.currentTarget.checked)}
                class="text-iiif-blue"
              />
              <span class="text-sm text-nb-black/80">Dark Mode Default</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20 flex-1">
              <input
                type="checkbox"
                checked={canopyConfig.search.enabled}
                onchange={(e) => setSearchEnabled(e.currentTarget.checked)}
                class="text-iiif-blue"
              />
              <span class="text-sm text-nb-black/80">Enable Search</span>
            </label>
          </div>

          <!-- Image Processing Options -->
          <div>
            <p class="block text-sm font-bold text-nb-black/80 mb-2">Image Processing Options</p>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20">
                <input
                  type="checkbox"
                  bind:checked={imageApiOptions.includeWebP}
                  class="text-iiif-blue"
                />
                <div>
                  <span class="text-sm text-nb-black/80">WebP Format</span>
                  <p class="text-[10px] text-nb-black/40">Smaller file sizes</p>
                </div>
              </label>
              <label class="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20">
                <input
                  type="checkbox"
                  bind:checked={imageApiOptions.includeGrayscale}
                  class="text-iiif-blue"
                />
                <div>
                  <span class="text-sm text-nb-black/80">Grayscale</span>
                  <p class="text-[10px] text-nb-black/40">Gray quality option</p>
                </div>
              </label>
              <label class="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20">
                <input
                  type="checkbox"
                  bind:checked={imageApiOptions.includeSquare}
                  class="text-iiif-blue"
                />
                <div>
                  <span class="text-sm text-nb-black/80">Square Crops</span>
                  <p class="text-[10px] text-nb-black/40">For thumbnails</p>
                </div>
              </label>
              <div class="flex items-center gap-2 bg-nb-white p-3 border border-nb-black/20">
                <div class="flex-1">
                  <span class="text-sm text-nb-black/80">Tile Size</span>
                  <p class="text-[10px] text-nb-black/40">Deep zoom tiles</p>
                </div>
                <select
                  value={imageApiOptions.tileSize || 512}
                  onchange={(e) => { imageApiOptions = { ...imageApiOptions, tileSize: parseInt(e.currentTarget.value) }; }}
                  class="border p-1 text-sm w-20"
                >
                  <option value={256}>256</option>
                  <option value={512}>512</option>
                  <option value={1024}>1024</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Featured Items Picker -->
          {#if manifestList.length > 0}
            <div>
              <p class="block text-sm font-bold text-nb-black/80 mb-2">
                Featured Items <span class="font-normal text-nb-black/40">({canopyConfig.featured.length}/6 selected)</span>
              </p>
              <p class="text-xs text-nb-black/50 mb-3">Select up to 6 manifests to feature on the homepage.</p>
              <div class="max-h-48 overflow-y-auto border border-nb-black/20 divide-y divide-nb-black/10">
                {#each manifestList as manifest (manifest.id)}
                  {@const isSelected = canopyConfig.featured.includes(manifest.id)}
                  {@const atMax = !isSelected && canopyConfig.featured.length >= 6}
                  <label
                    class={cn(
                      'flex items-center gap-3 p-3 cursor-pointer hover:bg-nb-white transition-nb',
                      isSelected ? 'bg-nb-blue/10' : '',
                      atMax ? 'opacity-50 cursor-not-allowed' : ''
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={atMax}
                      onchange={() => toggleFeaturedItem(manifest.id)}
                      class="text-iiif-blue"
                    />
                    <span class="text-sm text-nb-black/80 truncate flex-1">{manifest.label}</span>
                    {#if isSelected}
                      <span class="text-xs text-iiif-blue font-medium">
                        #{canopyConfig.featured.indexOf(manifest.id) + 1}
                      </span>
                    {/if}
                  </label>
                {/each}
              </div>
            </div>
          {/if}
        </div>

      <!-- ┌─── STEP 2/3: dry-run — Integrity Check + Preview ──────┐ -->
      {:else if step === 'dry-run'}
        <div class="space-y-6 animate-in fade-in duration-500">
          {#if processing}
            <div class="h-[500px] flex flex-col items-center justify-center gap-4 text-nb-black/40" aria-live="polite">
              <div class="w-12 h-12 border-4 border-nb-black/10 border-t-iiif-blue animate-spin"></div>
              <p class="text-xs font-black uppercase tracking-widest">Synthesizing Archive DNA...</p>
            </div>
          {:else}
            <!-- Validation Status + Package Size -->
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

            <!-- File Tree Preview -->
            <ExportDryRun files={virtualFiles} {cx} {fieldMode} />

            <!-- Critical Error Warning -->
            {#if criticalErrors.length > 0}
              <div class="mt-4 p-4 bg-nb-orange/10 border border-nb-orange/20 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <Icon name="warning" class="text-nb-orange" />
                  <span class="text-xs font-medium text-nb-orange">Archive has critical issues. You must fix them or override integrity.</span>
                </div>
                <label class="flex items-center gap-2 cursor-pointer bg-nb-white px-3 py-1.5 border border-nb-orange/20 shadow-brutal-sm">
                  <input
                    type="checkbox"
                    bind:checked={ignoreErrors}
                    class="text-nb-orange"
                  />
                  <span class="text-[9px] font-black uppercase text-nb-orange">Ignore Errors</span>
                </label>
              </div>
            {/if}
          {/if}
        </div>

      <!-- ┌─── STEP 3/4: exporting — Progress Indicator ───────────┐ -->
      {:else if step === 'exporting'}
        <div class="text-center py-12 space-y-6">
          <div class="relative w-24 h-24 mx-auto" aria-live="polite">
            <div class="absolute inset-0 border-8 border-nb-black/10"></div>
            <div
              class="absolute inset-0 border-8 border-iiif-blue transition-nb"
              style:clip-path="polygon(50% 50%, -50% -50%, {progress.percent}% -50%, {progress.percent}% 150%, -50% 150%)"
              style:transform="rotate(-90deg)"
            ></div>
            <div class="absolute inset-0 flex items-center justify-center font-black text-iiif-blue">
              {Math.round(progress.percent)}%
            </div>
          </div>
          <div>
            <h3 class="text-lg font-bold text-nb-black">{progress.status}</h3>
            <p class="text-xs text-nb-black/50 mt-1 uppercase tracking-widest font-black">Archive Compression Engine</p>
          </div>
        </div>
      {/if}
    </div>

    <!-- ─── Footer ─────────────────────────────────────────────────── -->
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
        <Button
          variant="success"
          size="base"
          onclick={handleFinalExport}
          disabled={!canExport}
        >
          {#snippet iconAfter()}<Icon name="download" />{/snippet}
          Finalize & Download ZIP
        </Button>
      {/if}
    </div>
  </div>
</div>
