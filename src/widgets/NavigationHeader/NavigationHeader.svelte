<!--
  NavigationHeader.svelte -- Application header composition widget
  ==================================================================
  React source: src/widgets/NavigationHeader/NavigationHeader.tsx (211 lines)

  Architecture:
    - Widget layer: PURE COMPOSITION of sub-components
    - Two-row header layout:
      Row 1 (top): Brand/logo + Breadcrumb trail + User menu
      Row 2 (bottom): ArchiveHeader (already migrated Svelte component)
    - Sub-components HeaderTopBar, HeaderBreadcrumb, HeaderUserMenu are inlined
      directly since they are simple enough not to warrant separate files.
    - ArchiveHeader IS migrated and rendered with bridged props.
-->
<script lang="ts">
  import type { IIIFItem } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  // ArchiveHeader is already migrated
  import ArchiveHeader from '@/src/features/archive/ui/organisms/ArchiveHeader.svelte';

  type ViewMode = 'grid' | 'list' | 'grouped';
  type SortMode = 'name' | 'date' | 'size';
  type SortDirection = 'asc' | 'desc';

  interface Props {
    filter: string;
    onFilterChange: (value: string) => void;
    view: ViewMode;
    onViewChange: (view: ViewMode) => void;
    isMobile: boolean;
    selectedCount: number;
    selectionHasGPS: boolean;
    onClearSelection: () => void;
    onGroupIntoManifest: () => void;
    onOpenMap: () => void;
    onEditMetadata: () => void;
    onBatchEdit: () => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
    t: (key: string) => string;
    userName?: string;
    userAvatar?: string;
    organizationName?: string;
    onUserMenu?: () => void;
    onSettings?: () => void;
    onHelp?: () => void;
    breadcrumbPath?: IIIFItem[];
    onBreadcrumbClick?: (item: IIIFItem) => void;
    rootItem?: IIIFItem | null;
  }

  let {
    filter,
    onFilterChange,
    view,
    onViewChange,
    isMobile,
    selectedCount,
    selectionHasGPS,
    onClearSelection,
    onGroupIntoManifest,
    onOpenMap,
    onEditMetadata,
    onBatchEdit,
    cx,
    fieldMode,
    t,
    userName,
    userAvatar,
    organizationName,
    onUserMenu,
    onSettings,
    onHelp,
    breadcrumbPath = [],
    onBreadcrumbClick,
    rootItem,
  }: Props = $props();

  // ── Bridge: ArchiveHeader needs a bindable filter, but we receive callback ──
  // We use a local $state synced with the prop via $effect for two-way bridging.
  // svelte-ignore state_referenced_locally -- intentional: filter is initial value, $effect handles sync
  let localFilter = $state(filter);

  // eslint-disable-next-line @field-studio/no-effect-for-derived -- two-way binding: localFilter written by both prop sync and ArchiveHeader bind:filter
  $effect(() => {
    // Sync prop -> local when parent changes it
    localFilter = filter;
  });

  // When localFilter changes from ArchiveHeader's bind:filter, notify parent
  $effect(() => {
    if (localFilter !== filter) {
      onFilterChange(localFilter);
    }
  });

  // ── ArchiveHeader needs additional props that NavigationHeader does not expose ──
  // These are internal defaults for the composed ArchiveHeader.
  let sortBy = $state<SortMode>('name');
  let sortDirection = $state<SortDirection>('asc');
  let groupByManifest = $state(false);
  let showViewerPanel = $state(false);
  let showInspectorPanel = $state(false);

  // ── Helpers ──
  function getItemLabel(item: IIIFItem): string {
    if (item.label) {
      const values = Object.values(item.label);
      if (values.length > 0 && values[0].length > 0) {
        return values[0][0];
      }
    }
    return item.id ?? 'Untitled';
  }
</script>

<header
  class={cn('flex flex-col border-b', cx.border, cx.headerBg)}
>
  <!-- Row 1: Brand, Breadcrumb, User Context -->
  <div class={cn('flex items-center justify-between px-4 py-2 border-b border-nb-black/20')}>
    <!-- Left: Brand & Breadcrumb -->
    <div class="flex items-center gap-4 flex-1 min-w-0">
      <!-- HeaderTopBar (inlined): Application brand mark -->
      <div class="flex items-center gap-2 shrink-0">
        <div class={cn(
          'w-6 h-6 flex items-center justify-center',
          fieldMode ? 'bg-nb-yellow text-nb-black' : 'bg-nb-black text-nb-white'
        )}>
          <Icon name="grid_view" class="text-xs" />
        </div>
        <span class={cn('font-mono text-sm font-bold uppercase tracking-wide', cx.text)}>
          Field Studio
        </span>
      </div>

      <!-- HeaderBreadcrumb (inlined): Clickable breadcrumb trail -->
      {#if rootItem || breadcrumbPath.length > 0}
        <nav class="flex items-center gap-1 text-xs truncate" aria-label="Breadcrumb">
          {#if rootItem}
            <button
              class={cn(
                'hover:underline truncate max-w-[120px] transition-nb',
                cx.textMuted
              )}
              onclick={() => rootItem && onBreadcrumbClick?.(rootItem)}
              title={getItemLabel(rootItem)}
            >
              {getItemLabel(rootItem)}
            </button>
          {/if}
          {#each breadcrumbPath as crumb, i (crumb.id ?? i)}
            <span class={cn('opacity-40 select-none', cx.textMuted)}>/</span>
            <button
              class={cn(
                'hover:underline truncate max-w-[120px] transition-nb',
                i === breadcrumbPath.length - 1 ? cx.text : cx.textMuted
              )}
              onclick={() => onBreadcrumbClick?.(crumb)}
              title={getItemLabel(crumb)}
            >
              {getItemLabel(crumb)}
            </button>
          {/each}
        </nav>
      {/if}
    </div>

    <!-- Right: User Context (inlined HeaderUserMenu) -->
    <div class="flex items-center gap-3 shrink-0">
      {#if organizationName}
        <span class={cn('text-[10px] font-mono uppercase tracking-wide hidden sm:inline', cx.textMuted)}>
          {organizationName}
        </span>
      {/if}

      {#if userName}
        <div class="flex items-center gap-2">
          {#if userAvatar}
            <img
              src={userAvatar}
              alt={userName}
              class="w-5 h-5 rounded-full object-cover"
            />
          {:else}
            <div class={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
              fieldMode ? 'bg-nb-yellow/30 text-nb-yellow' : 'bg-nb-black/10 text-nb-black/60'
            )}>
              {userName.charAt(0).toUpperCase()}
            </div>
          {/if}
          <span class={cn('text-xs font-mono hidden sm:inline', cx.textMuted)}>
            {userName}
          </span>
        </div>
      {/if}

      {#if onHelp}
        <Button variant="ghost" size="bare" onclick={onHelp} title="Help">
          <Icon name="help_outline" class={cn('text-sm', cx.textMuted)} />
        </Button>
      {/if}

      {#if onSettings}
        <Button variant="ghost" size="bare" onclick={onSettings} title="Settings">
          <Icon name="settings" class={cn('text-sm', cx.textMuted)} />
        </Button>
      {/if}

      {#if onUserMenu}
        <Button variant="ghost" size="bare" onclick={onUserMenu} title="User menu">
          <Icon name="more_vert" class={cn('text-sm', cx.textMuted)} />
        </Button>
      {/if}
    </div>
  </div>

  <!-- Row 2: Archive Controls (already migrated) -->
  <ArchiveHeader
    {cx}
    {fieldMode}
    bind:filter={localFilter}
    {view}
    onViewChange={onViewChange}
    {sortBy}
    onSortChange={(s) => sortBy = s}
    {sortDirection}
    onSortDirectionChange={(d) => sortDirection = d}
    {groupByManifest}
    onToggleGroupByManifest={() => groupByManifest = !groupByManifest}
    {selectedCount}
    {selectionHasGPS}
    {onClearSelection}
    {onGroupIntoManifest}
    {onOpenMap}
    {onEditMetadata}
    {onBatchEdit}
    {showViewerPanel}
    onToggleViewerPanel={() => showViewerPanel = !showViewerPanel}
    {showInspectorPanel}
    onToggleInspectorPanel={() => showInspectorPanel = !showInspectorPanel}
  />
</header>
