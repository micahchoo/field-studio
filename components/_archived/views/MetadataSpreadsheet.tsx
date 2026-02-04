
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIIIFValue, IIIFItem, isCanvas } from '../../types';
import { Icon } from '../Icon';
import { useToast } from '../Toast';
import { useNavigationGuard } from '../../hooks/useNavigationGuard';
import { NavigationGuardDialog } from '../NavigationGuardDialog';
import { DUBLIN_CORE_MAP, RESOURCE_TYPE_CONFIG, RIGHTS_OPTIONS, VIEWING_DIRECTIONS } from '../../constants';
import { TableLoading } from '../LoadingState';
import { EmptyState, emptyStatePresets } from '../EmptyState';
import FileSaver from 'file-saver';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useTerminology } from '../../hooks/useTerminology';

interface MetadataSpreadsheetProps {
  root: IIIFItem | null;
  onUpdate: (updatedRoot: IIIFItem) => void;
  filterIds?: string[] | null;
  onClearFilter?: () => void;
  onNavigateAway?: (canNavigate: boolean) => void;
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

export const MetadataSpreadsheet: React.FC<MetadataSpreadsheetProps> = ({ root, onUpdate, filterIds, onClearFilter, onNavigateAway }) => {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const { t, isAdvanced } = useTerminology({ level: settings.abstractionLevel });
  const [items, setItems] = useState<FlatItem[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<ResourceTab>('All');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSystemItems, setShowSystemItems] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState<{ id: string } | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [importProgress, setImportProgress] = useState<{ message: string; percent: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [pendingNavigationCallback, setPendingNavigationCallback] = useState<(() => void) | null>(null);

  // Use navigation guard hook
  const navigationGuard = useNavigationGuard({
    hasUnsavedChanges,
    confirmMessage: 'You have unsaved changes in the catalog. Save before leaving?'
  });

  // Warn user before navigating away with unsaved changes (browser close/refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Expose navigation guard to parent
  useEffect(() => {
    if (onNavigateAway) {
      onNavigateAway(!hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onNavigateAway]);

  const handleNavigationRequest = useCallback((callback: () => void) => {
    if (hasUnsavedChanges) {
      setPendingNavigationCallback(() => callback);
      setShowNavigationDialog(true);
      return false;
    }
    return true;
  }, [hasUnsavedChanges]);

  // CSV Export function
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      showToast('No items to export', 'error');
      return;
    }

    // Build CSV header
    const headers = ['ID', 'Type', 'Title', 'Summary', 'Rights', 'Date', ...columns.filter(c => !['Title', 'Summary', 'Date', 'Rights'].includes(c))];

    // Build CSV rows
    const rows = filteredItems.map(item => {
      const row = [
        item.id,
        item.type,
        `"${(item.label || '').replace(/"/g, '""')}"`,
        `"${(item.summary || '').replace(/"/g, '""')}"`,
        item.rights,
        item.navDate,
        ...columns.filter(c => !['Title', 'Summary', 'Date', 'Rights'].includes(c)).map(col => `"${(item.metadata[col] || '').replace(/"/g, '""')}"`)
      ];
      return row.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    FileSaver.saveAs(blob, `metadata-export-${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`Exported ${filteredItems.length} items to CSV`, 'success');
  };

  // CSV Import function with validation and progress
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      showToast('Please select a valid CSV file', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showToast('CSV file too large (max 10MB)', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImportProgress({ message: 'Reading CSV file...', percent: 10 });

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      setImportProgress({ message: 'Parsing CSV data...', percent: 30 });

      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) throw new Error('CSV must have header and at least one data row');

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
      const titleIndex = headers.findIndex(h => h.toLowerCase() === 'title');
      const summaryIndex = headers.findIndex(h => h.toLowerCase() === 'summary');

      if (idIndex === -1) throw new Error('CSV must have an ID column');

      setImportProgress({ message: `Processing ${lines.length - 1} rows...`, percent: 50 });

      // Validate headers against known IIIF properties
      const validIIIFProps = ['id', 'type', 'title', 'summary', 'rights', 'date', 'viewingdirection'];
      const unknownHeaders = headers.filter(h => {
        const lower = h.toLowerCase();
        return !validIIIFProps.includes(lower) && !IIIF_PROPERTY_SUGGESTIONS.some(p => p.toLowerCase() === lower);
      });
      if (unknownHeaders.length > 0) {
        console.warn('CSV import: Unknown headers detected:', unknownHeaders);
      }

      let updatedCount = 0;
      const newItems = [...items];
      const backupItems = JSON.stringify(items); // Backup for rollback
      const totalRows = lines.length - 1;

      try {
        for (let i = 1; i < lines.length; i++) {
          // Update progress every 10 rows
          if (i % 10 === 0) {
            const percent = 50 + Math.floor((i / totalRows) * 40);
            setImportProgress({ message: `Processing row ${i} of ${totalRows}...`, percent });
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
          }

          // Simple CSV parsing (handles quoted fields)
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              values.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim().replace(/^"|"$/g, ''));

          const id = values[idIndex];
          if (!id) continue; // Skip empty IDs
          
          // Validate ID format (basic URI check)
          if (!id.includes('/') && !id.includes(':')) {
            console.warn(`CSV import: Invalid ID format at row ${i}: ${id}`);
            continue;
          }

          const itemIndex = newItems.findIndex(item => item.id === id);
          if (itemIndex === -1) continue;

          // Update fields with length limits
          if (titleIndex !== -1 && values[titleIndex]) {
            newItems[itemIndex].label = values[titleIndex].slice(0, 500); // Max 500 chars
          }
          if (summaryIndex !== -1 && values[summaryIndex]) {
            newItems[itemIndex].summary = values[summaryIndex].slice(0, 2000); // Max 2000 chars
          }

          // Update metadata fields
          headers.forEach((header, idx) => {
            if (['id', 'type', 'title', 'summary', 'rights', 'date'].includes(header.toLowerCase())) return;
            if (values[idx]) {
              // Sanitize header name (alphanumeric + spaces only)
              const sanitizedHeader = header.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 100);
              if (sanitizedHeader) {
                newItems[itemIndex].metadata[sanitizedHeader] = values[idx].slice(0, 1000); // Max 1000 chars per value
              }
            }
          });
          updatedCount++;
        }

        setImportProgress({ message: 'Finalizing...', percent: 95 });

        setItems(newItems);
        setHasUnsavedChanges(true);
        setImportProgress(null);
        showToast(`Updated ${updatedCount} items from CSV`, 'success');
      } catch (err) {
        // Rollback on error
        setItems(JSON.parse(backupItems));
        throw err;
      }
    } catch (err: any) {
      setImportProgress(null);
      showToast(`CSV import failed: ${err.message}`, 'error');
    }

    // Reset input so same file can be imported again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
      
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsHelp(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowShortcutsHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
      if (!root) {
          setItems([]);
          setIsLoading(false);
          return;
      }
      setIsLoading(true);
      const flatList: FlatItem[] = [];
      const metaKeys = new Set<string>();
      const visited = new Set<string>();

      const traverse = (node: IIIFItem) => {
          if (!node || visited.has(node.id)) return;
          visited.add(node.id);

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
                  _blobUrl: node._blobUrl || (node as any).thumbnail?.[0]?.id || (isCanvas(node) ? (node as any).items?.[0]?.items?.[0]?.body?.id : undefined)
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
      setIsLoading(false);
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
      
      // Create a map for O(1) lookup
      const itemMap = new Map(items.map(i => [i.id, i]));
      const visited = new Set<string>();

      const updateNode = (node: IIIFItem) => {
          if (visited.has(node.id)) return;
          visited.add(node.id);

          const flat = itemMap.get(node.id);
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 flex items-center gap-2 transition-all"
                title="Export to CSV"
              >
                <Icon name="download" /> Export CSV
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 flex items-center gap-2 transition-all"
                title="Import from CSV"
              >
                <Icon name="upload" /> Import CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
              <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 shadow-md flex items-center gap-2 transition-all active:scale-95"
              >
                  <Icon name="save" /> Commit Changes
              </button>
            </div>
        </div>
      </div>

      <div className="flex border-b bg-white px-6 shrink-0 overflow-x-auto no-scrollbar">
        {(['All', 'Collection', 'Manifest', 'Canvas'] as ResourceTab[]).map(tab => (
            <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest relative border-b-2 transition-all ${activeTab === tab ? 'text-iiif-blue border-b-2 border-iiif-blue bg-blue-50/20' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
            >
                {tab === 'All' ? tab : t(tab)}s
            </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto bg-slate-100 custom-scrollbar">
        {isLoading ? (
            <div className="p-6">
              <TableLoading rows={8} cols={5} />
            </div>
        ) : filteredItems.length === 0 ? (
            <EmptyState
              {...emptyStatePresets.noResults({
                onAction: filter || filterIds ? () => {
                  setFilter('');
                  onClearFilter?.();
                } : undefined
              })}
              message={filter || filterIds
                ? "No items match your current filters. Try adjusting your search or clearing filters."
                : "No items in the catalog. Import files to populate the catalog."
              }
            />
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
                                            {t(item.type)}
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
                                                {isAdvanced && (
                                                  <div>
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Icon name="fingerprint" className="text-xs"/> Archival ID (URI)</h4>
                                                    <code className="text-[10px] text-iiif-blue bg-blue-50 px-3 py-1.5 rounded border border-blue-100 break-all block font-mono leading-relaxed">{item.id}</code>
                                                  </div>
                                                )}
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                    {Object.entries(item.metadata).map(([k,v]) => (
                                                        <div key={k} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-tighter">{k}</span>
                                                            <span className="text-xs text-slate-700 font-bold leading-tight block">{v || <span className="opacity-20 italic">Empty</span>}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {!isAdvanced && (
                                                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                                                     <Icon name="info" className="text-amber-500 mt-0.5" />
                                                     <div>
                                                         <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">Archival Catalog Mode</p>
                                                         <p className="text-[11px] text-amber-800 opacity-80 mt-0.5 italic leading-snug">Data edited here is instantly projected into the IIIF semantic model.</p>
                                                     </div>
                                                  </div>
                                                )}
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

      <NavigationGuardDialog
        isOpen={showNavigationDialog}
        title="Unsaved Changes"
        message="You have unsaved changes in the catalog. Save before leaving?"
        onConfirm={() => {
          handleSave();
          if (pendingNavigationCallback) {
            pendingNavigationCallback();
          }
          setShowNavigationDialog(false);
          setPendingNavigationCallback(null);
        }}
        onCancel={() => {
          setHasUnsavedChanges(false);
          if (pendingNavigationCallback) {
            pendingNavigationCallback();
          }
          setShowNavigationDialog(false);
          setPendingNavigationCallback(null);
        }}
      />
    </div>
  );
};
