/**
 * IIIF Presentation API 3.0 Behavior Definitions
 *
 * Complete behavior validation including validity matrix, disjoint sets,
 * inheritance rules, and behavior descriptions.
 *
 * @see https://iiif.io/api/presentation/3.0/#behavior
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type IIIFBehavior =
  // Temporal behaviors
  | 'auto-advance'
  | 'no-auto-advance'
  | 'repeat'
  | 'no-repeat'
  // Layout behaviors
  | 'unordered'
  | 'individuals'
  | 'continuous'
  | 'paged'
  // Canvas-specific behaviors
  | 'facing-pages'
  | 'non-paged'
  // Collection-specific behaviors
  | 'multi-part'
  | 'together'
  // Range-specific behaviors
  | 'sequence'
  | 'thumbnail-nav'
  | 'no-nav'
  // Visibility behaviors
  | 'hidden';

export type BehaviorCategory =
  | 'temporal_advance'
  | 'temporal_repeat'
  | 'layout'
  | 'canvas_paging'
  | 'collection_presentation'
  | 'range_navigation'
  | 'visibility';

// ============================================================================
// Behavior Validity Matrix
// ============================================================================

/**
 * Complete behavior validity matrix from IIIF Presentation API 3.0
 */
export const BEHAVIOR_VALIDITY_MATRIX: Record<IIIFBehavior, string[]> = {
  // Temporal behaviors
  'auto-advance': ['Collection', 'Manifest', 'Canvas', 'Range'],
  'no-auto-advance': ['Collection', 'Manifest', 'Canvas', 'Range'],
  'repeat': ['Collection', 'Manifest'],
  'no-repeat': ['Collection', 'Manifest'],

  // Layout behaviors
  'unordered': ['Collection', 'Manifest', 'Range'],
  'individuals': ['Collection', 'Manifest', 'Range'],
  'continuous': ['Collection', 'Manifest', 'Range'],
  'paged': ['Collection', 'Manifest', 'Range'],

  // Canvas-specific behaviors
  'facing-pages': ['Canvas'],
  'non-paged': ['Canvas'],

  // Collection-specific behaviors
  'multi-part': ['Collection'],
  'together': ['Collection'],

  // Range-specific behaviors
  'sequence': ['Range'],
  'thumbnail-nav': ['Range'],
  'no-nav': ['Range'],

  // Visibility behaviors (valid on annotation-related types)
  'hidden': ['AnnotationCollection', 'AnnotationPage', 'Annotation', 'SpecificResource', 'Choice']
};

// ============================================================================
// Disjoint Sets (Mutually Exclusive Behaviors)
// ============================================================================

export interface DisjointSet {
  name: BehaviorCategory;
  values: IIIFBehavior[];
  default?: IIIFBehavior;
  notes?: string;
}

/**
 * Disjoint sets define mutually exclusive behaviors
 * Resources should not have more than one behavior from the same disjoint set
 */
export const DISJOINT_SETS: DisjointSet[] = [
  {
    name: 'temporal_advance',
    values: ['auto-advance', 'no-auto-advance'],
    default: 'no-auto-advance'
  },
  {
    name: 'temporal_repeat',
    values: ['repeat', 'no-repeat'],
    default: 'no-repeat'
  },
  {
    name: 'layout',
    values: ['unordered', 'individuals', 'continuous', 'paged'],
    default: 'individuals'
  },
  {
    name: 'canvas_paging',
    values: ['facing-pages', 'non-paged'],
    notes: 'Only meaningful when Manifest has paged behavior'
  },
  {
    name: 'collection_presentation',
    values: ['multi-part', 'together']
  },
  {
    name: 'range_navigation',
    values: ['sequence', 'thumbnail-nav', 'no-nav']
  }
];

// ============================================================================
// Behavior Inheritance Rules
// ============================================================================

export interface InheritanceRule {
  resource: string;
  inheritsFrom: string;
  inherits: boolean;
  notes?: string;
}

/**
 * Behavior inheritance rules from IIIF Presentation API 3.0
 */
export const INHERITANCE_RULES: InheritanceRule[] = [
  {
    resource: 'Collection',
    inheritsFrom: 'Collection',
    inherits: true,
    notes: 'Nested Collections inherit from parent Collection'
  },
  {
    resource: 'Manifest',
    inheritsFrom: 'Collection',
    inherits: false,
    notes: 'Manifests do NOT inherit from referencing Collection'
  },
  {
    resource: 'Canvas',
    inheritsFrom: 'Manifest',
    inherits: true,
    notes: 'Canvases inherit from their parent Manifest'
  },
  {
    resource: 'Canvas',
    inheritsFrom: 'Range',
    inherits: false,
    notes: 'Canvases do NOT inherit from referencing Range'
  },
  {
    resource: 'Range',
    inheritsFrom: 'Range',
    inherits: true,
    notes: 'Nested Ranges inherit from parent Range'
  },
  {
    resource: 'Range',
    inheritsFrom: 'Manifest',
    inherits: true,
    notes: 'Ranges inherit from their Manifest'
  }
];

// ============================================================================
// Behavior Descriptions
// ============================================================================

export interface BehaviorDescription {
  behavior: IIIFBehavior;
  category: BehaviorCategory;
  description: string;
  requires?: string;
  context?: string;
  default?: boolean;
  validOn: string[];
}

export const BEHAVIOR_DESCRIPTIONS: Record<IIIFBehavior, BehaviorDescription> = {
  // Temporal behaviors
  'auto-advance': {
    behavior: 'auto-advance',
    category: 'temporal_advance',
    description: 'Proceed to next Canvas/segment when current one ends',
    requires: 'duration dimension',
    validOn: ['Collection', 'Manifest', 'Canvas', 'Range']
  },
  'no-auto-advance': {
    behavior: 'no-auto-advance',
    category: 'temporal_advance',
    description: 'Do not proceed automatically when Canvas/segment ends',
    default: true,
    validOn: ['Collection', 'Manifest', 'Canvas', 'Range']
  },
  'repeat': {
    behavior: 'repeat',
    category: 'temporal_repeat',
    description: 'Loop back to first Canvas when reaching end (if auto-advance active)',
    requires: 'duration dimension',
    validOn: ['Collection', 'Manifest']
  },
  'no-repeat': {
    behavior: 'no-repeat',
    category: 'temporal_repeat',
    description: 'Do not loop back to beginning',
    default: true,
    validOn: ['Collection', 'Manifest']
  },

  // Layout behaviors
  'unordered': {
    behavior: 'unordered',
    category: 'layout',
    description: 'Canvases have no inherent order, UI should not imply order',
    validOn: ['Collection', 'Manifest', 'Range']
  },
  'individuals': {
    behavior: 'individuals',
    category: 'layout',
    description: 'Each Canvas is a distinct view, not for page-turning interface',
    default: true,
    validOn: ['Collection', 'Manifest', 'Range']
  },
  'continuous': {
    behavior: 'continuous',
    category: 'layout',
    description: 'Canvases are partial views, display stitched together (e.g., scroll)',
    requires: 'height and width dimensions',
    validOn: ['Collection', 'Manifest', 'Range']
  },
  'paged': {
    behavior: 'paged',
    category: 'layout',
    description: 'Display in page-turning interface, first canvas is recto',
    requires: 'height and width dimensions',
    validOn: ['Collection', 'Manifest', 'Range']
  },

  // Canvas-specific behaviors
  'facing-pages': {
    behavior: 'facing-pages',
    category: 'canvas_paging',
    description: 'Canvas depicts both parts of opening, display alone',
    context: 'Only meaningful when Manifest has paged behavior',
    validOn: ['Canvas']
  },
  'non-paged': {
    behavior: 'non-paged',
    category: 'canvas_paging',
    description: 'Skip this Canvas in page-turning interface',
    context: 'Only meaningful when Manifest has paged behavior',
    validOn: ['Canvas']
  },

  // Collection-specific behaviors
  'multi-part': {
    behavior: 'multi-part',
    category: 'collection_presentation',
    description: 'Child Manifests/Collections form logical whole (e.g., multi-volume)',
    validOn: ['Collection']
  },
  'together': {
    behavior: 'together',
    category: 'collection_presentation',
    description: 'Present all child Manifests simultaneously in separate viewing area',
    validOn: ['Collection']
  },

  // Range-specific behaviors
  'sequence': {
    behavior: 'sequence',
    category: 'range_navigation',
    description: "Range represents alternative ordering of Manifest's Canvases",
    context: "Must be in Manifest's structures property",
    validOn: ['Range']
  },
  'thumbnail-nav': {
    behavior: 'thumbnail-nav',
    category: 'range_navigation',
    description: 'Use for thumbnail-based navigation (keyframes, scroll sections)',
    validOn: ['Range']
  },
  'no-nav': {
    behavior: 'no-nav',
    category: 'range_navigation',
    description: 'Do not display in navigation hierarchy (blank pages, dead air)',
    validOn: ['Range']
  },

  // Visibility behaviors
  'hidden': {
    behavior: 'hidden',
    category: 'visibility',
    description: 'Do not render by default, allow user to toggle',
    validOn: ['AnnotationCollection', 'AnnotationPage', 'Annotation', 'SpecificResource', 'Choice']
  }
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a behavior is valid for a resource type
 */
export function isBehaviorValidForType(behavior: string, resourceType: string): boolean {
  const validTypes = BEHAVIOR_VALIDITY_MATRIX[behavior as IIIFBehavior];
  return validTypes?.includes(resourceType) || false;
}

/**
 * Get all valid behaviors for a resource type
 */
export function getValidBehaviorsForType(resourceType: string): IIIFBehavior[] {
  const valid: IIIFBehavior[] = [];

  for (const [behavior, types] of Object.entries(BEHAVIOR_VALIDITY_MATRIX)) {
    if (types.includes(resourceType)) {
      valid.push(behavior as IIIFBehavior);
    }
  }

  return valid;
}

/**
 * Check if behaviors have conflicts (multiple from same disjoint set)
 */
export function findBehaviorConflicts(behaviors: string[]): string[] {
  const conflicts: string[] = [];

  for (const set of DISJOINT_SETS) {
    const matching = behaviors.filter(b => set.values.includes(b as IIIFBehavior));
    if (matching.length > 1) {
      conflicts.push(`Conflicting behaviors from ${set.name} set: ${matching.join(', ')}`);
    }
  }

  return conflicts;
}

/**
 * Get the disjoint set for a behavior
 */
export function getDisjointSetForBehavior(behavior: string): DisjointSet | null {
  for (const set of DISJOINT_SETS) {
    if (set.values.includes(behavior as IIIFBehavior)) {
      return set;
    }
  }
  return null;
}

/**
 * Get the default behavior for a category
 */
export function getDefaultBehavior(category: BehaviorCategory): IIIFBehavior | null {
  const set = DISJOINT_SETS.find(s => s.name === category);
  return set?.default || null;
}

/**
 * Check if a child inherits behaviors from a parent type
 */
export function doesInheritBehavior(childType: string, parentType: string): boolean {
  const rule = INHERITANCE_RULES.find(
    r => r.resource === childType && r.inheritsFrom === parentType
  );
  return rule?.inherits || false;
}

/**
 * Get inherited behaviors from parent
 */
export function getInheritedBehaviors(
  childType: string,
  parentType: string,
  parentBehaviors: string[]
): string[] {
  if (!doesInheritBehavior(childType, parentType)) {
    return [];
  }

  // Only inherit behaviors that are valid for the child type
  const validForChild = getValidBehaviorsForType(childType);
  return parentBehaviors.filter(b => validForChild.includes(b as IIIFBehavior));
}

/**
 * Resolve effective behaviors for a resource considering inheritance
 */
export function resolveEffectiveBehaviors(
  resourceType: string,
  resourceBehaviors: string[],
  parentType?: string,
  parentBehaviors?: string[]
): string[] {
  const effective = [...resourceBehaviors];

  // Add inherited behaviors if applicable
  if (parentType && parentBehaviors && doesInheritBehavior(resourceType, parentType)) {
    const inherited = getInheritedBehaviors(resourceType, parentType, parentBehaviors);

    for (const behavior of inherited) {
      // Only add if not conflicting with resource's own behaviors
      const set = getDisjointSetForBehavior(behavior);
      if (!set) {
        if (!effective.includes(behavior)) {
          effective.push(behavior);
        }
      } else {
        // Check if resource already has a behavior from this set
        const hasConflict = effective.some(b => set.values.includes(b as IIIFBehavior));
        if (!hasConflict) {
          effective.push(behavior);
        }
      }
    }
  }

  return effective;
}

/**
 * Validate behaviors for a resource
 */
export interface BehaviorValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBehaviors(
  resourceType: string,
  behaviors: string[],
  parentType?: string,
  parentBehaviors?: string[]
): BehaviorValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check each behavior is valid for the type
  for (const behavior of behaviors) {
    if (!isBehaviorValidForType(behavior, resourceType)) {
      errors.push(`Behavior "${behavior}" is not valid for ${resourceType}`);
    }
  }

  // Check for conflicts
  const conflicts = findBehaviorConflicts(behaviors);
  errors.push(...conflicts);

  // Check for inheritance conflicts
  if (parentType && parentBehaviors && doesInheritBehavior(resourceType, parentType)) {
    for (const behavior of behaviors) {
      const set = getDisjointSetForBehavior(behavior);
      if (set) {
        const parentConflicting = parentBehaviors.filter(
          b => set.values.includes(b as IIIFBehavior) && b !== behavior
        );
        if (parentConflicting.length > 0) {
          warnings.push(
            `Behavior "${behavior}" conflicts with inherited parent behavior: ${parentConflicting.join(', ')}. Child overrides parent.`
          );
        }
      }
    }
  }

  // Check context requirements
  for (const behavior of behaviors) {
    const desc = BEHAVIOR_DESCRIPTIONS[behavior as IIIFBehavior];
    if (desc?.requires) {
      warnings.push(`Behavior "${behavior}" requires ${desc.requires}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get behavior description
 */
export function getBehaviorDescription(behavior: string): BehaviorDescription | null {
  return BEHAVIOR_DESCRIPTIONS[behavior as IIIFBehavior] || null;
}

/**
 * Get all behaviors by category
 */
export function getBehaviorsByCategory(category: BehaviorCategory): IIIFBehavior[] {
  return Object.values(BEHAVIOR_DESCRIPTIONS)
    .filter(d => d.category === category)
    .map(d => d.behavior);
}

/**
 * Suggest behaviors based on content characteristics
 */
export interface ContentCharacteristics {
  hasDuration?: boolean;
  hasPageSequence?: boolean;
  isUnordered?: boolean;
  isMultiVolume?: boolean;
  hasWidth?: boolean;
  hasHeight?: boolean;
}

export function suggestBehaviors(
  resourceType: string,
  characteristics: ContentCharacteristics
): IIIFBehavior[] {
  const suggestions: IIIFBehavior[] = [];
  const valid = getValidBehaviorsForType(resourceType);

  // Time-based content
  if (characteristics.hasDuration && valid.includes('auto-advance')) {
    suggestions.push('auto-advance');
  }

  // Paged content
  if (characteristics.hasPageSequence && valid.includes('paged')) {
    suggestions.push('paged');
  }

  // Unordered content
  if (characteristics.isUnordered && valid.includes('unordered')) {
    suggestions.push('unordered');
  }

  // Multi-volume
  if (characteristics.isMultiVolume && valid.includes('multi-part')) {
    suggestions.push('multi-part');
  }

  // Continuous scroll content
  if (characteristics.hasWidth && characteristics.hasHeight && !characteristics.hasPageSequence) {
    if (valid.includes('continuous')) {
      suggestions.push('continuous');
    }
  }

  return suggestions;
}
