
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { IIIFCanvas, IIIFAnnotation, IIIFAnnotationPage, IIIFSpecificResource, IIIFItem, IIIFManifest, getIIIFValue } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { ImageRequestWorkbench } from '../ImageRequestWorkbench';
import { CanvasComposer } from '../CanvasComposer';
import { AVPlayer } from '../AVPlayer';
import { PolygonAnnotationTool } from '../PolygonAnnotationTool';
import { SearchPanel } from '../SearchPanel';
import { contentStateService } from '../../services/contentState';
import { contentSearchService, SearchService, SearchResult } from '../../services/contentSearchService';
import { parseTarget, getSpatialRegion, createSpatialTarget, createSpecificResource } from '../../services/selectors';
import { VIEWPORT_DEFAULTS } from '../../constants/viewport';

declare const OpenSeadragon: any;

interface ViewerProps {
  item: IIIFCanvas | null;
  manifestItems?: IIIFCanvas[];
  manifest?: IIIFManifest | null;
  onSelect?: (id: string) => void;
  onUpdate: (item: Partial<IIIFCanvas>) => void;
  autoOpenComposer?: boolean;
  onComposerOpened?: () => void;
}

export const Viewer: React.FC<ViewerProps> = ({ item, manifestItems, manifest, onSelect, onUpdate, autoOpenComposer, onComposerOpened }) => {
  const { showToast } = useToast();
  const viewerRef = useRef<any>(null);
  const osdContainerRef = useRef<HTMLDivElement>(null);

  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'other'>('other');
  const [annotations, setAnnotations] = useState<IIIFAnnotation[]>([]);
  const [showTranscriptionPanel, setShowTranscriptionPanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
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

  const handleShareView = () => {
    if (!item || !viewerRef.current) return;
    const bounds = viewerRef.current.viewport.getBounds();
    const imageRect = viewerRef.current.viewport.viewportToImageRectangle(bounds);

    // Build ViewportState for sharing
    const viewportState = {
        manifestId: item._parentId || "root",
        canvasId: item.id,
        region: {
            x: Math.round(imageRect.x),
            y: Math.round(imageRect.y),
            w: Math.round(imageRect.width),
            h: Math.round(imageRect.height)
        }
    };

    const url = contentStateService.generateLink(window.location.href, viewportState);
    navigator.clipboard.writeText(url);
    showToast("Shareable view link copied to clipboard", "success");
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


  const saveAnnotation = (newAnno: IIIFAnnotation) => {
      if (!item) return;
      const currentAnnos = [...annotations, newAnno];
      setAnnotations(currentAnnos);

      const updatedAnnos = item.annotations || [];
      if (updatedAnnos.length === 0) {
          updatedAnnos.push({
              id: `${item.id}/page/annotations`,
              type: "AnnotationPage",
              items: [newAnno]
          });
      } else {
          updatedAnnos[0].items.push(newAnno);
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
  }, [handleZoomIn, handleZoomOut, handleResetView, handleRotate]);

  if (!item) return <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-500 italic">Select a canvas to inspect.</div>;

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
      <div className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
            <h2 className="text-white font-bold flex items-center gap-2">
                <Icon name={mediaType === 'video' ? 'movie' : mediaType === 'audio' ? 'audiotrack' : 'image'} className="text-blue-400"/>
                {getIIIFValue(item.label)}
            </h2>
            {mediaType === 'image' && (
                <div className="flex bg-slate-800 rounded p-1 border border-slate-700 ml-4 gap-2">
                    <button onClick={() => handleExtractEvidence('default')} className="text-[10px] font-black uppercase text-blue-400 hover:text-white flex items-center gap-1 px-2"><Icon name="content_cut" className="text-xs"/> Extract</button>
                    <button onClick={handleShareView} className="text-[10px] font-black uppercase text-slate-400 hover:text-white flex items-center gap-1 px-2"><Icon name="share" className="text-xs"/> Share</button>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-2">
            {mediaType === 'image' && (
              <>
                {/* Zoom Controls */}
                <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-1">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 text-slate-400 hover:text-white"
                    title="Zoom Out (-)"
                    aria-label="Zoom out"
                  >
                    <Icon name="remove" className="text-sm" />
                  </button>
                  <span className="px-2 text-[10px] font-mono text-slate-400 min-w-[40px] text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 text-slate-400 hover:text-white"
                    title="Zoom In (+)"
                    aria-label="Zoom in"
                  >
                    <Icon name="add" className="text-sm" />
                  </button>
                </div>

                {/* Rotation Controls */}
                <div className="flex items-center border-r border-slate-700 pr-2 mr-1">
                  <button
                    onClick={() => handleRotate(-90)}
                    className="p-2 text-slate-400 hover:text-white"
                    title="Rotate Counter-Clockwise (Shift+R)"
                    aria-label="Rotate counter-clockwise"
                  >
                    <Icon name="rotate_left" />
                  </button>
                  <button
                    onClick={() => handleRotate(90)}
                    className="p-2 text-slate-400 hover:text-white"
                    title="Rotate Clockwise (R)"
                    aria-label="Rotate clockwise"
                  >
                    <Icon name="rotate_right" />
                  </button>
                  <button
                    onClick={handleResetView}
                    className="p-2 text-slate-400 hover:text-white"
                    title="Reset View (Ctrl/Cmd+0)"
                    aria-label="Reset view to default"
                  >
                    <Icon name="restart_alt" />
                  </button>
                  {rotation !== 0 && (
                    <span className="text-[10px] text-slate-500 ml-1">{rotation}°</span>
                  )}
                </div>
                <button
                  onClick={() => setShowAnnotationTool(true)}
                  className="p-2 text-slate-400 hover:text-white"
                  title="Draw Annotations"
                >
                  <Icon name="draw" />
                </button>
              </>
            )}
            {searchService && (
              <button
                onClick={() => setShowSearchPanel(!showSearchPanel)}
                className={`p-2 ${showSearchPanel ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
                title="Search in Manifest"
              >
                <Icon name="search" />
              </button>
            )}
            <button onClick={() => setShowWorkbench(true)} className="p-2 text-slate-400 hover:text-white"><Icon name="tune" /></button>
            <button onClick={() => setShowTranscriptionPanel(!showTranscriptionPanel)} className={`p-2 ${showTranscriptionPanel ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}><Icon name="description" /></button>
            {manifestItems && manifestItems.length > 1 && (
              <button
                onClick={() => setShowFilmstrip(!showFilmstrip)}
                className={`p-2 ${showFilmstrip ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
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
                        title={getIIIFValue(canvas.label) || `Canvas ${idx + 1}`}
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={getIIIFValue(canvas.label) || `Canvas ${idx + 1}`}
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
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Evidence & Notes</h3>
                    <button onClick={() => setShowTranscriptionPanel(false)}><Icon name="close" className="text-slate-500 text-sm" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {annotations.length === 0 ? (
                        <div className="text-center py-20 text-slate-600 italic text-sm">No evidence annotations yet.</div>
                    ) : (
                        annotations.map(anno => {
                            const bodyText = (anno.body as any).label?.en?.[0] || (anno.body as any).value || 'Archive Evidence';
                            const selector = (anno.target as any).selector?.value || '';
                            const isRegion = selector.includes('xywh=');
                            const bodyImg = (anno.body as any).id;
                            const isText = (anno.body as any).type === 'TextualBody';
                            
                            return (
                                <div key={anno.id} onClick={() => isRegion && zoomToRegion(selector)} className="bg-slate-800 p-3 rounded border border-slate-700 cursor-pointer hover:border-blue-500 transition-all group">
                                    {bodyImg && bodyImg.includes('/iiif/') && <img src={bodyImg} className="w-full aspect-video object-cover rounded mb-2 border border-slate-600" />}
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-[9px] font-black uppercase tracking-tighter ${isText ? 'text-green-400' : 'text-blue-400'}`}>{isText ? 'Transcription' : (anno.motivation === 'painting' ? 'Layer' : 'Supplement')}</span>
                                        {isRegion && <Icon name="zoom_in" className="text-xs text-slate-500 group-hover:text-blue-400"/>}
                                    </div>
                                    <p className={`text-slate-200 text-xs ${isText ? 'font-mono whitespace-pre-wrap leading-relaxed' : 'font-bold'}`}>{bodyText}</p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        )}
      </div>

      {showWorkbench && item && <ImageRequestWorkbench canvas={item} onClose={() => setShowWorkbench(false)} />}
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
};
