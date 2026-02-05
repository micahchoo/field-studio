/**
 * BehaviorTag Atom
 *
 * Pill/tag displaying an IIIF behavior with category-based styling.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/BehaviorTag
 */

import React from 'react';
import { BEHAVIOR_DEFINITIONS } from '@/src/shared/constants/iiif';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface BehaviorTagProps {
  /** Behavior value (e.g., 'auto-advance') */
  behavior: string;
  /** Whether the tag is active (selected) */
  active?: boolean;
  /** Whether to show category badge */
  showCategory?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Callback when tag is clicked */
  onClick?: () => void;
}

export const BehaviorTag: React.FC<BehaviorTagProps> = ({
  behavior,
  active = true,
  showCategory = false,
  cx,
  fieldMode = false,
  className = '',
  onClick,
}) => {
  const definition = BEHAVIOR_DEFINITIONS[behavior];
  const label = definition?.label || behavior;
  const category = definition?.category;

  const getCategoryColor = () => {
    switch (category) {
      case 'time':
        return 'bg-purple-100 text-purple-600';
      case 'layout':
        return 'bg-amber-100 text-amber-600';
      case 'browsing':
        return 'bg-emerald-100 text-emerald-600';
      case 'page':
        return 'bg-blue-100 text-blue-600';
      case 'navigation':
        return 'bg-indigo-100 text-indigo-600';
      default:
        return fieldMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-600';
    }
  };

  const baseClass = onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';

  return (
    <div
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${baseClass} ${
        active
          ? 'bg-blue-600 text-white'
          : fieldMode
            ? 'bg-slate-800 text-slate-400'
            : 'bg-slate-200 text-slate-600'
      } ${className}`}
      onClick={onClick}
      title={definition?.description || behavior}
    >
      <span>{label}</span>
      {showCategory && category && (
        <span className={`text-[8px] px-1 rounded uppercase ${getCategoryColor()}`}>
          {category}
        </span>
      )}
    </div>
  );
};

export default BehaviorTag;