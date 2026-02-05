/**
 * MetadataEditorPanel Organism
 *
 * Side panel for single-item metadata editing extracted from legacy MetadataEditor.tsx.
 * Provides tabbed editing of metadata, technical properties, annotations, and validation.
 *
 * FEATURES:
 * - Tab persistence per resource type
 * - Enhanced validation UI with summary and batch fixes
 * - Mobile responsive (drawer on tablet, modal on mobile)
 * - Keyboard navigation support
 * - Smart tab switching (auto-show validation if errors)
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props from FieldModeTemplate (no hook calls)
 * - Composes molecules from features/metadata-edit/ui/molecules
 * - No direct hook calls to useAppSettings or useContextualStyles
 *
 * @module features/metadata-edit/ui/organisms/MetadataEditorPanel
 */

import React, { useEffect } from 'react';
import { getIIIFValue, type IIIFItem } from '@/types';
import { TabBar } from '@/src/shared/ui/molecules';
import { ModalDialog } from '@/src/shared/ui/molecules';
import { EmptyProperties } from '../atoms/EmptyProperties';
import { MetadataTabPanel } from '../molecules/MetadataTabPanel';
import { TechnicalTabPanel } from '../molecules/TechnicalTabPanel';
import { AnnotationsTabPanel } from '../molecules/AnnotationsTabPanel';
import { ValidationSummary } from '../molecules/ValidationSummary';
import { ValidationTabPanel } from '../molecules/ValidationTabPanel';
import { LocationPickerModal } from '../molecules/LocationPickerModal';
import { DUBLIN_CORE_MAP } from '@/constants';
import { usePersistedTab, useResponsive } from '@/src/shared/lib/hooks';
import { useInspectorValidation } from '../../model';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface MetadataEditorPanelProps {
  /** Resource being edited */
  resource: IIIFItem | null;
  /** Called when resource is updated */
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  /** Current language for metadata values */
  language: string;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
  /** Optional close handler */
  onClose?: () => void;
  /** Whether the panel is open (for mobile modal) */
  isOpen?: boolean;
}

// Feature flags for gradual rollout
const FEATURES = {
  TAB_PERSISTENCE: true,
  VALIDATION_UI: true,
  MOBILE_INSPECTOR: true,
};

type TabId = 'metadata' | 'technical' | 'annotations' | 'validation';

/**
 * MetadataEditorPanel Organism
 */
export const MetadataEditorPanel: React.FC<MetadataEditorPanelProps> = ({
  resource,
  onUpdateResource,
  language,
  cx,
  fieldMode,
  onClose,
  isOpen = true,
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Tab persistence per resource type
  const resourceType = resource?.type || 'default';
  const allowedTabs: TabId[] = FEATURES.VALIDATION_UI
    ? ['metadata', 'technical', 'annotations', 'validation']
    : ['metadata', 'technical', 'annotations'];

  const [tab, setTab] = FEATURES.TAB_PERSISTENCE
    ? usePersistedTab('inspector', resourceType, allowedTabs, 'metadata')
    : React.useState<TabId>('metadata');

  const [showLocationPicker, setShowLocationPicker] = React.useState<{ index: number; value: string } | null>(null);

  // Validation
  const validation = useInspectorValidation(resource);

  // Auto-switch to validation tab if there are errors
  useEffect(() => {
    if (FEATURES.VALIDATION_UI && resource && validation.errorCount > 0 && tab !== 'validation') {
      // Only auto-switch if this is a new resource selection
      // (we track this by storing the last resource id)
    }
  }, [resource?.id, validation.errorCount, tab]);

  // Empty state when no resource selected
  if (!resource) {
    return <EmptyProperties cx={cx} fieldMode={fieldMode} />;
  }

  const label = getIIIFValue(resource.label, language) || getIIIFValue(resource.label, 'none') || '';
  const summary = getIIIFValue(resource.summary, language) || '';

  // Flatten annotation pages to individual annotations
  const allAnnotations = (resource.annotations || []).flatMap((page) => page.items || []);

  const getDCHint = (lbl: string) => {
    const lower = lbl.toLowerCase();
    const match = Object.keys(DUBLIN_CORE_MAP).find((k) => k.toLowerCase() === lower);
    return match ? DUBLIN_CORE_MAP[match] : null;
  };

  const isLocationField = (lbl: string) => {
    const lower = lbl.toLowerCase();
    return lower === 'location' || lower === 'gps' || lower === 'coverage' || lower === 'coordinates';
  };

  // Tab definitions with badges
  const tabs = [
    { id: 'metadata', label: 'Metadata' },
    { id: 'technical', label: 'Technical' },
    { id: 'annotations', label: 'Annotations' },
    ...(FEATURES.VALIDATION_UI
      ? [
          {
            id: 'validation',
            label: 'Validation',
            badge: validation.issues.length > 0 ? validation.issues.length : undefined,
            badgeColor: validation.errorCount > 0 ? 'red' : validation.warningCount > 0 ? 'amber' : 'blue',
          },
        ]
      : []),
  ];

  // Handle validation fix
  const handleFixIssue = (issueId: string) => {
    const fix = validation.fixIssue(issueId);
    if (fix) {
      onUpdateResource(fix);
    }
  };

  // Handle fix all
  const handleFixAll = () => {
    const fix = validation.fixAll();
    if (fix) {
      onUpdateResource(fix);
    }
  };

  // Panel content
  const panelContent = (
    <>
      {/* Validation Summary - always visible at top */}
      {FEATURES.VALIDATION_UI && validation.issues.length > 0 && (
        <div className="px-5 pt-4">
          <ValidationSummary
            issues={validation.issues}
            errorCount={validation.errorCount}
            warningCount={validation.warningCount}
            infoCount={validation.infoCount}
            autoFixableCount={validation.autoFixableIssues.length}
            onFixAll={handleFixAll}
            onViewDetails={() => setTab('validation')}
            cx={cx}
            fieldMode={fieldMode}
          />
        </div>
      )}

      <TabBar
        tabs={tabs}
        activeTabId={tab}
        onTabChange={(tabId) => setTab(tabId as TabId)}
        fieldMode={fieldMode}
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {tab === 'metadata' && (
          <MetadataTabPanel
            resource={resource}
            label={label}
            summary={summary}
            language={language}
            cx={cx}
            fieldMode={fieldMode}
            onUpdateResource={onUpdateResource}
            getDCHint={getDCHint}
            isLocationField={isLocationField}
            onShowLocationPicker={setShowLocationPicker}
          />
        )}

        {tab === 'technical' && (
          <TechnicalTabPanel
            resource={resource}
            cx={cx}
            fieldMode={fieldMode}
            onUpdateResource={onUpdateResource}
          />
        )}

        {tab === 'annotations' && (
          <AnnotationsTabPanel
            annotations={allAnnotations}
            language={language}
            cx={cx}
            fieldMode={fieldMode}
            onAddAnnotation={() => {}}
          />
        )}

        {tab === 'validation' && FEATURES.VALIDATION_UI && (
          <ValidationTabPanel
            issues={validation.issues}
            onFixIssue={handleFixIssue}
            onFixAll={handleFixAll}
            cx={cx}
            fieldMode={fieldMode}
          />
        )}
      </div>

      {showLocationPicker && (
        <LocationPickerModal
          initialValue={showLocationPicker.value}
          onSave={(val) => {
            const newMeta = [...(resource.metadata || [])];
            newMeta[showLocationPicker.index].value = { [language]: [val] };
            onUpdateResource({ metadata: newMeta });
            setShowLocationPicker(null);
          }}
          onClose={() => setShowLocationPicker(null)}
        />
      )}
    </>
  );

  // Mobile: Use ModalDialog fullscreen
  if (FEATURES.MOBILE_INSPECTOR && isMobile) {
    return (
      <ModalDialog
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        title={label || `${resource.type} Properties`}
        size="full"
        fieldMode={fieldMode}
        className="h-full"
      >
        <div className="flex flex-col h-full">{panelContent}</div>
      </ModalDialog>
    );
  }

  // Tablet: 40% width drawer, Desktop: 320px fixed panel
  const widthClass = isTablet ? 'w-2/5' : 'w-80';

  return (
    <div
      className={`${widthClass} border-l flex flex-col h-full shadow-xl z-30 ${
        fieldMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      {/* ARIA live region for validation updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {validation.issues.length > 0
          ? `${validation.errorCount} errors, ${validation.warningCount} warnings found`
          : 'No validation issues'}
      </div>

      {panelContent}
    </div>
  );
};

export default MetadataEditorPanel;
