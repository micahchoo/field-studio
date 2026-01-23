
import React, { useState } from 'react';
import { IIIFItem, IIIFCanvas, AppSettings, IIIFManifest, getIIIFValue } from '../types';
import { Icon } from './Icon';
import { MuseumLabel } from './MuseumLabel';
import { ShareButton } from './ShareButton';
import { RESOURCE_TYPE_CONFIG } from '../constants';

interface InspectorProps {
  resource: IIIFItem | null;
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  settings: AppSettings;
  visible: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

const IIIF_SPECS: Record<string, { 
    desc: string, 
    implication: string,
}> = {
  'Collection': {
    desc: 'The master container for multiple research units. It groups Manifests into a cohesive archive.',
    implication: 'Treats nested items as part of a curated series. This level cannot have its own visual pixels, only child links.'
  },
  'Manifest': {
    desc: 'The primary unit of description. Represents a single physical artifact, document, or field notebook.',
    implication: 'The "Atomic" unit of research. All internal views are considered parts of ONE cohesive physical object.'
  },
  'Canvas': {
    desc: 'A virtual workspace where media is pinned. It defines the coordinates for all your scholarly notes.',
    implication: 'Pins media to a specific coordinate grid. Annotations created here are forever linked to these pixel addresses.'
  },
  'Range': {
    desc: 'A structural division within a manifest, like a chapter or section.',
    implication: 'Provides navigation structure for long or complex objects.'
  }
};

export const Inspector: React.FC<InspectorProps> = ({ resource, onUpdateResource, settings, visible, onClose, isMobile }) => {
  const [tab, setTab] = useState<'metadata' | 'learn'>('metadata');
  const [showAddMenu, setShowAddMenu] = useState(false);

  if (!visible || !resource) return null;

  const config = RESOURCE_TYPE_CONFIG[resource.type] || RESOURCE_TYPE_CONFIG['Content'];
  const spec = IIIF_SPECS[resource.type];
  
  const label = getIIIFValue(resource.label, settings.language) || '';
  const summary = getIIIFValue(resource.summary, settings.language) || '';

  const getPreviewUrl = (node: any): string | undefined => {
      if (node.thumbnail?.[0]?.id) return node.thumbnail[0].id;
      if (node.type === 'Canvas') {
          return node.items?.[0]?.items?.[0]?.body?.id || node._blobUrl;
      }
      if (node.type === 'Manifest' && node.items?.[0]) {
          return getPreviewUrl(node.items[0]);
      }
      return node._blobUrl;
  };

  const imageUrl = getPreviewUrl(resource);

  const handleUpdateMetadataField = (index: number, key: string, val: string) => {
      const newMeta = [...(resource.metadata || [])];
      newMeta[index] = { 
          label: { [settings.language]: [key] }, 
          value: { [settings.language]: [val] } 
      };
      onUpdateResource({ metadata: newMeta });
  };

  const handleAddMetadataField = (labelStr: string) => {
      const newMeta = [...(resource.metadata || []), { label: { [settings.language]: [labelStr] }, value: { [settings.language]: [''] } }];
      onUpdateResource({ metadata: newMeta });
      setShowAddMenu(false);
  };

  const handleRemoveMetadataField = (index: number) => {
      const newMeta = resource.metadata?.filter((_, i) => i !== index);
      onUpdateResource({ metadata: newMeta });
  };

  const inspectorStyles = isMobile 
    ? `fixed inset-0 z-[1100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300`
    : `w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-30 animate-in slide-in-from-right-2 duration-300 shrink-0`;

  return (
    <aside className={inspectorStyles}>
        {/* Fixed Header */}
        <div className={`h-14 flex items-center justify-between px-4 border-b shrink-0 ${settings.fieldMode ? 'bg-black text-white border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
             <div className="flex items-center gap-2">
                <Icon name={config.icon} className={`${config.colorClass} text-sm`}/>
                <span className={`text-xs font-black uppercase tracking-widest ${settings.fieldMode ? 'text-yellow-400' : config.colorClass}`}>Inspector</span>
             </div>
             <div className="flex items-center gap-2">
                <ShareButton item={resource} fieldMode={settings.fieldMode} />
                <button onClick={onClose} className={`p-2 rounded-lg ${settings.fieldMode ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}><Icon name="close"/></button>
             </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b shrink-0 ${settings.fieldMode ? 'bg-black border-slate-800' : 'bg-white'}`}>
            {['metadata', 'learn'].map(t => (
                <button key={t} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? (settings.fieldMode ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-iiif-blue border-b-2 border-iiif-blue bg-blue-50/20') : 'text-slate-400 hover:text-slate-600'}`} onClick={() => setTab(t as any)}>{t}</button>
            ))}
        </div>

      {/* Scrollable Content */}
      <div className={`flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar min-h-0 ${settings.fieldMode ? 'bg-black' : 'bg-white'}`}>
        {tab === 'metadata' && (
            <div className="space-y-6">
                {imageUrl && (
                    <div className={`aspect-video rounded-xl overflow-hidden border shadow-inner relative group ring-1 shrink-0 ${settings.fieldMode ? 'bg-slate-900 border-slate-800 ring-slate-800' : 'bg-slate-900 border-slate-200 ring-slate-100'}`}>
                        <img src={imageUrl} className="w-full h-full object-contain" alt="Preview" />
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className={`block text-[10px] font-black mb-1 uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Archival Label</label>
                        <input 
                            type="text" 
                            value={label} 
                            onChange={e => onUpdateResource({ label: { [settings.language]: [e.target.value] } })} 
                            className={`w-full text-sm p-4 rounded-lg outline-none font-bold shadow-sm border ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800 focus:border-yellow-400' : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-iiif-blue'}`} 
                        />
                    </div>

                    <div>
                        <label className={`block text-[10px] font-black mb-1 uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Scientific Summary</label>
                        <textarea 
                            value={summary} 
                            onChange={e => onUpdateResource({ summary: { [settings.language]: [e.target.value] } })} 
                            className={`w-full text-sm p-4 rounded-lg outline-none min-h-[100px] leading-relaxed shadow-sm border ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800 focus:border-yellow-400' : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-iiif-blue'}`} 
                            placeholder="Describe context..."
                        />
                    </div>

                    <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Field Metadata</label>
                            <div className="relative">
                                <button 
                                    onClick={() => setShowAddMenu(!showAddMenu)} 
                                    className={`text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1 ${settings.fieldMode ? 'text-yellow-400' : 'text-iiif-blue'}`}
                                >
                                    Add Field <Icon name="expand_more" className="text-[10px]"/>
                                </button>
                                {showAddMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-2 z-50 min-w-[140px] max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {settings.metadataTemplate.map(prop => (
                                            <button key={prop} onClick={() => handleAddMetadataField(prop)} className="w-full px-4 py-1.5 text-left text-[10px] font-bold text-slate-600 hover:bg-blue-50 transition-colors">{prop}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {(resource.metadata || []).map((md, idx) => {
                                const mKey = getIIIFValue(md.label, settings.language);
                                const mVal = getIIIFValue(md.value, settings.language);
                                return (
                                    <div key={idx} className={`group relative p-3 rounded-lg border transition-colors shadow-sm ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                        <input 
                                            className={`w-full text-[10px] font-black uppercase bg-transparent outline-none mb-1 border-b ${settings.fieldMode ? 'text-slate-500 border-slate-800 focus:border-slate-700' : 'text-slate-500 border-transparent focus:border-slate-200'}`}
                                            value={mKey}
                                            onChange={e => handleUpdateMetadataField(idx, e.target.value, mVal)}
                                        />
                                        <input 
                                            className={`w-full text-xs font-bold bg-transparent outline-none ${settings.fieldMode ? 'text-white' : 'text-slate-800'}`}
                                            value={mVal}
                                            onChange={e => handleUpdateMetadataField(idx, mKey, e.target.value)}
                                        />
                                        <button 
                                            onClick={() => handleRemoveMetadataField(idx)}
                                            className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Icon name="close" className="text-xs"/>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {tab === 'learn' && spec && (
            <div className="space-y-4 animate-in fade-in duration-300">
                <div className={`border p-5 rounded-2xl ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : `${config.bgClass} ${config.borderClass.replace('200','300')}`}`}>
                    <h3 className={`text-sm font-black uppercase mb-2 flex items-center gap-2 ${settings.fieldMode ? 'text-yellow-400' : config.colorClass}`}>
                        <Icon name={config.icon} className="text-xs" /> {resource.type} Model
                    </h3>
                    <div className={`items-center gap-3 p-3 rounded-xl mb-4 shadow-sm flex ${settings.fieldMode ? 'bg-black/50 border border-slate-800' : 'bg-white/80 backdrop-blur-sm border border-blue-100/50'}`}>
                        <Icon name="psychology" className={settings.fieldMode ? 'text-yellow-400' : config.colorClass} />
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Archival Metaphor</p>
                            <p className={`text-xs font-bold ${settings.fieldMode ? 'text-white' : 'text-slate-700'}`}>{config.metaphor}</p>
                        </div>
                    </div>
                    <p className={`text-xs leading-relaxed font-medium mb-4 ${settings.fieldMode ? 'text-slate-400' : 'text-slate-600'}`}>{spec.desc}</p>
                </div>
                <MuseumLabel title="Archival Implication" type={settings.fieldMode ? 'spec' : 'exhibit'}>
                    {spec.implication}
                </MuseumLabel>
            </div>
        )}
      </div>
    </aside>
  );
};
