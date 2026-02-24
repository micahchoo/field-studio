<!--
  KeyboardShortcutsOverlay.svelte
  Modal overlay showing all keyboard shortcuts with search, context tabs,
  and category filter chips. Supports print-to-HTML.
  Migrated from React KeyboardShortcutsOverlay.tsx (384 lines).
-->

<script lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon, Input } from '@/src/shared/ui/atoms';
  import { ModalDialog } from '@/src/shared/ui/molecules';

  // @migration stub -- shortcuts data + utilities from constants file
  import { SHORTCUTS as shortcuts } from '@/src/shared/constants/shortcuts';

  // ---------------------------------------------------------------------------
  // Types & Helpers (extracted to lib)
  // ---------------------------------------------------------------------------
  import {
    escapeHtml,
    formatKey as formatKeyHelper,
    getCategoryLabel as getCategoryLabelHelper,
    type ShortcutContext,
    type Shortcut,
    type ShortcutCategory,
  } from '../lib/shortcutHelpers';

  const ALL_CATEGORIES: { id: ShortcutCategory; label: string }[] = [
    { id: 'navigation', label: 'Navigation' },
    { id: 'editing', label: 'Editing' },
    { id: 'selection', label: 'Selection' },
    { id: 'view', label: 'View' },
    { id: 'file', label: 'File' },
    { id: 'tools', label: 'Tools' },
  ];

  const ALL_CONTEXTS: { id: ShortcutContext; label: string }[] = [
    { id: 'global', label: 'Global' },
    { id: 'archive', label: 'Archive' },
    { id: 'viewer', label: 'Viewer' },
    { id: 'board', label: 'Board' },
    { id: 'metadata', label: 'Metadata' },
    { id: 'search', label: 'Search' },
  ];

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentContext?: ShortcutContext;
  }

  let {
    isOpen,
    onClose,
    currentContext = 'global',
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let searchQuery: string = $state('');
  // svelte-ignore state_referenced_locally -- intentional: currentContext is the initial value only
  let selectedContext: ShortcutContext | 'all' = $state(currentContext);
  let selectedCategory: ShortcutCategory | null = $state(null);
  let searchInputRef: HTMLInputElement | undefined = $state(undefined);

  // ---------------------------------------------------------------------------
  // Platform detection
  // ---------------------------------------------------------------------------
  const isMac = $derived(
    typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  );

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  /** Filter shortcuts by search query, context, and category */
  const filteredShortcuts = $derived.by((): Shortcut[] => {
    let result = shortcuts as Shortcut[];

    // Filter by context
    if (selectedContext !== 'all') {
      result = result.filter(
        (s) => s.context === selectedContext || s.context === 'global'
      );
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((s) => s.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          (s.description?.toLowerCase().includes(q) ?? false) ||
          s.keys.some((k) => k.toLowerCase().includes(q))
      );
    }

    return result;
  });

  /** Group filtered shortcuts by category for display */
  const groupedShortcuts = $derived.by((): Map<string, Shortcut[]> => {
    const groups = new Map<string, Shortcut[]>();
    for (const shortcut of filteredShortcuts) {
      const cat = shortcut.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(shortcut);
    }
    return groups;
  });

  /** Sorted category keys based on ALL_CATEGORIES order */
  const sortedCategories = $derived.by((): string[] => {
    const order = ALL_CATEGORIES.map((c) => c.id);
    return [...groupedShortcuts.keys()].sort(
      (a, b) => order.indexOf(a as ShortcutCategory) - order.indexOf(b as ShortcutCategory)
    );
  });

  /** Count of shortcuts per context (for badge display on tabs) */
  const contextCounts = $derived.by((): Record<string, number> => {
    const counts: Record<string, number> = { all: (shortcuts as Shortcut[]).length };
    for (const ctx of ALL_CONTEXTS) {
      counts[ctx.id] = (shortcuts as Shortcut[]).filter(
        (s) => s.context === ctx.id || s.context === 'global'
      ).length;
    }
    return counts;
  });

  /** All unique categories present in current filtered set */
  const availableCategories = $derived(
    [...new Set(filteredShortcuts.map((s) => s.category))]
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Format a key for display -- delegates to extracted helper with platform flag. */
  function formatKey(key: string): string {
    return formatKeyHelper(key, isMac);
  }

  /** Get the display label for a category -- delegates to extracted helper. */
  function getCategoryLabel(catId: string): string {
    return getCategoryLabelHelper(catId, ALL_CATEGORIES);
  }

  /** Generate print-friendly HTML for all displayed shortcuts */
  function generatePrintHTML(): string {
    const platformName = isMac ? 'macOS' : 'Windows/Linux';
    const keyHint = isMac ? '\u2318?' : 'Ctrl+?';
    const now = new Date().toLocaleDateString();

    let categoriesHtml = '';
    for (const category of sortedCategories) {
      const items = groupedShortcuts.get(category);
      if (!items?.length) continue;
      let shortcutsHtml = '';
      for (const s of items) {
        shortcutsHtml += `<div class="shortcut">
          <span class="description">${escapeHtml(s.label)}</span>
          <span class="keys">${escapeHtml(s.keys.map(formatKey).join(' '))}</span>
        </div>`;
      }
      categoriesHtml += `<h2>${escapeHtml(getCategoryLabel(category))}</h2><div class="shortcuts-grid">${shortcutsHtml}</div>`;
    }

    return `<!DOCTYPE html>
<html><head>
  <title>Field Studio - Keyboard Shortcuts</title>
  <meta charset="utf-8">
  <style>
    @media print { @page { margin: 15mm; } }
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 28px; margin: 0 0 5px; }
    .subtitle { color: #64748b; font-size: 14px; }
    .platform { display: inline-block; background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-size: 12px; color: #475569; margin-top: 10px; }
    h2 { font-size: 16px; margin: 25px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .shortcuts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; }
    .shortcut { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .keys { font-family: monospace; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 13px; white-space: nowrap; }
    .description { color: #475569; font-size: 14px; flex: 1; margin-right: 15px; }
    .tip { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 12px 15px; margin: 20px 0; border-radius: 0 6px 6px 0; font-size: 13px; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; text-align: center; }
  </style>
</head><body>
  <header>
    <h1>Field Studio Keyboard Shortcuts</h1>
    <p class="subtitle">Generated on ${escapeHtml(now)}</p>
    <span class="platform">${platformName} shortcuts shown</span>
  </header>
  <div class="tip"><strong>Tip:</strong> Press <strong>${keyHint}</strong> anytime to open this overlay.</div>
  ${categoriesHtml}
  <div class="footer">IIIF Field Archive Studio - Press ${keyHint} anytime to view shortcuts</div>
</body></html>`;
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handlePrint(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML());
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  }

  function handleContextChange(ctx: ShortcutContext | 'all'): void {
    selectedContext = ctx;
    selectedCategory = null; // Reset category when context changes
  }

  function handleCategoryToggle(cat: ShortcutCategory): void {
    selectedCategory = selectedCategory === cat ? null : cat;
  }

  function handleSearchChange(value: string): void {
    searchQuery = value;
  }

  function handleClearAll(): void {
    searchQuery = '';
    selectedCategory = null;
    selectedContext = 'all';
    searchInputRef?.focus();
  }

  function handleKeydown(e: KeyboardEvent): void {
    // Escape with search active: clear search
    if (e.key === 'Escape' && searchQuery) {
      e.stopPropagation();
      searchQuery = '';
      searchInputRef?.focus();
      return;
    }
    // Escape without search: close overlay
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    // Number keys 1-6 toggle category filter when search is empty
    if (!searchQuery && e.key >= '1' && e.key <= '6') {
      const idx = parseInt(e.key) - 1;
      const cats = sortedCategories;
      if (cats[idx]) {
        selectedCategory = selectedCategory === cats[idx] as ShortcutCategory ? null : cats[idx] as ShortcutCategory;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Auto-focus search input when overlay opens
  $effect(() => {
    if (isOpen && searchInputRef) {
      const timer = setTimeout(() => searchInputRef?.focus(), 100);
      return () => clearTimeout(timer);
    }
  });

  // Reset state when overlay opens
  $effect(() => {
    if (isOpen) {
      searchQuery = '';
      selectedContext = 'all';
      selectedCategory = null;
    }
  });
</script>

<!-- ======================================================================= -->
<!-- TEMPLATE                                                                -->
<!-- ======================================================================= -->

<ModalDialog
  open={isOpen}
  onClose={onClose}
  title="Keyboard Shortcuts"
  size="lg"
>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class={cn('flex flex-col h-[70vh] max-h-[600px]')}
    onkeydown={handleKeydown}
    role="dialog"
    aria-label="Keyboard shortcuts"
    tabindex="0"
  >

    <!-- ================================================================= -->
    <!-- Header: Search + Print + Close                                    -->
    <!-- ================================================================= -->
    <div class="flex items-center gap-3 p-4 border-b border-theme-border">
      <div class="relative flex-1">
        <Icon name="search" size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
        <input
          bind:this={searchInputRef}
          type="text"
          value={searchQuery}
          oninput={(e) => handleSearchChange(e.currentTarget.value)}
          placeholder="Search shortcuts..."
          class={cn(
            'w-full pl-10 pr-10 py-2 text-sm rounded',
            'bg-theme-surface-raised border border-theme-border',
            'text-theme-text placeholder:text-theme-text-muted',
            'outline-none focus:ring-2 focus:ring-theme-primary/40'
          )}
          aria-label="Search keyboard shortcuts"
        />
        {#if searchQuery}
          <button
            class="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-theme-text-muted hover:text-theme-text"
            onclick={() => { searchQuery = ''; searchInputRef?.focus(); }}
            aria-label="Clear search"
          >
            <Icon name="x" size={14} />
          </button>
        {/if}
      </div>
      <Button variant="ghost" size="sm" onclick={handlePrint} title="Print cheat sheet">
        <Icon name="printer" size={16} />
        <span class="hidden sm:inline ml-1 text-xs">Print</span>
      </Button>
    </div>

    <!-- ================================================================= -->
    <!-- Context filter (select dropdown)                                  -->
    <!-- ================================================================= -->
    <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-theme-border">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium uppercase tracking-wider text-theme-text-muted">Context:</span>
        <select
          value={selectedContext}
          onchange={(e) => handleContextChange(e.currentTarget.value as ShortcutContext | 'all')}
          class={cn(
            'px-3 py-1.5 text-sm rounded',
            'bg-theme-surface-raised border border-theme-border text-theme-text',
            'outline-none focus:ring-2 focus:ring-theme-primary/40'
          )}
          aria-label="Filter by context"
        >
          <option value="all">All Contexts ({contextCounts.all})</option>
          {#each ALL_CONTEXTS as ctx}
            <option value={ctx.id}>{ctx.label} ({contextCounts[ctx.id] ?? 0})</option>
          {/each}
        </select>
      </div>

      <!-- Category filter chips -->
      <div class="hidden sm:block w-px h-6 bg-theme-border"></div>
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-xs font-medium uppercase tracking-wider text-theme-text-muted hidden sm:inline">Category:</span>
        {#each ALL_CATEGORIES as cat}
          {#if availableCategories.includes(cat.id)}
            <button
              class={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                selectedCategory === cat.id
                  ? 'bg-theme-primary text-white'
                  : 'bg-theme-surface-raised text-theme-text-muted hover:bg-theme-surface-hover'
              )}
              onclick={() => handleCategoryToggle(cat.id)}
            >
              {cat.label}
            </button>
          {/if}
        {/each}
        {#if selectedCategory}
          <button
            class="px-2 py-0.5 text-xs text-theme-text-muted hover:text-theme-text"
            onclick={() => { selectedCategory = null; }}
            aria-label="Clear category filter"
          >
            Clear
          </button>
        {/if}
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- Shortcut list (scrollable)                                        -->
    <!-- ================================================================= -->
    <div class="flex-1 overflow-y-auto p-4">
      {#if filteredShortcuts.length === 0}
        <div class="text-center py-16">
          <Icon name="search-x" size={48} class="mx-auto mb-4 text-theme-text-muted opacity-30" />
          <p class="text-theme-text-muted mb-2">No shortcuts found</p>
          <p class="text-sm text-theme-text-muted opacity-60">Try adjusting your search or filters</p>
          <button
            class="mt-4 px-4 py-2 text-sm text-theme-primary hover:underline"
            onclick={handleClearAll}
          >
            Clear all filters
          </button>
        </div>
      {:else}
        <div class="space-y-6">
          {#each sortedCategories as category (category)}
            {@const items = groupedShortcuts.get(category)}
            {#if items && items.length > 0}
              <section class="p-4 bg-theme-surface-raised rounded-lg" aria-labelledby="category-{category}">
                <!-- Category heading -->
                <div class="flex items-center gap-3 mb-3">
                  <h3
                    id="category-{category}"
                    class="font-bold text-base text-theme-text"
                  >
                    {getCategoryLabel(category)}
                  </h3>
                  <span class="text-xs text-theme-text-muted bg-theme-surface px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>

                <!-- Shortcut items in a grid -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {#each items as shortcut (shortcut.id)}
                    <div
                      class={cn(
                        'flex items-center justify-between p-3 rounded',
                        'bg-theme-surface border border-theme-border/50',
                        'hover:border-theme-primary/30 hover:shadow-sm transition-all'
                      )}
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        {#if shortcut.icon}
                          <Icon name={shortcut.icon} size={16} class="text-theme-text-muted shrink-0" />
                        {/if}
                        <span class="text-sm text-theme-text truncate">{shortcut.label}</span>
                      </div>

                      <div class="flex items-center gap-2 ml-3 shrink-0">
                        <!-- Context badge (non-global) -->
                        {#if shortcut.context !== 'global'}
                          <span class="text-[10px] text-theme-text-muted bg-theme-surface-raised px-1.5 py-0.5 rounded">
                            {ALL_CONTEXTS.find((c) => c.id === shortcut.context)?.label ?? shortcut.context}
                          </span>
                        {/if}

                        <!-- Key badges -->
                        {#each shortcut.keys as key}
                          <kbd
                            class={cn(
                              'inline-flex items-center justify-center',
                              'min-w-[24px] h-6 px-1.5',
                              'text-xs font-mono font-medium',
                              'bg-theme-surface-raised border border-theme-border rounded',
                              'shadow-sm whitespace-nowrap'
                            )}
                          >
                            {formatKey(key)}
                          </kbd>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </section>
            {/if}
          {/each}
        </div>
      {/if}
    </div>

    <!-- ================================================================= -->
    <!-- Footer: keyboard hints + stats                                    -->
    <!-- ================================================================= -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-theme-border text-xs text-theme-text-muted">
      <div class="flex items-center gap-4 flex-wrap">
        <span class="flex items-center gap-1.5">
          <kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-theme-surface-raised border border-theme-border rounded">?</kbd>
          <span>toggle overlay</span>
        </span>
        <span class="flex items-center gap-1.5">
          <kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-theme-surface-raised border border-theme-border rounded">Esc</kbd>
          <span>close</span>
        </span>
        <span class="flex items-center gap-1.5">
          <kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-theme-surface-raised border border-theme-border rounded">1-6</kbd>
          <span>filter category</span>
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span>{filteredShortcuts.length} shortcut{filteredShortcuts.length !== 1 ? 's' : ''}</span>
        <span class="opacity-40">-</span>
        <span>{isMac ? 'macOS' : 'Windows/Linux'} shortcuts</span>
      </div>
    </div>
  </div>
</ModalDialog>
