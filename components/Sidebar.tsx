
import React, { useMemo, useState } from 'react';
import { AppMode, getIIIFValue, IIIFCollection, IIIFItem, IIIFManifest, ViewType } from '../types';
import { Icon } from './Icon';
import { Toolbar } from './Toolbar';
import { CONSTANTS, RESOURCE_TYPE_CONFIG } from '../constants';
import {
  getRelationshipType,
  getValidChildTypes,
  isValidChildType
} from '../utils/iiifHierarchy';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { useAppSettings } from '@/src/app/providers/useAppSettings';

interface SidebarProps {
  root: IIIFItem | null;
  selectedId: string | null;
  currentMode: AppMode;
  viewType: ViewType;
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
  onToggleQuickHelp?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
  /** Current abstraction level for the toggle */
  abstractionLevel?: import('../types').AbstractionLevel;
  /** Handler for abstraction level changes */
  onAbstractionLevelChange?: (level: import('../types').AbstractionLevel) => void;
}

const NavItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void; fieldMode: boolean; disabled?: boolean; title?: string }> = ({ icon, label, active, onClick, fieldMode, disabled, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-current={active ? 'page' : undefined}
    aria-label={`${label} View`}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium snappy-transition group active:scale-95 ${active ? (fieldMode ? 'bg-yellow-400 text-black font-black border-2 border-black shadow-md' : 'bg-iiif-blue text-white shadow-md transform scale-[1.02]') : (fieldMode ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:translate-x-1')} ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
  >
    <Icon name={icon} className={`transition-transform duration-300 ${active ? (fieldMode ? "text-black" : "text-white") : "text-slate-500 group-hover:scale-110"}`} />
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(item.id);
    } else if (e.key === 'ArrowRight' && hasChildren && !expanded) {
      e.preventDefault();
      setExpanded(true);
    } else if (e.key === 'ArrowLeft' && hasChildren && expanded) {
      e.preventDefault();
      setExpanded(false);
    }
  };

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
              // Use centralized IIIF hierarchy validation
              if (!draggedNode) return false;

              // Validate parent-child relationship using IIIF 3.0 rules
              if (!isValidChildType(parent.type, draggedNode.type)) {
                const validChildren = getValidChildTypes(parent.type);
                console.warn(
                  `Cannot drop ${draggedNode.type} into ${parent.type}. ` +
                  `Valid children: ${validChildren.join(', ') || 'none'}`
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
          if (success) onStructureUpdate(newRoot);
      }
  };

  if (!isMatch && !hasChildren) return null;

  return (
    <div className="select-none" role="none">
      <div 
        draggable onDragStart={handleDragStart} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={`flex items-center gap-2 cursor-pointer snappy-transition border-l-4 outline-none focus-visible-ring group ${fieldMode ? 'py-3' : 'py-1.5 border-l-2'} ${isSelected ? (fieldMode ? 'bg-yellow-400 border-yellow-600 text-black font-bold shadow-md scale-[1.01]' : 'bg-slate-800 border-iiif-blue text-white shadow-inner') : (fieldMode ? 'border-transparent text-slate-200 hover:bg-slate-800 hover:border-slate-700' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 hover:border-slate-700')}`}
        style={{ paddingLeft: level * (fieldMode ? 20 : 12) + 4 }}
        onClick={() => onSelect(item.id)}
      >
        <button 
          aria-label={expanded ? `Collapse ${displayLabel}` : `Expand ${displayLabel}`}
          aria-expanded={expanded}
          tabIndex={-1}
          className={`p-1 rounded hover:bg-white/10 transition-transform active:scale-95 ${!hasChildren ? 'invisible' : ''}`} 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          <Icon name={expanded ? "expand_more" : "chevron_right"} className={`transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'} ${fieldMode ? "text-xl" : "text-[16px]"}`} />
        </button>
        <Icon 
          name={viewType === 'files' ? 'folder' : config.icon} 
          className={`transition-colors ${fieldMode ? 'text-2xl' : 'text-[18px]'} ${!isSelected ? config.colorClass : ''} group-hover:brightness-125`} 
        />
        <span className={`${fieldMode ? "text-base font-bold" : "text-[11px] font-medium"} truncate transition-colors`}>{displayLabel}</span>
      </div>
      {hasChildren && expanded && (
        <div role="group" className="animate-fade-in origin-top">
          {children.map((child: any) => (
            <TreeItem key={child.id} item={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} viewType={viewType} fieldMode={fieldMode} root={root} onStructureUpdate={onStructureUpdate} filterText={filterText} filterType={filterType}/>
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = React.memo(function Sidebar({
  root, selectedId, currentMode, viewType, onSelect, onModeChange, onViewTypeChange,
  onImport, onExportTrigger, onToggleFieldMode, onStructureUpdate, visible, onOpenExternalImport,
  onOpenSettings, onToggleQuickHelp, isMobile, onClose, abstractionLevel = 'standard', onAbstractionLevelChange
}) {
  const { settings } = useAppSettings();
  const {fieldMode} = settings;
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Resizable panel hook for desktop
  const {
    size: sidebarWidth,
    isResizing,
    handleProps,
    panelStyle,
  } = useResizablePanel({
    id: 'sidebar',
    defaultSize: 256,
    minSize: 200,
    maxSize: 400,
    direction: 'horizontal',
    side: 'right', // resize handle on right side of sidebar
    collapseThreshold: 0, // Don't auto-collapse, use visible prop instead
    persist: true,
  });

  const sidebarStyles = isMobile
    ? `fixed inset-y-0 left-0 z-[1000] w-72 shadow-2xl transition-transform duration-300 ${visible ? 'translate-x-0' : '-translate-x-full'}`
    : `flex flex-col h-full border-r shrink-0 relative`;

  const bgStyles = fieldMode ? 'bg-black border-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300';

  return (
    <>
      {isMobile && visible && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[950]" onClick={onClose}></div>
      )}
      <aside
        className={`${sidebarStyles} ${bgStyles} flex flex-col overflow-hidden`}
        style={isMobile ? undefined : panelStyle}
      >
        {/* Fixed Header */}
        <div className={`flex items-center px-4 shrink-0 gap-3 ${fieldMode ? 'h-20 border-b border-slate-700' : 'h-14 border-b border-slate-800'}`}>
          <div className={`rounded flex items-center justify-center font-bold text-xs shadow-lg ${fieldMode ? 'w-10 h-10 bg-yellow-400 text-black' : 'w-8 h-8 bg-iiif-blue text-white'}`}>IIIF</div>
          <div className="flex-1 overflow-hidden">
            <div className={`${fieldMode ? 'text-yellow-400 text-lg' : 'text-white text-sm'} font-black tracking-tight truncate`}>{CONSTANTS.APP_NAME}</div>
            <div className={`${fieldMode ? 'text-slate-400' : 'text-slate-500'} text-[10px] uppercase font-black tracking-widest`}>v{CONSTANTS.VERSION}</div>
          </div>
          {isMobile && (
              <button onClick={onClose} aria-label="Close sidebar" className="p-2 text-slate-500 hover:text-white"><Icon name="close"/></button>
          )}
        </div>
        
        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
            <nav className={`p-3 space-y-2 border-b shrink-0 ${fieldMode ? 'border-slate-700' : 'border-slate-800'}`}>
              <NavItem icon="inventory_2" label="Archive" active={currentMode === 'archive'} onClick={() => onModeChange('archive')} fieldMode={fieldMode} />
              <NavItem icon="account_tree" label="Structure" active={currentMode === 'structure'} onClick={() => onModeChange('structure')} fieldMode={fieldMode} />
              <NavItem icon="folder_special" label="Staging" active={currentMode === 'collections'} onClick={() => onModeChange('collections')} fieldMode={fieldMode} />
              <NavItem icon="table_chart" label="Catalog" active={currentMode === 'metadata'} onClick={() => onModeChange('metadata')} fieldMode={fieldMode} />
              <NavItem icon="dashboard" label="Boards" active={currentMode === 'boards'} onClick={() => onModeChange('boards')} fieldMode={fieldMode} />
              <NavItem icon="search" label="Search" active={currentMode === 'search'} onClick={() => onModeChange('search')} fieldMode={fieldMode} />
              <NavItem icon="delete_outline" label="Trash" active={currentMode === 'trash'} onClick={() => onModeChange('trash')} fieldMode={fieldMode} />
              <NavItem
                icon="visibility"
                label="Viewer"
                active={currentMode === 'viewer'}
                onClick={() => selectedId ? onModeChange('viewer') : null}
                fieldMode={fieldMode}
                disabled={!selectedId}
                title={selectedId ? "Open selected item in viewer" : "Select an item to view"}
              />
            </nav>

            <div className="px-4 py-3 flex flex-col gap-2 bg-black/10 shrink-0 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <span id="view-type-label">{viewType === 'files' ? 'Physical Disk' : 'Archival Model'}</span>
                  <div role="group" aria-labelledby="view-type-label" className={`flex rounded p-0.5 ${fieldMode ? 'bg-slate-800 border border-slate-600' : 'bg-slate-800'}`}>
                  <button aria-pressed={viewType === 'files'} className={`px-2 py-0.5 rounded transition-all ${viewType === 'files' ? (fieldMode ? 'bg-white text-black' : 'bg-slate-600 text-white') : 'hover:text-slate-300'}`} onClick={() => onViewTypeChange('files')}>Files</button>
                  <button aria-pressed={viewType === 'iiif'} className={`px-2 py-0.5 rounded transition-all ${viewType === 'iiif' ? (fieldMode ? 'bg-white text-black' : 'bg-slate-600 text-white') : 'hover:text-slate-300'}`} onClick={() => onViewTypeChange('iiif')}>IIIF</button>
                  </div>
              </div>
              <div className="flex gap-1">
                  <div className="relative group flex-1">
                      <input 
                          type="text" 
                          value={filterText} 
                          onChange={e => setFilterText(e.target.value)} 
                          placeholder="Filter..." 
                          aria-label="Filter archive items"
                          className={`w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 outline-none focus:border-iiif-blue transition-all ${fieldMode ? 'placeholder:text-slate-600' : 'placeholder:text-slate-500'}`}
                      />
                      <Icon name="filter_list" className="absolute right-2 top-2 text-[14px] text-slate-500 group-hover:text-slate-300" />
                  </div>
                  <select 
                    value={filterType}
                    aria-label="Filter by resource type"
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

            <div className="flex-1 pb-4" role="tree" aria-label="Archive Structure">
              {root ? <TreeItem item={root} level={0} selectedId={selectedId} onSelect={onSelect} viewType={viewType} fieldMode={fieldMode} root={root} onStructureUpdate={onStructureUpdate} filterText={filterText} filterType={filterType}/> : <div className="p-8 text-center text-slate-600 text-sm italic">No field project active.</div>}
            </div>
        </div>

        {/* Fixed Footer - Toolbar */}
        <div className={`border-t shrink-0 ${fieldMode ? 'bg-black border-slate-700' : 'bg-slate-900 border-slate-800'}`}>
          <Toolbar
            fieldMode={fieldMode}
            onImport={onImport}
            onOpenExternalImport={onOpenExternalImport}
            onExportTrigger={onExportTrigger}
            onOpenSettings={onOpenSettings}
            onToggleFieldMode={onToggleFieldMode}
            onToggleQuickHelp={onToggleQuickHelp}
            abstractionLevel={abstractionLevel}
            onAbstractionLevelChange={onAbstractionLevelChange}
          />
        </div>

        {/* Resize Handle - Desktop Only */}
        {!isMobile && (
          <div
            {...handleProps}
            className={`
              absolute right-0 top-0 bottom-0 w-1 z-30 group
              cursor-col-resize
              transition-colors duration-150
              hover:bg-slate-500/20
              ${isResizing ? (fieldMode ? 'bg-yellow-400/30' : 'bg-iiif-blue/30') : ''}
              ${handleProps.className}
            `}
          >
            {/* Visual drag indicator */}
            <div
              className={`
                absolute right-0 top-1/2 -translate-y-1/2
                w-1 h-12 rounded-full
                transition-all duration-150
                opacity-0 group-hover:opacity-100 group-focus:opacity-100
                ${isResizing
                  ? (fieldMode ? 'bg-yellow-400 opacity-100' : 'bg-iiif-blue opacity-100')
                  : (fieldMode ? 'bg-slate-600 group-hover:bg-yellow-400' : 'bg-slate-500 group-hover:bg-iiif-blue')
                }
              `}
            />
          </div>
        )}
      </aside>
    </>
  );
}, (prev, next) => {
  // Custom comparison: only re-render if root ID or selectedId changes.
  // fieldMode changes propagate via useAppSettings context, bypassing memo.
  return prev.root?.id === next.root?.id &&
         prev.selectedId === next.selectedId;
});
