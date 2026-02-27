<!--
  StagingWorkbench Organism

  Full staging workbench with analysis, file tree, archive, preview,
  context menus, modals, ingest progress, and completion summary.

  Architecture:
  - Two-phase component: Loading/Analysis -> Main Workbench
  - ModalDialog wrapper for the entire workbench
  - Three-pane layout: SourceTreePane (left) + ArchivePane (center) + PreviewPane (right, optional)
  - Resizable split via mousedown/mousemove/mouseup
  - Context menu system using model builders
  - Ingest with progress tracking + completion summary
  - CSV import, conflict detection, unsupported files, analysis summary
-->
<script lang="ts">
  import type { AbstractionLevel, FileTree, IIIFItem } from '@/src/shared/types';
  import type { IngestAnalysisResult } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';
  import type { FlatFileTreeNode, NodeAnnotations } from '../../model';
  import type { SourceManifests } from '@/src/entities/collection/model/stagingService';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import type { IngestUndoRecord, UnsupportedFile } from '../../model/stagingWorkbenchHelpers';
  import { applyAnnotationsToTree, buildDirectoryMenuSections, buildFileMenuSections, buildCollectionMenuSections } from '../../model';
  import { detectConflicts } from '../../model/conflictDetection';
  import { StagingCollections } from '../../model/StagingCollections.svelte';
  import {
    collectUnsupportedFiles, getUniqueUnsupportedExts, findAnalysisNode,
    buildAnnotationsFromAnalysis, processCsvImport, mapIngestProgress, buildAnalysisSummary,
  } from '../../model/stagingWorkbenchHelpers';
  import { analyzeForIngest } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';
  import { buildSourceManifests } from '@/src/entities/collection/model/stagingService';
  import { FEATURE_FLAGS } from '@/src/shared/constants';
  // TODO: Web Worker ingest pipeline (future)
  import { uiLog } from '@/src/shared/services/logger';
  import { terminology } from '@/src/shared/stores';
  import { vault } from '@/src/shared/stores/vault.svelte';
  import { IngestProgressStore } from '@/src/shared/lib/hooks/ingestProgress.svelte';

  import ModalDialog from '@/src/shared/ui/molecules/ModalDialog.svelte';
  import ContextMenu from '@/src/shared/ui/molecules/ContextMenu.svelte';
  import ContextMenuSection from '@/src/shared/ui/molecules/ContextMenuSection.svelte';
  import ContextMenuItem from '@/src/shared/ui/molecules/ContextMenuItem.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import SourceTreePane from '../molecules/SourceTreePane.svelte';
  import ArchivePane from '../molecules/ArchivePane.svelte';
  import PreviewPane from '../molecules/PreviewPane.svelte';
  import IngestProgressPanel from '../molecules/IngestProgressPanel.svelte';
  import MetadataTemplateExport from '../molecules/MetadataTemplateExport.svelte';
  import StagingBanners from '../molecules/StagingBanners.svelte';
  import StagingModals from '../molecules/StagingModals.svelte';
  import StagingCompletionSummary from '../molecules/StagingCompletionSummary.svelte';

  // ── Props ──

  interface Props {
    initialTree: FileTree;
    onIngest: (tree: FileTree, merge: boolean, progressCallback: (msg: string, pct: number) => void) => void | Promise<void>;
    onCancel: () => void;
    abstractionLevel?: AbstractionLevel;
  }

  let { initialTree, onIngest, onCancel, abstractionLevel = 'standard' }: Props = $props();

  // Compute existingRoot on-demand from vault (not in render loop)
  const existingRoot = $derived(vault.rootId ? vault.export() : null);

  // ── Phase 1: Loading / Analysis ──

  let isProcessing = $state(true);
  let progress = $state({ message: 'Analyzing files...', percent: 0 });
  let sourceManifests = $state<SourceManifests | null>(null);
  let analysisResult = $state<IngestAnalysisResult | null>(null);
  let unsupportedFiles = $state<UnsupportedFile[]>([]);

  const defaultCx: ContextualClassNames = {
    surface: 'bg-nb-white border-2 border-nb-black', headerBg: 'bg-nb-cream',
    text: 'text-nb-black', textMuted: 'text-nb-black/50', border: 'border-nb-black/20',
    input: 'bg-nb-white', accent: 'bg-nb-blue', active: 'bg-nb-blue/10',
    pageBg: 'bg-nb-white', divider: 'border-nb-black/20',
  };

  // Analysis $effect (legitimate async side effect)
  $effect(() => {
    const tree = initialTree;
    let cancelled = false;

    const run = async () => {
      isProcessing = true;
      progress = { message: 'Building file tree...', percent: 10 };
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        progress = { message: 'Analyzing folder structure...', percent: 25 };
        const analysis = await analyzeForIngest(tree);
        if (cancelled) return;
        analysisResult = analysis;

        progress = { message: 'Detecting file sequences...', percent: 50 };
        await new Promise(resolve => setTimeout(resolve, 100));
        if (cancelled) return;
        unsupportedFiles = collectUnsupportedFiles(tree, tree.path);

        const flattenTree = (node: FileTree): File[] => {
          const files: File[] = [];
          node.files.forEach(f => files.push(f));
          node.directories.forEach(dir => files.push(...flattenTree(dir)));
          return files;
        };
        const files = flattenTree(tree);
        if (files.length === 0) throw new Error('No files found in the selected directory');

        progress = { message: 'Building manifests...', percent: 75 };
        const manifests = buildSourceManifests(files);
        if (cancelled) return;
        if (!manifests || !manifests.manifests) throw new Error('Failed to build manifests from files');

        progress = { message: `Found ${manifests.manifests.length} manifests`, percent: 100 };
        await new Promise(resolve => setTimeout(resolve, 300));
        if (cancelled) return;
        sourceManifests = manifests;
      } catch (error) {
        if (cancelled) return;
        uiLog.error('Error building source manifests:', error instanceof Error ? error : undefined);
        progress = { message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, percent: 0 };
      } finally {
        if (!cancelled) isProcessing = false;
      }
    };
    run();
    return () => { cancelled = true; };
  });

  // ── Phase 2: Main Workbench State ──

  $effect(() => { terminology.level = abstractionLevel; });

  const ingestStore = new IngestProgressStore();
  const colStore = new StagingCollections();

  let showMetadataExport = $state(false);
  // svelte-ignore state_referenced_locally -- intentional: initial-value capture
  let merge = $state(!!existingRoot);
  let splitPosition = $state(40);
  let filterText = $state('');
  let annotationsMap = $state.raw<Map<string, NodeAnnotations>>(new Map());
  let selectedPaths = $state<string[]>([]);
  let focusedPane = $state<'source' | 'archive'>('source');

  $effect(() => {
    if (analysisResult?.root && annotationsMap.size === 0) {
      annotationsMap = buildAnnotationsFromAnalysis(analysisResult.root);
    }
  });

  // Context menu state
  let contextMenu = $state<{ x: number; y: number; targetPath: string; isDirectory: boolean; pane: 'source' | 'archive' } | null>(null);
  let contextMenuOpen = $state(false);
  $effect(() => { if (!contextMenuOpen && contextMenu) contextMenu = null; });

  // Modal states
  let behaviorModal = $state<{ path: string; resourceType: string } | null>(null);
  let rightsModal = $state<string | null>(null);
  let navDateModal = $state<string | null>(null);

  // Preview pane
  let previewTarget = $state<FlatFileTreeNode | null>(null);
  let showPreview = $state(false);

  // Banners
  let unsupportedBannerDismissed = $state(false);
  let showUnsupportedBanner = $derived(unsupportedFiles.length > 0 && !unsupportedBannerDismissed);
  let unsupportedExpanded = $state(false);
  let conflictDismissed = $state(false);
  let csvImportSummary = $state<string | null>(null);
  let csvInputEl: HTMLInputElement | undefined = $state();
  let completionSummary = $state<IngestUndoRecord | null>(null);
  const enableKeyboardDnd = FEATURE_FLAGS.USE_KEYBOARD_DND;
  let modalOpen = $state(true);

  // ── Derived ──

  const unsupportedExts = $derived(getUniqueUnsupportedExts(unsupportedFiles));
  const unsupportedPathSet = $derived(new Set(unsupportedFiles.map(f => f.path)));
  const conflicts = $derived(detectConflicts(initialTree, existingRoot));
  const archiveLayout = $derived(colStore.archiveLayout);

  const stats = $derived.by(() => ({
    totalManifests: sourceManifests?.manifests?.length ?? 0,
    totalFiles: sourceManifests?.manifests?.reduce((sum: number, m: { files: unknown[] }) => sum + m.files.length, 0) ?? 0,
    totalCollections: colStore.collections.length,
  }));

  const manifestLabel = $derived(terminology.formatCount(stats.totalManifests, 'Manifest'));
  const collectionLabel = $derived(terminology.formatCount(stats.totalCollections, 'Collection'));
  const analysisSummary = $derived(analysisResult ? buildAnalysisSummary(analysisResult) : null);

  const previewAnalysisNode = $derived.by(() => {
    if (!previewTarget || !analysisResult?.root) return undefined;
    return findAnalysisNode(analysisResult.root, previewTarget.path);
  });

  const contextMenuSections = $derived.by(() => {
    if (!contextMenu) return [];
    if (contextMenu.pane === 'source') {
      const ann = annotationsMap.get(contextMenu.targetPath) || {};
      if (contextMenu.isDirectory) {
        return buildDirectoryMenuSections(contextMenu.targetPath, ann, handleAnnotationChange,
          (path: string, resourceType: string) => { behaviorModal = { path, resourceType }; }, closeContextMenu,
          { onRightsModal: (path: string) => { rightsModal = path; }, onNavDateModal: (path: string) => { navDateModal = path; } });
      }
      return buildFileMenuSections(contextMenu.targetPath, ann, handleAnnotationChange, closeContextMenu, {
        onRightsModal: (path: string) => { rightsModal = path; }, onNavDateModal: (path: string) => { navDateModal = path; },
        onSetStart: (path: string) => { const existing = annotationsMap.get(path) || {}; handleAnnotationChange(path, { ...existing, start: !existing.start }); },
      });
    }
    return buildCollectionMenuSections(contextMenu.targetPath, {
      onRename: (id: string) => { const name = prompt('New collection name:'); if (name) colStore.renameCollection(id, name); },
      onDelete: (id: string) => colStore.deleteCollection(id),
      onCreateSub: () => { const name = prompt('Sub-collection name:'); if (name) colStore.createCollection(name); },
      onBehaviorModal: (id: string, resourceType: string) => { behaviorModal = { path: id, resourceType }; },
    }, closeContextMenu);
  });

  const previewWidth = $derived(showPreview && previewTarget ? 280 : 0);
  const aggregateProgress = $derived(ingestStore.aggregate);
  const ingestProgress = $derived(mapIngestProgress(ingestStore));

  // ── Handlers ──

  function handleAnnotationChange(path: string, ann: NodeAnnotations) {
    const next = new Map(annotationsMap);
    next.set(path, ann);
    annotationsMap = next;
  }

  function handleSourceSelect(path: string, additive: boolean) {
    if (additive) {
      selectedPaths = selectedPaths.includes(path) ? selectedPaths.filter(p => p !== path) : [...selectedPaths, path];
    } else {
      selectedPaths = [path];
    }
    focusedPane = 'source';
  }

  function handlePreviewSelect(node: FlatFileTreeNode) {
    previewTarget = node;
    if (!showPreview) showPreview = true;
  }

  function handleSourceContextMenu(e: MouseEvent, path: string, isDirectory: boolean) {
    e.preventDefault();
    contextMenu = { x: e.clientX, y: e.clientY, targetPath: path, isDirectory, pane: 'source' };
    contextMenuOpen = true;
  }

  function handleArchiveContextMenu(e: MouseEvent, collectionId: string) {
    e.preventDefault();
    contextMenu = { x: e.clientX, y: e.clientY, targetPath: collectionId, isDirectory: true, pane: 'archive' };
    contextMenuOpen = true;
  }

  function closeContextMenu() { contextMenuOpen = false; contextMenu = null; }

  async function handleReanalyze() {
    try { analysisResult = await analyzeForIngest(initialTree); }
    catch (e) { uiLog.error('Re-analysis failed:', e instanceof Error ? e : undefined); }
  }

  function handleConflictExclude(path: string) {
    handleAnnotationChange(path, { ...(annotationsMap.get(path) || {}), excluded: true });
  }

  async function handleCsvImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = processCsvImport(text, initialTree, annotationsMap);
      for (const { path, ann } of result.annotations) handleAnnotationChange(path, ann);
      csvImportSummary = result.summary;
      if (result.annotations.length > 0) setTimeout(() => { csvImportSummary = null; }, 5000);
    } catch (err) {
      csvImportSummary = `Import error: ${err instanceof Error ? err.message : 'Unknown'}`;
    }
    if (csvInputEl) csvInputEl.value = '';
  }

  async function handleIngest() {
    const annotatedTree = applyAnnotationsToTree(initialTree, annotationsMap);
    try {
      const opId = `legacy-ingest-${Date.now()}`;
      const totalFiles = stats.totalFiles;
      ingestStore.startOperation(opId, 'Import files', totalFiles);
      try {
        await onIngest(annotatedTree, merge, (_msg, pct) => { ingestStore.updateProgress(opId, Math.floor((pct / 100) * totalFiles)); });
        ingestStore.completeOperation(opId);
        completionSummary = { operationId: opId, timestamp: Date.now(), createdEntityIds: [],
          manifestsCreated: stats.totalManifests, collectionsCreated: archiveLayout.root.children.length + 1,
          canvasesCreated: totalFiles, filesProcessed: totalFiles };
        setTimeout(() => { ingestStore.clearCompleted(); onCancel(); }, 2000);
      } catch (err) { ingestStore.failOperation(opId, err instanceof Error ? err.message : 'Unknown error'); throw err; }
    } catch (error) { uiLog.error('Ingest failed:', error instanceof Error ? error : undefined); }
  }

  function handleResizeStart(e: MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startPos = splitPosition;
    const containerWidth = (e.target as HTMLElement).parentElement?.clientWidth || 1;
    const handleMove = (moveE: MouseEvent) => { splitPosition = Math.max(25, Math.min(75, startPos + ((moveE.clientX - startX) / containerWidth) * 100)); };
    const handleUp = () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }

  function handleModalClose() { modalOpen = false; onCancel(); }
</script>

<!-- Phase 1: Loading / Analysis -->
{#if isProcessing || !sourceManifests}
  <ModalDialog bind:open={modalOpen} title="Analyzing Content..." size="lg" onClose={handleModalClose} cx={defaultCx}>
    {#snippet children()}
      <div class="flex flex-col items-center justify-center py-16">
        <div class="w-20 h-20 bg-nb-blue/20 text-nb-blue flex items-center justify-center mb-6 animate-pulse">
          <Icon name="folder_open" class="text-4xl" />
        </div>
        <p class="text-sm text-nb-black/40 mb-4">{progress.message}</p>
        <div class="w-64 bg-nb-black/10 h-2 overflow-hidden">
          <div class="bg-nb-blue h-full transition-nb" style:width="{progress.percent}%"></div>
        </div>
      </div>
    {/snippet}
  </ModalDialog>

<!-- Phase 2a: Completion Summary -->
{:else if completionSummary && !aggregateProgress.isActive}
  <ModalDialog bind:open={modalOpen} title="Import Complete" size="lg" onClose={handleModalClose} cx={defaultCx}>
    {#snippet children()}
      <StagingCompletionSummary
        summary={completionSummary!}
        onUndo={() => { try { sessionStorage.removeItem('ingest-undo'); } catch { /* */ } completionSummary = null; }}
        onNavigate={onCancel}
      />
    {/snippet}
  </ModalDialog>

<!-- Phase 2b: Ingest In Progress -->
{:else if aggregateProgress.isActive}
  <div class="fixed inset-0 bg-nb-black/95 z-[500] flex items-center justify-center p-4">
    <div class="w-full max-w-2xl">
      <IngestProgressPanel
        progress={ingestProgress}
        controls={{ pause: () => {}, resume: () => {}, cancel: () => { ingestStore.cancelAll(); setTimeout(() => onCancel(), 500); }, retry: () => {} }}
        variant="full"
        oncancel={() => { ingestStore.cancelAll(); setTimeout(() => onCancel(), 500); }}
      />
    </div>
  </div>

<!-- Phase 2c: Main Workbench UI -->
{:else}
  <ModalDialog bind:open={modalOpen} title="Organize Your Files" size="xl" onClose={handleModalClose} cx={defaultCx}>
    {#snippet footer()}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="bare" onclick={() => showMetadataExport = true}
            class="px-3 py-2 text-sm text-nb-black/60 hover:bg-nb-cream flex items-center gap-2 transition-nb"
          >
            <Icon name="table_chart" class="text-nb-black/40" /> Export Template
          </Button>
          <Button variant="ghost" size="bare" onclick={() => csvInputEl?.click()}
            class="px-3 py-2 text-sm text-nb-black/60 hover:bg-nb-cream flex items-center gap-2 transition-nb"
          >
            <Icon name="upload_file" class="text-nb-black/40" /> Import Template
          </Button>
          <input bind:this={csvInputEl} type="file" accept=".csv" onchange={handleCsvImport} class="hidden" />
          {#if existingRoot}
            <label class="flex items-center gap-2 px-3 py-2 text-sm text-nb-black/60 cursor-pointer hover:bg-nb-cream transition-nb">
              <input type="checkbox" bind:checked={merge} class="border-nb-black/20" /> Merge with existing
            </label>
          {/if}
        </div>
        <Button variant="ghost" size="bare" onclick={handleIngest}
          class="px-6 py-2 bg-nb-blue text-white font-medium text-sm hover:bg-nb-blue flex items-center gap-2 shadow-brutal transition-nb"
        >
          <Icon name="publish" /> Import {terminology.t('Archive')}
        </Button>
      </div>
    {/snippet}

    {#snippet children()}
      <div class="flex flex-col h-[80vh] -m-4">
        <StagingBanners
          {enableKeyboardDnd} {csvImportSummary} {unsupportedFiles} {unsupportedExts}
          {showUnsupportedBanner} {unsupportedExpanded}
          onToggleUnsupportedExpanded={() => unsupportedExpanded = !unsupportedExpanded}
          onDismissUnsupported={() => unsupportedBannerDismissed = true}
          {conflicts} {conflictDismissed}
          onConflictExclude={handleConflictExclude}
          onDismissConflict={() => conflictDismissed = true}
          {analysisResult} {showPreview}
          onTogglePreview={() => showPreview = !showPreview}
          onReanalyze={handleReanalyze}
        />

        <div class="flex-1 flex min-h-0 h-full">
          <div style:width="{splitPosition}%" class="min-w-[280px]">
            <SourceTreePane
              fileTree={initialTree} sourceManifests={sourceManifests!} {annotationsMap}
              onAnnotationChange={handleAnnotationChange} {selectedPaths}
              onSelect={handleSourceSelect} onPreviewSelect={handlePreviewSelect}
              onClearSelection={() => selectedPaths = []} {filterText}
              onFilterChange={(v: string) => filterText = v}
              onContextMenu={handleSourceContextMenu} onDragStart={() => {}}
              isFocused={focusedPane === 'source'} onFocus={() => focusedPane = 'source'}
              analysisRoot={analysisResult?.root} unsupportedPaths={unsupportedPathSet}
            />
          </div>

          <button type="button" class="w-1 bg-nb-black/20 hover:bg-nb-blue cursor-col-resize transition-nb flex-shrink-0"
            aria-label="Resize panels" onmousedown={handleResizeStart}
          ></button>

          <div
            style:width={showPreview && previewTarget ? `calc(${100 - splitPosition}% - ${previewWidth}px)` : `${100 - splitPosition}%`}
            class="min-w-[280px] flex-1"
          >
            <ArchivePane
              {archiveLayout} sourceManifests={sourceManifests!}
              onAddToCollection={(collectionId: string, ids: string[]) => colStore.addToCollection(collectionId, ids)}
              onRemoveFromCollection={(cId: string, mIds: string[]) => colStore.removeFromCollection(cId, mIds)}
              onCreateCollection={(name: string) => colStore.createCollection(name)}
              onRenameCollection={(id: string, name: string) => colStore.renameCollection(id, name)}
              onDeleteCollection={(id: string) => colStore.deleteCollection(id)}
              onFocus={() => focusedPane = 'archive'}
              isFocused={focusedPane === 'archive'}
              onContextMenu={handleArchiveContextMenu}
            />
          </div>

          {#if showPreview && previewTarget}
            <div class="w-px bg-nb-black/20 flex-shrink-0"></div>
            <div style:width="{previewWidth}px" class="flex-shrink-0">
              <PreviewPane
                target={previewTarget}
                annotations={annotationsMap.get(previewTarget.path) ?? {}}
                analysisNode={previewAnalysisNode}
                onClose={() => { showPreview = false; previewTarget = null; }}
              />
            </div>
          {/if}
        </div>
      </div>

      {#if contextMenu}
        <ContextMenu bind:open={contextMenuOpen} x={contextMenu.x} y={contextMenu.y} cx={defaultCx}>
          {#each contextMenuSections as section, i}
            <ContextMenuSection label={section.title} cx={defaultCx}>
              {#each section.items as item (item.id)}
                <ContextMenuItem label={item.label} icon={item.icon} destructive={item.variant === 'danger'}
                  disabled={item.disabled ?? false} onclick={item.onClick} cx={defaultCx}
                />
              {/each}
            </ContextMenuSection>
          {/each}
        </ContextMenu>
      {/if}

      <StagingModals
        {behaviorModal} {rightsModal} {navDateModal} {annotationsMap}
        onAnnotationChange={handleAnnotationChange}
        onCloseBehavior={() => behaviorModal = null}
        onCloseRights={() => rightsModal = null}
        onCloseNavDate={() => navDateModal = null}
      />

      {#if showMetadataExport}
        <MetadataTemplateExport sourceManifests={sourceManifests!} onClose={() => showMetadataExport = false} />
      {/if}
    {/snippet}
  </ModalDialog>
{/if}
