
import React, { useEffect, useState } from 'react';
import { FileTree, getIIIFValue, IIIFItem } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { findSimilarFiles } from '../utils/filenameUtils';

interface StagingAreaProps {
  initialTree: FileTree;
  existingRoot: IIIFItem | null;
  onIngest: (tree: FileTree, merge: boolean, progressCallback: (msg: string, pct: number) => void) => void;
  onCancel: BillingDialogCloseHandler;
}

type WizardStep = 'analyze' | 'structure' | 'details' | 'identity' | 'review' | 'processing';

type BillingDialogCloseHandler = () => void;

export const StagingArea: React.FC<StagingAreaProps> = ({ initialTree, existingRoot, onIngest, onCancel }) => {
  const [tree, setTree] = useState<FileTree>(initialTree);
  const [step, setStep] = useState<WizardStep>('analyze');
  const [merge, setMerge] = useState(!!existingRoot);
  const [progress, setProgress] = useState({ message: '', percent: 0 });

  // Manual Builder State
  const [ingestMode, setIngestMode] = useState<'auto' | 'manual'>('auto');
  const [availableFiles, setAvailableFiles] = useState<File[]>([]);
  const [manualManifestFiles, setManualManifestFiles] = useState<File[]>([]);
  const [manualManifestName, setManualManifestName] = useState('New Manifest');
  const [suggestedFiles, setSuggestedFiles] = useState<{file: File, reason: string}[] | null>(null);

  const [globalCreator, setGlobalCreator] = useState('');
  const [globalRights, setGlobalRights] = useState('https://creativecommons.org/licenses/by/4.0/');
  const [institution, setInstitution] = useState('');
  const [baseUrl, setBaseUrl] = useState(`${window.location.origin}/iiif`);

  // Escape key to close (unless processing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'processing') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, step]);

  useEffect(() => {
    setTimeout(() => setStep('structure'), 800);
    
    // Flatten file tree for manual mode (Optimized O(N))
    const flatten = (node: FileTree, acc: File[] = []): File[] => {
        node.files.forEach(f => acc.push(f));
        node.directories.forEach(dir => flatten(dir, acc));
        return acc;
    };
    setAvailableFiles(flatten(initialTree));
  }, []); 

  const handleStructureChoice = (intent: 'Manifest' | 'Collection', behavior: string[] = []) => {
    const newTree = { ...tree, iiifIntent: intent, iiifBehavior: behavior };
    setTree(newTree);
    setStep('details');
  };

  const handleViewingDirectionChoice = (direction: any) => {
      setTree({ ...tree, viewingDirection: direction });
      setStep('identity');
  };

  const handleIntentChange = (path: string, intent: 'Collection' | 'Manifest') => {
      const update = (node: FileTree) => {
          if (node.path === path) { node.iiifIntent = intent; }
          node.directories.forEach(update);
      };
      const newTree = { ...tree };
      update(newTree);
      setTree(newTree);
  };

  const handleIngest = () => {
    setStep('processing');
    const finalTree = { ...tree, iiifBaseUrl: baseUrl };
    onIngest(finalTree, merge, (msg, pct) => {
        setProgress({ message: msg, percent: pct });
    });
  };

  const handleManualAdd = (file: File) => {
    // Check if already added
    if (manualManifestFiles.find(f => f.name === file.name)) return;

    const newSelection = [...manualManifestFiles, file];
    setManualManifestFiles(newSelection);

    // Check for similarities in REMAINING available files
    const remainingFiles = availableFiles.filter(f => !newSelection.find(s => s.name === f.name));
    // Deduplicate candidates by name to prevent processing identical filenames from different folders
    const candidates = Array.from(new Set(remainingFiles.map(f => f.name)));
    
    // Low-compute check using our utils
    // Safety cap: Only check against first 2000 candidates to prevent UI freeze on large datasets
    const safeCandidates = candidates.length > 2000 ? candidates.slice(0, 2000) : candidates;
    const similarities = findSimilarFiles(file.name, safeCandidates);
    
    if (similarities.length > 0) {
        // Map back to File objects
        const suggestions = similarities.map(match => ({
            file: remainingFiles.find(f => f.name === match.filename)!,
            reason: match.reason
        })).filter(s => s.file); // Safety check

        if (suggestions.length > 0) {
            setSuggestedFiles(suggestions);
        }
    }
  };

  const acceptSuggestions = () => {
      if (!suggestedFiles) return;
      const filesToAdd = suggestedFiles.map(s => s.file);
      setManualManifestFiles([...manualManifestFiles, ...filesToAdd]);
      setSuggestedFiles(null);
  };

  const handleManualNext = () => {
      // Construct a synthetic FileTree for the manual manifest
      const manualTree: FileTree = {
          name: 'root',
          path: '/',
          files: new Map(), // We don't put files in root usually for Collection, but for Single Manifest it's different
          directories: new Map(),
          iiifIntent: 'Manifest',
          iiifBehavior: ['paged']
      };

      // Create a single directory for the manifest to keep things clean, or just use root if intent is Manifest
      // Based on existing logic, if root is Manifest, it treats all children as Canvases.
      // We need to populate the files map.
      manualManifestFiles.forEach(f => manualTree.files.set(f.name, f));
      
      // Override the name with user input (though FileTree name is usually dir name)
      // We might need to handle this in StagingArea's onIngest or just set it here
      // logic usually derives label from folder name. 
      manualTree.name = manualManifestName;

      setTree(manualTree);
      setStep('details');
  };

  return (
    <div className="fixed inset-0 bg-white z-[500] flex flex-col animate-in fade-in duration-200">
      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Icon name="construction" className="text-iiif-blue" />
          Ingest Workbench
        </h2>
        {step !== 'processing' && (
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><Icon name="close" /></button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 overflow-y-auto">
        {step === 'analyze' && (
            <div className="text-center space-y-4 animate-pulse">
                <Icon name="travel_explore" className="text-6xl text-iiif-blue" />
                <h3 className="text-2xl font-bold text-slate-700">Analyzing Content...</h3>
            </div>
        )}

        {step === 'structure' && (
            <div className="max-w-6xl w-full space-y-6 animate-in slide-in-from-bottom-8">
                <div className="text-center">
                    <h3 className="text-3xl font-bold text-slate-800">Archive Architecture</h3>
                    <p className="text-slate-500 mt-2">How should this data be packaged for the global IIIF network?</p>
                </div>

                {/* Mode Tabs */}
                <div className="flex justify-center gap-4 border-b border-slate-200 pb-1">
                    <button 
                        onClick={() => setIngestMode('auto')}
                        className={`pb-3 px-6 font-bold text-sm transition-all ${ingestMode === 'auto' ? 'text-iiif-blue border-b-2 border-iiif-blue' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Auto-Detect Structure
                    </button>
                    <button 
                        onClick={() => setIngestMode('manual')}
                        className={`pb-3 px-6 font-bold text-sm transition-all ${ingestMode === 'manual' ? 'text-iiif-blue border-b-2 border-iiif-blue' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Manual Builder (Start from Scratch)
                    </button>
                </div>

                {ingestMode === 'auto' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                        <button onClick={() => handleStructureChoice('Manifest', ['paged'])} className="p-8 bg-white border-2 border-slate-200 rounded-2xl hover:border-green-500 hover:shadow-2xl transition-all text-left group">
                            <div className="flex justify-between items-start mb-6">
                                <Icon name="auto_stories" className="text-4xl text-green-600"/>
                                <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-2 py-1 rounded">Atomic Unit</span>
                            </div>
                            <div className="font-bold text-xl text-slate-800 mb-2">Treat as One Manifest</div>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                Best for items with many views that belong to <strong>one physical thing</strong> (a book, a diary, or a single artifact).
                            </p>
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <div className="flex items-start gap-2">
                                    <Icon name="output" className="text-sm text-green-600 mt-1"/>
                                    <div>
                                        <h5 className="text-xs font-bold text-slate-700">Export Behavior</h5>
                                        <p className="text-[11px] text-slate-500">Creates <strong>1 JSON file</strong>. All images become sequential views of this one object.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Icon name="psychology" className="text-sm text-green-600 mt-1"/>
                                    <div>
                                        <h5 className="text-xs font-bold text-slate-700">Archival Implication</h5>
                                        <p className="text-[11px] text-slate-500">The entire folder is cited as a single entry in registries. Ideal for sequential reading.</p>
                                    </div>
                                </div>
                            </div>
                        </button>
                        <button onClick={() => handleStructureChoice('Collection', ['multi-part'])} className="p-8 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-500 hover:shadow-2xl transition-all text-left group">
                            <div className="flex justify-between items-start mb-6">
                                <Icon name="library_books" className="text-4xl text-amber-600"/>
                                <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded">Semantic Hub</span>
                            </div>
                            <div className="font-bold text-xl text-slate-800 mb-2">Treat as a Collection</div>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                Best for <strong>project directories</strong> containing multiple distinct items or findings that each need their own ID.
                            </p>
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <div className="flex items-start gap-2">
                                    <Icon name="output" className="text-sm text-amber-600 mt-1"/>
                                    <div>
                                        <h5 className="text-xs font-bold text-slate-700">Export Behavior</h5>
                                        <p className="text-[11px] text-slate-500">Creates <strong>N+1 JSON files</strong>. An index pointing to separate files for each sub-folder.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Icon name="psychology" className="text-sm text-amber-600 mt-1"/>
                                    <div>
                                        <h5 className="text-xs font-bold text-slate-700">Archival Implication</h5>
                                        <p className="text-[11px] text-slate-500">Allows sub-folders to be described as independent artifacts with their own metadata.</p>
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col h-[600px] w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        {/* Similarity Suggestion Modal */}
                        {suggestedFiles && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                                <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full space-y-4">
                                    <div className="flex items-center gap-3 text-amber-600">
                                        <Icon name="auto_fix_high" className="text-2xl"/>
                                        <h4 className="font-bold text-lg">Found Similar Files</h4>
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        We detected <strong>{suggestedFiles.length}</strong> related files (e.g., sequential pages). Want to add them too?
                                    </p>
                                    <div className="max-h-40 overflow-auto border rounded-lg bg-slate-50 p-2 text-xs text-slate-500 space-y-1">
                                        {suggestedFiles.map((s, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>{s.file.name}</span>
                                                <span className="italic opacity-50">{s.reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-3 justify-end pt-2">
                                        <button 
                                            onClick={() => setSuggestedFiles(null)}
                                            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold"
                                        >
                                            No, skip
                                        </button>
                                        <button 
                                            onClick={acceptSuggestions}
                                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-md"
                                        >
                                            Add All {suggestedFiles.length + 1} Files
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Manifest Label</label>
                                <input 
                                    value={manualManifestName}
                                    onChange={e => setManualManifestName(e.target.value)}
                                    className="bg-transparent font-bold text-lg text-slate-800 outline-none border-b border-transparent focus:border-iiif-blue w-64"
                                />
                            </div>
                            <button 
                                onClick={handleManualNext}
                                disabled={manualManifestFiles.length === 0}
                                className="px-6 py-2 bg-iiif-blue text-white rounded-lg font-bold shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-all flex items-center gap-2"
                            >
                                Continue <Icon name="arrow_forward" className="text-sm"/>
                            </button>
                        </div>
                        
                        <div className="flex-1 flex overflow-hidden">
                            {/* Source Files */}
                            <div className="w-1/2 border-r bg-slate-50 flex flex-col">
                                <div className="p-3 border-b bg-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                                    <span>Available Files ({availableFiles.length})</span>
                                    <Icon name="search" />
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {availableFiles.map((file, i) => {
                                        const isSelected = manualManifestFiles.find(f => f.name === file.name);
                                        return (
                                            <div 
                                                key={i}
                                                onClick={() => !isSelected && handleManualAdd(file)}
                                                className={`p-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-all ${isSelected ? 'opacity-50 grayscale bg-slate-100 cursor-default' : 'hover:bg-white hover:shadow-sm text-slate-700'}`}
                                            >
                                                <Icon name="description" className="text-slate-400 text-base" />
                                                <span className="truncate flex-1">{file.name}</span>
                                                {isSelected && <Icon name="check" className="text-green-500 text-xs" />}
                                                {!isSelected && <Icon name="add" className="text-slate-300 opacity-0 group-hover:opacity-100" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Selected Files */}
                            <div className="w-1/2 flex flex-col bg-white">
                                <div className="p-3 border-b text-xs font-bold text-iiif-blue uppercase tracking-wider bg-blue-50/50">
                                    Selected for Manifest ({manualManifestFiles.length})
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {manualManifestFiles.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                                            <Icon name="playlist_add" className="text-4xl" />
                                            <p className="text-sm font-medium">Select files from the left to build your manifest</p>
                                        </div>
                                    ) : (
                                        manualManifestFiles.map((file, i) => (
                                            <div key={i} className="group p-2 rounded-lg border border-slate-100 bg-slate-50 text-sm flex items-center gap-2 hover:border-red-100 transition-all">
                                                <span className="text-xs font-mono text-slate-400 w-6 text-right">{i + 1}.</span>
                                                <Icon name="image" className="text-slate-500 text-base" />
                                                <span className="truncate flex-1 text-slate-700">{file.name}</span>
                                                <button 
                                                    onClick={() => setManualManifestFiles(manualManifestFiles.filter(f => f !== file))}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-400 rounded"
                                                >
                                                    <Icon name="close" className="text-sm" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {step === 'details' && (
             <div className="max-w-2xl w-full space-y-8 animate-in slide-in-from-right-8">
                <div className="text-center">
                    <h3 className="text-3xl font-bold text-slate-800">Reading Order</h3>
                    <p className="text-slate-500">How should the viewer's controls be oriented by default?</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleViewingDirectionChoice('left-to-right')} className="p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-iiif-blue hover:shadow-md transition-all flex items-center gap-4 group">
                        <Icon name="arrow_forward" className="text-slate-400 group-hover:text-iiif-blue"/> <span className="font-bold text-slate-700">Western (L-to-R)</span>
                    </button>
                    <button onClick={() => handleViewingDirectionChoice('right-to-left')} className="p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-iiif-blue hover:shadow-md transition-all flex items-center gap-4 group">
                        <Icon name="arrow_back" className="text-slate-400 group-hover:text-iiif-blue"/> <span className="font-bold text-slate-700">Semitic/CJK (R-to-L)</span>
                    </button>
                </div>
                <button onClick={() => setStep('structure')} className="mx-auto block text-slate-400 font-bold hover:text-slate-600">Back</button>
             </div>
        )}

        {step === 'identity' && (
            <div className="max-w-xl w-full space-y-8 animate-in slide-in-from-right-8">
                <div className="text-center">
                    <h3 className="text-3xl font-bold text-slate-800">Archive Identity</h3>
                    <p className="text-slate-500">Apply shared provenance data to all items.</p>
                </div>
                <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-xl space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lead Researcher (Creator)</label>
                        <input value={globalCreator} onChange={e => setGlobalCreator(e.target.value)} className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-iiif-blue outline-none" placeholder="e.g. Dr. Jane Field" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Institution</label>
                        <input value={institution} onChange={e => setInstitution(e.target.value)} className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-iiif-blue outline-none" placeholder="e.g. University of Archiving" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Copyright / License</label>
                        <select value={globalRights} onChange={e => setGlobalRights(e.target.value)} className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-iiif-blue outline-none">
                            <option value="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</option>
                            <option value="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</option>
                            <option value="https://creativecommons.org/publicdomain/zero/1.0/">Public Domain (CC0)</option>
                            <option value="http://rightsstatements.org/vocab/InC/1.0/">In Copyright</option>
                        </select>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-[10px] font-black text-iiif-blue uppercase tracking-widest mb-1">Future Hosting Base URL</label>
                        <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="w-full p-3 bg-blue-50 text-slate-900 border border-blue-200 rounded-lg focus:ring-2 focus:ring-iiif-blue outline-none font-mono text-xs" placeholder="https://myarchive.github.io/project-name" />
                        <p className="text-[10px] text-slate-400 mt-1 italic">Internal IIIF identifiers will be pinned to this URL for future portability.</p>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <button onClick={() => setStep('details')} className="text-slate-500 font-bold">Back</button>
                    <button onClick={() => setStep('review')} className="bg-iiif-blue text-white px-10 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700">Next Step</button>
                </div>
            </div>
        )}

        {step === 'review' && (
             <div className="max-w-4xl w-full h-full flex flex-col animate-in fade-in py-10">
                 <div className="text-center mb-8 shrink-0">
                      <h3 className="text-2xl font-bold text-slate-800">Final Schematic Review</h3>
                      <p className="text-slate-500 mt-1">Ingesting files as a <strong>{tree.iiifIntent}</strong> hierarchy.</p>
                 </div>
                 <div className="flex-1 bg-white border rounded-xl overflow-auto p-6 mb-6 shadow-inner relative">
                      <div className="absolute top-4 right-4 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-blue-700 uppercase tracking-widest z-10 flex items-center gap-1">
                         <Icon name="info" className="text-xs"/> Set per-folder intents below
                      </div>
                     <PreviewNode node={tree} level={0} onIntentChange={handleIntentChange} />
                 </div>
                 <div className="flex justify-between items-center shrink-0">
                     <button onClick={() => setStep('identity')} className="text-slate-500 font-bold px-4 py-2">Back</button>
                     <button onClick={handleIngest} className="bg-iiif-blue text-white px-10 py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">
                        <Icon name="publish" /> Confirm & Build Digital Archive
                     </button>
                 </div>
             </div>
        )}

        {step === 'processing' && (
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-blue-50 text-iiif-blue rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Icon name="image" className="text-4xl"/>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-800">Preserving in Browser Storage...</h3>
                    <p className="text-sm text-slate-500">{progress.message}</p>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden border">
                    <div className="bg-iiif-blue h-full transition-all duration-300" style={{ width: `${progress.percent}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Building JSON-LD and Virtual Image Tiling</p>
            </div>
        )}
      </div>
    </div>
  );
};

const PreviewNode: React.FC<{ node: FileTree; level: number; onIntentChange: (path: string, intent: 'Collection' | 'Manifest') => void }> = ({ node, level, onIntentChange }) => {
    const isManifest = node.iiifIntent === 'Manifest';
    const fileCount = node.files.size;
    
    return (
        <div style={{ paddingLeft: level * 20 }} className="py-1">
            <div className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-lg transition-all">
                <div className="flex items-center gap-3">
                    <Icon name={isManifest ? "menu_book" : "folder"} className={isManifest ? "text-green-600" : "text-amber-500"} />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{node.name === 'root' ? 'Archive Root' : node.name}</span>
                        {fileCount > 0 && (
                            <span className="text-[10px] text-slate-400 font-medium">{fileCount} files inside</span>
                        )}
                    </div>
                </div>
                {node.name !== 'root' && (
                    <div className="flex flex-col items-end">
                        <select value={isManifest ? 'Manifest' : 'Collection'} onChange={(e) => onIntentChange(node.path, e.target.value as any)} className={`text-[10px] uppercase font-black border-2 rounded-lg px-2 py-0.5 bg-white outline-none transition-all ${isManifest ? 'border-green-100 text-green-700' : 'border-amber-100 text-amber-700'}`}>
                            <option value="Collection">Collection</option>
                            <option value="Manifest">Manifest</option>
                        </select>
                        <span className="text-[8px] text-slate-400 uppercase font-bold mt-1 tracking-tighter">
                            {isManifest ? 'Creates 1 standard Manifest object' : 'Creates 1 Collection index pointing to children'}
                        </span>
                    </div>
                )}
            </div>
            {/* Fix: Explicitly cast dir to FileTree to fix unknown type error */}
            {Array.from(node.directories.values()).map((dir: FileTree) => (
                <PreviewNode key={dir.path} node={dir} level={level + 1} onIntentChange={onIntentChange} />
            ))}
        </div>
    );
};
