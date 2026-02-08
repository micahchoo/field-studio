
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { AbstractionLevel, AppMode, getIIIFValue, IIIFItem, ViewType } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { Tag } from '@/src/shared/ui/atoms/Tag';
import { CONSTANTS, RESOURCE_TYPE_CONFIG } from '@/src/shared/constants';
import {
  getRelationshipType,
  getValidChildTypes,
  isValidChildType
} from '@/utils/iiifHierarchy';
import { useResizablePanel } from '@/src/shared/lib/hooks/useResizablePanel';
import { useAppSettings } from '@/src/app/providers/useAppSettings';
import { useAppMode, useAppModeState } from '@/src/app/providers';

interface SidebarProps {
  root: IIIFItem | null;
  selectedId: string | null;
  viewType: ViewType;
  onSelect: (id: string) => void;
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
  /** Field mode flag — passed from parent to ensure reactivity */
  fieldMode?: boolean;
}

// Neobrutalist nav item
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
      w-full flex items-center gap-3 px-3 py-2.5 font-mono font-bold text-xs uppercase tracking-wider
      border-l-4 transition-nb
      ${active
        ? (fieldMode
          ? 'bg-nb-yellow text-nb-black border-l-nb-yellow'
          : 'bg-nb-black text-nb-white border-l-nb-blue')
        : (fieldMode
          ? 'text-nb-yellow border-l-transparent hover:bg-nb-yellow/15'
          : 'text-nb-black border-l-transparent hover:bg-nb-black/15')
      }
      ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
    `}
  >
    <Icon name={icon} className="text-lg" />
    <span>{label}</span>
  </Button>
);

// Types that should show in sidebar
const SIDEBAR_VISIBLE_TYPES = new Set(['Collection', 'Manifest', 'Canvas', 'Range']);
const STOP_TRAVERSAL_TYPES = new Set(['AnnotationPage', 'Annotation', 'Choice', 'SpecificResource']);

// Map IIIF types to Tag colors
const typeTagColor: Record<string, 'blue' | 'green' | 'purple' | 'orange'> = {
  Collection: 'purple',
  Manifest: 'blue',
  Canvas: 'green',
  Range: 'orange',
};

const TreeItem: React.FC<{
  item: IIIFItem; level: number; selectedId: string | null; onSelect: (id: string) => void;
  viewType: ViewType; fieldMode: boolean; root: IIIFItem | null; onStructureUpdate?: any;
  filterText: string;
  manifestsExpanded?: boolean;
}> = ({ item, level, selectedId, onSelect, viewType, fieldMode, root, onStructureUpdate, filterText, manifestsExpanded = false }) => {
  const defaultExpanded = item.type === 'Collection' ? true : manifestsExpanded;
  const [expanded, setExpanded] = useState(defaultExpanded);

  React.useEffect(() => {
    if (item.type === 'Manifest') {
      setExpanded(manifestsExpanded);
    }
  }, [manifestsExpanded, item.type]);

  const isSelected = item.id === selectedId;
  const config = RESOURCE_TYPE_CONFIG[item.type] || RESOURCE_TYPE_CONFIG['Content'];

  const rawChildren = item.items || item.annotations || [];
  const children = rawChildren.filter((child: IIIFItem) => !STOP_TRAVERSAL_TYPES.has(child.type));
  const hasChildren = children.length > 0;

  if (STOP_TRAVERSAL_TYPES.has(item.type)) return null;

  const label = getIIIFValue(item.label) || 'Untitled';
  const displayLabel = viewType === 'files' ? (item._filename || item.id.split('/').pop()) : label;

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

  const isCanvas = item.type === 'Canvas';
  const isManifest = item.type === 'Manifest';

  return (
    <div className="select-none" role="none">
      <div
        draggable onDragStart={handleDragStart} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
        tabIndex={0}
        className={`
          flex items-center gap-2 cursor-pointer outline-none transition-nb
          border-l-4 py-1.5
          ${isSelected
            ? (fieldMode
              ? 'bg-nb-yellow/20 text-nb-yellow border-l-nb-yellow font-bold'
              : 'bg-nb-orange/15 text-nb-black border-l-nb-orange font-bold')
            : (fieldMode
              ? 'border-l-transparent text-nb-yellow hover:bg-nb-yellow/15'
              : 'border-l-transparent text-nb-black hover:bg-nb-black/10')
          }
        `}
        style={{ paddingLeft: 16 + level * 16 }}
        onClick={() => onSelect(item.id)}
      >
        <Button variant="ghost" size="bare"
          aria-label={expanded ? `Collapse ${displayLabel}` : `Expand ${displayLabel}`}
          tabIndex={-1}
          className={`p-1.5 -ml-1 min-w-[28px] min-h-[28px] flex items-center justify-center ${!hasChildren ? 'invisible' : ''}`}
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          <Icon
            name={expanded ? "expand_more" : "chevron_right"}
            className="text-base"
          />
        </Button>

        <Icon
          name={viewType === 'files' ? 'folder' : config.icon}
          className="text-base"
        />
        <span className={`truncate flex-1 font-mono text-nb-xs ${isManifest ? 'font-bold' : isCanvas ? 'font-medium' : 'font-normal'}`}>
          {displayLabel}
        </span>

        {isManifest && hasChildren && (
          <Tag color={typeTagColor[item.type] || 'black'}>{children.length}</Tag>
        )}
      </div>
      {hasChildren && expanded && (
        <div role="group">
          {children.map((child) => (
            <TreeItem key={child.id} item={child as IIIFItem} level={level + 1} selectedId={selectedId} onSelect={onSelect} viewType={viewType} fieldMode={fieldMode} root={root} onStructureUpdate={onStructureUpdate} filterText={filterText} manifestsExpanded={manifestsExpanded}/>
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = React.memo(function Sidebar({
  root, selectedId, viewType, onSelect, onViewTypeChange,
  onImport, onExportTrigger, onToggleFieldMode, onStructureUpdate, visible, onOpenExternalImport,
  onOpenSettings, onToggleQuickHelp, isMobile, onClose, onAbstractionLevelChange, fieldMode: fieldModeProp
}) {
  const { settings, updateSettings } = useAppSettings();
  // Prefer prop over internal hook state for reactivity when toggled externally
  const isFieldMode = fieldModeProp ?? settings.fieldMode;
  const [currentMode, setCurrentMode] = useAppMode();
  const { changedAt, previousMode } = useAppModeState();
  const [filterText, setFilterText] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [manifestsExpanded, setManifestsExpanded] = useState(false);

  const handleFilterChange = useCallback((value: string) => {
    setFilterText(value); // immediate input update
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => setDebouncedFilter(value), 150);
  }, []);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const hasData = root && ((root as any).items?.length > 0 || (root as any).type);

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFieldModeToggle = () => {
    const newFieldMode = !isFieldMode;
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
    ? `fixed inset-y-0 left-0 z-[1000] w-80 transition-transform duration-100 ${visible ? 'translate-x-0' : '-translate-x-full'}`
    : `flex flex-col h-full border-r-4 shrink-0 relative panel-fixed`;

  const bgStyles = isFieldMode
    ? 'bg-nb-black border-nb-yellow'
    : 'bg-nb-cream border-nb-black';

  return (
    <>
      {isMobile && visible && (
        <div className="fixed inset-0 bg-nb-black/80 z-[950]" onClick={onClose}></div>
      )}
      <aside
        className={`${sidebarStyles} ${bgStyles} flex flex-col overflow-hidden sidebar-panel`}
        style={isMobile ? undefined : panelStyle}
      >
        {/* Header - FIELD STUDIO wordmark */}
        <div className={`flex items-center px-4 shrink-0 gap-3 h-14 border-b-4 ${isFieldMode ? 'border-nb-yellow bg-nb-black' : 'border-nb-black bg-nb-cream'}`}>
          <div className={`w-8 h-8 flex items-center justify-center font-mono font-black text-sm border-2 ${isFieldMode ? 'bg-nb-yellow text-nb-black border-nb-yellow' : 'bg-nb-blue text-nb-white border-nb-black'}`}>
            <Icon name="photo_library" className="text-lg" />
          </div>
          <div className="flex-1 overflow-hidden flex items-baseline gap-2">
            <span className={`font-mono font-black text-xs uppercase tracking-widest ${isFieldMode ? 'text-nb-yellow' : 'text-nb-black'}`}>
              {CONSTANTS.APP_NAME}
            </span>
            <span className={`font-mono text-nb-caption ${isFieldMode ? 'text-nb-yellow/60' : 'text-nb-black/60'}`}>
              {root ? `${(root as any).items?.length || 0} ITEMS` : 'NO ARCHIVE'}
            </span>
          </div>
          {isMobile && (
            <Button variant="ghost" size="bare" onClick={onClose} aria-label="Close sidebar" className={`p-1.5 ${isFieldMode ? 'text-nb-yellow' : 'text-nb-black'}`}>
              <Icon name="close" className="text-lg"/>
            </Button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">

          {/* Navigation */}
          <nav className="px-4 py-3">
            <div className={`nb-label mb-2 ${isFieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'}`}>NAVIGATION</div>
            <div className="space-y-1">
              <NavItem icon="inventory_2" label="ARCHIVE" active={currentMode === 'archive'} onClick={() => setCurrentMode('archive')} fieldMode={isFieldMode} />
              <NavItem icon="table_chart" label="CATALOG" active={currentMode === 'metadata'} onClick={() => setCurrentMode('metadata')} fieldMode={isFieldMode} />
              <NavItem icon="dashboard" label="BOARDS" active={currentMode === 'boards'} onClick={() => setCurrentMode('boards')} fieldMode={isFieldMode} />
            </div>
            <div className={`mt-2 pt-2 border-t-2 ${isFieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10'}`}>
              <NavItem
                icon="account_tree"
                label="STRUCTURE"
                active={currentMode === 'structure'}
                onClick={() => setCurrentMode('structure')}
                fieldMode={isFieldMode}
                title="Structure view"
              />
            </div>
          </nav>

          {/* Import Section */}
          <div className="px-4 pb-4">
            <div className={`p-3 border-2 ${!hasData
              ? (isFieldMode ? 'bg-nb-yellow/20 border-nb-yellow' : 'bg-nb-blue/10 border-nb-blue')
              : (isFieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-cream border-nb-black/30')
            }`}>
              <div className={`nb-label mb-3 ${isFieldMode ? 'text-nb-yellow' : 'text-nb-black'}`}>IMPORT</div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                {...({ webkitdirectory: "" } as any)}
                className="hidden"
                onChange={(e) => onImport(e)}
              />

              <div className="space-y-2">
                <Button variant="ghost" size="bare"
                  type="button"
                  onClick={handleImportClick}
                  className={`
                    w-full flex items-center justify-center gap-2 px-4 py-2
                    font-mono font-bold text-xs uppercase tracking-wider
                    border-2 transition-nb nb-press
                    ${hasData
                      ? (isFieldMode
                        ? 'bg-nb-black text-nb-yellow border-nb-yellow/30'
                        : 'bg-nb-cream text-nb-black border-nb-black/30')
                      : (isFieldMode
                        ? 'bg-nb-yellow text-nb-black border-nb-yellow shadow-brutal-field-sm'
                        : 'bg-nb-blue text-nb-white border-nb-black shadow-brutal-sm')
                    }
                  `}
                >
                  <Icon name="folder_open" className="text-base" />
                  IMPORT FOLDER
                </Button>

                <Button variant="ghost" size="bare"
                  type="button"
                  onClick={onOpenExternalImport}
                  className={`
                    w-full flex items-center justify-center gap-2 px-4 py-2
                    border-2 font-mono font-bold text-xs uppercase tracking-wider transition-nb
                    ${isFieldMode
                      ? 'bg-nb-black border-nb-yellow/50 text-nb-yellow hover:bg-nb-yellow/10'
                      : 'bg-nb-cream border-nb-black text-nb-black hover:bg-nb-black hover:text-nb-white'
                    }
                  `}
                >
                  <Icon name="cloud_download" className="text-base" />
                  IMPORT FROM URL
                </Button>
              </div>
            </div>
          </div>

          {/* Archive Tree */}
          {root && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`nb-label ${isFieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'}`}>
                  ARCHIVE
                </span>
                <Button variant="ghost" size="bare"
                  onClick={() => setManifestsExpanded(!manifestsExpanded)}
                  className={`
                    flex items-center gap-1 px-2 py-0.5 font-mono text-nb-caption font-bold uppercase transition-nb
                    ${isFieldMode
                      ? 'text-nb-yellow/60 hover:text-nb-yellow'
                      : 'text-nb-black/40 hover:text-nb-black'
                    }
                  `}
                  title={manifestsExpanded ? 'Collapse all' : 'Expand all'}
                >
                  <Icon name={manifestsExpanded ? 'unfold_less' : 'unfold_more'} className="text-sm" />
                  {manifestsExpanded ? 'COLLAPSE' : 'EXPAND'}
                </Button>
              </div>
              {/* Tree filter — above tree for discoverability */}
              <div className="relative mb-2">
                <Icon name="search" className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isFieldMode ? 'text-nb-yellow/40' : 'text-nb-black/30'}`} />
                <input
                  type="text"
                  value={filterText}
                  onChange={e => handleFilterChange(e.target.value)}
                  placeholder="FILTER..."
                  className={`w-full font-mono text-xs border-2 pl-9 pr-8 py-2 outline-none transition-nb uppercase bg-theme-input-bg border-theme-input-border text-theme-text placeholder:text-theme-input-placeholder ${
                    isFieldMode
                      ? 'focus:border-nb-yellow'
                      : 'focus:shadow-brutal-sm'
                  }`}
                />
                {filterText && (
                  <Button variant="ghost" size="bare"
                    onClick={() => { handleFilterChange(''); }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${isFieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'}`}
                  >
                    <Icon name="close" className="text-xs" />
                  </Button>
                )}
              </div>
              <div className={`border-2 overflow-hidden ${isFieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-white border-nb-black'}`}>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  <TreeItem
                    item={root}
                    level={0}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    viewType={viewType}
                    fieldMode={isFieldMode}
                    root={root}
                    onStructureUpdate={onStructureUpdate}
                    filterText={debouncedFilter}
                    manifestsExpanded={manifestsExpanded}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className={`border-t-4 shrink-0 ${isFieldMode ? 'border-nb-yellow bg-nb-black' : 'border-nb-black bg-nb-cream'}`}>
          {hasData && (
            <div className={`p-3 border-b-2 ${isFieldMode ? 'border-nb-yellow/20' : 'border-nb-black/20'}`}>
              <Button variant="ghost" size="bare"
                onClick={onExportTrigger}
                className={`
                  w-full py-2.5 font-mono text-xs font-bold uppercase tracking-wider
                  flex items-center justify-center gap-2
                  border-2 transition-nb nb-press
                  ${isFieldMode
                    ? 'bg-nb-yellow text-nb-black border-nb-yellow shadow-brutal-field-sm'
                    : 'bg-nb-green text-nb-black border-nb-black shadow-brutal-sm'
                  }
                `}
              >
                <Icon name="download" className="text-base" />
                EXPORT ARCHIVE
              </Button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center p-3 gap-2">
            <Button variant="ghost" size="bare"
              onClick={handleFieldModeToggle}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2.5
                font-mono text-nb-caption font-bold uppercase border-2 transition-nb
                ${isFieldMode
                  ? 'text-nb-black bg-nb-yellow border-nb-yellow'
                  : 'text-nb-black border-nb-black/20 hover:bg-nb-black hover:text-nb-white hover:border-nb-black'
                }
              `}
              title={isFieldMode ? "Disable Field Mode" : "Enable Field Mode"}
            >
              <Icon name={isFieldMode ? "wb_sunny" : "nights_stay"} className="text-sm" />
              <span>{isFieldMode ? 'FIELD' : 'FIELD'}</span>
            </Button>

            <Button variant="ghost" size="bare"
              onClick={() => setCurrentMode('search')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2.5
                font-mono text-nb-caption font-bold uppercase border-2 transition-nb
                ${currentMode === 'search'
                  ? (isFieldMode ? 'text-nb-black bg-nb-yellow border-nb-yellow' : 'text-nb-white bg-nb-black border-nb-black')
                  : (isFieldMode ? 'text-nb-yellow border-nb-yellow/30 hover:bg-nb-yellow/10' : 'text-nb-black border-nb-black/20 hover:bg-nb-black hover:text-nb-white hover:border-nb-black')
                }
              `}
            >
              <Icon name="search" className="text-sm" />
              <span>SEARCH</span>
            </Button>

            <Button variant="ghost" size="bare"
              onClick={onOpenSettings}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2.5
                font-mono text-nb-caption font-bold uppercase border-2 transition-nb
                ${isFieldMode ? 'text-nb-yellow border-nb-yellow/30 hover:bg-nb-yellow/10' : 'text-nb-black border-nb-black/20 hover:bg-nb-black hover:text-nb-white hover:border-nb-black'}
              `}
            >
              <Icon name="settings" className="text-sm" />
              <span>SETUP</span>
            </Button>
          </div>
        </div>

        {/* Resize Handle */}
        {!isMobile && (
          <div
            {...handleProps}
            className={`
              absolute right-0 top-0 bottom-0 w-1.5 z-30 cursor-col-resize transition-nb
              ${isResizing
                ? (isFieldMode ? 'bg-nb-yellow' : 'bg-nb-blue')
                : 'hover:bg-nb-blue/30'
              }
            `}
          />
        )}
      </aside>
    </>
  );
}, (prev, next) => {
  return prev.root?.id === next.root?.id &&
         prev.selectedId === next.selectedId &&
         prev.visible === next.visible &&
         prev.fieldMode === next.fieldMode;
});
