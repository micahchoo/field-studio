
import React, { useState, useMemo } from 'react';
import { IIIFItem, IIIFCanvas } from '../../types';
import { ValidationIssue } from '../../services/validator';
import { Icon } from '../Icon';

interface ArchiveViewProps {
  root: IIIFItem | null;
  onSelect: (item: IIIFItem) => void;
  validationIssues?: Record<string, ValidationIssue[]>;
  fieldMode: boolean;
}

// Helper to determine DNA Glyphs
const getFileDNA = (item: IIIFItem) => {
    const glyphs = {
        time: '○', // Default (Day/Unknown)
        location: '△', // No GPS
        device: '◯' // Unknown
    };

    if (item.metadata) {
        const date = item.navDate || item.metadata.find(m => m.label?.['en']?.[0] === 'Date Created')?.value?.['en']?.[0];
        if (date) {
             const hour = new Date(date).getHours();
             if (hour < 6) glyphs.time = '●'; // Night
             else if (hour < 10) glyphs.time = '◔'; // Morning
             else if (hour < 16) glyphs.time = '○'; // Day
             else if (hour < 20) glyphs.time = '◑'; // Evening
             else glyphs.time = '●'; // Night
        }

        const loc = item.metadata.find(m => m.label?.['en']?.[0] === 'Location')?.value?.['en']?.[0];
        if (loc) glyphs.location = '▲'; // Has GPS/Loc

        const camera = item.metadata.find(m => m.label?.['en']?.[0] === 'Camera')?.value?.['en']?.[0];
        if (camera) {
            if (camera.toLowerCase().includes('iphone') || camera.toLowerCase().includes('android')) glyphs.device = '⬡'; // Phone
            else glyphs.device = '◇'; // Camera
        }
    }
    
    if (item.id.endsWith('.mp3')) glyphs.device = '🎤';
    if (item.id.endsWith('.txt')) glyphs.device = '📝';

    return glyphs;
};

export const ArchiveView: React.FC<ArchiveViewProps> = ({ root, onSelect, validationIssues = {}, fieldMode }) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isComparing, setIsComparing] = useState(false);

  // Flatten the tree to get all Canvases (Assets)
  const assets = useMemo(() => {
    if (!root) return [];
    const results: IIIFCanvas[] = [];
    const traverse = (item: IIIFItem) => {
      if (item.type === 'Canvas') {
        results.push(item as IIIFCanvas);
      }
      if (item.items) {
        item.items.forEach(traverse);
      }
    };
    traverse(root);
    return results;
  }, [root]);

  const filteredAssets = assets.filter(a => 
    (a.label?.['none']?.[0] || '').toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => {
      if (sortBy === 'name') {
           const labelA = a.label?.['none']?.[0] || '';
           const labelB = b.label?.['none']?.[0] || '';
           return labelA.localeCompare(labelB);
      } else {
           const dateA = a.navDate || '';
           const dateB = b.navDate || '';
           return dateB.localeCompare(dateA); // Descending
      }
  });

  const handleItemClick = (e: React.MouseEvent, asset: IIIFItem) => {
      if (e.metaKey || e.ctrlKey) {
          e.stopPropagation();
          const newSet = new Set(selectedIds);
          if (newSet.has(asset.id)) newSet.delete(asset.id);
          else newSet.add(asset.id);
          setSelectedIds(newSet);
      } else {
          onSelect(asset);
          setSelectedIds(new Set()); 
      }
  };

  const selectedItemsList = assets.filter(a => selectedIds.has(a.id));

  if (!root) return null;

  return (
    <div className={`flex flex-col h-full relative ${fieldMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Toolbar */}
      <div className={`h-16 border-b px-6 flex items-center justify-between shadow-sm z-10 ${
          fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <h2 className={`font-bold ${fieldMode ? 'text-xl text-yellow-400' : 'text-lg text-slate-800'}`}>Archive</h2>
          <div className="h-4 w-px bg-slate-500"></div>
          <span className={`text-sm font-medium ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}>{assets.length} Items</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon name="search" className={`absolute left-3 top-2.5 text-lg ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input 
              type="text" 
              placeholder="Filter..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`pl-10 pr-3 py-2 border rounded-md text-sm outline-none transition-all w-64 ${
                  fieldMode 
                    ? 'bg-slate-800 border-slate-600 text-white focus:border-yellow-400 placeholder:text-slate-600' 
                    : 'bg-slate-100 border-transparent focus:bg-white focus:border-iiif-blue'
              }`}
            />
          </div>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`text-sm rounded-md py-2 px-3 focus:ring-0 cursor-pointer ${
                fieldMode ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-100 border-transparent'
            }`}
          >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Date</option>
          </select>
          <div className={`flex p-1 rounded-md ${fieldMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button 
              onClick={() => setView('grid')}
              className={`p-2 rounded ${
                  view === 'grid' 
                    ? (fieldMode ? 'bg-yellow-400 text-black font-bold' : 'bg-white text-iiif-blue shadow-sm') 
                    : 'text-slate-400'
              }`}
            >
              <Icon name="grid_view" />
            </button>
            <button 
              onClick={() => setView('list')}
              className={`p-2 rounded ${
                  view === 'list' 
                    ? (fieldMode ? 'bg-yellow-400 text-black font-bold' : 'bg-white text-iiif-blue shadow-sm') 
                    : 'text-slate-400'
              }`}
            >
              <Icon name="view_list" />
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Modal */}
      {isComparing && (
          <div className="absolute inset-0 z-50 bg-slate-900/95 p-8 flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6 text-white">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                      <Icon name="compare" /> Compare {selectedItemsList.length} Items
                  </h3>
                  <button onClick={() => setIsComparing(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full">
                      <Icon name="close" />
                  </button>
              </div>
              <div className="flex-1 grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedItemsList.length}, 1fr)` }}>
                  {selectedItemsList.map(item => (
                      <div key={item.id} className="flex flex-col h-full bg-black rounded-xl overflow-hidden border border-slate-700">
                           <div className="flex-1 relative">
                               {item._blobUrl && (
                                   <img src={item._blobUrl} className="w-full h-full object-contain" />
                               )}
                           </div>
                           <div className="p-4 bg-slate-800 text-slate-300 text-sm space-y-2">
                               <div className="font-bold text-white truncate">{item.label?.['none']?.[0]}</div>
                               <div className="grid grid-cols-2 gap-2 text-xs">
                                   <div>
                                       <span className="block text-slate-500 uppercase text-[10px]">Date</span>
                                       {item.navDate ? new Date(item.navDate).toLocaleString() : '-'}
                                   </div>
                                   <div>
                                       <span className="block text-slate-500 uppercase text-[10px]">Camera</span>
                                       {item.metadata?.find(m => m.label?.['en']?.[0] === 'Camera')?.value?.['en']?.[0] || '-'}
                                   </div>
                               </div>
                           </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Floating Action Bar (Multi-Select) */}
      {selectedIds.size > 0 && !isComparing && (
          <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4 ${
              fieldMode ? 'bg-yellow-400 text-black border-2 border-white' : 'bg-slate-900 text-white'
          }`}>
              <span className="font-bold text-sm">{selectedIds.size} selected</span>
              <div className={`h-4 w-px ${fieldMode ? 'bg-black/20' : 'bg-slate-700'}`}></div>
              {selectedIds.size > 1 && selectedIds.size <= 4 && (
                  <button onClick={() => setIsComparing(true)} className="flex items-center gap-2 hover:opacity-75 transition-opacity font-bold">
                      <Icon name="compare" /> Compare
                  </button>
              )}
              <button onClick={() => setSelectedIds(new Set())} className={`${fieldMode ? 'text-black/60 hover:text-black' : 'text-slate-400 hover:text-white'}`}>
                  Clear
              </button>
          </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-24">
        {view === 'grid' ? (
          <div className={`grid gap-6 ${fieldMode ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'}`}>
            {filteredAssets.map((asset) => {
              const dna = getFileDNA(asset);
              const hasAnnotations = asset.annotations && asset.annotations.some(p => p.items.length > 0);
              const isSelected = selectedIds.has(asset.id);
              const issues = validationIssues[asset.id] || [];
              const hasError = issues.some(i => i.level === 'error');
              const hasWarning = issues.some(i => i.level === 'warning');
              
              return (
                <div 
                  key={asset.id} 
                  className={`group relative rounded-lg shadow-sm cursor-pointer transition-all ${
                      fieldMode 
                        ? (isSelected ? 'bg-slate-800 border-4 border-yellow-400 p-2' : 'bg-slate-800 border border-slate-700 p-3 hover:border-slate-500')
                        : (isSelected ? 'bg-blue-50 border border-iiif-blue ring-2 ring-iiif-blue p-2' : 'bg-white border border-slate-200 p-2 hover:shadow-md hover:border-iiif-blue')
                  }`}
                  onClick={(e) => handleItemClick(e, asset)}
                  title={issues.map(i => i.message).join('\n')}
                >
                  {/* Validation Icon */}
                  {(hasError || hasWarning) && (
                      <div className={`absolute top-2 right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center ${hasError ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                          <Icon name={hasError ? "error" : "warning"} className="text-sm"/>
                      </div>
                  )}

                  {/* Selection Checkbox Overlay */}
                  <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded border flex items-center justify-center transition-opacity ${
                      isSelected 
                        ? (fieldMode ? 'opacity-100 bg-yellow-400 border-yellow-400 text-black' : 'opacity-100 bg-white border-iiif-blue') 
                        : (fieldMode ? 'opacity-0 group-hover:opacity-100 bg-black/50 border-slate-400' : 'opacity-0 group-hover:opacity-100 bg-white border-slate-300')
                  }`}>
                      {isSelected && <Icon name="check" className={`text-sm ${fieldMode ? 'font-bold' : 'text-iiif-blue'}`}/>}
                  </div>

                  <div className={`aspect-square rounded overflow-hidden flex items-center justify-center mb-3 relative ${fieldMode ? 'bg-black' : 'bg-slate-100'}`}>
                    {asset._blobUrl ? (
                      <img src={asset._blobUrl} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Icon name="image" className="text-slate-500 text-5xl" />
                    )}
                    
                    {/* DNA Glyphs Overlay */}
                    <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex gap-1 font-mono">
                        <span title="Time">{dna.time}</span>
                        <span title="Location">{dna.location}</span>
                        <span title="Device">{dna.device}</span>
                    </div>

                    {hasAnnotations && !hasError && !hasWarning && (
                        <div className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center shadow-sm ${
                            fieldMode ? 'bg-yellow-400 text-black' : 'bg-white/90 text-iiif-blue'
                        }`} title="Has sidecar/annotations">
                            <Icon name="description" className="text-sm"/>
                        </div>
                    )}
                  </div>
                  <div className="px-1">
                    <div className={`font-medium truncate ${fieldMode ? 'text-white text-base' : 'text-slate-700 text-xs'}`} title={asset.label?.['none']?.[0]}>
                      {asset.label?.['none']?.[0]}
                    </div>
                    <div className={`${fieldMode ? 'text-slate-400 text-xs' : 'text-slate-400 text-[10px]'} flex items-center justify-between mt-1`}>
                      <span className="flex items-center gap-1">
                          {asset.navDate ? new Date(asset.navDate).toLocaleDateString() : <><Icon name="schedule" className="text-[10px]"/> -</>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`border rounded-lg shadow-sm overflow-hidden ${fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-left text-sm">
              <thead className={`${fieldMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-500'} border-b`}>
                <tr>
                  <th className="px-4 py-3 font-medium w-12"></th>
                  <th className="px-4 py-3 font-medium w-16"></th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">DNA</th>
                  <th className="px-4 py-3 font-medium">Dimensions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAssets.map((asset) => {
                    const dna = getFileDNA(asset);
                    const isSelected = selectedIds.has(asset.id);
                    const issues = validationIssues[asset.id] || [];
                    const hasError = issues.some(i => i.level === 'error');
                    
                    return (
                      <tr 
                        key={asset.id} 
                        className={`cursor-pointer ${
                            fieldMode 
                                ? (isSelected ? 'bg-yellow-900/20 text-white' : 'text-slate-300 hover:bg-slate-800')
                                : (isSelected ? 'bg-blue-50' : 'hover:bg-slate-50')
                        }`}
                        onClick={(e) => handleItemClick(e, asset)}
                      >
                         <td className="px-4 py-2">
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                 isSelected 
                                    ? (fieldMode ? 'bg-yellow-400 border-yellow-400' : 'border-iiif-blue bg-white') 
                                    : (fieldMode ? 'border-slate-500' : 'border-slate-300')
                             }`}>
                                 {isSelected && <Icon name="check" className={`text-[10px] ${fieldMode ? 'text-black' : 'text-iiif-blue'}`}/>}
                             </div>
                         </td>
                        <td className="px-4 py-2">
                           <div className={`w-10 h-10 rounded overflow-hidden relative ${fieldMode ? 'bg-black' : 'bg-slate-100'}`}>
                            {asset._blobUrl && <img src={asset._blobUrl} className="w-full h-full object-cover" />}
                            {hasError && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><Icon name="error" className="text-red-600"/></div>}
                           </div>
                        </td>
                        <td className="px-4 py-2 font-medium">
                            {asset.label?.['none']?.[0]}
                            {issues.length > 0 && <span className="ml-2 text-[10px] text-red-500">{issues.length} issues</span>}
                        </td>
                        <td className={`px-4 py-2 text-xs ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
                             {asset.navDate ? new Date(asset.navDate).toLocaleString() : '-'}
                        </td>
                        <td className={`px-4 py-2 font-mono tracking-widest text-xs ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span title="Time">{dna.time}</span>
                            <span title="Location">{dna.location}</span>
                            <span title="Device">{dna.device}</span>
                        </td>
                        <td className={`px-4 py-2 ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}>{asset.width} x {asset.height}</td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
