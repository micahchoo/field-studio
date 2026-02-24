<!--
  StagingWorkbench Organism

  Full staging workbench with analysis, file tree, archive, preview,
  context menus, modals, ingest progress, and completion summary.

  Ported from: src/features/staging/ui/organisms/StagingWorkbench.tsx (1162 lines)

  Architecture:
  - Two-phase component: Loading/Analysis -> Main Workbench
  - ModalDialog wrapper for the entire workbench
  - Three-pane layout: SourceTreePane (left) + ArchivePane (center) + PreviewPane (right, optional)
  - Resizable split via mousedown/mousemove/mouseup
  - Multiple modal overlays: behavior, rights, navDate, metadata export
  - Context menu system using model builders
  - Ingest with progress tracking + completion summary
  - CSV import for bulk metadata
  - Conflict detection banner
  - Unsupported files banner
  - Analysis summary bar
-->
<script module lang="ts">
  import type { FileTree } from '@/src/shared/types';
  import type { IngestPreviewNode } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';
  import type { NodeAnnotations } from '../../model';
  import { MIME_TYPE_MAP } from '@/src/shared/constants/image';

  // ── Types ──

  export interface UnsupportedFile {
    path: string;
    name: string;
    ext: string;
  }

  export interface IngestUndoRecord {
    operationId: string;
    timestamp: number;
    createdEntityIds: string[];
    manifestsCreated: number;
    collectionsCreated: number;
    canvasesCreated: number;
    filesProcessed: number;
  }

  // ── Pure helper functions ──

  /** Collect all files with unsupported extensions from a FileTree */
  export function collectUnsupportedFiles(tree: FileTree, parentPath: string): UnsupportedFile[] {
    const result: UnsupportedFile[] = [];
    for (const [fileName] of tree.files) {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      if (!MIME_TYPE_MAP[ext]) {
        const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
        result.push({ path: filePath, name: fileName, ext });
      }
    }
    for (const dir of tree.directories.values()) {
      result.push(...collectUnsupportedFiles(dir, dir.path));
    }
    return result;
  }

  /** Unique unsupported extensions, sorted */
  export function getUniqueUnsupportedExts(files: UnsupportedFile[]): string[] {
    return [...new Set(files.map(f => f.ext))].sort();
  }

  /** Find an IngestPreviewNode by path in the analysis tree (depth-first) */
  export function findAnalysisNode(root: IngestPreviewNode | undefined, path: string): IngestPreviewNode | undefined {
    if (!root) return undefined;
    if (root.path === path) return root;
    for (const child of root.children) {
      const found = findAnalysisNode(child, path);
      if (found) return found;
    }
    return undefined;
  }

  /** Build initial annotations map from analysis results */
  export function buildAnnotationsFromAnalysis(node: IngestPreviewNode): Map<string, NodeAnnotations> {
    const map = new Map<string, NodeAnnotations>();
    const walk = (n: IngestPreviewNode) => {
      if (n.proposedType === 'Excluded') {
        map.set(n.path, { excluded: true });
      } else {
        const intent = n.proposedType as 'Collection' | 'Manifest';
        if (n.confidence >= 0.7) {
          map.set(n.path, { iiifIntent: intent });
        }
      }
      for (const child of n.children) walk(child);
    };
    walk(node);
    return map;
  }
</script>

<script lang="ts">
  import type { AbstractionLevel, IIIFItem, IngestProgress, IngestStage } from '@/src/shared/types';
  import type { IngestAnalysisResult } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';
  import type { FlatFileTreeNode } from '../../model';
  import type { SourceManifests } from '@/src/entities/collection/model/stagingService';
  import {
    applyAnnotationsToTree,
    buildDirectoryMenuSections,
    buildFileMenuSections,
    buildCollectionMenuSections,
  } from '../../model';
  import { detectConflicts } from '../../model/conflictDetection';
  import { analyzeForIngest } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';
  import { buildSourceManifests } from '@/src/entities/collection/model/stagingService';
  import { csvImporter } from '@/src/features/ingest/model/csvImporter';
  import { FEATURE_FLAGS, USE_WORKER_INGEST } from '@/src/shared/constants';
  import { BEHAVIOR_OPTIONS } from '@/src/shared/constants/iiif';
  import { ingestTreeWithWorkers } from '@/src/entities/manifest/model/ingest/ingestWorkerPool';
  import { uiLog } from '@/src/shared/services/logger';
  import { terminology } from '@/src/shared/stores';
  import { IngestProgressStore } from '@/src/shared/lib/hooks/ingestProgress.svelte';
  import { cn } from '@/src/shared/lib/cn';

  // Component imports
  import ModalDialog from '@/src/shared/ui/molecules/ModalDialog.svelte';
  import ContextMenu from '@/src/shared/ui/molecules/ContextMenu.svelte';
  import ContextMenuSection from '@/src/shared/ui/molecules/ContextMenuSection.svelte';
  import ContextMenuItem from '@/src/shared/ui/molecules/ContextMenuItem.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import SourceTreePane from '../molecules/SourceTreePane.svelte';
  import ArchivePane from '../molecules/ArchivePane.svelte';
  import ConflictPanel from '../molecules/ConflictPanel.svelte';
  import PreviewPane from '../molecules/PreviewPane.svelte';
  import IngestProgressPanel from '../molecules/IngestProgressPanel.svelte';
  import MetadataTemplateExport from '../molecules/MetadataTemplateExport.svelte';
  // @migration: BehaviorSelector and RightsSelector not yet migrated; import paths preserved
  // import BehaviorSelector from '@/src/features/metadata-edit/ui/atoms/BehaviorSelector.svelte';
  // import RightsSelector from '@/src/features/metadata-edit/ui/atoms/RightsSelector.svelte';

  // Placeholder cx for sub-components that require it
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';

  // ── Props ──

  interface Props {
    initialTree: FileTree;
    existingRoot: IIIFItem | null;
    onIngest: (tree: FileTree, merge: boolean, progressCallback: (msg: string, pct: number) => void) => void | Promise<void>;
    onCancel: () => void;
    abstractionLevel?: AbstractionLevel;
  }

  let {
    initialTree,
    existingRoot,
    onIngest,
    onCancel,
    abstractionLevel = 'standard',
  }: Props = $props();

  // ============================================================================
  // Phase 1: Loading / Analysis State
  // ============================================================================

  let isProcessing = $state(true);
  let progress = $state({ message: 'Analyzing files...', percent: 0 });
  let sourceManifests = $state<SourceManifests | null>(null);
  let analysisResult = $state<IngestAnalysisResult | null>(null);
  let unsupportedFiles = $state<UnsupportedFile[]>([]);

  // Minimal cx for modal contexts (workbench is always over a modal backdrop)
  const defaultCx: ContextualClassNames = {
    surface: 'bg-nb-white border-2 border-nb-black',
    headerBg: 'bg-nb-cream',
    text: 'text-nb-black',
    textMuted: 'text-nb-black/50',
    border: 'border-nb-black/20',
    input: 'bg-nb-white',
    accent: 'bg-nb-blue',
    active: 'bg-nb-blue/10',
    pageBg: 'bg-nb-white',
    divider: 'border-nb-black/20',
  };

  // ── Analysis $effect (legitimate async side effect) ──
  $effect(() => {
    // Depend on initialTree
    const tree = initialTree;
    const controller = new AbortController();
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

        // Scan for unsupported files
        const unsupported = collectUnsupportedFiles(tree, tree.path);
        unsupportedFiles = unsupported;

        // Flatten tree to files
        const flattenTree = (node: FileTree): File[] => {
          const files: File[] = [];
          node.files.forEach(f => files.push(f));
          node.directories.forEach(dir => files.push(...flattenTree(dir)));
          return files;
        };

        const files = flattenTree(tree);

        if (files.length === 0) {
          throw new Error('No files found in the selected directory');
        }

        progress = { message: 'Building manifests...', percent: 75 };
        const manifests = buildSourceManifests(files);
        if (cancelled) return;

        if (!manifests || !manifests.manifests) {
          throw new Error('Failed to build manifests from files');
        }

        progress = { message: `Found ${manifests.manifests.length} manifests`, percent: 100 };
        await new Promise(resolve => setTimeout(resolve, 300));
        if (cancelled) return;

        sourceManifests = manifests;
      } catch (error) {
        if (cancelled) return;
        uiLog.error('Error building source manifests:', error instanceof Error ? error : undefined);
        progress = {
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          percent: 0,
        };
      } finally {
        if (!cancelled) isProcessing = false;
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  });

  // ============================================================================
  // Phase 2: Main Workbench State (active when !isProcessing && sourceManifests)
  // ============================================================================

  // Terminology (from global singleton store)
  $effect(() => {
    terminology.level = abstractionLevel;
  });

  // Ingest progress (local instance per workbench)
  const ingestStore = new IngestProgressStore();

  // ── UI state ──
  let showMetadataExport = $state(false);
  let merge = $state(!!existingRoot);
  let splitPosition = $state(40);
  let filterText = $state('');

  // ── Annotations ($state.raw for large data) ──
  let annotationsMap = $state.raw<Map<string, NodeAnnotations>>(new Map());

  // Initialize annotations from analysis when analysis completes
  $effect(() => {
    if (analysisResult?.root && annotationsMap.size === 0) {
      annotationsMap = buildAnnotationsFromAnalysis(analysisResult.root);
    }
  });

  // ── Source tree selection ──
  let selectedPaths = $state<string[]>([]);

  // ── Staging state (simplified inline, replaces useStagingState) ──
  let focusedPane = $state<'source' | 'archive'>('source');

  function setFocusedPane(pane: 'source' | 'archive') {
    focusedPane = pane;
  }

  // Simplified collection management (archive layout)
  // In a full implementation, this would use the StagingStateStore class
  let collections = $state<Array<{ id: string; name: string; manifestIds: string[] }>>([]);

  const archiveLayout = $derived.by(() => {
    const childNodes = collections.map(c => ({
      id: c.id,
      name: c.name,
      type: 'Collection' as const,
      children: [] as import('@/src/features/staging/stores/stagingState.svelte').ArchiveNode[],
      manifestIds: c.manifestIds,
    }));
    const root = { id: 'root', name: 'Archive', type: 'Collection' as const, children: childNodes, manifestIds: [] };
    const flatIndex = new Map<string, import('@/src/features/staging/stores/stagingState.svelte').ArchiveNode>();
    flatIndex.set('root', root);
    for (const child of childNodes) flatIndex.set(child.id, child);
    return { root, flatIndex } as import('@/src/features/staging/stores/stagingState.svelte').ArchiveLayout;
  });

  function createNewCollection(name: string): string {
    const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    collections = [...collections, { id, name, manifestIds: [] }];
    return id;
  }

  function addToCollection(collectionId: string, manifestIds: string[]) {
    collections = collections.map(c =>
      c.id === collectionId
        ? { ...c, manifestIds: [...new Set([...c.manifestIds, ...manifestIds])] }
        : c
    );
  }

  function removeFromCollection(collectionId: string, manifestIds: string[]) {
    const toRemove = new Set(manifestIds);
    collections = collections.map(c =>
      c.id === collectionId
        ? { ...c, manifestIds: c.manifestIds.filter(id => !toRemove.has(id)) }
        : c
    );
  }

  function renameCollectionAction(id: string, newName: string) {
    collections = collections.map(c =>
      c.id === id ? { ...c, name: newName } : c
    );
  }

  function deleteCollectionAction(id: string) {
    collections = collections.filter(c => c.id !== id);
  }

  function getAllCollectionsList() {
    return collections;
  }

  // ── Context menu state ──
  let contextMenu = $state<{
    x: number; y: number; targetPath: string; isDirectory: boolean; pane: 'source' | 'archive';
  } | null>(null);
  let contextMenuOpen = $state(false);

  // Sync open state: when ContextMenu sets open=false (click-outside/Escape), clear our data
  $effect(() => {
    if (!contextMenuOpen && contextMenu) {
      contextMenu = null;
    }
  });

  // ── Modal states ──
  let behaviorModal = $state<{ path: string; resourceType: string } | null>(null);
  let rightsModal = $state<string | null>(null);
  let navDateModal = $state<string | null>(null);

  // ── Preview pane ──
  let previewTarget = $state<FlatFileTreeNode | null>(null);
  let showPreview = $state(false);

  // ── Unsupported files banner ──
  let unsupportedBannerDismissed = $state(false);
  let showUnsupportedBanner = $derived(unsupportedFiles.length > 0 && !unsupportedBannerDismissed);
  let unsupportedExpanded = $state(false);

  // ── Conflict detection ──
  let conflictDismissed = $state(false);

  // ── CSV import ──
  let csvImportSummary = $state<string | null>(null);
  let csvInputEl: HTMLInputElement | undefined = $state();

  // ── Ingest completion ──
  let completionSummary = $state<IngestUndoRecord | null>(null);

  // ── Keyboard DnD ──
  const enableKeyboardDnd = FEATURE_FLAGS.USE_KEYBOARD_DND;

  // ============================================================================
  // Derived values
  // ============================================================================

  const unsupportedExts = $derived(getUniqueUnsupportedExts(unsupportedFiles));

  const unsupportedPathSet = $derived(new Set(unsupportedFiles.map(f => f.path)));

  const conflicts = $derived(detectConflicts(initialTree, existingRoot));

  const stats = $derived.by(() => ({
    totalManifests: sourceManifests?.manifests?.length ?? 0,
    totalFiles: sourceManifests?.manifests?.reduce((sum: number, m: { files: unknown[] }) => sum + m.files.length, 0) ?? 0,
    totalCollections: getAllCollectionsList().length,
  }));

  const manifestLabel = $derived(terminology.formatCount(stats.totalManifests, 'Manifest'));
  const collectionLabel = $derived(terminology.formatCount(stats.totalCollections, 'Collection'));

  const analysisSummary = $derived.by(() => {
    if (!analysisResult) return null;
    const { summary } = analysisResult;
    const parts: string[] = [];
    if (summary.proposedManifests > 0) parts.push(`${summary.proposedManifests} manifests`);
    if (summary.proposedCollections > 0) parts.push(`${summary.proposedCollections} collections`);

    const media: string[] = [];
    if (summary.totalImages > 0) media.push(`${summary.totalImages} images`);
    if (summary.totalVideos > 0) media.push(`${summary.totalVideos} videos`);
    if (summary.totalAudios > 0) media.push(`${summary.totalAudios} audio`);

    const avgConfidence = analysisResult.root.children.length > 0
      ? Math.round(
          analysisResult.root.children.reduce((sum: number, c: IngestPreviewNode) => sum + c.confidence, 0) /
          analysisResult.root.children.length * 100
        )
      : Math.round(analysisResult.root.confidence * 100);

    return {
      detection: `Detected: ${parts.join(', ')} (${media.join(', ')})`,
      confidence: avgConfidence,
    };
  });

  const previewAnalysisNode = $derived.by(() => {
    if (!previewTarget || !analysisResult?.root) return undefined;
    return findAnalysisNode(analysisResult.root, previewTarget.path);
  });

  const contextMenuSections = $derived.by(() => {
    if (!contextMenu) return [];

    if (contextMenu.pane === 'source') {
      const ann = annotationsMap.get(contextMenu.targetPath) || {};
      if (contextMenu.isDirectory) {
        return buildDirectoryMenuSections(
          contextMenu.targetPath,
          ann,
          handleAnnotationChange,
          (path: string, resourceType: string) => { behaviorModal = { path, resourceType }; },
          closeContextMenu,
          {
            onRightsModal: (path: string) => { rightsModal = path; },
            onNavDateModal: (path: string) => { navDateModal = path; },
          },
        );
      } else {
        return buildFileMenuSections(
          contextMenu.targetPath,
          ann,
          handleAnnotationChange,
          closeContextMenu,
          {
            onRightsModal: (path: string) => { rightsModal = path; },
            onNavDateModal: (path: string) => { navDateModal = path; },
            onSetStart: (path: string) => {
              const existing = annotationsMap.get(path) || {};
              handleAnnotationChange(path, { ...existing, start: !existing.start });
            },
          },
        );
      }
    }

    return buildCollectionMenuSections(
      contextMenu.targetPath,
      {
        onRename: (id: string) => {
          const name = prompt('New collection name:');
          if (name) renameCollectionAction(id, name);
        },
        onDelete: deleteCollectionAction,
        onCreateSub: (_parentId: string) => {
          const name = prompt('Sub-collection name:');
          if (name) createNewCollection(name);
        },
        onBehaviorModal: (id: string, resourceType: string) => { behaviorModal = { path: id, resourceType }; },
      },
      closeContextMenu,
    );
  });

  const previewWidth = $derived(showPreview && previewTarget ? 280 : 0);

  const subtitle = $derived(
    analysisSummary
      ? `${analysisSummary.detection} — confidence: ${analysisSummary.confidence}%`
      : `${manifestLabel} | ${stats.totalFiles} files | ${collectionLabel}`
  );

  const aggregateProgress = $derived(ingestStore.aggregate);

  /** Map IngestProgressStore → IngestProgress shape expected by IngestProgressPanel */
  const ingestProgress = $derived.by((): IngestProgress | null => {
    const agg = ingestStore.aggregate;
    if (!agg.isActive && agg.totalOperations === 0) return null;
    const ops = ingestStore.operations;
    const activeOp = ops.find(o => o.status === 'running') ?? ops.find(o => o.status === 'paused') ?? ops[ops.length - 1];
    const stageMap: Record<string, IngestStage> = {
      running: 'processing', paused: 'processing', completed: 'complete',
      failed: 'error', cancelled: 'cancelled', pending: 'scanning',
    };
    const stage: IngestStage = stageMap[activeOp?.status ?? ''] ?? 'processing';
    const overallPct = Math.round((agg.overallProgress ?? 0) * 100);
    return {
      operationId: activeOp?.id ?? 'ingest',
      stage,
      stageProgress: overallPct,
      filesTotal: agg.totalFiles,
      filesCompleted: agg.completedFiles,
      filesProcessing: ops.filter(o => o.status === 'running').length,
      filesError: agg.failedFiles,
      files: [],
      speed: 0,
      etaSeconds: Math.round((agg.estimatedTimeRemaining ?? 0) / 1000),
      startedAt: activeOp?.startedAt ?? Date.now(),
      updatedAt: Date.now(),
      isPaused: ops.some(o => o.status === 'paused'),
      isCancelled: ops.length > 0 && ops.every(o => o.status === 'cancelled'),
      activityLog: ingestStore.log.map(e => ({ timestamp: e.timestamp, level: e.level, message: e.message })),
      overallProgress: overallPct,
    };
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  function handleAnnotationChange(path: string, ann: NodeAnnotations) {
    const next = new Map(annotationsMap);
    next.set(path, ann);
    annotationsMap = next;
  }

  function handleSourceSelect(path: string, additive: boolean) {
    if (additive) {
      selectedPaths = selectedPaths.includes(path)
        ? selectedPaths.filter(p => p !== path)
        : [...selectedPaths, path];
    } else {
      selectedPaths = [path];
    }
    setFocusedPane('source');
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

  function closeContextMenu() {
    contextMenuOpen = false;
    contextMenu = null;
  }

  async function handleReanalyze() {
    try {
      const result = await analyzeForIngest(initialTree);
      analysisResult = result;
    } catch (e) {
      uiLog.error('Re-analysis failed:', e instanceof Error ? e : undefined);
    }
  }

  function handleConflictExclude(path: string) {
    const existing = annotationsMap.get(path) || {};
    handleAnnotationChange(path, { ...existing, excluded: true });
  }

  async function handleCsvImport(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { headers, rows } = csvImporter.parseCSV(text);

      if (rows.length === 0) {
        csvImportSummary = 'No data rows found in CSV';
        return;
      }

      const filenameCol = csvImporter.detectFilenameColumn(headers);
      if (!filenameCol) {
        csvImportSummary = 'Could not detect filename column';
        return;
      }

      let matched = 0;
      let unmatched = 0;

      for (const row of rows) {
        const filename = row[filenameCol];
        if (!filename) { unmatched++; continue; }

        // Find matching path in file tree
        const searchTree = (tree: FileTree, parentPath: string): string | null => {
          for (const [name] of tree.files) {
            if (name === filename || name.replace(/\.[^/.]+$/, '') === filename.replace(/\.[^/.]+$/, '')) {
              return parentPath ? `${parentPath}/${name}` : name;
            }
          }
          for (const dir of tree.directories.values()) {
            const found = searchTree(dir, dir.path);
            if (found) return found;
          }
          return null;
        };
        const matchedPath = searchTree(initialTree, initialTree.path);

        if (!matchedPath) { unmatched++; continue; }

        const existing = annotationsMap.get(matchedPath) || {};
        const updated = { ...existing };

        for (const header of headers) {
          if (header === filenameCol || header.toLowerCase() === 'manifest') continue;
          const value = row[header];
          if (!value) continue;

          const lowerHeader = header.toLowerCase();
          if (lowerHeader === 'label') updated.label = value;
          else if (lowerHeader === 'rights') updated.rights = value;
          else if (lowerHeader === 'navdate' || lowerHeader === 'nav_date') updated.navDate = value;
          else if (lowerHeader === 'behavior' || lowerHeader === 'behaviour') {
            updated.iiifBehavior = value.split(',').map((b: string) => b.trim()).filter(Boolean);
          }
        }

        handleAnnotationChange(matchedPath, updated);
        matched++;
      }

      csvImportSummary = `Applied metadata to ${matched} of ${matched + unmatched} files (${unmatched} unmatched)`;
      setTimeout(() => { csvImportSummary = null; }, 5000);
    } catch (err) {
      csvImportSummary = `Import error: ${err instanceof Error ? err.message : 'Unknown'}`;
    }

    // Reset file input
    if (csvInputEl) csvInputEl.value = '';
  }

  async function handleIngest() {
    const annotatedTree = applyAnnotationsToTree(initialTree, annotationsMap);

    try {
      if (USE_WORKER_INGEST) {
        const opId = `ingest-${Date.now()}`;
        const totalFiles = stats.totalFiles;
        ingestStore.startOperation(opId, 'Import files', totalFiles);

        try {
          const result = await ingestTreeWithWorkers(annotatedTree, {
            generateThumbnails: true,
            onProgress: (p: { filesCompleted?: number; filesError?: number }) => {
              ingestStore.updateProgress(opId, p.filesCompleted ?? 0, p.filesError ?? 0);
            },
          });

          ingestStore.completeOperation(opId);

          if (result?.report) {
            const undoRecord: IngestUndoRecord = {
              operationId: opId,
              timestamp: Date.now(),
              createdEntityIds: [],
              manifestsCreated: result.report.summary?.filesTotal ?? 0,
              collectionsCreated: 0,
              canvasesCreated: result.report.summary?.filesTotal ?? 0,
              filesProcessed: result.report.summary?.filesTotal ?? 0,
            };
            completionSummary = undoRecord;
            try {
              sessionStorage.setItem('ingest-undo', JSON.stringify(undoRecord));
            } catch { /* sessionStorage may be unavailable */ }
          }

          onIngest(annotatedTree, merge, () => {});
          setTimeout(() => ingestStore.clearCompleted(), 3000);
        } catch (err) {
          ingestStore.failOperation(opId, err instanceof Error ? err.message : 'Unknown error');
          throw err;
        }
      } else {
        // Legacy path
        const opId = `legacy-ingest-${Date.now()}`;
        const totalFiles = stats.totalFiles;
        ingestStore.startOperation(opId, 'Import files', totalFiles);

        try {
          await onIngest(annotatedTree, merge, (msg, pct) => {
            const completedFiles = Math.floor((pct / 100) * totalFiles);
            ingestStore.updateProgress(opId, completedFiles);
          });

          ingestStore.completeOperation(opId);

          const report = {
            manifestsCreated: stats.totalManifests,
            collectionsCreated: archiveLayout.root.children.length + 1,
            canvasesCreated: totalFiles,
            filesProcessed: totalFiles,
          };
          completionSummary = {
            operationId: opId,
            timestamp: Date.now(),
            createdEntityIds: [],
            ...report,
          };

          setTimeout(() => {
            ingestStore.clearCompleted();
            onCancel();
          }, 2000);
        } catch (err) {
          ingestStore.failOperation(opId, err instanceof Error ? err.message : 'Unknown error');
          throw err;
        }
      }
    } catch (error) {
      uiLog.error('Ingest failed:', error instanceof Error ? error : undefined);
    }
  }

  // ── Resize handle ──
  function handleResizeStart(e: MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startPos = splitPosition;
    const container = (e.target as HTMLElement).parentElement;
    const containerWidth = container?.clientWidth || 1;

    const handleMove = (moveE: MouseEvent) => {
      const delta = moveE.clientX - startX;
      const newPos = startPos + (delta / containerWidth) * 100;
      splitPosition = Math.max(25, Math.min(75, newPos));
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }

  // Open modal state (always true for this component since it's displayed modally)
  let modalOpen = $state(true);

  function handleModalClose() {
    modalOpen = false;
    onCancel();
  }
</script>

<!-- ========================================================================== -->
<!-- Phase 1: Loading / Analysis                                                 -->
<!-- ========================================================================== -->

{#if isProcessing || !sourceManifests}
  <ModalDialog
    bind:open={modalOpen}
    title="Analyzing Content..."
    size="lg"
    onClose={handleModalClose}
    cx={defaultCx}
  >
    {#snippet children()}
      <div class="flex flex-col items-center justify-center py-16">
        <!-- Animated folder icon -->
        <div class="w-20 h-20 bg-nb-blue/20 text-nb-blue flex items-center justify-center mb-6 animate-pulse">
          <Icon name="folder_open" class="text-4xl" />
        </div>

        <!-- Progress message -->
        <p class="text-sm text-nb-black/40 mb-4">{progress.message}</p>

        <!-- Progress bar -->
        <div class="w-64 bg-nb-black/10 h-2 overflow-hidden">
          <div class="bg-nb-blue h-full transition-nb" style:width="{progress.percent}%"></div>
        </div>
      </div>
    {/snippet}
  </ModalDialog>

<!-- ========================================================================== -->
<!-- Phase 2a: Completion Summary                                                -->
<!-- ========================================================================== -->

{:else if completionSummary && !aggregateProgress.isActive}
  <ModalDialog
    bind:open={modalOpen}
    title="Import Complete"
    size="lg"
    onClose={handleModalClose}
    cx={defaultCx}
  >
    {#snippet children()}
      {@const s = completionSummary!}
      <div class="space-y-4">
        <!-- Success header -->
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 bg-nb-green/10 flex items-center justify-center">
            <Icon name="check_circle" class="text-4xl text-nb-green" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-nb-black/80">Import Successful</h3>
            <p class="text-sm text-nb-black/50">Your files have been imported into the archive</p>
          </div>
        </div>

        <!-- Stats grid -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 bg-nb-cream">
            <p class="text-2xl font-bold text-nb-black/70">{s.manifestsCreated}</p>
            <p class="text-xs text-nb-black/50">Manifests created</p>
          </div>
          <div class="p-3 bg-nb-cream">
            <p class="text-2xl font-bold text-nb-black/70">{s.collectionsCreated}</p>
            <p class="text-xs text-nb-black/50">Collections created</p>
          </div>
          <div class="p-3 bg-nb-cream">
            <p class="text-2xl font-bold text-nb-black/70">{s.canvasesCreated}</p>
            <p class="text-xs text-nb-black/50">Canvases created</p>
          </div>
          <div class="p-3 bg-nb-cream">
            <p class="text-2xl font-bold text-nb-black/70">{s.filesProcessed}</p>
            <p class="text-xs text-nb-black/50">Files processed</p>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="flex items-center justify-between pt-4 border-t border-nb-black/10">
          <Button variant="danger" size="sm" onclick={() => {
            try { sessionStorage.removeItem('ingest-undo'); } catch { /* */ }
            completionSummary = null;
          }}>
            <Icon name="undo" class="text-sm" /> Undo Import
          </Button>
          <Button variant="primary" size="base" onclick={onCancel}>
            <Icon name="archive" class="text-sm" /> Navigate to Archive
          </Button>
        </div>
      </div>
    {/snippet}
  </ModalDialog>

<!-- ========================================================================== -->
<!-- Phase 2b: Ingest In Progress                                                -->
<!-- ========================================================================== -->

{:else if aggregateProgress.isActive}
  <div class="fixed inset-0 bg-nb-black/95 z-[500] flex items-center justify-center p-4">
    <div class="w-full max-w-2xl">
      <IngestProgressPanel
        progress={ingestProgress}
        controls={{
          pause: () => {},
          resume: () => {},
          cancel: () => { ingestStore.cancelAll(); setTimeout(() => onCancel(), 500); },
          retry: () => {},
        }}
        variant="full"
        oncancel={() => {
          ingestStore.cancelAll();
          setTimeout(() => onCancel(), 500);
        }}
      />
    </div>
  </div>

<!-- ========================================================================== -->
<!-- Phase 2c: Main Workbench UI                                                 -->
<!-- ========================================================================== -->

{:else}
  <ModalDialog
    bind:open={modalOpen}
    title="Organize Your Files"
    size="xl"
    onClose={handleModalClose}
    cx={defaultCx}
  >
    {#snippet footer()}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <!-- Export Template -->
          <Button variant="ghost" size="bare" onclick={() => showMetadataExport = true}
            class="px-3 py-2 text-sm text-nb-black/60 hover:bg-nb-cream flex items-center gap-2 transition-nb"
          >
            <Icon name="table_chart" class="text-nb-black/40" />
            Export Template
          </Button>

          <!-- Import Template + hidden file input -->
          <Button variant="ghost" size="bare" onclick={() => csvInputEl?.click()}
            class="px-3 py-2 text-sm text-nb-black/60 hover:bg-nb-cream flex items-center gap-2 transition-nb"
          >
            <Icon name="upload_file" class="text-nb-black/40" />
            Import Template
          </Button>
          <input bind:this={csvInputEl} type="file" accept=".csv" onchange={handleCsvImport} class="hidden" />

          <!-- Merge checkbox -->
          {#if existingRoot}
            <label class="flex items-center gap-2 px-3 py-2 text-sm text-nb-black/60 cursor-pointer hover:bg-nb-cream transition-nb">
              <input type="checkbox" bind:checked={merge} class="border-nb-black/20" />
              Merge with existing
            </label>
          {/if}
        </div>

        <!-- Import button -->
        <Button variant="ghost" size="bare" onclick={handleIngest}
          class="px-6 py-2 bg-nb-blue text-white font-medium text-sm hover:bg-nb-blue flex items-center gap-2 shadow-brutal transition-nb"
        >
          <Icon name="publish" />
          Import {terminology.t('Archive')}
        </Button>
      </div>
    {/snippet}

    {#snippet children()}
      <div class="flex flex-col h-[80vh] -m-4">

        <!-- ============================================ -->
        <!-- Banners                                       -->
        <!-- ============================================ -->

        <!-- Keyboard DnD instructions -->
        {#if enableKeyboardDnd}
          <div class="flex-shrink-0 px-4 py-2 bg-sky-50 border-b border-sky-200 text-sky-700 text-xs flex items-center gap-2">
            <Icon name="keyboard" class="text-sky-500" />
            <span class="font-medium">Keyboard:</span>
            <span>Arrow keys to navigate | Space to select | Enter to drop | Escape to cancel</span>
          </div>
        {/if}

        <!-- CSV Import Summary -->
        {#if csvImportSummary}
          <div class="flex-shrink-0 px-4 py-2 bg-nb-green/10 border-b border-nb-green/30 text-nb-green text-xs flex items-center gap-2">
            <Icon name="check_circle" class="text-nb-green" />
            <span>{csvImportSummary}</span>
          </div>
        {/if}

        <!-- Unsupported files banner -->
        {#if showUnsupportedBanner && unsupportedFiles.length > 0}
          <div class="flex-shrink-0 border-b border-nb-orange/30 bg-nb-orange/5">
            <div class="flex items-center justify-between px-4 py-2">
              <div class="flex items-center gap-2">
                <Icon name="warning" class="text-nb-orange text-sm" />
                <span class="text-xs text-nb-orange">
                  {unsupportedFiles.length} unsupported file{unsupportedFiles.length !== 1 ? 's' : ''} will be skipped
                </span>
                <span class="text-[10px] text-nb-black/40">
                  (.{unsupportedExts.join(', .')})
                </span>
              </div>
              <div class="flex items-center gap-1">
                <Button variant="ghost" size="bare" onclick={() => unsupportedExpanded = !unsupportedExpanded}
                  class="px-2 py-1 text-[10px] text-nb-black/50 hover:bg-nb-cream"
                >
                  {unsupportedExpanded ? 'Collapse' : 'Details'}
                </Button>
                <Button variant="ghost" size="bare" onclick={() => unsupportedBannerDismissed = true}
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

        <!-- Conflict detection banner -->
        {#if conflicts.hasConflicts && !conflictDismissed}
          <ConflictPanel
            {conflicts}
            onExcludePath={handleConflictExclude}
            onDismiss={() => conflictDismissed = true}
          />
        {/if}

        <!-- Analysis summary bar -->
        {#if analysisResult}
          <div class="flex-shrink-0 px-4 py-1.5 border-b border-nb-black/10 bg-nb-cream/50 flex items-center justify-between">
            <div class="flex items-center gap-3 text-xs text-nb-black/60">
              <Icon name="auto_fix_high" class="text-nb-purple text-sm" />
              <span>
                {analysisResult.summary.proposedManifests} manifest{analysisResult.summary.proposedManifests !== 1 ? 's' : ''},
                {analysisResult.summary.proposedCollections} collection{analysisResult.summary.proposedCollections !== 1 ? 's' : ''} detected
              </span>
              {#if analysisResult.summary.hasMarkerFiles}
                <span class="px-1.5 py-0.5 bg-nb-purple/10 text-nb-purple text-[10px]">
                  Marker files found
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <Button variant="ghost" size="bare" onclick={() => showPreview = !showPreview}
                class={cn(
                  'px-2 py-1 text-[10px] flex items-center gap-1',
                  showPreview ? 'text-nb-blue bg-nb-blue/10' : 'text-nb-black/50 hover:bg-nb-cream'
                )}
              >
                <Icon name="preview" class="text-sm" /> Preview
              </Button>
              <Button variant="ghost" size="bare" onclick={handleReanalyze}
                class="px-2 py-1 text-[10px] text-nb-black/50 hover:bg-nb-cream flex items-center gap-1"
              >
                <Icon name="refresh" class="text-sm" /> Re-analyze
              </Button>
            </div>
          </div>
        {/if}

        <!-- ============================================ -->
        <!-- Main content: 2 or 3 panes                   -->
        <!-- ============================================ -->

        <div class="flex-1 flex min-h-0 h-full">

          <!-- Left pane: Source Tree -->
          <div style:width="{splitPosition}%" class="min-w-[280px]">
            <SourceTreePane
              fileTree={initialTree}
              sourceManifests={sourceManifests!}
              {annotationsMap}
              onAnnotationChange={handleAnnotationChange}
              {selectedPaths}
              onSelect={handleSourceSelect}
              onPreviewSelect={handlePreviewSelect}
              onClearSelection={() => selectedPaths = []}
              {filterText}
              onFilterChange={(v: string) => filterText = v}
              onContextMenu={handleSourceContextMenu}
              onDragStart={() => {}}
              isFocused={focusedPane === 'source'}
              onFocus={() => setFocusedPane('source')}
              analysisRoot={analysisResult?.root}
              unsupportedPaths={unsupportedPathSet}
            />
          </div>

          <!-- Resize handle -->
          <div
            class="w-1 bg-nb-black/20 hover:bg-nb-blue cursor-col-resize transition-nb flex-shrink-0"
            role="button"
            aria-label="Resize panels"
            onmousedown={handleResizeStart}
            tabindex="0"
          ></div>

          <!-- Center pane: Archive -->
          <div
            style:width={showPreview && previewTarget
              ? `calc(${100 - splitPosition}% - ${previewWidth}px)`
              : `${100 - splitPosition}%`}
            class="min-w-[280px] flex-1"
          >
            <ArchivePane
              {archiveLayout}
              sourceManifests={sourceManifests!}
              onAddToCollection={(collectionId: string, ids: string[]) => addToCollection(collectionId, ids)}
              onRemoveFromCollection={removeFromCollection}
              onCreateCollection={createNewCollection}
              onRenameCollection={renameCollectionAction}
              onDeleteCollection={deleteCollectionAction}
              onFocus={() => setFocusedPane('archive')}
              isFocused={focusedPane === 'archive'}
              onContextMenu={handleArchiveContextMenu}
            />
          </div>

          <!-- Right pane: Preview (collapsible) -->
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

      <!-- ============================================ -->
      <!-- Overlay: Context Menu                        -->
      <!-- ============================================ -->

      {#if contextMenu}
        <ContextMenu
          bind:open={contextMenuOpen}
          x={contextMenu.x}
          y={contextMenu.y}
          cx={defaultCx}
        >
          {#each contextMenuSections as section, i}
            <ContextMenuSection label={section.title} cx={defaultCx}>
              {#each section.items as item (item.id)}
                <ContextMenuItem
                  label={item.label}
                  icon={item.icon}
                  destructive={item.variant === 'danger'}
                  disabled={item.disabled ?? false}
                  onclick={item.onClick}
                  cx={defaultCx}
                />
              {/each}
            </ContextMenuSection>
          {/each}
        </ContextMenu>
      {/if}

      <!-- ============================================ -->
      <!-- Overlay: Behavior Selector Modal             -->
      <!-- ============================================ -->

      {#if behaviorModal}
        {@const bPath = behaviorModal.path}
        {@const bResourceType = behaviorModal.resourceType}
        {@const currentBehaviors = annotationsMap.get(bPath)?.iiifBehavior ?? []}
        {@const options = [...(BEHAVIOR_OPTIONS[bResourceType.toUpperCase() as keyof typeof BEHAVIOR_OPTIONS] ?? BEHAVIOR_OPTIONS['MANIFEST'])]}
        <div class="fixed inset-0 bg-nb-black/40 z-[600] flex items-center justify-center p-4" role="presentation">
          <div class="bg-nb-white border-2 border-nb-black shadow-brutal w-full max-w-lg">
            <div class="flex items-center justify-between p-4 border-b-2 border-nb-black">
              <h2 class="text-lg font-mono uppercase font-bold">Set Behaviors</h2>
              <button type="button" onclick={() => behaviorModal = null}
                class="p-1 hover:bg-nb-black/5 cursor-pointer border-0 bg-transparent" aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <div class="p-4">
              <p class="text-sm text-nb-black/60 mb-3">
                Set behavior for: <span class="font-mono text-nb-black/80">{bPath.split('/').pop()}</span>
              </p>
              <div class="space-y-2">
                {#each options as option (option)}
                  {@const isChecked = currentBehaviors.includes(option)}
                  <label class="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-nb-cream transition-nb">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onchange={() => {
                        const existing = annotationsMap.get(bPath) ?? {};
                        const next = isChecked
                          ? currentBehaviors.filter((b: string) => b !== option)
                          : [...currentBehaviors, option];
                        handleAnnotationChange(bPath, { ...existing, iiifBehavior: next });
                      }}
                      class="border-nb-black/20"
                    />
                    {option}
                  </label>
                {/each}
              </div>
              <div class="flex justify-end mt-4">
                <Button variant="ghost" onclick={() => behaviorModal = null}>Done</Button>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- ============================================ -->
      <!-- Overlay: Rights Selector Modal               -->
      <!-- ============================================ -->

      {#if rightsModal}
        {@const rPath = rightsModal}
        <div class="fixed inset-0 bg-nb-black/40 z-[600] flex items-center justify-center p-4" role="presentation">
          <div class="bg-nb-white border-2 border-nb-black shadow-brutal w-full max-w-lg">
            <div class="flex items-center justify-between p-4 border-b-2 border-nb-black">
              <h2 class="text-lg font-mono uppercase font-bold">Set Rights Statement</h2>
              <button type="button" onclick={() => rightsModal = null}
                class="p-1 hover:bg-nb-black/5 cursor-pointer border-0 bg-transparent" aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <div class="p-4">
              <label for="field-rights-uri" class="block text-sm font-medium mb-2">Rights URI</label>
              <input id="field-rights-uri"
                type="text"
                class="w-full border rounded px-3 py-2 text-sm"
                value={annotationsMap.get(rPath)?.rights ?? ''}
                onchange={(e: Event) => {
                  const value = (e.target as HTMLInputElement).value;
                  const existing = annotationsMap.get(rPath) ?? {};
                  handleAnnotationChange(rPath, { ...existing, rights: value || undefined });
                }}
                placeholder="https://creativecommons.org/licenses/by/4.0/"
              />
              <div class="flex justify-end mt-4">
                <Button variant="ghost" onclick={() => rightsModal = null}>Done</Button>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- ============================================ -->
      <!-- Overlay: NavDate Modal                       -->
      <!-- ============================================ -->

      {#if navDateModal}
        {@const ndPath = navDateModal}
        <div class="fixed inset-0 bg-nb-black/40 z-[600] flex items-center justify-center p-4" role="presentation">
          <div class="bg-nb-white border-2 border-nb-black shadow-brutal w-full max-w-lg">
            <div class="flex items-center justify-between p-4 border-b-2 border-nb-black">
              <h2 class="text-lg font-mono uppercase font-bold">Set Navigation Date</h2>
              <button type="button" onclick={() => navDateModal = null}
                class="p-1 hover:bg-nb-black/5 cursor-pointer border-0 bg-transparent" aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <div class="p-4">
              <label for="field-nav-date" class="block text-sm font-medium mb-2">Date (ISO 8601)</label>
              <input id="field-nav-date"
                type="datetime-local"
                class="w-full border rounded px-3 py-2 text-sm"
                value={(annotationsMap.get(ndPath)?.navDate ?? '').replace('Z', '').slice(0, 16)}
                onchange={(e: Event) => {
                  const value = (e.target as HTMLInputElement).value;
                  const existing = annotationsMap.get(ndPath) ?? {};
                  const isoDate = value ? `${value}:00Z` : undefined;
                  handleAnnotationChange(ndPath, { ...existing, navDate: isoDate });
                }}
              />
              <div class="flex justify-end mt-4">
                <Button variant="ghost" onclick={() => navDateModal = null}>Done</Button>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- ============================================ -->
      <!-- Overlay: Metadata Template Export             -->
      <!-- ============================================ -->

      {#if showMetadataExport}
        <MetadataTemplateExport
          sourceManifests={sourceManifests!}
          onClose={() => showMetadataExport = false}
        />
      {/if}

    {/snippet}
  </ModalDialog>
{/if}
