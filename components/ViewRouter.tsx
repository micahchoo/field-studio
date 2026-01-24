/**
 * ViewRouter - Conditional View Rendering
 *
 * Extracts the view switching logic from App.tsx for cleaner separation.
 * Wraps each view in an ErrorBoundary with appropriate fallback.
 */

import React from 'react';
import { IIIFItem, IIIFCanvas, AppMode } from '../types';
import { ValidationIssue } from '../services/validator';
import { ArchiveView } from './views/ArchiveView';
import { BoardView } from './views/BoardView';
import { Viewer } from './views/Viewer';
import { CollectionsView } from './views/CollectionsView';
import { SearchView } from './views/SearchView';
import { MetadataSpreadsheet } from './views/MetadataSpreadsheet';
import { ErrorBoundary, ViewErrorFallback } from './ErrorBoundary';

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
}) => {
  const handleSwitchToArchive = () => onModeChange('archive');
  const handleSwitchToCollections = () => onModeChange('collections');

  return (
    <>
      {currentMode === 'archive' && (
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
            fieldMode={fieldMode}
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
          <BoardView root={root} />
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
            item={selectedItem?.type === 'Canvas' ? selectedItem as IIIFCanvas : null}
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
    </>
  );
};

export default ViewRouter;
