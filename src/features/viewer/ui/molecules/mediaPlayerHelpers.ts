/**
 * MediaPlayer helpers — IIIF AV canvas feature extraction
 *
 * Extracts IIIF Presentation API 3.0 AV features from canvas objects:
 * - placeholderCanvas (poster frames)
 * - accompanyingCanvas (transcripts, subtitles)
 * - timeMode behaviors (trim, scale, loop)
 * - Sync points from accompanying canvas
 */

import type { IIIFCanvas } from '@/src/shared/types';

export interface PlaceholderInfo {
  id: string;
  thumbnail: string;
}

export interface SyncPoint {
  mainTime: number;
  accompanyingPosition: string;
}

export type TimeModeResult =
  | { mode: 'trim'; start: number; end: number }
  | { mode: 'loop' }
  | { mode: 'scale' }
  | null;

/** Extract placeholder canvas thumbnail from IIIF AV canvas */
export function extractPlaceholderCanvas(canvas: IIIFCanvas): PlaceholderInfo | null {
  try {
    const avCanvas = canvas as any;
    const pc = avCanvas.placeholderCanvas;
    if (!pc) return null;
    const items = pc.items || [];
    for (const page of items) {
      for (const anno of (page as any).items || []) {
        const body = Array.isArray(anno.body) ? anno.body[0] : anno.body;
        if (body?.id) return { id: pc.id, thumbnail: body.id };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract accompanying canvas from IIIF AV canvas */
export function extractAccompanyingCanvas(canvas: IIIFCanvas): any | null {
  try {
    return (canvas as any).accompanyingCanvas ?? null;
  } catch {
    return null;
  }
}

/** Extract timeMode behavior from IIIF AV canvas */
export function extractTimeMode(canvas: IIIFCanvas, duration: number): TimeModeResult {
  try {
    const behavior = (canvas as any).behavior;
    if (!behavior) return null;
    const behaviors = Array.isArray(behavior) ? behavior : [behavior];
    for (const b of behaviors) {
      if (b === 'auto-advance' || b === 'no-auto-advance') continue;
      if (b.startsWith?.('trim') || b === 'trim') return { mode: 'trim', start: 0, end: duration };
      if (b === 'loop') return { mode: 'loop' };
      if (b === 'scale') return { mode: 'scale' };
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract sync points from accompanying canvas annotations */
export function extractSyncPoints(accompanyingCanvas: any): SyncPoint[] {
  if (!accompanyingCanvas) return [];
  try {
    const annos = accompanyingCanvas.annotations || accompanyingCanvas.items || [];
    const points: SyncPoint[] = [];
    for (const page of annos) {
      for (const anno of (page as any).items || []) {
        const body = Array.isArray(anno.body) ? anno.body[0] : anno.body;
        const text = body?.value || '';
        const target = anno.target;
        const source = typeof target === 'string' ? target : target?.source;
        if (typeof source === 'string' && source.includes('#t=')) {
          const match = source.match(/#t=(\d+(?:\.\d+)?)/);
          if (match) {
            points.push({ mainTime: parseFloat(match[1]), accompanyingPosition: text });
          }
        }
      }
    }
    return points.sort((a, b) => a.mainTime - b.mainTime);
  } catch {
    return [];
  }
}

/** Find current sync point for given playback time */
export function findCurrentSyncPoint(syncPoints: SyncPoint[], currentTime: number): SyncPoint | null {
  if (syncPoints.length === 0) return null;
  let current: SyncPoint | null = null;
  for (const point of syncPoints) {
    if (point.mainTime <= currentTime) current = point;
    else break;
  }
  return current;
}

/** Compute spatial coordinates from mouse event relative to video element */
export function getSpatialCoords(
  e: MouseEvent,
  videoEl: HTMLVideoElement | null,
): { x: number; y: number } | null {
  if (!videoEl) return null;
  const rect = videoEl.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
  };
}

/** Compute spatial annotation region from draw start/end */
export function computeSpatialRegion(
  drawStart: { x: number; y: number },
  drawEnd: { x: number; y: number },
): { x: number; y: number; w: number; h: number } | null {
  const x = Math.min(drawStart.x, drawEnd.x);
  const y = Math.min(drawStart.y, drawEnd.y);
  const w = Math.abs(drawEnd.x - drawStart.x);
  const h = Math.abs(drawEnd.y - drawStart.y);
  if (w > 0.01 && h > 0.01) return { x, y, w, h };
  return null;
}

/** Callbacks for keyboard shortcut handling */
export interface MediaKeyboardActions {
  togglePlayPause: () => void;
  seekRelative: (delta: number) => void;
  setVolume: (vol: number) => void;
  getVolume: () => number;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  toggleTranscript: () => void;
  seek: (time: number) => void;
  getDuration: () => number;
  seekToPrevChapter: () => void;
  seekToNextChapter: () => void;
}

/** Create a keyboard event handler for the media player */
export function createKeyboardHandler(actions: MediaKeyboardActions): (e: KeyboardEvent) => void {
  return function handleKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement) return;
    const key = e.key.toLowerCase();

    if (key === '[') { e.preventDefault(); actions.seekToPrevChapter(); return; }
    if (key === ']') { e.preventDefault(); actions.seekToNextChapter(); return; }

    switch (key) {
      case ' ':
      case 'k':
        e.preventDefault(); actions.togglePlayPause(); break;
      case 'arrowleft':
      case 'j':
        e.preventDefault(); actions.seekRelative(-10); break;
      case 'arrowright':
      case 'l':
        e.preventDefault(); actions.seekRelative(10); break;
      case 'arrowup':
        e.preventDefault(); actions.setVolume(Math.min(1, actions.getVolume() + 0.1)); break;
      case 'arrowdown':
        e.preventDefault(); actions.setVolume(Math.max(0, actions.getVolume() - 0.1)); break;
      case 'm':
        e.preventDefault(); actions.toggleMute(); break;
      case 'f':
        e.preventDefault(); actions.toggleFullscreen(); break;
      case 't':
        e.preventDefault(); actions.toggleTranscript(); break;
      case 'home':
        e.preventDefault(); actions.seek(0); break;
      case 'end':
        e.preventDefault(); actions.seek(actions.getDuration()); break;
    }
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      actions.seek(actions.getDuration() * (parseInt(key) / 10));
    }
  };
}

/** Callbacks for Media Session API setup */
export interface MediaSessionActions {
  title: string;
  togglePlayPause: () => void;
  seekRelative: (delta: number) => void;
  seekToPrevChapter?: () => void;
  seekToNextChapter?: () => void;
}

/** Setup Media Session API handlers, returns cleanup function */
export function setupMediaSession(actions: MediaSessionActions): () => void {
  if (!('mediaSession' in navigator)) return () => {};

  navigator.mediaSession.metadata = new MediaMetadata({ title: actions.title });
  navigator.mediaSession.setActionHandler('play', () => actions.togglePlayPause());
  navigator.mediaSession.setActionHandler('pause', () => actions.togglePlayPause());
  navigator.mediaSession.setActionHandler('seekbackward', () => actions.seekRelative(-10));
  navigator.mediaSession.setActionHandler('seekforward', () => actions.seekRelative(10));

  if (actions.seekToPrevChapter) {
    navigator.mediaSession.setActionHandler('previoustrack', () => actions.seekToPrevChapter!());
  }
  if (actions.seekToNextChapter) {
    navigator.mediaSession.setActionHandler('nexttrack', () => actions.seekToNextChapter!());
  }

  return () => {
    try {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    } catch { /* ignore */ }
  };
}

/** Map media error code to human-readable message */
export function getMediaErrorMessage(code: number | undefined): string {
  if (code === 1) return 'Media loading aborted';
  if (code === 2) return 'Network error while loading media';
  if (code === 3) return 'Media decoding failed';
  if (code === 4) return 'Media format not supported';
  return 'Unknown media error';
}

/** Chapter marker for IIIF structures */
export interface ChapterMarker {
  label: string;
  start: number;
  end: number;
  color: string;
}

/** Find next chapter after current time */
export function findNextChapter(chapters: ChapterMarker[], currentTime: number): ChapterMarker | undefined {
  return chapters.find(c => c.start > currentTime + 0.5);
}

/** Find appropriate previous chapter for seek-back behavior */
export function findPrevChapterTime(chapters: ChapterMarker[], currentTime: number): number {
  const current = [...chapters].reverse().find(c => c.start <= currentTime);
  if (current && currentTime - current.start > 2) return current.start;
  const idx = chapters.findIndex(c => c.start <= currentTime);
  if (idx > 0) return chapters[idx - 1].start;
  return 0;
}

/** Time range for annotations */
export interface TimeRangeInput {
  start: number;
  end?: number;
}

/** Compute the next time range state from a click */
export function computeTimeRangeClick(
  current: TimeRangeInput | null,
  clickedTime: number,
): TimeRangeInput {
  if (!current || current.end !== undefined) {
    return { start: clickedTime };
  }
  const start = Math.min(current.start, clickedTime);
  const end = Math.max(current.start, clickedTime);
  return { start, end };
}
