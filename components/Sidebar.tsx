
import React, { useState, useMemo } from 'react';
import { IIIFItem, IIIFCollection, AppMode, ViewType, IIIFManifest, getIIIFValue } from '../types';
import { Icon } from './Icon';
import { CONSTANTS, RESOURCE_TYPE_CONFIG } from '../constants';

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
  onStructureUpdate?: (newRoot: IIIFItem) => void;
  visible: boolean;
  onOpenExternalImport: () => void;
  onOpenSettings: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

const NavItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void; fieldMode: boolean; }> = ({ icon, label, active, onClick, fieldMode }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${active ? (fieldMode ? 'bg-yellow-400 text-black font-black border-2 border-black' : 'bg-iiif-blue text-white shadow-sm') : (fieldMode ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200')}`}>
    <Icon name={icon} className={active ? (fieldMode ? "text-black" : "text-white") : "text-slate-500"} />
    <span className={fieldMode ? "text-lg" : "text-sm"}>{label}</span>
  </button>
);

const TreeItem: React.FC<{ 
  item: IIIFItem; level: number; selectedId: string | null; onSelect: (id: string) => void; 
  viewType: ViewType; fieldMode: boolean; root: IIIFItem | null; onStructureUpdate?: any;
  filterText: string;
  filterType: string;
}> = ({ item, level, selectedId, onSelect, viewType, fieldMode, root, onStructureUpdate, filterText, filterType }) => {
  const [expanded, setExpanded] = useState(true); 
  const isSelected = item.id === selectedId;
  
  const config = RESOURCE_TYPE_CONFIG[item.type] || RESOURCE_TYPE_CONFIG['Content'];
  const children = (item as any).items || (item as any).annotations || [];
  const hasChildren = children.length > 0;
  
  const label = getIIIFValue(item.label) || 'Untitled';
  const displayLabel = viewType === 'files' ? ((item as any)._filename || item.id.split('/').pop()) : label;

  // Filter Logic
  const matchesText = !filterText || displayLabel.toLowerCase().includes(filterText.toLowerCase());
  const matchesType = filterType === 'All' || item.type === filterType;
  const isMatch = matchesText && matchesType;

  const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('application/iiif-item-id', item.id);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('application/iiif-item-id');
      if (draggedId === item.id || !onStructureUpdate || !root) return;

      const newRoot = JSON.parse(JSON.stringify(root));
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
          if (parent.id === item.id) {
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
          if (success) onStructureUpdate(newRoot);
      }
  };

  // If node doesn't match and has no children, hide it. 
  // Ideally, we'd also check if children match to keep parents open, but simple filtering is sufficient here.
  if (!isMatch && !hasChildren) return null;

  return (
    <div className="select-none">
      <div 
        draggable onDragStart={handleDragStart} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
        className={`flex items-center gap-2 cursor-pointer transition-all border-l-4 ${fieldMode ? 'py-3' : 'py-1.5 border-l-2'} ${isSelected ? (fieldMode ? 'bg-yellow-400 border-yellow-600 text-black font-bold' : 'bg-slate-800 border-iiif-blue text-white shadow-inner') : (fieldMode ? 'border-transparent text-slate-200 hover:bg-slate-800' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50')}`}
        style={{ paddingLeft: level * (fieldMode ? 20 : 12) + 4 }}
        onClick={() => onSelect(item.id)}
      >
        <div className={`p-1 rounded hover:bg-white/10 ${!hasChildren ? 'invisible' : ''}`} onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
          <Icon name={expanded ? "expand_more" : "chevron_right"} className={fieldMode ? "text-xl" : "text-[16px]"} />
        </div>
        <Icon 
          name={viewType === 'files' ? 'folder' : config.icon} 
          className={`${fieldMode ? 'text-2xl' : 'text-[18px]'} ${!isSelected ? config.colorClass : ''}`} 
        />
        <span className={`${fieldMode ? "text-base font-bold" : "text-[11px] font-medium"} truncate`}>{displayLabel}</span>
      </div>
      {hasChildren && expanded && (
        <div>
          {children.map((child: any) => (
            <TreeItem key={child.id} item={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} viewType={viewType} fieldMode={fieldMode} root={root} onStructureUpdate={onStructureUpdate} filterText={filterText} filterType={filterType}/>
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ root, selectedId, currentMode, viewType, fieldMode, onSelect, onModeChange, onViewTypeChange, onImport, onExportTrigger, onToggleFieldMode, onStructureUpdate, visible, onOpenExternalImport, onOpenSettings, isMobile, onClose }) => {
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const sidebarStyles = isMobile 
    ? `fixed inset-y-0 left-0 z-[1000] w-72 shadow-2xl transition-transform duration-300 ${visible ? 'translate-x-0' : '-translate-x-full'}`
    : `flex flex-col h-full border-r transition-all duration-300 shrink-0 w-64`;

  const bgStyles = fieldMode ? 'bg-black border-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300';

  return (
    <>
      {isMobile && visible && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[950]" onClick={onClose}></div>
      )}
      <aside className={`${sidebarStyles} ${bgStyles} flex flex-col overflow-hidden`}>
        {/* Fixed Header */}
        <div className={`flex items-center px-4 shrink-0 gap-3 ${fieldMode ? 'h-20 border-b border-slate-700' : 'h-14 border-b border-slate-800'}`}>
          <div className={`rounded flex items-center justify-center font-bold text-xs shadow-lg ${fieldMode ? 'w-10 h-10 bg-yellow-400 text-black' : 'w-8 h-8 bg-iiif-blue text-white'}`}>IIIF</div>
          <div className="flex-1 overflow-hidden">
            <div className={`${fieldMode ? 'text-yellow-400 text-lg' : 'text-white text-sm'} font-black tracking-tight truncate`}>{CONSTANTS.APP_NAME}</div>
            <div className={`${fieldMode ? 'text-slate-400' : 'text-slate-500'} text-[10px] uppercase font-black tracking-widest`}>v{CONSTANTS.VERSION}</div>
          </div>
          {isMobile && (
              <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><Icon name="close"/></button>
          )}
        </div>
        
        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
            <div className={`p-3 space-y-2 border-b shrink-0 ${fieldMode ? 'border-slate-700' : 'border-slate-800'}`}>
              <NavItem icon="inventory_2" label="Archive" active={currentMode === 'archive'} onClick={() => onModeChange('archive')} fieldMode={fieldMode} />
              <NavItem icon="account_tree" label="Structure" active={currentMode === 'collections'} onClick={() => onModeChange('collections')} fieldMode={fieldMode} />
              <NavItem icon="table_chart" label="Catalog" active={currentMode === 'metadata'} onClick={() => onModeChange('metadata')} fieldMode={fieldMode} />
              <NavItem icon="dashboard" label="Boards" active={currentMode === 'boards'} onClick={() => onModeChange('boards')} fieldMode={fieldMode} />
              <NavItem icon="search" label="Search" active={currentMode === 'search'} onClick={() => onModeChange('search')} fieldMode={fieldMode} />
            </div>

            <div className="px-4 py-3 flex flex-col gap-2 bg-black/10 shrink-0 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <span>{viewType === 'files' ? 'Physical Disk' : 'Archival Model'}</span>
                  <div className={`flex rounded p-0.5 ${fieldMode ? 'bg-slate-800 border border-slate-600' : 'bg-slate-800'}`}>
                  <button className={`px-2 py-0.5 rounded transition-all ${viewType === 'files' ? (fieldMode ? 'bg-white text-black' : 'bg-slate-600 text-white') : 'hover:text-slate-300'}`} onClick={() => onViewTypeChange('files')}>Files</button>
                  <button className={`px-2 py-0.5 rounded transition-all ${viewType === 'iiif' ? (fieldMode ? 'bg-white text-black' : 'bg-slate-600 text-white') : 'hover:text-slate-300'}`} onClick={() => onViewTypeChange('iiif')}>IIIF</button>
                  </div>
              </div>
              <div className="flex gap-1">
                  <div className="relative group flex-1">
                      <input 
                          type="text" 
                          value={filterText} 
                          onChange={e => setFilterText(e.target.value)} 
                          placeholder="Filter..." 
                          className={`w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 outline-none focus:border-iiif-blue transition-all ${fieldMode ? 'placeholder:text-slate-600' : 'placeholder:text-slate-500'}`}
                      />
                      <Icon name="filter_list" className="absolute right-2 top-2 text-[14px] text-slate-500 group-hover:text-slate-300" />
                  </div>
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className={`w-16 text-[10px] bg-slate-800 border border-slate-700 rounded-lg px-1 outline-none text-slate-400 font-bold focus:border-iiif-blue`}
                  >
                      <option value="All">All</option>
                      <option value="Collection">Coll.</option>
                      <option value="Manifest">Manif.</option>
                      <option value="Canvas">Canvas</option>
                  </select>
              </div>
            </div>

            <div className="flex-1 pb-4">
              {root ? <TreeItem item={root} level={0} selectedId={selectedId} onSelect={onSelect} viewType={viewType} fieldMode={fieldMode} root={root} onStructureUpdate={onStructureUpdate} filterText={filterText} filterType={filterType}/> : <div className="p-8 text-center text-slate-600 text-sm italic">No field project active.</div>}
            </div>
        </div>

        {/* Fixed Footer */}
        <div className={`p-4 border-t space-y-3 shrink-0 ${fieldMode ? 'bg-black border-slate-700' : 'bg-slate-900 border-slate-800'}`}>
          <div className="grid grid-cols-2 gap-2">
              <label className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl cursor-pointer transition-all border group ${fieldMode ? 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700 hover:border-yellow-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500'}`}>
                  <Icon name="upload_file" className="text-xl group-hover:scale-110 transition-transform"/><span className="text-[10px] font-black uppercase tracking-tighter">Folder</span>
                  <input type="file" multiple {...({ webkitdirectory: "" } as any)} className="hidden" onChange={onImport} />
              </label>
              <button onClick={onOpenExternalImport} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl cursor-pointer transition-all border group ${fieldMode ? 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700 hover:border-yellow-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500'}`}>
                  <Icon name="cloud_download" className="text-xl group-hover:scale-110 transition-transform"/><span className="text-[10px] font-black uppercase tracking-tighter">Remote</span>
              </button>
          </div>
          <div className="flex gap-2">
               <button onClick={onExportTrigger} className="flex-1 bg-iiif-blue text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                  <Icon name="publish"/> Export
               </button>
               <button onClick={onOpenSettings} className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all" title="Settings">
                  <Icon name="tune" />
               </button>
               <button onClick={onToggleFieldMode} className={`p-3 rounded-xl transition-all border ${fieldMode ? 'bg-yellow-400 border-yellow-600 text-black' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`} title="Field Mode">
                  <Icon name={fieldMode ? "visibility" : "visibility_off"} />
               </button>
          </div>
        </div>
      </aside>
    </>
  );
};
