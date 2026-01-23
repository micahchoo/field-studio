
import React, { useState, useEffect, useMemo } from 'react';
import { IIIFItem, getIIIFValue } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { RESOURCE_TYPE_CONFIG, RIGHTS_OPTIONS, VIEWING_DIRECTIONS, DUBLIN_CORE_MAP } from '../../constants';

interface MetadataSpreadsheetProps {
  root: IIIFItem | null;
  onUpdate: (updatedRoot: IIIFItem) => void;
  filterIds?: string[] | null;
  onClearFilter?: () => void;
}

interface FlatItem {
    id: string;
    type: string;
    label: string;
    summary: string;
    metadata: Record<string, string>;
    rights: string;
    navDate: string;
    viewingDirection: string;
    _blobUrl?: string;
}

type ResourceTab = 'All' | 'Collection' | 'Manifest' | 'Canvas';

const IIIF_PROPERTY_SUGGESTIONS = [
  "Title", "Creator", "Date", "Description", "Subject", 
  "Rights", "Source", "Type", "Format", "Identifier", 
  "Language", "Coverage", "Publisher", "Contributor", "Relation"
];

export const MetadataSpreadsheet: React.FC<MetadataSpreadsheetProps> = ({ root, onUpdate, filterIds, onClearFilter }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<FlatItem[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<ResourceTab>('All');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSystemItems, setShowSystemItems] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState<{ id: string } | null>(null);

  useEffect(() => {
      if (!root) {
          setItems([]);
          return;
      }
      const flatList: FlatItem[] = [];
      const metaKeys = new Set<string>();

      const traverse = (node: IIIFItem) => {
          if (!node) return;
          
          const isStructural = ['AnnotationPage', 'Annotation', 'Range'].includes(node.type);
          if (showSystemItems || !isStructural) {
              flatList.push({
                  id: node.id, 
                  type: node.type,
                  label: getIIIFValue(node.label),
                  summary: getIIIFValue(node.summary),
                  rights: node.rights || '', 
                  navDate: node.navDate || '',
                  viewingDirection: node.viewingDirection || '',
                  metadata: (node.metadata || []).reduce((acc, m) => {
                      const key = getIIIFValue(m.label, 'en') || 'Unknown';
                      acc[key] = getIIIFValue(m.value, 'en');
                      metaKeys.add(key);
                      return acc;
                  }, {} as Record<string, string>),
                  _blobUrl: node._blobUrl || (node as any).thumbnail?.[0]?.id || (node.type === 'Canvas' ? (node as any).items?.[0]?.items?.[0]?.body?.id : undefined)
              });
          }
          
          const children = (node as any).items || (node as any).annotations || [];
          if (Array.isArray(children)) {
            children.forEach((child: any) => {
                if (child && typeof child === 'object') traverse(child);
            });
          }
      };
      
      traverse(root);
      setItems(flatList);
      
      // Core IIIF properties are separated from custom metadata
      const coreCols = ['Title', 'Summary', 'Date', 'Rights'];
      const dynamicCols = Array.from(metaKeys).filter(k => !coreCols.includes(k));
      setColumns([...coreCols, ...dynamicCols]);
  }, [root, showSystemItems]);

  const filteredItems = useMemo(() => {
    return items.filter(i => {
        const labelStr = (i.label || '').toLowerCase();
        const typeStr = (i.type || '').toLowerCase();
        const filterStr = filter.toLowerCase();
        
        // Apply Archive Selection Filter if context was transferred
        const matchesSelection = filterIds ? filterIds.includes(i.id) : true;
        const matchesSearch = labelStr.includes(filterStr) || typeStr.includes(filterStr);
        const matchesTab = activeTab === 'All' || i.type === activeTab;
        
        return matchesSelection && matchesSearch && matchesTab;
    });
  }, [items, filter, activeTab, filterIds]);

  const handleCellChange = (id: string, field: string, value: string, isMeta: boolean) => {
      setHasUnsavedChanges(true);
      setItems(prev => prev.map(item => {
          if (item.id !== id) return item;
          if (isMeta) return { ...item, metadata: { ...item.metadata, [field]: value } };
          
          const normalizedField = field.toLowerCase();
          if (normalizedField === 'title') return { ...item, label: value };
          if (normalizedField === 'summary') return { ...item, summary: value };
          if (normalizedField === 'date') return { ...item, navDate: value };
          if (normalizedField === 'rights') return { ...item, rights: value };
          if (normalizedField === 'viewingdirection') return { ...item, viewingDirection: value };
          return { ...item, [field as keyof FlatItem]: value } as FlatItem;
      }));
  };

  const handleAddField = (id: string, label: string) => {
    setHasUnsavedChanges(true);
    setItems(prev => prev.map(item => {
        if (item.id !== id) return item;
        return { ...item, metadata: { ...item.metadata, [label]: '' } };
    }));
    if (!columns.includes(label)) setColumns([...columns, label]);
    setShowAddMenu(null);
  };

  const handleSave = () => {
      if (!root) return;
      const newRoot = JSON.parse(JSON.stringify(root));
      
      const updateNode = (node: IIIFItem) => {
          const flat = items.find(i => i.id === node.id);
          if (flat) {
              node.label = { none: [flat.label] };
              node.summary = { none: [flat.summary] };
              node.rights = flat.rights;
              node.navDate = flat.navDate;
              node.viewingDirection = flat.viewingDirection as any;
              node.metadata = Object.entries(flat.metadata).map(([k, v]) => ({ 
                label: { en: [k] }, 
                value: { en: [v as string] } 
              }));
          }
          const children = (node as any).items || (node as any).annotations || [];
          if (Array.isArray(children)) {
            children.forEach((child: any) => updateNode(child));
          }
      };
      
      updateNode(newRoot);
      onUpdate(newRoot);
      setHasUnsavedChanges(false);
      showToast("Archive metadata synchronized", "success");
  };

  const getDCHint = (col: string) => {
      const lower = col.toLowerCase();
      const match = Object.keys(DUBLIN_CORE_MAP).find(k => k.toLowerCase() === lower);
      return match ? DUBLIN_CORE_MAP[match] : null;
  };

  if (!root) return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">
          <div className="text-center">
              <Icon name="table_chart" className="text-6xl mb-4 opacity-20"/>
              <p className="font-bold uppercase tracking-widest text-xs">Load an archive to view catalog</p>
          </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-white text-slate-900">
      <div className="h-16 border-b px-6 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Icon name="table_chart" className="text-green-600"/> Catalog
            </h2>
            <div className="relative">
                <Icon name="search" className="absolute left-3 top-2.5 text-slate-400"/>
                <input 
                    type="text" 
                    placeholder="Filter current view..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)} 
                    className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none w-64 bg-white text-slate-900 shadow-sm focus:ring-2 focus:ring-iiif-blue/20" 
                />
            </div>
            {filterIds && (
               <button 
                onClick={onClearFilter}
                className="px-3 py-1.5 bg-iiif-blue/10 text-iiif-blue rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-in zoom-in-95"
               >
                 Showing {filterIds.length} Selection Items <Icon name="close" className="text-xs"/>
               </button>
            )}
        </div>
        <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                    <Icon name="warning" className="text-xs"/> Pending Sync
                </span>
            )}
            <button 
                onClick={handleSave} 
                className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 shadow-md flex items-center gap-2 transition-all active:scale-95"
            >
                <Icon name="save" /> Commit Changes
            </button>
        </div>
      </div>

      <div className="flex border-b bg-white px-6 shrink-0 overflow-x-auto no-scrollbar">
        {(['All', 'Collection', 'Manifest', 'Canvas'] as ResourceTab[]).map(tab => (
            <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest relative border-b-2 transition-all ${activeTab === tab ? 'text-iiif-blue border-b-2 border-iiif-blue bg-blue-50/20' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
            >
                {tab}s
            </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto bg-slate-100 custom-scrollbar">
        {filteredItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 italic">
                No items match your catalog filters.
            </div>
        ) : (
            <table className="w-full border-collapse text-sm bg-white">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b-2 border-slate-200">
                    <tr>
                        <th className="border-r px-4 py-3 text-left font-black uppercase text-[10px] text-slate-500 w-12 tracking-tighter bg-slate-50">#</th>
                        <th className="border-r px-4 py-3 text-left font-black uppercase text-[10px] text-slate-500 w-32 tracking-widest bg-slate-50">Type</th>
                        {columns.map(col => {
                            const dc = getDCHint(col);
                            return (
                                <th key={col} className="border-r px-4 py-3 text-left font-black uppercase text-[10px] text-slate-600 min-w-[200px] whitespace-nowrap tracking-wider bg-slate-50">
                                    {col}
                                    {dc && <span className="ml-2 bg-slate-200 text-slate-500 px-1 rounded text-[8px] font-mono lowercase">{dc}</span>}
                                </th>
                            );
                        })}
                        <th className="px-4 py-3 text-left font-black uppercase text-[10px] text-slate-500 w-12 bg-slate-50 tracking-tighter"></th>
                    </tr>
                </thead>
                <tbody>
                    {filteredItems.map((item, idx) => {
                        const config = RESOURCE_TYPE_CONFIG[item.type] || RESOURCE_TYPE_CONFIG['Content'];
                        return (
                        <React.Fragment key={item.id}>
                            <tr 
                                className={`hover:bg-blue-50 transition-colors group cursor-pointer ${expandedRow === item.id ? 'bg-blue-50 ring-1 ring-iiif-blue ring-inset' : ''}`} 
                                onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                            >
                                <td className="border-b border-r px-4 py-2 text-slate-400 text-[10px] font-mono">{idx + 1}</td>
                                <td className="border-b border-r px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <Icon name={expandedRow === item.id ? 'expand_less' : 'expand_more'} className={`text-xs transition-transform ${expandedRow === item.id ? 'text-iiif-blue' : 'text-slate-300'}`}/>
                                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded border flex items-center gap-1 ${config.bgClass} ${config.colorClass} ${config.borderClass}`}>
                                            <Icon name={config.icon} className="text-[10px]"/>
                                            {item.type}
                                        </span>
                                    </div>
                                </td>
                                {columns.map(col => {
                                    const isKeyField = ['Title', 'Summary', 'Rights', 'Date', 'ViewingDirection'].includes(col);
                                    let val = '';
                                    if (col === 'Title') val = item.label;
                                    else if (col === 'Summary') val = item.summary;
                                    else if (col === 'Rights') val = item.rights;
                                    else if (col === 'Date') val = item.navDate;
                                    else if (col === 'ViewingDirection') val = item.viewingDirection;
                                    else val = item.metadata[col] || '';

                                    // Render Specialized Editors
                                    if (col === 'Rights') {
                                        return (
                                            <td key={col} className="border-b border-r p-0 bg-white" onClick={e => e.stopPropagation()}>
                                                <select 
                                                    value={val} 
                                                    onChange={e => handleCellChange(item.id, 'rights', e.target.value, false)}
                                                    className="w-full h-full px-4 py-3 bg-transparent text-slate-800 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-iiif-blue outline-none transition-all font-medium border-none shadow-none text-xs"
                                                >
                                                    <option value="">(None)</option>
                                                    {RIGHTS_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        );
                                    }

                                    if (col === 'Date') {
                                        return (
                                            <td key={col} className="border-b border-r p-0 bg-white" onClick={e => e.stopPropagation()}>
                                                <input 
                                                    type="datetime-local" 
                                                    value={val ? val.slice(0, 16) : ''}
                                                    onChange={e => handleCellChange(item.id, 'date', e.target.value ? new Date(e.target.value).toISOString() : '', false)}
                                                    className="w-full h-full px-4 py-3 bg-transparent text-slate-800 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-iiif-blue outline-none transition-all font-medium border-none shadow-none text-xs"
                                                />
                                            </td>
                                        );
                                    }

                                    if (col === 'ViewingDirection') {
                                        return (
                                            <td key={col} className="border-b border-r p-0 bg-white" onClick={e => e.stopPropagation()}>
                                                <select 
                                                    value={val} 
                                                    onChange={e => handleCellChange(item.id, 'viewingDirection', e.target.value, false)}
                                                    className="w-full h-full px-4 py-3 bg-transparent text-slate-800 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-iiif-blue outline-none transition-all font-medium border-none shadow-none text-xs"
                                                >
                                                    <option value="">(Default)</option>
                                                    {VIEWING_DIRECTIONS.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td key={col} className="border-b border-r p-0 bg-white" onClick={e => e.stopPropagation()}>
                                            <input 
                                                type="text" 
                                                value={val} 
                                                onChange={e => handleCellChange(item.id, col, e.target.value, !isKeyField)} 
                                                className="w-full h-full px-4 py-3 bg-transparent text-slate-800 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-iiif-blue outline-none transition-all placeholder:text-slate-200 font-medium border-none shadow-none" 
                                            />
                                        </td>
                                    );
                                })}
                                <td className="border-b p-2 text-center" onClick={e => e.stopPropagation()}>
                                    <div className="relative">
                                        <button onClick={() => setShowAddMenu(showAddMenu?.id === item.id ? null : { id: item.id })} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-iiif-blue"><Icon name="add_circle" /></button>
                                        {showAddMenu?.id === item.id && (
                                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-2 z-50 min-w-[140px] max-h-[200px] overflow-y-auto custom-scrollbar">
                                                {IIIF_PROPERTY_SUGGESTIONS.map(prop => (
                                                    <button key={prop} onClick={() => handleAddField(item.id, prop)} className="w-full px-4 py-1.5 text-left text-[10px] font-bold text-slate-600 hover:bg-blue-50 transition-colors">{prop}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            {expandedRow === item.id && (
                                <tr className="bg-slate-50 border-b shadow-inner animate-in fade-in slide-in-from-top-1">
                                    <td colSpan={columns.length + 3} className="p-6">
                                        <div className="flex gap-8">
                                            <div className="w-72 aspect-square bg-slate-900 rounded-2xl overflow-hidden border-4 border-white shadow-2xl relative ring-1 ring-slate-200">
                                                {item._blobUrl ? (
                                                    <img src={item._blobUrl} className="w-full h-full object-contain" alt="Proof" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-50">
                                                        <Icon name="image_not_supported" className="text-5xl opacity-20"/>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-[8px] px-2 py-1 rounded-full font-black uppercase tracking-widest shadow-lg">
                                                    Archive Reference Preview
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-6">
                                                <div>
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Icon name="fingerprint" className="text-xs"/> Archival ID (URI)</h4>
                                                    <code className="text-[10px] text-iiif-blue bg-blue-50 px-3 py-1.5 rounded border border-blue-100 break-all block font-mono leading-relaxed">{item.id}</code>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                    {Object.entries(item.metadata).map(([k,v]) => (
                                                        <div key={k} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-tighter">{k}</span>
                                                            <span className="text-xs text-slate-700 font-bold leading-tight block">{v || <span className="opacity-20 italic">Empty</span>}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                                                     <Icon name="info" className="text-amber-500 mt-0.5" />
                                                     <div>
                                                         <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">Archival Catalog Mode</p>
                                                         <p className="text-[11px] text-amber-800 opacity-80 mt-0.5 italic leading-snug">Data edited here is instantly projected into the IIIF semantic model.</p>
                                                     </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                    })}
                </tbody>
            </table>
        )}
      </div>
      <div className="h-8 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-6 text-[10px] text-slate-500 uppercase font-black tracking-widest shrink-0 z-10">
          <div className="flex gap-4">
            <span>Catalog Sync Enabled</span>
          </div>
          <span>{filteredItems.length} Archive items listed</span>
      </div>
    </div>
  );
};
