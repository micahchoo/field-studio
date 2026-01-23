
import React, { useState, useRef, useEffect } from 'react';
import { IIIFCanvas, IIIFAnnotation, IIIFItem, IIIFAnnotationPage } from '../types';
import { Icon } from './Icon';
import { useToast } from './Toast';

interface CanvasComposerProps {
  canvas: IIIFCanvas;
  onUpdate: (updatedCanvas: IIIFCanvas) => void;
  onClose: () => void;
}

interface PlacedResource {
  id: string; 
  resource: IIIFItem;
  x: number; y: number; w: number; h: number;
  opacity: number;
  locked: boolean;
}

export const CanvasComposer: React.FC<CanvasComposerProps> = ({ canvas, onUpdate, onClose }) => {
  const { showToast } = useToast();
  const [layers, setLayers] = useState<PlacedResource[]>([]);
  const [canvasDimensions, setCanvasDimensions] = useState({ w: canvas.width || 2000, h: canvas.height || 2000 });
  const [scale, setScale] = useState(0.25);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bgMode, setBgMode] = useState<'grid' | 'dark' | 'light'>('grid');
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing: PlacedResource[] = [];
    if (canvas.items?.[0]?.items) {
      canvas.items[0].items.forEach(anno => {
          const targetString = typeof anno.target === 'string' ? anno.target : (anno.target as any).source;
          const fragment = targetString.includes('#xywh=') ? targetString.split('#xywh=')[1] : null;
          let [x, y, w, h] = [0, 0, canvasDimensions.w, canvasDimensions.h];
          if (fragment) [x, y, w, h] = fragment.split(',').map(Number);

          existing.push({
            id: anno.id,
            resource: { 
                id: (anno.body as any).id || '', 
                type: (anno.body as any).type || 'Image',
                _blobUrl: (anno.body as any).id?.includes('blob:') ? (anno.body as any).id : undefined,
                label: (anno.body as any).label || { none: ['Archive Layer'] }
            } as any,
            x, y, w, h, opacity: 1, locked: false
          });
      });
    }
    setLayers(existing);
  }, [canvas.id]);

  const handleSave = () => {
    const newCanvas = { ...canvas };
    newCanvas.items = [{
      id: `${canvas.id}/page/painting`,
      type: "AnnotationPage",
      items: layers.map(l => ({
        id: l.id, type: "Annotation", motivation: "painting",
        body: { id: l.resource._blobUrl || l.resource.id, type: l.resource.type, format: 'image/jpeg' } as any,
        target: `${canvas.id}#xywh=${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.w)},${Math.round(l.h)}`
      }))
    }];
    newCanvas.width = canvasDimensions.w;
    newCanvas.height = canvasDimensions.h;
    onUpdate(newCanvas);
    onClose();
  };

  const moveLayer = (idx: number, dir: 'up' | 'down') => {
      const newLayers = [...layers];
      const target = idx + (dir === 'up' ? -1 : 1);
      if (target >= 0 && target < layers.length) {
          [newLayers[idx], newLayers[target]] = [newLayers[target], newLayers[idx]];
          setLayers(newLayers);
      }
  };

  const alignActive = (type: 'center' | 'top' | 'left' | 'fill') => {
      if (!activeId) return;
      setLayers(prev => prev.map(l => {
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
    <div className="fixed inset-0 z-[500] bg-slate-950 flex flex-col animate-in fade-in duration-300">
      <div className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6 shrink-0 shadow-2xl">
        <div className="flex items-center gap-6">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Icon name="auto_awesome_motion" className="text-indigo-400"/> Synthesis Workspace
          </h2>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Dimensions</span>
             <input type="number" value={canvasDimensions.w} onChange={e => setCanvasDimensions({...canvasDimensions, w: Number(e.target.value)})} className="w-16 bg-white/5 text-white text-[10px] border border-white/10 rounded px-1 outline-none"/>
             <span className="text-white/20">×</span>
             <input type="number" value={canvasDimensions.h} onChange={e => setCanvasDimensions({...canvasDimensions, h: Number(e.target.value)})} className="w-16 bg-white/5 text-white text-[10px] border border-white/10 rounded px-1 outline-none"/>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex bg-white/5 border border-white/10 rounded p-1">
              {(['grid', 'dark', 'light'] as const).map(m => (
                  <button key={m} onClick={() => setBgMode(m)} className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${bgMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{m}</button>
              ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 border border-white/10 rounded p-1">
              <button onClick={() => setScale(s => s * 0.8)} className="p-1 text-white/40 hover:text-white"><Icon name="remove"/></button>
              <span className="px-3 py-1 text-[10px] font-bold text-white/60 min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => s * 1.2) } className="p-1 text-white/40 hover:text-white"><Icon name="add"/></button>
          </div>
          <button onClick={onClose} className="px-4 py-2 text-white/40 hover:text-white font-bold text-sm">Cancel</button>
          <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-indigo-500 shadow-xl transition-all">Apply Composition</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-slate-900 border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/5 text-[10px] font-black text-white/40 uppercase tracking-widest flex justify-between items-center">
                <span>Resource Layers</span>
                <Icon name="layers" className="text-xs"/>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {layers.length === 0 ? (
                    <div className="text-center py-20 text-slate-600 italic text-sm">No items on canvas.</div>
                ) : layers.map((l, i) => (
                    <div key={l.id} onClick={() => setActiveId(l.id)} className={`p-4 rounded-xl border transition-all cursor-pointer group ${activeId === l.id ? 'bg-indigo-600/20 border-indigo-500' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[11px] font-bold text-white truncate max-w-[140px]">{l.resource.label?.['none']?.[0]}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setLayers(layers.map(x => x.id === l.id ? {...x, locked: !x.locked} : x)); }} className={`p-1 rounded ${l.locked ? 'text-indigo-400' : 'text-white/20'}`} title="Lock Layer"><Icon name={l.locked ? 'lock' : 'lock_open'} className="text-[14px]"/></button>
                                <button onClick={(e) => { e.stopPropagation(); moveLayer(i, 'down'); }} className="p-1 hover:bg-white/10 rounded" title="Move Back"><Icon name="arrow_downward" className="text-[14px]"/></button>
                                <button onClick={(e) => { e.stopPropagation(); moveLayer(i, 'up'); }} className="p-1 hover:bg-white/10 rounded" title="Move Forward"><Icon name="arrow_upward" className="text-[14px]"/></button>
                                <button onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.filter(x => x.id !== l.id)); }} className="p-1 hover:bg-red-500 text-white rounded" title="Remove Layer"><Icon name="delete" className="text-[14px]"/></button>
                            </div>
                        </div>
                        <div className={`space-y-3 ${l.locked ? 'opacity-40 pointer-events-none' : ''}`}>
                            <div className="grid grid-cols-4 gap-1">
                                {['x','y','w','h'].map(f => (
                                    <div key={f} className="space-y-1">
                                        <span className="text-[8px] font-black text-white/30 uppercase block">{f}</span>
                                        <input type="number" value={(l as any)[f]} onChange={e => setLayers(layers.map(x => x.id === l.id ? {...x, [f]: Number(e.target.value)} : x))} className="w-full bg-black/40 text-white text-[10px] border-none rounded p-1 outline-none"/>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-black text-white/30 uppercase"><span>Opacity</span><span>{Math.round(l.opacity * 100)}%</span></div>
                                <input type="range" min="0" max="1" step="0.05" value={l.opacity} onChange={e => setLayers(layers.map(x => x.id === l.id ? {...x, opacity: Number(e.target.value)} : x))} className="w-full accent-indigo-500" />
                            </div>
                        </div>
                        {activeId === l.id && !l.locked && (
                            <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); alignActive('center'); }} className="flex-1 bg-white/5 hover:bg-white/10 text-[8px] font-black uppercase py-1 rounded">Center</button>
                                <button onClick={(e) => { e.stopPropagation(); alignActive('fill'); }} className="flex-1 bg-white/5 hover:bg-white/10 text-[8px] font-black uppercase py-1 rounded">Fill</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        <div className={`flex-1 relative overflow-auto flex items-center justify-center p-20 custom-scrollbar shadow-inner ${bgMode === 'light' ? 'bg-slate-200' : bgMode === 'dark' ? 'bg-slate-900' : 'bg-black'}`} onDragOver={e => e.preventDefault()}>
            <div className="relative shadow-[0_0_100px_rgba(79,70,229,0.2)] bg-slate-900 border border-white/5" style={{ 
                width: canvasDimensions.w * scale, 
                height: canvasDimensions.h * scale, 
                backgroundImage: bgMode === 'grid' ? 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)' : 'none', 
                backgroundSize: '20px 20px' 
            }}>
                {layers.map((l, idx) => (
                    <div 
                        key={l.id} 
                        onClick={() => setActiveId(l.id)} 
                        className={`absolute group select-none transition-all ${activeId === l.id ? 'ring-2 ring-indigo-500 z-50 shadow-2xl' : 'z-10'}`} 
                        style={{ left: l.x * scale, top: l.y * scale, width: l.w * scale, height: l.h * scale, opacity: l.opacity, zIndex: layers.length - idx }}
                    >
                        {l.resource._blobUrl ? <img src={l.resource._blobUrl} className="w-full h-full object-fill pointer-events-none" /> : <div className="w-full h-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20"><Icon name="image" className="text-4xl"/></div>}
                        {activeId === l.id && (
                            <>
                                <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-lg flex items-center gap-1">
                                    <Icon name={l.locked ? 'lock' : 'auto_fix_high'} className="text-[10px]"/> Synthesis Layer
                                </div>
                                <div className="absolute inset-0 border-2 border-indigo-500/50 pointer-events-none"></div>
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
              <span className="flex items-center gap-1"><Icon name="mouse" className="text-[10px]"/> Adjust values in sidebar</span>
              <span className="flex items-center gap-1"><Icon name="save" className="text-[10px]"/> Synthesis anchors automatically</span>
          </div>
      </div>
    </div>
  );
};
