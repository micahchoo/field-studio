/**
 * TimeDisplay Atom
 *
 * Formatted time display for media playback (MM:SS / duration).
 * Replaces inline time formatting in MediaPlayer.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (pure function)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/TimeDisplay
 */

import React from 'react';
export interface TimeDisplayProps {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Format: 'short' (MM:SS) or 'long' (HH:MM:SS) */
  format?: 'short' | 'long';
  /** Whether to show duration separator (e.g., "3:45 / 10:00") */
  showDuration?: boolean;
  /** Separator between current time and duration */
  separator?: string;
  /** Additional CSS classes */
  className?: string;
  /** Field mode flag */
  fieldMode?: boolean;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
const formatTime = (seconds: number, format: 'short' | 'long'): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const minsStr = mins.toString().padStart(2, '0');
  const secsStr = secs.toString().padStart(2, '0');

  if (format === 'long' || hours > 0) {
    const hoursStr = hours.toString().padStart(2, '0');
    return `${hoursStr}:${minsStr}:${secsStr}`;
  }

  return `${mins}:${secsStr}`;
};

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  currentTime,
  duration,
  format = 'short',
  showDuration = true,
  separator = ' / ',
  className = '',
  fieldMode = false,
}) => {
  const textColor = fieldMode ? 'text-nb-yellow' : 'text-white';

  return (
    <span className={`text-sm font-mono whitespace-nowrap ${textColor} ${className}`}>
      <time dateTime={`PT${Math.floor(currentTime)}S`}>
        {formatTime(currentTime, format)}
      </time>
      {showDuration && (
        <>
          <span className="opacity-70">{separator}</span>
          <time dateTime={`PT${Math.floor(duration)}S`}>
            {formatTime(duration, format)}
          </time>
        </>
      )}
    </span>
  );
};

export default TimeDisplay;
