/**
 * ViewRouter - Conditional View Rendering
 *
 * Extracts the view switching logic from App.tsx for cleaner separation.
 * Wraps each view in an ErrorBoundary with appropriate fallback.
 *
 * Phase 3 Update: Supports 3-mode consolidation (workspace/detail/preview)
 * with progressive disclosure abstraction levels.
 */

import React from 'react';
import { AppMode, AppSettings, CoreViewMode, IIIFCanvas, IIIFItem, isCanvas } from '@/src/shared/types';
import { ValidationIssue } from '../services/validator';
import { ArchiveView } from './views/ArchiveView';
import { BoardView } from './views/BoardView';
import { Viewer } from './views/Viewer';
import { CollectionsView } from './views/CollectionsView';
import { SearchView } from './views/SearchView';
import { MetadataSpreadsheet } from './views/MetadataSpreadsheet';
import { TrashView } from './TrashView';
import { ErrorBoundary, ViewErrorFallback } from './ErrorBoundary';
import { CORE_VIEW_MODE_CONFIG, FEATURE_FLAGS, LEGACY_TO_CORE_MODE_MAP } from '@/src/shared/constants';

interface ViewRouterProps {
  currentMode: AppMode;
  root: IIIFItem | null;
  selectedItem: IIIFItem | null;
  selectedId: string | null;
  validationIssuesMap: Record<string, ValidationIssue[]>;
  fieldMode: boolean;
  abstractionLevel: 'simple' | 'standard' | 'advanced';
  isMobile: boolean;
  filterIds: string[] | null | undefined;
  preloadedManifest: string | null | undefined;

  // Callbacks
  onUpdateRoot: (root: IIIFItem) => void;
  onUpdateItem: (updates: Partial<IIIFItem>) => void;
  onSelect: (item: IIIFItem) => void;
  onSelectId: (id: string) => void;
  onOpenItem: (item: IIIFItem) => void;
  onBatchEdit: (ids: string[]) => void;
  onReveal: (id: string, mode: AppMode) => void;
  onSynthesize: (manifestId: string) => void;
  onCatalogSelection: (ids: string[]) => void;
  onClearFilter: () => void;
  onComposerOpened: () => void;
  onModeChange: (mode: AppMode) => void;
  onShowInspector: () => void;
  settings: AppSettings;
  
  // Phase 3: Core view mode (optional, defaults to legacy behavior)
  coreMode?: CoreViewMode;
}

export const ViewRouter: React.FC<ViewRouterProps> = ({
  currentMode,
  root,
  selectedItem,
  selectedId,
  validationIssuesMap,
  fieldMode,
  abstractionLevel,
  isMobile,
  filterIds,
  preloadedManifest,
  onUpdateRoot,
  onUpdateItem,
  onSelect,
  onSelectId,
  onOpenItem,
  onBatchEdit,
  onReveal,
  onSynthesize,
  onCatalogSelection,
  onClearFilter,
  onComposerOpened,
  onModeChange,
  onShowInspector,
  settings,
  coreMode,
}) => {
  const handleSwitchToArchive = () => onModeChange('archive');
  const handleSwitchToCollections = () => onModeChange('collections');

  // Phase 3: Use simplified 3-mode UI if enabled
  const useSimplifiedUI = FEATURE_FLAGS.USE_SIMPLIFIED_UI && coreMode;
  
  // Get core mode (either passed directly or mapped from legacy mode)
  const effectiveCoreMode: CoreViewMode = useSimplifiedUI
    ? coreMode!
    : (LEGACY_TO_CORE_MODE_MAP[currentMode] || 'workspace');
  
  // Get view config for current core mode (used for UI customization)
  // const viewConfig = CORE_VIEW_MODE_CONFIG[effectiveCoreMode];

  // Render workspace mode (consolidated archive + collections)
  const renderWorkspaceMode = () => (
    <>
      {/* Workspace mode combines Archive + Collections sidebar */}
      <ErrorBoundary
        key="workspace-view"
        fallback={(error, retry) => (
          <ViewErrorFallback
            viewName="Workspace"
            error={error}
            onRetry={retry}
            onSwitchView={handleSwitchToArchive}
          />
        )}
      >
        <div className="flex h-full">
          {/* Collections sidebar (simplified) */}
          <div className="w-64 border-r border-slate-200 flex-shrink-0">
            <CollectionsView
              root={root}
              onUpdate={onUpdateRoot}
              abstractionLevel={abstractionLevel}
              onReveal={onReveal}
              onSynthesize={onSynthesize}
              selectedId={selectedId}
              onSelect={(id) => {
                onSelectId(id);
                onShowInspector();
              }}
            />
          </div>
          {/* Main archive view */}
          <div className="flex-1">
            <ArchiveView
              root={root}
              onUpdate={onUpdateRoot}
              onSelect={(item) => {
                onSelect(item);
                if (!isMobile) onShowInspector();
              }}
              onOpen={onOpenItem}
              onBatchEdit={onBatchEdit}
              validationIssues={validationIssuesMap}
              onReveal={onReveal}
              onCatalogSelection={onCatalogSelection}
            />
          </div>
        </div>
      </ErrorBoundary>
    </>
  );

  // Render detail mode (inspector + board)
  const renderDetailMode = () => (
    <ErrorBoundary
      key="detail-view"
      fallback={(error, retry) => (
        <ViewErrorFallback
          viewName="Detail"
          error={error}
          onRetry={retry}
          onSwitchView={handleSwitchToArchive}
        />
      )}
    >
      <BoardView root={root} settings={settings} />
    </ErrorBoundary>
  );

  // Render preview mode (viewer + minimal UI)
  const renderPreviewMode = () => (
    <ErrorBoundary
      key="preview-view"
      fallback={(error, retry) => (
        <ViewErrorFallback
          viewName="Preview"
          error={error}
          onRetry={retry}
          onSwitchView={handleSwitchToArchive}
        />
      )}
    >
      <Viewer
        item={selectedItem && isCanvas(selectedItem) ? selectedItem : null}
        onUpdate={onUpdateItem}
        autoOpenComposer={preloadedManifest === selectedId}
        onComposerOpened={onComposerOpened}
      />
    </ErrorBoundary>
  );

  return (
    <>
      {/* Phase 3: Simplified 3-mode UI */}
      {useSimplifiedUI && effectiveCoreMode === 'workspace' && renderWorkspaceMode()}
      {useSimplifiedUI && effectiveCoreMode === 'detail' && renderDetailMode()}
      {useSimplifiedUI && effectiveCoreMode === 'preview' && renderPreviewMode()}
      
      {/* Legacy 6-mode UI (default when simplified UI is disabled) */}
      {!useSimplifiedUI && currentMode === 'archive' && (
        <ErrorBoundary
          key="archive-view"
          fallback={(error, retry) => (
            <ViewErrorFallback
              viewName="Archive"
              error={error}
              onRetry={retry}
              onSwitchView={handleSwitchToCollections}
            />
          )}
        >
          <ArchiveView
            root={root}
            onUpdate={onUpdateRoot}
            onSelect={(item) => {
              onSelect(item);
              if (!isMobile) onShowInspector();
            }}
            onOpen={onOpenItem}
            onBatchEdit={onBatchEdit}
            validationIssues={validationIssuesMap}
            onReveal={onReveal}
            onCatalogSelection={onCatalogSelection}
          />
        </ErrorBoundary>
      )}

      {currentMode === 'collections' && (
        <ErrorBoundary
          key="collections-view"
          fallback={(error, retry) => (
            <ViewErrorFallback
              viewName="Structure"
              error={error}
              onRetry={retry}
              onSwitchView={handleSwitchToArchive}
            />
          )}
        >
          <CollectionsView
            root={root}
            onUpdate={onUpdateRoot}
            abstractionLevel={abstractionLevel}
            onReveal={onReveal}
            onSynthesize={onSynthesize}
            selectedId={selectedId}
            onSelect={(id) => {
              onSelectId(id);
              onShowInspector();
            }}
          />
        </ErrorBoundary>
      )}

      {currentMode === 'metadata' && (
        <ErrorBoundary
          key="metadata-view"
          fallback={(error, retry) => (
            <ViewErrorFallback
              viewName="Metadata Catalog"
              error={error}
              onRetry={retry}
              onSwitchView={handleSwitchToArchive}
            />
          )}
        >
          <MetadataSpreadsheet
            root={root}
            onUpdate={onUpdateRoot}
            filterIds={filterIds}
            onClearFilter={onClearFilter}
          />
        </ErrorBoundary>
      )}

      {currentMode === 'boards' && (
        <ErrorBoundary
          key="boards-view"
          fallback={(error, retry) => (
            <ViewErrorFallback
              viewName="Boards"
              error={error}
              onRetry={retry}
              onSwitchView={handleSwitchToArchive}
            />
          )}
        >
          <BoardView root={root} settings={settings} />
        </ErrorBoundary>
      )}

      {currentMode === 'viewer' && (
        <ErrorBoundary
          key="viewer-view"
          fallback={(error, retry) => (
            <ViewErrorFallback
              viewName="Viewer"
              error={error}
              onRetry={retry}
              onSwitchView={handleSwitchToArchive}
            />
          )}
        >
          <Viewer
            item={selectedItem && isCanvas(selectedItem) ? selectedItem : null}
            onUpdate={onUpdateItem}
            autoOpenComposer={preloadedManifest === selectedId}
            onComposerOpened={onComposerOpened}
          />
        </ErrorBoundary>
      )}

      {currentMode === 'search' && (
        <ErrorBoundary
          key="search-view"
          fallback={(error, retry) => (
            <ViewErrorFallback
              viewName="Search"
              error={error}
              onRetry={retry}
              onSwitchView={handleSwitchToArchive}
            />
          )}
        >
          <SearchView
            root={root}
            onSelect={(id) => onReveal(id, 'archive')}
            onRevealMap={(id) => {
              onSelectId(id);
              onReveal(id, 'archive');
            }}
          />
        </ErrorBoundary>
      )}

      {currentMode === 'trash' && (
        <ErrorBoundary
          key="trash-view"
          fallback={(error, retry) => (
            <ViewErrorFallback
              viewName="Trash"
              error={error}
              onRetry={retry}
              onSwitchView={handleSwitchToArchive}
            />
          )}
        >
          <TrashView
            state={{
              entities: {
                Collection: {},
                Manifest: {},
                Canvas: {},
                Range: {},
                AnnotationPage: {},
                Annotation: {}
              },
              trashedEntities: {},
              references: {},
              reverseRefs: {},
              collectionMembers: {},
              memberOfCollections: {},
              rootId: null,
              typeIndex: {},
              extensions: {}
            }}
            onRestore={(ids) => console.log('Restore items:', ids)}
            onDelete={(ids) => console.log('Delete items:', ids)}
            onEmptyTrash={() => console.log('Empty trash')}
            variant={fieldMode ? 'field-mode' : 'default'}
          />
        </ErrorBoundary>
      )}
    </>
  );
};

export default ViewRouter;
