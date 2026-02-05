/**
 * MiniMap Atom
 *
 * Canvas overview widget showing scaled-down items and viewport rectangle.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/board-design/ui/atoms/MiniMap
 */

import React from 'react';
import type { BoardItem } from '../../model';

export interface MiniMapProps {
  /** Canvas items to display */
  items: BoardItem[];
  /** Canvas bounds (min/max coordinates) */
  bounds?: { minX: number; minY: number; maxX: number; maxY: number } | null;
  /** Current viewport rectangle in canvas coordinates */
  viewportRect?: { x: number; y: number; width: number; height: number };
  /** Callback when user clicks on minimap to pan */
  onViewportChange?: (x: number, y: number) => void;
  /** Contextual styles */
  cx: {
    surface: string;
    accent: string;
    text: string;
  };
  /** Field mode flag */
  fieldMode: boolean;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  items,
  bounds,
  viewportRect,
  onViewportChange,
  cx,
  fieldMode,
}) => {
  // If no bounds, compute from items
  const effectiveBounds = bounds || (items.length > 0
    ? {
        minX: Math.min(...items.map(i => i.x)),
        minY: Math.min(...items.map(i => i.y)),
        maxX: Math.max(...items.map(i => i.x + i.w)),
        maxY: Math.max(...items.map(i => i.y + i.h)),
      }
    : { minX: 0, minY: 0, maxX: 1000, maxY: 800 });

  const totalWidth = effectiveBounds.maxX - effectiveBounds.minX || 1000;
  const totalHeight = effectiveBounds.maxY - effectiveBounds.minY || 800;

  // MiniMap dimensions (fixed)
  const mapWidth = 150;
  const mapHeight = 100;
  const scaleX = mapWidth / totalWidth;
  const scaleY = mapHeight / totalHeight;
  const scale = Math.min(scaleX, scaleY);

  const handleClick = (e: React.MouseEvent) => {
    if (!onViewportChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale + effectiveBounds.minX;
    const y = (e.clientY - rect.top) / scale + effectiveBounds.minY;
    onViewportChange(x, y);
  };

  return (
    <div
      className={`
        absolute bottom-4 left-4 w-40 h-28 p-2 rounded-lg shadow-lg
        ${cx.surface} border ${fieldMode ? 'border-slate-700' : 'border-slate-300'}
        backdrop-blur-sm bg-opacity-90
      `}
    >
      <div className="text-xs font-medium mb-1">Canvas Overview</div>
      <div
        className="relative w-full h-20 rounded border border-slate-400 overflow-hidden cursor-pointer"
        onClick={handleClick}
        aria-label="MiniMap - click to pan"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-slate-800 opacity-20" />

        {/* Items */}
        {items.map((item) => {
          const x = (item.x - effectiveBounds.minX) * scale;
          const y = (item.y - effectiveBounds.minY) * scale;
          const w = item.w * scale;
          const h = item.h * scale;
          return (
            <div
              key={item.id}
              className="absolute bg-blue-500 opacity-70 rounded-sm"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${Math.max(w, 2)}px`,
                height: `${Math.max(h, 2)}px`,
              }}
              title={item.label}
            />
          );
        })}

        {/* Viewport rectangle */}
        {viewportRect && (
          <div
            className="absolute border-2 border-yellow-400 bg-yellow-400 bg-opacity-20"
            style={{
              left: `${(viewportRect.x - effectiveBounds.minX) * scale}px`,
              top: `${(viewportRect.y - effectiveBounds.minY) * scale}px`,
              width: `${viewportRect.width * scale}px`,
              height: `${viewportRect.height * scale}px`,
            }}
            aria-label="Current viewport"
          />
        )}
      </div>
    </div>
  );
};