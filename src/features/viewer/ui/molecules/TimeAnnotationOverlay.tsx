/**
 * TimeAnnotationOverlay Molecule
 *
 * Time-based annotation tool for audio/video content.
 * Allows users to mark time ranges on the progress bar and add annotations.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props
 * - Uses useTimeAnnotation hook for annotation logic
 * - Integrates with MediaPlayer progress bar
 *
 * @see https://www.w3.org/TR/media-frags/ - W3C Media Fragments
 * @module features/viewer/ui/molecules/TimeAnnotationOverlay
 */

import React, { useCallback, useRef, useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { IIIFAnnotation } from '@/src/shared/types';
import {
  formatTimeForDisplay,
  getAnnotationTimeRange,
  isTimeBasedAnnotation,
  type TimeRange,
  useTimeAnnotation,
} from '../../model/annotation';

export interface TimeAnnotationOverlayProps {
  /** Canvas ID for creating annotations */
  canvasId: string;
  /** Total duration in seconds */
  duration: number;
  /** Current playback time in seconds */
  currentTime: number;
  /** Callback to seek to a specific time */
  onSeek: (time: number) => void;
  /** Whether annotation mode is active */
  isActive: boolean;
  /** Callback to toggle annotation mode */
  onToggle: (active: boolean) => void;
  /** Callback when annotation is created */
  onCreateAnnotation: (annotation: IIIFAnnotation) => void;
  /** Existing annotations to display */
  existingAnnotations: IIIFAnnotation[];
  /** Callback to expose save function to parent */
  onSaveRef?: (fn: () => void) => void;
  /** Callback to expose clear function to parent */
  onClearRef?: (fn: () => void) => void;
  /** Contextual styles */
  cx?: ContextualClassNames | Record<string, string>;
  /** Field mode flag */
  fieldMode?: boolean;
}

/**
 * TimeAnnotationOverlay
 *
 * Renders time-based annotation controls for audio/video content
 */
export const TimeAnnotationOverlay: React.FC<TimeAnnotationOverlayProps> = ({
  canvasId,
  duration,
  currentTime,
  onSeek,
  isActive,
  onToggle,
  onCreateAnnotation,
  existingAnnotations,
  onSaveRef,
  onClearRef,
  cx,
  fieldMode = false,
}) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<IIIFAnnotation | null>(null);

  const {
    timeRange,
    isSelecting,
    hasStart,
    annotationText,
    motivation,
    canSave,
    existingTimeAnnotations,
    setStartTime,
    setEndTime,
    setTimeRange,
    setAnnotationText,
    setMotivation,
    handleClear,
    handleSave,
  } = useTimeAnnotation(canvasId, duration, existingAnnotations, onCreateAnnotation);

  // Expose save/clear to parent
  React.useEffect(() => {
    onSaveRef?.(handleSave);
  }, [onSaveRef, handleSave]);

  React.useEffect(() => {
    onClearRef?.(handleClear);
  }, [onClearRef, handleClear]);

  // Convert click position to time
  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!progressRef.current || duration === 0) return 0;

    const rect = progressRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percentage * duration;
  }, [duration]);

  // Handle clicks on the annotation progress bar
  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    if (!isActive) return;

    const time = getTimeFromPosition(e.clientX);

    if (!hasStart) {
      // Set start time
      setStartTime(time);
    } else if (isSelecting) {
      // Set end time
      setEndTime(time);
    }
  }, [isActive, hasStart, isSelecting, getTimeFromPosition, setStartTime, setEndTime]);

  // Handle "Use Current Time" buttons
  const handleSetStartFromCurrent = useCallback(() => {
    setStartTime(currentTime);
  }, [currentTime, setStartTime]);

  const handleSetEndFromCurrent = useCallback(() => {
    if (hasStart) {
      setEndTime(currentTime);
    }
  }, [currentTime, hasStart, setEndTime]);

  // Calculate percentage for display
  const timeToPercent = (time: number) => (time / duration) * 100;

  const accentColor = fieldMode ? 'rgb(234, 179, 8)' : 'rgb(34, 197, 94)';
  const accentBg = fieldMode ? 'bg-nb-yellow' : 'bg-nb-green';
  const accentBgFaded = fieldMode ? 'bg-nb-yellow/30' : 'bg-nb-green/30';
  const textColor = fieldMode ? 'text-nb-yellow' : 'text-nb-green';

  if (!isActive) {
    return (
      <IconButton
        icon="add_comment"
        ariaLabel="Add time annotation"
        onClick={() => onToggle(true)}
        variant="ghost"
        size="md"
        className="!text-white hover:!text-nb-blue"
        fieldMode={fieldMode}
      />
    );
  }

  return (
    <div className="relative">
      {/* Annotation Progress Bar */}
      <div
        ref={progressRef}
        className={`
          relative h-8 cursor-crosshair
          ${fieldMode ? 'bg-nb-black' : 'bg-nb-black/80'}
          border ${fieldMode ? 'border-nb-yellow/50' : 'border-nb-black/60'}
        `}
        onClick={handleProgressClick}
      >
        {/* Existing time annotations */}
        {existingTimeAnnotations.map((anno) => {
          const range = getAnnotationTimeRange(anno);
          if (!range) return null;

          const startPercent = timeToPercent(range.start);
          const endPercent = range.end !== undefined ? timeToPercent(range.end) : startPercent + 0.5;
          const width = Math.max(0.5, endPercent - startPercent);

          return (
            <div
              key={anno.id}
              className={`
                absolute top-1 bottom-1  cursor-pointer transition-nb
                ${hoveredAnnotation?.id === anno.id ? 'opacity-100 ring-2 ring-nb-blue' : 'opacity-70'}
                bg-nb-blue/50 hover:bg-nb-blue/70
              `}
              style={{
                left: `${startPercent}%`,
                width: `${width}%`,
              }}
              onMouseEnter={() => setHoveredAnnotation(anno)}
              onMouseLeave={() => setHoveredAnnotation(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(range.start);
              }}
              title={`${formatTimeForDisplay(range.start)}${range.end !== undefined ? ` - ${formatTimeForDisplay(range.end)}` : ''}`}
            />
          );
        })}

        {/* Current selection */}
        {timeRange && (
          <div
            className={`absolute top-1 bottom-1 ${accentBgFaded} border-2 ${fieldMode ? 'border-nb-yellow' : 'border-nb-green'}`}
            style={{
              left: `${timeToPercent(timeRange.start)}%`,
              width: `${timeRange.end !== undefined ? timeToPercent(timeRange.end) - timeToPercent(timeRange.start) : 0.5}%`,
            }}
          />
        )}

        {/* Current playback position indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-nb-white/80"
          style={{ left: `${timeToPercent(currentTime)}%` }}
        />

        {/* Instructions */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-xs font-medium ${fieldMode ? 'text-nb-yellow/70' : 'text-white/50'}`}>
            {!hasStart ? 'Click to set start time' :
             isSelecting ? 'Click to set end time' :
             'Range selected'}
          </span>
        </div>
      </div>

      {/* Annotation Form */}
      {timeRange && (
        <div className={`
          mt-3 p-3 
          ${fieldMode ? 'bg-nb-black border border-nb-yellow/50' : 'bg-nb-black/80 border border-nb-black/60'}
        `}>
          {/* Time Range Display */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${fieldMode ? 'text-nb-yellow' : 'text-nb-green'}`}>
                Start:
              </span>
              <span className="text-sm text-white font-mono">
                {formatTimeForDisplay(timeRange.start)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSetStartFromCurrent}
                className={`text-xs ${fieldMode ? 'text-nb-yellow hover:text-nb-yellow' : 'text-nb-blue hover:text-nb-blue/60'}`}
              >
                Use current
              </Button>
            </div>
            {timeRange.end !== undefined && (
              <>
                <span className="text-nb-black/40">→</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${fieldMode ? 'text-nb-yellow' : 'text-nb-green'}`}>
                    End:
                  </span>
                  <span className="text-sm text-white font-mono">
                    {formatTimeForDisplay(timeRange.end)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSetEndFromCurrent}
                    className={`text-xs ${fieldMode ? 'text-nb-yellow hover:text-nb-yellow' : 'text-nb-blue hover:text-nb-blue/60'}`}
                  >
                    Use current
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Motivation Selector */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-nb-black/40">Purpose:</span>
            {(['commenting', 'tagging', 'describing'] as const).map((mot) => (
              <Button
                key={mot}
                variant={motivation === mot ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setMotivation(mot)}
                className={motivation === mot ? '' : 'text-nb-black/40'}
              >
                {mot}
              </Button>
            ))}
          </div>

          {/* Annotation Text */}
          <textarea
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Enter your annotation..."
            rows={2}
            className={`
              w-full text-sm p-2 border
              ${fieldMode ? 'bg-nb-black border-nb-yellow/50 text-white placeholder-yellow-400/30' : 'bg-nb-black border-nb-black/60 text-white placeholder-nb-black/50'}
              focus:outline-none focus:ring-2 ${fieldMode ? 'focus:ring-nb-yellow/50' : 'focus:ring-nb-blue/50'}
            `}
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleClear();
                onToggle(false);
              }}
              className="text-nb-black/40 hover:text-white"
            >
              <Icon name="close" className="mr-1" />
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-nb-black/40 hover:text-white"
              >
                <Icon name="refresh" className="mr-1" />
                Clear
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  handleSave();
                }}
                disabled={!canSave}
                className={!canSave ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <Icon name="check" className="mr-1" />
                Save Annotation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hovered Annotation Tooltip */}
      {hoveredAnnotation && (
        <div className={`
          absolute -top-20 left-1/2 -translate-x-1/2 z-50
          max-w-xs p-2  shadow-brutal
          ${fieldMode ? 'bg-nb-black border border-nb-yellow/50' : 'bg-nb-black border border-nb-black/60'}
        `}>
          <p className="text-sm text-white">
            {(hoveredAnnotation.body as { value?: string })?.value || 'Annotation'}
          </p>
          <p className={`text-xs mt-1 ${fieldMode ? 'text-nb-yellow/70' : 'text-nb-black/40'}`}>
            {(() => {
              const range = getAnnotationTimeRange(hoveredAnnotation);
              if (!range) return '';
              return range.end !== undefined
                ? `${formatTimeForDisplay(range.start)} - ${formatTimeForDisplay(range.end)}`
                : formatTimeForDisplay(range.start);
            })()}
          </p>
        </div>
      )}
    </div>
  );
};

export default TimeAnnotationOverlay;
