/**
 * ArchiveGrid Organism
 *
 * Refined grid with bold archival aesthetic:
 * - Stronger selection indicators with checkmark overlay
 * - Zoom/density controls for flexible viewing
 * - Better badge tooltips and visual hierarchy
 * - Warm stone palette with amber accents
 *
 * PROPS NOTE: 11 props are required for virtualization support
 *
 * BOLD AESTHETIC:
 * - Strong selection states with amber accent
 * - Generous whitespace and rounded corners
 * - Layered depth with shadows
 * - Refined typography
 */

import React, { useState } from 'react';
import { getIIIFValue, type IIIFCanvas } from '@/types';
import { StackedThumbnail } from '@/src/shared/ui/molecules';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';
import { RESOURCE_TYPE_CONFIG } from '@/constants';
import { resolveHierarchicalThumbs } from '@/utils/imageSourceResolver';
import { getFileDNA } from '../../model';

export type GridDensity = 'compact' | 'comfortable' | 'spacious';

export interface ArchiveGridProps {
  /** Canvas items to render */
  items: IIIFCanvas[];
  /** Visible range for virtualization */
  visibleRange: { start: number; end: number };
  /** Number of columns in the grid */
  columns: number;
  /** Size of each grid item */
  itemSize: { width: number; height: number };
  /** Check if an item is selected */
  isSelected: (id: string) => boolean;
  /** Click handler for an item */
  onItemClick: (e: React.MouseEvent, asset: IIIFCanvas) => void;
  /** Context menu handler */
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  /** Contextual styles from template */
  cx: {
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
    inactive: string;
    warningBg: string;
    thumbnailBg?: string;
  };
  /** Current field mode */
  fieldMode: boolean;
  /** Whether mobile layout is active */
  isMobile: boolean;
  /** Active item for detail panel */
  activeItem: IIIFCanvas | null;
  /** Current filter term */
  filter?: string;
  /** Callback to clear filter */
  onClearFilter?: () => void;
  /** Grid density control */
  density?: GridDensity;
  /** Callback when density changes */
  onDensityChange?: (density: GridDensity) => void;
}

/**
 * ArchiveGrid Organism
 *
 * @example
 * <ArchiveGrid
 *   items={filteredCanvases}
 *   visibleRange={gridVisibleRange}
 *   columns={gridColumns}
 *   itemSize={gridItemSize}
 *   isSelected={isSelected}
 *   onItemClick={handleItemClick}
 *   onContextMenu={handleContextMenu}
 *   cx={cx}
 *   fieldMode={fieldMode}
 *   isMobile={isMobile}
 *   activeItem={activeItem}
 *   filter={filter}
 *   onClearFilter={handleClearFilter}
 * />
 */
export const ArchiveGrid: React.FC<ArchiveGridProps> = ({
  items,
  visibleRange,
  columns,
  itemSize,
  isSelected,
  onItemClick,
  onContextMenu,
  cx,
  fieldMode,
  isMobile,
  activeItem,
  filter,
  onClearFilter,
  density = 'comfortable',
  onDensityChange,
}) => {
  const gap = 16;
  const rowHeight = itemSize.height + gap;
  const totalRows = Math.ceil(items.length / columns);
  const _totalHeight = totalRows * rowHeight;

  const startRow = Math.floor(visibleRange.start / columns);
  const topSpacer = startRow * rowHeight;

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const endRow = Math.ceil(visibleRange.end / columns);
  const bottomSpacer = Math.max(0, (totalRows - endRow) * rowHeight);

  // Determine grid columns class
  const gridColsClass = !isMobile && activeItem
    ? 'grid-cols-1 lg:grid-cols-2'
    : fieldMode
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [badgeTooltip, setBadgeTooltip] = useState<{text: string; x: number; y: number} | null>(null);

  const densityClasses = {
    compact: 'gap-2',
    comfortable: 'gap-4',
    spacious: 'gap-6',
  };

  const paddingClasses = {
    compact: 'p-1.5',
    comfortable: 'p-2',
    spacious: 'p-3',
  };

  const renderItem = (asset: IIIFCanvas) => {
    const selected = isSelected(asset.id);
    const dna = getFileDNA(asset);
    const thumbUrls = resolveHierarchicalThumbs(asset, 200);
    const config = RESOURCE_TYPE_CONFIG['Canvas'];
    const isHovered = hoveredId === asset.id;

    return (
      <div
        key={asset.id}
        onContextMenu={(e) => onContextMenu(e, asset.id)}
        className={`
          group relative rounded-xl cursor-pointer transition-all duration-200
          ${paddingClasses[density || 'comfortable']}
          ${selected
            ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 shadow-md'
            : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:shadow-lg hover:border-stone-300 dark:hover:border-stone-600'
          }
        `}
        onClick={(e) => onItemClick(e, asset)}
        onMouseEnter={() => setHoveredId(asset.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <div className="aspect-square rounded-lg overflow-hidden flex items-center justify-center mb-2 relative bg-stone-100 dark:bg-stone-900">
          {/* Selection checkmark overlay */}
          {selected && (
            <div className="absolute inset-0 bg-amber-500/10 z-10 pointer-events-none" />
          )}
          <div className={`
            absolute top-2 right-2 z-20
            w-6 h-6 rounded-full flex items-center justify-center
            transition-all duration-200
            ${selected
              ? 'bg-amber-500 text-white scale-100'
              : 'bg-white/90 text-stone-400 scale-0 group-hover:scale-100'
            }
            shadow-sm
          `}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>

          <StackedThumbnail
            urls={thumbUrls}
            size="lg"
            className="w-full h-full"
            icon={config.icon}
            cx={cx as any}
            fieldMode={fieldMode}
          />

          {/* Metadata badges with tooltips */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            {dna.hasTime && (
              <button
                className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm hover:bg-amber-600 transition-colors"
                onMouseEnter={(e) => setBadgeTooltip({text: 'Has date/time metadata', x: e.clientX, y: e.clientY})}
                onMouseLeave={() => setBadgeTooltip(null)}
                title="Has Time metadata"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            {dna.hasLocation && (
              <button
                className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm hover:bg-emerald-600 transition-colors"
                onMouseEnter={(e) => setBadgeTooltip({text: 'Has GPS location data', x: e.clientX, y: e.clientY})}
                onMouseLeave={() => setBadgeTooltip(null)}
                title="Has GPS metadata"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </button>
            )}
            {dna.hasDevice && (
              <button
                className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm hover:bg-sky-600 transition-colors"
                onMouseEnter={(e) => setBadgeTooltip({text: 'Has camera/device info', x: e.clientX, y: e.clientY})}
                onMouseLeave={() => setBadgeTooltip(null)}
                title="Has Device metadata"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filename with hover tooltip */}
        <div className="px-1 min-w-0">
          <div
            className={`
              font-medium truncate text-stone-800 dark:text-stone-200
              ${(density || 'comfortable') === 'compact' ? 'text-[11px]' : 'text-xs'}
            `}
            title={getIIIFValue(asset.label)}
          >
            {getIIIFValue(asset.label)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Density controls toolbar */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <span className="text-xs text-stone-500 dark:text-stone-400">View:</span>
        <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5">
          {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
            <button
              key={d}
              onClick={() => onDensityChange?.(d)}
              className={`
                px-2 py-1 text-xs font-medium rounded-md transition-all
                ${density === d
                  ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }
              `}
              title={`${d.charAt(0).toUpperCase() + d.slice(1)} view`}
            >
              {d === 'compact' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
              {d === 'comfortable' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>}
              {d === 'spacious' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" /></svg>}
            </button>
          ))}
        </div>
      </div>

      {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden="true" />}
      <div className={`grid ${densityClasses[density]} ${gridColsClass}`}>
        {visibleItems.map(renderItem)}
      </div>
      {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden="true" />}

      {/* Refined empty state */}
      {items.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-lg font-medium text-stone-800 dark:text-stone-200 mb-2">
            {filter ? 'No matching items found' : 'Your archive is empty'}
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
            {filter
              ? `Try adjusting your search for "${filter}" or clear the filter to see all items.`
              : 'Import photos and documents to start building your archive.'}
          </p>
          {filter && onClearFilter && (
            <Button
              onClick={onClearFilter}
              variant="primary"
              size="sm"
              className="mt-6"
            >
              Clear Filter
            </Button>
          )}
        </div>
      )}

      {/* Badge tooltip */}
      {badgeTooltip && (
        <div
          className="fixed z-50 px-2 py-1 bg-stone-800 text-white text-xs rounded shadow-lg pointer-events-none"
          style={{ left: badgeTooltip.x, top: badgeTooltip.y - 30 }}
        >
          {badgeTooltip.text}
        </div>
      )}
    </div>
  );
};

export default ArchiveGrid;