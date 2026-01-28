
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IIIFItem, IIIFCanvas, AppSettings, IIIFManifest, getIIIFValue, IIIFAnnotation, isManifest } from '../types';
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
  PROPERTY_MATRIX
} from '../utils/iiifSchema';
import { validator, ValidationIssue, healIssue, getFixDescription } from '../services';
import { suggestBehaviors } from '../utils/iiifBehaviors';
import { resolvePreviewUrl } from '../utils/imageSourceResolver';

interface InspectorProps {
  resource: IIIFItem | null;
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  settings: AppSettings;
  visible: boolean;
  onClose: () => void;
  isMobile?: boolean;
  /** Optional custom design tab content (e.g., for BoardView) */
  designTab?: React.ReactNode;
  /** Annotations for this resource */
  annotations?: IIIFAnnotation[];
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

const DebouncedInput = ({ value, onChange, onFocus, onBlur, ...props }: any) => {
  const [innerValue, setInnerValue] = useState(value ?? '');
  const onChangeRef = useRef<(val: string) => void>(onChange);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef<boolean>(false);
  const isFocused = useRef<boolean>(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!isTyping.current && !isFocused.current) {
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

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true;
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      onChangeRef.current(innerValue);
      isTyping.current = false;
    }
    onBlur?.(e);
  }, [onBlur, innerValue]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return <input {...props} value={innerValue} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} />;
};

const DebouncedTextarea = ({ value, onChange, onFocus, onBlur, ...props }: any) => {
  const [innerValue, setInnerValue] = useState(value ?? '');
  const onChangeRef = useRef<(val: string) => void>(onChange);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef<boolean>(false);
  const isFocused = useRef<boolean>(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!isTyping.current && !isFocused.current) {
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

  const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    isFocused.current = true;
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    isFocused.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      onChangeRef.current(innerValue);
      isTyping.current = false;
    }
    onBlur?.(e);
  }, [onBlur, innerValue]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return <textarea {...props} value={innerValue} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} />;
};

// Annotation Item Component
const AnnotationItem = ({ 
  anno, 
  isSelected, 
  onSelect,
  fieldMode 
}: { 
  anno: IIIFAnnotation; 
  isSelected: boolean;
  onSelect: () => void;
  fieldMode: boolean;
}) => {
  const body = anno.body as any;
  const target = anno.target as any;
  const bodyText = body?.value || getIIIFValue(body?.label, 'en') || 'Untitled';
  const motivation = Array.isArray(anno.motivation) ? anno.motivation[0] : (anno.motivation || 'commenting');
  const hasSpatial = target?.selector?.type === 'SvgSelector' || (target?.selector?.value || '').includes('xywh=');
  
  const motivationColors: Record<string, string> = {
    'commenting': fieldMode ? 'text-blue-400 border-blue-400/30' : 'text-blue-600 border-blue-200',
    'tagging': fieldMode ? 'text-green-400 border-green-400/30' : 'text-green-600 border-green-200',
    'describing': fieldMode ? 'text-purple-400 border-purple-400/30' : 'text-purple-600 border-purple-200',
    'painting': fieldMode ? 'text-pink-400 border-pink-400/30' : 'text-pink-600 border-pink-200',
  };
  
  return (
    <div 
      onClick={onSelect}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected 
          ? (fieldMode ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50 border-blue-500') 
          : (fieldMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${motivationColors[motivation] || 'text-slate-500 border-slate-300'}`}>
          {motivation}
        </span>
        {hasSpatial && (
          <Icon name="crop_free" className={`text-xs ${fieldMode ? 'text-slate-600' : 'text-slate-400'}`} />
        )}
      </div>
      <p className={`text-xs truncate ${fieldMode ? 'text-slate-300' : 'text-slate-700'}`}>
        {bodyText}
      </p>
    </div>
  );
};

export const Inspector: React.FC<InspectorProps> = ({ 
  resource, 
  onUpdateResource, 
  settings, 
  visible, 
  onClose, 
  isMobile, 
  designTab,
  annotations = []
}) => {
  // Consolidated tabs: Metadata, Annotations, Structure, Learn
  const getStoredTab = (resourceType: string): 'metadata' | 'annotations' | 'structure' | 'learn' | 'design' => {
    try {
      const stored = localStorage.getItem(`inspector-tab-${resourceType}`);
      if (stored && ['metadata', 'annotations', 'structure', 'learn', 'design'].includes(stored)) {
        return stored as any;
      }
    } catch (e) {}
    return 'metadata';
  };

  const [tab, setTab] = useState<'metadata' | 'annotations' | 'structure' | 'learn' | 'design'>(() =>
    resource ? getStoredTab(resource.type) : 'metadata'
  );
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Run validation when resource changes
  useEffect(() => {
    if (resource) {
      setValidationIssues(validator.validateItem(resource));
    } else {
      setValidationIssues([]);
    }
  }, [resource]);

  const handleFixIssue = (issue: ValidationIssue) => {
    if (!resource || !issue.fixable) return;
    const result = healIssue(resource, issue);
    if (result.success && result.updatedItem) {
      onUpdateResource(result.updatedItem);
    }
  };

  const handleFixAllIssues = () => {
    if (!resource) return;
    const fixableIssues = validationIssues.filter(i => i.fixable);
    if (fixableIssues.length === 0) return;

    import('../services/validationHealer').then(({ safeHealAll }) => {
      const result = safeHealAll(resource, fixableIssues);
      if (result.success && result.updatedItem) {
        onUpdateResource(result.updatedItem);
      }
    });
  };

  useEffect(() => {
    if (resource?.type) {
      setTab(getStoredTab(resource.type));
    }
  }, [resource?.type]);

  useEffect(() => {
    if (resource?.type && tab) {
      try {
        localStorage.setItem(`inspector-tab-${resource.type}`, tab);
      } catch (e) {}
    }
  }, [tab, resource?.type]);

  if (!visible || !resource) return null;

  const config = RESOURCE_TYPE_CONFIG[resource.type] || RESOURCE_TYPE_CONFIG['Content'];
  const spec = IIIF_SPECS[resource.type];
  const isAllowed = (field: string) => isPropertyAllowed(resource.type, field);

  const handleSuggestBehaviors = () => {
    if (!resource) return;
    const characteristics = {
      hasDuration: !!(resource as any).duration,
      hasPageSequence: isManifest(resource) && (resource as IIIFManifest).items?.length > 1,
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
    
    if (['rights', 'navDate', 'behavior', 'viewingDirection', 'requiredStatement', 'navPlace'].includes(propName)) {
      if (propName === 'navPlace') {
        onUpdateResource({ navPlace: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} } } as any);
      } else {
        onUpdateResource({ [propName]: propName === 'behavior' ? [] : '' });
      }
    } else {
      const newMeta = [...(resource.metadata || []), { label: { [settings.language]: [labelStr] }, value: { [settings.language]: [''] } }];
      onUpdateResource({ metadata: newMeta });
    }
    setShowAddMenu(false);
  };

  const handleRemoveMetadataField = (index: number) => {
    const newMeta = resource.metadata?.filter((_, i) => i !== index);
    onUpdateResource({ metadata: newMeta });
  };

  // Determine available tabs
  const availableTabs = ['metadata', 'annotations'];
  if (resource && isManifest(resource)) availableTabs.push('structure');
  availableTabs.push('learn');
  if (designTab) availableTabs.push('design');

  const inspectorStyles = isMobile 
    ? `fixed inset-0 z-[1100] bg-white flex flex-col animate-slide-in-right`
    : `w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-30 animate-slide-in-right shrink-0`;

  return (
    <aside className={inspectorStyles} aria-label="Resource Inspector">
      {/* Header */}
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

      {/* Consolidated Tabs */}
      <div role="tablist" aria-label="Inspector tabs" className={`flex border-b shrink-0 ${settings.fieldMode ? 'bg-black border-slate-800' : 'bg-white'}`}>
        {availableTabs.map(t => (
          <button
            key={t}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all ${
              tab === t 
                ? (settings.fieldMode ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/20') 
                : 'text-slate-400 hover:text-slate-600'
            }`}
            onClick={() => setTab(t as any)}
            aria-selected={tab === t}
            role="tab"
          >
            {t === 'annotations' ? (
              <span className="flex items-center justify-center gap-1">
                {t}
                {annotations.length > 0 && (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${settings.fieldMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    {annotations.length}
                  </span>
                )}
              </span>
            ) : t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0 ${settings.fieldMode ? 'bg-black' : 'bg-white'}`}>
        {tab === 'metadata' && (
          <div role="tabpanel" className="space-y-4">
            {/* Validation Status */}
            {validationIssues.length > 0 && (
              <div className={`p-3 rounded-lg border text-[10px] space-y-2 ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-orange-600">
                    <Icon name="report_problem" className="text-sm" />
                    <span>Issues ({validationIssues.length})</span>
                  </div>
                  {validationIssues.some(i => i.fixable) && (
                    <button
                      onClick={handleFixAllIssues}
                      className={`text-[8px] font-bold uppercase px-2 py-1 rounded ${settings.fieldMode ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-700'}`}
                    >
                      Fix All
                    </button>
                  )}
                </div>
                {validationIssues.map((issue) => (
                  <div key={issue.id} className={`flex items-start gap-2 text-[10px] ${issue.level === 'error' ? 'text-red-500' : (settings.fieldMode ? 'text-slate-400' : 'text-orange-700')}`}>
                    <span className="shrink-0">{issue.message}</span>
                    {issue.fixable && (
                      <button onClick={() => handleFixIssue(issue)} className="text-[8px] text-green-600 hover:underline">Fix</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {imageUrl && (
              <div className={`aspect-video rounded-lg overflow-hidden border ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                <img src={imageUrl} className="w-full h-full object-contain" alt="Preview" />
              </div>
            )}

            {/* Label & Summary */}
            <div className="space-y-3">
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Label</label>
                <DebouncedInput 
                  type="text" 
                  value={label} 
                  onChange={(val: string) => onUpdateResource({ label: { [settings.language]: [val] } })} 
                  className={`w-full text-sm p-3 rounded-lg outline-none font-bold border ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800 focus:border-yellow-400' : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'}`} 
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Summary</label>
                <DebouncedTextarea 
                  value={summary} 
                  onChange={(val: string) => onUpdateResource({ summary: { [settings.language]: [val] } })} 
                  rows={3}
                  className={`w-full text-sm p-3 rounded-lg outline-none border resize-none ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800 focus:border-yellow-400' : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'}`} 
                />
              </div>
            </div>

            {/* Metadata Fields */}
            <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex justify-between items-center mb-3">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Metadata</label>
                <div className="relative">
                  <button 
                    onClick={() => setShowAddMenu(!showAddMenu)} 
                    className={`text-[10px] font-bold uppercase flex items-center gap-1 ${settings.fieldMode ? 'text-yellow-400' : 'text-blue-600'}`}
                  >
                    Add <Icon name="add" className="text-[10px]"/>
                  </button>
                  {showAddMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-2 z-50 min-w-[160px] max-h-[250px] overflow-y-auto">
                      {getAllowedProperties(resource.type)
                        .filter(p => !['id', 'type', 'items', 'annotations', 'structures', 'label', 'summary', 'metadata'].includes(p))
                        .map(p => (
                          <button 
                            key={p} 
                            onClick={() => handleAddMetadataField(p)} 
                            className="w-full px-3 py-1.5 text-left text-[10px] font-bold text-slate-600 hover:bg-blue-50"
                          >
                            {p}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {(resource.metadata || []).map((md, idx) => {
                  const mKey = getIIIFValue(md.label, settings.language);
                  const mVal = getIIIFValue(md.value, settings.language);
                  return (
                    <div key={idx} className={`group relative p-2.5 rounded-lg border ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <DebouncedInput 
                        className={`w-full text-[10px] font-bold uppercase bg-transparent outline-none mb-1 border-b ${settings.fieldMode ? 'text-slate-500 border-slate-800' : 'text-slate-500 border-transparent'}`}
                        value={mKey}
                        onChange={(val: string) => handleUpdateMetadataField(idx, val, mVal)}
                      />
                      <DebouncedInput 
                        className={`w-full text-xs bg-transparent outline-none ${settings.fieldMode ? 'text-white' : 'text-slate-800'}`}
                        value={mVal}
                        onChange={(val: string) => handleUpdateMetadataField(idx, mKey, val)}
                      />
                      <button 
                        onClick={() => handleRemoveMetadataField(idx)}
                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        <Icon name="close" className="text-xs"/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Standard Fields */}
            {isAllowed('rights') && (
              <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Rights</label>
                <select
                  value={resource.rights || ''}
                  onChange={e => onUpdateResource({ rights: e.target.value || undefined })}
                  className={`w-full text-xs p-2.5 rounded-lg border ${settings.fieldMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-300'}`}
                >
                  <option value="">None</option>
                  <option value="https://creativecommons.org/publicdomain/zero/1.0/">CC0</option>
                  <option value="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</option>
                  <option value="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</option>
                  <option value="http://rightsstatements.org/vocab/InC/1.0/">In Copyright</option>
                </select>
              </div>
            )}

            {/* Geo Location */}
            {(resource as any).navPlace && (
              <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Location</label>
                  <button 
                    onClick={() => onUpdateResource({ navPlace: undefined } as any)}
                    className="text-[10px] text-red-400 hover:text-red-600 font-bold uppercase"
                  >
                    Remove
                  </button>
                </div>
                <div className={`border rounded-lg overflow-hidden ${settings.fieldMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <GeoEditor
                    item={resource}
                    onChange={(navPlace) => onUpdateResource({ navPlace } as any)}
                    height={150}
                    editable={true}
                  />
                </div>
              </div>
            )}

            {/* Behaviors */}
            {isAllowed('behavior') && (
              <div className={`pt-4 border-t ${settings.fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${settings.fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Behaviors</label>
                  <button 
                    onClick={handleSuggestBehaviors}
                    className={`text-[9px] font-bold uppercase px-2 py-1 rounded border ${settings.fieldMode ? 'border-slate-700 text-yellow-400' : 'border-slate-200 text-blue-600'}`}
                  >
                    Auto
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
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Annotations Tab */}
        {tab === 'annotations' && (
          <div role="tabpanel" className="space-y-4">
            <div className={`p-3 rounded-lg border ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase ${settings.fieldMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  W3C Web Annotations
                </span>
                <span className="text-[10px] text-slate-500">
                  {annotations.length} total
                </span>
              </div>
              <p className={`text-[10px] mt-1 ${settings.fieldMode ? 'text-slate-500' : 'text-slate-600'}`}>
                Linked to specific regions with JSON-LD serialization
              </p>
            </div>

            {annotations.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="sticky_note_2" className={`text-4xl mb-3 mx-auto ${settings.fieldMode ? 'text-slate-700' : 'text-slate-300'}`} />
                <p className={`text-sm ${settings.fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>No annotations yet</p>
                <p className={`text-[10px] mt-1 ${settings.fieldMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Use the annotation tool to create region-linked notes
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {annotations.map(anno => (
                  <AnnotationItem
                    key={anno.id}
                    anno={anno}
                    isSelected={selectedAnnotationId === anno.id}
                    onSelect={() => setSelectedAnnotationId(anno.id)}
                    fieldMode={settings.fieldMode}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'structure' && resource && isManifest(resource) && (
          <div role="tabpanel" className="space-y-4">
            <div className={`p-3 rounded-lg border ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className={`text-xs font-bold uppercase mb-2 ${settings.fieldMode ? 'text-yellow-400' : 'text-blue-600'}`}>Table of Contents</h3>
              {(resource as IIIFManifest).structures && (resource as IIIFManifest).structures!.length > 0 ? (
                <div className="space-y-2">
                  {(resource as IIIFManifest).structures!.map((range, idx) => (
                    <div key={range.id} className={`p-2 rounded border text-[10px] ${settings.fieldMode ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-2 font-bold">
                        <Icon name="segment" className="text-xs opacity-50" />
                        {getIIIFValue(range.label, settings.language) || `Range ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 italic py-4 text-center">
                  No structural ranges defined
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'learn' && spec && (
          <div role="tabpanel" className="space-y-4">
            <div className={`border p-4 rounded-xl ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : `${config.bgClass} ${config.borderClass}`}`}>
              <h3 className={`text-sm font-bold uppercase mb-2 flex items-center gap-2 ${settings.fieldMode ? 'text-yellow-400' : config.colorClass}`}>
                <Icon name={config.icon} className="text-xs" /> {resource.type} Model
              </h3>
              <p className={`text-xs leading-relaxed font-medium mb-3 ${settings.fieldMode ? 'text-slate-400' : 'text-slate-600'}`}>{spec.desc}</p>
            </div>
            <MuseumLabel title="Archival Implication" type={settings.fieldMode ? 'spec' : 'exhibit'}>
              {spec.implication}
            </MuseumLabel>
          </div>
        )}

        {tab === 'design' && designTab && (
          <div role="tabpanel">{designTab}</div>
        )}
      </div>
    </aside>
  );
};
