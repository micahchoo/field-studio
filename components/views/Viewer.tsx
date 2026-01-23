
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { IIIFCanvas, IIIFAnnotation, IIIFAnnotationPage, IIIFSpecificResource, IIIFItem, getIIIFValue } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { ImageRequestWorkbench } from '../ImageRequestWorkbench';
import { CanvasComposer } from '../CanvasComposer';
import { contentStateService } from '../../services/contentState';

declare const OpenSeadragon: any;

interface ViewerProps {
  item: IIIFCanvas | null;
  manifestItems?: IIIFCanvas[];
  onSelect?: (id: string) => void;
  onUpdate: (item: Partial<IIIFCanvas>) => void;
  autoOpenComposer?: boolean;
  onComposerOpened?: () => void;
}

export const Viewer: React.FC<ViewerProps> = ({ item, manifestItems, onSelect, onUpdate, autoOpenComposer, onComposerOpened }) => {
  const { showToast } = useToast();
  const viewerRef = useRef<any>(null);
  const osdContainerRef = useRef<HTMLDivElement>(null);

  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'other'>('other');
  const [annotations, setAnnotations] = useState<IIIFAnnotation[]>([]);
  const [showTranscriptionPanel, setShowTranscriptionPanel] = useState(false);
  const [isOcring, setIsOcring] = useState(false);
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

  // Anticipatory Logic: If synthesize was clicked in Collections, open Composer immediately
  useEffect(() => {
    if (autoOpenComposer && item) {
        setShowComposer(true);
        onComposerOpened?.();
    }
  }, [autoOpenComposer, item]);

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
      if (mediaType === 'image' && item && osdContainerRef.current) {
          if (viewerRef.current) viewerRef.current.destroy();

          let tileSource: any = null;
          if (serviceId) {
              tileSource = `${serviceId}/info.json`;
          } else if (resolvedImageUrl) {
              tileSource = { type: 'image', url: resolvedImageUrl };
          }

          if (tileSource) {
              viewerRef.current = OpenSeadragon({
                  element: osdContainerRef.current,
                  prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
                  tileSources: tileSource,
                  gestureSettingsMouse: { clickToZoom: false },
                  showNavigationControl: false,
                  blendTime: 0.1,
              });
          }

          return () => { if (viewerRef.current) viewerRef.current.destroy(); };
      }
  }, [item?.id, mediaType, serviceId, resolvedImageUrl]);

  const handleShareView = () => {
    if (!item || !viewerRef.current) return;
    const bounds = viewerRef.current.viewport.getBounds();
    const imageRect = viewerRef.current.viewport.viewportToImageRectangle(bounds);
    const xywh = `xywh=${Math.round(imageRect.x)},${Math.round(imageRect.y)},${Math.round(imageRect.width)},${Math.round(imageRect.height)}`;
    
    const state = {
        type: "Annotation",
        motivation: "contentState",
        target: {
            id: `${item.id}#${xywh}`,
            type: "Canvas",
            partOf: [{ id: item._parentId || "root", type: "Manifest" }]
        }
    };
    
    const url = contentStateService.generateLink(window.location.href, state);
    navigator.clipboard.writeText(url);
    showToast("Shareable view link copied to clipboard", "success");
  };

  const handleExtractEvidence = (quality: string = 'default') => {
      if (!viewerRef.current || !item) return;
      
      const bounds = viewerRef.current.viewport.getBounds();
      const imageRect = viewerRef.current.viewport.viewportToImageRectangle(bounds);
      const xywh = `xywh=${Math.round(imageRect.x)},${Math.round(imageRect.y)},${Math.round(imageRect.width)},${Math.round(imageRect.height)}`;
      
      const derivedImageUrl = serviceId 
        ? `${serviceId}/${xywh.split('=')[1]}/max/0/${quality}.jpg`
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
          target: {
              type: "SpecificResource",
              source: item.id,
              selector: { type: "FragmentSelector", value: xywh }
          }
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

  const zoomToRegion = (xywh: string) => {
    if (!viewerRef.current || !item) return;
    const parts = xywh.replace('xywh=', '').split(',').map(Number);
    if (parts.length !== 4) return;
    const [x, y, w, h] = parts;
    const rect = viewerRef.current.viewport.imageToViewportRectangle(x, y, w, h);
    viewerRef.current.viewport.fitBounds(rect, false);
  };

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
            <button onClick={() => setShowComposer(true)} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-bold mr-2 border border-indigo-500 shadow-lg"><Icon name="layers" className="text-xs"/> Compose</button>
            <button onClick={() => setShowWorkbench(true)} className="p-2 text-slate-400 hover:text-white"><Icon name="tune" /></button>
            <button onClick={() => setShowTranscriptionPanel(!showTranscriptionPanel)} className={`p-2 ${showTranscriptionPanel ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}><Icon name="description" /></button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 relative bg-black overflow-hidden flex">
            <div ref={osdContainerRef} className="flex-1 h-full" />
        </div>
        
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
    </div>
  );
};
