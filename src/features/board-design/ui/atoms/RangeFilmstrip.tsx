/**
 * RangeFilmstrip Atom
 *
 * Collapsible horizontal row of small thumbnails for Range child canvases.
 *
 * @module features/board-design/ui/atoms/RangeFilmstrip
 */

import React, { useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import type { IIIFItem } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { resolveHierarchicalThumb } from '@/utils/imageSourceResolver';

export interface RangeFilmstripProps {
  childIds: string[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  root: IIIFItem | null;
  cx: ContextualClassNames;
  fieldMode: boolean;
}

const findInTree = (node: IIIFItem, targetId: string): IIIFItem | null => {
  if (node.id === targetId) return node;
  const children = (node as IIIFItem & { items?: IIIFItem[] }).items;
  if (children) {
    for (const child of children) {
      const found = findInTree(child, targetId);
      if (found) return found;
    }
  }
  return null;
};

export const RangeFilmstrip: React.FC<RangeFilmstripProps> = ({
  childIds,
  collapsed,
  onToggleCollapse,
  root,
  fieldMode,
}) => {
  if (childIds.length === 0) return null;

  const toggleClass = fieldMode
    ? 'text-cyan-400/60 hover:text-cyan-400'
    : 'text-cyan-600/60 hover:text-cyan-600';

  if (collapsed) {
    return (
      <Button variant="ghost" size="bare"
        onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
        className={`flex items-center gap-1 text-[10px] px-1 py-0.5 ${toggleClass}`}
      >
        <Icon name="expand_more" className="text-xs" />
        {childIds.length} canvases
      </Button>
    );
  }

  return (
    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="bare"
        onClick={onToggleCollapse}
        className={`flex items-center gap-1 text-[10px] px-1 py-0.5 mb-1 ${toggleClass}`}
      >
        <Icon name="expand_less" className="text-xs" />
        {childIds.length} canvases
      </Button>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {childIds.slice(0, 8).map(id => {
          const item = root ? findInTree(root, id) : null;
          const thumb = item ? resolveHierarchicalThumb(item, 48) : null;
          return (
            <div
              key={id}
              className={`flex-shrink-0 w-12 h-9 border overflow-hidden ${
                fieldMode ? 'border-cyan-800 bg-nb-black/80' : 'border-cyan-200 bg-nb-cream'
              }`}
            >
              {thumb ? (
                <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon name="image" className={`text-[10px] ${fieldMode ? 'text-cyan-400/30' : 'text-cyan-600/20'}`} />
                </div>
              )}
            </div>
          );
        })}
        {childIds.length > 8 && (
          <div className={`flex-shrink-0 w-12 h-9 flex items-center justify-center text-[10px] ${
            fieldMode ? 'text-cyan-400/40' : 'text-cyan-600/40'
          }`}>
            +{childIds.length - 8}
          </div>
        )}
      </div>
    </div>
  );
};
