
import React, { useMemo, useState } from 'react';
import { AppMode, getIIIFValue, IIIFItem, ViewType } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { CONSTANTS, RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';
import {
  getRelationshipType,
  getValidChildTypes,
  isValidChildType
} from '../utils/iiifHierarchy';
import { useResizablePanel } from '@/src/shared/lib/hooks/useResizablePanel';
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
  abstractionLevel?: import('../types').AbstractionLevel;
  onAbstractionLevelChange?: (level: import('../types').AbstractionLevel) => void;
}

// Clean navigation item - Field mode: high contrast black/yellow
const NavItem: React.FC<{ 
  icon: string; 
  label: string; 
  active: boolean; 
  onClick: () => void; 
  fieldMode: boolean; 
  disabled?: boolean; 
  title?: string;
}> = ({ icon, label, active, onClick, fieldMode, disabled, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-current={active ? 'page' : undefined}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-150 group
      ${active 
        ? (fieldMode 
          ? 'bg-yellow-400 text-black font-bold shadow-lg shadow-yellow-400/20 border-2 border-yellow-400' 
          : 'bg-slate-700 text-white shadow-sm') 
        : (fieldMode 
          ? 'text-yellow-400/80 hover:bg-yellow-400/10 hover:text-yellow-400 border-2 border-transparent' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300')
      }
      ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}
    `}
  >
    <Icon 
      name={icon} 
      className={`
        text-lg transition-colors
        ${active 
          ? (fieldMode ? "text-black" : "text-white") 
          : (fieldMode ? "text-yellow-400/70 group-hover:text-yellow-400" : "text-slate-500 group-hover:text-slate-300")
        }
      `} 
    />
    <span className="text-sm">{label}</span>
  </button>
);

// Types that should show in sidebar - stop at Canvas level, don't show AnnotationPages or Content Resources
const SIDEBAR_VISIBLE_TYPES = new Set(['Collection', 'Manifest', 'Canvas', 'Range']);
const STOP_TRAVERSAL_TYPES = new Set(['AnnotationPage', 'Annotation', 'Choice', 'SpecificResource']);

const TreeItem: React.FC<{ 
  item: IIIFItem; level: number; selectedId: string | null; onSelect: (id: string) => void; 
  viewType: ViewType; fieldMode: boolean; root: IIIFItem | null; onStructureUpdate?: any;
  filterText: string;
}> = ({ item, level, selectedId, onSelect, viewType, fieldMode, root, onStructureUpdate, filterText }) => {
  const [expanded, setExpanded] = useState(true); 
  const isSelected = item.id === selectedId;
  
  const config = RESOURCE_TYPE_CONFIG[item.type] || RESOURCE_TYPE_CONFIG['Content'];
  
  // Get children but filter out types we don't want to show
  const rawChildren = (item as any).items || (item as any).annotations || [];
  const children = rawChildren.filter((child: any) => !STOP_TRAVERSAL_TYPES.has(child.type));
  const hasChildren = children.length > 0;
  
  // Stop rendering if this is a content-level type
  if (STOP_TRAVERSAL_TYPES.has(item.type)) return null;
  
  const label = getIIIFValue(item.label) || 'Untitled';
  const displayLabel = viewType === 'files' ? ((item as any)._filename || item.id.split('/').pop()) : label;

  // Filter logic - check if this item or any children match
  const matchesText = !filterText || displayLabel.toLowerCase().includes(filterText.toLowerCase());
  const childMatches = hasChildren && children.some((child: any) => {
    const childLabel = getIIIFValue(child.label) || child.id || '';
    return childLabel.toLowerCase().includes(filterText.toLowerCase());
  });
  const isMatch = matchesText || childMatches;

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
              if (!draggedNode) return false;
              if (!isValidChildType(parent.type, draggedNode.type)) {
                const validChildren = getValidChildTypes(parent.type);
                console.warn(`Cannot drop ${draggedNode.type} into ${parent.type}. Valid children: ${validChildren.join(', ') || 'none'}`);
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
          if (success) onStructureUpdate(newRoot);
      }
  };

  if (!isMatch && !hasChildren) return null;

  // Visual styling based on type - Manifests and Canvases get highest priority
  const isPriority = item.type === 'Manifest' || item.type === 'Canvas';
  
  return (
    <div className="select-none" role="none">
      <div 
        draggable onDragStart={handleDragStart} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
        tabIndex={0}
        className={`
          flex items-center gap-2 cursor-pointer snappy-transition outline-none focus-visible-ring group
          border-l-2 py-2
          ${isSelected 
            ? (fieldMode 
              ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400 font-bold shadow-md' 
              : 'bg-blue-500/20 border-blue-500 text-white shadow-inner')
            : (fieldMode 
              ? 'border-transparent text-slate-300 hover:bg-slate-800 hover:border-slate-600' 
              : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/50 hover:border-slate-600')
          }
          ${isPriority && !isSelected ? (fieldMode ? 'text-white' : 'text-slate-200 font-medium') : ''}
        `}
        style={{ 
          // Flat hierarchy - minimal or no indentation, use visual cues instead
          paddingLeft: level === 0 ? 8 : 12 
        }}
        onClick={() => onSelect(item.id)}
      >
        <button 
          aria-label={expanded ? `Collapse ${displayLabel}` : `Expand ${displayLabel}`}
          aria-expanded={expanded}
          tabIndex={-1}
          className={`p-0.5 rounded hover:bg-white/10 transition-transform active:scale-95 ${!hasChildren ? 'invisible' : ''}`} 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          <Icon 
            name={expanded ? "expand_more" : "chevron_right"} 
            className={`transition-transform duration-200 text-base ${expanded ? 'rotate-0' : '-rotate-90'} ${fieldMode ? "text-slate-400" : "text-slate-500"}`} 
          />
        </button>
        
        {/* Visual priority indicator */}
        {isPriority && (
          <div className={`w-1 h-4 rounded-full ${item.type === 'Manifest' ? 'bg-blue-500' : 'bg-emerald-500'} ${isSelected ? 'opacity-100' : 'opacity-70'}`} />
        )}
        
        <Icon 
          name={viewType === 'files' ? 'folder' : config.icon} 
          className={`
            transition-colors text-base
            ${!isSelected ? config.colorClass : ''} 
            group-hover:brightness-125
            ${isPriority ? 'text-lg' : ''}
          `} 
        />
        <span className={`text-xs truncate transition-colors flex-1 ${isPriority ? 'font-medium' : ''}`}>
          {displayLabel}
        </span>
        
        {/* Child count badge for collections */}
        {item.type === 'Collection' && hasChildren && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-700 text-slate-400'}`}>
            {children.length}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div role="group" className="animate-fade-in origin-top">
          {children.map((child: any) => (
            <TreeItem key={child.id} item={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} viewType={viewType} fieldMode={fieldMode} root={root} onStructureUpdate={onStructureUpdate} filterText={filterText}/>
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = React.memo(function Sidebar({
  root, selectedId, currentMode, viewType, onSelect, onModeChange, onViewTypeChange,
  onImport, onExportTrigger, onToggleFieldMode, onStructureUpdate, visible, onOpenExternalImport,
  onOpenSettings, onToggleQuickHelp, isMobile, onClose, onAbstractionLevelChange
}) {
  const { settings, updateSettings } = useAppSettings();
  const [filterText, setFilterText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check if we have data
  const hasData = root && ((root as any).items?.length > 0 || (root as any).type);

  const handleImportClick = () => {
    console.log('[Sidebar] Import button clicked');
    if (fileInputRef.current) {
      console.log('[Sidebar] Triggering file input click');
      fileInputRef.current.click();
    } else {
      console.error('[Sidebar] File input ref is null');
    }
  };

  const handleFieldModeToggle = () => {
    const newFieldMode = !settings.fieldMode;
    updateSettings({ fieldMode: newFieldMode });
    onToggleFieldMode();
  };

  const {
    size: sidebarWidth,
    isResizing,
    handleProps,
    panelStyle,
  } = useResizablePanel({
    id: 'sidebar',
    defaultSize: 280,
    minSize: 260,
    maxSize: 400,
    direction: 'horizontal',
    side: 'right',
    collapseThreshold: 0,
    persist: true,
  });

  const sidebarStyles = isMobile
    ? `fixed inset-y-0 left-0 z-[1000] w-80 shadow-2xl transition-transform duration-300 ${visible ? 'translate-x-0' : '-translate-x-full'}`
    : `flex flex-col h-full border-r shrink-0 relative`;

  // Field mode: high contrast black/yellow, Normal: sleek slate
  const bgStyles = settings.fieldMode 
    ? 'bg-black border-yellow-400/30' 
    : 'bg-slate-900 border-slate-800 text-slate-300';

  return (
    <>
      {isMobile && visible && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[950]" onClick={onClose}></div>
      )}
      <aside
        className={`${sidebarStyles} ${bgStyles} flex flex-col overflow-hidden transition-colors duration-300`}
        style={isMobile ? undefined : panelStyle}
      >
        {/* Compact Header - App branding */}
        <div className={`flex items-center px-3 shrink-0 gap-2 h-12 border-b ${settings.fieldMode ? 'border-yellow-400/30 bg-black' : 'border-slate-800 bg-slate-900'}`}>
          <div className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs shadow transition-colors duration-300 ${settings.fieldMode ? 'bg-yellow-400 text-black' : 'bg-iiif-blue text-white'}`}>
            <Icon name="photo_library" className="text-base" />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className={`text-xs font-bold tracking-tight truncate transition-colors duration-300 ${settings.fieldMode ? 'text-yellow-400' : 'text-white'}`}>
              {CONSTANTS.APP_NAME}
            </div>
            <div className={`text-[9px] transition-colors ${settings.fieldMode ? 'text-yellow-400/60' : 'text-slate-500'}`}>
              {root ? `${(root as any).items?.length || 0} items` : 'No archive'}
            </div>
          </div>
          {isMobile && (
              <button onClick={onClose} aria-label="Close sidebar" className={`p-1.5 transition-colors ${settings.fieldMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-500 hover:text-white'}`}>
                <Icon name="close" className="text-lg"/>
              </button>
          )}
        </div>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
          
          {/* PRIMARY NAVIGATION - Main app sections */}
          <nav className="p-3">
            <div className="space-y-1">
              <NavItem icon="inventory_2" label="Archive" active={currentMode === 'archive'} onClick={() => onModeChange('archive')} fieldMode={settings.fieldMode} />
              <NavItem icon="account_tree" label="Structure" active={currentMode === 'structure'} onClick={() => onModeChange('structure')} fieldMode={settings.fieldMode} />
              <NavItem icon="table_chart" label="Catalog" active={currentMode === 'metadata'} onClick={() => onModeChange('metadata')} fieldMode={settings.fieldMode} />
              <NavItem icon="dashboard" label="Boards" active={currentMode === 'boards'} onClick={() => onModeChange('boards')} fieldMode={settings.fieldMode} />
            </div>
          </nav>

          {/* IMPORT SECTION - High contrast in field mode */}
          <div className="px-3 pb-3">
            <div className={`
              rounded-xl p-4 border-2 transition-colors duration-300
              ${!hasData 
                ? (settings.fieldMode ? 'bg-yellow-400/20 border-yellow-400' : 'bg-blue-600/10 border-blue-500/50')
                : (settings.fieldMode ? 'bg-black border-yellow-400/30' : 'bg-slate-800/50 border-slate-700/50')
              }
            `}>
              <div className={`text-[11px] font-semibold uppercase tracking-wider mb-3 transition-colors ${settings.fieldMode ? 'text-yellow-400' : 'text-slate-400'}`}>
                Import
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                {...({ webkitdirectory: "" } as any)}
                className="hidden"
                onChange={(e) => {
                  console.log('[Sidebar] File input changed:', e.target.files?.length, 'files selected');
                  onImport(e);
                }}
              />
              
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleImportClick}
                  className={`
                    w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg 
                    font-bold text-sm transition-all duration-150
                    ${settings.fieldMode
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/30 border-2 border-yellow-400'
                      : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'
                    }
                  `}
                >
                  <Icon name="folder_open" className="text-base" />
                  Import Folder
                </button>
                
                <button
                  type="button"
                  onClick={onOpenExternalImport}
                  className={`
                    w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                    border-2 font-medium text-sm transition-all duration-150
                    ${settings.fieldMode
                      ? 'bg-black border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }
                  `}
                >
                  <Icon name="cloud_download" className="text-base" />
                  Import from URL
                </button>
              </div>
            </div>
          </div>

          {/* ARCHIVE TREE - Only show when data exists */}
          {root && (
            <div className="flex-1 px-3 pb-3 min-h-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Archive
                </span>
                <span className="text-[10px] text-slate-600">
                  {(root as any).items?.length || 0} items
                </span>
              </div>
              <div className={`
                rounded-lg border overflow-hidden
                ${settings.fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-800/30 border-slate-800/50'}
              `}>
                <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                  <TreeItem 
                    item={root} 
                    level={0} 
                    selectedId={selectedId} 
                    onSelect={onSelect} 
                    viewType={viewType} 
                    fieldMode={settings.fieldMode} 
                    root={root} 
                    onStructureUpdate={onStructureUpdate} 
                    filterText={filterText}
                  />
                </div>
              </div>
              {/* Tree filter */}
              <div className="relative mt-2">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input 
                  type="text" 
                  value={filterText} 
                  onChange={e => setFilterText(e.target.value)} 
                  placeholder="Filter manifests..." 
                  className="w-full text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg pl-9 pr-8 py-2 outline-none focus:border-slate-500 transition-all text-slate-200 placeholder:text-slate-500"
                />
                {filterText && (
                  <button
                    onClick={() => setFilterText('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300"
                  >
                    <Icon name="close" className="text-xs" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTIONS - Settings, Export, Help */}
        <div className={`border-t shrink-0 transition-colors duration-300 ${settings.fieldMode ? 'border-yellow-400/30 bg-black' : 'border-slate-800 bg-slate-900'}`}>
          {/* Export Button - Only show when data exists */}
          {hasData && (
            <div className={`p-3 border-b ${settings.fieldMode ? 'border-yellow-400/20' : 'border-slate-800'}`}>
              <button
                onClick={onExportTrigger}
                className={`
                  w-full py-2.5 rounded-lg text-sm font-bold
                  flex items-center justify-center gap-2 shadow-lg
                  transition-all duration-150 active:scale-[0.98]
                  ${settings.fieldMode
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-yellow-400/30 border-2 border-yellow-400'
                    : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20'
                  }
                `}
              >
                <Icon name="download" className="text-base" />
                Export Archive
              </button>
            </div>
          )}
          
          {/* Quick Actions Row */}
          <div className="flex items-center p-2 gap-1">
            <button
              onClick={handleFieldModeToggle}
              className={`
                flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg 
                text-xs font-bold transition-all border-2
                ${settings.fieldMode 
                  ? 'text-black bg-yellow-400 border-yellow-400 hover:bg-yellow-300' 
                  : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200'
                }
              `}
              title={settings.fieldMode ? "Disable Field Mode" : "Enable Field Mode"}
            >
              <Icon name={settings.fieldMode ? "wb_sunny" : "nights_stay"} className="text-sm" />
              <span>{settings.fieldMode ? 'FIELD ON' : 'Field'}</span>
            </button>
            
            <button
              onClick={() => onModeChange('search')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg 
                text-xs font-medium transition-all border-2
                ${currentMode === 'search'
                  ? (settings.fieldMode ? 'text-black bg-yellow-400 border-yellow-400' : 'text-blue-400 bg-blue-500/10 border-blue-500/30')
                  : (settings.fieldMode ? 'text-yellow-400 border-yellow-400/30 hover:border-yellow-400 hover:bg-yellow-400/10' : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200')
                }
              `}
            >
              <Icon name="search" className="text-sm" />
              <span>Search</span>
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg 
                text-xs font-medium transition-all border-2
                ${showSettings 
                  ? (settings.fieldMode ? 'text-black bg-yellow-400 border-yellow-400' : 'text-blue-400 bg-blue-500/10 border-blue-500/30')
                  : (settings.fieldMode ? 'text-yellow-400 border-yellow-400/30 hover:border-yellow-400 hover:bg-yellow-400/10' : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200')
                }
              `}
            >
              <Icon name="settings" className="text-sm" />
              <span>Settings</span>
            </button>
          </div>
          
          {/* Collapsible Settings Panel */}
          {showSettings && (
            <div className="px-3 pb-3 space-y-1 border-t border-slate-800 pt-2">
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all text-sm"
              >
                <Icon name="tune" className="text-base" />
                <span>App Settings</span>
              </button>
              {onAbstractionLevelChange && (
                <button
                  onClick={() => onAbstractionLevelChange(settings.abstractionLevel === 'simple' ? 'standard' : 'simple')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all text-sm"
                >
                  <Icon name="layers" className="text-base" />
                  <span>Mode: {settings.abstractionLevel === 'simple' ? 'Simple' : settings.abstractionLevel === 'advanced' ? 'Advanced' : 'Standard'}</span>
                </button>
              )}
              {onToggleQuickHelp && (
                <button
                  onClick={onToggleQuickHelp}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all text-sm"
                >
                  <Icon name="help_outline" className="text-base" />
                  <span>Keyboard Shortcuts</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Resize Handle */}
        {!isMobile && (
          <div
            {...handleProps}
            className={`
              absolute right-0 top-0 bottom-0 w-1 z-30 group
              cursor-col-resize transition-colors duration-150
              hover:bg-slate-500/20
              ${isResizing ? (settings.fieldMode ? 'bg-yellow-400/30' : 'bg-iiif-blue/30') : ''}
            `}
          >
            <div className={`
              absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-full
              transition-all duration-150 opacity-0 group-hover:opacity-100
              ${isResizing
                ? (settings.fieldMode ? 'bg-yellow-400' : 'bg-iiif-blue')
                : 'bg-slate-500 group-hover:bg-iiif-blue'
              }
            `} />
          </div>
        )}
      </aside>
    </>
  );
}, (prev, next) => {
  return prev.root?.id === next.root?.id && 
         prev.selectedId === next.selectedId &&
         prev.currentMode === next.currentMode;
});
