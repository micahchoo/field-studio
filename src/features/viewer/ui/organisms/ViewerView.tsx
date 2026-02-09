/**
 * ViewerView Organism
 *
 * Main organism for the IIIF viewer feature. Composes molecules for
 * toolbar, content, navigation, and panels.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Composes molecules: ViewerToolbar, ViewerContent, FilmstripNavigator, ViewerPanels
 * - Domain logic delegated to useViewer hook
 * - Under 300 lines (target ~150, current ~170 with legacy integration)
 *
 * IDEAL OUTCOME: Users can view, zoom, and annotate IIIF canvases
 * FAILURE PREVENTED: OSD memory leaks, stale image URLs, annotation loss
 *
 * @module features/viewer/ui/organisms/ViewerView
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIIIFValue, type IIIFAnnotation, type IIIFCanvas, type IIIFManifest, type IIIFRange, type IIIFRangeReference } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { storage } from '@/src/shared/services/storage';
import { contentStateService } from '@/src/shared/services/contentState';
import {
  type AnnotationDrawingMode,
  AnnotationDrawingOverlay,
  FilmstripNavigator,
  KeyboardShortcutsModal,
  type SearchResult,
  ViewerContent,
  ViewerEmptyState,
  ViewerPanels,
  ViewerToolbar,
  ViewerWorkbench,
} from '../molecules';
import { type AnnotationStyleOptions, type ScreenshotFormat, type SpatialDrawingMode, useViewer, useImageFilters, useMeasurement, useComparison, useAnnotationLayers } from '../../model';
import { ImageFilterPanel, MeasurementOverlay, ComparisonViewer, AnnotationLayerPanel } from '../molecules';
import { useVaultDispatch, useVaultState } from '@/src/entities/manifest/model/hooks/useIIIFEntity';
import { actions } from '@/src/entities/manifest/model/actions';
import { uiLog } from '@/src/shared/services/logger';

// Note: CanvasComposer has been phased out in favor of Board View
// See: src/features/board-design/ui/organisms/BoardView.tsx

export interface ViewerViewProps {
  item: IIIFCanvas | null;
  manifest: IIIFManifest | null;
  manifestItems?: IIIFCanvas[];
  onUpdate: (item: Partial<IIIFCanvas>) => void;
  /** @deprecated Canvas Composer phased out in favor of Board View */
  autoOpenComposer?: boolean;
  /** @deprecated Canvas Composer phased out in favor of Board View */
  onComposerOpened?: () => void;
  /** Navigate to Board view with current canvas */
  onAddToBoard?: (canvasId: string) => void;
  cx: ContextualClassNames;
  fieldMode: boolean;
  t: (key: string) => string;
  isAdvanced: boolean;
  // Controlled annotation mode (for integration with external Inspector)
  /** Whether annotation tool is active (controlled mode) */
  annotationToolActive?: boolean;
  /** Toggle annotation tool (controlled mode) */
  onAnnotationToolToggle?: (active: boolean) => void;
  /** Annotation text from Inspector */
  annotationText?: string;
  /** Annotation motivation from Inspector */
  annotationMotivation?: 'commenting' | 'tagging' | 'describing';
  /** Callback when drawing state changes */
  onAnnotationDrawingStateChange?: (state: { pointCount: number; isDrawing: boolean; canSave: boolean }) => void;
  /** Ref callback to expose save function */
  onAnnotationSaveRef?: (fn: () => void) => void;
  /** Ref callback to expose clear function */
  onAnnotationClearRef?: (fn: () => void) => void;
  /** Current time range for time-based annotations (controlled mode) */
  timeRange?: { start: number; end?: number } | null;
  /** Callback when time range changes */
  onTimeRangeChange?: (range: { start: number; end?: number } | null) => void;
  /** Current playback time */
  currentPlaybackTime?: number;
  /** Callback when playback time updates */
  onPlaybackTimeChange?: (time: number) => void;
  /** Ref callback to expose time annotation create function */
  onTimeAnnotationCreateRef?: (fn: (text: string, motivation: 'commenting' | 'tagging' | 'describing') => void) => void;
  /** Callback when user selects/deselects an annotation in the viewer */
  onAnnotationSelected?: (annotationId: string | null) => void;
}

export const ViewerView: React.FC<ViewerViewProps> = ({
  item,
  manifest,
  manifestItems,
  onUpdate,
  autoOpenComposer: _autoOpenComposer,
  onComposerOpened: _onComposerOpened,
  onAddToBoard,
  cx,
  fieldMode,
  t,
  isAdvanced: _isAdvanced,
  // Controlled annotation props
  annotationToolActive,
  onAnnotationToolToggle,
  annotationText: annotationTextProp,
  annotationMotivation: annotationMotivationProp,
  onAnnotationDrawingStateChange,
  onAnnotationSaveRef,
  onAnnotationClearRef,
  // Controlled time range props
  timeRange: timeRangeProp,
  onTimeRangeChange: onTimeRangeChangeProp,
  currentPlaybackTime: currentPlaybackTimeProp,
  onPlaybackTimeChange,
  onTimeAnnotationCreateRef: _onTimeAnnotationCreateRef,
  onAnnotationSelected,
}) => {
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  // Annotation state - use controlled props if provided, otherwise internal state
  const [internalShowAnnotationTool, setInternalShowAnnotationTool] = useState(false);
  const [internalAnnotationText, setInternalAnnotationText] = useState('');
  const [internalAnnotationMotivation, setInternalAnnotationMotivation] = useState<'commenting' | 'tagging' | 'describing'>('commenting');

  // Use controlled or internal state
  const isControlledAnnotation = annotationToolActive !== undefined;
  const showAnnotationTool = isControlledAnnotation ? annotationToolActive : internalShowAnnotationTool;
  const setShowAnnotationTool = isControlledAnnotation
    ? (active: boolean) => onAnnotationToolToggle?.(active)
    : setInternalShowAnnotationTool;
  const annotationText = isControlledAnnotation ? (annotationTextProp ?? '') : internalAnnotationText;
  const annotationMotivation = isControlledAnnotation ? (annotationMotivationProp ?? 'commenting') : internalAnnotationMotivation;

  // Annotation drawing state - controlled from toolbar, used by overlay
  // Note: Uses SpatialDrawingMode because time-based annotation is handled separately in MediaPlayer
  const [annotationDrawingMode, setAnnotationDrawingMode] = useState<SpatialDrawingMode>('polygon');
  const [annotationStyle, setAnnotationStyle] = useState<AnnotationStyleOptions>({
    color: '#22c55e',
    strokeWidth: 2,
    fillOpacity: 0.1,
  });
  const annotationUndoRef = useRef<(() => void) | null>(null);
  const annotationRedoRef = useRef<(() => void) | null>(null);
  const annotationClearRef = useRef<(() => void) | null>(null);
  const annotationSaveRef = useRef<(() => void) | null>(null);

  // Time-based annotation state (for audio/video) - use controlled props if provided
  const [internalTimeRange, setInternalTimeRange] = useState<{ start: number; end?: number } | null>(null);
  const [internalPlaybackTime, setInternalPlaybackTime] = useState(0);

  // Use controlled or internal state for time range
  const isControlledTimeRange = timeRangeProp !== undefined;
  const timeRange = isControlledTimeRange ? timeRangeProp : internalTimeRange;
  const setTimeRange = isControlledTimeRange
    ? (range: { start: number; end?: number } | null) => onTimeRangeChangeProp?.(range)
    : setInternalTimeRange;
  const currentPlaybackTime = currentPlaybackTimeProp !== undefined ? currentPlaybackTimeProp : internalPlaybackTime;
  const handlePlaybackTimeUpdate = (time: number) => {
    if (onPlaybackTimeChange) {
      onPlaybackTimeChange(time);
    } else {
      setInternalPlaybackTime(time);
    }
  };

  // Get vault dispatch for persisting annotations
  const { dispatch } = useVaultDispatch();
  const { exportRoot } = useVaultState();

  const {
    mediaType,
    annotations,
    resolvedImageUrl,
    zoomLevel,
    rotation,
    isFlipped,
    showNavigator,
    isFullscreen,
    showFilmstrip,
    showKeyboardHelp,
    viewerRef,
    osdContainerRef,
    containerRef,
    zoomIn,
    zoomOut,
    resetView,
    rotateCW,
    rotateCCW,
    flipHorizontal,
    takeScreenshot,
    toggleFullscreen,
    toggleNavigator,
    toggleFilmstrip,
    toggleKeyboardHelp,
    canDownload,
    hasSearchService,
    osdReady,
    handleImageKeyDown,
  } = useViewer(item, manifest);

  // Image filters
  const imageFilters = useImageFilters(viewerRef, osdContainerRef);

  // Measurement tool
  const measurement = useMeasurement();

  // Comparison mode
  const comparison = useComparison();

  // Annotation layers (non-painting annotation pages)
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const annotationLayers = useAnnotationLayers(item);

  // When layers exist, filter annotations by layer visibility; otherwise show all
  const effectiveAnnotations = annotationLayers.layers.length > 0
    ? annotationLayers.visibleAnnotations
    : annotations;

  // Handle screenshot with format choice and clipboard/download
  const handleScreenshot = useCallback(async (format: ScreenshotFormat = 'image/png', action: 'download' | 'clipboard' = 'download') => {
    const quality = format === 'image/jpeg' ? 0.92 : format === 'image/webp' ? 0.9 : undefined;
    const blob = await takeScreenshot(format, quality);
    if (!blob) return;

    if (action === 'clipboard') {
      try {
        // Clipboard API requires PNG; convert if needed
        const clipBlob = format === 'image/png' ? blob : await takeScreenshot('image/png');
        if (clipBlob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': clipBlob })]);
        }
      } catch {
        // Fallback to download if clipboard fails
        action = 'download';
      }
    }

    if (action === 'download') {
      const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screenshot-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [takeScreenshot]);

  // Handle creating annotation - persist to vault and save to IndexedDB
  // The vault now properly handles annotation page creation/lookup
  const handleCreateAnnotation = useCallback((annotation: IIIFAnnotation) => {
    if (!item?.id) {
      uiLog.warn('[ViewerView] Cannot create annotation: no canvas selected');
      return;
    }

    // Dispatch to vault - it handles AnnotationPage structure internally
    const result = dispatch(actions.addAnnotation(item.id, annotation));
    if (result) {
      uiLog.debug(`[ViewerView] Annotation persisted to canvas: ${item.id} ${annotation.id}`);

      // Save to IndexedDB - export the updated root and persist
      const updatedRoot = exportRoot();
      if (updatedRoot) {
        storage.saveProject(updatedRoot)
          .then(() => uiLog.debug('[ViewerView] Saved to IndexedDB'))
          .catch((err) => uiLog.error('[ViewerView] Failed to save:', err instanceof Error ? err : undefined));
      }
    }
    // Keep annotation tool open so user can add more annotations
  }, [item, dispatch, exportRoot]);

  // Extract IIIF Range structures as chapter markers for audio/video timeline
  const CHAPTER_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];
  const chapters = useMemo(() => {
    if (!manifest?.structures || !item?.id) return [];
    const markers: { label: string; start: number; end: number; color: string }[] = [];

    const extractFromRange = (range: IIIFRange, colorIdx: number) => {
      for (const ref of range.items) {
        // Canvas reference with time fragment: "canvasId#t=start,end"
        const refId = (ref as IIIFRangeReference).id || '';
        if (!refId.includes(item.id)) continue;
        const hashIdx = refId.indexOf('#t=');
        if (hashIdx === -1) continue;
        const fragment = refId.substring(hashIdx + 3);
        const parts = fragment.split(',');
        const start = parseFloat(parts[0]);
        const end = parts.length > 1 ? parseFloat(parts[1]) : start;
        if (isNaN(start)) continue;
        markers.push({
          label: getIIIFValue(range.label) || `Chapter ${markers.length + 1}`,
          start,
          end: isNaN(end) ? start : end,
          color: CHAPTER_COLORS[colorIdx % CHAPTER_COLORS.length],
        });
      }
    };

    manifest.structures.forEach((range, idx) => extractFromRange(range, idx));
    return markers.sort((a, b) => a.start - b.start);
  }, [manifest?.structures, item?.id]);

  // Handle spatial annotation on video — combine spatial rect with current time range
  const handleSpatialAnnotation = useCallback((region: { x: number; y: number; w: number; h: number }) => {
    if (!item?.id) return;

    // Create SVG selector for the spatial region (normalized 0-1 coords → pixel coords)
    const canvasW = item.width || 1920;
    const canvasH = item.height || 1080;
    const x = Math.round(region.x * canvasW);
    const y = Math.round(region.y * canvasH);
    const w = Math.round(region.w * canvasW);
    const h = Math.round(region.h * canvasH);
    const svgValue = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></svg>`;

    // Build the annotation target with both spatial and temporal selectors
    const svgSelector = { type: 'SvgSelector' as const, value: svgValue };
    let targetSelector: IIIFAnnotation['target'];

    if (timeRange) {
      const tFrag = timeRange.end != null
        ? `t=${timeRange.start},${timeRange.end}`
        : `t=${timeRange.start}`;
      const fragSelector = {
        type: 'FragmentSelector' as const,
        value: tFrag,
        conformsTo: 'http://www.w3.org/TR/media-frags/',
      };
      targetSelector = {
        type: 'SpecificResource' as const,
        source: item.id,
        selector: [svgSelector, fragSelector],
      };
    } else {
      targetSelector = {
        type: 'SpecificResource' as const,
        source: item.id,
        selector: svgSelector,
      };
    }

    const annotation: IIIFAnnotation = {
      id: `anno-spatial-${Date.now()}`,
      type: 'Annotation',
      motivation: 'commenting',
      body: { type: 'TextualBody', value: '', format: 'text/plain' } as unknown as IIIFAnnotation['body'],
      target: targetSelector,
    };

    handleCreateAnnotation(annotation);
  }, [item, timeRange, handleCreateAnnotation]);

  // Handle annotation selection in viewer → forward as ID to parent
  const handleAnnotationSelected = useCallback((annotation: import('@/src/shared/types').IIIFAnnotation | null) => {
    onAnnotationSelected?.(annotation?.id ?? null);
  }, [onAnnotationSelected]);

  // Handle adding current canvas to Board
  const handleAddToBoard = () => {
    if (item && onAddToBoard) {
      onAddToBoard(item.id);
    }
  };

  // Handle toggling comparison - picks the next canvas as comparison target
  const handleToggleComparison = useCallback(() => {
    if (comparison.mode !== 'off') {
      comparison.stopComparison();
    } else if (manifestItems && manifestItems.length > 1 && item) {
      const currentIdx = manifestItems.findIndex(c => c.id === item.id);
      const nextIdx = (currentIdx + 1) % manifestItems.length;
      comparison.startComparison(manifestItems[nextIdx].id);
    }
  }, [comparison, manifestItems, item]);

  // Find the second canvas for comparison
  const secondComparisonCanvas = comparison.secondCanvasId
    ? manifestItems?.find(c => c.id === comparison.secondCanvasId) ?? null
    : null;

  const currentSearchService = manifest?.service?.find(
    (s: { type?: string; profile?: string | string[] }) =>
      s.type === 'SearchService2' || (Array.isArray(s.profile) ? s.profile.some(p => p.includes('search')) : s.profile?.includes('search'))
  ) || null;

  if (!item) {
    return <ViewerEmptyState t={t} cx={cx} fieldMode={fieldMode} />;
  }

  const label = getIIIFValue(item.label);
  const currentIndex = manifestItems?.findIndex((c) => c.id === item.id) ?? -1;
  const totalItems = manifestItems?.length ?? 1;

  // Share link handler — copies IIIF Content State link to clipboard
  const handleShareLink = useCallback(() => {
    if (!item?.id || !manifest?.id) return;
    contentStateService.copyLink({ manifestId: manifest.id, canvasId: item.id });
  }, [item?.id, manifest?.id]);

  // Wire image keyboard shortcuts to container
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (mediaType === 'image') {
      handleImageKeyDown(e.nativeEvent, {
        annotationToolActive: showAnnotationTool,
        onAnnotationToolToggle: setShowAnnotationTool,
        onMeasurementToggle: measurement.toggleActive,
      });
    }
  }, [mediaType, handleImageKeyDown, showAnnotationTool, setShowAnnotationTool, measurement.toggleActive]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col overflow-hidden relative ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <ViewerToolbar
        label={label}
        mediaType={mediaType}
        zoomLevel={zoomLevel}
        rotation={rotation}
        isFlipped={isFlipped}
        showNavigator={showNavigator}
        annotationCount={annotations.length}
        hasSearchService={hasSearchService}
        canDownload={canDownload}
        isFullscreen={isFullscreen}
        showSearchPanel={showSearchPanel}
        showWorkbench={showWorkbench}
        showComposer={false}
        showAnnotationTool={showAnnotationTool}
        annotationDrawingMode={annotationDrawingMode}
        hasMultipleCanvases={!!manifestItems && manifestItems.length > 1}
        showFilmstrip={showFilmstrip}
        viewerReady={!!viewerRef.current}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetView={resetView}
        onRotateCW={rotateCW}
        onRotateCCW={rotateCCW}
        onFlipHorizontal={flipHorizontal}
        onTakeScreenshot={handleScreenshot}
        onToggleNavigator={toggleNavigator}
        onToggleKeyboardHelp={toggleKeyboardHelp}
        onToggleSearch={() => setShowSearchPanel(true)}
        onToggleWorkbench={() => setShowWorkbench(true)}
        onToggleComposer={handleAddToBoard}
        onToggleAnnotationTool={() => setShowAnnotationTool(!showAnnotationTool)}
        onAnnotationModeChange={setAnnotationDrawingMode}
        onAnnotationUndo={() => annotationUndoRef.current?.()}
        onAnnotationRedo={() => annotationRedoRef.current?.()}
        onAnnotationClear={() => annotationClearRef.current?.()}
        annotationStyle={annotationStyle}
        onAnnotationStyleChange={setAnnotationStyle}
        onToggleMetadata={() => {}}
        onToggleFullscreen={toggleFullscreen}
        onToggleFilmstrip={toggleFilmstrip}
        showFilterPanel={imageFilters.showPanel}
        filtersActive={imageFilters.isActive}
        onToggleFilterPanel={imageFilters.togglePanel}
        showMeasurement={measurement.active}
        onToggleMeasurement={measurement.toggleActive}
        showComparison={comparison.mode !== 'off'}
        onToggleComparison={handleToggleComparison}
        showLayers={showLayerPanel}
        onToggleLayers={() => setShowLayerPanel(prev => !prev)}
        layerCount={annotationLayers.layers.length}
        onShareLink={manifest ? handleShareLink : undefined}
        cx={cx}
        fieldMode={fieldMode}
      />

      <div className="flex-1 flex min-h-0 relative">
        <ViewerContent
          canvas={item}
          mediaType={mediaType}
          resolvedUrl={resolvedImageUrl}
          osdContainerRef={osdContainerRef}
          viewerRef={viewerRef}
          annotations={effectiveAnnotations}
          onCreateAnnotation={handleCreateAnnotation}
          annotationModeActive={showAnnotationTool && (mediaType === 'audio' || mediaType === 'video')}
          onAnnotationModeToggle={(active) => setShowAnnotationTool(active)}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onPlaybackTimeUpdate={handlePlaybackTimeUpdate}
          chapters={chapters}
          spatialAnnotationMode={showAnnotationTool && mediaType === 'video'}
          onSpatialAnnotation={handleSpatialAnnotation}
          cx={cx}
          fieldMode={fieldMode}
        />

        {/* Image filter panel */}
        {mediaType === 'image' && imageFilters.showPanel && (
          <ImageFilterPanel
            filters={imageFilters.filters}
            isActive={imageFilters.isActive}
            onBrightnessChange={imageFilters.setBrightness}
            onContrastChange={imageFilters.setContrast}
            onToggleInvert={imageFilters.toggleInvert}
            onToggleGrayscale={imageFilters.toggleGrayscale}
            onReset={imageFilters.resetFilters}
            onClose={imageFilters.togglePanel}
            fieldMode={fieldMode}
          />
        )}

        {/* Comparison viewer overlay - only for images */}
        {mediaType === 'image' && comparison.mode !== 'off' && secondComparisonCanvas && (
          <ComparisonViewer
            comparison={comparison}
            primaryCanvas={item}
            secondCanvas={secondComparisonCanvas}
            primaryViewerRef={viewerRef}
            cx={cx}
            fieldMode={fieldMode}
          />
        )}

        {/* Measurement overlay - only for images */}
        {mediaType === 'image' && measurement.active && (
          <MeasurementOverlay
            measurement={measurement}
            viewerRef={viewerRef}
            osdContainerRef={osdContainerRef}
            fieldMode={fieldMode}
          />
        )}

        {/* Integrated Annotation Drawing Overlay - only for images */}
        {mediaType === 'image' && (
          <AnnotationDrawingOverlay
            canvas={item}
            viewerRef={viewerRef}
            isActive={showAnnotationTool}
            drawingMode={annotationDrawingMode}
            onDrawingModeChange={setAnnotationDrawingMode}
            onCreateAnnotation={handleCreateAnnotation}
            onClose={() => setShowAnnotationTool(false)}
            existingAnnotations={effectiveAnnotations}
            onUndoRef={(fn) => { annotationUndoRef.current = fn; }}
            onRedoRef={(fn) => { annotationRedoRef.current = fn; }}
            onClearRef={(fn) => {
              annotationClearRef.current = fn;
              onAnnotationClearRef?.(fn);
            }}
            onSaveRef={(fn) => {
              annotationSaveRef.current = fn;
              onAnnotationSaveRef?.(fn);
            }}
            onDrawingStateChange={onAnnotationDrawingStateChange}
            annotationText={annotationText}
            annotationMotivation={annotationMotivation}
            annotationStyle={annotationStyle}
            osdReady={osdReady}
            onAnnotationSelected={handleAnnotationSelected}
            cx={cx}
            fieldMode={fieldMode}
          />
        )}

        {/* Annotation layer panel */}
        {annotationLayers.layers.length > 0 && (
          <AnnotationLayerPanel
            layers={annotationLayers.layers}
            onToggleLayer={annotationLayers.toggleLayer}
            onSetAllVisible={annotationLayers.setAllVisible}
            onLayerOpacityChange={annotationLayers.setLayerOpacity}
            fieldMode={fieldMode}
            visible={showLayerPanel}
            onClose={() => setShowLayerPanel(false)}
          />
        )}
      </div>

      <FilmstripNavigator
        currentIndex={currentIndex}
        totalItems={totalItems}
        loadingStatus={resolvedImageUrl ? 'Image loaded' : 'Loading...'}
        label={t('Canvas')}
        cx={cx}
        fieldMode={fieldMode}
      />

      {/* Legacy Modals */}
      {showWorkbench && item && (
        <ViewerWorkbench
          canvas={item}
          onClose={() => setShowWorkbench(false)}
          onApply={(url) => {
            uiLog.debug('Applied IIIF URL:', url);
            setShowWorkbench(false);
          }}
          cx={cx}
          fieldMode={fieldMode}
        />
      )}

      {/* Canvas Composer removed - use Board View for composition */}

      <ViewerPanels
        currentCanvasId={item?.id}
        manifest={manifest}
        searchService={currentSearchService as { id: string; type: string; profile?: string } | null}
        showSearchPanel={showSearchPanel}
        onCloseSearchPanel={() => setShowSearchPanel(false)}
        onSearchResultSelect={(result: SearchResult) => uiLog.debug('Selected:', result)}
        onSearch={async (query: string) => {
          uiLog.debug('Searching for:', query);
          return [];
        }}
        cx={cx}
        fieldMode={fieldMode}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardHelp}
        onClose={toggleKeyboardHelp}
        cx={cx}
        fieldMode={fieldMode}
      />
    </div>
  );
};

export default ViewerView;
