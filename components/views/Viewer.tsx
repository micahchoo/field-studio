
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIIIFValue, IIIFAnnotation, IIIFAnnotationPage, IIIFCanvas, IIIFItem, IIIFManifest, IIIFSpecificResource, LanguageString } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { ImageRequestWorkbench } from '../ImageRequestWorkbench';
import { CanvasComposer } from '../CanvasComposer';
import { AVPlayer } from '../AVPlayer';
import { PolygonAnnotationTool } from '../PolygonAnnotationTool';
import { SearchPanel } from '../SearchPanel';
import { contentStateService } from '../../services/contentState';
import { contentSearchService, SearchResult, SearchService } from '../../services/contentSearchService';
import { createSpatialTarget, createSpecificResource, getSpatialRegion, parseTarget } from '../../services/selectors';
import { VIEWPORT_DEFAULTS } from '../../constants/viewport';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useTerminology } from '../../hooks/useTerminology';

declare const OpenSeadragon: any;

/**
 * Parse SVG selector to extract path data for OSD overlay
 */
function parseSvgSelector(svgValue: string): string | null {
  const pathMatch = svgValue.match(/d="([^"]+)"/);
  return pathMatch ? pathMatch[1] : null;
}

/**
 * Extract bounding box from SVG selector value
 */
function extractSvgBoundingBox(svgValue: string): { x: number; y: number; width: number; height: number } | null {
  // Extract path d attribute
  const pathMatch = svgValue.match(/d="([^"]+)"/);
  if (!pathMatch) return null;

  const pathData = pathMatch[1];
  const points: { x: number; y: number }[] = [];

  // Parse path commands - handle M/L/Z paths
  const commands = pathData.match(/[MLZ][\d.,\s-]*/gi);
  if (!commands) return null;

  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    if (type === 'Z') continue;

    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
    if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      points.push({ x: coords[0], y: coords[1] });
    }
  }

  if (points.length === 0) return null;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

interface ViewerProps {
  item: IIIFCanvas | null;
  manifestItems?: IIIFCanvas[];
  manifest?: IIIFManifest | null;
  onSelect?: (id: string) => void;
  onUpdate: (item: Partial<IIIFCanvas>) => void;
  autoOpenComposer?: boolean;
  onComposerOpened?: () => void;
}

export const Viewer: React.FC<ViewerProps> = React.memo(function Viewer({ item, manifestItems, manifest, onSelect, onUpdate, autoOpenComposer, onComposerOpened }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const { t, isAdvanced } = useTerminology({ level: settings.abstractionLevel });
  const viewerRef = useRef<any>(null);
  const osdContainerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'other'>('other');
  const [annotations, setAnnotations] = useState<IIIFAnnotation[]>([]);
  const [showTranscriptionPanel, setShowTranscriptionPanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isOcring, setIsOcring] = useState(false);
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showAnnotationTool, setShowAnnotationTool] = useState(false);
  const [showFilmstrip, setShowFilmstrip] = useState(true);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100); // Percentage for display

  // Extract search service from manifest
  const searchService = useMemo(() => {
    if (!manifest?.service) return null;
    const services = Array.isArray(manifest.service) ? manifest.service : [manifest.service];
    for (const svc of services) {
      const extracted = contentSearchService.extractSearchService(svc);
      if (extracted) return extracted;
    }
    return null;
  }, [manifest]);

  // Anticipatory Logic: If synthesize was clicked in Collections, open Composer immediately
  useEffect(() => {
    if (autoOpenComposer && item) {
        setShowComposer(true);
        onComposerOpened?.();
    }
  }, [autoOpenComposer, item]);

  // Component unmount cleanup - ensure OSD is destroyed
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.removeAllHandlers();
          viewerRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors on unmount
        }
        viewerRef.current = null;
      }
    };
  }, []);

  const paintingBody = item?.items?.[0]?.items?.[0]?.body as any;
  const mimeType = paintingBody?.format || '';
  const serviceId = paintingBody?.service?.[0]?.id;

  useEffect(() => {
      if (!item) return;
      if (mimeType.startsWith('video/')) setMediaType('video');
      else if (mimeType.startsWith('audio/')) setMediaType('audio');
      else if (mimeType.startsWith('image/')) setMediaType('image');
      else setMediaType('other');

      const existingAnnos: IIIFAnnotation[] = [];
      if (item.annotations) {
          item.annotations.forEach(page => {
              existingAnnos.push(...page.items);
          });
      }
      setAnnotations(existingAnnos);
  }, [item?.id, mimeType]);

  // Safely resolve image URL for OSD
  useEffect(() => {
      let url: string | null = null;
      if (item?._blobUrl) {
          setResolvedImageUrl(item._blobUrl);
      } else if (item?._fileRef && item._fileRef instanceof Blob) {
          try {
            url = URL.createObjectURL(item._fileRef);
            setResolvedImageUrl(url);
          } catch (e) {
            console.error("Failed to create object URL", e);
            setResolvedImageUrl(null);
          }
      } else if (paintingBody?.id) {
          setResolvedImageUrl(paintingBody.id);
      } else {
          setResolvedImageUrl(null);
      }
      
      return () => { 
          if (url) URL.revokeObjectURL(url); 
      };
  }, [item, paintingBody?.id]);

  useEffect(() => {
      // Track if component is mounted for cleanup safety
      let isMounted = true;

      if (mediaType === 'image' && item && osdContainerRef.current) {
          // Destroy existing viewer before creating new one
          if (viewerRef.current) {
            try {
              viewerRef.current.destroy();
            } catch (e) {
              console.warn('Error destroying OSD viewer:', e);
            }
            viewerRef.current = null;
          }

          let tileSource: any = null;
          if (serviceId) {
              tileSource = `${serviceId}/info.json`;
          } else if (resolvedImageUrl) {
              tileSource = { type: 'image', url: resolvedImageUrl };
          }

          if (tileSource && isMounted) {
              try {
                viewerRef.current = OpenSeadragon({
                    element: osdContainerRef.current,
                    prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
                    tileSources: tileSource,
                    gestureSettingsMouse: { clickToZoom: false },
                    showNavigationControl: false,
                    blendTime: 0.1,
                    // Memory optimization settings
                    immediateRender: true,
                    imageLoaderLimit: 2,
                    maxImageCacheCount: 50,
                });
              } catch (e) {
                console.error('Error initializing OSD viewer:', e);
              }
          }
      }

      // Comprehensive cleanup function
      return () => {
        isMounted = false;
        if (viewerRef.current) {
          try {
            // Remove all handlers before destroying
            viewerRef.current.removeAllHandlers();
            viewerRef.current.destroy();
          } catch (e) {
            console.warn('Error during OSD cleanup:', e);
          }
          viewerRef.current = null;
        }
      };
    }, [item?.id, mediaType, serviceId, resolvedImageUrl]);
  
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  
    // Annotation overlay management for OpenSeadragon
    const annotationOverlayRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!viewerRef.current || mediaType !== 'image' || !item) return;

    const viewer = viewerRef.current;

    // Create SVG overlay element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.setAttribute('viewBox', `0 0 ${item.width || 1000} ${item.height || 1000}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    // Get OSD canvas container
    const canvasContainer = viewer.canvas?.parentElement || viewer.element;
    if (canvasContainer) {
      canvasContainer.style.position = 'relative';
      canvasContainer.appendChild(svg);
      annotationOverlayRef.current = svg;
    }

    return () => {
      if (svg.parentElement) {
        svg.parentElement.removeChild(svg);
      }
      annotationOverlayRef.current = null;
    };
  }, [item?.id, mediaType, item?.width, item?.height]);

  // Update annotation overlays when annotations change
  useEffect(() => {
    const svg = annotationOverlayRef.current;
    if (!svg || !item) return;

    // Clear existing annotations
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Add annotation elements
    annotations.forEach((anno, index) => {
      const target = anno.target as any;
      const selector = target?.selector;

      if (!selector) return;

      if (selector.type === 'SvgSelector') {
        const pathData = parseSvgSelector(selector.value);
        if (pathData) {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathData);
          path.setAttribute('fill', selectedAnnotationId === anno.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.2)');
          path.setAttribute('stroke', selectedAnnotationId === anno.id ? '#3b82f6' : '#22c55e');
          path.setAttribute('stroke-width', '2');
          path.style.pointerEvents = 'auto';
          path.style.cursor = 'pointer';
          path.addEventListener('click', () => {
            setSelectedAnnotationId(anno.id);
          });
          path.addEventListener('mouseenter', () => {
            path.setAttribute('fill', 'rgba(59, 130, 246, 0.3)');
          });
          path.addEventListener('mouseleave', () => {
            path.setAttribute('fill', selectedAnnotationId === anno.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.2)');
          });
          svg.appendChild(path);
        }
      } else if (selector.type === 'FragmentSelector' || selector.value?.includes('xywh=')) {
        // Handle xywh fragment selectors
        const value = selector.value || '';
        const match = value.match(/xywh=([^&]+)/);
        if (match) {
          const coords = match[1].split(',').map(Number);
          if (coords.length === 4) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', String(coords[0]));
            rect.setAttribute('y', String(coords[1]));
            rect.setAttribute('width', String(coords[2]));
            rect.setAttribute('height', String(coords[3]));
            rect.setAttribute('fill', selectedAnnotationId === anno.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.2)');
            rect.setAttribute('stroke', selectedAnnotationId === anno.id ? '#3b82f6' : '#22c55e');
            rect.setAttribute('stroke-width', '2');
            rect.style.pointerEvents = 'auto';
            rect.style.cursor = 'pointer';
            rect.addEventListener('click', () => {
              setSelectedAnnotationId(anno.id);
            });
            svg.appendChild(rect);
          }
        }
      }
    });

    // Update viewBox to match current image
    if (item.width && item.height) {
      svg.setAttribute('viewBox', `0 0 ${item.width} ${item.height}`);
    }
  }, [annotations, item, selectedAnnotationId]);

  const handleShareView = (annotationId?: string) => {
    if (!item) return;
    
    const viewportState: any = {
        manifestId: item._parentId || "root",
        canvasId: item.id,
    };

    // Include current viewport region if OSD is available
    if (viewerRef.current?.viewport) {
        const bounds = viewerRef.current.viewport.getBounds();
        const imageRect = viewerRef.current.viewport.viewportToImageRectangle(bounds);
        viewportState.region = {
            x: Math.round(imageRect.x),
            y: Math.round(imageRect.y),
            w: Math.round(imageRect.width),
            h: Math.round(imageRect.height)
        };
    }

    // Include annotation reference if provided or selected
    if (annotationId || selectedAnnotationId) {
        viewportState.annotationId = annotationId || selectedAnnotationId;
    }

    const url = contentStateService.generateLink(window.location.href, viewportState);
    navigator.clipboard.writeText(url);
    showToast(annotationId ? "Annotation permalink copied to clipboard" : "Shareable view link copied to clipboard", "success");
  };

  const handleExtractEvidence = (quality: string = 'default') => {
      if (!viewerRef.current || !item) return;

      const bounds = viewerRef.current.viewport.getBounds();
      const imageRect = viewerRef.current.viewport.viewportToImageRectangle(bounds);
      const x = Math.round(imageRect.x);
      const y = Math.round(imageRect.y);
      const w = Math.round(imageRect.width);
      const h = Math.round(imageRect.height);

      // Use selectors service to create target
      const targetWithSelector = createSpecificResource(item.id, {
        type: 'fragment',
        spatial: { x, y, width: w, height: h, unit: 'pixel' },
        original: ''
      });

      const derivedImageUrl = serviceId
        ? `${serviceId}/${x},${y},${w},${h}/max/0/${quality}.jpg`
        : resolvedImageUrl;

      const newAnno: IIIFAnnotation = {
          id: `${item.id}/annotation/evidence-${crypto.randomUUID()}`,
          type: "Annotation",
          motivation: "supplementing",
          label: { en: [`Evidence Extract (${quality})`] },
          body: {
              id: derivedImageUrl!,
              type: "Image",
              format: "image/jpeg",
              label: { en: ["Derived Analytical View"] }
          },
          target: targetWithSelector as any
      };

      saveAnnotation(newAnno);
      showToast("Evidence extract added as annotation", "success");
  };

  const handleExtractEvidenceDefault = useCallback(() => handleExtractEvidence('default'), [handleExtractEvidence]);
  const handleShareViewCurrent = useCallback(() => handleShareView(), [handleShareView]);

  const saveAnnotation = (newAnno: IIIFAnnotation) => {
      if (!item) return;
      const currentAnnos = [...annotations, newAnno];
      setAnnotations(currentAnnos);

      // Create a deep copy to avoid mutating the original item
      const updatedAnnos: IIIFAnnotationPage[] = item.annotations
          ? item.annotations.map(page => ({ ...page, items: [...page.items] }))
          : [];

      if (updatedAnnos.length === 0) {
          updatedAnnos.push({
              id: `${item.id}/page/annotations`,
              type: "AnnotationPage",
              items: [newAnno]
          });
      } else {
          updatedAnnos[0] = { ...updatedAnnos[0], items: [...updatedAnnos[0].items, newAnno] };
      }

      onUpdate({ annotations: updatedAnnos });
  };

  const zoomToRegion = (selectorValue: string) => {
    if (!viewerRef.current || !item) return;

    // Use selectors service to parse the target
    const region = getSpatialRegion(`${item.id}#${selectorValue.replace(/^#/, '')}`);
    if (!region) return;

    const { x, y, width, height } = region;
    const rect = viewerRef.current.viewport.imageToViewportRectangle(x, y, width, height);
    viewerRef.current.viewport.fitBounds(rect, false);
  };

  // Rotation controls
  const handleRotate = useCallback((degrees: number) => {
    if (!viewerRef.current) return;
    const newRotation = (rotation + degrees + 360) % 360;
    setRotation(newRotation);
    viewerRef.current.viewport.setRotation(newRotation);
  }, [rotation]);

  // Stable callback wrappers derived from main handlers
  const handleRotateCCW = useCallback(() => handleRotate(-90), [handleRotate]);
  const handleRotateCW = useCallback(() => handleRotate(90), [handleRotate]);
  const handleOpenAnnotationTool = useCallback(() => setShowAnnotationTool(true), []);
  const handleOpenWorkbench = useCallback(() => setShowWorkbench(true), []);
  const handleOpenTranscriptionPanel = useCallback(() => setShowTranscriptionPanel(true), []);
  const handleCloseTranscriptionPanel = useCallback(() => setShowTranscriptionPanel(false), []);
  const handleToggleTranscriptionPanel = useCallback(() => setShowTranscriptionPanel(prev => !prev), []);
  const handleToggleSearchPanel = useCallback(() => setShowSearchPanel(prev => !prev), []);
  const handleToggleMetadataPanel = useCallback(() => setShowMetadataPanel(prev => !prev), []);
  const handleToggleFilmstrip = useCallback(() => setShowFilmstrip(prev => !prev), []);

  const handleResetView = useCallback(() => {
    if (!viewerRef.current) return;
    setRotation(0);
    viewerRef.current.viewport.setRotation(0);
    viewerRef.current.viewport.goHome(false);
  }, []);

  // OSD zoom controls
  const handleZoomIn = useCallback(() => {
    if (!viewerRef.current) return;
    viewerRef.current.viewport.zoomBy(VIEWPORT_DEFAULTS.ZOOM_STEP);
    viewerRef.current.viewport.applyConstraints();
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!viewerRef.current) return;
    viewerRef.current.viewport.zoomBy(1 / VIEWPORT_DEFAULTS.ZOOM_STEP);
    viewerRef.current.viewport.applyConstraints();
  }, []);

  // Track OSD zoom level for display
  useEffect(() => {
    if (!viewerRef.current) return;

    const updateZoom = () => {
      if (viewerRef.current) {
        const zoom = viewerRef.current.viewport.getZoom();
        const homeZoom = viewerRef.current.viewport.getHomeZoom();
        setZoomLevel(Math.round((zoom / homeZoom) * 100));
      }
    };

    viewerRef.current.addHandler('zoom', updateZoom);
    viewerRef.current.addHandler('open', updateZoom);

    return () => {
      if (viewerRef.current) {
        viewerRef.current.removeHandler('zoom', updateZoom);
        viewerRef.current.removeHandler('open', updateZoom);
      }
    };
  }, [item?.id, mediaType]);

  // Keyboard shortcuts for viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if annotation tool, composer, or workbench is open
      if (showAnnotationTool || showComposer || showWorkbench) return;
      
      // Skip if user is typing in an input
      if (document.activeElement?.tagName.match(/INPUT|TEXTAREA/)) return;

      // Zoom shortcuts
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      }
      if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handleResetView();
      }

      // Rotation shortcuts (R and Shift+R)
      if (e.key === 'r' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleRotate(90);
      }
      if (e.key === 'R' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleRotate(-90);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleResetView, handleRotate, showAnnotationTool, showComposer, showWorkbench]);

  // Fullscreen handler
  const handleToggleFullscreen = useCallback(async () => {
    if (!viewerContainerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await viewerContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      showToast('Fullscreen not supported', 'error');
    }
  }, [showToast]);

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Download current view handler
  const handleDownload = useCallback(async () => {
    if (!resolvedImageUrl) {
      showToast('No image available to download', 'error');
      return;
    }

    try {
      // For blob URLs or direct images, create a download link
      const response = await fetch(resolvedImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getIIIFValue(item?.label, 'en') || getIIIFValue(item?.label, 'none') || 'canvas'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Image downloaded', 'success');
    } catch (err) {
      // Fallback: open in new tab
      window.open(resolvedImageUrl, '_blank');
      showToast('Opening image in new tab', 'info');
    }
  }, [resolvedImageUrl, item, showToast]);

  if (!item) return <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-500 italic">Select a {t('Canvas').toLowerCase()} to inspect.</div>;

  return (
    <div ref={viewerContainerRef} className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
      <div className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-20">
        {/* Left: Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Icon name={mediaType === 'video' ? 'movie' : mediaType === 'audio' ? 'audiotrack' : 'image'} className="text-blue-400 shrink-0"/>
          <h2 className="text-white font-bold truncate">
            {getIIIFValue(item.label)}
          </h2>
        </div>
        
        {/* Right: Toolbar */}
        <div className="flex items-center gap-1">
          {mediaType === 'image' && (
            <>
              {/* Group 1: Viewport Controls */}
              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5 mr-2">
                {/* Zoom */}
                <button
                  onClick={handleZoomOut}
                  disabled={!viewerRef.current}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
                  title="Zoom Out (-)"
                  aria-label="Zoom out"
                >
                  <Icon name="remove" className="text-sm" />
                </button>
                <span className="px-2 text-[10px] font-mono text-slate-400 min-w-[44px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={!viewerRef.current}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
                  title="Zoom In (+)"
                  aria-label="Zoom in"
                >
                  <Icon name="add" className="text-sm" />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1" />
                {/* Rotation */}
                <button
                  onClick={handleRotateCCW}
                  disabled={!viewerRef.current}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
                  title="Rotate Counter-Clockwise (Shift+R)"
                  aria-label="Rotate counter-clockwise"
                >
                  <Icon name="rotate_left" className="text-sm" />
                </button>
                <button
                  onClick={handleRotateCW}
                  disabled={!viewerRef.current}
                  className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
                  title="Rotate Clockwise (R)"
                  aria-label="Rotate clockwise"
                >
                  <Icon name="rotate_right" className="text-sm" />
                </button>
                {rotation !== 0 && (
                  <>
                    <div className="w-px h-4 bg-slate-700 mx-1" />
                    <span className="text-[10px] text-slate-500 px-1">{rotation}°</span>
                    <button
                      onClick={handleResetView}
                      disabled={!viewerRef.current}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
                      title="Reset View (Ctrl/Cmd+0)"
                      aria-label="Reset view"
                    >
                      <Icon name="restart_alt" className="text-sm" />
                    </button>
                  </>
                )}
              </div>

              {/* Group 2: Actions */}
              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5 mr-2">
                <button
                  onClick={handleExtractEvidenceDefault}
                  disabled={!viewerRef.current}
                  className="px-2 py-1 text-[10px] font-bold uppercase text-blue-400 hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 rounded"
                  title="Extract Evidence from Current View"
                >
                  <Icon name="content_cut" className="text-xs"/> Extract
                </button>
                <div className="w-px h-4 bg-slate-700 mx-0.5" />
                <button
                  onClick={handleShareViewCurrent}
                  disabled={!viewerRef.current}
                  className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 rounded"
                  title="Share Current View"
                >
                  <Icon name="share" className="text-xs"/> Share
                </button>
              </div>

              {/* Group 3: Tools */}
              <button
                onClick={handleOpenTranscriptionPanel}
                className={`p-2 rounded-lg hover:bg-slate-800 relative ${annotations.length > 0 ? 'text-green-400' : 'text-slate-400'} hover:text-white`}
                title={`${annotations.length} Annotation${annotations.length !== 1 ? 's' : ''}`}
              >
                <Icon name="sticky_note_2" />
                {annotations.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {annotations.length}
                  </span>
                )}
              </button>
              <button
                onClick={handleOpenAnnotationTool}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Draw Annotations"
              >
                <Icon name="draw" />
              </button>
              <button
                onClick={handleOpenWorkbench}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Image Request Workbench"
              >
                <Icon name="tune" />
              </button>
            </>
          )}

          {/* Universal Controls (all media types) */}
          {searchService && (
            <button
              onClick={handleToggleSearchPanel}
              className={`p-2 rounded-lg hover:bg-slate-800 ${showSearchPanel ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 hover:text-white'}`}
              title="Search in Manifest"
            >
              <Icon name="search" />
            </button>
          )}
          <button
            onClick={handleToggleMetadataPanel}
            className={`p-2 rounded-lg hover:bg-slate-800 ${showMetadataPanel ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 hover:text-white'}`}
            title="Canvas Metadata"
            aria-label="Toggle metadata panel"
          >
            <Icon name="info" />
          </button>
          {mediaType === 'image' && (
            <button
              onClick={handleDownload}
              disabled={!resolvedImageUrl}
              className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800"
              title="Download Image"
              aria-label="Download image"
            >
              <Icon name="download" />
            </button>
          )}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="Toggle Fullscreen"
            aria-label="Toggle fullscreen"
          >
            <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} />
          </button>
          
          <div className="w-px h-6 bg-slate-700 mx-1" />
          
          <button
            onClick={handleToggleTranscriptionPanel}
            className={`p-2 rounded-lg hover:bg-slate-800 ${showTranscriptionPanel ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 hover:text-white'}`}
            title="Evidence & Notes"
          >
            <Icon name="description" />
          </button>
          {manifestItems && manifestItems.length > 1 && (
            <button
              onClick={handleToggleFilmstrip}
              className={`p-2 rounded-lg hover:bg-slate-800 ${showFilmstrip ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 hover:text-white'}`}
              title="Toggle Canvas Navigator"
            >
              <Icon name="view_carousel" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 relative bg-black overflow-hidden flex">
            {/* Image viewer (OpenSeadragon) */}
            {mediaType === 'image' && (
              <div ref={osdContainerRef} className="flex-1 h-full" />
            )}

            {/* Audio/Video player */}
            {(mediaType === 'video' || mediaType === 'audio') && paintingBody?.id && (
              <AVPlayer
                canvas={item as any}
                src={paintingBody.id}
                mediaType={mediaType}
                poster={item?.thumbnail?.[0]?.id}
                showAccompanying={true}
                className="flex-1"
              />
            )}

            {/* Fallback for unsupported media */}
            {mediaType === 'other' && (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Icon name="help_outline" className="text-4xl mb-2" />
                  <p className="text-sm">Unsupported media type</p>
                  <p className="text-xs text-slate-600 mt-1">{mimeType || 'Unknown format'}</p>
                </div>
              </div>
            )}

            {/* Canvas Navigator Filmstrip */}
            {showFilmstrip && manifestItems && manifestItems.length > 1 && (
              <div className="absolute bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur border-t border-slate-800 p-2 z-10">
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                  {manifestItems.map((canvas, idx) => {
                    const thumbUrl = canvas.thumbnail?.[0]?.id ||
                      (canvas.items?.[0]?.items?.[0]?.body as any)?.id ||
                      canvas._blobUrl;
                    const isActive = canvas.id === item?.id;
                    return (
                      <button
                        key={canvas.id}
                        onClick={() => onSelect?.(canvas.id)}
                        className={`shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                          isActive
                            ? 'border-blue-500 ring-2 ring-blue-500/50'
                            : 'border-slate-700 hover:border-slate-500 opacity-70 hover:opacity-100'
                        }`}
                        title={getIIIFValue(canvas.label) || `${t('Canvas')} ${idx + 1}`}
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={getIIIFValue(canvas.label) || `${t('Canvas')} ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <span className="text-xs text-slate-500">{idx + 1}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="text-center mt-1">
                  <span className="text-[10px] text-slate-500">
                    {manifestItems.findIndex(c => c.id === item?.id) + 1} / {manifestItems.length}
                  </span>
                </div>
              </div>
            )}
        </div>
        
        {/* Content Search Panel */}
        {showSearchPanel && searchService && manifest && (
            <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Search in Manifest</h3>
                    <button onClick={() => setShowSearchPanel(false)}><Icon name="close" className="text-slate-500 text-sm" /></button>
                </div>
                <SearchPanel
                    manifest={manifest}
                    searchService={searchService}
                    currentCanvasId={item?.id}
                    onResultSelect={(result) => {
                      // Navigate to the canvas containing the result
                      if (result.canvasId && onSelect) {
                        onSelect(result.canvasId);
                        // If result has spatial region, zoom to it
                        if (result.region) {
                          const xywh = `xywh=${result.region.x},${result.region.y},${result.region.w},${result.region.h}`;
                          setTimeout(() => zoomToRegion(xywh), 500);
                        }
                      }
                      showToast(`Found: "${result.text}"`, 'info');
                    }}
                    onResultsChange={setSearchResults}
                />
            </div>
        )}

        {showTranscriptionPanel && (
            <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div className="flex items-center gap-2">
                        <Icon name="sticky_note_2" className="text-slate-400 text-sm" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Annotations</h3>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{annotations.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAnnotationTool(true)}
                            className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1"
                            title="Create New Annotation"
                        >
                            <Icon name="add" className="text-xs" /> New
                        </button>
                        <button onClick={() => setShowTranscriptionPanel(false)} className="p-1 hover:bg-slate-800 rounded">
                            <Icon name="close" className="text-slate-500 text-sm" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {annotations.length === 0 ? (
                        <div className="text-center py-20 text-slate-600">
                            <Icon name="sticky_note_2" className="text-4xl mb-3 mx-auto opacity-30" />
                            <p className="text-sm italic mb-2">No annotations yet</p>
                            <button
                                onClick={() => setShowAnnotationTool(true)}
                                className="text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                                Create your first annotation
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {annotations.map(anno => {
                                const body = anno.body as any;
                                const target = anno.target as any;
                                
                                // W3C Web Annotation Data Model compliant parsing
                                const bodyText = body?.value || getIIIFValue(body?.label, 'en') || getIIIFValue(body?.label, 'none') || 'Untitled Annotation';
                                const bodyType = body?.type || 'TextualBody';
                                const bodyFormat = body?.format || 'text/plain';
                                const motivation = anno.motivation || 'commenting';
                                
                                // Parse selector for spatial/temporal targeting
                                const selectorType = target?.selector?.type;
                                const selectorValue = target?.selector?.value || '';
                                const isXywhRegion = selectorValue.includes('xywh=');
                                const isSvgSelector = selectorType === 'SvgSelector';
                                const isTemporal = selectorValue.includes('t=');
                                const hasSpatialTarget = isXywhRegion || isSvgSelector;
                                
                                // Derived image URL (for Image API annotations)
                                const bodyImg = body?.id;
                                const isImageBody = bodyType === 'Image' || bodyImg?.includes('/iiif/');
                                const isTextBody = bodyType === 'TextualBody' || body?.value;
                                
                                // Generate JSON-LD representation
                                const jsonLdRepr = JSON.stringify({
                                    '@context': 'http://www.w3.org/ns/anno.jsonld',
                                    id: anno.id,
                                    type: 'Annotation',
                                    motivation,
                                    body,
                                    target
                                }, null, 2);

                                const handleZoom = () => {
                                    if (!viewerRef.current || !item) return;
                                    setSelectedAnnotationId(anno.id);
                                    if (isXywhRegion) {
                                        zoomToRegion(selectorValue);
                                    } else if (isSvgSelector) {
                                        const bbox = extractSvgBoundingBox(selectorValue);
                                        if (bbox) {
                                            const rect = viewerRef.current.viewport.imageToViewportRectangle(
                                                bbox.x, bbox.y, bbox.width, bbox.height
                                            );
                                            viewerRef.current.viewport.fitBounds(rect.scale(1.2), false);
                                        }
                                    }
                                };

                                const handleShareAnnotation = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleShareView(anno.id);
                                };

                                const handleCopyJsonLd = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(jsonLdRepr);
                                    showToast('W3C Annotation JSON-LD copied to clipboard', 'success');
                                };

                                // Motivation badge colors
                                const motivationColors: Record<string, string> = {
                                    'commenting': 'text-blue-400 bg-blue-400/10',
                                    'tagging': 'text-green-400 bg-green-400/10',
                                    'describing': 'text-purple-400 bg-purple-400/10',
                                    'identifying': 'text-yellow-400 bg-yellow-400/10',
                                    'painting': 'text-pink-400 bg-pink-400/10',
                                    'supplementing': 'text-cyan-400 bg-cyan-400/10'
                                };
                                const badgeClass = motivationColors[motivation as string] || 'text-slate-400 bg-slate-400/10';

                                return (
                                    <div
                                        key={anno.id}
                                        className={`bg-slate-800 rounded-lg border transition-all group ${selectedAnnotationId === anno.id ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-700 hover:border-slate-600'}`}
                                    >
                                        {/* Image preview if available */}
                                        {isImageBody && bodyImg && (
                                            <div className="relative">
                                                <img
                                                    src={bodyImg}
                                                    alt="Annotation content"
                                                    className="w-full h-24 object-cover rounded-t-lg"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <button
                                                        onClick={handleShareAnnotation}
                                                        className="p-1.5 bg-black/60 hover:bg-black/80 rounded text-white text-xs"
                                                        title="Copy annotation permalink"
                                                    >
                                                        <Icon name="link" className="text-xs" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="p-3">
                                            {/* Header: Motivation + Target info */}
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${badgeClass}`}>
                                                        {motivation}
                                                    </span>
                                                    {hasSpatialTarget && (
                                                        <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                                            <Icon name={isSvgSelector ? 'pentagon' : 'crop_free'} className="text-[10px]" />
                                                            {isSvgSelector ? 'Polygon' : 'Region'}
                                                        </span>
                                                    )}
                                                    {isTemporal && (
                                                        <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                                            <Icon name="schedule" className="text-[10px]" />
                                                            Time
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {hasSpatialTarget && (
                                                        <button
                                                            onClick={handleZoom}
                                                            className="p-1 text-slate-400 hover:text-blue-400 rounded"
                                                            title="Zoom to annotation"
                                                        >
                                                            <Icon name="center_focus_strong" className="text-xs" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={handleShareAnnotation}
                                                        className="p-1 text-slate-400 hover:text-blue-400 rounded"
                                                        title="Copy permalink"
                                                    >
                                                        <Icon name="link" className="text-xs" />
                                                    </button>
                                                    {isAdvanced && (
                                                      <button
                                                        onClick={handleCopyJsonLd}
                                                        className="p-1 text-slate-400 hover:text-green-400 rounded"
                                                        title="Copy W3C JSON-LD"
                                                      >
                                                        <Icon name="code" className="text-xs" />
                                                      </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Body content */}
                                            <div className={`text-slate-200 text-xs ${isTextBody ? 'font-mono whitespace-pre-wrap leading-relaxed' : 'font-medium'}`}>
                                                {bodyText}
                                            </div>
                                            
                                            {/* Format badge for text */}
                                            {isTextBody && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-[8px] text-slate-500 uppercase">{bodyFormat}</span>
                                                    {isAdvanced && (
                                                      <span className="text-[8px] text-slate-600 font-mono truncate">{anno.id.split('/').pop()?.slice(0, 20)}...</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Footer: W3C compliance note — advanced users only */}
                {isAdvanced && (
                  <div className="p-3 border-t border-slate-800 bg-slate-950">
                    <div className="flex items-center justify-between text-[9px] text-slate-500">
                        <span className="flex items-center gap-1">
                            <Icon name="verified" className="text-xs" />
                            W3C Web Annotation compliant
                        </span>
                        <a
                            href="https://www.w3.org/TR/annotation-model/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                        >
                            Spec →
                        </a>
                    </div>
                  </div>
                )}
            </div>
        )}

        {/* Metadata Panel */}
        {showMetadataPanel && item && (
            <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('Canvas')} Metadata</h3>
                    <button onClick={() => setShowMetadataPanel(false)}><Icon name="close" className="text-slate-500 text-sm" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Basic Info */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Basic Information</h4>
                        <div className="bg-slate-800 p-3 rounded border border-slate-700 space-y-2">
                            {isAdvanced && (
                              <div>
                                <span className="text-[9px] text-slate-500 uppercase">ID</span>
                                <p className="text-xs text-slate-300 font-mono break-all">{item.id}</p>
                              </div>
                            )}
                            <div>
                                <span className="text-[9px] text-slate-500 uppercase">Type</span>
                                <p className="text-xs text-slate-300">{t(item.type)}</p>
                            </div>
                            {(item.width || item.height) && (
                                <div>
                                    <span className="text-[9px] text-slate-500 uppercase">Dimensions</span>
                                    <p className="text-xs text-slate-300">{item.width || '?'} × {item.height || '?'} px</p>
                                </div>
                            )}
                            {item.duration && (
                                <div>
                                    <span className="text-[9px] text-slate-500 uppercase">Duration</span>
                                    <p className="text-xs text-slate-300">{item.duration.toFixed(2)}s</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata Properties */}
                    {item.metadata && item.metadata.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Properties</h4>
                            <div className="space-y-2">
                                {item.metadata.map((meta, idx) => (
                                    <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700">
                                        <span className="text-[9px] text-slate-500 uppercase">{getIIIFValue(meta.label)}</span>
                                        <p className="text-xs text-slate-300 mt-1">{getIIIFValue(meta.value)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    {item.summary && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Summary</h4>
                            <div className="bg-slate-800 p-3 rounded border border-slate-700">
                                <p className="text-xs text-slate-300">{getIIIFValue(item.summary)}</p>
                            </div>
                        </div>
                    )}

                    {/* Required Statement */}
                    {item.requiredStatement && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Required Statement</h4>
                            <div className="bg-slate-800 p-3 rounded border border-slate-700">
                                <span className="text-[9px] text-slate-500 uppercase">{getIIIFValue(item.requiredStatement.label)}</span>
                                <p className="text-xs text-slate-300 mt-1">{getIIIFValue(item.requiredStatement.value)}</p>
                            </div>
                        </div>
                    )}

                    {/* Rights */}
                    {item.rights && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Rights</h4>
                            <div className="bg-slate-800 p-3 rounded border border-slate-700">
                                <a href={item.rights} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline break-all">
                                    {item.rights}
                                </a>
                            </div>
                        </div>
                    )}

                    {/* See Also */}
                    {item.seeAlso && item.seeAlso.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">See Also</h4>
                            <div className="space-y-2">
                                {item.seeAlso.map((link, idx) => (
                                    <a
                                        key={idx}
                                        href={link.id}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block bg-slate-800 p-3 rounded border border-slate-700 hover:border-blue-500 transition-all"
                                    >
                                        <span className="text-[9px] text-slate-500 uppercase">{link.format || 'Link'}</span>
                                        <p className="text-xs text-blue-400 hover:underline break-all mt-1">{link.id}</p>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {showWorkbench && item && (
        <ImageRequestWorkbench
          canvas={item}
          onClose={() => setShowWorkbench(false)}
          onApply={(url) => {
            // Create a new derived image annotation from the Image API parameters
            const derivedAnno: IIIFAnnotation = {
              id: `${item.id}/annotation/derived-${crypto.randomUUID()}`,
              type: "Annotation",
              motivation: "painting",
              label: { en: ["Derived Image"] },
              body: {
                id: url,
                type: "Image",
                format: "image/jpeg"
              },
              target: item.id
            };
            saveAnnotation(derivedAnno);
            showToast("Derived image applied as new layer", "success");
          }}
        />
      )}
      {showComposer && item && <CanvasComposer canvas={item} onUpdate={onUpdate} onClose={() => setShowComposer(false)} />}
      {showAnnotationTool && item && resolvedImageUrl && (
        <PolygonAnnotationTool
          canvas={item}
          imageUrl={resolvedImageUrl}
          onCreateAnnotation={(anno) => {
            saveAnnotation(anno);
            showToast('Annotation created successfully', 'success');
          }}
          onClose={() => setShowAnnotationTool(false)}
          existingAnnotations={annotations}
        />
      )}
    </div>
  );
}, (prev, next) => {
  // Custom comparison: only re-render if canvas/manifest IDs or options change
  const prevCanvasId = prev.item?.id;
  const nextCanvasId = next.item?.id;
  const prevManifestId = prev.manifest?.id;
  const nextManifestId = next.manifest?.id;
  
  // Compare options using JSON stringify for deep equality
  const prevOptions = JSON.stringify({
    autoOpenComposer: prev.autoOpenComposer,
    hasManifestItems: !!prev.manifestItems?.length
  });
  const nextOptions = JSON.stringify({
    autoOpenComposer: next.autoOpenComposer,
    hasManifestItems: !!next.manifestItems?.length
  });
  
  return prevCanvasId === nextCanvasId &&
         prevManifestId === nextManifestId &&
         prevOptions === nextOptions;
});
