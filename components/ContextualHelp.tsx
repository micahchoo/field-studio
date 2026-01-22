
import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { guidance, GuidanceTopic } from '../services/guidanceService';

interface HelpTip {
  id: GuidanceTopic;
  title: string;
  content: string;
  context: string[]; // Modes where this is relevant
  triggerCondition?: 'onEnter' | 'manual';
}

const HELP_TIPS: HelpTip[] = [
  {
    id: 'intro-archive',
    title: 'Archive Organization',
    content: 'The Archive view is your staging ground. Use folders to group items into Collections. Images inside a folder automatically form a Manifest.',
    context: ['archive'],
    triggerCondition: 'onEnter'
  },
  {
    id: 'intro-collections',
    title: 'Structuring Your Data',
    content: 'Here you build the official IIIF hierarchy. Drag items to nest them. Remember: Collections hold Manifests; Manifests hold Canvases.',
    context: ['collections'],
    triggerCondition: 'onEnter'
  },
  {
    id: 'intro-viewer',
    title: 'Deep Zoom & Annotation',
    content: 'Inspect high-res images. Use the tools to draw regions (Painting Annotations) or add comments (Supplementing Annotations).',
    context: ['viewer'],
    triggerCondition: 'onEnter'
  },
  {
    id: 'concept-manifest',
    title: 'Concept: Manifest',
    content: 'A Manifest is the digital envelope for a single object (like a book or a photo set). It contains all the metadata and pages (Canvases).',
    context: ['archive', 'collections'],
    triggerCondition: 'manual'
  },
  {
    id: 'concept-canvas',
    title: 'Concept: Canvas',
    content: 'A Canvas is an abstract space with height and width. We "paint" content (images, text) onto it. It\'s not just the file, it\'s the page.',
    context: ['viewer', 'collections'],
    triggerCondition: 'manual'
  }
];

interface ContextualHelpProps {
  mode: string;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ mode }) => {
  const [activeTip, setActiveTip] = useState<HelpTip | null>(null);
  const [minimized, setMinimized] = useState(false);

  // Auto-trigger logic
  useEffect(() => {
    const relevantTips = HELP_TIPS.filter(t => 
      t.context.includes(mode) && 
      t.triggerCondition === 'onEnter' && 
      !guidance.hasSeen(t.id)
    );

    if (relevantTips.length > 0) {
      // Small delay to not jar the user immediately on render
      const timer = setTimeout(() => {
        setActiveTip(relevantTips[0]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const handleDismiss = () => {
    if (activeTip) {
      guidance.markSeen(activeTip.id);
      setActiveTip(null);
    }
  };

  const showRandomTip = () => {
    const relevant = HELP_TIPS.filter(t => t.context.includes(mode));
    if (relevant.length > 0) {
        const next = relevant.find(t => !guidance.hasSeen(t.id)) || relevant[Math.floor(Math.random() * relevant.length)];
        setActiveTip(next);
        setMinimized(false);
    }
  };

  if (!activeTip && minimized) return (
      <button 
        onClick={showRandomTip}
        className="fixed bottom-6 right-6 z-40 bg-white text-iiif-blue p-3 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-all"
      >
        <Icon name="help_outline" className="text-2xl" />
      </button>
  );

  if (!activeTip) return (
      <button 
        onClick={showRandomTip}
        className="fixed bottom-6 right-6 z-40 bg-white/90 backdrop-blur text-slate-500 p-2 rounded-full shadow-md border border-slate-200 hover:bg-white hover:text-iiif-blue transition-all"
        title="Show Help"
      >
        <Icon name="help_outline" className="text-xl" />
      </button>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="w-80 bg-white rounded-xl shadow-2xl border-l-4 border-iiif-blue overflow-hidden">
          <div className="bg-slate-50 p-4 flex justify-between items-start border-b border-slate-100">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Icon name="school" className="text-iiif-blue"/> 
                {activeTip.title}
             </h3>
             <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600">
                <Icon name="close" className="text-sm"/>
             </button>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {activeTip.content}
            </p>
            <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Learning Tip</span>
                <button 
                    onClick={handleDismiss}
                    className="px-4 py-1.5 bg-iiif-blue text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors"
                >
                    Got it
                </button>
            </div>
          </div>
        </div>
    </div>
  );
};
