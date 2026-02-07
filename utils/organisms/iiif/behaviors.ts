/**
 * IIIF Behavior Validation
 * Organism - depends on schema
 */

import type { IIIFBehavior, IIIFResourceType } from './types';

// ============================================================================
// Behavior Validity Matrix
// ============================================================================

export const BEHAVIOR_VALIDITY_MATRIX: Record<IIIFBehavior, string[]> = {
  // Temporal behaviors
  'auto-advance': ['Collection', 'Manifest', 'Canvas', 'Range'],
  'no-auto-advance': ['Collection', 'Manifest', 'Canvas', 'Range'],
  repeat: ['Collection', 'Manifest'],
  'no-repeat': ['Collection', 'Manifest'],

  // Layout behaviors
  unordered: ['Collection', 'Manifest', 'Range'],
  individuals: ['Collection', 'Manifest', 'Range'],
  continuous: ['Collection', 'Manifest', 'Range'],
  paged: ['Collection', 'Manifest', 'Range'],

  // Canvas-specific behaviors
  'facing-pages': ['Canvas'],
  'non-paged': ['Canvas'],

  // Collection-specific behaviors
  'multi-part': ['Collection'],
  together: ['Collection'],

  // Range-specific behaviors
  sequence: ['Range'],
  'thumbnail-nav': ['Range'],
  'no-nav': ['Range'],

  // Visibility behaviors
  hidden: [
    'AnnotationCollection',
    'AnnotationPage',
    'Annotation',
    'SpecificResource',
    'Choice',
  ],
};

// ============================================================================
// Disjoint Sets (Mutually Exclusive)
// ============================================================================

export interface DisjointSet {
  name: string;
  values: IIIFBehavior[];
  default?: IIIFBehavior;
  notes?: string;
}

export const DISJOINT_SETS: DisjointSet[] = [
  {
    name: 'temporal_advance',
    values: ['auto-advance', 'no-auto-advance'],
    default: 'no-auto-advance',
  },
  {
    name: 'temporal_repeat',
    values: ['repeat', 'no-repeat'],
    default: 'no-repeat',
  },
  {
    name: 'layout',
    values: ['unordered', 'individuals', 'continuous', 'paged'],
    default: 'individuals',
  },
  {
    name: 'canvas_paging',
    values: ['facing-pages', 'non-paged'],
    notes: 'Only meaningful when Manifest has paged behavior',
  },
  {
    name: 'collection_presentation',
    values: ['multi-part', 'together'],
  },
  {
    name: 'range_navigation',
    values: ['sequence', 'thumbnail-nav', 'no-nav'],
  },
];

// ============================================================================
// Inheritance Rules
// ============================================================================

export interface InheritanceRule {
  resource: string;
  inheritsFrom: string;
  inherits: boolean;
  notes?: string;
}

export const INHERITANCE_RULES: InheritanceRule[] = [
  {
    resource: 'Collection',
    inheritsFrom: 'Collection',
    inherits: true,
    notes: 'Nested Collections inherit from parent Collection',
  },
  {
    resource: 'Manifest',
    inheritsFrom: 'Collection',
    inherits: false,
    notes: 'Manifests do NOT inherit from referencing Collection',
  },
  {
    resource: 'Canvas',
    inheritsFrom: 'Manifest',
    inherits: true,
    notes: 'Canvases inherit from their parent Manifest',
  },
  {
    resource: 'Canvas',
    inheritsFrom: 'Range',
    inherits: false,
    notes: 'Canvases do NOT inherit from referencing Range',
  },
  {
    resource: 'Range',
    inheritsFrom: 'Range',
    inherits: true,
    notes: 'Nested Ranges inherit from parent Range',
  },
  {
    resource: 'Range',
    inheritsFrom: 'Manifest',
    inherits: true,
    notes: 'Ranges inherit from their Manifest',
  },
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

export type BehaviorCategory =
  | 'temporal_advance'
  | 'temporal_repeat'
  | 'layout'
  | 'canvas_paging'
  | 'collection_presentation'
  | 'range_navigation'
  | 'visibility';

export const BEHAVIOR_DESCRIPTIONS: Record<IIIFBehavior, BehaviorDescription> =
  {
    'auto-advance': {
      behavior: 'auto-advance',
      category: 'temporal_advance',
      description:
        'When the user reaches the end of a canvas, proceed to the next canvas',
      validOn: ['Collection', 'Manifest', 'Canvas', 'Range'],
    },
    'no-auto-advance': {
      behavior: 'no-auto-advance',
      category: 'temporal_advance',
      description: 'Do not proceed to the next canvas automatically',
      default: true,
      validOn: ['Collection', 'Manifest', 'Canvas', 'Range'],
    },
    repeat: {
      behavior: 'repeat',
      category: 'temporal_repeat',
      description: 'Repeat the resource from the beginning when finished',
      validOn: ['Collection', 'Manifest'],
    },
    'no-repeat': {
      behavior: 'no-repeat',
      category: 'temporal_repeat',
      description: 'Do not repeat the resource',
      default: true,
      validOn: ['Collection', 'Manifest'],
    },
    unordered: {
      behavior: 'unordered',
      category: 'layout',
      description: 'Canvases are unordered',
      validOn: ['Collection', 'Manifest', 'Range'],
    },
    individuals: {
      behavior: 'individuals',
      category: 'layout',
      description: 'Each canvas is a separate individual',
      default: true,
      validOn: ['Collection', 'Manifest', 'Range'],
    },
    continuous: {
      behavior: 'continuous',
      category: 'layout',
      description: 'Canvases are continuous, like a scroll',
      validOn: ['Collection', 'Manifest', 'Range'],
    },
    paged: {
      behavior: 'paged',
      category: 'layout',
      description: 'Canvases represent pages, like a book',
      validOn: ['Collection', 'Manifest', 'Range'],
    },
    'facing-pages': {
      behavior: 'facing-pages',
      category: 'canvas_paging',
      description: 'Canvas represents a pair of facing pages',
      requires: 'Manifest with paged behavior',
      validOn: ['Canvas'],
    },
    'non-paged': {
      behavior: 'non-paged',
      category: 'canvas_paging',
      description: 'Canvas does not represent a page',
      requires: 'Manifest with paged behavior',
      validOn: ['Canvas'],
    },
    'multi-part': {
      behavior: 'multi-part',
      category: 'collection_presentation',
      description: 'Collection represents multiple volumes or parts',
      validOn: ['Collection'],
    },
    together: {
      behavior: 'together',
      category: 'collection_presentation',
      description: 'Collection items should be displayed together',
      validOn: ['Collection'],
    },
    sequence: {
      behavior: 'sequence',
      category: 'range_navigation',
      description: 'Range represents a sequence of canvases',
      validOn: ['Range'],
    },
    'thumbnail-nav': {
      behavior: 'thumbnail-nav',
      category: 'range_navigation',
      description: 'Range should be used for thumbnail navigation',
      validOn: ['Range'],
    },
    'no-nav': {
      behavior: 'no-nav',
      category: 'range_navigation',
      description: 'Range should not appear in navigation',
      validOn: ['Range'],
    },
    hidden: {
      behavior: 'hidden',
      category: 'visibility',
      description: 'Resource should be hidden from default view',
      validOn: [
        'AnnotationCollection',
        'AnnotationPage',
        'Annotation',
        'SpecificResource',
        'Choice',
      ],
    },
  };

// ============================================================================
// Pre-computed Lookup Maps (built once at module init)
// ============================================================================

// O(1) lookup: behavior -> disjoint set
const _behaviorToDisjointSet = new Map<IIIFBehavior, DisjointSet>();
// O(1) lookup: behavior -> Set of values in its disjoint set
const _behaviorToDisjointValues = new Map<IIIFBehavior, Set<IIIFBehavior>>();
// O(1) lookup: disjoint set name -> DisjointSet
const _disjointSetByName = new Map<string, DisjointSet>();
// O(1) lookup: behavior -> Set of valid resource types
const _behaviorValidTypes = new Map<IIIFBehavior, Set<string>>();
// O(1) lookup: resourceType -> list of valid behaviors
const _validBehaviorsForType = new Map<string, IIIFBehavior[]>();

// Build behavior -> valid types map
for (const [behavior, types] of Object.entries(BEHAVIOR_VALIDITY_MATRIX)) {
  _behaviorValidTypes.set(behavior as IIIFBehavior, new Set(types));
}

// Build disjoint set lookup maps
for (const set of DISJOINT_SETS) {
  _disjointSetByName.set(set.name, set);
  const valuesSet = new Set(set.values);
  for (const behavior of set.values) {
    _behaviorToDisjointSet.set(behavior, set);
    _behaviorToDisjointValues.set(behavior, valuesSet);
  }
}

// Build valid behaviors per type
const allTypes = new Set<string>();
for (const types of Object.values(BEHAVIOR_VALIDITY_MATRIX)) {
  for (const t of types) allTypes.add(t);
}
for (const type of allTypes) {
  const behaviors: IIIFBehavior[] = [];
  for (const [behavior, typeSet] of _behaviorValidTypes) {
    if (typeSet.has(type)) behaviors.push(behavior);
  }
  _validBehaviorsForType.set(type, behaviors);
}

// ============================================================================
// Validation Functions
// ============================================================================

export function isBehaviorValidForType(
  behavior: IIIFBehavior,
  resourceType: string
): boolean {
  return _behaviorValidTypes.get(behavior)?.has(resourceType) ?? false;
}

export function getValidBehaviorsForType(resourceType: string): IIIFBehavior[] {
  return _validBehaviorsForType.get(resourceType) || [];
}

export function getDisjointSetForBehavior(
  behavior: IIIFBehavior
): DisjointSet | undefined {
  return _behaviorToDisjointSet.get(behavior);
}

export function findBehaviorConflicts(
  behaviors: IIIFBehavior[]
): Array<{ behavior: IIIFBehavior; conflictsWith: IIIFBehavior[] }> {
  const conflicts: Array<{
    behavior: IIIFBehavior;
    conflictsWith: IIIFBehavior[];
  }> = [];

  for (const behavior of behaviors) {
    const disjointValues = _behaviorToDisjointValues.get(behavior);
    if (disjointValues) {
      const conflicting = behaviors.filter(
        (b) => b !== behavior && disjointValues.has(b)
      );
      if (conflicting.length > 0) {
        conflicts.push({ behavior, conflictsWith: conflicting });
      }
    }
  }

  return conflicts;
}

export function getDefaultBehavior(disjointSetName: string): IIIFBehavior | undefined {
  return _disjointSetByName.get(disjointSetName)?.default;
}

// ============================================================================
// Inheritance Functions
// ============================================================================

export function doesInheritBehavior(
  resourceType: string,
  fromType: string
): boolean {
  const rule = INHERITANCE_RULES.find(
    (r) => r.resource === resourceType && r.inheritsFrom === fromType
  );
  return rule?.inherits ?? false;
}

export function getInheritedBehaviors(
  behaviors: IIIFBehavior[],
  resourceType: string,
  parentType: string
): IIIFBehavior[] {
  if (!doesInheritBehavior(resourceType, parentType)) {
    return [];
  }
  // Return behaviors that are valid for both types
  return behaviors.filter((b) =>
    isBehaviorValidForType(b, resourceType)
  );
}

export function resolveEffectiveBehaviors(
  ownBehaviors: IIIFBehavior[],
  parentBehaviors: IIIFBehavior[],
  resourceType: string,
  parentType: string
): IIIFBehavior[] {
  if (!doesInheritBehavior(resourceType, parentType)) {
    return ownBehaviors;
  }

  // Start with inherited behaviors that are valid
  const effective = parentBehaviors.filter((b) =>
    isBehaviorValidForType(b, resourceType)
  );

  // Add own behaviors, replacing conflicts
  for (const behavior of ownBehaviors) {
    const disjointValues = _behaviorToDisjointValues.get(behavior);
    if (disjointValues) {
      // Remove any existing behavior from this disjoint set
      for (let i = effective.length - 1; i >= 0; i--) {
        if (disjointValues.has(effective[i])) {
          effective.splice(i, 1);
        }
      }
    }
    if (!effective.includes(behavior)) {
      effective.push(behavior);
    }
  }

  return effective;
}

// ============================================================================
// Complete Validation
// ============================================================================

export interface BehaviorValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: Array<{ behavior: IIIFBehavior; conflictsWith: IIIFBehavior[] }>;
}

export function validateBehaviors(
  behaviors: IIIFBehavior[],
  resourceType: string
): BehaviorValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check each behavior is valid for this type
  for (const behavior of behaviors) {
    if (!isBehaviorValidForType(behavior, resourceType)) {
      errors.push(
        `Behavior '${behavior}' is not valid on ${resourceType}`
      );
    }
  }

  // Check for conflicts
  const conflicts = findBehaviorConflicts(behaviors);
  if (conflicts.length > 0) {
    warnings.push(
      `Conflicting behaviors detected: ${conflicts
        .map((c) => `${c.behavior} vs ${c.conflictsWith.join(', ')}`)
        .join('; ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    conflicts,
  };
}

export function getBehaviorDescription(behavior: IIIFBehavior): string {
  return BEHAVIOR_DESCRIPTIONS[behavior]?.description || '';
}

export function getBehaviorsByCategory(
  category: BehaviorCategory
): IIIFBehavior[] {
  return (Object.keys(BEHAVIOR_DESCRIPTIONS) as IIIFBehavior[]).filter(
    (b) => BEHAVIOR_DESCRIPTIONS[b].category === category
  );
}

export function suggestBehaviors(resourceType: string): IIIFBehavior[] {
  return getValidBehaviorsForType(resourceType).filter((b) => {
    const desc = BEHAVIOR_DESCRIPTIONS[b];
    return desc.default || desc.category === 'layout';
  });
}
