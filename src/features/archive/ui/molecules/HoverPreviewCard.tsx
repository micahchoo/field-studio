/**
 * HoverPreviewCard Molecule
 *
 * Rich preview card displayed on hover after 300ms delay.
 * Uses createPortal to avoid overflow clipping.
 *
 * @module features/archive/ui/molecules/HoverPreviewCard
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { getIIIFValue, type IIIFCanvas } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { type ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import { resolveHierarchicalThumbs } from '@/utils/imageSourceResolver';
import { getFileDNA } from '../../model';

export interface HoverPreviewCardProps {
  canvas: IIIFCanvas | null;
  visible: boolean;
  anchorRect: DOMRect | null;
  validationIssues?: ValidationIssue[];
  cx: Partial<ContextualClassNames>;
  fieldMode: boolean;
}

export const HoverPreviewCard: React.FC<HoverPreviewCardProps> = ({
  canvas,
  visible,
  anchorRect,
  validationIssues,
  cx,
  fieldMode,
}) => {
  if (!visible || !canvas || !anchorRect) return null;

  const label = getIIIFValue(canvas.label) || 'Untitled';
  const thumbUrls = resolveHierarchicalThumbs(canvas, 300);
  const thumbUrl = thumbUrls[0] || '';
  const dna = getFileDNA(canvas);

  // Metadata preview: first 3 key-value pairs
  const metaPreview = (canvas.metadata || []).slice(0, 3).map(m => ({
    key: getIIIFValue(m.label),
    value: getIIIFValue(m.value),
  }));

  // Position: right of anchor, flip left if overflow
  const cardWidth = 280;
  const gap = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = anchorRect.right + gap;
  if (left + cardWidth > viewportWidth) {
    left = anchorRect.left - cardWidth - gap;
  }
  let top = anchorRect.top;
  // Clamp vertically
  const estimatedHeight = 320;
  if (top + estimatedHeight > viewportHeight) {
    top = viewportHeight - estimatedHeight - 8;
  }
  if (top < 8) top = 8;

  const borderClass = fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/20';

  const errorCount = validationIssues?.filter(i => i.level === 'error').length || 0;
  const warnCount = validationIssues?.filter(i => i.level === 'warning').length || 0;

  return createPortal(
    <div
      className={`fixed z-[1100] border shadow-brutal-lg animate-in fade-in zoom-in-95 duration-150 pointer-events-none ${cx.surface ?? 'bg-nb-black'} ${borderClass}`}
      style={{ left, top, width: cardWidth }}
    >
      {/* Thumbnail */}
      {thumbUrl && (
        <div className="w-full h-40 overflow-hidden bg-nb-black">
          <img
            src={thumbUrl}
            alt=""
            className="w-full h-full object-contain"
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Label */}
        <div className={`text-sm font-bold truncate ${cx.text ?? 'text-white'}`}>{label}</div>

        {/* Type + Dimensions */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className={`px-1.5 py-0.5 font-medium uppercase ${
            fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-white/10 text-nb-white/60'
          }`}>
            {canvas.type}
          </span>
          {canvas.width && canvas.height && (
            <span className="text-nb-white/40 font-mono">
              {canvas.width} x {canvas.height}
            </span>
          )}
        </div>

        {/* NavDate */}
        {canvas.navDate && (
          <div className="text-[10px] text-nb-white/50">
            <span className="font-bold text-nb-white/30 mr-1">Date:</span>
            {new Date(canvas.navDate).toLocaleDateString()}
          </div>
        )}

        {/* DNA badges */}
        {(dna.hasTime || dna.hasLocation || dna.hasDevice) && (
          <div className="flex gap-1">
            {dna.hasTime && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-nb-orange/20 text-nb-orange">Time</span>
            )}
            {dna.hasLocation && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-nb-green/20 text-nb-green">GPS</span>
            )}
            {dna.hasDevice && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-sky-500/20 text-sky-400">Device</span>
            )}
          </div>
        )}

        {/* Metadata preview */}
        {metaPreview.length > 0 && (
          <div className="border-t border-nb-white/10 pt-2 space-y-0.5">
            {metaPreview.map((m, i) => (
              <div key={i} className="text-[10px] text-nb-white/50 truncate">
                <span className="font-bold text-nb-white/30 mr-1">{m.key}:</span>
                {m.value}
              </div>
            ))}
          </div>
        )}

        {/* Validation issues */}
        {(errorCount > 0 || warnCount > 0) && (
          <div className="flex items-center gap-2 text-[10px] pt-1 border-t border-nb-white/10">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-nb-red">
                <span className="w-1.5 h-1.5 rounded-full bg-nb-red" />
                {errorCount} error{errorCount !== 1 ? 's' : ''}
              </span>
            )}
            {warnCount > 0 && (
              <span className="flex items-center gap-1 text-nb-orange">
                <span className="w-1.5 h-1.5 rounded-full bg-nb-orange" />
                {warnCount} warning{warnCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default HoverPreviewCard;
