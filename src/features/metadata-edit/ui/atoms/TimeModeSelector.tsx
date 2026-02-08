/**
 * TimeModeSelector Atom
 *
 * Radio group for selecting annotation timeMode: Trim, Scale, or Loop.
 * Shows in the Annotations tab when annotation targets time-based canvas.
 *
 * @see https://iiif.io/api/presentation/3.0/#timemode
 * @module features/metadata-edit/ui/atoms/TimeModeSelector
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { FormInput } from '@/src/shared/ui/molecules/FormInput';

export type TimeMode = 'trim' | 'scale' | 'loop';

export interface TimeModeSelectorProps {
  /** Current time mode */
  value: TimeMode;
  /** Called when mode changes */
  onChange: (mode: TimeMode) => void;
  /** Annotation time range for display */
  timeRange?: { start: number; end?: number };
  /** Canvas duration in seconds */
  canvasDuration?: number;
  /** Loop count (0 = infinite) */
  loopCount?: number;
  /** Called when loop count changes */
  onLoopCountChange?: (count: number) => void;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Whether editing is disabled */
  disabled?: boolean;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const TimeModeSelector: React.FC<TimeModeSelectorProps> = ({
  value,
  onChange,
  timeRange,
  canvasDuration,
  loopCount = 0,
  onLoopCountChange,
  fieldMode = false,
  disabled = false,
}) => {
  // Calculate playback rate for Scale mode
  const annotationDuration = timeRange
    ? (timeRange.end ?? timeRange.start) - timeRange.start
    : 0;
  const playbackRate = canvasDuration && annotationDuration > 0
    ? (canvasDuration / annotationDuration).toFixed(2)
    : '1.00';

  const options: Array<{ mode: TimeMode; icon: string; label: string; description: string }> = [
    {
      mode: 'trim',
      icon: 'content_cut',
      label: 'Trim',
      description: timeRange
        ? `${formatTime(timeRange.start)} to ${formatTime(timeRange.end ?? timeRange.start)}`
        : 'Play only the annotated segment',
    },
    {
      mode: 'scale',
      icon: 'speed',
      label: 'Scale',
      description: `Playback rate: ${playbackRate}x`,
    },
    {
      mode: 'loop',
      icon: 'repeat',
      label: 'Loop',
      description: loopCount === 0 ? 'Loop indefinitely' : `Loop ${loopCount} times`,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon
          name="timer"
          className={`text-sm ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}
        />
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'
        }`}>
          Time Mode
        </span>
      </div>

      <div className="space-y-1" role="radiogroup" aria-label="Time mode selection">
        {options.map(opt => {
          const isActive = value === opt.mode;
          return (
            <button
              key={opt.mode}
              role="radio"
              aria-checked={isActive}
              disabled={disabled}
              onClick={() => onChange(opt.mode)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 border text-left transition-nb ${
                isActive
                  ? fieldMode
                    ? 'border-nb-yellow bg-nb-yellow/20 text-white'
                    : 'border-nb-blue/40 bg-nb-blue/10 text-nb-blue'
                  : fieldMode
                    ? 'border-nb-black/80 bg-nb-black/30 text-nb-black/40 hover:bg-nb-black'
                    : 'border-nb-black/20 bg-nb-white text-nb-black/50 hover:bg-nb-white'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`w-3.5 h-3.5 border-2 flex items-center justify-center shrink-0 ${
                isActive
                  ? fieldMode ? 'border-nb-yellow' : 'border-nb-blue'
                  : fieldMode ? 'border-nb-black/60' : 'border-nb-black/20'
              }`}>
                {isActive && (
                  <span className={`w-1.5 h-1.5 ${
                    fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue'
                  }`} />
                )}
              </span>
              <Icon name={opt.icon} className="text-base" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{opt.label}</div>
                <div className={`text-xs ${
                  isActive
                    ? fieldMode ? 'text-nb-yellow/60' : 'text-nb-blue'
                    : fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'
                }`}>
                  {opt.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Loop count input (only shown when loop mode active) */}
      {value === 'loop' && onLoopCountChange && !disabled && (
        <div className="pl-9">
          <FormInput
            value={loopCount}
            onChange={(v) => onLoopCountChange(parseInt(v, 10) || 0)}
            type="number"
            label="Loop count (0 = infinite)"
            min={0}
            max={100}
            fieldMode={fieldMode}
          />
        </div>
      )}
    </div>
  );
};

export default TimeModeSelector;
