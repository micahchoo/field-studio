/**
 * AnnotationsTabPanel Molecule
 *
 * Panel for displaying and managing IIIF annotations.
 * Uses shared ListContainer molecule with AnnotationItem atoms.
 * Supports sorting by order/motivation/type and bulk delete.
 *
 * @module features/metadata-edit/ui/molecules/AnnotationsTabPanel
 */

import React, { useMemo, useState } from 'react';
import { ListContainer } from '@/src/shared/ui/molecules/ListContainer';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { AnnotationItem } from '../atoms/AnnotationItem';
import type { IIIFAnnotation } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

type SortMode = 'default' | 'motivation' | 'type';

/** Detect if annotation has a time-based FragmentSelector (t=...) */
function hasTimeSelector(annotation: IIIFAnnotation): boolean {
  const target = annotation.target as unknown;
  if (typeof target === 'string') return target.includes('#t=');
  if (target && typeof target === 'object') {
    const t = target as Record<string, unknown>;
    if (typeof t.source === 'string' && t.source.includes('#t=')) return true;
    const selector = t.selector as Record<string, unknown> | undefined;
    if (selector?.type === 'FragmentSelector' && typeof selector.value === 'string' && selector.value.startsWith('t=')) return true;
  }
  return false;
}

function getMotivation(annotation: IIIFAnnotation): string {
  if (Array.isArray(annotation.motivation)) return annotation.motivation[0] || '';
  return annotation.motivation || 'commenting';
}

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
  /** Called when bulk delete is requested with annotation IDs */
  onBulkDeleteAnnotations?: (ids: string[]) => void;
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
  onBulkDeleteAnnotations,
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sortedAnnotations = useMemo(() => {
    if (sortMode === 'default') return annotations;
    const sorted = [...annotations];
    if (sortMode === 'motivation') {
      sorted.sort((a, b) => getMotivation(a).localeCompare(getMotivation(b)));
    } else if (sortMode === 'type') {
      // Time-based first, then spatial
      sorted.sort((a, b) => {
        const aTime = hasTimeSelector(a) ? 0 : 1;
        const bTime = hasTimeSelector(b) ? 0 : 1;
        return aTime - bTime;
      });
    }
    return sorted;
  }, [annotations, sortMode]);

  const handleToggleCheck = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === annotations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(annotations.map(a => a.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (onBulkDeleteAnnotations) {
      onBulkDeleteAnnotations(Array.from(selectedIds));
    } else if (onDeleteAnnotation) {
      // Fallback: delete one by one
      for (const anno of annotations) {
        if (selectedIds.has(anno.id)) onDeleteAnnotation(anno);
      }
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const sortPills: { mode: SortMode; label: string }[] = [
    { mode: 'default', label: 'Order' },
    { mode: 'motivation', label: 'Purpose' },
    { mode: 'type', label: 'Type' },
  ];

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
      {/* Sort & Select Controls */}
      {annotations.length > 1 && (
        <div className="flex items-center justify-between mb-2">
          {/* Sort pills */}
          <div className="flex gap-1">
            {sortPills.map(pill => (
              <Button variant="ghost" size="bare"
                key={pill.mode}
                onClick={() => setSortMode(pill.mode)}
                className={`px-2 py-0.5 text-[9px] font-bold uppercase border ${
                  sortMode === pill.mode
                    ? (fieldMode ? 'border-nb-yellow bg-nb-yellow/20 text-nb-yellow' : 'border-nb-blue bg-nb-blue/10 text-nb-blue')
                    : (fieldMode ? 'border-nb-black/50 text-nb-yellow/40' : 'border-nb-black/20 text-nb-black/50')
                }`}
              >
                {pill.label}
              </Button>
            ))}
          </div>
          {/* Select toggle */}
          {(onDeleteAnnotation || onBulkDeleteAnnotations) && (
            <Button variant="ghost" size="bare"
              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
              className={`px-2 py-0.5 text-[9px] font-bold uppercase ${
                selectMode
                  ? (fieldMode ? 'text-nb-yellow' : 'text-nb-blue')
                  : (fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/50')
              }`}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </Button>
          )}
        </div>
      )}

      {/* Bulk delete bar */}
      {selectMode && (
        <div className={`flex items-center justify-between p-2 mb-2 border ${
          fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-cream border-nb-black/20'
        }`}>
          <Button variant="ghost" size="bare"
            onClick={handleSelectAll}
            className={`text-[9px] font-bold uppercase ${fieldMode ? 'text-nb-yellow' : 'text-nb-blue'}`}
          >
            {selectedIds.size === annotations.length ? 'Deselect All' : 'Select All'}
          </Button>
          <Button variant="ghost" size="bare"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className={`text-[9px] font-bold uppercase px-2 py-0.5 disabled:opacity-40 ${
              fieldMode ? 'bg-nb-red/20 text-nb-red' : 'bg-nb-red/10 text-nb-red'
            }`}
          >
            <Icon name="delete" className="text-[10px] mr-0.5 inline" />
            Delete Selected ({selectedIds.size})
          </Button>
        </div>
      )}

      {sortedAnnotations.map((annotation) => (
        <AnnotationItem
          key={annotation.id}
          annotation={annotation}
          language={language}
          selected={selectedAnnotationId === annotation.id}
          onClick={() => onSelectAnnotation?.(annotation)}
          onDelete={onDeleteAnnotation && !selectMode ? () => onDeleteAnnotation(annotation) : undefined}
          onEdit={onEditAnnotation ? (text) => onEditAnnotation(annotation, text) : undefined}
          expanded={selectedAnnotationId === annotation.id && !selectMode}
          cx={cx}
          fieldMode={fieldMode}
          showCheckbox={selectMode}
          checked={selectedIds.has(annotation.id)}
          onCheckChange={(checked) => handleToggleCheck(annotation.id, checked)}
        />
      ))}
    </ListContainer>
  );
};

export default AnnotationsTabPanel;
