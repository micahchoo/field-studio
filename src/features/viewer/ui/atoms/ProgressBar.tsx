/**
 * ProgressBar Atom
 *
 * Seekable progress bar with buffer indicator for media playback.
 * Replaces inline progress controls in MediaPlayer.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (controlled by parent)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/ProgressBar
 */

import React, { useCallback, useRef } from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface ProgressBarProps {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Callback when user seeks to a new time */
  onSeek: (time: number) => void;
  /** Buffer progress (0-1) - optional */
  buffered?: number;
  /** Height of the progress bar */
  height?: string;
  /** Whether to show the scrubber handle */
  showHandle?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  buffered = 0,
  height = '0.25rem',
  showHandle = true,
  className = '',
  cx: _cx,
  fieldMode = false,
}) => {
  const progressRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = buffered * 100;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || duration <= 0) return;

      const rect = progressRef.current.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const newTime = Math.max(0, Math.min(duration, clickPosition * duration));
      onSeek(newTime);
    },
    [duration, onSeek]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (duration <= 0) return;

      const seekStep = duration / 20; // 5% increments

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onSeek(Math.max(0, currentTime - seekStep));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onSeek(Math.min(duration, currentTime + seekStep));
          break;
        case 'Home':
          e.preventDefault();
          onSeek(0);
          break;
        case 'End':
          e.preventDefault();
          onSeek(duration);
          break;
      }
    },
    [currentTime, duration, onSeek]
  );

  const trackBg = fieldMode ? 'bg-slate-600' : 'bg-white/30';
  const progressBg = fieldMode ? 'bg-yellow-500' : 'bg-blue-500';
  const bufferBg = fieldMode ? 'bg-slate-500' : 'bg-white/20';
  const handleColor = fieldMode ? 'bg-yellow-300' : 'bg-white';

  return (
    <div
      ref={progressRef}
      className={`relative rounded-full cursor-pointer group ${trackBg} ${className}`}
      style={{ height }}
      onClick={handleClick}
      role="slider"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Seek"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Buffered progress */}
      {buffered > 0 && (
        <div
          className={`absolute top-0 left-0 h-full rounded-full ${bufferBg}`}
          style={{ width: `${bufferPercent}%` }}
        />
      )}

      {/* Playback progress */}
      <div
        className={`absolute top-0 left-0 h-full rounded-full ${progressBg} transition-all duration-75`}
        style={{ width: `${progress}%` }}
      >
        {/* Scrubber handle */}
        {showHandle && (
          <div
            className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${handleColor} opacity-0 group-hover:opacity-100 transition-opacity shadow-md`}
            style={{ transform: 'translate(50%, -50%)' }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
