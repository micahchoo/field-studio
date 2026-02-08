/**
 * MultiSelectFilmstrip Molecule
 *
 * Shows thumbnails of all selected items in a scrollable filmstrip.
 * Displays when multiple items are selected in Archive view.
 * Provides click-to-focus functionality.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Props-driven, no context
 * - Uses StackedThumbnail and Icon atoms
 * - Pure presentation, callbacks via props
 */

import React, { useEffect, useRef } from 'react';
import { getIIIFValue, IIIFCanvas } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms';
import { StackedThumbnail } from '@/src/shared/ui/molecules/StackedThumbnail';
import { RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';
import { Button } from '@/ui/primitives/Button';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface MultiSelectFilmstripProps {
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
  /** Function to resolve thumbnail URLs for an item */
  resolveThumbs: (item: IIIFCanvas, size: number) => string[];
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Validation issues per canvas ID */
  validationIssues?: Record<string, { errors: number; warnings: number }>;
  /** Annotation counts per canvas ID */
  annotationCounts?: Record<string, number>;
  /** Set of geotagged canvas IDs */
  geotagged?: Set<string>;
}

export const MultiSelectFilmstrip: React.FC<MultiSelectFilmstripProps> = ({
  items,
  focusedId,
  onFocus,
  onClear,
  fieldMode = false,
  orientation = 'horizontal',
  resolveThumbs,
  cx,
  validationIssues,
  annotationCounts,
  geotagged,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef<HTMLDivElement>(null);

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
      className={`${isHorizontal ? 'h-full flex flex-row' : 'h-full flex flex-col'} ${fieldMode ? 'bg-nb-black' : 'bg-nb-white'}`}
    >
      {/* Header with count */}
      <div className={`shrink-0 flex items-center justify-between ${isHorizontal ? 'px-3 py-2 border-r flex-col h-full' : 'px-3 py-2 border-b flex-row'} ${fieldMode ? 'border-nb-black bg-nb-black' : 'border-nb-black/20 bg-nb-white'}`}>
        <div className={`flex items-center ${isHorizontal ? 'flex-col gap-1' : 'flex-row gap-2'}`}>
          <span className={`text-xs font-bold ${fieldMode ? 'text-nb-yellow' : 'text-nb-black/80'}`}>
            {items.length}
          </span>
          <span className={`text-[10px] ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>
            selected
          </span>
        </div>
        <Button
          onClick={onClear}
          variant="ghost"
          size="sm"
          icon={<Icon name="close" className="text-sm" />}
          title="Clear selection"
          aria-label="Clear selection"
        />
      </div>

      {/* Thumbnail list */}
      <div className={`flex-1 overflow-x-auto overflow-y-hidden ${isHorizontal ? 'flex flex-row items-center py-2 px-2 gap-2' : 'flex flex-col py-2 space-y-1'}`}>
        {items.map((item, index) => {
          const isFocused = item.id === focusedId;
          const thumbUrls = resolveThumbs(item, isHorizontal ? 80 : 120);
          const config = RESOURCE_TYPE_CONFIG['Canvas'];

          return (
            <div
              key={item.id}
              ref={isFocused ? focusedRef : undefined}
              onClick={() => onFocus(item)}
              className={`shrink-0 flex items-center transition-nb overflow-hidden cursor-pointer border-l-[3px] ${
                isFocused
                  ? 'border-l-mode-accent bg-mode-accent-bg-dark'
                  : 'border-l-transparent hover:bg-nb-black/5'
              } ${isHorizontal ? 'flex-col p-2 gap-1' : 'flex-row px-2 py-1.5 gap-2 w-full'}`}
            >
              {/* Thumbnail */}
              <div className={`shrink-0 ${isFocused ? (isHorizontal ? 'w-16 h-16' : 'w-12 h-12') : (isHorizontal ? 'w-14 h-14' : 'w-10 h-10')} transition-nb`}>
                <StackedThumbnail
                  urls={thumbUrls}
                  size={isFocused ? 'sm' : 'xs'}
                  icon={config.icon}
                  className="w-full h-full "
                  cx={cx}
                  fieldMode={fieldMode}
                />
              </div>

              {/* Status dots */}
              <div className="flex gap-0.5 mt-0.5">
                {validationIssues?.[item.id]?.errors ? (
                  <div className="w-1.5 h-1.5 bg-nb-red" title={`${validationIssues[item.id].errors} errors`} />
                ) : validationIssues?.[item.id]?.warnings ? (
                  <div className="w-1.5 h-1.5 bg-nb-orange" title="Warnings" />
                ) : null}
                {(annotationCounts?.[item.id] || 0) > 0 && (
                  <div className="w-1.5 h-1.5 bg-teal-400" title={`${annotationCounts![item.id]} annotations`} />
                )}
                {geotagged?.has(item.id) && (
                  <div className="w-1.5 h-1.5 bg-emerald-400" title="Geotagged" />
                )}
              </div>

              {/* Label - only show in vertical mode or if focused in horizontal */}
              {(!isHorizontal || isFocused) && (
                <div className={`text-left min-w-0 ${isFocused ? 'opacity-100' : 'opacity-70'} ${isHorizontal ? 'text-center' : 'flex-1'}`}>
                  <div className={`text-xs font-medium truncate max-w-[140px] ${fieldMode ? 'text-white' : 'text-nb-black/80'}`}>
                    {getIIIFValue(item.label, 'none') || getIIIFValue(item.label, 'en') || 'Untitled'}
                  </div>
                  {!isHorizontal && (
                    <div className={`text-[10px] ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>
                      #{index + 1}
                    </div>
                  )}
                </div>
              )}

              {/* Focus indicator */}
              {isFocused && isHorizontal && (
                <Icon
                  name="visibility"
                  className={`text-xs shrink-0 ${fieldMode ? 'text-nb-yellow' : 'text-iiif-blue'}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MultiSelectFilmstrip;
