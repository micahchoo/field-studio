
import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { getIIIFValue, IIIFCanvas, IIIFItem } from '@/src/shared/types';
import { DEFAULT_INGEST_PREFS } from '@/src/shared/constants';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { useToast } from '@/src/shared/ui/molecules/Toast';
import { usePanZoomGestures } from '@/src/shared/lib/hooks/usePanZoomGestures';
import { useViewport } from '@/src/shared/lib/hooks/useViewport';
import { useViewportKeyboard } from '@/src/shared/lib/hooks/useViewportKeyboard';
import { buildCanvasFromLayers, PlacedResource, useLayerHistory } from '@/src/shared/lib/hooks/useLayerHistory';

interface CanvasComposerProps {
  canvas: IIIFCanvas;
  root?: IIIFItem | null;
  onUpdate: (updatedCanvas: IIIFCanvas) => void;
  onClose: () => void;
}

export const CanvasComposer: React.FC<CanvasComposerProps> = ({ canvas, root, onUpdate, onClose }) => {
  const { showToast } = useToast();

  // Layer state + undo/redo + Cmd+Z keyboard binding
  const { layers, updateLayers, canUndo, canRedo, undo, redo } = useLayerHistory(canvas);

  const [canvasDimensions, setCanvasDimensions] = useState({ w: canvas.width || DEFAULT_INGEST_PREFS.defaultCanvasWidth, h: canvas.height || DEFAULT_INGEST_PREFS.defaultCanvasHeight });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bgMode, setBgMode] = useState<'grid' | 'dark' | 'light'>('grid');
  const [sidebarTab, setSidebarTab] = useState<'layers' | 'library'>('layers');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  const resizeStartRef = useRef<{
    mouseX: number; mouseY: number;
    layerX: number; layerY: number;
    layerW: number; layerH: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const viewport = useViewport({ minScale: 0.1, maxScale: 2, initialScale: 0.25 });
  const {scale} = viewport.viewport;

  const gestures = usePanZoomGestures(containerRef, viewport, {
    enabled: !isResizing,
    panButton: 'middle',
    requireCtrlForZoom: false,
  });

  useViewportKeyboard(containerRef, viewport, gestures, {
    enabled: true, enableZoom: true, enablePan: true,
    enableRotation: false, enableReset: true, enableSpacePan: true,
  });

  const handleSave = () => {
    onUpdate(buildCanvasFromLayers(canvas, layers, canvasDimensions));
    showToast("Composition saved successfully", "success");
    onClose();
  };

  const addResourceLayer = (item: IIIFItem) => {
      const id = crypto.randomUUID();
      const newLayer: PlacedResource = {
          id,
          resource: item as PlacedResource['resource'],
          x: 100, y: 100, w: 400, h: 300,
          opacity: 1, locked: false
      };
      updateLayers(prev => [...prev, newLayer]);
      setActiveId(id);
      showToast("Layer added", "success");
  };

  const addTextLayer = () => {
      const id = crypto.randomUUID();
      const newLayer: PlacedResource = {
          id,
          resource: {
              id: `urn:text:${id}`,
              type: 'Text',
              label: { none: ['Text Layer'] },
              _text: 'Double click to edit text...'
          },
          x: 100, y: 100, w: 400, h: 100,
          opacity: 1, 
          locked: false
      };
      updateLayers(prev => [...prev, newLayer]);
      setActiveId(id);
  };

  const moveLayer = (idx: number, dir: 'up' | 'down') => {
      const newLayers = [...layers];
      const target = idx + (dir === 'up' ? -1 : 1);
      if (target >= 0 && target < layers.length) {
          [newLayers[idx], newLayers[target]] = [newLayers[target], newLayers[idx]];
          updateLayers(newLayers);
      }
  };

  const alignActive = (type: 'center' | 'top' | 'left' | 'fill') => {
      if (!activeId) return;
      updateLayers(prev => prev.map(l => {
          if (l.id !== activeId) return l;
          switch(type) {
              case 'center': return { ...l, x: (canvasDimensions.w - l.w)/2, y: (canvasDimensions.h - l.h)/2 };
              case 'top': return { ...l, y: 0 };
              case 'left': return { ...l, x: 0 };
              case 'fill': return { ...l, x: 0, y: 0, w: canvasDimensions.w, h: canvasDimensions.h };
              default: return l;
          }
      }));
  };

  return (
    <div className="fixed inset-0 z-[500] bg-slate-950 flex flex-col animate-in fade-in duration-300" role="dialog" aria-modal="true" aria-label="Synthesis Workspace">
      <div className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6 shrink-0 shadow-2xl">
        <div className="flex items-center gap-6">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Icon name="auto_awesome_motion" className="text-indigo-400"/> Synthesis Workspace
          </h2>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Dimensions</span>
             <input type="number" aria-label="Canvas Width" value={canvasDimensions.w} onChange={e => setCanvasDimensions({...canvasDimensions, w: Number(e.target.value)})} className="w-16 bg-white/5 text-white text-[10px] border border-white/10 rounded px-1 outline-none"/>
             <span className="text-white/20">×</span>
             <input type="number" aria-label="Canvas Height" value={canvasDimensions.h} onChange={e => setCanvasDimensions({...canvasDimensions, h: Number(e.target.value)})} className="w-16 bg-white/5 text-white text-[10px] border border-white/10 rounded px-1 outline-none"/>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex bg-white/5 border border-white/10 rounded p-1" role="group" aria-label="Background Mode">
              {(['grid', 'dark', 'light'] as const).map(m => (
                  <Button variant="ghost" size="bare" key={m} onClick={() => setBgMode(m)} aria-pressed={bgMode === m} className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${bgMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{m}</Button>
              ))}
          </div>
          <Button variant="ghost" size="bare" onClick={addTextLayer} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1"><Icon name="title" className="text-xs"/> Add Text</Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 border border-white/10 rounded p-1" role="group" aria-label="Undo/Redo">
              <Button variant="ghost" size="bare" onClick={undo} disabled={!canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)" className={`p-1 ${canUndo ? 'text-white/40 hover:text-white' : 'text-white/10 cursor-not-allowed'}`}><Icon name="undo"/></Button>
              <Button variant="ghost" size="bare" onClick={redo} disabled={!canRedo} aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)" className={`p-1 ${canRedo ? 'text-white/40 hover:text-white' : 'text-white/10 cursor-not-allowed'}`}><Icon name="redo"/></Button>
          </div>
          <div className="flex bg-white/5 border border-white/10 rounded p-1">
              <Button variant="ghost" size="bare" onClick={viewport.zoomOut} aria-label="Zoom Out" className="p-1 text-white/40 hover:text-white"><Icon name="remove"/></Button>
              <span className="px-3 py-1 text-[10px] font-bold text-white/60 min-w-[60px] text-center" aria-live="polite">{viewport.scalePercent}%</span>
              <Button variant="ghost" size="bare" onClick={viewport.zoomIn} aria-label="Zoom In" className="p-1 text-white/40 hover:text-white"><Icon name="add"/></Button>
          </div>
          <Button variant="ghost" size="bare" onClick={onClose} aria-label="Cancel and close workspace" className="px-4 py-2 text-white/40 hover:text-white font-bold text-sm">Cancel</Button>
          <Button variant="ghost" size="bare" onClick={handleSave} aria-label="Apply composition to canvas" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-indigo-500 shadow-xl transition-all">Apply Composition</Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-slate-900 border-r border-white/10 flex flex-col">
            <div className="flex border-b border-white/10">
                <Button variant="ghost" size="bare" onClick={() => setSidebarTab('layers')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${sidebarTab === 'layers' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/40'}`}>Layers</Button>
                <Button variant="ghost" size="bare" onClick={() => setSidebarTab('library')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${sidebarTab === 'library' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/40'}`}>Library</Button>
            </div>
            
            {sidebarTab === 'layers' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar" role="list" aria-label="Resource Layers">
                {layers.length === 0 ? (
                    <div className="text-center py-20 text-slate-600 italic text-sm">No items on canvas.</div>
                ) : layers.map((l, i) => (
                    <div 
                      key={l.id} 
                      role="listitem"
                      tabIndex={0}
                      aria-selected={activeId === l.id}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveId(l.id); } }}
                      onClick={() => setActiveId(l.id)} 
                      className={`p-4 rounded-xl border transition-all cursor-pointer group outline-none focus:ring-2 focus:ring-indigo-500 ${activeId === l.id ? 'bg-indigo-600/20 border-indigo-500' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[11px] font-bold text-white truncate max-w-[140px]">{getIIIFValue(l.resource.label, 'none')}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="bare" onClick={(e) => { e.stopPropagation(); updateLayers(layers.map(x => x.id === l.id ? {...x, locked: !x.locked} : x)); }} className={`p-1 rounded ${l.locked ? 'text-indigo-400' : 'text-white/20'}`} title="Lock Layer" aria-label={l.locked ? "Unlock Layer" : "Lock Layer"}><Icon name={l.locked ? 'lock' : 'lock_open'} className="text-[14px]"/></Button>
                                <Button variant="ghost" size="bare" onClick={(e) => { e.stopPropagation(); moveLayer(i, 'down'); }} className="p-1 hover:bg-white/10 rounded" title="Move Back" aria-label="Move Layer Back"><Icon name="arrow_downward" className="text-[14px]"/></Button>
                                <Button variant="ghost" size="bare" onClick={(e) => { e.stopPropagation(); moveLayer(i, 'up'); }} className="p-1 hover:bg-white/10 rounded" title="Move Forward" aria-label="Move Layer Forward"><Icon name="arrow_upward" className="text-[14px]"/></Button>
                                <Button variant="ghost" size="bare" onClick={(e) => { e.stopPropagation(); updateLayers(prev => prev.filter(x => x.id !== l.id)); }} className="p-1 hover:bg-red-500 text-white rounded" title="Remove Layer" aria-label="Remove Layer"><Icon name="delete" className="text-[14px]"/></Button>
                            </div>
                        </div>
                        <div className={`space-y-3 ${l.locked ? 'opacity-40 pointer-events-none' : ''}`}>
                            <div className="grid grid-cols-4 gap-1">
                                {['x','y','w','h'].map(f => (
                                    <div key={f} className="space-y-1">
                                        <span className="text-[8px] font-black text-white/30 uppercase block">{f}</span>
                                        <input type="number" aria-label={`Layer ${f} coordinate`} value={(l as any)[f]} onChange={e => updateLayers(layers.map(x => x.id === l.id ? {...x, [f]: Number(e.target.value)} : x))} className="w-full bg-black/40 text-white text-[10px] border-none rounded p-1 outline-none"/>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-black text-white/30 uppercase"><span>Opacity</span><span>{Math.round(l.opacity * 100)}%</span></div>
                                <input type="range" aria-label="Layer Opacity" min="0" max="1" step="0.05" value={l.opacity} onChange={e => updateLayers(layers.map(x => x.id === l.id ? {...x, opacity: Number(e.target.value)} : x))} className="w-full accent-indigo-500" />
                            </div>
                        </div>
                        {activeId === l.id && !l.locked && (
                            <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                                <Button variant="ghost" size="bare" onClick={(e) => { e.stopPropagation(); alignActive('center'); }} className="flex-1 bg-white/5 hover:bg-white/10 text-[8px] font-black uppercase py-1 rounded">Center</Button>
                                <Button variant="ghost" size="bare" onClick={(e) => { e.stopPropagation(); alignActive('fill'); }} className="flex-1 bg-white/5 hover:bg-white/10 text-[8px] font-black uppercase py-1 rounded">Fill</Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {/* Simple flat list of root items for now */}
                    {/* In a real app, we'd traverse properly. Mocking simple traversal for demo */}
                    {root?.items?.map((item: any) => (
                        <div 
                            key={item.id} 
                            draggable 
                            onDragStart={(e) => e.dataTransfer.setData('application/iiif-item-id', item.id)}
                            onClick={() => addResourceLayer(item)}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer group flex items-center gap-3 border border-transparent hover:border-indigo-500/50"
                        >
                            <div className="w-10 h-10 bg-black rounded overflow-hidden shrink-0">
                                {item.thumbnail?.[0]?.id || item._blobUrl ? (
                                    <img src={item.thumbnail?.[0]?.id || item._blobUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <Icon name="image" className="text-white/20 m-2"/>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">{getIIIFValue(item.label, 'none') || 'Untitled'}</div>
                                <div className="text-[10px] text-white/40 truncate">{item.type}</div>
                            </div>
                            <Icon name="add_circle" className="text-white/20 group-hover:text-indigo-400 ml-auto"/>
                        </div>
                    ))}
                    {!root && <div className="p-4 text-center text-white/30 text-xs">No library source available.</div>}
                </div>
            )}
        </div>

        <div
            ref={containerRef}
            className={`flex-1 relative overflow-auto flex items-center justify-center p-20 custom-scrollbar shadow-inner ${bgMode === 'light' ? 'bg-slate-200' : bgMode === 'dark' ? 'bg-slate-900' : 'bg-black'}`}
            onDragOver={e => e.preventDefault()}
            onMouseDown={(e) => {
                // Handle middle-click or shift+click for panning
                if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                    gestures.handlers.onMouseDown(e);
                }
            }}
            onMouseMove={(e) => {
                // Handle panning
                if (gestures.isPanning) {
                    gestures.handlers.onMouseMove(e);
                    return;
                }
                // Handle layer resizing with accurate coordinate transformation
                if (isResizing && activeId && resizeHandle && resizeStartRef.current) {
                    const start = resizeStartRef.current;
                    const dx = (e.clientX - start.mouseX) / scale;
                    const dy = (e.clientY - start.mouseY) / scale;
                    
                    updateLayers(prev => prev.map(l => {
                        if (l.id !== activeId) return l;
                        let { x, y, w, h } = {
                            x: start.layerX,
                            y: start.layerY,
                            w: start.layerW,
                            h: start.layerH
                        };
                        
                        if (resizeHandle.includes('e')) w = Math.max(10, start.layerW + dx);
                        if (resizeHandle.includes('w')) {
                            const newW = Math.max(10, start.layerW - dx);
                            x = start.layerX + (start.layerW - newW);
                            w = newW;
                        }
                        if (resizeHandle.includes('s')) h = Math.max(10, start.layerH + dy);
                        if (resizeHandle.includes('n')) {
                            const newH = Math.max(10, start.layerH - dy);
                            y = start.layerY + (start.layerH - newH);
                            h = newH;
                        }
                        return { ...l, x, y, w, h };
                    }));
                }
            }}
            onMouseUp={(e) => {
                setIsResizing(false);
                setResizeHandle(null);
                resizeStartRef.current = null;
                gestures.handlers.onMouseUp(e);
            }}
            onMouseLeave={gestures.handlers.onMouseLeave}
            onWheel={(e) => {
                // Allow wheel zoom anywhere in the workspace
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    viewport.zoomAtPoint(e.deltaY, { x: e.clientX, y: e.clientY }, rect);
                }
            }}
            onDrop={(e) => {
                e.preventDefault();
                const itemId = e.dataTransfer.getData('application/iiif-item-id');
                if (itemId) {
                    // In a real app, we'd fetch metadata. For now, create a placeholder layer
                    const id = crypto.randomUUID();
                    const newLayer: PlacedResource = {
                        id,
                        resource: {
                            id: itemId,
                            type: 'Image',
                            label: { none: ['Dropped Item'] },
                            // Try to get blob from transfer if possible, or use ID
                            _blobUrl: itemId.startsWith('blob:') ? itemId : undefined
                        },
                        x: 100, y: 100, w: 400, h: 300,
                        opacity: 1, locked: false
                    };
                    updateLayers(prev => [...prev, newLayer]);
                    setActiveId(id);
                    showToast("Layer added from drop", "success");
                }
            }}
        >
            <div className="relative shadow-[0_0_100px_rgba(79,70,229,0.2)] bg-slate-900 border border-white/5" style={{ 
                width: canvasDimensions.w * scale, 
                height: canvasDimensions.h * scale, 
                backgroundImage: bgMode === 'grid' ? 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)' : 'none', 
                backgroundSize: '20px 20px' 
            }} aria-label="Canvas Area">
                {layers.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 pointer-events-none border-2 border-dashed border-white/10 m-4 rounded-3xl">
                        <Icon name="layers" className="text-6xl mb-4"/>
                        <h3 className="text-xl font-bold uppercase tracking-widest">Composition Canvas</h3>
                        <p className="text-sm mt-2">Drag and drop items here to create layers</p>
                    </div>
                )}
                {layers.map((l, idx) => (
                    <div 
                        key={l.id} 
                        onClick={() => setActiveId(l.id)} 
                        className={`absolute group select-none transition-all ${activeId === l.id ? 'ring-2 ring-indigo-500 z-50 shadow-2xl' : 'z-10'}`} 
                        style={{ left: l.x * scale, top: l.y * scale, width: l.w * scale, height: l.h * scale, opacity: l.opacity, zIndex: layers.length - idx }}
                    >
                        {(l.resource.type === 'Text' || l.resource._text) ? (
                            <textarea 
                                value={l.resource._text} 
                                onChange={(e) => updateLayers(layers.map(x => x.id === l.id ? {...x, resource: {...x.resource, _text: e.target.value}} : x))}
                                className="w-full h-full bg-transparent text-white p-2 resize-none outline-none border-2 border-dashed border-white/20"
                                style={{ fontSize: `${24 * scale}px` }}
                            />
                        ) : l.resource.type === 'Video' ? (
                            <video src={l.resource._blobUrl || l.resource.id} className="w-full h-full object-cover pointer-events-none" />
                        ) : l.resource.type === 'Sound' ? (
                            <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center border border-slate-600">
                                <Icon name="audiotrack" className="text-4xl text-white/50"/>
                                <span className="text-[10px] text-white/50 mt-2">Audio Layer</span>
                            </div>
                        ) : l.resource._blobUrl ? (
                            <img src={l.resource._blobUrl} className="w-full h-full object-fill pointer-events-none" alt={getIIIFValue(l.resource.label, 'none') || 'Layer Image'} />
                        ) : (
                            <div className="w-full h-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20"><Icon name="image" className="text-4xl"/></div>
                        )}
                        
                        {activeId === l.id && (
                            <>
                                <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-lg flex items-center gap-1">
                                    <Icon name={l.locked ? 'lock' : 'auto_fix_high'} className="text-[10px]"/> Synthesis Layer
                                </div>
                                <div className="absolute inset-0 border-2 border-indigo-500/50 pointer-events-none"></div>
                                {/* Resize Handles */}
                                {!l.locked && (
                                    <>
                                        {['nw', 'ne', 'sw', 'se'].map(h => (
                                            <div
                                                key={h}
                                                className="absolute w-3 h-3 bg-white border border-indigo-500 rounded-full z-50"
                                                style={{
                                                    cursor: `${h}-resize`,
                                                    top: h.includes('n') ? -6 : 'auto',
                                                    bottom: h.includes('s') ? -6 : 'auto',
                                                    left: h.includes('w') ? -6 : 'auto',
                                                    right: h.includes('e') ? -6 : 'auto',
                                                }}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    const layer = layers.find(l => l.id === activeId);
                                                    if (layer) {
                                                        resizeStartRef.current = {
                                                            mouseX: e.clientX,
                                                            mouseY: e.clientY,
                                                            layerX: layer.x,
                                                            layerY: layer.y,
                                                            layerW: layer.w,
                                                            layerH: layer.h
                                                        };
                                                        setIsResizing(true);
                                                        setResizeHandle(h);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </>
                                )}
                            </>
                        )}
                        {l.locked && (
                            <div className="absolute top-2 right-2 text-white/50"><Icon name="lock" className="text-sm"/></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>
      <div className="h-8 bg-slate-950 border-t border-white/5 flex items-center justify-between px-6 text-[10px] text-white/30 uppercase font-black tracking-widest">
          <div className="flex gap-4"><span>Archive Synthesis Engine</span><span>{layers.length} Active Parts</span></div>
          <div className="flex gap-4">
              <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">Scroll</kbd> Zoom</span>
              <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">+/-</kbd> Zoom</span>
              <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">Shift+Drag</kbd> Pan</span>
              <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[8px]">Cmd+Z</kbd> Undo</span>
          </div>
      </div>
    </div>
  );
};
