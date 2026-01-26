
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IIIFItem, IIIFCanvas, AppSettings, IIIFManifest, getIIIFValue } from '../types';
import { Icon } from './Icon';
import { MuseumLabel } from './MuseumLabel';
import { ShareButton } from './ShareButton';
import { ProvenancePanel } from './ProvenancePanel';
import { GeoEditor } from './GeoEditor';
import { RESOURCE_TYPE_CONFIG, isFieldVisible, getFieldsByCategory } from '../constants';
import {
  isPropertyAllowed,
  getPropertyRequirement,
  getAllowedBehaviors,
  VIEWING_DIRECTIONS,
  canHaveViewingDirection,
  getAllowedProperties,
  PROPERTY_MATRIX,
  validateResourceFull
} from '../utils/iiifSchema';
import { suggestBehaviors } from '../utils/iiifBehaviors';
import { resolvePreviewUrl } from '../utils/imageSourceResolver';

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

const DebouncedInput = ({ value, onChange, ...props }: any) => {
  const [innerValue, setInnerValue] = useState(value ?? '');
  const onChangeRef = useRef<(val: string) => void>(onChange);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef<boolean>(false);

  // Keep onChange ref current without triggering effects
  onChangeRef.current = onChange;

  // Sync from external prop changes only when not actively typing
  useEffect(() => {
    if (!isTyping.current) {
      setInnerValue(value ?? '');
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    isTyping.current = true;
    setInnerValue(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(newVal);
      isTyping.current = false;
    }, 300);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return <input {...props} value={innerValue} onChange={handleChange} />;
};

const DebouncedTextarea = ({ value, onChange, ...props }: any) => {
  const [innerValue, setInnerValue] = useState(value ?? '');
  const onChangeRef = useRef<(val: string) => void>(onChange);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef<boolean>(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!isTyping.current) {
      setInnerValue(value ?? '');
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    isTyping.current = true;
    setInnerValue(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(newVal);
      isTyping.current = false;
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return <textarea {...props} value={innerValue} onChange={handleChange} />;
};

export const Inspector: React.FC<InspectorProps> = ({ resource, onUpdateResource, settings, visible, onClose, isMobile }) => {
  // Persist tab state per resource type in localStorage
  const getStoredTab = (resourceType: string): 'metadata' | 'provenance' | 'geo' | 'learn' | 'structure' => {
    try {
      const stored = localStorage.getItem(`inspector-tab-${resourceType}`);
      if (stored && ['metadata', 'provenance', 'geo', 'learn', 'structure'].includes(stored)) {
        return stored as 'metadata' | 'provenance' | 'geo' | 'learn' | 'structure';
      }
    } catch (e) {
      // localStorage may be unavailable
    }
    return 'metadata';
  };

  const [tab, setTab] = useState<'metadata' | 'provenance' | 'geo' | 'learn' | 'structure'>(() =>
    resource ? getStoredTab(resource.type) : 'metadata'
  );
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [validation, setValidation] = useState<{valid: boolean, errors: string[], warnings: string[]} | null>(null);

  // Run validation when resource changes
  useEffect(() => {
    if (resource) {
      setValidation(validateResourceFull(resource));
    } else {
      setValidation(null);
    }
  }, [resource]);

  // Restore tab when resource type changes
  useEffect(() => {
    if (resource?.type) {
      setTab(getStoredTab(resource.type));
    }
  }, [resource?.type]);

  // Persist tab when it changes
  useEffect(() => {
    if (resource?.type && tab) {
      try {
        localStorage.setItem(`inspector-tab-${resource.type}`, tab);
      } catch (e) {
        // localStorage may be unavailable
      }
    }
  }, [tab, resource?.type]);

  if (!visible || !resource) return null;

  const config = RESOURCE_TYPE_CONFIG[resource.type] || RESOURCE_TYPE_CONFIG['Content'];
  const spec = IIIF_SPECS[resource.type];

  // Helper to check if a field is allowed by the schema for this resource type
  const isAllowed = (field: string) => isPropertyAllowed(resource.type, field);

  const handleSuggestBehaviors = () => {
    if (!resource) return;
    
    // Determine characteristics
    const characteristics = {
      hasDuration: !!(resource as any).duration,
      hasPageSequence: resource.type === 'Manifest' && (resource as IIIFManifest).items?.length > 1,
      hasWidth: !!(resource as any).width,
      hasHeight: !!(resource as any).height,
    };

    const suggestions = suggestBehaviors(resource.type, characteristics);
    if (suggestions.length > 0) {
      onUpdateResource({ behavior: Array.from(new Set([...(resource.behavior || []), ...suggestions])) });
    }
  };
  
  const label = getIIIFValue(resource.label, settings.language) || '';
  const summary = getIIIFValue(resource.summary, settings.language) || '';

  // Use unified image source resolution
  const imageUrl = resolvePreviewUrl(resource, 400);

  const handleUpdateMetadataField = (index: number, key: string, val: string) => {
      const newMeta = [...(resource.metadata || [])];
      newMeta[index] = { 
          label: { [settings.language]: [key] }, 
          value: { [settings.language]: [val] } 
      };
      onUpdateResource({ metadata: newMeta });
  };

  const handleAddMetadataField = (labelStr: string) => {
      const propName = labelStr.charAt(0).toLowerCase() + labelStr.slice(1);
      
      // Handle special properties that are first-class fields in IIIFItem
      if (propName === 'rights' || propName === 'navDate' || propName === 'behavior' || propName === 'viewingDirection' || propName === 'requiredStatement' || propName === 'navPlace') {
          // These are already handled by the UI if they are not undefined
          if (propName === 'navPlace') {
              onUpdateResource({ navPlace: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} } } as any);
          } else {
              // Trigger visibility of standard fields
              onUpdateResource({ [propName]: propName === 'behavior' ? [] : '' });
          }
      } else {
          // Generic metadata
          const newMeta = [...(resource.metadata || []), { label: { [settings.language]: [labelStr] }, value: { [settings.language]: [''] } }];
          onUpdateResource({ metadata: newMeta });
      }
      setShowAddMenu(false);
  };

  const handleRemoveMetadataField = (index: number) => {
      const newMeta = resource.metadata?.filter((_, i) => i !== index);
      onUpdateResource({ metadata: newMeta });
  };

  const inspectorStyles = isMobile 
    ? `fixed inset-0 z-[1100] bg-white flex flex-col animate-slide-in-right`
    : `w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-30 animate-slide-in-right shrink-0`;

  return (
    <aside className={inspectorStyles} aria-label="Resource Inspector">
        {/* Fixed Header */}
        <div className={`h-14 flex items-center justify-between px-4 border-b shrink-0 ${settings.fieldMode ? 'bg-black text-white border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
             <div className="flex items-center gap-2">
                <Icon name={config.icon} className={`${config.colorClass} text-sm`}/>
                <span className={`text-xs font-black uppercase tracking-widest ${settings.fieldMode ? 'text-yellow-400' : config.colorClass}`}>Inspector</span>
             </div>
             <div className="flex items-center gap-2">
                <ShareButton item={resource} fieldMode={settings.fieldMode} />
                <button 
                    aria-label="Close Inspector"
                    onClick={onClose} 
                    className={`p-2 rounded-lg ${settings.fieldMode ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}
                >
                    <Icon name="close"/>
                </button>
             </div>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Inspector tabs" className={`flex border-b shrink-0 ${settings.fieldMode ? 'bg-black border-slate-800' : 'bg-white'}`}>
            {['metadata', 'structure', 'provenance', 'geo', 'learn'].filter(t => t !== 'structure' || (resource?.type === 'Manifest')).map(t => (
                <button
                  key={t}
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? (settings.fieldMode ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-iiif-blue border-b-2 border-iiif-blue bg-blue-50/20') : 'text-slate-400 hover:text-slate-600'}`}
                  onClick={() => setTab(t as any)}
                  aria-selected={tab === t}
                  role="tab"
                  aria-controls={`inspector-tab-${t}`}
                  id={`tab-${t}`}
                >
                  {t === 'provenance' ? 'History' : t === 'geo' ? 'Location' : t}
                </button>
            ))}
        </div>

      {/* Scrollable Content */}
      <div className={`flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar min-h-0 ${settings.fieldMode ? 'bg-black' : 'bg-white'}`}>
        {tab === 'metadata' && (
            <div role="tabpanel" id="inspector-tab-metadata" aria-labelledby="tab-metadata" className="space-y-6">
                {/* Validation Status */}
                {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
                    <div className={`p-3 rounded-lg border text-[10px] space-y-2 ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-center gap-2 font-black uppercase tracking-widest text-orange-600">
                            <Icon name="report_problem" className="text-sm" />
                            <span>Spec Validation</span>
                        </div>
                        {validation.errors.map((err, i) => (
                            <div key={`err-${i}`} className="flex gap-2 text-red-500 font-bold">
                                <span>•</span>
                                <span>{err}</span>
                            </div>
                        ))}
                        {validation.warnings.map((warn, i) => (
                            <div key={`warn-${i}`} className={`flex gap-2 font-bold ${settings.fieldMode ? 'text-slate-400' : 'text-orange-700'}`}>
                                <span>•</span>
                                <span>{warn}</span>
                            </div>
                        ))}
                    </div>
                )}

                {imageUrl && (
                    <div className={`aspect-video rounded-xl overflow-hidden border shadow-inner relative group ring-1 shrink-0 ${settings.fieldMode ? 'bg-slate-900 border-slate-800 ring-slate-800' : 'bg-slate-900 border-slate-200 ring-slate-100'}`}>
                        <img src={imageUrl} className="w-full h-full object-contain" alt="Preview" />
                    </div>
                )}

                <div className="space-y-4">
                    <div className="snappy-transition focus-within:scale-[1.01]">
                        <label htmlFor="archival-label" className={`block text-[10px] font-black mb-1 uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Archival Label</label>
                        <DebouncedInput 
                            id="archival-label"
                            type="text" 
                            value={label} 
                            onChange={(val: string) => onUpdateResource({ label: { [settings.language]: [val] } })} 
                            className={`w-full text-sm p-4 rounded-lg outline-none font-bold shadow-sm border snappy-transition ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800 focus:border-yellow-400' : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-iiif-blue'}`} 
                        />
                    </div>

                    <div className="snappy-transition focus-within:scale-[1.01]">
                        <label htmlFor="scientific-summary" className={`block text-[10px] font-black mb-1 uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Scientific Summary</label>
                        <DebouncedTextarea 
                            id="scientific-summary"
                            value={summary} 
                            onChange={(val: string) => onUpdateResource({ summary: { [settings.language]: [val] } })} 
                            className={`w-full text-sm p-4 rounded-lg outline-none min-h-[100px] leading-relaxed shadow-sm border snappy-transition ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800 focus:border-yellow-400' : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-iiif-blue'}`} 
                            placeholder="Describe context..."
                        />
                    </div>

                    {/* Integrated Geospatial Editor */}
                    {(resource as any).navPlace && (
                        <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                             <div className="flex justify-between items-center mb-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Geospatial Location</label>
                                <button 
                                    onClick={() => onUpdateResource({ navPlace: undefined } as any)}
                                    className="text-[10px] text-red-400 hover:text-red-600 uppercase font-black"
                                >
                                    Remove
                                </button>
                             </div>
                             <div className={`border rounded-lg overflow-hidden ${settings.fieldMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                <GeoEditor
                                    item={resource}
                                    onChange={(navPlace) => onUpdateResource({ navPlace } as any)}
                                    height={200}
                                    editable={true}
                                />
                            </div>
                        </div>
                    )}

                    <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div className="flex justify-between items-center mb-3">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Field Metadata</label>
                            <div className="relative">
                                <button 
                                    aria-label="Add metadata field"
                                    aria-haspopup="true"
                                    aria-expanded={showAddMenu}
                                    onClick={() => setShowAddMenu(!showAddMenu)} 
                                    className={`text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1 ${settings.fieldMode ? 'text-yellow-400' : 'text-iiif-blue'}`}
                                >
                                    Add Field <Icon name="expand_more" className="text-[10px]"/>
                                </button>
                                {showAddMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-2 z-50 min-w-[180px] max-h-[300px] overflow-y-auto custom-scrollbar animate-in zoom-in-95">
                                        {/* Dynamic suggestions from Spec */}
                                        <div className="px-4 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b mb-1">Spec Properties</div>
                                        {getAllowedProperties(resource.type)
                                            .filter(p => !['id', 'type', 'items', 'annotations', 'structures', 'label', 'summary', 'metadata'].includes(p))
                                            .map(p => (
                                            <button 
                                                key={p} 
                                                onClick={() => handleAddMetadataField(p.charAt(0).toUpperCase() + p.slice(1))} 
                                                className="w-full px-4 py-1.5 text-left text-[10px] font-bold text-slate-600 hover:bg-blue-50 transition-colors flex justify-between items-center group"
                                            >
                                                <span>{p}</span>
                                                <span className="text-[7px] opacity-0 group-hover:opacity-50 font-mono italic">{getPropertyRequirement(resource.type, p).toLowerCase()}</span>
                                            </button>
                                        ))}
                                        <div className="px-4 py-1 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b mt-2 mb-1">Templates</div>
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
                                    <div key={idx} className={`group relative p-3 rounded-lg border snappy-transition shadow-sm focus-within:scale-[1.02] ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'}`}>
                                        <DebouncedInput 
                                            aria-label={`Field name for index ${idx + 1}`}
                                            className={`w-full text-[10px] font-black uppercase bg-transparent outline-none mb-1 border-b ${settings.fieldMode ? 'text-slate-500 border-slate-800 focus:border-slate-700' : 'text-slate-500 border-transparent focus:border-slate-200'}`}
                                            value={mKey}
                                            onChange={(val: string) => handleUpdateMetadataField(idx, val, mVal)}
                                        />
                                        <DebouncedInput 
                                            aria-label={`Field value for ${mKey}`}
                                            className={`w-full text-xs font-bold bg-transparent outline-none ${settings.fieldMode ? 'text-white' : 'text-slate-800'}`}
                                            value={mVal}
                                            onChange={(val: string) => handleUpdateMetadataField(idx, mKey, val)}
                                        />
                                        <button 
                                            aria-label={`Remove field ${mKey}`}
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

                    {/* Standard Fields (visible at standard+ complexity) */}
                    {isAllowed('rights') && isFieldVisible('rights', settings.metadataComplexity) && (
                        <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                            <label htmlFor="rights-field" className={`block text-[10px] font-black mb-1 uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Rights Statement
                            </label>
                            <select
                                id="rights-field"
                                value={resource.rights || ''}
                                onChange={e => onUpdateResource({ rights: e.target.value || undefined })}
                                className={`w-full text-xs p-3 rounded-lg outline-none font-bold shadow-sm border ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-iiif-blue'}`}
                            >
                                <option value="">No rights statement</option>
                                <option value="https://creativecommons.org/publicdomain/zero/1.0/">CC0 - Public Domain</option>
                                <option value="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</option>
                                <option value="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</option>
                                <option value="http://rightsstatements.org/vocab/InC/1.0/">In Copyright</option>
                            </select>
                        </div>
                    )}

                    {isAllowed('navDate') && isFieldVisible('navDate', settings.metadataComplexity) && (
                        <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                            <label htmlFor="navdate-field" className={`block text-[10px] font-black mb-1 uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Navigation Date
                            </label>
                            <input
                                id="navdate-field"
                                type="date"
                                value={resource.navDate ? resource.navDate.split('T')[0] : ''}
                                onChange={e => onUpdateResource({ navDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                className={`w-full text-xs p-3 rounded-lg outline-none font-bold shadow-sm border ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-iiif-blue'}`}
                            />
                            <p className={`text-[9px] mt-1 ${settings.fieldMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                Used for timeline navigation in viewers
                            </p>
                        </div>
                    )}

                    {/* Advanced Fields (visible at advanced complexity only) */}
                    {isAllowed('behavior') && isFieldVisible('behavior', settings.metadataComplexity) && (
                        <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <label className={`block text-[10px] font-black uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Behaviors
                                    <span className={`ml-2 text-[8px] font-mono px-1.5 py-0.5 rounded ${settings.fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-purple-100 text-purple-600'}`}>
                                        advanced
                                    </span>
                                </label>
                                <button 
                                    onClick={handleSuggestBehaviors}
                                    className={`text-[8px] font-black uppercase px-2 py-1 rounded border snappy-transition ${settings.fieldMode ? 'border-slate-700 text-yellow-400 hover:bg-slate-800' : 'border-slate-200 text-iiif-blue hover:bg-blue-50'}`}
                                >
                                    Auto-Suggest
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {(resource.behavior || []).map((b, i) => (
                                    <span key={i} className={`text-[9px] font-bold px-2 py-1 rounded-full ${settings.fieldMode ? 'bg-slate-800 text-yellow-400' : 'bg-purple-100 text-purple-700'}`}>
                                        {b}
                                        <button
                                            onClick={() => {
                                                const newBehaviors = resource.behavior?.filter((_, idx) => idx !== i);
                                                onUpdateResource({ behavior: newBehaviors?.length ? newBehaviors : undefined });
                                            }}
                                            className="ml-1 hover:text-red-500"
                                            aria-label={`Remove behavior ${b}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                                {(!resource.behavior || resource.behavior.length === 0) && (
                                    <span className={`text-[9px] italic ${settings.fieldMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                        No behaviors set
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Required Statement (standard+) */}
                    {isAllowed('requiredStatement') && isFieldVisible('requiredStatement', settings.metadataComplexity) && (
                        <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                            <label className={`block text-[10px] font-black mb-1 uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Required Statement (Attribution)
                            </label>
                            <div className="space-y-2">
                                <DebouncedInput
                                    placeholder="Attribution Label (e.g., 'Courtesy of')"
                                    value={getIIIFValue(resource.requiredStatement?.label, settings.language) || ''}
                                    onChange={(val: string) => onUpdateResource({
                                        requiredStatement: {
                                            label: { [settings.language]: [val] },
                                            value: resource.requiredStatement?.value || { [settings.language]: [''] }
                                        }
                                    })}
                                    className={`w-full text-xs p-2 rounded-lg outline-none font-bold shadow-sm border ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-300'}`}
                                />
                                <DebouncedInput
                                    placeholder="Attribution Value (e.g., institution name)"
                                    value={getIIIFValue(resource.requiredStatement?.value, settings.language) || ''}
                                    onChange={(val: string) => onUpdateResource({
                                        requiredStatement: {
                                            label: resource.requiredStatement?.label || { [settings.language]: ['Attribution'] },
                                            value: { [settings.language]: [val] }
                                        }
                                    })}
                                    className={`w-full text-xs p-2 rounded-lg outline-none shadow-sm border ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-300'}`}
                                />
                            </div>
                        </div>
                    )}

                    {isAllowed('viewingDirection') && isFieldVisible('viewingDirection', settings.metadataComplexity) && (
                        <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                            <label htmlFor="viewingdir-field" className={`block text-[10px] font-black mb-1 uppercase tracking-widest ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Viewing Direction
                                <span className={`ml-2 text-[8px] font-mono px-1.5 py-0.5 rounded ${settings.fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-purple-100 text-purple-600'}`}>
                                    advanced
                                </span>
                            </label>
                            <select
                                id="viewingdir-field"
                                value={(resource as IIIFManifest).viewingDirection || 'left-to-right'}
                                onChange={e => onUpdateResource({ viewingDirection: e.target.value as any })}
                                className={`w-full text-xs p-3 rounded-lg outline-none font-bold shadow-sm border ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-iiif-blue'}`}
                            >
                                <option value="left-to-right">Left to Right</option>
                                <option value="right-to-left">Right to Left</option>
                                <option value="top-to-bottom">Top to Bottom</option>
                                <option value="bottom-to-top">Bottom to Top</option>
                            </select>
                        </div>
                    )}

                    {/* Complexity indicator */}
                    <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div className={`flex items-center justify-between text-[9px] ${settings.fieldMode ? 'text-slate-600' : 'text-slate-400'}`}>
                            <span className="uppercase font-black tracking-widest">Field Complexity</span>
                            <span className={`font-mono px-2 py-0.5 rounded ${
                                settings.metadataComplexity === 'simple' ? 'bg-green-100 text-green-700' :
                                settings.metadataComplexity === 'standard' ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                            }`}>
                                {settings.metadataComplexity}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {tab === 'provenance' && (
            <div role="tabpanel" id="inspector-tab-provenance" aria-labelledby="tab-provenance">
                <ProvenancePanel resourceId={resource.id} fieldMode={settings.fieldMode} />
            </div>
        )}

        {tab === 'structure' && resource?.type === 'Manifest' && (
            <div role="tabpanel" id="inspector-tab-structure" aria-labelledby="tab-structure" className="space-y-4 animate-in fade-in duration-300">
                <div className={`p-4 rounded-xl border ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-xs font-black uppercase mb-3 ${settings.fieldMode ? 'text-yellow-400' : 'text-iiif-blue'}`}>Table of Contents</h3>
                    {(resource as IIIFManifest).structures && (resource as IIIFManifest).structures!.length > 0 ? (
                        <div className="space-y-2">
                            {(resource as IIIFManifest).structures!.map((range, idx) => (
                                <div key={range.id} className={`p-2 rounded border text-[10px] ${settings.fieldMode ? 'bg-black border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className="flex items-center gap-2 font-bold mb-1">
                                        <Icon name="segment" className="text-xs opacity-50" />
                                        {getIIIFValue(range.label, settings.language) || `Range ${idx + 1}`}
                                    </div>
                                    <div className="flex gap-1 flex-wrap pl-5">
                                        {range.items?.map((item: any, i: number) => (
                                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[8px] font-mono">
                                                {item.type === 'Canvas' ? 'Canvas' : 'Range'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-[10px] text-slate-400 italic py-4 text-center">
                            No structural ranges defined for this manifest.
                        </div>
                    )}
                </div>
            </div>
        )}

        {tab === 'geo' && (
            <div role="tabpanel" id="inspector-tab-geo" aria-labelledby="tab-geo" className="space-y-4 animate-in fade-in duration-300">
                <div className={`border rounded-lg overflow-hidden ${settings.fieldMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <GeoEditor
                        item={resource}
                        onChange={(navPlace) => onUpdateResource({ navPlace } as any)}
                        height={300}
                        editable={true}
                    />
                </div>
                <div className={`text-[10px] ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <p className="font-bold uppercase tracking-wider mb-1">About navPlace</p>
                    <p className="leading-relaxed">
                        The navPlace property associates a IIIF resource with a geographic location using GeoJSON.
                        This enables map-based discovery and navigation of archival materials.
                    </p>
                </div>
            </div>
        )}

        {tab === 'learn' && spec && (
            <div role="tabpanel" id="inspector-tab-learn" aria-labelledby="tab-learn" className="space-y-4 animate-in fade-in duration-300">
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
