import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyHealToTree, getFixDescription, healIssue, safeHealAll } from '@/src/entities/manifest/model/validation/validationHealer';
import { IssueCategory, ValidationIssue } from '@/src/entities/manifest/model/validation/validator';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { getIIIFValue, IIIFItem, isCanvas, isCollection, isManifest } from '@/src/shared/types';
import { resolveHierarchicalThumbs } from '@/utils/imageSourceResolver';
import { StackedThumbnail } from '@/src/shared/ui/molecules/StackedThumbnail';

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

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  /**
   * Memoized cache for findItemAndPath results
   * Prevents re-traversal for previously looked up items
   */
  const findItemCache = useRef<Map<string, { item: IIIFItem | null; path: { id: string; label: string; type: string }[] }>>(new Map());

  /**
   * Memoized findItemAndPath with caching
   * Uses DFS traversal with cycle detection
   * Cached results are cleared when root changes
   */
  const findItemAndPath = useCallback((id: string) => {
    // Check cache first
    const cached = findItemCache.current.get(id);
    if (cached) return cached;

    if (!root) return { item: null, path: [] as { id: string; label: string; type: string }[] };
    
    const path: { id: string, label: string, type: string }[] = [];
    let found: IIIFItem | null = null;
    const visited = new Set<string>();

    const traverse = (node: IIIFItem, currentPath: { id: string, label: string, type: string }[]): boolean => {
        if (visited.has(node.id)) return false;
        visited.add(node.id);

        const nodeInfo = { id: node.id, label: getIIIFValue(node.label) || 'Untitled', type: node.type };
        if (node.id === id) {
            found = node;
            path.push(...currentPath, nodeInfo);
            return true;
        }
        const children = node.items || node.annotations || [];
        for (const child of children) {
            if (traverse(child as IIIFItem, [...currentPath, nodeInfo])) return true;
        }
        return false;
    };
    
    traverse(root, []);
    const result = { item: found, path };
    
    // Cache the result
    findItemCache.current.set(id, result);
    return result;
  }, [root]);

  // Clear cache when root changes
  useEffect(() => {
    findItemCache.current.clear();
  }, [root]);

  const { item: previewItem, path: previewPath } = useMemo(() => 
    selectedIssue ? findItemAndPath(selectedIssue.itemId) : { item: null, path: [] }
  , [selectedIssue, root]);

  const handleUpdateItem = (itemId: string, updates: Partial<IIIFItem>) => {
      if (!root) return;
      const newRoot = JSON.parse(JSON.stringify(root));
      const visited = new Set<string>();

      const traverse = (node: IIIFItem): boolean => {
          if (visited.has(node.id)) return false;
          visited.add(node.id);

          if (node.id === itemId) {
              Object.assign(node, updates);
              return true;
          }
          const nodeWithStructures = node as IIIFItem & { structures?: IIIFItem[] };
          const children = node.items || node.annotations || nodeWithStructures.structures || [];
          for (const child of children) if (traverse(child as IIIFItem)) return true;
          return false;
      };
      if (traverse(newRoot)) onUpdate(newRoot);
  };

  // Use centralized healer service for consistent fix behavior across Inspector and QCDashboard
  const handleHeal = useCallback((issue: ValidationIssue) => {
      if (!root) return;
      
      try {
          const { item: targetItem } = findItemAndPath(issue.itemId);
          if (!targetItem) {
              console.warn('[QCDashboard] Could not find item to heal:', issue.itemId);
              return;
          }

          const result = healIssue(targetItem, issue);
          if (result.success && result.updatedItem) {
              const newRoot = applyHealToTree(root, issue.itemId, result.updatedItem);
              if (newRoot) {
                  onUpdate(newRoot);
              } else {
                  console.error('[QCDashboard] Failed to apply heal to tree');
              }
          } else if (result.error) {
              console.error('[QCDashboard] Healing failed:', result.error);
          }
      } catch (error) {
          console.error('[QCDashboard] Exception during healing:', error);
      }
  }, [root, findItemAndPath, onUpdate]);

  // Safe batch healing for "Heal All Fixable" button
  const handleHealAllFixable = useCallback(() => {
      if (!root) return;
      
      const fixableIssues = categoryIssues.filter(i => i.fixable);
      if (fixableIssues.length === 0) return;

      // Track if any updates were made
      let currentRoot = root;
      let healedCount = 0;
      let failedCount = 0;

      for (const issue of fixableIssues) {
          try {
              const { item: targetItem } = findItemAndPath(issue.itemId);
              if (!targetItem) {
                  failedCount++;
                  continue;
              }

              // Use safeHealAll for single-item batch healing
              const result = safeHealAll(targetItem, [issue]);
              if (result.success && result.updatedItem) {
                  const newRoot = applyHealToTree(currentRoot, issue.itemId, result.updatedItem);
                  if (newRoot) {
                      currentRoot = newRoot;
                      healedCount++;
                  } else {
                      failedCount++;
                  }
              } else {
                  failedCount++;
                  if (result.error) {
                      console.error('[QCDashboard] Batch healing failed for issue:', issue.id, result.error);
                  }
              }
          } catch (error) {
              failedCount++;
              console.error('[QCDashboard] Exception during batch healing:', error);
          }
      }

      // Apply final state if any healing succeeded
      if (healedCount > 0) {
          onUpdate(currentRoot);
          console.log(`[QCDashboard] Batch healing complete: ${healedCount} healed, ${failedCount} failed`);
      }
  }, [root, categoryIssues, findItemAndPath, onUpdate]);

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
    <div className="fixed inset-0 bg-nb-black/70 backdrop-blur-xl z-[600] flex items-center justify-center p-8 animate-in fade-in " onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-nb-white w-full max-w-[1400px] h-[90vh] shadow-brutal-lg flex overflow-hidden border border-nb-black/20">
        
        {/* Left Sidebar: Categories */}
        <div className="w-64 bg-nb-white border-r flex flex-col shrink-0">
            <div className="p-6 border-b">
                <div className={`w-12 h-12 flex flex-col items-center justify-center shadow-brutal mb-4 ${healthScore > 80 ? 'bg-nb-green/20 text-nb-green' : 'bg-nb-red/20 text-nb-red'}`}>
                    <span className="text-lg font-black leading-none">{healthScore}%</span>
                    <span className="text-[7px] font-black uppercase tracking-widest">Health</span>
                </div>
                <h2 className="text-sm font-black text-nb-black uppercase tracking-widest">Integrity Guard</h2>
            </div>
            <div className="flex-1 p-3 space-y-1">
                {CATEGORIES.map(cat => {
                    const count = allIssues.filter(i => i.category === cat.id).length;
                    return (
                        <Button 
                            key={cat.id} 
                            onClick={() => setActiveCategory(cat.id)}
                            variant="ghost"
                            className={`w-full flex items-center justify-between px-4 py-3 transition-nb ${activeCategory === cat.id ? 'bg-nb-white shadow-brutal-sm text-iiif-blue font-bold ring-1 ring-nb-black/10' : 'text-nb-black/50 hover:bg-nb-cream/50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon name={cat.icon} className="text-sm" />
                                <span className="text-xs uppercase tracking-wider">{cat.label}</span>
                            </div>
                            {count > 0 && <span className={`text-[10px] px-1.5 font-bold ${count > 5 ? 'bg-nb-red/20 text-nb-red' : 'bg-nb-cream text-nb-black/60'}`}>{count}</span>}
                        </Button>
                    );
                })}
            </div>
            <div className="p-4 bg-nb-black text-white flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Global Status</span>
                <span className="text-[10px] font-bold text-nb-green flex items-center gap-1"><Icon name="verified" className="text-xs"/> {totalItems} Resources Monitored</span>
            </div>
        </div>

        {/* Middle: Issues List */}
        <div className="flex-1 flex flex-col bg-nb-white overflow-hidden min-w-0 border-r border-nb-black/10">
            <div className="p-6 border-b flex justify-between items-center bg-nb-cream">
                <h3 className="font-bold text-nb-black flex items-center gap-2">
                    <Icon name="list" className="text-nb-black/40"/>
                    Detected Violations in {activeCategory}
                </h3>
                <Button
                    onClick={handleHealAllFixable}
                    variant="primary"
                    size="sm"
                    className="text-[10px] font-black uppercase px-4 py-2 bg-iiif-blue text-white hover:bg-nb-blue shadow-brutal-sm transition-nb active:scale-95"
                >
                    Heal All Fixable
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {categoryIssues.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-nb-black/30">
                        <Icon name="task_alt" className="text-6xl mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">No issues in this category</p>
                    </div>
                ) : (
                    categoryIssues.map(issue => (
                        <div 
                            key={issue.id} 
                            onClick={() => setSelectedIssueId(issue.id)}
                            className={`p-4 border transition-nb cursor-pointer group flex items-center justify-between ${selectedIssueId === issue.id ? 'bg-nb-blue/10 border-iiif-blue ring-2 ring-nb-blue/20 shadow-brutal' : 'bg-nb-white border-nb-black/10 hover:border-nb-black/20'}`}
                        >
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 ${issue.level === 'error' ? 'bg-nb-red/20 text-nb-red' : 'bg-nb-orange/20 text-nb-orange'}`}>
                                        {issue.level}
                                    </span>
                                    <span className="text-[10px] font-bold text-nb-black truncate">{issue.itemLabel}</span>
                                </div>
                                <p className="text-xs text-nb-black/50 line-clamp-1">{issue.message}</p>
                            </div>
                            {issue.fixable && (
                                <Button
                                    onClick={(e) => { e.stopPropagation(); handleHeal(issue); }}
                                    title={getFixDescription(issue)}
                                    variant="success"
                                    size="sm"
                                    className="px-5 py-1.5 bg-nb-green text-white text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-nb shadow hover:bg-nb-green"
                                >
                                    Fix It
                                </Button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Right: Contextual Preview & Interactive Fixes */}
        <div className="w-[450px] bg-nb-white flex flex-col shrink-0">
            <div className="p-6 border-b flex justify-between items-center bg-nb-white shadow-brutal-sm">
                <span className="text-[10px] font-black text-nb-black/40 uppercase tracking-widest">Archival Context & Tools</span>
                <Button onClick={onClose} variant="ghost" size="sm" className="p-1 hover:bg-nb-cream transition-nb"><Icon name="close" className="text-nb-black/40"/></Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {selectedIssue && previewItem ? (
                    <div className="space-y-6 animate-in slide-in-from-right-2">
                        {/* Image Preview */}
                        <div className="aspect-video bg-nb-black overflow-hidden border shadow-inner relative group ring-4 ring-white flex items-center justify-center">
                            <StackedThumbnail 
                              urls={resolveHierarchicalThumbs(previewItem, 600)} 
                              size="xl" 
                              className="w-full h-full"
                              icon="image_not_supported"
                            />
                            <div className="absolute top-2 right-2 bg-nb-black/50 text-[8px] text-white px-1.5 py-0.5 uppercase font-black tracking-widest">
                                {previewItem.type} Preview
                            </div>
                        </div>

                        {/* Interactive Hierarchy Tree */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-nb-black/40 uppercase tracking-widest">Archive Hierarchy Trace</label>
                            <div className="bg-nb-white border overflow-hidden shadow-brutal-sm">
                                {previewPath.map((p, i) => (
                                    <div key={i} style={{ paddingLeft: (i * 12) + 12 }} className={`flex items-center gap-2 p-2 border-b last:border-b-0 ${i === previewPath.length - 1 ? 'bg-nb-blue/10 border-l-4 border-l-iiif-blue' : 'bg-nb-white opacity-60'}`}>
                                        <Icon name={p.type === 'Collection' ? 'folder' : p.type === 'Manifest' ? 'menu_book' : 'crop_original'} className={`text-xs ${i === previewPath.length - 1 ? 'text-iiif-blue' : 'text-nb-black/40'}`}/>
                                        <span className={`text-[10px] truncate ${i === previewPath.length - 1 ? 'font-bold text-nb-black' : 'text-nb-black/50'}`}>{p.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Direct Metadata & Label Editor */}
                        {(activeCategory === 'Metadata' || activeCategory === 'Identity') && (
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-nb-black/40 uppercase tracking-widest">Interactive Workbench</label>
                                <div className="bg-nb-white border p-5 space-y-4 shadow-brutal-sm">
                                    <div>
                                        <label className="text-[10px] font-black text-nb-black/40 uppercase mb-1.5 block">Resource Label</label>
                                        <input 
                                            value={getIIIFValue(previewItem.label)}
                                            onChange={(e) => handleUpdateItem(previewItem.id, { label: { none: [e.target.value] } })}
                                            className="w-full text-xs p-2.5 bg-nb-white border focus:ring-2 focus:ring-iiif-blue outline-none font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-nb-black/40 uppercase mb-1.5 block">Scientific Summary</label>
                                        <textarea 
                                            value={getIIIFValue(previewItem.summary)}
                                            onChange={(e) => handleUpdateItem(previewItem.id, { summary: { none: [e.target.value] } })}
                                            className="w-full text-xs p-2.5 bg-nb-white border focus:ring-2 focus:ring-iiif-blue outline-none font-medium min-h-[60px]"
                                            placeholder="Provide a descriptive summary..."
                                        />
                                    </div>
                                    
                                    <div className="pt-2 border-t">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] font-black text-nb-black/40 uppercase">Archive Metadata</label>
                                            <div className="relative">
                                                <Button onClick={() => setShowAddMenu(!showAddMenu)} variant="ghost" size="sm" className="text-[9px] font-black uppercase text-iiif-blue hover:underline flex items-center gap-1">Add Field <Icon name="expand_more" className="text-[10px]"/></Button>
                                                {showAddMenu && (
                                                    <div className="absolute right-0 top-full mt-1 bg-nb-white border border-nb-black/20 shadow-brutal py-2 z-[700] min-w-[140px] max-h-[200px] overflow-y-auto custom-scrollbar">
                                                        {IIIF_PROPERTY_SUGGESTIONS.map(prop => (
                                                            <Button 
                                                                key={prop} 
                                                                onClick={() => handleAddMetadata(previewItem.id, prop)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full px-4 py-1.5 text-left text-[10px] font-bold text-nb-black/60 hover:bg-nb-blue/10 transition-nb justify-start"
                                                            >
                                                                {prop}
                                                            </Button>
                                                        ))}
                                                        <div className="border-t mt-1 pt-1">
                                                            <Button onClick={() => handleAddMetadata(previewItem.id, "New Field")} variant="ghost" size="sm" className="w-full px-4 py-1.5 text-left text-[10px] font-black text-nb-black/40 hover:bg-nb-white italic justify-start">Custom...</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {(previewItem.metadata || []).length === 0 ? (
                                                <p className="text-[10px] text-nb-black/40 italic">No custom metadata tags.</p>
                                            ) : (
                                                previewItem.metadata!.map((md, idx) => (
                                                    <div key={idx} className="flex gap-2 group/meta">
                                                        <input 
                                                            value={getIIIFValue(md.label)}
                                                            className="w-1/3 text-[9px] font-black uppercase text-nb-black/50 bg-nb-white border-none p-1.5"
                                                            onChange={(e) => {
                                                                if (!previewItem.metadata) return;
                                                                const newMeta = JSON.parse(JSON.stringify(previewItem.metadata));
                                                                newMeta[idx].label = { en: [e.target.value] };
                                                                handleUpdateItem(previewItem.id, { metadata: newMeta });
                                                            }}
                                                        />
                                                        <input 
                                                            value={getIIIFValue(md.value)}
                                                            className="flex-1 text-[10px] font-bold text-nb-black/80 bg-nb-white border-none p-1.5"
                                                            onChange={(e) => {
                                                                if (!previewItem.metadata) return;
                                                                const newMeta = JSON.parse(JSON.stringify(previewItem.metadata));
                                                                newMeta[idx].value = { en: [e.target.value] };
                                                                handleUpdateItem(previewItem.id, { metadata: newMeta });
                                                            }}
                                                        />
                                                        <Button 
                                                            onClick={() => handleRemoveMetadata(previewItem.id, idx)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-nb-black/30 hover:text-nb-red opacity-0 group-hover/meta:opacity-100 transition-nb p-0 min-w-0"
                                                        >
                                                            <Icon name="close" className="text-sm"/>
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Raw Resource DNA */}
                        <div className="space-y-2 opacity-50 grayscale hover:grayscale-0 transition-nb">
                            <label className="text-[9px] font-black text-nb-black/40 uppercase tracking-widest">Technical Signature</label>
                            <div className="bg-nb-black p-4 font-mono text-[9px] text-nb-blue/60 leading-relaxed overflow-hidden border border-white/10 shadow-brutal">
                                <p className="text-white/40 mb-1">// {previewItem.type} ID</p>
                                <p className="break-all text-nb-green mb-2">{previewItem.id}</p>
                                <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                                    <span className="text-white/40">Children: {(previewItem.items || []).length}</span>
                                    <span className="text-white/40">Annotations: {(previewItem.annotations || []).length}</span>
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={() => { onSelect(selectedIssue.itemId); onClose(); }}
                            variant="primary"
                            size="lg"
                            className="w-full bg-nb-black text-white p-4 text-xs font-black uppercase hover:bg-nb-black/80 transition-nb flex items-center justify-center gap-2 shadow-brutal"
                        >
                            <Icon name="location_searching" /> Reveal in Workbench
                        </Button>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-nb-black/30 text-center p-8">
                        <div className="w-16 h-16 bg-nb-white flex items-center justify-center mb-6 shadow-brutal-sm border rotate-3">
                            <Icon name="biotech" className="text-3xl opacity-20 text-iiif-blue"/>
                        </div>
                        <h4 className="text-sm font-black uppercase text-nb-black/40 tracking-tighter">Diagnostic Panel Ready</h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-nb-black/40 mt-2 max-w-[200px]">Select an issue from the list to begin structural repair</p>
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-nb-white border-t">
                <div className="flex items-start gap-3 p-3 bg-nb-blue/10 border border-nb-blue/20">
                    <Icon name="auto_fix_high" className="text-nb-blue text-sm mt-0.5" />
                    <p className="text-[10px] text-nb-blue leading-tight italic">Direct healing allows you to patch standard violations without leaving the diagnostic dashboard.</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};