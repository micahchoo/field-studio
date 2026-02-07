/**
 * MediaPlayer Molecule
 *
 * Advanced IIIF-compliant audio/video player with full Presentation API 3.0 support:
 * - placeholderCanvas: Poster frames / loading placeholders
 * - accompanyingCanvas: Transcripts, subtitles, synchronized content
 * - timeMode behaviors: trim, scale, loop
 * - Sync points for timed text display
 * - Time-based annotations (W3C Media Fragments) - controlled via Inspector
 *
 * @module features/viewer/ui/molecules/MediaPlayer
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FullscreenButton,
  MediaControlGroup,
  MediaErrorOverlay,
  MediaLoadingOverlay,
  PlaybackRateSelect,
  PlayPauseButton,
  TimeDisplay,
  VolumeControl,
} from '@/src/features/viewer/ui/atoms';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules';
import { useMediaPlayer, type TimeRange, formatTimeForDisplay, getAnnotationTimeRange, isTimeBasedAnnotation } from '@/src/features/viewer/model';
import { avService, type AVCanvas, type SyncPoint } from '@/src/entities/canvas/model/avService';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { IIIFAnnotation, IIIFCanvas } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

export interface MediaPlayerProps {
  canvas: IIIFCanvas;
  src: string;
  mediaType: 'audio' | 'video';
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  /** Show accompanying content panel (transcripts, etc.) */
  showAccompanying?: boolean;
  /** Existing annotations on this canvas */
  annotations?: IIIFAnnotation[];
  /** Whether annotation mode is active (controlled externally) */
  annotationModeActive?: boolean;
  /** Callback when annotation mode is toggled */
  onAnnotationModeToggle?: (active: boolean) => void;
  /** Current time range selection for annotation (controlled from Inspector) */
  timeRange?: TimeRange | null;
  /** Callback when user selects time on progress bar */
  onTimeRangeChange?: (range: TimeRange | null) => void;
  /** Callback to report current playback time to parent */
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  className?: string;
  cx?: ContextualClassNames | Record<string, string>;
  fieldMode?: boolean;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  canvas,
  src,
  mediaType,
  poster,
  autoPlay = false,
  muted = false,
  showAccompanying = true,
  annotations = [],
  annotationModeActive = false,
  onAnnotationModeToggle,
  timeRange,
  onTimeRangeChange,
  onTimeUpdate,
  onEnded,
  className = '',
  cx,
  fieldMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentSyncPoint, setCurrentSyncPoint] = useState<SyncPoint | null>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  // Cast canvas to AVCanvas for accessing advanced properties
  const avCanvas = canvas as AVCanvas;

  // Get IIIF AV features from canvas
  const placeholderCanvas = useMemo(() => avService.getPlaceholderCanvas(avCanvas), [avCanvas]);
  const accompanyingCanvas = useMemo(() => avService.getAccompanyingCanvas(avCanvas), [avCanvas]);
  const timeMode = useMemo(() => avService.parseTimeMode(avCanvas.behavior), [avCanvas.behavior]);

  // Get poster URL from placeholderCanvas if not provided
  const posterUrl = useMemo(() => {
    if (poster) return poster;
    if (placeholderCanvas) return avService.getPosterImageUrl(placeholderCanvas);
    return null;
  }, [poster, placeholderCanvas]);

  // Generate sync points from accompanying canvas
  const syncPoints = useMemo(() => {
    if (!accompanyingCanvas) return [];
    const annos = avService.getAccompanyingContent(accompanyingCanvas);
    return avService.generateSyncPoints(annos);
  }, [accompanyingCanvas]);

  const hasAccompanyingContent = syncPoints.length > 0;

  // Filter time-based annotations for display on progress bar
  const timeAnnotations = useMemo(() =>
    annotations.filter(isTimeBasedAnnotation),
    [annotations]
  );

  const {
    mediaRef,
    state,
    showPoster,
    error,
    clearError,
    handleLoadedMetadata,
    handleTimeUpdate: baseHandleTimeUpdate,
    handlePlay,
    handlePause,
    handleEnded,
    handleWaiting,
    handleCanPlay,
    handleError,
    togglePlayPause,
    toggleMute,
    setVolume,
    seek,
    seekRelative,
    setPlaybackRate,
    handleKeyDown,
  } = useMediaPlayer({
    initialMuted: muted,
    onTimeUpdate: (time) => {
      onTimeUpdate?.(time);
      // Update current sync point
      if (syncPoints.length > 0) {
        const current = avService.findCurrentSyncPoint(syncPoints, time);
        setCurrentSyncPoint(current);
      }
    },
    onEnded
  });

  // Apply timeMode playback rate for 'scale' behavior
  useEffect(() => {
    if (timeMode?.mode === 'scale' && state.duration > 0 && avCanvas.duration) {
      const rate = avService.calculatePlaybackRate(state.duration, avCanvas.duration);
      if (mediaRef.current) {
        mediaRef.current.playbackRate = rate;
      }
    }
  }, [timeMode, state.duration, avCanvas.duration]);

  // Handle timeMode 'trim' - set start position
  useEffect(() => {
    if (timeMode?.mode === 'trim' && timeMode.start && mediaRef.current) {
      mediaRef.current.currentTime = timeMode.start;
    }
  }, [timeMode]);

  // Handle timeMode 'loop'
  useEffect(() => {
    if (timeMode?.mode === 'loop' && mediaRef.current) {
      mediaRef.current.loop = true;
    }
  }, [timeMode]);

  // Convert click position to time
  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!progressRef.current || state.duration === 0) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percentage * state.duration;
  }, [state.duration]);

  // Handle progress bar click - either seek or set annotation time
  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    const time = getTimeFromPosition(e.clientX);

    if (annotationModeActive && onTimeRangeChange) {
      // In annotation mode, set time range
      if (!timeRange || timeRange.end !== undefined) {
        // Start new selection
        onTimeRangeChange({ start: time });
      } else {
        // Complete selection
        const start = Math.min(timeRange.start, time);
        const end = Math.max(timeRange.start, time);
        onTimeRangeChange({ start, end });
      }
    } else {
      // Normal seek
      seek(time);
    }
  }, [annotationModeActive, timeRange, onTimeRangeChange, getTimeFromPosition, seek]);

  // Handle progress bar hover
  const handleProgressHover = useCallback((e: React.MouseEvent) => {
    const time = getTimeFromPosition(e.clientX);
    setHoveredTime(time);
  }, [getTimeFromPosition]);

  const handleProgressLeave = useCallback(() => {
    setHoveredTime(null);
  }, []);

  // Use current time for annotation
  const handleUseCurrentTime = useCallback(() => {
    if (!onTimeRangeChange) return;

    if (!timeRange || timeRange.end !== undefined) {
      // Start new selection at current time
      onTimeRangeChange({ start: state.currentTime });
    } else {
      // Complete selection at current time
      const start = Math.min(timeRange.start, state.currentTime);
      const end = Math.max(timeRange.start, state.currentTime);
      onTimeRangeChange({ start, end });
    }
  }, [timeRange, state.currentTime, onTimeRangeChange]);

  const bgClass = fieldMode ? 'bg-black' : 'bg-slate-900';
  const controlBgClass = fieldMode ? 'from-black/90' : 'from-slate-900/90';

  const mediaProps = {
    src,
    autoPlay,
    muted: state.isMuted,
    onLoadedMetadata: handleLoadedMetadata,
    onTimeUpdate: baseHandleTimeUpdate,
    onPlay: handlePlay,
    onPause: handlePause,
    onEnded: handleEnded,
    onWaiting: handleWaiting,
    onCanPlay: handleCanPlay,
    onError: handleError,
  };

  const canvasLabel = getIIIFValue(canvas.label) || 'Media';

  // Calculate percentages for display
  const currentPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const timeRangeStartPercent = timeRange && state.duration > 0 ? (timeRange.start / state.duration) * 100 : 0;
  const timeRangeEndPercent = timeRange?.end !== undefined && state.duration > 0 ? (timeRange.end / state.duration) * 100 : timeRangeStartPercent;

  return (
    <div
      ref={containerRef}
      className={`flex ${showTranscript && hasAccompanyingContent ? 'flex-row' : 'flex-col'} ${bgClass} ${className} w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="application"
      aria-label={`${mediaType === 'video' ? 'Video' : 'Audio'} player. Press Space to play/pause, arrow keys to seek, Up/Down for volume.`}
    >
      {/* Main Media Area */}
      <div className={`relative group flex-1 flex flex-col ${showTranscript && hasAccompanyingContent ? '' : 'w-full'}`}>
        {showPoster && posterUrl && mediaType === 'video' && (
          <div className="absolute inset-0 z-10">
            <img src={posterUrl} alt="Video poster" className="w-full h-full object-contain" />
            <div className="absolute inset-0 flex items-center justify-center">
              <IconButton
                icon="play_arrow"
                ariaLabel="Play"
                onClick={togglePlayPause}
                variant="primary"
                size="lg"
                className="!w-20 !h-20 !text-4xl !bg-white/90 !text-blue-600 hover:!bg-white"
              />
            </div>
          </div>
        )}

        {error && <MediaErrorOverlay message={error} onRetry={clearError} fieldMode={fieldMode} cx={cx} />}

        {/* Media element - fills available space */}
        <div className="flex-1 flex items-center justify-center relative">
          {mediaType === 'video' ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              {...mediaProps}
              className="max-w-full max-h-full w-auto h-auto bg-black"
              playsInline
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white text-center p-8">
              <Icon name="audiotrack" className="text-8xl opacity-40 mb-6" />
              <p className="text-xl font-medium mb-2">{canvasLabel}</p>
              {state.duration > 0 && (
                <p className="text-sm text-slate-400">
                  {formatTimeForDisplay(state.currentTime)} / {formatTimeForDisplay(state.duration)}
                </p>
              )}
              <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} {...mediaProps} />
            </div>
          )}

          {state.isBuffering && <MediaLoadingOverlay fieldMode={fieldMode} cx={cx} />}
        </div>

        {/* Current Sync Point Overlay (Subtitles) */}
        {currentSyncPoint && !showTranscript && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none">
            <div className={`${fieldMode ? 'bg-black/80' : 'bg-slate-900/80'} text-white px-4 py-2 rounded-lg max-w-[80%] text-center`}>
              <p className="text-sm">{String(currentSyncPoint.accompanyingPosition)}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className={`bg-gradient-to-t ${controlBgClass} to-transparent p-4`}>
          {/* Progress Bar with annotation support */}
          <div
            ref={progressRef}
            className={`relative h-2 rounded-full cursor-pointer mb-3 ${
              annotationModeActive ? 'ring-2 ring-offset-2' : ''
            } ${annotationModeActive ? (fieldMode ? 'ring-yellow-500 ring-offset-black' : 'ring-green-500 ring-offset-slate-900') : ''}`}
            style={{ background: fieldMode ? '#334155' : '#475569' }}
            onClick={handleProgressClick}
            onMouseMove={handleProgressHover}
            onMouseLeave={handleProgressLeave}
          >
            {/* Existing time annotations */}
            {timeAnnotations.map((anno) => {
              const range = getAnnotationTimeRange(anno);
              if (!range || state.duration === 0) return null;
              const startPct = (range.start / state.duration) * 100;
              const endPct = range.end !== undefined ? (range.end / state.duration) * 100 : startPct + 0.5;
              return (
                <div
                  key={anno.id}
                  className="absolute top-0 bottom-0 bg-blue-500/50 rounded-sm"
                  style={{ left: `${startPct}%`, width: `${Math.max(0.5, endPct - startPct)}%` }}
                  title={(anno.body as { value?: string })?.value || 'Annotation'}
                />
              );
            })}

            {/* Current time range selection */}
            {annotationModeActive && timeRange && (
              <div
                className={`absolute top-0 bottom-0 rounded-sm ${fieldMode ? 'bg-yellow-500/40' : 'bg-green-500/40'}`}
                style={{
                  left: `${timeRangeStartPercent}%`,
                  width: `${Math.max(0.5, timeRangeEndPercent - timeRangeStartPercent)}%`,
                }}
              />
            )}

            {/* Played progress */}
            <div
              className={`absolute top-0 bottom-0 left-0 rounded-full transition-all ${fieldMode ? 'bg-yellow-500' : 'bg-blue-500'}`}
              style={{ width: `${currentPercent}%` }}
            />

            {/* Playhead */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md transition-all ${fieldMode ? 'bg-yellow-400' : 'bg-white'}`}
              style={{ left: `calc(${currentPercent}% - 6px)` }}
            />

            {/* Hover time tooltip */}
            {hoveredTime !== null && (
              <div
                className="absolute -top-8 transform -translate-x-1/2 px-2 py-1 rounded text-xs text-white bg-black/80"
                style={{ left: `${(hoveredTime / state.duration) * 100}%` }}
              >
                {formatTimeForDisplay(hoveredTime)}
              </div>
            )}
          </div>

          {/* Annotation mode indicator */}
          {annotationModeActive && (
            <div className={`flex items-center justify-between mb-2 text-xs ${fieldMode ? 'text-yellow-400' : 'text-green-400'}`}>
              <span>
                {!timeRange ? 'Click timeline to set start' :
                 timeRange.end === undefined ? 'Click timeline to set end' :
                 `Selected: ${formatTimeForDisplay(timeRange.start)} - ${formatTimeForDisplay(timeRange.end)}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUseCurrentTime}
                className={`text-xs ${fieldMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
              >
                Use current time ({formatTimeForDisplay(state.currentTime)})
              </Button>
            </div>
          )}

          {/* Control buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <MediaControlGroup gap="sm" fieldMode={fieldMode} cx={cx}>
              <PlayPauseButton isPlaying={state.isPlaying} onToggle={togglePlayPause} fieldMode={fieldMode} cx={cx} />
              <IconButton icon="replay_10" ariaLabel="Rewind 10s" onClick={() => seekRelative(-10)} variant="ghost" size="sm" className="!text-white hover:!text-blue-500" fieldMode={fieldMode} />
              <IconButton icon="forward_10" ariaLabel="Forward 10s" onClick={() => seekRelative(10)} variant="ghost" size="sm" className="!text-white hover:!text-blue-500" fieldMode={fieldMode} />
              <TimeDisplay currentTime={state.currentTime} duration={state.duration} fieldMode={fieldMode} cx={cx} />
            </MediaControlGroup>

            <MediaControlGroup gap="sm" fieldMode={fieldMode} cx={cx}>
              {hasAccompanyingContent && showAccompanying && (
                <IconButton
                  icon="subtitles"
                  ariaLabel={showTranscript ? 'Hide transcript' : 'Show transcript'}
                  onClick={() => setShowTranscript(!showTranscript)}
                  variant="ghost"
                  size="sm"
                  className={`!text-white hover:!text-blue-500 ${showTranscript ? '!bg-blue-500/30' : ''}`}
                  fieldMode={fieldMode}
                />
              )}
              <PlaybackRateSelect value={state.playbackRate} onChange={setPlaybackRate} fieldMode={fieldMode} cx={cx} />
              <VolumeControl volume={state.volume} isMuted={state.isMuted} onVolumeChange={setVolume} onMuteToggle={toggleMute} sliderWidth="4rem" fieldMode={fieldMode} cx={cx} />
              <FullscreenButton containerRef={containerRef} fieldMode={fieldMode} cx={cx} />
            </MediaControlGroup>
          </div>
        </div>

        {/* TimeMode Indicator */}
        {timeMode && (
          <div className="absolute top-2 left-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
              fieldMode ? 'bg-yellow-500/80 text-black' : 'bg-blue-500/80 text-white'
            }`}>
              {timeMode.mode}
            </span>
          </div>
        )}
      </div>

      {/* Transcript Panel */}
      {showTranscript && hasAccompanyingContent && (
        <div className={`w-80 ${fieldMode ? 'bg-slate-900' : 'bg-slate-800'} border-l ${fieldMode ? 'border-slate-800' : 'border-slate-700'} flex flex-col`}>
          <div className={`p-3 border-b ${fieldMode ? 'border-slate-800' : 'border-slate-700'} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Icon name="subtitles" className="text-slate-400" />
              <span className={`text-sm font-medium ${fieldMode ? 'text-yellow-400' : 'text-white'}`}>
                {accompanyingCanvas?.label ? getIIIFValue(accompanyingCanvas.label) : 'Transcript'}
              </span>
            </div>
            <Button variant="ghost" size="bare" onClick={() => setShowTranscript(false)} className="text-slate-400 hover:text-white p-1">
              <Icon name="close" className="text-lg" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {syncPoints.map((point, idx) => (
              <button
                key={idx}
                onClick={() => seek(point.mainTime)}
                className={`w-full text-left p-2 rounded transition-colors ${
                  currentSyncPoint === point
                    ? fieldMode ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-blue-500/20 border border-blue-500/50'
                    : fieldMode ? 'hover:bg-slate-800' : 'hover:bg-slate-700'
                }`}
              >
                <div className={`text-[10px] font-mono mb-1 ${fieldMode ? 'text-yellow-400/70' : 'text-blue-400'}`}>
                  {avService.formatTime(point.mainTime)}
                </div>
                <div className={`text-sm ${fieldMode ? 'text-slate-300' : 'text-slate-200'}`}>
                  {String(point.accompanyingPosition)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPlayer;
