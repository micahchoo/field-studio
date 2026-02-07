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
import { useAppMode } from '@/src/app/providers';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { createTimeAnnotation } from '@/src/features/viewer/model/annotation';
import { useVaultDispatch, useVaultState } from '@/src/entities/manifest/model/hooks/useIIIFEntity';
import { actions } from '@/src/entities/manifest/model/actions';
import { storage } from '@/src/shared/services/storage';

// Feature views
import { ArchiveView } from '@/src/features/archive';
import { BoardView } from '@/src/features/board-design';
import { Inspector, MetadataView } from '@/src/features/metadata-edit';
import { SearchView } from '@/src/features/search';
import { ViewerView } from '@/src/features/viewer';
import { MapView } from '@/src/features/map';
import { TimelineView } from '@/src/features/timeline';
import { StructureTreeView } from '@/src/features/structure-view';
import { DependencyExplorer } from '@/src/features/dependency-explorer';

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

const findItemById = (node: any, id: string): any => {
  if (node.id === id) return node;
  if (node.items && Array.isArray(node.items)) {
    for (const item of node.items) {
      const found = findItemById(item, id);
      if (found) return found;
    }
  }
  return null;
};

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

  // Panel visibility state for archive split view
  const [showViewerPanel, setShowViewerPanel] = useState(true);
  const [showInspectorPanel, setShowInspectorPanel] = useState(false);

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
  }, []);

  // Vault dispatch for creating time annotations directly
  const { dispatch } = useVaultDispatch();
  const { exportRoot } = useVaultState();

  // Refs for annotation controls exposed from AnnotationDrawingOverlay
  const annotationSaveRef = useRef<(() => void) | null>(null);
  const annotationClearRef = useRef<(() => void) | null>(null);

  const viewerData = useMemo(() => {
    if (!root) return { canvas: null, manifest: null };

    let selectedCanvas: IIIFCanvas | null = null;
    let parentManifest: IIIFManifest | null = null;

    if (selectedId) {
      if (root.type === 'Manifest') {
        parentManifest = root as IIIFManifest;
        selectedCanvas = findItemById(parentManifest, selectedId);
        if (selectedCanvas?.type !== 'Canvas') selectedCanvas = null;
      } else if (root.type === 'Collection') {
        for (const item of (root as IIIFCollection).items || []) {
          if (item.type === 'Manifest') {
            const found = findItemById(item, selectedId);
            if (found?.type === 'Canvas') {
              selectedCanvas = found as IIIFCanvas;
              parentManifest = item as IIIFManifest;
              break;
            }
          }
        }
      }
    }

    if (!selectedCanvas) {
      const result = findFirstCanvas(root);
      selectedCanvas = result.canvas;
      parentManifest = result.manifest;
    }

    return { canvas: selectedCanvas, manifest: parentManifest };
  }, [root, selectedId]);

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

  // Archive view
  if (currentMode === 'archive') {
    const hasSelectedItem = !!selectedId && !!selectedItem;
    const isCanvasSelected = selectedItem?.type === 'Canvas';
    const isFieldMode = settings?.fieldMode || false;

    // Should show viewer panel? Only if canvas selected AND panel not closed
    const shouldShowViewer = hasSelectedItem && isCanvasSelected && showViewerPanel;

    // Build contextual colors based on field mode
    const filmstripCx = isFieldMode
      ? {
          surface: 'bg-black',
          text: 'text-white',
          accent: 'text-yellow-400',
          border: 'border-yellow-900/50',
          divider: 'border-yellow-900/30',
          headerBg: 'bg-black',
          textMuted: 'text-yellow-200/60',
          input: 'bg-yellow-900/30 border-yellow-700',
          label: 'text-yellow-200',
          active: 'bg-yellow-500/30 text-yellow-200',
          inactive: 'text-yellow-400/50',
          warningBg: 'bg-orange-900/30',
          pageBg: 'bg-black',
        }
      : {
          surface: 'bg-slate-900',
          text: 'text-slate-100',
          accent: 'text-blue-400',
          border: 'border-slate-700',
          divider: 'border-slate-800',
          headerBg: 'bg-slate-900',
          textMuted: 'text-slate-400',
          input: 'bg-slate-800 border-slate-600',
          label: 'text-slate-300',
          active: 'bg-blue-900/30 text-blue-300',
          inactive: 'text-slate-400',
          warningBg: 'bg-amber-900/30',
          pageBg: 'bg-slate-950',
        };

    const viewerCx = isFieldMode
      ? {
          surface: 'bg-black',
          text: 'text-white',
          accent: 'text-yellow-400',
          border: 'border-yellow-900/50',
          divider: 'border-yellow-900/30',
          headerBg: 'bg-black',
          textMuted: 'text-yellow-200/60',
          input: 'bg-yellow-900/30 border-yellow-700',
          label: 'text-yellow-200',
          active: 'bg-yellow-500/30 text-yellow-200',
          inactive: 'text-yellow-400/50',
          warningBg: 'bg-orange-900/30',
          pageBg: 'bg-black',
        }
      : {
          surface: 'bg-slate-900',
          text: 'text-white',
          accent: 'text-blue-400',
          border: 'border-slate-700',
          divider: 'border-slate-800',
          headerBg: 'bg-slate-900',
          textMuted: 'text-slate-400',
          input: 'bg-slate-800 border-slate-600',
          label: 'text-slate-300',
          active: 'bg-blue-900/30 text-blue-300',
          inactive: 'text-slate-400',
          warningBg: 'bg-amber-900/30',
          pageBg: 'bg-slate-950',
        };

    // Default grid cx for full archive view - respects field mode
    const gridCx = isFieldMode
      ? {
          surface: 'bg-black',
          text: 'text-white',
          accent: 'text-yellow-400',
          border: 'border-yellow-900/50',
          divider: 'border-yellow-900/30',
          headerBg: 'bg-black',
          textMuted: 'text-yellow-200/60',
          input: 'bg-yellow-900/30 border-yellow-700',
          label: 'text-yellow-200',
          active: 'bg-yellow-500/30 text-yellow-200',
          inactive: 'text-yellow-400/50',
          warningBg: 'bg-orange-900/30',
          pageBg: 'bg-black',
        }
      : {
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        };

    return (
      <div className="flex-1 flex min-h-0">
        {/* Left: Archive Filmstrip when viewer shown, full grid otherwise */}
        <div className={`flex flex-col transition-all duration-300 ${
          shouldShowViewer
            ? `w-72 shrink-0 ${isFieldMode ? 'bg-black border-r border-yellow-900/50' : 'bg-slate-900 border-r border-slate-700'}`
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
            cx={shouldShowViewer ? filmstripCx : gridCx}
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
          <div className={`flex-1 flex flex-col min-h-0 ${isFieldMode ? 'bg-black' : 'bg-slate-950'}`}>
            {/* Viewer header with close + inspector buttons */}
            <div className={`shrink-0 px-4 py-2 border-b flex items-center justify-end gap-2 ${isFieldMode ? 'bg-black border-yellow-900/50' : 'bg-slate-900 border-slate-700'}`}>
              <Button variant="ghost" size="bare"
                onClick={() => setShowInspectorPanel(!showInspectorPanel)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showInspectorPanel
                    ? isFieldMode ? 'bg-yellow-500/30 text-yellow-400' : 'bg-blue-500/30 text-blue-400'
                    : isFieldMode ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-slate-400 hover:bg-slate-800'
                }`}
                title={showInspectorPanel ? 'Hide Inspector' : 'Show Inspector'}
              >
                <Icon name="info" className="text-lg" />
              </Button>
              <Button variant="ghost" size="bare"
                onClick={() => setShowViewerPanel(false)}
                className={`p-1.5 rounded-lg transition-colors ${isFieldMode ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
                title="Close Viewer"
              >
                <Icon name="close" className="text-lg" />
              </Button>
            </div>
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <div className={`flex flex-col min-h-0 min-w-0 ${showInspectorPanel ? 'flex-1' : 'w-full'}`}>
                <ViewerView
                  item={selectedItem as IIIFCanvas}
                  manifest={viewerData.manifest}
                  onUpdate={(updates) => onUpdateItem?.(updates)}
                  cx={viewerCx}
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
              </div>
              {/* Inspector Panel - Full Inspector with tabs */}
              {showInspectorPanel && settings && (
                <div className="w-80 shrink-0 min-h-0 overflow-hidden border-l border-slate-700">
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
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Board view
  if (currentMode === 'boards') {
    return (
      <BoardView
        root={root}
        cx={{
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        }}
        fieldMode={settings?.fieldMode || false}
        t={(key) => key}
        isAdvanced={settings?.abstractionLevel === 'advanced'}
        onExport={() => {}}
        onSwitchView={setCurrentMode}
      />
    );
  }

  // Metadata view
  if (currentMode === 'metadata') {
    const isFieldMode = settings?.fieldMode || false;
    const metadataCx = isFieldMode
      ? {
          surface: 'bg-black',
          text: 'text-white',
          accent: 'text-yellow-400',
          border: 'border-yellow-900/50',
          divider: 'border-yellow-900/30',
          headerBg: 'bg-black',
          textMuted: 'text-yellow-200/60',
          input: 'bg-yellow-900/30 border-yellow-700 text-white',
          label: 'text-yellow-200',
          active: 'bg-yellow-500/30 text-yellow-200',
          inactive: 'text-yellow-400/50',
          warningBg: 'bg-orange-900/30',
          pageBg: 'bg-black',
        }
      : {
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        };
    return (
      <MetadataView
        root={root}
        cx={metadataCx}
        fieldMode={isFieldMode}
        onUpdate={(newRoot) => onUpdateRoot?.(newRoot)}
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
        cx={{
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        }}
        fieldMode={settings?.fieldMode || false}
        t={(key) => key}
      />
    );
  }

  // Viewer view
  if (currentMode === 'viewer') {
    const isFieldMode = settings?.fieldMode || false;
    const viewerCx = isFieldMode
      ? {
          surface: 'bg-black',
          text: 'text-white',
          accent: 'text-yellow-400',
          border: 'border-yellow-900/50',
          divider: 'border-yellow-900/30',
          headerBg: 'bg-black',
          textMuted: 'text-yellow-200/60',
          input: 'bg-yellow-900/30 border-yellow-700',
          label: 'text-yellow-200',
          active: 'bg-yellow-500/30 text-yellow-200',
          inactive: 'text-yellow-400/50',
          warningBg: 'bg-orange-900/30',
          pageBg: 'bg-black',
        }
      : {
          surface: 'bg-slate-900',
          text: 'text-white',
          accent: 'text-blue-400',
          border: 'border-slate-700',
          divider: 'border-slate-800',
          headerBg: 'bg-slate-900',
          textMuted: 'text-slate-400',
          input: 'bg-slate-800 border-slate-600',
          label: 'text-slate-300',
          active: 'bg-blue-900/30 text-blue-300',
          inactive: 'text-slate-400',
          warningBg: 'bg-amber-900/30',
          pageBg: 'bg-slate-950',
        };

    return (
      <ViewerView
        item={viewerData.canvas}
        manifest={viewerData.manifest}
        onUpdate={(updates) => onUpdateItem?.(updates)}
        cx={viewerCx}
        fieldMode={isFieldMode}
        t={(key) => key}
        isAdvanced={settings?.abstractionLevel === 'advanced'}
      />
    );
  }

  // Map view
  if (currentMode === 'map') {
    return (
      <MapView
        root={root}
        onSelect={(item) => onSelectId?.(item.id)}
        cx={{
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        }}
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
        cx={{
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        }}
        fieldMode={settings?.fieldMode || false}
      />
    );
  }

  // Admin dependency explorer
  if (currentMode === 'admin-deps') {
    return (
      <div className="h-full bg-slate-50 dark:bg-slate-950 p-6">
        <DependencyExplorer />
      </div>
    );
  }

  // Default: archive
  return null;
};

export default ViewRouter;
