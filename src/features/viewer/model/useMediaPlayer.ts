/**
 * useMediaPlayer Hook
 *
 * Manages media player state, controls, and keyboard shortcuts.
 * Extracts all complex logic from the MediaPlayer molecule.
 *
 * @module features/viewer/model/useMediaPlayer
 */

import { KeyboardEvent, useCallback, useRef, useState } from 'react';

export interface MediaState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  isBuffering: boolean;
}

export interface UseMediaPlayerOptions {
  initialMuted?: boolean;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
}

const initialState = (muted: boolean): MediaState => ({
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isMuted: muted,
  volume: 1,
  playbackRate: 1,
  isBuffering: false,
});

export const useMediaPlayer = (options: UseMediaPlayerOptions = {}) => {
  const { initialMuted = false, onTimeUpdate, onEnded } = options;

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [state, setState] = useState<MediaState>(initialState(initialMuted));
  const [showPoster, setShowPoster] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Event handlers
  const handleLoadedMetadata = useCallback(() => {
    const media = mediaRef.current;
    if (media) setState(p => ({ ...p, duration: media.duration }));
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    setState(p => ({ ...p, currentTime: media.currentTime }));
    onTimeUpdate?.(media.currentTime);
  }, [onTimeUpdate]);

  const handlePlay = useCallback(() => {
    setState(p => ({ ...p, isPlaying: true }));
    setShowPoster(false);
  }, []);

  const handlePause = useCallback(() => setState(p => ({ ...p, isPlaying: false })), []);

  const handleEnded = useCallback(() => {
    setState(p => ({ ...p, isPlaying: false }));
    onEnded?.();
  }, [onEnded]);

  const handleWaiting = useCallback(() => setState(p => ({ ...p, isBuffering: true })), []);
  const handleCanPlay = useCallback(() => setState(p => ({ ...p, isBuffering: false })), []);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
    const code = e.currentTarget.error?.code;
    const getErrorMessage = (c: number | undefined): string => {
      if (c === 1) return 'Media loading aborted';
      if (c === 2) return 'Network error while loading media';
      if (c === 3) return 'Media decoding failed';
      if (c === 4) return 'Media format not supported';
      return 'Unknown media error';
    };
    setError(getErrorMessage(code));
    setState(p => ({ ...p, isPlaying: false, isBuffering: false }));
  }, []);

  // Controls
  const togglePlayPause = useCallback(async () => {
    const media = mediaRef.current;
    if (!media) return;
    try {
      state.isPlaying ? media.pause() : await media.play();
      setError(null);
    } catch (e) {
      setError(`Unable to play: ${(e as Error).message}`);
      setState(p => ({ ...p, isPlaying: false }));
    }
  }, [state.isPlaying]);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      media.muted = !media.muted;
      setState(p => ({ ...p, isMuted: media.muted }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const media = mediaRef.current;
    if (media) {
      media.volume = volume;
      setState(p => ({ ...p, volume, isMuted: volume === 0 }));
    }
  }, []);

  const seek = useCallback((time: number) => {
    const media = mediaRef.current;
    if (media) {
      media.currentTime = time;
      setState(p => ({ ...p, currentTime: time }));
    }
  }, []);

  const seekRelative = useCallback((delta: number) => {
    seek(Math.max(0, Math.min(state.duration, (mediaRef.current?.currentTime || 0) + delta)));
  }, [seek, state.duration]);

  const setPlaybackRate = useCallback((rate: number) => {
    const media = mediaRef.current;
    if (media) {
      media.playbackRate = rate;
      setState(p => ({ ...p, playbackRate: rate }));
    }
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement) return;
    const key = e.key.toLowerCase();
    switch (key) {
      case ' ':
      case 'k':
        e.preventDefault(); togglePlayPause(); break;
      case 'arrowleft':
      case 'j':
        e.preventDefault(); seekRelative(-10); break;
      case 'arrowright':
      case 'l':
        e.preventDefault(); seekRelative(10); break;
      case 'arrowup':
        e.preventDefault(); setVolume(Math.min(1, state.volume + 0.1)); break;
      case 'arrowdown':
        e.preventDefault(); setVolume(Math.max(0, state.volume - 0.1)); break;
      case 'm':
        e.preventDefault(); toggleMute(); break;
      case 'home':
        e.preventDefault(); seek(0); break;
      case 'end':
        e.preventDefault(); seek(state.duration); break;
    }
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      seek(state.duration * (parseInt(key) / 10));
    }
  }, [state.volume, state.duration, togglePlayPause, toggleMute, seekRelative, seek, setVolume]);

  return {
    mediaRef,
    state,
    showPoster,
    error,
    clearError: () => setError(null),
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
  };
};

export default useMediaPlayer;
