
import React, { useState, useMemo, useCallback } from 'react';
import { IIIFItem, IIIFCollection, IIIFManifest, IIIFCanvas, AbstractionLevel, getIIIFValue, isCollection, isManifest, isCanvas } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { MuseumLabel } from '../MuseumLabel';
import { RESOURCE_TYPE_CONFIG } from '../../constants';
import { autoStructureService } from '../../services/autoStructure';
import { StructureCanvas } from '../StructureCanvas';
import { resolveThumbUrl, resolveHierarchicalThumb } from '../../utils/imageSourceResolver';
import {
  findAllOfType,
  findCollectionsContaining,
  isValidChildType,
  getRelationshipType,
  getValidChildTypes,
  buildReferenceMap
} from '../../utils/iiifHierarchy';

// Maximum nesting depth to prevent stack overflow and performance issues
const MAX_NESTING_DEPTH = 15;

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

export const CollectionsView: React.FC<CollectionsViewProps> = ({
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
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(root?.id || null);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [structureViewMode, setStructureViewMode] = useState<'grid' | 'list'>('grid');
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());

  const selectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  const handleSelect = useCallback((id: string) => {
    setInternalSelectedId(id);
    setMultiSelectedIds(new Set([id]));
    onSelect?.(id);
  }, [onSelect]);

  const handleMultiSelect = useCallback((ids: string[], additive: boolean) => {
    if (additive) {
      setMultiSelectedIds(prev => {
        const newSet = new Set(prev);
        ids.forEach(id => {
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
        });
        return newSet;
      });
    } else {
      setMultiSelectedIds(new Set(ids));
    }
  }, []);

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

  // Get all manifests for "Add to Collection" feature
  const allManifests = useMemo(() => {
    if (!root) return [];
    return findAllOfType(root, 'Manifest') as IIIFManifest[];
  }, [root]);

  // Get all collections
  const allCollections = useMemo(() => {
    if (!root) return [];
    return findAllOfType(root, 'Collection') as IIIFCollection[];
  }, [root]);

  const findNode = useCallback((node: IIIFItem, id: string): IIIFItem | null => {
    if (node.id === id) return node;
    const children = (node as any).items || (node as any).annotations || [];
    for (const child of children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  const cloneTree = useCallback((node: IIIFItem): IIIFItem => JSON.parse(JSON.stringify(node)), []);

  const handleAutoStructure = useCallback(() => {
    if (!selectedId || !root) return;
    const newRoot = cloneTree(root);
    const target = findNode(newRoot, selectedId);
    if (target && target.type === 'Manifest') {
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
    const target = parentId ? findNode(newRoot, parentId) : newRoot;

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

    const newItem: any = {
      "@context": "http://iiif.io/api/presentation/3/context.json",
      id: `https://archive.local/iiif/${type.toLowerCase()}/${crypto.randomUUID()}`,
      type,
      label: { none: [`New ${type}`] },
      items: [],
      behavior: type === 'Manifest' ? ['individuals'] : undefined
    };

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
    const target = findNode(newRoot, id);
    if (target) {
      Object.assign(target, updates);
      onUpdate(newRoot);
    }
  }, [root, cloneTree, findNode, onUpdate]);

  const handleAddManifestToCollection = useCallback((manifestId: string, collectionId: string) => {
    if (!root) return;
    const newRoot = cloneTree(root);
    const collection = findNode(newRoot, collectionId);
    const manifest = findNode(newRoot, manifestId);

    if (!collection || !manifest || collection.type !== 'Collection') {
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
    const collection = findNode(newRoot, collectionId);

    if (!collection || collection.type !== 'Collection') return;

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
    const parent = findNode(newRoot, selectedId);

    if (!parent || !parent.items) return;

    const [moved] = parent.items.splice(fromIndex, 1);
    parent.items.splice(toIndex, 0, moved);
    onUpdate(newRoot);
  }, [root, selectedId, cloneTree, findNode, onUpdate]);

  // Handle remove items
  const handleRemoveItems = useCallback((ids: string[]) => {
    if (!root || !selectedId) return;
    const newRoot = cloneTree(root);
    const parent = findNode(newRoot, selectedId);

    if (!parent || !parent.items) return;

    parent.items = parent.items.filter((item: IIIFItem) => !ids.includes(item.id));
    onUpdate(newRoot);
    setMultiSelectedIds(new Set());
    showToast(`Removed ${ids.length} item(s)`, "success");
  }, [root, selectedId, cloneTree, findNode, onUpdate, showToast]);

  // Handle duplicate items
  const handleDuplicateItems = useCallback((ids: string[]) => {
    if (!root || !selectedId) return;
    const newRoot = cloneTree(root);
    const parent = findNode(newRoot, selectedId);

    if (!parent || !parent.items) return;

    const duplicates: IIIFItem[] = [];
    ids.forEach(id => {
      const item = parent.items.find((i: IIIFItem) => i.id === id);
      if (item) {
        const duplicate = JSON.parse(JSON.stringify(item));
        duplicate.id = `${item.id}_copy_${crypto.randomUUID().slice(0, 8)}`;
        if (duplicate.label) {
          const originalLabel = getIIIFValue(duplicate.label);
          duplicate.label = { none: [`${originalLabel} (Copy)`] };
        }
        duplicates.push(duplicate);
      }
    });

    parent.items.push(...duplicates);
    onUpdate(newRoot);
    showToast(`Duplicated ${ids.length} item(s)`, "success");
  }, [root, selectedId, cloneTree, findNode, onUpdate, showToast]);

  const selectedNode = root && selectedId ? findNode(root, selectedId) : null;
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
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            <Icon name={sidebarCollapsed ? "menu" : "menu_open"} className="text-slate-500" />
          </button>
          <div className="p-2 bg-iiif-blue/10 rounded-lg text-iiif-blue">
            <Icon name="account_tree" className="text-2xl" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Structure</h1>
            <p className="text-xs text-slate-500">
              {stats.collections} Collections · {stats.manifests} Manifests · {stats.canvases} Canvases
            </p>
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
            <Icon name="create_new_folder" className="text-amber-600" /> Collection
          </button>
          <button
            onClick={() => handleCreateType('Manifest', selectedId)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Icon name="note_add" className="text-emerald-600" /> Manifest
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
        {/* Left Pane - Tree Sidebar */}
        <div
          className={`flex flex-col border-r border-slate-200 bg-white shadow-inner transition-all duration-300 ${
            sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-72'
          }`}
        >
          <div className="h-10 border-b bg-slate-50 flex items-center px-3 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archive Tree</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {root ? (
              <TreeNode
                node={root}
                selectedId={selectedId}
                onSelect={handleSelect}
                onDrop={handleReorderDrag}
                level={0}
                referenceMap={referenceMap}
              />
            ) : null}
          </div>
        </div>

        {/* Middle Pane - Structure Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedNode && (isManifest(selectedNode) || isCollection(selectedNode)) ? (
            <>
              <StructureCanvas
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
                      onClick={() => setMultiSelectedIds(new Set())}
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
                  {selectedNode.type === 'Canvas' && (
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
                  {selectedNode.type === 'Canvas' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                      <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden mb-4">
                        {resolveThumbUrl(selectedNode, 800) ? (
                          <img
                            src={resolveThumbUrl(selectedNode, 800) || ''}
                            alt={getIIIFValue(selectedNode.label)}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <Icon name="image" className="text-4xl" />
                          </div>
                        )}
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

                  <MuseumLabel title="IIIF Hierarchy Model" type="field-note">
                    <strong>Collections</strong> are curated lists that reference resources.
                    <strong>Manifests</strong> own their Canvases exclusively.
                    A Manifest can appear in multiple Collections - think of it like a book that can be in multiple reading lists.
                  </MuseumLabel>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 italic bg-slate-50">
              Select a structural node to view its contents
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TreeNodeProps {
  node: IIIFItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDrop: (draggedId: string, targetId: string) => void;
  level: number;
  referenceMap: Map<string, string[]>;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  selectedId,
  onSelect,
  onDrop,
  level,
  referenceMap
}) => {
  const [expanded, setExpanded] = React.useState(level < 3);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const isSelected = node.id === selectedId;
  const children = (node as any).items || (node as any).annotations || [];
  const isAtDepthLimit = level >= MAX_NESTING_DEPTH;

  const config = RESOURCE_TYPE_CONFIG[node.type] || RESOURCE_TYPE_CONFIG['Content'];

  const nodeIsCollection = node.type === 'Collection';
  const nodeIsManifest = node.type === 'Manifest';
  const canAcceptDrop = (nodeIsCollection || nodeIsManifest) && !isAtDepthLimit;

  // Get reference count
  const refCount = referenceMap.get(node.id)?.length || 0;

  // Get thumbnail
  const thumbUrl = resolveHierarchicalThumb(node, 40);

  return (
    <div style={{ paddingLeft: level > 0 ? 12 : 0 }} className="mb-0.5">
      <div
        draggable
        onDragStart={e => e.dataTransfer.setData('resourceId', node.id)}
        onDragOver={e => { if (canAcceptDrop) { e.preventDefault(); setIsDragOver(true); } }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => { e.preventDefault(); setIsDragOver(false); if (canAcceptDrop) onDrop(e.dataTransfer.getData('resourceId'), node.id); }}
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all select-none border ${isDragOver ? 'bg-blue-100 border-blue-500' : isSelected ? 'bg-white border-blue-400 shadow-md font-bold' : 'hover:bg-slate-50 text-slate-700 border-transparent'}`}
        onClick={() => onSelect(node.id)}
      >
        <div
          className={`p-0.5 rounded hover:bg-black/10 ${!children.length ? 'invisible' : ''}`}
          onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          <Icon name={expanded ? "expand_more" : "chevron_right"} className="text-[14px]" />
        </div>

        {/* Thumbnail */}
        {thumbUrl ? (
          <div className="w-6 h-6 rounded bg-slate-100 overflow-hidden shrink-0">
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="relative">
            <Icon name={config.icon} className={`text-[18px] ${isSelected ? config.colorClass : 'text-slate-400'}`} />
            {nodeIsCollection && level > 0 && (
              <Icon name="link" className="absolute -bottom-1 -right-1 text-[10px] text-amber-500" />
            )}
          </div>
        )}

        <span className="text-sm truncate flex-1">{getIIIFValue(node.label) || 'Untitled'}</span>

        {/* Reference badge */}
        {refCount > 1 && (
          <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold" title={`Referenced in ${refCount} Collections`}>
            {refCount}
          </span>
        )}

        {/* Type badge */}
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
          nodeIsCollection ? 'bg-amber-100 text-amber-600' :
          nodeIsManifest ? 'bg-emerald-100 text-emerald-600' :
          'bg-slate-100 text-slate-500'
        }`}>
          {node.type === 'Collection' ? 'COLL' :
           node.type === 'Manifest' ? 'MAN' :
           node.type === 'Canvas' ? 'CVS' : ''}
        </span>

        {isAtDepthLimit && children.length > 0 && (
          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
            Depth limit
          </span>
        )}
      </div>

      {expanded && children.length > 0 && !isAtDepthLimit && (
        <div className="border-l border-slate-200 ml-4 mt-0.5 space-y-0.5">
          {children.map((child: any) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onDrop={onDrop}
              level={level + 1}
              referenceMap={referenceMap}
            />
          ))}
        </div>
      )}

      {expanded && children.length > 0 && isAtDepthLimit && (
        <div className="ml-4 mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
          <Icon name="warning" className="text-amber-500" />
          <span>{children.length} nested items not shown (depth limit reached)</span>
        </div>
      )}
    </div>
  );
};
