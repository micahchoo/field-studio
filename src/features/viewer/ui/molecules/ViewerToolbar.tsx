/**
 * ViewerToolbar Molecule
 *
 * Simplified toolbar for IIIF viewer with clear groupings:
 * - Left: Title
 * - Center: View controls (zoom, rotation for images)
 * - Right: Actions (annotate, metadata, fullscreen)
 *
 * @module features/viewer/ui/molecules/ViewerToolbar
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import { ZoomControl } from '@/src/features/viewer/ui/atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export type AnnotationDrawingMode = 'polygon' | 'rectangle' | 'freehand' | 'select';

/** Toolbar button group with label */
const ToolbarGroup: React.FC<{
  label?: string;
  children: React.ReactNode;
  fieldMode?: boolean;
}> = ({ label, children, fieldMode }) => (
  <div className="flex items-center gap-0.5">
    {label && (
      <span className={`nb-label-sm mr-1 ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'}`}>
        {label}
      </span>
    )}
    {children}
  </div>
);

/** Vertical divider */
const ToolbarDivider: React.FC<{ cx: ContextualClassNames }> = ({ cx }) => (
  <div className={`w-px h-6 mx-1 ${cx.divider}`} />
);

export interface ViewerToolbarProps {
  /** Canvas label/title to display */
  label: string;
  /** Media type for icon display */
  mediaType: 'image' | 'video' | 'audio' | 'other';
  /** Current zoom level (percentage) */
  zoomLevel: number;
  /** Current rotation in degrees */
  rotation?: number;
  /** Whether image is flipped */
  isFlipped?: boolean;
  /** Whether navigator is visible */
  showNavigator?: boolean;
  /** Number of annotations */
  annotationCount: number;
  /** Whether search service is available */
  hasSearchService: boolean;
  /** Whether image can be downloaded */
  canDownload: boolean;
  /** Whether viewer is in fullscreen */
  isFullscreen: boolean;
  /** Whether search panel is open */
  showSearchPanel: boolean;
  /** Whether workbench is open */
  showWorkbench: boolean;
  /** Whether composer is open */
  showComposer: boolean;
  /** Whether annotation tool is open */
  showAnnotationTool: boolean;
  /** Current drawing mode when annotation tool is active */
  annotationDrawingMode?: AnnotationDrawingMode;
  /** Whether there are multiple canvases */
  hasMultipleCanvases: boolean;
  /** Whether filmstrip is visible */
  showFilmstrip: boolean;
  /** Whether OSD viewer is ready */
  viewerReady: boolean;
  /** Zoom in handler */
  onZoomIn: () => void;
  /** Zoom out handler */
  onZoomOut: () => void;
  /** Reset view handler */
  onResetView: () => void;
  /** Rotate clockwise handler */
  onRotateCW?: () => void;
  /** Rotate counter-clockwise handler */
  onRotateCCW?: () => void;
  /** Flip horizontal handler */
  onFlipHorizontal?: () => void;
  /** Screenshot handler */
  onTakeScreenshot?: () => void;
  /** Navigator toggle */
  onToggleNavigator?: () => void;
  /** Keyboard help toggle */
  onToggleKeyboardHelp?: () => void;
  /** Search panel toggle */
  onToggleSearch: () => void;
  /** Workbench toggle */
  onToggleWorkbench: () => void;
  /** Composer toggle */
  onToggleComposer: () => void;
  /** Annotation tool toggle */
  onToggleAnnotationTool: () => void;
  /** Change annotation drawing mode */
  onAnnotationModeChange?: (mode: AnnotationDrawingMode) => void;
  /** Undo annotation drawing */
  onAnnotationUndo?: () => void;
  /** Clear annotation drawing */
  onAnnotationClear?: () => void;
  /** Metadata panel toggle */
  onToggleMetadata: () => void;
  /** Download handler */
  onDownload?: () => void;
  /** Fullscreen toggle */
  onToggleFullscreen: () => void;
  /** Filmstrip toggle */
  onToggleFilmstrip: () => void;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
}

/**
 * ViewerToolbar Molecule
 *
 * @example
 * <ViewerToolbar
 *   label="Page 1"
 *   mediaType="image"
 *   zoomLevel={100}
 *   annotationCount={3}
 *   hasSearchService={true}
 *   onZoomIn={zoomIn}
 *   onZoomOut={zoomOut}
 *   cx={cx}
 *   fieldMode={fieldMode}
 * />
 */
export const ViewerToolbar: React.FC<ViewerToolbarProps> = ({
  label,
  mediaType,
  zoomLevel,
  rotation = 0,
  isFlipped = false,
  showNavigator = true,
  annotationCount,
  hasSearchService,
  canDownload,
  isFullscreen,
  showSearchPanel,
  showWorkbench,
  showComposer,
  showAnnotationTool,
  hasMultipleCanvases,
  showFilmstrip,
  viewerReady,
  onZoomIn,
  onZoomOut,
  onResetView,
  onRotateCW,
  onRotateCCW,
  onFlipHorizontal,
  onTakeScreenshot,
  onToggleNavigator,
  onToggleKeyboardHelp,
  onToggleSearch,
  onToggleWorkbench,
  onToggleComposer,
  onToggleAnnotationTool,
  onAnnotationModeChange,
  onAnnotationUndo,
  onAnnotationClear,
  onToggleMetadata,
  onDownload,
  onToggleFullscreen,
  onToggleFilmstrip,
  cx,
  fieldMode,
  annotationDrawingMode,
}) => {
  const iconName = mediaType === 'video' ? 'movie' : mediaType === 'audio' ? 'audiotrack' : 'image';
  const isAV = mediaType === 'audio' || mediaType === 'video';

  return (
    <div className={`h-12 border-b border-l-4 border-l-mode-accent-border bg-mode-accent-bg-subtle transition-mode flex items-center justify-between px-3 shrink-0 z-20 viewer-chrome ${cx.border}`}>
      {/* Left: Title & Type */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink">
        <Icon name={iconName} className="text-mode-accent shrink-0 text-sm" />
        <h2 className={`text-sm font-medium truncate ${cx.text}`}>{label}</h2>
      </div>

      {/* Center: View Controls (images only) */}
      {mediaType === 'image' && (
        <div className="flex items-center gap-1">
          <ToolbarGroup fieldMode={fieldMode}>
            <ZoomControl
              zoom={zoomLevel / 100}
              onZoomChange={(z) => {
                const pct = Math.round(z * 100);
                if (pct > zoomLevel) onZoomIn();
                else if (pct < zoomLevel) onZoomOut();
              }}
              onReset={onResetView}
              disabled={!viewerReady}
              cx={cx}
            />
          </ToolbarGroup>

          <ToolbarDivider cx={cx} />

          <ToolbarGroup fieldMode={fieldMode}>
            {onRotateCCW && (
              <IconButton
                icon="rotate_left"
                ariaLabel="Rotate left"
                onClick={onRotateCCW}
                disabled={!viewerReady}
                variant="ghost"
                size="sm"
                cx={cx}
                fieldMode={fieldMode}
              />
            )}
            {rotation !== 0 && (
              <span className={`text-[10px] font-mono px-1 ${fieldMode ? 'text-nb-yellow' : 'text-nb-blue'}`}>
                {rotation}°
              </span>
            )}
            {onRotateCW && (
              <IconButton
                icon="rotate_right"
                ariaLabel="Rotate right"
                onClick={onRotateCW}
                disabled={!viewerReady}
                variant="ghost"
                size="sm"
                cx={cx}
                fieldMode={fieldMode}
              />
            )}
            {onFlipHorizontal && (
              <IconButton
                icon="flip"
                ariaLabel="Flip"
                onClick={onFlipHorizontal}
                disabled={!viewerReady}
                variant={isFlipped ? 'primary' : 'ghost'}
                size="sm"
                cx={cx}
                fieldMode={fieldMode}
              />
            )}
          </ToolbarGroup>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5">
        {/* Annotation Count Badge - always visible */}
        {annotationCount > 0 && (
          <div
            className={`px-2 py-1 text-[10px] font-bold flex items-center gap-1 mr-1 ${
              fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-green/20 text-nb-green'
            }`}
            title={`${annotationCount} annotation${annotationCount !== 1 ? 's' : ''}`}
          >
            <Icon name="sticky_note_2" className="text-xs" />
            {annotationCount}
          </div>
        )}

        {/* Annotate Button - works for all media types */}
        <button
          onClick={onToggleAnnotationTool}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 transition-nb ${
            showAnnotationTool
              ? fieldMode ? 'bg-nb-yellow text-black' : 'bg-nb-green text-white'
              : fieldMode ? 'bg-nb-yellow/20 text-nb-yellow hover:bg-nb-yellow/20' : 'bg-nb-black/80 text-nb-black/20 hover:bg-nb-black/60'
          }`}
        >
          <Icon name={isAV ? 'timer' : 'gesture'} className="text-base" />
          <span>Annotate</span>
        </button>

        {/* Drawing mode buttons - only for images when annotation active */}
        {showAnnotationTool && mediaType === 'image' && onAnnotationModeChange && (
          <>
            <ToolbarDivider cx={cx} />
            <ToolbarGroup fieldMode={fieldMode}>
              <IconButton
                icon="pentagon"
                ariaLabel="Polygon"
                onClick={() => onAnnotationModeChange('polygon')}
                variant={annotationDrawingMode === 'polygon' ? 'primary' : 'ghost'}
                size="sm"
                cx={cx}
                fieldMode={fieldMode}
              />
              <IconButton
                icon="crop_square"
                ariaLabel="Rectangle"
                onClick={() => onAnnotationModeChange('rectangle')}
                variant={annotationDrawingMode === 'rectangle' ? 'primary' : 'ghost'}
                size="sm"
                cx={cx}
                fieldMode={fieldMode}
              />
              <IconButton
                icon="draw"
                ariaLabel="Freehand"
                onClick={() => onAnnotationModeChange('freehand')}
                variant={annotationDrawingMode === 'freehand' ? 'primary' : 'ghost'}
                size="sm"
                cx={cx}
                fieldMode={fieldMode}
              />
            </ToolbarGroup>
            <ToolbarGroup fieldMode={fieldMode}>
              {onAnnotationUndo && (
                <IconButton icon="undo" ariaLabel="Undo" onClick={onAnnotationUndo} variant="ghost" size="sm" cx={cx} fieldMode={fieldMode} />
              )}
              {onAnnotationClear && (
                <IconButton icon="delete_outline" ariaLabel="Clear" onClick={onAnnotationClear} variant="ghost" size="sm" cx={cx} fieldMode={fieldMode} />
              )}
            </ToolbarGroup>
          </>
        )}

        <ToolbarDivider cx={cx} />

        {/* Secondary actions - collapsed into fewer buttons */}
        {hasSearchService && (
          <IconButton icon="search" ariaLabel="Search" onClick={onToggleSearch} variant={showSearchPanel ? 'primary' : 'ghost'} size="sm" cx={cx} fieldMode={fieldMode} />
        )}

        {mediaType === 'image' && onToggleNavigator && (
          <IconButton icon="picture_in_picture" ariaLabel="Navigator" onClick={onToggleNavigator} variant={showNavigator ? 'primary' : 'ghost'} size="sm" cx={cx} fieldMode={fieldMode} />
        )}

        <IconButton icon={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} ariaLabel="Fullscreen" onClick={onToggleFullscreen} variant="ghost" size="sm" cx={cx} fieldMode={fieldMode} />

        {hasMultipleCanvases && (
          <IconButton icon="view_carousel" ariaLabel="Filmstrip" onClick={onToggleFilmstrip} variant={showFilmstrip ? 'primary' : 'ghost'} size="sm" cx={cx} fieldMode={fieldMode} />
        )}
      </div>
    </div>
  );
};

export default ViewerToolbar;
