
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { IIIFCanvas, IIIFItem } from '../types';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { IIIF_SPEC } from '../constants';

interface ImageRequestWorkbenchProps {
  canvas: IIIFCanvas;
  onClose: () => void;
  onApply?: (url: string) => void;
}

interface ImageApiParams {
  region: string;
  size: string;
  rotation: string;
  quality: string;
  format: string;
}

const IIIF_IMAGE_API_VERSIONS = ['3.0', '2.1', '2.0'] as const;

const REGION_PRESETS = [
  { label: 'Full', value: 'full', desc: 'Entire image' },
  { label: 'Square', value: 'square', desc: 'Centered square crop' },
  { label: 'Pixels', value: 'pixel', desc: 'x,y,w,h in pixels' },
  { label: 'Percent', value: 'pct', desc: 'Percent-based region' },
];

const SIZE_PRESETS = [
  { label: 'Max', value: 'max', desc: 'Maximum available size' },
  { label: 'Percent', value: 'pct', desc: 'Scale by percentage' },
  { label: 'Width', value: 'w', desc: 'Width only, auto height' },
  { label: 'Height', value: 'h', desc: 'Height only, auto width' },
  { label: 'Exact', value: 'wh', desc: 'Exact width,height' },
  { label: 'Best Fit', value: 'bestfit', desc: 'Fit within dimensions' },
];

const QUALITY_OPTIONS = [
  { value: 'default', label: 'Default', desc: 'Recommended quality' },
  { value: 'color', label: 'Color', desc: 'Full color (if available)' },
  { value: 'gray', label: 'Gray', desc: 'Grayscale conversion' },
  { value: 'bitonal', label: 'Bitonal', desc: 'Black and white only' },
];

const FORMAT_OPTIONS = [
  { value: 'jpg', label: 'JPEG', desc: 'Lossy compression, small files', mime: 'image/jpeg' },
  { value: 'png', label: 'PNG', desc: 'Lossless with alpha support', mime: 'image/png' },
  { value: 'webp', label: 'WebP', desc: 'Modern format, best compression', mime: 'image/webp' },
  { value: 'tif', label: 'TIFF', desc: 'Archive quality, uncompressed', mime: 'image/tiff' },
  { value: 'gif', label: 'GIF', desc: 'Limited colors, animation support', mime: 'image/gif' },
];

export const ImageRequestWorkbench: React.FC<ImageRequestWorkbenchProps> = ({ canvas, onClose, onApply }) => {
  const { showToast } = useToast();

  const paintingBody = canvas.items?.[0]?.items?.[0]?.body as any;
  const service = paintingBody?.service?.[0];

  const rawImageId = service?.id || paintingBody?.id || '';
  const baseUrl = import.meta.env.BASE_URL || '/';

  const imageId = useMemo(() => {
    if (!rawImageId) return '';

    if (rawImageId.startsWith('http://') || rawImageId.startsWith('https://')) {
      const origin = window.location.origin;
      if (rawImageId.startsWith(origin) && !rawImageId.includes(baseUrl)) {
        return rawImageId.replace(origin, origin + baseUrl.replace(/\/$/, ''));
      }
      return rawImageId;
    }

    if (rawImageId.startsWith('/') && !rawImageId.startsWith(baseUrl)) {
      return baseUrl.replace(/\/$/, '') + rawImageId;
    }

    return rawImageId;
  }, [rawImageId, baseUrl]);

  const isImageService = !!service;

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // State
  const [apiVersion, setApiVersion] = useState<typeof IIIF_IMAGE_API_VERSIONS[number]>('3.0');
  const [regionMode, setRegionMode] = useState<'full' | 'square' | 'pct' | 'pixel'>('full');
  const [sizeMode, setSizeMode] = useState<'max' | 'pct' | 'w' | 'h' | 'wh' | 'bestfit'>('max');
  const [regionCoords, setRegionCoords] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [sizeVal, setSizeVal] = useState({ w: 1000, h: 1000, pct: 100 });
  const [rotationDeg, setRotationDeg] = useState(0);
  const [mirrored, setMirrored] = useState(false);
  const [upscale, setUpscale] = useState(false);
  const [quality, setQuality] = useState('default');
  const [format, setFormat] = useState('jpg');
  const [showInfoJson, setShowInfoJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'params' | 'info' | 'code'>('params');

  // Build parameters
  const params = useMemo<ImageApiParams>(() => {
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

    return {
      region: r,
      size: s,
      rotation: rot,
      quality,
      format
    };
  }, [regionMode, sizeMode, regionCoords, sizeVal, rotationDeg, mirrored, upscale, quality, format]);

  const url = isImageService ? `${imageId}/${params.region}/${params.size}/${params.rotation}/${params.quality}.${params.format}` : imageId;
  const infoJsonUrl = isImageService ? `${imageId}/info.json` : null;

  // Build curl command for API testing
  const curlCommand = `curl -X GET "${url}" \\\n  -H "Accept: ${FORMAT_OPTIONS.find(f => f.value === format)?.mime || 'image/jpeg'}"`;

  // Build HTML img tag
  const htmlTag = `<img src="${url}" \\\n  alt="IIIF Image" \\\n  loading="lazy" />`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex overflow-hidden animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        
        {/* Left: Preview */}
        <div className="flex-1 bg-slate-900 relative flex flex-col overflow-hidden">
          {/* Preview Header */}
          <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-black/20 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">IIIF Image API {apiVersion} Preview</span>
              <select 
                value={apiVersion}
                onChange={(e) => setApiVersion(e.target.value as any)}
                className="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white/70 outline-none"
              >
                {IIIF_IMAGE_API_VERSIONS.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInfoJson(!showInfoJson)}
                className={`text-[10px] px-2 py-1 rounded ${showInfoJson ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'}`}
              >
                info.json
              </button>
              <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[9px] text-green-400 font-bold uppercase">Valid</span>
              </div>
            </div>
          </div>
          
          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center p-6 relative group bg-slate-950">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            
            {showInfoJson && infoJsonUrl ? (
              <div className="w-full h-full overflow-auto bg-slate-900 p-4 rounded-lg">
                <div className="text-[10px] text-slate-400 mb-2">{infoJsonUrl}</div>
                <pre className="text-xs text-green-400 font-mono">
                  {JSON.stringify({
                    "@context": IIIF_SPEC.IMAGE_3.CONTEXT,
                    id: imageId,
                    type: "ImageService3",
                    protocol: IIIF_SPEC.IMAGE_3.PROTOCOL,
                    width: canvas.width || 0,
                    height: canvas.height || 0,
                    profile: "level2",
                    extraFeatures: ["regionByPx", "regionByPct", "sizeByWh", "rotationByDegrees", "mirroring"]
                  }, null, 2)}
                </pre>
              </div>
            ) : (
              <img 
                src={url} 
                className="max-w-[90%] max-h-[90%] object-contain shadow-2xl ring-1 ring-white/20 transition-all duration-300 bg-slate-800" 
                style={{ transform: `scaleX(${mirrored ? -1 : 1}) rotate(${rotationDeg}deg)` }}
                onError={(e) => { 
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%231e293b" width="400" height="300"/><text fill="%2394a3b8" x="50%" y="50%" text-anchor="middle" font-family="sans-serif">Invalid Request</text></svg>'; 
                }}
                alt="IIIF Image Preview"
              />
            )}
          </div>

          {/* URL Bar */}
          <div className="p-3 bg-slate-950 text-white font-mono text-xs border-t border-white/10 shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-white/30 truncate max-w-[150px]">{imageId}/</span>
              <span className="text-green-400 font-bold bg-green-400/10 px-1 rounded" title="Region">{params.region}</span>
              <span className="text-white/30">/</span>
              <span className="text-blue-400 font-bold bg-blue-400/10 px-1 rounded" title="Size">{params.size}</span>
              <span className="text-white/30">/</span>
              <span className="text-orange-400 font-bold bg-orange-400/10 px-1 rounded" title="Rotation">{params.rotation}</span>
              <span className="text-white/30">/</span>
              <span className="text-purple-400 font-bold bg-purple-400/10 px-1 rounded" title="Quality">{params.quality}</span>
              <span className="text-white/30">.</span>
              <span className="text-yellow-400 font-bold bg-yellow-400/10 px-1 rounded" title="Format">{params.format}</span>
              <div className="flex-1" />
              <button 
                onClick={() => { navigator.clipboard.writeText(url); showToast("URL copied", "success"); }} 
                className="p-1.5 hover:bg-white/10 rounded transition-all"
                title="Copy URL"
              >
                <Icon name="content_copy" className="text-sm"/>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b">
            {[
              { id: 'params', label: 'Parameters', icon: 'tune' },
              { id: 'code', label: 'Code', icon: 'code' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                  activeTab === t.id 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Icon name={t.icon} className="text-xs" /> {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'params' && (
              <div className="p-4 space-y-6">
                {/* Region Section */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Icon name="crop" className="text-xs"/> Region
                    </label>
                    <select 
                      value={regionMode} 
                      onChange={(e) => setRegionMode(e.target.value as any)} 
                      className="text-xs font-bold border rounded px-2 py-1 bg-slate-50 outline-none"
                    >
                      {REGION_PRESETS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {REGION_PRESETS.find(p => p.value === regionMode)?.desc}
                  </p>
                  {regionMode !== 'full' && regionMode !== 'square' && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'x', label: 'X' },
                        { key: 'y', label: 'Y' },
                        { key: 'w', label: regionMode === 'pct' ? 'W %' : 'Width' },
                        { key: 'h', label: regionMode === 'pct' ? 'H %' : 'Height' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase font-bold">{label}</label>
                          <input 
                            type="number" 
                            value={(regionCoords as any)[key]} 
                            onChange={e => setRegionCoords({...regionCoords, [key]: Number(e.target.value)})} 
                            className="w-full text-xs p-2 border rounded focus:ring-1 focus:ring-green-500 outline-none" 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Size Section */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Icon name="aspect_ratio" className="text-xs"/> Size
                    </label>
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => setUpscale(!upscale)} 
                        className={`text-[9px] font-bold uppercase px-2 py-1 rounded border transition-all ${
                          upscale ? 'bg-blue-600 border-blue-700 text-white' : 'text-slate-400 hover:border-slate-300'
                        }`}
                        title="Allow upscaling beyond original size"
                      >
                        Upscale ^
                      </button>
                      <select 
                        value={sizeMode} 
                        onChange={(e) => setSizeMode(e.target.value as any)} 
                        className="text-xs font-bold border rounded px-2 py-1 bg-slate-50 outline-none"
                      >
                        {SIZE_PRESETS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {SIZE_PRESETS.find(p => p.value === sizeMode)?.desc}
                  </p>
                  {sizeMode === 'pct' ? (
                    <div className="space-y-2">
                      <input 
                        type="range" 
                        min="1" 
                        max="200" 
                        value={sizeVal.pct} 
                        onChange={e => setSizeVal({...sizeVal, pct: Number(e.target.value)})} 
                        className="w-full accent-blue-500" 
                      />
                      <div className="text-center text-xs font-mono text-blue-600">{sizeVal.pct}%</div>
                    </div>
                  ) : sizeMode !== 'max' && (
                    <div className="grid grid-cols-2 gap-2">
                      {sizeMode !== 'h' && (
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase font-bold">Width</label>
                          <input 
                            type="number" 
                            value={sizeVal.w} 
                            onChange={e => setSizeVal({...sizeVal, w: Number(e.target.value)})} 
                            className="p-2 border rounded text-xs" 
                          />
                        </div>
                      )}
                      {sizeMode !== 'w' && (
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase font-bold">Height</label>
                          <input 
                            type="number" 
                            value={sizeVal.h} 
                            onChange={e => setSizeVal({...sizeVal, h: Number(e.target.value)})} 
                            className="p-2 border rounded text-xs" 
                          />
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Rotation Section */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Icon name="rotate_right" className="text-xs"/> Rotation
                    </label>
                    <button 
                      onClick={() => setMirrored(!mirrored)} 
                      className={`p-1.5 rounded border transition-all ${
                        mirrored ? 'bg-orange-500 border-orange-600 text-white' : 'text-slate-400 hover:border-slate-300'
                      }`}
                      title="Mirror horizontally"
                    >
                      <Icon name="flip" className="text-sm"/>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 90, 180, 270].map(d => (
                      <button 
                        key={d} 
                        onClick={() => setRotationDeg(d)} 
                        className={`py-2 text-xs font-bold border rounded ${
                          rotationDeg === d ? 'bg-orange-50 border-orange-500 text-orange-700' : 'hover:bg-slate-50'
                        }`}
                      >
                        {d}°
                      </button>
                    ))}
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="359" 
                    value={rotationDeg} 
                    onChange={e => setRotationDeg(Number(e.target.value))} 
                    className="w-full accent-orange-500" 
                  />
                </section>

                {/* Quality & Format */}
                <section className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Icon name="high_quality" className="text-xs"/> Quality
                    </label>
                    <select 
                      value={quality} 
                      onChange={e => setQuality(e.target.value)} 
                      className="w-full text-xs p-2 border rounded font-bold"
                    >
                      {QUALITY_OPTIONS.map(q => (
                        <option key={q.value} value={q.value}>{q.label}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400">
                      {QUALITY_OPTIONS.find(q => q.value === quality)?.desc}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Icon name="image" className="text-xs"/> Format
                    </label>
                    <select 
                      value={format} 
                      onChange={e => setFormat(e.target.value)} 
                      className="w-full text-xs p-2 border rounded font-bold"
                    >
                      {FORMAT_OPTIONS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400">
                      {FORMAT_OPTIONS.find(f => f.value === format)?.desc}
                    </p>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">cURL</label>
                  <pre className="bg-slate-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto font-mono">
                    {curlCommand}
                  </pre>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(curlCommand); showToast("cURL copied", "success"); }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                  >
                    Copy cURL
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">HTML</label>
                  <pre className="bg-slate-900 text-blue-400 text-xs p-3 rounded-lg overflow-x-auto font-mono">
                    {htmlTag}
                  </pre>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(htmlTag); showToast("HTML copied", "success"); }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                  >
                    Copy HTML
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">IIIF Info URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={infoJsonUrl || 'N/A'} 
                      readOnly
                      className="flex-1 text-xs p-2 border rounded bg-slate-50 font-mono"
                    />
                    {infoJsonUrl && (
                      <button 
                        onClick={() => { navigator.clipboard.writeText(infoJsonUrl); showToast("Info URL copied", "success"); }}
                        className="px-3 py-2 bg-slate-800 text-white rounded text-xs font-bold"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t space-y-2">
            <button 
              onClick={() => {
                if (onApply) onApply(url);
                onClose();
              }} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold shadow-md transition-all"
            >
              Apply to Canvas
            </button>
            <button 
              onClick={() => {
                // Reset to defaults
                setRegionMode('full');
                setSizeMode('max');
                setRotationDeg(0);
                setMirrored(false);
                setUpscale(false);
                setQuality('default');
                setFormat('jpg');
              }}
              className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 rounded-lg font-bold text-sm transition-all"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
