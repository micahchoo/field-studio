/**
 * useWaveform Hook
 *
 * Wraps WaveSurfer.js for audio waveform visualization with
 * region-based time annotation support and playback sync.
 *
 * @module features/viewer/model/useWaveform
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { GenericPlugin } from 'wavesurfer.js/dist/base-plugin.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.js';
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover.js';
import type { IIIFAnnotation } from '@/src/shared/types';
import { getAnnotationTimeRange, isTimeBasedAnnotation, type TimeRange } from './annotation';

// Layer colors for annotation regions
const REGION_COLORS = [
  'rgba(59, 130, 246, 0.3)',  // blue
  'rgba(34, 197, 94, 0.3)',   // green
  'rgba(168, 85, 247, 0.3)',  // purple
  'rgba(245, 158, 11, 0.3)',  // amber
  'rgba(239, 68, 68, 0.3)',   // red
  'rgba(6, 182, 212, 0.3)',   // cyan
];

export interface UseWaveformOptions {
  /** Audio source URL */
  src: string;
  /** Container element ref */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Timeline container ref (optional) */
  timelineRef?: React.RefObject<HTMLDivElement>;
  /** Existing annotations to render as regions */
  annotations?: IIIFAnnotation[];
  /** Whether annotation mode is active (enables region creation) */
  annotationMode?: boolean;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Callback when time range is selected via region */
  onTimeRangeChange?: (range: TimeRange | null) => void;
  /** Callback for playback time updates (throttled) */
  onTimeUpdate?: (time: number) => void;
  /** Callback when play/pause state changes */
  onPlayStateChange?: (playing: boolean) => void;
}

export interface UseWaveformReturn {
  /** WaveSurfer instance ref */
  wsRef: React.MutableRefObject<WaveSurfer | null>;
  /** Whether waveform is ready */
  isReady: boolean;
  /** Whether waveform is loading */
  isLoading: boolean;
  /** Current playback time */
  currentTime: number;
  /** Total duration */
  duration: number;
  /** Whether playing */
  isPlaying: boolean;
  /** Play/pause toggle */
  togglePlayPause: () => void;
  /** Seek to time */
  seek: (time: number) => void;
  /** Set volume 0-1 */
  setVolume: (vol: number) => void;
  /** Set playback rate */
  setPlaybackRate: (rate: number) => void;
}

export function useWaveform(options: UseWaveformOptions): UseWaveformReturn {
  const {
    src,
    containerRef,
    timelineRef,
    annotations = [],
    annotationMode = false,
    fieldMode = false,
    onTimeRangeChange,
    onTimeUpdate,
    onPlayStateChange,
  } = options;

  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Store callbacks in refs
  const onTimeRangeChangeRef = useRef(onTimeRangeChange);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  onTimeRangeChangeRef.current = onTimeRangeChange;
  onTimeUpdateRef.current = onTimeUpdate;
  onPlayStateChangeRef.current = onPlayStateChange;

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !src) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const plugins: GenericPlugin[] = [regions];

    if (timelineRef?.current) {
      plugins.push(TimelinePlugin.create({ container: timelineRef.current }));
    }

    plugins.push(HoverPlugin.create({
      lineColor: fieldMode ? '#eab308' : '#22c55e',
      lineWidth: 2,
      labelBackground: fieldMode ? '#000' : '#333',
      labelColor: '#fff',
      labelSize: '11px',
    }));

    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: src,
      waveColor: fieldMode ? '#eab308' : '#64748b',
      progressColor: fieldMode ? '#fbbf24' : '#22c55e',
      cursorColor: fieldMode ? '#fbbf24' : '#3b82f6',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 'auto',
      normalize: true,
      plugins,
    });

    wsRef.current = ws;

    ws.on('ready', () => {
      setIsReady(true);
      setIsLoading(false);
      setDuration(ws.getDuration());
    });

    ws.on('loading', () => {
      setIsLoading(true);
    });

    ws.on('timeupdate', (time: number) => {
      // Throttle: only update state every 250ms
      const now = Date.now();
      if (now - lastTimeRef.current > 250) {
        lastTimeRef.current = now;
        setCurrentTime(time);
        onTimeUpdateRef.current?.(time);
      }
    });

    ws.on('play', () => {
      setIsPlaying(true);
      onPlayStateChangeRef.current?.(true);
    });

    ws.on('pause', () => {
      setIsPlaying(false);
      onPlayStateChangeRef.current?.(false);
    });

    ws.on('finish', () => {
      setIsPlaying(false);
      onPlayStateChangeRef.current?.(false);
    });

    // Region events
    regions.on('region-created', (region: Region) => {
      if (region.id?.startsWith('user-')) {
        onTimeRangeChangeRef.current?.({
          start: region.start,
          end: region.end,
        });
      }
    });

    regions.on('region-updated', (region: Region) => {
      if (region.id?.startsWith('user-')) {
        onTimeRangeChangeRef.current?.({
          start: region.start,
          end: region.end,
        });
      }
    });

    return () => {
      ws.destroy();
      wsRef.current = null;
      regionsRef.current = null;
      setIsReady(false);
      setIsPlaying(false);
    };
  }, [src, containerRef, timelineRef, fieldMode]);

  // Enable/disable region creation based on annotation mode
  const dragDisableRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const regions = regionsRef.current;
    if (!regions) return;

    // Cleanup previous drag selection
    if (dragDisableRef.current) {
      dragDisableRef.current();
      dragDisableRef.current = null;
    }

    if (annotationMode) {
      dragDisableRef.current = regions.enableDragSelection({
        color: fieldMode ? 'rgba(234, 179, 8, 0.3)' : 'rgba(34, 197, 94, 0.3)',
        id: `user-${Date.now()}`,
      });
    }
  }, [annotationMode, fieldMode]);

  // Sync annotation regions
  useEffect(() => {
    const regions = regionsRef.current;
    if (!regions || !isReady) return;

    // Clear existing annotation regions (keep user-created ones)
    regions.getRegions().forEach(r => {
      if (!r.id?.startsWith('user-')) {
        r.remove();
      }
    });

    // Add annotation regions
    const timeAnnotations = annotations.filter(isTimeBasedAnnotation);
    timeAnnotations.forEach((anno, idx) => {
      const range = getAnnotationTimeRange(anno);
      if (!range) return;

      const body = anno.body as { value?: string };
      regions.addRegion({
        id: `anno-${anno.id}`,
        start: range.start,
        end: range.end ?? range.start + 0.5,
        color: REGION_COLORS[idx % REGION_COLORS.length],
        content: body?.value || '',
        drag: false,
        resize: false,
      });
    });
  }, [annotations, isReady]);

  const togglePlayPause = useCallback(() => {
    wsRef.current?.playPause();
  }, []);

  const seek = useCallback((time: number) => {
    if (wsRef.current && duration > 0) {
      wsRef.current.seekTo(time / duration);
    }
  }, [duration]);

  const setVolume = useCallback((vol: number) => {
    wsRef.current?.setVolume(vol);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    wsRef.current?.setPlaybackRate(rate);
  }, []);

  return {
    wsRef,
    isReady,
    isLoading,
    currentTime,
    duration,
    isPlaying,
    togglePlayPause,
    seek,
    setVolume,
    setPlaybackRate,
  };
}
