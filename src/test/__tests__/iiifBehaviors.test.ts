/**
 * Unit Tests for utils/iiifBehaviors.ts
 *
 * Tests IIIF Presentation API 3.0 behavior validation, inheritance, and suggestions.
 */

import { describe, it, expect } from 'vitest';
import {
  // Constants
  BEHAVIOR_VALIDITY_MATRIX,
  DISJOINT_SETS,
  INHERITANCE_RULES,
  BEHAVIOR_DESCRIPTIONS,
  // Type guards
  isBehaviorValidForType,
  getValidBehaviorsForType,
  // Conflict detection
  findBehaviorConflicts,
  getDisjointSetForBehavior,
  getDefaultBehavior,
  // Inheritance
  doesInheritBehavior,
  getInheritedBehaviors,
  resolveEffectiveBehaviors,
  // Validation
  validateBehaviors,
  // Utilities
  getBehaviorDescription,
  getBehaviorsByCategory,
  suggestBehaviors,
  // Types
  type IIIFBehavior,
  type BehaviorCategory,
} from '../../../utils/iiifBehaviors';

// ============================================================================
// Constants Tests
// ============================================================================

describe('BEHAVIOR_VALIDITY_MATRIX', () => {
  it('should define validity for all temporal behaviors', () => {
    expect(BEHAVIOR_VALIDITY_MATRIX['auto-advance']).toContain('Manifest');
    expect(BEHAVIOR_VALIDITY_MATRIX['auto-advance']).toContain('Canvas');
    expect(BEHAVIOR_VALIDITY_MATRIX['no-auto-advance']).toContain('Manifest');
    expect(BEHAVIOR_VALIDITY_MATRIX['repeat']).toContain('Collection');
    expect(BEHAVIOR_VALIDITY_MATRIX['no-repeat']).toContain('Manifest');
  });

  it('should define validity for layout behaviors', () => {
    expect(BEHAVIOR_VALIDITY_MATRIX['paged']).toContain('Manifest');
    expect(BEHAVIOR_VALIDITY_MATRIX['continuous']).toContain('Manifest');
    expect(BEHAVIOR_VALIDITY_MATRIX['individuals']).toContain('Manifest');
    expect(BEHAVIOR_VALIDITY_MATRIX['unordered']).toContain('Collection');
  });

  it('should restrict canvas behaviors to Canvas type', () => {
    expect(BEHAVIOR_VALIDITY_MATRIX['facing-pages']).toEqual(['Canvas']);
    expect(BEHAVIOR_VALIDITY_MATRIX['non-paged']).toEqual(['Canvas']);
  });

  it('should restrict collection behaviors to Collection type', () => {
    expect(BEHAVIOR_VALIDITY_MATRIX['multi-part']).toEqual(['Collection']);
    expect(BEHAVIOR_VALIDITY_MATRIX['together']).toEqual(['Collection']);
  });

  it('should restrict range behaviors to Range type', () => {
    expect(BEHAVIOR_VALIDITY_MATRIX['sequence']).toEqual(['Range']);
    expect(BEHAVIOR_VALIDITY_MATRIX['thumbnail-nav']).toEqual(['Range']);
    expect(BEHAVIOR_VALIDITY_MATRIX['no-nav']).toEqual(['Range']);
  });
});

describe('DISJOINT_SETS', () => {
  it('should define temporal_advance set', () => {
    const set = DISJOINT_SETS.find(s => s.name === 'temporal_advance');
    expect(set).toBeDefined();
    expect(set?.values).toContain('auto-advance');
    expect(set?.values).toContain('no-auto-advance');
    expect(set?.default).toBe('no-auto-advance');
  });

  it('should define temporal_repeat set', () => {
    const set = DISJOINT_SETS.find(s => s.name === 'temporal_repeat');
    expect(set).toBeDefined();
    expect(set?.values).toContain('repeat');
    expect(set?.values).toContain('no-repeat');
  });

  it('should define layout set with 4 values', () => {
    const set = DISJOINT_SETS.find(s => s.name === 'layout');
    expect(set).toBeDefined();
    expect(set?.values).toHaveLength(4);
    expect(set?.values).toContain('paged');
    expect(set?.values).toContain('continuous');
    expect(set?.values).toContain('individuals');
    expect(set?.values).toContain('unordered');
    expect(set?.default).toBe('individuals');
  });

  it('should define canvas_paging set', () => {
    const set = DISJOINT_SETS.find(s => s.name === 'canvas_paging');
    expect(set).toBeDefined();
    expect(set?.values).toContain('facing-pages');
    expect(set?.values).toContain('non-paged');
  });
});

describe('INHERITANCE_RULES', () => {
  it('should define Canvas inherits from Manifest', () => {
    const rule = INHERITANCE_RULES.find(
      r => r.resource === 'Canvas' && r.inheritsFrom === 'Manifest'
    );
    expect(rule).toBeDefined();
    expect(rule?.inherits).toBe(true);
  });

  it('should define Range inherits from Manifest', () => {
    const rule = INHERITANCE_RULES.find(
      r => r.resource === 'Range' && r.inheritsFrom === 'Manifest'
    );
    expect(rule).toBeDefined();
    expect(rule?.inherits).toBe(true);
  });

  it('should NOT allow Manifest to inherit from Collection', () => {
    const rule = INHERITANCE_RULES.find(
      r => r.resource === 'Manifest' && r.inheritsFrom === 'Collection'
    );
    expect(rule).toBeDefined();
    expect(rule?.inherits).toBe(false);
  });

  it('should define Collection inherits from Collection', () => {
    const rule = INHERITANCE_RULES.find(
      r => r.resource === 'Collection' && r.inheritsFrom === 'Collection'
    );
    expect(rule).toBeDefined();
    expect(rule?.inherits).toBe(true);
  });
});

describe('BEHAVIOR_DESCRIPTIONS', () => {
  it('should have descriptions for all behaviors', () => {
    const allBehaviors: IIIFBehavior[] = [
      'auto-advance', 'no-auto-advance', 'repeat', 'no-repeat',
      'unordered', 'individuals', 'continuous', 'paged',
      'facing-pages', 'non-paged', 'multi-part', 'together',
      'sequence', 'thumbnail-nav', 'no-nav', 'hidden'
    ];

    for (const behavior of allBehaviors) {
      expect(BEHAVIOR_DESCRIPTIONS[behavior]).toBeDefined();
      expect(BEHAVIOR_DESCRIPTIONS[behavior].description).toBeTruthy();
      expect(BEHAVIOR_DESCRIPTIONS[behavior].category).toBeDefined();
      expect(BEHAVIOR_DESCRIPTIONS[behavior].validOn).toBeInstanceOf(Array);
    }
  });

  it('should mark default behaviors', () => {
    expect(BEHAVIOR_DESCRIPTIONS['no-auto-advance'].default).toBe(true);
    expect(BEHAVIOR_DESCRIPTIONS['no-repeat'].default).toBe(true);
    expect(BEHAVIOR_DESCRIPTIONS['individuals'].default).toBe(true);
  });

  it('should include requirements for behaviors that need them', () => {
    expect(BEHAVIOR_DESCRIPTIONS['auto-advance'].requires).toBeDefined();
    expect(BEHAVIOR_DESCRIPTIONS['repeat'].requires).toBeDefined();
    expect(BEHAVIOR_DESCRIPTIONS['continuous'].requires).toBeDefined();
    expect(BEHAVIOR_DESCRIPTIONS['paged'].requires).toBeDefined();
  });
});

// ============================================================================
// Type Validation Tests
// ============================================================================

describe('isBehaviorValidForType', () => {
  it('should return true for valid behavior-type combinations', () => {
    expect(isBehaviorValidForType('paged', 'Manifest')).toBe(true);
    expect(isBehaviorValidForType('auto-advance', 'Canvas')).toBe(true);
    expect(isBehaviorValidForType('facing-pages', 'Canvas')).toBe(true);
    expect(isBehaviorValidForType('multi-part', 'Collection')).toBe(true);
    expect(isBehaviorValidForType('sequence', 'Range')).toBe(true);
  });

  it('should return false for invalid behavior-type combinations', () => {
    expect(isBehaviorValidForType('facing-pages', 'Manifest')).toBe(false);
    expect(isBehaviorValidForType('multi-part', 'Manifest')).toBe(false);
    expect(isBehaviorValidForType('sequence', 'Manifest')).toBe(false);
    expect(isBehaviorValidForType('paged', 'Canvas')).toBe(false);
  });

  it('should return false for unknown behaviors', () => {
    expect(isBehaviorValidForType('unknown-behavior', 'Manifest')).toBe(false);
    expect(isBehaviorValidForType('', 'Manifest')).toBe(false);
  });

  it('should return false for unknown types', () => {
    expect(isBehaviorValidForType('paged', 'Unknown')).toBe(false);
  });
});

describe('getValidBehaviorsForType', () => {
  it('should return behaviors valid for Manifest', () => {
    const behaviors = getValidBehaviorsForType('Manifest');
    expect(behaviors).toContain('paged');
    expect(behaviors).toContain('continuous');
    expect(behaviors).toContain('individuals');
    expect(behaviors).toContain('unordered');
    expect(behaviors).toContain('auto-advance');
    expect(behaviors).not.toContain('facing-pages');
    expect(behaviors).not.toContain('multi-part');
  });

  it('should return behaviors valid for Canvas', () => {
    const behaviors = getValidBehaviorsForType('Canvas');
    expect(behaviors).toContain('facing-pages');
    expect(behaviors).toContain('non-paged');
    expect(behaviors).toContain('auto-advance');
    expect(behaviors).not.toContain('paged');
    expect(behaviors).not.toContain('multi-part');
  });

  it('should return behaviors valid for Collection', () => {
    const behaviors = getValidBehaviorsForType('Collection');
    expect(behaviors).toContain('multi-part');
    expect(behaviors).toContain('together');
    expect(behaviors).toContain('repeat');
    expect(behaviors).not.toContain('facing-pages');
    expect(behaviors).not.toContain('sequence');
  });

  it('should return empty array for unknown type', () => {
    const behaviors = getValidBehaviorsForType('UnknownType');
    expect(behaviors).toEqual([]);
  });
});

// ============================================================================
// Conflict Detection Tests
// ============================================================================

describe('findBehaviorConflicts', () => {
  it('should detect conflicts in temporal_advance set', () => {
    const conflicts = findBehaviorConflicts(['auto-advance', 'no-auto-advance']);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain('temporal_advance');
  });

  it('should detect conflicts in temporal_repeat set', () => {
    const conflicts = findBehaviorConflicts(['repeat', 'no-repeat']);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain('temporal_repeat');
  });

  it('should detect conflicts in layout set', () => {
    const conflicts = findBehaviorConflicts(['paged', 'continuous']);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain('layout');
  });

  it('should detect multiple layout conflicts', () => {
    const conflicts = findBehaviorConflicts(['paged', 'continuous', 'unordered']);
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('should return empty array when no conflicts', () => {
    const conflicts = findBehaviorConflicts(['paged', 'auto-advance']);
    expect(conflicts).toEqual([]);
  });

  it('should return empty array for single behavior', () => {
    const conflicts = findBehaviorConflicts(['paged']);
    expect(conflicts).toEqual([]);
  });

  it('should return empty array for empty array', () => {
    const conflicts = findBehaviorConflicts([]);
    expect(conflicts).toEqual([]);
  });

  it('should detect canvas_paging conflicts', () => {
    const conflicts = findBehaviorConflicts(['facing-pages', 'non-paged']);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain('canvas_paging');
  });
});

describe('getDisjointSetForBehavior', () => {
  it('should return set for behaviors in disjoint sets', () => {
    const set = getDisjointSetForBehavior('auto-advance');
    expect(set).toBeDefined();
    expect(set?.name).toBe('temporal_advance');
  });

  it('should return set for layout behaviors', () => {
    const set = getDisjointSetForBehavior('paged');
    expect(set).toBeDefined();
    expect(set?.name).toBe('layout');
  });

  it('should return null for behaviors not in any set', () => {
    const set = getDisjointSetForBehavior('hidden');
    expect(set).toBeNull();
  });

  it('should return null for unknown behaviors', () => {
    const set = getDisjointSetForBehavior('unknown');
    expect(set).toBeNull();
  });
});

describe('getDefaultBehavior', () => {
  it('should return default for temporal_advance', () => {
    const defaultBehavior = getDefaultBehavior('temporal_advance');
    expect(defaultBehavior).toBe('no-auto-advance');
  });

  it('should return default for temporal_repeat', () => {
    const defaultBehavior = getDefaultBehavior('temporal_repeat');
    expect(defaultBehavior).toBe('no-repeat');
  });

  it('should return default for layout', () => {
    const defaultBehavior = getDefaultBehavior('layout');
    expect(defaultBehavior).toBe('individuals');
  });

  it('should return null for sets without default', () => {
    const defaultBehavior = getDefaultBehavior('canvas_paging');
    expect(defaultBehavior).toBeNull();
  });

  it('should return null for unknown categories', () => {
    const defaultBehavior = getDefaultBehavior('unknown' as BehaviorCategory);
    expect(defaultBehavior).toBeNull();
  });
});

// ============================================================================
// Inheritance Tests
// ============================================================================

describe('doesInheritBehavior', () => {
  it('should return true for Canvas inheriting from Manifest', () => {
    expect(doesInheritBehavior('Canvas', 'Manifest')).toBe(true);
  });

  it('should return true for Range inheriting from Manifest', () => {
    expect(doesInheritBehavior('Range', 'Manifest')).toBe(true);
  });

  it('should return true for Collection inheriting from Collection', () => {
    expect(doesInheritBehavior('Collection', 'Collection')).toBe(true);
  });

  it('should return false for Manifest inheriting from Collection', () => {
    expect(doesInheritBehavior('Manifest', 'Collection')).toBe(false);
  });

  it('should return false for unknown combinations', () => {
    expect(doesInheritBehavior('Annotation', 'Manifest')).toBe(false);
  });
});

describe('getInheritedBehaviors', () => {
  it('should inherit valid behaviors from parent', () => {
    const parentBehaviors = ['paged', 'auto-advance'];
    const inherited = getInheritedBehaviors('Canvas', 'Manifest', parentBehaviors);
    
    // Canvas can inherit auto-advance but not paged
    expect(inherited).toContain('auto-advance');
    expect(inherited).not.toContain('paged');
  });

  it('should return empty array when no inheritance', () => {
    const parentBehaviors = ['paged'];
    const inherited = getInheritedBehaviors('Manifest', 'Collection', parentBehaviors);
    expect(inherited).toEqual([]);
  });

  it('should filter out behaviors not valid for child', () => {
    const parentBehaviors = ['multi-part', 'auto-advance'];
    const inherited = getInheritedBehaviors('Canvas', 'Manifest', parentBehaviors);
    
    // Canvas can't inherit multi-part (Collection only)
    expect(inherited).not.toContain('multi-part');
    expect(inherited).toContain('auto-advance');
  });
});

describe('resolveEffectiveBehaviors', () => {
  it('should combine resource behaviors with inherited', () => {
    const resourceBehaviors = ['auto-advance'];
    const parentBehaviors = ['paged'];
    
    const effective = resolveEffectiveBehaviors(
      'Canvas',
      resourceBehaviors,
      'Manifest',
      parentBehaviors
    );
    
    expect(effective).toContain('auto-advance');
    // paged is not valid for Canvas, so won't be inherited
  });

  it('should not duplicate behaviors', () => {
    const resourceBehaviors = ['auto-advance'];
    const parentBehaviors = ['auto-advance'];
    
    const effective = resolveEffectiveBehaviors(
      'Canvas',
      resourceBehaviors,
      'Manifest',
      parentBehaviors
    );
    
    const autoAdvanceCount = effective.filter(b => b === 'auto-advance').length;
    expect(autoAdvanceCount).toBe(1);
  });

  it('should handle resource behaviors only', () => {
    const effective = resolveEffectiveBehaviors('Manifest', ['paged']);
    expect(effective).toEqual(['paged']);
  });

  it('should handle empty behaviors', () => {
    const effective = resolveEffectiveBehaviors('Manifest', []);
    expect(effective).toEqual([]);
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('validateBehaviors', () => {
  it('should validate valid behaviors', () => {
    const result = validateBehaviors('Manifest', ['paged', 'auto-advance']);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should detect invalid behavior for type', () => {
    const result = validateBehaviors('Canvas', ['paged']); // paged not valid for Canvas
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('not valid');
  });

  it('should detect conflicting behaviors', () => {
    const result = validateBehaviors('Manifest', ['paged', 'continuous']);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Conflicting');
  });

  it('should warn about requirements', () => {
    const result = validateBehaviors('Manifest', ['auto-advance']);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('requires');
  });

  it('should detect inheritance conflicts', () => {
    const result = validateBehaviors(
      'Canvas',
      ['auto-advance'],
      'Manifest',
      ['no-auto-advance']
    );
    
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('conflicts');
  });

  it('should pass validation for empty behaviors', () => {
    const result = validateBehaviors('Manifest', []);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

// ============================================================================
// Utility Tests
// ============================================================================

describe('getBehaviorDescription', () => {
  it('should return description for valid behavior', () => {
    const desc = getBehaviorDescription('paged');
    expect(desc).toBeDefined();
    expect(desc?.behavior).toBe('paged');
    expect(desc?.description).toBeTruthy();
  });

  it('should return null for unknown behavior', () => {
    const desc = getBehaviorDescription('unknown');
    expect(desc).toBeNull();
  });
});

describe('getBehaviorsByCategory', () => {
  it('should return temporal behaviors', () => {
    const behaviors = getBehaviorsByCategory('temporal_advance');
    expect(behaviors).toContain('auto-advance');
    expect(behaviors).toContain('no-auto-advance');
  });

  it('should return layout behaviors', () => {
    const behaviors = getBehaviorsByCategory('layout');
    expect(behaviors).toContain('paged');
    expect(behaviors).toContain('continuous');
    expect(behaviors).toContain('individuals');
    expect(behaviors).toContain('unordered');
  });

  it('should return empty array for unknown category', () => {
    const behaviors = getBehaviorsByCategory('unknown' as BehaviorCategory);
    expect(behaviors).toEqual([]);
  });
});

describe('suggestBehaviors', () => {
  it('should suggest auto-advance for time-based content', () => {
    const suggestions = suggestBehaviors('Manifest', { hasDuration: true });
    expect(suggestions).toContain('auto-advance');
  });

  it('should suggest paged for page sequence content', () => {
    const suggestions = suggestBehaviors('Manifest', { hasPageSequence: true });
    expect(suggestions).toContain('paged');
  });

  it('should suggest unordered for unordered content', () => {
    const suggestions = suggestBehaviors('Collection', { isUnordered: true });
    expect(suggestions).toContain('unordered');
  });

  it('should suggest multi-part for multi-volume content', () => {
    const suggestions = suggestBehaviors('Collection', { isMultiVolume: true });
    expect(suggestions).toContain('multi-part');
  });

  it('should suggest continuous for scroll content', () => {
    const suggestions = suggestBehaviors('Manifest', {
      hasWidth: true,
      hasHeight: true,
      hasPageSequence: false
    });
    expect(suggestions).toContain('continuous');
  });

  it('should only suggest valid behaviors for type', () => {
    // multi-part is not valid for Manifest
    const suggestions = suggestBehaviors('Manifest', { isMultiVolume: true });
    expect(suggestions).not.toContain('multi-part');
  });

  it('should return empty array when no suggestions match', () => {
    const suggestions = suggestBehaviors('Canvas', {});
    expect(suggestions).toEqual([]);
  });
});
