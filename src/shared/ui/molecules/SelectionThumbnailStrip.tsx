/**
 * SelectionThumbnailStrip Molecule
 *
 * Thumbnail preview strip for selected items.
 * Shows up to 5 thumbnails with overflow count.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - No local state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/molecules/SelectionThumbnailStrip
 */

import React from 'react';
import { Button, Icon } from '../atoms';
import type { IIIFCanvas } from '@/src/shared/types';

export interface SelectionThumbnailStripProps {
  /** Selected canvas items */
  selectedItems: IIIFCanvas[];
  /** Max thumbnails to show */
  maxVisible?: number;
  /** Selection count */
  count: number;
  /** Item type label */
  itemLabel: string;
  /** Called to hide the strip */
  onHide: () => void;
  /** Field mode flag for dark theme */
  fieldMode?: boolean;
}

export const SelectionThumbnailStrip: React.FC<SelectionThumbnailStripProps> = ({
  selectedItems,
  maxVisible = 5,
  count,
  itemLabel,
  onHide,
  fieldMode = false,
}) => {
  const visibleThumbnails = selectedItems.slice(0, maxVisible);
  const remainingCount = Math.max(0, count - maxVisible);

  return (
    <div
      className={`
        flex items-center gap-2 p-3 border-b
        ${fieldMode ?'border-nb-black/80 bg-nb-black/50' :'border-nb-black/10 bg-nb-white'}
`}
    >
      <div className="flex items-center gap-1">
        {visibleThumbnails.map((item, idx) => (
          <div
            key={item.id}
            className={`
              w-10 h-10  overflow-hidden border-2
              ${fieldMode ?'border-nb-black/60' :'border-white shadow-brutal-sm'}
              ${idx === 0 ?'ring-2 ring-nb-blue' :''}
`}
            title={item.label?.en?.[0] || item.id}
          >
            {item.thumbnail?.[0]?.id ? (
              <img
                src={item.thumbnail[0].id}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${fieldMode ?'bg-nb-black/80' :'bg-nb-cream'}`}>
                <Icon name="image" className="text-xs opacity-50" />
              </div>
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div
            className={`
              w-10 h-10  flex items-center justify-center text-xs font-medium
              ${fieldMode ?'bg-nb-black/80 text-nb-black/30' :'bg-nb-cream text-nb-black/60'}
`}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      <div className={`h-8 w-px mx-2 ${fieldMode ?'bg-nb-black/80' :'bg-nb-cream'}`} />

      {/* Selection count */}
      <div className="flex items-center gap-2">
        <Icon name="check_circle" className={`text-sm ${fieldMode ?'text-nb-green' :'text-nb-green'}`} />
        <span className={`font-medium ${fieldMode ?'text-white' :'text-nb-black'}`}>
          {count} {itemLabel}
        </span>
      </div>

      <Button variant="ghost" size="bare"
        onClick={onHide}
        className={`
          ml-auto p-1 hover:bg-nb-black/10 transition-nb
          ${fieldMode ?'text-nb-black/40 hover:text-nb-black/20' :'text-nb-black/40 hover:text-nb-black/60'}
`}
        aria-label="Hide thumbnails"
      >
        <Icon name="expand_less" className="text-sm" />
      </Button>
    </div>
  );
};

export default SelectionThumbnailStrip;
