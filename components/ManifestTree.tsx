import React from 'react';
import { IIIFItem, IIIFCollection, IIIFManifest } from '../types';
import { Icon } from './Icon';

interface ManifestTreeProps {
  root: IIIFItem | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TreeItem: React.FC<{ item: IIIFItem; level: number; selectedId: string | null; onSelect: (id: string) => void }> = ({ item, level, selectedId, onSelect }) => {
  const isSelected = item.id === selectedId;
  const isCollection = item.type === 'Collection';
  
  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-slate-800 transition-colors ${isSelected ? 'bg-iiif-blue text-white' : 'text-slate-400'}`}
        style={{ paddingLeft: level * 12 + 8 }}
        onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
      >
        <Icon name={isCollection ? "folder" : "menu_book"} className="text-sm" />
        <span className="text-xs truncate font-medium">{item.label?.['en']?.[0] || item.label?.['none']?.[0] || 'Untitled'}</span>
      </div>
      {isCollection && (item as IIIFCollection).items?.map(child => (
        <TreeItem key={child.id} item={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
};

export const ManifestTree: React.FC<ManifestTreeProps> = ({ root, selectedId, onSelect }) => {
  if (!root) return <div className="p-4 text-xs text-slate-500">No archive loaded.</div>;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 border-r border-slate-800">
      <div className="p-3 border-b border-slate-800">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Archive Explorer</h2>
      </div>
      <TreeItem item={root} level={0} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
};