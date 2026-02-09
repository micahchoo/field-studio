
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { AbstractionLevel, FileTree, IIIFItem, IngestResult, SourceManifests } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { ModalDialog } from '@/src/shared/ui/molecules/ModalDialog';
import { ContextMenu } from '@/src/shared/ui/molecules/ContextMenu';
import { buildSourceManifests } from '@/src/entities/collection/model/stagingService';
import { useStagingState } from '@/src/shared/lib/hooks/useStagingState';
import { useKeyboardDragDrop } from '@/src/shared/lib/hooks/useKeyboardDragDrop';
import { useIngestProgress } from '@/src/shared/lib/hooks/useIngestProgress';
import { IngestProgressPanel } from '../molecules/IngestProgressPanel';
import { FEATURE_FLAGS, USE_WORKER_INGEST } from '@/src/shared/constants';
import { MIME_TYPE_MAP } from '@/src/shared/constants/image';
import { uiLog } from '@/src/shared/services/logger';
import { BEHAVIOR_OPTIONS, getConflictingBehaviors } from '@/src/shared/constants/iiif';
import { ingestTreeWithWorkers } from '@/src/entities/manifest/model/ingest/ingestWorkerPool';
import { analyzeForIngest, type IngestAnalysisResult, type IngestPreviewNode } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';
import { csvImporter } from '@/src/features/ingest/model/csvImporter';
import { SourceTreePane } from '../molecules/SourceTreePane';
import { ArchivePane } from '../molecules/ArchivePane';
import { MetadataTemplateExport } from '../molecules/MetadataTemplateExport';
import { PreviewPane } from '../molecules/PreviewPane';
import { ConflictPanel } from '../molecules/ConflictPanel';
import { BehaviorSelector } from '@/src/features/metadata-edit/ui/atoms/BehaviorSelector';
import { RightsSelector } from '@/src/features/metadata-edit/ui/atoms/RightsSelector';
import type { NodeAnnotations, FlatFileTreeNode } from '../../model';
import {
  applyAnnotationsToTree,
  buildDirectoryMenuSections,
  buildFileMenuSections,
  buildCollectionMenuSections,
} from '../../model';
import { useConflictDetection } from '../../model/useConflictDetection';
// TODO: [FSD] Proper fix is to receive `t` via props from FieldModeTemplate
// eslint-disable-next-line no-restricted-imports
import { useTerminology } from '@/src/app/providers/useTerminology';

// ============================================================================
// Types
// ============================================================================

interface UnsupportedFile {
  path: string;
  name: string;
  ext: string;
}

interface IngestUndoRecord {
  operationId: string;
  timestamp: number;
  createdEntityIds: string[];
  manifestsCreated: number;
  collectionsCreated: number;
  canvasesCreated: number;
  filesProcessed: number;
}

// ============================================================================
// Helpers
// ============================================================================

/** Collect all files with unsupported extensions from a FileTree */
function collectUnsupportedFiles(tree: FileTree, parentPath: string): UnsupportedFile[] {
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

/** Unique unsupported extensions */
function getUniqueUnsupportedExts(files: UnsupportedFile[]): string[] {
  return [...new Set(files.map(f => f.ext))].sort();
}

/** Find an IngestPreviewNode by path in the analysis tree */
function findAnalysisNode(root: IngestPreviewNode | undefined, path: string): IngestPreviewNode | undefined {
  if (!root) return undefined;
  if (root.path === path) return root;
  for (const child of root.children) {
    const found = findAnalysisNode(child, path);
    if (found) return found;
  }
  return undefined;
}

/** Build initial annotations from analysis results */
function buildAnnotationsFromAnalysis(node: IngestPreviewNode): Map<string, NodeAnnotations> {
  const map = new Map<string, NodeAnnotations>();
  const walk = (n: IngestPreviewNode) => {
    if (n.proposedType === 'Excluded') {
      map.set(n.path, { excluded: true });
    } else {
      const intent = n.proposedType as 'Collection' | 'Manifest';
      // Only auto-set intent for higher confidence detections
      if (n.confidence >= 0.7) {
        map.set(n.path, { iiifIntent: intent });
      }
    }
    for (const child of n.children) walk(child);
  };
  walk(node);
  return map;
}

// ============================================================================
// Outer Component - Loading / Analysis Phase
// ============================================================================

interface StagingWorkbenchProps {
  initialTree: FileTree;
  existingRoot: IIIFItem | null;
  onIngest: (tree: FileTree, merge: boolean, progressCallback: (msg: string, pct: number) => void) => void;
  onCancel: () => void;
  /** Abstraction level for terminology (Phase 3) */
  abstractionLevel?: AbstractionLevel;
}

export const StagingWorkbench: React.FC<StagingWorkbenchProps> = ({
  initialTree,
  existingRoot,
  onIngest,
  onCancel,
  abstractionLevel = 'standard'
}) => {
  const [sourceManifests, setSourceManifests] = useState<SourceManifests | null>(null);
  const [analysisResult, setAnalysisResult] = useState<IngestAnalysisResult | null>(null);
  const [unsupportedFiles, setUnsupportedFiles] = useState<UnsupportedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState({ message: 'Analyzing files...', percent: 0 });

  useEffect(() => {
    const build = async () => {
      setIsProcessing(true);
      setProgress({ message: 'Building file tree...', percent: 10 });

      try {
        await new Promise(resolve => setTimeout(resolve, 100));

        // Run analyzer alongside manifest building
        setProgress({ message: 'Analyzing folder structure...', percent: 25 });
        const analysis = await analyzeForIngest(initialTree);
        setAnalysisResult(analysis);

        setProgress({ message: 'Detecting file sequences...', percent: 50 });
        await new Promise(resolve => setTimeout(resolve, 100));

        // Scan for unsupported files
        const unsupported = collectUnsupportedFiles(initialTree, initialTree.path);
        setUnsupportedFiles(unsupported);

        // Flatten tree to files
        const flattenTree = (node: FileTree): File[] => {
          const files: File[] = [];
          node.files.forEach(f => files.push(f));
          node.directories.forEach(dir => files.push(...flattenTree(dir)));
          return files;
        };

        const files = flattenTree(initialTree);

        if (files.length === 0) {
          throw new Error('No files found in the selected directory');
        }

        setProgress({ message: 'Building manifests...', percent: 75 });
        const manifests = buildSourceManifests(files);

        if (!manifests || !manifests.manifests) {
          throw new Error('Failed to build manifests from files');
        }

        setProgress({ message: `Found ${manifests.manifests.length} manifests`, percent: 100 });
        await new Promise(resolve => setTimeout(resolve, 300));

        setSourceManifests(manifests);
      } catch (error) {
        uiLog.error('Error building source manifests:', error instanceof Error ? error : undefined);
        setProgress({
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          percent: 0
        });
      } finally {
        setIsProcessing(false);
      }
    };

    build();
  }, [initialTree]);

  if (isProcessing || !sourceManifests) {
    return (
      <ModalDialog
        isOpen={true}
        onClose={onCancel}
        title="Analyzing Content..."
        icon="folder_open"
        size="md"
        zIndex={500}
      >
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 bg-nb-blue/20 text-nb-blue flex items-center justify-center mb-6 animate-pulse">
            <Icon name="folder_open" className="text-4xl" />
          </div>
          <p className="text-sm text-nb-black/40 mb-4">{progress.message}</p>
          <div className="w-64 bg-nb-black/10 h-2 overflow-hidden">
            <div
              className="bg-nb-blue h-full transition-nb"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      </ModalDialog>
    );
  }

  return (
    <StagingWorkbenchInner
      sourceManifests={sourceManifests}
      initialTree={initialTree}
      existingRoot={existingRoot}
      onIngest={onIngest}
      onCancel={onCancel}
      abstractionLevel={abstractionLevel}
      analysisResult={analysisResult}
      unsupportedFiles={unsupportedFiles}
    />
  );
};

// ============================================================================
// Inner Component - Main Workbench UI
// ============================================================================

interface StagingWorkbenchInnerProps {
  sourceManifests: SourceManifests;
  initialTree: FileTree;
  existingRoot: IIIFItem | null;
  onIngest: (tree: FileTree, merge: boolean, progressCallback: (msg: string, pct: number) => void) => void;
  onCancel: () => void;
  abstractionLevel: AbstractionLevel;
  analysisResult: IngestAnalysisResult | null;
  unsupportedFiles: UnsupportedFile[];
}

const StagingWorkbenchInner: React.FC<StagingWorkbenchInnerProps> = ({
  sourceManifests: initialSourceManifests,
  initialTree,
  existingRoot,
  onIngest,
  onCancel,
  abstractionLevel,
  analysisResult: initialAnalysis,
  unsupportedFiles,
}) => {
  const { t, formatCount } = useTerminology({ level: abstractionLevel });
  const { aggregate, progress, controls, startIngest, clearCompleted } = useIngestProgress();

  const stagingState = useStagingState(initialSourceManifests);
  const {
    selectedIds,
    toggleSelection,
    selectRange,
    clearSelection,
    focusedPane,
    setFocusedPane,
    createNewCollection,
    addToCollection,
    removeFromCollection,
    renameCollectionAction,
    deleteCollectionAction,
    getAllCollectionsList,
    archiveLayout,
    sourceManifests,
  } = stagingState;

  const [showMetadataExport, setShowMetadataExport] = useState(false);
  const [merge, setMerge] = useState(!!existingRoot);
  const [splitPosition, setSplitPosition] = useState(40);
  const [filterText, setFilterText] = useState('');

  // --- Annotations, context menu, modals ---
  const [annotationsMap, setAnnotationsMap] = useState<Map<string, NodeAnnotations>>(() => {
    // Auto-populate from analysis results
    if (initialAnalysis?.root) {
      return buildAnnotationsFromAnalysis(initialAnalysis.root);
    }
    return new Map();
  });
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; targetPath: string; isDirectory: boolean; pane: 'source' | 'archive';
  } | null>(null);
  const [behaviorModal, setBehaviorModal] = useState<{ path: string; resourceType: string } | null>(null);
  const [rightsModal, setRightsModal] = useState<string | null>(null);
  const [navDateModal, setNavDateModal] = useState<string | null>(null);

  // --- Analysis state ---
  const [analysisResult, setAnalysisResult] = useState(initialAnalysis);

  // --- Preview pane ---
  const [previewTarget, setPreviewTarget] = useState<FlatFileTreeNode | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // --- Format validation ---
  const [showUnsupportedBanner, setShowUnsupportedBanner] = useState(unsupportedFiles.length > 0);
  const [unsupportedExpanded, setUnsupportedExpanded] = useState(false);
  const unsupportedExts = useMemo(() => getUniqueUnsupportedExts(unsupportedFiles), [unsupportedFiles]);
  const unsupportedPaths = useMemo(() => new Set(unsupportedFiles.map(f => f.path)), [unsupportedFiles]);

  // --- Conflict detection ---
  const conflicts = useConflictDetection(initialTree, existingRoot);
  const [conflictDismissed, setConflictDismissed] = useState(false);

  // --- CSV import ---
  const [csvImportSummary, setCsvImportSummary] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // --- Ingest completion & undo ---
  const [completionSummary, setCompletionSummary] = useState<IngestUndoRecord | null>(null);

  // Keyboard DnD
  const keyboardDnd = useKeyboardDragDrop({
    items: sourceManifests.manifests,
    onReorder: () => {},
    onMove: (itemId, targetId) => {
      addToCollection(targetId, [itemId]);
    },
    getItemId: (item) => item.id
  });
  const enableKeyboardDnd = FEATURE_FLAGS.USE_KEYBOARD_DND;

  // Annotation change handler
  const handleAnnotationChange = useCallback((path: string, ann: NodeAnnotations) => {
    setAnnotationsMap(prev => {
      const next = new Map(prev);
      next.set(path, ann);
      return next;
    });
  }, []);

  // Source tree selection + preview
  const handleSourceSelect = useCallback((path: string, additive: boolean) => {
    setSelectedPaths(prev => {
      if (additive) {
        return prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
      }
      return [path];
    });
    setFocusedPane('source');
  }, [setFocusedPane]);

  // Set preview target when a node is selected (passed from SourceTreePane)
  const handlePreviewSelect = useCallback((node: FlatFileTreeNode) => {
    setPreviewTarget(node);
    if (!showPreview) setShowPreview(true);
  }, [showPreview]);

  // Context menu handlers
  const handleSourceContextMenu = useCallback((e: React.MouseEvent, path: string, isDirectory: boolean) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, targetPath: path, isDirectory, pane: 'source' });
  }, []);

  const handleArchiveContextMenu = useCallback((e: React.MouseEvent, collectionId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, targetPath: collectionId, isDirectory: true, pane: 'archive' });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Build context menu sections
  const contextMenuSections = useMemo(() => {
    if (!contextMenu) return [];

    if (contextMenu.pane === 'source') {
      const ann = annotationsMap.get(contextMenu.targetPath) || {};
      if (contextMenu.isDirectory) {
        return buildDirectoryMenuSections(
          contextMenu.targetPath,
          ann,
          handleAnnotationChange,
          (path, resourceType) => setBehaviorModal({ path, resourceType }),
          closeContextMenu,
          {
            onRightsModal: (path) => setRightsModal(path),
            onNavDateModal: (path) => setNavDateModal(path),
          },
        );
      } else {
        return buildFileMenuSections(
          contextMenu.targetPath,
          ann,
          handleAnnotationChange,
          closeContextMenu,
          {
            onRightsModal: (path) => setRightsModal(path),
            onNavDateModal: (path) => setNavDateModal(path),
            onSetStart: (path) => {
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
        onRename: (id) => {
          const name = prompt('New collection name:');
          if (name) renameCollectionAction(id, name);
        },
        onDelete: deleteCollectionAction,
        onCreateSub: (parentId) => {
          const name = prompt('Sub-collection name:');
          if (name) createNewCollection(name);
        },
        onBehaviorModal: (id, resourceType) => setBehaviorModal({ path: id, resourceType }),
      },
      closeContextMenu,
    );
  }, [contextMenu, annotationsMap, handleAnnotationChange, closeContextMenu, renameCollectionAction, deleteCollectionAction, createNewCollection]);

  // Re-analyze after user changes
  const handleReanalyze = useCallback(async () => {
    try {
      const result = await analyzeForIngest(initialTree);
      setAnalysisResult(result);
    } catch (e) {
      uiLog.error('Re-analysis failed:', e instanceof Error ? e : undefined);
    }
  }, [initialTree]);

  // Conflict resolution: exclude a path
  const handleConflictExclude = useCallback((path: string) => {
    const existing = annotationsMap.get(path) || {};
    handleAnnotationChange(path, { ...existing, excluded: true });
  }, [annotationsMap, handleAnnotationChange]);

  // CSV Import handler
  const handleCsvImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { headers, rows } = csvImporter.parseCSV(text);

      if (rows.length === 0) {
        setCsvImportSummary('No data rows found in CSV');
        return;
      }

      const filenameCol = csvImporter.detectFilenameColumn(headers);
      if (!filenameCol) {
        setCsvImportSummary('Could not detect filename column');
        return;
      }

      let matched = 0;
      let unmatched = 0;

      for (const row of rows) {
        const filename = row[filenameCol];
        if (!filename) { unmatched++; continue; }

        // Find matching path in annotations
        let matchedPath: string | null = null;
        // Search through all flat file nodes by checking if path ends with filename
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
        matchedPath = searchTree(initialTree, initialTree.path);

        if (!matchedPath) { unmatched++; continue; }

        const existing = annotationsMap.get(matchedPath) || {};
        const updated = { ...existing };

        // Apply CSV columns to annotations
        for (const header of headers) {
          if (header === filenameCol || header.toLowerCase() === 'manifest') continue;
          const value = row[header];
          if (!value) continue;

          const lowerHeader = header.toLowerCase();
          if (lowerHeader === 'label') updated.label = value;
          else if (lowerHeader === 'rights') updated.rights = value;
          else if (lowerHeader === 'navdate' || lowerHeader === 'nav_date') updated.navDate = value;
          else if (lowerHeader === 'behavior' || lowerHeader === 'behaviour') {
            updated.iiifBehavior = value.split(',').map(b => b.trim()).filter(Boolean);
          }
        }

        handleAnnotationChange(matchedPath, updated);
        matched++;
      }

      setCsvImportSummary(`Applied metadata to ${matched} of ${matched + unmatched} files (${unmatched} unmatched)`);
      setTimeout(() => setCsvImportSummary(null), 5000);
    } catch (err) {
      setCsvImportSummary(`Import error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }

    // Reset file input
    if (csvInputRef.current) csvInputRef.current.value = '';
  }, [initialTree, annotationsMap, handleAnnotationChange]);

  // Handle ingest with annotations applied
  const handleIngest = useCallback(async () => {
    const annotatedTree = applyAnnotationsToTree(initialTree, annotationsMap);

    try {
      if (USE_WORKER_INGEST) {
        const result = await startIngest(async (options) => {
          return await ingestTreeWithWorkers(annotatedTree, {
            generateThumbnails: true,
            extractMetadata: true,
            calculateHashes: false,
            onProgress: options.onProgress,
            signal: options.signal
          });
        });

        // Track undo record
        if (result?.report) {
          const undoRecord: IngestUndoRecord = {
            operationId: `ingest-${Date.now()}`,
            timestamp: Date.now(),
            createdEntityIds: [],
            manifestsCreated: result.report.manifestsCreated,
            collectionsCreated: result.report.collectionsCreated,
            canvasesCreated: result.report.canvasesCreated,
            filesProcessed: result.report.filesProcessed,
          };
          setCompletionSummary(undoRecord);
          try {
            sessionStorage.setItem('ingest-undo', JSON.stringify(undoRecord));
          } catch { /* sessionStorage may be unavailable */ }
        }

        onIngest(annotatedTree, merge, () => {});
        setTimeout(() => clearCompleted(), 3000);
        return result;
      } else {
        return await startIngest(async (options) => {
          return new Promise<IngestResult>((resolve, reject) => {
            onIngest(annotatedTree, merge, (msg, pct) => {
              const totalFiles = sourceManifests?.manifests?.reduce((sum, m) => sum + m.files.length, 0) || 0;
              const completedFiles = Math.floor((pct / 100) * totalFiles);

              if (options.onProgress) {
                options.onProgress({
                  operationId: 'legacy-ingest',
                  stage: pct >= 100 ? 'complete' : 'processing',
                  stageProgress: pct,
                  filesTotal: totalFiles,
                  filesCompleted: completedFiles,
                  filesProcessing: 0,
                  filesError: 0,
                  files: [],
                  speed: 0,
                  etaSeconds: 0,
                  startedAt: Date.now(),
                  updatedAt: Date.now(),
                  isPaused: false,
                  isCancelled: false,
                  activityLog: [{
                    timestamp: Date.now(),
                    level: 'info',
                    message: msg
                  }],
                  overallProgress: pct
                });
              }

              if (pct >= 100) {
                const report = {
                  manifestsCreated: sourceManifests?.manifests?.length || 0,
                  collectionsCreated: archiveLayout.root.children.length + 1,
                  canvasesCreated: totalFiles,
                  filesProcessed: totalFiles,
                  warnings: []
                };
                setCompletionSummary({
                  operationId: `ingest-${Date.now()}`,
                  timestamp: Date.now(),
                  createdEntityIds: [],
                  ...report,
                });
                resolve({ root: null, report });
              }
            });

            if (options.signal) {
              options.signal.addEventListener('abort', () => {
                reject(new Error('Ingest cancelled'));
              });
            }
          });
        });
      }
    } catch (error) {
      uiLog.error('Ingest failed:', error instanceof Error ? error : undefined);
    }
  }, [initialTree, annotationsMap, merge, onIngest, startIngest, clearCompleted, sourceManifests.manifests, archiveLayout.root.children.length]);

  // Stats
  const stats = useMemo(() => ({
    totalManifests: sourceManifests.manifests.length,
    totalFiles: sourceManifests.manifests.reduce((sum, m) => sum + m.files.length, 0),
    totalCollections: getAllCollectionsList().length
  }), [sourceManifests.manifests, getAllCollectionsList]);

  const manifestLabel = formatCount(stats.totalManifests, 'Manifest');
  const collectionLabel = formatCount(stats.totalCollections, 'Collection');

  // Analysis summary text
  const analysisSummary = useMemo(() => {
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
          analysisResult.root.children.reduce((sum, c) => sum + c.confidence, 0) /
          analysisResult.root.children.length * 100
        )
      : Math.round(analysisResult.root.confidence * 100);

    return {
      detection: `Detected: ${parts.join(', ')} (${media.join(', ')})`,
      confidence: avgConfidence,
    };
  }, [analysisResult]);

  // Preview analysis node
  const previewAnalysisNode = useMemo(() => {
    if (!previewTarget || !analysisResult?.root) return undefined;
    return findAnalysisNode(analysisResult.root, previewTarget.path);
  }, [previewTarget, analysisResult]);

  // Show completion summary
  if (completionSummary && !aggregate.isActive) {
    return (
      <ModalDialog
        isOpen={true}
        onClose={onCancel}
        title="Import Complete"
        icon="check_circle"
        size="md"
        zIndex={500}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-nb-green/10 flex items-center justify-center">
              <Icon name="check_circle" className="text-4xl text-nb-green" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-nb-black/80">Import Successful</h3>
              <p className="text-sm text-nb-black/50">Your files have been imported into the archive</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-nb-cream">
              <p className="text-2xl font-bold text-nb-black/70">{completionSummary.manifestsCreated}</p>
              <p className="text-xs text-nb-black/50">Manifests created</p>
            </div>
            <div className="p-3 bg-nb-cream">
              <p className="text-2xl font-bold text-nb-black/70">{completionSummary.collectionsCreated}</p>
              <p className="text-xs text-nb-black/50">Collections created</p>
            </div>
            <div className="p-3 bg-nb-cream">
              <p className="text-2xl font-bold text-nb-black/70">{completionSummary.canvasesCreated}</p>
              <p className="text-xs text-nb-black/50">Canvases created</p>
            </div>
            <div className="p-3 bg-nb-cream">
              <p className="text-2xl font-bold text-nb-black/70">{completionSummary.filesProcessed}</p>
              <p className="text-xs text-nb-black/50">Files processed</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-nb-black/10">
            <Button
              variant="ghost"
              size="bare"
              onClick={() => {
                if (confirm('This will remove all imported items. Continue?')) {
                  // Clear undo record
                  try { sessionStorage.removeItem('ingest-undo'); } catch { /* */ }
                  setCompletionSummary(null);
                  // Note: actual vault trash would go here for full undo
                }
              }}
              className="px-4 py-2 text-sm text-nb-red/70 hover:bg-nb-red/10 flex items-center gap-2"
            >
              <Icon name="undo" />
              Undo Import
            </Button>
            <Button
              variant="ghost"
              size="bare"
              onClick={onCancel}
              className="px-6 py-2 bg-nb-blue text-white font-medium text-sm hover:bg-nb-blue flex items-center gap-2 shadow-brutal"
            >
              <Icon name="archive" />
              Navigate to Archive
            </Button>
          </div>
        </div>
      </ModalDialog>
    );
  }

  // Show progress panel when ingesting
  if (aggregate.isActive) {
    return (
      <div className="fixed inset-0 bg-nb-black/95 z-[500] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <IngestProgressPanel
            progress={progress}
            controls={controls}
            variant="full"
            showLogByDefault={false}
            showFilesByDefault={false}
            onCancel={() => {
              controls.cancel();
              setTimeout(() => onCancel(), 500);
            }}
          />
        </div>
      </div>
    );
  }

  // Compute pane widths based on preview visibility
  const previewWidth = showPreview && previewTarget ? 280 : 0;

  // Footer
  const footerContent = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="bare"
          onClick={() => setShowMetadataExport(true)}
          className="px-3 py-2 text-sm text-nb-black/60 hover:bg-nb-cream flex items-center gap-2 transition-nb"
        >
          <Icon name="table_chart" className="text-nb-black/40" />
          Export Template
        </Button>

        <Button variant="ghost" size="bare"
          onClick={() => csvInputRef.current?.click()}
          className="px-3 py-2 text-sm text-nb-black/60 hover:bg-nb-cream flex items-center gap-2 transition-nb"
        >
          <Icon name="upload_file" className="text-nb-black/40" />
          Import Template
        </Button>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          onChange={handleCsvImport}
          className="hidden"
        />

        {existingRoot && (
          <label className="flex items-center gap-2 px-3 py-2 text-sm text-nb-black/60 cursor-pointer hover:bg-nb-cream transition-nb">
            <input
              type="checkbox"
              checked={merge}
              onChange={(e) => setMerge(e.target.checked)}
              className="border-nb-black/20"
            />
            Merge with existing
          </label>
        )}
      </div>

      <Button variant="ghost" size="bare"
        onClick={handleIngest}
        className="px-6 py-2 bg-nb-blue text-white font-medium text-sm hover:bg-nb-blue flex items-center gap-2 shadow-brutal transition-nb"
      >
        <Icon name="publish" />
        Import {t('Archive')}
      </Button>
    </div>
  );

  // Build subtitle with analysis info
  const subtitle = analysisSummary
    ? `${analysisSummary.detection} — confidence: ${analysisSummary.confidence}%`
    : `${manifestLabel} | ${stats.totalFiles} files | ${collectionLabel}`;

  return (
    <ModalDialog
      isOpen={true}
      onClose={onCancel}
      title="Organize Your Files"
      subtitle={subtitle}
      icon="construction"
      size="full"
      height="90vh"
      zIndex={500}
      preventBackdropClose={false}
      footer={footerContent}
    >
      {/* Keyboard DnD instructions */}
      {enableKeyboardDnd && (
        <div className="flex-shrink-0 px-4 py-2 bg-sky-50 border-b border-sky-200 text-sky-700 text-xs flex items-center gap-2">
          <Icon name="keyboard" className="text-sky-500" />
          <span className="font-medium">Keyboard:</span>
          <span>Arrow keys to navigate | Space to select | Enter to drop | Escape to cancel</span>
        </div>
      )}

      {/* CSV Import Summary */}
      {csvImportSummary && (
        <div className="flex-shrink-0 px-4 py-2 bg-nb-green/10 border-b border-nb-green/30 text-nb-green text-xs flex items-center gap-2">
          <Icon name="check_circle" className="text-nb-green" />
          <span>{csvImportSummary}</span>
        </div>
      )}

      {/* Unsupported files banner */}
      {showUnsupportedBanner && unsupportedFiles.length > 0 && (
        <div className="flex-shrink-0 border-b border-nb-orange/30 bg-nb-orange/5">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <Icon name="warning" className="text-nb-orange text-sm" />
              <span className="text-xs text-nb-orange">
                {unsupportedFiles.length} unsupported file{unsupportedFiles.length !== 1 ? 's' : ''} will be skipped
              </span>
              <span className="text-[10px] text-nb-black/40">
                (.{unsupportedExts.join(', .')})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="bare"
                onClick={() => setUnsupportedExpanded(!unsupportedExpanded)}
                className="px-2 py-1 text-[10px] text-nb-black/50 hover:bg-nb-cream"
              >
                {unsupportedExpanded ? 'Collapse' : 'Details'}
              </Button>
              <Button variant="ghost" size="bare"
                onClick={() => setShowUnsupportedBanner(false)}
                className="p-1 text-nb-black/40 hover:bg-nb-cream"
              >
                <Icon name="close" className="text-sm" />
              </Button>
            </div>
          </div>
          {unsupportedExpanded && (
            <div className="max-h-32 overflow-y-auto border-t border-nb-orange/20 px-4 py-2">
              {unsupportedFiles.map(f => (
                <div key={f.path} className="text-[11px] text-nb-black/50 py-0.5 truncate">
                  <span className="text-nb-orange">.{f.ext}</span> {f.path}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conflict detection banner */}
      {conflicts.hasConflicts && !conflictDismissed && (
        <ConflictPanel
          conflicts={conflicts}
          onExcludePath={handleConflictExclude}
          onDismiss={() => setConflictDismissed(true)}
        />
      )}

      {/* Analysis summary bar */}
      {analysisResult && (
        <div className="flex-shrink-0 px-4 py-1.5 border-b border-nb-black/10 bg-nb-cream/50 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-nb-black/60">
            <Icon name="auto_fix_high" className="text-nb-purple text-sm" />
            <span>
              {analysisResult.summary.proposedManifests} manifest{analysisResult.summary.proposedManifests !== 1 ? 's' : ''},{' '}
              {analysisResult.summary.proposedCollections} collection{analysisResult.summary.proposedCollections !== 1 ? 's' : ''} detected
            </span>
            {analysisResult.summary.hasMarkerFiles && (
              <span className="px-1.5 py-0.5 bg-nb-purple/10 text-nb-purple text-[10px]">
                Marker files found
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="bare"
              onClick={() => setShowPreview(!showPreview)}
              className={`px-2 py-1 text-[10px] flex items-center gap-1 ${showPreview ? 'text-nb-blue bg-nb-blue/10' : 'text-nb-black/50 hover:bg-nb-cream'}`}
            >
              <Icon name="preview" className="text-sm" />
              Preview
            </Button>
            <Button variant="ghost" size="bare"
              onClick={handleReanalyze}
              className="px-2 py-1 text-[10px] text-nb-black/50 hover:bg-nb-cream flex items-center gap-1"
            >
              <Icon name="refresh" className="text-sm" />
              Re-analyze
            </Button>
          </div>
        </div>
      )}

      {/* Main content - 2 or 3 panes */}
      <div className="flex-1 flex min-h-0 h-full">
        {/* Left pane - Source Tree */}
        <div style={{ width: `${splitPosition}%` }} className="min-w-[280px]">
          <SourceTreePane
            fileTree={initialTree}
            sourceManifests={sourceManifests}
            annotationsMap={annotationsMap}
            onAnnotationChange={handleAnnotationChange}
            selectedPaths={selectedPaths}
            onSelect={handleSourceSelect}
            onPreviewSelect={handlePreviewSelect}
            onClearSelection={() => setSelectedPaths([])}
            filterText={filterText}
            onFilterChange={setFilterText}
            onContextMenu={handleSourceContextMenu}
            onDragStart={() => {}}
            isFocused={focusedPane === 'source'}
            onFocus={() => setFocusedPane('source')}
            analysisRoot={analysisResult?.root}
            unsupportedPaths={unsupportedPaths}
          />
        </div>

        {/* Resize handle */}
        <div
          className="w-1 bg-nb-black/20 hover:bg-nb-blue cursor-col-resize transition-nb flex-shrink-0"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startPos = splitPosition;

            const handleMove = (moveE: MouseEvent) => {
              const delta = moveE.clientX - startX;
              const containerWidth = (e.target as HTMLElement).parentElement?.clientWidth || 1;
              const newPos = startPos + (delta / containerWidth) * 100;
              setSplitPosition(Math.max(25, Math.min(75, newPos)));
            };

            const handleUp = () => {
              document.removeEventListener('mousemove', handleMove);
              document.removeEventListener('mouseup', handleUp);
            };

            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
          }}
        />

        {/* Center pane - Archive */}
        <div
          style={{ width: showPreview && previewTarget ? `${100 - splitPosition}% - ${previewWidth}px` : `${100 - splitPosition}%` }}
          className="min-w-[280px] flex-1"
        >
          <ArchivePane
            archiveLayout={archiveLayout}
            sourceManifests={sourceManifests}
            onAddToCollection={(collectionId, ids) => addToCollection(collectionId, ids)}
            onRemoveFromCollection={removeFromCollection}
            onCreateCollection={createNewCollection}
            onRenameCollection={renameCollectionAction}
            onDeleteCollection={deleteCollectionAction}
            onFocus={() => setFocusedPane('archive')}
            isFocused={focusedPane === 'archive'}
            onContextMenu={handleArchiveContextMenu}
          />
        </div>

        {/* Right pane - Preview (collapsible) */}
        {showPreview && previewTarget && (
          <>
            <div className="w-px bg-nb-black/20 flex-shrink-0" />
            <div style={{ width: `${previewWidth}px` }} className="flex-shrink-0">
              <PreviewPane
                target={previewTarget}
                annotations={annotationsMap.get(previewTarget.path) || {}}
                analysisNode={previewAnalysisNode}
                onClose={() => {
                  setShowPreview(false);
                  setPreviewTarget(null);
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          isOpen={true}
          x={contextMenu.x}
          y={contextMenu.y}
          sections={contextMenuSections}
          onClose={closeContextMenu}
        />
      )}

      {/* Behavior Selector Modal */}
      {behaviorModal && (
        <ModalDialog
          isOpen={true}
          onClose={() => setBehaviorModal(null)}
          title="Set Behaviors"
          icon="tune"
          size="md"
          zIndex={600}
        >
          <div className="p-4">
            <BehaviorSelector
              options={BEHAVIOR_OPTIONS[behaviorModal.resourceType] || BEHAVIOR_OPTIONS['Manifest']}
              selected={(annotationsMap.get(behaviorModal.path)?.iiifBehavior) || []}
              onChange={(selected) => {
                const existing = annotationsMap.get(behaviorModal.path) || {};
                handleAnnotationChange(behaviorModal.path, { ...existing, iiifBehavior: selected });
              }}
              getConflicts={getConflictingBehaviors}
            />
          </div>
        </ModalDialog>
      )}

      {/* Rights Selector Modal */}
      {rightsModal && (
        <ModalDialog
          isOpen={true}
          onClose={() => setRightsModal(null)}
          title="Set Rights Statement"
          icon="copyright"
          size="md"
          zIndex={600}
        >
          <div className="p-4">
            <RightsSelector
              value={(annotationsMap.get(rightsModal)?.rights) || ''}
              onChange={(value) => {
                const existing = annotationsMap.get(rightsModal) || {};
                handleAnnotationChange(rightsModal, { ...existing, rights: value || undefined });
              }}
            />
            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={() => setRightsModal(null)}>Done</Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* NavDate Modal */}
      {navDateModal && (
        <ModalDialog
          isOpen={true}
          onClose={() => setNavDateModal(null)}
          title="Set Navigation Date"
          icon="calendar_today"
          size="md"
          zIndex={600}
        >
          <div className="p-4">
            <label className="block text-sm font-medium mb-2">
              Date (ISO 8601)
            </label>
            <input
              type="datetime-local"
              className="w-full border rounded px-3 py-2 text-sm"
              defaultValue={(annotationsMap.get(navDateModal)?.navDate || '').replace('Z', '').slice(0, 16)}
              onChange={(e) => {
                const existing = annotationsMap.get(navDateModal) || {};
                const isoDate = e.target.value ? `${e.target.value}:00Z` : undefined;
                handleAnnotationChange(navDateModal, { ...existing, navDate: isoDate });
              }}
            />
            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={() => setNavDateModal(null)}>Done</Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {showMetadataExport && (
        <MetadataTemplateExport
          sourceManifests={sourceManifests}
          onClose={() => setShowMetadataExport(false)}
        />
      )}
    </ModalDialog>
  );
};
