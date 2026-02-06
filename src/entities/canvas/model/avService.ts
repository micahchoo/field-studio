/**
 * Advanced Audio/Video Service for IIIF
 *
 * Implements advanced AV features from IIIF Presentation API 3.0:
 * - accompanyingCanvas: auxiliary content shown alongside main canvas
 * - placeholderCanvas: poster frames / loading placeholders
 * - timeMode behaviors: trim, scale, loop for duration control
 *
 * @see https://iiif.io/api/presentation/3.0/#accompanyingcanvas
 * @see https://iiif.io/api/presentation/3.0/#placeholdercanvas
 */

import { IIIFAnnotation, IIIFCanvas, IIIFManifest, LanguageMap } from '@/src/shared/types';
import { IMAGE_QUALITY } from '@/src/shared/constants';

// ============================================================================
// Types
// ============================================================================

export interface AVCanvas extends Omit<IIIFCanvas, 'placeholderCanvas' | 'accompanyingCanvas'> {
  /** Duration in seconds for time-based media */
  duration?: number;
  /** Poster frame / placeholder canvas */
  placeholderCanvas?: PlaceholderCanvas;
  /** Auxiliary content canvas (transcript, score, etc.) */
  accompanyingCanvas?: AccompanyingCanvas;
}

export interface PlaceholderCanvas {
  id: string;
  type: 'Canvas';
  width?: number;
  height?: number;
  items?: any[]; // Annotation pages with placeholder content
}

export interface AccompanyingCanvas {
  id: string;
  type: 'Canvas';
  label?: LanguageMap;
  width?: number;
  height?: number;
  duration?: number;
  items?: any[]; // Annotation pages with accompanying content
}

export type TimeMode = 'trim' | 'scale' | 'loop';

export interface TimeModeConfig {
  mode: TimeMode;
  /** For 'trim': start time in seconds */
  start?: number;
  /** For 'trim': end time in seconds */
  end?: number;
  /** For 'scale': target duration in seconds */
  targetDuration?: number;
  /** For 'loop': number of times to loop (0 = infinite) */
  loopCount?: number;
}

export interface AVState {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration */
  duration: number;
  /** Is currently playing */
  isPlaying: boolean;
  /** Is muted */
  isMuted: boolean;
  /** Volume (0-1) */
  volume: number;
  /** Playback rate */
  playbackRate: number;
  /** Is buffering */
  isBuffering: boolean;
  /** Is seeking */
  isSeeking: boolean;
  /** Current timeMode if any */
  timeMode?: TimeModeConfig;
}

export interface SyncPoint {
  /** Time in main media (seconds) */
  mainTime: number;
  /** Time or position in accompanying content */
  accompanyingPosition: number | string;
  /** Label for this sync point */
  label?: string;
}

// ============================================================================
// AV Service
// ============================================================================

class AVService {
  /**
   * Check if a canvas is time-based media
   */
  isTimeBasedMedia(canvas: IIIFCanvas): boolean {
    return (canvas as AVCanvas).duration !== undefined && (canvas as AVCanvas).duration! > 0;
  }

  /**
   * Get the duration of a canvas
   */
  getDuration(canvas: IIIFCanvas): number {
    return (canvas as AVCanvas).duration || 0;
  }

  /**
   * Get the placeholder canvas for a time-based canvas
   */
  getPlaceholderCanvas(canvas: AVCanvas | IIIFCanvas): PlaceholderCanvas | null {
    return (canvas as AVCanvas).placeholderCanvas || null;
  }

  /**
   * Get the accompanying canvas for a canvas
   */
  getAccompanyingCanvas(canvas: AVCanvas | IIIFCanvas): AccompanyingCanvas | null {
    return (canvas as AVCanvas).accompanyingCanvas || null;
  }

  /**
   * Extract the poster image URL from a placeholder canvas
   */
  getPosterImageUrl(placeholderCanvas: PlaceholderCanvas): string | null {
    if (!placeholderCanvas.items?.length) return null;

    const page = placeholderCanvas.items[0];
    if (!page.items?.length) return null;

    const annotation = page.items[0];
    if (!annotation.body) return null;

    const body = Array.isArray(annotation.body) ? annotation.body[0] : annotation.body;
    return typeof body === 'string' ? body : body?.id || null;
  }

  /**
   * Extract accompanying content (transcript, subtitles, etc.)
   */
  getAccompanyingContent(accompanyingCanvas: AccompanyingCanvas): IIIFAnnotation[] {
    const annotations: IIIFAnnotation[] = [];

    if (!accompanyingCanvas.items) return annotations;

    for (const page of accompanyingCanvas.items) {
      if (page.items) {
        annotations.push(...page.items);
      }
    }

    return annotations;
  }

  /**
   * Parse timeMode behavior from a canvas or manifest
   */
  parseTimeMode(behaviors: string[] | undefined): TimeModeConfig | null {
    if (!behaviors) return null;

    for (const behavior of behaviors) {
      if (behavior === 'trim' || behavior === 'scale' || behavior === 'loop') {
        return { mode: behavior as TimeMode };
      }
    }

    return null;
  }

  /**
   * Apply timeMode to calculate effective duration
   */
  applyTimeMode(
    originalDuration: number,
    config: TimeModeConfig,
    canvasDuration?: number
  ): { effectiveDuration: number; startOffset: number } {
    switch (config.mode) {
      case 'trim':
        // Trim to specified range
        const start = config.start || 0;
        const end = config.end || originalDuration;
        return {
          effectiveDuration: Math.min(end - start, originalDuration - start),
          startOffset: start
        };

      case 'scale':
        // Scale to match canvas duration
        const target = config.targetDuration || canvasDuration || originalDuration;
        return {
          effectiveDuration: target,
          startOffset: 0
        };

      case 'loop':
        // Loop content to fill duration
        if (canvasDuration && canvasDuration > originalDuration) {
          const loops = Math.ceil(canvasDuration / originalDuration);
          return {
            effectiveDuration: canvasDuration,
            startOffset: 0
          };
        }
        return { effectiveDuration: originalDuration, startOffset: 0 };

      default:
        return { effectiveDuration: originalDuration, startOffset: 0 };
    }
  }

  /**
   * Calculate playback rate for scale timeMode
   */
  calculatePlaybackRate(
    originalDuration: number,
    targetDuration: number
  ): number {
    if (targetDuration <= 0 || originalDuration <= 0) return 1;
    return originalDuration / targetDuration;
  }

  /**
   * Generate sync points from timed annotations
   */
  generateSyncPoints(annotations: IIIFAnnotation[]): SyncPoint[] {
    const syncPoints: SyncPoint[] = [];

    for (const annotation of annotations) {
      const {target} = annotation;
      if (typeof target !== 'string') continue;

      // Parse time fragment from target
      const timeMatch = target.match(/#t=([\d.]+)(?:,([\d.]+))?/);
      if (!timeMatch) continue;

      const startTime = parseFloat(timeMatch[1]);

      // Get text content from body
      const {body} = annotation;
      const text = typeof body === 'string'
        ? body
        : Array.isArray(body)
          ? (body[0] as any)?.value || ''
          : (body as any)?.value || '';

      syncPoints.push({
        mainTime: startTime,
        accompanyingPosition: text,
        label: annotation.label ? Object.values(annotation.label)[0]?.[0] : undefined
      });
    }

    // Sort by time
    syncPoints.sort((a, b) => a.mainTime - b.mainTime);

    return syncPoints;
  }

  /**
   * Find the current sync point for a given time
   */
  findCurrentSyncPoint(syncPoints: SyncPoint[], currentTime: number): SyncPoint | null {
    let current: SyncPoint | null = null;

    for (const point of syncPoints) {
      if (point.mainTime <= currentTime) {
        current = point;
      } else {
        break;
      }
    }

    return current;
  }

  /**
   * Create a placeholder canvas with an image
   */
  createPlaceholderCanvas(
    canvasId: string,
    imageUrl: string,
    width: number,
    height: number
  ): PlaceholderCanvas {
    return {
      id: `${canvasId}/placeholder`,
      type: 'Canvas',
      width,
      height,
      items: [{
        id: `${canvasId}/placeholder/page`,
        type: 'AnnotationPage',
        items: [{
          id: `${canvasId}/placeholder/anno`,
          type: 'Annotation',
          motivation: 'painting',
          body: {
            id: imageUrl,
            type: 'Image',
            format: 'image/jpeg',
            width,
            height
          },
          target: `${canvasId}/placeholder`
        }]
      }]
    };
  }

  /**
   * Create an accompanying canvas for transcript/captions
   */
  createAccompanyingCanvas(
    canvasId: string,
    label: string,
    annotations: Array<{
      time: number;
      endTime?: number;
      text: string;
    }>
  ): AccompanyingCanvas {
    const items = annotations.map((anno, index) => ({
      id: `${canvasId}/accompanying/anno/${index}`,
      type: 'Annotation',
      motivation: 'supplementing',
      body: {
        type: 'TextualBody',
        value: anno.text,
        format: 'text/plain'
      },
      target: anno.endTime
        ? `${canvasId}#t=${anno.time},${anno.endTime}`
        : `${canvasId}#t=${anno.time}`
    }));

    return {
      id: `${canvasId}/accompanying`,
      type: 'Canvas',
      label: { en: [label] },
      items: [{
        id: `${canvasId}/accompanying/page`,
        type: 'AnnotationPage',
        items
      }]
    };
  }

  /**
   * Parse VTT/SRT captions into annotations
   */
  parseVTTToAnnotations(vttContent: string): Array<{
    time: number;
    endTime: number;
    text: string;
  }> {
    const results: Array<{ time: number; endTime: number; text: string }> = [];
    const lines = vttContent.split('\n');

    let currentCue: { time: number; endTime: number; text: string } | null = null;

    for (const line of lines) {
      // Skip WEBVTT header and empty lines
      if (line.startsWith('WEBVTT') || line.trim() === '') {
        if (currentCue && currentCue.text) {
          results.push(currentCue);
          currentCue = null;
        }
        continue;
      }

      // Check for timestamp line
      const timestampMatch = line.match(
        /(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/
      );
      if (timestampMatch) {
        if (currentCue && currentCue.text) {
          results.push(currentCue);
        }

        const startTime =
          parseInt(timestampMatch[1]) * 3600 +
          parseInt(timestampMatch[2]) * 60 +
          parseInt(timestampMatch[3]) +
          parseInt(timestampMatch[4]) / 1000;

        const endTime =
          parseInt(timestampMatch[5]) * 3600 +
          parseInt(timestampMatch[6]) * 60 +
          parseInt(timestampMatch[7]) +
          parseInt(timestampMatch[8]) / 1000;

        currentCue = { time: startTime, endTime, text: '' };
        continue;
      }

      // Shorter timestamp format (MM:SS.mmm)
      const shortTimestampMatch = line.match(
        /(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2})[.,](\d{3})/
      );
      if (shortTimestampMatch) {
        if (currentCue && currentCue.text) {
          results.push(currentCue);
        }

        const startTime =
          parseInt(shortTimestampMatch[1]) * 60 +
          parseInt(shortTimestampMatch[2]) +
          parseInt(shortTimestampMatch[3]) / 1000;

        const endTime =
          parseInt(shortTimestampMatch[4]) * 60 +
          parseInt(shortTimestampMatch[5]) +
          parseInt(shortTimestampMatch[6]) / 1000;

        currentCue = { time: startTime, endTime, text: '' };
        continue;
      }

      // Text content
      if (currentCue) {
        currentCue.text += (currentCue.text ? '\n' : '') + line;
      }
    }

    // Don't forget last cue
    if (currentCue && currentCue.text) {
      results.push(currentCue);
    }

    return results;
  }

  /**
   * Generate a thumbnail at a specific time for video
   * Note: This requires canvas capture capability
   */
  async generateThumbnailAtTime(
    videoElement: HTMLVideoElement,
    time: number,
    width: number = 320
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Save current state
      const {currentTime} = videoElement;
      const wasPaused = videoElement.paused;

      const captureFrame = () => {
        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
        const height = Math.round(width / aspectRatio);

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(videoElement, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY.preview);

        // Restore state
        videoElement.currentTime = currentTime;
        if (!wasPaused) {
          videoElement.play();
        }

        resolve(dataUrl);
      };

      videoElement.addEventListener('seeked', captureFrame, { once: true });
      videoElement.pause();
      videoElement.currentTime = time;
    });
  }

  /**
   * Format time as HH:MM:SS or MM:SS
   */
  formatTime(seconds: number, includeHours: boolean = false): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (includeHours || h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Parse time string to seconds
   */
  parseTime(timeString: string): number {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseFloat(timeString) || 0;
  }
}

export const avService = new AVService();

export default avService;
