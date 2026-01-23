
import React, { useState, useEffect, useMemo } from 'react';
import { IIIFCanvas, IIIFItem } from '../types';
import { Icon } from './Icon';
import { useToast } from './Toast';

interface ImageRequestWorkbenchProps {
  canvas: IIIFCanvas;
  onClose: () => void;
}

interface ImageApiParams {
  region: string;
  size: string;
  rotation: string;
  quality: string;
  format: string;
}

export const ImageRequestWorkbench: React.FC<ImageRequestWorkbenchProps> = ({ canvas, onClose }) => {
  const { showToast } = useToast();
  
  const paintingBody = canvas.items?.[0]?.items?.[0]?.body as any;
  const service = paintingBody?.service?.[0];
  const imageId = service?.id || paintingBody?.id || '';
  const isImageService = !!service;
  
  const [params, setParams] = useState<ImageApiParams>({
    region: 'full',
    size: 'max',
    rotation: '0',
    quality: 'default',
    format: 'jpg'
  });

  const [regionMode, setRegionMode] = useState<'full' | 'square' | 'pct' | 'pixel'>('full');
  const [sizeMode, setSizeMode] = useState<'max' | 'pct' | 'w' | 'h' | 'wh' | 'bestfit'>('max');
  
  const [regionCoords, setRegionCoords] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [sizeVal, setSizeVal] = useState({ w: 1000, h: 1000, pct: 100 });
  const [rotationDeg, setRotationDeg] = useState(0);
  const [mirrored, setMirrored] = useState(false);
  const [upscale, setUpscale] = useState(false);

  useEffect(() => {
    let r = 'full';
    if (regionMode === 'square') r = 'square';
    else if (regionMode === 'pct') r = `pct:${regionCoords.x},${regionCoords.y},${regionCoords.w},${regionCoords.h}`;
    else if (regionMode === 'pixel') r = `${regionCoords.x},${regionCoords.y},${regionCoords.w},${regionCoords.h}`;

    let s = 'max';
    const upPrefix = upscale ? '^' : '';
    if (sizeMode === 'pct') s = `${upPrefix}pct:${sizeVal.pct}`;
    else if (sizeMode === 'w') s = `${upPrefix}${sizeVal.w},`;
    else if (sizeMode === 'h') s = `${upPrefix},${sizeVal.h}`;
    else if (sizeMode === 'wh') s = `${upPrefix}${sizeVal.w},${sizeVal.h}`;
    else if (sizeMode === 'bestfit') s = `${upPrefix}!${sizeVal.w},${sizeVal.h}`;

    let rot = rotationDeg.toString();
    if (mirrored) rot = `!${rot}`;

    setParams(p => ({ ...p, region: r, size: s, rotation: rot }));
  }, [regionMode, sizeMode, regionCoords, sizeVal, rotationDeg, mirrored, upscale]);

  const url = isImageService ? `${imageId}/${params.region}/${params.size}/${params.rotation}/${params.quality}.${params.format}` : imageId;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
        <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            <div className="flex-1 bg-slate-900 relative flex flex-col overflow-hidden">
                <div className="h-12 border-b border-white/10 flex items-center px-6 justify-between bg-black/20 shrink-0">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Image API 3.0 Real-time Visualizer</span>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> <span className="text-[9px] text-white/60 font-bold uppercase">Valid Request</span></div>
                    </div>
                </div>
                
                <div className="flex-1 flex items-center justify-center p-8 relative group">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <img 
                        src={url} 
                        className="max-w-[85%] max-h-[85%] object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/20 transition-all duration-300" 
                        style={{ transform: `scaleX(${mirrored ? -1 : 1}) rotate(${rotationDeg}deg)` }}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/1e293b/white?text=Invalid+Request+Parameters'; }}
                    />
                </div>

                <div className="p-6 bg-slate-950 text-white font-mono text-xs border-t border-white/10 shrink-0">
                    <div className="flex items-center gap-1 group/bar">
                        <span className="text-white/30 truncate max-w-[200px]">{imageId}/</span>
                        <span className="text-green-400 font-bold bg-green-400/10 px-1 rounded" title="Region">{params.region}</span>/
                        <span className="text-blue-400 font-bold bg-blue-400/10 px-1 rounded" title="Size">{params.size}</span>/
                        <span className="text-orange-400 font-bold bg-orange-400/10 px-1 rounded" title="Rotation">{params.rotation}</span>/
                        <span className="text-purple-400 font-bold bg-purple-400/10 px-1 rounded" title="Quality">{params.quality}</span>.
                        <span className="text-yellow-400 font-bold bg-yellow-400/10 px-1 rounded" title="Format">{params.format}</span>
                        <div className="flex-1"></div>
                        <button onClick={() => { navigator.clipboard.writeText(url); showToast("API URL Copied", "success"); }} className="p-2 hover:bg-white/10 rounded transition-all"><Icon name="content_copy"/></button>
                    </div>
                </div>
            </div>

            <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
                <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Icon name="tune" className="text-iiif-blue"/> Request Toolkit
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded"><Icon name="close" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1"><Icon name="crop" className="text-xs"/> Region</label>
                            <select value={regionMode} onChange={(e) => setRegionMode(e.target.value as any)} className="text-xs font-bold border rounded px-2 py-1 bg-slate-50 outline-none">
                                <option value="full">Full</option><option value="square">Square</option><option value="pct">Percent</option><option value="pixel">Pixels</option>
                            </select>
                        </div>
                        {regionMode !== 'full' && regionMode !== 'square' && (
                            <div className="grid grid-cols-2 gap-2">
                                {['x','y','w','h'].map(f => (
                                    <input key={f} type="number" value={(regionCoords as any)[f]} onChange={e => setRegionCoords({...regionCoords, [f]: Number(e.target.value)})} placeholder={f} className="w-full text-xs p-2 border rounded focus:ring-1 focus:ring-green-500 outline-none" />
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1"><Icon name="aspect_ratio" className="text-xs"/> Size</label>
                            <div className="flex gap-2 items-center">
                                <button onClick={() => setUpscale(!upscale)} className={`text-[9px] font-black uppercase px-2 py-1 rounded border transition-all ${upscale ? 'bg-blue-600 border-blue-700 text-white' : 'text-slate-400'}`}>Upscale (^)</button>
                                <select value={sizeMode} onChange={(e) => setSizeMode(e.target.value as any)} className="text-xs font-bold border rounded px-2 py-1 bg-slate-50 outline-none">
                                    <option value="max">Max</option><option value="pct">Pct</option><option value="w">W,</option><option value="h">,H</option><option value="wh">W,H</option><option value="bestfit">!W,H</option>
                                </select>
                            </div>
                        </div>
                        {sizeMode === 'pct' ? (
                            <input type="range" min="1" max="200" value={sizeVal.pct} onChange={e => setSizeVal({...sizeVal, pct: Number(e.target.value)})} className="w-full" />
                        ) : sizeMode !== 'max' && (
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={sizeVal.w} onChange={e => setSizeVal({...sizeVal, w: Number(e.target.value)})} placeholder="Width" className="p-2 border rounded text-xs" />
                                <input type="number" value={sizeVal.h} onChange={e => setSizeVal({...sizeVal, h: Number(e.target.value)})} placeholder="Height" className="p-2 border rounded text-xs" />
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1"><Icon name="rotate_right" className="text-xs"/> Rotation</label>
                            <button onClick={() => setMirrored(!mirrored)} className={`p-2 rounded border transition-all ${mirrored ? 'bg-orange-500 border-orange-600 text-white shadow-inner' : 'text-slate-400'}`}><Icon name="flip" className="text-sm"/></button>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                            {[0, 90, 180, 270].map(d => (
                                <button key={d} onClick={() => setRotationDeg(d)} className={`py-2 text-xs font-bold border rounded ${rotationDeg === d ? 'bg-orange-50 border-orange-500 text-orange-700' : 'hover:bg-slate-50'}`}>{d}°</button>
                            ))}
                        </div>
                        <input type="range" min="0" max="359" value={rotationDeg} onChange={e => setRotationDeg(Number(e.target.value))} className="w-full accent-orange-500" />
                    </section>

                    <section className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Quality</label>
                             <select value={params.quality} onChange={e => setParams({...params, quality: e.target.value})} className="w-full text-xs p-2 border rounded font-bold">
                                {['default', 'color', 'gray', 'bitonal'].map(q => <option key={q} value={q}>{q}</option>)}
                             </select>
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Format</label>
                             <select value={params.format} onChange={e => setParams({...params, format: e.target.value})} className="w-full text-xs p-2 border rounded font-bold">
                                {['jpg', 'png', 'webp', 'tif', 'gif', 'pdf'].map(f => <option key={f} value={f}>{f}</option>)}
                             </select>
                        </div>
                    </section>
                </div>
                
                <div className="p-4 bg-slate-50 border-t">
                    <button onClick={onClose} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-black shadow-lg transition-all">Apply to Manifest</button>
                </div>
            </div>
        </div>
    </div>
  );
};
