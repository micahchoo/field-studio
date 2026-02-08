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

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import type { AppMode, AppSettings, IIIFAnnotation, IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest } from '@/src/shared/types';
import type { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import { useAppMode, useAppModeActions } from '@/src/app/providers';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { createTimeAnnotation } from '@/src/features/viewer/model/annotation';
import { useVaultDispatch, useVaultState } from '@/src/entities/manifest/model/hooks/useIIIFEntity';
import { actions } from '@/src/entities/manifest/model/actions';
import { storage } from '@/src/shared/services/storage';

// Feature views
import { ArchiveView } from '@/src/features/archive';
import { BoardView } from '@/src/features/board-design';
import { BoardDesignPanel } from '@/src/features/board-design/ui/molecules/BoardDesignPanel';
import { Inspector, MetadataView } from '@/src/features/metadata-edit';
import { SearchView } from '@/src/features/search';
const ViewerView = React.lazy(() => import('@/src/features/viewer/ui/organisms/ViewerView').then(m => ({ default: m.ViewerView })));
import { MapView } from '@/src/features/map';
import { TimelineView } from '@/src/features/timeline';
import { StructureTreeView } from '@/src/features/structure-view';
const DependencyExplorer = React.lazy(() => import('@/src/features/dependency-explorer/ui/DependencyExplorer').then(m => ({ default: m.DependencyExplorer })));

import { RequiredStatementBar } from '@/src/widgets/RequiredStatementBar/ui/RequiredStatementBar';

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
  const appModeActions = useAppModeActions();

  // O(1) lookup index for denormalized tree — built once per root change
  const itemIndex = useMemo(() => {
    const index = new Map<string, any>();
    if (!root) return index;
    const walk = (node: any) => {
      if (node.id) index.set(node.id, node);
      if (node.items && Array.isArray(node.items)) {
        for (const item of node.items) walk(item);
      }
      if (node.annotations && Array.isArray(node.annotations)) {
        for (const anno of node.annotations) walk(anno);
      }
    };
    walk(root);
    return index;
  }, [root]);

  // Panel visibility state for archive split view
  const [showViewerPanel, setShowViewerPanel] = useState(true);
  const [showInspectorPanel, setShowInspectorPanel] = useState(false);

  // Board inspector state
  const [boardSelectedId, setBoardSelectedId] = useState<string | null>(null);
  const boardStateRef = useRef<{
    getBoardItemForResource: (resourceId: string) => import('@/src/features/board-design/model').BoardItem | null;
    boardState: import('@/src/features/board-design/model').BoardState;
  } | null>(null);

  // Annotation state for viewer/inspector integration
  const [showAnnotationTool, setShowAnnotationTool] = useState(false);
  const [annotationText, setAnnotationText] = useState('');
  const [annotationMotivation, setAnnotationMotivation] = useState<'commenting' | 'tagging' | 'describing'>('commenting');
  const [annotationDrawingState, setAnnotationDrawingState] = useState<{ pointCount: number; isDrawing: boolean; canSave: boolean }>({
    pointCount: 0,
    isDrawing: false,
    canSave: false,
  });

  // Time-based annotation state (for audio/video)
  const [timeRange, setTimeRange] = useState<{ start: number; end?: number } | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

  // Throttle playback time updates to prevent excessive re-renders
  const lastPlaybackUpdateRef = useRef<number>(0);
  const playbackTimeRef = useRef<number>(0);
  const handlePlaybackTimeChange = useCallback((time: number) => {
    playbackTimeRef.current = time;
    const now = Date.now();
    // Only update state every 500ms to prevent lag
    if (now - lastPlaybackUpdateRef.current > 500) {
      lastPlaybackUpdateRef.current = now;
      setCurrentPlaybackTime(time);
    }
  }, []);

  // Force annotations tab when annotation mode is active
  const [forceAnnotationsTab, setForceAnnotationsTab] = useState(false);

  // Handle annotation tool toggle - auto-open inspector
  const handleAnnotationToolToggle = useCallback((active: boolean) => {
    setShowAnnotationTool(active);
    appModeActions.setAnnotationMode(active);
    if (active) {
      // Open inspector and switch to annotations tab
      setShowInspectorPanel(true);
      setForceAnnotationsTab(true);
    } else {
      setForceAnnotationsTab(false);
      // Clear any in-progress annotation
      setAnnotationText('');
      setTimeRange(null);
    }
  }, [appModeActions]);

  // Vault dispatch for creating time annotations directly
  const { dispatch } = useVaultDispatch();
  const { exportRoot } = useVaultState();

  // Refs for annotation controls exposed from AnnotationDrawingOverlay
  const annotationSaveRef = useRef<(() => void) | null>(null);
  const annotationClearRef = useRef<(() => void) | null>(null);

  // Parent manifest index — maps canvas IDs to their parent manifest
  const parentManifestIndex = useMemo(() => {
    const index = new Map<string, IIIFManifest>();
    if (!root) return index;
    const walkManifests = (node: any) => {
      if (node.type === 'Manifest') {
        for (const child of node.items || []) {
          if (child.type === 'Canvas') index.set(child.id, node as IIIFManifest);
        }
      }
      for (const child of node.items || []) walkManifests(child);
    };
    walkManifests(root);
    return index;
  }, [root]);

  const viewerData = useMemo(() => {
    if (!root) return { canvas: null, manifest: null };

    let selectedCanvas: IIIFCanvas | null = null;
    let parentManifest: IIIFManifest | null = null;

    if (selectedId) {
      const found = itemIndex.get(selectedId);
      if (found?.type === 'Canvas') {
        selectedCanvas = found as IIIFCanvas;
        parentManifest = parentManifestIndex.get(selectedId) || null;
      }
    }

    if (!selectedCanvas) {
      const result = findFirstCanvas(root);
      selectedCanvas = result.canvas;
      parentManifest = result.manifest;
    }

    return { canvas: selectedCanvas, manifest: parentManifest };
  }, [root, selectedId, itemIndex, parentManifestIndex]);

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
              .then(() => console.log('[ViewRouter] Time annotation saved to IndexedDB'))
              .catch((err) => console.error('[ViewRouter] Failed to save:', err));
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
          .then(() => console.log('[ViewRouter] Annotation deleted + saved'))
          .catch((err) => console.error('[ViewRouter] Failed to save after delete:', err));
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
          .then(() => console.log('[ViewRouter] Annotation edited + saved'))
          .catch((err) => console.error('[ViewRouter] Failed to save after edit:', err));
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
      <div className="flex-1 flex flex-col min-h-0">
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
                    // Force annotations tab when annotation mode is active
                    forceTab={forceAnnotationsTab ? 'annotations' : undefined}
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
      </div>
    );
  }

  // Board view
  if (currentMode === 'boards') {
    const boardFieldMode = settings?.fieldMode || false;
    const boardCx = boardFieldMode ? FIELD_CX : NORMAL_CX;
    const boardSelectedItem = boardSelectedId ? (itemIndex.get(boardSelectedId) ?? null) : null;
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
      <div className="flex h-full">
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
                .then(() => console.log('[ViewRouter] Board saved to IndexedDB'))
                .catch((err: unknown) => console.error('[ViewRouter] Failed to save board:', err));
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
                      .catch((err: unknown) => console.error('[ViewRouter] Failed to save after board annotation delete:', err));
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
                      .catch((err: unknown) => console.error('[ViewRouter] Failed to save after board annotation edit:', err));
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
      </div>
    );
  }

  // Metadata view
  if (currentMode === 'metadata') {
    const isFieldMode = settings?.fieldMode || false;
    return (
      <MetadataView
        root={root}
        cx={isFieldMode ? FIELD_CX : NORMAL_CX}
        fieldMode={isFieldMode}
        onUpdate={(newRoot) => onUpdateRoot?.(newRoot)}
        abstractionLevel={settings?.abstractionLevel}
      />
    );
  }

  // Structure view
  if (currentMode === 'structure') {
    return (
      <StructureTreeView
        root={root}
        selectedId={selectedId}
        onSelect={(id) => onSelectId?.(id)}
        onOpen={(item) => {
          onSelectId?.(item.id);
          setCurrentMode('viewer');
        }}
        onUpdate={(newRoot) => onUpdateRoot?.(newRoot)}
        className="h-full"
      />
    );
  }

  // Search view
  if (currentMode === 'search') {
    return (
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
    );
  }

  // Viewer view
  if (currentMode === 'viewer') {
    const isFieldMode = settings?.fieldMode || false;
    const viewerCx = isFieldMode ? FIELD_CX : NORMAL_CX;

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <RequiredStatementBar requiredStatement={activeRequiredStatement} cx={viewerCx} fieldMode={isFieldMode} />
        <React.Suspense fallback={null}>
          <ViewerView
            item={viewerData.canvas}
            manifest={viewerData.manifest}
            onUpdate={(updates) => onUpdateItem?.(updates)}
            cx={viewerCx}
            fieldMode={isFieldMode}
            t={(key) => key}
            isAdvanced={settings?.abstractionLevel === 'advanced'}
          />
        </React.Suspense>
      </div>
    );
  }

  // Map view
  if (currentMode === 'map') {
    return (
      <MapView
        root={root}
        onSelect={(item) => onSelectId?.(item.id)}
        cx={settings?.fieldMode ? FIELD_CX : NORMAL_CX}
        fieldMode={settings?.fieldMode || false}
        t={(key) => key}
        isAdvanced={settings?.abstractionLevel === 'advanced'}
      />
    );
  }

  // Timeline view
  if (currentMode === 'timeline') {
    return (
      <TimelineView
        root={root}
        onSelect={(item) => onSelectId?.(item.id)}
        cx={settings?.fieldMode ? FIELD_CX : NORMAL_CX}
        fieldMode={settings?.fieldMode || false}
      />
    );
  }

  // Admin dependency explorer
  if (currentMode === 'admin-deps') {
    return (
      <React.Suspense fallback={<div className="h-full bg-nb-cream p-6 flex items-center justify-center text-nb-black/50">Loading...</div>}>
        <div className="h-full bg-nb-cream p-6">
          <DependencyExplorer />
        </div>
      </React.Suspense>
    );
  }

  // Default: archive
  return null;
};

export default ViewRouter;
