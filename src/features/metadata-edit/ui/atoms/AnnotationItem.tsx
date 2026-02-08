/**
 * AnnotationItem Atom
 *
 * Single annotation list item display with optional inline edit.
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

import React, { useState } from 'react';
import { ListItemBase } from '@/src/shared/ui/molecules/ListItemBase';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { getIIIFValue, type IIIFAnnotation } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

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
  /** Called when annotation text is edited */
  onEdit?: (newText: string) => void;
  /** Whether to show expanded inline edit */
  expanded?: boolean;
  /** Contextual styles from parent */
  cx: ContextualClassNames;
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
  onEdit,
  expanded = false,
  cx,
  fieldMode = false,
  className = '',
}) => {
  const body = annotation.body as unknown as Record<string, unknown> | undefined;
  const bodyText = (body?.value as string) || getIIIFValue(annotation.label, language) || 'Untitled';
  const motivation = Array.isArray(annotation.motivation)
    ? annotation.motivation.join(', ')
    : (annotation.motivation || 'commenting');

  const [editText, setEditText] = useState(bodyText);

  const getMotivationColor = () => {
    if (motivation.includes('painting')) return 'bg-nb-blue/20 text-nb-blue';
    if (motivation.includes('supplementing')) return 'bg-nb-green/20 text-nb-green';
    if (motivation.includes('commenting')) return 'bg-nb-orange/20 text-nb-orange';
    if (motivation.includes('tagging')) return 'bg-nb-purple/10 text-nb-purple';
    if (motivation.includes('describing')) return fieldMode ? 'bg-nb-purple/20 text-nb-purple' : 'bg-nb-purple/10 text-nb-purple';
    return fieldMode ? 'bg-nb-black text-nb-yellow/40' : 'bg-nb-cream text-nb-black/60';
  };

  const handleSaveEdit = () => {
    if (onEdit && editText.trim() !== bodyText) {
      onEdit(editText.trim());
    }
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
        <span className={`text-xs font-bold truncate ${fieldMode ? cx.text : 'text-nb-black/80'}`}>
          {bodyText}
        </span>
        <span className={`text-[8px] px-1.5 py-0.5 uppercase font-bold shrink-0 ${getMotivationColor()}`}>
          {motivation}
        </span>
      </div>
      <p className={`text-[10px] truncate ${fieldMode ? (cx.textMuted || 'text-nb-yellow/60') : 'text-nb-black/50'}`}>
        {annotation.id}
      </p>

      {/* Inline edit when expanded and onEdit provided */}
      {expanded && onEdit && (
        <div className="mt-2 space-y-2" onClick={e => e.stopPropagation()}>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={2}
            className={`w-full px-2 py-1.5 text-xs outline-none border resize-none ${
              fieldMode
                ? 'bg-nb-black text-white border-nb-yellow/30 focus:border-nb-yellow'
                : 'bg-nb-white text-nb-black border-nb-black/20 focus:border-nb-blue'
            }`}
          />
          <div className="flex gap-1.5 justify-end">
            <Button variant="ghost" size="bare"
              onClick={() => setEditText(bodyText)}
              className={`px-2 py-1 text-[10px] font-bold ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'}`}
            >
              Reset
            </Button>
            <Button variant="ghost" size="bare"
              onClick={handleSaveEdit}
              disabled={!editText.trim() || editText.trim() === bodyText}
              className={`px-2 py-1 text-[10px] font-bold disabled:opacity-40 ${
                fieldMode ? 'bg-nb-yellow text-nb-black' : 'bg-nb-blue text-white'
              }`}
            >
              <Icon name="save" className="text-[10px] mr-0.5 inline" />
              Save
            </Button>
          </div>
        </div>
      )}
    </ListItemBase>
  );
};

export default AnnotationItem;
