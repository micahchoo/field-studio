/**
 * Resource Type Constants
 * 
 * Configuration for IIIF resource types (Collection, Manifest, Canvas, etc.)
 */

export type VisualProminence = 'primary' | 'secondary' | 'tertiary' | 'reference' | 'minimal';
export type CardSize = 'large' | 'medium' | 'badge' | 'container' | 'inline';

export interface VisualHierarchyConfig {
  prominence: VisualProminence;
  cardSize: CardSize;
  showThumbnail: boolean;
  showChildCount?: boolean;
  showAnnotationCount?: boolean;
  showCount?: boolean;
  showReferenceIndicator?: boolean;
}

/**
 * Visual hierarchy configuration for the Structure view
 */
export const STRUCTURE_VISUAL_HIERARCHY: Record<string, VisualHierarchyConfig> = {
  Manifest: {
    prominence: 'primary',
    cardSize: 'large',
    showThumbnail: true,
    showChildCount: true
  },
  Canvas: {
    prominence: 'secondary',
    cardSize: 'medium',
    showThumbnail: true,
    showAnnotationCount: true
  },
  AnnotationPage: {
    prominence: 'tertiary',
    cardSize: 'badge',
    showThumbnail: false,
    showCount: true
  },
  Collection: {
    prominence: 'reference',
    cardSize: 'container',
    showThumbnail: true,
    showReferenceIndicator: true
  },
  Annotation: {
    prominence: 'minimal',
    cardSize: 'inline',
    showThumbnail: false
  },
  Range: {
    prominence: 'tertiary',
    cardSize: 'badge',
    showThumbnail: false,
    showChildCount: true
  }
} as const;

/**
 * Get visual hierarchy config for a resource type
 */
export function getVisualHierarchy(type: string): VisualHierarchyConfig {
  return STRUCTURE_VISUAL_HIERARCHY[type] || {
    prominence: 'minimal',
    cardSize: 'inline',
    showThumbnail: false
  };
}

/**
 * Card size dimensions for the Structure view grid
 */
export const STRUCTURE_CARD_SIZES: Record<CardSize, { minWidth: number; aspectRatio: string }> = {
  large: { minWidth: 200, aspectRatio: '3/4' },
  medium: { minWidth: 150, aspectRatio: '1/1' },
  badge: { minWidth: 80, aspectRatio: '1/1' },
  container: { minWidth: 250, aspectRatio: 'auto' },
  inline: { minWidth: 0, aspectRatio: 'auto' }
} as const;

/**
 * Resource type configuration with icons and colors
 */
export const RESOURCE_TYPE_CONFIG: Record<string, { 
  icon: string; 
  colorClass: string; 
  bgClass: string; 
  borderClass: string; 
  label: string; 
  metaphor: string 
}> = {
  'Collection': {
    icon: 'folder',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-100',
    borderClass: 'border-amber-200',
    label: 'Collection',
    metaphor: 'Literary Genres'
  },
  'Manifest': { 
    icon: 'menu_book', 
    colorClass: 'text-emerald-600', 
    bgClass: 'bg-emerald-100', 
    borderClass: 'border-emerald-200', 
    label: 'Manifest',
    metaphor: 'Book'
  },
  'Canvas': { 
    icon: 'crop_original', 
    colorClass: 'text-blue-500', 
    bgClass: 'bg-blue-100', 
    borderClass: 'border-blue-200', 
    label: 'Canvas',
    metaphor: 'Page'
  },
  'Range': { 
    icon: 'segment', 
    colorClass: 'text-indigo-500', 
    bgClass: 'bg-indigo-100', 
    borderClass: 'border-indigo-200', 
    label: 'Range',
    metaphor: 'Table of Contents'
  },
  'AnnotationPage': { 
    icon: 'layers', 
    colorClass: 'text-purple-500', 
    bgClass: 'bg-purple-100', 
    borderClass: 'border-purple-200', 
    label: 'Annotation Page',
    metaphor: 'Transparent overlay on page'
  },
  'Annotation': { 
    icon: 'chat_bubble', 
    colorClass: 'text-teal-500', 
    bgClass: 'bg-teal-100', 
    borderClass: 'border-teal-200', 
    label: 'Annotation',
    metaphor: 'Note / Mark on the transparent overlay'
  },
  'Content': { 
    icon: 'image', 
    colorClass: 'text-slate-500', 
    bgClass: 'bg-slate-100', 
    borderClass: 'border-slate-200', 
    label: 'Content',
    metaphor: 'The actual thing made with ink on the page'
  },
  'AnnotationCollection': {
    icon: 'collections_bookmark',
    colorClass: 'text-pink-500',
    bgClass: 'bg-pink-100',
    borderClass: 'border-pink-200',
    label: 'Annotation Collection',
    metaphor: 'Collections of one/many persons annotations on a single page, book or genre'
  }
} as const;
