/**
 * ViewerToolbar Molecule
 *
 * Composes: IconButton + ZoomControl + Icon atoms
 *
 * Toolbar for IIIF viewer with zoom controls, annotation badges,
 * search, workbench, composer, and fullscreen toggles.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Composes molecules: IconButton, ZoomControl
 * - Composes atoms: Icon
 * - Local UI state only
 * - No domain logic - all actions passed as callbacks
 *
 * IDEAL OUTCOME: Consistent viewer toolbar across all viewer modes
 * FAILURE PREVENTED: Missing controls, inconsistent button states
 *
 * @module features/viewer/ui/molecules/ViewerToolbar
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules';
import { ZoomControl } from '@/src/features/viewer/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface ViewerToolbarProps {
  /** Canvas label/title to display */
  label: string;
  /** Media type for icon display */
  mediaType: 'image' | 'video' | 'audio' | 'other';
  /** Current zoom level (percentage) */
  zoomLevel: number;
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
  /** Search panel toggle */
  onToggleSearch: () => void;
  /** Workbench toggle */
  onToggleWorkbench: () => void;
  /** Composer toggle */
  onToggleComposer: () => void;
  /** Annotation tool toggle */
  onToggleAnnotationTool: () => void;
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
  onToggleSearch,
  onToggleWorkbench,
  onToggleComposer,
  onToggleAnnotationTool,
  onToggleMetadata,
  onDownload,
  onToggleFullscreen,
  onToggleFilmstrip,
  cx,
  fieldMode,
}) => {
  const iconName = mediaType === 'video' ? 'movie' : mediaType === 'audio' ? 'audiotrack' : 'image';

  return (
    <div
      className={`h-14 border-b flex items-center justify-between px-4 shrink-0 z-20 ${
        fieldMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-800 border-slate-700'
      }`}
    >
      {/* Left: Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Icon name={iconName} className="text-blue-400 shrink-0" />
        <h2 className={`font-bold truncate ${fieldMode ? 'text-white' : 'text-slate-100'}`}>
          {label}
        </h2>
      </div>

      {/* Right: Toolbar Actions */}
      <div className="flex items-center gap-1">
        {mediaType === 'image' && (
          <>
            {/* Zoom Controls */}
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

            {/* Annotation Badge */}
            <div
              className={`p-2 rounded-lg hover:bg-slate-800 relative cursor-pointer ${
                annotationCount > 0 ? 'text-green-400' : 'text-slate-400'
              } hover:text-white`}
              title={`${annotationCount} Annotation${annotationCount !== 1 ? 's' : ''}`}
            >
              <Icon name="sticky_note_2" />
              {annotationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {annotationCount}
                </span>
              )}
            </div>
          </>
        )}

        {/* Search Button */}
        {hasSearchService && (
          <IconButton
            icon="search"
            ariaLabel="Search in Manifest"
            onClick={onToggleSearch}
            variant={showSearchPanel ? 'primary' : 'ghost'}
            cx={cx}
            fieldMode={fieldMode}
          />
        )}

        {/* Image Workbench Button */}
        {mediaType === 'image' && (
          <IconButton
            icon="tune"
            ariaLabel="Image Request Workbench"
            onClick={onToggleWorkbench}
            variant={showWorkbench ? 'primary' : 'ghost'}
            cx={cx}
            fieldMode={fieldMode}
          />
        )}

        {/* Canvas Composer Button */}
        <IconButton
          icon="auto_awesome_motion"
          ariaLabel="Canvas Composer"
          onClick={onToggleComposer}
          variant={showComposer ? 'primary' : 'ghost'}
          cx={cx}
          fieldMode={fieldMode}
        />

        {/* Annotation Tool Button */}
        {mediaType === 'image' && (
          <IconButton
            icon="gesture"
            ariaLabel="Annotation Tool"
            onClick={onToggleAnnotationTool}
            variant={showAnnotationTool ? 'primary' : 'ghost'}
            cx={cx}
            fieldMode={fieldMode}
          />
        )}

        {/* Metadata Toggle */}
        <IconButton
          icon="info"
          ariaLabel="Canvas Metadata"
          onClick={onToggleMetadata}
          variant="ghost"
          cx={cx}
          fieldMode={fieldMode}
        />

        {/* Download */}
        {canDownload && (
          <IconButton
            icon="download"
            ariaLabel="Download Image"
            onClick={onDownload || (() => {})}
            disabled={!onDownload}
            variant="ghost"
            cx={cx}
            fieldMode={fieldMode}
          />
        )}

        {/* Fullscreen */}
        <IconButton
          icon={isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          ariaLabel="Toggle Fullscreen"
          onClick={onToggleFullscreen}
          variant="ghost"
          cx={cx}
          fieldMode={fieldMode}
        />

        {/* Filmstrip Toggle */}
        {hasMultipleCanvases && (
          <IconButton
            icon="view_carousel"
            ariaLabel="Toggle Canvas Navigator"
            onClick={onToggleFilmstrip}
            variant={showFilmstrip ? 'primary' : 'ghost'}
            cx={cx}
            fieldMode={fieldMode}
          />
        )}
      </div>
    </div>
  );
};

export default ViewerToolbar;
