
import React, { useState, useEffect } from 'react';
import { FileTree, IIIFItem } from '../types';
import { Icon } from './Icon';

interface StagingAreaProps {
  initialTree: FileTree;
  existingRoot: IIIFItem | null;
  onIngest: (tree: FileTree, merge: boolean) => void;
  onCancel: () => void;
}

type WizardStep = 'analyze' | 'relationship' | 'usage' | 'review';

export const StagingArea: React.FC<StagingAreaProps> = ({ initialTree, existingRoot, onIngest, onCancel }) => {
  const [tree, setTree] = useState<FileTree>(initialTree);
  const [step, setStep] = useState<WizardStep>('analyze');
  const [merge, setMerge] = useState(!!existingRoot);
  const [analysis, setAnalysis] = useState<{
    totalFiles: number;
    flatImages: boolean;
    folderCount: number;
  }>({ totalFiles: 0, flatImages: false, folderCount: 0 });

  // 1. Analysis Phase
  useEffect(() => {
    let files = 0;
    let folders = 0;
    const traverse = (t: FileTree) => {
      files += t.files.size;
      folders += t.directories.size;
      t.directories.forEach(traverse);
    };
    traverse(tree);
    
    // Check if root has mostly images directly (Flat structure)
    const rootImageCount = Array.from(tree.files.keys()).filter(f => /\.(jpg|png|jpeg)$/i.test(f)).length;
    const isFlatImages = rootImageCount > 1 && tree.directories.size === 0;

    setAnalysis({ totalFiles: files, flatImages: isFlatImages, folderCount: folders });
    
    // Auto-advance after brief pause
    setTimeout(() => {
        setStep('relationship');
    }, 800);
  }, [initialTree]); // Only run once on mount

  const handleRelationshipChoice = (choice: 'sequence' | 'set' | 'separate') => {
    // Modify tree intent based on choice
    const newTree = { ...tree };
    if (choice === 'sequence') {
        newTree.iiifIntent = 'Manifest'; // Treats root as Manifest, children as Canvases
    } else if (choice === 'set') {
        newTree.iiifIntent = 'Manifest'; // Unordered Manifest (behavior will be set to individuals/unordered)
        // We might want to set a flag for behavior later, but 'Manifest' is the structural intent
    } else {
        newTree.iiifIntent = 'Collection'; // Treats root as Collection, children as Manifests
    }
    setTree(newTree);
    setStep('usage');
  };

  const handleUsageChoice = (choice: 'paged' | 'individual') => {
      // Here we would ideally set metadata in info.yml or a sidecar object
      // For now, we'll imply it in the ingest process or just move to review
      // This step helps user validate their mental model
      setStep('review');
  };

  const handleIngest = () => {
    onIngest(tree, merge);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Icon name="construction" className="text-iiif-blue" />
          Import Wizard
        </h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
           <Icon name="close" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
        
        {/* Step 1: Analyze */}
        {step === 'analyze' && (
            <div className="text-center space-y-4 animate-pulse">
                <Icon name="travel_explore" className="text-6xl text-iiif-blue" />
                <h3 className="text-2xl font-bold text-slate-700">Analyzing Content...</h3>
                <p className="text-slate-500">Looking at file structure and types</p>
            </div>
        )}

        {/* Step 2: Relationship Question */}
        {step === 'relationship' && (
            <div className="max-w-2xl w-full space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                <div className="text-center space-y-2">
                    <h3 className="text-3xl font-bold text-slate-800">What connects these {analysis.totalFiles} items?</h3>
                    <p className="text-lg text-slate-500">Help us organize them correctly in the archive.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                        onClick={() => handleRelationshipChoice('sequence')}
                        className="p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-iiif-blue hover:shadow-lg transition-all text-left group"
                    >
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 text-iiif-blue">
                            <Icon name="auto_stories" className="text-2xl"/>
                        </div>
                        <div className="font-bold text-lg text-slate-800 mb-1">It's a Sequence</div>
                        <p className="text-sm text-slate-500">Like a book, diary, or ordered set of photos. Pages follow one another.</p>
                        <div className="mt-4 text-xs font-mono bg-slate-50 p-2 rounded text-slate-400 border">Creates 1 Manifest</div>
                    </button>

                    <button 
                        onClick={() => handleRelationshipChoice('set')}
                        className="p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-iiif-blue hover:shadow-lg transition-all text-left group"
                    >
                         <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-amber-100 text-amber-600">
                            <Icon name="collections" className="text-2xl"/>
                        </div>
                        <div className="font-bold text-lg text-slate-800 mb-1">It's a Set</div>
                        <p className="text-sm text-slate-500">A group of related items, like loose photos or finds. Order matters less.</p>
                         <div className="mt-4 text-xs font-mono bg-slate-50 p-2 rounded text-slate-400 border">Creates 1 Manifest</div>
                    </button>

                    <button 
                        onClick={() => handleRelationshipChoice('separate')}
                        className="p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-iiif-blue hover:shadow-lg transition-all text-left group"
                    >
                         <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-100 text-green-600">
                            <Icon name="folder_copy" className="text-2xl"/>
                        </div>
                        <div className="font-bold text-lg text-slate-800 mb-1">They are Separate</div>
                        <p className="text-sm text-slate-500">Distinct objects or sub-collections that should stay separate.</p>
                         <div className="mt-4 text-xs font-mono bg-slate-50 p-2 rounded text-slate-400 border">Creates Collection</div>
                    </button>
                </div>
                
                {analysis.flatImages && (
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg flex items-center gap-3 text-sm">
                        <Icon name="tips_and_updates" />
                        <span><strong>Suggestion:</strong> Since these are all images in one folder, "Sequence" or "Set" is likely best.</span>
                    </div>
                )}
            </div>
        )}

        {/* Step 3: Usage Question */}
        {step === 'usage' && (
             <div className="max-w-2xl w-full space-y-8 animate-in slide-in-from-right-8 duration-500">
                 <div className="text-center space-y-2">
                    <h3 className="text-3xl font-bold text-slate-800">How do you usually view them?</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <button 
                        onClick={() => handleUsageChoice('paged')}
                        className="p-8 bg-white border-2 border-slate-200 rounded-xl hover:border-iiif-blue hover:shadow-lg transition-all flex items-center gap-4"
                    >
                        <Icon name="menu_book" className="text-4xl text-slate-300"/>
                        <div className="text-left">
                             <div className="font-bold text-xl text-slate-800">Flip Through</div>
                             <p className="text-sm text-slate-500">Page by page reading experience</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => handleUsageChoice('individual')}
                         className="p-8 bg-white border-2 border-slate-200 rounded-xl hover:border-iiif-blue hover:shadow-lg transition-all flex items-center gap-4"
                    >
                        <Icon name="grid_view" className="text-4xl text-slate-300"/>
                         <div className="text-left">
                             <div className="font-bold text-xl text-slate-800">Grid / Individually</div>
                             <p className="text-sm text-slate-500">Select specific items to view</p>
                        </div>
                    </button>
                </div>
                 <button onClick={() => setStep('relationship')} className="mx-auto block text-slate-400 hover:text-slate-600">Back</button>
             </div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && (
             <div className="max-w-3xl w-full h-full flex flex-col animate-in fade-in duration-500">
                 <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-slate-800">Ready to Ingest</h3>
                      <p className="text-slate-500">Here is how your archive will be structured</p>
                 </div>

                 <div className="flex-1 bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
                     <div className="p-4 bg-slate-50 border-b font-bold text-xs uppercase text-slate-500 tracking-wider">Preview Structure</div>
                     <div className="flex-1 overflow-auto p-4">
                         <PreviewNode node={tree} level={0} />
                     </div>
                 </div>

                 <div className="mt-8 flex justify-between items-center">
                     <button onClick={() => setStep('usage')} className="text-slate-500 font-bold hover:text-slate-800">Back</button>
                     
                     <div className="flex items-center gap-4">
                        {existingRoot && (
                            <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-4 py-2 rounded text-blue-800 hover:bg-blue-100 transition-colors">
                                <input type="checkbox" checked={merge} onChange={e => setMerge(e.target.checked)} className="accent-blue-600"/>
                                <span className="font-bold text-sm">Append to Existing</span>
                            </label>
                        )}
                        <button 
                            onClick={handleIngest}
                            className="bg-iiif-blue text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Icon name="publish" /> Import Now
                        </button>
                     </div>
                 </div>
             </div>
        )}

      </div>
    </div>
  );
};

const PreviewNode: React.FC<{ node: FileTree; level: number }> = ({ node, level }) => {
    const isManifest = node.iiifIntent === 'Manifest';
    const isCollection = node.iiifIntent === 'Collection' || (!node.iiifIntent && (node.name === 'root' || node.files.size === 0));

    return (
        <div style={{ paddingLeft: level * 20 }} className="py-1">
            <div className="flex items-center gap-2">
                 <Icon 
                    name={isManifest ? "menu_book" : isCollection ? "folder" : "description"} 
                    className={isManifest ? "text-green-600" : isCollection ? "text-amber-500" : "text-slate-400"}
                />
                <span className={`text-sm ${isManifest || isCollection ? 'font-bold text-slate-700' : 'text-slate-500'}`}>
                    {node.name === 'root' ? 'My Archive' : node.name}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-300 bg-slate-50 px-1 rounded border">
                    {isManifest ? 'Manifest' : isCollection ? 'Collection' : 'File'}
                </span>
            </div>
            {Array.from(node.directories.values()).map(dir => (
                <PreviewNode key={dir.path} node={dir} level={level + 1} />
            ))}
             {/* Show first few files if manifest */}
             {isManifest && node.files.size > 0 && (
                 <div style={{ paddingLeft: (level + 1) * 20 }} className="text-xs text-slate-400 italic py-1">
                     + {node.files.size} items (Canvases)
                 </div>
             )}
        </div>
    );
};
