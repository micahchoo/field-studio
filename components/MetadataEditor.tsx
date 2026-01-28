
import React, { useState, useEffect, useRef } from 'react';
import { IIIFItem, IIIFAnnotation, IIIFCanvas, AppSettings, getIIIFValue, isManifest, isCollection } from '../types';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { RIGHTS_OPTIONS, VIEWING_DIRECTIONS, DUBLIN_CORE_MAP, BEHAVIOR_OPTIONS, BEHAVIOR_DEFINITIONS, BEHAVIOR_CONFLICTS, getConflictingBehaviors, DEFAULT_MAP_CONFIG } from '../constants';

declare const L: any;

interface MetadataEditorProps {
  resource: IIIFItem | null;
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  settings: AppSettings;
  visible?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ resource, onUpdateResource, settings }) => {
  const { showToast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<'metadata' | 'technical' | 'annotations'>('metadata');
  const [showLocationPicker, setShowLocationPicker] = useState<{index: number, value: string} | null>(null);

  if (!resource) {
    return (
        <div className="w-80 bg-white border-l border-slate-200 p-8 flex flex-col items-center justify-center text-slate-400">
            <Icon name="info" className="text-4xl mb-2"/>
            <p className="text-sm text-center">Select an item to view properties</p>
        </div>
    );
  }

  const label = getIIIFValue(resource.label, settings.language) || getIIIFValue(resource.label, 'none') || '';
  const summary = getIIIFValue(resource.summary, settings.language) || '';
  const inputClass = "w-full text-sm p-2.5 border border-slate-300 rounded bg-white text-slate-900 focus:ring-2 focus:ring-iiif-blue focus:border-iiif-blue outline-none transition-all";

  const getDCHint = (lbl: string) => {
      const lower = lbl.toLowerCase();
      const match = Object.keys(DUBLIN_CORE_MAP).find(k => k.toLowerCase() === lower);
      return match ? DUBLIN_CORE_MAP[match] : null;
  };

  const isLocationField = (lbl: string) => {
      const lower = lbl.toLowerCase();
      return lower === 'location' || lower === 'gps' || lower === 'coverage' || lower === 'coordinates';
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-30">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${tab === 'metadata' ? 'text-iiif-blue border-b-2 border-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setTab('metadata')}
            >
                Metadata
            </button>
            <button 
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${tab === 'technical' ? 'text-iiif-blue border-b-2 border-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setTab('technical')}
            >
                Technical
            </button>
            <button 
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${tab === 'annotations' ? 'text-iiif-blue border-b-2 border-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setTab('annotations')}
            >
                Annotations
            </button>
        </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {tab === 'metadata' && (
            <>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Type</span>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{resource.type}</span>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                        Label <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-1 rounded">dc:title</span>
                    </label>
                    <input 
                        type="text" 
                        value={label}
                        onChange={e => onUpdateResource({ label: { [settings.language]: [e.target.value] } })}
                        className={inputClass}
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">Summary</label>
                    </div>
                    <textarea 
                        rows={5}
                        value={summary}
                        onChange={e => onUpdateResource({ summary: { [settings.language]: [e.target.value] } })}
                        className={`${inputClass} resize-none`}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Descriptive Metadata</label>
                    <div className="space-y-3">
                        {(resource.metadata || []).map((md, idx) => {
                            const lbl = getIIIFValue(md.label, settings.language);
                            const val = getIIIFValue(md.value, settings.language);
                            const dc = getDCHint(lbl);
                            const isLoc = isLocationField(lbl);

                            return (
                                <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 group hover:border-slate-300 transition-colors">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                className="text-xs font-bold text-slate-700 bg-transparent border-b border-transparent focus:border-blue-300 outline-none w-24"
                                                value={lbl}
                                                onChange={(e) => {
                                                    const newMeta = [...(resource.metadata || [])];
                                                    newMeta[idx].label = { [settings.language]: [e.target.value] };
                                                    onUpdateResource({ metadata: newMeta });
                                                }}
                                            />
                                            {dc && <span className="text-[8px] font-mono text-white bg-slate-400 px-1 rounded opacity-70" title="Dublin Core Mapping">{dc}</span>}
                                        </div>
                                        <button onClick={() => {
                                            const newMeta = resource.metadata?.filter((_, i) => i !== idx);
                                            onUpdateResource({ metadata: newMeta });
                                        }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="close" className="text-xs"/></button>
                                    </div>
                                    <div className="flex gap-1">
                                        <input 
                                            className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:border-blue-400 outline-none"
                                            value={val}
                                            onChange={(e) => {
                                                const newMeta = [...(resource.metadata || [])];
                                                newMeta[idx].value = { [settings.language]: [e.target.value] };
                                                onUpdateResource({ metadata: newMeta });
                                            }}
                                        />
                                        {isLoc && (
                                            <button 
                                                onClick={() => setShowLocationPicker({ index: idx, value: val })}
                                                className="bg-green-100 hover:bg-green-200 text-green-700 p-1.5 rounded border border-green-200"
                                                title="Pick Location on Map"
                                            >
                                                <Icon name="location_on" className="text-sm"/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <button 
                            onClick={() => {
                                onUpdateResource({ metadata: [...(resource.metadata || []), { label: { [settings.language]: ["New Field"] }, value: { [settings.language]: [""] } }] });
                            }}
                            className="w-full py-2 border border-dashed border-slate-300 rounded text-xs text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-1"
                        >
                            <Icon name="add" className="text-sm"/> Add Field
                        </button>
                    </div>
                </div>
            </>
        )}

        {tab === 'technical' && (
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                        Navigation Date <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-1 rounded">navDate</span>
                    </label>
                    <input 
                        type="datetime-local" 
                        value={resource.navDate ? resource.navDate.slice(0, 16) : ''}
                        onChange={e => onUpdateResource({ navDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                        className={inputClass}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Used for Timeline views.</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                        Rights Statement <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-1 rounded">dc:rights</span>
                    </label>
                    <select 
                        value={resource.rights || ''}
                        onChange={e => onUpdateResource({ rights: e.target.value })}
                        className={inputClass}
                    >
                        <option value="">(None Selected)</option>
                        {RIGHTS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {(isManifest(resource) || isCollection(resource)) && (
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                            Viewing Direction <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-1 rounded">viewingDirection</span>
                        </label>
                        <select 
                            value={resource.viewingDirection || 'left-to-right'}
                            onChange={e => onUpdateResource({ viewingDirection: e.target.value as any })}
                            className={inputClass}
                        >
                            {VIEWING_DIRECTIONS.map(dir => (
                                <option key={dir} value={dir}>{dir}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 flex justify-between">
                        Behaviors <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-1 rounded">behavior</span>
                    </label>
                    <div className="space-y-1.5">
                        {(BEHAVIOR_OPTIONS[resource.type as keyof typeof BEHAVIOR_OPTIONS] || []).map(b => {
                            const def = BEHAVIOR_DEFINITIONS[b];
                            const currentBehaviors = resource.behavior || [];
                            const isChecked = currentBehaviors.includes(b);
                            const conflicts = getConflictingBehaviors(b);
                            const hasConflict = conflicts.some(c => currentBehaviors.includes(c));
                            const conflictingWith = conflicts.filter(c => currentBehaviors.includes(c));

                            return (
                                <label
                                    key={b}
                                    className={`flex items-start gap-2 text-xs cursor-pointer p-2.5 rounded-lg border transition-all ${
                                        hasConflict && isChecked
                                            ? 'border-red-300 bg-red-50'
                                            : isChecked
                                                ? 'border-blue-200 bg-blue-50'
                                                : 'border-slate-100 hover:bg-slate-50'
                                    }`}
                                    title={def?.description || b}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={e => {
                                            const current = new Set(currentBehaviors);
                                            if (e.target.checked) {
                                                current.add(b);
                                                // Auto-remove conflicting behaviors
                                                conflicts.forEach(c => current.delete(c));
                                            } else {
                                                current.delete(b);
                                            }
                                            onUpdateResource({ behavior: Array.from(current) });
                                        }}
                                        className="rounded text-iiif-blue mt-0.5 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-semibold ${hasConflict && isChecked ? 'text-red-700' : 'text-slate-700'}`}>
                                                {def?.label || b}
                                            </span>
                                            {def?.category && (
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                                    def.category === 'time' ? 'bg-purple-100 text-purple-600' :
                                                    def.category === 'layout' ? 'bg-amber-100 text-amber-600' :
                                                    def.category === 'browsing' ? 'bg-emerald-100 text-emerald-600' :
                                                    def.category === 'page' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {def.category}
                                                </span>
                                            )}
                                        </div>
                                        {def?.description && (
                                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{def.description}</p>
                                        )}
                                        {hasConflict && isChecked && (
                                            <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                                                <Icon name="warning" className="text-xs"/> Conflicts with: {conflictingWith.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                    {(resource.behavior || []).length > 0 && (
                        <div className="mt-3 p-2 bg-slate-50 rounded border border-slate-100">
                            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Active Behaviors</div>
                            <div className="flex flex-wrap gap-1">
                                {(resource.behavior || []).map(b => (
                                    <span key={b} className="text-[10px] bg-iiif-blue text-white px-2 py-0.5 rounded-full font-semibold">
                                        {BEHAVIOR_DEFINITIONS[b]?.label || b}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {tab === 'annotations' && (
            <div className="text-center py-10">
                <Icon name="comments_disabled" className="text-4xl text-slate-300 mb-2"/>
                <p className="text-xs text-slate-500">No annotations yet.</p>
                <button className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded hover:bg-slate-200">
                    Add Annotation
                </button>
            </div>
        )}
      </div>

      {showLocationPicker && (
          <LocationModal 
            initialValue={showLocationPicker.value}
            onSave={(val) => {
                const newMeta = [...(resource.metadata || [])];
                newMeta[showLocationPicker.index].value = { [settings.language]: [val] };
                onUpdateResource({ metadata: newMeta });
                setShowLocationPicker(null);
            }}
            onClose={() => setShowLocationPicker(null)}
          />
      )}
    </div>
  );
};

const LocationModal: React.FC<{ initialValue: string, onSave: (val: string) => void, onClose: () => void }> = ({ initialValue, onSave, onClose }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);

    useEffect(() => {
        // Parse initial
        const match = initialValue.match(/(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)/);
        let initLat = 20, initLng = 0, zoom = 2;
        
        if (match) {
            initLat = parseFloat(match[1]);
            initLng = parseFloat(match[2]);
            zoom = 10;
            setCoords({ lat: initLat, lng: initLng });
        }

        if (mapRef.current && typeof L !== 'undefined') {
            const map = L.map(mapRef.current).setView([initLat, initLng], zoom);
            L.tileLayer(DEFAULT_MAP_CONFIG.tileLayer, { attribution: DEFAULT_MAP_CONFIG.attribution }).addTo(map);
            
            const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
            
            if (!match) map.locate({ setView: true, maxZoom: 10 });

            map.on('click', (e: any) => {
                marker.setLatLng(e.latlng);
                setCoords(e.latlng);
            });

            marker.on('dragend', (e: any) => {
                setCoords(marker.getLatLng());
            });

            return () => map.remove();
        }
    }, []);

    return (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[500px]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Icon name="location_on" className="text-green-600"/> Pick Location</h3>
                    <button onClick={onClose}><Icon name="close" className="text-slate-400"/></button>
                </div>
                <div className="flex-1 relative bg-slate-100">
                    <div ref={mapRef} className="absolute inset-0" />
                </div>
                <div className="p-4 border-t flex justify-between items-center bg-white">
                    <div className="text-xs font-mono bg-slate-100 px-3 py-1.5 rounded border">
                        {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'Click map to select'}
                    </div>
                    <button 
                        disabled={!coords}
                        onClick={() => coords && onSave(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`)}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-xs disabled:opacity-50 hover:bg-green-700"
                    >
                        Confirm Location
                    </button>
                </div>
            </div>
        </div>
    );
};
