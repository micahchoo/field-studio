
import React, { useState } from 'react';
import { IIIFItem, IIIFCollection, AppMode, ViewType } from '../types';
import { Icon } from './Icon';
import { CONSTANTS } from '../constants';

interface SidebarProps {
  root: IIIFItem | null;
  selectedId: string | null;
  currentMode: AppMode;
  viewType: ViewType;
  fieldMode: boolean;
  onSelect: (id: string) => void;
  onModeChange: (mode: AppMode) => void;
  onViewTypeChange: (type: ViewType) => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportTrigger: () => void;
  onToggleFieldMode: () => void;
  visible: boolean;
}

const NavItem: React.FC<{ 
  icon: string; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  fieldMode: boolean;
}> = ({ icon, label, active, onClick, fieldMode }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
      active 
        ? (fieldMode ? 'bg-yellow-400 text-black font-black border-2 border-black' : 'bg-iiif-blue text-white shadow-sm')
        : (fieldMode ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200')
    }`}
  >
    <Icon name={icon} className={active ? (fieldMode ? "text-black" : "text-white") : "text-slate-500"} />
    <span className={fieldMode ? "text-lg" : "text-sm"}>{label}</span>
  </button>
);

const TreeItem: React.FC<{ 
  item: IIIFItem; 
  level: number; 
  selectedId: string | null; 
  onSelect: (id: string) => void;
  viewType: ViewType;
  fieldMode: boolean;
}> = ({ item, level, selectedId, onSelect, viewType, fieldMode }) => {
  const [expanded, setExpanded] = useState(true); 
  const isSelected = item.id === selectedId;
  const isCollection = item.type === 'Collection';
  const hasChildren = isCollection && (item as IIIFCollection).items?.length > 0;
  
  const label = item.label?.['none']?.[0] || item.label?.['en']?.[0] || 'Untitled';
  const displayLabel = viewType === 'files' && isCollection && label !== 'My Archive' 
    ? `_${label}` 
    : label;

  const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('application/iiif-item-id', item.id);
      e.dataTransfer.setData('text/plain', item.id);
      e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="select-none">
      <div 
        draggable
        onDragStart={handleDragStart}
        className={`flex items-center gap-2 cursor-pointer transition-colors border-l-4 ${
          fieldMode ? 'py-3' : 'py-1 border-l-2'
        } ${
          isSelected 
            ? (fieldMode ? 'bg-yellow-400 border-yellow-600 text-black font-bold' : 'bg-slate-800 border-iiif-blue text-white')
            : (fieldMode ? 'border-transparent text-slate-200 hover:bg-slate-800' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50')
        }`}
        style={{ paddingLeft: level * (fieldMode ? 16 : 12) + 4 }}
        onClick={(e) => { 
          e.stopPropagation(); 
          onSelect(item.id); 
        }}
      >
        <div 
          className={`p-0.5 rounded hover:bg-white/10 ${!hasChildren ? 'invisible' : ''}`}
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          <Icon name={expanded ? "expand_more" : "chevron_right"} className={fieldMode ? "text-xl" : "text-[16px]"} />
        </div>
        
        <Icon 
          name={item.type === 'Collection' ? "folder" : item.type === 'Manifest' ? "menu_book" : "image"} 
          className={`${fieldMode ? 'text-2xl' : 'text-[18px]'} ${!isSelected && (item.type === 'Collection' ? 'text-amber-500' : 'text-blue-400')}`} 
        />
        
        <span className={`${fieldMode ? "text-base font-medium" : "text-sm"} truncate`}>{displayLabel}</span>
      </div>
      
      {hasChildren && expanded && (
        <div>
          {(item as IIIFCollection).items.map(child => (
            <TreeItem 
              key={child.id} 
              item={child} 
              level={level + 1} 
              selectedId={selectedId} 
              onSelect={onSelect}
              viewType={viewType}
              fieldMode={fieldMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  root, selectedId, currentMode, viewType, fieldMode,
  onSelect, onModeChange, onViewTypeChange, onImport, onExportTrigger, onToggleFieldMode, visible
}) => {
  if (!visible) return null;

  return (
    <aside className={`flex flex-col h-full border-r transition-all duration-300 shrink-0 ${
        fieldMode ? 'w-80 bg-black border-slate-700' : 'w-64 bg-slate-900 border-slate-800 text-slate-300'
    }`}>
      {/* Header */}
      <div className={`flex items-center px-4 shrink-0 gap-3 ${fieldMode ? 'h-20 border-b border-slate-700' : 'h-14 border-b border-slate-800'}`}>
        <div className={`rounded flex items-center justify-center font-bold text-xs ${fieldMode ? 'w-10 h-10 bg-yellow-400 text-black' : 'w-8 h-8 bg-iiif-blue text-white'}`}>IIIF</div>
        <div>
          <div className={`${fieldMode ? 'text-yellow-400 text-lg' : 'text-white text-sm'} font-bold tracking-tight`}>{CONSTANTS.APP_NAME}</div>
          <div className={`${fieldMode ? 'text-slate-400' : 'text-slate-500'} text-[10px] uppercase tracking-wider`}>Field Studio v{CONSTANTS.VERSION}</div>
        </div>
      </div>

      {/* Navigation */}
      <div className={`p-3 space-y-2 border-b ${fieldMode ? 'border-slate-700' : 'border-slate-800'}`}>
        <NavItem icon="inventory_2" label="Archive" active={currentMode === 'archive'} onClick={() => onModeChange('archive')} fieldMode={fieldMode} />
        <NavItem icon="library_books" label="Collections" active={currentMode === 'collections'} onClick={() => onModeChange('collections')} fieldMode={fieldMode} />
        <NavItem icon="dashboard" label="Boards" active={currentMode === 'boards'} onClick={() => onModeChange('boards')} fieldMode={fieldMode} />
        <NavItem icon="search" label="Search" active={currentMode === 'search'} onClick={() => onModeChange('search')} fieldMode={fieldMode} />
      </div>

      {/* View Toggle */}
      <div className="px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
        <span>Explorer</span>
        <div className={`flex rounded p-0.5 ${fieldMode ? 'bg-slate-800 border border-slate-600' : 'bg-slate-800'}`}>
          <button 
            className={`px-3 py-1 rounded transition-colors ${viewType === 'files' ? (fieldMode ? 'bg-white text-black' : 'bg-slate-600 text-white') : 'hover:text-slate-300'}`}
            onClick={() => onViewTypeChange('files')}
          >
            Files
          </button>
          <button 
            className={`px-3 py-1 rounded transition-colors ${viewType === 'iiif' ? (fieldMode ? 'bg-white text-black' : 'bg-slate-600 text-white') : 'hover:text-slate-300'}`}
            onClick={() => onViewTypeChange('iiif')}
          >
            IIIF
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
        {root ? (
          <TreeItem 
            item={root} 
            level={0} 
            selectedId={selectedId} 
            onSelect={onSelect}
            viewType={viewType}
            fieldMode={fieldMode}
          />
        ) : (
          <div className="p-4 text-center text-slate-600 text-sm italic">
            No archive loaded.<br/>Import files to begin.
          </div>
        )}
      </div>

      {/* Footer / Import / Export */}
      <div className={`p-4 border-t space-y-3 ${fieldMode ? 'bg-black border-slate-700' : 'bg-slate-900 border-slate-800'}`}>
        <label className={`flex items-center justify-center gap-2 w-full py-3 rounded cursor-pointer transition-all border group ${
            fieldMode 
                ? 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700 hover:border-yellow-400' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600'
        }`}>
          <Icon name="upload_file" className="group-hover:scale-110 transition-transform"/>
          <span className="text-xs font-bold uppercase">Import Folder</span>
          <input type="file" multiple {...({ webkitdirectory: "" } as any)} {...({ directory: "" } as any)} className="hidden" onChange={onImport} />
        </label>
        
        <button 
            onClick={onToggleFieldMode}
            className={`flex items-center justify-center gap-2 w-full py-2 rounded text-xs font-bold uppercase transition-all ${
                fieldMode 
                    ? 'bg-yellow-400 text-black shadow-lg hover:bg-yellow-300' 
                    : 'bg-transparent text-slate-500 border border-transparent hover:border-slate-600 hover:text-slate-300'
            }`}
        >
            <Icon name={fieldMode ? "visibility" : "visibility_off"} />
            {fieldMode ? "Field Mode On" : "Field Mode Off"}
        </button>
      </div>
    </aside>
  );
};
