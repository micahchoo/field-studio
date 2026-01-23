
import React, { useState, useMemo, useEffect } from 'react';
import { IIIFItem, IIIFCanvas, ResourceState, getIIIFValue, IIIFCollection, AppMode } from '../../types';
import { ValidationIssue } from '../../services/validator';
import { Icon } from '../Icon';
import { MapView } from './MapView';
import { TimelineView } from './TimelineView';
import { MuseumLabel } from '../MuseumLabel';
import { useToast } from '../Toast';
import { RESOURCE_TYPE_CONFIG } from '../../constants';
import { Viewer } from './Viewer';

interface ArchiveViewProps {
  root: IIIFItem | null;
  onSelect: (item: IIIFItem) => void;
  onOpen: (item: IIIFItem) => void;
  onBatchEdit: (ids: string[]) => void;
  onUpdate?: (newRoot: IIIFItem) => void;
  validationIssues?: Record<string, ValidationIssue[]>;
  fieldMode: boolean;
  onReveal?: (id: string, mode: 'collections' | 'viewer' | 'archive') => void;
  onCatalogSelection?: (ids: string[]) => void;
}

const getFileDNA = (item: IIIFItem) => {
    const has = { time: false, location: false, device: false };
    if (item.metadata) {
        const date = item.navDate || item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'date created')?.value?.['en']?.[0];
        if (date) has.time = true;
        const loc = item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'location')?.value?.['en']?.[0];
        if (loc) has.location = true;
        const camera = item.metadata.find(m => getIIIFValue(m.label).toLowerCase() === 'camera')?.value?.['en']?.[0];
        if (camera) has.device = true;
    }
    return has;
};

export const ArchiveView: React.FC<ArchiveViewProps> = ({ root, onSelect, onOpen, onBatchEdit, onUpdate, validationIssues = {}, fieldMode, onReveal, onCatalogSelection }) => {
  const { showToast } = useToast();
  const [view, setView] = useState<'grid' | 'list' | 'map' | 'timeline'>('grid');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);
  const [activeItem, setActiveItem] = useState<IIIFCanvas | null>(null);

  const isMobile = window.innerWidth < 768;

  const assets = useMemo(() => {
    if (!root) return [];
    const results: IIIFCanvas[] = [];
    const traverse = (item: IIIFItem) => {
      if (item.type === 'Canvas') results.push(item as IIIFCanvas);
      if (item.items) item.items.forEach(traverse);
    };
    traverse(root);
    return results;
  }, [root]);

  const selectedAssets = useMemo(() => assets.filter(a => selectedIds.has(a.id)), [assets, selectedIds]);

  const selectionDNA = useMemo(() => {
    const dna = { hasGPS: false, hasTime: false, commonPrefix: '' };
    if (selectedAssets.length > 0) {
        dna.hasGPS = selectedAssets.some(a => getFileDNA(a).location);
        dna.hasTime = selectedAssets.some(a => getFileDNA(a).time);
    }
    return dna;
  }, [selectedAssets]);

  useEffect(() => {
      if (selectedIds.size === 1) {
          const id = Array.from(selectedIds)[0];
          const item = assets.find(a => a.id === id);
          setActiveItem(item || null);
      } else {
          setActiveItem(null);
      }
  }, [selectedIds, assets]);

  const filteredAssets = assets.filter(a => 
    getIIIFValue(a.label).toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => {
      if (sortBy === 'name') return getIIIFValue(a.label).localeCompare(getIIIFValue(b.label));
      return (b.navDate || '').localeCompare(a.navDate || '');
  });

  const handleCreateManifestFromSelection = () => {
      if (!root || !onUpdate || selectedIds.size === 0) return;
      const newRoot = JSON.parse(JSON.stringify(root)) as IIIFCollection;
      const canvasesToMove: any[] = [];
      
      const removeCanvases = (parent: any) => {
          const list = parent.items || parent.annotations || [];
          for (let i = list.length - 1; i >= 0; i--) {
              if (selectedIds.has(list[i].id)) {
                  canvasesToMove.push(list.splice(i, 1)[0]);
              } else if (list[i].items || list[i].annotations) {
                  removeCanvases(list[i]);
              }
          }
      };
      
      removeCanvases(newRoot);
      const manifestId = `https://archive.local/iiif/manifest/${crypto.randomUUID()}`;
      const newManifest: any = {
          id: manifestId, type: 'Manifest', label: { none: ['Selection Bundle'] }, items: canvasesToMove
      };
      
      if (!newRoot.items) newRoot.items = [];
      newRoot.items.push(newManifest);
      onUpdate(newRoot);
      setSelectedIds(new Set([manifestId]));
      showToast("Group synthesized into Manifest", "success");
  };

  const handleItemClick = (e: React.MouseEvent, asset: IIIFItem) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
          e.stopPropagation();
          const newSet = new Set(selectedIds);
          if (newSet.has(asset.id)) newSet.delete(asset.id);
          else newSet.add(asset.id);
          setSelectedIds(newSet);
      } else {
          onSelect(asset);
          setSelectedIds(new Set([asset.id])); 
      }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  const handleDelete = (idsToDelete: string[]) => {
      if (!onUpdate || !root) return;
      if (!confirm(`Permanently remove ${idsToDelete.length} item(s)?`)) return;
      const newRoot = JSON.parse(JSON.stringify(root));
      const traverseAndRemove = (parent: any) => {
          const list = parent.items || parent.annotations || [];
          for (let i = list.length - 1; i >= 0; i--) {
              if (idsToDelete.includes(list[i].id)) {
                  list.splice(i, 1);
              } else if (list[i].items || list[i].annotations) {
                  traverseAndRemove(list[i]);
              }
          }
      };
      traverseAndRemove(newRoot);
      onUpdate(newRoot);
      setSelectedIds(new Set());
      showToast("Archive modified", "success");
  };

  useEffect(() => {
      const close = () => setContextMenu(null);
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
  }, []);

  return (
    <div className={`flex-1 flex flex-col h-full relative overflow-hidden ${fieldMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Mobile Floating Bar */}
      {isMobile && selectedIds.size > 0 && (
          <div className={`absolute z-[100] animate-in slide-in-from-bottom-4 duration-300 bottom-8 left-4 right-4 translate-x-0`}>
              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl p-1 flex items-center gap-1 ring-4 ring-black/10 overflow-x-auto no-scrollbar max-w-full">
                  <div className="flex p-1 gap-1 shrink-0">
                      <button onClick={handleCreateManifestFromSelection} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-white group whitespace-nowrap">
                          <Icon name="auto_stories" className="text-green-400" />
                          <div className="text-left">
                              <div className="text-xs font-bold">Group</div>
                          </div>
                      </button>
                      
                      {selectionDNA.hasGPS && (
                          <button onClick={() => setView('map')} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-white group whitespace-nowrap">
                              <Icon name="explore" className="text-blue-400" />
                              <div className="text-left">
                                  <div className="text-xs font-bold">Map</div>
                              </div>
                          </button>
                      )}

                      <button onClick={() => onCatalogSelection?.(Array.from(selectedIds))} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-white group whitespace-nowrap">
                          <Icon name="table_chart" className="text-amber-400" />
                          <div className="text-left">
                              <div className="text-xs font-bold">Catalog</div>
                          </div>
                      </button>

                      <div className="w-px h-8 bg-slate-700 mx-1"></div>
                      
                      <button onClick={() => setSelectedIds(new Set())} className="p-3 text-slate-500 hover:text-white hover:bg-red-500/20 rounded-xl transition-all">
                          <Icon name="close" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className={`h-16 border-b px-6 flex items-center justify-between shadow-sm z-10 shrink-0 ${fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <h2 className={`font-bold ${fieldMode ? 'text-xl text-yellow-400' : 'text-lg text-slate-800'}`}>Archive</h2>
          {!isMobile && selectedIds.size === 0 && (
              <div className="h-4 w-px bg-slate-500"></div>
          )}
          {!isMobile && selectedIds.size === 0 && (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                  Select items to begin synthesis pipeline
              </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isMobile && (
              <div className="relative">
                <Icon name="search" className={`absolute left-3 top-2.5 text-lg ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="text" placeholder="Filter archive..." value={filter} onChange={(e) => setFilter(e.target.value)} className={`pl-10 pr-3 py-2 border rounded-md text-sm outline-none transition-all w-64 ${fieldMode ? 'bg-slate-800 border-slate-600 text-white focus:border-yellow-400 placeholder:text-slate-600' : 'bg-slate-100 border-transparent focus:bg-white focus:border-iiif-blue'}`} />
              </div>
          )}
          <div className={`flex p-1 rounded-md ${fieldMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {['grid', 'list', 'map', 'timeline'].map((v: any) => (
              <button key={v} onClick={() => setView(v)} className={`p-2 rounded ${view === v ? (fieldMode ? 'bg-yellow-400 text-black font-bold' : 'bg-white text-iiif-blue shadow-sm') : 'text-slate-400'}`}>
                <Icon name={v === 'grid' ? 'grid_view' : v === 'list' ? 'view_list' : v} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Relative Bar - Pushes content down */}
      {!isMobile && selectedIds.size > 0 && (
          <div className="w-full flex justify-center py-4 bg-slate-50 border-b border-slate-200 z-10 animate-in slide-in-from-top-2">
              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-xl rounded-2xl p-1 flex items-center gap-1 ring-1 ring-black/10 overflow-x-auto no-scrollbar max-w-full">
                  <div className="px-4 border-r border-slate-700 py-2 shrink-0">
                      <span className="text-[10px] font-black uppercase text-slate-500 block leading-none">Selection</span>
                      <span className="text-sm font-bold text-white leading-none">{selectedIds.size} Items</span>
                  </div>
                  <div className="flex p-1 gap-1 shrink-0">
                      <button onClick={handleCreateManifestFromSelection} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-white group whitespace-nowrap">
                          <Icon name="auto_stories" className="text-green-400" />
                          <div className="text-left">
                              <div className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Synthesize</div>
                              <div className="text-xs font-bold">Group</div>
                          </div>
                      </button>
                      
                      {selectionDNA.hasGPS && (
                          <button onClick={() => setView('map')} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-white group whitespace-nowrap">
                              <Icon name="explore" className="text-blue-400" />
                              <div className="text-left">
                                  <div className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Spatial</div>
                                  <div className="text-xs font-bold">Map</div>
                              </div>
                          </button>
                      )}

                      <button onClick={() => onCatalogSelection?.(Array.from(selectedIds))} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all text-white group whitespace-nowrap">
                          <Icon name="table_chart" className="text-amber-400" />
                          <div className="text-left">
                              <div className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Edit in</div>
                              <div className="text-xs font-bold">Catalog</div>
                          </div>
                      </button>

                      <div className="w-px h-8 bg-slate-700 mx-1"></div>
                      
                      <button onClick={() => setSelectedIds(new Set())} className="p-3 text-slate-500 hover:text-white hover:bg-red-500/20 rounded-xl transition-all">
                          <Icon name="close" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-y-auto custom-scrollbar pb-24 ${view === 'map' || view === 'timeline' ? 'p-0' : 'p-6'} transition-all duration-300 ${!isMobile && activeItem ? 'w-1/3 max-w-sm border-r border-slate-200' : ''}`}>
            {view === 'grid' && (
            <div className={`grid gap-4 ${!isMobile && activeItem ? 'grid-cols-1 lg:grid-cols-2' : (fieldMode ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8')}`}>
                {filteredAssets.map((asset) => {
                const dna = getFileDNA(asset);
                const isSelected = selectedIds.has(asset.id);
                const paintingBody = asset.items?.[0]?.items?.[0]?.body as any;
                const imageUrl = asset.thumbnail?.[0]?.id || paintingBody?.id || asset._blobUrl;
                const config = RESOURCE_TYPE_CONFIG['Canvas'];

                return (
                    <div 
                    key={asset.id} 
                    onContextMenu={(e) => handleContextMenu(e, asset.id)}
                    className={`group relative rounded-lg shadow-sm cursor-pointer transition-all ${
                        fieldMode 
                            ? (isSelected ? 'bg-slate-800 border-4 border-yellow-400 p-2' : 'bg-slate-800 border border-slate-700 p-3')
                            : (isSelected ? 'bg-blue-50 border border-iiif-blue ring-2 ring-iiif-blue p-2' : `bg-white border p-2 hover:shadow-md border-slate-200`)
                    }`}
                    onClick={(e) => handleItemClick(e, asset)}
                    >
                    <div className={`aspect-square rounded overflow-hidden flex items-center justify-center mb-2 relative ${fieldMode ? 'bg-black' : 'bg-slate-100'}`}>
                        {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" loading="lazy" /> : null}
                        <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-full flex gap-1.5 font-sans">
                            {dna.time && <Icon name="schedule" className="text-[10px] text-yellow-400" title="Has Time metadata"/>}
                            {dna.location && <Icon name="location_on" className="text-[10px] text-green-400" title="Has GPS metadata"/>}
                            {dna.device && <Icon name="photo_camera" className="text-[10px] text-blue-400" title="Has Device metadata"/>}
                        </div>
                    </div>
                    <div className="px-1 min-w-0">
                        <div className={`font-medium truncate ${fieldMode ? 'text-white text-sm' : 'text-slate-700 text-[11px]'}`}>
                            <Icon name={config.icon} className={`mr-1 text-[10px] opacity-60 ${config.colorClass}`}/>
                            {getIIIFValue(asset.label)}
                        </div>
                    </div>
                    </div>
                );
                })}
            </div>
            )}
            {view === 'list' && <AssetList assets={filteredAssets} onSelect={handleItemClick} selectedIds={selectedIds} fieldMode={fieldMode} />}
            {view === 'map' && <MapView root={root} onSelect={(item: IIIFItem) => onSelect(item)} />}
            {view === 'timeline' && <TimelineView root={root} onSelect={(item: IIIFItem) => onSelect(item)} />}
        </div>

        {!isMobile && activeItem && (
            <div className="flex-1 bg-slate-900 relative z-0 flex flex-col overflow-hidden shadow-2xl border-l border-slate-800">
                <Viewer item={activeItem} onUpdate={() => {}} />
                <button 
                    onClick={() => setSelectedIds(new Set())}
                    className="absolute top-3 right-3 z-50 p-2 bg-black/60 text-white/70 hover:text-white rounded-full hover:bg-red-500 transition-all backdrop-blur-md"
                    title="Close Detail View"
                >
                    <Icon name="close_fullscreen" className="text-lg"/>
                </button>
            </div>
        )}
      </div>

      {contextMenu && (
          <div className="fixed z-[1000] bg-white border border-slate-200 shadow-2xl rounded-xl py-2 min-w-[200px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <button onClick={() => { const id = contextMenu.id as string; onReveal?.(id, 'collections'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><Icon name="account_tree" className="text-slate-400"/> Reveal in Structure</button>
              <button onClick={() => { const id = contextMenu.id as string; onReveal?.(id, 'viewer'); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><Icon name="auto_awesome_motion" className="text-slate-400"/> Open in Workbench</button>
              <button onClick={() => { onCatalogSelection?.([contextMenu.id]); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><Icon name="table_chart" className="text-slate-400"/> Edit in Catalog</button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button onClick={() => handleDelete([contextMenu.id])} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600"><Icon name="delete" className="text-red-400"/> Remove from Archive</button>
          </div>
      )}
    </div>
  );
};

const AssetList: React.FC<{ assets: IIIFCanvas[], onSelect: any, selectedIds: Set<string>, fieldMode: boolean }> = ({ assets, onSelect, selectedIds, fieldMode }) => {
    return (
    <div className={`border rounded-lg shadow-sm overflow-hidden flex flex-col ${fieldMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className={`${fieldMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-500'} border-b ${fieldMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <tr>
                <th className="px-4 py-3 font-medium w-10">
                    <Icon name="check_box_outline_blank" className="opacity-50" />
                </th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium w-32">Type</th>
                <th className="px-4 py-3 font-medium w-40">Date</th>
                <th className="px-4 py-3 font-medium w-32 text-right">Dimensions</th>
                </tr>
            </thead>
            <tbody className={`divide-y ${fieldMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {assets.map((asset) => {
                    const isSelected = selectedIds.has(asset.id);
                    const label = getIIIFValue(asset.label) || 'Untitled';
                    const config = RESOURCE_TYPE_CONFIG[asset.type] || RESOURCE_TYPE_CONFIG['Canvas'];
                    const date = asset.navDate ? new Date(asset.navDate).toLocaleDateString() : '-';
                    const dims = asset.width && asset.height ? `${asset.width} x ${asset.height}` : (asset.duration ? `${asset.duration}s` : '-');

                    return (
                        <tr 
                            key={asset.id} 
                            className={`cursor-pointer transition-colors group ${
                                fieldMode 
                                    ? (isSelected ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800') 
                                    : (isSelected ? 'bg-blue-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50')
                            }`} 
                            onClick={(e) => onSelect(e, asset)}
                        >
                            <td className="px-4 py-3">
                                <Icon 
                                    name={isSelected ? "check_box" : "check_box_outline_blank"} 
                                    className={`${isSelected ? 'text-iiif-blue' : (fieldMode ? 'text-slate-600' : 'text-slate-300')} group-hover:text-iiif-blue transition-colors`} 
                                />
                            </td>
                            <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 overflow-hidden ${fieldMode ? 'bg-black' : 'bg-slate-100'}`}>
                                        {(asset as any).thumbnail?.[0]?.id || asset._blobUrl ? (
                                            <img src={(asset as any).thumbnail?.[0]?.id || asset._blobUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <Icon name={config.icon} className={`${config.colorClass} opacity-70`} />
                                        )}
                                    </div>
                                    <span className="truncate max-w-[200px] md:max-w-md" title={label}>{label}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`text-[10px] uppercase font-black px-2 py-1 rounded border ${
                                    fieldMode 
                                        ? 'bg-slate-950 border-slate-800 text-slate-400' 
                                        : 'bg-slate-100 border-slate-200 text-slate-500'
                                }`}>
                                    {asset.type}
                                </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs opacity-70">{date}</td>
                            <td className="px-4 py-3 font-mono text-xs opacity-70 text-right">{dims}</td>
                        </tr>
                    );
                })}
            </tbody>
            </table>
        </div>
        {assets.length === 0 && (
            <div className="p-8 text-center text-slate-400 italic">No items found</div>
        )}
    </div>
)};
