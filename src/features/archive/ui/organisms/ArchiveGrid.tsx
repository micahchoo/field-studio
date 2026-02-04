/**
 * ArchiveGrid Organism
 *
 * Composes: StackedThumbnail, Icon atoms, and virtualized grid layout.
 * Renders a grid of Canvas items with selection, hover, and context menu.
 *
 * IDEAL OUTCOME: Efficient virtualized grid with consistent styling
 * FAILURE PREVENTED: No prop drilling, uses cx and fieldMode from template
 */

import React from 'react';
import type { IIIFCanvas } from '@/types';
import { getIIIFValue } from '@/types';
// NEW: StackedThumbnail molecule
import { StackedThumbnail } from '@/src/shared/ui/molecules';
import { Icon } from '@/src/shared/ui/atoms';
import { RESOURCE_TYPE_CONFIG } from '@/constants';
import { resolveHierarchicalThumbs } from '@/utils/imageSourceResolver';
import { getFileDNA } from '../../model';

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
}) => {
  const gap = 16;
  const rowHeight = itemSize.height + gap;
  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * rowHeight;

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

  const renderItem = (asset: IIIFCanvas) => {
    const selected = isSelected(asset.id);
    const dna = getFileDNA(asset);
    const thumbUrls = resolveHierarchicalThumbs(asset, 200);
    const config = RESOURCE_TYPE_CONFIG['Canvas'];

    return (
      <div
        key={asset.id}
        onContextMenu={(e) => onContextMenu(e, asset.id)}
        className={`group relative rounded-lg shadow-sm cursor-pointer transition-all ${
          fieldMode
            ? (selected ? 'bg-slate-800 border-4 border-yellow-400 p-2' : 'bg-slate-800 border border-slate-700 p-3')
            : (selected ? 'bg-blue-50 border border-iiif-blue ring-2 ring-iiif-blue p-2' : `bg-white border p-2 hover:shadow-md border-slate-200`)
        }`}
        onClick={(e) => onItemClick(e, asset)}
      >
        <div className={`aspect-square rounded overflow-hidden flex items-center justify-center mb-2 relative ${cx.thumbnailBg}`}>
          <StackedThumbnail
            urls={thumbUrls}
            size="lg"
            className="w-full h-full"
            icon={config.icon}
            cx={cx}
            fieldMode={fieldMode}
          />
          <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-full flex gap-1.5 font-sans">
            {dna.hasTime && <Icon name="schedule" className="text-[10px] text-yellow-400" title="Has Time metadata"/>}
            {dna.hasLocation && <Icon name="location_on" className="text-[10px] text-green-400" title="Has GPS metadata"/>}
            {dna.hasDevice && <Icon name="photo_camera" className="text-[10px] text-blue-400" title="Has Device metadata"/>}
          </div>
        </div>
        <div className="px-1 min-w-0">
          <div className={`font-medium truncate ${cx.text} ${fieldMode ? 'text-sm' : 'text-[11px]'}`}>
            <Icon name={config.icon} className={`mr-1 text-[10px] opacity-60 ${config.colorClass}`}/>
            {getIIIFValue(asset.label)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden="true" />}
      <div className={`grid gap-4 ${gridColsClass}`}>
        {visibleItems.map(renderItem)}
      </div>
      {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden="true" />}
      {items.length === 0 && (
        <div className="p-8 text-center">
          <div className={`text-lg font-medium ${cx.text}`}>
            {filter ? 'No items match your filter' : 'No items in archive'}
          </div>
          <p className={`text-sm mt-2 ${cx.textMuted}`}>
            {filter
              ? `Try adjusting your search for "${filter}" or clear the filter to see all items.`
              : 'Import files to get started building your archive.'}
          </p>
          {filter && onClearFilter && (
            <button
              onClick={onClearFilter}
              className="mt-4 px-4 py-2 bg-iiif-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ArchiveGrid;