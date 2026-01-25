/**
 * IIIF Presentation API 3.0 Schema Definitions
 *
 * Complete property requirements as defined in the IIIF Presentation API 3.0 specification.
 * This module serves as the single source of truth for validation, UI generation, and ingest logic.
 *
 * @see https://iiif.io/api/presentation/3.0/
 */

import { IIIFItem } from '../types';

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
  | 'ContentResource';

export type ContentResourceType = 'Image' | 'Video' | 'Sound' | 'Text' | 'Dataset' | 'Model';

export type ViewingDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';

export type TimeMode = 'trim' | 'scale' | 'loop';

// ============================================================================
// Complete Property Matrix
// ============================================================================

/**
 * Complete property requirements matrix from IIIF Presentation API 3.0
 * Each property maps to its requirement level for each resource type
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
    ContentResource: 'OPTIONAL'
  },
  metadata: {
    Collection: 'RECOMMENDED',
    Manifest: 'RECOMMENDED',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL'
  },
  summary: {
    Collection: 'RECOMMENDED',
    Manifest: 'RECOMMENDED',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL'
  },
  requiredStatement: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'NOT_ALLOWED'
  },
  rights: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED'
  },
  provider: {
    Collection: 'RECOMMENDED',
    Manifest: 'RECOMMENDED',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL'
  },
  thumbnail: {
    Collection: 'RECOMMENDED',
    Manifest: 'RECOMMENDED',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL'
  },
  navDate: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED'
  },
  placeholderCanvas: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED'
  },
  accompanyingCanvas: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED'
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
    ContentResource: 'REQUIRED'
  },
  type: {
    Collection: 'REQUIRED',
    Manifest: 'REQUIRED',
    Canvas: 'REQUIRED',
    Range: 'REQUIRED',
    AnnotationPage: 'REQUIRED',
    AnnotationCollection: 'REQUIRED',
    Annotation: 'REQUIRED',
    ContentResource: 'REQUIRED'
  },
  format: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED'
  },
  profile: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'OPTIONAL'
  },
  height: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'CONDITIONAL',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED'
  },
  width: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'CONDITIONAL',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED'
  },
  duration: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'OPTIONAL',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED'
  },
  language: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'RECOMMENDED'
  },
  viewingDirection: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'NOT_ALLOWED',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED'
  },
  behavior: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'NOT_ALLOWED'
  },
  timeMode: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'OPTIONAL',
    ContentResource: 'NOT_ALLOWED'
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
    ContentResource: 'OPTIONAL'
  },
  rendering: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL'
  },
  service: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL'
  },
  services: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED'
  },
  seeAlso: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'OPTIONAL',
    AnnotationCollection: 'OPTIONAL',
    Annotation: 'OPTIONAL',
    ContentResource: 'OPTIONAL'
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
    ContentResource: 'OPTIONAL'
  },
  start: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'OPTIONAL',
    Canvas: 'NOT_ALLOWED',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED'
  },
  supplementary: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'NOT_ALLOWED',
    Canvas: 'NOT_ALLOWED',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED'
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
    ContentResource: 'NOT_ALLOWED'
  },
  structures: {
    Collection: 'NOT_ALLOWED',
    Manifest: 'OPTIONAL',
    Canvas: 'NOT_ALLOWED',
    Range: 'NOT_ALLOWED',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'NOT_ALLOWED'
  },
  annotations: {
    Collection: 'OPTIONAL',
    Manifest: 'OPTIONAL',
    Canvas: 'OPTIONAL',
    Range: 'OPTIONAL',
    AnnotationPage: 'NOT_ALLOWED',
    AnnotationCollection: 'NOT_ALLOWED',
    Annotation: 'NOT_ALLOWED',
    ContentResource: 'OPTIONAL'
  }
};

// ============================================================================
// Items Containment Rules
// ============================================================================

/**
 * Defines what resource types can be contained in the 'items' property
 */
export const ITEMS_CONTAINMENT: Record<string, string[]> = {
  Collection: ['Collection', 'Manifest'],
  Manifest: ['Canvas'],
  Canvas: ['AnnotationPage'],
  Range: ['Range', 'Canvas', 'SpecificResource'],
  AnnotationPage: ['Annotation']
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
// Legacy Schema Interface (for backwards compatibility)
// ============================================================================

export interface ResourceSchema {
  required: string[];
  recommended: string[];
  optional: string[];
  notAllowed: string[];
  behaviorAllowed?: string[];
  behaviorNotAllowed?: string[];
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

  // Import behavior rules from iiifBehaviors module if available
  // For now, inline the behavior rules
  const behaviorRules = BEHAVIOR_VALIDITY[resourceType];
  if (behaviorRules) {
    schema.behaviorAllowed = behaviorRules.allowed;
    schema.behaviorNotAllowed = behaviorRules.notAllowed;
  }

  return schema;
}

// ============================================================================
// Behavior Validity Rules (inline for this module)
// ============================================================================

interface BehaviorValidity {
  allowed: string[];
  notAllowed: string[];
}

const BEHAVIOR_VALIDITY: Record<string, BehaviorValidity> = {
  Collection: {
    allowed: ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged', 'multi-part', 'together', 'hidden'],
    notAllowed: ['facing-pages', 'non-paged', 'no-nav', 'sequence', 'thumbnail-nav']
  },
  Manifest: {
    allowed: ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged', 'hidden'],
    notAllowed: ['facing-pages', 'non-paged', 'multi-part', 'together', 'no-nav', 'sequence', 'thumbnail-nav']
  },
  Canvas: {
    allowed: ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'facing-pages', 'non-paged', 'hidden'],
    notAllowed: ['unordered', 'individuals', 'continuous', 'paged', 'multi-part', 'together', 'no-nav', 'sequence', 'thumbnail-nav']
  },
  Range: {
    allowed: ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged', 'sequence', 'thumbnail-nav', 'no-nav', 'hidden'],
    notAllowed: ['facing-pages', 'non-paged', 'multi-part', 'together']
  },
  AnnotationPage: {
    allowed: ['hidden'],
    notAllowed: []
  },
  AnnotationCollection: {
    allowed: ['hidden'],
    notAllowed: []
  },
  Annotation: {
    allowed: ['hidden'],
    notAllowed: []
  },
  ContentResource: {
    allowed: [],
    notAllowed: ['auto-advance', 'no-auto-advance', 'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous', 'paged', 'facing-pages', 'non-paged', 'multi-part', 'together', 'no-nav', 'sequence', 'thumbnail-nav', 'hidden']
  }
};

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
  ContentResource: buildResourceSchema('ContentResource')
};

// ============================================================================
// Property Requirement Functions
// ============================================================================

/**
 * Normalize resource type to handle content types
 */
function normalizeResourceType(resourceType: string): IIIFResourceType {
  if (['Image', 'Video', 'Sound', 'Text', 'Dataset', 'Model'].includes(resourceType)) {
    return 'ContentResource';
  }
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
  if (rules.notAllowed.includes(behavior)) return false;

  // Check if in allowed list
  return rules.allowed.includes(behavior);
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
}

/**
 * Conditional requirements for Canvas
 */
export const CONDITIONAL_REQUIREMENTS: Record<string, ConditionalRequirement[]> = {
  Canvas: [
    {
      property: 'height',
      condition: (canvas) => 'width' in canvas && !('height' in canvas),
      message: 'Canvas must have height if width is present'
    },
    {
      property: 'width',
      condition: (canvas) => 'height' in canvas && !('width' in canvas),
      message: 'Canvas must have width if height is present'
    }
  ]
};

/**
 * Check conditional requirements for a resource
 */
export function checkConditionalRequirements(resource: IIIFItem): string[] {
  const errors: string[] = [];
  const requirements = CONDITIONAL_REQUIREMENTS[resource.type];

  if (requirements) {
    for (const req of requirements) {
      if (req.condition(resource)) {
        errors.push(req.message);
      }
    }
  }

  return errors;
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
    if (!(field in resource) || (resource as any)[field] === undefined) {
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
    for (const b of resource.behavior) {
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

  // Check conditional requirements
  errors.push(...checkConditionalRequirements(resource));

  // Validate ID format (must be HTTP(S) URI)
  if (resource.id && !resource.id.startsWith('http://') && !resource.id.startsWith('https://')) {
    errors.push('ID must be a valid HTTP(S) URI');
  }

  // Canvas-specific: Canvas ID must not contain fragment identifier
  if (type === 'Canvas' && resource.id?.includes('#')) {
    errors.push('Canvas ID must not contain a fragment identifier');
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
    if (!(field in resource) || (resource as any)[field] === undefined) {
      warnings.push(`Missing recommended field: ${field}`);
    }
  }

  // Check for empty items
  if ('items' in resource) {
    const items = (resource as any).items;
    if (!items || items.length === 0) {
      if (getPropertyRequirement(type, 'items') === 'REQUIRED') {
        errors.push(`${type} must have at least one item in 'items' array`);
      } else {
        warnings.push(`${type} has empty 'items' array`);
      }
    }
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
export function getMinimumTemplate(resourceType: string, id: string, label?: Record<string, string[]>): MinimumResourceTemplate {
  const base: MinimumResourceTemplate = {
    id,
    type: resourceType
  };

  switch (resourceType) {
    case 'Collection':
      return {
        "@context": "http://iiif.io/api/presentation/3/context.json",
        ...base,
        label: label || { none: ['Untitled Collection'] },
        items: []
      };
    case 'Manifest':
      return {
        "@context": "http://iiif.io/api/presentation/3/context.json",
        ...base,
        label: label || { none: ['Untitled Manifest'] },
        items: []
      };
    case 'Canvas':
      return {
        ...base,
        height: 1000,
        width: 800,
        items: []
      };
    case 'Range':
      return {
        ...base,
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
        body: null,
        target: ''
      };
    case 'AnnotationCollection':
      return {
        ...base
      };
    default:
      return base;
  }
}
