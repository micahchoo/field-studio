/**
 * IIIF Presentation API 3.0 Schema Definitions
 *
 * Complete property requirements as defined in the IIIF Presentation API 3.0 specification.
 * This module serves as the single source of truth for validation, UI generation, and ingest logic.
 *
 * @see https://iiif.io/api/presentation/3.0/
 */

import { IIIFItem } from '@/src/shared/types';
import { IIIF_SPEC } from '@/src/shared/constants';

// ============================================================================
// Type Definitions
// ============================================================================

export type PropertyRequirement = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'NOT_ALLOWED' | 'CONDITIONAL';

export type IIIFResourceType =
  | 'Collection'
  | 'Manifest'
  | 'Canvas'
  | 'Range'
  | 'AnnotationPage'
  | 'AnnotationCollection'
  | 'Annotation'
  | 'ContentResource'
  | 'Agent'
  | 'SpecificResource'
  | 'Choice'
  | 'TextualBody';

export type ContentResourceType = 'Image' | 'Video' | 'Sound' | 'Text' | 'Dataset' | 'Model';

export type ViewingDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';

export type TimeMode = 'trim' | 'scale' | 'loop';

export type Behavior =
  | 'auto-advance'
  | 'no-auto-advance'
  | 'repeat'
  | 'no-repeat'
  | 'unordered'
  | 'individuals'
  | 'continuous'
  | 'paged'
  | 'facing-pages'
  | 'non-paged'
  | 'multi-part'
  | 'together'
  | 'sequence'
  | 'thumbnail-nav'
  | 'no-nav'
  | 'hidden';

export type Motivation = 'painting' | 'supplementing';

export type LanguageMap = Record<string, string[]>;

export interface MetadataEntry {
  label: LanguageMap;
  value: LanguageMap;
}

// ============================================================================
// Complete Property Matrix (Corrected from specification)
// ============================================================================

/**
 * Complete property requirements matrix from IIIF Presentation API 3.0
 * Each property maps to its requirement level for each resource type
 * 
 * IMPORTANT CORRECTIONS:
 * 1. label is REQUIRED for Collection and Manifest, RECOMMENDED for Canvas, Range, AnnotationCollection
 * 2. metadata is RECOMMENDED for Collection and Manifest
 * 3. summary is RECOMMENDED for Collection and Manifest
 * 4. requiredStatement is OPTIONAL for all (but clients MUST render it)
 * 5. rights is OPTIONAL for all (uses Creative Commons or RightsStatements.org URIs)
 * 6. provider is RECOMMENDED for Collection and Manifest
 * 7. navDate is OPTIONAL for Collection, Manifest, Canvas, Range
 * 8. placeholderCanvas/accompanyingCanvas are OPTIONAL for Collection, Manifest, Canvas, Range
 * 9. language is for external resources only
 */
export const PROPERTY_MATRIX: Record<string, Record<IIIFResourceType, PropertyRequirement>> = {
  // Descriptive Properties
  label: {
    Collection: 'REQUIRED',
    Manifest: 'REQUIRED',
    Canvas: 'RECOMMENDED',
    Range: 'RECOMMENDED',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'RECOMMENDED',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'REQUIRED',
    SpecificResource: 'OPTIONAL',
    Choice: 'OPTIONAL',
    TextualBody: 'OPTIONAL'
  },
  metadata: {
    Collection: 'RECOMMENDED',
    Manifest: 'RECOMMENDED',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'OPTIONAL',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  summary: {
    Collection: 'RECOMMENDED',
    Manifest: 'RECOMMENDED',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'OPTIONAL',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  requiredStatement: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'OPTIONAL',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  rights: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'OPTIONAL',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  provider: {
    Collection: 'RECOMMENDED',
    Manifest: 'RECOMMENDED',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'NOT_ALLOWED', // Agent IS the provider
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  thumbnail: {
    Collection: 'RECOMMENDED',
    Manifest: 'RECOMMENDED',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  navDate: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  placeholderCanvas: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  accompanyingCanvas: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },

  // Technical Properties
  id: {
    Collection: 'REQUIRED',
    Manifest: 'REQUIRED',
    Canvas: 'REQUIRED',
    Range: 'REQUIRED',
    AnnotationPage: 'REQUIRED',
    AnnotationCollection: 'REQUIRED',
    Annotation: 'REQUIRED',
    ContentResource: 'REQUIRED',
    Agent: 'REQUIRED',
    SpecificResource: 'REQUIRED',
    Choice: 'REQUIRED',
    TextualBody: 'OPTIONAL'
  },
  type: {
    Collection: 'REQUIRED',
    Manifest: 'REQUIRED',
    Canvas: 'REQUIRED',
    Range: 'REQUIRED',
    AnnotationPage: 'REQUIRED',
    AnnotationCollection: 'REQUIRED',
    Annotation: 'REQUIRED',
    ContentResource: 'REQUIRED',
    Agent: 'REQUIRED',
    SpecificResource: 'REQUIRED',
    Choice: 'REQUIRED',
    TextualBody: 'OPTIONAL'
  },
  format: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'OPTIONAL'
  },
  profile: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'OPTIONAL',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  height: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'CONDITIONAL', // Must have width if height is present
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED', // For images/videos
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  width: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'CONDITIONAL', // Must have height if width is present
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED', // For images/videos
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  duration: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'OPTIONAL',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED', // For audio/video
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  language: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED', // For external resources
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'OPTIONAL' // For TextualBody in annotations
  },
  viewingDirection: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'NOT_ALLOWED',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  behavior: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'OPTIONAL',
    Choice: 'OPTIONAL',
    TextualBody: 'NOT_ALLOWED'
  },
  timeMode: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'OPTIONAL',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  motivation: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'REQUIRED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  purpose: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'OPTIONAL',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'OPTIONAL'
  },

  // Linking Properties (External)
  homepage: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'RECOMMENDED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  rendering: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  service: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL', // Especially for images
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  services: {
    Collection: 'OPTIONAL', // Only if top-level
    Manifest: 'OPTIONAL',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  seeAlso: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'OPTIONAL',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  logo: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'RECOMMENDED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },

  // Linking Properties (Internal)
  partOf: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  start: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'OPTIONAL',
    Canvas: 'NOT_ALLOWED',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  supplementary: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  body: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'REQUIRED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  target: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'REQUIRED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  source: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'REQUIRED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  selector: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'OPTIONAL',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },

  // Structural Properties
  items: {
    Collection: 'REQUIRED',
    Manifest: 'REQUIRED',
    Canvas: 'RECOMMENDED',
    Range: 'REQUIRED',
    AnnotationPage: 'RECOMMENDED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'OPTIONAL', // For Choice resources
    TextualBody: 'NOT_ALLOWED'
  },
  structures: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'OPTIONAL',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  annotations: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'OPTIONAL',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  first: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'RECOMMENDED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  last: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'RECOMMENDED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  next: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },
  prev: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },

  // JSON-LD Context
  '@context': {
    Collection: 'REQUIRED', // For top-level resources
    Manifest: 'REQUIRED', // For top-level resources
    Canvas: 'NOT_ALLOWED', // Embedded resources don't have @context
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED'
  },

  // Value properties for TextualBody
  value: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'REQUIRED'
  }
};

// ============================================================================
// Items Containment Rules (Corrected)
// ============================================================================

/**
 * Defines what resource types can be contained in the 'items' property
 * From specification Section 3.4
 */
export const ITEMS_CONTAINMENT: Record<string, string[]> = {
  Collection: ['Collection', 'Manifest'],
  Manifest: ['Canvas'],
  Canvas: ['AnnotationPage'],
  Range: ['Range', 'Canvas', 'SpecificResource'], // Can also reference parts of Canvases
  AnnotationPage: ['Annotation'],
  Choice: ['ContentResource', 'SpecificResource'] // For Choice resources
};

// ============================================================================
// Viewing Direction
// ============================================================================

export const VIEWING_DIRECTIONS: ViewingDirection[] = [
  'left-to-right',
  'right-to-left',
  'top-to-bottom',
  'bottom-to-top'
];

export const DEFAULT_VIEWING_DIRECTION: ViewingDirection = 'left-to-right';

// ============================================================================
// Time Mode
// ============================================================================

export const TIME_MODES: TimeMode[] = ['trim', 'scale', 'loop'];
export const DEFAULT_TIME_MODE: TimeMode = 'trim';

// ============================================================================
// Motivation Values
// ============================================================================

export const MOTIVATIONS: Motivation[] = ['painting', 'supplementing'];
export const DEFAULT_MOTIVATION: Motivation = 'painting';

// ============================================================================
// Behavior Validity Rules (Corrected from specification Section 3.2)
// ============================================================================

interface BehaviorValidity {
  allowed: Behavior[];
  notAllowed: Behavior[];
}

export const BEHAVIOR_VALIDITY: Record<string, BehaviorValidity> = {
  Collection: {
    allowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'multi-part',
      'together'
    ],
    notAllowed: [
      'facing-pages',
      'non-paged',
      'no-nav',
      'sequence',
      'thumbnail-nav',
      'hidden' // hidden is only for annotation-related resources
    ]
  },
  Manifest: {
    allowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'unordered',
      'individuals',
      'continuous',
      'paged'
    ],
    notAllowed: [
      'facing-pages',
      'non-paged',
      'multi-part',
      'together',
      'no-nav',
      'sequence',
      'thumbnail-nav',
      'hidden'
    ]
  },
  Canvas: {
    allowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'facing-pages',
      'non-paged'
    ],
    notAllowed: [
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'multi-part',
      'together',
      'no-nav',
      'sequence',
      'thumbnail-nav',
      'hidden'
    ]
  },
  Range: {
    allowed: [
      'auto-advance',
      'no-auto-advance',
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'sequence',
      'thumbnail-nav',
      'no-nav'
    ],
    notAllowed: [
      'facing-pages',
      'non-paged',
      'multi-part',
      'together',
      'repeat', // repeat is only for Collections and Manifests
      'no-repeat', // no-repeat is only for Collections and Manifests
      'hidden'
    ]
  },
  AnnotationPage: {
    allowed: ['hidden'],
    notAllowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'facing-pages',
      'non-paged',
      'multi-part',
      'together',
      'no-nav',
      'sequence',
      'thumbnail-nav'
    ]
  },
  AnnotationCollection: {
    allowed: ['hidden'],
    notAllowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'facing-pages',
      'non-paged',
      'multi-part',
      'together',
      'no-nav',
      'sequence',
      'thumbnail-nav'
    ]
  },
  Annotation: {
    allowed: ['hidden'],
    notAllowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'facing-pages',
      'non-paged',
      'multi-part',
      'together',
      'no-nav',
      'sequence',
      'thumbnail-nav'
    ]
  },
  SpecificResource: {
    allowed: ['hidden'],
    notAllowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'facing-pages',
      'non-paged',
      'multi-part',
      'together',
      'no-nav',
      'sequence',
      'thumbnail-nav'
    ]
  },
  Choice: {
    allowed: ['hidden'],
    notAllowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'facing-pages',
      'non-paged',
      'multi-part',
      'together',
      'no-nav',
      'sequence',
      'thumbnail-nav'
    ]
  },
  ContentResource: {
    allowed: [],
    notAllowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'facing-pages',
      'non-paged',
      'multi-part',
      'together',
      'no-nav',
      'sequence',
      'thumbnail-nav',
      'hidden'
    ]
  },
  Agent: {
    allowed: [],
    notAllowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'facing-pages',
      'non-paged',
      'multi-part',
      'together',
      'no-nav',
      'sequence',
      'thumbnail-nav',
      'hidden'
    ]
  },
  TextualBody: {
    allowed: [],
    notAllowed: [
      'auto-advance',
      'no-auto-advance',
      'repeat',
      'no-repeat',
      'unordered',
      'individuals',
      'continuous',
      'paged',
      'facing-pages',
      'non-paged',
      'multi-part',
      'together',
      'no-nav',
      'sequence',
      'thumbnail-nav',
      'hidden'
    ]
  }
};

// ============================================================================
// Content Resource Types
// ============================================================================

export const CONTENT_RESOURCE_TYPES: ContentResourceType[] = [
  'Dataset',
  'Image',
  'Model',
  'Sound',
  'Text',
  'Video'
];

// ============================================================================
// Legacy Schema Interface (for backwards compatibility)
// ============================================================================

export interface ResourceSchema {
  required: string[];
  recommended: string[];
  optional: string[];
  notAllowed: string[];
  behaviorAllowed: string[];
  behaviorNotAllowed: string[];
}

/**
 * Build legacy schema from property matrix
 */
function buildResourceSchema(resourceType: IIIFResourceType): ResourceSchema {
  const schema: ResourceSchema = {
    required: [],
    recommended: [],
    optional: [],
    notAllowed: [],
    behaviorAllowed: [],
    behaviorNotAllowed: []
  };

  for (const [property, requirements] of Object.entries(PROPERTY_MATRIX)) {
    const req = requirements[resourceType];
    switch (req) {
      case 'REQUIRED':
        schema.required.push(property);
        break;
      case 'RECOMMENDED':
        schema.recommended.push(property);
        break;
      case 'OPTIONAL':
      case 'CONDITIONAL':
        schema.optional.push(property);
        break;
      case 'NOT_ALLOWED':
        schema.notAllowed.push(property);
        break;
    }
  }

  // Add behavior rules
  const behaviorRules = BEHAVIOR_VALIDITY[resourceType];
  if (behaviorRules) {
    schema.behaviorAllowed = behaviorRules.allowed;
    schema.behaviorNotAllowed = behaviorRules.notAllowed;
  }

  return schema;
}

// ============================================================================
// Build IIIF_SCHEMA for backwards compatibility
// ============================================================================

export const IIIF_SCHEMA: Record<string, ResourceSchema> = {
  Collection: buildResourceSchema('Collection'),
  Manifest: buildResourceSchema('Manifest'),
  Canvas: buildResourceSchema('Canvas'),
  Range: buildResourceSchema('Range'),
  AnnotationPage: buildResourceSchema('AnnotationPage'),
  AnnotationCollection: buildResourceSchema('AnnotationCollection'),
  Annotation: buildResourceSchema('Annotation'),
  ContentResource: buildResourceSchema('ContentResource'),
  Agent: buildResourceSchema('Agent'),
  SpecificResource: buildResourceSchema('SpecificResource'),
  Choice: buildResourceSchema('Choice'),
  TextualBody: buildResourceSchema('TextualBody')
};

// ============================================================================
// Property Requirement Functions
// ============================================================================

/**
 * Normalize resource type to handle content types and Web Annotation types
 */
export function normalizeResourceType(resourceType: string): IIIFResourceType {
  // Content resource types
  if (CONTENT_RESOURCE_TYPES.includes(resourceType as ContentResourceType)) {
    return 'ContentResource';
  }
  
  // Web Annotation types
  if (resourceType === 'SpecificResource' || resourceType === 'Choice' || resourceType === 'TextualBody') {
    return resourceType as IIIFResourceType;
  }
  
  // IIIF resource types
  return resourceType as IIIFResourceType;
}

/**
 * Get the requirement status for a specific property on a resource type
 */
export function getPropertyRequirement(resourceType: string, property: string): PropertyRequirement {
  const type = normalizeResourceType(resourceType);
  const propertyDef = PROPERTY_MATRIX[property];

  if (!propertyDef) {
    return 'NOT_ALLOWED';
  }

  return propertyDef[type] || 'NOT_ALLOWED';
}

/**
 * Check if a property is allowed on a resource type
 */
export function isPropertyAllowed(resourceType: string, property: string): boolean {
  const req = getPropertyRequirement(resourceType, property);
  return req !== 'NOT_ALLOWED';
}

/**
 * Get all allowed properties for a resource type
 */
export function getAllowedProperties(resourceType: string): string[] {
  const type = normalizeResourceType(resourceType);
  const allowed: string[] = [];

  for (const [property, requirements] of Object.entries(PROPERTY_MATRIX)) {
    if (requirements[type] !== 'NOT_ALLOWED') {
      allowed.push(property);
    }
  }

  return allowed;
}

/**
 * Get required properties for a resource type
 */
export function getRequiredProperties(resourceType: string): string[] {
  const type = normalizeResourceType(resourceType);
  const required: string[] = [];

  for (const [property, requirements] of Object.entries(PROPERTY_MATRIX)) {
    if (requirements[type] === 'REQUIRED') {
      required.push(property);
    }
  }

  return required;
}

/**
 * Get recommended properties for a resource type
 */
export function getRecommendedProperties(resourceType: string): string[] {
  const type = normalizeResourceType(resourceType);
  const recommended: string[] = [];

  for (const [property, requirements] of Object.entries(PROPERTY_MATRIX)) {
    if (requirements[type] === 'RECOMMENDED') {
      recommended.push(property);
    }
  }

  return recommended;
}

// ============================================================================
// Behavior Validation Functions
// ============================================================================

/**
 * Check if a behavior value is allowed for a resource type
 */
export function isBehaviorAllowed(resourceType: string, behavior: string): boolean {
  const type = normalizeResourceType(resourceType);
  const rules = BEHAVIOR_VALIDITY[type];

  if (!rules) return false;

  // Explicitly not allowed
  if (rules.notAllowed.includes(behavior as Behavior)) return false;

  // Check if in allowed list
  return rules.allowed.includes(behavior as Behavior);
}

/**
 * Get all allowed behaviors for a resource type
 */
export function getAllowedBehaviors(resourceType: string): string[] {
  const type = normalizeResourceType(resourceType);
  return BEHAVIOR_VALIDITY[type]?.allowed || [];
}

/**
 * Get not allowed behaviors for a resource type
 */
export function getNotAllowedBehaviors(resourceType: string): string[] {
  const type = normalizeResourceType(resourceType);
  return BEHAVIOR_VALIDITY[type]?.notAllowed || [];
}

// ============================================================================
// Viewing Direction Validation
// ============================================================================

/**
 * Check if viewing direction is valid
 */
export function isValidViewingDirection(direction: string): direction is ViewingDirection {
  return VIEWING_DIRECTIONS.includes(direction as ViewingDirection);
}

/**
 * Check if resource type can have viewing direction
 */
export function canHaveViewingDirection(resourceType: string): boolean {
  return getPropertyRequirement(resourceType, 'viewingDirection') !== 'NOT_ALLOWED';
}

// ============================================================================
// Time Mode Validation
// ============================================================================

/**
 * Check if time mode value is valid
 */
export function isValidTimeMode(mode: string): mode is TimeMode {
  return TIME_MODES.includes(mode as TimeMode);
}

// ============================================================================
// Motivation Validation
// ============================================================================

/**
 * Check if motivation value is valid
 */
export function isValidMotivation(motivation: string): motivation is Motivation {
  return MOTIVATIONS.includes(motivation as Motivation);
}

// ============================================================================
// Items Containment Validation
// ============================================================================

/**
 * Get valid child types for a parent type's items array
 */
export function getValidItemTypes(parentType: string): string[] {
  return ITEMS_CONTAINMENT[parentType] || [];
}

/**
 * Check if a child type can be in a parent type's items array
 */
export function isValidItemType(parentType: string, childType: string): boolean {
  const validTypes = ITEMS_CONTAINMENT[parentType];
  return validTypes?.includes(childType) || false;
}

// ============================================================================
// Conditional Requirements
// ============================================================================

export interface ConditionalRequirement {
  property: string;
  condition: (resource: any) => boolean;
  message: string;
  type: 'error' | 'warning';
}

/**
 * Conditional requirements from specification
 */
export const CONDITIONAL_REQUIREMENTS: Record<string, ConditionalRequirement[]> = {
  Canvas: [
    {
      property: 'height',
      condition: (canvas) => ('width' in canvas && canvas.width !== undefined && canvas.width !== null) && 
                           !('height' in canvas && canvas.height !== undefined && canvas.height !== null),
      message: 'Canvas must have height if width is present',
      type: 'error'
    },
    {
      property: 'width',
      condition: (canvas) => ('height' in canvas && canvas.height !== undefined && canvas.height !== null) && 
                           !('width' in canvas && canvas.width !== undefined && canvas.width !== null),
      message: 'Canvas must have width if height is present',
      type: 'error'
    }
  ],
  Agent: [
    {
      property: 'homepage',
      condition: (agent) => agent.type === 'Agent' && !('homepage' in agent && agent.homepage !== undefined),
      message: 'Agent should have homepage property',
      type: 'warning'
    },
    {
      property: 'logo',
      condition: (agent) => agent.type === 'Agent' && !('logo' in agent && agent.logo !== undefined),
      message: 'Agent should have logo property',
      type: 'warning'
    }
  ],
  ContentResource: [
    {
      property: 'format',
      condition: (resource) => ['Image', 'Video', 'Sound', 'Text', 'Dataset'].includes(resource.type) && 
                              !('format' in resource && resource.format !== undefined),
      message: 'Content resource should have format property',
      type: 'warning'
    }
  ]
};

/**
 * Check conditional requirements for a resource
 */
export function checkConditionalRequirements(resource: IIIFItem): {errors: string[], warnings: string[]} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const type = normalizeResourceType(resource.type);
  const requirements = CONDITIONAL_REQUIREMENTS[type] || [];

  for (const req of requirements) {
    if (req.condition(resource)) {
      if (req.type === 'error') {
        errors.push(req.message);
      } else {
        warnings.push(req.message);
      }
    }
  }

  // Additional conditional checks based on property combinations
  if (type === 'Canvas') {
    const canvas = resource as any;
    if (canvas.duration && (!canvas.height || !canvas.width)) {
      warnings.push('Canvas with duration should also have height and width for proper rendering');
    }
  }

  return { errors, warnings };
}

// ============================================================================
// Content Resource Type Validation
// ============================================================================

/**
 * Check if a type is a valid content resource type
 */
export function isValidContentResourceType(type: string): boolean {
  return CONTENT_RESOURCE_TYPES.includes(type as ContentResourceType);
}

/**
 * Get content resource type recommendations
 */
export function getContentResourceRecommendations(type: string): string[] {
  const recommendations: string[] = [];
  
  if (type === 'Image' || type === 'Video') {
    recommendations.push('height', 'width');
  }
  
  if (type === 'Video' || type === 'Sound') {
    recommendations.push('duration');
  }
  
  if (type === 'Text') {
    recommendations.push('language');
  }
  
  if (type === 'Image') {
    recommendations.push('service'); // IIIF Image API service
  }
  
  return recommendations;
}

// ============================================================================
// Complete Resource Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a resource against the complete IIIF 3.0 schema
 * Returns a list of error messages (empty if valid)
 */
export function validateResource(resource: IIIFItem): string[] {
  const errors: string[] = [];
  const type = normalizeResourceType(resource.type);

  // Check required fields
  const required = getRequiredProperties(type);
  for (const field of required) {
    if (!(field in resource) || (resource as any)[field] === undefined || (resource as any)[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check not allowed fields
  for (const [property, requirements] of Object.entries(PROPERTY_MATRIX)) {
    if (requirements[type] === 'NOT_ALLOWED') {
      if (property in resource && (resource as any)[property] !== undefined) {
        errors.push(`Field not allowed on ${type}: ${property}`);
      }
    }
  }

  // Check behavior values
  if (resource.behavior) {
    const behaviors = Array.isArray(resource.behavior) ? resource.behavior : [resource.behavior];
    for (const b of behaviors) {
      if (!isBehaviorAllowed(type, b)) {
        errors.push(`Behavior not allowed on ${type}: ${b}`);
      }
    }
  }

  // Check viewing direction
  if ((resource as any).viewingDirection) {
    if (!canHaveViewingDirection(type)) {
      errors.push(`viewingDirection not allowed on ${type}`);
    } else if (!isValidViewingDirection((resource as any).viewingDirection)) {
      errors.push(`Invalid viewingDirection: ${(resource as any).viewingDirection}`);
    }
  }

  // Check time mode (Annotation only)
  if ((resource as any).timeMode) {
    if (type !== 'Annotation') {
      errors.push(`timeMode not allowed on ${type}`);
    } else if (!isValidTimeMode((resource as any).timeMode)) {
      errors.push(`Invalid timeMode: ${(resource as any).timeMode}`);
    }
  }

  // Check motivation (Annotation only)
  if ((resource as any).motivation) {
    if (type !== 'Annotation') {
      errors.push(`motivation not allowed on ${type}`);
    } else if (!isValidMotivation((resource as any).motivation)) {
      errors.push(`Invalid motivation: ${(resource as any).motivation}. Must be 'painting' or 'supplementing'`);
    }
  }

  // Check conditional requirements
  const conditional = checkConditionalRequirements(resource);
  errors.push(...conditional.errors);

  // Validate ID format (must be HTTP(S) URI for IIIF resources)
  if (resource.id && !resource.id.startsWith('http://') && !resource.id.startsWith('https://')) {
    if (['Collection', 'Manifest', 'Canvas', 'Range', 'AnnotationPage', 'AnnotationCollection', 'Annotation'].includes(type)) {
      errors.push('ID must be a valid HTTP(S) URI for IIIF resources');
    }
  }

  // Canvas-specific: Canvas ID must not contain fragment identifier
  if (type === 'Canvas' && resource.id?.includes('#')) {
    errors.push('Canvas ID must not contain a fragment identifier');
  }

  // Check items array if present
  if ('items' in resource && resource.items !== undefined) {
    const {items} = resource;
    if (!Array.isArray(items)) {
      errors.push('items must be an array');
    } else if (items.length === 0) {
      if (getPropertyRequirement(type, 'items') === 'REQUIRED') {
        errors.push(`${type} must have at least one item in 'items' array`);
      }
    } else {
      // Validate each item's type if possible
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type && !isValidItemType(type, item.type)) {
          errors.push(`Item at index ${i} has invalid type '${item.type}' for parent type '${type}'`);
        }
      }
    }
  }

  // Check metadata format if present
  if ((resource as any).metadata && Array.isArray((resource as any).metadata)) {
    const metadata = (resource as any).metadata as MetadataEntry[];
    for (let i = 0; i < metadata.length; i++) {
      const entry = metadata[i];
      if (!entry.label || !entry.value) {
        errors.push(`Metadata entry at index ${i} must have both label and value`);
      }
    }
  }

  // Check language map format for label, summary, metadata, requiredStatement
  const languageMapFields = ['label', 'summary', 'requiredStatement'];
  for (const field of languageMapFields) {
    if ((resource as any)[field]) {
      const value = (resource as any)[field];
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${field} must be a language map object`);
      }
    }
  }

  return errors;
}

/**
 * Comprehensive validation with errors and warnings
 */
export function validateResourceFull(resource: IIIFItem): ValidationResult {
  const errors = validateResource(resource);
  const warnings: string[] = [];
  const type = normalizeResourceType(resource.type);

  // Check recommended fields for warnings
  const recommended = getRecommendedProperties(type);
  for (const field of recommended) {
    if (!(field in resource) || (resource as any)[field] === undefined || (resource as any)[field] === null) {
      warnings.push(`Missing recommended field: ${field}`);
    }
  }

  // Check conditional warnings
  const conditional = checkConditionalRequirements(resource);
  warnings.push(...conditional.warnings);

  // Check for content resource specific recommendations
  if (type === 'ContentResource') {
    const contentRecs = getContentResourceRecommendations(resource.type);
    for (const field of contentRecs) {
      if (!(field in resource) || (resource as any)[field] === undefined) {
        warnings.push(`Content resource of type ${resource.type} should have ${field} property`);
      }
    }
  }

  // Check for empty but required arrays
  if ('items' in resource && resource.items && Array.isArray(resource.items) && resource.items.length === 0) {
    if (getPropertyRequirement(type, 'items') === 'REQUIRED') {
      // Already covered by errors
    } else if (getPropertyRequirement(type, 'items') === 'RECOMMENDED') {
      warnings.push(`${type} has empty 'items' array (recommended to have items)`);
    }
  }

  // Validate context for top-level resources
  if (['Collection', 'Manifest'].includes(type) && !(resource as any)['@context']) {
    errors.push('Top-level resource must have @context property');
  } else if ((resource as any)['@context'] && !['Collection', 'Manifest'].includes(type)) {
    warnings.push('@context should only be on top-level resources (Collection, Manifest)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// Minimum Viable Resource Templates
// ============================================================================

export interface MinimumResourceTemplate {
  "@context"?: string;
  id: string;
  type: string;
  [key: string]: any;
}

/**
 * Get minimum viable resource template
 */
export function getMinimumTemplate(resourceType: string, id: string, label?: LanguageMap): MinimumResourceTemplate {
  const base: MinimumResourceTemplate = {
    id,
    type: resourceType
  };

  switch (resourceType) {
    case 'Collection':
      return {
        "@context": IIIF_SPEC.PRESENTATION_3.CONTEXT,
        ...base,
        label: label || { none: ['Untitled Collection'] },
        items: []
      };
    case 'Manifest':
      return {
        "@context": IIIF_SPEC.PRESENTATION_3.CONTEXT,
        ...base,
        label: label || { none: ['Untitled Manifest'] },
        items: []
      };
    case 'Canvas':
      return {
        ...base,
        label: label || { none: ['Untitled Canvas'] },
        height: 1000,
        width: 800,
        items: []
      };
    case 'Range':
      return {
        ...base,
        label: label || { none: ['Untitled Range'] },
        items: []
      };
    case 'AnnotationPage':
      return {
        ...base,
        items: []
      };
    case 'Annotation':
      return {
        ...base,
        motivation: 'painting',
        body: {
          id: '',
          type: 'ContentResource'
        },
        target: ''
      };
    case 'AnnotationCollection':
      return {
        ...base,
        label: label || { none: ['Untitled Annotation Collection'] }
      };
    case 'Agent':
      return {
        ...base,
        label: label || { none: ['Untitled Agent'] }
      };
    case 'SpecificResource':
      return {
        ...base,
        source: ''
      };
    case 'Choice':
      return {
        ...base,
        items: []
      };
    case 'TextualBody':
      return {
        ...base,
        value: '',
        language: 'none'
      };
    case 'ContentResource':
      return {
        ...base,
        label: label || { none: ['Untitled Content Resource'] }
      };
    default:
      return base;
  }
}

// ============================================================================
// Helper Functions for Common Operations
// ============================================================================

/**
 * Create a language map for a property
 */
export function createLanguageMap(value: string, language: string = 'none'): LanguageMap {
  return { [language]: [value] };
}

/**
 * Create a metadata entry
 */
export function createMetadataEntry(label: string, value: string, labelLang: string = 'none', valueLang: string = 'none'): MetadataEntry {
  return {
    label: createLanguageMap(label, labelLang),
    value: createLanguageMap(value, valueLang)
  };
}

/**
 * Check if a resource needs @context (top-level resources)
 */
export function needsContext(resourceType: string): boolean {
  return ['Collection', 'Manifest'].includes(resourceType);
}

/**
 * Get the default context URI
 */
export function getDefaultContext(): string {
  return IIIF_SPEC.PRESENTATION_3.CONTEXT;
}

/**
 * Generate a default label based on resource type and index
 */
export function generateDefaultLabel(resourceType: string, index?: number): LanguageMap {
  const baseLabel = `Untitled ${resourceType}`;
  const label = index !== undefined ? `${baseLabel} ${index + 1}` : baseLabel;
  return createLanguageMap(label);
}

// ============================================================================
// Rights Statements and Licenses
// ============================================================================

export const COMMON_RIGHTS_URIS = {
  'CC BY 4.0': 'http://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 4.0': 'http://creativecommons.org/licenses/by-sa/4.0/',
  'CC BY-NC 4.0': 'http://creativecommons.org/licenses/by-nc/4.0/',
  'CC BY-ND 4.0': 'http://creativecommons.org/licenses/by-nd/4.0/',
  'CC BY-NC-SA 4.0': 'http://creativecommons.org/licenses/by-nc-sa/4.0/',
  'CC BY-NC-ND 4.0': 'http://creativecommons.org/licenses/by-nc-nd/4.0/',
  'CC0 1.0': 'http://creativecommons.org/publicdomain/zero/1.0/',
  'Public Domain Mark': 'http://creativecommons.org/publicdomain/mark/1.0/',
  'In Copyright': 'http://rightsstatements.org/vocab/InC/1.0/',
  'In Copyright - Educational Use Permitted': 'http://rightsstatements.org/vocab/InC-EDU/1.0/',
  'In Copyright - EU Orphan Work': 'http://rightsstatements.org/vocab/InC-OW-EU/1.0/',
  'No Copyright - Non-Commercial Use Only': 'http://rightsstatements.org/vocab/NoC-NC/1.0/',
  'No Copyright - Other Known Legal Restrictions': 'http://rightsstatements.org/vocab/NoC-OKLR/1.0/',
  'No Copyright - United States': 'http://rightsstatements.org/vocab/NoC-US/1.0/',
  'Copyright Not Evaluated': 'http://rightsstatements.org/vocab/CNE/1.0/',
  'Copyright Undetermined': 'http://rightsstatements.org/vocab/UND/1.0/'
};

/**
 * Check if a URI is a valid rights statement
 */
export function isValidRightsUri(uri: string): boolean {
  return Object.values(COMMON_RIGHTS_URIS).includes(uri);
}

/**
 * Get the display name for a rights URI
 */
export function getRightsDisplayName(uri: string): string {
  for (const [name, rightsUri] of Object.entries(COMMON_RIGHTS_URIS)) {
    if (rightsUri === uri) {
      return name;
    }
  }
  return uri;
}

// ============================================================================
// Export everything
// ============================================================================

export default {
  PROPERTY_MATRIX,
  ITEMS_CONTAINMENT,
  VIEWING_DIRECTIONS,
  DEFAULT_VIEWING_DIRECTION,
  TIME_MODES,
  DEFAULT_TIME_MODE,
  MOTIVATIONS,
  DEFAULT_MOTIVATION,
  BEHAVIOR_VALIDITY,
  CONTENT_RESOURCE_TYPES,
  IIIF_SCHEMA,
  
  // Functions
  normalizeResourceType,
  getPropertyRequirement,
  isPropertyAllowed,
  getAllowedProperties,
  getRequiredProperties,
  getRecommendedProperties,
  isBehaviorAllowed,
  getAllowedBehaviors,
  getNotAllowedBehaviors,
  isValidViewingDirection,
  canHaveViewingDirection,
  isValidTimeMode,
  isValidMotivation,
  getValidItemTypes,
  isValidItemType,
  checkConditionalRequirements,
  isValidContentResourceType,
  getContentResourceRecommendations,
  validateResource,
  validateResourceFull,
  getMinimumTemplate,
  
  // Helper functions
  createLanguageMap,
  createMetadataEntry,
  needsContext,
  getDefaultContext,
  generateDefaultLabel,
  
  // Rights
  COMMON_RIGHTS_URIS,
  isValidRightsUri,
  getRightsDisplayName
};