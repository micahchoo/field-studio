
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IIIFItem, IIIFCanvas, FileTree, AppMode, ViewType, getIIIFValue, IIIFAnnotation, isCanvas } from './types';
import { METADATA_TEMPLATES } from './constants';
import { Sidebar } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { StatusBar } from './components/StatusBar';
import { StagingWorkbench } from './components/staging/StagingWorkbench';
import { ExportDialog } from './components/ExportDialog';
import { ContextualHelp } from './components/ContextualHelp';
import { QuickReference } from './components/Tooltip';
import { QUICK_REF_ARCHIVE, QUICK_REF_STRUCTURE, QUICK_REF_VIEWER, QUICK_REF_BOARD, QUICK_REF_METADATA } from './constants/helpContent';
import { QCDashboard } from './components/QCDashboard';
import { OnboardingModal } from './components/OnboardingModal';
import { ExternalImportDialog } from './components/ExternalImportDialog';
import { BatchEditor } from './components/BatchEditor';
import { PersonaSettings } from './components/PersonaSettings';
import { CommandPalette } from './components/CommandPalette';
import { AuthDialog } from './components/AuthDialog';
import { Icon } from './components/Icon';
import { ViewRouter } from './components/ViewRouter';
import { buildTree, ingestTree } from './services/iiifBuilder';
import { AuthService, AuthState } from './services/authService';
import { storage } from './services/storage';
import { validator, ValidationIssue } from './services/validator';
import { contentStateService } from './services/contentState';
import { VaultProvider, useUndoRedoShortcuts, useVault, useBulkOperations } from './hooks/useIIIFEntity';
import { actions } from './services/actions';

// Custom hooks for cleaner state management
import { useResponsive } from './hooks/useResponsive';
import { useAppSettings } from './hooks/useAppSettings';
import { useDialogState } from './hooks/useDialogState';

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
  const root = useMemo(() => exportRoot(), [state]);

  // ---- Custom Hooks ----
  const { isMobile, isTablet } = useResponsive();
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
  const authDialog = useDialogState();

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
      // Quick help - ? key (Shift+/)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if user is typing in an input
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          setShowQuickRef(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPalette]);

  // ============================================================================
  // Command Palette Commands
  // ============================================================================

  const commands = useMemo(() => [
    { id: 'archive', label: 'Go to Archive', icon: 'inventory_2', shortcut: '⌘1', action: () => setCurrentMode('archive'), section: 'Navigation' as const },
    { id: 'collections', label: 'Go to Collections', icon: 'folder_special', shortcut: '⌘2', action: () => setCurrentMode('collections'), section: 'Navigation' as const },
    { id: 'metadata', label: 'Go to Metadata', icon: 'table_chart', shortcut: '⌘3', action: () => setCurrentMode('metadata'), section: 'Navigation' as const },
    { id: 'search', label: 'Go to Search', icon: 'search', shortcut: '⌘4', action: () => setCurrentMode('search'), section: 'Navigation' as const },
    { id: 'export', label: 'Export Archive', icon: 'download', shortcut: '⌘E', action: exportDialog.open, section: 'Actions' as const },
    { id: 'import', label: 'Import External IIIF', icon: 'cloud_download', action: externalImport.open, section: 'Actions' as const },
    { id: 'settings', label: 'Open Settings', icon: 'settings', shortcut: '⌘,', action: personaSettings.open, section: 'Actions' as const },
    { id: 'qc', label: 'Quality Control Dashboard', icon: 'fact_check', action: qcDashboard.open, section: 'Actions' as const },
    { id: 'fieldmode', label: 'Toggle Field Mode', icon: 'contrast', action: toggleFieldMode, section: 'View' as const },
    { id: 'sidebar', label: 'Toggle Sidebar', icon: 'side_navigation', action: () => setShowSidebar(s => !s), section: 'View' as const },
    { id: 'inspector', label: 'Toggle Inspector', icon: 'info', action: () => setShowInspector(s => !s), section: 'View' as const },
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
      } else if (warning.type === 'quota_warning') {
        showToastRef.current(warning.message, 'info');
      }
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
    if (mode !== 'viewer') setShowInspector(true);
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
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans ${settings.theme === 'dark' ? 'dark text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-100'}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[2000] focus:bg-iiif-blue focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold">
        Skip to content
      </a>

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
          fieldMode={settings.fieldMode}
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
        />

        <main id="main-content" className={`flex-1 flex flex-col min-w-0 relative shadow-xl z-0 ${settings.fieldMode ? 'bg-black' : 'bg-white'} ${isMobile ? 'pt-14' : ''}`}>
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
          onImport={(it) => handleUpdateRoot(root?.type === 'Collection' ? { ...root, items: [...(root.items || []), it] } as any : it as any)}
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

      <QuickReference
        title={currentMode === 'archive' ? 'Archive View' : currentMode === 'collections' ? 'Structure View' : currentMode === 'viewer' ? 'Viewer' : 'Board View'}
        items={
          currentMode === 'archive' ? QUICK_REF_ARCHIVE :
          currentMode === 'collections' ? QUICK_REF_STRUCTURE :
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
    </div>
  );
};

// ============================================================================
// App Wrapper with Providers
// ============================================================================

const App: React.FC = () => (
  <VaultProvider>
    <ToastProvider>
      <ErrorBoundary>
        <MainApp />
      </ErrorBoundary>
    </ToastProvider>
  </VaultProvider>
);

export default App;
