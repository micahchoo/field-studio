  /**
 * Viewer Feature Model
 *
 * Domain-specific state management for the IIIF viewer.
 * Encapsulates OpenSeadragon integration, media type detection, and viewer state.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Pure business logic, no UI concerns
 * - Reactive hooks for viewer state
 * - OSD lifecycle management
 *
 * IDEAL OUTCOME: Consistent viewer behavior across the app
 * FAILURE PREVENTED: Memory leaks from OSD, stale image URLs, race conditions
 */

export { useComposer, type UseComposerReturn } from './composer';
export {
  // Spatial annotation utilities
  useAnnotation,
  pointsToSvgPath,
  createSvgSelector,
  parseSvgSelector,
  getBoundingBox,
  simplifyPath,
  // Time-based annotation utilities
  useTimeAnnotation,
  createTimeFragmentSelector,
  parseTimeFragmentSelector,
  formatTimeForDisplay,
  createTimeAnnotation,
  isTimeBasedAnnotation,
  getAnnotationTimeRange,
  // Types
  type DrawingMode,
  type SpatialDrawingMode,
  type TimeDrawingMode,
  type TimeRange,
  type TimeAnnotationState,
  type UseAnnotationReturn,
  type UseTimeAnnotationReturn,
} from './annotation';
export {
  useMediaPlayer,
  type MediaState,
} from './useMediaPlayer';
export {
  useViewingBehavior,
  type ViewingBehavior,
  type ViewingLayout,
} from './useViewingBehavior';
export {
  useAnnotationLayers,
  type AnnotationLayer,
  type UseAnnotationLayersReturn,
} from './useAnnotationLayers';
export {
  useAnnotorious,
  type AnnotoriousDrawingTool,
  type UseAnnotoriousOptions,
  type UseAnnotoriousReturn,
} from './useAnnotorious';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IIIFAnnotation, IIIFAnnotationBody, IIIFCanvas, IIIFExternalWebResource, IIIFManifest, IIIFTextualBody } from '@/src/shared/types';
import { isChoice, getIIIFValue } from '@/src/shared/types';
import { contentSearchService } from '@/src/entities/annotation/model/contentSearchService';
import { resolveImageSource } from '@/src/entities/canvas/model/imageSourceResolver';
import { getFile } from '@/src/shared/services/storage';

declare const OpenSeadragon: any;

// ============================================================================
// Types
// ============================================================================

export type MediaType = 'image' | 'video' | 'audio' | 'other';

/** A single option within a Choice body */
export interface ChoiceItem {
  label: string;
  body: IIIFExternalWebResource | IIIFTextualBody;
}

export interface ViewerState {
  mediaType: MediaType;
  annotations: IIIFAnnotation[];
  resolvedImageUrl: string | null;
  rotation: number;
  zoomLevel: number;
  isFlipped: boolean;
  showNavigator: boolean;
  isFullscreen: boolean;
  showTranscriptionPanel: boolean;
  showSearchPanel: boolean;
  showMetadataPanel: boolean;
  showWorkbench: boolean;
  showAnnotationTool: boolean;
  showFilmstrip: boolean;
  showKeyboardHelp: boolean;
  selectedAnnotationId: string | null;
  isOcring: boolean;
  osdReady: number;

  // Choice support
  hasChoice: boolean;
  choiceItems: ChoiceItem[];
  activeChoiceIndex: number;
}

export interface UseViewerReturn extends ViewerState {
  // Refs
  viewerRef: React.MutableRefObject<any>;
  osdContainerRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;

  // OSD Actions
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  setRotation: (degrees: number) => void;
  flipHorizontal: () => void;
  takeScreenshot: () => Promise<Blob | null>;

  // Panel Toggles
  toggleFullscreen: () => void;
  toggleNavigator: () => void;
  toggleTranscriptionPanel: () => void;
  toggleSearchPanel: () => void;
  toggleMetadataPanel: () => void;
  toggleWorkbench: () => void;
  toggleComposer: () => void;
  toggleAnnotationTool: () => void;
  toggleFilmstrip: () => void;
  toggleKeyboardHelp: () => void;

  // Annotation Actions
  selectAnnotation: (id: string | null) => void;
  addAnnotation: (annotation: IIIFAnnotation) => void;
  removeAnnotation: (id: string) => void;

  // Choice Actions
  setActiveChoiceIndex: (index: number) => void;

  // Utility
  hasSearchService: boolean;
  canDownload: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

const detectMediaType = (mimeTypeOrType: string): MediaType => {
  // First check if it's a IIIF type (e.g., "Image", "Video", "Sound")
  if (mimeTypeOrType === 'Image') return 'image';
  if (mimeTypeOrType === 'Video') return 'video';
  if (mimeTypeOrType === 'Sound' || mimeTypeOrType === 'Audio') return 'audio';

  // Then check MIME types
  if (mimeTypeOrType.startsWith('video/')) return 'video';
  if (mimeTypeOrType.startsWith('audio/')) return 'audio';
  if (mimeTypeOrType.startsWith('image/')) return 'image';
  return 'other';
};

const extractAnnotations = (item: IIIFCanvas | null): IIIFAnnotation[] => {
  if (!item?.annotations) return [];
  
  const annotations: IIIFAnnotation[] = [];
  item.annotations.forEach(page => {
    if (page.items) {
      annotations.push(...page.items);
    }
  });
  return annotations;
};

const _resolveImageUrl = (item: IIIFCanvas | null): string | null => {
  if (!item) return null;
  
  if (item._blobUrl) return item._blobUrl;
  
  const paintingBody = item.items?.[0]?.items?.[0]?.body as any;
  if (paintingBody?.id) return paintingBody.id;
  
  return null;
};

// ============================================================================
// Hook
// ============================================================================

export const useViewer = (
  item: IIIFCanvas | null,
  manifest: IIIFManifest | null
): UseViewerReturn => {
  // Refs
  const viewerRef = useRef<any>(null);
  const osdContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // State
  const [mediaType, setMediaType] = useState<MediaType>('other');
  const [annotations, setAnnotations] = useState<IIIFAnnotation[]>([]);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  const [rotation, setRotationState] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showNavigator, setShowNavigator] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTranscriptionPanel, setShowTranscriptionPanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [showAnnotationTool, setShowAnnotationTool] = useState(false);
  const [showFilmstrip, setShowFilmstrip] = useState(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isOcring, _setIsOcring] = useState(false);
  const [activeChoiceIndex, setActiveChoiceIndex] = useState(0);
  const [osdReady, setOsdReady] = useState(0);

  // Detect Choice bodies on the painting annotation
  const { hasChoice, choiceItems } = useMemo(() => {
    if (!item?.items?.[0]?.items?.[0]) {
      return { hasChoice: false, choiceItems: [] as ChoiceItem[] };
    }

    const body = item.items[0].items[0].body as IIIFAnnotationBody;
    if (!body || !isChoice(body)) {
      return { hasChoice: false, choiceItems: [] as ChoiceItem[] };
    }

    const items: ChoiceItem[] = body.items.map((b) => ({
      label: getIIIFValue((b as { label?: Record<string, string[]> }).label) ||
        ('format' in b ? b.format : '') ||
        ('type' in b ? b.type : 'Option'),
      body: b,
    }));

    return { hasChoice: items.length > 0, choiceItems: items };
  }, [item?.id]);

  // Reset choice index when canvas changes
  useEffect(() => {
    setActiveChoiceIndex(0);
  }, [item?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cleanup OSD
      if (viewerRef.current) {
        try {
          viewerRef.current.removeAllHandlers();
          viewerRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        viewerRef.current = null;
      }
      // Cleanup object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Detect media type and extract annotations when item changes
  useEffect(() => {
    if (!item) {
      setMediaType('other');
      setAnnotations([]);
      return;
    }

    const paintingBody = item.items?.[0]?.items?.[0]?.body as any;

    // Try IIIF type first (e.g., "Image", "Video", "Sound")
    // Then fall back to MIME type format (e.g., "image/jpeg", "video/mp4")
    const typeHint = paintingBody?.type || paintingBody?.format || '';

    setMediaType(detectMediaType(typeHint));
    setAnnotations(extractAnnotations(item));
  }, [item?.id]);

  // Resolve media URL using entity-layer resolver for images, direct extraction for audio/video
  useEffect(() => {
    // Cleanup previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!item) {
      setResolvedImageUrl(null);
      return;
    }

    // Debug: Log canvas structure
    console.log('[useViewer] Resolving media for canvas:', {
      id: item.id,
      hasItems: !!item.items,
      itemsLength: item.items?.length,
      firstPage: item.items?.[0],
      firstAnnotation: item.items?.[0]?.items?.[0],
      body: item.items?.[0]?.items?.[0]?.body
    });

    // Get painting body directly to detect media type
    const paintingBody = item.items?.[0]?.items?.[0]?.body as any;
    const bodyType = paintingBody?.type || '';

    // For audio/video, extract URL directly (resolveImageSource only handles Image type)
    if (bodyType === 'Sound' || bodyType === 'Video' || bodyType === 'Audio') {
      // Check for blob URL first
      if (item._blobUrl) {
        setResolvedImageUrl(item._blobUrl);
        console.log('[useViewer] Using blob URL for AV:', item._blobUrl);
        return;
      }

      // Check for file reference
      if (item._fileRef && item._fileRef instanceof Blob) {
        try {
          const blobUrl = URL.createObjectURL(item._fileRef);
          objectUrlRef.current = blobUrl;
          setResolvedImageUrl(blobUrl);
          console.log('[useViewer] Created blob URL from fileRef for AV');
          return;
        } catch (e) {
          console.warn('[useViewer] Failed to create blob URL for AV:', e);
        }
      }

      // Fall back to direct URL
      if (paintingBody?.id) {
        setResolvedImageUrl(paintingBody.id);
        console.log('[useViewer] Using direct URL for AV:', paintingBody.id);
        return;
      }

      console.warn('[useViewer] No URL found for audio/video canvas:', item.id);
      setResolvedImageUrl(null);
      return;
    }

    // For images, use the comprehensive image source resolver from entity layer
    // This handles blob URLs, file refs, IIIF Image Services, and fallbacks
    try {
      const resolved = resolveImageSource(item);

      // If resolved is a blob URL that we created, track it for cleanup
      if (resolved && resolved.url && resolved.url.startsWith('blob:')) {
        objectUrlRef.current = resolved.url;
      }

      setResolvedImageUrl(resolved?.url || null);

      if (resolved?.url) {
        console.log('[useViewer] Image resolved:', {
          type: resolved.type,
          url: resolved.url,
          hasService: !!resolved.serviceId,
          profile: resolved.profile
        });
      } else {
        console.warn('[useViewer] Could not resolve image URL for canvas:', item.id);
      }
    } catch (e) {
      console.error('[useViewer] Error resolving image source:', e);
      setResolvedImageUrl(null);
    }
  }, [item?.id]);

  // Initialize/destroy OpenSeadragon
  useEffect(() => {
    let isActive = true;
    let resizeObserver: ResizeObserver | null = null;
    let currentTileSource: any = null; // Store tileSource for retry on open-failed
    let idbBlobUrl: string | null = null; // Track blob URLs created from IndexedDB for cleanup

    // Debug logging
    console.log('[useViewer] OSD effect triggered:', {
      mediaType,
      hasItem: !!item,
      hasContainer: !!osdContainerRef.current,
      resolvedImageUrl,
      hasOpenSeadragon: typeof OpenSeadragon !== 'undefined'
    });

    const initializeOSD = async () => {
      if (!isActive || !osdContainerRef.current || !resolvedImageUrl || mediaType !== 'image') {
        return false;
      }

      // Check if OpenSeadragon is available
      if (typeof OpenSeadragon === 'undefined') {
        console.error('[useViewer] OpenSeadragon is not loaded!');
        return false;
      }

      // Destroy existing viewer
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
          console.log('[useViewer] Destroyed existing OSD viewer');
        } catch (e) {
          console.warn('[useViewer] Error destroying OSD viewer:', e);
        }
        viewerRef.current = null;
      }

      // Get detailed image source info to check for IIIF Image Service
      try {
        const resolved = resolveImageSource(item);
        const paintingBody = item.items?.[0]?.items?.[0]?.body as any;

        // Determine the info.json URL
        let infoJsonUrl: string | null = null;
        if (resolved?.serviceId && resolved?.profile) {
          infoJsonUrl = `${resolved.serviceId}/info.json`;
          console.log('[useViewer] Using IIIF Image Service:', infoJsonUrl);
        } else if (paintingBody?.service?.[0]?.id) {
          infoJsonUrl = `${paintingBody.service[0].id}/info.json`;
          console.log('[useViewer] Using painting body service:', infoJsonUrl);
        }

        if (infoJsonUrl) {
          // Pre-fetch info.json via fetch() to avoid OSD's XHR XML parsing issues.
          // The SW intercepts fetch() properly; OSD's own XHR can receive
          // an XMLDocument instead of JSON when Content-Type isn't handled correctly.
          try {
            const resp = await fetch(infoJsonUrl);
            if (resp.ok) {
              const contentType = resp.headers.get('content-type') || '';
              if (contentType.includes('json')) {
                const infoJson = await resp.json();
                currentTileSource = infoJson;
                console.log('[useViewer] Pre-fetched info.json successfully');
              } else {
                // SW not active — response is likely HTML from Vite SPA fallback
                throw new Error('Response is not JSON (SW likely not active)');
              }
            } else {
              throw new Error(`info.json returned ${resp.status}`);
            }
          } catch (fetchErr) {
            console.warn('[useViewer] IIIF service unavailable:', fetchErr);
            // SW not running — load blob directly from IndexedDB as fallback
            const serviceUrl = resolved?.serviceId || paintingBody?.service?.[0]?.id;
            const assetIdMatch = serviceUrl?.match(/\/iiif\/image\/([^/]+)/);
            if (assetIdMatch) {
              try {
                const file = await getFile(assetIdMatch[1]);
                if (file?.blob) {
                  const blobUrl = URL.createObjectURL(file.blob);
                  idbBlobUrl = blobUrl;
                  currentTileSource = { type: 'image', url: blobUrl };
                  console.log('[useViewer] Loaded image blob from IndexedDB');
                } else {
                  currentTileSource = { type: 'image', url: resolvedImageUrl };
                }
              } catch (idbErr) {
                console.warn('[useViewer] IndexedDB fallback failed:', idbErr);
                currentTileSource = { type: 'image', url: resolvedImageUrl };
              }
            } else {
              currentTileSource = { type: 'image', url: resolvedImageUrl };
            }
          }
        } else {
          // No IIIF service, use direct image URL
          currentTileSource = { type: 'image', url: resolvedImageUrl };
          console.log('[useViewer] Using direct image URL:', resolvedImageUrl);
        }
      } catch (e) {
        // Fallback if resolver fails
        currentTileSource = { type: 'image', url: resolvedImageUrl };
        console.error('[useViewer] Error detecting IIIF service, using direct URL:', e);
      }

      if (!isActive) return false;

      console.log('[useViewer] Initializing OSD with tileSource:', currentTileSource);

      try {
        // Ensure container has dimensions
        const container = osdContainerRef.current;
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.warn('[useViewer] OSD container has zero dimensions, will retry when resized');
          return false;
        }

        viewerRef.current = OpenSeadragon({
          element: container,
          prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
          tileSources: currentTileSource,
          // Gesture settings
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
          // Navigation controls
          showNavigationControl: false, // We use custom toolbar
          showNavigator: true,
          navigatorPosition: 'BOTTOM_RIGHT',
          navigatorSizeRatio: 0.15,
          navigatorAutoFade: true,
          navigatorRotate: true,
          // Performance
          blendTime: 0.1,
          immediateRender: true,
          imageLoaderLimit: 4,
          maxImageCacheCount: 100,
          // Viewport constraints
          minZoomLevel: 0.1,
          maxZoomLevel: 20,
          visibilityRatio: 0.5,
          constrainDuringPan: true,
          // Animation
          animationTime: 0.5,
          springStiffness: 10,
          // Rotation & Flip support
          degrees: 0,
          // Misc
          debugMode: false,
          crossOriginPolicy: 'Anonymous',
        });

        console.log('[useViewer] OSD viewer initialized successfully');
        setOsdReady(prev => prev + 1);

        // Track zoom level changes
        viewerRef.current.addHandler('zoom', () => {
          if (viewerRef.current && isMountedRef.current) {
            const zoom = viewerRef.current.viewport.getZoom();
            setZoomLevel(Math.round(zoom * 100));
          }
        });

        // Handle open events for debugging
        viewerRef.current.addHandler('open', () => {
          console.log('[useViewer] OSD image opened successfully');
        });

        let retryCount = 0;
        const MAX_RETRIES = 2;

        viewerRef.current.addHandler('open-failed', async (e: { message?: string; source?: unknown }) => {
          console.error('[useViewer] OSD failed to open image:', e.message || e);

          if (retryCount >= MAX_RETRIES || !isActive) return;
          retryCount++;

          // Wait for SW to be ready, or just delay
          const swReady = (window as any).__swReady;
          if (swReady) await swReady;
          await new Promise(r => setTimeout(r, 300 * retryCount));

          if (viewerRef.current && isActive) {
            console.log(`[useViewer] Retry ${retryCount}/${MAX_RETRIES}...`);
            viewerRef.current.open(currentTileSource);
          }
        });

        return true;
      } catch (e) {
        console.error('[useViewer] Error initializing OSD viewer:', e);
        return false;
      }
    };

    // Try to initialize immediately
    initializeOSD().then((initialized) => {
      if (!isActive) return;
      // If not initialized due to zero dimensions, watch for resize
      if (!initialized && osdContainerRef.current && mediaType === 'image' && resolvedImageUrl) {
        console.log('[useViewer] Setting up resize observer to retry initialization');

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0 && !viewerRef.current) {
              console.log('[useViewer] Container resized, retrying OSD initialization');
              initializeOSD();
            }
          }
        });

        resizeObserver.observe(osdContainerRef.current!);
      }
    });

    // Handle window resize for responsive viewer
    const handleResize = () => {
      if (viewerRef.current && viewerRef.current.viewport) {
        try {
          viewerRef.current.viewport.resize();
        } catch (error) {
          console.warn('[useViewer] Error during viewport resize:', error);
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isActive = false;
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (viewerRef.current) {
        try {
          viewerRef.current.removeAllHandlers();
          viewerRef.current.destroy();
          console.log('[useViewer] OSD viewer cleaned up');
        } catch (e) {
          console.warn('[useViewer] Error during OSD cleanup:', e);
        }
        viewerRef.current = null;
      }
      if (idbBlobUrl) {
        URL.revokeObjectURL(idbBlobUrl);
      }
    };
  }, [item?.id, mediaType, resolvedImageUrl]);

  // Search service detection
  const hasSearchService = useMemo(() => {
    if (!manifest?.service) return false;
    const services = Array.isArray(manifest.service) ? manifest.service : [manifest.service];
    return services.some(svc => contentSearchService.extractSearchService(svc) !== null);
  }, [manifest]);

  // OSD Actions
  const zoomIn = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.viewport.zoomBy(1.2);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.viewport.zoomBy(0.8);
    }
  }, []);

  const resetView = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.viewport.goHome();
      viewerRef.current.viewport.setRotation(0);
      viewerRef.current.viewport.setFlip(false);
      setRotationState(0);
      setIsFlipped(false);
      setZoomLevel(100);
    }
  }, []);

  const rotateCW = useCallback(() => {
    if (viewerRef.current) {
      const newRotation = (rotation + 90) % 360;
      viewerRef.current.viewport.setRotation(newRotation);
      setRotationState(newRotation);
    } else {
      setRotationState(prev => (prev + 90) % 360);
    }
  }, [rotation]);

  const rotateCCW = useCallback(() => {
    if (viewerRef.current) {
      const newRotation = (rotation - 90 + 360) % 360;
      viewerRef.current.viewport.setRotation(newRotation);
      setRotationState(newRotation);
    } else {
      setRotationState(prev => (prev - 90 + 360) % 360);
    }
  }, [rotation]);

  const setRotation = useCallback((degrees: number) => {
    const normalized = ((degrees % 360) + 360) % 360;
    if (viewerRef.current) {
      viewerRef.current.viewport.setRotation(normalized);
    }
    setRotationState(normalized);
  }, []);

  const flipHorizontal = useCallback(() => {
    if (viewerRef.current) {
      const currentFlip = viewerRef.current.viewport.getFlip();
      viewerRef.current.viewport.setFlip(!currentFlip);
      setIsFlipped(!currentFlip);
    } else {
      setIsFlipped(prev => !prev);
    }
  }, []);

  const takeScreenshot = useCallback(async (): Promise<Blob | null> => {
    if (!viewerRef.current?.drawer?.canvas) {
      console.warn('[useViewer] No canvas available for screenshot');
      return null;
    }

    try {
      const canvas = viewerRef.current.drawer.canvas as HTMLCanvasElement;
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('[useViewer] Screenshot captured:', blob.size, 'bytes');
            resolve(blob);
          } else {
            resolve(null);
          }
        }, 'image/png');
      });
    } catch (e) {
      console.error('[useViewer] Screenshot failed:', e);
      return null;
    }
  }, []);

  // Panel Toggles
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  const toggleTranscriptionPanel = useCallback(() => {
    setShowTranscriptionPanel(prev => !prev);
  }, []);

  const toggleSearchPanel = useCallback(() => {
    setShowSearchPanel(prev => !prev);
  }, []);

  const toggleMetadataPanel = useCallback(() => {
    setShowMetadataPanel(prev => !prev);
  }, []);

  const toggleWorkbench = useCallback(() => {
    setShowWorkbench(prev => !prev);
  }, []);

  // Note: Canvas Composer has been phased out in favor of Board View
  // This is kept as a no-op for backward compatibility
  const toggleComposer = useCallback(() => {
    console.log('[useViewer] Canvas Composer phased out - use Board View instead');
  }, []);

  const toggleAnnotationTool = useCallback(() => {
    setShowAnnotationTool(prev => !prev);
  }, []);

  const toggleFilmstrip = useCallback(() => {
    setShowFilmstrip(prev => !prev);
  }, []);

  const toggleNavigator = useCallback(() => {
    if (viewerRef.current?.navigator) {
      const newState = !showNavigator;
      viewerRef.current.navigator.element.style.display = newState ? 'block' : 'none';
      setShowNavigator(newState);
    } else {
      setShowNavigator(prev => !prev);
    }
  }, [showNavigator]);

  const toggleKeyboardHelp = useCallback(() => {
    setShowKeyboardHelp(prev => !prev);
  }, []);

  // Annotation Actions
  const selectAnnotation = useCallback((id: string | null) => {
    setSelectedAnnotationId(id);
  }, []);

  const addAnnotation = useCallback((annotation: IIIFAnnotation) => {
    setAnnotations(prev => [...prev, annotation]);
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  return {
    // State
    mediaType,
    annotations,
    resolvedImageUrl,
    rotation,
    zoomLevel,
    isFlipped,
    showNavigator,
    isFullscreen,
    showTranscriptionPanel,
    showSearchPanel,
    showMetadataPanel,
    showWorkbench,
    showAnnotationTool,
    showFilmstrip,
    showKeyboardHelp,
    selectedAnnotationId,
    isOcring,
    osdReady,
    hasChoice,
    choiceItems,
    activeChoiceIndex,

    // Refs
    viewerRef,
    osdContainerRef,
    containerRef,

    // OSD Actions
    zoomIn,
    zoomOut,
    resetView,
    rotateCW,
    rotateCCW,
    setRotation,
    flipHorizontal,
    takeScreenshot,

    // Panel Toggles
    toggleFullscreen,
    toggleNavigator,
    toggleTranscriptionPanel,
    toggleSearchPanel,
    toggleMetadataPanel,
    toggleWorkbench,
    toggleComposer,
    toggleAnnotationTool,
    toggleFilmstrip,
    toggleKeyboardHelp,

    // Annotation Actions
    selectAnnotation,
    addAnnotation,
    removeAnnotation,

    // Choice
    setActiveChoiceIndex,

    // Computed
    hasSearchService,
    canDownload: !!resolvedImageUrl && mediaType === 'image',
  };
};
