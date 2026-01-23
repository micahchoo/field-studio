
import React, { useState } from 'react';
import { IIIFItem, IIIFCollection, IIIFManifest, IIIFCanvas, AbstractionLevel, IIIFRange, getIIIFValue } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { MuseumLabel } from '../MuseumLabel';
import { RESOURCE_TYPE_CONFIG } from '../../constants';
import { autoStructureService } from '../../services/autoStructure';

interface CollectionsViewProps {
  root: IIIFItem | null;
  onUpdate: (newRoot: IIIFItem) => void;
  abstractionLevel?: AbstractionLevel;
  onReveal?: (id: string, mode: any) => void;
  onSynthesize?: (id: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({ root, onUpdate, abstractionLevel = 'standard', onReveal, onSynthesize }) => {
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(root?.id || null);

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
      
      const newItem: any = {
          id: `https://archive.local/iiif/${type.toLowerCase()}/${crypto.randomUUID()}`,
          type,
          label: { none: [`New ${type}`] },
          items: []
      };

      if (target && (target.type === 'Collection' || target.type === 'Manifest')) {
          if (!target.items) target.items = [];
          target.items.push(newItem);
          onUpdate(newRoot);
          showToast(`New ${type} Added`, "success");
      }
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
              if (parent.type !== 'Collection' && parent.type !== 'Manifest') return false;
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

  return (
    <div className="flex flex-col h-full bg-slate-100">
      <div className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-iiif-blue/10 rounded-lg text-iiif-blue"><Icon name="account_tree" className="text-2xl" /></div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Structure</h1>
            <p className="text-xs text-slate-500">Hierarchy & Organization</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {selectedNode?.type === 'Manifest' && (
                <button onClick={handleAutoStructure} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-100 transition-all mr-4">
                    <Icon name="auto_awesome" className="text-amber-500" /> Build TOC
                </button>
            )}
            <button onClick={() => handleCreateType('Collection', selectedId)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                <Icon name="create_new_folder" className="text-amber-600" /> Collection
            </button>
            <button onClick={() => handleCreateType('Manifest', selectedId)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
                <Icon name="note_add" className="text-emerald-600" /> Manifest
            </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-80 flex flex-col border-r border-slate-200 bg-white shadow-inner overflow-y-auto p-4 custom-scrollbar">
            {root ? (
                <TreeNode node={root} selectedId={selectedId} onSelect={setSelectedId} onDrop={handleReorderDrag} level={0} />
            ) : null}
        </div>

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
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-iiif-blue transition-all"
                             >
                                <Icon name="inventory_2" className="text-xs"/> Reveal in Archive
                             </button>
                             {selectedNode.type === 'Manifest' && (
                                <button 
                                    onClick={() => onSynthesize?.(selectedNode.id)}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-all shadow-sm"
                                >
                                    <Icon name="layers" className="text-xs"/> Synthesis Workbench
                                </button>
                             )}
                             {selectedNode.type === 'Canvas' && (
                                <button 
                                    onClick={() => onReveal?.(selectedNode.id, 'viewer')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-iiif-blue transition-all"
                                >
                                    <Icon name="visibility" className="text-xs"/> View in Workbench
                                </button>
                             )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 bg-slate-100/50">
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b pb-4">
                                    <Icon name="auto_fix_high" className="text-iiif-blue" /> Structural Modeling
                                </h3>
                                
                                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                                    <h4 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Behavior Policies</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(['individuals', 'paged', 'continuous', 'unordered'] as const).map(b => (
                                            <button 
                                                key={b} 
                                                onClick={() => handleUpdate(selectedId!, { behavior: [b] })}
                                                className={`p-3 rounded-lg border text-left flex items-center justify-between transition-all ${selectedNode.behavior?.includes(b) ? 'bg-iiif-blue text-white border-iiif-blue shadow-lg scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-iiif-blue'}`}
                                            >
                                                <span className="text-xs font-bold capitalize">{b}</span>
                                                {selectedNode.behavior?.includes(b) && <Icon name="check_circle" className="text-sm"/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <MuseumLabel title="Inheritance Logic" type="field-note">
                                Behavior values chosen here will propagate down to all nested Canvases unless overridden. "Paged" mode is recommended for book-like digitized artifacts.
                            </MuseumLabel>
                        </div>
                    </div>
                </>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-300 italic">Select a structural node to configure</div>
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
    const [expanded, setExpanded] = React.useState(true);
    const [isDragOver, setIsDragOver] = React.useState(false);
    const isSelected = node.id === selectedId;
    const children = (node as any).items || (node as any).annotations || [];
    
    const config = RESOURCE_TYPE_CONFIG[node.type] || RESOURCE_TYPE_CONFIG['Content'];

    return (
        <div style={{ paddingLeft: level > 0 ? 12 : 0 }} className="mb-0.5">
            <div
                draggable onDragStart={e => e.dataTransfer.setData('resourceId', node.id)}
                onDragOver={e => { if (node.type !== 'Canvas') { e.preventDefault(); setIsDragOver(true); } }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); onDrop(e.dataTransfer.getData('resourceId'), node.id); }}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all select-none border ${isDragOver ? 'bg-blue-100 border-blue-500' : isSelected ? `bg-white border-blue-400 shadow-md font-bold` : 'hover:bg-slate-50 text-slate-700 border-transparent'}`}
                onClick={() => onSelect(node.id)}
            >
                <div className={`p-0.5 rounded hover:bg-black/10 ${!children.length ? 'invisible' : ''}`} onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}>
                    <Icon name={expanded ? "expand_more" : "chevron_right"} className="text-[14px]" />
                </div>
                <Icon name={config.icon} className={`text-[18px] ${isSelected ? config.colorClass : 'text-slate-400'}`} />
                <span className={`text-sm truncate`}>{getIIIFValue(node.label) || 'Untitled'}</span>
            </div>
            {expanded && children.length > 0 && (
                <div className="border-l border-slate-200 ml-4 mt-0.5 space-y-0.5">
                    {children.map((child: any) => <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} onDrop={onDrop} level={level + 1} />)}
                </div>
            )}
        </div>
    );
};
