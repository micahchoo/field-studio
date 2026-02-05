/**
 * ViewRouter
 *
 * Routes requests to feature views based on app mode.
 * Each route is wrapped with BaseTemplate and FieldModeTemplate.
 *
 * Usage:
 *   <ViewRouter
 *     currentMode="archive"
 *     selectedId={selectedId}
 *     root={root}
 *     onModeChange={setCurrentMode}
 *     onSelect={setSelectedId}
 *   />
 *
 * Philosophy:
 * - Router knows about templates, not features directly
 * - Each route is wrapped with required context
 * - Incremental switchover: old components → new feature slices
 */

import React, { useEffect } from 'react';
import type { AppMode, IIIFItem } from '@/types';
import { BaseTemplate } from '../templates/BaseTemplate';
import { FieldModeTemplate } from '../templates/FieldModeTemplate';

// NEW: Import feature slices (Phase 4)
import { ArchiveView } from '@/src/features/archive';
import { BoardView } from '@/src/features/board-design';
import { MetadataView } from '@/src/features/metadata-edit';
import { StagingView } from '@/src/features/staging';
import { SearchView } from '@/src/features/search';
import { ViewerView } from '@/src/features/viewer';
import { MapView } from '@/src/features/map';

// NEW: Import timeline feature
import { TimelineView } from '@/src/features/timeline';

// NEW: Import structure view feature
import { StructureTreeView } from '@/src/features/structure-view';

export interface ViewRouterProps {
  /** Current app mode (archive, boards, metadata, etc.) */
  currentMode: AppMode;
  /** Currently selected entity ID */
  selectedId: string | null;
  /** IIIF tree root */
  root: IIIFItem | null;
  /** Show/hide sidebar */
  showSidebar: boolean;
  /** Callback when mode changes */
  onModeChange: (mode: AppMode) => void;
  /** Callback when selection changes */
  onSelect: (id: string | null) => void;
  /** Callback when sidebar toggle is clicked */
  onSidebarToggle: () => void;
  /** Optional sidebar content */
  sidebarContent?: React.ReactNode;
  /** Optional header content */
  headerContent?: React.ReactNode;
}

/**
 * Route dispatcher
 *
 * Maps app mode to appropriate view.
 * Wrapped with BaseTemplate for layout and FieldModeTemplate for context.
 *
 * During implementation, uses old components via OldViewRouter.
 * As features are implemented (Phase 4), routes are updated to use new feature slices.
 */
export const ViewRouter: React.FC<ViewRouterProps> = ({
  currentMode,
  selectedId: _selectedId,
  root,
  showSidebar,
  onModeChange,
  onSelect,
  onSidebarToggle,
  sidebarContent,
  headerContent
}) => {
  // Handle unknown mode fallback - useEffect to avoid setState during render
  useEffect(() => {
    const validModes: AppMode[] = ['archive', 'boards', 'metadata', 'collections', 'structure', 'search', 'viewer', 'trash'];
    if (!validModes.includes(currentMode)) {
      console.warn(`Unknown app mode: ${currentMode}, falling back to archive`);
      onModeChange('archive');
    }
  }, [currentMode, onModeChange]);
  // Phase 4: Wire new feature slices incrementally
  // Archive feature is now implemented - route to new ArchiveView
  if (currentMode === 'archive') {
    return (
      <BaseTemplate
        showSidebar={showSidebar}
        onSidebarToggle={onSidebarToggle}
        sidebarContent={sidebarContent}
        headerContent={headerContent}
      >
        <FieldModeTemplate>
          {({ cx, fieldMode, t, isAdvanced }) => (
            <ArchiveView
              root={root}
              onSelect={(item) => onSelect(item.id)}
              onOpen={(item) => {
                // Open in viewer - could dispatch to change mode
                onModeChange('viewer');
                onSelect(item.id);
              }}
              onBatchEdit={(ids) => {
                // Handle batch edit - could open batch editor
                console.log('Batch edit:', ids);
              }}
              onUpdate={(newRoot) => {
                // Handle root updates (e.g., after grouping)
                console.log('Root updated:', newRoot);
              }}
              cx={cx}
              fieldMode={fieldMode}
              t={t}
              isAdvanced={isAdvanced}
              onSwitchView={onModeChange}
            />
          )}
        </FieldModeTemplate>
      </BaseTemplate>
    );
  }

  // Phase 4b: Board Design feature - fully refactored organism
  if (currentMode === 'boards') {
    return (
      <BaseTemplate
        showSidebar={showSidebar}
        onSidebarToggle={onSidebarToggle}
        sidebarContent={sidebarContent}
        headerContent={headerContent}
      >
        <FieldModeTemplate>
          {({ cx, fieldMode, t, isAdvanced }) => (
            <BoardView
              root={root}
              cx={cx}
              fieldMode={fieldMode}
              t={t}
              isAdvanced={isAdvanced}
              onExport={(state) => {
                // Handle board export - could dispatch to export service
                console.log('Board export:', state);
              }}
            />
          )}
        </FieldModeTemplate>
      </BaseTemplate>
    );
  }

  // Phase 4c: Metadata Edit feature
  if (currentMode === 'metadata') {
    return (
      <BaseTemplate
        showSidebar={showSidebar}
        onSidebarToggle={onSidebarToggle}
        sidebarContent={sidebarContent}
        headerContent={headerContent}
      >
        <FieldModeTemplate>
          {({ cx, fieldMode }) => (
            <MetadataView
              root={root}
              cx={cx}
              fieldMode={fieldMode}
              onUpdate={(newRoot) => {
                // Handle metadata updates
                console.log('Metadata updated:', newRoot);
              }}
            />
          )}
        </FieldModeTemplate>
      </BaseTemplate>
    );
  }

  // Phase 4d: Staging feature
  // NOTE: Staging/import functionality works via modal (StagingWorkbench)
  // triggered by Import button in Sidebar. The modal-based flow is in App.tsx lines 558-569.
  // Collections mode currently routes to archive view as placeholder.
  // TODO: Implement full FSD-compliant staging workflow with proper state management
  if (currentMode === 'collections') {
    // Temporarily route to archive view since staging is modal-based
    return (
      <BaseTemplate
        showSidebar={showSidebar}
        onSidebarToggle={onSidebarToggle}
        sidebarContent={sidebarContent}
        headerContent={headerContent}
      >
        <FieldModeTemplate>
          {({ cx, fieldMode, t, isAdvanced }) => (
            <ArchiveView
              root={root}
              onSelect={(item) => onSelect(item.id)}
              onOpen={(item) => {
                onModeChange('viewer');
                onSelect(item.id);
              }}
              onBatchEdit={(ids) => {
                console.log('Batch edit:', ids);
              }}
              onUpdate={(newRoot) => {
                console.log('Root updated:', newRoot);
              }}
              cx={cx}
              fieldMode={fieldMode}
              t={t}
              isAdvanced={isAdvanced}
              onSwitchView={onModeChange}
            />
          )}
        </FieldModeTemplate>
      </BaseTemplate>
    );
  }

  // Phase 4g: Structure Tree View feature
  if (currentMode === 'structure') {
    return (
      <BaseTemplate
        showSidebar={showSidebar}
        onSidebarToggle={onSidebarToggle}
        sidebarContent={sidebarContent}
        headerContent={headerContent}
      >
        <FieldModeTemplate>
          {({ cx }) => (
            <StructureTreeView
              root={root}
              selectedId={_selectedId}
              onSelect={(id) => onSelect(id)}
              onOpen={(item) => {
                onSelect(item.id);
                onModeChange('viewer');
              }}
              onUpdate={(newRoot) => {
                console.log('Structure updated:', newRoot);
              }}
              className="h-full"
            />
          )}
        </FieldModeTemplate>
      </BaseTemplate>
    );
  }

  // Phase 4e: Search feature
  if (currentMode === 'search') {
    return (
      <BaseTemplate
        showSidebar={showSidebar}
        onSidebarToggle={onSidebarToggle}
        sidebarContent={sidebarContent}
        headerContent={headerContent}
      >
        <FieldModeTemplate>
          {({ cx, fieldMode, t }) => (
            <SearchView
              root={root}
              onSelect={(id) => onSelect(id)}
              onRevealMap={(id) => {
                onSelect(id);
                onModeChange('map');
              }}
              cx={cx}
              fieldMode={fieldMode}
              t={t}
            />
          )}
        </FieldModeTemplate>
      </BaseTemplate>
    );
  }

  // Phase 4f: Viewer feature
  // NOTE: This requires a selected canvas, falls back to archive if none selected
  if (currentMode === 'viewer') {
    // Find selected canvas and its parent manifest
    let selectedCanvas: IIIFCanvas | null = null;
    let parentManifest: IIIFManifest | null = null;

    if (_selectedId && root) {
      // Helper to find canvas in manifest
      const findCanvasInManifest = (manifest: IIIFManifest, id: string): IIIFCanvas | null => {
        if (manifest.items) {
          return manifest.items.find((canvas) => canvas.id === id) || null;
        }
        return null;
      };

      // Check if root is a manifest
      if (root.type === 'Manifest') {
        parentManifest = root as IIIFManifest;
        selectedCanvas = findCanvasInManifest(parentManifest, _selectedId);
      }
      // Check if root is a collection
      else if (root.type === 'Collection' && (root as IIIFCollection).items) {
        for (const item of (root as IIIFCollection).items) {
          if (item.type === 'Manifest') {
            const canvas = findCanvasInManifest(item as IIIFManifest, _selectedId);
            if (canvas) {
              selectedCanvas = canvas;
              parentManifest = item as IIIFManifest;
              break;
            }
          }
        }
      }
    }

    return (
      <BaseTemplate
        showSidebar={showSidebar}
        onSidebarToggle={onSidebarToggle}
        sidebarContent={sidebarContent}
        headerContent={headerContent}
      >
        <FieldModeTemplate>
          {({ cx, fieldMode, t, isAdvanced }) => (
            <ViewerView
              item={selectedCanvas}
              manifest={parentManifest}
              onUpdate={(item) => {
                console.log('Canvas updated:', item);
              }}
              cx={cx}
              fieldMode={fieldMode}
              t={t}
              isAdvanced={isAdvanced}
            />
          )}
        </FieldModeTemplate>
      </BaseTemplate>
    );
  }

  // Phase 4g: Map feature
  if (currentMode === 'map') {
    return (
      <BaseTemplate
        showSidebar={showSidebar}
        onSidebarToggle={onSidebarToggle}
        sidebarContent={sidebarContent}
        headerContent={headerContent}
      >
        <FieldModeTemplate>
          {({ cx, fieldMode, t, isAdvanced }) => (
            <MapView
              root={root}
              onSelect={(item) => onSelect(item.id)}
              cx={cx}
              fieldMode={fieldMode}
              t={t}
              isAdvanced={isAdvanced}
            />
          )}
        </FieldModeTemplate>
      </BaseTemplate>
    );
  }

  // Phase 4h: Timeline feature
  if (currentMode === 'timeline') {
    return (
      <BaseTemplate
        showSidebar={showSidebar}
        onSidebarToggle={onSidebarToggle}
        sidebarContent={sidebarContent}
        headerContent={headerContent}
      >
        <FieldModeTemplate>
          {({ cx, fieldMode }) => (
            <TimelineView
              root={root}
              onSelect={(item) => onSelect(item.id)}
              cx={cx}
              fieldMode={fieldMode}
            />
          )}
        </FieldModeTemplate>
      </BaseTemplate>
    );
  }

  // Unknown mode - will be handled by useEffect above
  return null;
};

export default ViewRouter;
