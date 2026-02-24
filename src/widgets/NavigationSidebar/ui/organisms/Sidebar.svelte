<!--
  Sidebar.svelte
  Navigation sidebar with icon rail (collapsed 48px), expandable tree panel,
  context menu, breadcrumb bar, mobile swipe-to-close, and badge indicators.
  Migrated from React Sidebar.tsx (718 lines).
-->

<script lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { untrack } from 'svelte';
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import { PanelLayout } from '@/src/shared/ui/layout';
  import { toast } from '@/src/shared/stores/toast.svelte';
  import { appSettings } from '@/src/shared/stores/appSettings.svelte';

  import type { IIIFItem, AbstractionLevel } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';

  import {
    getTypeIcon,
    hasDescendantMatch,
    computeBreadcrumbs as computeBreadcrumbsPure,
    flattenTree,
    type FlatTreeNode,
  } from '../../lib/sidebarHelpers';

  // @migration stub -- structure-view feature not yet migrated
  // These components will be Svelte 5 components once structure-view is migrated
  // import { VirtualTreeList } from '@/src/features/structure-view/ui/organisms/VirtualTreeList.svelte';
  // import { TreeSearchBar } from '@/src/features/structure-view/ui/atoms/TreeSearchBar.svelte';
  // import { useStructureTree } from '@/src/features/structure-view/stores/structureTree.svelte';

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------
  type ViewType =
    | 'archive'
    | 'viewer'
    | 'boards'
    | 'metadata'
    | 'search'
    | 'map'
    | 'timeline';

  type SidebarBadges = Record<ViewType, { count?: number; dot?: boolean }>;

  interface ContextMenuState {
    x: number;
    y: number;
    itemId: string;
    itemLabel: string;
  }

  /** Nav items configuration for the icon rail */
  interface NavItemDef {
    type: ViewType;
    icon: string;
    label: string;
    shortcut?: string;
  }

  // Icon names must be Material Icons ligature names (underscore format).
  // The app loads only the Material Icons font — Lucide/Feather names won't render.
  const NAV_ITEMS: NavItemDef[] = [
    { type: 'archive',  icon: 'archive',     label: 'Archive',  shortcut: '1' },
    { type: 'viewer',   icon: 'visibility',  label: 'Viewer',   shortcut: '2' },
    { type: 'boards',   icon: 'grid_view',   label: 'Boards',   shortcut: '3' },
    { type: 'metadata', icon: 'description', label: 'Metadata', shortcut: '4' },
    { type: 'search',   icon: 'search',      label: 'Search',   shortcut: '5' },
    { type: 'map',      icon: 'map',         label: 'Map',      shortcut: '6' },
    { type: 'timeline', icon: 'schedule',    label: 'Timeline', shortcut: '7' },
  ];

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  interface Props {
    root: IIIFItem | null;
    selectedId: string | null;
    viewType: ViewType;
    onSelect: (id: string) => void;
    onViewTypeChange: (type: ViewType) => void;
    onImport: () => void;
    onExportTrigger: () => void;
    onToggleFieldMode: () => void;
    onStructureUpdate?: (newRoot: IIIFItem) => void;
    visible: boolean;
    onOpenExternalImport?: () => void;
    onOpenSettings?: () => void;
    onToggleQuickHelp?: () => void;
    isMobile?: boolean;
    onClose?: () => void;
    abstractionLevel?: AbstractionLevel;
    onAbstractionLevelChange?: (level: AbstractionLevel) => void;
    fieldMode?: boolean;
    badges?: SidebarBadges;
    onDeleteItem?: (id: string) => void;
    onDuplicateItem?: (id: string) => void;
    onRenameItem?: (id: string) => void;
  }

  let {
    root,
    selectedId,
    viewType,
    onSelect,
    onViewTypeChange,
    onImport,
    onExportTrigger,
    onToggleFieldMode,
    onStructureUpdate,
    visible,
    onOpenExternalImport,
    onOpenSettings,
    onToggleQuickHelp,
    isMobile = false,
    onClose,
    abstractionLevel = 'standard',
    onAbstractionLevelChange,
    fieldMode = false,
    badges,
    onDeleteItem,
    onDuplicateItem,
    onRenameItem,
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let contextMenu: ContextMenuState | null = $state(null);
  let treeSearchQuery: string = $state('');
  let treeContainerRef: HTMLDivElement | undefined = $state(undefined);
  let treeContainerHeight: number = $state(400);

  // Expand/collapse tracking for tree nodes
  let expandedIds: Set<string> = $state(new Set<string>());

  // Resizable panel state
  // @migration -- useResizablePanel hook will be a Svelte 5 runes store
  let panelWidth: number = $state(260);
  let isCollapsed: boolean = $state(false);
  const COLLAPSE_THRESHOLD = 180;
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 400;
  let isResizing: boolean = $state(false);
  let resizeStartX: number = $state(0);
  let resizeStartWidth: number = $state(0);

  // Mobile swipe state
  let touchStartX: number = $state(0);
  let touchCurrentX: number = $state(0);
  let isSwiping: boolean = $state(false);
  const SWIPE_THRESHOLD = 80;

  // Breadcrumb state
  let breadcrumbs: { id: string; label: string }[] = $state([]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  /** Effective sidebar width based on collapsed state */
  const effectiveWidth = $derived(isCollapsed ? 48 : panelWidth);

  /** Whether the panel content (tree, search) should render */
  const showPanel = $derived(!isCollapsed && visible);

  /** CSS transform for mobile swipe animation */
  const swipeTransform = $derived.by((): string => {
    if (!isSwiping) return '';
    const delta = touchCurrentX - touchStartX;
    if (delta >= 0) return ''; // Only allow left swipe (close)
    return `translateX(${Math.max(delta, -effectiveWidth)}px)`;
  });

  /** Badge for current nav item */
  function getBadge(type: ViewType): { count?: number; dot?: boolean } | undefined {
    return badges?.[type];
  }

  // ---------------------------------------------------------------------------
  // Tree flattening (functional placeholder for VirtualTreeList)
  // ---------------------------------------------------------------------------

  /**
   * Flatten the IIIF tree into a list of nodes with depth, respecting
   * expand/collapse state and search filter.
   * @migration -- Replace with VirtualTreeList + useStructureTree once migrated
   */
  const flatTreeNodes = $derived.by((): FlatTreeNode[] => {
    return flattenTree(root, expandedIds, treeSearchQuery);
  });

  /** Count of total items in tree */
  const treeItemCount = $derived.by((): number => {
    if (!root) return 0;
    let count = 0;
    function walk(item: IIIFItem): void {
      count++;
      const children = (item as unknown as Record<string, unknown>).items as IIIFItem[] | undefined;
      if (children) children.forEach(walk);
    }
    walk(root);
    return count;
  });

  /** Count of filtered matches */
  const matchCount = $derived(
    treeSearchQuery.trim() ? flatTreeNodes.length : 0
  );

  // ---------------------------------------------------------------------------
  // Breadcrumb computation
  // ---------------------------------------------------------------------------

  /** Build breadcrumb path from root to selectedId */
  function computeBreadcrumbs(
    item: IIIFItem | null,
    targetId: string | null
  ): { id: string; label: string }[] {
    if (!item || !targetId) return [];
    return computeBreadcrumbsPure(item, targetId);
  }

  // ---------------------------------------------------------------------------
  // Tree handlers
  // ---------------------------------------------------------------------------

  function handleToggleExpand(nodeId: string): void {
    const next = new Set(expandedIds);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    expandedIds = next;
  }

  function handleExpandAll(): void {
    if (!root) return;
    const all = new Set<string>();
    function walk(item: IIIFItem): void {
      const children = (item as unknown as Record<string, unknown>).items as IIIFItem[] | undefined;
      if (children && children.length > 0) {
        all.add(item.id);
        children.forEach(walk);
      }
    }
    walk(root);
    expandedIds = all;
  }

  function handleCollapseAll(): void {
    expandedIds = new Set();
  }

  function handleTreeItemClick(nodeId: string): void {
    onSelect(nodeId);
  }

  function handleTreeItemDoubleClick(nodeId: string): void {
    // Toggle expand on double click for items with children
    handleToggleExpand(nodeId);
  }

  // ---------------------------------------------------------------------------
  // Resize handlers
  // ---------------------------------------------------------------------------

  function handleResizeStart(e: MouseEvent): void {
    e.preventDefault();
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartWidth = panelWidth;

    const handleResizeMove = (me: MouseEvent) => {
      const delta = me.clientX - resizeStartX;
      const newWidth = resizeStartWidth + delta;

      if (newWidth < COLLAPSE_THRESHOLD) {
        isCollapsed = true;
      } else {
        isCollapsed = false;
        panelWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
      }
    };

    const handleResizeEnd = () => {
      isResizing = false;
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }

  function handleToggleCollapse(): void {
    isCollapsed = !isCollapsed;
    if (!isCollapsed && panelWidth < MIN_WIDTH) {
      panelWidth = MIN_WIDTH;
    }
  }

  // ---------------------------------------------------------------------------
  // Mobile swipe handlers
  // ---------------------------------------------------------------------------

  function handleTouchStart(e: TouchEvent): void {
    if (!isMobile) return;
    touchStartX = e.touches[0].clientX;
    touchCurrentX = touchStartX;
    isSwiping = true;
  }

  function handleTouchMove(e: TouchEvent): void {
    if (!isSwiping) return;
    touchCurrentX = e.touches[0].clientX;
  }

  function handleTouchEnd(): void {
    if (!isSwiping) return;
    isSwiping = false;
    const delta = touchCurrentX - touchStartX;
    if (delta < -SWIPE_THRESHOLD && onClose) {
      onClose();
    }
  }

  // ---------------------------------------------------------------------------
  // Context menu handlers
  // ---------------------------------------------------------------------------

  function handleContextMenu(e: MouseEvent, itemId: string, itemLabel: string): void {
    e.preventDefault();
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      itemId,
      itemLabel,
    };
  }

  function handleContextMenuClose(): void {
    contextMenu = null;
  }

  function handleContextMenuAction(action: 'navigate' | 'edit' | 'delete' | 'duplicate' | 'rename'): void {
    if (!contextMenu) return;
    const { itemId } = contextMenu;

    switch (action) {
      case 'navigate':
        onSelect(itemId);
        break;
      case 'delete':
        onDeleteItem?.(itemId);
        break;
      case 'duplicate':
        onDuplicateItem?.(itemId);
        break;
      case 'rename':
        onRenameItem?.(itemId);
        break;
    }

    handleContextMenuClose();
  }

  function handleContextMenuClick(e: MouseEvent): void {
    e.stopPropagation();
  }

  // ---------------------------------------------------------------------------
  // Nav item handler
  // ---------------------------------------------------------------------------

  function handleNavClick(type: ViewType): void {
    onViewTypeChange(type);
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Update breadcrumbs when selectedId changes
  $effect(() => {
    breadcrumbs = computeBreadcrumbs(root, selectedId);
  });

  // Auto-expand path to selected item.
  // Use untrack() to read expandedIds without making it a reactive dependency —
  // otherwise writing expandedIds re-triggers this very effect (infinite loop).
  $effect(() => {
    if (!selectedId || !root) return;
    const pathItems = computeBreadcrumbs(root, selectedId);
    if (pathItems.length <= 1) return;

    const ancestorIds = pathItems.slice(0, -1).map((p) => p.id);
    const current = untrack(() => expandedIds);

    // Skip write if all ancestors are already expanded (avoids creating a new Set).
    if (ancestorIds.every((id) => current.has(id))) return;

    const next = new Set(current);
    for (const id of ancestorIds) next.add(id);
    expandedIds = next;
  });

  // ResizeObserver for tree container height
  $effect(() => {
    if (!treeContainerRef) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        treeContainerHeight = entry.contentRect.height;
      }
    });

    observer.observe(treeContainerRef);
    return () => observer.disconnect();
  });

  // Close context menu on outside click
  $effect(() => {
    if (!contextMenu) return;

    const handleClickOutside = () => {
      contextMenu = null;
    };

    // Delay to avoid closing on the same click that opened
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClickOutside, { once: true });
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClickOutside);
    };
  });

  // Nav-pulse animation CSS class on view change
  // @migration -- will trigger a brief CSS animation on the active nav item
  let navPulseView: ViewType | null = $state(null);

  $effect(() => {
    const _viewType = viewType;
    navPulseView = _viewType;
    const timer = setTimeout(() => { navPulseView = null; }, 300);
    return () => clearTimeout(timer);
  });
</script>

<!-- ======================================================================= -->
<!-- TEMPLATE                                                                -->
<!-- ======================================================================= -->

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <aside
    class={cn(
      'flex h-full bg-theme-surface border-r border-theme-border',
      'transition-[width] duration-200 ease-out',
      isMobile && 'fixed inset-y-0 left-0 z-50 shadow-xl'
    )}
    style="width: {effectiveWidth}px; {swipeTransform ? `transform: ${swipeTransform}` : ''}"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    role="navigation"
    aria-label="Main navigation"
  >

    <!-- ================================================================= -->
    <!-- ICON RAIL (always visible, 48px wide)                             -->
    <!-- ================================================================= -->
    <div class="w-12 shrink-0 flex flex-col border-r border-theme-border bg-theme-surface-raised">

      <!-- Brand logo / collapse toggle at top -->
      <div class="h-header-compact flex items-center justify-center border-b border-theme-border">
        <Button
          variant="ghost"
          size="bare"
          onclick={handleToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          class="p-2"
        >
          <Icon
            name={isCollapsed ? 'panel-left-open' : 'panel-left-close'}
            size={18}
          />
        </Button>
      </div>

      <!-- Nav items -->
      <div class="flex-1 flex flex-col items-center gap-1 py-2">
        {#each NAV_ITEMS as nav}
          {@const badge = getBadge(nav.type)}
          {@const isActive = viewType === nav.type}
          {@const isPulsing = navPulseView === nav.type}

          <button
            class={cn(
              'relative w-10 h-10 flex items-center justify-center rounded-lg',
              'transition-colors duration-150',
              isActive
                ? 'bg-theme-primary/15 text-theme-primary'
                : 'text-theme-text-muted hover:bg-theme-surface-hover hover:text-theme-text',
              isPulsing && 'animate-pulse'
            )}
            onclick={() => handleNavClick(nav.type)}
            title={`${nav.label}${nav.shortcut ? ` (${nav.shortcut})` : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon name={nav.icon} size={20} />

            <!-- Badge dot -->
            {#if badge?.dot}
              <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
            {/if}

            <!-- Badge count -->
            {#if badge?.count && badge.count > 0}
              <span class={cn(
                'absolute -top-0.5 -right-0.5',
                'min-w-[16px] h-4 px-1',
                'flex items-center justify-center',
                'text-[9px] font-bold text-white bg-red-500 rounded-full'
              )}>
                {badge.count > 99 ? '99+' : badge.count}
              </span>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Bottom rail actions -->
      <div class="flex flex-col items-center gap-1 py-2 border-t border-theme-border">
        {#if onToggleQuickHelp}
          <Button
            variant="ghost"
            size="bare"
            onclick={onToggleQuickHelp}
            title="Quick Help"
            class="w-10 h-10 flex items-center justify-center"
          >
            <Icon name="help-circle" size={18} />
          </Button>
        {/if}

        {#if onOpenSettings}
          <Button
            variant="ghost"
            size="bare"
            onclick={onOpenSettings}
            title="Settings"
            class="w-10 h-10 flex items-center justify-center"
          >
            <Icon name="settings" size={18} />
          </Button>
        {/if}
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- EXPANDABLE PANEL (hidden when collapsed)                          -->
    <!-- ================================================================= -->
    {#if showPanel}
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- Panel header -->
        <div class="h-header-compact flex items-center gap-2 px-3 border-b border-theme-border">
          <span class="text-sm font-semibold text-theme-text truncate flex-1">
            Navigator
          </span>
          {#if isMobile && onClose}
            <Button variant="ghost" size="bare" onclick={onClose} class="p-1">
              <Icon name="x" size={16} />
            </Button>
          {/if}
        </div>

        <!-- Breadcrumb bar (when an item is selected) -->
        {#if breadcrumbs.length > 1}
          <div class="flex items-center gap-1 px-3 py-1.5 border-b border-theme-border/50 overflow-x-auto text-xs">
            {#each breadcrumbs as crumb, idx}
              {#if idx > 0}
                <Icon name="chevron_right" size={10} class="text-theme-text-muted shrink-0" />
              {/if}
              <button
                class={cn(
                  'truncate max-w-[120px] hover:text-theme-primary transition-colors',
                  idx === breadcrumbs.length - 1
                    ? 'text-theme-text font-medium'
                    : 'text-theme-text-muted'
                )}
                onclick={() => onSelect(crumb.id)}
                title={crumb.label}
              >
                {crumb.label}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Tree search bar -->
        <!-- @migration placeholder -- TreeSearchBar from structure-view feature -->
        <div class="px-2 py-2 border-b border-theme-border/50">
          <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-theme-surface-raised">
            <Icon name="search" size={14} class="text-theme-text-muted shrink-0" />
            <input
              type="text"
              value={treeSearchQuery}
              oninput={(e) => { treeSearchQuery = e.currentTarget.value; }}
              placeholder="Filter tree..."
              class="flex-1 bg-transparent text-xs text-theme-text placeholder:text-theme-text-muted outline-none border-none"
            />
            {#if treeSearchQuery}
              <Button variant="ghost" size="bare" onclick={() => { treeSearchQuery = ''; }}>
                <Icon name="x" size={12} />
              </Button>
            {/if}
          </div>
          {#if treeSearchQuery.trim()}
            <div class="px-2 pt-1 text-[10px] text-theme-text-muted">
              {matchCount} match{matchCount !== 1 ? 'es' : ''} of {treeItemCount} items
            </div>
          {/if}
        </div>

        <!-- Tree header with expand/collapse all -->
        {#if root}
          <div class="flex items-center justify-between px-3 py-1.5 border-b border-theme-border/30">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
              Archive
            </span>
            <div class="flex items-center gap-0.5">
              <button
                class="p-0.5 text-theme-text-muted hover:text-theme-text transition-colors"
                onclick={handleExpandAll}
                title="Expand all"
              >
                <Icon name="expand_more" size={12} />
              </button>
              <button
                class="p-0.5 text-theme-text-muted hover:text-theme-text transition-colors"
                onclick={handleCollapseAll}
                title="Collapse all"
              >
                <Icon name="expand_less" size={12} />
              </button>
            </div>
          </div>
        {/if}

        <!-- Tree body (scrollable) -->
        <div bind:this={treeContainerRef} class="flex-1 overflow-y-auto" role="tree">
          <!-- @migration: Replace with <VirtualTreeList> once structure-view is migrated -->
          <!-- Current implementation: simple flat list rendering with expand/collapse -->
          <!-- <VirtualTreeList
            root={root}
            selectedId={selectedId}
            filterQuery={treeSearchQuery}
            containerHeight={treeContainerHeight}
            onSelect={onSelect}
            onContextMenu={handleContextMenu}
          /> -->
          {#if root}
            <div class="py-1">
              {#each flatTreeNodes as node (node.id)}
                {@const isSelected = node.id === selectedId}
                {@const searchHighlight = treeSearchQuery.trim() && node.label.toLowerCase().includes(treeSearchQuery.toLowerCase().trim())}

                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <button
                  class={cn(
                    'w-full flex items-center gap-1.5 py-1 pr-2 text-left',
                    'text-xs transition-colors group',
                    isSelected
                      ? 'bg-theme-primary/15 text-theme-primary font-medium'
                      : 'text-theme-text hover:bg-theme-surface-hover'
                  )}
                  style="padding-left: {8 + node.depth * 16}px;"
                  onclick={() => handleTreeItemClick(node.id)}
                  ondblclick={() => handleTreeItemDoubleClick(node.id)}
                  oncontextmenu={(e) => handleContextMenu(e, node.id, node.label)}
                  role="treeitem"
                  aria-selected={isSelected}
                  aria-expanded={node.hasChildren ? node.isExpanded : undefined}
                  aria-level={node.depth + 1}
                >
                  <!-- Expand/collapse chevron -->
                  {#if node.hasChildren}
                    <span
                      role="button"
                      tabindex="0"
                      class="p-0.5 text-theme-text-muted hover:text-theme-text transition-colors shrink-0"
                      onclick={(e) => { e.stopPropagation(); handleToggleExpand(node.id); }}
                      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleToggleExpand(node.id); } }}
                      aria-label={node.isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <Icon
                        name={node.isExpanded ? 'expand_more' : 'chevron_right'}
                        size={12}
                      />
                    </span>
                  {:else}
                    <span class="w-5 shrink-0"></span>
                  {/if}

                  <!-- Type icon -->
                  <Icon
                    name={getTypeIcon(node.type)}
                    size={14}
                    class={cn(
                      'shrink-0',
                      isSelected ? 'text-theme-primary' : 'text-theme-text-muted'
                    )}
                  />

                  <!-- Label -->
                  <span class={cn(
                    'truncate',
                    searchHighlight && 'bg-theme-primary/10 rounded px-0.5'
                  )}>
                    {node.label}
                  </span>

                  <!-- Item type badge (only for non-Canvas) -->
                  {#if node.type !== 'Canvas' && node.depth === 0}
                    <span class="text-[9px] text-theme-text-muted opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0">
                      {node.type}
                    </span>
                  {/if}
                </button>
              {/each}

              <!-- Tree stats -->
              {#if flatTreeNodes.length > 0}
                <div class="px-3 py-1.5 text-[10px] text-theme-text-muted font-mono">
                  {treeItemCount} items
                  {#if treeSearchQuery.trim()}
                    &middot; {matchCount} matches
                  {/if}
                </div>
              {/if}
            </div>
          {:else}
            <div class="flex flex-col items-center justify-center h-full p-4 text-center">
              <Icon name="folder-open" size={32} class="text-theme-text-muted mb-2" />
              <p class="text-sm text-theme-text-muted">No project loaded</p>
              <Button variant="primary" size="sm" class="mt-3" onclick={onImport}>
                Import
              </Button>
            </div>
          {/if}
        </div>

        <!-- Footer: Import / Export / Field Mode buttons -->
        <div class="flex items-center gap-1 px-2 py-2 border-t border-theme-border">
          <Button variant="ghost" size="sm" onclick={onImport} title="Import files">
            <Icon name="upload" size={14} />
            <span class="text-xs ml-1">Import</span>
          </Button>
          <Button variant="ghost" size="sm" onclick={onExportTrigger} title="Export">
            <Icon name="download" size={14} />
            <span class="text-xs ml-1">Export</span>
          </Button>

          {#if onOpenExternalImport}
            <Button variant="ghost" size="sm" onclick={onOpenExternalImport} title="External import">
              <Icon name="globe" size={14} />
            </Button>
          {/if}

          <div class="flex-1"></div>

          <Button
            variant={fieldMode ? 'secondary' : 'ghost'}
            size="sm"
            onclick={onToggleFieldMode}
            title={fieldMode ? 'Exit Field Mode' : 'Enter Field Mode'}
          >
            <Icon name="zap" size={14} />
          </Button>
        </div>
      </div>

      <!-- Resize handle -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class={cn(
          'w-1 cursor-col-resize hover:bg-theme-primary/30 transition-colors',
          isResizing && 'bg-theme-primary/30'
        )}
        onmousedown={handleResizeStart}
        role="button"
        aria-label="Resize sidebar"
        tabindex="0"
      ></div>
    {/if}
  </aside>

  <!-- ================================================================= -->
  <!-- CONTEXT MENU (portal-positioned)                                  -->
  <!-- ================================================================= -->
  {#if contextMenu}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class={cn(
        'fixed z-[100] min-w-[180px] py-1',
        'bg-theme-surface border border-theme-border rounded-lg shadow-lg',
        'animate-in fade-in-0 zoom-in-95'
      )}
      style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
      role="menu"
      tabindex="0"
      onclick={handleContextMenuClick}
      onkeydown={(e) => { if (e.key === 'Escape') contextMenu = null; }}
    >
      <!-- Context menu title -->
      <div class="px-3 py-1.5 border-b border-theme-border/50">
        <span class="text-xs font-medium text-theme-text truncate block max-w-[160px]">
          {contextMenu.itemLabel}
        </span>
      </div>

      <!-- Navigate section -->
      <div class="px-2 pt-1.5 pb-0.5">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
          Navigate
        </span>
      </div>
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-theme-text hover:bg-theme-surface-hover transition-colors"
        onclick={() => handleContextMenuAction('navigate')}
        role="menuitem"
      >
        <Icon name="arrow-right" size={14} />
        Go to Item
      </button>

      <div class="h-px bg-theme-border mx-2 my-1"></div>

      <!-- Edit section -->
      <div class="px-2 pt-1 pb-0.5">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
          Edit
        </span>
      </div>
      {#if onRenameItem}
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-theme-text hover:bg-theme-surface-hover transition-colors"
          onclick={() => handleContextMenuAction('rename')}
          role="menuitem"
        >
          <Icon name="edit-2" size={14} />
          Rename
        </button>
      {/if}
      {#if onDuplicateItem}
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-theme-text hover:bg-theme-surface-hover transition-colors"
          onclick={() => handleContextMenuAction('duplicate')}
          role="menuitem"
        >
          <Icon name="copy" size={14} />
          Duplicate
        </button>
      {/if}

      {#if onDeleteItem}
        <div class="h-px bg-theme-border mx-2 my-1"></div>

        <!-- Delete section -->
        <div class="px-2 pt-1 pb-0.5">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
            Danger
          </span>
        </div>
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          onclick={() => handleContextMenuAction('delete')}
          role="menuitem"
        >
          <Icon name="trash-2" size={14} />
          Delete
        </button>
      {/if}
    </div>
  {/if}

  <!-- Mobile backdrop overlay -->
  {#if isMobile}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-40 bg-black/30"
      onclick={onClose}
      onkeydown={(e) => { if (e.key === 'Escape') onClose?.(); }}
    ></div>
  {/if}
{/if}

<style>
  /* Nav pulse animation for view switching */
  @keyframes nav-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  :global(.animate-pulse) {
    animation: nav-pulse 300ms ease-out;
  }
</style>
