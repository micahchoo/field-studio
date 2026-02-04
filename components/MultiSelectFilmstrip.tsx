/**
 * MultiSelectFilmstrip - Shows thumbnails of all selected items
 * 
 * Displays when multiple items are selected in Archive view.
 * Provides a scrollable filmstrip of thumbnails with click-to-focus.
 */

import React, { useEffect, useRef } from 'react';
import { getIIIFValue, IIIFCanvas } from '../types';
import { Icon } from './Icon';
import { StackedThumbnail } from './StackedThumbnail';
import { resolveHierarchicalThumbs } from '../utils/imageSourceResolver';
import { RESOURCE_TYPE_CONFIG } from '../constants';

interface MultiSelectFilmstripProps {
  /** Array of selected canvas items */
  items: IIIFCanvas[];
  /** Currently focused item ID (shown larger) */
  focusedId: string | null;
  /** Callback when an item is clicked */
  onFocus: (item: IIIFCanvas) => void;
  /** Callback to clear selection */
  onClear: () => void;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Filmstrip component for multi-selection view
 * Shows thumbnails in a scrollable list
 */
export const MultiSelectFilmstrip: React.FC<MultiSelectFilmstripProps> = ({
  items,
  focusedId,
  onFocus,
  onClear,
  fieldMode = false,
  orientation = 'horizontal'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to focused item
  useEffect(() => {
    if (focusedId && focusedRef.current && containerRef.current) {
      focusedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [focusedId]);

  if (items.length === 0) return null;

  const isHorizontal = orientation === 'horizontal';

  return (
    <div 
      ref={containerRef}
      className={`${isHorizontal ? 'h-full flex flex-row' : 'h-full flex flex-col'} ${fieldMode ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      {/* Header with count */}
      <div className={`shrink-0 flex items-center justify-between ${isHorizontal ? 'px-3 py-2 border-r flex-col h-full' : 'px-3 py-2 border-b flex-row'} ${fieldMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className={`flex items-center ${isHorizontal ? 'flex-col gap-1' : 'flex-row gap-2'}`}>
          <span className={`text-xs font-bold ${fieldMode ? 'text-yellow-400' : 'text-slate-700'}`}>
            {items.length}
          </span>
          <span className={`text-[10px] ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
            selected
          </span>
        </div>
        <button
          onClick={onClear}
          className={`p-1 rounded transition-colors ${fieldMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
          title="Clear selection"
        >
          <Icon name="close" className="text-sm" />
        </button>
      </div>

      {/* Thumbnail list */}
      <div className={`flex-1 overflow-x-auto overflow-y-hidden ${isHorizontal ? 'flex flex-row items-center py-2 px-2 gap-2' : 'flex flex-col py-2 space-y-1'}`}>
        {items.map((item, index) => {
          const isFocused = item.id === focusedId;
          const thumbUrls = resolveHierarchicalThumbs(item, isHorizontal ? 80 : 120);
          const config = RESOURCE_TYPE_CONFIG['Canvas'];

          return (
            <button
              key={item.id}
              ref={isFocused ? focusedRef : undefined}
              onClick={() => onFocus(item)}
              className={`shrink-0 flex items-center transition-all rounded-lg overflow-hidden ${
                isFocused
                  ? (fieldMode ? 'bg-yellow-400/10 ring-2 ring-yellow-400' : 'bg-iiif-blue/10 ring-2 ring-iiif-blue')
                  : 'hover:bg-black/5'
              } ${isHorizontal ? 'flex-col p-2 gap-1' : 'flex-row px-2 py-1.5 gap-2 w-full'}`}
            >
              {/* Thumbnail */}
              <div className={`shrink-0 ${isFocused ? (isHorizontal ? 'w-16 h-16' : 'w-12 h-12') : (isHorizontal ? 'w-14 h-14' : 'w-10 h-10')} transition-all`}>
                <StackedThumbnail
                  urls={thumbUrls}
                  size={isFocused ? 'sm' : 'xs'}
                  icon={config.icon}
                  className="w-full h-full rounded-md"
                />
              </div>

              {/* Label - only show in vertical mode or if focused in horizontal */}
              {(!isHorizontal || isFocused) && (
                <div className={`text-left min-w-0 ${isFocused ? 'opacity-100' : 'opacity-70'} ${isHorizontal ? 'text-center' : 'flex-1'}`}>
                  <div className={`text-xs font-medium truncate max-w-[80px] ${fieldMode ? 'text-white' : 'text-slate-700'}`}>
                    {getIIIFValue(item.label, 'none') || getIIIFValue(item.label, 'en') || 'Untitled'}
                  </div>
                  {!isHorizontal && (
                    <div className={`text-[10px] ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      #{index + 1}
                    </div>
                  )}
                </div>
              )}

              {/* Focus indicator */}
              {isFocused && isHorizontal && (
                <Icon 
                  name="visibility" 
                  className={`text-xs shrink-0 ${fieldMode ? 'text-yellow-400' : 'text-iiif-blue'}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MultiSelectFilmstrip;
