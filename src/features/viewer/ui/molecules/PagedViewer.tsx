/**
 * PagedViewer Molecule
 *
 * Book spread with facing pages for `behavior: ['paged']`.
 * First canvas solo (recto), then paired spreads.
 * Respects non-paged and facing-pages canvas behaviors.
 *
 * @module features/viewer/ui/molecules/PagedViewer
 */

import React, { useMemo, useCallback, useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import type { IIIFCanvas } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';
import { resolveImageSource } from '@/src/entities/canvas/model/imageSourceResolver';

export interface PagedViewerProps {
  /** All canvases in the manifest */
  canvases: IIIFCanvas[];
  /** Canvas IDs with non-paged behavior (skipped in sequence) */
  nonPaged?: Set<string>;
  /** Canvas IDs with facing-pages behavior (shown solo as full opening) */
  facingPages?: Set<string>;
  /** Whether reading direction is RTL */
  isRTL?: boolean;
  /** Currently active canvas ID */
  activeCanvasId?: string;
  /** Callback when page changes */
  onPageChange?: (canvasIds: string[]) => void;
  /** Field mode styling */
  fieldMode?: boolean;
}

interface PageSpread {
  /** Index in spread sequence */
  index: number;
  /** Left (verso) canvas or null for single-page spreads */
  verso: IIIFCanvas | null;
  /** Right (recto) canvas or null */
  recto: IIIFCanvas | null;
}

export const PagedViewer: React.FC<PagedViewerProps> = ({
  canvases,
  nonPaged = new Set(),
  facingPages = new Set(),
  isRTL = false,
  activeCanvasId,
  onPageChange,
  fieldMode = false,
}) => {
  // Build page spreads from canvas sequence
  const spreads = useMemo(() => {
    const pagedCanvases = canvases.filter(c => !nonPaged.has(c.id));
    const result: PageSpread[] = [];
    let i = 0;

    while (i < pagedCanvases.length) {
      const canvas = pagedCanvases[i];

      // First canvas is always solo (recto only)
      if (i === 0) {
        result.push({
          index: result.length,
          verso: null,
          recto: canvas,
        });
        i++;
        continue;
      }

      // Facing-pages canvas is shown solo (it depicts full opening)
      if (facingPages.has(canvas.id)) {
        result.push({
          index: result.length,
          verso: canvas,
          recto: null,
        });
        i++;
        continue;
      }

      // Pair two canvases as verso/recto
      const next = i + 1 < pagedCanvases.length ? pagedCanvases[i + 1] : null;
      if (next && !facingPages.has(next.id)) {
        result.push({
          index: result.length,
          verso: canvas,
          recto: next,
        });
        i += 2;
      } else {
        result.push({
          index: result.length,
          verso: canvas,
          recto: null,
        });
        i++;
      }
    }

    return result;
  }, [canvases, nonPaged, facingPages]);

  // Find current spread from active canvas
  const activeSpreadIndex = useMemo(() => {
    if (!activeCanvasId) return 0;
    const idx = spreads.findIndex(
      s => s.verso?.id === activeCanvasId || s.recto?.id === activeCanvasId
    );
    return idx >= 0 ? idx : 0;
  }, [spreads, activeCanvasId]);

  const [currentIndex, setCurrentIndex] = useState(activeSpreadIndex);
  const spread = spreads[currentIndex] || spreads[0];

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, spreads.length - 1));
    setCurrentIndex(clamped);
    const s = spreads[clamped];
    if (s && onPageChange) {
      const ids = [s.verso?.id, s.recto?.id].filter(Boolean) as string[];
      onPageChange(ids);
    }
  }, [spreads, onPageChange]);

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  // Resolve image URLs
  const resolveUrl = useCallback((canvas: IIIFCanvas | null): string | null => {
    if (!canvas) return null;
    try {
      const resolved = resolveImageSource(canvas);
      return resolved?.url || null;
    } catch {
      return null;
    }
  }, []);

  if (!spread) return null;

  const versoCanvas = isRTL ? spread.recto : spread.verso;
  const rectoCanvas = isRTL ? spread.verso : spread.recto;

  return (
    <div className={`flex-1 flex flex-col ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}>
      {/* Spread area */}
      <div className="flex-1 flex items-center justify-center p-4 gap-1">
        {/* Verso (left page) */}
        <div className="flex-1 h-full flex items-center justify-end">
          {versoCanvas ? (
            <PageImage
              canvas={versoCanvas}
              url={resolveUrl(versoCanvas)}
              side="verso"
              fieldMode={fieldMode}
            />
          ) : (
            <div className="w-full max-w-md" />
          )}
        </div>

        {/* Spine divider */}
        {versoCanvas && rectoCanvas && (
          <div className={`w-px h-3/4 ${fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream'}`} />
        )}

        {/* Recto (right page) */}
        <div className="flex-1 h-full flex items-center justify-start">
          {rectoCanvas ? (
            <PageImage
              canvas={rectoCanvas}
              url={resolveUrl(rectoCanvas)}
              side="recto"
              fieldMode={fieldMode}
            />
          ) : (
            <div className="w-full max-w-md" />
          )}
        </div>
      </div>

      {/* Navigation footer */}
      <div className={`flex items-center justify-center gap-4 px-4 py-2.5 border-t ${
        fieldMode
          ? 'border-nb-black bg-nb-black'
          : 'border-nb-black/20 bg-nb-white'
      }`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={goPrev}
          disabled={currentIndex <= 0}
          icon={<Icon name={isRTL ? 'chevron_right' : 'chevron_left'} className="text-lg" />}
          aria-label="Previous spread"
        />

        <span className={`text-sm tabular-nums ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/60'}`}>
          Pages {currentIndex * 2 + 1}–{Math.min((currentIndex + 1) * 2, canvases.length)} of {canvases.length}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={goNext}
          disabled={currentIndex >= spreads.length - 1}
          icon={<Icon name={isRTL ? 'chevron_left' : 'chevron_right'} className="text-lg" />}
          aria-label="Next spread"
        />
      </div>
    </div>
  );
};

// ============================================================================
// Sub-component
// ============================================================================

interface PageImageProps {
  canvas: IIIFCanvas;
  url: string | null;
  side: 'verso' | 'recto';
  fieldMode: boolean;
}

const PageImage: React.FC<PageImageProps> = ({ canvas, url, side, fieldMode }) => {
  return (
    <div className={`relative h-full max-w-md flex flex-col items-center justify-center ${
      side === 'verso' ? 'ml-auto' : 'mr-auto'
    }`}>
      {url ? (
        <img
          src={url}
          alt={getIIIFValue(canvas.label) || `Page`}
          className={`max-h-full max-w-full object-contain shadow-brutal ${
            side === 'verso' ? 'rounded-l-sm' : 'rounded-r-sm'
          }`}
          loading="lazy"
        />
      ) : (
        <div className={`w-64 h-96 flex items-center justify-center ${
          fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
        }`}>
          <Icon name="image" className={`text-3xl ${fieldMode ? 'text-nb-black/80' : 'text-nb-black/30'}`} />
        </div>
      )}
      <div className={`mt-1 text-[10px] ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>
        {getIIIFValue(canvas.label) || 'Untitled'}
      </div>
    </div>
  );
};

export default PagedViewer;
