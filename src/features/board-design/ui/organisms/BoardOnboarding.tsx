/**
 * BoardOnboarding Organism
 *
 * Complete onboarding redesign for the Board Design feature.
 * Addresses blank canvas syndrome with templates, examples, and clear value proposition.
 *
 * BOLD AESTHETIC:
 * - Warm stone palette with amber accents
 * - Editorial typography with clear hierarchy
 * - Card-based template gallery
 * - Generous whitespace
 */

import React, { useState } from 'react';
import type { IIIFItem } from '@/types';

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  previewLayout: 'narrative' | 'comparison' | 'map' | 'timeline' | 'grid';
  itemCount: number;
  suggestedItems?: string[];
}

export interface BoardOnboardingProps {
  /** Called when user selects a template */
  onSelectTemplate: (template: BoardTemplate) => void;
  /** Called when user wants to start from scratch */
  onStartBlank: () => void;
  /** Called when user wants to browse archive */
  onBrowseArchive: () => void;
  /** Root item for getting sample items */
  root: IIIFItem | null;
  /** Contextual styles */
  cx: {
    surface: string;
    text: string;
    textMuted: string;
    accent: string;
    border: string;
    headerBg: string;
  };
  fieldMode: boolean;
}

const TEMPLATES: BoardTemplate[] = [
  {
    id: 'narrative',
    name: 'Photo Narrative',
    description: 'Connect photos in a sequence to tell a visual story. Perfect for documenting events, journeys, or processes.',
    icon: 'auto_stories',
    previewLayout: 'narrative',
    itemCount: 4,
  },
  {
    id: 'comparison',
    name: 'Side-by-Side Comparison',
    description: 'Place items next to each other to highlight similarities and differences. Great for analysis.',
    icon: 'compare',
    previewLayout: 'comparison',
    itemCount: 2,
  },
  {
    id: 'timeline',
    name: 'Timeline Story',
    description: 'Arrange items chronologically to show progression over time. Ideal for historical sequences.',
    icon: 'view_timeline',
    previewLayout: 'timeline',
    itemCount: 5,
  },
  {
    id: 'map',
    name: 'Geographic Layout',
    description: 'Position items on a geographic layout. Perfect for location-based collections.',
    icon: 'map',
    previewLayout: 'map',
    itemCount: 3,
  },
  {
    id: 'grid',
    name: 'Curated Grid',
    description: 'Organize items in a flexible grid. Great for creating thematic collections.',
    icon: 'grid_view',
    previewLayout: 'grid',
    itemCount: 6,
  },
];

const TemplatePreview: React.FC<{ layout: BoardTemplate['previewLayout']; itemCount: number; fieldMode: boolean }> = ({
  layout,
  itemCount,
  fieldMode,
}) => {
  const baseItemClass = `absolute w-8 h-8 rounded ${fieldMode ? 'bg-stone-700' : 'bg-stone-200'}`;

  const layouts = {
    narrative: (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className={`${baseItemClass} left-2 top-6`} />
        <div className={`${baseItemClass} left-12 top-4`} />
        <div className={`${baseItemClass} left-22 top-8`} />
        <div className={`${baseItemClass} left-32 top-5`} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 40">
          <path d="M 20 20 Q 30 15, 40 20 T 60 20" fill="none" stroke={fieldMode ? '#78716c' : '#d6d3d1'} strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      </div>
    ),
    comparison: (
      <div className="relative w-full h-full flex items-center justify-center gap-4">
        <div className={`w-10 h-12 rounded ${fieldMode ? 'bg-stone-700' : 'bg-stone-200'}`} />
        <div className={`text-lg ${fieldMode ? 'text-stone-600' : 'text-stone-400'}`}>vs</div>
        <div className={`w-10 h-12 rounded ${fieldMode ? 'bg-stone-700' : 'bg-stone-200'}`} />
      </div>
    ),
    timeline: (
      <div className="relative w-full h-full flex items-center">
        <div className={`absolute left-2 right-2 h-0.5 ${fieldMode ? 'bg-stone-600' : 'bg-stone-300'}`} />
        <div className={`${baseItemClass} left-4 top-5`} />
        <div className={`${baseItemClass} left-16 top-3`} />
        <div className={`${baseItemClass} left-28 top-6`} />
        <div className={`${baseItemClass} left-40 top-4`} />
        <div className={`${baseItemClass} left-52 top-5`} />
      </div>
    ),
    map: (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className={`absolute w-16 h-12 rounded-full ${fieldMode ? 'bg-stone-800' : 'bg-stone-100'} opacity-50`} />
        <div className={`absolute left-4 top-3 w-6 h-6 rounded-full ${fieldMode ? 'bg-amber-600' : 'bg-amber-400'}`} />
        <div className={`absolute right-6 top-8 w-5 h-5 rounded-full ${fieldMode ? 'bg-amber-700' : 'bg-amber-500'}`} />
        <div className={`absolute left-12 bottom-4 w-4 h-4 rounded-full ${fieldMode ? 'bg-amber-500' : 'bg-amber-300'}`} />
      </div>
    ),
    grid: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`w-6 h-6 rounded ${fieldMode ? 'bg-stone-700' : 'bg-stone-200'}`} />
          ))}
        </div>
      </div>
    ),
  };

  return layouts[layout];
};

export const BoardOnboarding: React.FC<BoardOnboardingProps> = ({
  onSelectTemplate,
  onStartBlank,
  onBrowseArchive,
  cx,
  fieldMode,
}) => {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);

  return (
    <div className={`h-full flex flex-col ${cx.surface}`}>
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
        {/* Icon */}
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${fieldMode ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
          <svg className={`w-10 h-10 ${fieldMode ? 'text-amber-400' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>

        {/* Headline */}
        <h1 className={`text-3xl font-bold mb-3 ${cx.text}`}>
          Create Visual Stories
        </h1>

        {/* Value Proposition */}
        <p className={`text-lg max-w-lg mb-8 ${cx.textMuted}`}>
          Connect photos, videos, and documents to build meaningful relationships. 
          Arrange them visually to tell stories, make comparisons, or create narratives.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setShowDemoPrompt(true)}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
              fieldMode
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start with Demo
          </button>
          <button
            onClick={onBrowseArchive}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all border ${
              fieldMode
                ? 'border-stone-600 text-stone-300 hover:bg-stone-800'
                : 'border-stone-300 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Browse Archive
          </button>
        </div>

        {/* Start Blank Link */}
        <button
          onClick={onStartBlank}
          className={`text-sm underline-offset-4 hover:underline transition-all ${cx.textMuted}`}
        >
          Or start with a blank canvas →
        </button>
      </div>

      {/* Template Gallery */}
      <div className={`border-t ${cx.border} px-8 py-6`}>
        <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${cx.textMuted}`}>
          Choose a Template
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              className={`text-left p-4 rounded-xl border transition-all duration-200 group ${
                fieldMode
                  ? `border-stone-700 hover:border-amber-600 hover:bg-stone-800 ${hoveredTemplate === template.id ? 'border-amber-600 bg-stone-800' : ''}`
                  : `border-stone-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 ${hoveredTemplate === template.id ? 'border-amber-400 shadow-lg shadow-amber-500/10' : 'bg-white'}`
              }`}
            >
              {/* Preview */}
              <div className={`h-16 rounded-lg mb-3 overflow-hidden relative ${fieldMode ? 'bg-stone-900' : 'bg-stone-50'}`}>
                <TemplatePreview layout={template.previewLayout} itemCount={template.itemCount} fieldMode={fieldMode} />
              </div>

              {/* Info */}
              <h3 className={`font-semibold text-sm mb-1 ${cx.text}`}>{template.name}</h3>
              <p className={`text-xs line-clamp-2 ${cx.textMuted}`}>{template.description}</p>

              {/* Hover hint */}
              <div className={`mt-2 text-xs font-medium flex items-center gap-1 transition-all ${
                fieldMode ? 'text-amber-400' : 'text-amber-600'
              } ${hoveredTemplate === template.id ? 'opacity-100' : 'opacity-0'}`}>
                Click to use
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Demo Prompt Modal */}
      {showDemoPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`max-w-md w-full rounded-2xl p-6 ${fieldMode ? 'bg-stone-900 border border-stone-700' : 'bg-white shadow-xl'}`}>
            <h3 className={`text-xl font-bold mb-2 ${cx.text}`}>Start with Demo</h3>
            <p className={`mb-6 ${cx.textMuted}`}>
              We'll create a sample board with a few items so you can see how connections and layouts work. 
              You can modify or delete these items anytime.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDemoPrompt(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  fieldMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-stone-800'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDemoPrompt(false);
                  // Create a narrative template with demo flag
                  onSelectTemplate({ ...TEMPLATES[0], id: 'narrative-demo' });
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  fieldMode ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                Create Demo Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardOnboarding;
