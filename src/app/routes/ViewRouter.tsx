/**
 * ViewRouter
 *
 * Routes requests to feature views based on app mode.
 * Renders view content only - no layout wrappers.
 *
 * Philosophy:
 * - Router ONLY handles view routing
 * - Layout is handled at App.tsx level (single source of truth)
 * - Views render content only, no headers/sidebars
 */

import React, { useMemo } from 'react';
import type { AppMode, IIIFItem, IIIFCanvas, IIIFManifest, IIIFCollection, AppSettings } from '@/src/shared/types';
import type { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import { useAppMode } from '@/src/app/providers';

// Feature views
import { ArchiveView } from '@/src/features/archive';
import { BoardView } from '@/src/features/board-design';
import { MetadataView } from '@/src/features/metadata-edit';
import { SearchView } from '@/src/features/search';
import { ViewerView } from '@/src/features/viewer';
import { MapView } from '@/src/features/map';
import { TimelineView } from '@/src/features/timeline';
import { StructureTreeView } from '@/src/features/structure-view';
import { DependencyExplorer } from '@/src/features/dependency-explorer';

export interface ViewRouterProps {
  selectedId: string | null;
  selectedItem?: IIIFItem | null;
  root: IIIFItem | null;
  onSelect?: (item: IIIFItem) => void;
  onSelectId?: (id: string | null) => void;
  validationIssuesMap?: Record<string, ValidationIssue[]>;
  onUpdateRoot?: (newRoot: IIIFItem) => void;
  onUpdateItem?: (updates: Partial<IIIFItem>) => void;
  onBatchEdit?: (ids: string[]) => void;
  onCatalogSelection?: (ids: string[]) => void;
  settings?: AppSettings;
}

const findItemById = (node: any, id: string): any => {
  if (node.id === id) return node;
  if (node.items && Array.isArray(node.items)) {
    for (const item of node.items) {
      const found = findItemById(item, id);
      if (found) return found;
    }
  }
  return null;
};

const findFirstCanvas = (node: any): { canvas: IIIFCanvas | null; manifest: IIIFManifest | null } => {
  if (node.type === 'Canvas') {
    return { canvas: node as IIIFCanvas, manifest: null };
  }
  if (node.items && Array.isArray(node.items)) {
    for (const item of node.items) {
      const result = findFirstCanvas(item);
      if (result.canvas) {
        if (node.type === 'Manifest') {
          return { canvas: result.canvas, manifest: node as IIIFManifest };
        }
        return result;
      }
    }
  }
  return { canvas: null, manifest: null };
};

export const ViewRouter: React.FC<ViewRouterProps> = ({
  selectedId,
  selectedItem,
  root,
  onSelect,
  onSelectId,
  validationIssuesMap,
  onUpdateRoot,
  onBatchEdit,
  onCatalogSelection,
  settings,
}) => {
  const [currentMode, setCurrentMode] = useAppMode();
  const viewerData = useMemo(() => {
    if (!root) return { canvas: null, manifest: null };

    let selectedCanvas: IIIFCanvas | null = null;
    let parentManifest: IIIFManifest | null = null;

    if (selectedId) {
      if (root.type === 'Manifest') {
        parentManifest = root as IIIFManifest;
        selectedCanvas = findItemById(parentManifest, selectedId);
        if (selectedCanvas?.type !== 'Canvas') selectedCanvas = null;
      } else if (root.type === 'Collection') {
        for (const item of (root as IIIFCollection).items || []) {
          if (item.type === 'Manifest') {
            const found = findItemById(item, selectedId);
            if (found?.type === 'Canvas') {
              selectedCanvas = found as IIIFCanvas;
              parentManifest = item as IIIFManifest;
              break;
            }
          }
        }
      }
    }

    if (!selectedCanvas) {
      const result = findFirstCanvas(root);
      selectedCanvas = result.canvas;
      parentManifest = result.manifest;
    }

    return { canvas: selectedCanvas, manifest: parentManifest };
  }, [root, selectedId]);

  // Archive view
  if (currentMode === 'archive') {
    const hasSelectedItem = !!selectedId && !!selectedItem;
    const isCanvasSelected = selectedItem?.type === 'Canvas';

    return (
      <div className="flex-1 flex min-h-0">
        {/* Left: Archive Grid */}
        <div className={`flex flex-col transition-all duration-300 ${hasSelectedItem ? 'w-80 border-r border-slate-200 dark:border-slate-800' : 'flex-1'}`}>
          <ArchiveView
            root={root}
            onSelect={(item) => {
              onSelect?.(item);
              onSelectId?.(item.id);
            }}
            onOpen={(item) => {
              onSelect?.(item);
              onSelectId?.(item.id);
              setCurrentMode('viewer');
            }}
            onBatchEdit={(ids) => onBatchEdit?.(ids)}
            onUpdate={(newRoot) => onUpdateRoot?.(newRoot)}
            cx={{
              surface: 'bg-white dark:bg-slate-900',
              text: 'text-slate-900 dark:text-slate-100',
              accent: 'text-blue-600 dark:text-blue-400',
              border: 'border-slate-200 dark:border-slate-700',
              divider: 'border-slate-200 dark:border-slate-800',
              headerBg: 'bg-white dark:bg-slate-900',
              textMuted: 'text-slate-500 dark:text-slate-400',
              input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
              label: 'text-slate-700 dark:text-slate-300',
              active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
              inactive: 'text-slate-600 dark:text-slate-400',
              warningBg: 'bg-amber-50 dark:bg-amber-900/30',
              pageBg: 'bg-slate-50 dark:bg-slate-950',
            }}
            fieldMode={settings?.fieldMode || false}
            t={(key) => key}
            isAdvanced={settings?.abstractionLevel === 'advanced'}
            onSwitchView={setCurrentMode}
            onCatalogSelection={onCatalogSelection}
            validationIssues={validationIssuesMap}
          />
        </div>

        {/* Right: Viewer Panel when canvas selected */}
        {hasSelectedItem && isCanvasSelected && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
            <ViewerView
              item={selectedItem as IIIFCanvas}
              manifest={viewerData.manifest}
              onUpdate={() => {}}
              cx={{
                surface: 'bg-slate-900',
                text: 'text-white',
                accent: 'text-blue-400',
                border: 'border-slate-700',
                divider: 'border-slate-800',
                headerBg: 'bg-slate-900',
                textMuted: 'text-slate-400',
                input: 'bg-slate-800 border-slate-600',
                label: 'text-slate-300',
                active: 'bg-blue-900/30 text-blue-300',
                inactive: 'text-slate-400',
                warningBg: 'bg-amber-900/30',
                pageBg: 'bg-slate-950',
              }}
              fieldMode={settings?.fieldMode || false}
              t={(key) => key}
              isAdvanced={settings?.abstractionLevel === 'advanced'}
            />
          </div>
        )}
      </div>
    );
  }

  // Board view
  if (currentMode === 'boards') {
    return (
      <BoardView
        root={root}
        cx={{
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        }}
        fieldMode={settings?.fieldMode || false}
        t={(key) => key}
        isAdvanced={settings?.abstractionLevel === 'advanced'}
        onExport={() => {}}
        onSwitchView={setCurrentMode}
      />
    );
  }

  // Metadata view
  if (currentMode === 'metadata') {
    return (
      <MetadataView
        root={root}
        cx={{
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        }}
        fieldMode={settings?.fieldMode || false}
        onUpdate={(newRoot) => onUpdateRoot?.(newRoot)}
      />
    );
  }

  // Structure view
  if (currentMode === 'structure') {
    return (
      <StructureTreeView
        root={root}
        selectedId={selectedId}
        onSelect={(id) => onSelectId?.(id)}
        onOpen={(item) => {
          onSelectId?.(item.id);
          setCurrentMode('viewer');
        }}
        onUpdate={(newRoot) => onUpdateRoot?.(newRoot)}
        className="h-full"
      />
    );
  }

  // Search view
  if (currentMode === 'search') {
    return (
      <SearchView
        root={root}
        onSelect={(id) => {
          onSelectId?.(id);
          setCurrentMode('archive');
        }}
        onRevealMap={(id) => {
          onSelectId?.(id);
          setCurrentMode('map');
        }}
        cx={{
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        }}
        fieldMode={settings?.fieldMode || false}
        t={(key) => key}
      />
    );
  }

  // Viewer view
  if (currentMode === 'viewer') {
    return (
      <ViewerView
        item={viewerData.canvas}
        manifest={viewerData.manifest}
        onUpdate={() => {}}
        cx={{
          surface: 'bg-slate-900',
          text: 'text-white',
          accent: 'text-blue-400',
          border: 'border-slate-700',
          divider: 'border-slate-800',
          headerBg: 'bg-slate-900',
          textMuted: 'text-slate-400',
          input: 'bg-slate-800 border-slate-600',
          label: 'text-slate-300',
          active: 'bg-blue-900/30 text-blue-300',
          inactive: 'text-slate-400',
          warningBg: 'bg-amber-900/30',
          pageBg: 'bg-slate-950',
        }}
        fieldMode={settings?.fieldMode || false}
        t={(key) => key}
        isAdvanced={settings?.abstractionLevel === 'advanced'}
      />
    );
  }

  // Map view
  if (currentMode === 'map') {
    return (
      <MapView
        root={root}
        onSelect={(item) => onSelectId?.(item.id)}
        cx={{
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        }}
        fieldMode={settings?.fieldMode || false}
        t={(key) => key}
        isAdvanced={settings?.abstractionLevel === 'advanced'}
      />
    );
  }

  // Timeline view
  if (currentMode === 'timeline') {
    return (
      <TimelineView
        root={root}
        onSelect={(item) => onSelectId?.(item.id)}
        cx={{
          surface: 'bg-white dark:bg-slate-900',
          text: 'text-slate-900 dark:text-slate-100',
          accent: 'text-blue-600 dark:text-blue-400',
          border: 'border-slate-200 dark:border-slate-700',
          divider: 'border-slate-200 dark:border-slate-800',
          headerBg: 'bg-white dark:bg-slate-900',
          textMuted: 'text-slate-500 dark:text-slate-400',
          input: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
          label: 'text-slate-700 dark:text-slate-300',
          active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          inactive: 'text-slate-600 dark:text-slate-400',
          warningBg: 'bg-amber-50 dark:bg-amber-900/30',
          pageBg: 'bg-slate-50 dark:bg-slate-950',
        }}
        fieldMode={settings?.fieldMode || false}
      />
    );
  }

  // Admin dependency explorer
  if (currentMode === 'admin-deps') {
    return (
      <div className="h-full bg-slate-50 dark:bg-slate-950 p-6">
        <DependencyExplorer />
      </div>
    );
  }

  // Default: archive
  return null;
};

export default ViewRouter;
