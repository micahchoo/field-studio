
import React, { useState, useRef } from 'react';
import { IIIFItem, IIIFCollection, IIIFManifest, AbstractionLevel } from '../../types';
import { Icon } from '../Icon';
import { RangeEditor } from '../RangeEditor';

interface CollectionsViewProps {
  root: IIIFItem | null;
  onUpdate: (newRoot: IIIFItem) => void;
  abstractionLevel?: AbstractionLevel;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({ root, onUpdate, abstractionLevel = 'standard' }) => {
  const [selectedId, setSelectedId] = useState<string | null>(root?.id || null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'details' | 'structure' | 'json'>('details');

  // Helper to find a node by ID
  const findNode = (node: IIIFItem, id: string): IIIFItem | null => {
    if (node.id === id) return node;
    if (node.items) {
      for (const child of node.items) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to clone the tree deeply (simplified for JSON structures)
  const cloneTree = (node: IIIFItem): IIIFItem => JSON.parse(JSON.stringify(node));

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDragId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string, position: 'inside' | 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (sourceId === targetId) return;
    if (!root) return;

    // Clone root to mutate
    const newRoot = cloneTree(root);
    
    // Find parent of source
    const findParent = (node: IIIFItem, childId: string): IIIFItem | null => {
        if (!node.items) return null;
        if (node.items.some(i => i.id === childId)) return node;
        for (const child of node.items) {
            const p = findParent(child, childId);
            if (p) return p;
        }
        return null;
    };

    const sourceParent = findParent(newRoot, sourceId);
    if (!sourceParent || !sourceParent.items) return;

    const sourceIndex = sourceParent.items.findIndex(i => i.id === sourceId);
    const [movedItem] = sourceParent.items.splice(sourceIndex, 1);

    // Find target and insert
    if (position === 'inside') {
        const targetNode = findNode(newRoot, targetId);
        if (targetNode && targetNode.type === 'Collection') {
             if (!targetNode.items) targetNode.items = [];
             targetNode.items.push(movedItem);
        } else {
            // Fallback: put back
            sourceParent.items.splice(sourceIndex, 0, movedItem);
            return;
        }
    } else {
        const targetParent = findParent(newRoot, targetId);
        if (targetParent && targetParent.items) {
            const targetIndex = targetParent.items.findIndex(i => i.id === targetId);
            const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
            targetParent.items.splice(insertIndex, 0, movedItem);
        } else {
             // Fallback
             sourceParent.items.splice(sourceIndex, 0, movedItem);
             return;
        }
    }

    onUpdate(newRoot);
    setDragId(null);
  };

  const handleCreateCollection = () => {
      if (!root) return;
      const newRoot = cloneTree(root);
      const target = selectedId ? findNode(newRoot, selectedId) : newRoot;
      
      if (target && target.type === 'Collection') {
          const newCollection: IIIFCollection = {
              "@context": "http://iiif.io/api/presentation/3/context.json",
              id: `https://archive.local/iiif/collection/${crypto.randomUUID()}`,
              type: "Collection",
              label: { none: ["New Collection"] },
              items: []
          };
          if (!target.items) target.items = [];
          target.items.push(newCollection);
          onUpdate(newRoot);
      }
  };

  const handleDelete = () => {
      if (!root || !selectedId || selectedId === root.id) return;
      if (!confirm("Are you sure you want to delete this item?")) return;
      
      const newRoot = cloneTree(root);
      const findParent = (node: IIIFItem, childId: string): IIIFItem | null => {
          if (!node.items) return null;
          if (node.items.some(i => i.id === childId)) return node;
          for (const child of node.items) {
              const p = findParent(child, childId);
              if (p) return p;
          }
          return null;
      };

      const parent = findParent(newRoot, selectedId);

      if (parent && parent.items) {
          const idx = parent.items.findIndex(i => i.id === selectedId);
          parent.items.splice(idx, 1);
          onUpdate(newRoot);
          setSelectedId(null);
      }
  };

  const handleUpdateManifest = (updatedManifest: IIIFManifest) => {
      if (!root) return;
      const newRoot = cloneTree(root);
      const target = findNode(newRoot, updatedManifest.id);
      if (target) {
          Object.assign(target, updatedManifest);
          onUpdate(newRoot);
      }
  };

  const selectedNode = root && selectedId ? findNode(root, selectedId) : null;

  if (!root) return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">
          <div className="text-center">
              <Icon name="library_books" className="text-6xl mb-4 text-slate-300" />
              <p>No archive loaded.</p>
          </div>
      </div>
  );

  return (
    <div className="flex h-full bg-slate-100">
      {/* Sidebar / Tree Editor */}
      <div className="w-1/3 min-w-[300px] flex flex-col border-r border-slate-200 bg-white">
        <div className="h-14 border-b px-4 flex items-center justify-between bg-slate-50">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <Icon name="schema" className="text-iiif-blue"/> Hierarchy
            </h2>
            <div className="flex gap-1">
                <button onClick={handleCreateCollection} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="New Collection">
                    <Icon name="create_new_folder"/>
                </button>
                <button onClick={handleDelete} className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded text-slate-600" title="Delete Selected">
                    <Icon name="delete"/>
                </button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <TreeNode 
                node={root} 
                selectedId={selectedId} 
                onSelect={setSelectedId} 
                onDrop={handleDrop}
                onDragStart={handleDragStart}
            />
        </div>
      </div>

      {/* Main / Preview */}
      <div className="flex-1 flex flex-col bg-slate-50">
         {selectedNode ? (
             <>
                <div className="h-14 border-b px-6 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Icon name={selectedNode.type === 'Collection' ? 'folder' : 'menu_book'} className="text-slate-400"/>
                        <h2 className="font-bold text-slate-800 truncate">{selectedNode.label?.['none']?.[0] || 'Untitled'}</h2>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{selectedNode.type}</span>
                    </div>
                    <div className="flex bg-slate-100 rounded p-1">
                        <button 
                            className={`px-3 py-1 text-xs font-bold rounded ${previewTab === 'details' ? 'bg-white shadow text-iiif-blue' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setPreviewTab('details')}
                        >
                            Details
                        </button>
                        {selectedNode.type === 'Manifest' && (
                             <button 
                                className={`px-3 py-1 text-xs font-bold rounded ${previewTab === 'structure' ? 'bg-white shadow text-iiif-blue' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setPreviewTab('structure')}
                            >
                                Structure
                            </button>
                        )}
                        {abstractionLevel !== 'simple' && (
                            <button 
                                className={`px-3 py-1 text-xs font-bold rounded ${previewTab === 'json' ? 'bg-white shadow text-iiif-blue' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setPreviewTab('json')}
                            >
                                JSON-LD
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    {previewTab === 'details' && (
                        <div className="p-8 max-w-2xl mx-auto overflow-y-auto h-full">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
                                {abstractionLevel !== 'simple' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ID</label>
                                        <div className="text-xs font-mono bg-slate-50 p-2 rounded break-all text-slate-600 select-all">{selectedNode.id}</div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Label</label>
                                    <div className="text-lg font-medium text-slate-800">{selectedNode.label?.['none']?.[0]}</div>
                                </div>
                                {selectedNode.type === 'Collection' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contents</label>
                                        <div className="text-sm text-slate-600">{(selectedNode as IIIFCollection).items?.length || 0} items</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {previewTab === 'structure' && selectedNode.type === 'Manifest' && (
                        <RangeEditor manifest={selectedNode as IIIFManifest} onUpdate={handleUpdateManifest} />
                    )}
                    {previewTab === 'json' && abstractionLevel !== 'simple' && (
                        <div className="absolute inset-0 p-4">
                            <textarea 
                                className="w-full h-full font-mono text-xs bg-slate-900 text-green-400 p-4 rounded-lg resize-none focus:outline-none"
                                readOnly
                                value={JSON.stringify(selectedNode, null, 2)}
                            />
                        </div>
                    )}
                </div>
             </>
         ) : (
             <div className="flex-1 flex items-center justify-center text-slate-400">
                 <p>Select an item to view details.</p>
             </div>
         )}
      </div>
    </div>
  );
};

const TreeNode: React.FC<{
    node: IIIFItem;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDrop: (e: React.DragEvent, targetId: string, position: 'inside' | 'before' | 'after') => void;
    level?: number;
}> = ({ node, selectedId, onSelect, onDragStart, onDrop, level = 0 }) => {
    const [expanded, setExpanded] = useState(true);
    const [dragOver, setDragOver] = useState<'none' | 'top' | 'middle' | 'bottom'>('none');
    
    const isSelected = node.id === selectedId;
    const isCollection = node.type === 'Collection';
    const hasChildren = isCollection && (node as IIIFCollection).items?.length > 0;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;
        
        if (isCollection) {
            // Collections can accept drops inside
            if (y < height * 0.25) setDragOver('top');
            else if (y > height * 0.75) setDragOver('bottom');
            else setDragOver('middle');
        } else {
            // Leafs can only accept before/after
            if (y < height * 0.5) setDragOver('top');
            else setDragOver('bottom');
        }
    };

    const handleDropInternal = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        let position: 'inside' | 'before' | 'after' = 'inside';
        
        if (dragOver === 'top') position = 'before';
        if (dragOver === 'bottom') position = 'after';
        if (dragOver === 'middle') position = 'inside';
        
        onDrop(e, node.id, position);
        setDragOver('none');
    };

    return (
        <div style={{ paddingLeft: level > 0 ? 12 : 0 }}>
            <div 
                className={`
                    relative flex items-center gap-2 p-1.5 rounded cursor-pointer border-2 transition-colors select-none
                    ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-transparent border-transparent hover:bg-slate-100'}
                    ${dragOver === 'top' ? 'border-t-iiif-blue' : ''}
                    ${dragOver === 'bottom' ? 'border-b-iiif-blue' : ''}
                    ${dragOver === 'middle' ? 'bg-amber-50 border-amber-300' : ''}
                `}
                onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
                draggable
                onDragStart={(e) => onDragStart(e, node.id)}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragOver('none')}
                onDrop={handleDropInternal}
            >
                 <div 
                    className={`p-0.5 rounded hover:bg-slate-200 ${!hasChildren ? 'invisible' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                >
                    <Icon name={expanded ? "expand_more" : "chevron_right"} className="text-slate-400 text-[16px]" />
                </div>
                <Icon 
                    name={isCollection ? "folder" : node.type === 'Manifest' ? "menu_book" : "image"} 
                    className={`text-[18px] ${isCollection ? 'text-amber-500' : 'text-blue-400'}`} 
                />
                <span className="text-sm truncate text-slate-700">{node.label?.['none']?.[0] || 'Untitled'}</span>
            </div>
            {hasChildren && expanded && (
                <div>
                    {(node as IIIFCollection).items.map(child => (
                        <TreeNode 
                            key={child.id} 
                            node={child} 
                            selectedId={selectedId} 
                            onSelect={onSelect} 
                            onDragStart={onDragStart}
                            onDrop={onDrop}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
