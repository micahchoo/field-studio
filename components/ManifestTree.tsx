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
  const label = item.label?.['en']?.[0] || item.label?.['none']?.[0] || 'Untitled';

  // Determine icon based on type
  const getIcon = () => {
    switch (item.type) {
      case 'Collection': return 'folder';
      case 'Manifest': return 'menu_book';
      case 'Canvas': return 'image';
      case 'Range': return 'segment';
      case 'AnnotationPage': return 'notes';
      default: return 'description';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(item.id);
    }
  };

  // Check if this item has children to render
  const children = (item as any).items;
  const hasChildren = children && children.length > 0;

  return (
    <div className="select-none" role="none">
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? true : undefined}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-slate-800 transition-colors outline-none focus:ring-2 focus:ring-iiif-blue/50 ${isSelected ? 'bg-iiif-blue text-white' : 'text-slate-400'}`}
        style={{ paddingLeft: level * 12 + 8 }}
        onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
      >
        <Icon name={getIcon()} className="text-sm" />
        <span className="text-xs truncate font-medium">{label}</span>
      </div>
      {hasChildren && children.map((child: IIIFItem) => (
        <TreeItem key={child.id} item={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
};

export const ManifestTree: React.FC<ManifestTreeProps> = ({ root, selectedId, onSelect }) => {
  if (!root) return <div className="p-4 text-xs text-slate-500">No archive loaded.</div>;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 border-r border-slate-800" role="tree" aria-label="Archive Explorer">
      <div className="p-3 border-b border-slate-800">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Archive Explorer</h2>
      </div>
      <TreeItem item={root} level={0} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
};
