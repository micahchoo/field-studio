/**
 * MetadataTooltip Atom
 *
 * Hover tooltip showing summary, metadata preview, and navDate.
 *
 * @module features/board-design/ui/atoms/MetadataTooltip
 */

import React from 'react';
import type { BoardItemMeta } from '../../model';

export interface MetadataTooltipProps {
  meta: BoardItemMeta | undefined;
  visible: boolean;
  position: { x: number; y: number };
  cx: { surface: string; text: string };
  fieldMode: boolean;
}

export const MetadataTooltip: React.FC<MetadataTooltipProps> = ({
  meta,
  visible,
  position,
  fieldMode,
}) => {
  if (!visible || !meta) return null;

  const hasContent = meta.summary || meta.metadataPreview?.length || meta.navDate || meta.duration != null || meta.canvasCount != null || meta.itemCount != null;
  if (!hasContent) return null;

  const bgClass = fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-black border-nb-black/20';

  return (
    <div
      className={`absolute z-50 pointer-events-none border shadow-brutal max-w-xs min-w-[180px] p-2.5 space-y-1.5 ${bgClass}`}
      style={{ left: position.x + 8, top: position.y - 8 }}
    >
      {meta.summary && (
        <p className="text-[11px] text-nb-white/80 line-clamp-2">{meta.summary}</p>
      )}

      {meta.navDate && (
        <p className="text-[10px] text-nb-white/60">
          <span className="font-bold text-nb-white/40 mr-1">Date:</span>
          {new Date(meta.navDate).toLocaleDateString()}
        </p>
      )}

      {meta.duration != null && (
        <p className="text-[10px] text-nb-white/60">
          <span className="font-bold text-nb-white/40 mr-1">Duration:</span>
          {Math.floor(meta.duration / 60)}:{Math.floor(meta.duration % 60).toString().padStart(2, '0')}
        </p>
      )}

      {meta.canvasCount != null && (
        <p className="text-[10px] text-nb-white/60">
          <span className="font-bold text-nb-white/40 mr-1">Canvases:</span>
          {meta.canvasCount}
        </p>
      )}

      {meta.itemCount != null && (
        <p className="text-[10px] text-nb-white/60">
          <span className="font-bold text-nb-white/40 mr-1">Items:</span>
          {meta.itemCount}
        </p>
      )}

      {meta.metadataPreview && meta.metadataPreview.length > 0 && (
        <div className="border-t border-nb-white/10 pt-1.5 space-y-0.5">
          {meta.metadataPreview.map((m, i) => (
            <p key={i} className="text-[10px] text-nb-white/60 truncate">
              <span className="font-bold text-nb-white/40 mr-1">{m.key}:</span>
              {m.value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
