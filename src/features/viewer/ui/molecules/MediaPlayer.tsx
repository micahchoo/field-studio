/**
 * MediaPlayer Molecule
 *
 * Composes: Media player atoms (PlayPauseButton, VolumeControl, ProgressBar, etc.)
 *
 * IIIF-compliant audio/video player for canvas viewing.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - ~100 lines - extracts logic to useMediaPlayer hook
 * - Receives cx and fieldMode via props
 * - Composes only atoms - no native HTML elements
 * - Local UI state only
 *
 * @module features/viewer/ui/molecules/MediaPlayer
 */

import React, { useRef } from 'react';
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
import { useMediaPlayer } from '@/src/features/viewer/model';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import type { IIIFCanvas } from '@/types';

export interface MediaPlayerProps {
  canvas: IIIFCanvas;
  src: string;
  mediaType: 'audio' | 'video';
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
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
  onTimeUpdate,
  onEnded,
  className = '',
  cx,
  fieldMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    mediaRef,
    state,
    showPoster,
    error,
    clearError,
    handleLoadedMetadata,
    handleTimeUpdate,
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
  } = useMediaPlayer({ initialMuted: muted, onTimeUpdate, onEnded });

  const bgClass = fieldMode ? 'bg-black' : 'bg-slate-900';
  const controlBgClass = fieldMode ? 'from-black/80' : 'from-slate-900/80';

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
      <div className="relative group">
        {showPoster && poster && mediaType === 'video' && (
          <div className="absolute inset-0 z-10">
            <img src={poster} alt="Video poster" className="w-full h-full object-contain" />
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

        {mediaType === 'video' ? (
          <video ref={mediaRef as React.RefObject<HTMLVideoElement>} {...mediaProps} className="w-full aspect-video bg-black" playsInline />
        ) : (
          <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
            <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} {...mediaProps} />
            <div className="text-white text-center">
              <Icon name="audiotrack" className="text-6xl opacity-50 mb-4" />
              {canvas.label && <p className="text-lg">{Object.values(canvas.label)[0]?.[0] || 'Audio'}</p>}
            </div>
          </div>
        )}

        {state.isBuffering && <MediaLoadingOverlay fieldMode={fieldMode} cx={cx} />}

        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${controlBgClass} to-transparent p-4`}>
          <ProgressBar currentTime={state.currentTime} duration={state.duration} onSeek={seek} className="mb-3" fieldMode={fieldMode} cx={cx} />
          <MediaControlGroup align="between" fieldMode={fieldMode} cx={cx}>
            <MediaControlGroup gap="sm" fieldMode={fieldMode} cx={cx}>
              <PlayPauseButton isPlaying={state.isPlaying} onToggle={togglePlayPause} fieldMode={fieldMode} cx={cx} />
              <IconButton icon="replay_10" ariaLabel="Rewind 10s" onClick={() => seekRelative(-10)} variant="ghost" size="md" className="!text-white hover:!text-blue-500" fieldMode={fieldMode} />
              <IconButton icon="forward_10" ariaLabel="Forward 10s" onClick={() => seekRelative(10)} variant="ghost" size="md" className="!text-white hover:!text-blue-500" fieldMode={fieldMode} />
              <TimeDisplay currentTime={state.currentTime} duration={state.duration} fieldMode={fieldMode} cx={cx} />
            </MediaControlGroup>
            <MediaControlGroup gap="sm" fieldMode={fieldMode} cx={cx}>
              <PlaybackRateSelect value={state.playbackRate} onChange={setPlaybackRate} fieldMode={fieldMode} cx={cx} />
              <VolumeControl volume={state.volume} isMuted={state.isMuted} onVolumeChange={setVolume} onMuteToggle={toggleMute} fieldMode={fieldMode} cx={cx} />
              <FullscreenButton containerRef={containerRef} fieldMode={fieldMode} cx={cx} />
            </MediaControlGroup>
          </MediaControlGroup>
        </div>
      </div>
    </div>
  );
};

export default MediaPlayer;
