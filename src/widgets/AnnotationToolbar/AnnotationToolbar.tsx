/**
 * AnnotationToolbar Widget
 *
 * Composes: AnnotationToolPanel (from viewer) + MetadataEditorPanel (from metadata-edit)
 *
 * This widget combines annotation controls with metadata editing capabilities
 * for a unified annotation editing experience.
 *
 * WIDGET COMPOSITION RULES:
 * - Pure composition only - no business logic
 * - Imports organisms from features (viewer, metadata-edit)
 * - Receives cx and fieldMode via props from template
 * - Exists strictly between Organisms and Pages
 */

import React from 'react';
import type { IIIFAnnotation, IIIFCanvas, IIIFItem } from '@/src/shared/types';
import { AnnotationToolPanel } from '@/src/features/viewer/ui/organisms/AnnotationToolPanel';
import { MetadataEditorPanel } from '@/src/features/metadata-edit/ui/organisms/MetadataEditorPanel';

export interface AnnotationToolbarProps {
  /** Canvas to annotate */
  canvas: IIIFCanvas;
  /** Image URL for the canvas */
  imageUrl: string;
  /** Existing annotations */
  existingAnnotations?: IIIFAnnotation[];
  /** Callback when annotation is created */
  onCreateAnnotation: (annotation: IIIFAnnotation) => void;
  /** Callback when panel closes */
  onClose: () => void;
  /** Resource for metadata editing */
  resource: IIIFItem | null;
  /** Called when resource is updated */
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  /** Current language for metadata values */
  language: string;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    textMuted: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    input: string;
    label: string;
    active: string;
    inactive?: string;
    warningBg?: string;
    pageBg?: string;
  };
  /** Current field mode */
  fieldMode: boolean;
  /** Terminology function from template */
  t: (key: string) => string;
}

/**
 * AnnotationToolbar Widget
 *
 * Composes annotation tools with metadata editing for a complete
 * annotation workflow. This widget sits between organisms and pages,
 * combining viewer and metadata-edit features.
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode, t }) => (
 *     <AnnotationToolbar
 *       canvas={selectedCanvas}
 *       imageUrl={imageUrl}
 *       existingAnnotations={annotations}
 *       onCreateAnnotation={handleCreate}
 *       onClose={handleClose}
 *       resource={selectedItem}
 *       onUpdateResource={handleUpdate}
 *       language={language}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *       t={t}
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  canvas,
  imageUrl,
  existingAnnotations = [],
  onCreateAnnotation,
  onClose,
  resource,
  onUpdateResource,
  language,
  cx,
  fieldMode,
  t: _t,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Annotation Tool Panel from viewer feature */}
      <div className="flex-1 min-h-0">
        <AnnotationToolPanel
          canvas={canvas}
          imageUrl={imageUrl}
          existingAnnotations={existingAnnotations}
          onCreateAnnotation={onCreateAnnotation}
          onClose={onClose}
          cx={{
            text: cx.text,
            textMuted: cx.textMuted,
            active: cx.active,
            surface: cx.surface,
          }}
        />
      </div>

      {/* Metadata Editor Panel from metadata-edit feature */}
      {resource && (
        <div className="border-t border-nb-black/20 max-h-80 overflow-auto">
          <MetadataEditorPanel
            resource={resource}
            onUpdateResource={onUpdateResource}
            language={language}
            cx={{
              surface: cx.surface,
              text: cx.text,
              accent: cx.accent,
              border: cx.border,
              divider: cx.divider,
              headerBg: cx.headerBg,
              textMuted: cx.textMuted,
              input: cx.input,
              label: cx.label,
              active: cx.active,
            }}
            fieldMode={fieldMode}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
};

export default AnnotationToolbar;
