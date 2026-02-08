
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { getIIIFValue, IIIFItem } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { useToast } from '@/src/shared/ui/molecules/Toast';

const BATCH_SNAPSHOT_KEY = 'batch-editor-snapshot';

interface BatchSnapshot {
  timestamp: number;
  itemCount: number;
  root: IIIFItem;
}

// Save snapshot to localStorage before batch operation
const saveBatchSnapshot = (root: IIIFItem, itemCount: number): boolean => {
  try {
    const snapshot: BatchSnapshot = {
      timestamp: Date.now(),
      itemCount,
      root: JSON.parse(JSON.stringify(root)) // Deep clone
    };
    localStorage.setItem(BATCH_SNAPSHOT_KEY, JSON.stringify(snapshot));
    return true;
  } catch (e) {
    console.error('Failed to save batch snapshot:', e);
    return false;
  }
};

// Load snapshot from localStorage
const loadBatchSnapshot = (): BatchSnapshot | null => {
  try {
    const data = localStorage.getItem(BATCH_SNAPSHOT_KEY);
    if (!data) return null;
    return JSON.parse(data) as BatchSnapshot;
  } catch (e) {
    console.error('Failed to load batch snapshot:', e);
    return null;
  }
};

// Clear snapshot from localStorage
const clearBatchSnapshot = (): void => {
  try {
    localStorage.removeItem(BATCH_SNAPSHOT_KEY);
  } catch (e) {
    // Ignore
  }
};

interface BatchEditorProps {
  ids: string[];
  root: IIIFItem;
  onApply: (ids: string[], updates: Record<string, Partial<IIIFItem>>, renamePattern?: string) => void;
  onClose: () => void;
  onRollback?: (root: IIIFItem) => void;
}

const IIIF_PROPERTY_SUGGESTIONS = [
  "Title", "Creator", "Date", "Description", "Subject", 
  "Rights", "Source", "Type", "Format", "Identifier", 
  "Language", "Coverage", "Publisher", "Contributor", "Relation"
];

export const BatchEditor: React.FC<BatchEditorProps> = ({ ids, root, onApply, onClose, onRollback }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'rename' | 'metadata' | 'patterns'>('rename');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [existingSnapshot, setExistingSnapshot] = useState<BatchSnapshot | null>(null);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);

  // Check for existing snapshot on mount
  useEffect(() => {
    const snapshot = loadBatchSnapshot();
    setExistingSnapshot(snapshot);
  }, []);

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

  // Rename State
  const [renamePattern, setRenamePattern] = useState('{orig}');
  
  // Metadata State
  const [sharedSummary, setSharedSummary] = useState('');
  const [sharedRights, setSharedRights] = useState('');
  const [sharedNavDate, setSharedNavDate] = useState('');
  const [customFields, setCustomFields] = useState<{ label: string, value: string }[]>([]);

  // Pattern Detector State
  const [regexPattern, setRegexPattern] = useState('(\\d{4})_(\\w+)_(.*)');
  const [fieldMappings, setFieldMappings] = useState<{ group: number, property: string }[]>([
    { group: 1, property: 'Date' },
    { group: 2, property: 'Subject' }
  ]);

  const selectedItems = useMemo(() => {
    const found: IIIFItem[] = [];
    const traverse = (node: IIIFItem) => {
        if (ids.includes(node.id)) found.push(node);
        if (node.items) node.items.forEach(traverse);
    };
    traverse(root);
    return found;
  }, [ids, root]);

  const patternResults = useMemo(() => {
      if (activeTab !== 'patterns') return [];
      try {
          const re = new RegExp(regexPattern);
          return selectedItems.map(it => {
              const filename = (it as any)._filename || getIIIFValue(it.label);
              const match = filename.match(re);
              const extracted: Record<string, string> = {};
              if (match) {
                  fieldMappings.forEach(m => {
                      if (match[m.group]) extracted[m.property] = match[m.group];
                  });
              }
              return { filename, extracted, success: !!match };
          });
      } catch (e) { return []; }
  }, [selectedItems, regexPattern, fieldMappings, activeTab]);

  const handleApply = () => {
      // Save snapshot before applying batch changes
      const snapshotSaved = saveBatchSnapshot(root, ids.length);
      if (snapshotSaved) {
        showToast(`Snapshot saved. Use "Rollback Last Batch" to undo if needed.`, 'info');
      }

      const perItemUpdates: Record<string, Partial<IIIFItem>> = {};

      ids.forEach((id, index) => {
          const updates: Partial<IIIFItem> = {};

          if (activeTab === 'metadata') {
              if (sharedSummary) updates.summary = { en: [sharedSummary] };
              if (sharedRights) updates.rights = sharedRights;
              if (sharedNavDate) updates.navDate = new Date(sharedNavDate).toISOString();
              if (customFields.length > 0) {
                  updates.metadata = customFields.map(f => ({
                      label: { en: [f.label] },
                      value: { en: [f.value] }
                  }));
              }
          }

          if (activeTab === 'patterns') {
              const res = patternResults[index];
              if (res && res.success) {
                  // Fix: Explicitly cast extracted property values to string to match IIIFItem's metadata value schema (Record<string, string[]>)
                  updates.metadata = Object.entries(res.extracted).map(([k,v]) => ({
                      label: { en: [k] },
                      value: { en: [v as string] }
                  }));
              }
          }

          perItemUpdates[id] = updates;
      });

      onApply(ids, perItemUpdates, activeTab === 'rename' ? renamePattern : undefined);
      onClose();
  };

  const handleRollback = () => {
    if (!existingSnapshot || !onRollback) return;
    onRollback(existingSnapshot.root);
    clearBatchSnapshot();
    setExistingSnapshot(null);
    setShowRollbackConfirm(false);
    showToast('Rolled back to state before last batch operation', 'success');
    onClose();
  };

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-nb-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-8 animate-in fade-in ">
      <div className="bg-nb-white w-full max-w-5xl h-[85vh] shadow-brutal-lg flex flex-col overflow-hidden border border-nb-black/20">
        
        <div className="p-6 border-b bg-nb-white flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-iiif-blue flex items-center justify-center text-white shadow-brutal"><Icon name="auto_fix_high" className="text-2xl" /></div>
                <div>
                    <h2 className="text-xl font-bold text-nb-black">Batch Archive Toolkit</h2>
                    <p className="text-sm text-nb-black/50">Editing {ids.length} items</p>
                </div>
            </div>
            <Button variant="ghost" size="bare" onClick={onClose} className="p-2 hover:bg-nb-cream text-nb-black/50 transition-nb"><Icon name="close" /></Button>
        </div>

        <div className="flex border-b bg-nb-white shrink-0">
            <Button variant="ghost" size="bare" onClick={() => setActiveTab('rename')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-nb border-b-2 ${activeTab === 'rename' ? 'border-iiif-blue text-iiif-blue bg-nb-blue/10' : 'border-transparent text-nb-black/40 hover:text-nb-black/60'}`}>Rename</Button>
            <Button variant="ghost" size="bare" onClick={() => setActiveTab('metadata')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-nb border-b-2 ${activeTab === 'metadata' ? 'border-iiif-blue text-iiif-blue bg-nb-blue/10' : 'border-transparent text-nb-black/40 hover:text-nb-black/60'}`}>Metadata</Button>
            <Button variant="ghost" size="bare" onClick={() => setActiveTab('patterns')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-nb border-b-2 ${activeTab === 'patterns' ? 'border-iiif-blue text-iiif-blue bg-nb-blue/10' : 'border-transparent text-nb-black/40 hover:text-nb-black/60'}`}>Pattern Detector</Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 border-r border-nb-black/10 overflow-y-auto p-8 bg-nb-white custom-scrollbar">
                {activeTab === 'rename' && (
                    <div className="space-y-8">
                        <label className="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-2">Rename Pattern</label>
                        <input type="text" value={renamePattern} onChange={e => setRenamePattern(e.target.value)} className="w-full text-lg font-bold p-4 bg-nb-white border-2 border-transparent focus:border-iiif-blue outline-none" />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <PlaceholderBtn label="Original Name" tag="{orig}" onClick={setRenamePattern} current={renamePattern}/>
                            <PlaceholderBtn label="Index (001...)" tag="{nnn}" onClick={setRenamePattern} current={renamePattern}/>
                        </div>
                    </div>
                )}
                {activeTab === 'metadata' && (
                    <div className="space-y-6">
                        <textarea value={sharedSummary} onChange={e => setSharedSummary(e.target.value)} className="w-full p-3 bg-nb-white outline-none text-sm min-h-[100px]" placeholder="Common Summary..." />
                        {/* Custom fields would go here as in previous version */}
                    </div>
                )}
                {activeTab === 'patterns' && (
                    <div className="space-y-6">
                        <div className="bg-nb-blue/10 p-4 border border-nb-blue/20 mb-6">
                            <h4 className="text-xs font-bold text-nb-blue flex items-center gap-2 mb-2"><Icon name="biotech"/> Regex Extractor</h4>
                            <p className="text-[10px] text-nb-blue leading-relaxed">Extract metadata from filenames. Use capture groups like <code>(\d+)</code> to find values.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-nb-black/40 uppercase mb-2">Regex Pattern</label>
                            <input value={regexPattern} onChange={e => setRegexPattern(e.target.value)} className="w-full font-mono text-sm p-3 bg-nb-white border border-nb-black/20 focus:border-iiif-blue outline-none" placeholder="e.g. (\d+)_(\w+).jpg" />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-nb-black/40 uppercase">Field Mappings</label>
                            {fieldMappings.map((m, i) => (
                                <div key={i} className="flex gap-2">
                                    <input type="number" value={m.group} onChange={e => setFieldMappings(fieldMappings.map((x, idx) => idx === i ? {...x, group: parseInt(e.target.value)} : x))} className="w-16 p-2 border text-xs" />
                                    <select value={m.property} onChange={e => setFieldMappings(fieldMappings.map((x, idx) => idx === i ? {...x, property: e.target.value} : x))} className="flex-1 p-2 border text-xs">
                                        {IIIF_PROPERTY_SUGGESTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <Button variant="ghost" size="bare" onClick={() => setFieldMappings(fieldMappings.filter((_, idx) => idx !== i))} className="text-nb-red"><Icon name="delete" className="text-sm"/></Button>
                                </div>
                            ))}
                            <Button variant="ghost" size="bare" onClick={() => setFieldMappings([...fieldMappings, { group: fieldMappings.length + 1, property: 'Subject' }])} className="text-[10px] font-bold text-iiif-blue uppercase">+ Add Group Mapping</Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 bg-nb-white overflow-y-auto p-8 custom-scrollbar">
                <h3 className="text-xs font-black text-nb-black/40 uppercase tracking-widest mb-4">Preview</h3>
                <div className="space-y-2">
                    {activeTab === 'patterns' ? patternResults.map((p, i) => (
                        <div key={i} className={`p-3 border bg-nb-white ${p.success ? 'border-nb-green/30' : 'border-nb-red/20 opacity-50'}`}>
                            <div className="text-[10px] font-mono text-nb-black/40">{p.filename}</div>
                            {p.success ? (
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {Object.entries(p.extracted).map(([k,v]) => (
                                        <span key={k} className="text-[9px] bg-nb-blue/10 text-nb-blue px-1.5 py-0.5 border border-nb-blue/20"><b>{k}:</b> {v}</span>
                                    ))}
                                </div>
                            ) : <div className="text-[9px] text-nb-red mt-1 italic font-bold">No match found</div>}
                        </div>
                    )) : selectedItems.map((it, i) => (
                        <div key={i} className="bg-nb-white p-3 border border-nb-black/20 text-sm font-bold truncate">
                            {getIIIFValue(it.label)}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="p-6 bg-nb-white border-t flex justify-between items-center">
            <div>
              {existingSnapshot && onRollback && (
                <Button variant="ghost" size="bare"
                  onClick={() => setShowRollbackConfirm(true)}
                  className="px-4 py-2 text-nb-orange bg-nb-orange/10 border border-nb-orange/20 font-bold hover:bg-nb-orange/20 flex items-center gap-2 text-sm"
                >
                  <Icon name="history" className="text-sm" />
                  Rollback Last Batch
                  <span className="text-[10px] text-nb-orange ml-1">
                    ({existingSnapshot.itemCount} items, {formatTimestamp(existingSnapshot.timestamp)})
                  </span>
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" size="bare" onClick={onClose} className="px-6 py-2 text-nb-black/60 font-bold hover:bg-nb-cream ">Cancel</Button>
              <Button variant="ghost" size="bare" onClick={handleApply} className="px-10 py-2 bg-iiif-blue text-white font-bold shadow-brutal hover:bg-nb-blue flex items-center gap-2">Apply Changes <Icon name="play_arrow"/></Button>
            </div>
        </div>

        {/* Rollback Confirmation Modal */}
        {showRollbackConfirm && existingSnapshot && (
          <div className="fixed inset-0 bg-nb-black/50 z-[200] flex items-center justify-center p-4">
            <div className="bg-nb-white shadow-brutal-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-nb-orange/20 flex items-center justify-center text-nb-orange">
                  <Icon name="warning" className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-nb-black">Confirm Rollback</h3>
                  <p className="text-sm text-nb-black/50">This will restore the previous state</p>
                </div>
              </div>
              <div className="bg-nb-white p-4 mb-6 text-sm">
                <p className="text-nb-black/60">
                  <strong>{existingSnapshot.itemCount} items</strong> were modified on{' '}
                  <strong>{formatTimestamp(existingSnapshot.timestamp)}</strong>.
                </p>
                <p className="text-nb-black/50 mt-2">
                  Rolling back will restore the archive to its state before that batch operation.
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" size="bare"
                  onClick={() => setShowRollbackConfirm(false)}
                  className="px-6 py-2 text-nb-black/60 font-bold hover:bg-nb-cream "
                >
                  Cancel
                </Button>
                <Button variant="ghost" size="bare"
                  onClick={handleRollback}
                  className="px-6 py-2 bg-nb-orange text-white font-bold hover:bg-nb-orange flex items-center gap-2"
                >
                  <Icon name="history" /> Rollback
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PlaceholderBtn: React.FC<{ label: string, tag: string, onClick: (s: string) => void, current: string }> = ({ label, tag, onClick, current }) => (
    <Button variant="ghost" size="bare" onClick={() => onClick(current + tag)} className="flex flex-col items-start p-2 bg-nb-white border border-nb-black/20 hover:border-iiif-blue transition-nb text-left">
        <span className="text-[8px] font-black text-nb-black/40 uppercase">{label}</span>
        <code className="text-xs font-mono font-bold text-iiif-blue">{tag}</code>
    </Button>
);
