
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { type AbstractionLevel, type AppMode, type FileTree, getIIIFValue, type IIIFAnnotation, type IIIFItem, isCanvas, isCollection, type ViewType } from '@/src/shared/types';
import { ToastProvider, useToast } from '@/src/shared/ui/molecules/Toast';
import { ErrorBoundary } from '@/src/shared/ui/molecules/ErrorBoundary';
import { METADATA_TEMPLATES } from '@/src/shared/constants';
import { Sidebar } from '@/src/widgets/NavigationSidebar/ui/organisms/Sidebar';
import { Inspector } from '@/src/features/metadata-edit/ui/organisms/Inspector';
import { StatusBar } from '@/src/widgets/StatusBar/ui/organisms/StatusBar';
import { StagingWorkbench } from '@/src/features/staging/ui/organisms/StagingWorkbench';
const ExportDialog = React.lazy(() => import('@/src/features/export/ui/ExportDialog').then(m => ({ default: m.ExportDialog })));
import { ContextualHelp } from '@/src/widgets/ContextualHelp/ui/ContextualHelp';
import { QuickReference } from '@/src/shared/ui/molecules/Tooltip';
import { QUICK_REF_ARCHIVE, QUICK_REF_BOARD, QUICK_REF_METADATA, QUICK_REF_STAGING, QUICK_REF_VIEWER } from '@/src/shared/constants/helpContent';
import { QCDashboard } from '@/src/widgets/QCDashboard/ui/QCDashboard';
import { OnboardingModal } from '@/src/widgets/OnboardingModal/ui/OnboardingModal';
import { ExternalImportDialog } from '@/src/features/ingest/ui/ExternalImportDialog';
import { BatchEditor } from '@/src/features/metadata-edit/ui/organisms/BatchEditor';
import { PersonaSettings } from '@/src/widgets/PersonaSettings/ui/PersonaSettings';
import { CommandPalette } from '@/src/widgets/CommandPalette/ui/CommandPalette';
import { KeyboardShortcutsOverlay } from '@/src/widgets/KeyboardShortcuts/ui/KeyboardShortcutsOverlay';
import { AuthDialog } from '@/src/widgets/AuthDialog/ui/AuthDialog';
import { SkipLink } from '@/src/shared/ui/atoms/SkipLink';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { StorageFullDialog } from '@/src/widgets/StorageFullDialog/ui/StorageFullDialog';
// NEW: Use the refactored ViewRouter from src/app/routes (Phase 5)
// This routes to new feature slices for implemented routes (archive)
// and falls back to old components for unimplemented routes
import { ViewRouter } from './routes';
import { buildTree, ingestTree } from '@/src/entities/manifest/model/builders/iiifBuilder';
import { AuthService, AuthState } from '@/src/shared/services/authService';
import { storage } from '@/src/shared/services/storage';
import { setGlobalQuotaErrorHandler } from '@/src/entities/manifest/model/ingest/ingestWorkerPool';
import { contentStateService } from '@/src/shared/services/contentState';
import { useBulkOperations, useHistory, useUndoRedoShortcuts, useVault, useVaultState, VaultProvider } from '@/src/entities/manifest/model/hooks/useIIIFEntity';
import { actions } from '@/src/entities/manifest/model/actions';
import { getEntity as vaultGetEntity, getEntityType as vaultGetEntityType } from '@/src/entities/manifest/model/vault';
import { denormalizeCanvas } from '@/src/entities/manifest/model/vault/denormalization';
import { appLog } from '@/src/shared/services/logger';
import { useNetworkStatus } from '@/src/shared/lib/hooks/useNetworkStatus';
import { activityStream } from '@/src/shared/services/activityStream';
import type { DetailedStorageEstimate } from '@/src/shared/services/storage';
import { ActivityFeedPanel } from '@/src/widgets/StatusBar/ui/molecules/ActivityFeedPanel';
import { UserIntentProvider } from '@/src/app/providers/UserIntentProvider';
import { ResourceContextProvider } from '@/src/app/providers/ResourceContextProvider';
import { useAppMode, useAppModeState } from '@/src/app/providers';

// Custom hooks for cleaner state management
import { useResponsive } from '@/src/shared/lib/hooks/useResponsive';
import { useAppSettings } from '@/src/app/providers/useAppSettings';
import { useDialogManager } from '@/src/app/hooks/useDialogManager';
import { useAutoSave } from '@/src/app/hooks/useAutoSave';
import { useValidation } from '@/src/app/hooks/useValidation';

// ============================================================================
// Types
// ============================================================================

interface PipelineContext {
  filterIds?: string[] | null;
  focusCoordinate?: { lat: number; lng: number } | null;
  preloadedManifest?: string | null;
}

// ============================================================================
// Action label map for StatusBar last-action indicator
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
// Main App Component
// ============================================================================

const MainApp: React.FC = () => {
  // ---- Vault State (normalized IIIF data) ----
  const { state, dispatch, loadRoot, exportRoot, rootId } = useVault();
  const { batchUpdate } = useBulkOperations();
  // Debounced exportRoot — avoids full denormalization on every keystroke.
  // Uses 200ms timer so rapid edits batch into a single tree rebuild.
  const [root, setRoot] = useState<IIIFItem | null>(() => exportRoot());
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
    exportTimerRef.current = setTimeout(() => {
      setRoot(exportRoot());
    }, 200);
    return () => { if (exportTimerRef.current) clearTimeout(exportTimerRef.current); };
  }, [state, exportRoot]);

  // ---- Custom Hooks ----
  const { isMobile, isTablet: _isTablet } = useResponsive();
  const { settings, updateSettings, toggleFieldMode } = useAppSettings();
  const { showToast } = useToast();

  // ---- Dialog States (consolidated) ----
  const {
    exportDialog, qcDashboard, onboardingModal, externalImport,
    batchEditor, personaSettings, commandPalette, keyboardShortcuts,
    authDialog, storageFullDialog
  } = useDialogManager();

  // ---- Panel States ----
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [showInspector, setShowInspector] = useState(false);

  // ---- Navigation State ----
  const [currentMode, setCurrentMode] = useAppMode();
  const appModeState = useAppModeState();
  const [viewType, setViewType] = useState<ViewType>('iiif');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---- App State ----
  const [pendingAuth, setPendingAuth] = useState<{ resourceId: string; authServices: AuthService[]; retryFn?: () => void } | null>(null);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [stagingTree, setStagingTree] = useState<FileTree | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [pipelineContext, setPipelineContext] = useState<PipelineContext>({});
  const validationIssuesMap = useValidation(root);
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [showQuickRef, setShowQuickRef] = useState(false);

  // ---- Undo/Redo & History ----
  const { undo, redo, canUndo, canRedo, lastActionType } = useHistory();

  // ---- Network Status ----
  const { isOnline } = useNetworkStatus();

  // ---- Activity Feed ----
  const [activityCount, setActivityCount] = useState(0);
  const [showActivityFeed, setShowActivityFeed] = useState(false);

  // ---- Storage Detail ----
  const [storageDetail, setStorageDetail] = useState<DetailedStorageEstimate | null>(null);

  // ---- Content State Drop Handler ----
  const [isDragOver, setIsDragOver] = useState(false);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Accept text drops (IIIF Content State URIs)
    if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('text/uri-list')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'link';
      setIsDragOver(true);
    }
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if actually leaving the container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (!text) return;
    // Try to parse as a URL with iiif-content parameter
    const viewport = contentStateService.parseFromUrl(text);
    if (viewport) {
      setSelectedId(viewport.canvasId);
      setCurrentMode('viewer');
      setShowInspector(true);
      showToast('Navigated to shared content', 'success');
    }
  }, [showToast]);

  // ---- Refs for effect guards ----
  const rootRef = useRef(root);
  rootRef.current = root;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const initRef = useRef(false);
  const touchCheckRef = useRef(false);
  const mainFileInputRef = useRef<HTMLInputElement>(null);

  // Handler to trigger file input from empty state
  const handleOpenImport = useCallback(() => {
    if (mainFileInputRef.current) {
      mainFileInputRef.current.click();
    }
  }, []);

  // ============================================================================
  // URL Deep Linking
  // ============================================================================

  useEffect(() => {
    const parseUrlState = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      const params = new URLSearchParams(hash);
      const mode = params.get('mode') as AppMode | null;
      const id = params.get('id');

      if (mode && ['archive', 'collections', 'metadata', 'search', 'viewer', 'boards'].includes(mode)) {
        setCurrentMode(mode);
      }
      if (id) {
        setSelectedId(id);
      }
    };

    parseUrlState();

    const handlePopState = () => parseUrlState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('mode', currentMode);
    if (selectedId) params.set('id', selectedId);

    const newHash = `#${params.toString()}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  }, [currentMode, selectedId]);

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useUndoRedoShortcuts();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        commandPalette.toggle();
      }
      // Keyboard shortcuts overlay - Cmd+? (or Ctrl+?)
      if ((e.metaKey || e.ctrlKey) && e.key === '?') {
        e.preventDefault();
        keyboardShortcuts.toggle();
      }
      // Legacy quick help - ? key (Shift+/)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if user is typing in an input
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          keyboardShortcuts.toggle();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPalette, keyboardShortcuts]);

  // ============================================================================
  // Command Palette Commands
  // ============================================================================

  const commands = useMemo(() => [
    { id: 'archive', label: 'Go to Archive', icon: 'inventory_2', shortcut: '⌘1', onExecute: () => setCurrentMode('archive'), section: 'Navigation' as const, description: 'Switch to Archive view' },
    { id: 'collections', label: 'Go to Collections', icon: 'folder_special', shortcut: '⌘2', onExecute: () => setCurrentMode('collections'), section: 'Navigation' as const, description: 'Switch to Collections/Staging view' },
    // Structure view absorbed into sidebar tree — no longer a separate mode
    { id: 'metadata', label: 'Go to Metadata', icon: 'table_chart', shortcut: '⌘3', onExecute: () => setCurrentMode('metadata'), section: 'Navigation' as const, description: 'Switch to Metadata spreadsheet view' },
    { id: 'search', label: 'Go to Search', icon: 'search', shortcut: '⌘4', onExecute: () => setCurrentMode('search'), section: 'Navigation' as const, description: 'Switch to Search view' },
    { id: 'export', label: 'Export Archive', icon: 'download', shortcut: '⌘E', onExecute: exportDialog.open, section: 'Actions' as const, description: 'Export archive to IIIF package' },
    { id: 'import', label: 'Import External IIIF', icon: 'cloud_download', onExecute: externalImport.open, section: 'Actions' as const, description: 'Import from external IIIF manifest or collection' },
    { id: 'settings', label: 'Open Settings', icon: 'settings', shortcut: '⌘,', onExecute: personaSettings.open, section: 'Actions' as const, description: 'Open application settings' },
    { id: 'qc', label: 'Quality Control Dashboard', icon: 'fact_check', onExecute: qcDashboard.open, section: 'Actions' as const, description: 'View and fix validation issues' },
    { id: 'fieldmode', label: 'Toggle Field Mode', icon: 'contrast', onExecute: toggleFieldMode, section: 'View' as const, description: 'Toggle high-contrast field mode' },
    { id: 'sidebar', label: 'Toggle Sidebar', icon: 'side_navigation', onExecute: () => setShowSidebar(s => !s), section: 'View' as const, description: 'Show or hide the sidebar' },
    { id: 'inspector', label: 'Toggle Inspector', icon: 'info', onExecute: () => setShowInspector(s => !s), section: 'View' as const, description: 'Show or hide the inspector panel' },
    // Admin-only commands
    { id: 'deps', label: 'Dependency Explorer (Admin)', icon: 'account_tree', onExecute: () => setCurrentMode('admin-deps'), section: 'Admin' as const, description: 'View code dependencies and imports/exports (requires ?admin=true)' },
  ], [exportDialog.open, externalImport.open, personaSettings.open, qcDashboard.open, toggleFieldMode]);

  // ============================================================================
  // Initialization & Storage
  // ============================================================================

  useEffect(() => {
    if (touchCheckRef.current) return;
    touchCheckRef.current = true;

    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (hasTouch && !settings.fieldMode && !localStorage.getItem('iiif-field-mode-prompted')) {
      showToast("Touch device detected. Field Mode activated for tactile archiving.", "info");
      updateSettings({ fieldMode: true });
      localStorage.setItem('iiif-field-mode-prompted', 'true');
    }
  }, [settings.fieldMode, showToast, updateSettings]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    storage.setWarningCallback((warning) => {
      if (warning.type === 'quota_critical' || warning.type === 'save_failed') {
        showToastRef.current(warning.message, 'error');
        // Show storage full dialog for critical errors
        if (warning.usagePercent >= 0.95) {
          storageFullDialog.open();
        }
      } else if (warning.type === 'quota_warning') {
        showToastRef.current(warning.message, 'info');
      }
    });

    // Set up global quota error handler for worker pool
    setGlobalQuotaErrorHandler(() => {
      showToastRef.current('Storage full! Please export and clear data to continue.', 'error');
      storageFullDialog.open();
    });

    // Request persistent storage to prevent eviction under storage pressure
    storage.requestPersistentStorage().catch(() => {});

    storage.loadProject().then(async (proj) => {
      if (proj) loadRoot(proj);

      const viewport = contentStateService.parseFromUrl();
      if (viewport) {
        appLog.debug('[App] Content State detected:', viewport);

        const findInProject = (node: IIIFItem | null, id: string): IIIFItem | null => {
          if (!node) return null;
          if (node.id === id) return node;
          const children = (node as any).items || [];
          for (const child of children) {
            const found = findInProject(child, id);
            if (found) return found;
          }
          return null;
        };

        const item = proj ? findInProject(proj, viewport.canvasId) : null;

        if (item) {
          setSelectedId(viewport.canvasId);
          setCurrentMode('viewer');
          setShowInspector(true);
        } else {
          appLog.warn('[App] Content State canvas not found:', viewport.canvasId);
          showToastRef.current('The shared item could not be found in this archive', 'info');
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    });

    if (!localStorage.getItem('iiif-field-setup-complete')) {
      onboardingModal.open();
    }

    checkStorage();
    const interval = setInterval(checkStorage, 30000);
    return () => clearInterval(interval);
  }, [loadRoot, onboardingModal]);

  // Auto-save with dirty-flag debouncing — uses rootRef to avoid resetting interval on every state change
  const getRootRef = useCallback(() => rootRef.current, []);
  const { markDirty } = useAutoSave({
    rootId,
    saveStatus,
    autoSaveInterval: settings.autoSaveInterval,
    getRootRef,
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const checkStorage = async () => {
    const est = await storage.getEstimate();
    setStorageUsage(est);
    // Also update detailed estimate for tooltip
    storage.getDetailedEstimate().then(detail => setStorageDetail(detail)).catch(() => {});
  };

  // Activity count poll (every 10s)
  useEffect(() => {
    const poll = () => { activityStream.getCount().then(setActivityCount).catch(() => {}); };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, []);

  const handleUpdateRoot = useCallback((newRoot: IIIFItem) => {
    loadRoot(newRoot);
    setSaveStatus('saving');
    storage.saveProject(newRoot)
      .then(() => { setSaveStatus('saved'); checkStorage(); })
      .catch((error) => {
        setSaveStatus('error');
        const msg = error instanceof DOMException && error.name === 'ReadOnlyError'
          ? 'Storage is full - database is read-only. Export your archive immediately.'
          : 'Failed to save project!';
        showToast(msg, 'error');
      });
  }, [loadRoot, showToast]);

  // O(1) entity lookup via normalized vault state — no tree walk needed
  // Canvas entities must be denormalized to include their annotation pages/annotations
  const findItem = useCallback((_node: IIIFItem | null, id: string): IIIFItem | null => {
    const type = vaultGetEntityType(state, id);
    if (type === 'Canvas') {
      return denormalizeCanvas(state, id);
    }
    return vaultGetEntity(state, id);
  }, [state]);

  const handleItemUpdate = useCallback((updates: Partial<IIIFItem>) => {
    if (!selectedId) return;
    const success = dispatch(actions.batchUpdate([{ id: selectedId, changes: updates }]));
    if (success) {
      markDirty();
    }
  }, [selectedId, dispatch, markDirty]);

  // Annotation CRUD for the App-level Inspector (non-archive/boards views)
  const handleDeleteAnnotation = useCallback((annotationId: string) => {
    if (!selectedId) return;
    const result = dispatch(actions.removeAnnotation(selectedId, annotationId));
    if (result) markDirty();
  }, [selectedId, dispatch, markDirty]);

  const handleEditAnnotation = useCallback((annotationId: string, newText: string) => {
    const result = dispatch(actions.updateAnnotation(annotationId, {
      body: { type: 'TextualBody', value: newText, format: 'text/plain' } as unknown as IIIFAnnotation['body'],
    }));
    if (result) markDirty();
  }, [dispatch, markDirty]);

  const handleReveal = useCallback((id: string, mode: AppMode) => {
    setSelectedId(id);
    setCurrentMode(mode);
    // Only auto-show inspector if an item is selected and not on mobile
    if (id && !isMobile) {
      setShowInspector(true);
    }
    // On mobile, hide inspector in viewer mode to maximize viewport
    if (isMobile) {
      setShowSidebar(false);
      if (mode === 'viewer') setShowInspector(false);
    }
    if (mode !== 'metadata') setPipelineContext(ctx => ({ ...ctx, filterIds: null }));
  }, [isMobile]);

  const handleArchiveCatalog = useCallback((ids: string[]) => {
    setPipelineContext(ctx => ({ ...ctx, filterIds: ids }));
    setCurrentMode('metadata');
    if (isMobile) setShowSidebar(false);
    showToast(`Anticipating cataloging for ${ids.length} items`, "info");
  }, [isMobile, showToast]);

  const handleManifestSynthesis = useCallback((manifestId: string) => {
    setSelectedId(manifestId);
    setPipelineContext(ctx => ({ ...ctx, preloadedManifest: manifestId }));
    setCurrentMode('viewer');
  }, []);

  const handleAuthRequired = useCallback((resourceId: string, authServices: AuthService[], retryFn?: () => void) => {
    setPendingAuth({ resourceId, authServices, retryFn });
    authDialog.open();
  }, [authDialog]);

  const handleAuthComplete = useCallback((state: AuthState) => {
    if (state.status === 'authenticated') {
      showToast('Authentication successful.', 'success');
      // Auto-retry the original request if a retry function was provided
      if (pendingAuth?.retryFn) {
        pendingAuth.retryFn();
      }
    } else if (state.status === 'degraded') {
      showToast('Limited access granted. Some content may be unavailable.', 'info');
    }
    authDialog.close();
    setPendingAuth(null);
  }, [showToast, authDialog, pendingAuth]);

  const handleAuthClose = useCallback(() => {
    authDialog.close();
    setPendingAuth(null);
  }, [authDialog]);

  const handleOnboardingComplete = useCallback((lvl: 'simple' | 'standard' | 'advanced') => {
    const template = lvl === 'simple' ? METADATA_TEMPLATES.RESEARCHER : lvl === 'standard' ? METADATA_TEMPLATES.ARCHIVIST : METADATA_TEMPLATES.DEVELOPER;
    const complexity = lvl === 'simple' ? 'simple' : lvl === 'advanced' ? 'advanced' : 'standard';
    const showTechnical = lvl !== 'simple';
    updateSettings({
      abstractionLevel: lvl,
      fieldMode: lvl === 'simple',
      metadataTemplate: template,
      metadataComplexity: complexity as any,
      showTechnicalIds: showTechnical
    });
    localStorage.setItem('iiif-field-setup-complete', 'true');
    onboardingModal.close();
  }, [updateSettings, onboardingModal]);

  /**
   * Handle abstraction level change from the toggle
   * Updates all related settings based on the selected level
   */
  const handleAbstractionLevelChange = useCallback((level: AbstractionLevel) => {
    const template = level === 'simple' ? METADATA_TEMPLATES.RESEARCHER
      : level === 'standard' ? METADATA_TEMPLATES.ARCHIVIST
      : METADATA_TEMPLATES.DEVELOPER;
    const complexity = level === 'simple' ? 'simple' : level === 'advanced' ? 'advanced' : 'standard';
    const showTechnical = level !== 'simple';
    const fieldMode = level === 'simple';

    updateSettings({
      abstractionLevel: level,
      metadataTemplate: template,
      metadataComplexity: complexity as any,
      showTechnicalIds: showTechnical,
      fieldMode
    });

    showToast(`Switched to ${level === 'simple' ? 'Simple (Album/Photo)' : level === 'standard' ? 'Standard' : 'Advanced'} mode`, 'info');
  }, [updateSettings, showToast]);

  const handleBatchApply = useCallback((ids: string[], updatesMap: Record<string, Partial<IIIFItem>>, ren?: string) => {
    const updates = ids.map((id, idx) => {
      const changes = { ...updatesMap[id] };
      if (ren) {
        const target = findItem(root, id);
        if (target) {
          const oldLabel = getIIIFValue(target.label);
          changes.label = { none: [ren.replace('{orig}', oldLabel).replace('{nnn}', (idx + 1).toString().padStart(3, '0'))] };
        }
      }
      return { id, changes };
    });
    const success = batchUpdate(updates);
    if (success) {
      markDirty();
    }
  }, [root, findItem, batchUpdate, markDirty]);

  const handleBatchRollback = useCallback((restoredRoot: IIIFItem) => {
    loadRoot(restoredRoot);
    setSaveStatus('saving');
    storage.saveProject(restoredRoot)
      .then(() => { setSaveStatus('saved'); checkStorage(); })
      .catch(() => { setSaveStatus('error'); showToast("Failed to save rollback!", 'error'); });
  }, [loadRoot, showToast]);

  // Close sidebar on mobile when mode changes
  useEffect(() => {
    if (isMobile) {
      setShowSidebar(false);
    }
  }, [currentMode, isMobile, setShowSidebar]);

  // ============================================================================
  // Derived State
  // ============================================================================

  const selectedItem = selectedId ? findItem(root, selectedId) : null;

  // Memoize flattened validation issues for StatusBar
  const flatValidationIssues = useMemo(
    () => Object.values(validationIssuesMap).flat(),
    [validationIssuesMap]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      data-mode={currentMode}
      data-field-mode={settings.fieldMode ? 'true' : 'false'}
      data-annotation-mode={appModeState.annotationModeActive ? 'true' : 'false'}
      className={`flex flex-col h-dvh w-screen overflow-hidden font-sans ${settings.fieldMode ? 'bg-nb-black text-nb-yellow' : 'text-nb-black bg-nb-cream'}`}
    >
      {/* Skip Links for Accessibility - screen reader only, visible on focus */}
      <SkipLink targetId="main-content" label="Skip to main content" />
      <SkipLink targetId="sidebar" label="Skip to sidebar" />
      <SkipLink targetId="command-palette-trigger" label="Command Palette" shortcut="⌘K" />

      {/* Hidden file input for folder import from empty state */}
      <input
        ref={mainFileInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory="true"
        directory=""
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setStagingTree(buildTree(Array.from(e.target.files)));
            e.target.value = ''; // Reset for re-selection
          }
        }}
      />

      {/* Saving Indicator - Neobrutalist */}
      <div className={`fixed top-4 right-4 z-[2000] pointer-events-none transition-nb duration-100 ${saveStatus === 'saving' ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
        <div className="bg-nb-yellow text-nb-black border-2 border-nb-black shadow-brutal-sm px-3 py-1.5 flex items-center gap-2">
          <div className="w-3 h-3 bg-nb-black" style={{ animation: 'savePulse 0.5s linear infinite' }} />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">SAVING...</span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 min-w-0 relative overflow-hidden">
        {/* Mobile Header */}
        {isMobile && (
          <header className={`absolute top-0 left-0 right-0 h-header-compact z-[100] flex items-center px-4 justify-between border-b-4 ${settings.fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-cream border-nb-black'}`}>
            <Button variant="ghost" size="bare" onClick={() => setShowSidebar(true)} aria-label="Open sidebar" className={`p-2 ${settings.fieldMode ? 'text-nb-yellow' : 'text-nb-black'}`}>
              <Icon name="menu" />
            </Button>
            <div className={`font-mono font-black tracking-tighter uppercase text-sm ${settings.fieldMode ? 'text-nb-yellow' : 'text-nb-black'}`}>FIELD STUDIO</div>
            <Button variant="ghost" size="bare" onClick={() => selectedItem && setShowInspector(true)} aria-label="Open inspector" className={`p-2 ${settings.fieldMode ? 'text-nb-yellow' : 'text-nb-black'} ${!selectedItem ? 'opacity-20' : ''}`}>
              <Icon name="info" />
            </Button>
          </header>
        )}

        <Sidebar
          root={root}
          selectedId={selectedId}
          viewType={viewType}
          abstractionLevel={settings.abstractionLevel}
          visible={showSidebar}
          isMobile={isMobile}
          onSelect={(id) => {
            setSelectedId(id);
            if (!isMobile) setShowInspector(true);
            if (isMobile) setShowSidebar(false);
          }}
          onClose={() => setShowSidebar(false)}
          onViewTypeChange={setViewType}
          onImport={(e) => e.target.files && setStagingTree(buildTree(Array.from(e.target.files)))}
          onExportTrigger={exportDialog.open}
          onToggleFieldMode={toggleFieldMode}
          fieldMode={settings.fieldMode}
          onOpenExternalImport={externalImport.open}
          onStructureUpdate={handleUpdateRoot}
          onOpenSettings={personaSettings.open}
          onToggleQuickHelp={() => setShowQuickRef(prev => !prev)}
          onAbstractionLevelChange={handleAbstractionLevelChange}
          badges={{ validationErrors: Object.keys(validationIssuesMap).length || undefined }}
        />

        <main
          id="main-content"
          className={`flex-1 flex flex-col min-w-0 min-h-0 relative z-0 panel-fixed ${settings.fieldMode ? 'bg-nb-black' : 'bg-nb-white'} ${isMobile ? 'pt-header-compact' : ''} ${isDragOver ? 'ring-4 ring-nb-blue ring-inset' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* View content */}
          <ViewRouter
            root={root}
            selectedItem={selectedItem}
            selectedId={selectedId}
            validationIssuesMap={validationIssuesMap}
            onUpdateRoot={handleUpdateRoot}
            onUpdateItem={handleItemUpdate}
            onSelect={(item) => { setSelectedId(item.id); if (!isMobile) setShowInspector(true); }}
            onSelectId={setSelectedId}
            onBatchEdit={(ids) => { setBatchIds(ids); batchEditor.open(); }}
            onCatalogSelection={handleArchiveCatalog}
            settings={settings}
            onOpenImport={handleOpenImport}
            onOpenExternalImport={externalImport.open}
          />
          <ContextualHelp mode={currentMode} isInspectorOpen={showInspector && !!selectedItem && !settings.fieldMode} />
        </main>

        {/* Inspector dual-mount: In archive mode, Inspector lives inside ViewRouter
            as part of the filmstrip/viewer/inspector flex row. In all other views,
            Inspector mounts here as a sibling of <main>. This is intentional — archive
            needs the inspector within its split-view layout for proper flex sizing. */}
        {currentMode !== 'archive' && currentMode !== 'boards' && (
          <Inspector
            key={selectedId || 'none'}
            resource={selectedItem}
            onUpdateResource={handleItemUpdate}
            settings={settings}
            visible={showInspector && !!selectedId}
            isMobile={isMobile}
            onClose={() => { setShowInspector(false); setSelectedId(null); }}
            annotations={selectedItem && isCanvas(selectedItem)
              ? selectedItem.annotations?.flatMap(page => page.items) || []
              : []}
            onDeleteAnnotation={handleDeleteAnnotation}
            onEditAnnotation={handleEditAnnotation}
          />
        )}
      </div>

      {!isMobile && (
        <div className="relative">
          {showActivityFeed && (
            <ActivityFeedPanel onClose={() => setShowActivityFeed(false)} />
          )}
          <StatusBar
            totalItems={root?.items?.length || 0}
            selectedItem={selectedItem}
            validationIssues={flatValidationIssues}
            storageUsage={storageUsage}
            onOpenQC={qcDashboard.open}
            saveStatus={saveStatus}
            quickHelpOpen={showQuickRef}
            onToggleQuickHelp={() => setShowQuickRef(prev => !prev)}
            onOpenKeyboardShortcuts={keyboardShortcuts.open}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            lastActionLabel={lastActionType ? ACTION_LABELS[lastActionType] || null : null}
            isOnline={isOnline}
            activityCount={activityCount}
            onOpenActivityFeed={() => setShowActivityFeed(prev => !prev)}
            storageDetail={storageDetail}
          />
        </div>
      )}

      {/* Modals & Dialogs */}
      {stagingTree && (
        <StagingWorkbench
          initialTree={stagingTree}
          existingRoot={root}
          onIngest={async (t, m, p) => {
            const { root: r } = await ingestTree(t, m ? root : null, p);
            handleUpdateRoot(r!);
            // Don't call setStagingTree(null) here — the StagingWorkbench
            // closes itself via onCancel after showing the completion summary.
          }}
          onCancel={() => setStagingTree(null)}
        />
      )}

      {exportDialog.isOpen && root && (
        <React.Suspense fallback={null}>
          <ExportDialog root={root} onClose={exportDialog.close} />
        </React.Suspense>
      )}

      {qcDashboard.isOpen && (
        <QCDashboard
          root={root}
          onUpdate={handleUpdateRoot}
          issuesMap={validationIssuesMap}
          totalItems={root?.items?.length || 0}
          onSelect={(id) => handleReveal(id, 'archive')}
          onClose={qcDashboard.close}
        />
      )}

      {onboardingModal.isOpen && <OnboardingModal onComplete={handleOnboardingComplete} />}

      {externalImport.isOpen && (
        <ExternalImportDialog
          onImport={(it) => handleUpdateRoot(root && isCollection(root) ? { ...root, items: [...(root.items || []), it] } as any : it as any)}
          onClose={externalImport.close}
          onAuthRequired={handleAuthRequired}
        />
      )}

      {batchEditor.isOpen && root && (
        <BatchEditor
          ids={batchIds}
          root={root}
          onApply={handleBatchApply}
          onRollback={handleBatchRollback}
          onClose={batchEditor.close}
        />
      )}

      {personaSettings.isOpen && (
        <PersonaSettings
          settings={settings}
          onUpdate={updateSettings}
          onClose={personaSettings.close}
        />
      )}

      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        commands={commands}
      />

      <KeyboardShortcutsOverlay
        isOpen={keyboardShortcuts.isOpen}
        onClose={keyboardShortcuts.close}
        currentContext={currentMode as any}
      />

      <QuickReference
        title={
          currentMode === 'archive' ? 'Archive View' :
          currentMode === 'collections' ? 'Staging/Import' :
          currentMode === 'viewer' ? 'Viewer' :
          currentMode === 'boards' ? 'Board View' :
          'Metadata View'
        }
        items={
          currentMode === 'archive' ? QUICK_REF_ARCHIVE :
          currentMode === 'collections' ? QUICK_REF_STAGING :
          currentMode === 'viewer' ? QUICK_REF_VIEWER :
          currentMode === 'boards' ? QUICK_REF_BOARD :
          QUICK_REF_METADATA
        }
        isOpen={showQuickRef}
        onToggle={() => setShowQuickRef(prev => !prev)}
      />

      {authDialog.isOpen && pendingAuth && (
        <AuthDialog
          authServices={pendingAuth.authServices}
          resourceId={pendingAuth.resourceId}
          onComplete={handleAuthComplete}
          onClose={handleAuthClose}
        />
      )}

      {/* Storage Full Dialog */}
      <StorageFullDialog
        isOpen={storageFullDialog.isOpen}
        onClose={storageFullDialog.close}
        onExport={() => {
          storageFullDialog.close();
          exportDialog.open();
        }}
      />
    </div>
  );
};

// ============================================================================
// App Wrapper with Providers
// ============================================================================

// NEW: Use consolidated AppProviders from src/app/providers (Phase 3)
// This centralizes all context providers in one place per FSD architecture
import { AppProviders } from '@/src/app/providers';

const App: React.FC = () => (
  <AppProviders>
    <MainApp />
  </AppProviders>
);

export default App;
