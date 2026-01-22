
import React, { useState } from 'react';
import { IIIFItem, IIIFAnnotation, IIIFCanvas, AppSettings } from '../types';
import { Icon } from './Icon';
import { analyzeImage, blobToBase64 } from '../services/geminiService';
import { useToast } from './Toast';

interface MetadataEditorProps {
  resource: IIIFItem | null;
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  settings: AppSettings;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ resource, onUpdateResource, settings }) => {
  const { showToast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<'metadata' | 'annotations'>('metadata');

  if (!resource) {
    return (
        <div className="w-80 bg-white border-l border-slate-200 p-8 flex flex-col items-center justify-center text-slate-400">
            <Icon name="info" className="text-4xl mb-2"/>
            <p className="text-sm text-center">Select an item to view properties</p>
        </div>
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

  const inputClass = "w-full text-sm p-2.5 border border-slate-300 rounded bg-white text-slate-900 focus:ring-2 focus:ring-iiif-blue focus:border-iiif-blue outline-none transition-all";

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-30">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'metadata' ? 'text-iiif-blue border-b-2 border-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setTab('metadata')}
            >
                Metadata
            </button>
            <button 
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'annotations' ? 'text-iiif-blue border-b-2 border-iiif-blue' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setTab('annotations')}
            >
                Annotations
            </button>
        </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {tab === 'metadata' && (
            <>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Type</span>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{resource.type}</span>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Label</label>
                    <input 
                        type="text" 
                        value={label}
                        onChange={e => onUpdateResource({ label: { [settings.language]: [e.target.value] } })}
                        className={inputClass}
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">Summary</label>
                        {resource.type === 'Canvas' && (
                             <button 
                                onClick={handleAIAnalysis} 
                                disabled={analyzing}
                                className="text-[10px] text-purple-600 hover:text-purple-800 flex items-center gap-1 font-bold"
                            >
                                <Icon name="auto_awesome" className="text-xs" />
                                {analyzing ? 'Thinking...' : 'AI Generate'}
                            </button>
                        )}
                    </div>
                    <textarea 
                        rows={5}
                        value={summary}
                        onChange={e => onUpdateResource({ summary: { [settings.language]: [e.target.value] } })}
                        className={`${inputClass} resize-none`}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Metadata Fields</label>
                    <div className="space-y-2">
                        {(resource.metadata || []).map((md, idx) => (
                            <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                                <div className="font-bold text-slate-600">{md.label[settings.language]?.[0] || 'Unknown'}</div>
                                <div className="text-slate-800 mt-1">{md.value[settings.language]?.join(', ')}</div>
                            </div>
                        ))}
                        <button className="w-full py-2 border border-dashed border-slate-300 rounded text-xs text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-1">
                            <Icon name="add" className="text-sm"/> Add Field
                        </button>
                    </div>
                </div>
            </>
        )}

        {tab === 'annotations' && (
            <div className="text-center py-10">
                <Icon name="comments_disabled" className="text-4xl text-slate-300 mb-2"/>
                <p className="text-xs text-slate-500">No annotations yet.</p>
                <button className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded hover:bg-slate-200">
                    Add Annotation
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
