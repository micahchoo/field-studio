/**
 * AnnotationItem Atom
 *
 * Single annotation list item display.
 * Thin wrapper around shared ListItemBase molecule.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses shared ListItemBase
 *
 * @module features/metadata-edit/ui/atoms/AnnotationItem
 */

import React from 'react';
import { ListItemBase } from '@/src/shared/ui/molecules';
import { getIIIFValue, type IIIFAnnotation } from '@/types';

// Reuse the ContextualStyles interface from MetadataEditorPanel
export interface ContextualStyles {
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
}

export interface AnnotationItemProps {
  /** Annotation data */
  annotation: IIIFAnnotation;
  /** Current language for labels */
  language: string;
  /** Whether the item is selected */
  selected?: boolean;
  /** Called when item is clicked */
  onClick?: () => void;
  /** Called when delete button is clicked */
  onDelete?: () => void;
  /** Contextual styles from parent */
  cx: ContextualStyles;
  /** Field mode flag */
  fieldMode: boolean;
  /** Additional CSS class */
  className?: string;
}

export const AnnotationItem: React.FC<AnnotationItemProps> = ({
  annotation,
  language,
  selected = false,
  onClick,
  onDelete,
  cx,
  fieldMode = false,
  className = '',
}) => {
  const label = getIIIFValue(annotation.label, language) || 'Annotation';
  const motivation = Array.isArray(annotation.motivation)
    ? annotation.motivation.join(', ')
    : annotation.motivation;

  const getMotivationColor = () => {
    if (motivation.includes('painting')) return 'bg-blue-100 text-blue-800';
    if (motivation.includes('supplementing')) return 'bg-green-100 text-green-800';
    if (motivation.includes('commenting')) return 'bg-amber-100 text-amber-800';
    if (motivation.includes('tagging')) return 'bg-purple-100 text-purple-800';
    return fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600';
  };

  return (
    <ListItemBase
      selected={selected}
      onClick={onClick}
      showDelete={!!onDelete}
      onDelete={onDelete}
      fieldMode={fieldMode}
      className={className}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold truncate ${fieldMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {label}
        </span>
        <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${getMotivationColor()}`}>
          {motivation}
        </span>
      </div>
      <p className={`text-[10px] truncate ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>
        {annotation.id}
      </p>
    </ListItemBase>
  );
};

export default AnnotationItem;
