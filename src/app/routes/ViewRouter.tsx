/**
 * ViewRouter
 *
 * Routes requests to feature views based on app mode.
 * Renders view content only - no layout wrappers.
 *
 * Philosophy:
 * - Router ONLY handles view routing
 * - Layout is handled at App.tsx level (single source of truth)
 * - Views render content only, no headers/sidebars
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppMode, AppSettings, IIIFAnnotation, IIIFCanvas, IIIFItem, IIIFManifest } from '@/src/shared/types';
import type { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import { useAppMode } from '@/src/app/providers';
import { useAnnotationState } from '@/src/app/providers/AnnotationStateProvider';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { createTimeAnnotation } from '@/src/features/viewer/model/annotation';
import { useVaultDispatch, useVaultState } from '@/src/entities/manifest/model/hooks/useIIIFEntity';
import { actions } from '@/src/entities/manifest/model/actions';
import { getEntity as vaultGetEntity, getParentId, getEntityType } from '@/src/entities/manifest/model/vault';
import { denormalizeCanvas } from '@/src/entities/manifest/model/vault/denormalization';
import { storage } from '@/src/shared/services/storage';
import { contentStateService } from '@/src/shared/services/contentState';
import { appLog } from '@/src/shared/services/logger';

// Feature views
import { ArchiveView } from '@/src/features/archive';
import { BoardView } from '@/src/features/board-design';
import { BoardDesignPanel } from '@/src/features/board-design/ui/molecules/BoardDesignPanel';
import { Inspector, MetadataView } from '@/src/features/metadata-edit';
import { SearchView } from '@/src/features/search';
const ViewerView = React.lazy(() => import('@/src/features/viewer/ui/organisms/ViewerView').then(m => ({ default: m.ViewerView })));
import { MapView } from '@/src/features/map';
import { TimelineView } from '@/src/features/timeline';
const DependencyExplorer = React.lazy(() => import('@/src/features/dependency-explorer/ui/DependencyExplorer').then(m => ({ default: m.DependencyExplorer })));

import { RequiredStatementBar } from '@/src/widgets/RequiredStatementBar/ui/RequiredStatementBar';

// ============================================================================
// View transition wrapper — 150ms fade-in, respects prefers-reduced-motion via CSS
// ============================================================================

const ViewTransition: React.FC<{ mode: string; children: React.ReactNode }> = ({ mode, children }) => (
  <div key={mode} className="view-enter flex-1 flex flex-col min-h-0">
    {children}
  </div>
);

// ============================================================================
// Shared cx (contextual styling) constants — field mode vs normal
// ============================================================================

const FIELD_CX = Object.freeze({
  surface: 'bg-nb-black border-2 border-nb-yellow',
  text: 'text-nb-yellow',
  accent: 'text-nb-yellow',
  border: 'border-nb-yellow',
  divider: 'border-nb-yellow/30',
  headerBg: 'bg-nb-black border-b-4 border-nb-yellow',
  textMuted: 'text-nb-yellow/60',
  input: 'bg-nb-black border-2 border-nb-yellow text-nb-yellow font-mono',
  label: 'text-nb-yellow/80 nb-label',
  active: 'text-nb-black bg-nb-yellow border-nb-yellow font-bold',
  inactive: 'text-nb-yellow/60 hover:text-nb-yellow',
  warningBg: 'bg-nb-orange/20 border-2 border-nb-orange',
  pageBg: 'bg-nb-black',
});

const NORMAL_CX = Object.freeze({
  surface: 'bg-nb-white border-2 border-nb-black',
  text: 'text-nb-black',
  accent: 'text-nb-blue',
  border: 'border-nb-black',
  divider: 'border-nb-black/20',
  headerBg: 'bg-nb-cream border-b-4 border-nb-black',
  textMuted: 'text-nb-black/50',
  input: 'bg-nb-white border-2 border-nb-black font-mono',
  label: 'text-nb-black/70 nb-label',
  active: 'text-nb-white bg-nb-black border-nb-black font-bold',
  inactive: 'text-nb-black/50 hover:text-nb-black',
  warningBg: 'bg-nb-orange/10 border-2 border-nb-orange',
  pageBg: 'bg-nb-cream',
});

export interface ViewRouterProps {
  selectedId: string | null;
  selectedItem?: IIIFItem | null;
  root: IIIFItem | null;
  onSelect?: (item: IIIFItem) => void;
  onSelectId?: (id: string | null) => void;
  validationIssuesMap?: Record<string, ValidationIssue[]>;
  onUpdateRoot?: (newRoot: IIIFItem) => void;
  onUpdateItem?: (updates: Partial<IIIFItem>) => void;
  onBatchEdit?: (ids: string[]) => void;
  onCatalogSelection?: (ids: string[]) => void;
  settings?: AppSettings;
  /** Callback to trigger folder import dialog */
  onOpenImport?: () => void;
  /** Callback to trigger external URL import dialog */
  onOpenExternalImport?: () => void;
}


const findFirstCanvas = (node: any): { canvas: IIIFCanvas | null; manifest: IIIFManifest | null } => {
  if (node.type === 'Canvas') {
    return { canvas: node as IIIFCanvas, manifest: null };
  }
  if (node.items && Array.isArray(node.items)) {
    for (const item of node.items) {
      const result = findFirstCanvas(item);
      if (result.canvas) {
        if (node.type === 'Manifest') {
          return { canvas: result.canvas, manifest: node as IIIFManifest };
        }
        return result;
      }
    }
  }
  return { canvas: null, manifest: null };
};

// Extract annotations from a canvas (flattens annotation pages)
const getCanvasAnnotations = (canvas: IIIFCanvas | null): IIIFAnnotation[] => {
  if (!canvas?.annotations) return [];
  const annotations: IIIFAnnotation[] = [];
  for (const page of canvas.annotations) {
    if (page.items) {
      annotations.push(...page.items);
    }
  }
  return annotations;
};

// Detect media type from canvas
const getCanvasMediaType = (canvas: IIIFCanvas | IIIFItem | null): 'image' | 'video' | 'audio' | 'other' => {
  if (!canvas) return 'other';

  // Check annotation pages for painting motivations
  const items = (canvas as IIIFCanvas).items;
  if (!items || items.length === 0) return 'other';

  for (const page of items) {
    if (page.items) {
      for (const anno of page.items) {
        const body = anno.body as { type?: string };
        if (body?.type === 'Image') return 'image';
        if (body?.type === 'Video') return 'video';
        if (body?.type === 'Sound') return 'audio';
      }
    }
  }

  return 'other';
};

export const ViewRouter: React.FC<ViewRouterProps> = ({
  selectedId,
  selectedItem,
  root,
  onSelect,
  onSelectId,
  validationIssuesMap,
  onUpdateRoot,
  onUpdateItem,
  onBatchEdit,
  onCatalogSelection,
  settings,
  onOpenImport,
  onOpenExternalImport,
}) => {
  const [currentMode, setCurrentMode] = useAppMode();

  // Vault dispatch for creating time annotations directly
  const { dispatch } = useVaultDispatch();
  const { exportRoot, state: vaultState } = useVaultState();

  // O(1) vault entity lookup — replaces O(n) tree walk
  // Canvas entities must be denormalized to include annotation pages/annotations
  const vaultLookup = useCallback((id: string) => {
    const type = getEntityType(vaultState, id);
    if (type === 'Canvas') {
      return denormalizeCanvas(vaultState, id);
    }
    return vaultGetEntity(vaultState, id);
  }, [vaultState]);

  // Panel visibility state for archive split view
  const [showViewerPanel, setShowViewerPanel] = useState(true);
  const [showInspectorPanel, setShowInspectorPanel] = useState(false);

  // Annotation selected in viewer — drives Inspector highlight
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Board inspector state
  const [boardSelectedId, setBoardSelectedId] = useState<string | null>(null);
  const boardStateRef = useRef<{
    getBoardItemForResource: (resourceId: string) => import('@/src/features/board-design/model').BoardItem | null;
    boardState: import('@/src/features/board-design/model').BoardState;
  } | null>(null);

  // Annotation state from context — shared with ViewerView and Inspector
  const {
    showAnnotationTool,
    annotationText,
    setAnnotationText,
    annotationMotivation,
    setAnnotationMotivation,
    annotationDrawingState,
    setAnnotationDrawingState,
    forceAnnotationsTab,
    timeRange,
    setTimeRange,
    currentPlaybackTime,
    handlePlaybackTimeChange,
    handleAnnotationToolToggle: baseAnnotationToggle,
    annotationSaveRef,
    annotationClearRef,
  } = useAnnotationState();

  // Handle annotation selection from viewer — open inspector + highlight
  const handleAnnotationSelected = useCallback((annotationId: string | null) => {
    setSelectedAnnotationId(annotationId);
    if (annotationId) {
      setShowInspectorPanel(true);
    }
  }, []);

  // Clear annotation selection when canvas changes
  useEffect(() => {
    setSelectedAnnotationId(null);
  }, [selectedId]);

  // Extend annotation toggle to also open inspector panel
  const handleAnnotationToolToggle = useCallback((active: boolean) => {
    baseAnnotationToggle(active);
    if (active) {
      setShowInspectorPanel(true);
    }
  }, [baseAnnotationToggle]);

  // O(1) parent manifest lookup via vault reverseRefs
  const getParentManifest = useCallback((canvasId: string): IIIFManifest | null => {
    const parentId = getParentId(vaultState, canvasId);
    if (!parentId) return null;
    // Parent of a canvas might be an AnnotationPage — walk up to find Manifest
    let currentId: string | null = parentId;
    while (currentId) {
      const type = getEntityType(vaultState, currentId);
      if (type === 'Manifest') {
        return vaultGetEntity(vaultState, currentId) as IIIFManifest | null;
      }
      currentId = getParentId(vaultState, currentId);
    }
    return null;
  }, [vaultState]);

  // Content State URL sync — debounced 500ms to avoid thrashing during rapid navigation
  const contentStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (contentStateTimerRef.current) clearTimeout(contentStateTimerRef.current);
    if (!selectedId) return;

    const entityType = getEntityType(vaultState, selectedId);
    if (entityType !== 'Canvas') return;

    contentStateTimerRef.current = setTimeout(() => {
      const manifestId = getParentManifest(selectedId)?.id;
      if (manifestId) {
        contentStateService.updateUrl({ manifestId, canvasId: selectedId });
      }
    }, 500);

    return () => {
      if (contentStateTimerRef.current) clearTimeout(contentStateTimerRef.current);
    };
  }, [selectedId, currentMode, vaultState, getParentManifest]);

  const viewerData = useMemo(() => {
    if (!root) return { canvas: null, manifest: null };

    let selectedCanvas: IIIFCanvas | null = null;
    let parentManifest: IIIFManifest | null = null;

    if (selectedId) {
      const found = vaultLookup(selectedId);
      if (found?.type === 'Canvas') {
        selectedCanvas = found as IIIFCanvas;
        parentManifest = getParentManifest(selectedId);
      }
    }

    if (!selectedCanvas) {
      // Fallback to denormalized root tree walk for first canvas
      const result = findFirstCanvas(root);
      selectedCanvas = result.canvas;
      parentManifest = result.manifest;
    }

    return { canvas: selectedCanvas, manifest: parentManifest };
  }, [root, selectedId, vaultLookup, getParentManifest]);

  // Get annotations from selected canvas for Inspector
  const canvasAnnotations = useMemo(() => {
    if (selectedItem?.type === 'Canvas') {
      return getCanvasAnnotations(selectedItem as IIIFCanvas);
    }
    return [];
  }, [selectedItem]);

  // Get media type of selected canvas
  const selectedMediaType = useMemo(() => {
    if (selectedItem?.type === 'Canvas') {
      return getCanvasMediaType(selectedItem);
    }
    return 'other';
  }, [selectedItem]);

  // Cascade requiredStatement: canvas → manifest → null
  const activeRequiredStatement = useMemo(() => {
    if (selectedItem?.requiredStatement) return selectedItem.requiredStatement;
    if (viewerData.manifest?.requiredStatement) return viewerData.manifest.requiredStatement;
    return undefined;
  }, [selectedItem, viewerData.manifest]);

  // Handlers for annotation actions
  const handleSaveAnnotation = useCallback(() => {
    if (selectedMediaType === 'audio' || selectedMediaType === 'video') {
      // Time-based annotation for audio/video - create directly, no ref indirection
      if (timeRange && annotationText.trim() && selectedItem?.id) {
        const annotation = createTimeAnnotation(selectedItem.id, timeRange, annotationText, annotationMotivation);
        const result = dispatch(actions.addAnnotation(selectedItem.id, annotation));
        if (result) {
          const updatedRoot = exportRoot();
          if (updatedRoot) {
            storage.saveProject(updatedRoot)
              .then(() => appLog.debug('[ViewRouter] Time annotation saved to IndexedDB'))
              .catch((err: unknown) => appLog.error('[ViewRouter] Failed to save:', err instanceof Error ? err : undefined));
          }
        }
      }
    } else {
      // Spatial annotation for images
      annotationSaveRef.current?.();
    }
    setAnnotationText('');
    setTimeRange(null);
  }, [selectedMediaType, timeRange, annotationText, annotationMotivation, selectedItem, dispatch, exportRoot]);

  const handleClearAnnotation = useCallback(() => {
    annotationClearRef.current?.();
    setAnnotationText('');
    setTimeRange(null); // Clear time range
  }, []);

  // Delete an annotation by ID
  const handleDeleteAnnotation = useCallback((annotationId: string) => {
    if (!selectedItem?.id) return;
    const result = dispatch(actions.removeAnnotation(selectedItem.id, annotationId));
    if (result) {
      const updatedRoot = exportRoot();
      if (updatedRoot) {
        storage.saveProject(updatedRoot)
          .then(() => appLog.debug('[ViewRouter] Annotation deleted + saved'))
          .catch((err: unknown) => appLog.error('[ViewRouter] Failed to save after delete:', err instanceof Error ? err : undefined));
      }
    }
  }, [selectedItem, dispatch, exportRoot]);

  // Edit an annotation's body text
  const handleEditAnnotation = useCallback((annotationId: string, newText: string) => {
    const result = dispatch(actions.updateAnnotation(annotationId, {
      body: { type: 'TextualBody', value: newText, format: 'text/plain' } as unknown as IIIFAnnotation['body'],
    }));
    if (result) {
      const updatedRoot = exportRoot();
      if (updatedRoot) {
        storage.saveProject(updatedRoot)
          .then(() => appLog.debug('[ViewRouter] Annotation edited + saved'))
          .catch((err: unknown) => appLog.error('[ViewRouter] Failed to save after edit:', err instanceof Error ? err : undefined));
      }
    }
  }, [dispatch, exportRoot]);

  // Archive view
  if (currentMode === 'archive') {
    const hasSelectedItem = !!selectedId && !!selectedItem;
    const isCanvasSelected = selectedItem?.type === 'Canvas';
    const isFieldMode = settings?.fieldMode || false;

    // Should show viewer panel? Only if canvas selected AND panel not closed
    const shouldShowViewer = hasSelectedItem && isCanvasSelected && showViewerPanel;

    const cx = isFieldMode ? FIELD_CX : NORMAL_CX;

    return (
      <ViewTransition mode="archive">
        <RequiredStatementBar requiredStatement={activeRequiredStatement} cx={cx} fieldMode={isFieldMode} />
        <div className="flex-1 flex min-h-0">
        {/* Left: Archive Filmstrip when viewer shown, full grid otherwise */}
        <div className={`flex flex-col transition-nb filmstrip-panel ${
          shouldShowViewer
            ? `w-filmstrip shrink-0 ${isFieldMode ? 'bg-nb-black border-r-2 border-nb-yellow' : 'bg-nb-cream border-r-2 border-nb-black'}`
            : 'flex-1'
        }`}>
          <ArchiveView
            root={root}
            onSelect={(item) => {
              onSelect?.(item);
              onSelectId?.(item.id);
            }}
            onOpen={(item) => {
              onSelect?.(item);
              onSelectId?.(item.id);
              setShowViewerPanel(true);
            }}
            onBatchEdit={(ids) => onBatchEdit?.(ids)}
            onUpdate={(newRoot) => onUpdateRoot?.(newRoot)}
            filmstripMode={shouldShowViewer}
            onOpenImport={onOpenImport}
            onOpenExternalImport={onOpenExternalImport}
            cx={cx}
            fieldMode={isFieldMode}
            t={(key) => key}
            onSwitchView={setCurrentMode}
            onCatalogSelection={onCatalogSelection}
            validationIssues={validationIssuesMap}
            showViewerPanel={showViewerPanel}
            showInspectorPanel={showInspectorPanel}
            onToggleViewerPanel={() => setShowViewerPanel(!showViewerPanel)}
            onToggleInspectorPanel={() => setShowInspectorPanel(!showInspectorPanel)}
            hasCanvasSelected={hasSelectedItem && isCanvasSelected}
          />
        </div>

        {/* Right: Viewer Panel when canvas selected AND panel not closed */}
        {shouldShowViewer && (
          <div className={`flex-1 flex flex-col min-h-0 ${isFieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}>
            {/* Viewer header with close + inspector buttons */}
            <div className={`shrink-0 px-4 py-2 border-b-2 flex items-center justify-end gap-2 ${isFieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-cream border-nb-black'}`}>
              <Button variant="ghost" size="bare"
                onClick={() => setShowInspectorPanel(!showInspectorPanel)}
                className={`p-1.5 transition-nb ${
                  showInspectorPanel
                    ? isFieldMode ? 'bg-nb-yellow text-nb-black font-bold' : 'bg-nb-black text-nb-white font-bold'
                    : isFieldMode ? 'text-nb-yellow hover:bg-nb-yellow/20' : 'text-nb-black/50 hover:bg-nb-black/10'
                }`}
                title={showInspectorPanel ? 'Hide Inspector' : 'Show Inspector'}
              >
                <Icon name="info" className="text-lg" />
              </Button>
              <Button variant="ghost" size="bare"
                onClick={() => setShowViewerPanel(false)}
                className={`p-1.5 transition-nb ${isFieldMode ? 'text-nb-yellow hover:bg-nb-yellow/20' : 'text-nb-black/50 hover:bg-nb-black/10'}`}
                title="Close Viewer"
              >
                <Icon name="close" className="text-lg" />
              </Button>
            </div>
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <div className={`flex flex-col min-h-0 min-w-0 ${showInspectorPanel ? 'flex-1' : 'w-full'}`}>
                <React.Suspense fallback={null}>
                  <ViewerView
                    item={selectedItem as IIIFCanvas}
                    manifest={viewerData.manifest}
                    onUpdate={(updates) => onUpdateItem?.(updates)}
                    cx={cx}
                    fieldMode={isFieldMode}
                    t={(key) => key}
                    isAdvanced={settings?.abstractionLevel === 'advanced'}
                    // Controlled annotation mode for Inspector integration
                    annotationToolActive={showAnnotationTool}
                    onAnnotationToolToggle={handleAnnotationToolToggle}
                    annotationText={annotationText}
                    annotationMotivation={annotationMotivation}
                    onAnnotationDrawingStateChange={setAnnotationDrawingState}
                    onAnnotationSaveRef={(fn) => { annotationSaveRef.current = fn; }}
                    onAnnotationClearRef={(fn) => { annotationClearRef.current = fn; }}
                    // Time-based annotation props
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    currentPlaybackTime={currentPlaybackTime}
                    onPlaybackTimeChange={handlePlaybackTimeChange}
                    // Annotation selection → Inspector
                    onAnnotationSelected={handleAnnotationSelected}
                  />
                </React.Suspense>
              </div>
              {/* Inspector Panel — archive-specific mount point. Other views mount
                 Inspector at the App.tsx level instead. See App.tsx comment. */}
              {showInspectorPanel && settings && (
                <div className="w-inspector shrink-0 min-h-0 overflow-hidden">
                  <Inspector
                    resource={selectedItem}
                    onUpdateResource={(updates) => onUpdateItem?.(updates)}
                    settings={settings}
                    cx={cx}
                    visible={true}
                    onClose={() => setShowInspectorPanel(false)}
                    // Canvases for structure tab (when inspecting manifest)
                    canvases={viewerData.manifest?.items || []}
                    // Annotations for display
                    annotations={canvasAnnotations}
                    // Annotation creation integration
                    annotationModeActive={showAnnotationTool}
                    annotationDrawingState={annotationDrawingState}
                    annotationText={annotationText}
                    onAnnotationTextChange={setAnnotationText}
                    annotationMotivation={annotationMotivation}
                    onAnnotationMotivationChange={setAnnotationMotivation}
                    onSaveAnnotation={handleSaveAnnotation}
                    onClearAnnotation={handleClearAnnotation}
                    // Time-based annotation props
                    mediaType={selectedMediaType}
                    timeRange={timeRange}
                    currentPlaybackTime={currentPlaybackTime}
                    // Force annotations tab when annotation mode is active or annotation selected in viewer
                    forceTab={forceAnnotationsTab || selectedAnnotationId ? 'annotations' : undefined}
                    // Annotation selected in viewer → highlight in Inspector
                    selectedAnnotationId={selectedAnnotationId}
                    // Annotation CRUD
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onEditAnnotation={handleEditAnnotation}
                    onStartAnnotation={() => handleAnnotationToolToggle(true)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </ViewTransition>
    );
  }

  // Board view
  if (currentMode === 'boards') {
    const boardFieldMode = settings?.fieldMode || false;
    const boardCx = boardFieldMode ? FIELD_CX : NORMAL_CX;
    const boardSelectedItem = boardSelectedId ? (vaultLookup(boardSelectedId) ?? null) : null;
    const boardItemData = boardSelectedId ? boardStateRef.current?.getBoardItemForResource(boardSelectedId) : null;
    const boardStateData = boardStateRef.current?.boardState;

    // Annotations for the board-selected item (derived, not a hook)
    const boardAnnotations = boardSelectedItem?.type === 'Canvas'
      ? getCanvasAnnotations(boardSelectedItem as IIIFCanvas)
      : [];

    // Canvases for structure tab when a manifest is selected on board
    const boardCanvases = boardSelectedItem?.type === 'Manifest'
      ? (boardSelectedItem as IIIFManifest).items || []
      : [];

    return (
      <ViewTransition mode="boards">
        <BoardView
          root={root}
          cx={boardCx}
          fieldMode={boardFieldMode}
          t={(key) => key}
          isAdvanced={settings?.abstractionLevel === 'advanced'}
          onExport={() => {}}
          onSaveBoard={(manifest) => {
            // Persist board manifest into vault tree + IndexedDB
            dispatch(actions.createBoard(manifest.id, manifest.label?.en?.[0] || 'Board', (manifest as IIIFManifest & { behavior?: string[] }).behavior));
            const updatedRoot = exportRoot();
            if (updatedRoot) {
              storage.saveProject(updatedRoot)
                .then(() => appLog.debug('[ViewRouter] Board saved to IndexedDB'))
                .catch((err: unknown) => appLog.error('[ViewRouter] Failed to save board:', err instanceof Error ? err : undefined));
            }
          }}
          onSwitchView={setCurrentMode}
          onSelectId={(id) => {
            setBoardSelectedId(id);
            onSelectId?.(id);
          }}
          onSelect={onSelect}
          settings={settings}
          boardStateRef={boardStateRef}
        />
        {boardSelectedItem && settings && (
          <div className="w-[320px] shrink-0 min-h-0 overflow-hidden">
            <Inspector
              resource={boardSelectedItem}
              onUpdateResource={(updates) => onUpdateItem?.(updates)}
              settings={settings}
              cx={boardCx}
              visible={true}
              onClose={() => {
                setBoardSelectedId(null);
                onSelectId?.(null);
              }}
              canvases={boardCanvases}
              annotations={boardAnnotations}
              onDeleteAnnotation={(annotationId: string) => {
                if (!boardSelectedId) return;
                const result = dispatch(actions.removeAnnotation(boardSelectedId, annotationId));
                if (result) {
                  const updatedRoot = exportRoot();
                  if (updatedRoot) {
                    storage.saveProject(updatedRoot)
                      .catch((err: unknown) => appLog.error('[ViewRouter] Failed to save after board annotation delete:', err instanceof Error ? err : undefined));
                  }
                }
              }}
              onEditAnnotation={(annotationId: string, newText: string) => {
                const result = dispatch(actions.updateAnnotation(annotationId, {
                  body: { type: 'TextualBody', value: newText, format: 'text/plain' } as unknown as IIIFAnnotation['body'],
                }));
                if (result) {
                  const updatedRoot = exportRoot();
                  if (updatedRoot) {
                    storage.saveProject(updatedRoot)
                      .catch((err: unknown) => appLog.error('[ViewRouter] Failed to save after board annotation edit:', err instanceof Error ? err : undefined));
                  }
                }
              }}
              designTab={
                <BoardDesignPanel
                  boardItem={boardItemData || null}
                  connections={boardStateData?.connections || []}
                  items={boardStateData?.items || []}
                  isAdvanced={settings.abstractionLevel === 'advanced'}
                  onOpenViewer={() => {
                    if (boardSelectedId) {
                      onSelectId?.(boardSelectedId);
                      setCurrentMode('viewer');
                    }
                  }}
                  onRemove={() => {
                    setBoardSelectedId(null);
                    onSelectId?.(null);
                  }}
                  cx={boardCx}
                  fieldMode={boardFieldMode}
                />
              }
            />
          </div>
        )}
      </ViewTransition>
    );
  }

  // Metadata view
  if (currentMode === 'metadata') {
    const isFieldMode = settings?.fieldMode || false;
    return (
      <ViewTransition mode="metadata">
        <MetadataView
          root={root}
          cx={isFieldMode ? FIELD_CX : NORMAL_CX}
          fieldMode={isFieldMode}
          onUpdate={(newRoot) => onUpdateRoot?.(newRoot)}
          abstractionLevel={settings?.abstractionLevel}
        />
      </ViewTransition>
    );
  }

  // Structure view — deprecated, redirect to archive (tree now in sidebar)
  if (currentMode === 'structure') {
    setCurrentMode('archive');
    return null;
  }

  // Search view
  if (currentMode === 'search') {
    return (
      <ViewTransition mode="search">
        <SearchView
          root={root}
          onSelect={(id) => {
            onSelectId?.(id);
            setCurrentMode('archive');
          }}
          onRevealMap={(id) => {
            onSelectId?.(id);
            setCurrentMode('map');
          }}
          cx={settings?.fieldMode ? FIELD_CX : NORMAL_CX}
          fieldMode={settings?.fieldMode || false}
          t={(key) => key}
        />
      </ViewTransition>
    );
  }

  // Viewer view
  if (currentMode === 'viewer') {
    const isFieldMode = settings?.fieldMode || false;
    const viewerCx = isFieldMode ? FIELD_CX : NORMAL_CX;
    const manifestCanvases = viewerData.manifest?.items || [];

    const handleViewerPageChange = (page: number) => {
      const idx = page - 1; // PageCounter is 1-indexed
      if (manifestCanvases[idx]) {
        onSelectId?.(manifestCanvases[idx].id);
      }
    };

    return (
      <ViewTransition mode="viewer">
        <RequiredStatementBar requiredStatement={activeRequiredStatement} cx={viewerCx} fieldMode={isFieldMode} />
        <React.Suspense fallback={null}>
          <ViewerView
            item={viewerData.canvas}
            manifest={viewerData.manifest}
            manifestItems={manifestCanvases}
            onUpdate={(updates) => onUpdateItem?.(updates)}
            onPageChange={handleViewerPageChange}
            onSwitchView={setCurrentMode}
            cx={viewerCx}
            fieldMode={isFieldMode}
            t={(key) => key}
            isAdvanced={settings?.abstractionLevel === 'advanced'}
          />
        </React.Suspense>
      </ViewTransition>
    );
  }

  // Map view
  if (currentMode === 'map') {
    return (
      <ViewTransition mode="map">
        <MapView
          root={root}
          onSelect={(item) => onSelectId?.(item.id)}
          cx={settings?.fieldMode ? FIELD_CX : NORMAL_CX}
          fieldMode={settings?.fieldMode || false}
          t={(key) => key}
          isAdvanced={settings?.abstractionLevel === 'advanced'}
          onSwitchView={setCurrentMode}
        />
      </ViewTransition>
    );
  }

  // Timeline view
  if (currentMode === 'timeline') {
    return (
      <ViewTransition mode="timeline">
        <TimelineView
          root={root}
          onSelect={(item) => onSelectId?.(item.id)}
          cx={settings?.fieldMode ? FIELD_CX : NORMAL_CX}
          fieldMode={settings?.fieldMode || false}
          onSwitchView={setCurrentMode}
        />
      </ViewTransition>
    );
  }

  // Admin dependency explorer
  if (currentMode === 'admin-deps') {
    return (
      <ViewTransition mode="admin-deps">
        <React.Suspense fallback={<div className="h-full bg-nb-cream p-6 flex items-center justify-center text-nb-black/50">Loading...</div>}>
          <div className="h-full bg-nb-cream p-6">
            <DependencyExplorer />
          </div>
        </React.Suspense>
      </ViewTransition>
    );
  }

  // Default: archive
  return null;
};

export default ViewRouter;
