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
import { AnnotationOverlay, type IIIFAnnotation } from './AnnotationOverlay';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import type { IIIFCanvas } from '@/types';

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
  cx,
  fieldMode,
}) => {
  // Image content with OpenSeadragon
  if (mediaType === 'image' && resolvedUrl) {
    return (
      <div className="flex-1 relative bg-black overflow-hidden flex">
        <div
          ref={osdContainerRef}
          className="flex-1 w-full h-full"
          style={{ background: '#000' }}
        />
        {/* Annotation Overlay */}
        {annotations.length > 0 && (
          <AnnotationOverlay
            annotations={annotations}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            selectedId={selectedAnnotationId}
            onAnnotationClick={onAnnotationClick}
            fieldMode={fieldMode}
          />
        )}
      </div>
    );
  }

  // Video content
  if (mediaType === 'video' && resolvedUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <MediaPlayer
          canvas={canvas}
          src={resolvedUrl}
          mediaType="video"
          cx={cx}
          fieldMode={fieldMode}
        />
      </div>
    );
  }

  // Audio content
  if (mediaType === 'audio' && resolvedUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <MediaPlayer
          canvas={canvas}
          src={resolvedUrl}
          mediaType="audio"
          cx={cx}
          fieldMode={fieldMode}
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
