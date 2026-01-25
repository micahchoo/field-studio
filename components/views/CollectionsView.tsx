
import React, { useState, useMemo } from 'react';
import { IIIFItem, IIIFCollection, IIIFManifest, IIIFCanvas, AbstractionLevel, getIIIFValue, isCollection, isManifest } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { MuseumLabel } from '../MuseumLabel';
import { RESOURCE_TYPE_CONFIG } from '../../constants';
import { autoStructureService } from '../../services/autoStructure';
import {
  findAllOfType,
  findCollectionsContaining,
  isValidChildType,
  getRelationshipType,
  getValidChildTypes
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
}

// findAllOfType and findCollectionsContaining are now imported from utils/iiifHierarchy

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  root,
  onUpdate,
  abstractionLevel = 'standard',
  onReveal,
  onSynthesize,
  onSelect,
  selectedId: externalSelectedId
}) => {
  const { showToast } = useToast();
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(root?.id || null);
  const [showAddToCollection, setShowAddToCollection] = useState(false);

  const selectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  const handleSelect = (id: string) => {
    setInternalSelectedId(id);
    onSelect?.(id);
  };

  // Gather stats about the archive
  const stats = useMemo(() => {
    if (!root) return { collections: 0, manifests: 0, canvases: 0 };
    const collections = findAllOfType(root, 'Collection').length;
    const manifests = findAllOfType(root, 'Manifest').length;
    const canvases = findAllOfType(root, 'Canvas').length;
    return { collections, manifests, canvases };
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

  const findNode = (node: IIIFItem, id: string): IIIFItem | null => {
    if (node.id === id) return node;
    const children = (node as any).items || (node as any).annotations || [];
    for (const child of children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  };

  const cloneTree = (node: IIIFItem): IIIFItem => JSON.parse(JSON.stringify(node));

  const handleAutoStructure = () => {
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
  };

  const handleCreateType = (type: 'Collection' | 'Manifest', parentId: string | null) => {
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
      behavior: type === 'Manifest' ? ['individuals'] : undefined // Default behavior for Manifests
    };

    // Log relationship type
    const relationship = getRelationshipType(target.type, type);
    console.log(`Creating ${relationship} relationship: ${target.type} → ${type}`);

    if (!target.items) target.items = [];
    target.items.push(newItem);
    onUpdate(newRoot);
    showToast(`New ${type} added (${relationship} relationship)`, "success");
  };

  const handleUpdate = (id: string, updates: Partial<IIIFItem>) => {
    if (!root) return;
    const newRoot = cloneTree(root);
    const target = findNode(newRoot, id);
    if (target) {
      Object.assign(target, updates);
      onUpdate(newRoot);
    }
  };

  /**
   * Add an existing Manifest to a Collection
   * This creates a REFERENCE - the same Manifest can be in multiple Collections
   */
  const handleAddManifestToCollection = (manifestId: string, collectionId: string) => {
    if (!root) return;
    const newRoot = cloneTree(root);
    const collection = findNode(newRoot, collectionId);
    const manifest = findNode(newRoot, manifestId);

    if (!collection || !manifest || collection.type !== 'Collection') {
      showToast("Cannot add to collection", "error");
      return;
    }

    // Check if already in this collection
    const existingRef = (collection as IIIFCollection).items?.find(item => item.id === manifestId);
    if (existingRef) {
      showToast("Manifest is already in this Collection", "info");
      return;
    }

    // Add reference to the manifest (not a copy - same ID)
    // In IIIF 3.0, Collections reference resources by ID
    if (!(collection as IIIFCollection).items) {
      (collection as IIIFCollection).items = [];
    }

    // Clone manifest for the collection (they share the same ID)
    (collection as IIIFCollection).items.push(JSON.parse(JSON.stringify(manifest)));

    onUpdate(newRoot);
    showToast(`Added "${getIIIFValue(manifest.label)}" to "${getIIIFValue(collection.label)}"`, "success");
    setShowAddToCollection(false);
  };

  /**
   * Remove a reference from a Collection (doesn't delete the Manifest)
   */
  const handleRemoveFromCollection = (manifestId: string, collectionId: string) => {
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
  };

  const handleReorderDrag = (draggedId: string, targetId: string) => {
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
        // Use centralized IIIF hierarchy validation
        if (!draggedNode) return false;

        // Validate parent-child relationship using IIIF 3.0 rules
        if (!isValidChildType(parent.type, draggedNode.type)) {
          const validChildren = getValidChildTypes(parent.type);
          showToast(
            `Cannot move ${draggedNode.type} into ${parent.type}. ` +
            `Valid children: ${validChildren.join(', ') || 'none'}`,
            'error'
          );
          return false;
        }

        // Log relationship type for debugging
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
  };

  const selectedNode = root && selectedId ? findNode(root, selectedId) : null;
  const nodeConfig = selectedNode ? (RESOURCE_TYPE_CONFIG[selectedNode.type] || RESOURCE_TYPE_CONFIG['Content']) : RESOURCE_TYPE_CONFIG['Content'];

  // Find which collections contain the selected item (if it's a Manifest)
  const containingCollections = useMemo(() => {
    if (!root || !selectedNode || selectedNode.type !== 'Manifest') return [];
    return findCollectionsContaining(root, selectedNode.id);
  }, [root, selectedNode]);

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Header */}
      <div className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
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
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Tree Panel */}
        <div className="w-80 flex flex-col border-r border-slate-200 bg-white shadow-inner overflow-y-auto p-4 custom-scrollbar">
          {root ? (
            <TreeNode
              node={root}
              selectedId={selectedId}
              onSelect={handleSelect}
              onDrop={handleReorderDrag}
              level={0}
            />
          ) : null}
        </div>

        {/* Detail Panel */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {selectedNode ? (
            <>
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
                  {selectedNode.type === 'Manifest' && (
                    <button
                      onClick={() => {
                        const firstCanvas = (selectedNode as any).items?.[0];
                        if (firstCanvas) {
                          onReveal?.(firstCanvas.id, 'viewer');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-iiif-blue hover:bg-slate-100 rounded-lg transition-all"
                      title="Open the first canvas of this manifest in the viewer"
                    >
                      <Icon name="play_arrow" className="text-sm" /> Preview
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-slate-100/50">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* IIIF Hierarchy Info for Collections */}
                  {selectedNode.type === 'Collection' && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl">
                          <Icon name="library_books" className="text-2xl text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-amber-800 mb-1">Collection: Curated References</h3>
                          <p className="text-sm text-amber-700 leading-relaxed">
                            In IIIF, Collections are <strong>organizational overlays</strong> that reference Manifests and other Collections.
                            The same Manifest can appear in multiple Collections - they're pointers, not containers.
                          </p>
                          <div className="mt-3 flex items-center gap-4 text-xs text-amber-600">
                            <span className="flex items-center gap-1">
                              <Icon name="description" className="text-sm" />
                              {((selectedNode as IIIFCollection).items?.filter(i => i.type === 'Manifest').length || 0)} Manifests
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="folder" className="text-sm" />
                              {((selectedNode as IIIFCollection).items?.filter(i => i.type === 'Collection').length || 0)} Sub-Collections
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Add existing Manifest to this Collection */}
                      <div className="mt-4 pt-4 border-t border-amber-200">
                        <button
                          onClick={() => setShowAddToCollection(!showAddToCollection)}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-all"
                        >
                          <Icon name="add_link" /> Add Existing Manifest to Collection
                        </button>

                        {showAddToCollection && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200">
                            <p className="text-xs text-slate-500 mb-2">Select a Manifest to add to this Collection:</p>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {allManifests
                                .filter(m => !(selectedNode as IIIFCollection).items?.some(i => i.id === m.id))
                                .map(manifest => (
                                  <button
                                    key={manifest.id}
                                    onClick={() => handleAddManifestToCollection(manifest.id, selectedNode.id)}
                                    className="w-full flex items-center gap-2 p-2 hover:bg-amber-50 rounded text-left text-sm"
                                  >
                                    <Icon name="description" className="text-emerald-500" />
                                    <span className="truncate">{getIIIFValue(manifest.label)}</span>
                                  </button>
                                ))}
                              {allManifests.filter(m => !(selectedNode as IIIFCollection).items?.some(i => i.id === m.id)).length === 0 && (
                                <p className="text-xs text-slate-400 italic p-2">All Manifests are already in this Collection</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* IIIF Hierarchy Info for Manifests */}
                  {selectedNode.type === 'Manifest' && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-100 rounded-xl">
                          <Icon name="menu_book" className="text-2xl text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-emerald-800 mb-1">Manifest: Atomic Publishing Unit</h3>
                          <p className="text-sm text-emerald-700 leading-relaxed">
                            Manifests are the <strong>primary shareable unit</strong> in IIIF - like a complete book or artwork.
                            They can exist standalone or be referenced by multiple Collections.
                          </p>
                          <div className="mt-3 flex items-center gap-4 text-xs text-emerald-600">
                            <span className="flex items-center gap-1">
                              <Icon name="image" className="text-sm" />
                              {((selectedNode as IIIFManifest).items?.length || 0)} Canvases
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Show which Collections contain this Manifest */}
                      {containingCollections.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-emerald-200">
                          <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">
                            Appears in {containingCollections.length} Collection{containingCollections.length !== 1 ? 's' : ''}:
                          </h4>
                          <div className="space-y-1">
                            {containingCollections.map(coll => (
                              <div
                                key={coll.id}
                                className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-100"
                              >
                                <span className="flex items-center gap-2 text-sm">
                                  <Icon name="folder" className="text-amber-500" />
                                  {getIIIFValue(coll.label)}
                                </span>
                                <button
                                  onClick={() => handleRemoveFromCollection(selectedNode.id, coll.id)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded"
                                  title="Remove from this Collection"
                                >
                                  <Icon name="link_off" className="text-sm" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Behavior Policies */}
                  <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b pb-4">
                      <Icon name="auto_fix_high" className="text-iiif-blue" /> Structural Modeling
                    </h3>

                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Behavior Policies</h4>
                      <p className="text-xs text-slate-500 mb-4">
                        Behaviors tell IIIF viewers how to display the content. Choose the one that best matches your material.
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        {([
                          { key: 'individuals', label: 'Individuals', desc: 'Each canvas is shown separately (photos, single pages)' },
                          { key: 'paged', label: 'Paged', desc: 'Two-page spreads like an open book (manuscripts, books)' },
                          { key: 'continuous', label: 'Continuous', desc: 'Scrolling view for long content (scrolls, panoramas)' },
                          { key: 'unordered', label: 'Unordered', desc: 'No specific order (collections of related items)' }
                        ] as const).map(b => (
                          <button
                            key={b.key}
                            onClick={() => handleUpdate(selectedId!, { behavior: [b.key] })}
                            className={`p-4 rounded-lg border text-left transition-all ${selectedNode.behavior?.includes(b.key) ? 'bg-iiif-blue text-white border-iiif-blue shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:border-iiif-blue hover:bg-blue-50'}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold">{b.label}</span>
                              {selectedNode.behavior?.includes(b.key) && <Icon name="check_circle" className="text-sm" />}
                            </div>
                            <span className={`text-xs ${selectedNode.behavior?.includes(b.key) ? 'text-white/80' : 'text-slate-400'}`}>
                              {b.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <MuseumLabel title="IIIF Hierarchy Model" type="field-note">
                    <strong>Collections</strong> are curated lists that reference resources.
                    <strong>Manifests</strong> own their Canvases exclusively.
                    A Manifest can appear in multiple Collections - think of it like a book that can be in multiple reading lists.
                  </MuseumLabel>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 italic">
              Select a structural node to configure
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TreeNode: React.FC<{
  node: IIIFItem;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDrop: (draggedId: string, targetId: string) => void;
  level: number;
}> = ({ node, selectedId, onSelect, onDrop, level }) => {
  const [expanded, setExpanded] = React.useState(level < 5);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const isSelected = node.id === selectedId;
  const children = (node as any).items || (node as any).annotations || [];
  const isAtDepthLimit = level >= MAX_NESTING_DEPTH;

  const config = RESOURCE_TYPE_CONFIG[node.type] || RESOURCE_TYPE_CONFIG['Content'];

  // Determine node relationship type
  const isCollection = node.type === 'Collection';
  const isManifest = node.type === 'Manifest';

  // Can accept drops into Collections and Manifests
  const canAcceptDrop = (isCollection || isManifest) && !isAtDepthLimit;

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

        {/* Icon with relationship indicator */}
        <div className="relative">
          <Icon name={config.icon} className={`text-[18px] ${isSelected ? config.colorClass : 'text-slate-400'}`} />
          {/* Show link icon for Collection items (they're references, not owned) */}
          {isCollection && level > 0 && (
            <Icon name="link" className="absolute -bottom-1 -right-1 text-[10px] text-amber-500" />
          )}
        </div>

        <span className="text-sm truncate">{getIIIFValue(node.label) || 'Untitled'}</span>

        {/* Type badge */}
        <span className={`ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
          isCollection ? 'bg-amber-100 text-amber-600' :
          isManifest ? 'bg-emerald-100 text-emerald-600' :
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
