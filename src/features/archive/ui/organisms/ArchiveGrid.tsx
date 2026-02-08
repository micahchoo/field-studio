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
 * - Generous whitespace and corners
 * - Layered depth with shadows
 * - Refined typography
 */

import React, { useState } from 'react';
import { getIIIFValue, type IIIFCanvas } from '@/src/shared/types';
import { StackedThumbnail } from '@/src/shared/ui/molecules/StackedThumbnail';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';
import { RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';
import { resolveHierarchicalThumbs } from '@/utils/imageSourceResolver';
import { getFileDNA } from '../../model';

export type GridDensity = 'compact' | 'comfortable' | 'spacious';

export type ViewingDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';

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
  /** Click handler for an item (normal selection) */
  onItemClick: (e: React.MouseEvent, asset: IIIFCanvas) => void;
  /** Toggle selection for multiselect (checkmark click) */
  onToggleSelect?: (id: string) => void;
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
  /** Whether reordering is enabled (when viewer is closed) */
  reorderEnabled?: boolean;
  /** Callback when items are reordered via drag-and-drop */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** IIIF viewingDirection from manifest */
  viewingDirection?: ViewingDirection;
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
  onToggleSelect,
  onContextMenu,
  cx,
  fieldMode,
  isMobile,
  activeItem,
  filter,
  onClearFilter,
  density = 'comfortable',
  onDensityChange,
  reorderEnabled = false,
  onReorder,
  viewingDirection = 'left-to-right',
}) => {
  // Resolve CSS direction from IIIF viewingDirection
  const isRTL = viewingDirection === 'right-to-left';
  const directionStyle: React.CSSProperties = isRTL ? { direction: 'rtl' } : {};
  const directionLabel = viewingDirection === 'right-to-left' ? 'RTL'
    : viewingDirection === 'top-to-bottom' ? 'TTB'
    : viewingDirection === 'bottom-to-top' ? 'BTT'
    : '';

  const gap = 16;
  const rowHeight = itemSize.height + gap;
  const totalRows = Math.ceil(items.length / columns);
  const _totalHeight = totalRows * rowHeight;

  const startRow = Math.floor(visibleRange.start / columns);
  const topSpacer = startRow * rowHeight;

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const endRow = Math.ceil(visibleRange.end / columns);
  const bottomSpacer = Math.max(0, (totalRows - endRow) * rowHeight);

  // Determine grid columns class based on density
  // Note: Previously reduced columns when activeItem was set, but now the viewer
  // is in a separate split panel, so we keep consistent grid layout
  const gridColsClass = fieldMode
    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8';

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [badgeTooltip, setBadgeTooltip] = useState<{text: string; x: number; y: number} | null>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Find the actual index in the full items array
  const getItemIndex = (id: string) => items.findIndex(item => item.id === id);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!reorderEnabled || !onReorder) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!reorderEnabled || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the grid entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget?.closest?.('[data-grid-item]')) {
      setDropTargetIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (!reorderEnabled || draggedIndex === null || !onReorder) return;
    if (draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const densityClasses = {
    compact: 'gap-2',
    comfortable: 'gap-4',
    spacious: 'gap-6',
  };

  const paddingClasses = {
    compact: 'p-1',
    comfortable: 'p-2',
    spacious: 'p-3',
  };

  const renderItem = (asset: IIIFCanvas, visualIndex: number) => {
    const selected = isSelected(asset.id);
    const dna = getFileDNA(asset);
    const thumbUrls = resolveHierarchicalThumbs(asset, 200);
    const config = RESOURCE_TYPE_CONFIG['Canvas'];
    const isHovered = hoveredId === asset.id;
    const itemIndex = visibleRange.start + visualIndex;
    const isDragging = draggedIndex === itemIndex;
    const isDropTarget = dropTargetIndex === itemIndex && draggedIndex !== null && draggedIndex !== itemIndex;

    return (
      <div
        key={asset.id}
        data-grid-item
        draggable={reorderEnabled && !!onReorder}
        onDragStart={(e) => handleDragStart(e, itemIndex)}
        onDragOver={(e) => handleDragOver(e, itemIndex)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, itemIndex)}
        onDragEnd={handleDragEnd}
        onContextMenu={(e) => onContextMenu(e, asset.id)}
        className={`
          group relative  transition-nb 
          ${reorderEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
          ${paddingClasses[density || 'comfortable']}
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${isDropTarget
            ? fieldMode
              ? 'ring-2 ring-nb-yellow ring-offset-2 ring-offset-black'
              : 'ring-2 ring-nb-blue ring-offset-2'
            : ''
          }
          ${selected
            ? 'bg-nb-orange/20 border-2 border-nb-orange shadow-brutal-sm'
            : 'bg-nb-black border border-nb-black/20 hover:shadow-brutal hover:border-nb-black/20'
          }
        `}
        onClick={(e) => onItemClick(e, asset)}
        onMouseEnter={() => setHoveredId(asset.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <div className="aspect-square overflow-hidden flex items-center justify-center mb-2 relative bg-nb-black">
          {/* Selection checkmark overlay */}
          {selected && (
            <div className="absolute inset-0 bg-nb-orange/10 z-10 pointer-events-none" />
          )}
          {/* Checkmark button - clicking this toggles multiselect */}
          <Button variant="ghost" size="bare"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(asset.id);
            }}
            className={`
              absolute top-2 right-2 z-20
              w-6 h-6  flex items-center justify-center
              transition-nb 
              ${selected
                ? fieldMode
                  ? 'bg-nb-yellow text-white scale-100'
                  : 'bg-nb-orange text-white scale-100'
                : 'bg-nb-white/90 text-nb-black/40 scale-0 group-hover:scale-100 hover:bg-nb-cream'
              }
              shadow-brutal-sm cursor-pointer
            `}
            title={selected ? 'Deselect' : 'Select (add to selection)'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Button>

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
              <Button variant="ghost" size="bare"
                className="w-5 h-5 bg-nb-orange text-white flex items-center justify-center shadow-brutal-sm hover:bg-nb-orange transition-nb"
                onMouseEnter={(e) => setBadgeTooltip({text: 'Has date/time metadata', x: e.clientX, y: e.clientY})}
                onMouseLeave={() => setBadgeTooltip(null)}
                title="Has Time metadata"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
            )}
            {dna.hasLocation && (
              <Button variant="ghost" size="bare"
                className="w-5 h-5 bg-nb-green/100 text-white flex items-center justify-center shadow-brutal-sm hover:bg-nb-green transition-nb"
                onMouseEnter={(e) => setBadgeTooltip({text: 'Has GPS location data', x: e.clientX, y: e.clientY})}
                onMouseLeave={() => setBadgeTooltip(null)}
                title="Has GPS metadata"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </Button>
            )}
            {dna.hasDevice && (
              <Button variant="ghost" size="bare"
                className="w-5 h-5 bg-sky-500 text-white flex items-center justify-center shadow-brutal-sm hover:bg-sky-600 transition-nb"
                onMouseEnter={(e) => setBadgeTooltip({text: 'Has camera/device info', x: e.clientX, y: e.clientY})}
                onMouseLeave={() => setBadgeTooltip(null)}
                title="Has Device metadata"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </Button>
            )}
            {asset.rights && (
              <Button variant="ghost" size="bare"
                className="w-5 h-5 bg-nb-purple text-white flex items-center justify-center shadow-brutal-sm hover:bg-nb-purple/80 transition-nb"
                onMouseEnter={(e) => setBadgeTooltip({text: `Rights: ${asset.rights}`, x: e.clientX, y: e.clientY})}
                onMouseLeave={() => setBadgeTooltip(null)}
                title={`Rights: ${asset.rights}`}
              >
                <Icon name="copyright" className="text-[10px]" />
              </Button>
            )}
          </div>
        </div>

        {/* Filename with hover tooltip */}
        <div className="px-1 min-w-0 h-6 flex items-center">
          <div
            className="text-nb-xs font-medium truncate text-nb-black"
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
        {directionLabel && (
          <span className={`text-nb-micro font-bold uppercase px-1.5 py-0.5 ${
            fieldMode ? 'bg-nb-black text-nb-yellow' : 'bg-nb-purple/10 text-nb-purple'
          }`}>
            {viewingDirection === 'right-to-left' ? '\u2190' : viewingDirection === 'top-to-bottom' ? '\u2193' : '\u2191'} {directionLabel}
          </span>
        )}
        <span className="text-xs text-nb-black/50">View:</span>
        <div className="flex items-center bg-nb-black p-0.5">
          {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
            <Button variant="ghost" size="bare"
              key={d}
              onClick={() => onDensityChange?.(d)}
              className={`
                px-2 py-1 text-xs font-medium  transition-nb
                ${density === d
                  ? 'bg-nb-black/70 text-nb-black shadow-brutal-sm'
                  : 'text-nb-black/50 hover:text-nb-black/70'
                }
              `}
              title={`${d.charAt(0).toUpperCase() + d.slice(1)} view`}
            >
              {d === 'compact' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
              {d === 'comfortable' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>}
              {d === 'spacious' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" /></svg>}
            </Button>
          ))}
        </div>
      </div>

      {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden="true" />}
      <div className={`grid ${densityClasses[density]} ${gridColsClass}`} style={directionStyle}>
        {visibleItems.map((item, index) => renderItem(item, index))}
      </div>
      {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden="true" />}

      {/* Refined empty state */}
      {items.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-nb-black flex items-center justify-center">
            <svg className="w-8 h-8 text-nb-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-lg font-medium text-nb-black mb-2">
            {filter ? 'No matching items found' : 'Your archive is empty'}
          </div>
          <p className="text-sm text-nb-black/50 max-w-sm mx-auto">
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
          className="fixed z-50 px-2 py-1 bg-nb-black text-white text-xs shadow-brutal pointer-events-none"
          style={{ left: badgeTooltip.x, top: badgeTooltip.y - 30 }}
        >
          {badgeTooltip.text}
        </div>
      )}
    </div>
  );
};

export default ArchiveGrid;