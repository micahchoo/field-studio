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
import { Button } from '@/src/shared/ui/atoms';
import type { IIIFItem } from '@/src/shared/types';
import { TemplateItemPicker } from '../molecules/TemplateItemPicker';

export type BoardLayoutType =
  | 'narrative'
  | 'comparison'
  | 'map'
  | 'timeline'
  | 'storyboard'
  | 'choice-comparison'
  | 'annotation-review'
  | 'book-spread'
  | 'provenance-map'
  | 'scroll-layout';

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  previewLayout: BoardLayoutType;
  itemCount: number;
  suggestedItems?: string[];
  /** IIIF behavior to set on export */
  defaultBehavior?: string[];
  /** IIIF viewingDirection to set on export */
  defaultViewingDirection?: string;
  /** Connection type used between items */
  connectionType?: string;
}

export interface BoardOnboardingProps {
  /** Called when user selects a template (demo flow) */
  onSelectTemplate: (template: BoardTemplate) => void;
  /** Called when user picks template + items via the picker */
  onSelectTemplateWithItems?: (template: BoardTemplate, items: IIIFItem[]) => void;
  /** Called when user wants to start from scratch */
  onStartBlank: () => void;
  /** Called when user wants to browse archive */
  onBrowseArchive: () => void;
  /** Root item for getting sample items */
  root: IIIFItem | null;
  /** Available archive items for the template item picker */
  availableItems?: IIIFItem[];
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
    name: 'Narrative Sequence',
    description: 'Create a presentation-like sequence. Each canvas becomes a slide, exported as an ordered IIIF Manifest.',
    icon: 'auto_stories',
    previewLayout: 'narrative',
    itemCount: 4,
    defaultBehavior: ['individuals'],
    connectionType: 'sequence',
  },
  {
    id: 'comparison',
    name: 'Comparative Analysis',
    description: 'Link items with IIIF comparison annotations. Perfect for before/after, versions, or scholarly analysis.',
    icon: 'compare',
    previewLayout: 'comparison',
    itemCount: 2,
    defaultBehavior: ['individuals'],
    connectionType: 'similarTo',
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Arrange items chronologically using IIIF navDate. Viewers can navigate by date automatically.',
    icon: 'view_timeline',
    previewLayout: 'timeline',
    itemCount: 5,
    connectionType: 'sequence',
  },
  {
    id: 'map',
    name: 'Geographic Collection',
    description: 'Position items on a map using IIIF navPlace (GeoJSON). Enable geographic browsing of your collection.',
    icon: 'map',
    previewLayout: 'map',
    itemCount: 3,
    connectionType: 'associated',
  },
  {
    id: 'storyboard',
    name: 'Storyboard',
    description: 'Horizontal filmstrip with sequence connections + notes below each frame. Ideal for AV scenes.',
    icon: 'view_carousel',
    previewLayout: 'storyboard',
    itemCount: 4,
    defaultBehavior: ['individuals'],
    connectionType: 'sequence',
  },
  {
    id: 'choice-comparison',
    name: 'Choice Comparison',
    description: 'Side-by-side layout for multispectral/RTI imaging. Shows Choice body alternatives together.',
    icon: 'layers',
    previewLayout: 'choice-comparison',
    itemCount: 3,
    connectionType: 'similarTo',
  },
  {
    id: 'annotation-review',
    name: 'Annotation Review',
    description: 'Canvas in center with annotation layers fanned around it. For specialist review workflows.',
    icon: 'hub',
    previewLayout: 'annotation-review',
    itemCount: 5,
    connectionType: 'references',
  },
  {
    id: 'book-spread',
    name: 'Book Spread',
    description: 'Paired 2-up rows representing page openings. Ideal for paged manuscripts.',
    icon: 'menu_book',
    previewLayout: 'book-spread',
    itemCount: 6,
    defaultBehavior: ['paged'],
    connectionType: 'sequence',
  },
  {
    id: 'provenance-map',
    name: 'Provenance Map',
    description: 'Star layout: manifest center with provider, homepage, seeAlso, rendering fanned around.',
    icon: 'account_tree',
    previewLayout: 'provenance-map',
    itemCount: 5,
    connectionType: 'references',
  },
  {
    id: 'scroll-layout',
    name: 'Scroll Layout',
    description: 'Vertical strip with sequence connections. Mirrors IIIF continuous behavior for scroll objects.',
    icon: 'view_day',
    previewLayout: 'scroll-layout',
    itemCount: 4,
    defaultBehavior: ['continuous'],
    defaultViewingDirection: 'top-to-bottom',
    connectionType: 'sequence',
  },
];

const TemplatePreview: React.FC<{ layout: BoardTemplate['previewLayout']; itemCount: number; fieldMode: boolean }> = ({
  layout,
  fieldMode,
}) => {
  const baseItemClass = `absolute w-8 h-8 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`;
  const lineColor = fieldMode ? '#78716c' : '#d6d3d1';
  const accentColor = fieldMode ? '#d97706' : '#f59e0b';

  const layouts: Record<BoardLayoutType, React.ReactNode> = {
    narrative: (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className={`${baseItemClass} left-2 top-6`} />
        <div className={`${baseItemClass} left-12 top-4`} />
        <div className={`${baseItemClass} left-22 top-8`} />
        <div className={`${baseItemClass} left-32 top-5`} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 40">
          <path d="M 20 20 Q 30 15, 40 20 T 60 20" fill="none" stroke={lineColor} strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      </div>
    ),
    comparison: (
      <div className="relative w-full h-full flex items-center justify-center gap-4">
        <div className={`w-10 h-12 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />
        <div className={`text-lg ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>{'\u2194'}</div>
        <div className={`w-10 h-12 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />
      </div>
    ),
    timeline: (
      <div className="relative w-full h-full flex items-center">
        <div className={`absolute left-2 right-2 h-0.5 ${fieldMode ? 'bg-nb-black/60' : 'bg-nb-black/20'}`} />
        <div className={`${baseItemClass} left-4 top-5`} />
        <div className={`${baseItemClass} left-16 top-3`} />
        <div className={`${baseItemClass} left-28 top-6`} />
        <div className={`${baseItemClass} left-40 top-4`} />
        <div className={`${baseItemClass} left-52 top-5`} />
      </div>
    ),
    map: (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className={`absolute w-16 h-12 ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'} opacity-50`} />
        <div className={`absolute left-4 top-3 w-6 h-6 ${fieldMode ? 'bg-nb-orange' : 'bg-nb-orange'}`} />
        <div className={`absolute right-6 top-8 w-5 h-5 ${fieldMode ? 'bg-nb-orange' : 'bg-nb-orange'}`} />
        <div className={`absolute left-12 bottom-4 w-4 h-4 ${fieldMode ? 'bg-nb-orange' : 'bg-nb-orange/40'}`} />
      </div>
    ),
    storyboard: (
      <div className="relative w-full h-full flex items-end pb-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 px-0.5">
            <div className={`w-full h-6 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />
            <div className={`w-full h-2 ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`} />
          </div>
        ))}
        <svg className="absolute top-3 left-0 w-full" viewBox="0 0 80 4" preserveAspectRatio="none">
          <path d="M 10 2 L 70 2" fill="none" stroke={lineColor} strokeWidth="0.5" strokeDasharray="1 1" />
        </svg>
      </div>
    ),
    'choice-comparison': (
      <div className="relative w-full h-full flex items-center justify-center gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-8 h-10 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'} border ${fieldMode ? 'border-nb-black/60' : 'border-nb-black/20'}`} />
        ))}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 40">
          <line x1="28" y1="20" x2="38" y2="20" stroke={accentColor} strokeWidth="0.8" />
          <line x1="48" y1="20" x2="58" y2="20" stroke={accentColor} strokeWidth="0.8" />
        </svg>
      </div>
    ),
    'annotation-review': (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className={`w-10 h-10 ${fieldMode ? 'bg-nb-black/60' : 'bg-nb-black/20'} z-10`} />
        {[0, 1, 2, 3].map(i => {
          const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
          const r = 18;
          return (
            <div key={i} className={`absolute w-5 h-5 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`}
              style={{ left: `calc(50% + ${Math.cos(angle) * r}px - 10px)`, top: `calc(50% + ${Math.sin(angle) * r}px - 10px)` }}
            />
          );
        })}
      </div>
    ),
    'book-spread': (
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-1">
        {[0, 1].map(row => (
          <div key={row} className="flex gap-0.5">
            <div className={`w-12 h-8 rounded-l ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />
            <div className={`w-12 h-8 rounded-r ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />
          </div>
        ))}
      </div>
    ),
    'provenance-map': (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className={`w-8 h-8 ${fieldMode ? 'bg-nb-orange' : 'bg-nb-orange/40'} z-10`} />
        {[0, 1, 2, 3].map(i => {
          const positions = [
            { left: '15%', top: '15%' },
            { left: '70%', top: '15%' },
            { left: '15%', top: '65%' },
            { left: '70%', top: '65%' },
          ];
          return (
            <div key={i} className={`absolute w-5 h-5 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`}
              style={positions[i]}
            />
          );
        })}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 40">
          <line x1="40" y1="20" x2="18" y2="10" stroke={lineColor} strokeWidth="0.5" strokeDasharray="2 1" />
          <line x1="40" y1="20" x2="62" y2="10" stroke={lineColor} strokeWidth="0.5" strokeDasharray="2 1" />
          <line x1="40" y1="20" x2="18" y2="32" stroke={lineColor} strokeWidth="0.5" strokeDasharray="2 1" />
          <line x1="40" y1="20" x2="62" y2="32" stroke={lineColor} strokeWidth="0.5" strokeDasharray="2 1" />
        </svg>
      </div>
    ),
    'scroll-layout': (
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-0.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-16 h-4 ${fieldMode ? 'bg-nb-black/70' : 'bg-nb-black/10'}`} />
        ))}
        <svg className="absolute right-3 top-2 bottom-2 w-2" viewBox="0 0 4 40">
          <line x1="2" y1="2" x2="2" y2="38" stroke={lineColor} strokeWidth="0.5" />
          <polygon points="0,36 4,36 2,40" fill={lineColor} />
        </svg>
      </div>
    ),
  };

  return <>{layouts[layout]}</>;
};

export const BoardOnboarding: React.FC<BoardOnboardingProps> = ({
  onSelectTemplate,
  onSelectTemplateWithItems,
  onStartBlank,
  onBrowseArchive,
  availableItems = [],
  cx,
  fieldMode,
}) => {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<BoardTemplate | null>(null);

  return (
    <div className={`h-full flex flex-col ${cx.surface}`}>
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
        {/* Icon */}
        <div className={`w-20 h-20 flex items-center justify-center mb-6 ${fieldMode ? 'bg-nb-orange/10' : 'bg-nb-orange/20'}`}>
          <svg className={`w-10 h-10 ${fieldMode ? 'text-nb-orange' : 'text-nb-orange'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <Button variant="ghost" size="bare"
            onClick={() => setShowDemoPrompt(true)}
            className={`px-6 py-3 font-medium flex items-center gap-2 transition-nb ${
              fieldMode
                ? 'bg-nb-orange hover:bg-nb-orange text-white'
                : 'bg-nb-orange hover:bg-nb-orange text-white shadow-brutal shadow-nb-orange/20'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start with Demo
          </Button>
          <Button variant="ghost" size="bare"
            onClick={onBrowseArchive}
            className={`px-6 py-3 font-medium flex items-center gap-2 transition-nb border ${
              fieldMode
                ? 'border-nb-black/60 text-nb-black/20 hover:bg-nb-black'
                : 'border-nb-black/20 text-nb-black/70 hover:bg-nb-cream'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Browse Archive
          </Button>
        </div>

        {/* Start Blank Link */}
        <Button variant="ghost" size="bare"
          onClick={onStartBlank}
          className={`text-sm underline-offset-4 hover:underline transition-nb ${cx.textMuted}`}
        >
          Or start with a blank canvas →
        </Button>
      </div>

      {/* Template Gallery */}
      <div className={`border-t-2 border-t-mode-accent ${cx.border} px-8 py-6`}>
        <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${cx.textMuted}`}>
          Choose a Template
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {TEMPLATES.map((template) => (
            <Button variant="ghost" size="bare"
              key={template.id}
              onClick={() => {
                if (onSelectTemplateWithItems && availableItems.length > 0) {
                  setPendingTemplate(template);
                } else {
                  onSelectTemplate(template);
                }
              }}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              className={`text-left p-4 border transition-nb group ${
                fieldMode
                  ? `border-nb-black/70 hover:border-nb-orange hover:bg-nb-black ${hoveredTemplate === template.id ? 'border-nb-orange bg-nb-black' : ''}`
                  : `border-nb-black/10 hover:border-nb-orange hover:shadow-brutal hover:shadow-nb-orange/10 ${hoveredTemplate === template.id ? 'border-nb-orange shadow-brutal shadow-nb-orange/10' : 'bg-nb-white'}`
              }`}
            >
              {/* Preview */}
              <div className={`h-16 mb-3 overflow-hidden relative ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'}`}>
                <TemplatePreview layout={template.previewLayout} itemCount={template.itemCount} fieldMode={fieldMode} />
              </div>

              {/* Info */}
              <h3 className={`font-semibold text-sm mb-1 ${cx.text}`}>{template.name}</h3>
              <p className={`text-xs line-clamp-2 ${cx.textMuted}`}>{template.description}</p>

              {/* Hover hint */}
              <div className={`mt-2 text-xs font-medium flex items-center gap-1 transition-nb ${
                fieldMode ? 'text-nb-orange' : 'text-nb-orange'
              } ${hoveredTemplate === template.id ? 'opacity-100' : 'opacity-0'}`}>
                {onSelectTemplateWithItems && availableItems.length > 0 ? 'Choose items' : 'Click to use'}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Demo Prompt Modal */}
      {showDemoPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nb-black/50">
          <div className={`max-w-md w-full p-6 ${fieldMode ? 'bg-nb-black border border-nb-black/70' : 'bg-nb-white shadow-brutal'}`}>
            <h3 className={`text-xl font-bold mb-2 ${cx.text}`}>Start with Demo</h3>
            <p className={`mb-6 ${cx.textMuted}`}>
              We'll create a sample board with a few items so you can see how connections and layouts work.
              You can modify or delete these items anytime.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="bare"
                onClick={() => setShowDemoPrompt(false)}
                className={`px-4 py-2 font-medium transition-nb ${
                  fieldMode ? 'text-nb-black/40 hover:text-nb-black/10' : 'text-nb-black/60 hover:text-nb-black'
                }`}
              >
                Cancel
              </Button>
              <Button variant="ghost" size="bare"
                onClick={() => {
                  setShowDemoPrompt(false);
                  // Create a narrative template with demo flag
                  onSelectTemplate({ ...TEMPLATES[0], id: 'narrative-demo' });
                }}
                className={`px-4 py-2 font-medium transition-nb ${
                  fieldMode ? 'bg-nb-orange hover:bg-nb-orange text-white' : 'bg-nb-orange hover:bg-nb-orange text-white'
                }`}
              >
                Create Demo Board
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Template Item Picker Modal */}
      {pendingTemplate && onSelectTemplateWithItems && (
        <TemplateItemPicker
          isOpen={!!pendingTemplate}
          onClose={() => setPendingTemplate(null)}
          template={pendingTemplate}
          availableItems={availableItems}
          onConfirm={(template, items) => {
            setPendingTemplate(null);
            onSelectTemplateWithItems(template, items);
          }}
          cx={cx}
          fieldMode={fieldMode}
        />
      )}
    </div>
  );
};

export default BoardOnboarding;
