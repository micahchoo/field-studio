
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

const MainApp: React.FC = () => {
  const [root, setRoot] = useState<IIIFItem | null>(null);
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
      metadataTemplate: METADATA_TEMPLATES.ARCHIVIST
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

  const handleUpdateRoot = (newRoot: IIIFItem) => {
      setRoot(newRoot);
      setSaveStatus('saving');
      storage.saveProject(newRoot)
        .then(() => { setSaveStatus('saved'); checkStorage(); })
        .catch(() => { setSaveStatus('error'); showToast("Failed to save project!", 'error'); });
  };

  useEffect(() => {
      storage.loadProject().then(async (proj) => { 
        if (proj) setRoot(proj); 
        const params = new URLSearchParams(window.location.search);
        const encodedState = params.get('iiif-content');
        if (encodedState) {
            const state = contentStateService.decode(encodedState);
            if (state) {
                const targetId = state.id || (state.target && state.target.id);
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
  }, []);

  useEffect(() => {
      const interval = setInterval(() => {
          if (root && saveStatus === 'saved') {
              storage.saveProject(root);
          }
      }, settings.autoSaveInterval * 1000);
      return () => clearInterval(interval);
  }, [root, settings.autoSaveInterval, saveStatus]);

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

  const handleItemUpdate = (updates: Partial<IIIFItem>) => {
    if (!root || !selectedId) return;
    const newRoot = JSON.parse(JSON.stringify(root));
    const target = findItem(newRoot, selectedId);
    if (target) {
      Object.assign(target, updates);
      handleUpdateRoot(newRoot);
    }
  };

  useEffect(() => {
      if (root) setValidationIssuesMap(validator.validateTree(root));
  }, [root]);

  const selectedItem = selectedId ? findItem(root, selectedId) : null;

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans ${settings.theme === 'dark' ? 'dark text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-100'}`}>
      <div className="flex-1 flex min-h-0 relative">
        {/* Mobile Header Affordance */}
        {isMobile && (
            <div className="absolute top-0 left-0 right-0 h-14 bg-slate-900 z-[100] flex items-center px-4 justify-between shadow-lg">
                <button onClick={() => setShowSidebar(true)} className="text-white p-2"><Icon name="menu"/></button>
                <div className="text-yellow-400 font-black tracking-tighter uppercase text-xs">Field Studio</div>
                <button onClick={() => selectedItem && setShowInspector(true)} className={`text-white p-2 ${!selectedItem ? 'opacity-20' : ''}`}><Icon name="info"/></button>
            </div>
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
        
        <main className={`flex-1 flex flex-col min-w-0 relative shadow-xl z-0 ${settings.fieldMode ? 'bg-black' : 'bg-white'} ${isMobile ? 'pt-14' : ''}`}>
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
          const newRoot = JSON.parse(JSON.stringify(root));
          ids.forEach((id, idx) => {
              const target = findItem(newRoot, id);
              if (target) {
                  Object.assign(target, updatesMap[id]);
                  if (ren) {
                      const oldLabel = getIIIFValue(target.label);
                      target.label = { none: [ren.replace('{orig}', oldLabel).replace('{nnn}', (idx+1).toString().padStart(3, '0'))] };
                  }
              }
          });
          handleUpdateRoot(newRoot);
      }} onClose={() => setShowBatchEditor(false)} />}
      
      {showPersonaSettings && <PersonaSettings settings={settings} onUpdate={upd => setSettings(s => ({ ...s, ...upd }))} onClose={() => setShowPersonaSettings(false)} />}
    </div>
  );
};

const App: React.FC = () => (
    <ToastProvider><MainApp /></ToastProvider>
);

export default App;
