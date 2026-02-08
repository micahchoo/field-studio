/**
 * AnnotationOverlay Molecule (Deprecated)
 *
 * Annotation display is now handled by Annotorious via useAnnotorious hook.
 * This file retains the type export for backwards compatibility.
 *
 * @deprecated Use Annotorious integration via AnnotationDrawingOverlay instead
 * @module features/viewer/ui/molecules/AnnotationOverlay
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

/** @deprecated Imported from @/src/shared/types instead */
export interface IIIFAnnotation {
  id: string;
  type: 'Annotation';
  motivation?: string;
  body?: {
    type: string;
    value?: string;
    format?: string;
  } | Array<{
    type: string;
    value?: string;
    format?: string;
  }>;
  target?: string | {
    id?: string;
    selector?: {
      type: string;
      value?: string;
      region?: string;
    };
  };
}

export interface AnnotationOverlayProps {
  annotations: IIIFAnnotation[];
  canvasWidth: number;
  canvasHeight: number;
  selectedId?: string | null;
  onAnnotationClick?: (annotation: IIIFAnnotation) => void;
  visible?: boolean;
  viewerRef?: React.MutableRefObject<any>;
  cx?: ContextualClassNames;
  fieldMode?: boolean;
}

/**
 * @deprecated Annotation display is now handled by Annotorious.
 * This component is a no-op retained for type compatibility.
 */
export const AnnotationOverlay: React.FC<AnnotationOverlayProps> = () => null;

export default AnnotationOverlay;
