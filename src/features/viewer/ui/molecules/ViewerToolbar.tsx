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
import {
  ViewHeader,
  ViewHeaderTitle,
  ViewHeaderCenter,
  ViewHeaderActions,
  ViewHeaderDivider,
} from '@/src/shared/ui/molecules/ViewHeader';
import { ZoomControl, ScreenshotMenu, AnnotationColorPicker, StrokeWidthSelect } from '@/src/features/viewer/ui/atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { ScreenshotFormat } from '../../model';
import type { AnnotationStyleOptions } from '../../model/useAnnotorious';

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
  /** Screenshot handler (format, action) */
  onTakeScreenshot?: (format: ScreenshotFormat, action: 'download' | 'clipboard') => void;
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
  /** Redo annotation drawing */
  onAnnotationRedo?: () => void;
  /** Clear annotation drawing */
  onAnnotationClear?: () => void;
  /** Current annotation style */
  annotationStyle?: AnnotationStyleOptions;
  /** Change annotation style */
  onAnnotationStyleChange?: (style: AnnotationStyleOptions) => void;
  /** Metadata panel toggle */
  onToggleMetadata: () => void;
  /** Download handler */
  onDownload?: () => void;
  /** Fullscreen toggle */
  onToggleFullscreen: () => void;
  /** Filmstrip toggle */
  onToggleFilmstrip: () => void;
  /** Whether filter panel is open */
  showFilterPanel?: boolean;
  /** Whether any filters are active */
  filtersActive?: boolean;
  /** Filter panel toggle */
  onToggleFilterPanel?: () => void;
  /** Whether measurement mode is active */
  showMeasurement?: boolean;
  /** Measurement toggle */
  onToggleMeasurement?: () => void;
  /** Whether comparison mode is active */
  showComparison?: boolean;
  /** Comparison toggle */
  onToggleComparison?: () => void;
  /** Whether layers panel is open */
  showLayers?: boolean;
  /** Layers panel toggle */
  onToggleLayers?: () => void;
  /** Number of annotation layers */
  layerCount?: number;
  /** Share link handler */
  onShareLink?: () => void;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
}

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
  onAnnotationRedo,
  onAnnotationClear,
  onToggleMetadata,
  onDownload,
  onToggleFullscreen,
  onToggleFilmstrip,
  cx,
  fieldMode,
  annotationDrawingMode,
  annotationStyle,
  onAnnotationStyleChange,
  showFilterPanel,
  filtersActive,
  onToggleFilterPanel,
  showMeasurement,
  onToggleMeasurement,
  showComparison,
  onToggleComparison,
  showLayers,
  onToggleLayers,
  layerCount,
  onShareLink,
}) => {
  const iconName = mediaType === 'video' ? 'movie' : mediaType === 'audio' ? 'audiotrack' : 'image';
  const isAV = mediaType === 'audio' || mediaType === 'video';

  return (
    <ViewHeader cx={cx} fieldMode={fieldMode} height="compact" shadow={false} zIndex="z-20" className="viewer-chrome">
      {/* Left: Title & Type */}
      <ViewHeaderTitle icon={iconName} title={label} />

      {/* Center: View Controls (images only) */}
      {mediaType === 'image' && (
        <ViewHeaderCenter>
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
                title="Rotate counter-clockwise (Shift+R)"
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
                title="Rotate clockwise (R)"
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
                title="Flip horizontally (F)"
                onClick={onFlipHorizontal}
                disabled={!viewerReady}
                variant={isFlipped ? 'primary' : 'ghost'}
                size="sm"
                cx={cx}
                fieldMode={fieldMode}
              />
            )}
          </ToolbarGroup>
        </ViewHeaderCenter>
      )}

      {/* Right: Actions */}
      <ViewHeaderActions>
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

          {/* Layers toggle - shown when annotation layers exist */}
          {layerCount != null && layerCount > 0 && onToggleLayers && (
            <IconButton
              icon="layers"
              ariaLabel="Annotation layers"
              title={`Annotation layers (${layerCount})`}
              onClick={onToggleLayers}
              variant={showLayers ? 'primary' : 'ghost'}
              size="sm"
              cx={cx}
              fieldMode={fieldMode}
            />
          )}

          {/* Annotate Button - works for all media types */}
          <button
            onClick={onToggleAnnotationTool}
            title="Toggle annotation tool (A)"
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
              {/* Color and stroke controls */}
              {onAnnotationStyleChange && annotationStyle && (
                <>
                  <ToolbarDivider cx={cx} />
                  <AnnotationColorPicker
                    value={annotationStyle.color || '#22c55e'}
                    onChange={(color) => onAnnotationStyleChange({ ...annotationStyle, color })}
                    fieldMode={fieldMode}
                  />
                  <StrokeWidthSelect
                    value={annotationStyle.strokeWidth ?? 2}
                    onChange={(strokeWidth) => onAnnotationStyleChange({ ...annotationStyle, strokeWidth })}
                    color={annotationStyle.color || '#22c55e'}
                    fieldMode={fieldMode}
                  />
                </>
              )}
              <ToolbarGroup fieldMode={fieldMode}>
                {onAnnotationUndo && (
                  <IconButton icon="undo" ariaLabel="Undo" title="Undo (Ctrl+Z)" onClick={onAnnotationUndo} variant="ghost" size="sm" cx={cx} fieldMode={fieldMode} />
                )}
                {onAnnotationRedo && (
                  <IconButton icon="redo" ariaLabel="Redo" title="Redo (Ctrl+Shift+Z)" onClick={onAnnotationRedo} variant="ghost" size="sm" cx={cx} fieldMode={fieldMode} />
                )}
                {onAnnotationClear && (
                  <IconButton icon="delete_outline" ariaLabel="Clear" onClick={onAnnotationClear} variant="ghost" size="sm" cx={cx} fieldMode={fieldMode} />
                )}
              </ToolbarGroup>
            </>
          )}

          {/* Filter toggle - images only */}
          {mediaType === 'image' && onToggleFilterPanel && (
            <IconButton
              icon="tune"
              ariaLabel="Image filters"
              title="Image filters (brightness, contrast)"
              onClick={onToggleFilterPanel}
              variant={showFilterPanel || filtersActive ? 'primary' : 'ghost'}
              size="sm"
              cx={cx}
              fieldMode={fieldMode}
            />
          )}

          {/* Measurement toggle - images only */}
          {mediaType === 'image' && onToggleMeasurement && (
            <IconButton
              icon="straighten"
              ariaLabel="Measure"
              title="Measurement tool (M)"
              onClick={onToggleMeasurement}
              variant={showMeasurement ? 'primary' : 'ghost'}
              size="sm"
              cx={cx}
              fieldMode={fieldMode}
            />
          )}

          {/* Comparison toggle - images only, requires multiple canvases */}
          {mediaType === 'image' && hasMultipleCanvases && onToggleComparison && (
            <IconButton
              icon="compare"
              ariaLabel="Compare"
              title="Compare canvases"
              onClick={onToggleComparison}
              variant={showComparison ? 'primary' : 'ghost'}
              size="sm"
              cx={cx}
              fieldMode={fieldMode}
            />
          )}

          {/* Screenshot menu - images only */}
          {mediaType === 'image' && onTakeScreenshot && (
            <>
              <ToolbarDivider cx={cx} />
              <ScreenshotMenu
                onScreenshot={onTakeScreenshot}
                disabled={!viewerReady}
                fieldMode={fieldMode}
              />
            </>
          )}

          <ToolbarDivider cx={cx} />

          {/* Secondary actions - collapsed into fewer buttons */}
          {hasSearchService && (
            <IconButton icon="search" ariaLabel="Search" onClick={onToggleSearch} variant={showSearchPanel ? 'primary' : 'ghost'} size="sm" cx={cx} fieldMode={fieldMode} />
          )}

          {mediaType === 'image' && onToggleNavigator && (
            <IconButton icon="picture_in_picture" ariaLabel="Navigator" title="Toggle navigator (N)" onClick={onToggleNavigator} variant={showNavigator ? 'primary' : 'ghost'} size="sm" cx={cx} fieldMode={fieldMode} />
          )}

          {onShareLink && (
            <IconButton icon="share" ariaLabel="Share link" title="Copy shareable link" onClick={onShareLink} variant="ghost" size="sm" cx={cx} fieldMode={fieldMode} />
          )}

          <IconButton icon={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} ariaLabel="Fullscreen" title="Toggle fullscreen (Esc to exit)" onClick={onToggleFullscreen} variant="ghost" size="sm" cx={cx} fieldMode={fieldMode} />

          {hasMultipleCanvases && (
            <IconButton icon="view_carousel" ariaLabel="Filmstrip" onClick={onToggleFilmstrip} variant={showFilmstrip ? 'primary' : 'ghost'} size="sm" cx={cx} fieldMode={fieldMode} />
          )}
        </div>
      </ViewHeaderActions>
    </ViewHeader>
  );
};

export default ViewerToolbar;
