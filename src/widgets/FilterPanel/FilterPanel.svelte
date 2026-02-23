<!--
  FilterPanel.svelte -- Archive/Search tab composition widget
  =============================================================
  React source: src/widgets/FilterPanel/FilterPanel.tsx (208 lines)

  Architecture:
    - Widget layer: PURE COMPOSITION of two feature organisms
    - Tab bar toggles between ArchiveView and SearchView
    - Supports controlled (activeView prop) or uncontrolled (internal state) mode
    - ArchiveView and SearchView are already migrated Svelte components
    - Both views receive the full cx theme tokens and fieldMode from template

  Props:
    root                 -- Root IIIFItem (Collection or Manifest)
    onSelect             -- Called when a single item is selected
    onOpen               -- Called when an item is opened
    onBatchEdit          -- Called with selected IDs for batch editing
    onUpdate?            -- Called when root is updated
    validationIssues?    -- Validation issues keyed by item ID
    onReveal?            -- Reveal an item in a specific mode
    onCatalogSelection?  -- Selection sent to catalog
    cx                   -- ContextualClassNames for theming
    fieldMode            -- Field mode toggle
    t                    -- Terminology function
    isAdvanced           -- Advanced mode flag
    onSearchSelect       -- Search result selection callback
    onRevealMap?         -- Optional callback to reveal item on map
    defaultView?         -- Initial active tab ('archive' | 'search')
    activeView?          -- Controlled active tab
    onViewChange?        -- Callback when tab changes
-->
<script lang="ts">
  import type { IIIFItem } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import { cn } from '@/src/shared/lib/cn';
  // @migration: ValidationIssue type -- import from validator when wired
  // import type { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';

  // Both feature organisms are already migrated to Svelte
  import ArchiveView from '@/src/features/archive/ui/organisms/ArchiveView.svelte';
  import SearchView from '@/src/features/search/ui/organisms/SearchView.svelte';

  type TabView = 'archive' | 'search';

  interface Props {
    root: IIIFItem | null;
    onSelect: (item: IIIFItem) => void;
    onOpen: (item: IIIFItem) => void;
    onBatchEdit: (ids: string[]) => void;
    onUpdate?: (newRoot: IIIFItem) => void;
    validationIssues?: Record<string, unknown[]>;
    onReveal?: (id: string, mode: 'collections' | 'viewer' | 'archive') => void;
    onCatalogSelection?: (ids: string[]) => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
    t: (key: string) => string;
    isAdvanced: boolean;
    onSearchSelect: (id: string) => void;
    onRevealMap?: (id: string) => void;
    defaultView?: TabView;
    activeView?: TabView;
    onViewChange?: (view: TabView) => void;
    /** Panel toggles bridged to ArchiveView -- defaults managed internally */
    showViewerPanel?: boolean;
    showInspectorPanel?: boolean;
    onToggleViewerPanel?: () => void;
    onToggleInspectorPanel?: () => void;
    onOpenImport?: () => void;
    onOpenExternalImport?: () => void;
  }

  let {
    root,
    onSelect,
    onOpen,
    onBatchEdit,
    onUpdate,
    validationIssues,
    onReveal,
    onCatalogSelection,
    cx,
    fieldMode,
    t,
    isAdvanced,
    onSearchSelect,
    onRevealMap,
    defaultView = 'archive',
    activeView: controlledActiveView,
    onViewChange,
    showViewerPanel = false,
    showInspectorPanel = false,
    onToggleViewerPanel = () => {},
    onToggleInspectorPanel = () => {},
    onOpenImport = () => {},
    onOpenExternalImport = () => {},
  }: Props = $props();

  // ── Local State (uncontrolled mode) ──
  let internalActiveView = $state<TabView>(defaultView);

  // ── Derived: controlled vs uncontrolled ──
  const isControlled = $derived(controlledActiveView !== undefined);
  const activeView = $derived(isControlled ? controlledActiveView! : internalActiveView);

  // ── Handlers ──
  function setActiveView(view: TabView) {
    if (!isControlled) {
      internalActiveView = view;
    }
    onViewChange?.(view);
  }
</script>

<div class="flex flex-col h-full">
  <!-- Tab Toggle Bar -->
  <div class={cn('flex border-b', cx.border || 'border-nb-black/20')}>
    <Button
      onclick={() => setActiveView('archive')}
      variant={activeView === 'archive' ? 'primary' : 'ghost'}
      size="sm"
      fullWidth
      style="border-radius: 0; {activeView === 'archive' ? 'border-bottom: 2px solid currentColor' : ''}"
      aria-pressed={activeView === 'archive'}
    >
      {t('archive') || 'Archive'}
    </Button>
    <Button
      onclick={() => setActiveView('search')}
      variant={activeView === 'search' ? 'primary' : 'ghost'}
      size="sm"
      fullWidth
      style="border-radius: 0; {activeView === 'search' ? 'border-bottom: 2px solid currentColor' : ''}"
      aria-pressed={activeView === 'search'}
    >
      {t('search') || 'Search'}
    </Button>
  </div>

  <!-- Content Area -->
  <div class="flex-1 overflow-hidden">
    {#if activeView === 'archive'}
      {#if root}
        <ArchiveView
          {cx}
          {fieldMode}
          {t}
          {root}
          onSelect={onSelect}
          onOpen={onOpen}
          onUpdate={onUpdate ?? (() => {})}
          onBatchEdit={onBatchEdit}
          validationIssues={validationIssues ? new Map(Object.entries(validationIssues)) : undefined}
          {showViewerPanel}
          {showInspectorPanel}
          {onToggleViewerPanel}
          {onToggleInspectorPanel}
          {onOpenImport}
          {onOpenExternalImport}
        />
      {:else}
        <div class={cn('flex items-center justify-center h-full text-sm', cx.textMuted)}>
          No collection loaded
        </div>
      {/if}
    {:else}
      <SearchView
        {root}
        onSelect={onSearchSelect}
        {onRevealMap}
        {cx}
        {fieldMode}
        {t}
      />
    {/if}
  </div>
</div>
