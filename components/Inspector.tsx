
import React, { useState, useEffect } from 'react';
import { IIIFItem, IIIFAnnotation, IIIFCanvas, AppSettings } from '../types';
import { Icon } from './Icon';
import { analyzeImage, blobToBase64 } from '../services/geminiService';
import { useToast } from './Toast';

interface InspectorProps {
  resource: IIIFItem | null;
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  settings: AppSettings;
  visible: boolean;
  onClose: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({ resource, onUpdateResource, settings, visible, onClose }) => {
  const { showToast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<'metadata' | 'annotations' | 'technical'>('metadata');

  // Reset to metadata tab if switching to simple mode where technical is hidden
  useEffect(() => {
      if (settings.abstractionLevel === 'simple' && tab === 'technical') {
          setTab('metadata');
      }
  }, [settings.abstractionLevel]);

  if (!visible) return null;

  if (!resource) {
    return (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-30 transition-all duration-300">
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 bg-slate-50/50">
                <span className="text-xs font-bold uppercase text-slate-500">Inspector</span>
                <button onClick={onClose}><Icon name="close" className="text-slate-400 hover:text-slate-600 text-sm"/></button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Icon name="info" className="text-4xl mb-2 text-slate-200"/>
                <p className="text-sm">Select an item to view properties</p>
            </div>
        </aside>
    );
  }

  const handleAIAnalysis = async () => {
    const canvas = resource as IIIFCanvas;
    if (resource.type === 'Canvas' && canvas._blobUrl) {
      setAnalyzing(true);
      try {
        const response = await fetch(canvas._blobUrl);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        const analysis = await analyzeImage(base64, blob.type, settings.aiConfig);
        
        // Merge metadata
        onUpdateResource({
          summary: { [settings.language]: [analysis.summary] },
          metadata: [
            ...(resource.metadata || []),
            { label: { [settings.language]: ["AI Keywords"] }, value: { [settings.language]: analysis.labels } }
          ]
        });
        showToast("AI Analysis Complete", "success");
      } catch (e) {
        showToast("Analysis Failed", "error");
        console.error(e);
      } finally {
        setAnalyzing(false);
      }
    } else {
        showToast("Select a Canvas with an image to analyze", "info");
    }
  };

  const label = resource.label?.[settings.language]?.[0] || resource.label?.['none']?.[0] || '';
  const summary = resource.summary?.[settings.language]?.[0] || '';
  const inputClass = "w-full text-sm p-2.5 border border-slate-200 rounded bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-iiif-blue focus:border-iiif-blue outline-none transition-all";

  const availableTabs = ['metadata', 'annotations'];
  if (settings.abstractionLevel !== 'simple') availableTabs.push('technical');

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-30">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 bg-slate-50">
             <div className="flex items-center gap-2 overflow-hidden">
                <Icon name={resource.type === 'Collection' ? 'folder' : resource.type === 'Manifest' ? 'menu_book' : 'image'} className="text-slate-400 text-sm"/>
                <span className="text-xs font-bold uppercase text-slate-700 truncate max-w-[150px]">{resource.type}</span>
             </div>
             <button onClick={onClose}><Icon name="close" className="text-slate-400 hover:text-slate-600 text-sm"/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white">
            {availableTabs.map(t => (
                <button 
                    key={t}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${tab === t ? 'text-iiif-blue border-b-2 border-iiif-blue bg-blue-50/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    onClick={() => setTab(t as any)}
                >
                    {t}
                </button>
            ))}
        </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {tab === 'metadata' && (
            <>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Label</label>
                    <input 
                        type="text" 
                        value={label}
                        onChange={e => onUpdateResource({ label: { [settings.language]: [e.target.value] } })}
                        className={inputClass}
                        placeholder="Untitled"
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Summary</label>
                        {resource.type === 'Canvas' && (
                             <button 
                                onClick={handleAIAnalysis} 
                                disabled={analyzing}
                                className="text-[10px] text-purple-600 hover:text-purple-800 flex items-center gap-1 font-bold bg-purple-50 px-2 py-0.5 rounded-full"
                            >
                                <Icon name="auto_awesome" className="text-xs" />
                                {analyzing ? 'Thinking...' : 'AI Generate'}
                            </button>
                        )}
                    </div>
                    <textarea 
                        rows={6}
                        value={summary}
                        onChange={e => onUpdateResource({ summary: { [settings.language]: [e.target.value] } })}
                        className={`${inputClass} resize-none`}
                        placeholder="Add a description..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Metadata</label>
                    <div className="space-y-3">
                        {(resource.metadata || []).map((md, idx) => (
                            <div key={idx} className="group relative bg-white p-3 rounded border border-slate-200 shadow-sm hover:border-iiif-blue transition-colors">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{md.label[settings.language]?.[0] || 'Unknown'}</div>
                                <div className="text-sm text-slate-800 leading-snug">{md.value[settings.language]?.join(', ')}</div>
                            </div>
                        ))}
                        <button className="w-full py-2 border border-dashed border-slate-300 rounded text-xs text-slate-500 hover:bg-slate-50 hover:text-iiif-blue hover:border-iiif-blue flex items-center justify-center gap-1 transition-all">
                            <Icon name="add" className="text-sm"/> Add Field
                        </button>
                    </div>
                </div>
            </>
        )}

        {tab === 'annotations' && (
            <div className="text-center py-10">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                     <Icon name="comments_disabled" className="text-2xl"/>
                </div>
                <p className="text-xs text-slate-500 mb-4">No annotations on this resource.</p>
                <button className="px-4 py-2 bg-iiif-blue text-white text-xs font-bold rounded shadow hover:bg-blue-600 transition-colors">
                    Create Annotation
                </button>
            </div>
        )}

        {tab === 'technical' && (
             <div className="space-y-4">
                 <div className="bg-slate-900 rounded p-4 overflow-hidden">
                     <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold mb-2">
                        <span>Resource ID</span>
                        <Icon name="content_copy" className="text-xs hover:text-white cursor-pointer"/>
                     </div>
                     <div className="font-mono text-[10px] text-green-400 break-all select-all">
                        {resource.id}
                     </div>
                 </div>

                 {resource.requiredStatement && (
                     <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Attribution</label>
                         <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                             {resource.requiredStatement.value[settings.language]?.[0]}
                         </div>
                     </div>
                 )}
                 
                 {resource.rights && (
                     <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Rights</label>
                         <a href={resource.rights} target="_blank" className="text-xs text-blue-600 hover:underline break-all block">
                             {resource.rights}
                         </a>
                     </div>
                 )}
             </div>
        )}
      </div>
    </aside>
  );
};
