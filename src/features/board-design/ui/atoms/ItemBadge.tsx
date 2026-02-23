/**
 * ItemBadge Atom
 *
 * Small count/duration badge for board nodes.
 *
 * @module features/board-design/ui/atoms/ItemBadge
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';

export interface ItemBadgeProps {
  value: string;
  icon?: string;
  cx: { surface: string; text: string };
  fieldMode: boolean;
}

export const ItemBadge: React.FC<ItemBadgeProps> = ({
  value,
  icon,
  fieldMode,
}) => {
  const bgClass = fieldMode
    ? 'bg-nb-black/80 text-nb-yellow'
    : 'bg-nb-black/70 text-nb-white';

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium ${bgClass}`}>
      {icon && <Icon name={icon} className="text-[10px]" aria-hidden="true" />}
      {value}
    </span>
  );
};
