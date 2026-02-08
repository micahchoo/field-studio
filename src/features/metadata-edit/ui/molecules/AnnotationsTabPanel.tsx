/**
 * AnnotationsTabPanel Molecule
 *
 * Panel for displaying and managing IIIF annotations.
 * Uses shared ListContainer molecule with AnnotationItem atoms.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Manages annotation list state (passed via props)
 * - No domain logic (delegates to parent callbacks)
 * - Props-only API
 * - Uses shared ListContainer and feature-specific atoms
 *
 * @module features/metadata-edit/ui/molecules/AnnotationsTabPanel
 */

import React from 'react';
import { ListContainer } from '@/src/shared/ui/molecules/ListContainer';
import { AnnotationItem } from '../atoms/AnnotationItem';
import type { IIIFAnnotation } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface AnnotationsTabPanelProps {
  /** List of annotations to display */
  annotations: IIIFAnnotation[];
  /** Current language for labels */
  language: string;
  /** ID of currently selected annotation (if any) */
  selectedAnnotationId?: string;
  /** Contextual styles from parent */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
  /** Called when an annotation is clicked */
  onSelectAnnotation?: (annotation: IIIFAnnotation) => void;
  /** Called when delete button is clicked on an annotation */
  onDeleteAnnotation?: (annotation: IIIFAnnotation) => void;
  /** Called when an annotation's text is edited */
  onEditAnnotation?: (annotation: IIIFAnnotation, newText: string) => void;
  /** Called when "Add Annotation" button is clicked */
  onAddAnnotation?: () => void;
}

export const AnnotationsTabPanel: React.FC<AnnotationsTabPanelProps> = ({
  annotations,
  language,
  selectedAnnotationId,
  cx,
  fieldMode,
  onSelectAnnotation,
  onDeleteAnnotation,
  onEditAnnotation,
  onAddAnnotation,
}) => {
  return (
    <ListContainer
      title="Annotations"
      count={annotations.length}
      emptyIcon="comments_disabled"
      emptyMessage="No annotations yet."
      emptyActionLabel={onAddAnnotation ? "Add Annotation" : undefined}
      onEmptyAction={onAddAnnotation}
      headerActionLabel={onAddAnnotation ? "Add" : undefined}
      onHeaderAction={onAddAnnotation}
      fieldMode={fieldMode}
      itemSpacing="space-y-2"
    >
      {annotations.map((annotation) => (
        <AnnotationItem
          key={annotation.id}
          annotation={annotation}
          language={language}
          selected={selectedAnnotationId === annotation.id}
          onClick={() => onSelectAnnotation?.(annotation)}
          onDelete={onDeleteAnnotation ? () => onDeleteAnnotation(annotation) : undefined}
          onEdit={onEditAnnotation ? (text) => onEditAnnotation(annotation, text) : undefined}
          expanded={selectedAnnotationId === annotation.id}
          cx={cx}
          fieldMode={fieldMode}
        />
      ))}
    </ListContainer>
  );
};

export default AnnotationsTabPanel;
