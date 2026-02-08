/**
 * FilterPanel Widget
 *
 * Composes: ArchiveView (from archive) + SearchView (from search)
 *
 * This widget combines archive browsing with search functionality
 * for a unified content discovery experience.
 *
 * WIDGET COMPOSITION RULES:
 * - Pure composition only - no business logic
 * - Imports organisms from features (archive, search)
 * - Receives cx and fieldMode via props from template
 * - Exists strictly between Organisms and Pages
 */

import React, { useState } from 'react';
import type { IIIFItem } from '@/src/shared/types';
import { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import { ArchiveView } from '@/src/features/archive/ui/organisms/ArchiveView';
import { SearchView } from '@/src/features/search/ui/organisms/SearchView';
import { Button } from '@/src/shared/ui/atoms';

export interface FilterPanelProps {
  /** Root IIIF item (Collection or Manifest) */
  root: IIIFItem | null;
  /** Called when a single item is selected */
  onSelect: (item: IIIFItem) => void;
  /** Called when an item is opened */
  onOpen: (item: IIIFItem) => void;
  /** Called with selected IDs for batch editing */
  onBatchEdit: (ids: string[]) => void;
  /** Called when root is updated */
  onUpdate?: (newRoot: IIIFItem) => void;
  /** Validation issues keyed by item ID */
  validationIssues?: Record<string, ValidationIssue[]>;
  /** Reveal an item in a specific mode */
  onReveal?: (id: string, mode: 'collections' | 'viewer' | 'archive') => void;
  /** Called when selection should be sent to catalog */
  onCatalogSelection?: (ids: string[]) => void;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    textMuted: string;
    input: string;
    label: string;
    active: string;
    inactive: string;
    warningBg: string;
    pageBg: string;
  };
  /** Current field mode */
  fieldMode: boolean;
  /** Terminology function from template */
  t: (key: string) => string;
  /** Whether user is in advanced mode */
  isAdvanced: boolean;
  /** Callback when a search result is selected */
  onSearchSelect: (id: string) => void;
  /** Optional callback to reveal item on map */
  onRevealMap?: (id: string) => void;
  /** Initial active view mode */
  defaultView?: 'archive' | 'search';
  /** Active view (controlled) */
  activeView?: 'archive' | 'search';
  /** Callback when view changes */
  onViewChange?: (view: 'archive' | 'search') => void;
}

/**
 * FilterPanel Widget
 *
 * Composes archive browsing with search capabilities for content discovery.
 * This widget sits between organisms and pages, combining archive and search features.
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode, t, isAdvanced }) => (
 *     <FilterPanel
 *       root={root}
 *       onSelect={handleSelect}
 *       onOpen={handleOpen}
 *       onBatchEdit={handleBatchEdit}
 *       onUpdate={handleUpdate}
 *       validationIssues={validationIssues}
 *       onReveal={handleReveal}
 *       onCatalogSelection={handleCatalog}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *       t={t}
 *       isAdvanced={isAdvanced}
 *       onSearchSelect={handleSearchSelect}
 *       onRevealMap={handleRevealMap}
 *       defaultView="archive"
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  root,
  onSelect,
  onOpen,
  onBatchEdit,
  onUpdate,
  validationIssues,
  onReveal,
  onCatalogSelection,
  cx,
  fieldMode,
  t,
  isAdvanced,
  onSearchSelect,
  onRevealMap,
  defaultView = 'archive',
  activeView: controlledActiveView,
  onViewChange,
}) => {
  const [internalActiveView, setInternalActiveView] = useState<'archive' | 'search'>(defaultView);
  const isControlled = controlledActiveView !== undefined;
  const activeView = isControlled ? controlledActiveView : internalActiveView;
  const setActiveView = (view: 'archive' | 'search') => {
    if (!isControlled) {
      setInternalActiveView(view);
    }
    onViewChange?.(view);
  };

  return (
    <div className="flex flex-col h-full">
      {/* View Toggle */}
      <div className="flex border-b border-nb-black/20">
        <Button
          onClick={() => setActiveView('archive')}
          variant={activeView === 'archive' ? 'primary' : 'ghost'}
          size="sm"
          fullWidth
          style={{
            borderRadius: 0,
            borderBottom: activeView === 'archive' ? '2px solid currentColor' : 'none',
          }}
          aria-pressed={activeView === 'archive'}
        >
          {t('archive') || 'Archive'}
        </Button>
        <Button
          onClick={() => setActiveView('search')}
          variant={activeView === 'search' ? 'primary' : 'ghost'}
          size="sm"
          fullWidth
          style={{
            borderRadius: 0,
            borderBottom: activeView === 'search' ? '2px solid currentColor' : 'none',
          }}
          aria-pressed={activeView === 'search'}
        >
          {t('search') || 'Search'}
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'archive' ? (
          <ArchiveView
            root={root}
            onSelect={onSelect}
            onOpen={onOpen}
            onBatchEdit={onBatchEdit}
            onUpdate={onUpdate}
            validationIssues={validationIssues}
            onReveal={onReveal}
            onCatalogSelection={onCatalogSelection}
            cx={cx}
            fieldMode={fieldMode}
            t={t}
            isAdvanced={isAdvanced}
          />
        ) : (
          <SearchView
            root={root}
            onSelect={onSearchSelect}
            onRevealMap={onRevealMap}
            cx={{
              surface: cx.surface,
              text: cx.text,
              accent: cx.accent,
              border: cx.border,
              divider: cx.divider,
              headerBg: cx.headerBg,
              textMuted: cx.textMuted,
              input: cx.input,
              label: cx.label,
              active: cx.active,
            }}
            fieldMode={fieldMode}
            t={t}
          />
        )}
      </div>
    </div>
  );
};

export default FilterPanel;
