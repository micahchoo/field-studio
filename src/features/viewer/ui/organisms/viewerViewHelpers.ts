/**
 * viewerViewHelpers.ts — Pure helper functions for ViewerView organism
 *
 * Extracts media type detection, OSD initialization, screenshot logic,
 * keyboard handling, and chapter extraction to reduce ViewerView.svelte size.
 */

import type {
  IIIFManifest,
  IIIFRange,
  IIIFRangeReference,
} from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

// ============================================================================
// Types
// ============================================================================

export type MediaType = 'image' | 'video' | 'audio' | 'other';
export type ScreenshotFormat = 'image/png' | 'image/jpeg' | 'image/webp';
export type SpatialDrawingMode = 'polygon' | 'rectangle' | 'freehand';

export interface AnnotationStyleOptions {
  color: string;
  strokeWidth: number;
  fillOpacity: number;
}

export interface ChapterMarker {
  label: string;
  start: number;
  end: number;
  color: string;
}

export interface PaintingBody {
  id?: string;
  type?: string;
  format?: string;
  value?: string;
}

// ============================================================================
// Media type detection
// ============================================================================

export function detectMediaType(typeHint: string): MediaType {
  if (typeHint === 'Image') return 'image';
  if (typeHint === 'Video') return 'video';
  if (typeHint === 'Sound' || typeHint === 'Audio') return 'audio';
  if (typeHint.startsWith('video/')) return 'video';
  if (typeHint.startsWith('audio/')) return 'audio';
  if (typeHint.startsWith('image/')) return 'image';
  return 'other';
}

// ============================================================================
// OSD initialization
// ============================================================================

export interface OsdConfig {
  container: HTMLDivElement;
  tileSource: any;
  onZoomChange: (zoom: number) => void;
}

export function initializeOsd(OSD: any, config: OsdConfig): any {
  const viewer = OSD({
    element: config.container,
    prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
    tileSources: config.tileSource,
    gestureSettingsMouse: {
      clickToZoom: false,
      dblClickToZoom: true,
      pinchToZoom: true,
      flickEnabled: true,
    },
    gestureSettingsTouch: {
      pinchToZoom: true,
      flickEnabled: true,
    },
    showNavigationControl: false,
    showNavigator: true,
    navigatorPosition: 'BOTTOM_RIGHT',
    navigatorSizeRatio: 0.15,
    navigatorAutoFade: true,
    navigatorRotate: true,
    blendTime: 0.1,
    immediateRender: true,
    imageLoaderLimit: 4,
    maxImageCacheCount: 100,
    minZoomLevel: 0.1,
    maxZoomLevel: 20,
    visibilityRatio: 0.5,
    constrainDuringPan: true,
    animationTime: 0.5,
    springStiffness: 10,
    degrees: 0,
    debugMode: false,
    crossOriginPolicy: 'Anonymous',
  });

  // Track zoom level changes
  viewer.addHandler('zoom', () => {
    if (viewer?.viewport) {
      config.onZoomChange(Math.round(viewer.viewport.getZoom() * 100));
    }
  });

  // Retry on open-failed
  let retryCount = 0;
  viewer.addHandler('open-failed', async () => {
    if (retryCount >= 2 || !viewer) return;
    retryCount++;
    await new Promise(r => setTimeout(r, 300 * retryCount));
    if (viewer) viewer.open(config.tileSource);
  });

  return viewer;
}

export function destroyOsdViewer(viewer: any): void {
  if (!viewer) return;
  try {
    viewer.removeAllHandlers();
    viewer.destroy();
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// Screenshot
// ============================================================================

export async function captureScreenshot(
  osdViewer: any,
  format: ScreenshotFormat = 'image/png',
  action: 'download' | 'clipboard' = 'download'
): Promise<void> {
  if (!osdViewer?.drawer?.canvas) return;

  const canvas = osdViewer.drawer.canvas as HTMLCanvasElement;
  const quality = format === 'image/jpeg' ? 0.92 : format === 'image/webp' ? 0.9 : undefined;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), format, quality);
  });

  if (!blob) return;

  if (action === 'clipboard') {
    try {
      let clipBlob = blob;
      if (format !== 'image/png') {
        clipBlob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        }) || blob;
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': clipBlob })]);
      return;
    } catch {
      // Fallback to download
    }
  }

  const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `screenshot-${Date.now()}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Chapter extraction
// ============================================================================

const CHAPTER_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];

export function extractChapters(manifest: IIIFManifest | null, canvasId: string): ChapterMarker[] {
  if (!manifest?.structures || !canvasId) return [];
  const markers: ChapterMarker[] = [];

  function extractFromRange(range: IIIFRange, colorIdx: number): void {
    for (const ref of range.items) {
      const refId = (ref as IIIFRangeReference).id || '';
      if (!refId.includes(canvasId)) continue;
      const hashIdx = refId.indexOf('#t=');
      if (hashIdx === -1) continue;
      const fragment = refId.substring(hashIdx + 3);
      const parts = fragment.split(',');
      const start = parseFloat(parts[0]);
      const end = parts.length > 1 ? parseFloat(parts[1]) : start;
      if (isNaN(start)) continue;
      markers.push({
        label: getIIIFValue(range.label) || `Chapter ${markers.length + 1}`,
        start,
        end: isNaN(end) ? start : end,
        color: CHAPTER_COLORS[colorIdx % CHAPTER_COLORS.length],
      });
    }
  }

  manifest.structures.forEach((range, idx) => extractFromRange(range, idx));
  return markers.sort((a, b) => a.start - b.start);
}

// ============================================================================
// Image keyboard handler
// ============================================================================

export interface ImageKeyboardActions {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  flipHorizontal: () => void;
  toggleNavigator: () => void;
  toggleAnnotationTool: () => void;
  toggleMeasurement: () => void;
  toggleKeyboardHelp: () => void;
  exitFullscreen: () => void;
  isFullscreen: boolean;
}

export function handleImageKeyDown(e: KeyboardEvent, actions: ImageKeyboardActions): void {
  switch (e.key) {
    case 'r':
      e.preventDefault();
      if (e.shiftKey) actions.rotateCCW();
      else actions.rotateCW();
      break;
    case 'R':
      e.preventDefault();
      actions.rotateCCW();
      break;
    case 'f':
    case 'F':
      e.preventDefault();
      actions.flipHorizontal();
      break;
    case 'n':
    case 'N':
      e.preventDefault();
      actions.toggleNavigator();
      break;
    case '?':
      e.preventDefault();
      actions.toggleKeyboardHelp();
      break;
    case '+':
    case '=':
      e.preventDefault();
      actions.zoomIn();
      break;
    case '-':
    case '_':
      e.preventDefault();
      actions.zoomOut();
      break;
    case '0':
      e.preventDefault();
      actions.resetView();
      break;
    case 'a':
    case 'A':
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        actions.toggleAnnotationTool();
      }
      break;
    case 'm':
    case 'M':
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        actions.toggleMeasurement();
      }
      break;
    case 'Escape':
      if (actions.isFullscreen) {
        actions.exitFullscreen();
      }
      break;
  }
}
