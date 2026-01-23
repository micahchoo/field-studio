import React, { useMemo, useState, useEffect } from 'react';
import { ValidationIssue, IssueCategory } from '../services/validator';
import { Icon } from './Icon';
import { IIIFItem, getIIIFValue } from '../types';

interface QCDashboardProps {
  issuesMap: Record<string, ValidationIssue[]>;
  totalItems: number;
  root: IIIFItem | null;
  onSelect: (id: string) => void;
  onUpdate: (newRoot: IIIFItem) => void;
  onClose: () => void;
}

const IIIF_PROPERTY_SUGGESTIONS = [
  "Title", "Creator", "Date", "Description", "Subject", 
  "Rights", "Source", "Type", "Format", "Identifier", 
  "Language", "Coverage", "Publisher", "Contributor", "Relation"
];

const CATEGORIES: { id: IssueCategory; icon: string; label: string }[] = [
    { id: 'Identity', icon: 'fingerprint', label: 'Identity & IDs' },
    { id: 'Structure', icon: 'account_tree', label: 'Hierarchy' },
    { id: 'Metadata', icon: 'label', label: 'Labels & Descriptive' },
    { id: 'Content', icon: 'image', label: 'Media & Technical' }
];

export const QCDashboard: React.FC<QCDashboardProps> = ({ issuesMap, totalItems, root, onSelect, onUpdate, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<IssueCategory>('Identity');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const allIssues = useMemo(() => Object.values(issuesMap).flat(), [issuesMap]);
  const categoryIssues = useMemo(() => allIssues.filter(i => i.category === activeCategory), [allIssues, activeCategory]);
  
  const errors = allIssues.filter(i => i.level === 'error');
  const healthScore = totalItems > 0 ? Math.max(0, Math.round(((totalItems - errors.length) / totalItems) * 100)) : 100;

  // Auto-clear selection if fixed
  useEffect(() => {
    if (selectedIssueId && !allIssues.some(i => i.id === selectedIssueId)) {
        setSelectedIssueId(null);
    }
  }, [allIssues, selectedIssueId]);

  const selectedIssue = useMemo(() => allIssues.find(i => i.id === selectedIssueId), [allIssues, selectedIssueId]);

  const findItemAndPath = (id: string) => {
    if (!root) return { item: null, path: [] };
    const path: { id: string, label: string, type: string }[] = [];
    let found: IIIFItem | null = null;
    const traverse = (node: IIIFItem, currentPath: { id: string, label: string, type: string }[]): boolean => {
        const nodeInfo = { id: node.id, label: getIIIFValue(node.label) || 'Untitled', type: node.type };
        if (node.id === id) { 
            found = node; 
            path.push(...currentPath, nodeInfo); 
            return true; 
        }
        const children = (node as any).items || (node as any).annotations || [];
        for (const child of children) {
            if (traverse(child, [...currentPath, nodeInfo])) return true;
        }
        return false;
    };
    traverse(root, []);
    return { item: found, path };
  };

  const { item: previewItem, path: previewPath } = useMemo(() => 
    selectedIssue ? findItemAndPath(selectedIssue.itemId) : { item: null, path: [] }
  , [selectedIssue, root]);

  const handleUpdateItem = (itemId: string, updates: Partial<IIIFItem>) => {
      if (!root) return;
      const newRoot = JSON.parse(JSON.stringify(root));
      const traverse = (node: IIIFItem): boolean => {
          if (node.id === itemId) {
              Object.assign(node, updates);
              return true;
          }
          const children = (node as any).items || (node as any).annotations || (node as any).structures || [];
          for (const child of children) if (traverse(child)) return true;
          return false;
      };
      if (traverse(newRoot)) onUpdate(newRoot);
  };

  const handleHeal = (issue: ValidationIssue) => {
      if (!root) return;
      const newRoot = JSON.parse(JSON.stringify(root));
      let solved = false;

      const traverseAndFix = (node: IIIFItem): boolean => {
          if (node.id === issue.itemId) {
              if (issue.message.includes('label')) {
                  node.label = { none: [node.id.split('/').pop() || 'Fixed Resource'] };
                  solved = true;
              }
              if (issue.message.includes('summary')) {
                  node.summary = { none: [`Summary for ${getIIIFValue(node.label) || 'resource'}`] };
                  solved = true;
              }
              if (issue.message.includes('HTTP')) {
                  node.id = `http://archive.local/iiif/resource/${crypto.randomUUID()}`;
                  solved = true;
              }
              if (issue.message.includes('Duplicate ID')) {
                  node.id = `${node.id}-${crypto.randomUUID().slice(0,4)}`;
                  solved = true;
              }
              if (issue.message.includes('dimensions') || issue.message.includes('width')) {
                  (node as any).width = 2000;
                  (node as any).height = 2000;
                  solved = true;
              }
              if (issue.message.includes('structures') && node.type === 'Collection') {
                  delete (node as any).structures;
                  solved = true;
              }
              if (issue.message.includes('items')) {
                  if (!node.items) node.items = [];
                  if (node.type === 'Manifest' && node.items.length === 0) {
                      node.items.push({ id: `${node.id}/canvas/1`, type: 'Canvas', label: { none: ['Page 1'] }, width: 2000, height: 2000, items: [] });
                  }
                  solved = true;
              }
              return true;
          }
          const children = (node as any).items || (node as any).annotations || (node as any).structures || [];
          for (const child of children) if (traverseAndFix(child)) return true;
          return false;
      };
      
      traverseAndFix(newRoot);
      if (solved) onUpdate(newRoot);
  };

  const handleRemoveMetadata = (itemId: string, index: number) => {
      if (!previewItem || !previewItem.metadata) return;
      const newMeta = [...previewItem.metadata];
      newMeta.splice(index, 1);
      handleUpdateItem(itemId, { metadata: newMeta });
  };

  const handleAddMetadata = (itemId: string, label: string) => {
      if (!previewItem) return;
      const newMeta = [...(previewItem.metadata || []), { label: { en: [label] }, value: { en: [''] } }];
      handleUpdateItem(itemId, { metadata: newMeta });
      setShowAddMenu(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[600] flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-[1400px] h-[90vh] rounded-3xl shadow-2xl flex overflow-hidden border border-slate-200">
        
        {/* Left Sidebar: Categories */}
        <div className="w-64 bg-slate-50 border-r flex flex-col shrink-0">
            <div className="p-6 border-b">
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shadow-lg mb-4 ${healthScore > 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <span className="text-lg font-black leading-none">{healthScore}%</span>
                    <span className="text-[7px] font-black uppercase tracking-widest">Health</span>
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Integrity Guard</h2>
            </div>
            <div className="flex-1 p-3 space-y-1">
                {CATEGORIES.map(cat => {
                    const count = allIssues.filter(i => i.category === cat.id).length;
                    return (
                        <button 
                            key={cat.id} 
                            onClick={() => setActiveCategory(cat.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeCategory === cat.id ? 'bg-white shadow-md text-iiif-blue font-bold ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon name={cat.icon} className="text-sm" />
                                <span className="text-xs uppercase tracking-wider">{cat.label}</span>
                            </div>
                            {count > 0 && <span className={`text-[10px] px-1.5 rounded-full font-bold ${count > 5 ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>{count}</span>}
                        </button>
                    );
                })}
            </div>
            <div className="p-4 bg-slate-900 text-white flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Global Status</span>
                <span className="text-[10px] font-bold text-green-400 flex items-center gap-1"><Icon name="verified" className="text-xs"/> {totalItems} Resources Monitored</span>
            </div>
        </div>

        {/* Middle: Issues List */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0 border-r border-slate-100">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Icon name="list" className="text-slate-400"/>
                    Detected Violations in {activeCategory}
                </h3>
                <button 
                    onClick={() => categoryIssues.filter(i => i.fixable).forEach(handleHeal)}
                    className="text-[10px] font-black uppercase px-4 py-2 bg-iiif-blue text-white rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95"
                >
                    Heal All Fixable
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {categoryIssues.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <Icon name="task_alt" className="text-6xl mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">No issues in this category</p>
                    </div>
                ) : (
                    categoryIssues.map(issue => (
                        <div 
                            key={issue.id} 
                            onClick={() => setSelectedIssueId(issue.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between ${selectedIssueId === issue.id ? 'bg-blue-50 border-iiif-blue ring-2 ring-blue-100 shadow-lg' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                        >
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${issue.level === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {issue.level}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-800 truncate">{issue.itemLabel}</span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1">{issue.message}</p>
                            </div>
                            {issue.fixable && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleHeal(issue); }}
                                    className="px-5 py-1.5 bg-green-600 text-white text-[9px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow hover:bg-green-700"
                                >
                                    Fix It
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Right: Contextual Preview & Interactive Fixes */}
        <div className="w-[450px] bg-slate-50 flex flex-col shrink-0">
            <div className="p-6 border-b flex justify-between items-center bg-white shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archival Context & Tools</span>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><Icon name="close" className="text-slate-400"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {selectedIssue && previewItem ? (
                    <div className="space-y-6 animate-in slide-in-from-right-2">
                        {/* Image Preview */}
                        <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden border shadow-inner relative group ring-4 ring-white">
                            {(previewItem as any)._blobUrl || (previewItem as any).thumbnail?.[0]?.id ? (
                                <img src={(previewItem as any)._blobUrl || (previewItem as any).thumbnail?.[0].id} className="w-full h-full object-contain" />
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-700">
                                    <Icon name="image_not_supported" className="text-4xl opacity-20" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-black/50 text-[8px] text-white px-1.5 py-0.5 rounded uppercase font-black tracking-widest">
                                {previewItem.type} Preview
                            </div>
                        </div>

                        {/* Interactive Hierarchy Tree */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Archive Hierarchy Trace</label>
                            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                {previewPath.map((p, i) => (
                                    <div key={i} style={{ paddingLeft: (i * 12) + 12 }} className={`flex items-center gap-2 p-2 border-b last:border-b-0 ${i === previewPath.length - 1 ? 'bg-blue-50 border-l-4 border-l-iiif-blue' : 'bg-white opacity-60'}`}>
                                        <Icon name={p.type === 'Collection' ? 'folder' : p.type === 'Manifest' ? 'menu_book' : 'crop_original'} className={`text-xs ${i === previewPath.length - 1 ? 'text-iiif-blue' : 'text-slate-400'}`}/>
                                        <span className={`text-[10px] truncate ${i === previewPath.length - 1 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{p.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Direct Metadata & Label Editor */}
                        {(activeCategory === 'Metadata' || activeCategory === 'Identity') && (
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Interactive Workbench</label>
                                <div className="bg-white border p-5 rounded-2xl space-y-4 shadow-sm">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Resource Label</label>
                                        <input 
                                            value={getIIIFValue(previewItem.label)}
                                            onChange={(e) => handleUpdateItem(previewItem.id, { label: { none: [e.target.value] } })}
                                            className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-iiif-blue outline-none font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Scientific Summary</label>
                                        <textarea 
                                            value={getIIIFValue(previewItem.summary)}
                                            onChange={(e) => handleUpdateItem(previewItem.id, { summary: { none: [e.target.value] } })}
                                            className="w-full text-xs p-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-iiif-blue outline-none font-medium min-h-[60px]"
                                            placeholder="Provide a descriptive summary..."
                                        />
                                    </div>
                                    
                                    <div className="pt-2 border-t">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Archive Metadata</label>
                                            <div className="relative">
                                                <button onClick={() => setShowAddMenu(!showAddMenu)} className="text-[9px] font-black uppercase text-iiif-blue hover:underline flex items-center gap-1">Add Field <Icon name="expand_more" className="text-[10px]"/></button>
                                                {showAddMenu && (
                                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-2 z-[700] min-w-[140px] max-h-[200px] overflow-y-auto custom-scrollbar">
                                                        {IIIF_PROPERTY_SUGGESTIONS.map(prop => (
                                                            <button 
                                                                key={prop} 
                                                                onClick={() => handleAddMetadata(previewItem.id, prop)}
                                                                className="w-full px-4 py-1.5 text-left text-[10px] font-bold text-slate-600 hover:bg-blue-50 transition-colors"
                                                            >
                                                                {prop}
                                                            </button>
                                                        ))}
                                                        <div className="border-t mt-1 pt-1">
                                                            <button onClick={() => handleAddMetadata(previewItem.id, "New Field")} className="w-full px-4 py-1.5 text-left text-[10px] font-black text-slate-400 hover:bg-slate-50 italic">Custom...</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {(previewItem.metadata || []).length === 0 ? (
                                                <p className="text-[10px] text-slate-400 italic">No custom metadata tags.</p>
                                            ) : (
                                                previewItem.metadata!.map((md, idx) => (
                                                    <div key={idx} className="flex gap-2 group/meta">
                                                        <input 
                                                            value={getIIIFValue(md.label)}
                                                            className="w-1/3 text-[9px] font-black uppercase text-slate-500 bg-slate-50 border-none rounded p-1.5"
                                                            onChange={(e) => {
                                                                if (!previewItem.metadata) return;
                                                                const newMeta = JSON.parse(JSON.stringify(previewItem.metadata));
                                                                newMeta[idx].label = { en: [e.target.value] };
                                                                handleUpdateItem(previewItem.id, { metadata: newMeta });
                                                            }}
                                                        />
                                                        <input 
                                                            value={getIIIFValue(md.value)}
                                                            className="flex-1 text-[10px] font-bold text-slate-700 bg-slate-50 border-none rounded p-1.5"
                                                            onChange={(e) => {
                                                                if (!previewItem.metadata) return;
                                                                const newMeta = JSON.parse(JSON.stringify(previewItem.metadata));
                                                                newMeta[idx].value = { en: [e.target.value] };
                                                                handleUpdateItem(previewItem.id, { metadata: newMeta });
                                                            }}
                                                        />
                                                        <button 
                                                            onClick={() => handleRemoveMetadata(previewItem.id, idx)}
                                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover/meta:opacity-100 transition-all"
                                                        >
                                                            <Icon name="close" className="text-sm"/>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Raw Resource DNA */}
                        <div className="space-y-2 opacity-50 grayscale hover:grayscale-0 transition-all">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Technical Signature</label>
                            <div className="bg-slate-900 p-4 rounded-2xl font-mono text-[9px] text-blue-300 leading-relaxed overflow-hidden border border-white/10 shadow-xl">
                                <p className="text-white/40 mb-1">// {previewItem.type} ID</p>
                                <p className="break-all text-green-400 mb-2">{previewItem.id}</p>
                                <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                                    <span className="text-white/40">Children: {(previewItem.items || []).length}</span>
                                    <span className="text-white/40">Annotations: {(previewItem.annotations || []).length}</span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => { onSelect(selectedIssue.itemId); onClose(); }}
                            className="w-full bg-slate-800 text-white p-4 rounded-2xl text-xs font-black uppercase hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-xl"
                        >
                            <Icon name="location_searching" /> Reveal in Workbench
                        </button>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center p-8">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-md border rotate-3">
                            <Icon name="biotech" className="text-3xl opacity-20 text-iiif-blue"/>
                        </div>
                        <h4 className="text-sm font-black uppercase text-slate-400 tracking-tighter">Diagnostic Panel Ready</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2 max-w-[200px]">Select an issue from the list to begin structural repair</p>
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-white border-t">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <Icon name="auto_fix_high" className="text-blue-500 text-sm mt-0.5" />
                    <p className="text-[10px] text-blue-800 leading-tight italic">Direct healing allows you to patch standard violations without leaving the diagnostic dashboard.</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};