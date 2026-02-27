<!--
  StatusBar - Horizontal bar at bottom of the application.
  Sections (left to right):
    Left:  items count | selection badge | undo/redo + label
    Right: network status | save status | activity feed | validation errors/warnings |
           storage (% bar + tooltip) | help/keyboard shortcuts

  React source: 269 lines -> ~290 lines Svelte
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { Button } from '@/src/shared/ui/atoms';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import type { IIIFItem } from '@/src/shared/types';
  // STUB: These will be real imports in final implementation
  // import type { ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
  // import type { DetailedStorageEstimate } from '@/src/shared/services/storage';

  import type { TreeValidationIssue } from '@/src/shared/types';
  import {
    formatBytes,
    getStorageBarColor,
    countBySeverity,
  } from '../../lib/statusBarHelpers';

  // --- Stub types (replace with real imports) ---
  interface DetailedStorageEstimate {
    usage: number;
    quota: number;
    persistent: boolean;
    stores: Record<string, { keys: number }>;
  }

  // --- Props ---
  interface Props {
    totalItems: number;
    selectedItem: IIIFItem | null;
    validationIssues: TreeValidationIssue[];
    storageUsage: { usage: number; quota: number } | null;
    onOpenQC: () => void;
    saveStatus: 'saved' | 'saving' | 'error';
    selectionCount?: number;
    showSelectionCount?: boolean;
    onClearSelection?: () => void;
    quickHelpOpen?: boolean;
    onToggleQuickHelp?: () => void;
    onOpenKeyboardShortcuts?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    lastActionLabel?: string | null;
    isOnline?: boolean;
    activityCount?: number;
    onOpenActivityFeed?: () => void;
    storageDetail?: DetailedStorageEstimate | null;
    fieldMode?: boolean;
  }

  let {
    totalItems,
    selectedItem,
    validationIssues,
    storageUsage,
    onOpenQC,
    saveStatus,
    selectionCount,
    showSelectionCount = true,
    onClearSelection,
    quickHelpOpen,
    onToggleQuickHelp,
    onOpenKeyboardShortcuts,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    lastActionLabel,
    isOnline,
    activityCount,
    onOpenActivityFeed,
    storageDetail,
    fieldMode,
  }: Props = $props();

  // --- Local State ---
  let showStorageTooltip: boolean = $state(false);

  // --- Derived (using extracted helpers) ---
  let severityCounts = $derived(countBySeverity(validationIssues));
  let errorCount = $derived(severityCounts.errorCount);
  let warningCount = $derived(severityCounts.warningCount);

  let usagePercent = $derived(
    storageUsage && storageUsage.quota > 0
      ? Math.min(100, (storageUsage.usage / storageUsage.quota) * 100)
      : 0
  );

  let effectiveSelectionCount = $derived(selectionCount ?? 0);
  let hasMultiSelection = $derived(effectiveSelectionCount > 0);

  let storageBarColor = $derived(getStorageBarColor(usagePercent));
</script>

<!-- Storage tooltip snippet (rendered conditionally) -->
{#snippet storageTooltip()}
  {#if showStorageTooltip && storageDetail}
    <div class="absolute bottom-full right-0 mb-2 bg-nb-cream border-2 border-nb-black shadow-brutal-sm p-3 min-w-[220px] z-[100] normal-case">
      <div class="text-[10px] font-bold mb-2 uppercase">Storage Breakdown</div>
      <div class="flex flex-col gap-1 text-[10px]">
        <div class="flex justify-between">
          <span>Used:</span>
          <span class="font-bold">{formatBytes(storageDetail.usage)}</span>
        </div>
        <div class="flex justify-between">
          <span>Quota:</span>
          <span class="font-bold">{formatBytes(storageDetail.quota)}</span>
        </div>
        <div class="flex justify-between">
          <span>Persistent:</span>
          <span class={cn('font-bold', storageDetail.persistent ? 'text-nb-green' : 'text-nb-orange')}>
            {storageDetail.persistent ? 'YES' : 'NO'}
          </span>
        </div>
        {#if Object.entries(storageDetail.stores).length > 0}
          <div class="border-t border-nb-black/20 my-1"></div>
          <div class="text-[9px] font-bold uppercase mb-0.5">Stores</div>
          {#each Object.entries(storageDetail.stores) as [name, info] (name)}
            <div class="flex justify-between text-[9px]">
              <span class="truncate mr-2">{name}:</span>
              <span>{info.keys} keys</span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
{/snippet}

<!-- Main status bar -->
<div class="h-status-bar bg-nb-cream border-t-4 border-nb-black flex items-center justify-between px-4 font-mono text-nb-xs font-bold uppercase tracking-wider text-nb-black select-none z-50">

  <!-- LEFT SECTION -->
  <div class="flex items-center gap-4">

    <!-- Items count -->
    <div class="flex items-center gap-1.5" title="{totalItems} items in archive">
      <span>ITEMS:</span>
      <span class="text-nb-blue">{totalItems}</span>
    </div>

    <!-- Selection badge -->
    {#if showSelectionCount && hasMultiSelection}
      <div class="flex items-center gap-1.5 pl-3 border-l-2 border-nb-black">
        <span>SELECTED:</span>
        <span class="text-nb-blue">{effectiveSelectionCount}</span>
        {#if onClearSelection}
          <Button variant="ghost" size="bare"
            onclick={onClearSelection}
            class="ml-1 text-nb-red hover:bg-nb-red hover:text-nb-white p-0.5 transition-nb"
            title="Clear selection"
          >
            <Icon name="close" class="text-[12px]" />
          </Button>
        {/if}
      </div>
    {/if}

    <!-- Undo / Redo -->
    {#if onUndo || onRedo}
      <div class="flex items-center gap-1 pl-3 border-l-2 border-nb-black">
        {#if onUndo}
          <Button variant="ghost" size="bare"
            onclick={onUndo}
            disabled={!canUndo}
            class={cn(
              'p-0.5 transition-nb',
              canUndo ? 'hover:bg-nb-black hover:text-nb-white' : 'opacity-30 cursor-not-allowed'
            )}
            title="Undo (Ctrl+Z)"
          >
            <Icon name="undo" class="text-[14px]" />
          </Button>
        {/if}
        {#if onRedo}
          <Button variant="ghost" size="bare"
            onclick={onRedo}
            disabled={!canRedo}
            class={cn(
              'p-0.5 transition-nb',
              canRedo ? 'hover:bg-nb-black hover:text-nb-white' : 'opacity-30 cursor-not-allowed'
            )}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Icon name="redo" class="text-[14px]" />
          </Button>
        {/if}
        {#if lastActionLabel}
          <span
            class="text-nb-micro text-nb-black/50 ml-1 max-w-[120px] truncate normal-case"
            title={lastActionLabel}
          >
            {lastActionLabel}
          </span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- RIGHT SECTION -->
  <div class="flex items-center gap-4">

    <!-- Network status -->
    {#if isOnline !== undefined}
      <div
        class="flex items-center gap-1.5 px-3 border-r-2 border-nb-black"
        title={isOnline ? 'Online' : 'Offline -- changes are saved locally'}
      >
        <div
          class={cn('w-2 h-2 rounded-full', isOnline ? 'bg-nb-green' : 'bg-nb-red')}
          style:animation={!isOnline ? 'savePulse 1s ease-in-out infinite' : undefined}
        ></div>
        <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
      </div>
    {/if}

    <!-- Save status -->
    <div
      class="flex items-center gap-1.5 px-3 border-r-2 border-nb-black"
      title={saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save Failed' : 'Saved'}
    >
      {#if saveStatus === 'saving'}
        <div class="w-2 h-2 bg-nb-blue" style:animation="savePulse 0.5s linear infinite"></div>
        <span>SAVING</span>
      {:else if saveStatus === 'saved'}
        <div class="w-2 h-2 bg-nb-green"></div>
        <span>SAVED</span>
      {:else if saveStatus === 'error'}
        <div class="w-2 h-2 bg-nb-red"></div>
        <span>ERROR</span>
      {/if}
    </div>

    <!-- Activity feed badge -->
    {#if onOpenActivityFeed}
      <Button variant="ghost" size="bare"
        onclick={onOpenActivityFeed}
        class="flex items-center gap-1 hover:bg-nb-black hover:text-nb-white px-1 py-0.5 transition-nb relative"
        title="Activity feed"
        aria-label="Activity feed"
      >
        <Icon name="notifications" class="text-[14px]" />
        {#if activityCount != null && activityCount > 0}
          <span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-nb-red text-nb-white text-[8px] flex items-center justify-center font-bold">
            {activityCount > 99 ? '99+' : activityCount}
          </span>
        {/if}
      </Button>
    {/if}

    <!-- Validation errors/warnings -->
    {#if (errorCount + warningCount) > 0}
      <button
        aria-label="Open QC Dashboard"
        type="button"
        class={cn(
          'flex items-center gap-1 cursor-pointer transition-nb px-2 py-0.5 border-2',
          errorCount > 0
            ? 'border-nb-red text-nb-red bg-nb-red/10'
            : 'border-nb-orange text-nb-orange bg-nb-orange/10'
        )}
        title="Open QC Dashboard"
        onclick={onOpenQC}
      >
        <span>ERRORS: {errorCount}</span>
      </button>
    {/if}

    <!-- Storage with hover tooltip -->
    <div
      class="pl-3 border-l-2 border-nb-black flex items-center gap-2 relative"
      role="status"
      onmouseenter={() => showStorageTooltip = true}
      onmouseleave={() => showStorageTooltip = false}
    >
      <span>STORAGE:</span>
      <div class="w-16 h-2 bg-nb-cream border-2 border-nb-black overflow-hidden">
        <div
          class={cn('h-full', storageBarColor)}
          style:width="{usagePercent}%"
        ></div>
      </div>
      {#if storageUsage}
        <span class="text-nb-micro">{formatBytes(storageUsage.usage)}</span>
        {#if usagePercent > 0}
          <span class="text-nb-micro opacity-50">({Math.round(usagePercent)}%)</span>
        {/if}
      {/if}

      <!-- Tooltip (rendered via snippet) -->
      {@render storageTooltip()}
    </div>

    <!-- Help & keyboard shortcuts -->
    <div class="pl-3 border-l-2 border-nb-black flex items-center gap-2">
      {#if onOpenKeyboardShortcuts}
        <Button variant="ghost" size="bare"
          onclick={onOpenKeyboardShortcuts}
          class="flex items-center gap-1 hover:bg-nb-black hover:text-nb-white px-1 py-0.5 transition-nb"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <Icon name="keyboard" class="text-[14px]" />
        </Button>
      {/if}
      {#if onToggleQuickHelp}
        <Button variant="ghost" size="bare"
          onclick={onToggleQuickHelp}
          class={cn(
            'flex items-center px-1 py-0.5 transition-nb',
            quickHelpOpen ? 'bg-nb-blue text-nb-white' : 'hover:bg-nb-black hover:text-nb-white'
          )}
          title="Quick Help"
          aria-label="Quick help"
        >
          <Icon name="help_outline" class="text-[14px]" />
        </Button>
      {/if}
    </div>
  </div>
</div>
