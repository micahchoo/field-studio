/**
 * AVPlayer - Advanced Audio/Video Player Component
 *
 * Supports IIIF Presentation API 3.0 AV features:
 * - placeholderCanvas for poster frames
 * - accompanyingCanvas for transcripts/subtitles
 * - timeMode behaviors (trim, scale, loop)
 * - Synchronized content display
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccompanyingCanvas,
  AVCanvas,
  avService,
  AVState,
  SyncPoint,
  TimeModeConfig
} from '../services/avService';
import { IIIFAnnotation } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';

interface AVPlayerProps {
  /** The canvas containing AV content */
  canvas: AVCanvas;
  /** Media source URL */
  src: string;
  /** Media type (audio or video) */
  mediaType: 'audio' | 'video';
  /** Optional poster image URL */
  poster?: string;
  /** Auto-play on load */
  autoPlay?: boolean;
  /** Initial muted state */
  muted?: boolean;
  /** Show accompanying content panel */
  showAccompanying?: boolean;
  /** Callback when time updates */
  onTimeUpdate?: (time: number) => void;
  /** Callback when media ends */
  onEnded?: () => void;
  /** Custom class name */
  className?: string;
}

export const AVPlayer: React.FC<AVPlayerProps> = ({
  canvas,
  src,
  mediaType,
  poster,
  autoPlay = false,
  muted = false,
  showAccompanying = true,
  onTimeUpdate,
  onEnded,
  className = ''
}) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<AVState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    isMuted: muted,
    volume: 1,
    playbackRate: 1,
    isBuffering: false,
    isSeeking: false
  });

  const [showControls, setShowControls] = useState(true);
  const [showPoster, setShowPoster] = useState(true);
  const [syncPoints, setSyncPoints] = useState<SyncPoint[]>([]);
  const [currentSyncPoint, setCurrentSyncPoint] = useState<SyncPoint | null>(null);

  // Get canvas properties
  const placeholderCanvas = avService.getPlaceholderCanvas(canvas);
  const accompanyingCanvas = avService.getAccompanyingCanvas(canvas);
  const timeMode = avService.parseTimeMode(canvas.behavior);
  const posterUrl = poster || (placeholderCanvas ? avService.getPosterImageUrl(placeholderCanvas) : null);

  // Initialize sync points from accompanying canvas
  useEffect(() => {
    if (accompanyingCanvas) {
      const annotations = avService.getAccompanyingContent(accompanyingCanvas);
      const points = avService.generateSyncPoints(annotations);
      setSyncPoints(points);
    }
  }, [accompanyingCanvas]);

  // Handle time mode
  useEffect(() => {
    if (timeMode && mediaRef.current) {
      const media = mediaRef.current;

      if (timeMode.mode === 'scale' && canvas.duration) {
        const rate = avService.calculatePlaybackRate(
          state.duration,
          canvas.duration
        );
        media.playbackRate = rate;
        setState(prev => ({ ...prev, playbackRate: rate }));
      }

      if (timeMode.mode === 'trim' && timeMode.start) {
        media.currentTime = timeMode.start;
      }
    }
  }, [timeMode, state.duration, canvas.duration]);

  // Update current sync point on time change
  useEffect(() => {
    const point = avService.findCurrentSyncPoint(syncPoints, state.currentTime);
    setCurrentSyncPoint(point);
  }, [state.currentTime, syncPoints]);

  // Media event handlers
  const handleLoadedMetadata = () => {
    const media = mediaRef.current;
    if (!media) return;

    setState(prev => ({
      ...prev,
      duration: media.duration
    }));
  };

  const handleTimeUpdate = () => {
    const media = mediaRef.current;
    if (!media) return;

    const {currentTime} = media;

    // Handle trim mode end
    if (timeMode?.mode === 'trim' && timeMode.end && currentTime >= timeMode.end) {
      media.pause();
      media.currentTime = timeMode.start || 0;
      setState(prev => ({ ...prev, isPlaying: false }));
      onEnded?.();
      return;
    }

    // Handle loop mode
    if (timeMode?.mode === 'loop' && canvas.duration && currentTime >= media.duration) {
      media.currentTime = 0;
      media.play();
    }

    setState(prev => ({ ...prev, currentTime }));
    onTimeUpdate?.(currentTime);
  };

  const handlePlay = () => {
    setState(prev => ({ ...prev, isPlaying: true }));
    setShowPoster(false);
  };

  const handlePause = () => {
    setState(prev => ({ ...prev, isPlaying: false }));
  };

  const handleEnded = () => {
    if (timeMode?.mode === 'loop') {
      mediaRef.current?.play();
    } else {
      setState(prev => ({ ...prev, isPlaying: false }));
      onEnded?.();
    }
  };

  const handleWaiting = () => {
    setState(prev => ({ ...prev, isBuffering: true }));
  };

  const handleCanPlay = () => {
    setState(prev => ({ ...prev, isBuffering: false }));
  };

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Handle media errors
  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    const media = e.currentTarget;
    const errorCode = media?.error?.code;
    const errorMessages: Record<number, string> = {
      1: 'Media loading aborted',
      2: 'Network error while loading media',
      3: 'Media decoding failed',
      4: 'Media format not supported'
    };
    const message = errorMessages[errorCode || 0] || 'Unknown media error';
    console.warn('[AVPlayer] Media error:', message, media?.error);
    setError(message);
    setState(prev => ({ ...prev, isPlaying: false, isBuffering: false }));
  }, []);

  // Controls
  const togglePlayPause = useCallback(async () => {
    const media = mediaRef.current;
    if (!media) return;

    try {
      if (state.isPlaying) {
        media.pause();
      } else {
        // play() returns a Promise that can reject
        await media.play();
      }
      setError(null);
    } catch (e) {
      const err = e as Error;
      console.warn('[AVPlayer] Play failed:', err.message);
      setError(`Unable to play media: ${err.message}`);
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [state.isPlaying]);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    media.muted = !media.muted;
    setState(prev => ({ ...prev, isMuted: media.muted }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const media = mediaRef.current;
    if (!media) return;

    media.volume = volume;
    setState(prev => ({ ...prev, volume }));
  }, []);

  const seek = useCallback((time: number) => {
    const media = mediaRef.current;
    if (!media) return;

    // Respect trim mode bounds
    if (timeMode?.mode === 'trim') {
      time = Math.max(timeMode.start || 0, Math.min(time, timeMode.end || media.duration));
    }

    media.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, [timeMode]);

  const seekRelative = useCallback((delta: number) => {
    const media = mediaRef.current;
    if (!media) return;

    seek(media.currentTime + delta);
  }, [seek]);

  // Keyboard shortcuts - scoped to player container for WCAG compliance
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Don't handle if focus is on an input element
    if (e.target instanceof HTMLInputElement) return;

    const media = mediaRef.current;
    if (!media) return;

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowLeft':
      case 'j':
      case 'J':
        e.preventDefault();
        seekRelative(-10);
        break;
      case 'ArrowRight':
      case 'l':
      case 'L':
        e.preventDefault();
        seekRelative(10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setVolume(Math.min(1, state.volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(Math.max(0, state.volume - 0.1));
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'Home':
        e.preventDefault();
        seek(timeMode?.start || 0);
        break;
      case 'End':
        e.preventDefault();
        seek(timeMode?.end || state.duration);
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        // Number keys seek to percentage (0=0%, 5=50%, 9=90%)
        e.preventDefault();
        const percent = parseInt(e.key) / 10;
        seek(state.duration * percent);
        break;
    }
  }, [togglePlayPause, toggleMute, seekRelative, seek, setVolume, state.volume, state.duration, timeMode]);

  // Progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * state.duration);
  };

  // Calculate effective duration for display
  const effectiveDuration = timeMode?.mode === 'trim'
    ? (timeMode.end || state.duration) - (timeMode.start || 0)
    : state.duration;

  const effectiveCurrentTime = timeMode?.mode === 'trim'
    ? state.currentTime - (timeMode.start || 0)
    : state.currentTime;

  const progress = effectiveDuration > 0
    ? (effectiveCurrentTime / effectiveDuration) * 100
    : 0;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-black ${className} focus:outline-none focus-visible:ring-2 focus-visible:ring-iiif-blue focus-visible:ring-inset`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="application"
      aria-label={`${mediaType === 'video' ? 'Video' : 'Audio'} player. Press Space to play/pause, arrow keys to seek, Up/Down for volume.`}
    >
      {/* Main Player */}
      <div
        className="relative group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => !state.isPlaying && setShowControls(true)}
      >
        {/* Poster / Placeholder */}
        {showPoster && posterUrl && mediaType === 'video' && (
          <div className="absolute inset-0 z-10">
            <img
              src={posterUrl}
              alt="Video poster"
              className="w-full h-full object-contain"
            />
            <button
              onClick={togglePlayPause}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            >
              <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center text-4xl text-iiif-blue">
                <Icon name="play_arrow" />
              </div>
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
            <div className="text-center text-white p-6">
              <Icon name="error_outline" className="text-5xl text-red-400 mb-3" />
              <p className="text-lg font-medium mb-2">Media Error</p>
              <p className="text-sm text-slate-300 mb-4">{error}</p>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Media Element */}
        {mediaType === 'video' ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={src}
            className="w-full aspect-video bg-black"
            autoPlay={autoPlay}
            muted={muted}
            playsInline
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            onWaiting={handleWaiting}
            onCanPlay={handleCanPlay}
            onError={handleError}
          />
        ) : (
          <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={src}
              autoPlay={autoPlay}
              muted={muted}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onWaiting={handleWaiting}
              onCanPlay={handleCanPlay}
              onError={handleError}
            />
            <div className="text-white text-center">
              <Icon name="audiotrack" className="text-6xl opacity-50 mb-4" />
              {canvas.label && (
                <p className="text-lg">
                  {Object.values(canvas.label)[0]?.[0] || 'Audio'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Buffering Indicator */}
        {state.isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress Bar */}
          <div
            className="h-1 bg-white/30 rounded-full mb-3 cursor-pointer group/progress"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-iiif-blue rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"></div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-4 text-white">
            <button
              onClick={togglePlayPause}
              className="hover:text-iiif-blue transition-colors"
              aria-label={state.isPlaying ? 'Pause' : 'Play'}
            >
              <Icon name={state.isPlaying ? 'pause' : 'play_arrow'} className="text-2xl" />
            </button>

            <button
              onClick={() => seekRelative(-10)}
              className="hover:text-iiif-blue transition-colors"
              aria-label="Rewind 10 seconds"
            >
              <Icon name="replay_10" className="text-xl" />
            </button>

            <button
              onClick={() => seekRelative(10)}
              className="hover:text-iiif-blue transition-colors"
              aria-label="Forward 10 seconds"
            >
              <Icon name="forward_10" className="text-xl" />
            </button>

            {/* Time Display */}
            <span className="text-sm font-mono">
              {avService.formatTime(effectiveCurrentTime)} / {avService.formatTime(effectiveDuration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="hover:text-iiif-blue transition-colors"
                aria-label={state.isMuted ? 'Unmute' : 'Mute'}
              >
                <Icon
                  name={state.isMuted ? 'volume_off' : state.volume > 0.5 ? 'volume_up' : 'volume_down'}
                  className="text-xl"
                />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={state.isMuted ? 0 : state.volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 accent-iiif-blue"
              />
            </div>

            {/* TimeMode Indicator */}
            {timeMode && (
              <span className="text-xs bg-iiif-blue/80 px-2 py-1 rounded">
                {timeMode.mode}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Accompanying Content Panel */}
      {showAccompanying && accompanyingCanvas && (
        <AccompanyingPanel
          canvas={accompanyingCanvas}
          syncPoints={syncPoints}
          currentSyncPoint={currentSyncPoint}
          currentTime={state.currentTime}
          onSeek={seek}
        />
      )}
    </div>
  );
};

/**
 * Accompanying content panel (transcript, subtitles, etc.)
 */
const AccompanyingPanel: React.FC<{
  canvas: AccompanyingCanvas;
  syncPoints: SyncPoint[];
  currentSyncPoint: SyncPoint | null;
  currentTime: number;
  onSeek: (time: number) => void;
}> = ({ canvas, syncPoints, currentSyncPoint, currentTime, onSeek }) => {
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active item
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentSyncPoint]);

  const label = canvas.label ? Object.values(canvas.label)[0]?.[0] : 'Transcript';

  return (
    <div className="bg-slate-900 text-white max-h-48 overflow-auto">
      <div className="sticky top-0 bg-slate-800 px-4 py-2 text-xs font-medium uppercase tracking-wide border-b border-slate-700">
        {label}
      </div>
      <div className="p-4 space-y-2">
        {syncPoints.map((point, index) => {
          const isActive = currentSyncPoint === point;

          return (
            <div
              key={index}
              ref={isActive ? activeRef : null}
              onClick={() => onSeek(point.mainTime)}
              className={`flex gap-3 p-2 rounded cursor-pointer transition-colors ${
                isActive
                  ? 'bg-iiif-blue/30 border-l-2 border-iiif-blue'
                  : 'hover:bg-slate-800'
              }`}
            >
              <span className="text-xs text-slate-400 font-mono shrink-0">
                {avService.formatTime(point.mainTime)}
              </span>
              <span className={`text-sm ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {typeof point.accompanyingPosition === 'string'
                  ? point.accompanyingPosition
                  : point.label || ''}
              </span>
            </div>
          );
        })}

        {syncPoints.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">
            No synchronized content available
          </p>
        )}
      </div>
    </div>
  );
};

export default AVPlayer;
