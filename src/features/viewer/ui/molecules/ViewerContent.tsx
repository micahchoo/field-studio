/**
 * ViewerContent Molecule
 *
 * Composes: MediaPlayer + EmptyState + OSD Container
 *
 * Main content area for the viewer displaying images, video, or audio.
 * Handles OpenSeadragon integration for images and MediaPlayer for AV.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Composes molecules: MediaPlayer, EmptyState
 * - Local UI state only
 * - No domain logic
 *
 * IDEAL OUTCOME: Seamless content display for all media types
 * FAILURE PREVENTED: Media loading errors, unsupported format confusion
 *
 * @module features/viewer/ui/molecules/ViewerContent
 */

import React from 'react';
import { EmptyState } from '@/src/shared/ui/molecules';
import { MediaPlayer } from './MediaPlayer';
import { AnnotationOverlay } from './AnnotationOverlay';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';

export interface ViewerContentProps {
  /** Canvas to display */
  canvas: IIIFCanvas;
  /** Media type detection */
  mediaType: 'image' | 'video' | 'audio' | 'other';
  /** Resolved image/media URL */
  resolvedUrl: string | null;
  /** Ref for OSD container */
  osdContainerRef?: React.RefObject<HTMLDivElement>;
  /** Annotations for overlay */
  annotations?: IIIFAnnotation[];
  /** Selected annotation ID */
  selectedAnnotationId?: string | null;
  /** Canvas dimensions for annotation overlay */
  canvasWidth?: number;
  /** Canvas height for annotation overlay */
  canvasHeight?: number;
  /** Called when annotation is clicked */
  onAnnotationClick?: (annotation: IIIFAnnotation) => void;
  /** Called when a new annotation is created */
  onCreateAnnotation?: (annotation: IIIFAnnotation) => void;
  /** Whether annotation mode is active (for AV content) */
  annotationModeActive?: boolean;
  /** Toggle annotation mode (for AV content) */
  onAnnotationModeToggle?: (active: boolean) => void;
  /** Current time range selection for time-based annotations */
  timeRange?: { start: number; end?: number } | null;
  /** Callback when time range changes */
  onTimeRangeChange?: (range: { start: number; end?: number } | null) => void;
  /** Callback to report current playback time */
  onPlaybackTimeUpdate?: (time: number) => void;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
}

/**
 * ViewerContent Molecule
 *
 * @example
 * <ViewerContent
 *   canvas={canvas}
 *   mediaType="image"
 *   resolvedUrl={imageUrl}
 *   osdContainerRef={osdRef}
 *   annotations={annotations}
 *   cx={cx}
 *   fieldMode={fieldMode}
 * />
 */
export const ViewerContent: React.FC<ViewerContentProps> = ({
  canvas,
  mediaType,
  resolvedUrl,
  osdContainerRef,
  annotations = [],
  selectedAnnotationId,
  canvasWidth = 1000,
  canvasHeight = 1500,
  onAnnotationClick,
  onCreateAnnotation,
  annotationModeActive,
  onAnnotationModeToggle,
  timeRange,
  onTimeRangeChange,
  onPlaybackTimeUpdate,
  cx,
  fieldMode,
}) => {
  // Image content with OpenSeadragon
  if (mediaType === 'image' && resolvedUrl) {
    const bgClass = fieldMode ? 'bg-black' : 'bg-slate-100 dark:bg-slate-900';
    return (
      <div className={`flex-1 relative overflow-hidden flex ${bgClass}`} style={{ height: '100%' }}>
        <div
          ref={osdContainerRef}
          className="absolute inset-0 w-full h-full"
          style={{ background: fieldMode ? '#000' : undefined }}
        />
        {/* Annotation Overlay */}
        {annotations.length > 0 && (
          <AnnotationOverlay
            annotations={annotations as any}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            selectedId={selectedAnnotationId}
            onAnnotationClick={onAnnotationClick as any}
            fieldMode={fieldMode}
          />
        )}
      </div>
    );
  }

  // Video content - fills entire container like OSD
  if (mediaType === 'video' && resolvedUrl) {
    return (
      <div className="flex-1 relative overflow-hidden" style={{ height: '100%' }}>
        <MediaPlayer
          canvas={canvas}
          src={resolvedUrl}
          mediaType="video"
          annotations={annotations as any}
          annotationModeActive={annotationModeActive}
          onAnnotationModeToggle={onAnnotationModeToggle}
          timeRange={timeRange}
          onTimeRangeChange={onTimeRangeChange}
          onTimeUpdate={onPlaybackTimeUpdate}
          cx={cx}
          fieldMode={fieldMode}
          className="absolute inset-0"
        />
      </div>
    );
  }

  // Audio content - fills entire container like OSD
  if (mediaType === 'audio' && resolvedUrl) {
    return (
      <div className="flex-1 relative overflow-hidden" style={{ height: '100%' }}>
        <MediaPlayer
          canvas={canvas}
          src={resolvedUrl}
          mediaType="audio"
          annotations={annotations as any}
          annotationModeActive={annotationModeActive}
          onAnnotationModeToggle={onAnnotationModeToggle}
          timeRange={timeRange}
          onTimeRangeChange={onTimeRangeChange}
          onTimeUpdate={onPlaybackTimeUpdate}
          cx={cx}
          fieldMode={fieldMode}
          className="absolute inset-0"
        />
      </div>
    );
  }

  // Unsupported or no content
  return (
    <div className="flex-1 flex items-center justify-center text-slate-500">
      <EmptyState
        icon="broken_image"
        title="Unsupported Media"
        message="This canvas type cannot be displayed in the viewer."
        cx={cx}
        fieldMode={fieldMode}
      />
    </div>
  );
};

export default ViewerContent;
