
import React, { useState, useMemo } from 'react';
import { IIIFItem, getIIIFValue } from '../types';
import { Icon } from './Icon';

interface BatchEditorProps {
  ids: string[];
  root: IIIFItem;
  onApply: (ids: string[], updates: Record<string, Partial<IIIFItem>>, renamePattern?: string) => void;
  onClose: () => void;
}

const IIIF_PROPERTY_SUGGESTIONS = [
  "Title", "Creator", "Date", "Description", "Subject", 
  "Rights", "Source", "Type", "Format", "Identifier", 
  "Language", "Coverage", "Publisher", "Contributor", "Relation"
];

export const BatchEditor: React.FC<BatchEditorProps> = ({ ids, root, onApply, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rename' | 'metadata' | 'patterns'>('rename');
  const [showAddMenu, setShowAddMenu] = useState(false);
  
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-8 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-iiif-blue rounded-xl flex items-center justify-center text-white shadow-lg"><Icon name="auto_fix_high" className="text-2xl" /></div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Batch Archive Toolkit</h2>
                    <p className="text-sm text-slate-500">Editing {ids.length} items</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><Icon name="close" /></button>
        </div>

        <div className="flex border-b bg-white shrink-0">
            <button onClick={() => setActiveTab('rename')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'rename' ? 'border-iiif-blue text-iiif-blue bg-blue-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Rename</button>
            <button onClick={() => setActiveTab('metadata')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'metadata' ? 'border-iiif-blue text-iiif-blue bg-blue-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Metadata</button>
            <button onClick={() => setActiveTab('patterns')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'patterns' ? 'border-iiif-blue text-iiif-blue bg-blue-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Pattern Detector</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 border-r border-slate-100 overflow-y-auto p-8 bg-white custom-scrollbar">
                {activeTab === 'rename' && (
                    <div className="space-y-8">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rename Pattern</label>
                        <input type="text" value={renamePattern} onChange={e => setRenamePattern(e.target.value)} className="w-full text-lg font-bold p-4 bg-slate-50 border-2 border-transparent focus:border-iiif-blue rounded-xl outline-none" />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <PlaceholderBtn label="Original Name" tag="{orig}" onClick={setRenamePattern} current={renamePattern}/>
                            <PlaceholderBtn label="Index (001...)" tag="{nnn}" onClick={setRenamePattern} current={renamePattern}/>
                        </div>
                    </div>
                )}
                {activeTab === 'metadata' && (
                    <div className="space-y-6">
                        <textarea value={sharedSummary} onChange={e => setSharedSummary(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl outline-none text-sm min-h-[100px]" placeholder="Common Summary..." />
                        {/* Custom fields would go here as in previous version */}
                    </div>
                )}
                {activeTab === 'patterns' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                            <h4 className="text-xs font-bold text-blue-800 flex items-center gap-2 mb-2"><Icon name="biotech"/> Regex Extractor</h4>
                            <p className="text-[10px] text-blue-700 leading-relaxed">Extract metadata from filenames. Use capture groups like <code>(\d+)</code> to find values.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Regex Pattern</label>
                            <input value={regexPattern} onChange={e => setRegexPattern(e.target.value)} className="w-full font-mono text-sm p-3 bg-slate-50 rounded-lg border border-slate-200 focus:border-iiif-blue outline-none" placeholder="e.g. (\d+)_(\w+).jpg" />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-slate-400 uppercase">Field Mappings</label>
                            {fieldMappings.map((m, i) => (
                                <div key={i} className="flex gap-2">
                                    <input type="number" value={m.group} onChange={e => setFieldMappings(fieldMappings.map((x, idx) => idx === i ? {...x, group: parseInt(e.target.value)} : x))} className="w-16 p-2 border rounded text-xs" />
                                    <select value={m.property} onChange={e => setFieldMappings(fieldMappings.map((x, idx) => idx === i ? {...x, property: e.target.value} : x))} className="flex-1 p-2 border rounded text-xs">
                                        {IIIF_PROPERTY_SUGGESTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <button onClick={() => setFieldMappings(fieldMappings.filter((_, idx) => idx !== i))} className="text-red-400"><Icon name="delete" className="text-sm"/></button>
                                </div>
                            ))}
                            <button onClick={() => setFieldMappings([...fieldMappings, { group: fieldMappings.length + 1, property: 'Subject' }])} className="text-[10px] font-bold text-iiif-blue uppercase">+ Add Group Mapping</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 bg-slate-50 overflow-y-auto p-8 custom-scrollbar">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Preview</h3>
                <div className="space-y-2">
                    {activeTab === 'patterns' ? patternResults.map((p, i) => (
                        <div key={i} className={`p-3 rounded-lg border bg-white ${p.success ? 'border-green-200' : 'border-red-100 opacity-50'}`}>
                            <div className="text-[10px] font-mono text-slate-400">{p.filename}</div>
                            {p.success ? (
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {Object.entries(p.extracted).map(([k,v]) => (
                                        <span key={k} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100"><b>{k}:</b> {v}</span>
                                    ))}
                                </div>
                            ) : <div className="text-[9px] text-red-400 mt-1 italic font-bold">No match found</div>}
                        </div>
                    )) : selectedItems.map((it, i) => (
                        <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 text-sm font-bold truncate">
                            {getIIIFValue(it.label)}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl">Cancel</button>
            <button onClick={handleApply} className="px-10 py-2 bg-iiif-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-600 flex items-center gap-2">Apply Changes <Icon name="play_arrow"/></button>
        </div>
      </div>
    </div>
  );
};

const PlaceholderBtn: React.FC<{ label: string, tag: string, onClick: (s: string) => void, current: string }> = ({ label, tag, onClick, current }) => (
    <button onClick={() => onClick(current + tag)} className="flex flex-col items-start p-2 rounded-lg bg-white border border-slate-200 hover:border-iiif-blue transition-all text-left">
        <span className="text-[8px] font-black text-slate-400 uppercase">{label}</span>
        <code className="text-xs font-mono font-bold text-iiif-blue">{tag}</code>
    </button>
);
