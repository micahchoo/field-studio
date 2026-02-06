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
  useAnnotation,
  pointsToSvgPath,
  createSvgSelector,
  parseSvgSelector,
  getBoundingBox,
  simplifyPath,
  type DrawingMode,
  type UseAnnotationReturn,
} from './annotation';
export {
  useMediaPlayer,
  type MediaState,
} from './useMediaPlayer';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IIIFAnnotation, IIIFCanvas, IIIFManifest } from '@/src/shared/types';
import { contentSearchService } from '@/src/entities/annotation/model/contentSearchService';
import { resolveImageSource } from '@/src/entities/canvas/model/imageSourceResolver';

declare const OpenSeadragon: any;

// ============================================================================
// Types
// ============================================================================

export type MediaType = 'image' | 'video' | 'audio' | 'other';

export interface ViewerState {
  mediaType: MediaType;
  annotations: IIIFAnnotation[];
  resolvedImageUrl: string | null;
  rotation: number;
  zoomLevel: number;
  isFullscreen: boolean;
  showTranscriptionPanel: boolean;
  showSearchPanel: boolean;
  showMetadataPanel: boolean;
  showWorkbench: boolean;
  showComposer: boolean;
  showAnnotationTool: boolean;
  showFilmstrip: boolean;
  selectedAnnotationId: string | null;
  isOcring: boolean;
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
  
  // Panel Toggles
  toggleFullscreen: () => void;
  toggleTranscriptionPanel: () => void;
  toggleSearchPanel: () => void;
  toggleMetadataPanel: () => void;
  toggleWorkbench: () => void;
  toggleComposer: () => void;
  toggleAnnotationTool: () => void;
  toggleFilmstrip: () => void;
  
  // Annotation Actions
  selectAnnotation: (id: string | null) => void;
  addAnnotation: (annotation: IIIFAnnotation) => void;
  removeAnnotation: (id: string) => void;
  
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
  manifest: IIIFManifest | null,
  autoOpenComposer?: boolean,
  onComposerOpened?: () => void
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
  const [rotation, setRotation] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTranscriptionPanel, setShowTranscriptionPanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showAnnotationTool, setShowAnnotationTool] = useState(false);
  const [showFilmstrip, setShowFilmstrip] = useState(true);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isOcring, _setIsOcring] = useState(false);

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

  // Auto-open composer effect
  useEffect(() => {
    if (autoOpenComposer && item) {
      setShowComposer(true);
      onComposerOpened?.();
    }
  }, [autoOpenComposer, item, onComposerOpened]);

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

  // Resolve image URL using entity-layer resolver
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
    console.log('[useViewer] Resolving image for canvas:', {
      id: item.id,
      hasItems: !!item.items,
      itemsLength: item.items?.length,
      firstPage: item.items?.[0],
      firstAnnotation: item.items?.[0]?.items?.[0],
      body: item.items?.[0]?.items?.[0]?.body
    });

    // Use the comprehensive image source resolver from entity layer
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

    // Debug logging
    console.log('[useViewer] OSD effect triggered:', { 
      mediaType, 
      hasItem: !!item, 
      hasContainer: !!osdContainerRef.current, 
      resolvedImageUrl,
      hasOpenSeadragon: typeof OpenSeadragon !== 'undefined'
    });

    const initializeOSD = () => {
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
      let tileSource: any;
      try {
        const resolved = resolveImageSource(item);
        const paintingBody = item.items?.[0]?.items?.[0]?.body as any;

        // Prefer IIIF Image Service if available and properly resolved
        if (resolved?.serviceId && resolved?.profile) {
          // OpenSeadragon expects IIIF Image API endpoint
          tileSource = `${resolved.serviceId}/info.json`;
          console.log('[useViewer] Using IIIF Image Service:', tileSource);
        } else if (paintingBody?.service?.[0]?.id) {
          // Fallback: use service from body if resolver didn't extract it
          tileSource = `${paintingBody.service[0].id}/info.json`;
          console.log('[useViewer] Using painting body service:', tileSource);
        } else {
          // No IIIF service, use direct image URL
          tileSource = { type: 'image', url: resolvedImageUrl };
          console.log('[useViewer] Using direct image URL:', resolvedImageUrl);
        }
      } catch (e) {
        // Fallback if resolver fails
        tileSource = { type: 'image', url: resolvedImageUrl };
        console.error('[useViewer] Error detecting IIIF service, using direct URL:', e);
      }

      console.log('[useViewer] Initializing OSD with tileSource:', tileSource);

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
          tileSources: tileSource,
          gestureSettingsMouse: { clickToZoom: false },
          showNavigationControl: false,
          blendTime: 0.1,
          immediateRender: true,
          imageLoaderLimit: 2,
          maxImageCacheCount: 50,
          debugMode: false,
        });

        console.log('[useViewer] OSD viewer initialized successfully');

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

        viewerRef.current.addHandler('open-failed', (e: any) => {
          console.error('[useViewer] OSD failed to open image:', e);
        });

        return true;
      } catch (e) {
        console.error('[useViewer] Error initializing OSD viewer:', e);
        return false;
      }
    };

    // Try to initialize immediately
    const initialized = initializeOSD();

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
      
      resizeObserver.observe(osdContainerRef.current);
    }

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
      setRotation(0);
      setZoomLevel(100);
    }
  }, []);

  const rotateCW = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const rotateCCW = useCallback(() => {
    setRotation(prev => (prev - 90 + 360) % 360);
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

  const toggleComposer = useCallback(() => {
    setShowComposer(prev => !prev);
  }, []);

  const toggleAnnotationTool = useCallback(() => {
    setShowAnnotationTool(prev => !prev);
  }, []);

  const toggleFilmstrip = useCallback(() => {
    setShowFilmstrip(prev => !prev);
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
    isFullscreen,
    showTranscriptionPanel,
    showSearchPanel,
    showMetadataPanel,
    showWorkbench,
    showComposer,
    showAnnotationTool,
    showFilmstrip,
    selectedAnnotationId,
    isOcring,
    
    // Refs
    viewerRef,
    osdContainerRef,
    containerRef,
    
    // Actions
    zoomIn,
    zoomOut,
    resetView,
    rotateCW,
    rotateCCW,
    toggleFullscreen,
    toggleTranscriptionPanel,
    toggleSearchPanel,
    toggleMetadataPanel,
    toggleWorkbench,
    toggleComposer,
    toggleAnnotationTool,
    toggleFilmstrip,
    selectAnnotation,
    addAnnotation,
    removeAnnotation,
    
    // Computed
    hasSearchService,
    canDownload: !!resolvedImageUrl && mediaType === 'image',
  };
};
