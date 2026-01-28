/**
 * IIIF Content State API 1.0 Implementation
 *
 * Content State enables sharing exact views of IIIF resources via URLs.
 * It encodes the current viewing state (manifest, canvas, viewport region, time)
 * as a JSON-LD Annotation that can be serialized to a URL parameter.
 *
 * @see https://iiif.io/api/content-state/1.0/
 */

import { IIIFItem, IIIFCanvas } from '../types';
import { IIIF_SPEC } from '../constants';

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
  | string // Simple URI
  | SpecificResource
  | ContentStateTarget[]; // Multiple targets

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
  value: string; // e.g., "xywh=100,100,200,200" or "t=10,20"
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
  value: string; // Annotation ID
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
  /**
   * Encode a Content State to base64url format
   */
  encode: (json: object): string => {
    const str = JSON.stringify(json);
    // Use TextEncoder for proper UTF-8 handling
    const bytes = new TextEncoder().encode(str);
    const base64 = btoa(String.fromCharCode(...bytes));
    // Convert to base64url: replace + with -, / with _, remove =
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },

  /**
   * Decode a base64url Content State to JSON
   */
  decode: (encoded: string): ContentState | null => {
    try {
      // Restore standard base64 characters
      let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      while (base64.length % 4 !== 0) base64 += '=';
      // Decode base64
      const binaryStr = atob(base64);
      // Convert to UTF-8 string
      const bytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
      const str = new TextDecoder().decode(bytes);
      return JSON.parse(str);
    } catch (e) {
      console.error('[ContentState] Decoding failed', e);
      return null;
    }
  },

  /**
   * Create a Content State from viewport state
   */
  createContentState: (viewport: ViewportState): ContentState => {
    const selectors: Selector[] = [];

    // Add region selector (spatial)
    if (viewport.region) {
      const { x, y, w, h } = viewport.region;
      selectors.push({
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: `xywh=${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`
      });
    }

    // Add time selector (temporal)
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

    // Add annotation selector if targeting a specific annotation
    if (viewport.annotationId) {
      selectors.push({
        type: 'AnnotationSelector',
        value: viewport.annotationId
      });
    }

    // Build the target
    const target: SpecificResource = {
      type: 'SpecificResource',
      source: {
        id: viewport.canvasId,
        type: 'Canvas',
        partOf: [{
          id: viewport.manifestId,
          type: 'Manifest'
        }]
      }
    };

    if (selectors.length === 1) {
      target.selector = selectors[0];
    } else if (selectors.length > 1) {
      target.selector = selectors;
    }

    return {
      '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT as 'http://iiif.io/api/presentation/3/context.json',
      type: 'Annotation',
      motivation: 'contentState',
      target
    };
  },

  /**
   * Parse a Content State to extract viewport information
   */
  parseContentState: (state: ContentState): ViewportState | null => {
    try {
      // Unwrap arrays recursively to get a single target
      let target: ContentStateTarget = state.target;
      while (Array.isArray(target)) {
        target = target[0];
      }

      if (typeof target === 'string') {
        // Simple URI target
        return { manifestId: target, canvasId: target };
      }

      if (!target || typeof target !== 'object' || target.type !== 'SpecificResource') {
        return null;
      }

      const specificResource = target as SpecificResource;
      const source = specificResource.source;
      const canvasId = typeof source === 'string' ? source : source.id;
      const manifestId = typeof source === 'object' && source.partOf?.[0]?.id
        ? source.partOf[0].id
        : canvasId;

      const viewport: ViewportState = { manifestId, canvasId };

      // Parse selectors
      const selectors = Array.isArray(specificResource.selector)
        ? specificResource.selector
        : specificResource.selector
          ? [specificResource.selector]
          : [];

      for (const selector of selectors) {
        if (selector.type === 'FragmentSelector') {
          const value = selector.value;

          // Parse xywh
          const xywhMatch = value.match(/xywh=(\d+),(\d+),(\d+),(\d+)/);
          if (xywhMatch) {
            viewport.region = {
              x: parseInt(xywhMatch[1]),
              y: parseInt(xywhMatch[2]),
              w: parseInt(xywhMatch[3]),
              h: parseInt(xywhMatch[4])
            };
          }

          // Parse time
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
          // Convert point to small region
          const point = selector as PointSelector;
          if (point.x !== undefined && point.y !== undefined) {
            viewport.region = {
              x: point.x - 50,
              y: point.y - 50,
              w: 100,
              h: 100
            };
          }
          if (point.t !== undefined) {
            viewport.time = { start: point.t };
          }
        }
      }

      return viewport;
    } catch (e) {
      console.error('[ContentState] Parse failed', e);
      return null;
    }
  },

  /**
   * Generate a shareable URL with content state
   * Per IIIF Content State API 1.0 spec
   */
  generateLink: (baseUrl: string, viewport: ViewportState): string => {
    try {
      // Validate viewport has required fields
      if (!viewport.manifestId || !viewport.canvasId) {
        console.warn('[ContentState] Invalid viewport state - missing manifestId or canvasId');
        return window.location.href;
      }

      // Ensure the base URL is properly formed
      let cleanBaseUrl = baseUrl;

      // Handle empty, null, undefined, or invalid base URLs
      if (!cleanBaseUrl || cleanBaseUrl === '/' || cleanBaseUrl.trim() === '') {
        cleanBaseUrl = window.location.origin + window.location.pathname;
      }

      // Handle relative URLs - prepend origin
      if (!cleanBaseUrl.startsWith('http')) {
        cleanBaseUrl = window.location.origin + (cleanBaseUrl.startsWith('/') ? '' : '/') + cleanBaseUrl;
      }

      // Remove trailing slashes for cleaner URLs
      cleanBaseUrl = cleanBaseUrl.replace(/\/+$/, '');

      // If it's just the origin with no path, add the app base path
      const appBasePath = import.meta.env.BASE_URL || '/';
      if (cleanBaseUrl === window.location.origin) {
        cleanBaseUrl = window.location.origin + appBasePath.replace(/\/$/, '');
      }

      // Create content state and encode it
      const state = contentStateService.createContentState(viewport);
      const encoded = contentStateService.encode(state);

      // Construct URL with iiif-content parameter
      const url = new URL(cleanBaseUrl);
      url.searchParams.set('iiif-content', encoded);
      return url.toString();
    } catch (e) {
      console.error('[ContentState] URL generation failed', e);
      // Return current URL as fallback - always safe
      return window.location.href;
    }
  },

  /**
   * Generate a simple link to a canvas
   */
  generateCanvasLink: (baseUrl: string, manifestId: string, canvasId: string): string => {
    return contentStateService.generateLink(baseUrl, { manifestId, canvasId });
  },

  /**
   * Parse content state from URL
   */
  parseFromUrl: (url: string = window.location.href): ViewportState | null => {
    try {
      const urlObj = new URL(url);
      const encoded = urlObj.searchParams.get('iiif-content');
      if (!encoded) return null;

      const state = contentStateService.decode(encoded);
      if (!state) return null;

      return contentStateService.parseContentState(state);
    } catch (e) {
      console.error('[ContentState] URL parse failed', e);
      return null;
    }
  },

  /**
   * Update the current URL with content state (without reload)
   */
  updateUrl: (viewport: ViewportState): void => {
    const newUrl = contentStateService.generateLink(
      window.location.origin + window.location.pathname,
      viewport
    );
    window.history.replaceState({}, '', newUrl);
  },

  /**
   * Copy a content state link to clipboard
   */
  copyLink: async (viewport: ViewportState): Promise<boolean> => {
    try {
      const link = contentStateService.generateLink(
        window.location.origin + window.location.pathname,
        viewport
      );
      await navigator.clipboard.writeText(link);
      return true;
    } catch (e) {
      console.error('[ContentState] Copy failed', e);
      return false;
    }
  },

  /**
   * Generate embed code with content state
   */
  generateEmbedCode: (viewport: ViewportState, options: {
    width?: number;
    height?: number;
    viewerUrl?: string;
  } = {}): string => {
    const {
      width = 800,
      height = 600,
      viewerUrl = window.location.origin + '/viewer.html'
    } = options;

    const state = contentStateService.createContentState(viewport);
    const encoded = contentStateService.encode(state);
    const url = new URL(viewerUrl);
    url.searchParams.set('iiif-content', encoded);

    return `<iframe
  src="${url.toString()}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allowfullscreen
  title="IIIF Viewer"
></iframe>`;
  },

  /**
   * Handle drag-and-drop of content state
   * Returns the parsed viewport state from a DataTransfer object
   */
  handleDrop: (dataTransfer: DataTransfer): ViewportState | null => {
    // Check for content state in various formats
    const formats = [
      'application/ld+json',
      'application/json',
      'text/plain',
      'text/uri-list'
    ];

    for (const format of formats) {
      const data = dataTransfer.getData(format);
      if (!data) continue;

      // Try parsing as JSON content state
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'Annotation' && parsed.motivation) {
          const motivation = Array.isArray(parsed.motivation)
            ? parsed.motivation
            : [parsed.motivation];
          if (motivation.includes('contentState')) {
            return contentStateService.parseContentState(parsed as ContentState);
          }
        }
      } catch {
        // Not JSON, try as URL
      }

      // Try parsing as URL with iiif-content param
      if (data.startsWith('http')) {
        const viewport = contentStateService.parseFromUrl(data);
        if (viewport) return viewport;
      }
    }

    return null;
  },

  /**
   * Create drag data for content state
   */
  createDragData: (viewport: ViewportState): { [format: string]: string } => {
    const state = contentStateService.createContentState(viewport);
    const link = contentStateService.generateLink(
      window.location.origin + window.location.pathname,
      viewport
    );

    return {
      'application/ld+json': JSON.stringify(state, null, 2),
      'application/json': JSON.stringify(state),
      'text/plain': link,
      'text/uri-list': link
    };
  },

  /**
   * Set drag data on DataTransfer object
   */
  setDragData: (dataTransfer: DataTransfer, viewport: ViewportState): void => {
    const data = contentStateService.createDragData(viewport);
    for (const [format, value] of Object.entries(data)) {
      dataTransfer.setData(format, value);
    }
  }
};

export default contentStateService;
