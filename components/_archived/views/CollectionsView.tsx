import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AbstractionLevel, getIIIFValue, IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest, isCanvas, isCollection, isManifest } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { MuseumLabel } from '../MuseumLabel';
import { Breadcrumb } from '../Breadcrumb';
import { ARIA_LABELS, IIIF_CONFIG, IIIF_SPEC, KEYBOARD, REDUCED_MOTION, RESOURCE_TYPE_CONFIG } from '../../constants';
import { autoStructureService } from '../../services/autoStructure';
import { StructureCanvas } from '../StructureCanvas';
import { resolveHierarchicalThumb, resolveHierarchicalThumbs, resolveThumbUrl } from '../../utils/imageSourceResolver';
import { StackedThumbnail } from '../StackedThumbnail';
import { useIIIFTraversal, useResizablePanel, useSharedSelection } from '../../hooks';
import { useTerminology } from '../../hooks/useTerminology';
import { useBreadcrumbPath } from '../../hooks/useBreadcrumbPath';
import { VirtualTreeList } from '../VirtualTreeList';
import {
  buildReferenceMap,
  findAllOfType,
  findCollectionsContaining,
  getRelationshipType,
  getValidChildTypes,
  isValidChildType
} from '../../utils/iiifHierarchy';
import { createLanguageMap, generateUUID } from '../../utils/iiifTypes';
import { SkeletonBlock } from '../LoadingState';
import { EmptyState, emptyStatePresets } from '../EmptyState';

interface CollectionsViewProps {
  root: IIIFItem | null;
  onUpdate: (newRoot: IIIFItem) => void;
  abstractionLevel?: AbstractionLevel;
  onReveal?: (id: string, mode: any) => void;
  onSynthesize?: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  inspectorVisible?: boolean;
  onToggleInspector?: () => void;
}

// Memoized StructureCanvas wrapper to prevent unnecessary re-renders
const MemoizedStructureCanvas = React.memo(StructureCanvas, (prev, next) => {
  // Deep compare relevant props
  const prevItemId = prev.item?.id;
  const nextItemId = next.item?.id;
  const prevSelectedSize = prev.selectedIds.size;
  const nextSelectedSize = next.selectedIds.size;
  const prevViewMode = prev.viewMode;
  const nextViewMode = next.viewMode;
  
  return prevItemId === nextItemId &&
         prevSelectedSize === nextSelectedSize &&
         prevViewMode === nextViewMode;
});

const CollectionsViewComponent: React.FC<CollectionsViewProps> = ({
  root,
  onUpdate,
  abstractionLevel = 'standard',
  onReveal,
  onSynthesize,
  onSelect,
  selectedId: externalSelectedId,
  inspectorVisible = false,
  onToggleInspector
}) => {
  const { showToast } = useToast();
  const { t, isAdvanced } = useTerminology({ level: abstractionLevel });
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [structureViewMode, setStructureViewMode] = useState<'grid' | 'list'>('grid');

  // Resizable tree sidebar panel
  const {
    size: treeWidth,
    isCollapsed: sidebarCollapsed,
    isResizing: isTreeResizing,
    toggleCollapse,
    handleProps: treeHandleProps,
    panelStyle: treePanelStyle,
  } = useResizablePanel({
    id: 'collections-tree',
    defaultSize: 288,
    minSize: 200,
    maxSize: 500,
    direction: 'horizontal',
    side: 'right', // resize handle on right side of tree sidebar
    collapseThreshold: 100,
    persist: true,
  });

  // Use shared selection hook for cross-view persistence
  const {
    selectedIds: multiSelectedIds,
    select,
    toggle,
    add,
    remove,
    clear: clearMultiSelection,
    isSelected
  } = useSharedSelection();

  // Use IIIF traversal hook for efficient tree operations
  const { findNode, getAllManifests, getAllCollections } = useIIIFTraversal(root);

  // Sync internal selection with root when root changes
  useEffect(() => {
    if (root && !internalSelectedId) {
      setInternalSelectedId(root.id);
    } else if (root && internalSelectedId) {
      // Verify the selected ID still exists in the current tree
      if (!findNode(internalSelectedId)) {
        // Selected ID no longer exists, reset to root
        setInternalSelectedId(root.id);
        clearMultiSelection();
      }
    } else if (!root) {
      setInternalSelectedId(null);
      clearMultiSelection();
    }
  }, [root?.id, findNode, internalSelectedId, clearMultiSelection]);

  const selectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  const handleSelect = useCallback((id: string) => {
    setInternalSelectedId(id);
    // Also update shared selection for single selection mode
    if (!multiSelectedIds.has(id)) {
      clearMultiSelection();
      select(id);
    }
    onSelect?.(id);
  }, [onSelect, multiSelectedIds, clearMultiSelection, select]);

  const handleMultiSelect = useCallback((ids: string[], additive: boolean) => {
    if (additive) {
      ids.forEach(id => toggle(id));
    } else {
      clearMultiSelection();
      ids.forEach(id => select(id));
    }
  }, [toggle, select, clearMultiSelection]);

  // Gather stats about the archive
  const stats = useMemo(() => {
    if (!root) return { collections: 0, manifests: 0, canvases: 0 };
    const collections = findAllOfType(root, 'Collection').length;
    const manifests = findAllOfType(root, 'Manifest').length;
    const canvases = findAllOfType(root, 'Canvas').length;
    return { collections, manifests, canvases };
  }, [root]);

  // Build reference map for cross-collection tracking
  const referenceMap = useMemo(() => {
    if (!root) return new Map<string, string[]>();
    return buildReferenceMap(root);
  }, [root]);

  // Build node map for breadcrumb traversal
  const nodeMap = useMemo(() => {
    const map = new Map<string, IIIFItem>();
    if (!root) return map;

    const traverse = (item: IIIFItem) => {
      map.set(item.id, item);
      const children = (item as any).items || (item as any).annotations || [];
      children.forEach((child: IIIFItem) => traverse(child));
    };

    traverse(root);
    return map;
  }, [root]);

  // Use the new breadcrumb path hook with reverse references
  const breadcrumbPath = useBreadcrumbPath(selectedId, referenceMap, nodeMap);

  // Get all manifests for "Add to Collection" feature - using traversal hook
  const allManifests = useMemo(() => getAllManifests(), [getAllManifests]);

  // Get all collections - using traversal hook
  const allCollections = useMemo(() => getAllCollections(), [getAllCollections]);

  // Use findNode from traversal hook instead of local implementation
  const cloneTree = useCallback((node: IIIFItem): IIIFItem => JSON.parse(JSON.stringify(node)), []);

  const handleAutoStructure = useCallback(() => {
  if (!selectedId || !root) return;
  const newRoot = cloneTree(root);
  const target = findNode(selectedId);
  if (target && isManifest(target)) {
    const updated = autoStructureService.generateRangesFromPatterns(target as IIIFManifest);
      Object.assign(target, updated);
      onUpdate(newRoot);
      showToast("Auto-generated Table of Contents", "success");
    } else {
      showToast("Select a Manifest to auto-structure", "info");
    }
  }, [selectedId, root, cloneTree, findNode, onUpdate, showToast]);

  const handleCreateType = useCallback((type: 'Collection' | 'Manifest', parentId: string | null) => {
    if (!root) return;
    const newRoot = cloneTree(root);
    const target = parentId ? findNode(parentId) : newRoot;

    if (!target) {
      showToast("Target not found", "error");
      return;
    }

    // Validate parent-child relationship using centralized IIIF hierarchy rules
    if (!isValidChildType(target.type, type)) {
      const validChildren = getValidChildTypes(target.type);
      showToast(
        `Cannot add ${type} to ${target.type}. ` +
        `Valid children: ${validChildren.join(', ') || 'none'}`,
        'error'
      );
      return;
    }

    const newId = generateUUID();
    const baseUrl = IIIF_CONFIG.BASE_URL.DEFAULT;
    const newItem: any = {
      "@context": IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id: IIIF_CONFIG.ID_PATTERNS[type === 'Manifest' ? 'MANIFEST' : 'COLLECTION'](baseUrl, newId),
      type,
      label: createLanguageMap(`New ${type}`),
      // Add summary for improved search (IIIF spec recommendation)
      summary: createLanguageMap(`${type} created in ${getIIIFValue(target.label) || 'archive'}`),
      items: [],
      behavior: type === 'Manifest' ? ['individuals'] : undefined
    };

    // Try to inherit or generate thumbnail from parent if available
    const parentThumbs = resolveHierarchicalThumbs(target, 200);
    if (parentThumbs.length > 0) {
      // Create thumbnail reference from parent's first available image
      newItem.thumbnail = [{
        id: parentThumbs[0],
        type: "Image",
        format: "image/jpeg"
      }];
    }

    const relationship = getRelationshipType(target.type, type);
    console.log(`Creating ${relationship} relationship: ${target.type} → ${type}`);

    if (!target.items) target.items = [];
    target.items.push(newItem);
    onUpdate(newRoot);
    showToast(`New ${type} added (${relationship} relationship)`, "success");
  }, [root, cloneTree, findNode, onUpdate, showToast]);

  const handleUpdate = useCallback((id: string, updates: Partial<IIIFItem>) => {
    if (!root) return;
    const newRoot = cloneTree(root);
    const target = findNode(id);
    if (target) {
      Object.assign(target, updates);
      onUpdate(newRoot);
    }
  }, [root, cloneTree, findNode, onUpdate]);

  const handleAddManifestToCollection = useCallback((manifestId: string, collectionId: string) => {
    if (!root) return;
    const newRoot = cloneTree(root);
    const collection = findNode(collectionId);
    const manifest = findNode(manifestId);

    if (!collection || !manifest || !isCollection(collection)) {
      showToast("Cannot add to collection", "error");
      return;
    }

    const existingRef = (collection as IIIFCollection).items?.find(item => item.id === manifestId);
    if (existingRef) {
      showToast("Manifest is already in this Collection", "info");
      return;
    }

    if (!(collection as IIIFCollection).items) {
      (collection as IIIFCollection).items = [];
    }

    (collection as IIIFCollection).items.push(JSON.parse(JSON.stringify(manifest)));

    onUpdate(newRoot);
    showToast(`Added "${getIIIFValue(manifest.label)}" to "${getIIIFValue(collection.label)}"`, "success");
    setShowAddToCollection(false);
  }, [root, cloneTree, findNode, onUpdate, showToast]);

  const handleRemoveFromCollection = useCallback((manifestId: string, collectionId: string) => {
    if (!root) return;
    const newRoot = cloneTree(root);
    const collection = findNode(collectionId);

    if (!collection || !isCollection(collection)) return;

    const coll = collection as IIIFCollection;
    const index = coll.items?.findIndex(item => item.id === manifestId) ?? -1;

    if (index > -1) {
      coll.items.splice(index, 1);
      onUpdate(newRoot);
      showToast("Removed from Collection", "success");
    }
  }, [root, cloneTree, findNode, onUpdate, showToast]);

  const handleReorderDrag = useCallback((draggedId: string, targetId: string) => {
    if (!root || draggedId === targetId) return;
    const newRoot = cloneTree(root);
    let draggedNode: any = null;

    const findAndRemove = (parent: any) => {
      const list = parent.items || parent.annotations || [];
      const idx = list.findIndex((x: any) => x.id === draggedId);
      if (idx > -1) {
        draggedNode = list.splice(idx, 1)[0];
        return true;
      }
      for (const child of list) if (findAndRemove(child)) return true;
      return false;
    };

    const findAndInsert = (parent: any) => {
      if (parent.id === targetId) {
        if (!draggedNode) return false;

        if (!isValidChildType(parent.type, draggedNode.type)) {
          const validChildren = getValidChildTypes(parent.type);
          showToast(
            `Cannot move ${draggedNode.type} into ${parent.type}. ` +
            `Valid children: ${validChildren.join(', ') || 'none'}`,
            'error'
          );
          return false;
        }

        const relationship = getRelationshipType(parent.type, draggedNode.type);
        console.log(`Creating ${relationship} relationship: ${parent.type} → ${draggedNode.type}`);

        if (!parent.items) parent.items = [];
        parent.items.push(draggedNode);
        return true;
      }
      const list = parent.items || parent.annotations || [];
      for (const child of list) if (findAndInsert(child)) return true;
      return false;
    };

    findAndRemove(newRoot);
    if (draggedNode) {
      const success = findAndInsert(newRoot);
      if (success) {
        onUpdate(newRoot);
        showToast("Structure reorganized", "success");
      }
    }
  }, [root, cloneTree, onUpdate, showToast]);

  // Handle reorder within StructureCanvas
  const handleStructureReorder = useCallback((fromIndex: number, toIndex: number) => {
    if (!root || !selectedId) return;
    const newRoot = cloneTree(root);
    const parent = findNode(selectedId);

    if (!parent || !parent.items) return;

    const [moved] = parent.items.splice(fromIndex, 1);
    parent.items.splice(toIndex, 0, moved);
    onUpdate(newRoot);
  }, [root, selectedId, cloneTree, findNode, onUpdate]);

  // Handle remove items
  const handleRemoveItems = useCallback((ids: string[]) => {
    if (!root || !selectedId) return;

    // Save snapshot for undo
    const snapshot = JSON.parse(JSON.stringify(root));

    const newRoot = cloneTree(root);
    const parent = findNode(selectedId);

    if (!parent || !parent.items) return;

    parent.items = parent.items.filter((item: IIIFItem) => !ids.includes(item.id));
    onUpdate(newRoot);
    clearMultiSelection();
    showToast(
      `Removed ${ids.length} item(s)`,
      "success",
      {
        label: 'Undo',
        onClick: () => {
          onUpdate(snapshot);
          showToast('Removal undone', 'info');
        },
        variant: 'primary'
      }
    );
  }, [root, selectedId, cloneTree, findNode, onUpdate, showToast, clearMultiSelection]);

  // Handle duplicate items
  const handleDuplicateItems = useCallback((ids: string[]) => {
    if (!root || !selectedId) return;
    const newRoot = cloneTree(root);
    const parent = findNode(selectedId);

    if (!parent || !parent.items) return;

    const duplicates: IIIFItem[] = [];
    ids.forEach(id => {
      const item = parent.items.find((i: IIIFItem) => i.id === id);
      if (item) {
        const duplicate = JSON.parse(JSON.stringify(item));
        duplicate.id = `${item.id}_copy_${generateUUID().slice(0, 8)}`;
        if (duplicate.label) {
          const originalLabel = getIIIFValue(duplicate.label);
          duplicate.label = createLanguageMap(`${originalLabel} (Copy)`);
        }
        duplicates.push(duplicate);
      }
    });

    parent.items.push(...duplicates);
    onUpdate(newRoot);
    showToast(`Duplicated ${ids.length} item(s)`, "success");
  }, [root, selectedId, cloneTree, findNode, onUpdate, showToast]);

  const selectedNode = root && selectedId ? findNode(selectedId) : null;
  const nodeConfig = selectedNode ? (RESOURCE_TYPE_CONFIG[selectedNode.type] || RESOURCE_TYPE_CONFIG['Content']) : RESOURCE_TYPE_CONFIG['Content'];

  // Find which collections contain the selected item
  const containingCollections = useMemo(() => {
    if (!root || !selectedNode || selectedNode.type !== 'Manifest') return [];
    return findCollectionsContaining(root, selectedNode.id);
  }, [root, selectedNode]);

  // Get reference count for selected item
  const referenceCount = selectedNode ? (referenceMap.get(selectedNode.id)?.length || 0) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Header */}
      <div className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleCollapse}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            <Icon name={sidebarCollapsed ? "menu" : "menu_open"} className="text-slate-500" />
          </button>
          <div className="p-2 bg-iiif-blue/10 rounded-lg text-iiif-blue">
            <Icon name="account_tree" className="text-2xl" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Structure</h1>
            {/* Breadcrumb navigation */}
            {breadcrumbPath.length > 0 && (
              <Breadcrumb
                path={breadcrumbPath}
                onNavigate={handleSelect}
                onHomeClick={() => root && handleSelect(root.id)}
                maxVisible={4}
              />
            )}
            {breadcrumbPath.length === 0 && (
              <p className="text-xs text-slate-500">
                {stats.collections} {t('Collection')}s · {stats.manifests} {t('Manifest')}s · {stats.canvases} {t('Canvas')}es
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedNode?.type === 'Manifest' && (
            <button
              onClick={handleAutoStructure}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-100 transition-all mr-4"
            >
              <Icon name="auto_awesome" className="text-amber-500" /> Build TOC
            </button>
          )}
          <button
            onClick={() => handleCreateType('Collection', selectedId)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Icon name="create_new_folder" className="text-amber-600" /> {t('Collection')}
          </button>
          <button
            onClick={() => handleCreateType('Manifest', selectedId)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Icon name="note_add" className="text-emerald-600" /> {t('Manifest')}
          </button>
          {onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`p-2 rounded-lg transition-colors ${inspectorVisible ? 'bg-iiif-blue text-white' : 'hover:bg-slate-100 text-slate-500'}`}
              title={inspectorVisible ? "Hide Inspector" : "Show Inspector"}
            >
              <Icon name="info" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Pane - Resizable Tree Sidebar with Virtualization */}
        <div
          className="flex flex-col border-r border-slate-200 bg-white shadow-inner relative shrink-0"
          style={treePanelStyle}
        >
          {!sidebarCollapsed && (
            <>
              <div className="h-10 border-b bg-slate-50 flex items-center px-3 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archive Tree</span>
              </div>
              {/* Virtualized Tree List - replaces recursive TreeNode */}
              <VirtualTreeList
                root={root}
                selectedId={selectedId}
                onSelect={handleSelect}
                onDrop={handleReorderDrag}
                referenceMap={referenceMap}
                rowHeight={40}
                overscan={5}
                className="flex-1 p-3 custom-scrollbar"
                enableKeyboardNav={true}
              />
            </>
          )}

          {/* Resize Handle */}
          <div
            {...treeHandleProps}
            className={`
              absolute right-0 top-0 bottom-0 w-1 z-30 group
              cursor-col-resize
              transition-colors duration-150
              hover:bg-slate-500/20
              ${isTreeResizing ? 'bg-iiif-blue/30' : ''}
              ${treeHandleProps.className}
            `}
          >
            {/* Visual drag indicator */}
            <div
              className={`
                absolute right-0 top-1/2 -translate-y-1/2
                w-1 h-12 rounded-full
                transition-all duration-150
                opacity-0 group-hover:opacity-100 group-focus:opacity-100
                ${isTreeResizing
                  ? 'bg-iiif-blue opacity-100'
                  : 'bg-slate-400 group-hover:bg-iiif-blue'
                }
              `}
            />
          </div>
        </div>

        {/* Middle Pane - Structure Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedNode && (isManifest(selectedNode) || isCollection(selectedNode)) ? (
            <>
              <MemoizedStructureCanvas
                item={selectedNode}
                onReorder={handleStructureReorder}
                onSelect={handleSelect}
                onMultiSelect={handleMultiSelect}
                selectedIds={multiSelectedIds}
                viewMode={structureViewMode}
                onViewModeChange={setStructureViewMode}
                onRemove={handleRemoveItems}
                onDuplicate={handleDuplicateItems}
              />

              {/* Bottom Toolbar for multi-selection */}
              {multiSelectedIds.size > 1 && (
                <div className="h-14 bg-white border-t flex items-center justify-between px-4 shrink-0 shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-700">
                      {multiSelectedIds.size} items selected
                    </span>
                    <button
                      onClick={clearMultiSelection}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDuplicateItems(Array.from(multiSelectedIds))}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Icon name="content_copy" className="text-sm" /> Duplicate
                    </button>
                    <button
                      onClick={() => handleRemoveItems(Array.from(multiSelectedIds))}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Icon name="delete" className="text-sm" /> Remove
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : selectedNode ? (
            /* Detail Panel for non-container types */
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
              <div className="h-14 bg-white border-b px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1 ${nodeConfig.bgClass} ${nodeConfig.colorClass}`}>
                    <Icon name={nodeConfig.icon} className="text-xs" />
                    {selectedNode.type}
                  </span>
                  <h2 className="font-bold text-slate-800 truncate">{getIIIFValue(selectedNode.label)}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onReveal?.(selectedNode.id, 'archive')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-iiif-blue hover:bg-slate-100 rounded-lg transition-all"
                    title="Show this item in the Archive grid view"
                  >
                    <Icon name="inventory_2" className="text-sm" /> Archive
                  </button>
                  {isCanvas(selectedNode) && (
                    <button
                      onClick={() => onReveal?.(selectedNode.id, 'viewer')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-iiif-blue hover:bg-slate-100 rounded-lg transition-all"
                      title="Open this canvas in the image viewer"
                    >
                      <Icon name="visibility" className="text-sm" /> View
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-slate-100/50">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Canvas Preview */}
                  {isCanvas(selectedNode) && (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                      <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                        <StackedThumbnail 
                          urls={resolveHierarchicalThumbs(selectedNode, 800)} 
                          size="xl" 
                          className="w-full h-full"
                          icon="image"
                        />
                      </div>
                      <h3 className="font-bold text-lg text-slate-800">{getIIIFValue(selectedNode.label)}</h3>
                      {isCanvas(selectedNode) && (
                        <p className="text-sm text-slate-500 mt-1">
                          {selectedNode.width} x {selectedNode.height}px
                          {selectedNode.items && ` · ${selectedNode.items.reduce((sum, ap) => sum + (ap.items?.length || 0), 0)} annotations`}
                        </p>
                      )}
                    </div>
                  )}

                  {!isAdvanced && (
                    <MuseumLabel title="IIIF Hierarchy Model" type="field-note">
                      <strong>Collections</strong> are curated lists that reference resources.
                      <strong>Manifests</strong> own their Canvases exclusively.
                      A Manifest can appear in multiple Collections - think of it like a book that can be in multiple reading lists.
                    </MuseumLabel>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
              <Icon name="account_tree" className="text-6xl mb-4 opacity-20"/>
              <p className="font-bold uppercase tracking-widest text-xs">Select a structural node to view its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CollectionsView = React.memo(CollectionsViewComponent, (prev, next) => {
  // Deep compare root IDs to prevent unnecessary re-renders
  const prevRootId = prev.root?.id;
  const nextRootId = next.root?.id;
  const prevSelectedId = prev.selectedId;
  const nextSelectedId = next.selectedId;
  const prevInspectorVisible = prev.inspectorVisible;
  const nextInspectorVisible = next.inspectorVisible;
  
  return prevRootId === nextRootId &&
         prevSelectedId === nextSelectedId &&
         prevInspectorVisible === nextInspectorVisible;
});
