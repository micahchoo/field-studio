/**
 * ContinuousViewer Molecule
 *
 * Vertically stitched scroll of all canvases for `behavior: ['continuous']`.
 * Virtualized rendering — only renders canvases in/near viewport.
 * Respects viewingDirection for axis (vertical by default, horizontal for LTR/RTL).
 *
 * @module features/viewer/ui/molecules/ContinuousViewer
 */

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import type { IIIFCanvas } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';
import { resolveImageSource } from '@/src/entities/canvas/model/imageSourceResolver';

export interface ContinuousViewerProps {
  /** All canvases in the manifest */
  canvases: IIIFCanvas[];
  /** Currently active canvas ID (scroll target) */
  activeCanvasId?: string;
  /** Callback when a canvas scrolls into view */
  onCanvasInView?: (canvasId: string) => void;
  /** Gap between canvases in pixels */
  gap?: number;
  /** Whether to layout horizontally (for LTR/RTL viewingDirection) */
  horizontal?: boolean;
  /** Field mode styling */
  fieldMode?: boolean;
}

const OVERSCAN = 2; // number of canvases to render beyond viewport

export const ContinuousViewer: React.FC<ContinuousViewerProps> = ({
  canvases,
  activeCanvasId,
  onCanvasInView,
  gap = 4,
  horizontal = false,
  fieldMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(5, canvases.length) });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const canvasRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Track which canvases are visible for virtualization
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const canvasId = entry.target.getAttribute('data-canvas-id');
            if (canvasId && onCanvasInView) {
              onCanvasInView(canvasId);
            }
          }
        }

        // Update visible range for virtualization
        const visibleIds = entries
          .filter(e => e.isIntersecting)
          .map(e => e.target.getAttribute('data-canvas-id'))
          .filter(Boolean) as string[];

        if (visibleIds.length > 0) {
          const indices = visibleIds.map(id =>
            canvases.findIndex(c => c.id === id)
          ).filter(i => i >= 0);

          if (indices.length > 0) {
            const minIdx = Math.max(0, Math.min(...indices) - OVERSCAN);
            const maxIdx = Math.min(canvases.length, Math.max(...indices) + OVERSCAN + 1);
            setVisibleRange({ start: minIdx, end: maxIdx });
          }
        }
      },
      {
        root: containerRef.current,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [canvases, onCanvasInView]);

  // Observe canvas elements
  const setCanvasRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      canvasRefs.current.set(id, el);
      observerRef.current?.observe(el);
    } else {
      const existing = canvasRefs.current.get(id);
      if (existing) observerRef.current?.unobserve(existing);
      canvasRefs.current.delete(id);
    }
  }, []);

  // Scroll to active canvas
  useEffect(() => {
    if (!activeCanvasId) return;
    const el = canvasRefs.current.get(activeCanvasId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [activeCanvasId]);

  // Resolve thumbnail URLs
  const resolvedUrls = useMemo(() => {
    const map: Record<string, string> = {};
    for (const canvas of canvases) {
      try {
        const resolved = resolveImageSource(canvas);
        if (resolved?.url) map[canvas.id] = resolved.url;
      } catch {
        // Skip
      }
    }
    return map;
  }, [canvases]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-auto ${
        horizontal ? 'flex flex-row' : 'flex flex-col'
      } ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}
      style={{ gap: `${gap}px` }}
    >
      {canvases.map((canvas, index) => {
        const isInRange = index >= visibleRange.start && index < visibleRange.end;
        const isActive = canvas.id === activeCanvasId;
        const url = resolvedUrls[canvas.id];

        // Estimate dimensions based on canvas aspect ratio
        const aspect = canvas.width && canvas.height ? canvas.width / canvas.height : 1;

        return (
          <div
            key={canvas.id}
            ref={(el) => setCanvasRef(canvas.id, el)}
            data-canvas-id={canvas.id}
            className={`shrink-0 relative ${
              isActive
                ? fieldMode
                  ? 'ring-2 ring-nb-yellow/50'
                  : 'ring-2 ring-nb-blue/50'
                : ''
            }`}
            style={horizontal
              ? { height: '100%', width: `${100 * aspect}%`, maxWidth: '90vw' }
              : { width: '100%', aspectRatio: `${aspect}` }
            }
          >
            {isInRange && url ? (
              <img
                src={url}
                alt={getIIIFValue(canvas.label) || `Canvas ${index + 1}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
              }`}>
                <span className={`text-xs ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>
                  {getIIIFValue(canvas.label) || `Canvas ${index + 1}`}
                </span>
              </div>
            )}

            {/* Canvas label overlay */}
            <div className={`absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] ${
              fieldMode
                ? 'bg-nb-black/60 text-nb-black/40'
                : 'bg-nb-white/60 text-nb-black/50'
            }`}>
              {index + 1}. {getIIIFValue(canvas.label) || 'Untitled'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContinuousViewer;
