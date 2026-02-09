
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { AbstractionLevel, AppMode, getIIIFValue, IIIFItem, ViewType } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { CONSTANTS } from '@/src/shared/constants';
import { useResizablePanel } from '@/src/shared/lib/hooks/useResizablePanel';
import { useAppSettings } from '@/src/app/providers/useAppSettings';
import { useAppMode } from '@/src/app/providers';

// Structure tree imports — reuse, don't rewrite
import { useStructureTree } from '@/src/features/structure-view/model/useStructureTree';
import { VirtualTreeList } from '@/src/features/structure-view/ui/molecules/VirtualTreeList';
import { TreeSearchBar } from '@/src/features/structure-view/ui/atoms/TreeSearchBar';
import type { DropPosition } from '@/src/features/structure-view/ui/atoms/DropIndicator';

// Context menu
import { ContextMenu, type ContextMenuSectionType } from '@/src/shared/ui/molecules/ContextMenu';

// Breadcrumb path
import { getPathToNode } from '@/utils/iiifHierarchy';

// ============================================================================
// Constants
// ============================================================================

const COLLAPSED_WIDTH = 48;

// ============================================================================
// Types
// ============================================================================

export interface SidebarBadges {
  validationErrors?: number;
  unsavedChanges?: boolean;
  newItems?: number;
}

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
  /** Badge indicators */
  badges?: SidebarBadges;
  /** Delete item callback */
  onDeleteItem?: (id: string) => void;
  /** Duplicate item callback */
  onDuplicateItem?: (id: string) => void;
  /** Rename item callback */
  onRenameItem?: (id: string) => void;
}

// ============================================================================
// NavItem
// ============================================================================

const NavItem: React.FC<{
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  fieldMode: boolean;
  disabled?: boolean;
  title?: string;
  collapsed?: boolean;
  badge?: number;
}> = ({ icon, label, active, onClick, fieldMode, disabled, title, collapsed, badge }) => (
  <Button variant="ghost" size="bare"
    onClick={onClick}
    disabled={disabled}
    title={collapsed ? label : title}
    aria-current={active ? 'page' : undefined}
    className={`
      w-full flex items-center gap-3 font-mono font-bold text-xs uppercase tracking-wider
      border-l-4 transition-all duration-150
      ${collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'}
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
    <span className={`relative ${active ? 'animate-[nav-pulse_0.2s_ease-out]' : ''}`}>
      <Icon name={icon} className="text-lg" />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-nb-red text-nb-white text-[9px] font-bold flex items-center justify-center leading-none">
          {badge > 99 ? '99' : badge}
        </span>
      )}
    </span>
    {!collapsed && <span>{label}</span>}
  </Button>
);

// ============================================================================
// Breadcrumb Bar
// ============================================================================

const BreadcrumbBar: React.FC<{
  root: IIIFItem;
  selectedId: string;
  onNavigate: (id: string) => void;
  fieldMode: boolean;
}> = ({ root, selectedId, onNavigate, fieldMode }) => {
  const path = useMemo(() => getPathToNode(root, selectedId), [root, selectedId]);

  if (path.length <= 1) return null;

  return (
    <div className={`flex items-center gap-1 px-3 py-1.5 overflow-x-auto custom-scrollbar text-nb-caption font-mono ${
      fieldMode ? 'bg-nb-black/80 text-nb-yellow/60' : 'bg-nb-cream text-nb-black/50'
    }`}>
      {path.map((item, i) => {
        const label = getIIIFValue(item.label) || item.type;
        const isLast = i === path.length - 1;
        return (
          <React.Fragment key={item.id}>
            {i > 0 && <span className="opacity-40 shrink-0">&gt;</span>}
            <button
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`shrink-0 max-w-[120px] truncate transition-colors ${
                isLast
                  ? (fieldMode ? 'text-nb-yellow font-bold' : 'text-nb-black font-bold')
                  : 'hover:underline'
              }`}
              title={label}
            >
              {label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ============================================================================
// Sidebar Component
// ============================================================================

export const Sidebar: React.FC<SidebarProps> = React.memo(function Sidebar({
  root, selectedId, viewType, onSelect, onViewTypeChange,
  onImport, onExportTrigger, onToggleFieldMode, onStructureUpdate, visible, onOpenExternalImport,
  onOpenSettings, onToggleQuickHelp, isMobile, onClose, onAbstractionLevelChange, fieldMode: fieldModeProp,
  badges, onDeleteItem, onDuplicateItem, onRenameItem,
}) {
  const { settings, updateSettings } = useAppSettings();
  const isFieldMode = fieldModeProp ?? settings.fieldMode;
  const [currentMode, setCurrentMode] = useAppMode();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const [treeContainerHeight, setTreeContainerHeight] = useState(300);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // Mobile gesture state
  const touchStartRef = useRef<{ x: number; time: number } | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  const hasData = root && ((root as any).items?.length > 0 || (root as any).type);

  // ---- Resizable panel with collapse support ----
  const {
    isResizing,
    isCollapsed,
    handleProps,
    panelStyle,
    toggleCollapse,
    expand,
  } = useResizablePanel({
    id: 'sidebar',
    defaultSize: 280,
    minSize: 260,
    maxSize: 400,
    direction: 'horizontal',
    side: 'right',
    collapseThreshold: 180,
    persist: true,
  });

  // ---- Structure tree hook ----
  const {
    flattenedNodes,
    filteredNodes,
    selectedIds,
    selectNode,
    toggleExpanded,
    expandAll,
    collapseAll,
    draggingId,
    setDraggingId,
    setDropTargetId,
    canDrop,
    findNode,
    treeStats,
    filterQuery,
    setFilterQuery,
    matchCount,
    setScrollContainerRef,
  } = useStructureTree({ root, onUpdate: onStructureUpdate });

  // Sync external selectedId into tree selection
  useEffect(() => {
    if (selectedId && !selectedIds.has(selectedId)) {
      selectNode(selectedId, false);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ResizeObserver for tree container height
  useEffect(() => {
    const el = treeContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTreeContainerHeight(Math.max(entry.contentRect.height, 100));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Handlers ----

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFieldModeToggle = useCallback(() => {
    const newFieldMode = !isFieldMode;
    updateSettings({ fieldMode: newFieldMode });
    onToggleFieldMode();
  }, [isFieldMode, updateSettings, onToggleFieldMode]);

  const handleTreeSelect = useCallback((id: string, _additive: boolean) => {
    selectNode(id, false);
    onSelect(id);
  }, [selectNode, onSelect]);

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
    document.body.style.cursor = 'grabbing';
  }, [setDraggingId]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
    document.body.style.cursor = '';
  }, [setDraggingId, setDropTargetId]);

  const handleDrop = useCallback((targetId: string, _position?: DropPosition) => {
    if (!draggingId || !canDrop(draggingId, targetId)) {
      handleDragEnd();
      return;
    }
    // Delegate actual structure update to parent via onStructureUpdate
    // (the useStructureTree hook validates but doesn't mutate directly)
    handleDragEnd();
  }, [draggingId, canDrop, handleDragEnd]);

  const handleDoubleClick = useCallback((id: string) => {
    const node = findNode(id);
    if (node?.type === 'Canvas') {
      onSelect(id);
      setCurrentMode('archive');
    }
  }, [findNode, onSelect, setCurrentMode]);

  // Context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const contextMenuSections = useMemo((): ContextMenuSectionType[] => {
    if (!contextMenu) return [];
    const nodeId = contextMenu.nodeId;
    return [
      {
        title: 'Navigation',
        items: [
          { id: 'open-viewer', label: 'Open in Viewer', icon: 'visibility', onClick: () => { onSelect(nodeId); setCurrentMode('archive'); } },
          { id: 'open-catalog', label: 'Open in Catalog', icon: 'table_chart', onClick: () => { onSelect(nodeId); setCurrentMode('metadata'); } },
        ],
      },
      {
        title: 'Edit',
        items: [
          { id: 'rename', label: 'Rename', icon: 'edit', shortcut: 'F2', onClick: () => onRenameItem?.(nodeId), disabled: !onRenameItem },
          { id: 'duplicate', label: 'Duplicate', icon: 'content_copy', shortcut: 'Ctrl+D', onClick: () => onDuplicateItem?.(nodeId), disabled: !onDuplicateItem },
        ],
      },
      {
        title: 'Danger',
        items: [
          { id: 'delete', label: 'Delete', icon: 'delete', variant: 'danger' as const, shortcut: 'Del', onClick: () => onDeleteItem?.(nodeId), disabled: !onDeleteItem },
        ],
      },
    ];
  }, [contextMenu, onSelect, setCurrentMode, onRenameItem, onDuplicateItem, onDeleteItem]);

  // Nodes to render (filtered or full)
  const nodesToRender = useMemo(() => {
    return filterQuery ? filteredNodes : flattenedNodes;
  }, [flattenedNodes, filteredNodes, filterQuery]);

  // Mobile touch gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    touchStartRef.current = { x: e.touches[0].clientX, time: Date.now() };
    setIsTouchDragging(false);
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !touchStartRef.current) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    if (deltaX < 0) {
      setTouchDeltaX(deltaX);
      setIsTouchDragging(true);
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !touchStartRef.current) return;
    if (touchDeltaX < -80) {
      onClose?.();
    }
    setTouchDeltaX(0);
    setIsTouchDragging(false);
    touchStartRef.current = null;
  }, [isMobile, touchDeltaX, onClose]);

  // Nav items with collapse handling
  const handleNavClick = useCallback((mode: AppMode) => {
    if (isCollapsed && !isMobile) {
      expand();
    }
    setCurrentMode(mode);
  }, [isCollapsed, isMobile, expand, setCurrentMode]);

  // ---- Styles ----

  const sidebarStyles = isMobile
    ? `fixed inset-y-0 left-0 z-[1000] w-80 transition-transform duration-100 ${visible ? 'translate-x-0' : '-translate-x-full'}`
    : `flex flex-col h-full border-r-4 shrink-0 relative panel-fixed`;

  const bgStyles = isFieldMode
    ? 'bg-nb-black border-nb-yellow'
    : 'bg-nb-cream border-nb-black';

  const mobileTransform = isTouchDragging ? `translateX(${touchDeltaX}px)` : undefined;
  const mobileTransition = isTouchDragging ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

  // Override panelStyle for collapsed mode (icon rail)
  const effectivePanelStyle = isMobile ? undefined : {
    ...panelStyle,
    width: isCollapsed ? COLLAPSED_WIDTH : panelStyle.width,
  };

  return (
    <>
      {isMobile && visible && (
        <div
          className="fixed inset-0 bg-nb-black/80 z-[950]"
          style={{ opacity: isTouchDragging ? 1 + touchDeltaX / 320 : 1, transition: isTouchDragging ? 'none' : 'opacity 0.25s' }}
          onClick={onClose}
        />
      )}
      <aside
        className={`${sidebarStyles} ${bgStyles} flex flex-col overflow-hidden sidebar-panel`}
        style={{
          ...(effectivePanelStyle || {}),
          ...(isMobile ? { transform: mobileTransform, transition: mobileTransition } : {}),
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className={`flex items-center px-3 shrink-0 gap-2 h-14 border-b-4 ${isFieldMode ? 'border-nb-yellow bg-nb-black' : 'border-nb-black bg-nb-cream'}`}>
          <div className={`w-8 h-8 flex items-center justify-center font-mono font-black text-sm border-2 shrink-0 ${isFieldMode ? 'bg-nb-yellow text-nb-black border-nb-yellow' : 'bg-nb-blue text-nb-white border-nb-black'}`}>
            <Icon name="photo_library" className="text-lg" />
          </div>
          {!isCollapsed && (
            <>
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
            </>
          )}
          {!isMobile && (
            <Button variant="ghost" size="bare"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`p-1 ml-auto shrink-0 ${isFieldMode ? 'text-nb-yellow/60 hover:text-nb-yellow' : 'text-nb-black/40 hover:text-nb-black'}`}
            >
              <Icon name={isCollapsed ? 'chevron_right' : 'chevron_left'} className="text-lg" />
            </Button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">

          {/* Navigation */}
          <nav className={isCollapsed ? 'py-2' : 'px-4 py-3'}>
            {!isCollapsed && (
              <div className={`nb-label mb-2 ${isFieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'}`}>NAVIGATION</div>
            )}
            <div className={isCollapsed ? 'space-y-0' : 'space-y-1'}>
              <NavItem icon="inventory_2" label="ARCHIVE" active={currentMode === 'archive'} onClick={() => handleNavClick('archive')} fieldMode={isFieldMode} collapsed={isCollapsed} badge={badges?.validationErrors} />
              <NavItem icon="table_chart" label="CATALOG" active={currentMode === 'metadata'} onClick={() => handleNavClick('metadata')} fieldMode={isFieldMode} collapsed={isCollapsed} />
              <NavItem icon="dashboard" label="BOARDS" active={currentMode === 'boards'} onClick={() => handleNavClick('boards')} fieldMode={isFieldMode} collapsed={isCollapsed} />
            </div>
          </nav>

          {/* Import Section — hidden when collapsed */}
          {!isCollapsed && (
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
          )}

          {/* Archive Tree — virtual, with search and keyboard nav */}
          {root && !isCollapsed && (
            <div className="px-4 pb-4 flex-1 flex flex-col min-h-0">
              {/* Tree header */}
              <div className="flex items-center justify-between mb-2">
                <span className={`nb-label ${isFieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'}`}>
                  ARCHIVE
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="bare"
                    onClick={expandAll}
                    className={`p-1 ${isFieldMode ? 'text-nb-yellow/60 hover:text-nb-yellow' : 'text-nb-black/40 hover:text-nb-black'}`}
                    title="Expand all"
                  >
                    <Icon name="unfold_more" className="text-sm" />
                  </Button>
                  <Button variant="ghost" size="bare"
                    onClick={collapseAll}
                    className={`p-1 ${isFieldMode ? 'text-nb-yellow/60 hover:text-nb-yellow' : 'text-nb-black/40 hover:text-nb-black'}`}
                    title="Collapse all"
                  >
                    <Icon name="unfold_less" className="text-sm" />
                  </Button>
                </div>
              </div>

              {/* Search bar */}
              <div className="mb-2">
                <TreeSearchBar
                  query={filterQuery}
                  onQueryChange={setFilterQuery}
                  matchCount={matchCount}
                  totalCount={flattenedNodes.length}
                />
              </div>

              {/* Breadcrumb */}
              {selectedId && root && (
                <BreadcrumbBar
                  root={root}
                  selectedId={selectedId}
                  onNavigate={(id) => { selectNode(id, false); onSelect(id); }}
                  fieldMode={isFieldMode}
                />
              )}

              {/* Virtual tree */}
              <div
                className={`border-2 overflow-hidden flex-1 min-h-[150px] ${isFieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-white border-nb-black'}`}
                ref={treeContainerRef}
                onContextMenu={(e) => {
                  // Calculate which node was right-clicked based on Y position
                  const container = treeContainerRef.current;
                  if (!container) return;
                  const scrollEl = container.querySelector('[role="tree"]') as HTMLElement;
                  if (!scrollEl) return;
                  const rect = scrollEl.getBoundingClientRect();
                  const scrollTop = scrollEl.scrollTop;
                  const y = e.clientY - rect.top + scrollTop;
                  const rowHeight = 36; // matches VirtualTreeList default
                  const nodeIndex = Math.floor(y / rowHeight);
                  const node = nodesToRender[nodeIndex];
                  if (node) {
                    handleContextMenu(e, node.id);
                  }
                }}
              >
                <VirtualTreeList
                  nodes={nodesToRender}
                  containerHeight={treeContainerHeight}
                  onSelect={handleTreeSelect}
                  onToggleExpand={toggleExpanded}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  onDoubleClick={handleDoubleClick}
                  onScrollContainerRef={setScrollContainerRef}
                  className="flex-1"
                />
              </div>

              {/* Tree stats */}
              {treeStats && (
                <div className={`px-2 py-1 text-nb-caption font-mono ${isFieldMode ? 'text-nb-yellow/40' : 'text-nb-black/30'}`}>
                  {treeStats.totalNodes} items
                  {filterQuery && ` · ${matchCount} matches`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className={`border-t-4 shrink-0 ${isFieldMode ? 'border-nb-yellow bg-nb-black' : 'border-nb-black bg-nb-cream'}`}>
          {hasData && !isCollapsed && (
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
          <div className={`flex ${isCollapsed ? 'flex-col items-center p-1.5 gap-1' : 'items-center p-3 gap-2'}`}>
            <Button variant="ghost" size="bare"
              onClick={handleFieldModeToggle}
              title={isFieldMode ? "Disable Field Mode" : "Enable Field Mode"}
              className={`
                ${isCollapsed ? 'p-2' : 'flex-1 flex items-center justify-center gap-2 px-3 py-2.5'}
                font-mono text-nb-caption font-bold uppercase border-2 transition-nb
                ${isFieldMode
                  ? 'text-nb-black bg-nb-yellow border-nb-yellow'
                  : 'text-nb-black border-nb-black/20 hover:bg-nb-black hover:text-nb-white hover:border-nb-black'
                }
              `}
            >
              <Icon name={isFieldMode ? "wb_sunny" : "nights_stay"} className="text-sm" />
              {!isCollapsed && <span>FIELD</span>}
            </Button>

            <Button variant="ghost" size="bare"
              onClick={() => handleNavClick('search')}
              title="Search"
              className={`
                ${isCollapsed ? 'p-2' : 'flex-1 flex items-center justify-center gap-2 px-3 py-2.5'}
                font-mono text-nb-caption font-bold uppercase border-2 transition-nb
                ${currentMode === 'search'
                  ? (isFieldMode ? 'text-nb-black bg-nb-yellow border-nb-yellow' : 'text-nb-white bg-nb-black border-nb-black')
                  : (isFieldMode ? 'text-nb-yellow border-nb-yellow/30 hover:bg-nb-yellow/10' : 'text-nb-black border-nb-black/20 hover:bg-nb-black hover:text-nb-white hover:border-nb-black')
                }
              `}
            >
              <Icon name="search" className="text-sm" />
              {!isCollapsed && <span>SEARCH</span>}
            </Button>

            <Button variant="ghost" size="bare"
              onClick={onOpenSettings}
              title="Settings"
              className={`
                ${isCollapsed ? 'p-2' : 'flex-1 flex items-center justify-center gap-2 px-3 py-2.5'}
                font-mono text-nb-caption font-bold uppercase border-2 transition-nb
                ${isFieldMode ? 'text-nb-yellow border-nb-yellow/30 hover:bg-nb-yellow/10' : 'text-nb-black border-nb-black/20 hover:bg-nb-black hover:text-nb-white hover:border-nb-black'}
              `}
            >
              <Icon name="settings" className="text-sm" />
              {!isCollapsed && <span>SETUP</span>}
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

        {/* Context Menu */}
        <ContextMenu
          x={contextMenu?.x || 0}
          y={contextMenu?.y || 0}
          isOpen={!!contextMenu}
          onClose={closeContextMenu}
          sections={contextMenuSections}
        />
      </aside>

      {/* Global style for nav pulse animation */}
      <style>{`
        @keyframes nav-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}, (prev, next) => {
  return prev.root === next.root &&
         prev.selectedId === next.selectedId &&
         prev.visible === next.visible &&
         prev.fieldMode === next.fieldMode &&
         prev.badges === next.badges;
});
