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
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

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
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
        return 'bg-nb-purple/10 text-nb-purple';
      case 'layout':
        return 'bg-nb-orange/20 text-nb-orange';
      case 'browsing':
        return 'bg-nb-green/20 text-nb-green';
      case 'page':
        return 'bg-nb-blue/20 text-nb-blue';
      case 'navigation':
        return 'bg-nb-blue/20 text-nb-blue';
      default:
        return fieldMode ? 'bg-nb-black text-nb-black/50' : 'bg-nb-cream text-nb-black/60';
    }
  };

  const baseClass = onClick ? 'cursor-pointer hover:opacity-80 transition-nb' : '';

  return (
    <div
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 font-semibold ${baseClass} ${
        active
          ? 'bg-nb-blue text-white'
          : fieldMode
            ? 'bg-nb-black text-nb-black/40'
            : 'bg-nb-cream text-nb-black/60'
      } ${className}`}
      onClick={onClick}
      title={definition?.description || behavior}
    >
      <span>{label}</span>
      {showCategory && category && (
        <span className={`text-[8px] px-1 uppercase ${getCategoryColor()}`}>
          {category}
        </span>
      )}
    </div>
  );
};

export default BehaviorTag;