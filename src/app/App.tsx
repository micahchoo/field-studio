
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type AbstractionLevel, type AppMode, type FileTree, getIIIFValue, type IIIFItem, isCanvas, isCollection, type ViewType } from '@/src/shared/types';
import { ToastProvider, useToast } from '@/src/shared/ui/molecules/Toast';
import { ErrorBoundary } from '@/src/shared/ui/molecules/ErrorBoundary';
import { METADATA_TEMPLATES } from '@/src/shared/constants';
import { Sidebar } from '@/src/widgets/NavigationSidebar/ui/organisms/Sidebar';
import { Inspector } from '@/src/features/metadata-edit/ui/organisms/Inspector';
import { StatusBar } from '@/src/widgets/StatusBar/ui/organisms/StatusBar';
import { StagingWorkbench } from '@/src/features/staging/ui/organisms/StagingWorkbench';
import { ExportDialog } from '@/src/features/export/ui/ExportDialog';
import { ContextualHelp } from '@/src/widgets/ContextualHelp/ui/ContextualHelp';
import { QuickReference } from '@/src/shared/ui/molecules/Tooltip';
import { QUICK_REF_ARCHIVE, QUICK_REF_BOARD, QUICK_REF_METADATA, QUICK_REF_STRUCTURE, QUICK_REF_VIEWER, QUICK_REF_STAGING } from '@/src/shared/constants/helpContent';
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
import { ValidationIssue, validator } from '@/src/entities/manifest/model/validation/validator';
import { contentStateService } from '@/src/shared/services/contentState';
import { useBulkOperations, useUndoRedoShortcuts, useVault, VaultProvider } from '@/src/entities/manifest/model/hooks/useIIIFEntity';
import { actions } from '@/src/entities/manifest/model/actions';
import { UserIntentProvider } from '@/src/app/providers/UserIntentProvider';
import { ResourceContextProvider } from '@/src/app/providers/ResourceContextProvider';

// Custom hooks for cleaner state management
import { useResponsive } from '@/src/shared/lib/hooks/useResponsive';
import { useAppSettings } from '@/src/app/providers/useAppSettings';
import { useDialogState } from '@/src/shared/lib/hooks/useDialogState';

// ============================================================================
// Types
// ============================================================================

interface PipelineContext {
  filterIds?: string[] | null;
  focusCoordinate?: { lat: number; lng: number } | null;
  preloadedManifest?: string | null;
}

// ============================================================================
// Main App Component
// ============================================================================

const MainApp: React.FC = () => {
  // ---- Vault State (normalized IIIF data) ----
  const { state, dispatch, loadRoot, exportRoot, rootId } = useVault();
  const { batchUpdate } = useBulkOperations();
  // Stabilize root reference - only re-export when rootId changes
  const root = useMemo(() => exportRoot(), [rootId]);

  // ---- Custom Hooks ----
  const { isMobile, isTablet: _isTablet } = useResponsive();
  const { settings, updateSettings, toggleFieldMode } = useAppSettings();
  const { showToast } = useToast();

  // ---- Dialog States (consolidated) ----
  const exportDialog = useDialogState();
  const qcDashboard = useDialogState();
  const onboardingModal = useDialogState(!localStorage.getItem('iiif-field-setup-complete'));
  const externalImport = useDialogState();
  const batchEditor = useDialogState();
  const personaSettings = useDialogState();
  const commandPalette = useDialogState();
  const keyboardShortcuts = useDialogState();
  const authDialog = useDialogState();
  const storageFullDialog = useDialogState();

  // ---- Panel States ----
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [showInspector, setShowInspector] = useState(false);

  // ---- Navigation State ----
  const [currentMode, setCurrentMode] = useState<AppMode>('archive');
  const [viewType, setViewType] = useState<ViewType>('iiif');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---- App State ----
  const [pendingAuth, setPendingAuth] = useState<{ resourceId: string; authServices: AuthService[] } | null>(null);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [stagingTree, setStagingTree] = useState<FileTree | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [pipelineContext, setPipelineContext] = useState<PipelineContext>({});
  const [validationIssuesMap, setValidationIssuesMap] = useState<Record<string, ValidationIssue[]>>({});
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [showQuickRef, setShowQuickRef] = useState(false);

  // ---- Refs for effect guards ----
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const initRef = useRef(false);
  const touchCheckRef = useRef(false);

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
    { id: 'structure', label: 'Go to Structure View', icon: 'account_tree', shortcut: '⌘3', onExecute: () => setCurrentMode('structure'), section: 'Navigation' as const, description: 'Hierarchical tree view' },
    { id: 'metadata', label: 'Go to Metadata', icon: 'table_chart', shortcut: '⌘3', onExecute: () => setCurrentMode('metadata'), section: 'Navigation' as const, description: 'Switch to Metadata spreadsheet view' },
    { id: 'search', label: 'Go to Search', icon: 'search', shortcut: '⌘4', onExecute: () => setCurrentMode('search'), section: 'Navigation' as const, description: 'Switch to Search view' },
    { id: 'export', label: 'Export Archive', icon: 'download', shortcut: '⌘E', onExecute: exportDialog.open, section: 'Actions' as const, description: 'Export archive to IIIF package' },
    { id: 'import', label: 'Import External IIIF', icon: 'cloud_download', onExecute: externalImport.open, section: 'Actions' as const, description: 'Import from external IIIF manifest or collection' },
    { id: 'settings', label: 'Open Settings', icon: 'settings', shortcut: '⌘,', onExecute: personaSettings.open, section: 'Actions' as const, description: 'Open application settings' },
    { id: 'qc', label: 'Quality Control Dashboard', icon: 'fact_check', onExecute: qcDashboard.open, section: 'Actions' as const, description: 'View and fix validation issues' },
    { id: 'fieldmode', label: 'Toggle Field Mode', icon: 'contrast', onExecute: toggleFieldMode, section: 'View' as const, description: 'Toggle high-contrast field mode' },
    { id: 'sidebar', label: 'Toggle Sidebar', icon: 'side_navigation', onExecute: () => setShowSidebar(s => !s), section: 'View' as const, description: 'Show or hide the sidebar' },
    { id: 'inspector', label: 'Toggle Inspector', icon: 'info', onExecute: () => setShowInspector(s => !s), section: 'View' as const, description: 'Show or hide the inspector panel' },
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

    storage.loadProject().then(async (proj) => {
      if (proj) loadRoot(proj);

      const viewport = contentStateService.parseFromUrl();
      if (viewport) {
        console.log('[App] Content State detected:', viewport);

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
          console.warn('[App] Content State canvas not found:', viewport.canvasId);
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

  // Auto-save interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (rootId && saveStatus === 'saved') {
        const currentRoot = exportRoot();
        if (currentRoot) storage.saveProject(currentRoot);
      }
    }, settings.autoSaveInterval * 1000);
    return () => clearInterval(interval);
  }, [rootId, exportRoot, settings.autoSaveInterval, saveStatus]);

  // Validation
  useEffect(() => {
    if (root) setValidationIssuesMap(validator.validateTree(root));
  }, [root]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const checkStorage = async () => {
    const est = await storage.getEstimate();
    setStorageUsage(est);
  };

  const handleUpdateRoot = useCallback((newRoot: IIIFItem) => {
    loadRoot(newRoot);
    setSaveStatus('saving');
    storage.saveProject(newRoot)
      .then(() => { setSaveStatus('saved'); checkStorage(); })
      .catch(() => { setSaveStatus('error'); showToast("Failed to save project!", 'error'); });
  }, [loadRoot, showToast]);

  const findItem = useCallback((node: IIIFItem | null, id: string): IIIFItem | null => {
    if (!node) return null;
    if (node.id === id) return node;
    const children = (node as any).items || (node as any).annotations || [];
    for (const child of children) {
      const found = findItem(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  const handleItemUpdate = useCallback((updates: Partial<IIIFItem>) => {
    if (!selectedId) return;
    const success = dispatch(actions.batchUpdate([{ id: selectedId, changes: updates }]));
    if (success) {
      setSaveStatus('saving');
      const updatedRoot = exportRoot();
      if (updatedRoot) {
        storage.saveProject(updatedRoot)
          .then(() => { setSaveStatus('saved'); checkStorage(); })
          .catch(() => { setSaveStatus('error'); showToast("Failed to save project!", 'error'); });
      }
    }
  }, [selectedId, dispatch, exportRoot, showToast]);

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

  const handleAuthRequired = useCallback((resourceId: string, authServices: AuthService[]) => {
    setPendingAuth({ resourceId, authServices });
    authDialog.open();
  }, [authDialog]);

  const handleAuthComplete = useCallback((state: AuthState) => {
    if (state.status === 'authenticated') {
      showToast('Authentication successful. Please retry your request.', 'success');
    } else if (state.status === 'degraded') {
      showToast('Limited access granted. Some content may be unavailable.', 'info');
    }
    authDialog.close();
    setPendingAuth(null);
  }, [showToast, authDialog]);

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
      setSaveStatus('saving');
      const updatedRoot = exportRoot();
      if (updatedRoot) {
        storage.saveProject(updatedRoot)
          .then(() => { setSaveStatus('saved'); checkStorage(); })
          .catch(() => { setSaveStatus('error'); showToast("Failed to save project!", 'error'); });
      }
    }
  }, [root, findItem, batchUpdate, exportRoot, showToast]);

  const handleBatchRollback = useCallback((restoredRoot: IIIFItem) => {
    loadRoot(restoredRoot);
    setSaveStatus('saving');
    storage.saveProject(restoredRoot)
      .then(() => { setSaveStatus('saved'); checkStorage(); })
      .catch(() => { setSaveStatus('error'); showToast("Failed to save rollback!", 'error'); });
  }, [loadRoot, showToast]);

  // ============================================================================
  // Derived State
  // ============================================================================

  const selectedItem = selectedId ? findItem(root, selectedId) : null;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${settings.fieldMode ? 'bg-black text-white' : settings.theme === 'dark' ? 'dark text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-50'}`}>
      {/* Skip Links for Accessibility */}
      <SkipLink targetId="main-content" label="Skip to main content" />
      <SkipLink targetId="sidebar" label="Skip to sidebar navigation" position="top-left" className="mt-14" />
      <SkipLink targetId="command-palette-trigger" label="Skip to Command Palette" shortcut="⌘K" position="top-left" className="mt-24" />

      {/* Saving Indicator */}
      <div className={`fixed top-4 right-4 z-[2000] pointer-events-none transition-all duration-300 ${saveStatus === 'saving' ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
        <div className="bg-white/90 backdrop-blur shadow-lg border border-slate-200 rounded-full px-3 py-1.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-iiif-blue animate-pulse" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Saving...</span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        {/* Mobile Header */}
        {isMobile && (
          <header className="absolute top-0 left-0 right-0 h-14 bg-slate-900 z-[100] flex items-center px-4 justify-between shadow-lg">
            <button onClick={() => setShowSidebar(true)} aria-label="Open sidebar" className="text-white p-2">
              <Icon name="menu" />
            </button>
            <div className="text-yellow-400 font-black tracking-tighter uppercase text-xs">Field Studio</div>
            <button onClick={() => selectedItem && setShowInspector(true)} aria-label="Open inspector" className={`text-white p-2 ${!selectedItem ? 'opacity-20' : ''}`}>
              <Icon name="info" />
            </button>
          </header>
        )}

        <Sidebar
          root={root}
          selectedId={selectedId}
          currentMode={currentMode}
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
          onModeChange={(m) => { setCurrentMode(m); if (isMobile) setShowSidebar(false); }}
          onViewTypeChange={setViewType}
          onImport={(e) => e.target.files && setStagingTree(buildTree(Array.from(e.target.files)))}
          onExportTrigger={exportDialog.open}
          onToggleFieldMode={toggleFieldMode}
          onOpenExternalImport={externalImport.open}
          onStructureUpdate={handleUpdateRoot}
          onOpenSettings={personaSettings.open}
          onToggleQuickHelp={() => setShowQuickRef(prev => !prev)}
          onAbstractionLevelChange={handleAbstractionLevelChange}
        />

        <main id="main-content" className={`flex-1 flex flex-col min-w-0 relative shadow-xl z-0 ${settings.fieldMode ? 'bg-black' : 'bg-white'} ${isMobile ? 'pt-14' : ''} transition-colors duration-300`}>
          <ViewRouter
            currentMode={currentMode}
            root={root}
            selectedItem={selectedItem}
            selectedId={selectedId}
            validationIssuesMap={validationIssuesMap}
            fieldMode={settings.fieldMode}
            abstractionLevel={settings.abstractionLevel}
            isMobile={isMobile}
            filterIds={pipelineContext.filterIds}
            preloadedManifest={pipelineContext.preloadedManifest}
            onUpdateRoot={handleUpdateRoot}
            onUpdateItem={handleItemUpdate}
            onSelect={(item) => { setSelectedId(item.id); if (!isMobile) setShowInspector(true); }}
            onSelectId={setSelectedId}
            onOpenItem={(item) => { setSelectedId(item.id); setCurrentMode('viewer'); }}
            onBatchEdit={(ids) => { setBatchIds(ids); batchEditor.open(); }}
            onReveal={handleReveal}
            onSynthesize={handleManifestSynthesis}
            onCatalogSelection={handleArchiveCatalog}
            onClearFilter={() => setPipelineContext(ctx => ({ ...ctx, filterIds: null }))}
            onComposerOpened={() => setPipelineContext(ctx => ({ ...ctx, preloadedManifest: null }))}
            onModeChange={setCurrentMode}
            onShowInspector={() => setShowInspector(true)}
            settings={settings}
          />
          <ContextualHelp mode={currentMode} isInspectorOpen={showInspector && !!selectedItem && !settings.fieldMode} />
        </main>

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
        />
      </div>

      {!isMobile && (
        <StatusBar
          totalItems={root?.items?.length || 0}
          selectedItem={selectedItem}
          validationIssues={Object.values(validationIssuesMap).flat()}
          storageUsage={storageUsage}
          onOpenQC={qcDashboard.open}
          saveStatus={saveStatus}
        />
      )}

      {/* Modals & Dialogs */}
      {stagingTree && (
        <StagingWorkbench
          initialTree={stagingTree}
          existingRoot={root}
          onIngest={async (t, m, p) => {
            const { root: r } = await ingestTree(t, m ? root : null, p);
            handleUpdateRoot(r!);
            setStagingTree(null);
          }}
          onCancel={() => setStagingTree(null)}
        />
      )}

      {exportDialog.isOpen && root && <ExportDialog root={root} onClose={exportDialog.close} />}

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
          currentMode === 'structure' ? 'Structure View' :
          currentMode === 'viewer' ? 'Viewer' :
          currentMode === 'boards' ? 'Board View' :
          'Metadata View'
        }
        items={
          currentMode === 'archive' ? QUICK_REF_ARCHIVE :
          currentMode === 'collections' ? QUICK_REF_STAGING :
          currentMode === 'structure' ? QUICK_REF_STRUCTURE :
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
