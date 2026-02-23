// Pure TypeScript — no Svelte-specific conversion

/**
 * IIIF Content State API 1.0 Implementation
 *
 * Content State enables sharing exact views of IIIF resources via URLs.
 * @see https://iiif.io/api/content-state/1.0/
 */

import { vaultLog } from './logger';

const PRESENTATION_3_CONTEXT = 'http://iiif.io/api/presentation/3/context.json';

// ============================================================================
// Types
// ============================================================================

export interface ContentState {
  '@context': 'http://iiif.io/api/presentation/3/context.json';
  id?: string;
  type: 'Annotation';
  motivation: 'contentState' | ['contentState', ...string[]];
  target: ContentStateTarget;
}

export type ContentStateTarget =
  | string
  | SpecificResource
  | ContentStateTarget[];

export interface SpecificResource {
  id?: string;
  type: 'SpecificResource';
  source: string | { id: string; type: string; partOf?: PartOf[] };
  selector?: Selector | Selector[];
}

export interface PartOf {
  id: string;
  type: 'Manifest' | 'Collection';
}

export type Selector =
  | PointSelector
  | FragmentSelector
  | ImageApiSelector
  | AnnotationSelector;

export interface PointSelector {
  type: 'PointSelector';
  x?: number;
  y?: number;
  t?: number;
}

export interface FragmentSelector {
  type: 'FragmentSelector';
  conformsTo: 'http://www.w3.org/TR/media-frags/';
  value: string;
}

export interface ImageApiSelector {
  type: 'ImageApiSelector';
  region?: string;
  size?: string;
  rotation?: string;
  quality?: string;
  format?: string;
}

export interface AnnotationSelector {
  type: 'AnnotationSelector';
  value: string;
}

export interface ViewportState {
  manifestId: string;
  canvasId: string;
  region?: { x: number; y: number; w: number; h: number };
  time?: { start?: number; end?: number };
  annotationId?: string;
}

// ============================================================================
// Content State Service
// ============================================================================

export const contentStateService = {
  encode: (json: object): string => {
    const str = JSON.stringify(json);
    const bytes = new TextEncoder().encode(str);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },

  decode: (encoded: string): ContentState | null => {
    try {
      let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) base64 += '=';
      const binaryStr = atob(base64);
      const bytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
      const str = new TextDecoder().decode(bytes);
      return JSON.parse(str);
    } catch (e) {
      vaultLog.error('[ContentState] Decoding failed', e instanceof Error ? e : undefined);
      return null;
    }
  },

  createContentState: (viewport: ViewportState): ContentState => {
    const selectors: Selector[] = [];

    if (viewport.region) {
      const { x, y, w, h } = viewport.region;
      selectors.push({
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: `xywh=${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`
      });
    }

    if (viewport.time) {
      let timeValue = 't=';
      if (viewport.time.start !== undefined && viewport.time.end !== undefined) {
        timeValue += `${viewport.time.start},${viewport.time.end}`;
      } else if (viewport.time.start !== undefined) {
        timeValue += viewport.time.start;
      }
      selectors.push({
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: timeValue
      });
    }

    if (viewport.annotationId) {
      selectors.push({
        type: 'AnnotationSelector',
        value: viewport.annotationId
      });
    }

    const target: SpecificResource = {
      type: 'SpecificResource',
      source: {
        id: viewport.canvasId,
        type: 'Canvas',
        partOf: [{ id: viewport.manifestId, type: 'Manifest' }]
      }
    };

    if (selectors.length === 1) {
      target.selector = selectors[0];
    } else if (selectors.length > 1) {
      target.selector = selectors;
    }

    return {
      '@context': PRESENTATION_3_CONTEXT as 'http://iiif.io/api/presentation/3/context.json',
      type: 'Annotation',
      motivation: 'contentState',
      target
    };
  },

  parseContentState: (state: ContentState): ViewportState | null => {
    try {
      let { target } = state;
      while (Array.isArray(target)) {
        target = target[0];
      }

      if (typeof target === 'string') {
        return { manifestId: target, canvasId: target };
      }

      if (!target || typeof target !== 'object' || target.type !== 'SpecificResource') {
        return null;
      }

      const specificResource = target as SpecificResource;
      const { source } = specificResource;
      const canvasId = typeof source === 'string' ? source : source.id;
      const manifestId = typeof source === 'object' && source.partOf?.[0]?.id
        ? source.partOf[0].id
        : canvasId;

      const viewport: ViewportState = { manifestId, canvasId };

      const selectors = Array.isArray(specificResource.selector)
        ? specificResource.selector
        : specificResource.selector
          ? [specificResource.selector]
          : [];

      for (const selector of selectors) {
        if (selector.type === 'FragmentSelector') {
          const { value } = selector;

          const xywhMatch = value.match(/xywh=(\d+),(\d+),(\d+),(\d+)/);
          if (xywhMatch) {
            viewport.region = {
              x: parseInt(xywhMatch[1]),
              y: parseInt(xywhMatch[2]),
              w: parseInt(xywhMatch[3]),
              h: parseInt(xywhMatch[4])
            };
          }

          const timeMatch = value.match(/t=([\d.]+)(?:,([\d.]+))?/);
          if (timeMatch) {
            viewport.time = {
              start: parseFloat(timeMatch[1]),
              end: timeMatch[2] ? parseFloat(timeMatch[2]) : undefined
            };
          }
        } else if (selector.type === 'AnnotationSelector') {
          viewport.annotationId = selector.value;
        } else if (selector.type === 'PointSelector') {
          const point = selector as PointSelector;
          if (point.x !== undefined && point.y !== undefined) {
            viewport.region = { x: point.x - 50, y: point.y - 50, w: 100, h: 100 };
          }
          if (point.t !== undefined) {
            viewport.time = { start: point.t };
          }
        }
      }

      return viewport;
    } catch (e) {
      vaultLog.error('[ContentState] Parse failed', e instanceof Error ? e : undefined);
      return null;
    }
  },

  generateLink: (baseUrl: string, viewport: ViewportState): string => {
    try {
      if (!viewport.manifestId || !viewport.canvasId) {
        vaultLog.warn('[ContentState] Invalid viewport state');
        return typeof window !== 'undefined' ? window.location.href : baseUrl;
      }

      let cleanBaseUrl = baseUrl;
      if (!cleanBaseUrl || cleanBaseUrl === '/' || cleanBaseUrl.trim() === '') {
        cleanBaseUrl = typeof window !== 'undefined'
          ? window.location.origin + window.location.pathname
          : baseUrl;
      }
      if (!cleanBaseUrl.startsWith('http')) {
        cleanBaseUrl = (typeof window !== 'undefined' ? window.location.origin : '') + (cleanBaseUrl.startsWith('/') ? '' : '/') + cleanBaseUrl;
      }
      cleanBaseUrl = cleanBaseUrl.replace(/\/+$/, '');

      const state = contentStateService.createContentState(viewport);
      const encoded = contentStateService.encode(state);
      const url = new URL(cleanBaseUrl);
      url.searchParams.set('iiif-content', encoded);
      return url.toString();
    } catch (e) {
      vaultLog.error('[ContentState] URL generation failed', e instanceof Error ? e : undefined);
      return typeof window !== 'undefined' ? window.location.href : baseUrl;
    }
  },

  generateCanvasLink: (baseUrl: string, manifestId: string, canvasId: string): string => {
    return contentStateService.generateLink(baseUrl, { manifestId, canvasId });
  },

  parseFromUrl: (url: string = typeof window !== 'undefined' ? window.location.href : ''): ViewportState | null => {
    try {
      const urlObj = new URL(url);
      const encoded = urlObj.searchParams.get('iiif-content');
      if (!encoded) return null;
      const state = contentStateService.decode(encoded);
      if (!state) return null;
      return contentStateService.parseContentState(state);
    } catch (e) {
      vaultLog.error('[ContentState] URL parse failed', e instanceof Error ? e : undefined);
      return null;
    }
  },

  updateUrl: (viewport: ViewportState): void => {
    if (typeof window === 'undefined') return;
    const newUrl = contentStateService.generateLink(
      window.location.origin + window.location.pathname,
      viewport
    );
    window.history.replaceState({}, '', newUrl);
  },

  copyLink: async (viewport: ViewportState): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') return false;
      const link = contentStateService.generateLink(
        window.location.origin + window.location.pathname,
        viewport
      );
      await navigator.clipboard.writeText(link);
      return true;
    } catch (e) {
      vaultLog.error('[ContentState] Copy failed', e instanceof Error ? e : undefined);
      return false;
    }
  },

  generateEmbedCode: (viewport: ViewportState, options: {
    width?: number;
    height?: number;
    viewerUrl?: string;
  } = {}): string => {
    const {
      width = 800,
      height = 600,
      viewerUrl = typeof window !== 'undefined' ? `${window.location.origin}/viewer.html` : '/viewer.html'
    } = options;

    const state = contentStateService.createContentState(viewport);
    const encoded = contentStateService.encode(state);
    const url = new URL(viewerUrl);
    url.searchParams.set('iiif-content', encoded);

    return `<iframe\n  src="${url.toString()}"\n  width="${width}"\n  height="${height}"\n  frameborder="0"\n  allowfullscreen\n  title="IIIF Viewer"\n></iframe>`;
  },

  handleDrop: (dataTransfer: DataTransfer): ViewportState | null => {
    const formats = ['application/ld+json', 'application/json', 'text/plain', 'text/uri-list'];
    for (const format of formats) {
      const data = dataTransfer.getData(format);
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'Annotation' && parsed.motivation) {
          const motivation = Array.isArray(parsed.motivation) ? parsed.motivation : [parsed.motivation];
          if (motivation.includes('contentState')) {
            return contentStateService.parseContentState(parsed as ContentState);
          }
        }
      } catch {
        // Not JSON
      }
      if (data.startsWith('http')) {
        const vp = contentStateService.parseFromUrl(data);
        if (vp) return vp;
      }
    }
    return null;
  },

  createDragData: (viewport: ViewportState): Record<string, string> => {
    const state = contentStateService.createContentState(viewport);
    const link = contentStateService.generateLink(
      typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '/',
      viewport
    );
    return {
      'application/ld+json': JSON.stringify(state, null, 2),
      'application/json': JSON.stringify(state),
      'text/plain': link,
      'text/uri-list': link
    };
  },

  setDragData: (dataTransfer: DataTransfer, viewport: ViewportState): void => {
    const data = contentStateService.createDragData(viewport);
    for (const [format, value] of Object.entries(data)) {
      dataTransfer.setData(format, value);
    }
  }
};

export default contentStateService;
