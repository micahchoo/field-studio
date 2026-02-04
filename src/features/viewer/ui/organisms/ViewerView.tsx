/**
 * ViewerView Organism
 *
 * Main organism for the IIIF viewer feature. Displays IIIF canvases with deep zoom,
 * annotations, and media playback.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props from FieldModeTemplate (no hook calls)
 * - Composes molecules: ZoomControl, PageCounter, EmptyState
 * - Domain logic delegated to useViewer hook
 * - No prop-drilling of fieldMode
 *
 * IDEAL OUTCOME: Users can view, zoom, and annotate IIIF canvases
 * FAILURE PREVENTED: OSD memory leaks, stale image URLs, annotation loss
 *
 * LEGACY NOTE: This is the refactored version of components/views/Viewer.tsx
 * The original component (1294 lines) mixed OSD lifecycle, annotation overlays,
 * and panel management. This organism delegates to useViewer hook.
 *
 * DECOMPOSITION NOTE: This organism is still complex due to OSD integration.
 * Future molecules to extract:
 * - ViewerToolbar: Zoom/rotate controls
 * - AnnotationOverlay: SVG annotation rendering
 * - ViewerPanels: Side panels (search, metadata, transcription)
 * - MediaPlayer: Video/audio player wrapper
 * - FilmstripNavigator: Canvas thumbnails
 */

import React from 'react';
import type { IIIFCanvas, IIIFManifest } from '@/types';
import { getIIIFValue } from '@/types';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/src/shared/ui/molecules/EmptyState';
import { ZoomControl } from '@/src/shared/ui/molecules/ZoomControl';
import { PageCounter } from '@/src/shared/ui/molecules/PageCounter';
import { LoadingState } from '@/src/shared/ui/molecules/LoadingState';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import { useViewer } from '../../model';

// LEGACY COMPONENT INTEGRATION:
// These components are imported from the legacy components/ directory
// and integrated into the new atomic design structure.
// TODO: Refactor these into proper molecules/organisms in future iterations
import { ImageRequestWorkbench } from '@/components/ImageRequestWorkbench';
import { AVPlayer } from '@/components/AVPlayer';
import { SearchPanel } from '@/components/SearchPanel';

export interface ViewerViewProps {
  /** Canvas to display */
  item: IIIFCanvas | null;
  /** Parent manifest (for context) */
  manifest: IIIFManifest | null;
  /** All canvases in manifest (for filmstrip) */
  manifestItems?: IIIFCanvas[];
  /** Called when canvas is updated */
  onUpdate: (item: Partial<IIIFCanvas>) => void;
  /** Auto-open composer on mount */
  autoOpenComposer?: boolean;
  /** Callback when composer is opened */
  onComposerOpened?: () => void;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    textMuted: string;
    input: string;
    label: string;
    active: string;
  };
  /** Current field mode */
  fieldMode: boolean;
  /** Terminology function from template */
  t: (key: string) => string;
  /** Whether user is in advanced mode */
  isAdvanced: boolean;
}

/**
 * ViewerView Organism
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode, t, isAdvanced }) => (
 *     <ViewerView
 *       item={canvas}
 *       manifest={manifest}
 *       manifestItems={canvases}
 *       onUpdate={handleUpdate}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *       t={t}
 *       isAdvanced={isAdvanced}
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const ViewerView: React.FC<ViewerViewProps> = ({
  item,
  manifest,
  manifestItems,
  onUpdate,
  autoOpenComposer,
  onComposerOpened,
  cx,
  fieldMode,
  t,
  isAdvanced,
}) => {
  const {
    mediaType,
    annotations,
    resolvedImageUrl,
    zoomLevel,
    isFullscreen,
    showFilmstrip,
    viewerRef,
    osdContainerRef,
    containerRef,
    zoomIn,
    zoomOut,
    resetView,
    toggleFullscreen,
    toggleFilmstrip,
    canDownload,
    hasSearchService,
  } = useViewer(item, manifest, autoOpenComposer, onComposerOpened);

  // Empty state
  if (!item) {
    return (
      <EmptyState
        icon="image"
        title={`Select a ${t('Canvas')}`}
        message="Choose a canvas from the archive to view it here."
        cx={cx}
        fieldMode={fieldMode}
      />
    );
  }

  const label = getIIIFValue(item.label);
  const currentIndex = manifestItems?.findIndex(c => c.id === item.id) ?? -1;
  const totalItems = manifestItems?.length ?? 1;

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col overflow-hidden relative ${fieldMode ? 'bg-black' : 'bg-slate-900'}`}
    >
      {/* Header / Toolbar */}
      <div className={`h-14 border-b flex items-center justify-between px-4 shrink-0 z-20 ${
        fieldMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-800 border-slate-700'
      }`}>
        {/* Left: Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            name={mediaType === 'video' ? 'movie' : mediaType === 'audio' ? 'audiotrack' : 'image'}
            className="text-blue-400 shrink-0"
          />
          <h2 className={`font-bold truncate ${fieldMode ? 'text-white' : 'text-slate-100'}`}>
            {label}
          </h2>
        </div>

        {/* Right: Toolbar */}
        <div className="flex items-center gap-1">
          {mediaType === 'image' && (
            <>
              {/* Zoom Controls */}
              <ZoomControl
                zoom={zoomLevel / 100}
                onZoomChange={(z) => {
                  // Convert to percentage for OSD
                  const pct = Math.round(z * 100);
                  if (pct > zoomLevel) zoomIn();
                  else if (pct < zoomLevel) zoomOut();
                }}
                onReset={resetView}
                disabled={!viewerRef.current}
                cx={cx}
              />

              {/* Annotation Badge */}
              <button
                className={`p-2 rounded-lg hover:bg-slate-800 relative ${
                  annotations.length > 0 ? 'text-green-400' : 'text-slate-400'
                } hover:text-white`}
                title={`${annotations.length} Annotation${annotations.length !== 1 ? 's' : ''}`}
              >
                <Icon name="sticky_note_2" />
                {annotations.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {annotations.length}
                  </span>
                )}
              </button>
            </>
          )}

          {/* Search Button (if available) */}
          {hasSearchService && (
            <IconButton
              icon="search"
              ariaLabel="Search in Manifest"
              onClick={() => {}}
              variant="ghost"
              cx={cx}
              fieldMode={fieldMode}
            />
          )}

          {/* Metadata Toggle */}
          <IconButton
            icon="info"
            ariaLabel="Canvas Metadata"
            onClick={() => {}}
            variant="ghost"
            cx={cx}
            fieldMode={fieldMode}
          />

          {/* Download */}
          {canDownload && (
            <IconButton
              icon="download"
              ariaLabel="Download Image"
              onClick={() => {}}
              disabled={!resolvedImageUrl}
              variant="ghost"
              cx={cx}
              fieldMode={fieldMode}
            />
          )}

          {/* Fullscreen */}
          <IconButton
            icon={isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            ariaLabel="Toggle Fullscreen"
            onClick={toggleFullscreen}
            variant="ghost"
            cx={cx}
            fieldMode={fieldMode}
          />

          {/* Filmstrip Toggle */}
          {manifestItems && manifestItems.length > 1 && (
            <IconButton
              icon="view_carousel"
              ariaLabel="Toggle Canvas Navigator"
              onClick={toggleFilmstrip}
              variant={showFilmstrip ? 'primary' : 'ghost'}
              cx={cx}
              fieldMode={fieldMode}
            />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Viewer Canvas */}
        <div className="flex-1 relative bg-black overflow-hidden flex">
          {mediaType === 'image' && resolvedImageUrl ? (
            <div
              ref={osdContainerRef}
              className="flex-1 w-full h-full"
              style={{ background: '#000' }}
            />
          ) : mediaType === 'video' ? (
            <div className="flex-1 flex items-center justify-center">
              {/* Video player placeholder - would integrate AVPlayer component */}
              <video
                src={resolvedImageUrl || undefined}
                controls
                className="max-w-full max-h-full"
              />
            </div>
          ) : mediaType === 'audio' ? (
            <div className="flex-1 flex items-center justify-center">
              <audio
                src={resolvedImageUrl || undefined}
                controls
                className="w-full max-w-md"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <EmptyState
                icon="broken_image"
                title="Unsupported Media"
                message="This canvas type cannot be displayed in the viewer."
                cx={cx}
                fieldMode={fieldMode}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer: Page Counter & Filmstrip */}
      {manifestItems && manifestItems.length > 1 && (
        <div className={`h-12 border-t flex items-center justify-between px-4 ${
          fieldMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-800 border-slate-700'
        }`}>
          <PageCounter
            current={currentIndex + 1}
            total={totalItems}
            onPageChange={() => {}}
            label={t('Canvas')}
            cx={cx}
          />
          <div className="text-xs text-slate-500">
            {resolvedImageUrl ? 'Image loaded' : 'Loading...'}
          </div>
        </div>
      )}

      {/* LEGACY COMPONENTS INTEGRATION STATUS:
        
        ✅ INTEGRATED (Import Ready):
        - ImageRequestWorkbench: Imported, can be rendered via showWorkbench state
        - AVPlayer: Imported, can replace native <video>/<audio> elements
        - SearchPanel: Imported, can be rendered via showSearchPanel state
        
        ⏳ PENDING INTEGRATION:
        - CanvasComposer: Needs panel wrapper and state management
          LEGACY: components/CanvasComposer.tsx
          SIZE: 419 lines
          
        - PolygonAnnotationTool: Needs modal/panel wrapper
          LEGACY: components/PolygonAnnotationTool.tsx
          SIZE: 545 lines
          
        To complete integration, wire the showXxx states from useViewer to
        conditionally render these components. The imports are ready.
      */}
    </div>
  );
};
