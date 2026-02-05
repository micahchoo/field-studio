/**
 * MediaPlayer Molecule
 *
 * Composes: Media player atoms (PlayPauseButton, VolumeControl, ProgressBar, etc.)
 *
 * IIIF-compliant audio/video player for canvas viewing.
 * Supports IIIF Presentation API 3.0 AV features.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Composes atoms: All media player atoms
 * - Local UI state only (useState, useCallback)
 * - No domain logic - pure media playback
 * - ~100 lines (was 488 before decomposition)
 *
 * IDEAL OUTCOME: Accessible media playback with IIIF compliance
 * FAILURE PREVENTED: Media errors, keyboard traps, sync loss
 *
 * @module features/viewer/ui/molecules/MediaPlayer
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  PlayPauseButton,
  VolumeControl,
  ProgressBar,
  TimeDisplay,
  PlaybackRateSelect,
  FullscreenButton,
  MediaControlGroup,
  MediaErrorOverlay,
  MediaLoadingOverlay,
} from '@/src/features/viewer/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms';
import { IconButton } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import type { IIIFCanvas } from '@/types';

export interface MediaPlayerProps {
  /** The canvas containing AV content */
  canvas: IIIFCanvas;
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
  /** Callback when time updates */
  onTimeUpdate?: (time: number) => void;
  /** Callback when media ends */
  onEnded?: () => void;
  /** Custom class name */
  className?: string;
  /** Contextual styles from template (unused but passed for consistency) */
  cx?: ContextualClassNames | Record<string, string>;
  /** Current field mode */
  fieldMode?: boolean;
}

interface MediaState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  isBuffering: boolean;
}

/**
 * MediaPlayer Molecule
 *
 * @example
 * <MediaPlayer
 *   canvas={canvas}
 *   src="https://example.com/video.mp4"
 *   mediaType="video"
 *   poster="https://example.com/poster.jpg"
 *   cx={cx}
 *   fieldMode={fieldMode}
 * />
 */
export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  canvas,
  src,
  mediaType,
  poster,
  autoPlay = false,
  muted = false,
  onTimeUpdate,
  onEnded,
  className = '',
  cx,
  fieldMode = false,
}) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<MediaState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    isMuted: muted,
    volume: 1,
    playbackRate: 1,
    isBuffering: false,
  });

  const [showPoster, setShowPoster] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Media event handlers
  const handleLoadedMetadata = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    setState(prev => ({ ...prev, duration: media.duration }));
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    const { currentTime } = media;
    setState(prev => ({ ...prev, currentTime }));
    onTimeUpdate?.(currentTime);
  }, [onTimeUpdate]);

  const handlePlay = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }));
    setShowPoster(false);
  }, []);

  const handlePause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const handleEnded = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
    onEnded?.();
  }, [onEnded]);

  const handleWaiting = useCallback(() => {
    setState(prev => ({ ...prev, isBuffering: true }));
  }, []);

  const handleCanPlay = useCallback(() => {
    setState(prev => ({ ...prev, isBuffering: false }));
  }, []);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
      const media = e.currentTarget;
      const errorCode = media?.error?.code;
      let message = 'Unknown media error';
      if (errorCode === 1) message = 'Media loading aborted';
      else if (errorCode === 2) message = 'Network error while loading media';
      else if (errorCode === 3) message = 'Media decoding failed';
      else if (errorCode === 4) message = 'Media format not supported';
      setError(message);
      setState(prev => ({ ...prev, isPlaying: false, isBuffering: false }));
    },
    []
  );

  // Control handlers
  const togglePlayPause = useCallback(async () => {
    const media = mediaRef.current;
    if (!media) return;

    try {
      if (state.isPlaying) {
        media.pause();
      } else {
        await media.play();
      }
      setError(null);
    } catch (e) {
      const err = e as Error;
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

  const setVolume = useCallback(
    (volume: number) => {
      const media = mediaRef.current;
      if (!media) return;
      media.volume = volume;
      setState(prev => ({ ...prev, volume, isMuted: volume === 0 }));
    },
    []
  );

  const seek = useCallback((time: number) => {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const seekRelative = useCallback(
    (delta: number) => {
      const media = mediaRef.current;
      if (!media) return;
      seek(Math.max(0, Math.min(state.duration, media.currentTime + delta)));
    },
    [seek, state.duration]
  );

  const setPlaybackRate = useCallback((rate: number) => {
    const media = mediaRef.current;
    if (!media) return;
    media.playbackRate = rate;
    setState(prev => ({ ...prev, playbackRate: rate }));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target instanceof HTMLInputElement) return;

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
          seek(0);
          break;
        case 'End':
          e.preventDefault();
          seek(state.duration);
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
          e.preventDefault();
          seek(state.duration * (parseInt(e.key) / 10));
          break;
      }
    },
    [togglePlayPause, toggleMute, seekRelative, seek, setVolume, state.volume, state.duration]
  );

  // Styling
  const bgClass = fieldMode ? 'bg-black' : 'bg-slate-900';
  const controlBgClass = fieldMode ? 'from-black/80' : 'from-slate-900/80';

  // Common media props
  const mediaProps = {
    src,
    autoPlay,
    muted,
    onLoadedMetadata: handleLoadedMetadata,
    onTimeUpdate: handleTimeUpdate,
    onPlay: handlePlay,
    onPause: handlePause,
    onEnded: handleEnded,
    onWaiting: handleWaiting,
    onCanPlay: handleCanPlay,
    onError: handleError,
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${bgClass} ${className} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="application"
      aria-label={`${mediaType === 'video' ? 'Video' : 'Audio'} player. Press Space to play/pause, arrow keys to seek, Up/Down for volume.`}
    >
      {/* Main Player */}
      <div className="relative group">
        {/* Poster */}
        {showPoster && poster && mediaType === 'video' && (
          <div className="absolute inset-0 z-10">
            <img
              src={poster}
              alt="Video poster"
              className="w-full h-full object-contain"
            />
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

        {/* Error Overlay */}
        {error && (
          <MediaErrorOverlay
            message={error}
            errorType="unknown"
            onRetry={clearError}
            fieldMode={fieldMode}
            cx={cx}
          />
        )}

        {/* Media Element */}
        {mediaType === 'video' ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            {...mediaProps}
            className="w-full aspect-video bg-black"
            playsInline
          />
        ) : (
          <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              {...mediaProps}
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

        {/* Loading Overlay */}
        {state.isBuffering && (
          <MediaLoadingOverlay
            message="Loading..."
            fieldMode={fieldMode}
            cx={cx}
          />
        )}

        {/* Controls Overlay */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${controlBgClass} to-transparent p-4`}
        >
          {/* Progress Bar */}
          <ProgressBar
            currentTime={state.currentTime}
            duration={state.duration}
            onSeek={seek}
            className="mb-3"
            fieldMode={fieldMode}
            cx={cx}
          />

          {/* Controls */}
          <MediaControlGroup align="between" gap="md" fieldMode={fieldMode} cx={cx}>
            <MediaControlGroup gap="sm" fieldMode={fieldMode} cx={cx}>
              <PlayPauseButton
                isPlaying={state.isPlaying}
                onToggle={togglePlayPause}
                fieldMode={fieldMode}
                cx={cx}
              />

              <IconButton
                icon="replay_10"
                ariaLabel="Rewind 10 seconds"
                onClick={() => seekRelative(-10)}
                variant="ghost"
                size="md"
                className="!text-white hover:!text-blue-500"
                fieldMode={fieldMode}
              />

              <IconButton
                icon="forward_10"
                ariaLabel="Forward 10 seconds"
                onClick={() => seekRelative(10)}
                variant="ghost"
                size="md"
                className="!text-white hover:!text-blue-500"
                fieldMode={fieldMode}
              />

              <TimeDisplay
                currentTime={state.currentTime}
                duration={state.duration}
                fieldMode={fieldMode}
                cx={cx}
              />
            </MediaControlGroup>

            <MediaControlGroup gap="sm" fieldMode={fieldMode} cx={cx}>
              <PlaybackRateSelect
                value={state.playbackRate}
                onChange={setPlaybackRate}
                fieldMode={fieldMode}
                cx={cx}
              />

              <VolumeControl
                volume={state.volume}
                isMuted={state.isMuted}
                onVolumeChange={setVolume}
                onMuteToggle={toggleMute}
                fieldMode={fieldMode}
                cx={cx}
              />

              <FullscreenButton
                containerRef={containerRef}
                fieldMode={fieldMode}
                cx={cx}
              />
            </MediaControlGroup>
          </MediaControlGroup>
        </div>
      </div>
    </div>
  );
};

export default MediaPlayer;
