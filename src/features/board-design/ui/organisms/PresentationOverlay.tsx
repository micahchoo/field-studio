/**
 * PresentationOverlay Organism
 *
 * Fullscreen overlay for board presentation/slideshow mode.
 *
 * @module features/board-design/ui/organisms/PresentationOverlay
 */

import React from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import type { BoardItem } from '../../model';
import { formatDuration } from '../../model';

export interface PresentationOverlayProps {
  currentItem: BoardItem | null;
  currentIndex: number;
  totalSlides: number;
  isAutoAdvancing: boolean;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
  onToggleAutoAdvance: () => void;
  onGoTo: (index: number) => void;
}

export const PresentationOverlay: React.FC<PresentationOverlayProps> = ({
  currentItem,
  currentIndex,
  totalSlides,
  isAutoAdvancing,
  onNext,
  onPrev,
  onExit,
  onToggleAutoAdvance,
}) => {
  if (!currentItem) return null;

  const meta = currentItem.meta;

  return (
    <div className="fixed inset-0 z-50 bg-nb-black flex flex-col">
      {/* Close button (top-right) */}
      <div className="absolute top-4 right-4 z-10">
        <Button variant="ghost" size="bare" onClick={onExit} className="p-2 text-nb-white/60 hover:text-nb-white">
          <Icon name="close" className="text-2xl" />
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="max-w-4xl w-full flex flex-col items-center gap-6">
          {/* Thumbnail */}
          {currentItem.blobUrl ? (
            <img
              src={currentItem.blobUrl}
              alt={currentItem.label}
              className="max-h-[60vh] max-w-full object-contain shadow-brutal border-2 border-nb-white/20"
            />
          ) : (
            <div className="w-64 h-48 bg-nb-black/80 border-2 border-nb-white/10 flex items-center justify-center">
              <Icon name={currentItem.isNote ? 'sticky_note_2' : 'image'} className="text-5xl text-nb-white/20" />
            </div>
          )}

          {/* Label */}
          <h2 className="text-2xl font-bold text-nb-white text-center">{currentItem.label}</h2>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-nb-white/50">
            {meta?.summary && (
              <p className="max-w-lg text-center text-nb-white/40">{meta.summary}</p>
            )}
            {meta?.navDate && (
              <span>{new Date(meta.navDate).toLocaleDateString()}</span>
            )}
            {meta?.duration != null && (
              <span>{formatDuration(meta.duration)}</span>
            )}
            {meta?.canvasCount != null && (
              <span>{meta.canvasCount} canvases</span>
            )}
          </div>

          {/* Note content */}
          {currentItem.isNote && currentItem.annotation && (
            <p className="text-lg text-nb-white/70 max-w-2xl text-center leading-relaxed">
              {currentItem.annotation}
            </p>
          )}
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div className="flex items-center justify-center gap-4 p-4 bg-nb-black/80 border-t border-nb-white/10">
        <Button variant="ghost" size="bare"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="p-2 text-nb-white/60 hover:text-nb-white disabled:opacity-30"
        >
          <Icon name="chevron_left" className="text-2xl" />
        </Button>

        <span className="text-sm text-nb-white/60 font-medium min-w-[80px] text-center">
          {currentIndex + 1} of {totalSlides}
        </span>

        <Button variant="ghost" size="bare"
          onClick={onNext}
          disabled={currentIndex >= totalSlides - 1}
          className="p-2 text-nb-white/60 hover:text-nb-white disabled:opacity-30"
        >
          <Icon name="chevron_right" className="text-2xl" />
        </Button>

        <div className="w-px h-6 bg-nb-white/20 mx-2" />

        <Button variant="ghost" size="bare"
          onClick={onToggleAutoAdvance}
          className={`p-2 ${isAutoAdvancing ? 'text-nb-orange' : 'text-nb-white/60 hover:text-nb-white'}`}
          title={isAutoAdvancing ? 'Stop auto-advance' : 'Auto-advance (5s)'}
        >
          <Icon name={isAutoAdvancing ? 'pause' : 'play_arrow'} className="text-xl" />
        </Button>
      </div>
    </div>
  );
};
