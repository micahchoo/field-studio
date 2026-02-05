/**
 * IIIF Presentation API 3.0 Schema Definitions
 * Organism - depends on atoms/validation
 */

import type {
  ValidationRequirement,
  IIIFValidationResult,
} from '../../atoms/validation';
import type {
  IIIFResourceType,
  ViewingDirection,
  TimeMode,
  IIIFBehavior,
  ContentResourceType,
} from './types';

// Re-export for convenience
export type { ValidationRequirement, IIIFValidationResult };

// ============================================================================
// Content Resource Types List
// ============================================================================

export const CONTENT_RESOURCE_LIST: ContentResourceType[] = [
  'Dataset',
  'Image',
  'Model',
  'Sound',
  'Text',
  'Video',
];

// ============================================================================
// Viewing Direction
// ============================================================================

export const VIEWING_DIRECTIONS: ViewingDirection[] = [
  'left-to-right',
  'right-to-left',
  'top-to-bottom',
  'bottom-to-top',
];

export const DEFAULT_VIEWING_DIRECTION: ViewingDirection = 'left-to-right';

export function isValidViewingDirection(
  direction: string
): direction is ViewingDirection {
  return VIEWING_DIRECTIONS.includes(direction as ViewingDirection);
}

export function canHaveViewingDirection(type: string): boolean {
  return ['Collection', 'Manifest', 'Range'].includes(type);
}

// ============================================================================
// Time Mode
// ============================================================================

export const TIME_MODES: TimeMode[] = ['trim', 'scale', 'loop'];
export const DEFAULT_TIME_MODE: TimeMode = 'trim';

export function isValidTimeMode(mode: string): mode is TimeMode {
  return TIME_MODES.includes(mode as TimeMode);
}

// ============================================================================
// Property Matrix
// ============================================================================

export const PROPERTY_MATRIX: Record<
  string,
  Record<IIIFResourceType, ValidationRequirement>
> = {
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
    TextualBody: 'OPTIONAL',
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'OPTIONAL',
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
    TextualBody: 'OPTIONAL',
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
    TextualBody: 'OPTIONAL',
  },
  height: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'CONDITIONAL',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED',
  },
  width: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'CONDITIONAL',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED',
  },
  duration: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'OPTIONAL',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    Choice: 'OPTIONAL',
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
  },
  // Linking Properties
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
  },
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
  },
  // Body and Target for Annotations
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
    TextualBody: 'NOT_ALLOWED',
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
    TextualBody: 'NOT_ALLOWED',
  },
  // JSON-LD
  '@context': {
    Collection: 'REQUIRED',
    Manifest: 'REQUIRED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED',
    Agent: 'NOT_ALLOWED',
    SpecificResource: 'NOT_ALLOWED',
    Choice: 'NOT_ALLOWED',
    TextualBody: 'NOT_ALLOWED',
  },
};

// ============================================================================
// Property Validation Functions
// ============================================================================

export function getPropertyRequirement(
  property: string,
  resourceType: IIIFResourceType
): ValidationRequirement {
  return PROPERTY_MATRIX[property]?.[resourceType] || 'OPTIONAL';
}

export function isPropertyAllowed(
  property: string,
  resourceType: IIIFResourceType
): boolean {
  const req = getPropertyRequirement(property, resourceType);
  return req !== 'NOT_ALLOWED';
}

export function getAllowedProperties(
  resourceType: IIIFResourceType
): string[] {
  return Object.entries(PROPERTY_MATRIX)
    .filter(([, types]) => types[resourceType] !== 'NOT_ALLOWED')
    .map(([prop]) => prop);
}

export function getRequiredProperties(
  resourceType: IIIFResourceType
): string[] {
  return Object.entries(PROPERTY_MATRIX)
    .filter(([, types]) => types[resourceType] === 'REQUIRED')
    .map(([prop]) => prop);
}

export function getRecommendedProperties(
  resourceType: IIIFResourceType
): string[] {
  return Object.entries(PROPERTY_MATRIX)
    .filter(([, types]) => types[resourceType] === 'RECOMMENDED')
    .map(([prop]) => prop);
}

// ============================================================================
// Resource Validation
// ============================================================================

export function validateResource(resource: {
  type: string;
  id?: string;
  [key: string]: unknown;
}): string[] {
  const errors: string[] = [];
  const resourceType = resource.type as IIIFResourceType;

  if (!resourceType) {
    errors.push('Resource must have a type');
    return errors;
  }

  // Check required properties
  const required = getRequiredProperties(resourceType);
  for (const prop of required) {
    if (!(prop in resource) || resource[prop] === undefined) {
      errors.push(`Required property '${prop}' is missing`);
    }
  }

  // Check for properties that are not allowed
  for (const prop of Object.keys(resource)) {
    const req = getPropertyRequirement(prop, resourceType);
    if (req === 'NOT_ALLOWED') {
      errors.push(`Property '${prop}' is not allowed on ${resourceType}`);
    }
  }

  return errors;
}

export function validateResourceFull(resource: {
  type: string;
  id?: string;
  [key: string]: unknown;
}): IIIFValidationResult {
  const errors = validateResource(resource);
  const warnings: string[] = [];

  const resourceType = resource.type as IIIFResourceType;

  // Check recommended properties
  const recommended = getRecommendedProperties(resourceType);
  for (const prop of recommended) {
    if (!(prop in resource) || resource[prop] === undefined) {
      warnings.push(`Recommended property '${prop}' is missing`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Items Containment Rules
// ============================================================================

export const ITEMS_CONTAINMENT: Record<string, string[]> = {
  Collection: ['Collection', 'Manifest'],
  Manifest: ['Canvas'],
  Canvas: ['AnnotationPage'],
  Range: ['Range', 'Canvas', 'SpecificResource'],
  AnnotationPage: ['Annotation'],
  Choice: ['ContentResource', 'SpecificResource'],
};

export function getValidItemTypes(parentType: string): string[] {
  return ITEMS_CONTAINMENT[parentType] || [];
}

export function isValidItemType(
  parentType: string,
  childType: string
): boolean {
  const valid = getValidItemTypes(parentType);
  return valid.includes(childType);
}
