
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { AbstractionLevel, FileTree, IIIFItem, IngestResult, SourceManifest, SourceManifests } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { buildSourceManifests, findManifest, getAllCollections } from '@/src/entities/collection/model/stagingService';
import { useStagingState } from '@/src/shared/lib/hooks/useStagingState';
import { useKeyboardDragDrop } from '@/src/shared/lib/hooks/useKeyboardDragDrop';
import { useIngestProgress } from '@/src/shared/lib/hooks/useIngestProgress';
import { IngestProgressPanel } from '../molecules/IngestProgressPanel';
import { FEATURE_FLAGS, USE_WORKER_INGEST } from '@/src/shared/constants';
import { ingestTreeWithWorkers } from '@/src/entities/manifest/model/ingest/ingestWorkerPool';
import { SourcePane } from '../molecules/SourcePane';
import { ArchivePane } from '../molecules/ArchivePane';
import { SendToCollectionModal } from '../molecules/SendToCollectionModal';
import { MetadataTemplateExport } from '../molecules/MetadataTemplateExport';
// TODO: [FSD] Proper fix is to receive `t` via props from FieldModeTemplate
// eslint-disable-next-line no-restricted-imports
import { useTerminology } from '@/src/app/providers/useTerminology';

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
  // Build source manifests from file tree
  const [sourceManifests, setSourceManifests] = useState<SourceManifests | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState({ message: 'Analyzing files...', percent: 0 });

  // Build source manifests on mount
  useEffect(() => {
    const build = async () => {
      setIsProcessing(true);
      setProgress({ message: 'Building file tree...', percent: 20 });

      try {
        // Small delay for UI
        await new Promise(resolve => setTimeout(resolve, 100));

        setProgress({ message: 'Detecting file sequences...', percent: 50 });
        await new Promise(resolve => setTimeout(resolve, 100));

        // Flatten tree to files
        const flattenTree = (node: FileTree): File[] => {
          const files: File[] = [];
          node.files.forEach(f => files.push(f));
          node.directories.forEach(dir => files.push(...flattenTree(dir)));
          return files;
        };

        const files = flattenTree(initialTree);
        
        // Validate files exist
        if (files.length === 0) {
          throw new Error('No files found in the selected directory');
        }

        const manifests = buildSourceManifests(files);

        // Validate manifests were created
        if (!manifests || !manifests.manifests) {
          throw new Error('Failed to build manifests from files');
        }

        setProgress({ message: `Found ${manifests.manifests.length} manifests`, percent: 100 });
        await new Promise(resolve => setTimeout(resolve, 300));

        setSourceManifests(manifests);
      } catch (error) {
        console.error('Error building source manifests:', error);
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

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isProcessing]);

  if (isProcessing || !sourceManifests) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[500] flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Icon name="folder_open" className="text-4xl" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Analyzing Content...</h3>
        <p className="text-sm text-slate-400 mb-4">{progress.message}</p>
        <div className="w-64 bg-slate-700 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
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
    />
  );
};

interface StagingWorkbenchInnerProps {
  sourceManifests: SourceManifests;
  initialTree: FileTree;
  existingRoot: IIIFItem | null;
  onIngest: (tree: FileTree, merge: boolean, progressCallback: (msg: string, pct: number) => void) => void;
  onCancel: () => void;
  abstractionLevel: AbstractionLevel;
}

const StagingWorkbenchInner: React.FC<StagingWorkbenchInnerProps> = ({
  sourceManifests: initialSourceManifests,
  initialTree,
  existingRoot,
  onIngest,
  onCancel,
  abstractionLevel
}) => {
  // Phase 3: Use terminology based on abstraction level
  const { t, formatCount } = useTerminology({ level: abstractionLevel });
  
  // Phase 3: Enhanced progress tracking
  const { aggregate, progress, controls, startIngest, clearCompleted } = useIngestProgress();
  
  const stagingState = useStagingState(initialSourceManifests);
  const {
    selectedIds,
    toggleSelection,
    selectRange,
    clearSelection,
    selectAll,
    focusedPane,
    setFocusedPane,
    createNewCollection,
    addToCollection,
    removeFromCollection,
    renameCollectionAction,
    deleteCollectionAction,
    reorderCanvases,
    getAllCollectionsList,
    getManifest,
    archiveLayout,
    sourceManifests,
    hasUnassigned
  } = stagingState;

  const [showSendToModal, setShowSendToModal] = useState(false);
  const [sendToManifestIds, setSendToManifestIds] = useState<string[]>([]);
  const [showMetadataExport, setShowMetadataExport] = useState(false);
  const [merge, setMerge] = useState(!!existingRoot);
  const [splitPosition, setSplitPosition] = useState(50);

  // Phase 5: Keyboard drag and drop for source manifests (when enabled)
  const keyboardDnd = useKeyboardDragDrop({
    items: sourceManifests.manifests,
    onReorder: () => {
      // Reordering not supported in staging - manifests have fixed order from files
    },
    onMove: (itemId, targetId) => {
      // Move manifest to a collection
      addToCollection(targetId, [itemId]);
    },
    getItemId: (item) => item.id
  });

  // Combine keyboard DnD with feature flag
  const enableKeyboardDnd = FEATURE_FLAGS.USE_KEYBOARD_DND;

  // Get all manifest IDs for select all
  const allManifestIds = useMemo(() =>
    sourceManifests.manifests.map(m => m.id),
    [sourceManifests.manifests]
  );

  // Handle opening send to modal
  const handleOpenSendToModal = useCallback((manifestIds: string[]) => {
    setSendToManifestIds(manifestIds);
    setShowSendToModal(true);
  }, []);

  // Handle sending to collection
  const handleSendToCollection = useCallback((collectionId: string) => {
    addToCollection(collectionId, sendToManifestIds);
    setShowSendToModal(false);
    setSendToManifestIds([]);
  }, [addToCollection, sendToManifestIds]);

  // Handle create and send
  const handleCreateAndSend = useCallback((collectionName: string) => {
    const newId = createNewCollection(collectionName);
    addToCollection(newId, sendToManifestIds);
    setShowSendToModal(false);
    setSendToManifestIds([]);
  }, [createNewCollection, addToCollection, sendToManifestIds]);

  // Handle manifest drag start
  const handleManifestDragStart = useCallback((e: React.DragEvent, manifestIds: string[]) => {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('application/iiif-manifest-ids', JSON.stringify(manifestIds));
    e.dataTransfer.effectAllowed = 'copyMove';
  }, []);

  // Handle ingest with enhanced progress tracking
  const handleIngest = useCallback(async () => {
    try {
      // Use worker-based ingest if feature flag is enabled
      if (USE_WORKER_INGEST) {
        const result = await startIngest(async (options) => {
          return await ingestTreeWithWorkers(initialTree, {
            generateThumbnails: true,
            extractMetadata: true,
            calculateHashes: false,
            onProgress: options.onProgress,
            signal: options.signal
          });
        });
        
        // Call the original onIngest callback with the result
        // The legacy callback expects a different signature, so we adapt it
        onIngest(initialTree, merge, (msg, pct) => {
          // Legacy callback - progress is already tracked via startIngest
        });
        
        // Clear completed operation after a delay
        setTimeout(() => clearCompleted(), 3000);
        
        return result;
      } else {
        // Legacy ingest path with enhanced progress tracking
        return await startIngest(async (options) => {
          return new Promise<IngestResult>((resolve, reject) => {
            // Call the original onIngest with a wrapper that reports progress
            onIngest(initialTree, merge, (msg, pct) => {
              // Calculate file counts safely with null checks
              const totalFiles = sourceManifests?.manifests?.reduce((sum, m) => sum + m.files.length, 0) || 0;
              const completedFiles = Math.floor((pct / 100) * totalFiles);

              // Report progress to the enhanced tracking system
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
                resolve({
                  root: null,
                  report: {
                    manifestsCreated: sourceManifests?.manifests?.length || 0,
                    collectionsCreated: archiveLayout.root.children.length + 1,
                    canvasesCreated: totalFiles,
                    filesProcessed: totalFiles,
                    warnings: []
                  }
                });
              }
            });
            
            // Handle cancellation
            if (options.signal) {
              options.signal.addEventListener('abort', () => {
                reject(new Error('Ingest cancelled'));
              });
            }
          });
        });
      }
    } catch (error) {
      console.error('Ingest failed:', error);
      // Error is already tracked by useIngestProgress
    }
  }, [initialTree, merge, onIngest, startIngest, clearCompleted, sourceManifests.manifests, archiveLayout.root.children.length]);

  // Get manifests for send to modal
  const sendToManifests = useMemo(() =>
    sendToManifestIds.map(id => getManifest(id)).filter((m): m is SourceManifest => m !== undefined),
    [sendToManifestIds, getManifest]
  );

  // Stats with terminology
  const stats = useMemo(() => ({
    totalManifests: sourceManifests.manifests.length,
    totalFiles: sourceManifests.manifests.reduce((sum, m) => sum + m.files.length, 0),
    totalCollections: getAllCollectionsList().length
  }), [sourceManifests.manifests, getAllCollectionsList]);

  // Get terminology-aware labels
  const manifestLabel = formatCount(stats.totalManifests, 'Manifest');
  const collectionLabel = formatCount(stats.totalCollections, 'Collection');

  // Show enhanced progress panel when ingesting
  if (aggregate.isActive) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 z-[500] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <IngestProgressPanel
            progress={progress}
            controls={controls}
            variant="full"
            showLogByDefault={false}
            showFilesByDefault={false}
            onCancel={() => {
              controls.cancel();
              // Call cancel callback after a short delay to allow cleanup
              setTimeout(() => onCancel(), 500);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 z-[500] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 h-14 border-b border-slate-700 bg-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <Icon name="construction" className="text-white text-lg" />
          </div>
          <div>
            <h2 className="font-bold text-white">Organize Your Files</h2>
            <p className="text-[10px] text-slate-400">
              {manifestLabel} | {stats.totalFiles} files | {collectionLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Metadata template export */}
          <Button variant="ghost" size="bare"
            onClick={() => setShowMetadataExport(true)}
            className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Icon name="table_chart" className="text-slate-400" />
            Export Template
          </Button>

          {/* Merge toggle */}
          {existingRoot && (
            <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 cursor-pointer hover:bg-slate-700 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={merge}
                onChange={(e) => setMerge(e.target.checked)}
                className="rounded border-slate-600"
              />
              Merge with existing
            </label>
          )}

          {/* Ingest button */}
          <Button variant="ghost" size="bare"
            onClick={handleIngest}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 flex items-center gap-2 shadow-lg transition-colors"
          >
            <Icon name="publish" />
            Import {t('Archive')}
          </Button>

          {/* Close */}
          <Button variant="ghost" size="bare"
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Icon name="close" />
          </Button>
        </div>
      </div>

      {/* Validation warning - improved styling */}
      {hasUnassigned && (
        <div className="flex-shrink-0 px-4 py-3 bg-orange-50 border-b border-orange-200">
          <div className="flex items-start gap-3 max-w-4xl mx-auto">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900">
                Some {t('Manifest').toLowerCase()}s are not organized
              </p>
              <p className="text-sm text-orange-700 mt-0.5">
                Unorganized items will be imported but won't appear in your archive structure.
              </p>
            </div>
            <Button variant="ghost" size="bare"
              className="text-xs font-medium text-orange-700 hover:text-orange-900 underline"
              onClick={() => {
                // Auto-organize unassigned manifests
                const unassigned = sourceManifests.manifests.filter(m =>
                  !archiveLayout.root.children.some((c: any) => c.items?.includes(m.id))
                );
                if (unassigned.length > 0) {
                  const newCollectionId = createNewCollection('Unorganized Items');
                  addToCollection(newCollectionId, unassigned.map(m => m.id));
                }
              }}
            >
              Auto-organize
            </Button>
          </div>
        </div>
      )}

      {/* Keyboard DnD instructions (when enabled) */}
      {enableKeyboardDnd && (
        <div className="flex-shrink-0 px-4 py-2 bg-sky-50 border-b border-sky-200 text-sky-700 text-xs flex items-center gap-2">
          <Icon name="keyboard" className="text-sky-500" />
          <span className="font-medium">Keyboard:</span>
          <span>Arrow keys to navigate • Space to select • Enter to drop • Escape to cancel</span>
        </div>
      )}

      {/* Main content - two panes */}
      <div className="flex-1 flex min-h-0">
        {/* Left pane - Source */}
        <div style={{ width: `${splitPosition}%` }} className="min-w-[300px]">
          <SourcePane
            sourceManifests={sourceManifests}
            selectedIds={selectedIds}
            onSelect={(id, metaKey, shiftKey) => {
              if (shiftKey && selectedIds.length > 0) {
                // Range selection
                const lastSelected = selectedIds[selectedIds.length - 1];
                selectRange(lastSelected, id);
              } else {
                toggleSelection(id);
              }
            }}
            onClearSelection={clearSelection}
            onReorder={undefined}
            onDragStart={(manifestId) => {
              // Adapter: SourcePane expects just manifestId, but we need to start drag
              const ids = selectedIds.includes(manifestId) ? selectedIds : [manifestId];
              // The actual drag is handled by SourcePane's internal handleDragStart
            }}
            isFocused={focusedPane === 'source'}
          />
        </div>

        {/* Resize handle */}
        <div
          className="w-1 bg-slate-200 hover:bg-blue-400 cursor-col-resize transition-colors flex-shrink-0"
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

        {/* Right pane - Archive */}
        <div style={{ width: `${100 - splitPosition}%` }} className="min-w-[300px]">
          <ArchivePane
            archiveLayout={archiveLayout}
            sourceManifests={sourceManifests}
            onAddToCollection={(collectionId, ids) => addToCollection(collectionId, ids)}
            onRemoveFromCollection={removeFromCollection}
            onCreateCollection={createNewCollection}
            onRenameCollection={renameCollectionAction}
            onDeleteCollection={deleteCollectionAction}
            onOpenSendToModal={handleOpenSendToModal}
            onFocus={() => setFocusedPane('archive')}
            isFocused={focusedPane === 'archive'}
          />
        </div>
      </div>

      {/* Modals */}
      {showSendToModal && (
        <SendToCollectionModal
          manifests={sendToManifests}
          collections={getAllCollectionsList()}
          onSend={handleSendToCollection}
          onCreateAndSend={handleCreateAndSend}
          onClose={() => {
            setShowSendToModal(false);
            setSendToManifestIds([]);
          }}
        />
      )}

      {showMetadataExport && (
        <MetadataTemplateExport
          sourceManifests={sourceManifests}
          onClose={() => setShowMetadataExport(false)}
        />
      )}
    </div>
  );
};
