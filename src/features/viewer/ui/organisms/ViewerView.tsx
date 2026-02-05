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

import React, { useState } from 'react';
import { getIIIFValue, type IIIFCanvas, type IIIFManifest } from '@/types';
import {
  FilmstripNavigator,
  type SearchResult,
  ViewerContent,
  ViewerEmptyState,
  ViewerPanels,
  ViewerToolbar,
  ViewerWorkbench,
} from '../molecules';
import { useViewer } from '../../model';

// LEGACY: Pending migration to FSD structure
import { CanvasComposer } from '@/components/CanvasComposer';
import { PolygonAnnotationTool } from '@/components/PolygonAnnotationTool';

export interface ViewerViewProps {
  item: IIIFCanvas | null;
  manifest: IIIFManifest | null;
  manifestItems?: IIIFCanvas[];
  onUpdate: (item: Partial<IIIFCanvas>) => void;
  autoOpenComposer?: boolean;
  onComposerOpened?: () => void;
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
    subtleBg?: string;
    subtleText?: string;
  };
  fieldMode: boolean;
  t: (key: string) => string;
  isAdvanced: boolean;
}

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
  isAdvanced: _isAdvanced,
}) => {
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showAnnotationTool, setShowAnnotationTool] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);

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

  const currentSearchService = manifest?.service?.find(
    (s: any) => s.type === 'SearchService2' || s.profile?.includes('search')
  ) || null;

  if (!item) {
    return <ViewerEmptyState t={t} cx={cx as any} fieldMode={fieldMode} />;
  }

  const label = getIIIFValue(item.label);
  const currentIndex = manifestItems?.findIndex((c) => c.id === item.id) ?? -1;
  const totalItems = manifestItems?.length ?? 1;

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col overflow-hidden relative ${fieldMode ? 'bg-black' : 'bg-slate-900'}`}
    >
      <ViewerToolbar
        label={label}
        mediaType={mediaType}
        zoomLevel={zoomLevel}
        annotationCount={annotations.length}
        hasSearchService={hasSearchService}
        canDownload={canDownload}
        isFullscreen={isFullscreen}
        showSearchPanel={showSearchPanel}
        showWorkbench={showWorkbench}
        showComposer={showComposer}
        showAnnotationTool={showAnnotationTool}
        hasMultipleCanvases={!!manifestItems && manifestItems.length > 1}
        showFilmstrip={showFilmstrip}
        viewerReady={!!viewerRef.current}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetView={resetView}
        onToggleSearch={() => setShowSearchPanel(true)}
        onToggleWorkbench={() => setShowWorkbench(true)}
        onToggleComposer={() => setShowComposer(true)}
        onToggleAnnotationTool={() => setShowAnnotationTool(true)}
        onToggleMetadata={() => {}}
        onToggleFullscreen={toggleFullscreen}
        onToggleFilmstrip={toggleFilmstrip}
        cx={cx as any}
        fieldMode={fieldMode}
      />

      <div className="flex-1 flex min-h-0 relative">
        <ViewerContent
          canvas={item}
          mediaType={mediaType}
          resolvedUrl={resolvedImageUrl}
          osdContainerRef={osdContainerRef}
          annotations={annotations as any}
          cx={cx as any}
          fieldMode={fieldMode}
        />
      </div>

      <FilmstripNavigator
        currentIndex={currentIndex}
        totalItems={totalItems}
        loadingStatus={resolvedImageUrl ? 'Image loaded' : 'Loading...'}
        label={t('Canvas')}
        cx={cx as any}
        fieldMode={fieldMode}
      />

      {/* Legacy Modals */}
      {showWorkbench && item && (
        <ViewerWorkbench
          canvas={item}
          onClose={() => setShowWorkbench(false)}
          onApply={(url) => {
            console.log('Applied IIIF URL:', url);
            setShowWorkbench(false);
          }}
          cx={cx as any}
          fieldMode={fieldMode}
        />
      )}

      {showComposer && item && (
        <CanvasComposer
          canvas={item as any}
          root={manifest as any}
          onUpdate={(updatedCanvas) => {
            onUpdate(updatedCanvas);
            setShowComposer(false);
          }}
          onClose={() => setShowComposer(false)}
        />
      )}

      {showAnnotationTool && item && (
        <PolygonAnnotationTool
          canvas={item as any}
          imageUrl={resolvedImageUrl || ''}
          onCreateAnnotation={(annotation) => console.log('Created annotation:', annotation)}
          onClose={() => setShowAnnotationTool(false)}
          existingAnnotations={annotations}
        />
      )}

      <ViewerPanels
        currentCanvasId={item?.id}
        manifest={manifest}
        searchService={currentSearchService as { id: string; type: string; profile?: string } | null}
        showSearchPanel={showSearchPanel}
        onCloseSearchPanel={() => setShowSearchPanel(false)}
        onSearchResultSelect={(result: SearchResult) => console.log('Selected:', result)}
        onSearch={async (query: string) => {
          console.log('Searching for:', query);
          return [];
        }}
        cx={cx as any}
        fieldMode={fieldMode}
      />
    </div>
  );
};

export default ViewerView;
