
import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { guidance, GuidanceTopic } from '../services/guidanceService';

interface HelpTip {
  id: GuidanceTopic;
  title: string;
  content: string;
  context: string[];
  triggerCondition?: 'onEnter';
  infographic?: 'hierarchy' | 'annotation' | 'image-api';
}

const HELP_TIPS: HelpTip[] = [
  { 
    id: 'intro-archive', 
    title: 'The Archive View', 
    content: 'The Archive is where raw field data becomes scientific evidence. Group your files by context (sites, layers, artifact types). We automatically extract "DNA" metadata like timestamps and GPS coordinates from your photos.', 
    context: ['archive'], 
    triggerCondition: 'onEnter' 
  },
  { 
    id: 'intro-collections', 
    title: 'The Structure View', 
    content: 'In IIIF, structure is meaning. Use "Collections" for projects, "Manifests" for single objects, and "Canvases" as the virtual trays where sources are examined.', 
    context: ['collections'], 
    triggerCondition: 'onEnter',
    infographic: 'hierarchy'
  },
  { 
    id: 'intro-viewer', 
    title: 'The Workbench', 
    content: 'The Workbench is for deep inspection. Use the "Supplementing" motivation to transcribe text or "Commenting" to add your field observations. Annotations travel with the image, not hidden in a separate database.', 
    context: ['viewer'], 
    triggerCondition: 'onEnter',
    infographic: 'annotation'
  }
];

export const ContextualHelp: React.FC<{ mode: string, isInspectorOpen?: boolean }> = ({ mode, isInspectorOpen }) => {
  const [activeTip, setActiveTip] = useState<HelpTip | null>(null);

  useEffect(() => {
    const tip = HELP_TIPS.find(t => t.context.includes(mode) && t.triggerCondition === 'onEnter' && !guidance.hasSeen(t.id));
    if (tip) {
      const timer = setTimeout(() => setActiveTip(tip), 2000);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  if (!activeTip) return null;

  return (
    <div 
        className={`fixed bottom-20 z-[200] animate-in slide-in-from-right-4 duration-500 pointer-events-none transition-all duration-300 ${isInspectorOpen ? 'right-[360px]' : 'right-8'}`}
    >
        <div className="w-80 bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700 pointer-events-auto ring-8 ring-black/5">
            <div className="bg-slate-800 px-4 py-3 flex justify-between items-center border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <Icon name="school" className="text-yellow-400 text-sm shadow-sm" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Archive Academy</span>
                </div>
                <button 
                    onClick={() => { guidance.markSeen(activeTip.id); setActiveTip(null); }} 
                    className="text-slate-500 hover:text-white transition-colors"
                >
                    <Icon name="close" className="text-sm" />
                </button>
            </div>
            
            {activeTip.infographic === 'hierarchy' && (
                <div className="bg-white p-4 flex flex-col items-center border-b border-slate-700">
                    <div className="flex gap-1 w-full justify-between items-center">
                        <div className="w-8 h-8 bg-amber-100 rounded border border-amber-300" title="Collection"></div>
                        <Icon name="arrow_forward" className="text-slate-300 text-xs"/>
                        <div className="w-12 h-12 bg-green-100 rounded border border-green-300" title="Manifest"></div>
                        <Icon name="arrow_forward" className="text-slate-300 text-xs"/>
                        <div className="w-16 h-16 bg-blue-100 rounded border border-blue-300" title="Canvas"></div>
                    </div>
                    <p className="text-[8px] text-slate-400 mt-2 font-black uppercase">Standard IIIF Stack</p>
                </div>
            )}

            <div className="p-5">
                <h4 className="text-sm font-bold text-white mb-2">{activeTip.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium mb-4">{activeTip.content}</p>
                
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-4">
                    <p className="text-[9px] font-black text-yellow-400 uppercase mb-1 flex items-center gap-1">
                        <Icon name="lightbulb" className="text-[10px]"/> Pro Insight
                    </p>
                    <p className="text-[10px] text-slate-400 italic">
                        "In the field, raw capture is frantic. Here, capture becomes context."
                    </p>
                </div>

                <div className="flex justify-end">
                    <button 
                        onClick={() => { guidance.markSeen(activeTip.id); setActiveTip(null); }} 
                        className="px-4 py-1.5 bg-iiif-blue text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg hover:bg-blue-600 transition-all"
                    >
                        Mastered
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
