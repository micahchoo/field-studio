
import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import { IIIFItem, IIIFCanvas, FileTree, AppSettings, AppMode, ViewType, AbstractionLevel } from './types';
import { CONSTANTS, DEFAULT_INGEST_PREFS, DEFAULT_MAP_CONFIG, DEFAULT_ZOOM_CONFIG } from './constants';
import { Sidebar } from './components/Sidebar';
import { ArchiveView } from './components/views/ArchiveView';
import { BoardView } from './components/views/BoardView';
import { Viewer } from './components/views/Viewer';
import { CollectionsView } from './components/views/CollectionsView';
import { SearchView } from './components/views/SearchView';
import { Inspector } from './components/Inspector';
import { StatusBar } from './components/StatusBar';
import { CommandPalette } from './components/CommandPalette';
import { StagingArea } from './components/StagingArea';
import { ExportDialog } from './components/ExportDialog';
import { ContextualHelp } from './components/ContextualHelp';
import { QCDashboard } from './components/QCDashboard';
import { OnboardingModal } from './components/OnboardingModal';
import { buildTree, ingestTree } from './services/iiifBuilder';
import { storage } from './services/storage';
import { validator, ValidationIssue } from './services/validator';
import { DEFAULT_AI_CONFIG } from './services/geminiService';

const MainApp: React.FC = () => {
  const [root, setRoot] = useState<IIIFItem | null>(null);
  const [currentMode, setCurrentMode] = useState<AppMode>('archive');
  const [viewType, setViewType] = useState<ViewType>('iiif');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQCDashboard, setShowQCDashboard] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stagingTree, setStagingTree] = useState<FileTree | null>(null);
  const [showExport, setShowExport] = useState(false);
  
  // Field Mode State
  const [fieldMode, setFieldMode] = useState(false);
  // Save State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  const [settings, setSettings] = useState<AppSettings>({
      defaultBaseUrl: 'http://localhost',
      language: 'en',
      aiConfig: DEFAULT_AI_CONFIG,
      theme: 'light',
      fieldMode: false,
      abstractionLevel: 'standard',
      mapConfig: DEFAULT_MAP_CONFIG,
      zoomConfig: DEFAULT_ZOOM_CONFIG,
      ingestPreferences: DEFAULT_INGEST_PREFS
  });

  // System State
  const [validationIssuesMap, setValidationIssuesMap] = useState<Record<string, ValidationIssue[]>>({});
  const [storageUsage, setStorageUsage] = useState<{usage: number, quota: number} | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
      storage.loadProject().then(proj => {
          if (proj) setRoot(proj);
      });
      
      // Check onboarding
      if (!localStorage.getItem('iiif-field-setup-complete')) {
          setShowOnboarding(true);
      } else {
          // Load settings if persisted (simplified here)
          const savedLevel = localStorage.getItem('iiif-abstraction-level');
          if (savedLevel) setSettings(s => ({ ...s, abstractionLevel: savedLevel as AbstractionLevel }));
      }

      // Initial storage check
      checkStorage();
      const interval = setInterval(checkStorage, 30000); // Check every 30s
      return () => clearInterval(interval);
  }, []);

  const checkStorage = async () => {
      const est = await storage.getEstimate();
      setStorageUsage(est);
  };

  const handleOnboardingComplete = (level: AbstractionLevel) => {
      setSettings(s => ({ ...s, abstractionLevel: level }));
      localStorage.setItem('iiif-field-setup-complete', 'true');
      localStorage.setItem('iiif-abstraction-level', level);
      setShowOnboarding(false);
      showToast(`Interface set to ${level} mode`, 'success');
  };

  // Content State API Handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contentState = params.get('iiif-content');
    if (contentState && root) {
      try {
        const decoded = atob(contentState);
        const state = JSON.parse(decoded);
        let targetId = '';
        if (state.id) targetId = state.id;
        else if (state.target) targetId = typeof state.target === 'string' ? state.target : state.target.id;
        
        if (targetId) {
            if (typeof state.target === 'object' && state.target.source) {
                 targetId = state.target.source;
                 if (typeof targetId === 'object') targetId = (targetId as any).id;
            }
            const item = findItem(root, targetId);
            if (item) {
                setSelectedId(targetId);
                showToast("Loaded content state", "success");
            }
        }
      } catch (e) {
        console.error("Invalid iiif-content", e);
      }
    }
  }, [root]); 

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
            if (e.key === 'k') {
                e.preventDefault();
                setShowCommandPalette(p => !p);
            } else if (e.key === 'b') {
                e.preventDefault();
                setShowSidebar(s => !s);
            } else if (e.key === 'i') {
                e.preventDefault();
                setShowInspector(i => !i);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpdateRoot = (newRoot: IIIFItem) => {
      setRoot(newRoot);
      setSaveStatus('saving');
      storage.saveProject(newRoot)
        .then(() => {
            setSaveStatus('saved');
            checkStorage();
        })
        .catch(e => {
            console.error(e);
            setSaveStatus('error');
            showToast("Failed to save project!", 'error');
        });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const tree = buildTree(files);
        setStagingTree(tree);
    }
  };

  const handleIngest = async (tree: FileTree, merge: boolean) => {
      try {
          const { root: newRoot, report } = await ingestTree(tree, merge ? root : null);
          setRoot(newRoot);
          setStagingTree(null);
          
          let msg = `Ingested ${report.filesProcessed} files.`;
          if (report.warnings.length > 0) msg += ` ${report.warnings.length} warnings.`;
          showToast(msg, report.warnings.length > 0 ? 'info' : 'success');
          checkStorage();
          // Trigger save immediately
          handleUpdateRoot(newRoot);
      } catch (e) {
          console.error(e);
          showToast('Ingest Failed', 'error');
      }
  };

  const findItem = useCallback((node: IIIFItem | null, id: string): IIIFItem | any | null => {
      if (!node) return null;
      if (node.id === id) return node;
      if (node.type === 'Canvas' && (node as IIIFCanvas).annotations) {
          for (const page of (node as IIIFCanvas).annotations!) {
              const foundAnno = page.items.find(a => a.id === id);
              if (foundAnno) return foundAnno;
          }
      }
      if (node.items) {
          for (const child of node.items) {
              const found = findItem(child, id);
              if (found) return found;
          }
      }
      return null;
  }, []);

  const findParentCanvas = useCallback((node: IIIFItem | null, annotationId: string): IIIFCanvas | null => {
      if (!node) return null;
      if (node.type === 'Canvas') {
          const canvas = node as IIIFCanvas;
          if (canvas.annotations?.some(page => page.items.some(a => a.id === annotationId))) {
              return canvas;
          }
      }
      if (node.items) {
          for (const child of node.items) {
              const found = findParentCanvas(child, annotationId);
              if (found) return found;
          }
      }
      return null;
  }, []);

  const selectedItem = selectedId ? findItem(root, selectedId) : null;

  // Run full tree validation when root changes
  useEffect(() => {
      if (root) {
          const map = validator.validateTree(root);
          setValidationIssuesMap(map);
      } else {
          setValidationIssuesMap({});
      }
  }, [root]);

  useEffect(() => {
    if (selectedItem) {
        if (selectedItem.type === 'Canvas') {
            setCurrentMode('viewer');
        } else if (selectedItem.type === 'Annotation') {
            setCurrentMode('viewer');
        }
    }
  }, [selectedItem]);

  const handleItemUpdate = (updatedItem: Partial<IIIFItem>) => {
      if (root && selectedId) {
          const newRoot = JSON.parse(JSON.stringify(root));
          const target = findItem(newRoot, selectedId);
          if (target) {
              Object.assign(target, updatedItem);
              handleUpdateRoot(newRoot);
          }
      }
  };

  const renderContent = () => {
    switch (currentMode) {
        case 'archive': return <ArchiveView root={root} onSelect={(item) => setSelectedId(item.id)} validationIssues={validationIssuesMap} fieldMode={fieldMode} />;
        case 'collections': return <CollectionsView root={root} onUpdate={handleUpdateRoot} abstractionLevel={settings.abstractionLevel} />;
        case 'boards': return <BoardView root={root} />;
        case 'viewer':
            let viewerItem = null;
            if (selectedItem?.type === 'Canvas') viewerItem = selectedItem as IIIFCanvas;
            else if (selectedItem?.type === 'Annotation' && root) viewerItem = findParentCanvas(root, selectedItem.id);
            return <Viewer item={viewerItem} onUpdate={(updatedCanvas) => {
                 if (viewerItem) {
                     const newRoot = JSON.parse(JSON.stringify(root));
                     const target = findItem(newRoot, viewerItem.id);
                     if (target) {
                         Object.assign(target, updatedCanvas);
                         handleUpdateRoot(newRoot);
                     }
                 }
            }} />;
        case 'search': return <SearchView root={root} onSelect={(id) => setSelectedId(id)} />;
        default: return null;
    }
  };

  const commands = [
      { id: 'goto-archive', label: 'Go to Archive', icon: 'inventory_2', section: 'Navigation', action: () => setCurrentMode('archive'), shortcut: 'Cmd+1' },
      { id: 'goto-collections', label: 'Go to Collections', icon: 'library_books', section: 'Navigation', action: () => setCurrentMode('collections'), shortcut: 'Cmd+2' },
      { id: 'goto-boards', label: 'Go to Boards', icon: 'dashboard', section: 'Navigation', action: () => setCurrentMode('boards'), shortcut: 'Cmd+3' },
      { id: 'goto-search', label: 'Search', icon: 'search', section: 'Navigation', action: () => setCurrentMode('search'), shortcut: 'Cmd+4' },
      { id: 'toggle-sidebar', label: 'Toggle Sidebar', icon: 'vertical_split', section: 'View', action: () => setShowSidebar(s => !s), shortcut: 'Cmd+B' },
      { id: 'toggle-inspector', label: 'Toggle Inspector', icon: 'info', section: 'View', action: () => setShowInspector(i => !i), shortcut: 'Cmd+I' },
      { id: 'toggle-fieldmode', label: 'Toggle Field Mode', icon: 'visibility', section: 'View', action: () => setFieldMode(f => !f) },
      { id: 'export', label: 'Export Archive', icon: 'archive', section: 'Actions', action: () => setShowExport(true) },
      { id: 'import', label: 'Import Files', icon: 'upload_file', section: 'Actions', action: () => document.querySelector<HTMLInputElement>('input[type="file"]')?.click() },
      { id: 'qc', label: 'QC Dashboard', icon: 'health_and_safety', section: 'Actions', action: () => setShowQCDashboard(true) },
  ] as any[];

  const totalItems = root ? 1 + (root.items?.length || 0) : 0; 
  const allIssues = Object.values(validationIssuesMap).flat();

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden font-sans ${fieldMode ? 'text-white bg-black' : 'text-slate-900 bg-slate-100'}`}>
      <div className="flex-1 flex min-h-0">
        <Sidebar 
            root={root}
            selectedId={selectedId}
            currentMode={currentMode}
            viewType={viewType}
            fieldMode={fieldMode}
            onSelect={(id) => { setSelectedId(id); if(currentMode === 'viewer') setCurrentMode('archive'); }}
            onModeChange={setCurrentMode}
            onViewTypeChange={setViewType}
            onImport={handleImport}
            onExportTrigger={() => setShowExport(true)}
            onToggleFieldMode={() => setFieldMode(!fieldMode)}
            visible={showSidebar}
        />
        <main className={`flex-1 flex flex-col min-w-0 relative shadow-xl z-0 ${fieldMode ? 'bg-black' : 'bg-white'}`}>
            {renderContent()}
            <ContextualHelp mode={currentMode} />
        </main>
        {!fieldMode && (
            <Inspector 
                resource={selectedItem} 
                onUpdateResource={handleItemUpdate}
                settings={settings}
                visible={showInspector}
                onClose={() => setShowInspector(false)}
            />
        )}
      </div>
      <StatusBar 
        totalItems={totalItems} 
        selectedItem={selectedItem}
        validationIssues={allIssues}
        storageUsage={storageUsage}
        onOpenQC={() => setShowQCDashboard(true)}
        saveStatus={saveStatus}
      />
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
        commands={commands} 
      />
      {stagingTree && <StagingArea initialTree={stagingTree} existingRoot={root} onIngest={handleIngest} onCancel={() => setStagingTree(null)} />}
      {showExport && root && <ExportDialog root={root} onClose={() => setShowExport(false)} />}
      {showQCDashboard && <QCDashboard issuesMap={validationIssuesMap} totalItems={totalItems} onSelect={(id) => { setSelectedId(id); setShowQCDashboard(false); }} onClose={() => setShowQCDashboard(false)} />}
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
};

export default App;
