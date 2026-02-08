
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { BEHAVIOR_OPTIONS, getConflictingBehaviors } from '@/src/shared/constants/iiif';
import { ingestTreeWithWorkers } from '@/src/entities/manifest/model/ingest/ingestWorkerPool';
import { SourceTreePane } from '../molecules/SourceTreePane';
import { ArchivePane } from '../molecules/ArchivePane';
import { MetadataTemplateExport } from '../molecules/MetadataTemplateExport';
import { BehaviorSelector } from '@/src/features/metadata-edit/ui/atoms/BehaviorSelector';
import { RightsSelector } from '@/src/features/metadata-edit/ui/atoms/RightsSelector';
import type { NodeAnnotations } from '../../model';
import {
  applyAnnotationsToTree,
  buildDirectoryMenuSections,
  buildFileMenuSections,
  buildCollectionMenuSections,
} from '../../model';
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
  const [splitPosition, setSplitPosition] = useState(50);
  const [filterText, setFilterText] = useState('');

  // --- New state for annotations, context menu, behavior modal ---
  const [annotationsMap, setAnnotationsMap] = useState<Map<string, NodeAnnotations>>(() => new Map());
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; targetPath: string; isDirectory: boolean; pane: 'source' | 'archive';
  } | null>(null);
  const [behaviorModal, setBehaviorModal] = useState<{ path: string; resourceType: string } | null>(null);
  const [rightsModal, setRightsModal] = useState<string | null>(null); // path
  const [navDateModal, setNavDateModal] = useState<string | null>(null); // path

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

  // Annotation change handler
  const handleAnnotationChange = useCallback((path: string, ann: NodeAnnotations) => {
    setAnnotationsMap(prev => {
      const next = new Map(prev);
      next.set(path, ann);
      return next;
    });
  }, []);

  // Source tree selection
  const handleSourceSelect = useCallback((path: string, additive: boolean) => {
    setSelectedPaths(prev => {
      if (additive) {
        return prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
      }
      return [path];
    });
    setFocusedPane('source');
  }, [setFocusedPane]);

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

  // Build context menu sections based on current state
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

    // Archive pane context menu
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

  // Handle ingest with annotations applied
  const handleIngest = useCallback(async () => {
    // Apply annotations to tree before ingesting
    const annotatedTree = applyAnnotationsToTree(initialTree, annotationsMap);

    try {
      // Use worker-based ingest if feature flag is enabled
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

        onIngest(annotatedTree, merge, () => {
          // Legacy callback - progress is already tracked via startIngest
        });

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
    }
  }, [initialTree, annotationsMap, merge, onIngest, startIngest, clearCompleted, sourceManifests.manifests, archiveLayout.root.children.length]);

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

  // Footer actions for ModalDialog
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

  return (
    <ModalDialog
      isOpen={true}
      onClose={onCancel}
      title="Organize Your Files"
      subtitle={`${manifestLabel} | ${stats.totalFiles} files | ${collectionLabel}`}
      icon="construction"
      size="full"
      height="90vh"
      zIndex={500}
      preventBackdropClose={false}
      footer={footerContent}
    >
      {/* Keyboard DnD instructions (when enabled) */}
      {enableKeyboardDnd && (
        <div className="flex-shrink-0 px-4 py-2 bg-sky-50 border-b border-sky-200 text-sky-700 text-xs flex items-center gap-2">
          <Icon name="keyboard" className="text-sky-500" />
          <span className="font-medium">Keyboard:</span>
          <span>Arrow keys to navigate | Space to select | Enter to drop | Escape to cancel</span>
        </div>
      )}

      {/* Main content - two panes */}
      <div className="flex-1 flex min-h-0 h-full">
        {/* Left pane - Source Tree */}
        <div style={{ width: `${splitPosition}%` }} className="min-w-[300px]">
          <SourceTreePane
            fileTree={initialTree}
            sourceManifests={sourceManifests}
            annotationsMap={annotationsMap}
            onAnnotationChange={handleAnnotationChange}
            selectedPaths={selectedPaths}
            onSelect={handleSourceSelect}
            onClearSelection={() => setSelectedPaths([])}
            filterText={filterText}
            onFilterChange={setFilterText}
            onContextMenu={handleSourceContextMenu}
            onDragStart={() => {}}
            isFocused={focusedPane === 'source'}
            onFocus={() => setFocusedPane('source')}
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
            onFocus={() => setFocusedPane('archive')}
            isFocused={focusedPane === 'archive'}
            onContextMenu={handleArchiveContextMenu}
          />
        </div>
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
