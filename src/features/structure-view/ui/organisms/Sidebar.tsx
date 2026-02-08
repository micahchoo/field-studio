
import React, { useMemo, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { AbstractionLevel, AppMode, getIIIFValue, IIIFItem, ViewType } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { CONSTANTS, RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';
import {
  getRelationshipType,
  getValidChildTypes,
  isValidChildType
} from '@/utils/iiifHierarchy';
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
  abstractionLevel?: AbstractionLevel;
  onAbstractionLevelChange?: (level: AbstractionLevel) => void;
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
  <Button variant="ghost" size="bare"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-current={active ? 'page' : undefined}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5  font-medium transition-nb  group
      ${active 
        ? (fieldMode 
          ? 'bg-nb-yellow text-black font-bold shadow-brutal shadow-yellow-400/20 border-2 border-nb-yellow' 
          : 'bg-nb-black/80 text-white shadow-brutal-sm') 
        : (fieldMode 
          ? 'text-nb-yellow/80 hover:bg-nb-yellow/10 hover:text-nb-yellow border-2 border-transparent' 
          : 'text-nb-black/40 hover:bg-nb-black/50 hover:text-nb-black/30')
      }
      ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}
    `}
  >
    <Icon 
      name={icon} 
      className={`
        text-lg transition-nb
        ${active 
          ? (fieldMode ? "text-black" : "text-white") 
          : (fieldMode ? "text-nb-yellow/70 group-hover:text-nb-yellow" : "text-nb-black/50 group-hover:text-nb-black/30")
        }
      `} 
    />
    <span className="text-sm">{label}</span>
  </Button>
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
  const rawChildren = item.items || item.annotations || [];
  const children = rawChildren.filter((child: IIIFItem) => !STOP_TRAVERSAL_TYPES.has(child.type));
  const hasChildren = children.length > 0;
  
  // Stop rendering if this is a content-level type
  if (STOP_TRAVERSAL_TYPES.has(item.type)) return null;
  
  const label = getIIIFValue(item.label) || 'Untitled';
  const displayLabel = viewType === 'files' ? (item._filename || item.id.split('/').pop()) : label;

  // Filter logic - check if this item or any children match
  const matchesText = !filterText || displayLabel.toLowerCase().includes(filterText.toLowerCase());
  const childMatches = hasChildren && children.some((child) => {
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
              ? 'bg-nb-yellow/20 border-nb-yellow text-nb-yellow font-bold shadow-brutal-sm' 
              : 'bg-nb-blue/20 border-nb-blue text-white shadow-inner')
            : (fieldMode 
              ? 'border-transparent text-nb-black/30 hover:bg-nb-black hover:border-nb-black/60' 
              : 'border-transparent text-nb-black/30 hover:text-white hover:bg-nb-black/50 hover:border-nb-black/60')
          }
          ${isPriority && !isSelected ? (fieldMode ? 'text-white' : 'text-nb-black/20 font-medium') : ''}
        `}
        style={{ 
          // Flat hierarchy - minimal or no indentation, use visual cues instead
          paddingLeft: level === 0 ? 8 : 12 
        }}
        onClick={() => onSelect(item.id)}
      >
        <Button variant="ghost" size="bare" 
          aria-label={expanded ? `Collapse ${displayLabel}` : `Expand ${displayLabel}`}
          aria-expanded={expanded}
          tabIndex={-1}
          className={`p-0.5 hover:bg-nb-white/10 transition-transform active:scale-95 ${!hasChildren ? 'invisible' : ''}`} 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          <Icon 
            name={expanded ? "expand_more" : "chevron_right"} 
            className={`transition-transform text-base ${expanded ? 'rotate-0' : '-rotate-90'} ${fieldMode ? "text-nb-black/40" : "text-nb-black/50"}`} 
          />
        </Button>
        
        {/* Visual priority indicator */}
        {isPriority && (
          <div className={`w-1 h-4 ${item.type === 'Manifest' ? 'bg-nb-blue' : 'bg-nb-green/100'} ${isSelected ? 'opacity-100' : 'opacity-70'}`} />
        )}
        
        <Icon 
          name={viewType === 'files' ? 'folder' : config.icon} 
          className={`
            transition-nb text-base
            ${!isSelected ? config.colorClass : ''} 
            group-hover:brightness-125
            ${isPriority ? 'text-lg' : ''}
          `} 
        />
        <span className={`text-xs truncate transition-nb flex-1 ${isPriority ? 'font-medium' : ''}`}>
          {displayLabel}
        </span>
        
        {/* Child count badge for collections */}
        {item.type === 'Collection' && hasChildren && (
          <span className={`text-[10px] px-1.5 py-0.5 ${fieldMode ? 'bg-nb-black text-nb-black/40' : 'bg-nb-black/80 text-nb-black/40'}`}>
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
  const hasData = root && (root.items?.length || root.type);

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
    ? `fixed inset-y-0 left-0 z-[1000] w-80 shadow-brutal-lg transition-transform ${visible ? 'translate-x-0' : '-translate-x-full'}`
    : `flex flex-col h-full border-r shrink-0 relative`;

  // Field mode: high contrast black/yellow, Normal: sleek slate
  const bgStyles = settings.fieldMode 
    ? 'bg-nb-black border-nb-yellow/30' 
    : 'bg-nb-black border-nb-black text-nb-black/30';

  return (
    <>
      {isMobile && visible && (
          <div className="fixed inset-0 bg-nb-black/80 backdrop-blur-sm z-[950]" onClick={onClose}></div>
      )}
      <aside
        className={`${sidebarStyles} ${bgStyles} flex flex-col overflow-hidden transition-nb `}
        style={isMobile ? undefined : panelStyle}
      >
        {/* Compact Header - App branding */}
        <div className={`flex items-center px-3 shrink-0 gap-2 h-12 border-b ${settings.fieldMode ? 'border-nb-yellow/30 bg-nb-black' : 'border-nb-black bg-nb-black'}`}>
          <div className={`w-7 h-7 flex items-center justify-center font-bold text-xs shadow transition-nb ${settings.fieldMode ? 'bg-nb-yellow text-black' : 'bg-iiif-blue text-white'}`}>
            <Icon name="photo_library" className="text-base" />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className={`text-xs font-bold tracking-tight truncate transition-nb ${settings.fieldMode ? 'text-nb-yellow' : 'text-white'}`}>
              {CONSTANTS.APP_NAME}
            </div>
            <div className={`text-[9px] transition-nb ${settings.fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'}`}>
              {root ? `${root.items?.length || 0} items` : 'No archive'}
            </div>
          </div>
          {isMobile && (
              <Button variant="ghost" size="bare" onClick={onClose} aria-label="Close sidebar" className={`p-1.5 transition-nb ${settings.fieldMode ? 'text-nb-yellow hover:text-nb-yellow' : 'text-nb-black/50 hover:text-white'}`}>
                <Icon name="close" className="text-lg"/>
              </Button>
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
               p-4 border-2 transition-nb 
              ${!hasData 
                ? (settings.fieldMode ? 'bg-nb-yellow/20 border-nb-yellow' : 'bg-nb-blue/10 border-nb-blue/50')
                : (settings.fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-black/50 border-nb-black/60')
              }
            `}>
              <div className={`text-[11px] font-semibold uppercase tracking-wider mb-3 transition-nb ${settings.fieldMode ? 'text-nb-yellow' : 'text-nb-black/40'}`}>
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
                <Button variant="ghost" size="bare"
                  type="button"
                  onClick={handleImportClick}
                  className={`
                    w-full flex items-center justify-center gap-2 px-4 py-2.5  
                    font-bold text-sm transition-nb 
                    ${settings.fieldMode
                      ? 'bg-nb-yellow text-black hover:bg-nb-yellow shadow-brutal shadow-yellow-400/30 border-2 border-nb-yellow'
                      : 'bg-nb-blue text-white hover:bg-nb-blue shadow-brutal shadow-nb-blue/20'
                    }
                  `}
                >
                  <Icon name="folder_open" className="text-base" />
                  Import Folder
                </Button>
                
                <Button variant="ghost" size="bare"
                  type="button"
                  onClick={onOpenExternalImport}
                  className={`
                    w-full flex items-center justify-center gap-2 px-4 py-2  
                    border-2 font-medium text-sm transition-nb 
                    ${settings.fieldMode
                      ? 'bg-nb-black border-nb-yellow/50 text-nb-yellow hover:bg-nb-yellow/10 hover:border-nb-yellow'
                      : 'bg-nb-black/50 border-nb-black/80 text-nb-black/40 hover:bg-nb-black hover:text-nb-black/20'
                    }
                  `}
                >
                  <Icon name="cloud_download" className="text-base" />
                  Import from URL
                </Button>
              </div>
            </div>
          </div>

          {/* ARCHIVE TREE - Only show when data exists */}
          {root && (
            <div className="flex-1 px-3 pb-3 min-h-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-medium text-nb-black/50 uppercase tracking-wider">
                  Archive
                </span>
                <span className="text-[10px] text-nb-black/60">
                  {root?.items?.length || 0} items
                </span>
              </div>
              <div className={`
                 border overflow-hidden
                ${settings.fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-black/30 border-nb-black/50'}
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
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-nb-black/50 text-sm" />
                <input 
                  type="text" 
                  value={filterText} 
                  onChange={e => setFilterText(e.target.value)} 
                  placeholder="Filter manifests..." 
                  className="w-full text-sm bg-nb-black/50 border border-nb-black/60 pl-9 pr-8 py-2 outline-none focus:border-nb-black/40 transition-nb text-nb-black/20 placeholder:text-nb-black/50"
                />
                {filterText && (
                  <Button variant="ghost" size="bare"
                    onClick={() => setFilterText('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-nb-black/80 text-nb-black/50 hover:text-nb-black/30"
                  >
                    <Icon name="close" className="text-xs" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTIONS - Settings, Export, Help */}
        <div className={`border-t shrink-0 transition-nb ${settings.fieldMode ? 'border-nb-yellow/30 bg-nb-black' : 'border-nb-black bg-nb-black'}`}>
          {/* Export Button - Only show when data exists */}
          {hasData && (
            <div className={`p-3 border-b ${settings.fieldMode ? 'border-nb-yellow/20' : 'border-nb-black'}`}>
              <Button variant="ghost" size="bare"
                onClick={onExportTrigger}
                className={`
                  w-full py-2.5  text-sm font-bold
                  flex items-center justify-center gap-2 shadow-brutal
                  transition-nb  active:scale-[0.98]
                  ${settings.fieldMode
                    ? 'bg-nb-yellow text-black hover:bg-nb-yellow shadow-yellow-400/30 border-2 border-nb-yellow'
                    : 'bg-nb-blue text-white hover:bg-nb-blue shadow-nb-blue/20'
                  }
                `}
              >
                <Icon name="download" className="text-base" />
                Export Archive
              </Button>
            </div>
          )}
          
          {/* Quick Actions Row */}
          <div className="flex items-center p-2 gap-1">
            <Button variant="ghost" size="bare"
              onClick={handleFieldModeToggle}
              className={`
                flex-1 flex items-center justify-center gap-2 px-2 py-2  
                text-xs font-bold transition-nb border-2
                ${settings.fieldMode 
                  ? 'text-black bg-nb-yellow border-nb-yellow hover:bg-nb-yellow' 
                  : 'text-nb-black/40 border-transparent hover:bg-nb-black hover:text-nb-black/20'
                }
              `}
              title={settings.fieldMode ? "Disable Field Mode" : "Enable Field Mode"}
            >
              <Icon name={settings.fieldMode ? "wb_sunny" : "nights_stay"} className="text-sm" />
              <span>{settings.fieldMode ? 'FIELD ON' : 'Field'}</span>
            </Button>
            
            <Button variant="ghost" size="bare"
              onClick={() => onModeChange('search')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-2 py-2  
                text-xs font-medium transition-nb border-2
                ${currentMode === 'search'
                  ? (settings.fieldMode ? 'text-black bg-nb-yellow border-nb-yellow' : 'text-nb-blue bg-nb-blue/10 border-nb-blue/30')
                  : (settings.fieldMode ? 'text-nb-yellow border-nb-yellow/30 hover:border-nb-yellow hover:bg-nb-yellow/10' : 'text-nb-black/40 border-transparent hover:bg-nb-black hover:text-nb-black/20')
                }
              `}
            >
              <Icon name="search" className="text-sm" />
              <span>Search</span>
            </Button>
            
            <Button variant="ghost" size="bare"
              onClick={() => setShowSettings(!showSettings)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-2 py-2  
                text-xs font-medium transition-nb border-2
                ${showSettings 
                  ? (settings.fieldMode ? 'text-black bg-nb-yellow border-nb-yellow' : 'text-nb-blue bg-nb-blue/10 border-nb-blue/30')
                  : (settings.fieldMode ? 'text-nb-yellow border-nb-yellow/30 hover:border-nb-yellow hover:bg-nb-yellow/10' : 'text-nb-black/40 border-transparent hover:bg-nb-black hover:text-nb-black/20')
                }
              `}
            >
              <Icon name="settings" className="text-sm" />
              <span>Settings</span>
            </Button>
          </div>
          
          {/* Collapsible Settings Panel */}
          {showSettings && (
            <div className="px-3 pb-3 space-y-1 border-t border-nb-black pt-2">
              <Button variant="ghost" size="bare"
                onClick={onOpenSettings}
                className="w-full flex items-center gap-3 px-3 py-2 text-nb-black/40 hover:text-nb-black/20 hover:bg-nb-black/50 transition-nb text-sm"
              >
                <Icon name="tune" className="text-base" />
                <span>App Settings</span>
              </Button>
              {onAbstractionLevelChange && (
                <Button variant="ghost" size="bare"
                  onClick={() => onAbstractionLevelChange(settings.abstractionLevel === 'simple' ? 'standard' : 'simple')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-nb-black/40 hover:text-nb-black/20 hover:bg-nb-black/50 transition-nb text-sm"
                >
                  <Icon name="layers" className="text-base" />
                  <span>Mode: {settings.abstractionLevel === 'simple' ? 'Simple' : settings.abstractionLevel === 'advanced' ? 'Advanced' : 'Standard'}</span>
                </Button>
              )}
              {onToggleQuickHelp && (
                <Button variant="ghost" size="bare"
                  onClick={onToggleQuickHelp}
                  className="w-full flex items-center gap-3 px-3 py-2 text-nb-black/40 hover:text-nb-black/20 hover:bg-nb-black/50 transition-nb text-sm"
                >
                  <Icon name="help_outline" className="text-base" />
                  <span>Keyboard Shortcuts</span>
                </Button>
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
              cursor-col-resize transition-nb 
              hover:bg-nb-black/40
              ${isResizing ? (settings.fieldMode ? 'bg-nb-yellow/30' : 'bg-iiif-blue/30') : ''}
            `}
          >
            <div className={`
              absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 
              transition-nb  opacity-0 group-hover:opacity-100
              ${isResizing
                ? (settings.fieldMode ? 'bg-nb-yellow' : 'bg-iiif-blue')
                : 'bg-nb-black/40 group-hover:bg-iiif-blue'
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
