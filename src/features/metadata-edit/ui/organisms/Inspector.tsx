
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppSettings, getIIIFValue, IIIFAnnotation, IIIFItem, IIIFManifest, isManifest } from '@/src/shared/types';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { MuseumLabel } from '@/src/shared/ui/molecules/MuseumLabel';
import { ShareButton } from '../atoms/ShareButton';
import { MetadataFieldsPanel } from '../molecules/MetadataFieldsPanel';
import { AnnotationCreateForm } from '../atoms/AnnotationCreateForm';
import { AnnotationsTabPanel } from '../molecules/AnnotationsTabPanel';
import { useResizablePanel } from '@/src/shared/lib/hooks/useResizablePanel';
import { RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';
import { IIIF_SPECS } from '@/src/shared/constants/iiifSpecs';
// TODO: [FSD] Proper fix is to receive `t` via props from FieldModeTemplate
// eslint-disable-next-line no-restricted-imports
import { useTerminology } from '@/src/app/providers/useTerminology';
import { resolvePreviewUrl } from '@/utils/imageSourceResolver';
import { usePersistedTab } from '@/src/shared/lib/hooks/usePersistedTab';
import { useInspectorValidation } from '../../model/useInspectorValidation';
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
  /** Callback to delete an annotation by ID */
  onDeleteAnnotation?: (annotationId: string) => void;
  /** Callback to edit an annotation's text */
  onEditAnnotation?: (annotationId: string, newText: string) => void;
  /** Callback to start annotation mode */
  onStartAnnotation?: () => void;
  /** External annotation selection (e.g., from viewer click) — syncs to internal selectedAnnotationId */
  selectedAnnotationId?: string | null;
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
  selectedAnnotationId: selectedAnnotationIdProp,
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

  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Sync external annotation selection (from viewer click) to internal state
  useEffect(() => {
    if (selectedAnnotationIdProp !== undefined) {
      setSelectedAnnotationId(selectedAnnotationIdProp);
    }
  }, [selectedAnnotationIdProp]);

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

  const label = getIIIFValue(resource.label, settings.language) || '';
  const summary = getIIIFValue(resource.summary, settings.language) || '';
  const imageUrl = resolvePreviewUrl(resource, 400);

  // Determine available tabs
  const availableTabs = ['metadata', 'annotations'];
  if (resource && isManifest(resource)) availableTabs.push('structure');
  availableTabs.push('learn');
  if (designTab) availableTabs.push('design');

  // Tab badge computation
  const getTabBadge = (tabName: string): { count?: number; dotColor?: string } => {
    switch (tabName) {
      case 'metadata': {
        const errorCount = validationIssues.filter(i => i.severity === 'error').length;
        if (errorCount > 0) return { count: errorCount, dotColor: 'bg-nb-red' };
        if (validationIssues.length > 0) return { count: validationIssues.length };
        return {};
      }
      case 'annotations':
        return annotations.length > 0 ? { count: annotations.length } : {};
      case 'structure': {
        const rangeCount = isManifest(resource)
          ? (resource as IIIFManifest).structures?.length || 0
          : 0;
        return rangeCount > 0 ? { count: rangeCount } : {};
      }
      default:
        return {};
    }
  };

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
        {availableTabs.map(tabName => {
          const badge = getTabBadge(tabName);
          return (
            <Button variant="ghost" size="bare"
              key={tabName}
              className={`py-3 px-3 text-nb-caption font-bold uppercase tracking-wider font-mono transition-nb border-b-2 ${
                tab === tabName ? cx.active : cx.inactive
              }`}
              onClick={() => setTab(tabName as typeof ALLOWED_TABS[number])}
              aria-selected={tab === tabName}
              role="tab"
            >
              <span className="flex items-center justify-center gap-1">
                {tabName}
                {badge.count !== undefined && badge.count > 0 && (
                  <span className={`text-[8px] px-1.5 py-0.5 ${settings.fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}>
                    {badge.count}
                  </span>
                )}
                {badge.dotColor && (
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor} shrink-0`} />
                )}
                {tabName === 'annotations' && annotationModeActive && (
                  <span className="w-1.5 h-1.5 bg-mode-accent animate-pulse ml-1" />
                )}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0 ${cx.pageBg}`}>
        {tab === 'metadata' && (
          <MetadataFieldsPanel
            resource={resource}
            onUpdateResource={onUpdateResource}
            language={settings.language}
            fieldMode={settings.fieldMode}
            cx={cx}
            label={label}
            summary={summary}
            imageUrl={imageUrl}
            validationIssues={validationIssues}
            fixIssue={fixIssue}
            fixAll={fixAll}
            labelValidation={labelValidation}
            summaryValidation={summaryValidation}
            getFieldValidation={getFieldValidation}
            updateField={updateField}
            addField={addField}
            removeField={removeField}
            availableProperties={availableProperties}
            t={t}
          />
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
              onBulkDeleteAnnotations={onDeleteAnnotation ? (ids) => { ids.forEach(id => onDeleteAnnotation(id)); } : undefined}
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
         prev.annotations === next.annotations &&
         prev.selectedAnnotationId === next.selectedAnnotationId;
});
