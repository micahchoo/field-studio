<!--
  BoardHeader.svelte — Board Design Toolbar
  ===========================================
  Molecule-level component wrapping ViewHeader with tool selection,
  background mode, alignment, snap, layout, undo/redo, export dropdowns.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import ViewHeader from '@/src/shared/ui/molecules/ViewHeader/ViewHeader.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Divider from '@/src/shared/ui/atoms/Divider.svelte';
  import Row from '@/src/shared/ui/layout/primitives/Row.svelte';
  import { cn } from '@/src/shared/lib/cn';

  type Tool = 'select' | 'connect' | 'note' | 'text';
  type BgMode = 'grid' | 'dark' | 'light';
  type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';
  type Arrangement = 'grid' | 'strip' | 'book' | 'circle' | 'timeline';

  interface Props {
    cx: ContextualClassNames;
    fieldMode?: boolean;
    title?: string;
    activeTool: Tool;
    onToolChange: (tool: Tool) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onSave: () => void;
    isDirty: boolean;
    onExport: () => void;
    onExportPNG: () => void;
    onExportSVG: () => void;
    onCopyContentState: () => void;
    onPresent: () => void;
    onDelete: () => void;
    hasSelection: boolean;
    itemCount: number;
    connectionCount: number;
    selectionCount: number;
    bgMode: BgMode;
    onBgModeChange: (mode: BgMode) => void;
    onAlign: (type: AlignType) => void;
    snapEnabled: boolean;
    onSnapToggle: () => void;
    onAutoArrange: (arrangement: Arrangement) => void;
    onToggleInspector?: () => void;
  }

  let {
    cx,
    fieldMode = false,
    title = 'Board Design',
    activeTool,
    onToolChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onSave,
    isDirty,
    onExport,
    onExportPNG,
    onExportSVG,
    onCopyContentState,
    onPresent,
    onDelete,
    hasSelection,
    itemCount,
    connectionCount,
    selectionCount,
    bgMode,
    onBgModeChange,
    onAlign,
    snapEnabled,
    onSnapToggle,
    onAutoArrange,
    onToggleInspector,
  }: Props = $props();

  // Capture title prop before the `{#snippet title()}` in the template shadows the binding.
  const titleText = $derived(title);

  // ── Local State: dropdown toggles ──
  let showLayoutMenu = $state(false);
  let showExportMenu = $state(false);

  // ── Tool definitions ──
  const tools: Array<{ tool: Tool; label: string; key: string; iconPath: string }> = [
    {
      tool: 'select',
      label: 'Select',
      key: 'V',
      iconPath: 'M5 9l4-4 4 4M5 15l4 4 4-4',
    },
    {
      tool: 'connect',
      label: 'Connect',
      key: 'C',
      iconPath: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    },
    {
      tool: 'text',
      label: 'Text',
      key: 'T',
      iconPath: 'M4 7V4h16v3M9 20h6M12 4v16',
    },
    {
      tool: 'note',
      label: 'Note',
      key: 'N',
      iconPath: 'M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z M14 3v6h6',
    },
  ];

  const bgModes: Array<{ mode: BgMode; label: string; iconPath: string }> = [
    {
      mode: 'grid',
      label: 'Grid',
      iconPath: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    },
    {
      mode: 'dark',
      label: 'Dark',
      iconPath: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
    },
    {
      mode: 'light',
      label: 'Light',
      iconPath: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
    },
  ];

  const alignTypes: AlignType[] = ['left', 'center-h', 'right', 'top', 'center-v', 'bottom'];

  const arrangements: Arrangement[] = ['grid', 'strip', 'book', 'circle', 'timeline'];

  // ── Close dropdowns on outside click ──
  function handleWindowClick() {
    showLayoutMenu = false;
    showExportMenu = false;
  }

  // Determine active styling for tool/bg buttons
  function toolBtnStyle(active: boolean): string {
    if (active) {
      return cn(
        'w-8 h-8 flex items-center justify-center rounded-sm',
        cx.active || 'bg-nb-black text-white',
      );
    }
    return cn(
      'w-8 h-8 flex items-center justify-center rounded-sm',
      cx.inactive || 'hover:bg-black/5',
    );
  }
</script>

<svelte:window onclick={handleWindowClick} />

<ViewHeader {cx} height="default">
  {#snippet title()}
    <span class={cn('font-mono uppercase text-sm font-semibold tracking-wider', cx.text)}>
      {titleText}
    </span>
    <span class={cn('text-xs ml-2', cx.textMuted)}>
      {itemCount} items · {connectionCount} connections
    </span>
  {/snippet}

  {#snippet actions()}
    <Row gap="xs" align="center">
      {#if onToggleInspector}
        <Button variant="ghost" size="bare" onclick={onToggleInspector} title="Toggle inspector" aria-label="Toggle inspector">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
            <rect x="3" y="3" width="18" height="18" rx="0" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </Button>
      {/if}
    </Row>
  {/snippet}

  {#snippet subbar()}
    <Row gap="sm" align="center" class="flex-wrap w-full">
      <!-- Tool selection (radiogroup) -->
      <div role="radiogroup" aria-label="Board tools" class="flex gap-1">
        {#each tools as { tool, label, key, iconPath } (tool)}
          <button
            class={toolBtnStyle(activeTool === tool)}
            role="radio"
            aria-checked={activeTool === tool}
            title="{label} ({key})" aria-label="{label} ({key})"
            onclick={(e: MouseEvent) => { e.stopPropagation(); onToolChange(tool); }}
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
              <path d={iconPath} />
            </svg>
          </button>
        {/each}
      </div>

      <Divider direction="vertical" />

      <!-- Background mode (radiogroup) -->
      <div role="radiogroup" aria-label="Background mode" class="flex gap-1">
        {#each bgModes as { mode, label, iconPath } (mode)}
          <button
            class={toolBtnStyle(bgMode === mode)}
            role="radio"
            aria-checked={bgMode === mode}
            title="{label} background" aria-label="{label} background"
            onclick={(e: MouseEvent) => { e.stopPropagation(); onBgModeChange(mode); }}
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d={iconPath} />
            </svg>
          </button>
        {/each}
      </div>

      <!-- Alignment buttons (shown when items selected) -->
      {#if hasSelection && selectionCount > 1}
        <Divider direction="vertical" />
        <div class="flex gap-1" role="group" aria-label="Alignment">
          {#each alignTypes as type (type)}
            <button
              class={cn('w-7 h-7 flex items-center justify-center rounded-sm', cx.inactive || 'hover:bg-black/5')}
              onclick={(e: MouseEvent) => { e.stopPropagation(); onAlign(type); }}
              title="Align {type}"
              aria-label="Align {type}"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square">
                {#if type === 'left'}
                  <line x1="4" y1="3" x2="4" y2="21" />
                  <rect x="8" y="5" width="12" height="4" />
                  <rect x="8" y="13" width="8" height="4" />
                {:else if type === 'center-h'}
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <rect x="5" y="5" width="14" height="4" />
                  <rect x="7" y="13" width="10" height="4" />
                {:else if type === 'right'}
                  <line x1="20" y1="3" x2="20" y2="21" />
                  <rect x="4" y="5" width="12" height="4" />
                  <rect x="8" y="13" width="8" height="4" />
                {:else if type === 'top'}
                  <line x1="3" y1="4" x2="21" y2="4" />
                  <rect x="5" y="8" width="4" height="12" />
                  <rect x="13" y="8" width="4" height="8" />
                {:else if type === 'center-v'}
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <rect x="5" y="5" width="4" height="14" />
                  <rect x="13" y="7" width="4" height="10" />
                {:else if type === 'bottom'}
                  <line x1="3" y1="20" x2="21" y2="20" />
                  <rect x="5" y="4" width="4" height="12" />
                  <rect x="13" y="8" width="4" height="8" />
                {/if}
              </svg>
            </button>
          {/each}
        </div>
      {/if}

      <Divider direction="vertical" />

      <!-- Snap to grid toggle -->
      <button
        class={toolBtnStyle(snapEnabled)}
        onclick={(e: MouseEvent) => { e.stopPropagation(); onSnapToggle(); }}
        title="Snap to grid ({snapEnabled ? 'on' : 'off'})" aria-label="Snap to grid"
        aria-pressed={snapEnabled}
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
          <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
          <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
          <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
          <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
          <path d="M8.65 22c.21-.66.45-1.32.57-2" />
          <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
          <path d="M2 16h.01" />
          <path d="M21.8 16c.2-2 .131-5.354 0-6" />
          <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
        </svg>
      </button>

      <!-- Layout arrangement dropdown -->
      <div class="relative">
        <Button
          variant="ghost"
          size="sm"
          onclick={(e: MouseEvent) => { e.stopPropagation(); showLayoutMenu = !showLayoutMenu; showExportMenu = false; }}
        >
          Layout
        </Button>
        {#if showLayoutMenu}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class={cn('absolute top-full left-0 mt-1 rounded shadow-lg z-50 min-w-[120px] py-1 border-2', cx.surface || 'bg-white', cx.border || 'border-nb-black')}
            onclick={(e: MouseEvent) => e.stopPropagation()}
          >
            {#each arrangements as arrangement (arrangement)}
              <button
                class={cn('block w-full px-3 py-1.5 text-sm text-left capitalize hover:bg-black/5', cx.text)}
                onclick={() => { onAutoArrange(arrangement); showLayoutMenu = false; }}
              >
                {arrangement}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Right-side actions -->
      <Row gap="xs" align="center">
        <!-- Undo / Redo -->
        <Button variant="ghost" size="bare" onclick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </Button>
        <Button variant="ghost" size="bare" onclick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" aria-label="Redo">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </Button>

        <!-- Delete selected -->
        {#if hasSelection}
          <Divider direction="vertical" />
          <Button variant="ghost" size="bare" onclick={onDelete} title="Delete selected ({selectionCount})" aria-label="Delete selected items">
            <svg class="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </Button>
        {/if}

        <Divider direction="vertical" />

        <!-- Save / Saved indicator -->
        {#if isDirty}
          <Button variant="primary" size="sm" onclick={onSave}>Save</Button>
        {:else}
          <span class={cn('text-xs px-2 font-mono uppercase tracking-wider', cx.textMuted)}>Saved</span>
        {/if}

        <!-- Present -->
        <Button variant="ghost" size="bare" onclick={onPresent} title="Present" aria-label="Start presentation">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </Button>

        <!-- Export dropdown -->
        <div class="relative">
          <Button
            variant="ghost"
            size="sm"
            onclick={(e: MouseEvent) => { e.stopPropagation(); showExportMenu = !showExportMenu; showLayoutMenu = false; }}
          >
            Export
          </Button>
          {#if showExportMenu}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class={cn('absolute top-full right-0 mt-1 rounded shadow-lg z-50 min-w-[160px] py-1 border-2', cx.surface || 'bg-white', cx.border || 'border-nb-black')}
              onclick={(e: MouseEvent) => e.stopPropagation()}
            >
              <button
                class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
                onclick={() => { onExport(); showExportMenu = false; }}
              >
                IIIF Manifest
              </button>
              <button
                class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
                onclick={() => { onExportPNG(); showExportMenu = false; }}
              >
                PNG Image
              </button>
              <button
                class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
                onclick={() => { onExportSVG(); showExportMenu = false; }}
              >
                SVG Vector
              </button>
              <div class={cn('my-1 mx-2 h-px', cx.divider || 'bg-black/10')}></div>
              <button
                class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
                onclick={() => { onCopyContentState(); showExportMenu = false; }}
              >
                Copy Content State
              </button>
            </div>
          {/if}
        </div>
      </Row>
    </Row>
  {/snippet}
</ViewHeader>
