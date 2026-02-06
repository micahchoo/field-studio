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

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { AppMode, IIIFItem, IIIFCanvas, IIIFManifest, IIIFCollection, AppSettings, IIIFAnnotation } from '@/src/shared/types';
import type { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import { useAppMode } from '@/src/app/providers';
import { Icon } from '@/src/shared/ui/atoms';

// Feature views
import { ArchiveView } from '@/src/features/archive';
import { BoardView } from '@/src/features/board-design';
import { MetadataView, Inspector } from '@/src/features/metadata-edit';
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

  // Refs for annotation controls exposed from AnnotationDrawingOverlay
  const annotationSaveRef = useRef<(() => void) | null>(null);
  const annotationClearRef = useRef<(() => void) | null>(null);

  // Handlers for annotation actions
  const handleSaveAnnotation = useCallback(() => {
    annotationSaveRef.current?.();
    setAnnotationText('');
  }, []);

  const handleClearAnnotation = useCallback(() => {
    annotationClearRef.current?.();
    setAnnotationText('');
  }, []);

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
              <button
                onClick={() => setShowInspectorPanel(!showInspectorPanel)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showInspectorPanel
                    ? isFieldMode ? 'bg-yellow-500/30 text-yellow-400' : 'bg-blue-500/30 text-blue-400'
                    : isFieldMode ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-slate-400 hover:bg-slate-800'
                }`}
                title={showInspectorPanel ? 'Hide Inspector' : 'Show Inspector'}
              >
                <Icon name="info" className="text-lg" />
              </button>
              <button
                onClick={() => setShowViewerPanel(false)}
                className={`p-1.5 rounded-lg transition-colors ${isFieldMode ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-slate-400 hover:bg-slate-800'}`}
                title="Close Viewer"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>
            <div className="flex-1 flex min-h-0">
              <div className={`flex-1 flex flex-col min-h-0 ${showInspectorPanel ? 'w-2/3' : 'w-full'}`}>
                <ViewerView
                  item={selectedItem as IIIFCanvas}
                  manifest={viewerData.manifest}
                  onUpdate={() => {}}
                  cx={viewerCx}
                  fieldMode={isFieldMode}
                  t={(key) => key}
                  isAdvanced={settings?.abstractionLevel === 'advanced'}
                  // Controlled annotation mode for Inspector integration
                  annotationToolActive={showAnnotationTool}
                  onAnnotationToolToggle={setShowAnnotationTool}
                  annotationText={annotationText}
                  annotationMotivation={annotationMotivation}
                  onAnnotationDrawingStateChange={setAnnotationDrawingState}
                  onAnnotationSaveRef={(fn) => { annotationSaveRef.current = fn; }}
                  onAnnotationClearRef={(fn) => { annotationClearRef.current = fn; }}
                />
              </div>
              {/* Inspector Panel - Full Inspector with tabs */}
              {showInspectorPanel && settings && (
                <div className="w-80 shrink-0 min-h-0 overflow-auto">
                  <Inspector
                    resource={selectedItem}
                    onUpdateResource={(updates) => onUpdateItem?.(updates)}
                    settings={settings}
                    visible={true}
                    onClose={() => setShowInspectorPanel(false)}
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
        onUpdate={() => {}}
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
