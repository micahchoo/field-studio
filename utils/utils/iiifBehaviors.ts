/**
 * IIIF Behavior Utilities — Stub
 * Centralized behavior validation per IIIF Presentation 3.0.
 */

export interface BehaviorValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Disjoint behavior sets — behaviors in the same set are mutually exclusive */
const DISJOINT_SETS: string[][] = [
  ['individuals', 'paged', 'continuous'],
  ['auto-advance', 'no-auto-advance'],
  ['together', 'sequence'],
  ['facing-pages', 'non-paged'],
  ['thumbnail-nav', 'no-nav'],
];

/** Validate behaviors for a given type */
export function validateBehaviors(
  type: string,
  behaviors: string[],
  _parentType?: string,
  _parentBehaviors?: string[]
): BehaviorValidationResult {
  const result: BehaviorValidationResult = { valid: true, errors: [], warnings: [] };
  const conflicts = findBehaviorConflicts(behaviors);

  if (conflicts.length > 0) {
    result.valid = false;
    result.errors.push(...conflicts.map(c => `Conflicting behaviors: ${c.join(', ')}`));
  }

  // Validate each behavior is allowed for this type
  const validForType = getValidBehaviorsForType(type);
  for (const b of behaviors) {
    if (validForType.length > 0 && !validForType.includes(b)) {
      result.valid = false;
      result.errors.push(`Behavior "${b}" is not valid for type ${type}`);
    }
  }

  return result;
}

/** Find conflicting behaviors */
export function findBehaviorConflicts(behaviors: string[]): string[][] {
  const conflicts: string[][] = [];

  for (const set of DISJOINT_SETS) {
    const matching = behaviors.filter(b => set.includes(b));
    if (matching.length > 1) {
      conflicts.push(matching);
    }
  }

  return conflicts;
}

/** Check if a behavior is inherited from parent */
export function doesInheritBehavior(behavior: string, _parentType: string): boolean {
  return ['auto-advance', 'no-auto-advance'].includes(behavior);
}

/** Get default behavior for a type */
export function getDefaultBehavior(type: string): string[] {
  const defaults: Record<string, string[]> = {
    Manifest: ['individuals'],
    Collection: ['individuals'],
    Canvas: [],
    Range: [],
  };
  return defaults[type] || [];
}

/** Disjoint set with a name for identification */
export interface DisjointSet {
  name: string;
  behaviors: string[];
}

/** Get the disjoint set containing a behavior, or null if not found */
export function getDisjointSetForBehavior(behavior: string): DisjointSet | null {
  const set = DISJOINT_SETS.find(s => s.includes(behavior));
  if (!set) return null;
  return { name: set.join('/'), behaviors: set };
}

/** Get valid behaviors for a given type */
export function getValidBehaviorsForType(type: string): string[] {
  const valid: Record<string, string[]> = {
    Manifest: ['auto-advance', 'no-auto-advance', 'continuous', 'paged', 'individuals', 'unordered', 'multi-part', 'together', 'sequence', 'thumbnail-nav', 'no-nav'],
    Canvas: ['auto-advance', 'no-auto-advance', 'facing-pages', 'non-paged'],
    Collection: ['auto-advance', 'no-auto-advance', 'continuous', 'individuals', 'multi-part', 'together', 'unordered'],
    Range: ['auto-advance', 'no-auto-advance', 'no-nav', 'thumbnail-nav'],
  };
  return valid[type] || [];
}
