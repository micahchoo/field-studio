
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppSettings, getIIIFValue, IIIFAnnotation, IIIFItem, IIIFManifest, isManifest } from '@/src/shared/types';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { MuseumLabel } from '@/src/shared/ui/molecules/MuseumLabel';
import { ShareButton } from '../atoms/ShareButton';
import { GeoEditor } from '../molecules/GeoEditor';
import { ValidatedInput } from '../atoms/ValidatedInput';
import { DebouncedField } from '../atoms/DebouncedField';
import { AnnotationCreateForm } from '../atoms/AnnotationCreateForm';
import { AnnotationsTabPanel } from '../molecules/AnnotationsTabPanel';
import { useResizablePanel } from '@/src/shared/lib/hooks/useResizablePanel';
import { RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';
import { IIIF_SPECS } from '@/src/shared/constants/iiifSpecs';
// TODO: [FSD] Proper fix is to receive `t` via props from FieldModeTemplate
// eslint-disable-next-line no-restricted-imports
import { useTerminology } from '@/src/app/providers/useTerminology';
import { isPropertyAllowed } from '@/utils/iiifSchema';
import { suggestBehaviors } from '@/utils/iiifBehaviors';
import { resolvePreviewUrl } from '@/utils/imageSourceResolver';
import { usePersistedTab } from '@/src/shared/lib/hooks/usePersistedTab';
import { useInspectorValidation } from '../../model/useInspectorValidation';
import { useMetadataEditor } from '@/src/shared/lib/hooks/useMetadataEditor';
import { useContextualStyles } from '@/src/shared/lib/hooks/useContextualStyles';
import { StructureTabPanel } from '../molecules/StructureTabPanel';
import { RightsSelector } from '../atoms/RightsSelector';
import { BehaviorSelector } from '../atoms/BehaviorSelector';
import { PropertyInput } from '../atoms/PropertyInput';
import { PropertyLabel } from '../atoms/PropertyLabel';
import { ViewingDirectionSelector } from '../atoms/ViewingDirectionSelector';
import { LocationPickerModal } from '../molecules/LocationPickerModal';
import { SelectField } from '@/src/shared/ui/molecules/SelectField';
import { BEHAVIOR_OPTIONS, getConflictingBehaviors, SUPPORTED_LANGUAGES } from '@/src/shared/constants/iiif';

/** Time range for audio/video annotations */
interface TimeRange {
  start: number;
  end?: number;
}

/** Map SUPPORTED_LANGUAGES to SelectField options format */
const LANGUAGE_SELECT_OPTIONS = SUPPORTED_LANGUAGES.map(l => ({
  value: l.code,
  label: l.nativeName ? `${l.label} (${l.nativeName})` : l.label,
}));

/** Detect appropriate input type for a metadata key */
function getMetadataInputType(key: string): 'date' | 'location' | 'language' | 'url' | 'rights' | 'text' {
  const k = key.toLowerCase().trim();
  if (['date', 'created', 'modified', 'issued', 'navdate'].includes(k)) return 'date';
  if (['location', 'gps', 'place', 'coverage', 'coordinates'].includes(k)) return 'location';
  if (['language', 'lang'].includes(k)) return 'language';
  if (['url', 'uri', 'link', 'homepage', 'source', 'identifier'].includes(k) || k.startsWith('http')) return 'url';
  if (['rights', 'license'].includes(k)) return 'rights';
  return 'text';
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
  /** Callback to delete an annotation by ID */
  onDeleteAnnotation?: (annotationId: string) => void;
  /** Callback to edit an annotation's text */
  onEditAnnotation?: (annotationId: string, newText: string) => void;
  /** Callback to start annotation mode */
  onStartAnnotation?: () => void;
}

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
  onDeleteAnnotation,
  onEditAnnotation,
  onStartAnnotation,
}) => {
  // Use resourceProp directly — the React.memo boundary already prevents
  // unnecessary re-renders. The old useMemo([id, type]) was too aggressive
  // and caused stale reads of metadata/annotations after edits.
  const resource = resourceProp;

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
    if (forceTab && ALLOWED_TABS.includes(forceTab as typeof ALLOWED_TABS[number])) {
      setTab(forceTab);
    }
  }, [forceTab, setTab]);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [locationPickerIndex, setLocationPickerIndex] = useState<number | null>(null);

  // Click-outside handler for Add Metadata dropdown
  const addMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showAddMenu) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showAddMenu]);

  // Validation lifecycle (run + fix + fixAll)
  const { issues: validationIssues, fixIssue, fixAll } = useInspectorValidation(resource);

  // Metadata CRUD
  const { updateField, addField, removeField, availableProperties } = useMetadataEditor(
    resource, settings.language, onUpdateResource
  );

  // Helper to get validation status for a specific field
  const getFieldValidation = useCallback((fieldName: string) => {
    const fieldIssues = validationIssues.filter(i => i.field === fieldName);
    if (fieldIssues.length === 0) return { status: 'pristine' as const };
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
      hasDuration: !!(resource as unknown as Record<string, unknown>).duration,
      hasPageSequence: isManifest(resource) && (resource as IIIFManifest).items?.length > 1,
      hasWidth: !!(resource as unknown as Record<string, unknown>).width,
      hasHeight: !!(resource as unknown as Record<string, unknown>).height,
    };
    const suggestions = suggestBehaviors(resource.type, characteristics);
    if (suggestions.length > 0) {
      onUpdateResource({ behavior: Array.from(new Set([...(resource.behavior || []), ...suggestions])) });
    }
  };

  const label = getIIIFValue(resource.label, settings.language) || '';
  const summary = getIIIFValue(resource.summary, settings.language) || '';
  const imageUrl = resolvePreviewUrl(resource, 400);

  // Determine available tabs
  const availableTabs = ['metadata', 'annotations'];
  if (resource && isManifest(resource)) availableTabs.push('structure');
  availableTabs.push('learn');
  if (designTab) availableTabs.push('design');

  const inspectorStyles = isMobile
    ? `fixed inset-0 z-[1100] bg-nb-white flex flex-col animate-slide-in-right`
    : `bg-nb-white border-l-4 border-l-mode-accent-border flex flex-col h-full z-30 animate-slide-in-right shrink-0 relative panel-fixed inspector-panel`;

  return (
    <aside
      className={inspectorStyles}
      style={isMobile ? undefined : panelStyle}
      aria-label="Resource Inspector"
    >
      {/* Header */}
      <div className={`h-header-compact flex items-center justify-between px-4 border-b shrink-0 ${cx.headerBg} ${cx.text}`}>
        <div className="flex items-center gap-2">
          {resource.provider?.[0] && (() => {
            const provider = resource.provider[0] as Record<string, unknown>;
            const logoUrl = (provider.logo as Array<{id: string}>)?.[0]?.id;
            const providerLabel = getIIIFValue(provider.label as Record<string, string[]>) || 'Provider';
            return logoUrl ? (
              <img
                src={logoUrl}
                alt={providerLabel}
                title={providerLabel}
                className="h-5 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : null;
          })()}
          <Icon name={config.icon} className={`${config.colorClass} text-sm`}/>
          <span className={`text-nb-xs font-bold uppercase tracking-wider font-mono ${settings.fieldMode ? cx.accent : config.colorClass}`}>
            {t('Inspector')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton item={resource} fieldMode={settings.fieldMode} />
          <Button variant="ghost" size="bare"
            aria-label="Close Inspector"
            onClick={onClose}
            className={`p-2 ${settings.fieldMode ? 'hover:bg-nb-black' : 'hover:bg-nb-cream'}`}
          >
            <Icon name="close"/>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Inspector tabs" className={`flex px-2 gap-1 border-b shrink-0 ${settings.fieldMode ? `bg-nb-black ${cx.border}` : 'bg-nb-white'}`}>
        {availableTabs.map(t => (
          <Button variant="ghost" size="bare"
            key={t}
            className={`py-3 px-3 text-nb-caption font-bold uppercase tracking-wider font-mono transition-nb border-b-2 ${
              tab === t ? cx.active : cx.inactive
            }`}
            onClick={() => setTab(t as typeof ALLOWED_TABS[number])}
            aria-selected={tab === t}
            role="tab"
          >
            {t === 'annotations' ? (
              <span className="flex items-center justify-center gap-1">
                {t}
                {annotations.length > 0 && (
                  <span className={`text-[8px] px-1.5 py-0.5 ${settings.fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}>
                    {annotations.length}
                  </span>
                )}
                {annotationModeActive && (
                  <span className="w-1.5 h-1.5 bg-mode-accent animate-pulse ml-1" />
                )}
              </span>
            ) : t}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0 ${cx.pageBg}`}>
        {tab === 'metadata' && (
          <div role="tabpanel" className="space-y-4">
            {/* Validation Status */}
            {validationIssues.length > 0 && (
              <div className={`p-3 border text-[10px] space-y-2 ${cx.warningBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-nb-orange">
                    <Icon name="report_problem" className="text-sm" />
                    <span>Issues ({validationIssues.length})</span>
                  </div>
                  {validationIssues.some(i => i.autoFixable) && (
                    <Button variant="ghost" size="bare"
                      onClick={() => { const fixed = fixAll(); if (fixed) onUpdateResource(fixed); }}
                      className={`text-[8px] font-bold uppercase px-2 py-1 ${settings.fieldMode ? 'bg-nb-green text-nb-green' : 'bg-nb-green/20 text-nb-green'}`}
                    >
                      Fix All
                    </Button>
                  )}
                </div>
                {validationIssues.map((issue) => (
                  <div key={issue.id} className={`flex items-start gap-2 text-[10px] ${issue.severity === 'error' ? 'text-nb-red' : (settings.fieldMode ? 'text-nb-yellow/40' : 'text-nb-orange')}`}>
                    <span className="shrink-0">{issue.title}</span>
                    {issue.autoFixable && (
                      <Button variant="ghost" size="bare" onClick={() => { const fixed = fixIssue(issue.id); if (fixed) onUpdateResource(fixed); }} className="text-[8px] text-nb-green hover:underline">Fix</Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {imageUrl && (
              <div className={`aspect-video overflow-hidden border ${settings.fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-cream border-nb-black/20'}`}>
                <img src={imageUrl} className="w-full h-full object-contain" alt="Preview" />
              </div>
            )}

            {/* Label & Summary */}
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
                <div className="relative" ref={addMenuRef}>
                  <Button variant="ghost" size="bare"
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className={`text-[10px] font-bold uppercase flex items-center gap-1 ${cx.accent}`}
                  >
                    Add <Icon name="add" className="text-[10px]"/>
                  </Button>
                  {showAddMenu && (
                    <div className={`absolute right-0 top-full mt-1 border shadow-brutal py-2 z-50 min-w-[160px] max-h-[250px] overflow-y-auto ${
                      settings.fieldMode
                        ? 'bg-nb-black border-2 border-nb-yellow'
                        : 'bg-nb-white border border-nb-black/20'
                    }`}>
                      {availableProperties.map(p => (
                        <Button variant="ghost" size="bare"
                          key={p}
                          onClick={() => { addField(p); setShowAddMenu(false); }}
                          className={`w-full px-3 py-1.5 text-left text-[10px] font-bold ${
                            settings.fieldMode
                              ? 'text-nb-yellow/80 hover:bg-nb-yellow/20'
                              : 'text-nb-black/60 hover:bg-nb-blue/10'
                          }`}
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
                  const inputType = getMetadataInputType(mKey);
                  return (
                    <div key={idx} className={`group relative p-3 border ${settings.fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/20'}`}>
                      <DebouncedField
                        className={`w-full text-[10px] font-bold uppercase bg-transparent outline-none mb-1 border-b ${
                          settings.fieldMode ? 'text-nb-yellow/60 border-nb-yellow/30' : 'text-nb-black/50 border-transparent'
                        }`}
                        value={mKey}
                        onChange={(val: string) => updateField(idx, val, mVal)}
                      />
                      {inputType === 'date' ? (
                        <PropertyInput
                          type="datetime-local"
                          value={mVal ? mVal.slice(0, 16) : ''}
                          onChange={(val: string) => updateField(idx, mKey, val ? new Date(val).toISOString() : '')}
                          fieldMode={settings.fieldMode}
                          cx={cx}
                        />
                      ) : inputType === 'location' ? (
                        <PropertyInput
                          type="text"
                          value={mVal}
                          onChange={(val: string) => updateField(idx, mKey, val)}
                          isLocationField
                          onLocationPick={() => setLocationPickerIndex(idx)}
                          fieldMode={settings.fieldMode}
                          cx={cx}
                          placeholder="lat, lng or place name"
                        />
                      ) : inputType === 'language' ? (
                        <SelectField
                          value={mVal}
                          onChange={(val: string) => updateField(idx, mKey, val)}
                          options={LANGUAGE_SELECT_OPTIONS}
                          placeholder="Select language..."
                          fieldMode={settings.fieldMode}
                        />
                      ) : inputType === 'url' ? (
                        <PropertyInput
                          type="url"
                          value={mVal}
                          onChange={(val: string) => updateField(idx, mKey, val)}
                          fieldMode={settings.fieldMode}
                          cx={cx}
                          placeholder="https://..."
                        />
                      ) : inputType === 'rights' ? (
                        <RightsSelector
                          value={mVal}
                          onChange={(val: string) => updateField(idx, mKey, val)}
                          fieldMode={settings.fieldMode}
                          showLabel={false}
                        />
                      ) : (
                        <DebouncedField
                          className={`w-full text-xs bg-transparent outline-none ${settings.fieldMode ? 'text-white' : 'text-nb-black'}`}
                          value={mVal}
                          onChange={(val: string) => updateField(idx, mKey, val)}
                        />
                      )}
                      <Button variant="ghost" size="bare"
                        onClick={() => removeField(idx)}
                        className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 ${
                          settings.fieldMode ? 'text-nb-yellow/40 hover:text-nb-red' : 'text-nb-black/30 hover:text-nb-red'
                        }`}
                      >
                        <Icon name="close" className="text-xs"/>
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Location Picker Modal for metadata fields */}
              {locationPickerIndex !== null && (
                <LocationPickerModal
                  isOpen={true}
                  initialValue={getIIIFValue((resource.metadata || [])[locationPickerIndex]?.value, settings.language) || ''}
                  onSave={(val) => {
                    const mKey = getIIIFValue((resource.metadata || [])[locationPickerIndex]?.label, settings.language);
                    updateField(locationPickerIndex, mKey, val);
                    setLocationPickerIndex(null);
                  }}
                  onClose={() => setLocationPickerIndex(null)}
                />
              )}
            </div>

            {/* Rights */}
            {isAllowed('rights') && (
              <div className={`pt-4 border-t ${cx.divider}`}>
                <RightsSelector
                  value={resource.rights || ''}
                  onChange={(val) => onUpdateResource({ rights: val || undefined })}
                  fieldMode={settings.fieldMode}
                />
              </div>
            )}

            {/* Geo Location */}
            {(resource as unknown as Record<string, unknown>).navPlace && (
              <div className={`pt-4 border-t ${cx.divider}`}>
                <div className="flex justify-between items-center mb-2">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${cx.label}`}>Location</label>
                  <Button variant="ghost" size="bare"
                    onClick={() => onUpdateResource({ navPlace: undefined } as Partial<IIIFItem>)}
                    className="text-[10px] text-nb-red hover:text-nb-red font-bold uppercase"
                  >
                    Remove
                  </Button>
                </div>
                <div className={`border overflow-hidden ${settings.fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/20'}`}>
                  <GeoEditor
                    item={resource}
                    onChange={(navPlace) => onUpdateResource({ navPlace } as Partial<IIIFItem>)}
                    height={150}
                    editable={true}
                  />
                </div>
              </div>
            )}

            {/* Behaviors */}
            {isAllowed('behavior') && (
              <div className={`pt-4 border-t ${cx.divider}`}>
                <div className="flex justify-end mb-2">
                  <Button variant="ghost" size="bare"
                    onClick={handleSuggestBehaviors}
                    className={`text-[9px] font-bold uppercase px-2 py-1 border ${settings.fieldMode ? 'border-nb-yellow/30 text-nb-yellow' : 'border-nb-black/20 text-nb-blue'}`}
                  >
                    Auto-Suggest
                  </Button>
                </div>
                <BehaviorSelector
                  options={BEHAVIOR_OPTIONS[resource.type] || []}
                  selected={resource.behavior || []}
                  onChange={(selected) => onUpdateResource({ behavior: selected.length ? selected : undefined })}
                  getConflicts={getConflictingBehaviors}
                  fieldMode={settings.fieldMode}
                />
              </div>
            )}

            {/* Navigation Date */}
            {isAllowed('navDate') && resource.navDate !== undefined && (
              <div className={`pt-4 border-t ${cx.divider}`}>
                <PropertyLabel label="Navigation Date" dcHint="navDate" fieldMode={settings.fieldMode} cx={cx} />
                <PropertyInput
                  type="datetime-local"
                  value={resource.navDate ? resource.navDate.slice(0, 16) : ''}
                  onChange={(val) => onUpdateResource({ navDate: val ? new Date(val).toISOString() : undefined })}
                  fieldMode={settings.fieldMode}
                  cx={cx}
                />
              </div>
            )}

            {/* Viewing Direction */}
            {isAllowed('viewingDirection') && resource.viewingDirection !== undefined && (
              <div className={`pt-4 border-t ${cx.divider}`}>
                <ViewingDirectionSelector
                  value={resource.viewingDirection || 'left-to-right'}
                  onChange={(val) => onUpdateResource({ viewingDirection: val as typeof resource.viewingDirection })}
                  fieldMode={settings.fieldMode}
                />
              </div>
            )}

            {/* Required Statement */}
            {isAllowed('requiredStatement') && resource.requiredStatement !== undefined && (
              <div className={`pt-4 border-t ${cx.divider}`}>
                <PropertyLabel
                  label="Required Statement"
                  dcHint="requiredStatement"
                  fieldMode={settings.fieldMode}
                  cx={cx}
                />
                <div className="space-y-2 mt-1">
                  <PropertyInput
                    type="text"
                    placeholder="Label (e.g., Attribution)"
                    value={getIIIFValue(resource.requiredStatement?.label) || ''}
                    onChange={(val) => {
                      const current = resource.requiredStatement || { label: { none: [''] }, value: { none: [''] } };
                      onUpdateResource({ requiredStatement: { ...current, label: { none: [val] } } });
                    }}
                    fieldMode={settings.fieldMode}
                    cx={cx}
                  />
                  <PropertyInput
                    type="text"
                    placeholder="Value (e.g., Provided by Example Museum)"
                    value={getIIIFValue(resource.requiredStatement?.value) || ''}
                    onChange={(val) => {
                      const current = resource.requiredStatement || { label: { none: ['Attribution'] }, value: { none: [''] } };
                      onUpdateResource({ requiredStatement: { ...current, value: { none: [val] } } });
                    }}
                    fieldMode={settings.fieldMode}
                    cx={cx}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Annotations Tab - now uses extracted molecules */}
        {tab === 'annotations' && (
          <div role="tabpanel" className="space-y-4">
            {annotationModeActive && (
              <AnnotationCreateForm
                fieldMode={settings.fieldMode}
                mediaType={mediaType}
                annotationDrawingState={annotationDrawingState}
                timeRange={timeRange}
                currentPlaybackTime={currentPlaybackTime}
                annotationMotivation={annotationMotivation}
                onAnnotationMotivationChange={onAnnotationMotivationChange}
                annotationText={annotationText}
                onAnnotationTextChange={onAnnotationTextChange}
                onSaveAnnotation={onSaveAnnotation}
                onClearAnnotation={onClearAnnotation}
              />
            )}

            <AnnotationsTabPanel
              annotations={annotations}
              language={settings.language}
              selectedAnnotationId={selectedAnnotationId ?? undefined}
              cx={cx}
              fieldMode={settings.fieldMode}
              onSelectAnnotation={(anno) => setSelectedAnnotationId(
                selectedAnnotationId === anno.id ? null : anno.id
              )}
              onDeleteAnnotation={onDeleteAnnotation ? (anno) => onDeleteAnnotation(anno.id) : undefined}
              onEditAnnotation={onEditAnnotation ? (anno, text) => onEditAnnotation(anno.id, text) : undefined}
              onAddAnnotation={onStartAnnotation}
            />
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
            <div className={`border p-4 ${settings.fieldMode ? 'bg-nb-black border-nb-black' : `${config.bgClass} ${config.borderClass}`}`}>
              <h3 className={`text-sm font-bold uppercase mb-2 flex items-center gap-2 ${settings.fieldMode ? 'text-nb-yellow' : config.colorClass}`}>
                <Icon name={config.icon} className="text-xs" /> {resource.type} Model
              </h3>
              <p className={`text-xs leading-relaxed font-medium mb-3 ${settings.fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/60'}`}>{spec.desc}</p>
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
            transition-nb
            hover:bg-nb-black/20
            ${isResizing ? (settings.fieldMode ? 'bg-nb-yellow/30' : 'bg-iiif-blue/30') : ''}
            ${handleProps.className}
          `}
        >
          <div
            className={`
              absolute left-0 top-1/2 -translate-y-1/2
              w-1 h-12
              transition-nb
              opacity-0 group-hover:opacity-100 group-focus:opacity-100
              ${isResizing
                ? (settings.fieldMode ? 'bg-nb-yellow opacity-100' : 'bg-iiif-blue opacity-100')
                : (settings.fieldMode ? 'bg-nb-yellow/60 group-hover:bg-nb-yellow' : 'bg-nb-black/40 group-hover:bg-iiif-blue')
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
  // resource uses referential equality so metadata/annotation edits trigger re-render
  return prev.resource === next.resource &&
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
         prev.forceTab === next.forceTab &&
         prev.annotations === next.annotations;
});
