
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AppSettings, getIIIFValue, IIIFAnnotation, IIIFItem, IIIFManifest, isManifest } from '@/src/shared/types';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { MuseumLabel } from '@/src/shared/ui/molecules/MuseumLabel';
import { ShareButton } from '../atoms/ShareButton';
import { GeoEditor } from '../molecules/GeoEditor';
import { ValidatedInput } from '../atoms/ValidatedInput';
import { useResizablePanel } from '@/src/shared/lib/hooks/useResizablePanel';
import { RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';
// TODO: [FSD] Proper fix is to receive `t` via props from FieldModeTemplate
// eslint-disable-next-line no-restricted-imports
import { useTerminology } from '@/src/app/providers/useTerminology';
import { isPropertyAllowed } from '@/utils/iiifSchema';
import { suggestBehaviors } from '@/utils/iiifBehaviors';
import { resolvePreviewUrl } from '@/utils/imageSourceResolver';
import { useDebouncedValue } from '@/src/shared/lib/hooks/useDebouncedValue';
import { usePersistedTab } from '@/src/shared/lib/hooks/usePersistedTab';
import { useInspectorValidation, type ValidationIssue } from '../../model/useInspectorValidation';
import { useMetadataEditor } from '@/src/shared/lib/hooks/useMetadataEditor';
import { useContextualStyles } from '@/src/shared/lib/hooks/useContextualStyles';
import { StructureTabPanel } from '../molecules/StructureTabPanel';

/** Time range for audio/video annotations */
interface TimeRange {
  start: number;
  end?: number;
}

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
  /** Canvases available for structure editing (for manifests) */
  canvases?: import('@/src/shared/types').IIIFCanvas[];
  /** Whether annotation drawing mode is active */
  annotationModeActive?: boolean;
  /** Current annotation drawing state (for spatial annotations) */
  annotationDrawingState?: {
    pointCount: number;
    isDrawing: boolean;
    canSave: boolean;
  };
  /** Text for new annotation */
  annotationText?: string;
  /** Callback when annotation text changes */
  onAnnotationTextChange?: (text: string) => void;
  /** Motivation for new annotation */
  annotationMotivation?: 'commenting' | 'tagging' | 'describing';
  /** Callback when motivation changes */
  onAnnotationMotivationChange?: (motivation: 'commenting' | 'tagging' | 'describing') => void;
  /** Callback to save the annotation */
  onSaveAnnotation?: () => void;
  /** Callback to clear the annotation drawing */
  onClearAnnotation?: () => void;
  /** Current media type for the resource (image/audio/video/other) */
  mediaType?: 'image' | 'video' | 'audio' | 'other';
  /** Time range for audio/video annotations */
  timeRange?: TimeRange | null;
  /** Current playback time for audio/video */
  currentPlaybackTime?: number;
  /** Force a specific tab to be active */
  forceTab?: 'metadata' | 'annotations' | 'structure' | 'learn' | 'design';
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

/** Single debounced field primitive — renders <input> or <textarea> based on inputType */
const DebouncedField = ({ value, onChange, inputType = 'input', rows, ...props }: {
  value: string;
  onChange: (value: string) => void;
  inputType?: 'input' | 'textarea';
  rows?: number;
  [key: string]: any;
}) => {
  const { value: localValue, setValue: handleChange, flush } = useDebouncedValue(value ?? '', onChange);

  const common = {
    ...props,
    value: localValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e.target.value),
    onBlur: (e: React.FocusEvent) => { flush(); props.onBlur?.(e); },
  };

  return inputType === 'textarea'
    ? <textarea {...common} rows={rows} />
    : <input {...common} />;
};

// Validated Field Component - shows inline validation feedback
interface ValidatedFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  issues: ValidationIssue[];
  settings: AppSettings;
  inputType: 'input' | 'textarea';
  rows?: number;
}

const ValidatedField: React.FC<ValidatedFieldProps> = ({
  label, value, onChange, issues, settings, inputType, rows
}) => {
  const hasError = issues.some(i => i.severity === 'error');
  const hasWarning = issues.some(i => i.severity === 'warning');
  
  const borderColor = hasError
    ? (settings.fieldMode ? 'border-red-500' : 'border-red-400')
    : hasWarning
      ? (settings.fieldMode ? 'border-amber-500' : 'border-amber-400')
      : (settings.fieldMode ? 'border-slate-800 focus:border-yellow-400' : 'border-slate-300 focus:ring-2 focus:ring-blue-500');
  
  const inputClass = `w-full text-sm p-3 rounded-lg outline-none border ${borderColor} ${
    settings.fieldMode ? 'bg-slate-900 text-white' : 'bg-white'
  }`;

  return (
    <div>
      <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${
        settings.fieldMode ? 'text-slate-500' : 'text-slate-400'
      }`}>
        {label}
        {hasError && <Icon name="error" className="text-red-500 ml-1 text-xs" />}
        {hasWarning && !hasError && <Icon name="warning" className="text-amber-500 ml-1 text-xs" />}
      </label>
      <DebouncedField
        inputType={inputType}
        value={value}
        onChange={onChange}
        rows={inputType === 'textarea' ? (rows || 3) : undefined}
        className={`${inputClass}${inputType === 'textarea' ? ' resize-none' : ''}`}
      />
      {issues.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {issues.map((issue, idx) => (
            <div key={idx} className={`text-[10px] flex items-center gap-1 ${
              issue.severity === 'error' ? 'text-red-500' :
              issue.severity === 'warning' ? 'text-amber-500' :
              'text-blue-500'
            }`}>
              <Icon name={issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info'} className="text-[10px]" />
              {issue.title}
              {issue.autoFixable && (
                <Button variant="ghost" size="bare"
                  onClick={() => {/* handled by parent */}}
                  className="ml-1 text-green-600 hover:underline"
                >
                  Fix
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

/** Format time for display (MM:SS.ms or HH:MM:SS.ms) */
const formatTimeForDisplay = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const InspectorComponent: React.FC<InspectorProps> = ({
  resource: resourceProp,
  onUpdateResource,
  settings,
  visible,
  onClose,
  isMobile,
  designTab,
  annotations = [],
  canvases = [],
  annotationModeActive = false,
  annotationDrawingState,
  annotationText = '',
  onAnnotationTextChange,
  annotationMotivation = 'commenting',
  onAnnotationMotivationChange,
  onSaveAnnotation,
  onClearAnnotation,
  mediaType,
  timeRange,
  currentPlaybackTime,
  forceTab,
}) => {
  // Stabilize resource reference to prevent infinite re-renders
  const resource = useMemo(() => resourceProp, [resourceProp?.id, resourceProp?.type]);
  
  const hasResource = !!resource;

  const { t } = useTerminology({ level: settings.abstractionLevel });
  const cx = useContextualStyles(settings.fieldMode);

  const { size: inspectorWidth, isResizing, handleProps, panelStyle } = useResizablePanel({
    id: 'inspector',
    defaultSize: 320,
    minSize: 280,
    maxSize: 480,
    direction: 'horizontal',
    side: 'left',
    collapseThreshold: 0,
    persist: true,
  });

  // Tab state persisted per resource type
  const ALLOWED_TABS = ['metadata', 'annotations', 'structure', 'learn', 'design'] as const;
  const [tab, setTab] = usePersistedTab(
    'inspector',
    resource?.type || 'default',
    ALLOWED_TABS,
    'metadata'
  );

  // Force tab when annotation mode is activated
  React.useEffect(() => {
    if (forceTab && ALLOWED_TABS.includes(forceTab as any)) {
      setTab(forceTab);
    }
  }, [forceTab, setTab]);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Validation lifecycle (run + fix + fixAll)
  const { issues: validationIssues, fixIssue, fixAll } = useInspectorValidation(resource);

  // Metadata CRUD
  const { updateField, addField, removeField, availableProperties } = useMetadataEditor(
    resource, settings.language, onUpdateResource
  );

  // Validation memoized values - must be called before any conditional returns
  // Helper to get validation status for a specific field
  const getFieldValidation = useCallback((fieldName: string) => {
    const fieldIssues = validationIssues.filter(i => i.field === fieldName);
    if (fieldIssues.length === 0) return { status: 'pristine' as const };
    const hasError = fieldIssues.some(i => i.severity === 'error');
    const firstIssue = fieldIssues[0];
    return {
      status: 'invalid' as const,
      message: firstIssue.title,
      fix: firstIssue.autoFixable ? () => {
        const fixed = fixIssue(firstIssue.id);
        if (fixed) onUpdateResource(fixed);
      } : undefined,
    };
  }, [validationIssues, fixIssue, onUpdateResource]);

  const labelValidation = useMemo(() => getFieldValidation('label'), [getFieldValidation]);
  const summaryValidation = useMemo(() => getFieldValidation('summary'), [getFieldValidation]);

  // Return null AFTER all hooks (React Rules of Hooks)
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
    : `bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-30 animate-slide-in-right shrink-0 relative`;

  return (
    <aside
      className={inspectorStyles}
      style={isMobile ? undefined : panelStyle}
      aria-label="Resource Inspector"
    >
      {/* Header */}
      <div className={`h-14 flex items-center justify-between px-4 border-b shrink-0 ${cx.headerBg} ${cx.text}`}>
        <div className="flex items-center gap-2">
          <Icon name={config.icon} className={`${config.colorClass} text-sm`}/>
          <span className={`text-xs font-black uppercase tracking-widest ${settings.fieldMode ? cx.accent : config.colorClass}`}>
            {t('Inspector')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton item={resource} fieldMode={settings.fieldMode} />
          <Button variant="ghost" size="bare" 
            aria-label="Close Inspector"
            onClick={onClose} 
            className={`p-2 rounded-lg ${settings.fieldMode ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}
          >
            <Icon name="close"/>
          </Button>
        </div>
      </div>

      {/* Consolidated Tabs */}
      <div role="tablist" aria-label="Inspector tabs" className={`flex border-b shrink-0 ${settings.fieldMode ? `bg-black` + ` ${cx.border}` : 'bg-white'}`}>
        {availableTabs.map(t => (
          <Button variant="ghost" size="bare"
            key={t}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
              tab === t ? cx.active : cx.inactive
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
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0 ${settings.fieldMode ? 'bg-black' : 'bg-white'}`}>
        {tab === 'metadata' && (
          <div role="tabpanel" className="space-y-4">
            {/* Validation Status */}
            {validationIssues.length > 0 && (
              <div className={`p-3 rounded-lg border text-[10px] space-y-2 ${cx.warningBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-orange-600">
                    <Icon name="report_problem" className="text-sm" />
                    <span>Issues ({validationIssues.length})</span>
                  </div>
                  {validationIssues.some(i => i.autoFixable) && (
                    <Button variant="ghost" size="bare"
                      onClick={() => { const fixed = fixAll(); if (fixed) onUpdateResource(fixed); }}
                      className={`text-[8px] font-bold uppercase px-2 py-1 rounded ${settings.fieldMode ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-700'}`}
                    >
                      Fix All
                    </Button>
                  )}
                </div>
                {validationIssues.map((issue) => (
                  <div key={issue.id} className={`flex items-start gap-2 text-[10px] ${issue.severity === 'error' ? 'text-red-500' : (settings.fieldMode ? 'text-slate-400' : 'text-orange-700')}`}>
                    <span className="shrink-0">{issue.title}</span>
                    {issue.autoFixable && (
                      <Button variant="ghost" size="bare" onClick={() => { const fixed = fixIssue(issue.id); if (fixed) onUpdateResource(fixed); }} className="text-[8px] text-green-600 hover:underline">Fix</Button>
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

            {/* Label & Summary with ValidatedInput */}
            <div className="space-y-3">
              <ValidatedInput
                id="inspector-label"
                label={t('Label')}
                value={label}
                onChange={(val: string) => onUpdateResource({ label: { [settings.language]: [val] } })}
                validation={labelValidation}
                type="text"
                fieldMode={settings.fieldMode}
              />
              <ValidatedInput
                id="inspector-summary"
                label={t('Summary')}
                value={summary}
                onChange={(val: string) => onUpdateResource({ summary: { [settings.language]: [val] } })}
                validation={summaryValidation}
                type="textarea"
                rows={3}
                fieldMode={settings.fieldMode}
              />
            </div>

            {/* Metadata Fields */}
            <div className={`pt-4 border-t ${cx.divider}`}>
              <div className="flex justify-between items-center mb-3">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${cx.label}`}>{t('Metadata')}</label>
                <div className="relative">
                  <Button variant="ghost" size="bare" 
                    onClick={() => setShowAddMenu(!showAddMenu)} 
                    className={`text-[10px] font-bold uppercase flex items-center gap-1 ${cx.accent}`}
                  >
                    Add <Icon name="add" className="text-[10px]"/>
                  </Button>
                  {showAddMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-2 z-50 min-w-[160px] max-h-[250px] overflow-y-auto">
                      {availableProperties.map(p => (
                        <Button variant="ghost" size="bare"
                          key={p}
                          onClick={() => { addField(p); setShowAddMenu(false); }}
                          className="w-full px-3 py-1.5 text-left text-[10px] font-bold text-slate-600 hover:bg-blue-50"
                        >
                          {p}
                        </Button>
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
                      <DebouncedField
                        className={`w-full text-[10px] font-bold uppercase bg-transparent outline-none mb-1 border-b ${settings.fieldMode ? 'text-slate-500 border-slate-800' : 'text-slate-500 border-transparent'}`}
                        value={mKey}
                        onChange={(val: string) => updateField(idx, val, mVal)}
                      />
                      <DebouncedField
                        className={`w-full text-xs bg-transparent outline-none ${settings.fieldMode ? 'text-white' : 'text-slate-800'}`}
                        value={mVal}
                        onChange={(val: string) => updateField(idx, mKey, val)}
                      />
                      <Button variant="ghost" size="bare"
                        onClick={() => removeField(idx)}
                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        <Icon name="close" className="text-xs"/>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Standard Fields */}
            {isAllowed('rights') && (
              <div className={`pt-4 border-t ${cx.divider}`}>
                <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${cx.label}`}>{t('Rights')}</label>
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
              <div className={`pt-4 border-t ${cx.divider}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${cx.label}`}>Location</label>
                  <Button variant="ghost" size="bare" 
                    onClick={() => onUpdateResource({ navPlace: undefined } as any)}
                    className="text-[10px] text-red-400 hover:text-red-600 font-bold uppercase"
                  >
                    Remove
                  </Button>
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
              <div className={`pt-4 border-t ${cx.divider}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${cx.label}`}>Behaviors</label>
                  <Button variant="ghost" size="bare" 
                    onClick={handleSuggestBehaviors}
                    className={`text-[9px] font-bold uppercase px-2 py-1 rounded border ${settings.fieldMode ? 'border-slate-700 text-yellow-400' : 'border-slate-200 text-blue-600'}`}
                  >
                    Auto
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(resource.behavior || []).map((b, i) => (
                    <span key={i} className={`text-[9px] font-bold px-2 py-1 rounded-full ${settings.fieldMode ? 'bg-slate-800 text-yellow-400' : 'bg-purple-100 text-purple-700'}`}>
                      {b}
                      <Button variant="ghost" size="bare"
                        onClick={() => {
                          const newBehaviors = resource.behavior?.filter((_, idx) => idx !== i);
                          onUpdateResource({ behavior: newBehaviors?.length ? newBehaviors : undefined });
                        }}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </Button>
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
            {/* Annotation Creation Form - shown when annotation mode is active */}
            {annotationModeActive && (
              <div className={`p-4 rounded-xl border-2 ${
                settings.fieldMode
                  ? 'bg-yellow-900/20 border-yellow-600'
                  : 'bg-green-50 border-green-400'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name={mediaType === 'image' ? 'gesture' : 'timer'} className={`${settings.fieldMode ? 'text-yellow-400' : 'text-green-600'}`} />
                  <span className={`text-xs font-bold uppercase ${settings.fieldMode ? 'text-yellow-400' : 'text-green-700'}`}>
                    {mediaType === 'image' ? 'Creating Annotation' : 'Time-Based Annotation'}
                  </span>
                </div>

                {/* Status - differs based on media type */}
                <div className={`mb-3 p-2 rounded-lg text-xs ${
                  settings.fieldMode ? 'bg-black/40 text-stone-300' : 'bg-white text-slate-600'
                }`}>
                  {mediaType === 'image' ? (
                    // Spatial annotation status
                    annotationDrawingState?.pointCount === 0
                      ? 'Draw a shape on the image to select a region'
                      : annotationDrawingState?.isDrawing
                        ? `Drawing... ${annotationDrawingState.pointCount} points`
                        : `Shape ready with ${annotationDrawingState?.pointCount || 0} points`
                  ) : (
                    // Time-based annotation status
                    !timeRange
                      ? 'Click on the timeline to set start time, then drag or click again to set end time'
                      : timeRange.end !== undefined
                        ? (
                          <div className="flex items-center gap-2">
                            <Icon name="schedule" className="text-sm" />
                            <span>
                              Range: <strong>{formatTimeForDisplay(timeRange.start)}</strong>
                              {' → '}
                              <strong>{formatTimeForDisplay(timeRange.end)}</strong>
                              <span className="opacity-60 ml-1">
                                ({formatTimeForDisplay(timeRange.end - timeRange.start)} duration)
                              </span>
                            </span>
                          </div>
                        )
                        : (
                          <div className="flex items-center gap-2">
                            <Icon name="schedule" className="text-sm" />
                            <span>
                              Point: <strong>{formatTimeForDisplay(timeRange.start)}</strong>
                              <span className="opacity-60 ml-1">(click/drag for range)</span>
                            </span>
                          </div>
                        )
                  )}
                </div>

                {/* Current playback time indicator for AV */}
                {(mediaType === 'audio' || mediaType === 'video') && currentPlaybackTime !== undefined && (
                  <div className={`mb-3 px-2 py-1 rounded text-[10px] flex items-center gap-1 ${
                    settings.fieldMode ? 'bg-black/20 text-stone-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Icon name="play_arrow" className="text-xs" />
                    Current: {formatTimeForDisplay(currentPlaybackTime)}
                  </div>
                )}

                {/* Form - show when region/time is ready */}
                {((mediaType === 'image' && annotationDrawingState && annotationDrawingState.pointCount >= 3 && !annotationDrawingState.isDrawing) ||
                  ((mediaType === 'audio' || mediaType === 'video') && timeRange !== null)) && (
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-[10px] font-bold uppercase mb-1.5 ${
                        settings.fieldMode ? 'text-stone-400' : 'text-slate-500'
                      }`}>
                        Purpose
                      </label>
                      <select
                        value={annotationMotivation}
                        onChange={e => onAnnotationMotivationChange?.(e.target.value as any)}
                        className={`
                          w-full rounded-lg px-3 py-2 text-sm outline-none border
                          ${settings.fieldMode
                            ? 'bg-stone-800 text-white border-yellow-900/30 focus:border-yellow-600'
                            : 'bg-white text-slate-900 border-slate-200 focus:border-green-500'
                          }
                        `}
                      >
                        <option value="commenting">Comment</option>
                        <option value="tagging">Tag</option>
                        <option value="describing">Description</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-[10px] font-bold uppercase mb-1.5 ${
                        settings.fieldMode ? 'text-stone-400' : 'text-slate-500'
                      }`}>
                        Annotation Text
                      </label>
                      <textarea
                        value={annotationText}
                        onChange={e => onAnnotationTextChange?.(e.target.value)}
                        placeholder="Enter your annotation..."
                        rows={3}
                        autoFocus
                        className={`
                          w-full rounded-lg px-3 py-2 text-sm outline-none border resize-none
                          ${settings.fieldMode
                            ? 'bg-stone-800 text-white placeholder-stone-500 border-yellow-900/30 focus:border-yellow-600'
                            : 'bg-white text-slate-900 placeholder-slate-400 border-slate-200 focus:border-green-500'
                          }
                        `}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button variant="ghost" size="bare"
                        onClick={onClearAnnotation}
                        className={`
                          flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors
                          ${settings.fieldMode
                            ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }
                        `}
                      >
                        Clear
                      </Button>
                      <Button variant="ghost" size="bare"
                        onClick={onSaveAnnotation}
                        disabled={!annotationText.trim()}
                        className={`
                          flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50
                          ${settings.fieldMode
                            ? 'bg-yellow-600 text-white hover:bg-yellow-500'
                            : 'bg-green-600 text-white hover:bg-green-500'
                          }
                        `}
                      >
                        <Icon name="save" className="inline mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={`p-3 rounded-lg border ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase ${settings.fieldMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {settings.abstractionLevel === 'simple' ? t('Notes') : 'W3C Web Annotations'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {annotations.length} total
                </span>
              </div>
              <p className={`text-[10px] mt-1 ${settings.fieldMode ? 'text-slate-500' : 'text-slate-600'}`}>
                Linked to specific regions with JSON-LD serialization
              </p>
            </div>

            {annotations.length === 0 && !annotationModeActive ? (
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
          <div role="tabpanel">
            <StructureTabPanel
              manifest={resource as IIIFManifest}
              onUpdateManifest={(updates) => onUpdateResource(updates as Partial<IIIFItem>)}
              settings={settings}
              canvases={canvases}
            />
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

      {/* Resize Handle - Desktop Only */}
      {!isMobile && (
        <div
          {...handleProps}
          className={`
            absolute left-0 top-0 bottom-0 w-1 z-30 group
            cursor-col-resize
            transition-colors duration-150
            hover:bg-slate-500/20
            ${isResizing ? (settings.fieldMode ? 'bg-yellow-400/30' : 'bg-iiif-blue/30') : ''}
            ${handleProps.className}
          `}
        >
          {/* Visual drag indicator */}
          <div
            className={`
              absolute left-0 top-1/2 -translate-y-1/2
              w-1 h-12 rounded-full
              transition-all duration-150
              opacity-0 group-hover:opacity-100 group-focus:opacity-100
              ${isResizing
                ? (settings.fieldMode ? 'bg-yellow-400 opacity-100' : 'bg-iiif-blue opacity-100')
                : (settings.fieldMode ? 'bg-slate-600 group-hover:bg-yellow-400' : 'bg-slate-500 group-hover:bg-iiif-blue')
              }
            `}
          />
        </div>
      )}
    </aside>
  );
};

export const Inspector = React.memo(InspectorComponent, (prev, next) => {
  // Custom comparison: re-render when these props change
  // Note: currentPlaybackTime is intentionally excluded to prevent re-renders during playback
  return prev.resource?.id === next.resource?.id &&
         prev.visible === next.visible &&
         prev.settings.fieldMode === next.settings.fieldMode &&
         prev.annotationModeActive === next.annotationModeActive &&
         prev.annotationDrawingState?.pointCount === next.annotationDrawingState?.pointCount &&
         prev.annotationDrawingState?.isDrawing === next.annotationDrawingState?.isDrawing &&
         prev.annotationDrawingState?.canSave === next.annotationDrawingState?.canSave &&
         prev.annotationText === next.annotationText &&
         prev.annotationMotivation === next.annotationMotivation &&
         prev.timeRange?.start === next.timeRange?.start &&
         prev.timeRange?.end === next.timeRange?.end &&
         prev.mediaType === next.mediaType &&
         prev.forceTab === next.forceTab;
});
