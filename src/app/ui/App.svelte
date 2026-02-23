<!--
  App.svelte — Root Application Shell
  ====================================
  React source: src/app/App.tsx (881 lines)

  ARCHITECTURE (per §6 Views & Routing):
  - Root layout component that owns global state coordination
  - Uses ScreenLayout composite for viewport structure
  - Provides scoped contexts (AnnotationContext, ResourceContext, UserIntentContext)
  - Owns dialog management, storage monitoring, and auto-save
  - $effect() calls are valid here (component scope, not module singleton)

  LAYOUT STRUCTURE:
  ScreenLayout (h-dvh)
   ├── SkipLinks (a11y)
   ├── Hidden file input (folder import)
   ├── Saving indicator (fixed overlay)
   ├── Body
   │   ├── Mobile header (conditional)
   │   ├── Sidebar (NavigationSidebar)
   │   ├── main#main-content (ViewRouter + ContextualHelp)
   │   └── Inspector (non-archive/boards modes)
   ├── StatusBar (desktop only)
   └── Dialog overlays (conditionally rendered)

  STATE: All local state uses Svelte 5 $state runes.
  EFFECTS: Auto-save, URL sync, storage monitoring, touch detection, activity polling.
  CONTEXTS: AnnotationContext, ResourceContext, UserIntentContext set via setContext.
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import ScreenLayout from '@/src/shared/ui/layout/composites/ScreenLayout.svelte';
  import SkipLinks from '@/src/shared/ui/atoms/SkipLinks.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Toast from '@/src/shared/ui/molecules/Toast.svelte';
  import ViewRouter from './ViewRouter.svelte';
  import { cn } from '@/src/shared/lib/cn';
  // applyThemeVars available for use:action when needed
  // import { applyThemeVars } from '@/src/shared/stores/theme.svelte';

  // ── Stores ──
  import { vault } from '@/src/shared/stores/vault.svelte';
  import { appMode } from '@/src/shared/stores/appMode.svelte';
  import type { AppMode } from '@/src/shared/stores/appMode.svelte';
  import { appSettings } from '@/src/shared/stores/appSettings.svelte';
  import { theme } from '@/src/shared/stores/theme.svelte';
  import { toast } from '@/src/shared/stores/toast.svelte';
  import { dialogs } from '@/src/shared/stores/dialogs.svelte';
  import { terminology } from '@/src/shared/stores/terminology.svelte';
  import { activityLog } from '@/src/shared/stores/activityLog.svelte';
  // import { auth } from '@/src/shared/stores/auth.svelte'; // used when AuthDialog is migrated
  import { autoSave } from '@/src/app/stores/autoSave.svelte';
  import { validation } from '@/src/app/stores/validation.svelte';
  import { responsive } from '@/src/shared/actions/responsive.svelte';
  import { networkStatus } from '@/src/shared/actions/networkStatus.svelte';
  // import { selection } from '@/src/shared/stores/selection.svelte'; // used when batch selection is wired

  // ── Contexts ──
  import {
    setAnnotationContext,
    setResourceContext,
    setUserIntentContext,
  } from '@/src/shared/stores/contexts';
  import type {
    AnnotationMotivation,
    AnnotationDrawingState,
    TimeRange,
    UserIntent,
  } from '@/src/shared/stores/contexts';
  // import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles'; // used when cx is passed to child widgets

  // ── Types ──
  import type { IIIFItem, AbstractionLevel } from '@/src/shared/types';
  // import type { ValidationIssue } from '@/src/app/stores/validation.svelte'; // used indirectly via validation store

  // ── Services (imperative, not stores) ──
  // @migration: These services are framework-agnostic, imported directly
  // import { storage } from '@/src/shared/services/storage';
  // import { contentStateService } from '@/src/shared/services/contentState';
  // import { buildTree, ingestTree } from '@/src/entities/manifest/model/builders/iiifBuilder';

  // ============================================================================
  // Action Labels — StatusBar last-action indicator
  // ============================================================================

  const ACTION_LABELS: Record<string, string> = {
    UPDATE_LABEL: 'Update label',
    UPDATE_SUMMARY: 'Update summary',
    UPDATE_METADATA: 'Update metadata',
    UPDATE_RIGHTS: 'Update rights',
    UPDATE_NAV_DATE: 'Update date',
    UPDATE_BEHAVIOR: 'Update behavior',
    UPDATE_VIEWING_DIRECTION: 'Update direction',
    ADD_CANVAS: 'Add canvas',
    REMOVE_CANVAS: 'Remove canvas',
    REORDER_CANVASES: 'Reorder canvases',
    ADD_ANNOTATION: 'Add annotation',
    REMOVE_ANNOTATION: 'Remove annotation',
    UPDATE_ANNOTATION: 'Update annotation',
    UPDATE_CANVAS_DIMENSIONS: 'Resize canvas',
    MOVE_ITEM: 'Move item',
    BATCH_UPDATE: 'Batch update',
    RELOAD_TREE: 'Reload tree',
    MOVE_TO_TRASH: 'Move to trash',
    RESTORE_FROM_TRASH: 'Restore',
    EMPTY_TRASH: 'Empty trash',
    ADD_RANGE: 'Add range',
    REMOVE_RANGE: 'Remove range',
    CREATE_BOARD: 'Create board',
    UPDATE_BOARD_ITEM_POSITION: 'Move board item',
    REMOVE_BOARD_ITEM: 'Remove board item',
  };

  // ============================================================================
  // Skip link data
  // ============================================================================

  const skipLinks = [
    { targetId: 'main-content', label: 'Skip to main content' },
    { targetId: 'sidebar', label: 'Skip to sidebar' },
    { targetId: 'command-palette-trigger', label: 'Command Palette', shortcut: '\u2318K' },
  ];

  // ============================================================================
  // Local State
  // ============================================================================

  // ── Panel visibility ──
  let showSidebar = $state(!responsive.isMobile);
  let showInspector = $state(false);

  // ── Navigation / selection ──
  let selectedId = $state<string | null>(null);
  let viewType = $state<'iiif' | 'file'>('iiif');

  // ── Batch operations ──
  let batchIds = $state<string[]>([]);

  // ── Staging / import ──
  let stagingTree = $state<unknown | null>(null);

  // ── Pipeline context ──
  let pipelineContext = $state<{
    filterIds?: string[] | null;
    focusCoordinate?: { lat: number; lng: number } | null;
    preloadedManifest?: string | null;
  }>({});

  // ── Storage monitoring ──
  let storageUsage = $state<{ usage: number; quota: number } | null>(null);
  let storageDetail = $state<unknown | null>(null);

  // ── Activity feed ──
  let activityCount = $state(0);
  let showActivityFeed = $state(false);

  // ── Quick reference panel ──
  let showQuickRef = $state(false);

  // ── Content State drag/drop ──
  let isDragOver = $state(false);

  // ── Auth ──
  let pendingAuth = $state<{
    resourceId: string;
    authServices: unknown[];
    retryFn?: () => void;
  } | null>(null);

  // ── History (undo/redo) ──
  let lastActionType = $state<string | null>(null);
  // @migration: Wire HistoryStore instance when vault history integration is done
  let canUndo = $state(false);
  let canRedo = $state(false);

  // ── File input ref ──
  let mainFileInputEl: HTMLInputElement | undefined = $state(undefined);

  // ============================================================================
  // Derived State
  // ============================================================================

  const mode = $derived(appMode.mode);
  const fieldMode = $derived(appSettings.fieldMode);
  const isMobile = $derived(responsive.isMobile);
  const isOnline = $derived(networkStatus.isOnline);
  const cx = $derived(theme.cx);

  // Debounced root denormalization: rebuilds the tree 200ms after vault changes
  let root = $state<IIIFItem | null>(null);
  let exportTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    // Track vault state to trigger re-export
    const _state = vault.state;
    if (exportTimer) clearTimeout(exportTimer);
    exportTimer = setTimeout(() => {
      root = vault.export();
    }, 200);
    return () => {
      if (exportTimer) clearTimeout(exportTimer);
    };
  });

  // Selected item: O(1) lookup via vault normalized state
  const selectedItem = $derived.by((): IIIFItem | null => {
    if (!selectedId) return null;
    return vault.getEntity(selectedId);
  });

  // Flattened validation issues for StatusBar
  const flatValidationIssues = $derived.by(() => {
    return Object.values(validation.issues).flat();
  });

  const validationIssuesMap = $derived(validation.issues);

  // ============================================================================
  // Annotation Context (scoped state, set via setContext)
  // ============================================================================

  let showAnnotationTool = $state(false);
  let annotationText = $state('');
  let annotationMotivation = $state<AnnotationMotivation>('commenting');
  let annotationDrawingState = $state<AnnotationDrawingState>({
    pointCount: 0,
    isDrawing: false,
    canSave: false,
  });
  let forceAnnotationsTab = $state(false);
  let timeRange = $state<TimeRange | null>(null);
  let currentPlaybackTime = $state(0);

  // Throttled playback time — avoid re-renders during media playback
  let lastPlaybackUpdateAt = 0;

  setAnnotationContext({
    get showAnnotationTool() { return showAnnotationTool; },
    get annotationText() { return annotationText; },
    get annotationMotivation() { return annotationMotivation; },
    get annotationDrawingState() { return annotationDrawingState; },
    get forceAnnotationsTab() { return forceAnnotationsTab; },
    get timeRange() { return timeRange; },
    get currentPlaybackTime() { return currentPlaybackTime; },
    setAnnotationText: (text: string) => { annotationText = text; },
    setAnnotationMotivation: (m: AnnotationMotivation) => { annotationMotivation = m; },
    setAnnotationDrawingState: (s: AnnotationDrawingState) => { annotationDrawingState = s; },
    setTimeRange: (r: TimeRange | null) => { timeRange = r; },
    handleAnnotationToolToggle: (active: boolean) => {
      showAnnotationTool = active;
      if (active) forceAnnotationsTab = true;
    },
    handlePlaybackTimeChange: (time: number) => {
      const now = Date.now();
      if (now - lastPlaybackUpdateAt > 500) {
        lastPlaybackUpdateAt = now;
        currentPlaybackTime = time;
      }
    },
  });

  // ============================================================================
  // Resource Context
  // ============================================================================

  let resourceSelectedAt = $state(Date.now());

  setResourceContext({
    get resource() { return selectedItem; },
    get type() { return selectedItem?.type ?? null; },
    get selectedAt() { return resourceSelectedAt; },
    setResource: (resource: unknown | null) => {
      if (resource && typeof resource === 'object' && 'id' in resource) {
        selectedId = (resource as IIIFItem).id;
        resourceSelectedAt = Date.now();
      }
    },
    clearResource: () => {
      selectedId = null;
      resourceSelectedAt = Date.now();
    },
  });

  // ============================================================================
  // User Intent Context
  // ============================================================================

  let userIntent = $state<UserIntent>('viewing');
  let intentResourceId = $state<string | undefined>(undefined);
  let intentArea = $state<string | undefined>(undefined);

  setUserIntentContext({
    get intent() { return userIntent; },
    get resourceId() { return intentResourceId; },
    get area() { return intentArea; },
    setIntent: (intent: UserIntent, opts?: { resourceId?: string; area?: string }) => {
      userIntent = intent;
      intentResourceId = opts?.resourceId;
      intentArea = opts?.area;
    },
    clearIntent: () => {
      userIntent = 'viewing';
      intentResourceId = undefined;
      intentArea = undefined;
    },
  });

  // ============================================================================
  // Effects
  // ============================================================================

  // ── 1. URL hash sync: read on mount, write on change ──
  $effect(() => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (selectedId) params.set('id', selectedId);
    const newHash = `#${params.toString()}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  });

  // ── 2. Auto-save on dirty ──
  $effect(() => {
    if (autoSave.dirty) {
      autoSave.save(async () => {
        const r = vault.export();
        // @migration: Wire storage.saveProject(r) when service is available
        if (r) {
          // await storage.saveProject(r);
        }
      });
    }
  });

  // ── 3. Debounced validation ──
  $effect(() => {
    const _state = vault.state;
    validation.scheduleValidation(() => {
      // @migration: Wire validateTree(state) when validator is available
      // return validateTree(_state);
      return {};
    });
    return () => validation.destroy();
  });

  // ── 4. Settings persistence ──
  $effect(() => {
    const _s = appSettings.settings;
    appSettings.persist();
  });

  // ── 5. Terminology level sync ──
  $effect(() => {
    terminology.level = appSettings.abstractionLevel;
  });

  // ── 6. Close sidebar on mobile when mode changes ──
  $effect(() => {
    const _mode = mode;
    if (isMobile) {
      showSidebar = false;
    }
  });

  // ── 7. Storage monitoring (periodic quota check) ──
  $effect(() => {
    const checkStorage = async () => {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          storageUsage = { usage: est.usage ?? 0, quota: est.quota ?? 0 };
        }
      } catch {
        // Storage API unavailable
      }
    };
    checkStorage();
    const intervalId = setInterval(checkStorage, 30000);
    return () => clearInterval(intervalId);
  });

  // ── 8. Activity count polling ──
  $effect(() => {
    const poll = () => {
      activityCount = activityLog.totalCount;
    };
    poll();
    const intervalId = setInterval(poll, 10000);
    return () => clearInterval(intervalId);
  });

  // ── 9. Theme CSS variable injection ──
  // Handled by use:applyThemeVars action on root div
  $effect(() => {
    // Re-apply when theme tokens change
    const _tokens = theme.tokens;
    const el = document.documentElement;
    if (el) {
      for (const [key, value] of Object.entries(_tokens)) {
        el.style.setProperty(`--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
      }
      el.dataset.theme = String(theme.name);
    }
  });

  // ============================================================================
  // Initialization (onMount)
  // ============================================================================

  onMount(() => {
    // Start listening for resize and network events
    responsive.listen();
    networkStatus.listen();

    // Initialize activity log
    activityLog.initialize().catch(() => {});

    // Touch detection → auto-enable field mode
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (hasTouch && !appSettings.fieldMode && !localStorage.getItem('iiif-field-mode-prompted')) {
      toast.show('Touch device detected. Field Mode activated for tactile archiving.', 'info');
      appSettings.update({ theme: 'field' });
      localStorage.setItem('iiif-field-mode-prompted', 'true');
    }

    // Parse URL hash on initial load
    const hash = window.location.hash.slice(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const urlMode = params.get('mode') as AppMode | null;
      const urlId = params.get('id');
      if (urlMode && ['archive', 'collections', 'metadata', 'search', 'viewer', 'boards', 'map', 'timeline'].includes(urlMode)) {
        appMode.setMode(urlMode);
      }
      if (urlId) {
        selectedId = urlId;
      }
    }

    // Listen for popstate (browser back/forward)
    const handlePopState = () => {
      const h = window.location.hash.slice(1);
      if (!h) return;
      const params = new URLSearchParams(h);
      const m = params.get('mode') as AppMode | null;
      const id = params.get('id');
      if (m) appMode.setMode(m);
      if (id) selectedId = id;
    };
    window.addEventListener('popstate', handlePopState);

    // Storage: load project, check for Content State URL, request persistent storage
    // @migration: Wire storage.loadProject() when service is available
    // storage.loadProject().then((proj) => { if (proj) vault.load(proj); });
    // storage.requestPersistentStorage().catch(() => {});

    // Onboarding: already handled by dialogs store constructor

    // Request persistent storage
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

    return () => {
      responsive.destroy();
      networkStatus.destroy();
      activityLog.destroy();
      autoSave.destroy();
      validation.destroy();
      window.removeEventListener('popstate', handlePopState);
    };
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  function handleReveal(id: string, revealMode: AppMode) {
    selectedId = id;
    appMode.setMode(revealMode);
    if (id && !isMobile) {
      showInspector = true;
    }
    if (isMobile) {
      showSidebar = false;
      if (revealMode === 'viewer') showInspector = false;
    }
    if (revealMode !== 'metadata') {
      pipelineContext = { ...pipelineContext, filterIds: null };
    }
  }

  function handleItemUpdate(updates: Partial<IIIFItem>) {
    if (!selectedId) return;
    vault.update(selectedId, updates);
    autoSave.markDirty();
  }

  function handleUpdateRoot(newRoot: IIIFItem) {
    vault.load(newRoot);
    autoSave.markDirty();
    // @migration: Wire storage.saveProject(newRoot)
  }

  function handleBatchApply(ids: string[], updatesMap: Record<string, Partial<IIIFItem>>, renamePattern?: string) {
    for (const id of ids) {
      const changes = { ...updatesMap[id] };
      // @migration: Rename pattern support (requires getIIIFValue)
      vault.update(id, changes);
    }
    autoSave.markDirty();
  }

  function handleBatchRollback(restoredRoot: IIIFItem) {
    vault.load(restoredRoot);
    autoSave.markDirty();
    // @migration: Wire storage.saveProject(restoredRoot)
  }

  function handleSelect(id: string) {
    selectedId = id;
    if (!isMobile) showInspector = true;
    if (isMobile) showSidebar = false;
  }

  function handleSelectId(id: string) {
    selectedId = id;
  }

  function handleBatchEdit(ids: string[]) {
    batchIds = ids;
    dialogs.batchEditor.open();
  }

  function handleArchiveCatalog(ids: string[]) {
    pipelineContext = { ...pipelineContext, filterIds: ids };
    appMode.setMode('metadata');
    if (isMobile) showSidebar = false;
    toast.show(`Anticipating cataloging for ${ids.length} items`, 'info');
  }

  function handleManifestSynthesis(manifestId: string) {
    selectedId = manifestId;
    pipelineContext = { ...pipelineContext, preloadedManifest: manifestId };
    appMode.setMode('viewer');
  }

  function handleOpenImport() {
    mainFileInputEl?.click();
  }

  function handleFileInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // @migration: Wire buildTree(Array.from(input.files))
      // stagingTree = buildTree(Array.from(input.files));
      toast.show('File import not yet wired in Svelte migration', 'info');
      input.value = '';
    }
  }

  function handleAuthRequired(resourceId: string, authServices: unknown[], retryFn?: () => void) {
    pendingAuth = { resourceId, authServices, retryFn };
    dialogs.authDialog.open();
  }

  function handleAuthComplete(state: { status: string }) {
    if (state.status === 'authenticated') {
      toast.show('Authentication successful.', 'success');
      if (pendingAuth?.retryFn) pendingAuth.retryFn();
    } else if (state.status === 'degraded') {
      toast.show('Limited access granted. Some content may be unavailable.', 'info');
    }
    dialogs.authDialog.close();
    pendingAuth = null;
  }

  function handleAuthClose() {
    dialogs.authDialog.close();
    pendingAuth = null;
  }

  function handleOnboardingComplete(lvl: AbstractionLevel) {
    const themeForLevel = lvl === 'simple' ? 'field' as const : 'light' as const;
    appSettings.update({
      abstractionLevel: lvl,
      theme: themeForLevel,
      showTechnicalIds: lvl !== 'simple',
    });
    localStorage.setItem('iiif-field-setup-complete', 'true');
    dialogs.onboardingModal.close();
  }

  function handleAbstractionLevelChange(level: AbstractionLevel) {
    const themeForLevel = level === 'simple' ? 'field' as const : appSettings.themeName === 'field' ? 'light' as const : appSettings.themeName;
    appSettings.update({
      abstractionLevel: level,
      showTechnicalIds: level !== 'simple',
      theme: themeForLevel,
    });
    toast.show(
      `Switched to ${level === 'simple' ? 'Simple (Album/Photo)' : level === 'standard' ? 'Standard' : 'Advanced'} mode`,
      'info'
    );
  }

  function handleDeleteAnnotation(annotationId: string) {
    if (!selectedId) return;
    // @migration: Wire vault.dispatch(actions.removeAnnotation(selectedId, annotationId))
    vault.update(selectedId, {}); // placeholder
    autoSave.markDirty();
  }

  function handleEditAnnotation(annotationId: string, newText: string) {
    // @migration: Wire vault.dispatch(actions.updateAnnotation(annotationId, body))
    autoSave.markDirty();
  }

  function handleUndo() {
    // @migration: Wire history.undo() + vault.restore
  }

  function handleRedo() {
    // @migration: Wire history.redo() + vault.restore
  }

  // ── Content State drop handler ──
  function handleDragOver(e: DragEvent) {
    if (e.dataTransfer?.types.includes('text/plain') || e.dataTransfer?.types.includes('text/uri-list')) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'link';
      isDragOver = true;
    }
  }

  function handleDragLeave(e: DragEvent) {
    if ((e.currentTarget as HTMLElement)?.contains(e.relatedTarget as Node)) return;
    isDragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
    const text = e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('text/uri-list');
    if (!text) return;
    // @migration: Wire contentStateService.parseFromUrl(text)
    toast.show('Content State drop not yet wired in Svelte migration', 'info');
  }

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  function handleKeyDown(e: KeyboardEvent) {
    // Command palette: Cmd+K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      dialogs.commandPalette.toggle();
      return;
    }

    // Keyboard shortcuts overlay: Cmd+? / Ctrl+?
    if ((e.metaKey || e.ctrlKey) && e.key === '?') {
      e.preventDefault();
      dialogs.keyboardShortcuts.toggle();
      return;
    }

    // Legacy quick help: ? key (only when not typing)
    if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
        e.preventDefault();
        dialogs.keyboardShortcuts.toggle();
      }
    }

    // Undo: Cmd+Z / Ctrl+Z
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      if (canUndo) { e.preventDefault(); handleUndo(); }
    }

    // Redo: Cmd+Shift+Z / Ctrl+Shift+Z
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      if (canRedo) { e.preventDefault(); handleRedo(); }
    }
  }

  // ============================================================================
  // Command Palette Commands
  // ============================================================================

  const commands = $derived.by(() => [
    { id: 'archive', label: 'Go to Archive', icon: 'inventory_2', shortcut: '\u23181', onExecute: () => appMode.setMode('archive'), section: 'Navigation' as const, description: 'Switch to Archive view' },
    { id: 'collections', label: 'Go to Collections', icon: 'folder_special', shortcut: '\u23182', onExecute: () => appMode.setMode('collections'), section: 'Navigation' as const, description: 'Switch to Collections/Staging view' },
    { id: 'metadata', label: 'Go to Metadata', icon: 'table_chart', shortcut: '\u23183', onExecute: () => appMode.setMode('metadata'), section: 'Navigation' as const, description: 'Switch to Metadata spreadsheet view' },
    { id: 'search', label: 'Go to Search', icon: 'search', shortcut: '\u23184', onExecute: () => appMode.setMode('search'), section: 'Navigation' as const, description: 'Switch to Search view' },
    { id: 'export', label: 'Export Archive', icon: 'download', shortcut: '\u2318E', onExecute: () => dialogs.exportDialog.open(), section: 'Actions' as const, description: 'Export archive to IIIF package' },
    { id: 'import', label: 'Import External IIIF', icon: 'cloud_download', onExecute: () => dialogs.externalImport.open(), section: 'Actions' as const, description: 'Import from external IIIF manifest or collection' },
    { id: 'settings', label: 'Open Settings', icon: 'settings', shortcut: '\u2318,', onExecute: () => dialogs.personaSettings.open(), section: 'Actions' as const, description: 'Open application settings' },
    { id: 'qc', label: 'Quality Control Dashboard', icon: 'fact_check', onExecute: () => dialogs.qcDashboard.open(), section: 'Actions' as const, description: 'View and fix validation issues' },
    { id: 'fieldmode', label: 'Toggle Field Mode', icon: 'contrast', onExecute: () => appSettings.toggleFieldMode(), section: 'View' as const, description: 'Toggle high-contrast field mode' },
    { id: 'sidebar', label: 'Toggle Sidebar', icon: 'side_navigation', onExecute: () => { showSidebar = !showSidebar; }, section: 'View' as const, description: 'Show or hide the sidebar' },
    { id: 'inspector', label: 'Toggle Inspector', icon: 'info', onExecute: () => { showInspector = !showInspector; }, section: 'View' as const, description: 'Show or hide the inspector panel' },
    { id: 'deps', label: 'Dependency Explorer (Admin)', icon: 'account_tree', onExecute: () => appMode.setMode('admin-deps'), section: 'Admin' as const, description: 'View code dependencies (requires ?admin=true)' },
  ]);
</script>

<!-- Keyboard shortcuts listener -->
<svelte:window onkeydown={handleKeyDown} />

<ScreenLayout
  class={cn(
    'w-screen overflow-hidden font-sans',
    fieldMode ? 'bg-nb-black text-nb-yellow' : 'text-nb-black bg-nb-cream'
  )}
>
  <!-- Skip Links for Accessibility (fixed positioned, won't affect layout) -->
  <SkipLinks links={skipLinks} />

  <!-- Hidden file input for folder import -->
  <input
    bind:this={mainFileInputEl}
    type="file"
    webkitdirectory
    multiple
    class="hidden"
    onchange={handleFileInputChange}
  />

  <!-- Saving Indicator (fixed overlay) -->
  <div
    class={cn(
      'fixed top-4 right-4 z-[2000] pointer-events-none transition-all duration-100',
      autoSave.saveStatus === 'saving' ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
    )}
  >
    <div class="bg-nb-yellow text-nb-black border-2 border-nb-black shadow-brutal-sm px-3 py-1.5 flex items-center gap-2">
      <div class="w-3 h-3 bg-nb-black animate-pulse"></div>
      <span class="font-mono text-[10px] font-bold uppercase tracking-wider">SAVING...</span>
    </div>
  </div>

  <!-- Body content: sidebar + main + inspector -->
  <div class="flex flex-1 min-h-0 relative overflow-hidden">
      <!-- Mobile Header -->
      {#if isMobile}
        <header
          class={cn(
            'absolute top-0 left-0 right-0 h-12 z-[100] flex items-center px-4 justify-between border-b-4',
            fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-cream border-nb-black'
          )}
        >
          <Button variant="ghost" size="bare" onclick={() => { showSidebar = true; }} aria-label="Open sidebar" class={cn('p-2', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}>
            {#snippet children()}<Icon name="menu" />{/snippet}
          </Button>
          <div class={cn('font-mono font-black tracking-tighter uppercase text-sm', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}>
            FIELD STUDIO
          </div>
          <Button
            variant="ghost"
            size="bare"
            onclick={() => { if (selectedItem) showInspector = true; }}
            aria-label="Open inspector"
            class={cn('p-2', fieldMode ? 'text-nb-yellow' : 'text-nb-black', !selectedItem ? 'opacity-20' : '')}
          >
            {#snippet children()}<Icon name="info" />{/snippet}
          </Button>
        </header>
      {/if}

      <!-- Sidebar -->
      <!-- @migration: Sidebar not yet migrated to Svelte -->
      {#if showSidebar}
        <aside
          id="sidebar"
          class={cn(
            'flex flex-col border-r-4 overflow-hidden',
            isMobile ? 'absolute inset-y-0 left-0 z-[200] w-72' : 'w-64',
            fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-cream border-nb-black'
          )}
          role="navigation"
          aria-label="Sidebar navigation"
        >
          <div class={cn('flex items-center h-12 px-3 border-b-4', fieldMode ? 'border-nb-yellow' : 'border-nb-black')}>
            <div class={cn('font-mono font-black tracking-tighter uppercase text-xs flex-1', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}>
              FIELD STUDIO
            </div>
            {#if isMobile}
              <Button variant="ghost" size="bare" onclick={() => { showSidebar = false; }} aria-label="Close sidebar" class="p-1">
                {#snippet children()}<Icon name="close" />{/snippet}
              </Button>
            {/if}
          </div>
          <nav class="flex-1 overflow-y-auto p-2">
            <!-- @migration: NavigationSidebar widget goes here -->
            <!-- Navigation items -->
            {#each [
              { id: 'archive' as AppMode, icon: 'inventory_2', label: 'Archive' },
              { id: 'collections' as AppMode, icon: 'folder_special', label: 'Collections' },
              { id: 'viewer' as AppMode, icon: 'visibility', label: 'Viewer' },
              { id: 'metadata' as AppMode, icon: 'table_chart', label: 'Metadata' },
              { id: 'boards' as AppMode, icon: 'dashboard', label: 'Boards' },
              { id: 'search' as AppMode, icon: 'search', label: 'Search' },
              { id: 'map' as AppMode, icon: 'map', label: 'Map' },
              { id: 'timeline' as AppMode, icon: 'timeline', label: 'Timeline' },
            ] as navItem (navItem.id)}
              <button
                type="button"
                class={cn(
                  'flex items-center gap-3 w-full px-3 py-2 text-left font-mono text-xs uppercase tracking-wider transition-all cursor-pointer border-0',
                  mode === navItem.id
                    ? (fieldMode ? 'bg-nb-yellow text-nb-black font-bold' : 'bg-nb-black text-nb-white font-bold')
                    : (fieldMode ? 'text-nb-yellow/70 hover:text-nb-yellow hover:bg-nb-yellow/10' : 'text-nb-black/60 hover:text-nb-black hover:bg-nb-black/5'),
                )}
                onclick={() => { appMode.setMode(navItem.id); if (isMobile) showSidebar = false; }}
              >
                <Icon name={navItem.icon} class="text-lg" />
                <span>{navItem.label}</span>
              </button>
            {/each}
          </nav>
          <div class={cn('border-t-4 p-2 flex gap-1', fieldMode ? 'border-nb-yellow' : 'border-nb-black')}>
            <Button variant="ghost" size="bare" onclick={handleOpenImport} aria-label="Import files" class={cn('p-2 flex-1', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}>
              {#snippet children()}<Icon name="upload_file" />{/snippet}
            </Button>
            <Button variant="ghost" size="bare" onclick={() => dialogs.exportDialog.open()} aria-label="Export" class={cn('p-2 flex-1', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}>
              {#snippet children()}<Icon name="download" />{/snippet}
            </Button>
            <Button variant="ghost" size="bare" onclick={() => dialogs.personaSettings.open()} aria-label="Settings" class={cn('p-2 flex-1', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}>
              {#snippet children()}<Icon name="settings" />{/snippet}
            </Button>
          </div>
        </aside>
      {/if}

      <!-- Mobile sidebar backdrop -->
      {#if isMobile && showSidebar}
        <button
          type="button"
          class="absolute inset-0 z-[199] bg-black/40 border-0 cursor-default"
          onclick={() => { showSidebar = false; }}
          aria-label="Close sidebar"
        ></button>
      {/if}

      <!-- Main Content -->
      <main
        id="main-content"
        class={cn(
          'flex-1 flex flex-col min-w-0 min-h-0 relative z-0',
          fieldMode ? 'bg-nb-black' : 'bg-nb-white',
          isMobile ? 'pt-12' : '',
          isDragOver ? 'ring-4 ring-nb-blue ring-inset' : ''
        )}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
      >
        <svelte:boundary>
          <ViewRouter
            {selectedId}
            {selectedItem}
            {root}
            validationIssuesMap={validationIssuesMap as Record<string, any[]>}
            onSelect={(item) => handleSelect(item.id)}
            onSelectId={(id) => { if (id) handleSelectId(id); else selectedId = null; }}
            onUpdateItem={handleItemUpdate}
            onUpdateRoot={handleUpdateRoot}
            onBatchEdit={handleBatchEdit}
            onOpenImport={handleOpenImport}
            onOpenExternalImport={() => dialogs.externalImport.open()}
            onCatalogSelection={handleArchiveCatalog}
            settings={appSettings.settings}
          />
          {#snippet failed(error)}
            <div class="flex-1 flex items-center justify-center p-8">
              <div class={cn('text-center p-8 border-4', fieldMode ? 'border-nb-yellow text-nb-yellow' : 'border-nb-black text-nb-black')}>
                <Icon name="error" class="text-4xl mb-4" />
                <h2 class="font-mono font-bold text-lg mb-2">VIEW ERROR</h2>
                <p class="font-mono text-sm opacity-70">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
              </div>
            </div>
          {/snippet}
        </svelte:boundary>

        <!-- @migration: ContextualHelp widget goes here -->
      </main>

      <!-- Inspector (non-archive/boards modes) -->
      {#if mode !== 'archive' && mode !== 'boards' && showInspector && selectedId}
        <!-- @migration: Inspector not yet migrated to Svelte -->
        <aside
          class={cn(
            'w-80 flex flex-col border-l-4 overflow-hidden',
            isMobile ? 'absolute inset-y-0 right-0 z-[200]' : '',
            fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-white border-nb-black'
          )}
          aria-label="Inspector panel"
        >
          <div class={cn('flex items-center h-12 px-3 border-b-4 justify-between', fieldMode ? 'border-nb-yellow' : 'border-nb-black')}>
            <span class={cn('font-mono font-bold text-xs uppercase tracking-wider', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}>
              Inspector
            </span>
            <Button
              variant="ghost"
              size="bare"
              onclick={() => { showInspector = false; if (mode !== 'viewer') selectedId = null; }}
              aria-label="Close inspector"
              class="p-1"
            >
              {#snippet children()}<Icon name="close" />{/snippet}
            </Button>
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            <p class={cn('font-mono text-xs', fieldMode ? 'text-nb-yellow/70' : 'text-nb-black/60')}>
              <!-- @migration: Inspector widget goes here -->
              Selected: {selectedId}
            </p>
          </div>
        </aside>
      {/if}
  </div>

  {#snippet statusbar()}
    {#if !isMobile}
      <!-- @migration: StatusBar widget goes here -->
      <div
        class={cn(
          'flex items-center h-8 px-4 border-t-4 font-mono text-[10px] uppercase tracking-wider gap-4',
          fieldMode ? 'bg-nb-black border-nb-yellow text-nb-yellow/70' : 'bg-nb-cream border-nb-black text-nb-black/60'
        )}
        role="status"
      >
        <!-- Item count -->
        <span>{root?.items?.length ?? 0} items</span>

        <!-- Validation badge -->
        {#if validation.totalIssues > 0}
          <button
            type="button"
            class={cn(
              'flex items-center gap-1 cursor-pointer border-0 bg-transparent font-mono text-[10px] uppercase',
              validation.errorCount > 0 ? 'text-nb-red' : 'text-nb-orange'
            )}
            onclick={() => dialogs.qcDashboard.open()}
          >
            <Icon name={validation.errorCount > 0 ? 'error' : 'warning'} class="text-xs" />
            <span>{validation.totalIssues} issues</span>
          </button>
        {/if}

        <!-- Save status -->
        <span class={cn(
          autoSave.saveStatus === 'error' ? 'text-nb-red' : '',
          autoSave.saveStatus === 'saving' ? (fieldMode ? 'text-nb-yellow' : 'text-nb-blue') : ''
        )}>
          {autoSave.saveStatus === 'saved' ? 'Saved' : autoSave.saveStatus === 'saving' ? 'Saving...' : 'Save error'}
        </span>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Network status -->
        {#if !isOnline}
          <span class="text-nb-orange flex items-center gap-1">
            <Icon name="wifi_off" class="text-xs" />
            Offline
          </span>
        {/if}

        <!-- Storage usage -->
        {#if storageUsage && storageUsage.quota > 0}
          <span>
            {Math.round((storageUsage.usage / storageUsage.quota) * 100)}% storage
          </span>
        {/if}

        <!-- Undo/Redo -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            class={cn('p-0.5 border-0 bg-transparent cursor-pointer', !canUndo ? 'opacity-30' : '')}
            onclick={handleUndo}
            disabled={!canUndo}
            aria-label="Undo"
          >
            <Icon name="undo" class="text-sm" />
          </button>
          <button
            type="button"
            class={cn('p-0.5 border-0 bg-transparent cursor-pointer', !canRedo ? 'opacity-30' : '')}
            onclick={handleRedo}
            disabled={!canRedo}
            aria-label="Redo"
          >
            <Icon name="redo" class="text-sm" />
          </button>
        </div>

        <!-- Keyboard shortcuts -->
        <button
          type="button"
          class="p-0.5 border-0 bg-transparent cursor-pointer opacity-60 hover:opacity-100"
          onclick={() => dialogs.keyboardShortcuts.open()}
          aria-label="Keyboard shortcuts"
        >
          <Icon name="keyboard" class="text-sm" />
        </button>
      </div>
    {/if}
  {/snippet}
</ScreenLayout>

<!-- ============================================================================ -->
<!-- Dialog Overlays (conditionally rendered outside layout)                       -->
<!-- ============================================================================ -->

<!-- @migration: StagingWorkbench not yet migrated -->
{#if stagingTree}
  <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
    <div class="bg-nb-white border-4 border-nb-black p-8 max-w-lg">
      <p class="font-mono text-sm">StagingWorkbench placeholder</p>
      <Button variant="secondary" size="sm" onclick={() => { stagingTree = null; }}>
        {#snippet children()}Close{/snippet}
      </Button>
    </div>
  </div>
{/if}

<!-- @migration: ExportDialog not yet migrated -->
{#if dialogs.exportDialog.isOpen && root}
  <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
    <div class="bg-nb-white border-4 border-nb-black p-8 max-w-lg">
      <p class="font-mono text-sm">ExportDialog placeholder</p>
      <Button variant="secondary" size="sm" onclick={() => dialogs.exportDialog.close()}>
        {#snippet children()}Close{/snippet}
      </Button>
    </div>
  </div>
{/if}

<!-- @migration: QCDashboard not yet migrated -->
{#if dialogs.qcDashboard.isOpen}
  <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
    <div class="bg-nb-white border-4 border-nb-black p-8 max-w-lg">
      <p class="font-mono text-sm">QCDashboard placeholder</p>
      <Button variant="secondary" size="sm" onclick={() => dialogs.qcDashboard.close()}>
        {#snippet children()}Close{/snippet}
      </Button>
    </div>
  </div>
{/if}

<!-- @migration: OnboardingModal not yet migrated -->
{#if dialogs.onboardingModal.isOpen}
  <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
    <div class="bg-nb-white border-4 border-nb-black p-8 max-w-md text-center">
      <h2 class="font-mono font-bold text-lg mb-4">Welcome to Field Studio</h2>
      <p class="font-mono text-sm mb-6">Choose your experience level:</p>
      <div class="flex flex-col gap-2">
        <Button variant="secondary" size="base" onclick={() => handleOnboardingComplete('simple')}>
          {#snippet children()}Simple (Album/Photo){/snippet}
        </Button>
        <Button variant="primary" size="base" onclick={() => handleOnboardingComplete('standard')}>
          {#snippet children()}Standard{/snippet}
        </Button>
        <Button variant="secondary" size="base" onclick={() => handleOnboardingComplete('advanced')}>
          {#snippet children()}Advanced{/snippet}
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- @migration: ExternalImportDialog not yet migrated -->
{#if dialogs.externalImport.isOpen}
  <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
    <div class="bg-nb-white border-4 border-nb-black p-8 max-w-lg">
      <p class="font-mono text-sm">ExternalImportDialog placeholder</p>
      <Button variant="secondary" size="sm" onclick={() => dialogs.externalImport.close()}>
        {#snippet children()}Close{/snippet}
      </Button>
    </div>
  </div>
{/if}

<!-- @migration: BatchEditor not yet migrated -->
{#if dialogs.batchEditor.isOpen && root}
  <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
    <div class="bg-nb-white border-4 border-nb-black p-8 max-w-lg">
      <p class="font-mono text-sm">BatchEditor placeholder ({batchIds.length} items)</p>
      <Button variant="secondary" size="sm" onclick={() => dialogs.batchEditor.close()}>
        {#snippet children()}Close{/snippet}
      </Button>
    </div>
  </div>
{/if}

<!-- @migration: PersonaSettings not yet migrated -->
{#if dialogs.personaSettings.isOpen}
  <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
    <div class="bg-nb-white border-4 border-nb-black p-8 max-w-lg">
      <p class="font-mono text-sm">PersonaSettings placeholder</p>
      <Button variant="secondary" size="sm" onclick={() => dialogs.personaSettings.close()}>
        {#snippet children()}Close{/snippet}
      </Button>
    </div>
  </div>
{/if}

<!-- @migration: CommandPalette not yet migrated -->
{#if dialogs.commandPalette.isOpen}
  <div class="fixed inset-0 z-[3000] flex items-start justify-center pt-[20vh] bg-black/50">
    <div class={cn('w-full max-w-lg border-4 shadow-brutal', fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-white border-nb-black')}>
      <div class={cn('flex items-center h-12 px-4 border-b-4', fieldMode ? 'border-nb-yellow' : 'border-nb-black')}>
        <Icon name="search" class={cn('text-lg mr-2', fieldMode ? 'text-nb-yellow' : 'text-nb-black')} />
        <span class={cn('font-mono text-xs uppercase tracking-wider', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}>
          Command Palette
        </span>
        <div class="flex-1"></div>
        <kbd class={cn('font-mono text-[10px] px-1.5 py-0.5 border', fieldMode ? 'border-nb-yellow text-nb-yellow' : 'border-nb-black text-nb-black')}>
          ESC
        </kbd>
      </div>
      <div class="max-h-80 overflow-y-auto">
        {#each commands as cmd (cmd.id)}
          <button
            type="button"
            class={cn(
              'flex items-center gap-3 w-full px-4 py-2.5 text-left font-mono text-xs border-0 cursor-pointer transition-all',
              fieldMode
                ? 'bg-transparent text-nb-yellow hover:bg-nb-yellow/10'
                : 'bg-transparent text-nb-black hover:bg-nb-black/5'
            )}
            onclick={() => { cmd.onExecute(); dialogs.commandPalette.close(); }}
          >
            <Icon name={cmd.icon} class="text-base opacity-60" />
            <span class="flex-1">{cmd.label}</span>
            {#if cmd.shortcut}
              <kbd class={cn('text-[10px] px-1 py-0.5 opacity-50', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}>
                {cmd.shortcut}
              </kbd>
            {/if}
          </button>
        {/each}
      </div>
      <button
        type="button"
        class="absolute top-0 right-0 p-3 border-0 bg-transparent cursor-pointer opacity-60 hover:opacity-100"
        onclick={() => dialogs.commandPalette.close()}
        aria-label="Close command palette"
      >
        <Icon name="close" class={cn('text-lg', fieldMode ? 'text-nb-yellow' : 'text-nb-black')} />
      </button>
    </div>
  </div>
{/if}

<!-- @migration: KeyboardShortcutsOverlay not yet migrated -->
{#if dialogs.keyboardShortcuts.isOpen}
  <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
    <div class={cn('max-w-md w-full border-4 p-6', fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-white border-nb-black')}>
      <div class="flex items-center justify-between mb-4">
        <h2 class={cn('font-mono font-bold text-sm uppercase', fieldMode ? 'text-nb-yellow' : 'text-nb-black')}>Keyboard Shortcuts</h2>
        <Button variant="ghost" size="bare" onclick={() => dialogs.keyboardShortcuts.close()} aria-label="Close">
          {#snippet children()}<Icon name="close" />{/snippet}
        </Button>
      </div>
      <div class={cn('space-y-2 font-mono text-xs', fieldMode ? 'text-nb-yellow/80' : 'text-nb-black/70')}>
        <div class="flex justify-between"><span>Command Palette</span><kbd class="opacity-60">{'\u2318'}K</kbd></div>
        <div class="flex justify-between"><span>Undo</span><kbd class="opacity-60">{'\u2318'}Z</kbd></div>
        <div class="flex justify-between"><span>Redo</span><kbd class="opacity-60">{'\u2318\u21E7'}Z</kbd></div>
        <div class="flex justify-between"><span>This Dialog</span><kbd class="opacity-60">?</kbd></div>
      </div>
    </div>
  </div>
{/if}

<!-- @migration: AuthDialog not yet migrated -->
{#if dialogs.authDialog.isOpen && pendingAuth}
  <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
    <div class="bg-nb-white border-4 border-nb-black p-8 max-w-lg">
      <p class="font-mono text-sm">AuthDialog placeholder for resource: {pendingAuth.resourceId}</p>
      <Button variant="secondary" size="sm" onclick={handleAuthClose}>
        {#snippet children()}Close{/snippet}
      </Button>
    </div>
  </div>
{/if}

<!-- @migration: StorageFullDialog not yet migrated -->
{#if dialogs.storageFullDialog.isOpen}
  <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50">
    <div class="bg-nb-white border-4 border-nb-red p-8 max-w-md text-center">
      <Icon name="storage" class="text-4xl text-nb-red mb-4" />
      <h2 class="font-mono font-bold text-lg mb-2">Storage Full</h2>
      <p class="font-mono text-sm mb-4">Please export your archive and clear data to continue.</p>
      <div class="flex gap-2 justify-center">
        <Button variant="primary" size="sm" onclick={() => { dialogs.storageFullDialog.close(); dialogs.exportDialog.open(); }}>
          {#snippet children()}Export{/snippet}
        </Button>
        <Button variant="secondary" size="sm" onclick={() => dialogs.storageFullDialog.close()}>
          {#snippet children()}Close{/snippet}
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Toast Notifications (always mounted) -->
<div class="fixed bottom-4 right-4 z-[5000] flex flex-col gap-2" aria-live="polite">
  {#each toast.items as item (item.id)}
    <Toast
      id={item.id}
      variant={item.type}
      message={item.message}
      action={item.action ? { label: item.action.label, onclick: item.action.onClick } : undefined}
      duration={item.persistent ? 0 : 3000}
      onDismiss={() => toast.dismiss(item.id)}
    />
  {/each}
</div>
