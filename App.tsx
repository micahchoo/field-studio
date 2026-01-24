
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import { IIIFItem, IIIFCanvas, FileTree, AppSettings, AppMode, ViewType, AbstractionLevel, IIIFCollection, getIIIFValue } from './types';
import { CONSTANTS, DEFAULT_INGEST_PREFS, DEFAULT_MAP_CONFIG, DEFAULT_ZOOM_CONFIG, METADATA_TEMPLATES } from './constants';
import { Sidebar } from './components/Sidebar';
import { ArchiveView } from './components/views/ArchiveView';
import { BoardView } from './components/views/BoardView';
import { Viewer } from './components/views/Viewer';
import { CollectionsView } from './components/views/CollectionsView';
import { SearchView } from './components/views/SearchView';
import { MetadataSpreadsheet } from './components/views/MetadataSpreadsheet';
import { Inspector } from './components/Inspector';
import { StatusBar } from './components/StatusBar';
import { StagingArea } from './components/StagingArea';
import { ExportDialog } from './components/ExportDialog';
import { ContextualHelp } from './components/ContextualHelp';
import { QCDashboard } from './components/QCDashboard';
import { OnboardingModal } from './components/OnboardingModal';
import { ExternalImportDialog } from './components/ExternalImportDialog';
import { BatchEditor } from './components/BatchEditor';
import { PersonaSettings } from './components/PersonaSettings';
import { Icon } from './components/Icon';
import { buildTree, ingestTree } from './services/iiifBuilder';
import { storage } from './services/storage';
import { validator, ValidationIssue } from './services/validator';
import { contentStateService } from './services/contentState';
import { VaultProvider, useUndoRedoShortcuts, useHistory, useVault, useRoot, useBulkOperations } from './hooks/useIIIFEntity';
import { actions } from './services/actions';

const MainApp: React.FC = () => {
  // Vault state (normalized) - replaces deep-clone pattern
  const { state, dispatch, loadRoot, exportRoot, rootId } = useVault();
  const { batchUpdate } = useBulkOperations();

  // Derive root from vault for compatibility with existing code
  // Memoize root to prevent infinite loops since exportRoot() returns new references
  const root = useMemo(() => exportRoot(), [state]);

  // Legacy setRoot bridge - calls loadRoot to normalize into vault
  const setRoot = useCallback((newRoot: IIIFItem | null) => {
    if (newRoot) {
      loadRoot(newRoot);
    }
  }, [loadRoot]);
  const [currentMode, setCurrentMode] = useState<AppMode>('archive');
  const [viewType, setViewType] = useState<ViewType>('iiif');
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 1024);
  const [showInspector, setShowInspector] = useState(false);
  const [showQCDashboard, setShowQCDashboard] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExternalImport, setShowExternalImport] = useState(false);
  const [showBatchEditor, setShowBatchEditor] = useState(false);
  const [showPersonaSettings, setShowPersonaSettings] = useState(false);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stagingTree, setStagingTree] = useState<FileTree | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth <= 1024;

  // Enable undo/redo keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
  useUndoRedoShortcuts();

  // Responsive listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pipeline State: Shared context for altruistic transitions
  const [pipelineContext, setPipelineContext] = useState<{
    filterIds?: string[] | null;
    focusCoordinate?: { lat: number; lng: number } | null;
    preloadedManifest?: string | null;
  }>({});

  const [settings, setSettings] = useState<AppSettings>({
      defaultBaseUrl: 'http://localhost',
      language: 'en',
      theme: 'light',
      fieldMode: false,
      abstractionLevel: 'standard',
      mapConfig: DEFAULT_MAP_CONFIG,
      zoomConfig: DEFAULT_ZOOM_CONFIG,
      height: 800,
      ingestPreferences: DEFAULT_INGEST_PREFS,
      autoSaveInterval: 30,
      showTechnicalIds: false,
      metadataTemplate: METADATA_TEMPLATES.ARCHIVIST,
      metadataComplexity: 'standard'
  });

  const [validationIssuesMap, setValidationIssuesMap] = useState<Record<string, ValidationIssue[]>>({});
  const [storageUsage, setStorageUsage] = useState<{usage: number, quota: number} | null>(null);

  const { showToast } = useToast();

  // Altruism: Auto-detect field conditions (Touch/Small screen)
  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (hasTouch && !settings.fieldMode && !localStorage.getItem('iiif-field-mode-prompted')) {
        showToast("Touch device detected. Field Mode activated for tactile archiving.", "info");
        setSettings(s => ({ ...s, fieldMode: true }));
        localStorage.setItem('iiif-field-mode-prompted', 'true');
    }
  }, []);

  const handleUpdateRoot = useCallback((newRoot: IIIFItem) => {
      // Load into vault (normalizes state)
      loadRoot(newRoot);
      // Save to storage
      setSaveStatus('saving');
      storage.saveProject(newRoot)
        .then(() => { setSaveStatus('saved'); checkStorage(); })
        .catch(() => { setSaveStatus('error'); showToast("Failed to save project!", 'error'); });
  }, [loadRoot, showToast]);

  useEffect(() => {
      storage.loadProject().then(async (proj) => {
        if (proj) loadRoot(proj); // Load into vault
        const params = new URLSearchParams(window.location.search);
        const encodedState = params.get('iiif-content');
        if (encodedState) {
            const contentState = contentStateService.decode(encodedState);
            if (contentState) {
                const target = contentState.target;
                const targetId = contentState.id || (target && typeof target !== 'string' && !Array.isArray(target) ? target.source && typeof target.source === 'object' ? (target.source as any).id : target.source : typeof target === 'string' ? target : null);
                if (targetId) {
                  setSelectedId(targetId);
                  setCurrentMode('viewer');
                }
            }
        }
      });
      if (!localStorage.getItem('iiif-field-setup-complete')) { setShowOnboarding(true); }
      checkStorage();
      const interval = setInterval(checkStorage, 30000);
      return () => clearInterval(interval);
  }, [loadRoot]);

  useEffect(() => {
      const interval = setInterval(() => {
          if (rootId && saveStatus === 'saved') {
              const currentRoot = exportRoot();
              if (currentRoot) storage.saveProject(currentRoot);
          }
      }, settings.autoSaveInterval * 1000);
      return () => clearInterval(interval);
  }, [rootId, exportRoot, settings.autoSaveInterval, saveStatus]);

  const checkStorage = async () => {
      const est = await storage.getEstimate();
      setStorageUsage(est);
  };

  const handleArchiveCatalog = (ids: string[]) => {
      setPipelineContext({ ...pipelineContext, filterIds: ids });
      setCurrentMode('metadata');
      if (isMobile) setShowSidebar(false);
      showToast(`Anticipating cataloging for ${ids.length} items`, "info");
  };

  const handleManifestSynthesis = (manifestId: string) => {
      setSelectedId(manifestId);
      setPipelineContext({ ...pipelineContext, preloadedManifest: manifestId });
      setCurrentMode('viewer');
  };

  const handleReveal = (id: string, mode: AppMode) => {
      setSelectedId(id);
      setCurrentMode(mode);
      if (mode !== 'viewer') setShowInspector(true);
      if (isMobile) {
          setShowSidebar(false);
          if (mode === 'viewer') setShowInspector(false);
      }
      if (mode !== 'metadata') setPipelineContext({ ...pipelineContext, filterIds: null });
  };

  const findItem = useCallback((node: IIIFItem | null, id: string): IIIFItem | any | null => {
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
    // Use vault dispatch instead of deep clone
    const success = dispatch(actions.batchUpdate([{ id: selectedId, changes: updates }]));
    if (success) {
      // Trigger save after vault update
      setSaveStatus('saving');
      const updatedRoot = exportRoot();
      if (updatedRoot) {
        storage.saveProject(updatedRoot)
          .then(() => { setSaveStatus('saved'); checkStorage(); })
          .catch(() => { setSaveStatus('error'); showToast("Failed to save project!", 'error'); });
      }
    }
  }, [selectedId, dispatch, exportRoot, showToast]);

  useEffect(() => {
      if (root) setValidationIssuesMap(validator.validateTree(root));
  }, [root]);

  const selectedItem = selectedId ? findItem(root, selectedId) : null;

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans ${settings.theme === 'dark' ? 'dark text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-100'}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[2000] focus:bg-iiif-blue focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold">Skip to content</a>
      
      {/* Global Saving Indicator - Snappy Feedback */}
      <div className={`fixed top-4 right-4 z-[2000] pointer-events-none transition-all duration-300 ${saveStatus === 'saving' ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
        <div className="bg-white/90 backdrop-blur shadow-lg border border-slate-200 rounded-full px-3 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-iiif-blue animate-pulse"/>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Saving...</span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        {/* Mobile Header Affordance */}
        {isMobile && (
            <header className="absolute top-0 left-0 right-0 h-14 bg-slate-900 z-[100] flex items-center px-4 justify-between shadow-lg">
                <button onClick={() => setShowSidebar(true)} aria-label="Open sidebar" className="text-white p-2"><Icon name="menu"/></button>
                <div className="text-yellow-400 font-black tracking-tighter uppercase text-xs">Field Studio</div>
                <button onClick={() => selectedItem && setShowInspector(true)} aria-label="Open inspector" className={`text-white p-2 ${!selectedItem ? 'opacity-20' : ''}`}><Icon name="info"/></button>
            </header>
        )}

        <Sidebar 
            root={root} selectedId={selectedId} currentMode={currentMode} viewType={viewType} fieldMode={settings.fieldMode} 
            visible={showSidebar} isMobile={isMobile}
            onSelect={(id) => { 
                setSelectedId(id); 
                if (!isMobile) setShowInspector(true); 
                if (isMobile) setShowSidebar(false);
            }}
            onClose={() => setShowSidebar(false)}
            onModeChange={(m) => { setCurrentMode(m); if (isMobile) setShowSidebar(false); }} 
            onViewTypeChange={setViewType} 
            onImport={(e) => e.target.files && setStagingTree(buildTree(Array.from(e.target.files)))} 
            onExportTrigger={() => setShowExport(true)}
            onToggleFieldMode={() => setSettings(s => ({ ...s, fieldMode: !s.fieldMode }))} 
            onOpenExternalImport={() => setShowExternalImport(true)}
            onStructureUpdate={handleUpdateRoot}
            onOpenSettings={() => setShowPersonaSettings(true)}
        />
        
        <main id="main-content" className={`flex-1 flex flex-col min-w-0 relative shadow-xl z-0 ${settings.fieldMode ? 'bg-black' : 'bg-white'} ${isMobile ? 'pt-14' : ''}`}>
            {currentMode === 'archive' && (
              <ArchiveView 
                root={root} onUpdate={handleUpdateRoot} 
                onSelect={(item) => { setSelectedId(item.id); if (!isMobile) setShowInspector(true); }} 
                onOpen={(item) => { setSelectedId(item.id); setCurrentMode('viewer'); }} 
                onBatchEdit={(ids) => { setBatchIds(ids); setShowBatchEditor(true); }} 
                validationIssues={validationIssuesMap} fieldMode={settings.fieldMode} 
                onReveal={(id, mode) => handleReveal(id, mode as AppMode)}
                onCatalogSelection={handleArchiveCatalog}
              />
            )}
            {currentMode === 'collections' && <CollectionsView root={root} onUpdate={handleUpdateRoot} abstractionLevel={settings.abstractionLevel} onReveal={(id, mode) => handleReveal(id, mode as AppMode)} onSynthesize={handleManifestSynthesis} />}
            {currentMode === 'metadata' && <MetadataSpreadsheet root={root} onUpdate={handleUpdateRoot} filterIds={pipelineContext.filterIds} onClearFilter={() => setPipelineContext({...pipelineContext, filterIds: null})} />}
            {currentMode === 'boards' && <BoardView root={root} />}
            {currentMode === 'viewer' && <Viewer item={selectedItem?.type === 'Canvas' ? selectedItem : null} onUpdate={handleItemUpdate} autoOpenComposer={pipelineContext.preloadedManifest === selectedId} onComposerOpened={() => setPipelineContext({...pipelineContext, preloadedManifest: null})} />}
            {currentMode === 'search' && <SearchView root={root} onSelect={(id) => handleReveal(id, 'archive')} onRevealMap={(id) => { setSelectedId(id); handleReveal(id, 'archive'); }} />}
            
            <ContextualHelp mode={currentMode} isInspectorOpen={showInspector && !!selectedItem && !settings.fieldMode} />
        </main>

        <Inspector 
            resource={selectedItem} onUpdateResource={handleItemUpdate} settings={settings} 
            visible={showInspector && !!selectedId} isMobile={isMobile}
            onClose={() => { setShowInspector(false); setSelectedId(null); }} 
        />
      </div>
      
      {!isMobile && (
          <StatusBar totalItems={root?.items?.length || 0} selectedItem={selectedItem} validationIssues={Object.values(validationIssuesMap).flat()} storageUsage={storageUsage} onOpenQC={() => setShowQCDashboard(true)} saveStatus={saveStatus} />
      )}
      
      {stagingTree && <StagingArea initialTree={stagingTree} existingRoot={root} onIngest={async (t, m, p) => { const { root: r } = await ingestTree(t, m ? root : null, p); handleUpdateRoot(r!); setStagingTree(null); }} onCancel={() => setStagingTree(null)} />}
      {showExport && root && <ExportDialog root={root} onClose={() => setShowExport(false)} />}
      {showQCDashboard && <QCDashboard root={root} onUpdate={handleUpdateRoot} issuesMap={validationIssuesMap} totalItems={root?.items?.length || 0} onSelect={(id) => handleReveal(id, 'archive')} onClose={() => setShowQCDashboard(false)} />}
      {showOnboarding && <OnboardingModal onComplete={(lvl) => { 
          const template = lvl === 'simple' ? METADATA_TEMPLATES.RESEARCHER : lvl === 'standard' ? METADATA_TEMPLATES.ARCHIVIST : METADATA_TEMPLATES.DEVELOPER;
          setSettings(s => ({ ...s, abstractionLevel: lvl, fieldMode: lvl === 'simple', metadataTemplate: template })); 
          localStorage.setItem('iiif-field-setup-complete', 'true'); 
          setShowOnboarding(false); 
      }} />}
      {showExternalImport && <ExternalImportDialog onImport={(it) => handleUpdateRoot(root?.type === 'Collection' ? { ...root, items: [...(root.items || []), it] } as any : it as any)} onClose={() => setShowExternalImport(false)} />}
      
      {showBatchEditor && root && <BatchEditor ids={batchIds} root={root} onApply={(ids, updatesMap, ren) => {
          // Use vault batch update instead of deep clone
          const updates = ids.map((id, idx) => {
              const changes = { ...updatesMap[id] };
              if (ren) {
                  const target = findItem(root, id);
                  if (target) {
                      const oldLabel = getIIIFValue(target.label);
                      changes.label = { none: [ren.replace('{orig}', oldLabel).replace('{nnn}', (idx+1).toString().padStart(3, '0'))] };
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
      }} onClose={() => setShowBatchEditor(false)} />}
      
      {showPersonaSettings && <PersonaSettings settings={settings} onUpdate={upd => setSettings(s => ({ ...s, ...upd }))} onClose={() => setShowPersonaSettings(false)} />}
    </div>
  );
};

const App: React.FC = () => (
    <VaultProvider>
        <ToastProvider><MainApp /></ToastProvider>
    </VaultProvider>
);

export default App;
