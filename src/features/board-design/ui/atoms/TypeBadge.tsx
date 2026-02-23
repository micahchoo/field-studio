/**
 * TypeBadge Atom
 *
 * IIIF resource type pill (Collection/Manifest/Canvas/Range).
 *
 * @module features/board-design/ui/atoms/TypeBadge
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';

const TYPE_CONFIG: Record<string, { icon: string; color: string; fieldColor: string }> = {
  Collection: { icon: 'folder', color: 'bg-nb-purple/20 text-nb-purple', fieldColor: 'bg-nb-purple/30 text-nb-purple' },
  Manifest: { icon: 'description', color: 'bg-nb-blue/20 text-nb-blue', fieldColor: 'bg-nb-blue/30 text-nb-blue' },
  Canvas: { icon: 'image', color: 'bg-nb-green/20 text-nb-green', fieldColor: 'bg-nb-green/30 text-nb-green' },
  Range: { icon: 'folder_special', color: 'bg-cyan-100 text-cyan-700', fieldColor: 'bg-cyan-900/30 text-cyan-400' },
};

export interface TypeBadgeProps {
  resourceType: string;
  cx: { surface: string; text: string };
  fieldMode: boolean;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ resourceType, fieldMode }) => {
  const config = TYPE_CONFIG[resourceType] || TYPE_CONFIG.Canvas;
  const colorClass = fieldMode ? config.fieldColor : config.color;

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colorClass}`}>
      <Icon name={config.icon} className="text-[10px]" aria-hidden="true" />
      {resourceType}
    </span>
  );
};
