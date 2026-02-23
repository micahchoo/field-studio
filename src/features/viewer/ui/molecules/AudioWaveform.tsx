/**
 * AudioWaveform Molecule
 *
 * Visual waveform display for audio content using WaveSurfer.js.
 * Renders waveform with time annotation regions, timeline, and
 * integrated transport controls.
 *
 * @module features/viewer/ui/molecules/AudioWaveform
 */

import React, { useRef } from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules/IconButton';
import {
  PlayPauseButton,
  TimeDisplay,
  VolumeControl,
  PlaybackRateSelect,
  MediaControlGroup,
} from '@/src/features/viewer/ui/atoms';
import { useWaveform } from '../../model/useWaveform';
import { formatTimeForDisplay } from '../../model/annotation';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';
import type { TimeRange } from '../../model/annotation';

export interface AudioWaveformProps {
  canvas: IIIFCanvas;
  src: string;
  annotations?: IIIFAnnotation[];
  annotationModeActive?: boolean;
  onAnnotationModeToggle?: (active: boolean) => void;
  timeRange?: TimeRange | null;
  onTimeRangeChange?: (range: TimeRange | null) => void;
  onTimeUpdate?: (time: number) => void;
  cx?: ContextualClassNames;
  fieldMode?: boolean;
  className?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  canvas,
  src,
  annotations = [],
  annotationModeActive = false,
  timeRange,
  onTimeRangeChange,
  onTimeUpdate,
  cx,
  fieldMode = false,
  className = '',
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const {
    isReady,
    isLoading,
    currentTime,
    duration,
    isPlaying,
    togglePlayPause,
    seek,
    setVolume,
    setPlaybackRate,
  } = useWaveform({
    src,
    containerRef: waveformRef,
    timelineRef,
    annotations,
    annotationMode: annotationModeActive,
    fieldMode,
    onTimeRangeChange,
    onTimeUpdate,
  });

  const canvasLabel = getIIIFValue(canvas.label) || 'Audio';

  return (
    <div className={`flex flex-col bg-nb-black w-full h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon name="audiotrack" className={`text-2xl ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-white/40'}`} />
        <div>
          <p className={`text-sm font-medium ${fieldMode ? 'text-nb-yellow' : 'text-nb-white'}`}>{canvasLabel}</p>
          {duration > 0 && (
            <p className="text-xs text-nb-white/40">
              {formatTimeForDisplay(duration)}
            </p>
          )}
        </div>
      </div>

      {/* Waveform */}
      <div className="flex-1 flex flex-col justify-center px-4">
        <div
          ref={waveformRef}
          className={`w-full transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}
          style={{ minHeight: '120px' }}
        />

        {/* Timeline */}
        <div ref={timelineRef} className="w-full mt-1" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Icon name="hourglass_empty" className={`text-xl animate-spin ${fieldMode ? 'text-nb-yellow/40' : 'text-nb-white/30'}`} />
            <span className="text-xs text-nb-white/30 ml-2">Loading waveform...</span>
          </div>
        )}
      </div>

      {/* Annotation range indicator */}
      {annotationModeActive && timeRange && (
        <div className={`flex items-center justify-center py-1 text-xs ${fieldMode ? 'text-nb-yellow' : 'text-nb-green'}`}>
          Selected: {formatTimeForDisplay(timeRange.start)}
          {timeRange.end !== undefined && ` - ${formatTimeForDisplay(timeRange.end)}`}
        </div>
      )}

      {/* Controls */}
      <div className="p-4 border-t border-nb-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MediaControlGroup gap="sm" fieldMode={fieldMode}>
            <PlayPauseButton isPlaying={isPlaying} onToggle={togglePlayPause} fieldMode={fieldMode} />
            <IconButton
              icon="replay_10"
              ariaLabel="Rewind 10s"
              onClick={() => seek(Math.max(0, currentTime - 10))}
              variant="ghost" size="sm"
              className="!text-white hover:!text-nb-blue"
              fieldMode={fieldMode}
            />
            <IconButton
              icon="forward_10"
              ariaLabel="Forward 10s"
              onClick={() => seek(Math.min(duration, currentTime + 10))}
              variant="ghost" size="sm"
              className="!text-white hover:!text-nb-blue"
              fieldMode={fieldMode}
            />
            <TimeDisplay currentTime={currentTime} duration={duration} fieldMode={fieldMode} />
          </MediaControlGroup>

          <MediaControlGroup gap="sm" fieldMode={fieldMode}>
            <PlaybackRateSelect
              value={1}
              onChange={setPlaybackRate}
              fieldMode={fieldMode}
              cx={cx}
            />
            <VolumeControl
              volume={1}
              isMuted={false}
              onVolumeChange={setVolume}
              onMuteToggle={() => {}}
              sliderWidth="4rem"
              fieldMode={fieldMode}
            />
          </MediaControlGroup>
        </div>
      </div>
    </div>
  );
};

export default AudioWaveform;
