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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IIIFAnnotation, IIIFCanvas, IIIFManifest } from '@/types';
import { contentSearchService } from '@/services/contentSearchService';
import { UI_TIMING } from '@/src/shared/config/tokens';

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

const detectMediaType = (mimeType: string): MediaType => {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
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

const resolveImageUrl = (item: IIIFCanvas | null): string | null => {
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
  const [isOcring, setIsOcring] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cleanup OSD
      if (viewerRef.current) {
        try {
          viewerRef.current.removeAllHandlers();
          viewerRef.current.destroy();
        } catch (e) {
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
    const mimeType = paintingBody?.format || '';
    
    setMediaType(detectMediaType(mimeType));
    setAnnotations(extractAnnotations(item));
  }, [item?.id]);

  // Resolve image URL
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

    // Check for blob URL
    if (item._blobUrl) {
      setResolvedImageUrl(item._blobUrl);
      return;
    }

    // Check for file ref (create object URL)
    if (item._fileRef && item._fileRef instanceof Blob) {
      try {
        const url = URL.createObjectURL(item._fileRef);
        objectUrlRef.current = url;
        setResolvedImageUrl(url);
      } catch (e) {
        console.error('Failed to create object URL', e);
        setResolvedImageUrl(null);
      }
      return;
    }

    // Use painting body ID
    const paintingBody = item.items?.[0]?.items?.[0]?.body as any;
    setResolvedImageUrl(paintingBody?.id || null);
  }, [item]);

  // Initialize/destroy OpenSeadragon
  useEffect(() => {
    let isActive = true;

    if (mediaType === 'image' && item && osdContainerRef.current && resolvedImageUrl) {
      // Destroy existing viewer
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying OSD viewer:', e);
        }
        viewerRef.current = null;
      }

      const paintingBody = item.items?.[0]?.items?.[0]?.body as any;
      const serviceId = paintingBody?.service?.[0]?.id;
      
      const tileSource = serviceId 
        ? `${serviceId}/info.json`
        : { type: 'image', url: resolvedImageUrl };

      if (isActive) {
        try {
          viewerRef.current = OpenSeadragon({
            element: osdContainerRef.current,
            prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
            tileSources: tileSource,
            gestureSettingsMouse: { clickToZoom: false },
            showNavigationControl: false,
            blendTime: 0.1,
            immediateRender: true,
            imageLoaderLimit: 2,
            maxImageCacheCount: 50,
          });

          // Track zoom level changes
          viewerRef.current.addHandler('zoom', () => {
            if (viewerRef.current && isMountedRef.current) {
              const zoom = viewerRef.current.viewport.getZoom();
              setZoomLevel(Math.round(zoom * 100));
            }
          });
        } catch (e) {
          console.error('Error initializing OSD viewer:', e);
        }
      }
    }

    return () => {
      isActive = false;
      if (viewerRef.current) {
        try {
          viewerRef.current.removeAllHandlers();
          viewerRef.current.destroy();
        } catch (e) {
          console.warn('Error during OSD cleanup:', e);
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
